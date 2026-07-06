import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Play,
  Trophy,
  Pencil,
  Flame,
  X,
  Check,
  Timer as TimerIcon,
  Repeat,
  TrendingUp,
  Calendar as CalendarIcon,
  Settings,
} from "lucide-react-native";

import { cores, fontes } from "./scr/theme/theme";
import {
  DIAS,
  construirPlanoInicial,
  diaDaSemanaAtualIndex,
  ehFimDeSemana,
  EXERCICIOS_SUGERIDOS,
} from "./scr/data/treino";
import { storageGet, storageSet } from "./scr/storage/storage";
import TelaTreino from "./scr/telas/TelaTreino";
import TelaEditor from "./scr/telas/TelaEditor";
import TelaCalendario from "./scr/telas/TelaCalendario";
import TelaConfig from "./scr/telas/TelaConfig";
import TelaGrafico from "./scr/telas/TelaGrafico";
import TelaSessao from "./scr/telas/TelaSessao";

SplashScreen.preventAutoHideAsync();

function isoDeData(d) {
  return d.toISOString().slice(0, 10);
}

// Gera um id novo para um exercício — usado quando um exercício existente é
// "trocado" por outro, para não fazer o histórico/recorde do exercício antigo
// vazar para o novo (eles têm nomes diferentes, então merecem ids diferentes).
function gerarId(diaKey) {
  return `${diaKey}-${Date.now()}`;
}

