import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Save, Trash2, Timer as TimerIcon } from "lucide-react-native";
import { cores, fontes } from "../theme/theme";

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDuracao(segundos) {
  if (segundos === null || segundos === undefined) return null;
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

// Tela de detalhe de uma sessão já registrada (aberta a partir do Calendário).
// Permite corrigir pesos digitados errado e excluir a sessão inteira —
// nos dois casos, quem chama (App.js) é responsável por recalcular
// pesos/recordes a partir do conjunto atualizado de sessões.
export default function TelaSessao({ sessao, diaLabel, aoVoltar, aoSalvar, aoExcluir }) {
  const [registros, setRegistros] = useState(() =>
    (sessao.registros || []).map((r) => ({ ...r, pesoTexto: String(r.peso ?? "") }))
  );
  const [modalExcluirVisivel, setModalExcluirVisivel] = useState(false);

  function atualizarPeso(id, valor) {
    const limpo = valor.replace(/[^0-9.,]/g, "");
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, pesoTexto: limpo } : r)));
  }

  function salvar() {
    const novosRegistros = registros.map((r) => {
      const valor = parseFloat(String(r.pesoTexto).replace(",", "."));
      return {
        id: r.id,
        nome: r.nome,
        series: r.series,
        repsTexto: r.repsTexto,
        peso: !isNaN(valor) && valor > 0 ? valor : 0,
        pesosPorSerie: r.pesosPorSerie, // preserva o detalhe por série (não editado nesta tela)
      };
    });
    aoSalvar(novosRegistros);
  }

  const duracaoTexto = formatarDuracao(sessao.duracaoSegundos);

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.iconBtn}>
          <ArrowLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Sessão · {diaLabel}</Text>
        <TouchableOpacity onPress={salvar} style={styles.iconBtn}>
          <Save size={18} color={cores.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.subheader}>
        <Text style={styles.subheaderData}>{formatarDataBR(sessao.data)}</Text>
        {duracaoTexto && (
          <View style={styles.duracaoPill}>
            <TimerIcon size={12} color={cores.accent} />
            <Text style={styles.duracaoTexto}>{duracaoTexto}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.secaoLabel}>PESOS REGISTRADOS</Text>
        <Text style={styles.descricao}>
          Corrija aqui se algum peso foi digitado errado. Isso também recalcula seus recordes automaticamente.
        </Text>

        {registros.map((r) => (
          <View style={styles.card} key={r.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exNome}>{r.nome}</Text>
              <Text style={styles.exMeta}>
                {r.series}×{r.repsTexto} reps
              </Text>
            </View>
            <View style={styles.pesoLinha}>
              <TextInput
                style={styles.pesoInput}
                keyboardType="numeric"
                value={r.pesoTexto}
                onChangeText={(v) => atualizarPeso(r.id, v)}
                placeholder="0"
                placeholderTextColor={cores.textoDim}
              />
              <Text style={styles.pesoUnidade}>kg</Text>
            </View>
          </View>
        ))}

        {registros.length === 0 && (
          <Text style={styles.vazio}>essa sessão não tem exercícios registrados.</Text>
        )}

        <TouchableOpacity
          style={styles.excluirBtn}
          onPress={() => setModalExcluirVisivel(true)}
        >
          <Trash2 size={15} color={cores.descanso} />
          <Text style={styles.excluirBtnTexto}>Excluir esta sessão</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExcluirVisivel(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Excluir sessão?</Text>
            <Text style={styles.modalTexto}>
              Isso remove o registro de {formatarDataBR(sessao.data)} ({diaLabel}) do seu histórico e recalcula os recordes. Não há reversão.
            </Text>
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalExcluirVisivel(false)}
              >
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnExcluir}
                onPress={() => {
                  setModalExcluirVisivel(false);
                  aoExcluir();
                }}
              >
                <Text style={styles.modalBtnExcluirTexto}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.border },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto },

  subheader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 14 },
  subheaderData: { fontFamily: fontes.display, fontSize: 22, color: cores.texto },
  duracaoPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: cores.accentDim, borderColor: cores.accent, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  duracaoTexto: { fontFamily: fontes.mono, fontSize: 11.5, color: cores.accent },

  conteudo: { padding: 18, paddingBottom: 40 },
  secaoLabel: { fontFamily: fontes.mono, fontSize: 11, letterSpacing: 1.2, color: cores.accent, marginBottom: 6 },
  descricao: { fontFamily: fontes.corpo, fontSize: 12.5, color: cores.textoDim, lineHeight: 18, marginBottom: 16 },

  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  exNome: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto },
  exMeta: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim, marginTop: 3 },
  pesoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  pesoInput: {
    fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto, backgroundColor: cores.surface2,
    borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 64, textAlign: "center",
  },
  pesoUnidade: { fontFamily: fontes.monoRegular, fontSize: 11.5, color: cores.textoDim },

  vazio: { textAlign: "center", color: cores.textoDim, fontFamily: fontes.monoRegular, fontSize: 12, paddingVertical: 20 },

  excluirBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: cores.descanso, borderRadius: 12, paddingVertical: 13, marginTop: 20,
  },
  excluirBtnTexto: { fontFamily: fontes.corpoSemiBold, fontSize: 13.5, color: cores.descanso },

  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  modalCaixa: { backgroundColor: cores.surface, borderRadius: 16, padding: 20 },
  modalTitulo: { fontFamily: fontes.display, fontSize: 20, color: cores.texto, marginBottom: 8 },
  modalTexto: { fontFamily: fontes.corpo, fontSize: 13, color: cores.textoDim, lineHeight: 19, marginBottom: 18 },
  modalBotoes: { flexDirection: "row", gap: 10 },
  modalBtnCancelar: { flex: 1, borderWidth: 1, borderColor: cores.border, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalBtnCancelarTexto: { fontFamily: fontes.corpoSemiBold, fontSize: 13.5, color: cores.texto },
  modalBtnExcluir: { flex: 1, backgroundColor: cores.descanso, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalBtnExcluirTexto: { fontFamily: fontes.corpoBold, fontSize: 13.5, color: "#101204" },
});