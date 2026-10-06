/* =====================================================================
   FASE 2 — SACOLA
   ===================================================================== */
const subtotal = () => state.cart.reduce((a, i) => a + i.total, 0);
const totalItens = () => state.cart.reduce((a, i) => a + i.qtd, 0);

function abrirSacola() {
  if (!state.cart.length) return;
  state.step = 'sacola';
  state.erros = {};
  renderCart();
  const c = $('#cart');
  c.dataset.open = 'true';
  c.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharSacola() {
  const c = $('#cart');
  c.dataset.open = 'false';
  c.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.step === 'enviado') { state.step = 'sacola'; }
}

function irPara(step) {
  state.step = step;
  renderCart();
  $('#cartBody').scrollTop = 0;
}

function resumoOpcoes(item) {
  // Agrupa as opções por grupo: "Escolha 2 carnes: Frango assado, Bife acebolado"
  const grupos = {};
  item.opcoes.forEach((o) => {
    (grupos[o.grupo.replace(/[?:]\s*$/, '')] ||= []).push(o.qtd > 1 ? `${o.qtd}x ${o.nome}` : o.nome);
  });
  return Object.entries(grupos).map(([g, lista]) => ({ grupo: g, texto: lista.join(', ') }));
}

function renderSteps() {
  const etapas = [['sacola', 'Sacola'], ['checkout', 'Dados'], ['enviado', 'Enviado']];
  const idx = etapas.findIndex(([k]) => k === state.step);
  $('#cartSteps').innerHTML = etapas.map(([k, rotulo], i) => `
    <span class="flex items-center gap-1.5 ${i <= idx ? 'text-ink' : 'text-ink/30'}">
      <span class="grid h-5 w-5 place-items-center rounded-full text-[10px] ${i < idx ? 'bg-emerald-600 text-white' : i === idx ? 'bg-brand-500 text-ink' : 'bg-ink/10 text-ink/40'}">${i < idx ? '✓' : i + 1}</span>
      ${rotulo}
    </span>${i < etapas.length - 1 ? '<span class="h-px w-4 bg-ink/15"></span>' : ''}`).join('');
}

function renderCart() {
  renderSteps();
  $('#cartBack').style.visibility = state.step === 'checkout' ? 'visible' : 'hidden';
  $('#cartTitle').textContent = { sacola: 'Sua sacola', checkout: 'Finalizar pedido', enviado: state.ultimoPedido?.token ? 'Acompanhe seu pedido' : 'Pedido enviado' }[state.step];
  $('#cartSteps').classList.toggle('hidden', state.step === 'enviado');

  if (state.step === 'sacola') renderSacola();
  else if (state.step === 'checkout') renderCheckout();
  else if (state.ultimoPedido?.token) renderRastreio();
  else renderEnviado();
}

function renderSacola() {
  if (!state.cart.length) {
    $('#cartBody').innerHTML = `
      <div class="px-6 py-20 text-center text-ink-muted">
        <div class="text-5xl">🛍️</div>
        <p class="mt-3 font-bold text-ink">Sua sacola está vazia</p>
        <p class="mt-1 text-sm">Escolha algo gostoso no cardápio.</p>
      </div>`;
    $('#cartFooter').innerHTML = `
      <button data-cclose class="mb-1 h-12 w-full rounded-xl bg-brand-500 font-bold text-ink">Ver cardápio</button>`;
    return;
  }

  $('#cartBody').innerHTML = `
    <ul class="divide-y divide-ink/5 bg-white">
      ${state.cart.map((i) => `
        <li class="flex gap-3 px-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="font-bold leading-snug">${esc(i.nome)}</p>
            ${resumoOpcoes(i).map((g) => `<p class="mt-0.5 text-[13px] leading-snug text-ink-muted"><span class="font-semibold">${esc(g.grupo)}:</span> ${esc(g.texto)}</p>`).join('')}
            ${i.obs ? `<p class="mt-1 text-[13px] italic text-ink-muted">Obs: ${esc(i.obs)}</p>` : ''}
            <p class="mt-2 font-extrabold">${money(i.total)}</p>
          </div>
          <div class="flex h-9 shrink-0 items-center self-end rounded-full ring-1 ring-ink/10">
            <button data-cart-op="dec" data-uid="${i.uid}" class="grid h-9 w-9 place-items-center text-brand-700" aria-label="${i.qtd > 1 ? 'Diminuir' : 'Remover'} ${esc(i.nome)}">
              ${i.qtd > 1 ? '<span class="text-lg font-bold">−</span>'
                : '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'}
            </button>
            <span class="w-5 text-center text-sm font-bold">${i.qtd}</span>
            <button data-cart-op="inc" data-uid="${i.uid}" class="grid h-9 w-9 place-items-center text-lg font-bold text-brand-700" aria-label="Aumentar ${esc(i.nome)}">+</button>
          </div>
        </li>`).join('')}
    </ul>
    <button data-cclose class="mx-auto my-4 block text-sm font-bold text-brand-700">+ Adicionar mais itens</button>`;

  $('#cartFooter').innerHTML = `
    <div class="mb-3 flex items-baseline justify-between">
      <span class="text-sm text-ink-muted">Subtotal (${totalItens()} ${totalItens() === 1 ? 'item' : 'itens'})</span>
      <span class="text-lg font-extrabold">${money(subtotal())}</span>
    </div>
    <button id="goCheckout" ${lojaAberta() ? '' : 'disabled'}
      class="mb-1 flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 font-bold text-ink active:scale-[.99] disabled:bg-ink/10 disabled:text-ink/40">
      ${lojaAberta() ? 'Continuar' : 'Loja fechada no momento'}
    </button>`;
}

function alterarItem(op, uid) {
  const idx = state.cart.findIndex((i) => i.uid === uid);
  if (idx < 0) return;
  const item = state.cart[idx];
  if (op === 'inc') {
    if (item.qtd >= MAX_POR_ITEM) return toast(`Máximo de ${MAX_POR_ITEM} unidades do mesmo item`);
    if (totalUnidades() >= MAX_UNIDADES) return toast(`Limite de ${MAX_UNIDADES} unidades por pedido`);
    item.qtd++;
  }
  if (op === 'dec') {
    if (item.qtd > 1) item.qtd--;
    else state.cart.splice(idx, 1);
  }
  item.total = item.unit * item.qtd;
  salvarCarrinho();
  renderCartBar();
  renderCart();
}
