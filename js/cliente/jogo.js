/* =====================================================================
   FASE 10 — JOGUINHO "BLOCO BÃO" (enquanto espera o pedido)
   Quebra-cabeça de blocos: arraste as peças para o tabuleiro 8×8 e
   complete linhas ou colunas para limpá-las. Original, sem dependências.
   ===================================================================== */
const JOGO_N = 8;
const JOGO_CORES = ['#facc15', '#f97316', '#ef4444', '#d946ef', '#22c55e', '#a3e635', '#22d3ee', '#3b82f6'];
const JOGO_FORMAS = [
  [[0, 0]],
  [[0, 0], [0, 1]], [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],                   // T
  [[0, 1], [1, 0], [1, 1], [1, 2]],                   // T invertido
  [[0, 0], [1, 0], [1, 1], [2, 0]], [[0, 1], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [1, 0], [2, 0]],   // L
  [[0, 1], [1, 1], [2, 1], [2, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 0], [1, 1]],   // S/Z
  [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]],
];
const LS_RECORDE = 'sertaobao_jogo_recorde_v1';

const jogo = { tab: [], pecas: [], pontos: 0, recorde: 0, arrasto: null, acabou: false, cel: 36 };

/* ---------- Sons (gerados na hora com Web Audio — sem arquivos) ---------- */
const LS_SOM = 'sertaobao_jogo_som_v1';
const som = { ctx: null, on: true };
try { som.on = localStorage.getItem(LS_SOM) !== '0'; } catch (_) {}

function somCtx() {
  if (!som.on) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!som.ctx) som.ctx = new AC();
  if (som.ctx.state === 'suspended') som.ctx.resume();
  return som.ctx;
}
// Um tom com envelope curto (ataque rápido, queda suave)
function tom(ctx, ini, freq, dur, { tipo = 'sine', vol = 0.2, freqFim = null } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, ini);
  if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, ini + dur);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ini); o.stop(ini + dur + 0.02);
}
// Estalinho de "madeira/plástico" (ruído filtrado bem curto)
function estalo(ctx, ini, { dur = 0.035, vol = 0.25, freq = 2400 } = {}) {
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(ini);
}
const sons = {
  pegar() { const c = somCtx(); if (!c) return; tom(c, c.currentTime, 740, 0.05, { tipo: 'triangle', vol: 0.05 }); },
  // "Toc!" satisfatório: baque grave + estalo + brilho — varia um pouco a cada peça
  encaixe(qtd = 1) {
    const c = somCtx(); if (!c) return;
    const t0 = c.currentTime, v = 0.94 + Math.random() * 0.12, peso = Math.min(1, 0.6 + qtd * 0.08);
    tom(c, t0, 260 * v, 0.14, { freqFim: 85, vol: 0.38 * peso });
    estalo(c, t0, { vol: 0.28, freq: 2200 * v });
    tom(c, t0 + 0.005, 1320 * v, 0.07, { tipo: 'triangle', vol: 0.05 });
  },
  // Limpar linha: arpejo brilhante que sobe (mais linhas → mais notas)
  limpar(linhas = 1) {
    const c = somCtx(); if (!c) return;
    const t0 = c.currentTime;
    const notas = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    notas.slice(0, Math.min(notas.length, 3 + linhas)).forEach((f, i) => {
      tom(c, t0 + i * 0.065, f, 0.22, { tipo: 'triangle', vol: 0.14 });
      tom(c, t0 + i * 0.065, f * 2, 0.12, { tipo: 'sine', vol: 0.04 });
    });
    estalo(c, t0, { dur: 0.25, vol: 0.06, freq: 6000 });
  },
  erro() { const c = somCtx(); if (!c) return; tom(c, c.currentTime, 190, 0.13, { freqFim: 130, vol: 0.1 }); },
  fim() {
    const c = somCtx(); if (!c) return;
    [392, 329.63, 261.63, 196].forEach((f, i) => tom(c, c.currentTime + i * 0.14, f, 0.3, { tipo: 'triangle', vol: 0.12 }));
  },
};

function atualizarBotaoSom() {
  const b = document.querySelector('[data-jogo-som]');
  if (b) { b.textContent = som.on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(som.on)); }
}

function jogoNovaPeca() {
  const forma = JOGO_FORMAS[Math.floor(Math.random() * JOGO_FORMAS.length)];
  return { forma, cor: JOGO_CORES[Math.floor(Math.random() * JOGO_CORES.length)] };
}

function jogoCabe(forma, r, c) {
  return forma.every(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && cc >= 0 && rr < JOGO_N && cc < JOGO_N && !jogo.tab[rr][cc];
  });
}

function jogoTemJogada() {
  return jogo.pecas.some((p) => p && Array.from({ length: JOGO_N * JOGO_N }).some((_, i) => jogoCabe(p.forma, Math.floor(i / JOGO_N), i % JOGO_N)));
}