// FIX: streak não quebra mais nos fins de semana (sáb/dom são pulados em vez
// de contarem como "dia sem treino" que interrompe a sequência).
function calcularStreak(sessoes) {
  if (!sessoes || sessoes.length === 0) return 0;
  const datas = new Set(sessoes.map((s) => s.data));

  const ehDiaUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6;

  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // se hoje é dia útil e ainda não treinou hoje, começa a contagem de ontem
  if (ehDiaUtil(cursor) && !datas.has(isoDeData(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // trava de segurança para nunca rodar em loop infinito
  let guard = 0;
  while (guard < 3650) {
    guard++;
    if (!ehDiaUtil(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!datas.has(isoDeData(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Converte "8-12" ou "10" na média numérica de repetições, para cálculo de volume.
function repsNumero(repsTexto) {
  const nums = String(repsTexto).match(/\d+/g)?.map(Number) || [];
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function volumeDaSessao(sessao) {
  return (sessao.registros || []).reduce(
    (acc, r) => acc + (r.peso || 0) * (r.series || 0) * repsNumero(r.repsTexto),
    0
  );
}

function inicioDaSemana() {
  const d = new Date();
  const diaSemana = d.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// FIX: recalcula "última carga usada" (pesos) e "recorde" (recordes) do zero,
// varrendo todas as sessões em ordem cronológica. Antes esses dois estados só
// eram atualizados de forma incremental ao finalizar um treino, então editar
// ou excluir uma sessão antiga deixava pesos/recordes desatualizados ou
// "fantasmas" (ex: um PR criado por erro de digitação nunca sumia mesmo
// depois de corrigido). Chamar essa função após qualquer edição/exclusão
// garante que os dois sempre reflitam o histórico real.
function recalcularPesosERecordes(sessoes) {
  const pesos = {};
  const recordes = {};
  const emOrdem = [...sessoes].sort((a, b) => a.data.localeCompare(b.data));
  emOrdem.forEach((s) => {
    (s.registros || []).forEach((r) => {
      if (r.peso > 0) {
        pesos[r.id] = r.peso; // sessões em ordem crescente de data, então o último vence
        if (r.peso > (recordes[r.id]?.peso || 0)) {
          recordes[r.id] = { peso: r.peso, data: s.data };
        }
      }
    });
  });
  return { pesos, recordes };
}

function AppInterno() {
  const [fontesCarregadas] = useFonts({
    BebasNeue_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [carregando, setCarregando] = useState(true);
  const [tela, setTela] = useState("inicio"); // "inicio" | "treino" | "editor" | "calendario" | "config" | "grafico" | "sessao"
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [plano, setPlano] = useState(null);
  const [titulos, setTitulos] = useState({});
  const [pesos, setPesos] = useState({});
  const [recordes, setRecordes] = useState({});
  const [sessoes, setSessoes] = useState([]);

  // Sessão de treino "ao vivo" — sobrevive a navegar para outras telas E a
  // fechar o app, porque é persistida no storage a cada mudança.
  const [sessaoAtiva, setSessaoAtiva] = useState(null);

  // Modal customizado de "sair do treino" (substitui o Alert.alert nativo,
  // que além de feio/fora do tema, não funciona direito no preview web).
  const [modalSairVisivel, setModalSairVisivel] = useState(false);

  // Troca rápida de exercício e navegação para o gráfico de um exercício específico.
  const [trocaAlvo, setTrocaAlvo] = useState(null);
  const [nomeCustomizado, setNomeCustomizado] = useState("");
  const [graficoExId, setGraficoExId] = useState(null);
  const [graficoExNome, setGraficoExNome] = useState("Exercício");

  // Sessão já registrada (histórico) selecionada no Calendário para ver/editar/excluir.
  const [sessaoSelecionadaChave, setSessaoSelecionadaChave] = useState(null); // { data, diaKey }

  const descansandoAnteriorRef = useRef(false);

  const carregarTudo = useCallback(async () => {
    const [pl, tt, p, r, s, sessaoSalva] = await Promise.all([
      storageGet("plano_v2", null),
      storageGet("titulos_dias", {}),
      storageGet("pesos", {}),
      storageGet("recordes", {}),
      storageGet("sessoes", []),
      storageGet("sessao_ativa", null),
    ]);
    if (pl) {
      setPlano(pl);
    } else {
      const inicial = construirPlanoInicial();
      setPlano(inicial);
      storageSet("plano_v2", inicial);
    }
    setTitulos(tt);
    setPesos(p);
    setRecordes(r);
    setSessoes(s);
    if (sessaoSalva) {
      // FIX: garante que sessões antigas (salvas antes do recurso de série
      // extra existir) ganhem o campo seriesExtras ao serem recarregadas,
      // evitando undefined mais adiante.
      setSessaoAtiva({ seriesExtras: {}, ...sessaoSalva });
    }
    setDiaAtivo(diaDaSemanaAtualIndex());
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const aoLayoutPronto = useCallback(async () => {
    if (fontesCarregadas) {
      await SplashScreen.hideAsync();
    }
  }, [fontesCarregadas]);

  // Relógio "global" do descanso: continua contando mesmo se o usuário
  // minimizar o treino e ficar navegando em outra tela.
  useEffect(() => {
    if (!sessaoAtiva?.descansando) return;
    const t = setInterval(() => {
      setSessaoAtiva((prev) => {
        if (!prev || !prev.descansando) return prev;
        if (Date.now() >= prev.descansoFim) {
          return { ...prev, descansando: false, descansoFim: null };
        }
        return prev;
      });
    }, 300);
    return () => clearInterval(t);
  }, [sessaoAtiva?.descansando, sessaoAtiva?.descansoFim]);

  // Vibra quando o descanso termina (seja porque acabou o tempo, seja
  // porque o usuário pulou) — feedback útil sem precisar olhar para o celular.
  useEffect(() => {
    const estaDescansando = !!sessaoAtiva?.descansando;
    if (descansandoAnteriorRef.current && !estaDescansando) {
      Vibration.vibrate(350);
    }
    descansandoAnteriorRef.current = estaDescansando;
  }, [sessaoAtiva?.descansando]);

  // Persiste a sessão ativa a cada mudança, para sobreviver a fechar o app.
  useEffect(() => {
    if (carregando) return;
    storageSet("sessao_ativa", sessaoAtiva);
  }, [sessaoAtiva, carregando]);

  const streak = useMemo(() => calcularStreak(sessoes), [sessoes]);

  const volumeSemana = useMemo(() => {
    const inicio = inicioDaSemana();
    return sessoes
      .filter((s) => new Date(s.data + "T00:00:00") >= inicio)
      .reduce((acc, s) => acc + volumeDaSessao(s), 0);
  }, [sessoes]);

  if (!fontesCarregadas || carregando || !plano) {
    return null;
  }

  const diaBase = DIAS[diaAtivo];
  const dia = { ...diaBase, titulo: titulos[diaBase.key] || diaBase.titulo };
  const exercicios = plano[dia.key] || [];
  const sessaoDeHoje = sessoes.find(
    (s) => s.data === isoDeData(new Date()) && s.diaKey === dia.key
  );
  const volumeSessaoHoje = sessaoDeHoje ? volumeDaSessao(sessaoDeHoje) : null;
  const fimDeSemana = ehFimDeSemana();

  // Dados do treino que está "ao vivo" na sessão — independente do dia
  // que o usuário está navegando na tela inicial.
  const diaSessaoBase = sessaoAtiva ? DIAS.find((d) => d.key === sessaoAtiva.diaKey) : null;
  const diaSessao = diaSessaoBase
    ? { ...diaSessaoBase, titulo: titulos[diaSessaoBase.key] || diaSessaoBase.titulo }
    : null;
  const exerciciosSessao = sessaoAtiva ? plano[sessaoAtiva.diaKey] || [] : [];
  const exercicioAtualSessao = sessaoAtiva ? exerciciosSessao[sessaoAtiva.indiceAtual] : null;
  const sessaoConcluida = !!sessaoAtiva && sessaoAtiva.indiceAtual >= exerciciosSessao.length;

  function iniciarTreino() {
    if (sessaoAtiva && sessaoAtiva.diaKey !== dia.key) {
      Alert.alert(
        "Treino em andamento",
        `Você tem um treino de ${sessaoAtiva.diaKey.toUpperCase()} rolando. Quer descartar e começar o de ${dia.label} agora?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Descartar e iniciar",
            style: "destructive",
            onPress: () => iniciarNovaSessao(),
          },
        ]
      );
      return;
    }
    if (!sessaoAtiva) {
      iniciarNovaSessao();
      return;
    }
    setTela("treino");
  }

  function iniciarNovaSessao() {
    setSessaoAtiva({
      diaKey: dia.key,
      indiceAtual: 0,
      seriesFeitas: {},
      seriesExtras: {}, // FIX: estado inicial para contagem de séries extra (drop set)
      pesosSessao: {},
      descansando: false,
      descansoFim: null,
      descansoDuracao: 0,
      inicio: Date.now(),
    });
    setTela("treino");
  }

  function abrirEditor() {
    setTela("editor");
  }

  function marcarSerie() {
    setSessaoAtiva((prev) => {
      if (!prev) return prev;
      const listaAtual = plano[prev.diaKey] || [];
      const exAtual = listaAtual[prev.indiceAtual];
      if (!exAtual) return prev;
      const feitas = prev.seriesFeitas[exAtual.id] || 0;
      const novoTotal = feitas + 1;
      const novasSeries = { ...prev.seriesFeitas, [exAtual.id]: novoTotal };

      if (novoTotal >= exAtual.series) {
        return {
          ...prev,
          seriesFeitas: novasSeries,
          indiceAtual: prev.indiceAtual + 1,
          descansando: false,
          descansoFim: null,
        };
      }
      return {
        ...prev,
        seriesFeitas: novasSeries,
        descansando: true,
        descansoFim: Date.now() + exAtual.rest * 1000,
        descansoDuracao: exAtual.rest,
      };
    });
  }

  // FIX: implementação que faltava — adiciona uma "série extra" (drop set)
  // ao exercício atualmente em andamento na tela de treino.
  function adicionarSerieExtra() {
    setSessaoAtiva((prev) => {
      if (!prev) return prev;
      const listaAtual = plano[prev.diaKey] || [];
      const exAtual = listaAtual[prev.indiceAtual];
      if (!exAtual) return prev;
      const atual = prev.seriesExtras?.[exAtual.id] || 0;
      return {
        ...prev,
        seriesExtras: { ...(prev.seriesExtras || {}), [exAtual.id]: atual + 1 },
      };
    });
  }

  // FIX: implementação que faltava — usada na tela de revisão final, onde o
  // usuário pode marcar série extra em qualquer exercício por id (não só no atual).
  function adicionarSerieExtraPara(exId) {
    setSessaoAtiva((prev) => {
      if (!prev) return prev;
      const atual = prev.seriesExtras?.[exId] || 0;
      return {
        ...prev,
        seriesExtras: { ...(prev.seriesExtras || {}), [exId]: atual + 1 },
      };
    });
  }

  function pularDescanso() {
    setSessaoAtiva((prev) =>
      prev ? { ...prev, descansando: false, descansoFim: null } : prev
    );
  }

  function ajustarDescanso(deltaSegundos) {
    setSessaoAtiva((prev) => {
      if (!prev || !prev.descansando || !prev.descansoFim) return prev;
      const novoFim = Math.max(Date.now() + 1000, prev.descansoFim + deltaSegundos * 1000);
      return { ...prev, descansoFim: novoFim };
    });
  }

  function atualizarPesoSessao(exId, valor) {
    setSessaoAtiva((prev) => {
      if (!prev) return prev;
      return { ...prev, pesosSessao: { ...(prev.pesosSessao || {}), [exId]: valor } };
    });
  }

  // Abre o modal customizado (substitui o antigo Alert.alert de confirmação).
  function confirmarCancelarSessao() {
    setModalSairVisivel(true);
  }

  function descartarSessao() {
    setSessaoAtiva(null);
    setModalSairVisivel(false);
    setTela("inicio");
  }

  async function handleFinalizarTreino() {
    if (!sessaoAtiva) return;
    const listaAtual = plano[sessaoAtiva.diaKey] || [];
    const hojeIso = isoDeData(new Date());

    const registros = listaAtual.map((ex) => {
      const bruto = sessaoAtiva.pesosSessao?.[ex.id];
      const valor = parseFloat((bruto || "").replace(",", "."));
      const pesoFinal = !isNaN(valor) && valor > 0 ? valor : pesos[ex.id] || 0;
      return { id: ex.id, nome: ex.nome, peso: pesoFinal, series: ex.series, repsTexto: ex.reps };
    });

    const duracaoSegundos = sessaoAtiva.inicio
      ? Math.max(0, Math.round((Date.now() - sessaoAtiva.inicio) / 1000))
      : null;

    const sessao = { data: hojeIso, diaKey: sessaoAtiva.diaKey, duracaoSegundos, registros };
    const novasSessoes = [
      ...sessoes.filter((s) => !(s.data === sessao.data && s.diaKey === sessao.diaKey)),
      sessao,
    ];

    // FIX: pesos/recordes agora são sempre recalculados a partir de todas as
    // sessões (em vez de só comparar com o estado anterior), então o
    // comportamento fica idêntico ao de editar/excluir uma sessão antiga.
    const { pesos: pesosAtualizados, recordes: recordesAtualizados } =
      recalcularPesosERecordes(novasSessoes);

    setPesos(pesosAtualizados);
    setRecordes(recordesAtualizados);
    setSessoes(novasSessoes);
    setSessaoAtiva(null);

    await Promise.all([
      storageSet("pesos", pesosAtualizados),
      storageSet("recordes", recordesAtualizados),
      storageSet("sessoes", novasSessoes),
    ]);
    setTela("inicio");
  }

  async function handleSalvarExercicios(novaLista, novoTitulo) {
    const novoPlano = { ...plano, [dia.key]: novaLista };
    const novosTitulos = { ...titulos, [dia.key]: novoTitulo?.trim() || dia.titulo };
    setPlano(novoPlano);
    setTitulos(novosTitulos);
    await Promise.all([
      storageSet("plano_v2", novoPlano),
      storageSet("titulos_dias", novosTitulos),
    ]);
    setTela("inicio");
  }

  async function confirmarTroca(novoNome) {
    if (!trocaAlvo) return;
    // FIX: gera um id novo para o exercício trocado. Antes o id era mantido, e
    // como pesos/recorde/gráfico são indexados por id, o histórico do
    // exercício antigo "vazava" para o novo (ex: trocar Supino por Crucifixo e
    // ver o PR do Supino aparecendo como se fosse do Crucifixo). Com um id
    // novo, o exercício trocado começa "zerado" — e o histórico antigo
    // continua correto nas sessões já registradas (elas guardam nome+peso
    // próprios, não dependem do plano atual).
    const novaLista = (plano[dia.key] || []).map((ex) =>
      ex.id === trocaAlvo ? { ...ex, id: gerarId(dia.key), nome: novoNome } : ex
    );
    const novoPlano = { ...plano, [dia.key]: novaLista };
    setPlano(novoPlano);
    setTrocaAlvo(null);
    setNomeCustomizado("");
    await storageSet("plano_v2", novoPlano);
  }

  // FIX: guarda também o nome do exercício no momento em que o gráfico é
  // aberto, para tela de gráfico não perder o título caso o exercício seja
  // trocado/removido do plano depois.
  function abrirGrafico(exId, nomeEx) {
    setGraficoExId(exId);
    setGraficoExNome(nomeEx || "Exercício");
    setTela("grafico");
  }

  // Abre a tela de detalhe de uma sessão já registrada (a partir do Calendário).
  function abrirSessao(data, diaKey) {
    setSessaoSelecionadaChave({ data, diaKey });
    setTela("sessao");
  }

  // Salva correções de peso numa sessão já registrada, recalculando
  // pesos/recordes do zero em seguida.
  async function salvarEdicaoSessao(novosRegistros) {
    if (!sessaoSelecionadaChave) return;
    const { data, diaKey } = sessaoSelecionadaChave;
    const novasSessoes = sessoes.map((s) =>
      s.data === data && s.diaKey === diaKey ? { ...s, registros: novosRegistros } : s
    );
    const { pesos: pesosAtualizados, recordes: recordesAtualizados } =
      recalcularPesosERecordes(novasSessoes);

    setSessoes(novasSessoes);
    setPesos(pesosAtualizados);
    setRecordes(recordesAtualizados);
    setSessaoSelecionadaChave(null);

    await Promise.all([
      storageSet("sessoes", novasSessoes),
      storageSet("pesos", pesosAtualizados),
      storageSet("recordes", recordesAtualizados),
    ]);
    setTela("calendario");
  }

  // Exclui a sessão selecionada e recalcula pesos/recordes do zero.
  async function excluirSessaoAtual() {
    if (!sessaoSelecionadaChave) return;
    const { data, diaKey } = sessaoSelecionadaChave;
    const novasSessoes = sessoes.filter((s) => !(s.data === data && s.diaKey === diaKey));
    const { pesos: pesosAtualizados, recordes: recordesAtualizados } =
      recalcularPesosERecordes(novasSessoes);

    setSessoes(novasSessoes);
    setPesos(pesosAtualizados);
    setRecordes(recordesAtualizados);
    setSessaoSelecionadaChave(null);

    await Promise.all([
      storageSet("sessoes", novasSessoes),
      storageSet("pesos", pesosAtualizados),
      storageSet("recordes", recordesAtualizados),
    ]);
    setTela("calendario");
  }

  // Modal customizado de "sair do treino" — usado tanto na tela de treino
  // quanto (se precisar) em cima de qualquer outra tela.
  const modalSair = (
    <Modal
      visible={modalSairVisivel}
      transparent
      animationType="fade"
      onRequestClose={() => setModalSairVisivel(false)}
    >
      <View style={styles.modalFundo}>
        <View style={styles.modalSairCaixa}>
          <View style={styles.modalSairIconeWrap}>
            <X size={22} color={cores.descanso} />
          </View>
          <Text style={styles.modalSairTitulo}>Sair do treino?</Text>
          <Text style={styles.modalSairTexto}>
            Isso vai descartar o progresso desse treino — séries marcadas e descanso em andamento.
          </Text>
          <View style={styles.modalSairBotoes}>
            <TouchableOpacity
              style={styles.modalSairBtnContinuar}
              onPress={() => setModalSairVisivel(false)}
            >
              <Text style={styles.modalSairBtnContinuarTexto}>Continuar treino</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSairBtnDescartar} onPress={descartarSessao}>
              <Text style={styles.modalSairBtnDescartarTexto}>Descartar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (tela === "treino" && sessaoAtiva) {
    return (
      <>
        <TelaTreino
          dia={diaSessao}
          exercicios={exerciciosSessao}
          sessao={sessaoAtiva}
          pesosAtuais={pesos}
          aoMarcarSerie={marcarSerie}
          aoAdicionarSerieExtra={adicionarSerieExtra}
          aoAdicionarSerieExtraPara={adicionarSerieExtraPara}
          aoPularDescanso={pularDescanso}
          aoAjustarDescanso={ajustarDescanso}
          aoAtualizarPeso={atualizarPesoSessao}
          aoMinimizar={() => setTela("inicio")}
          aoCancelar={confirmarCancelarSessao}
          aoFinalizar={handleFinalizarTreino}
        />
        {modalSair}
      </>
    );
  }

  if (tela === "editor") {
    return (
      <TelaEditor
        dia={dia}
        exercicios={exercicios}
        aoSalvar={handleSalvarExercicios}
        aoVoltar={() => setTela("inicio")}
      />
    );
  }

  if (tela === "calendario") {
    return (
      <TelaCalendario
        sessoes={sessoes}
        dias={DIAS}
        aoVoltar={() => setTela("inicio")}
        aoAbrirSessao={abrirSessao}
      />
    );
  }

  if (tela === "config") {
    return (
      <TelaConfig
        aoVoltar={() => setTela("inicio")}
        aoImportado={() => {
          carregarTudo();
          setTela("inicio");
        }}
      />
    );
  }

  if (tela === "sessao" && sessaoSelecionadaChave) {
    const sessaoSel = sessoes.find(
      (s) => s.data === sessaoSelecionadaChave.data && s.diaKey === sessaoSelecionadaChave.diaKey
    );
    if (!sessaoSel) {
      // sessão sumiu por algum motivo (ex: excluída em outra aba) — volta para o calendário
      setTela("calendario");
      return null;
    }
    const label = DIAS.find((d) => d.key === sessaoSelecionadaChave.diaKey)?.label || sessaoSelecionadaChave.diaKey;
    return (
      <TelaSessao
        sessao={sessaoSel}
        diaLabel={label}
        aoVoltar={() => {
          setSessaoSelecionadaChave(null);
          setTela("calendario");
        }}
        aoSalvar={salvarEdicaoSessao}
        aoExcluir={excluirSessaoAtual}
      />
    );
  }

  if (tela === "grafico" && graficoExId) {
    const pontos = sessoes
      .filter((s) => (s.registros || []).some((r) => r.id === graficoExId))
      .map((s) => ({ data: s.data, peso: s.registros.find((r) => r.id === graficoExId).peso }))
      .sort((a, b) => a.data.localeCompare(b.data));
    // FIX: fallback agora usa o nome guardado ao abrir o gráfico (que já vem
    // do card clicado), em vez de tentar ler "nome" de um ponto que nunca tem
    // esse campo. Continua preferindo o nome atual do plano quando existir.
    const nomeEx = exercicios.find((e) => e.id === graficoExId)?.nome || graficoExNome;
    return (
      <TelaGrafico
        nomeExercicio={nomeEx}
        pontos={pontos}
        aoVoltar={() => setTela("inicio")}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.bg }} onLayout={aoLayoutPronto}>
      <SafeAreaView style={styles.wrap}>
        <View style={styles.header}>
          <View style={styles.headerTopo}>
            <Text style={styles.eyebrow}>DIVISÃO SEMANAL · 5X</Text>
            <View style={styles.headerIcones}>
              {streak > 0 && (
                <View style={styles.streakPill}>
                  <Flame size={12} color={cores.descanso} />
                  <Text style={styles.streakTexto}>
                    {streak} {streak === 1 ? "dia" : "dias"}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.iconBtn} onPress={() => setTela("calendario")}>
                <CalendarIcon size={16} color={cores.textoDim} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setTela("config")}>
                <Settings size={16} color={cores.textoDim} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.display}>Meu Treino</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DIAS.map((d, i) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.diaPill, i === diaAtivo && styles.diaPillAtivo]}
                onPress={() => setDiaAtivo(i)}
              >
                <Text style={[styles.diaPillTexto, i === diaAtivo && styles.diaPillTextoAtivo]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.conteudo,
            sessaoAtiva && { paddingBottom: 110 },
          ]}
        >
          <View style={styles.volumeCard}>
            <Text style={styles.volumeLabel}>VOLUME DESTA SEMANA</Text>
            <Text style={styles.volumeValor}>
              {Math.round(volumeSemana).toLocaleString("pt-BR")} kg
            </Text>
          </View>

          {fimDeSemana && diaAtivo === diaDaSemanaAtualIndex() && (
            <View style={styles.avisoDescanso}>
              <Text style={styles.avisoDescansoTexto}>
                Hoje é dia de descanso! Sem treino programado para o fim de semana. Pode navegar para ver os próximos treinos.
              </Text>
            </View>
          )}

          <View style={[styles.resumoTopo, !volumeSessaoHoje && styles.resumoTopoSemVolume]}>
            <Text style={styles.resumoTitulo}>{dia.titulo}</Text>
            <View style={styles.resumoAcoes}>
              {sessaoDeHoje && (
                <View style={styles.feitoTag}>
                  <Text style={styles.feitoTagTexto}>✓ feito hoje</Text>
                </View>
              )}
              <TouchableOpacity style={styles.editarBtn} onPress={abrirEditor}>
                <Pencil size={12} color={cores.textoDim} />
                <Text style={styles.editarBtnTexto}>editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {volumeSessaoHoje !== null && (
            <Text style={styles.volumeDiaTexto}>
              volume do treino: {Math.round(volumeSessaoHoje).toLocaleString("pt-BR")} kg
            </Text>
          )}

          <TouchableOpacity style={styles.iniciarBtn} onPress={iniciarTreino}>
            <Play size={16} color="#101204" fill="#101204" />
            <Text style={styles.iniciarBtnTexto}>
              {sessaoAtiva && sessaoAtiva.diaKey === dia.key
                ? "Continuar treino"
                : sessaoDeHoje
                ? "Refazer treino de hoje"
                : "Iniciar treino de hoje"}
            </Text>
          </TouchableOpacity>

          {exercicios.map((ex) => {
            const rec = recordes[ex.id];
            return (
              <View style={styles.card} key={ex.id}>
                <View style={styles.cardTopo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exNome}>{ex.nome}</Text>
                    <Text style={styles.exMeta}>
                      {ex.series}×{ex.reps} reps · desc. {ex.rest}s
                    </Text>
                  </View>
                  {rec && (
                    <View style={styles.prBadge}>
                      <Trophy size={11} color={cores.accent} />
                      <Text style={styles.prBadgeTexto}>{rec.peso}kg</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cargaLinha}>
                  <Text style={styles.ultimaCarga}>
                    última carga: {pesos[ex.id] ? `${pesos[ex.id]}kg` : "—"}
                  </Text>
                  <Text style={styles.recordeCarga}>
                    recorde: {rec ? `${rec.peso}kg` : "—"}
                  </Text>
                </View>
                <View style={styles.cardAcoes}>
                  <TouchableOpacity
                    style={styles.cardAcaoBtn}
                    onPress={() => {
                      setTrocaAlvo(ex.id);
                      setNomeCustomizado("");
                    }}
                  >
                    <Repeat size={12} color={cores.textoDim} />
                    <Text style={styles.cardAcaoTexto}>trocar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardAcaoBtn}
                    onPress={() => abrirGrafico(ex.id, ex.nome)}
                  >
                    <TrendingUp size={12} color={cores.textoDim} />
                    <Text style={styles.cardAcaoTexto}>gráfico</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {exercicios.length === 0 && (
            <Text style={styles.vazio}>nenhum exercício cadastrado para esse dia ainda.</Text>
          )}
        </ScrollView>

        {/* Mini-player: aparece quando tem um treino "ao vivo" e o usuário
            está navegando pela tela inicial em vez de estar na tela de treino. */}
        {sessaoAtiva && (
          <TouchableOpacity
            style={styles.miniPlayer}
            activeOpacity={0.85}
            onPress={() => setTela("treino")}
          >
            <View style={styles.miniPlayerIcone}>
              {sessaoConcluida ? (
                <Check size={18} color="#101204" />
              ) : sessaoAtiva.descansando ? (
                <TimerIcon size={18} color="#101204" />
              ) : (
                <Play size={16} color="#101204" fill="#101204" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniPlayerDia} numberOfLines={1}>
                {diaSessao?.titulo} · {diaSessao?.label}
              </Text>
              <Text style={styles.miniPlayerExercicio} numberOfLines={1}>
                {sessaoConcluida
                  ? "Treino concluído — toque para revisar e salvar"
                  : sessaoAtiva.descansando
                  ? "Em descanso…"
                  : exercicioAtualSessao?.nome || "Treino em andamento"}
              </Text>
            </View>
            {!sessaoConcluida && (
              <Text style={styles.miniPlayerProgresso}>
                {Math.min(sessaoAtiva.indiceAtual + 1, exerciciosSessao.length)}/{exerciciosSessao.length}
              </Text>
            )}
            <TouchableOpacity
              style={styles.miniPlayerFechar}
              onPress={(e) => {
                e.stopPropagation?.();
                confirmarCancelarSessao();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={cores.textoDim} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Modal de troca rápida de exercício */}
        <Modal
          visible={!!trocaAlvo}
          transparent
          animationType="fade"
          onRequestClose={() => setTrocaAlvo(null)}
        >
          <View style={styles.modalFundo}>
            <View style={styles.modalCaixa}>
              <Text style={styles.modalTitulo}>Trocar exercício</Text>

              <View style={styles.modalCustomLinha}>
                <TextInput
                  style={styles.modalCustomInput}
                  placeholder="ou digite um nome personalizado"
                  placeholderTextColor={cores.textoDim}
                  value={nomeCustomizado}
                  onChangeText={setNomeCustomizado}
                />
                <TouchableOpacity
                  style={styles.modalCustomBtn}
                  onPress={() => nomeCustomizado.trim() && confirmarTroca(nomeCustomizado.trim())}
                >
                  <Text style={styles.modalCustomBtnTexto}>usar</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {Object.entries(EXERCICIOS_SUGERIDOS).map(([categoria, itens]) => (
                  <View key={categoria}>
                    <Text style={styles.modalCategoria}>{categoria.toUpperCase()}</Text>
                    {itens.map((nome) => (
                      <TouchableOpacity
                        key={nome}
                        style={styles.modalItem}
                        onPress={() => confirmarTroca(nome)}
                      >
                        <Text style={styles.modalItemTexto}>{nome}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.modalFechar} onPress={() => setTrocaAlvo(null)}>
                <Text style={styles.modalFecharTexto}>cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {modalSair}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: cores.bg },

  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: cores.border },
  headerTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerIcones: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 4 },
  eyebrow: { fontFamily: fontes.mono, fontSize: 11, letterSpacing: 1.5, color: cores.accent },
  display: { fontFamily: fontes.display, fontSize: 34, color: cores.texto, marginTop: 2, marginBottom: 14 },

  streakPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: cores.descansoDim, borderColor: cores.descanso, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  streakTexto: { fontFamily: fontes.mono, fontSize: 10.5, color: cores.descanso },

  diaPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: cores.border, backgroundColor: cores.surface, marginRight: 8 },
  diaPillAtivo: { backgroundColor: cores.accent, borderColor: cores.accent },
  diaPillTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.textoDim, letterSpacing: 0.5 },
  diaPillTextoAtivo: { color: "#101204", fontFamily: fontes.corpoBold },

  conteudo: { padding: 18, paddingBottom: 40 },

  volumeCard: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  volumeLabel: { fontFamily: fontes.mono, fontSize: 10.5, letterSpacing: 1, color: cores.textoDim, marginBottom: 4 },
  volumeValor: { fontFamily: fontes.display, fontSize: 26, color: cores.accent },

  avisoDescanso: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  avisoDescansoTexto: { color: cores.textoDim, fontSize: 12, fontFamily: fontes.corpo, lineHeight: 18 },

  resumoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  volumeDiaTexto: { fontFamily: fontes.monoRegular, fontSize: 10.5, color: cores.textoDim, marginBottom: 14 },
  resumoTopoSemVolume: { marginBottom: 12 },
  resumoTitulo: { fontFamily: fontes.display, fontSize: 22, color: cores.texto },
  resumoAcoes: { flexDirection: "row", alignItems: "center", gap: 8 },
  feitoTag: { backgroundColor: cores.accentDim, borderColor: cores.accent, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  feitoTagTexto: { fontFamily: fontes.mono, fontSize: 10.5, color: cores.accent },
  editarBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  editarBtnTexto: { fontFamily: fontes.mono, fontSize: 10.5, color: cores.textoDim },

  iniciarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: cores.accent, borderRadius: 12, paddingVertical: 14, marginBottom: 18 },
  iniciarBtnTexto: { fontFamily: fontes.corpoBold, fontSize: 14, color: "#101204" },

  card: { backgroundColor: cores.surface, borderColor: cores.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  exNome: { fontFamily: fontes.corpoSemiBold, fontSize: 14.5, color: cores.texto, lineHeight: 19 },
  exMeta: { fontFamily: fontes.monoRegular, fontSize: 11.5, color: cores.textoDim, marginTop: 4 },
  prBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: cores.accentDim, borderColor: cores.accent, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  prBadgeTexto: { fontFamily: fontes.mono, fontSize: 10.5, color: cores.accent },
  cargaLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  ultimaCarga: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.textoDim },
  recordeCarga: { fontFamily: fontes.monoRegular, fontSize: 11, color: cores.accent },
  cardAcoes: { flexDirection: "row", gap: 8, marginTop: 10 },
  cardAcaoBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: cores.surface2, borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  cardAcaoTexto: { fontFamily: fontes.mono, fontSize: 10.5, color: cores.textoDim },

  vazio: { textAlign: "center", color: cores.textoDim, fontFamily: fontes.monoRegular, fontSize: 12, paddingVertical: 20 },

  miniPlayer: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: cores.surface,
    borderColor: cores.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  miniPlayerIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPlayerDia: { fontFamily: fontes.mono, fontSize: 10, color: cores.accent, letterSpacing: 0.5 },
  miniPlayerExercicio: { fontFamily: fontes.corpoSemiBold, fontSize: 13, color: cores.texto, marginTop: 1 },
  miniPlayerProgresso: { fontFamily: fontes.mono, fontSize: 11, color: cores.textoDim, marginRight: 2 },
  miniPlayerFechar: { padding: 4 },

  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 24 },
  modalCaixa: { backgroundColor: cores.surface, borderRadius: 16, padding: 18, maxHeight: "80%" },
  modalTitulo: { fontFamily: fontes.display, fontSize: 20, color: cores.texto, marginBottom: 10 },
  modalCustomLinha: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modalCustomInput: { flex: 1, backgroundColor: cores.surface2, borderColor: cores.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: cores.texto, fontFamily: fontes.corpo, fontSize: 13 },
  modalCustomBtn: { backgroundColor: cores.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: "center" },
  modalCustomBtnTexto: { fontFamily: fontes.mono, fontSize: 11, color: "#101204" },
  modalCategoria: { fontFamily: fontes.mono, fontSize: 10.5, letterSpacing: 1, color: cores.accent, marginTop: 10, marginBottom: 4 },
  modalItem: { paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: cores.border },
  modalItemTexto: { fontFamily: fontes.corpo, fontSize: 13.5, color: cores.texto },
  modalFechar: { marginTop: 12, alignItems: "center", padding: 10 },
  modalFecharTexto: { fontFamily: fontes.mono, fontSize: 12, color: cores.textoDim },

  // Modal de "sair do treino" — substitui o Alert.alert nativo
  modalSairCaixa: { backgroundColor: cores.surface, borderRadius: 18, padding: 22, alignItems: "center" },
  modalSairIconeWrap: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: cores.descansoDim,
    borderWidth: 1, borderColor: cores.descanso, alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  modalSairTitulo: { fontFamily: fontes.display, fontSize: 22, color: cores.texto, marginBottom: 8 },
  modalSairTexto: { fontFamily: fontes.corpo, fontSize: 13, color: cores.textoDim, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  modalSairBotoes: { width: "100%", gap: 10 },
  modalSairBtnContinuar: { backgroundColor: cores.accent, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalSairBtnContinuarTexto: { fontFamily: fontes.corpoBold, fontSize: 14, color: "#101204" },
  modalSairBtnDescartar: { borderWidth: 1, borderColor: cores.descanso, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalSairBtnDescartarTexto: { fontFamily: fontes.corpoSemiBold, fontSize: 14, color: cores.descanso },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInterno />
    </SafeAreaProvider>
  );
}