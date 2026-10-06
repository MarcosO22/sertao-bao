/* =====================================================================
   FASE 16 — ALARME DE COZINHA
   Pedido novo → som em repetição (audio.loop) + tela piscando em vermelho.
   Só para quando: clicar em "🔊 Parar Alarme" ou não sobrar pedido pendente.
   ===================================================================== */
const alarme = { ativo: false, audio: null, tituloOriginal: document.title, timerTitulo: null };

// Gera (uma vez) o som do alarme como um ficheiro WAV na memória: 3 bipes fortes + pausa
function somDoAlarme() {
  if (alarme.audio) return alarme.audio;
  const taxa = 22050, dur = 1.4, n = Math.floor(taxa * dur);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const txt = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true); v.setUint32(28, taxa * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, n * 2, true);
  const bipes = [[0, 988], [0.22, 1319], [0.44, 988]]; // início (s), frequência (Hz)
  for (let i = 0; i < n; i++) {
    const s = i / taxa; let a = 0;
    for (const [ini, f] of bipes) {
      const x = s - ini;
      if (x >= 0 && x < 0.18) {
        const env = Math.min(1, x / 0.01) * Math.min(1, (0.18 - x) / 0.03); // sem estalos
        a += env * (Math.sin(2 * Math.PI * f * x) > 0 ? 0.55 : -0.55);     // onda quadrada = mais "estridente"
      }
    }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, a)) * 0x5fff, true);
  }
  alarme.audio = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
  alarme.audio.loop = true;      // ← toca em repetição contínua
  alarme.audio.volume = 1;
  return alarme.audio;
}

function tocarAudioAlarme() {
  const a = somDoAlarme();
  const p = a.play();
  // Se o navegador bloquear o som (ninguém clicou na página ainda), tenta de novo no próximo clique
  p?.catch?.(() => document.addEventListener('pointerdown', () => { if (alarme.ativo) a.play().catch(() => {}); }, { once: true }));
}

function dispararAlarme(pedido) {
  garantirBarraAlarme();
  $('#alarmeTexto').textContent = pedido?.codigo
    ? `Novo pedido #${pedido.codigo}${pedido.cliente_nome ? ` — ${pedido.cliente_nome}` : ''}`
    : 'Novo pedido!';
  if (alarme.ativo) return; // já está tocando: só atualiza o texto
  alarme.ativo = true;
  document.documentElement.classList.add('alarme-ativo');
  tocarAudioAlarme();
  navigator.vibrate?.([300, 150, 300, 150, 300]);
  // Pisca também o título da aba (se o painel estiver atrás de outra aba)
  let alterna = false;
  alarme.tituloOriginal = document.title.startsWith('🔴') ? alarme.tituloOriginal : document.title;
  alarme.timerTitulo = setInterval(() => {
    document.title = (alterna = !alterna) ? '🔴 NOVO PEDIDO!' : alarme.tituloOriginal;
  }, 900);
}

function pararAlarme() {
  if (!alarme.ativo) return;
  alarme.ativo = false;
  document.documentElement.classList.remove('alarme-ativo');
  if (alarme.audio) { alarme.audio.pause(); alarme.audio.currentTime = 0; }
  clearInterval(alarme.timerTitulo);
  document.title = alarme.tituloOriginal;
}

// Os dados carregados na tela incluem o dia de hoje? (senão não dá para saber se ainda há pendentes)
const dadosIncluemHoje = () => {
  const hoje = relogioSP().ymd;
  return admin.pedModo === 'periodo' ? admin.pedFim >= hoje : admin.pedDia === hoje;
};

// Chamado sempre que a lista muda: se o pedido pendente foi aceito, o alarme para sozinho
function conferirAlarme(pendentesHoje) {
  if (alarme.ativo && admin.pedCarregado && dadosIncluemHoje() && pendentesHoje === 0) pararAlarme();
}

