export const DIAS = [
  {
    key: "seg",
    label: "SEG",
    titulo: "Treino A",
    exercicios: [],
  },
  {
    key: "ter",
    label: "TER",
    titulo: "Treino B",
    exercicios: [],
  },
  {
    key: "qua",
    label: "QUA",
    titulo: "Treino C",
    exercicios: [],
  },
  {
    key: "qui",
    label: "QUI",
    titulo: "Treino D",
    exercicios: [],
  },
  {
    key: "sex",
    label: "SEX",
    titulo: "Treino E",
    exercicios: [],
  },
];

export function construirPlanoInicial() {
  const plano = {};
  DIAS.forEach((d) => {
    plano[d.key] = d.exercicios.map((ex) => ({ ...ex }));
  });
  return plano;
}

// mapeia o dia da semana real (JS: 0=domingo...6=sábado) pro índice do nosso array (seg=0...sex=4)
export function diaDaSemanaAtualIndex() {
  const hoje = new Date().getDay();
  const mapa = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  return mapa[hoje] ?? 0;
}

export function ehFimDeSemana() {
  const hoje = new Date().getDay();
  return hoje === 0 || hoje === 6;
}

// Banco de exercícios sugeridos, organizado por grupo muscular — usado tanto
// na troca rápida (home) quanto no seletor do editor (adicionar/trocar).
// Cada grupo tem um rótulo de exibição + emoji, pra ficar fácil de escanear.
export const GRUPOS_MUSCULARES = [
  { key: "peito", label: "Peito", emoji: "🫁" },
  { key: "costas", label: "Costas", emoji: "🦾" },
  { key: "perna", label: "Perna", emoji: "🦵" },
  { key: "gluteos", label: "Glúteos", emoji: "🍑" },
  { key: "ombro", label: "Ombro", emoji: "🤸" },
  { key: "biceps", label: "Bíceps", emoji: "💪" },
  { key: "triceps", label: "Tríceps", emoji: "💪" },
  { key: "antebraco", label: "Antebraço", emoji: "✊" },
  { key: "core", label: "Core / Abdômen", emoji: "🔥" },
  { key: "panturrilha", label: "Panturrilha", emoji: "🦶" },
  { key: "cardio", label: "Cardio", emoji: "🏃" },
];

export const EXERCICIOS_SUGERIDOS = {
  peito: [
    "Supino reto (barra)",
    "Supino reto (halteres)",
    "Supino reto (máquina)",
    "Supino inclinado (barra)",
    "Supino inclinado (halteres)",
    "Supino inclinado (máquina)",
    "Supino declinado",
    "Crucifixo (halteres)",
    "Crucifixo (máquina/peck deck)",
    "Crossover (polia alta)",
    "Crossover (polia baixa)",
    "Flexão de braço",
    "Flexão com pés elevados",
    "Paralelas (foco peito)",
    "Pullover",
  ],
  costas: [
    "Barra fixa (pegada pronada)",
    "Barra fixa (pegada supinada)",
    "Puxada frente (pulley)",
    "Puxada atrás da nuca",
    "Puxada neutra",
    "Remada baixa (triângulo)",
    "Remada curvada (barra)",
    "Remada curvada (halteres)",
    "Remada cavalinho (T-bar)",
    "Remada unilateral (serrote)",
    "Remada articulada (máquina)",
    "Pulldown (braço reto)",
    "Levantamento terra",
    "Hiperextensão lombar",
  ],
  perna: [
    "Agachamento livre (barra)",
    "Agachamento smith",
    "Agachamento búlgaro",
    "Agachamento sumô",
    "Agachamento goblet",
    "Leg press 45°",
    "Leg press horizontal",
    "Cadeira extensora",
    "Cadeira flexora",
    "Mesa flexora",
    "Stiff (barra)",
    "Stiff (halteres)",
    "Afundo (passada)",
    "Afundo búlgaro",
    "Hack machine",
    "Adutora (máquina)",
    "Abdutora (máquina)",
  ],
  gluteos: [
    "Elevação pélvica (hip thrust)",
    "Elevação pélvica unilateral",
    "Coice na polia (glúteo)",
    "Coice na máquina",
    "Abdução de quadril em pé",
    "Agachamento sumô (foco glúteo)",
    "Cadeira abdutora",
  ],
  ombro: [
    "Desenvolvimento militar (barra)",
    "Desenvolvimento com halteres",
    "Desenvolvimento máquina",
    "Elevação lateral (halteres)",
    "Elevação lateral (polia)",
    "Elevação frontal",
    "Remada alta (barra)",
    "Crucifixo invertido (halteres)",
    "Crucifixo invertido (máquina)",
    "Face pull",
    "Encolhimento de ombros (trapézio)",
  ],
  biceps: [
    "Rosca direta (barra reta)",
    "Rosca direta (barra W)",
    "Rosca alternada (halteres)",
    "Rosca martelo",
    "Rosca Scott",
    "Rosca concentrada",
    "Rosca 21",
    "Rosca cabo (polia baixa)",
    "Rosca inversa",
  ],
  triceps: [
    "Tríceps corda (polia)",
    "Tríceps barra reta (polia)",
    "Tríceps francês (halteres)",
    "Tríceps francês (barra)",
    "Tríceps testa",
    "Tríceps coice (halteres)",
    "Mergulho no banco",
    "Paralelas (foco tríceps)",
    "Supino fechado",
  ],
  antebraco: [
    "Rosca de punho (barra)",
    "Rosca de punho inversa",
    "Flexão de punho na polia",
    "Farmer's walk",
  ],
  core: [
    "Abdominal supra (solo)",
    "Abdominal supra (máquina)",
    "Abdominal infra",
    "Elevação de pernas (paralelas)",
    "Elevação de pernas (solo)",
    "Prancha abdominal",
    "Prancha lateral",
    "Abdominal oblíquo (bicicleta)",
    "Abdominal na polia (cable crunch)",
    "Rotação de tronco (máquina)",
  ],
  panturrilha: [
    "Panturrilha em pé (máquina)",
    "Panturrilha sentado",
    "Panturrilha no leg press",
    "Panturrilha unilateral (halter)",
  ],
  cardio: [
    "Esteira (caminhada/corrida)",
    "Bicicleta ergométrica",
    "Elíptico",
    "Escada (stepper)",
    "Pular corda",
    "Remo (ergômetro)",
    "HIIT (bike ou esteira)",
  ],
};