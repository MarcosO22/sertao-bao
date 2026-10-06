/* =====================================================================
   FASE 17 — ÁREA DO CLIENTE (sem login): histórico local + joguinho
   Tudo fica no localStorage do próprio celular, na chave "historicoPedidos".
   ===================================================================== */
const LS_HISTORICO = 'historicoPedidos';
const HISTORICO_MAX = 30;

function lerHistorico() {
  try { const h = JSON.parse(localStorage.getItem(LS_HISTORICO) || '[]'); return Array.isArray(h) ? h : []; }
  catch (_) { return []; }
}
function gravarHistorico(lista) {
  try { localStorage.setItem(LS_HISTORICO, JSON.stringify(lista.slice(0, HISTORICO_MAX))); } catch (_) {}
}

// Chamado no fim do checkout (enviarPedido), antes de limpar a sacola
function salvarNoHistorico({ codigo, token, total, entrega, itens }) {
  const lista = lerHistorico().filter((p) => p.codigo !== codigo);
  lista.unshift({
    codigo,
    data: new Date().toISOString(),
    total: Math.round(Number(total || 0) * 100) / 100, // valor dos itens (o frete é combinado no WhatsApp)
    entrega: !!entrega,
    itens: itens.map((i) => ({ nome: i.nome, qtd: i.qtd })),
    // Fase 18: cópia da sacola para o botão "Repetir Pedido"
    carrinho: itens.map((i) => ({
      pratoId: i.pratoId, nome: i.nome, qtd: i.qtd, obs: i.obs || '',
      opcoes: (i.opcoes || []).map((o) => ({ grupoId: o.grupoId, id: o.id, qtd: o.qtd })),
    })),
    token: token || null,   // permite consultar o status depois (sem login)
    status: 'pendente',
  });
  gravarHistorico(lista);
}

const ROTULO_STATUS_CLIENTE = {
  pendente: ['Aguardando', 'bg-amber-100 text-amber-800'], confirmado: ['Em preparo', 'bg-sky-100 text-sky-800'],
  preparo: ['Em preparo', 'bg-sky-100 text-sky-800'], a_caminho: ['A caminho', 'bg-violet-100 text-violet-800'],
  pronto: ['Pronto p/ retirar', 'bg-violet-100 text-violet-800'], concluido: ['Concluído', 'bg-emerald-100 text-emerald-800'],
  cancelado: ['Cancelado', 'bg-ink/10 text-ink-muted'],
};