// Barra fixa no topo com o botão grande de parar
function garantirBarraAlarme() {
  if ($('#alarmeBarra')) return;
  const el = document.createElement('div');
  el.id = 'alarmeBarra';
  el.setAttribute('role', 'alert');
  el.className = 'fixed inset-x-0 top-0 z-[100] h-[72px] items-center justify-center gap-3 bg-red-700 px-4 text-white shadow-2xl';
  el.innerHTML = `
    <p id="alarmeTexto" class="min-w-0 truncate text-sm font-extrabold sm:text-base">Novo pedido!</p>
    <button id="alarmeParar" class="alarme-botao shrink-0 rounded-full bg-white px-6 py-3 text-base font-black text-red-700 shadow-lg ring-4 ring-white/40 sm:text-lg">
      🔊 Parar Alarme</button>`;
  document.body.appendChild(el);
  $('#alarmeParar').addEventListener('click', (e) => { e.stopPropagation(); pararAlarme(); });
}
// Atalho de teclado: Esc também para o alarme
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && alarme.ativo) pararAlarme(); });

// Bolinha da aba: pendentes de HOJE (funciona tanto no modo dia como no período)
function atualizarBadgePedidos() {
  const hoje = relogioSP().ymd;
  const n = admin.pedidos.filter((p) => p.status === 'pendente' && relogioSP(new Date(p.criado_em)).ymd === hoje).length;
  const el = $('#badgePedidos');
  if (el) { el.textContent = n; el.classList.toggle('hidden', !n); }
  conferirAlarme(n);
}

function bipNovoPedido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    navigator.vibrate?.([120, 60, 120]);
  } catch (_) {}
}

/* ---------- Fase 15 — Notificações do computador (alerta nativo do navegador) ---------- */
const notifSuportada = () => 'Notification' in window && window.isSecureContext !== false;
const notifEstado = () => (notifSuportada() ? Notification.permission : 'indisponivel'); // 'default' | 'granted' | 'denied'

// Pede autorização (uma vez). Funciona com a API nova (Promise) e a antiga (callback, Safari velho)
async function pedirPermissaoNotificacao() {
  if (!notifSuportada() || Notification.permission !== 'default') return notifEstado();
  try {
    const r = await new Promise((ok) => { const p = Notification.requestPermission(ok); if (p?.then) p.then(ok); });
    if (r === 'granted') toast('🔔 Alertas ativados! Você será avisado de cada pedido novo.');
    else if (r === 'denied') toast('Alertas bloqueados. Dá para liberar no cadeado 🔒 ao lado do endereço do site.');
  } catch (_) {}
  if (admin.aba === 'pedidos' && location.hash === '#admin') renderPedidos();
  return notifEstado();
}

// Ao entrar na aba Pedidos: tenta pedir já. Alguns navegadores só aceitam o pedido
// depois de um clique; por isso, se ainda estiver pendente, pede no 1º clique no painel.
function verificarNotificacoes() {
  if (notifEstado() !== 'default') return;
  if (!admin._notifTentou) { admin._notifTentou = true; pedirPermissaoNotificacao(); }
  if (!admin._notifClique) {
    admin._notifClique = true;
    $('#adminApp').addEventListener('click', () => { if (notifEstado() === 'default') pedirPermissaoNotificacao(); }, { once: true, capture: true });
  }
}

// Dispara o alerta nativo (aparece no canto da tela, mesmo com o navegador minimizado)
function notificarNovoPedido(p) {
  if (notifEstado() !== 'granted') return;
  try {
    const n = new Notification('Novo Pedido 🔔', {
      body: `Chegou um novo pedido no Sertão Bão. Vá ao painel para confirmar!\n#${p.codigo || ''} · ${p.cliente_nome || ''}${p.tipo === 'entrega' ? ' · 🛵 Entrega' : ' · 🛍️ Retirada'}`,
      icon: document.querySelector('link[rel="icon"]')?.href,
      tag: `pedido-${p.codigo || p.id}`,   // não repete o mesmo pedido
      requireInteraction: true,            // fica na tela até você clicar ou fechar
    });
    n.onclick = () => {
      window.focus();
      n.close();
      if (location.hash !== '#admin') location.hash = '#admin';
      if (admin.aba !== 'pedidos') document.querySelector('[data-admin-aba="pedidos"]')?.click();
      else if (admin.pedModo !== 'dia' || admin.pedDia !== relogioSP().ymd) irParaDia(relogioSP().ymd);
    };
  } catch (e) {
    // Chrome no Android não aceita "new Notification" fora de Service Worker: ignora sem quebrar
    console.warn('[Notificação]', e);
  }
}

