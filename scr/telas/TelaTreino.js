import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, Check, Timer as TimerIcon, X, Plus } from "lucide-react-native";
import { useKeepAwake } from "expo-keep-awake";
import { cores, fontes } from "../theme/theme";

function formatarDuracao(segundos) {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min ${String(seg).padStart(2, "0")}s`;
}

export default function TelaTreino({
  dia,
  exercicios,
  sessao,
  pesosAtuais,
  aoMarcarSerie,
  aoAdicionarSerieExtra,
  aoAdicionarSerieExtraPara,
  aoPularDescanso,
  aoAjustarDescanso,
  aoAtualizarPeso,
  aoMinimizar,
  aoCancelar,
  aoFinalizar,
}) {
  // Mantém a tela acesa enquanto o treino está aberto — some
  // automaticamente ao minimizar ou sair, pois o hook desativa no unmount.
  useKeepAwake();

  const { indiceAtual, seriesFeitas, seriesExtras, descansando, descansoFim, descansoDuracao, pesosSessao } = sessao;

  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [duracaoAtual, setDuracaoAtual] = useState(0);
  const anelAnim = useRef(new Animated.Value(1)).current;

  const exercicioAtual = exercicios[indiceAtual];
  const totalExercicios = exercicios.length;
  const seriesDoAtual = exercicioAtual ? seriesFeitas[exercicioAtual.id] || 0 : 0;
  const extrasDoAtual = exercicioAtual ? (seriesExtras?.[exercicioAtual.id] || 0) : 0;
  const treinoConcluido = indiceAtual >= totalExercicios;

  // Cronômetro do treino inteiro — atualiza a cada segundo enquanto a tela
  // de conclusão estiver aberta, calculado a partir do horário real de início.
  useEffect(() => {
    if (!treinoConcluido || !sessao.inicio) return;
    const atualizar = () => setDuracaoAtual((Date.now() - sessao.inicio) / 1000);
    atualizar();
    const t = setInterval(atualizar, 1000);
    return () => clearInterval(t);
  }, [treinoConcluido, sessao.inicio]);

  function valorPeso(ex) {
    if (!ex) return "";
    if (pesosSessao && pesosSessao[ex.id] !== undefined) return pesosSessao[ex.id];
    return pesosAtuais[ex.id] ? String(pesosAtuais[ex.id]) : "";
  }

  function onMudarPeso(exId, valor) {
    aoAtualizarPeso(exId, valor.replace(/[^0-9.,]/g, ""));
  }

  // Contador visual do descanso — recalcula com base no horário real de
  // término, então funciona certo mesmo se a tela foi minimizada e voltou.
  useEffect(() => {
    if (!descansando || !descansoFim) {
      setSegundosRestantes(0);
      return;
    }
    const atualizar = () => {
      const s = Math.max(0, Math.ceil((descansoFim - Date.now()) / 1000));
      setSegundosRestantes(s);
    };
    atualizar();
    const t = setInterval(atualizar, 250);
    return () => clearInterval(t);
  }, [descansando, descansoFim]);

  // Barra de descanso que esvazia de verdade, sincronizada com o horário
  // real de término (funciona mesmo após ajustar +15s/-15s).
  useEffect(() => {
    anelAnim.stopAnimation();
    if (descansando && descansoFim && descansoDuracao > 0) {
      const totalMs = descansoDuracao * 1000;
      const restanteMs = Math.max(0, descansoFim - Date.now());
      anelAnim.setValue(totalMs > 0 ? restanteMs / totalMs : 0);
      Animated.timing(anelAnim, {
        toValue: 0,
        duration: restanteMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      anelAnim.setValue(1);
    }
  }, [descansando, descansoFim, descansoDuracao]);

  const alturaBarra = anelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoCancelar} style={styles.iconBtn}>
          <X size={18} color={cores.textoDim} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>{dia.titulo}</Text>
        <TouchableOpacity onPress={aoMinimizar} style={styles.iconBtn}>
          <ChevronDown size={20} color={cores.texto} />
        </TouchableOpacity>
      </View>

      {!treinoConcluido && totalExercicios > 0 && (
        <View style={styles.trilha}>
          {exercicios.map((ex, i) => (
            <View
              key={ex.id}
              style={[
                styles.trilhaSegmento,
                i < indiceAtual && styles.trilhaSegmentoFeito,
                i === indiceAtual && styles.trilhaSegmentoAtual,
              ]}
            />
          ))}
        </View>
      )}

      {treinoConcluido ? (
        <View style={{ flex: 1 }}>
          <View style={styles.centroTopo}>
            <Text style={styles.display}>Treino concluído!</Text>
            {sessao.inicio && (
              <View style={styles.duracaoPill}>
                <TimerIcon size={13} color={cores.accent} />
                <Text style={styles.duracaoTexto}>{formatarDuracao(duracaoAtual)}</Text>
              </View>
            )}
            <Text style={styles.subtexto}>Confira os pesos usados antes de salvar.</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18 }}>
            {exercicios.map((ex) => {
              const feitasEx = seriesFeitas[ex.id] || 0;
              const extrasEx = seriesExtras?.[ex.id] || 0;
              return (
                <View style={styles.card} key={ex.id}>
                  <Text style={styles.exNome}>{ex.nome}</Text>
                  <View style={styles.pesoLinha}>
                    <Text style={styles.pesoLabel}>peso usado (kg)</Text>
                    <TextInput
                      style={styles.pesoInput}
                      keyboardType="numeric"
                      value={valorPeso(ex)}
                      onChangeText={(v) => onMudarPeso(ex.id, v)}
                      placeholder="0"
                      placeholderTextColor={cores.textoDim}
                    />
                  </View>

                  <View style={styles.reviewSeriesLinha}>
                    <Text style={styles.reviewSeriesTexto}>
                      séries feitas: {feitasEx}
                      {extrasEx > 0 ? ` (+${extrasEx} extra)` : ""}
                    </Text>
                    <TouchableOpacity
                      style={styles.extraBtnPequeno}
                      onPress={() => aoAdicionarSerieExtraPara(ex.id)}
                    >
                      <Plus size={12} color={cores.descanso} />
                      <Text style={styles.extraBtnPequenoTexto}>série extra</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.finalizarBtn} onPress={aoFinalizar}>
            <Check size={16} color="#101204" />
            <Text style={styles.finalizarBtnTexto}>Salvar treino</Text>
          </TouchableOpacity>
        </View>
      ) : descansando ? (
        <View style={styles.centro}>
          <Text style={styles.eyebrowDescanso}>DESCANSO</Text>

          <View style={styles.anelExterno}>
            <Animated.View style={[styles.anelPreenchimento, { height: alturaBarra }]} />
            <TimerIcon size={22} color={cores.texto} style={{ marginBottom: 4 }} />
            <Text style={styles.timerNumero}>{segundosRestantes}s</Text>
          </View>

          <Text style={styles.subtexto}>
            próxima: série {seriesDoAtual + 1} de {exercicioAtual.series}
          </Text>
          <Text style={styles.subtextoForte}>{exercicioAtual.nome}</Text>

          <View style={styles.ajusteLinha}>
            <TouchableOpacity style={styles.ajusteBtn} onPress={() => aoAjustarDescanso(-15)}>
              <Text style={styles.ajusteBtnTexto}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pularBtnLinha} onPress={aoPularDescanso}>
              <Text style={styles.pularBtnTexto}>pular descanso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ajusteBtn} onPress={() => aoAjustarDescanso(15)}>
              <Text style={styles.ajusteBtnTexto}>+15s</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : totalExercicios === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.display}>Nenhum exercício ainda</Text>
          <Text style={styles.subtexto}>
            Toque em "editar" na tela inicial para cadastrar os exercícios desse dia.
          </Text>
        </View>
      ) : (
        <View style={styles.centro}>
          <Text style={styles.eyebrow}>
            EXERCÍCIO {indiceAtual + 1} DE {totalExercicios}
          </Text>
          <Text style={styles.display}>{exercicioAtual.nome}</Text>
          <Text style={styles.subtexto}>{exercicioAtual.reps} reps</Text>

          <View style={styles.pesoInlineLinha}>
            <Text style={styles.pesoInlineLabel}>peso (kg)</Text>
            <TextInput
              style={styles.pesoInlineInput}
              keyboardType="numeric"
              value={valorPeso(exercicioAtual)}
              onChangeText={(v) => onMudarPeso(exercicioAtual.id, v)}
              placeholder="0"
              placeholderTextColor={cores.textoDim}
            />
          </View>

          <View style={styles.serieDots}>
            {Array.from({ length: exercicioAtual.series }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.serieDot,
                  i < seriesDoAtual && styles.serieDotFeita,
                  i === seriesDoAtual && styles.serieDotAtual,
                ]}
              />
            ))}
          </View>
          <Text style={styles.serieLegenda}>
            série {seriesDoAtual + 1} de {exercicioAtual.series}
            {extrasDoAtual > 0 ? ` · +${extrasDoAtual} extra` : ""}
          </Text>

          <TouchableOpacity style={styles.marcarBtn} onPress={aoMarcarSerie}>
            <Check size={20} color="#101204" />
            <Text style={styles.marcarBtnTexto}>Concluir série</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.extraBtnGrande} onPress={aoAdicionarSerieExtra}>
            <Plus size={14} color={cores.descanso} />
            <Text style={styles.extraBtnGrandeTexto}>Fazer série extra (drop set)</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.border,
  },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto },

  trilha: { flexDirection: "row", gap: 4, paddingHorizontal: 18, paddingTop: 14 },
  trilhaSegmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: cores.surface2 },
  trilhaSegmentoFeito: { backgroundColor: cores.accent },
  trilhaSegmentoAtual: { backgroundColor: cores.descanso },

  centro: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  centroTopo: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 30 },
  duracaoPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: cores.accentDim, borderColor: cores.accent, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  duracaoTexto: { fontFamily: fontes.mono, fontSize: 12.5, color: cores.accent },
  eyebrow: { fontFamily: fontes.mono, fontSize: 12, letterSpacing: 1.5, color: cores.accent, marginBottom: 8 },
  eyebrowDescanso: { fontFamily: fontes.mono, fontSize: 13, letterSpacing: 2, color: cores.descanso, marginBottom: 18 },
  display: { fontFamily: fontes.display, fontSize: 30, color: cores.texto, textAlign: "center" },
  subtexto: { fontFamily: fontes.corpo, fontSize: 13, color: cores.textoDim, marginTop: 6, textAlign: "center" },
  subtextoForte: { fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto, marginTop: 2, textAlign: "center" },

  pesoInlineLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  pesoInlineLabel: { fontFamily: fontes.monoRegular, fontSize: 11.5, color: cores.textoDim },
  pesoInlineInput: {
    fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto, backgroundColor: cores.surface,
    borderColor: cores.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, textAlign: "center",
  },

  serieDots: { flexDirection: "row", gap: 10, marginTop: 20 },
  serieDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: cores.border, backgroundColor: "transparent" },
  serieDotFeita: { backgroundColor: cores.accent, borderColor: cores.accent },
  serieDotAtual: { borderColor: cores.accent },
  serieLegenda: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim, marginTop: 8 },

  marcarBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: cores.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 32,
  },
  marcarBtnTexto: { fontFamily: fontes.corpoBold, fontSize: 15, color: "#101204" },

  extraBtnGrande: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: cores.descanso, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20, marginTop: 12,
  },
  extraBtnGrandeTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.descanso },

  anelExterno: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, borderColor: cores.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: cores.surface,
    overflow: "hidden",
  },
  anelPreenchimento: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: cores.descanso,
  },
  timerNumero: { fontFamily: fontes.display, fontSize: 44, color: cores.texto },

  ajusteLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 26 },
  ajusteBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: cores.border },
  ajusteBtnTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.texto },
  pularBtnLinha: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: cores.border },
  pularBtnTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.textoDim },

  card: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  exNome: { fontFamily: fontes.corpoSemiBold, fontSize: 14.5, color: cores.texto },
  pesoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  pesoLabel: { fontFamily: fontes.monoRegular, fontSize: 11.5, color: cores.textoDim },
  pesoInput: {
    fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto, backgroundColor: cores.surface2,
    borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 70, textAlign: "center",
  },

  reviewSeriesLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: cores.border },
  reviewSeriesTexto: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim },
  extraBtnPequeno: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: cores.descanso, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  extraBtnPequenoTexto: { fontFamily: fontes.mono, fontSize: 10, color: cores.descanso },

  finalizarBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: cores.accent, borderRadius: 14, paddingVertical: 15, marginHorizontal: 18, marginBottom: 18,
  },
  finalizarBtnTexto: { fontFamily: fontes.corpoBold, fontSize: 14, color: "#101204" },
});