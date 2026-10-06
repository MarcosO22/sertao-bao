/* =====================================================================
   FASE 9 — RASTREIO AO VIVO (cliente)
   O cliente não tem permissão para ler a tabela "pedidos" (privacidade).
   Cada pedido recebe um "token" secreto; o site ouve um canal Realtime
   exclusivo desse token (o banco avisa a cada mudança de status) e, como
   plano B, consulta o status a cada 20 s pela função rastrear_pedido().
   ===================================================================== */
const LS_PEDIDO = 'sertaobao_pedido_ativo_v1';
const FINAIS = ['concluido', 'cancelado'];

const novoToken = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

const rastreio = { canal: null, timer: null };

function salvarPedidoAtivo() {
  try { localStorage.setItem(LS_PEDIDO, JSON.stringify(state.ultimoPedido)); } catch (_) {}
}

function carregarPedidoAtivo() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_PEDIDO) || 'null');
    // Mantém por 12 h e só se ainda não terminou
    if (p?.token && Date.now() - (p.criadoEm || 0) < 12 * 3600e3 && !FINAIS.includes(p.status)) {
      state.ultimoPedido = p;
      iniciarRastreio();
    } else if (p) {
      localStorage.removeItem(LS_PEDIDO);
    }
  } catch (_) {}
  renderTrackBanner();
}

function aplicarStatus(dados) {
  const p = state.ultimoPedido;
  if (!p || !dados?.status) return;
  const mudou = dados.status !== p.status;
  p.status = dados.status;
  if ('taxa_entrega' in dados) p.taxa = dados.taxa_entrega == null ? null : Number(dados.taxa_entrega);
  if (dados.total != null) p.totalFinal = Number(dados.total);
  salvarPedidoAtivo();
  renderTrackBanner();
  jogoStatusPedido();
  if ($('#cart').dataset.open === 'true' && state.step === 'enviado') renderCart();
  if (mudou) {
    navigator.vibrate?.([80, 40, 80]);
    toast(`Pedido #${p.id}: ${infoStatus(p).titulo}`);
  }
  if (FINAIS.includes(p.status)) pararRastreio();
  // mantém o "Meus Pedidos" em dia
  const h = lerHistorico(); const item = h.find((x) => x.codigo === p.id);
  if (item && item.status !== p.status) { item.status = p.status; gravarHistorico(h); }
}

async function consultarStatus() {
  const p = state.ultimoPedido;
  if (!sb || !p?.token) return;
  const { data, error } = await sb.rpc('rastrear_pedido', { p_token: p.token });
  if (!error && data?.[0]) aplicarStatus(data[0]);
}

function iniciarRastreio() {
  const p = state.ultimoPedido;
  if (!sb || !p?.token || FINAIS.includes(p.status)) return;
  pararRastreio();
  rastreio.canal = sb.channel(`pedido:${p.token}`)
    .on('broadcast', { event: 'status' }, (msg) => aplicarStatus(msg.payload))
    .subscribe();
  rastreio.timer = setInterval(consultarStatus, 20000);
  consultarStatus();
}

function pararRastreio() {
  if (rastreio.canal) { sb.removeChannel(rastreio.canal); rastreio.canal = null; }
  clearInterval(rastreio.timer); rastreio.timer = null;
}