// Aviso discreto no topo da aba Pedidos enquanto os alertas não estiverem ligados
function avisoNotificacoes() {
  const st = notifEstado();
  if (st === 'granted' || st === 'indisponivel') return '';
  if (st === 'denied') return `
    <p class="mb-3 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink-muted">
      🔕 Alertas do computador bloqueados. Para ativar: clique no cadeado 🔒 ao lado do endereço do site → Notificações → Permitir, e recarregue a página.</p>`;
  return `
    <div class="mb-3 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
      <p class="text-xs text-brand-800"><strong>Ative os alertas</strong> para ser avisado de pedidos novos mesmo com o navegador minimizado.</p>
      <button data-notif-ativar class="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">🔔 Ativar</button>
    </div>`;
}

function assinarPedidos() {
  if (admin.canalPedidos) return;
  let t;
  admin.canalPedidos = sb.channel('painel-pedidos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (ev) => {
      if (ev.eventType === 'INSERT' && ev.new?.codigo) {
        dispararAlarme(ev.new);        // som em loop + tela piscando até alguém parar
        notificarNovoPedido(ev.new);
        toast(`🔔 Novo pedido #${ev.new.codigo} — ${ev.new.cliente_nome || ''}`);
      }
      clearTimeout(t);
      t = setTimeout(recarregarSeRelevante, 300);
    })
    .subscribe();
  // Plano B: se o tempo real cair, confere a cada 60 s
  if (!admin._intervaloPedidos) admin._intervaloPedidos = setInterval(() => { if (admin.pronto) recarregarSeRelevante(); }, 60000);
}

// No período fechado (que não inclui hoje) nada muda: não precisa buscar de novo
function recarregarSeRelevante() {
  if (admin.pedModo === 'periodo' && admin.pedFim < relogioSP().ymd) return;
  carregarPedidos();
}

function rotuloDia(ymd) {
  const hoje = relogioSP().ymd;
  const dif = difDias(ymd, hoje);
  return (dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : DIAS_LONGO[relogioSP(dataSP(ymd, 720)).dia]) + `, ${ddmm(ymd)}`;
}

function recarregarDoZero() {
  admin.pedidos = [];
  admin.pedCarregado = false;
  admin.pedErro = null;
  renderPedidos();
  carregarPedidos();
}

function irParaDia(ymd) {
  const hoje = relogioSP().ymd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return;
  if (ymd > hoje) return toast('Ainda não chegamos nesse dia 😉');
  admin.pedModo = 'dia';
  admin.pedDia = ymd;
  recarregarDoZero();
}
const mudarDia = (delta) => irParaDia(somaDias(admin.pedDia, delta));

// Atalhos do filtro de período
function atalhoPeriodo(k) {
  const hoje = relogioSP().ymd;
  const [y, m] = hoje.split('-').map(Number);
  const ymd = (a, b, c) => `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
  if (k === '7d') return [somaDias(hoje, -6), hoje];
  if (k === '30d') return [somaDias(hoje, -29), hoje];
  if (k === 'mes') return [ymd(y, m, 1), hoje];
  if (k === 'mes_passado') {
    const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
    return [ymd(py, pm, 1), somaDias(ymd(y, m, 1), -1)];
  }
  if (k === 'semana') { // segunda-feira desta semana até hoje
    const dow = relogioSP().dia;
    return [somaDias(hoje, -((dow + 6) % 7)), hoje];
  }
  return null;
}

function aplicarPeriodo(ini, fim) {
  const hoje = relogioSP().ymd;
  if (!ini || !fim) return toast('Escolha a data de início e de fim');
  if (fim > hoje) fim = hoje;
  if (ini > fim) [ini, fim] = [fim, ini];
  if (difDias(ini, fim) + 1 > PERIODO_MAX_DIAS) return toast('Escolha no máximo 1 ano de cada vez');
  admin.pedModo = 'periodo';
  admin.pedIni = ini;
  admin.pedFim = fim;
  admin.pedPainelPeriodo = false;
  recarregarDoZero();
}

function sairDoPeriodo() {
  admin.pedModo = 'dia';
  admin.pedPainelPeriodo = false;
  recarregarDoZero();
}
