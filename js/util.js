/* =====================================================================
   UTILITÁRIOS
   ===================================================================== */
const $ = (sel) => document.querySelector(sel);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(v).replace(/ /g, ' ');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Categorias do cardápio (a ordem aqui é a ordem das abas)
const CATEGORIAS = {
  cafe_da_manha: 'Café da Manhã',
  almoco: 'Almoço',
  porcoes: 'Porções e Caldos',
  lanches: 'Lanches',
  bebidas: 'Bebidas',
};
const CATS_COMIDA = ['cafe_da_manha', 'almoco', 'porcoes', 'lanches'];
const CAT_EMOJI = { cafe_da_manha: '☕', almoco: '🍛', porcoes: '🍖', lanches: '🥟', bebidas: '🥤' };
const CAT_DICA = {
  cafe_da_manha: 'Para começar o dia com sustância ☀️',
  almoco: 'Comida caseira, feita com carinho 🍛',
  porcoes: 'Pra dividir (ou não!) 🍖',
  lanches: 'Sequinhos e quentinhos 🥟',
  bebidas: 'Pra acompanhar e refrescar 🧊',
};
const emojiCat = (c) => CAT_EMOJI[c] || '🍽️';

const DIAS_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Dia da semana no fuso de São Paulo (independente do fuso do telemóvel)
function hojeSP() {
  const nome = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nome);
}
let HOJE = hojeSP();

/* ---------- Horário de funcionamento (abre e fecha sozinho) ---------- */
// Hora atual em São Paulo (independe do fuso do telemóvel)
function relogioSP(data = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit',
    hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(data).map((x) => [x.type, x.value]));
  return {
    dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
    min: (Number(p.hour) % 24) * 60 + Number(p.minute),
    ymd: `${p.year}-${p.month}-${p.day}`,
  };
}
const hm = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmtHora = (t) => { const [h, m] = String(t).split(':'); return m && m !== '00' ? `${Number(h)}h${m}` : `${Number(h)}h`; };
const fmtMin = (min) => fmtHora(`${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`);
// Brasil sem horário de verão desde 2019: São Paulo = UTC-3
const dataSP = (ymd, min) => new Date(new Date(`${ymd}T00:00:00-03:00`).getTime() + min * 60000);
const diasAbertos = (cfg) => (cfg.dias_abertos?.length ? cfg.dias_abertos : TODOS);

function estadoLoja(cfg = CONFIG, agora = new Date()) {
  const ate = cfg.status_manual_ate ? new Date(cfg.status_manual_ate) : null;
  if (cfg.status_manual && ate && ate > agora) return { aberta: cfg.status_manual === 'aberta', modo: 'manual', ate };
  if (cfg.horario_auto !== true) return { aberta: cfg.loja_aberta !== false, modo: 'fixo' };
  const { dia, min } = relogioSP(agora);
  const aberta = diasAbertos(cfg).includes(dia) && min >= hm(cfg.hora_abre) && min < hm(cfg.hora_fecha);
  return { aberta, modo: 'auto' };
}
const lojaAberta = () => estadoLoja().aberta;

// Próxima abertura automática → { data, texto: "amanhã às 7h" }
function proximaAbertura(cfg = CONFIG, agora = new Date()) {
  const { dia, min, ymd } = relogioSP(agora);
  const abre = hm(cfg.hora_abre);
  for (let i = 0; i < 8; i++) {
    const d = (dia + i) % 7;
    if (!diasAbertos(cfg).includes(d) || (i === 0 && min >= abre)) continue;
    return {
      data: dataSP(ymd, i * 1440 + abre),
      texto: `${i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DIAS_LONGO[d]} às ${fmtHora(cfg.hora_abre)}`,
    };
  }
  return null;
}

function quandoTexto(data) {
  const hoje = relogioSP();
  const alvo = relogioSP(data);
  const dias = Math.round((new Date(alvo.ymd) - new Date(hoje.ymd)) / 86400000);
  return `${dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : DIAS_LONGO[alvo.dia]} às ${fmtMin(alvo.min)}`;
}

// Café da manhã e almoço têm horário próprio dentro do funcionamento
function janelaCategoria(cat, cfg = CONFIG) {
  if (cfg.horario_auto !== true) return null;
  if (cat === 'cafe_da_manha' && cfg.cafe_ate) return { ini: hm(cfg.hora_abre), fim: hm(cfg.cafe_ate), iniT: cfg.hora_abre, fimT: cfg.cafe_ate };
  if (cat === 'almoco' && cfg.almoco_desde) return { ini: hm(cfg.almoco_desde), fim: hm(cfg.hora_fecha), iniT: cfg.almoco_desde, fimT: cfg.hora_fecha };
  return null;
}

function textoDias(dias) {
  if (dias.length === 1) {
    const d = dias[0];
    return d === 0 || d === 6 ? `Só aos ${DIAS_LONGO[d]}s` : `Só às ${DIAS_LONGO[d]}s`;
  }
  const ord = [...dias].sort((a, b) => a - b);
  const seguidos = ord.every((d, i) => i === 0 || d === ord[i - 1] + 1);
  if (seguidos && ord.length >= 3) return `${DIAS_CURTO[ord[0]]} a ${DIAS_CURTO[ord[ord.length - 1]]}`;
  return 'Só ' + ord.map((d) => DIAS_CURTO[d]).join(', ').replace(/, ([^,]*)$/, ' e $1');
}

// Estado de disponibilidade de um prato
/* Fase 19 — trava de horário: a categoria SOME da tela quando o horário dela acaba
   (ex.: café da manhã depois das 10h). Categoria que ainda vai começar continua
   aparecendo, com o aviso "A partir das ...". */
function categoriaEncerrada(cat) {
  const jan = janelaCategoria(cat);
  if (!jan) return false;
  const est = estadoLoja();
  if (!est.aberta || est.modo === 'manual') return false;   // abertura manual libera tudo
  return relogioSP().min >= jan.fim;
}

function disponibilidade(p) {
  if (p.esgotado) return { pode: false, tipo: 'esgotado', texto: 'Esgotado' };
  // Grupo obrigatório sem opções suficientes em estoque (ex: todas as carnes esgotadas)
  if (p.grupos.some((g) => g.opcoes.filter((o) => !o.esgotado).length < g.min))
    return { pode: false, tipo: 'esgotado', texto: 'Esgotado' };
  const restrito = p.dias.length < 7;
  if (restrito && !p.dias.includes(HOJE)) return { pode: false, tipo: 'dia', texto: textoDias(p.dias) };
  // Fora do horário da categoria (ex: café depois das 10h). Abertura manual libera tudo.
  const jan = janelaCategoria(p.categoria);
  const est = estadoLoja();
  if (jan && est.aberta && est.modo !== 'manual') {
    const { min } = relogioSP();
    if (min < jan.ini) return { pode: false, tipo: 'horario', texto: `A partir das ${fmtHora(jan.iniT)}` };
    if (min >= jan.fim) return { pode: false, tipo: 'horario', texto: `Servido até as ${fmtHora(jan.fimT)}` };
  }
  if (restrito && p.dias.length <= 2) return { pode: true, tipo: 'hoje', texto: 'Especial de hoje' };
  return { pode: true, tipo: 'ok', texto: '' };
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.dataset.show = 'true';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.dataset.show = 'false'), 2200);
}