function abrirJogo() {
  try { jogo.recorde = Number(localStorage.getItem(LS_RECORDE)) || 0; } catch (_) {}
  if (!jogo.tab.length || jogo.acabou) jogoReiniciar();
  const el = $('#jogo');
  el.classList.remove('hidden');
  el.classList.add('flex');
  document.body.style.overflow = 'hidden';
  atualizarBotaoSom();
  somCtx();   // "destrava" o áudio no iPhone (precisa de um toque do usuário)
  jogoRender();
}

function fecharJogo() {
  const el = $('#jogo');
  el.classList.add('hidden');
  el.classList.remove('flex');
  if ($('#cart').dataset.open !== 'true' && $('#meusPedidos')?.dataset.open !== 'true') document.body.style.overflow = '';
  if ($('#meusPedidos')?.dataset.open === 'true') renderMeusPedidos(); // atualiza o recorde
}

function jogoReiniciar() {
  jogo.tab = Array.from({ length: JOGO_N }, () => Array(JOGO_N).fill(null));
  jogo.pecas = [jogoNovaPeca(), jogoNovaPeca(), jogoNovaPeca()];
  jogo.pontos = 0;
  jogo.acabou = false;
  $('#jogoFim')?.classList.add('hidden');
}

function jogoTamanho() {
  const larg = Math.min(window.innerWidth - 32, 380);
  jogo.cel = Math.floor(larg / JOGO_N);
}

const blocoHTML = (cor, tam, extra = '') =>
  `<span class="jogo-bloco ${extra}" style="width:${tam}px;height:${tam}px;background-color:${cor}"></span>`;

function pecaHTML(p, tam) {
  const alt = Math.max(...p.forma.map(([r]) => r)) + 1;
  const lar = Math.max(...p.forma.map(([, c]) => c)) + 1;
  return `<span class="relative block" style="width:${lar * tam}px;height:${alt * tam}px">
    ${p.forma.map(([r, c]) => `<span class="absolute" style="top:${r * tam}px;left:${c * tam}px">${blocoHTML(p.cor, tam - 2)}</span>`).join('')}
  </span>`;
}

function jogoRender() {
  jogoTamanho();
  const t = jogo.cel;
  $('#jogoPontos').textContent = jogo.pontos;
  $('#jogoRecorde').textContent = Math.max(jogo.recorde, jogo.pontos);
  const tab = $('#jogoTab');
  tab.style.width = tab.style.height = `${t * JOGO_N + 8}px`;
  tab.innerHTML = jogo.tab.map((linha, r) => linha.map((cor, c) => `
    <span data-cel="${r}-${c}" class="absolute" style="top:${4 + r * t}px;left:${4 + c * t}px;width:${t - 2}px;height:${t - 2}px">
      ${cor ? blocoHTML(cor, t - 2) : '<span class="jogo-vazio block h-full w-full"></span>'}
    </span>`).join('')).join('');

  const miniT = Math.floor(t * 0.62);
  $('#jogoBandeja').innerHTML = jogo.pecas.map((p, i) => `
    <div class="grid h-28 flex-1 place-items-center">
      ${p ? `<button data-peca="${i}" class="touch-none p-2 ${jogo.acabou ? 'opacity-40' : 'active:scale-95'}" aria-label="Peça">${pecaHTML(p, miniT)}</button>` : ''}
    </div>`).join('');
  jogoStatusPedido();
}

function jogoStatusPedido() {
  const p = state.ultimoPedido;
  const el = $('#jogoPedido');
  if (!el) return;
  if (!p?.token) { el.classList.add('hidden'); return; }
  const info = infoStatus(p);
  el.classList.remove('hidden');
  el.innerHTML = `<span class="${info.anim}">${info.icone}</span> #${esc(p.id)} · ${esc(info.titulo)}`;
}

/* ---------- Arrastar e soltar ---------- */
function jogoPosicao(ev) {
  const a = jogo.arrasto;
  const box = $('#jogoTab').getBoundingClientRect();
  const x = ev.clientX - a.offX - box.left - 4;
  const y = ev.clientY - a.offY - box.top - 4;
  return { r: Math.round(y / jogo.cel), c: Math.round(x / jogo.cel) };
}

function jogoPreview(r, c) {
  document.querySelectorAll('#jogoTab .jogo-prev').forEach((e) => e.classList.remove('jogo-prev'));
  const a = jogo.arrasto;
  if (!a || !jogoCabe(a.peca.forma, r, c)) return false;
  a.peca.forma.forEach(([dr, dc]) => {
    document.querySelector(`[data-cel="${r + dr}-${c + dc}"] .jogo-vazio`)?.classList.add('jogo-prev');
  });
  $('#jogoTab').style.setProperty('--prev', a.peca.cor);
  return true;
}

