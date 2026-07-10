import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Download, Upload } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing"; 
import * as DocumentPicker from "expo-document-picker";
import { storageGet, storageSet } from "../storage/storage";
import { cores, fontes } from "../theme/theme";

const CHAVES_BACKUP = ["plano_v2", "titulos_dias", "pesos", "recordes", "sessoes"];

export default function TelaConfig({ aoVoltar, aoImportado }) {
  const [carregando, setCarregando] = useState(false);

  async function exportarDados() {
    try {
      setCarregando(true);
      const dados = {};
      for (const chave of CHAVES_BACKUP) {
        dados[chave] = await storageGet(chave, null);
      }
      const conteudo = JSON.stringify(dados, null, 2);
      const uri = FileSystem.documentDirectory + `backup-treino-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, conteudo, { encoding: FileSystem.EncodingType.UTF8 });

      const disponivel = await Sharing.isAvailableAsync();
      if (disponivel) {
        await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Salvar backup do treino" });
      } else {
        Alert.alert("Backup criado", `Arquivo salvo em:\n${uri}`);
      }
    } catch (e) {
      Alert.alert("Erro ao exportar", String(e?.message || e));
    } finally {
      setCarregando(false);
    }
  }

  async function importarDados() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (resultado.canceled) return;
      const asset = resultado.assets?.[0];
      if (!asset) return;

      const conteudo = await FileSystem.readAsStringAsync(asset.uri);
      const dados = JSON.parse(conteudo);

      Alert.alert(
        "Importar backup",
        "Isso vai substituir os dados atuais do app (treinos, pesos, recordes e histórico). Quer continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Importar e substituir",
            style: "destructive",
            onPress: async () => {
              setCarregando(true);
              for (const chave of CHAVES_BACKUP) {
                if (dados[chave] !== undefined) {
                  await storageSet(chave, dados[chave]);
                }
              }
              setCarregando(false);
              Alert.alert("Pronto", "Dados importados com sucesso.");
              aoImportado?.();
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Erro ao importar", "O arquivo selecionado não é um backup válido.");
    }
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.iconBtn}>
          <ArrowLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Configurações</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.conteudo}>
        <Text style={styles.secaoLabel}>BACKUP</Text>
        <Text style={styles.descricao}>
          Seus dados vivem só nesse aparelho. Exporta de vez em quando para não perder tudo se trocar de celular ou reinstalar o app.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={exportarDados} disabled={carregando}>
          <Download size={16} color="#101204" />
          <Text style={styles.btnTexto}>Exportar dados (.json)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecundario} onPress={importarDados} disabled={carregando}>
          <Upload size={16} color={cores.texto} />
          <Text style={styles.btnSecundarioTexto}>Importar backup</Text>
        </TouchableOpacity>

        {carregando && <ActivityIndicator color={cores.accent} style={{ marginTop: 16 }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.border },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto },

  conteudo: { padding: 18 },
  secaoLabel: { fontFamily: fontes.mono, fontSize: 11, letterSpacing: 1.2, color: cores.accent, marginBottom: 8 },
  descricao: { fontFamily: fontes.corpo, fontSize: 12.5, color: cores.textoDim, lineHeight: 19, marginBottom: 18 },

  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: cores.accent, borderRadius: 12, paddingVertical: 14, marginBottom: 12 },
  btnTexto: { fontFamily: fontes.corpoBold, fontSize: 14, color: "#101204" },

  btnSecundario: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: cores.border, borderRadius: 12, paddingVertical: 14 },
  btnSecundarioTexto: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto },
});