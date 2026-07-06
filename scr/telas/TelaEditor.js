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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Repeat,
  ChevronLeft,
  Shield,
  Waves,
  Footprints,
  CircleDot,
  ChevronsUp,
  Dumbbell,
  Hand,
  Flame,
  TrendingUp,
  HeartPulse,
} from "lucide-react-native";
import { cores, fontes } from "../theme/theme";
import { GRUPOS_MUSCULARES, EXERCICIOS_SUGERIDOS } from "../data/treino";

function gerarId(diaKey) {
  return `${diaKey}-${Date.now()}`;
}

// Mapeamento grupo muscular -> ícone lucide (não existe ícone literal de
// "peito" ou "costas" em nenhuma lib, então usamos os que remetem melhor).
const ICONE_POR_GRUPO = {
  peito: Shield,
  costas: Waves,
  perna: Footprints,
  gluteos: CircleDot,
  ombro: ChevronsUp,
  biceps: Dumbbell,
  triceps: Dumbbell,
  antebraco: Hand,
  core: Flame,
  panturrilha: TrendingUp,
  cardio: HeartPulse,
};

export default function TelaEditor({ dia, exercicios, aoSalvar, aoVoltar }) {
  const [titulo, setTitulo] = useState(dia.titulo);
  const [lista, setLista] = useState(() => exercicios.map((ex) => ({ ...ex })));

  // Seletor de exercícios (modal em 2 passos: grupo muscular -> exercício).
  // seletorAlvo === null  -> escolha vai ADICIONAR um exercício novo na lista
  // seletorAlvo === "id"  -> escolha vai SUBSTITUIR o nome desse exercício existente
  const [seletorVisivel, setSeletorVisivel] = useState(false);
  const [seletorAlvo, setSeletorAlvo] = useState(null);
  const [grupoAtivo, setGrupoAtivo] = useState(null);
  const [buscaCustom, setBuscaCustom] = useState("");

  function atualizarCampo(id, campo, valor) {
    setLista((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [campo]: valor } : ex))
    );
  }

  function removerExercicio(id) {
    setLista((prev) => prev.filter((ex) => ex.id !== id));
  }

  function moverExercicio(indice, direcao) {
    setLista((prev) => {
      const novoIndice = indice + direcao;
      if (novoIndice < 0 || novoIndice >= prev.length) return prev;
      const nova = [...prev];
      [nova[indice], nova[novoIndice]] = [nova[novoIndice], nova[indice]];
      return nova;
    });
  }

  function adicionarExercicioEmBranco() {
    setLista((prev) => [
      ...prev,
      { id: gerarId(dia.key), nome: "Novo exercício", series: 3, reps: "8-12", rest: 60 },
    ]);
  }

  function abrirSeletorParaAdicionar() {
    setSeletorAlvo(null);
    setGrupoAtivo(null);
    setBuscaCustom("");
    setSeletorVisivel(true);
  }

  function abrirSeletorParaTrocar(id) {
    setSeletorAlvo(id);
    setGrupoAtivo(null);
    setBuscaCustom("");
    setSeletorVisivel(true);
  }

  function fecharSeletor() {
    setSeletorVisivel(false);
    setGrupoAtivo(null);
    setSeletorAlvo(null);
    setBuscaCustom("");
  }

  function escolherExercicio(nome) {
    if (seletorAlvo) {
      // FIX: ao trocar um exercício existente, gera um id novo em vez de só
      // trocar o nome. Como pesos/recordes/gráfico são indexados por id, manter
      // o id antigo fazia o histórico do exercício anterior "vazar" para o novo
      // (ex: trocar Supino por Crucifixo e ver o PR do Supino no Crucifixo).
      // Sessões já registradas não são afetadas — elas guardam nome+peso
      // próprios e não dependem do plano atual.
      setLista((prev) =>
        prev.map((ex) => (ex.id === seletorAlvo ? { ...ex, id: gerarId(dia.key), nome } : ex))
      );
    } else {
      setLista((prev) => [
        ...prev,
        { id: gerarId(dia.key), nome, series: 3, reps: "8-12", rest: 60 },
      ]);
    }
    fecharSeletor();
  }

  function salvar() {
    const listaLimpa = lista.map((ex) => ({
      ...ex,
      series: parseInt(ex.series, 10) || 1,
      rest: parseInt(ex.rest, 10) || 30,
    }));
    aoSalvar(listaLimpa, titulo);
  }

  const IconeGrupoAtivo = grupoAtivo ? ICONE_POR_GRUPO[grupoAtivo] || Dumbbell : null;

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.iconBtn}>
          <ArrowLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Editar dia {dia.label}</Text>
        <TouchableOpacity onPress={salvar} style={styles.iconBtn}>
          <Save size={18} color={cores.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.secaoLabel}>NOME DO TREINO DO DIA</Text>
        <TextInput
          style={styles.tituloInput}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex: Peito + Bíceps"
          placeholderTextColor={cores.textoDim}
        />

        <Text style={[styles.secaoLabel, { marginTop: 22 }]}>EXERCÍCIOS</Text>

        {lista.map((ex, i) => (
          <View style={styles.card} key={ex.id}>
            <View style={styles.cardTopo}>
              <View style={styles.setasColuna}>
                <TouchableOpacity
                  style={[styles.setaBtn, i === 0 && styles.setaBtnDesabilitada]}
                  onPress={() => moverExercicio(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp size={14} color={i === 0 ? cores.border : cores.textoDim} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.setaBtn, i === lista.length - 1 && styles.setaBtnDesabilitada]}
                  onPress={() => moverExercicio(i, 1)}
                  disabled={i === lista.length - 1}
                >
                  <ArrowDown size={14} color={i === lista.length - 1 ? cores.border : cores.textoDim} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.nomeInput}
                value={ex.nome}
                onChangeText={(v) => atualizarCampo(ex.id, "nome", v)}
                placeholder="Nome do exercício"
                placeholderTextColor={cores.textoDim}
              />
              <TouchableOpacity onPress={() => abrirSeletorParaTrocar(ex.id)} style={styles.removerBtn}>
                <Repeat size={15} color={cores.textoDim} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removerExercicio(ex.id)} style={styles.removerBtn}>
                <Trash2 size={16} color={cores.descanso} />
              </TouchableOpacity>
            </View>

            <View style={styles.camposLinha}>
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>séries</Text>
                <TextInput
                  style={styles.campoInput}
                  value={String(ex.series)}
                  onChangeText={(v) => atualizarCampo(ex.id, "series", v.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>reps</Text>
                <TextInput
                  style={styles.campoInput}
                  value={ex.reps}
                  onChangeText={(v) => atualizarCampo(ex.id, "reps", v)}
                />
              </View>
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>descanso (s)</Text>
                <TextInput
                  style={styles.campoInput}
                  value={String(ex.rest)}
                  onChangeText={(v) => atualizarCampo(ex.id, "rest", v.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.botoesAdicionar}>
          <TouchableOpacity style={styles.adicionarBtnSecundario} onPress={adicionarExercicioEmBranco}>
            <Plus size={15} color={cores.textoDim} />
            <Text style={styles.adicionarBtnSecundarioTexto}>em branco</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adicionarBtn} onPress={abrirSeletorParaAdicionar}>
            <ListPlus size={16} color={cores.accent} />
            <Text style={styles.adicionarBtnTexto}>escolher da lista</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Seletor de exercícios em 2 passos: grupo muscular -> exercício.
          Só abre quando o usuário toca em "escolher da lista" ou no ícone de troca. */}
      <Modal
        visible={seletorVisivel}
        transparent
        animationType="fade"
        onRequestClose={fecharSeletor}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            {grupoAtivo ? (
              <>
                <View style={styles.modalTopoComVoltar}>
                  <TouchableOpacity onPress={() => setGrupoAtivo(null)} style={styles.modalVoltarBtn}>
                    <ChevronLeft size={18} color={cores.texto} />
                  </TouchableOpacity>
                  {IconeGrupoAtivo && <IconeGrupoAtivo size={18} color={cores.accent} />}
                  <Text style={styles.modalTitulo}>
                    {GRUPOS_MUSCULARES.find((g) => g.key === grupoAtivo)?.label}
                  </Text>
                </View>

                <ScrollView style={{ maxHeight: 380 }}>
                  {(EXERCICIOS_SUGERIDOS[grupoAtivo] || []).map((nome) => (
                    <TouchableOpacity
                      key={nome}
                      style={styles.modalItem}
                      onPress={() => escolherExercicio(nome)}
                    >
                      <Text style={styles.modalItemTexto}>{nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.modalTitulo}>Escolher exercício</Text>
                <Text style={styles.modalSubtitulo}>Selecione o grupo muscular</Text>

                <View style={styles.gruposGrid}>
                  {GRUPOS_MUSCULARES.map((g) => {
                    const Icone = ICONE_POR_GRUPO[g.key] || Dumbbell;
                    return (
                      <TouchableOpacity
                        key={g.key}
                        style={styles.grupoBtn}
                        onPress={() => setGrupoAtivo(g.key)}
                      >
                        <Icone size={20} color={cores.accent} />
                        <Text style={styles.grupoBtnTexto}>{g.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalCustomLinha}>
                  <TextInput
                    style={styles.modalCustomInput}
                    placeholder="ou digite um nome personalizado"
                    placeholderTextColor={cores.textoDim}
                    value={buscaCustom}
                    onChangeText={setBuscaCustom}
                  />
                  <TouchableOpacity
                    style={styles.modalCustomBtn}
                    onPress={() => buscaCustom.trim() && escolherExercicio(buscaCustom.trim())}
                  >
                    <Text style={styles.modalCustomBtnTexto}>usar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.modalFechar} onPress={fecharSeletor}>
              <Text style={styles.modalFecharTexto}>cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.border,
  },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto },

  conteudo: { padding: 18, paddingBottom: 40 },

  secaoLabel: { fontFamily: fontes.mono, fontSize: 11, letterSpacing: 1.2, color: cores.accent, marginBottom: 8 },
  tituloInput: {
    fontFamily: fontes.display, fontSize: 22, color: cores.texto,
    backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },

  card: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTopo: { flexDirection: "row", alignItems: "center", gap: 6 },
  setasColuna: { gap: 2 },
  setaBtn: { padding: 3 },
  setaBtnDesabilitada: { opacity: 0.4 },
  nomeInput: {
    flex: 1, fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto,
    borderBottomWidth: 1, borderBottomColor: cores.border, paddingVertical: 4,
  },
  removerBtn: { padding: 6 },

  camposLinha: { flexDirection: "row", gap: 10, marginTop: 12 },
  campo: { flex: 1 },
  campoLabel: { fontFamily: fontes.monoRegular, fontSize: 10, color: cores.textoDim, marginBottom: 4 },
  campoInput: {
    fontFamily: fontes.corpoMedio, fontSize: 13, color: cores.texto, backgroundColor: cores.surface2,
    borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: "center",
  },

  botoesAdicionar: { flexDirection: "row", gap: 10, marginTop: 6 },
  adicionarBtnSecundario: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: cores.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  adicionarBtnSecundarioTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.textoDim },
  adicionarBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: cores.accent, borderRadius: 12, paddingVertical: 12,
  },
  adicionarBtnTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.accent },

  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  modalCaixa: { backgroundColor: cores.surface, borderRadius: 16, padding: 18, maxHeight: "82%" },
  modalTopoComVoltar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  modalVoltarBtn: { padding: 4 },
  modalTitulo: { fontFamily: fontes.display, fontSize: 20, color: cores.texto },
  modalSubtitulo: { fontFamily: fontes.corpo, fontSize: 12.5, color: cores.textoDim, marginTop: 2, marginBottom: 14 },

  gruposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grupoBtn: {
    width: "31%", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: cores.surface2, borderColor: cores.border, borderWidth: 1,
    borderRadius: 12, paddingVertical: 14,
  },
  grupoBtnTexto: { fontFamily: fontes.monoRegular, fontSize: 10.5, color: cores.texto, textAlign: "center" },

  modalCustomLinha: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalCustomInput: { flex: 1, backgroundColor: cores.surface2, borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: cores.texto, fontFamily: fontes.corpo, fontSize: 13 },
  modalCustomBtn: { backgroundColor: cores.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: "center" },
  modalCustomBtnTexto: { fontFamily: fontes.mono, fontSize: 11, color: "#101204" },

  modalItem: { paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: cores.border },
  modalItemTexto: { fontFamily: fontes.corpo, fontSize: 13.5, color: cores.texto },

  modalFechar: { marginTop: 12, alignItems: "center", padding: 10 },
  modalFecharTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.textoDim },
});