function jogoInicioArrasto(ev) {
  const btn = ev.target.closest('[data-peca]');
  if (!btn || jogo.acabou) return;
  ev.preventDefault();
  const i = Number(btn.dataset.peca);
  const peca = jogo.pecas[i];
  const t = jogo.cel;
  const alt = (Math.max(...peca.forma.map(([r]) => r)) + 1) * t;
  const lar = (Math.max(...peca.forma.map(([, c]) => c)) + 1) * t;
  const fant = document.createElement('div');
  fant.className = 'pointer-events-none fixed z-[70] drop-shadow-2xl';
  fant.innerHTML = pecaHTML(peca, t);
  document.body.appendChild(fant);
  // a peça flutua acima do dedo para não ficar escondida
  jogo.arrasto = { i, peca, fant, offX: lar / 2, offY: alt + 40 };
  sons.pegar();
  btn.style.visibility = 'hidden';
  jogoMoverArrasto(ev);
}

function jogoMoverArrasto(ev) {
  const a = jogo.arrasto;
  if (!a) return;
  a.fant.style.left = `${ev.clientX - a.offX}px`;
  a.fant.style.top = `${ev.clientY - a.offY}px`;
  const { r, c } = jogoPosicao(ev);
  a.alvo = jogoPreview(r, c) ? { r, c } : null;
}

function jogoFimArrasto() {
  const a = jogo.arrasto;
  if (!a) return;
  a.fant.remove();
  jogo.arrasto = null;
  if (!a.alvo) { sons.erro(); jogoRender(); return; }
  const { r, c } = a.alvo;
  a.peca.forma.forEach(([dr, dc]) => { jogo.tab[r + dr][c + dc] = a.peca.cor; });
  jogo.pontos += a.peca.forma.length;
  jogo.pecas[a.i] = null;
  navigator.vibrate?.(15);
  sons.encaixe(a.peca.forma.length);

  // Linhas e colunas completas
  const linhas = [], colunas = [];
  for (let k = 0; k < JOGO_N; k++) {
    if (jogo.tab[k].every(Boolean)) linhas.push(k);
    if (jogo.tab.every((l) => l[k])) colunas.push(k);
  }
  const total = linhas.length + colunas.length;
  if (total) {
    jogo.pontos += total * 10 * total;     // combo: limpar várias de uma vez vale mais
    jogoRender();
    linhas.forEach((k) => { for (let j = 0; j < JOGO_N; j++) document.querySelector(`[data-cel="${k}-${j}"]`)?.classList.add('jogo-limpa'); });
    colunas.forEach((k) => { for (let j = 0; j < JOGO_N; j++) document.querySelector(`[data-cel="${j}-${k}"]`)?.classList.add('jogo-limpa'); });
    if (total > 1) jogoMensagem(total >= 3 ? 'INCRÍVEL! 🔥' : 'COMBO! ✨');
    setTimeout(() => sons.limpar(total), 70);
    navigator.vibrate?.([30, 30, 30]);
    setTimeout(() => {
      linhas.forEach((k) => jogo.tab[k].fill(null));
      colunas.forEach((k) => jogo.tab.forEach((l) => { l[k] = null; }));
      jogoDepoisDaJogada();
    }, 260);
  } else {
    jogoDepoisDaJogada();
  }
}

function jogoDepoisDaJogada() {
  if (jogo.pecas.every((p) => !p)) jogo.pecas = [jogoNovaPeca(), jogoNovaPeca(), jogoNovaPeca()];
  if (jogo.pontos > jogo.recorde) {
    jogo.recorde = jogo.pontos;
    try { localStorage.setItem(LS_RECORDE, String(jogo.recorde)); } catch (_) {}
  }
  if (!jogoTemJogada()) {
    jogo.acabou = true;
    sons.fim();
    jogoRender();
    $('#jogoFimPontos').textContent = jogo.pontos;
    $('#jogoFimRecorde').textContent = jogo.recorde;
    $('#jogoFim').classList.remove('hidden');
    return;
  }
  jogoRender();
}

function jogoMensagem(txt) {
  const m = $('#jogoMsg');
  m.textContent = txt;
  m.classList.remove('jogo-msg'); void m.offsetWidth; m.classList.add('jogo-msg');
}

$('#jogoBandeja').addEventListener('pointerdown', jogoInicioArrasto);
window.addEventListener('pointermove', (ev) => { if (jogo.arrasto) { ev.preventDefault(); jogoMoverArrasto(ev); } }, { passive: false });
window.addEventListener('pointerup', jogoFimArrasto);
window.addEventListener('pointercancel', jogoFimArrasto);
window.addEventListener('resize', () => { if (!$('#jogo').classList.contains('hidden')) jogoRender(); });
$('#jogo').addEventListener('click', (ev) => {
  if (ev.target.closest('[data-jogo-fechar]')) return fecharJogo();
  if (ev.target.closest('[data-jogo-reiniciar]')) { jogoReiniciar(); jogoRender(); }
  if (ev.target.closest('[data-jogo-som]')) {
    som.on = !som.on;
    try { localStorage.setItem(LS_SOM, som.on ? '1' : '0'); } catch (_) {}
    atualizarBotaoSom();
    if (som.on) sons.encaixe(1);
  }
});
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-abrir-jogo]')) abrirJogo(); });