function abrirRastreio() {
  state.step = 'enviado';
  renderCart();
  const c = $('#cart');
  c.dataset.open = 'true';
  c.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

// Texto e ícone de cada fase, de acordo com o tipo do pedido
function infoStatus(p) {
  const entrega = p.entrega;
  return ({
    pendente:  { titulo: 'Aguardando confirmação', sub: 'O quiosque já recebeu o seu pedido e vai confirmar em instantes.', icone: '⏳', anim: 'anim-pulse' },
    preparo:   { titulo: 'Sendo preparado', sub: 'A cozinha já está preparando o seu pedido com carinho.', icone: '👩🏽‍🍳', anim: 'anim-bounce' },
    a_caminho: { titulo: 'Saiu para entrega!', sub: 'O motoboy está a caminho. Fique de olho no portão! 😉', icone: '🛵', anim: 'anim-moto' },
    pronto:    { titulo: 'Pronto para retirada!', sub: 'Pode vir buscar no balcão. Estamos esperando você!', icone: '🛍️', anim: 'anim-bounce' },
    concluido: { titulo: entrega ? 'Pedido entregue' : 'Pedido retirado', sub: 'Obrigado pela preferência! Bom apetite! 🧡', icone: '✅', anim: '' },
    cancelado: { titulo: 'Pedido cancelado', sub: 'Se tiver alguma dúvida, fale connosco pelo WhatsApp.', icone: '❌', anim: '' },
    confirmado:{ titulo: 'Sendo preparado', sub: 'A cozinha já está preparando o seu pedido.', icone: '👩🏽‍🍳', anim: 'anim-bounce' },
  })[p.status || 'pendente'];
}

function renderTrackBanner() {
  const el = $('#trackBanner');
  const p = state.ultimoPedido;
  const ativo = p?.token && !FINAIS.includes(p.status);
  el.classList.toggle('hidden', !ativo);
  if (!ativo) return;
  const info = infoStatus(p);
  el.innerHTML = `
    <span class="text-2xl ${info.anim}">${info.icone}</span>
    <span class="min-w-0 flex-1 text-left leading-tight">
      <span class="block text-[11px] font-bold uppercase tracking-wide text-brand-300">Pedido #${esc(p.id)}</span>
      <span class="block truncate font-bold">${esc(info.titulo)}</span>
    </span>
    <span class="shrink-0 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-extrabold text-ink">Acompanhar</span>`;
}

function renderRastreio() {
  const p = state.ultimoPedido;
  if (!p) { $('#cartBody').innerHTML = ''; $('#cartFooter').innerHTML = ''; return; }
  const info = infoStatus(p);
  const passos = p.entrega
    ? [['pendente', 'Aguardando confirmação'], ['preparo', 'Sendo preparado'], ['a_caminho', 'A caminho'], ['concluido', 'Entregue']]
    : [['pendente', 'Aguardando confirmação'], ['preparo', 'Sendo preparado'], ['pronto', 'Pronto para retirada'], ['concluido', 'Retirado']];
  const ordem = passos.map(([k]) => k);
  const st = p.status === 'confirmado' ? 'preparo' : (p.status || 'pendente');
  const idx = ordem.indexOf(st);
  const cancelado = st === 'cancelado';
  const taxa = p.taxa;
  const total = p.totalFinal ?? p.total;

  $('#cartBody').innerHTML = `
    <div class="px-5 pb-6 pt-6">
      <div class="rounded-3xl ${cancelado ? 'bg-ink/5' : 'bg-ink'} p-6 text-center ${cancelado ? 'text-ink' : 'text-white'} shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-widest ${cancelado ? 'text-ink-muted' : 'text-brand-300'}">Pedido #${esc(p.id)}</p>
        <div class="relative mx-auto mt-3 h-20 overflow-hidden">
          <span class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-6xl ${info.anim}">${info.icone}</span>
          ${st === 'a_caminho' ? '<span class="absolute inset-x-6 bottom-2 h-0.5 rounded-full bg-white/20"></span>' : ''}
        </div>
        <h3 class="mt-2 text-2xl font-extrabold">${esc(info.titulo)}</h3>
        <p class="mx-auto mt-1 max-w-xs text-sm ${cancelado ? 'text-ink-muted' : 'text-white/70'}">${esc(info.sub)}</p>
        ${!FINAIS.includes(st) ? `<p class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/70">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span> Atualiza sozinho, ao vivo</p>` : ''}
      </div>

      ${cancelado ? '' : `
      <ol class="mt-6 grid gap-0">
        ${passos.map(([k, rotulo], i) => {
          const feito = i < idx, atual = i === idx;
          return `
          <li class="flex gap-3">
            <div class="flex flex-col items-center">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold transition
                ${feito ? 'bg-emerald-600 text-white' : atual ? 'bg-brand-500 text-ink ring-4 ring-brand-200' : 'bg-ink/10 text-ink/40'}">${feito ? '✓' : i + 1}</span>
              ${i < passos.length - 1 ? `<span class="my-1 w-0.5 flex-1 ${feito ? 'bg-emerald-600' : 'bg-ink/10'}" style="min-height:22px"></span>` : ''}
            </div>
            <p class="pb-4 pt-1 text-[15px] ${atual ? 'font-extrabold text-ink' : feito ? 'font-semibold text-ink' : 'text-ink-muted'}">${rotulo}</p>
          </li>`;
        }).join('')}
      </ol>`}

      <div class="mt-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-ink/10">
        <div class="flex justify-between"><span class="text-ink-muted">Total dos itens</span><span class="font-bold">${money(p.total || 0)}</span></div>
        ${p.entrega ? `<div class="mt-1 flex justify-between"><span class="text-ink-muted">Taxa de entrega</span>
          <span class="font-bold ${taxa == null ? 'text-brand-700' : ''}">${taxa == null ? 'A calcular' : money(taxa)}</span></div>` : ''}
        ${!p.entrega || taxa != null ? `<div class="mt-2 flex justify-between border-t border-dashed border-ink/15 pt-2 text-base">
          <span class="font-extrabold">Total</span><span class="font-extrabold">${money(total || 0)}</span></div>` : ''}
      </div>

      ${st === 'pendente' ? `<p class="mt-4 rounded-xl bg-brand-50 p-3 text-center text-[13px] text-brand-800 ring-1 ring-brand-200">
        Não esqueça: <strong>toque em enviar</strong> na conversa do WhatsApp para confirmar o pedido.</p>` : ''}
    </div>`;

  $('#cartFooter').innerHTML = `
    <div class="mb-1 grid gap-2">
      ${st === 'pendente' ? `<a href="${esc(p.url || '#')}" target="_blank" rel="noopener"
         class="flex h-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">Abrir o WhatsApp de novo</a>` : ''}
      ${!FINAIS.includes(st) ? `<button data-abrir-jogo class="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/30">
        <span class="text-lg">🧩</span> Jogar enquanto espera</button>` : ''}
      ${FINAIS.includes(st) ? '<button data-rastreio-limpar class="h-12 rounded-xl bg-brand-500 font-bold text-ink">Fazer novo pedido</button>' : ''}
      <button data-cclose class="h-12 rounded-xl font-bold text-ink ring-1 ring-ink/10">Voltar ao cardápio</button>
    </div>`;
}

function limparPedidoAtivo() {
  pararRastreio();
  state.ultimoPedido = null;
  try { localStorage.removeItem(LS_PEDIDO); } catch (_) {}
  renderTrackBanner();
  fecharSacola();
}

$('#trackBanner').addEventListener('click', abrirRastreio);
$('#cart').addEventListener('click', (e) => {
  if (e.target.closest('[data-rastreio-limpar]')) limparPedidoAtivo();
});
