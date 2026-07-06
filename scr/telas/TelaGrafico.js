import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import Svg, { Polyline, Circle, Line } from "react-native-svg";
import { cores, fontes } from "../theme/theme";

const LARGURA_TELA = Dimensions.get("window").width;

export default function TelaGrafico({ nomeExercicio, pontos, aoVoltar }) {
  const largura = LARGURA_TELA - 36;
  const altura = 200;
  const padding = 24;

  const { pointsStr, coords, min, max } = useMemo(() => {
    if (pontos.length === 0) return { pointsStr: "", coords: [], min: 0, max: 0 };
    const pesosArr = pontos.map((p) => p.peso);
    const min = Math.min(...pesosArr);
    const max = Math.max(...pesosArr);
    const faixa = max - min || 1;
    const passoX = pontos.length > 1 ? (largura - padding * 2) / (pontos.length - 1) : 0;
    const coords = pontos.map((p, i) => {
      const x = padding + i * passoX;
      const y = padding + (1 - (p.peso - min) / faixa) * (altura - padding * 2);
      return { x, y, peso: p.peso, data: p.data };
    });
    const pointsStr = coords.map((c) => `${c.x},${c.y}`).join(" ");
    return { pointsStr, coords, min, max };
  }, [pontos, largura]);

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.iconBtn}>
          <ArrowLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo} numberOfLines={1}>{nomeExercicio}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {pontos.length < 2 ? (
          <Text style={styles.vazio}>
            Ainda há registros suficientes desse exercício pra montar um gráfico. Treine mais algumas vezes registrando o peso!
          </Text>
        ) : (
          <>
            <View style={styles.graficoCard}>
              <Svg width={largura} height={altura}>
                <Line x1={padding} y1={altura - padding} x2={largura - padding} y2={altura - padding} stroke={cores.border} strokeWidth={1} />
                <Polyline points={pointsStr} fill="none" stroke={cores.accent} strokeWidth={2.5} />
                {coords.map((c, i) => (
                  <Circle key={i} cx={c.x} cy={c.y} r={4} fill={cores.accent} />
                ))}
              </Svg>
              <View style={styles.eixoLegenda}>
                <Text style={styles.eixoTexto}>{min}kg</Text>
                <Text style={styles.eixoTexto}>{max}kg</Text>
              </View>
            </View>

            <Text style={[styles.secaoLabel, { marginTop: 22 }]}>HISTÓRICO</Text>
            {[...pontos].reverse().map((p, i) => (
              <View style={styles.linhaHistorico} key={i}>
                <Text style={styles.historicoData}>{p.data}</Text>
                <Text style={styles.historicoPeso}>{p.peso}kg</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.border },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto, flex: 1, textAlign: "center" },

  vazio: { fontFamily: fontes.corpo, fontSize: 13, color: cores.textoDim, textAlign: "center", marginTop: 30, lineHeight: 20 },

  graficoCard: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: "center" },
  eixoLegenda: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 4, marginTop: 4 },
  eixoTexto: { fontFamily: fontes.monoRegular, fontSize: 10.5, color: cores.textoDim },

  secaoLabel: { fontFamily: fontes.mono, fontSize: 11, letterSpacing: 1.2, color: cores.accent, marginBottom: 8 },
  linhaHistorico: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.border },
  historicoData: { fontFamily: fontes.monoRegular, fontSize: 12, color: cores.textoDim },
  historicoPeso: { fontFamily: fontes.corpoSemiBold, fontSize: 13, color: cores.texto },
});