function dataCurta(iso) {
  const d = new Date(iso);
  const { ymd } = relogioSP(d);
  const hoje = relogioSP().ymd;
  const dif = Math.round((new Date(hoje) - new Date(ymd)) / 86400000);
  const dia = dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(2, 4)}`;
  return `${dia} às ${hhmm(iso)}`;
}

function renderMeusPedidos() {
  const lista = lerHistorico();
  let rec = 0; try { rec = Number(localStorage.getItem(LS_RECORDE)) || 0; } catch (_) {}
  $('#mpRecorde').textContent = rec ? `🏆 Seu recorde: ${rec} pontos` : 'Encaixe os blocos e limpe as linhas!';
  const ativo = state.ultimoPedido?.token && !FINAIS.includes(state.ultimoPedido.status) ? state.ultimoPedido.id : null;

  $('#mpLista').innerHTML = !lista.length ? `
    <div class="rounded-2xl bg-white p-6 text-center ring-1 ring-ink/5">
      <p class="text-3xl">🍽️</p>
      <p class="mt-2 font-bold">Nenhum pedido por aqui ainda</p>
      <p class="mt-1 text-sm text-ink-muted">Quando você fizer um pedido, ele aparece aqui para você consultar depois.</p>
    </div>` : lista.map((p) => {
      const [rot, cor] = ROTULO_STATUS_CLIENTE[p.status] || ROTULO_STATUS_CLIENTE.pendente;
      const nomes = p.itens.map((i) => `${i.qtd > 1 ? `${i.qtd}x ` : ''}${i.nome}`).join(', ');
      return `
      <article class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-extrabold">#${esc(p.codigo)}</p>
            <p class="text-xs text-ink-muted">${esc(dataCurta(p.data))} · ${p.entrega ? '🛵 Entrega' : '🛍️ Retirada'}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cor}">${rot}</span>
        </div>
        <p class="mt-2 line-clamp-2 text-sm text-ink">${esc(nomes)}</p>
        <div class="mt-2 flex items-center justify-between border-t border-dashed border-ink/10 pt-2">
          <span class="text-sm font-extrabold">${money(p.total)}${p.entrega && p.totalComFrete == null ? ' <span class="text-[11px] font-semibold text-ink-muted">+ entrega</span>' : ''}</span>
          ${ativo === p.codigo ? '<button data-mp-acompanhar class="rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">Acompanhar ›</button>' : ''}
        </div>
        <button data-mp-repetir="${esc(p.codigo)}"
          class="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-extrabold text-ink transition hover:bg-brand-400 active:scale-[.98]">
          🔄 Repetir Pedido</button>
      </article>`;
    }).join('') + `
    <button data-mp-limpar class="mx-auto mt-1 text-xs font-semibold text-ink-muted underline-offset-2 hover:underline">
      ${state.confirmarLimparHist ? 'Toque de novo para apagar tudo' : 'Limpar histórico deste aparelho'}</button>`;
}

// Fase 18 — "Repetir Pedido": monta a sacola de novo com os itens de um pedido antigo
function repetirPedido(codigo) {
  const h = lerHistorico().find((p) => p.codigo === codigo);
  if (!h) return;
  const acharPorNome = (nome) => {
    const n = String(nome || '').trim().toLowerCase();
    const candidatos = PRATOS.filter((x) => x.nome.trim().toLowerCase() === n);
    return candidatos.find((x) => disponibilidade(x).pode) || candidatos[0] || null;
  };
  const novo = [];
  const semCopia = [];
  if (Array.isArray(h.carrinho) && h.carrinho.length) {
    for (const i of h.carrinho) {
      let prato = PRATOS.find((x) => x.id === i.pratoId);
      // Prato com o mesmo nome mas outro cadastro (ex.: seg–sex × sábado): usa o de hoje
      if (!prato || !disponibilidade(prato).pode) prato = acharPorNome(i.nome) || prato;
      if (!prato) { semCopia.push(i.nome); continue; }
      const opcoes = (i.opcoes || []).map((o) => ({
        // a bebida de acompanhamento usa o id do prato no grupo ("123-bebidas")
        grupoId: String(o.grupoId).endsWith('-bebidas') ? `${prato.id}-bebidas` : o.grupoId,
        id: o.id, qtd: o.qtd, grupo: '', nome: '', preco: 0,
      }));
      novo.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                  pratoId: prato.id, nome: prato.nome, qtd: i.qtd, opcoes, obs: i.obs || '', unit: 0, total: 0 });
    }
  } else {
    // Pedidos antigos (antes deste botão) só guardavam nome e quantidade:
    // repete apenas os itens que não precisam escolher opções
    for (const i of h.itens || []) {
      const prato = acharPorNome(i.nome);
      if (prato && !prato.grupos.some((g) => g.min > 0)) {
        novo.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    pratoId: prato.id, nome: prato.nome, qtd: i.qtd, opcoes: [], obs: '', unit: 0, total: 0 });
      } else semCopia.push(i.nome);
    }
  }

  const anterior = state.cart;
  state.cart = novo;
  const { removidos } = revalidarCarrinho();   // confere horário, esgotados e preços de HOJE
  const fora = [...semCopia, ...removidos];
  if (!state.cart.length) {
    state.cart = anterior;                      // nada disponível: não mexe na sacola atual
    salvarCarrinho();
    return toast(fora.length ? 'Os itens desse pedido não estão disponíveis agora 😕' : 'Não foi possível repetir esse pedido');
  }
  salvarCarrinho();
  renderCartBar(true);
  fecharMeusPedidos();
  abrirSacola();
  toast(fora.length
    ? `Sacola pronta! Fora do cardápio agora: ${[...new Set(fora)].join(', ')}`
    : 'Sacola pronta! Confira e finalize 😉');
}

// Atualiza o status dos pedidos recentes (sem login: usa o "token" secreto de cada pedido)
async function atualizarStatusHistorico() {
  if (!sb) return;
  const lista = lerHistorico();
  const alvos = lista.filter((p) => p.token && !FINAIS.includes(p.status)).slice(0, 10);
  if (!alvos.length) return;
  const res = await Promise.all(alvos.map((p) => sb.rpc('rastrear_pedido', { p_token: p.token }).then((r) => r, () => ({}))));
  let mudou = false;
  res.forEach((r, i) => {
    const d = r?.data?.[0];
    if (!d) return;
    const p = alvos[i];
    if (d.status && d.status !== p.status) { p.status = d.status; mudou = true; }
    if (d.taxa_entrega != null && d.total != null) { p.totalComFrete = Number(d.total); p.total = Number(d.total); mudou = true; }
  });
  if (mudou) { gravarHistorico(lista); if ($('#meusPedidos').dataset.open === 'true') renderMeusPedidos(); }
}

function abrirMeusPedidos() {
  state.confirmarLimparHist = false;
  renderMeusPedidos();
  const m = $('#meusPedidos');
  m.dataset.open = 'true';
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  atualizarStatusHistorico();
}
function fecharMeusPedidos() {
  const m = $('#meusPedidos');
  m.dataset.open = 'false';
  m.setAttribute('aria-hidden', 'true');
  if ($('#cart').dataset.open !== 'true') document.body.style.overflow = '';
}

document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('[data-meus-pedidos]')) return abrirMeusPedidos();
  if (t.closest('[data-mp-fechar]')) return fecharMeusPedidos();
  if (t.closest('[data-mp-acompanhar]')) { fecharMeusPedidos(); return abrirRastreio(); }
  const rp = t.closest('[data-mp-repetir]');
  if (rp) return repetirPedido(rp.dataset.mpRepetir);
  if (t.closest('[data-mp-limpar]')) {
    if (!state.confirmarLimparHist) {
      state.confirmarLimparHist = true; renderMeusPedidos();
      setTimeout(() => { state.confirmarLimparHist = false; if ($('#meusPedidos').dataset.open === 'true') renderMeusPedidos(); }, 4000);
      return;
    }
    gravarHistorico([]); state.confirmarLimparHist = false; renderMeusPedidos(); toast('Histórico apagado deste aparelho');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#meusPedidos').dataset.open === 'true' && $('#jogo').classList.contains('hidden')) fecharMeusPedidos();
});

// 🥚 Easter egg: 5 toques rápidos no logo do cabeçalho abrem o joguinho direto
(() => {
  const logo = document.querySelector('header img[alt="Logo Sertão Bão"]');
  if (!logo) return;
  let toques = 0, t;
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => {
    toques += 1; clearTimeout(t);
    t = setTimeout(() => { toques = 0; }, 1200);
    if (toques >= 5) { toques = 0; navigator.vibrate?.(60); toast('🥚 Você achou o segredo do Sertão!'); abrirJogo(); }
  });
})();
