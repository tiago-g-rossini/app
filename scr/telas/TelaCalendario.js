import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
import { cores, fontes } from "../theme/theme";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA_LABEL = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg..dom

function isoDeData(d) {
  return d.toISOString().slice(0, 10);
}

// aoAbrirSessao(data, diaKey) — navega pra tela de detalhe/edição daquela sessão.
export default function TelaCalendario({ sessoes, dias, aoVoltar, aoAbrirSessao }) {
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const sessoesPorData = useMemo(() => {
    const mapa = {};
    sessoes.forEach((s) => {
      if (!mapa[s.data]) mapa[s.data] = [];
      mapa[s.data].push(s);
    });
    return mapa;
  }, [sessoes]);

  const semanas = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const offsetInicio = (primeiroDia.getDay() + 6) % 7; // segunda = 0
    const totalDias = ultimoDia.getDate();

    const celulas = [];
    for (let i = 0; i < offsetInicio; i++) celulas.push(null);
    for (let dia = 1; dia <= totalDias; dia++) celulas.push(new Date(ano, mes, dia));
    while (celulas.length % 7 !== 0) celulas.push(null);

    const linhas = [];
    for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
    return linhas;
  }, [mesRef]);

  function mudarMes(delta) {
    setMesRef((prev) => {
      const novo = new Date(prev);
      novo.setMonth(novo.getMonth() + delta);
      return novo;
    });
  }

  // FIX: antes só mostrava um Alert informativo; agora navega pra tela de
  // detalhe, onde dá pra corrigir pesos ou excluir a sessão. Se houver mais
  // de um treino no mesmo dia (dois diaKey diferentes na mesma data), oferece
  // um Alert simples pra escolher qual abrir antes de navegar.
  function tocarDia(data) {
    if (!data) return;
    const iso = isoDeData(data);
    const doDia = sessoesPorData[iso];
    if (!doDia || doDia.length === 0) return;

    if (doDia.length === 1) {
      aoAbrirSessao(iso, doDia[0].diaKey);
      return;
    }

    const botoes = doDia.map((s) => ({
      text: dias.find((d) => d.key === s.diaKey)?.label || s.diaKey,
      onPress: () => aoAbrirSessao(iso, s.diaKey),
    }));
    Alert.alert("Mais de um treino nesse dia", "Qual você quer ver?", [
      ...botoes,
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  const hojeIso = isoDeData(new Date());

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.iconBtn}>
          <ArrowLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Calendário</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.navMes}>
        <TouchableOpacity onPress={() => mudarMes(-1)} style={styles.iconBtn}>
          <ChevronLeft size={18} color={cores.texto} />
        </TouchableOpacity>
        <Text style={styles.mesTexto}>
          {NOMES_MES[mesRef.getMonth()]} {mesRef.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => mudarMes(1)} style={styles.iconBtn}>
          <ChevronRight size={18} color={cores.texto} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={styles.linhaSemana}>
          {DIAS_SEMANA_LABEL.map((l, i) => (
            <Text key={i} style={styles.diaSemanaLabel}>{l}</Text>
          ))}
        </View>

        {semanas.map((linha, i) => (
          <View key={i} style={styles.linhaSemana}>
            {linha.map((data, j) => {
              if (!data) return <View key={j} style={styles.celula} />;
              const iso = isoDeData(data);
              const feito = !!sessoesPorData[iso];
              const ehHoje = iso === hojeIso;
              return (
                <TouchableOpacity
                  key={j}
                  style={[styles.celula, feito && styles.celulaFeita, ehHoje && styles.celulaHoje]}
                  onPress={() => tocarDia(data)}
                >
                  <Text style={[styles.celulaTexto, feito && styles.celulaTextoFeito]}>
                    {data.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Text style={styles.legenda}>toque em um dia marcado para ver, editar ou excluir o treino feito</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.border },
  iconBtn: { padding: 6 },
  headerTitulo: { fontFamily: fontes.corpoSemiBold, fontSize: 15, color: cores.texto },

  navMes: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 10 },
  mesTexto: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.texto, textTransform: "capitalize", minWidth: 140, textAlign: "center" },

  linhaSemana: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  diaSemanaLabel: { width: 38, textAlign: "center", fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim },
  celula: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  celulaFeita: { backgroundColor: cores.accentDim, borderWidth: 1, borderColor: cores.accent },
  celulaHoje: { borderWidth: 1, borderColor: cores.descanso },
  celulaTexto: { fontFamily: fontes.corpoMedio, fontSize: 12.5, color: cores.textoDim },
  celulaTextoFeito: { color: cores.accent, fontFamily: fontes.corpoSemiBold },

  legenda: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim, textAlign: "center", marginTop: 16 },
});