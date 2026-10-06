/* =====================================================================
   FASE 2 — CHECKOUT
   ===================================================================== */
function campo({ id, label, placeholder = '', opcional = false, autocomplete = 'off', inputmode = '', dica = '' }) {
  const erro = state.erros[id];
  return `
    <label class="block">
      <span class="text-sm font-bold">${label}${opcional ? ' <span class="font-normal text-ink-muted">(opcional)</span>' : ''}</span>
      <input data-field="${id}" value="${esc(state.checkout[id] || '')}" placeholder="${esc(placeholder)}"
        autocomplete="${autocomplete}" ${inputmode ? `inputmode="${inputmode}"` : ''} maxlength="120"
        class="mt-1.5 w-full rounded-xl border-0 bg-white px-3 py-3 text-base outline-none ring-1 placeholder:text-ink-muted/60 focus:ring-2
               ${erro ? 'ring-red-500 focus:ring-red-500' : 'ring-ink/10 focus:ring-brand-500'}" />
      ${erro ? `<span class="mt-1 block text-xs font-semibold text-red-600">${esc(erro)}</span>`
        : dica ? `<span class="mt-1 block text-xs text-ink-muted">${dica}</span>` : ''}
    </label>`;
}

function escolha(nome, valor, titulo, subtitulo, icone) {
  const ativo = state.checkout[nome] === valor;
  return `
    <button type="button" data-choice="${nome}" data-value="${valor}" aria-pressed="${ativo}"
      class="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 transition
             ${ativo ? 'ring-2 ring-brand-500 bg-brand-50' : state.erros[nome] ? 'ring-red-400' : 'ring-ink/10 hover:ring-ink/20'}">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ativo ? 'bg-brand-500 text-ink' : 'bg-cream text-ink-muted'}">${icone}</span>
      <span class="min-w-0 flex-1">
        <span class="block font-bold leading-tight">${titulo}</span>
        <span class="block text-[13px] text-ink-muted">${subtitulo}</span>
      </span>
      <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${ativo ? 'border-brand-600' : 'border-ink/25'}">
        ${ativo ? '<span class="h-2.5 w-2.5 rounded-full bg-brand-600"></span>' : ''}
      </span>
    </button>`;
}

const ICONES = {
  balcao: '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg>',
  moto: '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M8.5 17.5h6.5l3-7h-4M5.5 14.5l2-5h4l2 3"/></svg>',
  pix: '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="M8 12l4-4 4 4-4 4z"/></svg>',
  cartao: '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/></svg>',
  dinheiro: '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></svg>',
};

function secao(titulo, conteudo, erroKey) {
  return `
    <section class="px-4 pt-5">
      <h3 class="mb-2.5 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">${titulo}</h3>
      ${conteudo}
      ${erroKey && state.erros[erroKey] ? `<p class="mt-2 text-xs font-semibold text-red-600">${esc(state.erros[erroKey])}</p>` : ''}
    </section>`;
}

function renderCheckout() {
  const c = state.checkout;
  const entrega = c.tipo === 'entrega';

  const blocoRecebimento = `
    <div class="grid gap-2">
      ${escolha('tipo', 'retirada', 'Retirar no balcão', 'Grátis · você busca no quiosque', ICONES.balcao)}
      ${escolha('tipo', 'entrega', 'Entrega via motoboy', pedidoMinimo() ? `Taxa a calcular · mínimo ${money(pedidoMinimo())}` : 'Taxa a calcular no WhatsApp', ICONES.moto)}
    </div>`;

  const blocoDados = `
    <div class="grid gap-3">
      ${campo({ id: 'nome', label: 'Seu nome', placeholder: 'Como podemos te chamar?', autocomplete: 'name' })}
      ${entrega ? `
        ${campo({ id: 'endereco', label: 'Endereço', placeholder: 'Ex: QNM 5, Conjunto I, Casa 27', autocomplete: 'street-address',
          dica: '📍 Por favor, informe a <strong>Quadra, Conjunto e Casa</strong> exatos para o GPS.' })}
        ${campo({ id: 'bairro', label: 'Bairro / Região', placeholder: 'Ex: Ceilândia Norte', autocomplete: 'address-level3' })}
        ${campo({ id: 'referencia', label: 'Ponto de referência', placeholder: 'Ex: ao lado da padaria', opcional: true })}
        ${faltaParaMinimo() > 0 ? `
        <div data-minimo class="flex gap-2.5 rounded-xl bg-red-50 p-3 text-[13px] leading-snug text-red-700 ring-1 ring-red-200">
          <span class="text-base leading-none">🛵</span>
          <span><strong>Pedido mínimo para entrega: ${money(pedidoMinimo())}</strong> (sem o frete).
          Faltam <strong>${money(faltaParaMinimo())}</strong> — adicione mais algo gostoso na sacola! 😉</span>
        </div>` : ''}
        <div class="flex gap-2.5 rounded-xl bg-brand-50 p-3 text-[13px] leading-snug text-brand-800 ring-1 ring-brand-200">
          <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></svg>
          <span><strong>Taxa de entrega a calcular no WhatsApp.</strong> ${FRETE_AMIGAVEL} 😉</span>
        </div>` : ''}
    </div>`;

  let extraPagamento = '';
  if (c.pagamento === 'pix' && entrega) {
    extraPagamento = `
      <div class="mt-3 flex gap-2.5 rounded-xl bg-white p-3.5 text-[13px] leading-snug text-ink-muted ring-1 ring-ink/10">
        <span class="text-brand-700">${ICONES.pix}</span>
        <span>Assim que calcularmos a taxa de entrega, enviamos pelo WhatsApp a <strong class="text-ink">chave Pix ou um link de pagamento</strong> com o valor total.</span>
      </div>`;
  } else if (c.pagamento === 'pix') {
    extraPagamento = `
      <div class="mt-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
        <p class="text-[13px] text-ink-muted">Chave Pix</p>
        <div class="mt-1 flex items-center gap-2">
          <code class="min-w-0 flex-1 truncate rounded-lg bg-cream px-3 py-2.5 font-mono text-sm font-semibold">${esc(CONFIG.chave_pix)}</code>
          <button id="copyPix" class="shrink-0 rounded-lg bg-ink px-3.5 py-2.5 text-sm font-bold text-white active:scale-95">Copiar</button>
        </div>
        ${CONFIG.titular_pix ? `<p class="mt-2 text-[13px] text-ink-muted">Titular: <span class="font-semibold text-ink">${esc(CONFIG.titular_pix)}</span></p>` : ''}
        <p class="mt-2 text-[13px] leading-snug text-ink-muted">
          Após pagar, envie o comprovante na conversa do WhatsApp.
        </p>
      </div>`;
  } else if (c.pagamento === 'cartao') {
    const seg = (v, r) => `<button type="button" data-choice="cartao" data-value="${v}"
        class="flex-1 rounded-lg py-2 text-sm font-bold ${c.cartao === v ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'}">${r}</button>`;
    extraPagamento = `
      <div class="mt-3 flex gap-1 rounded-xl bg-ink/5 p-1">${seg('credito', 'Crédito')}${seg('debito', 'Débito')}</div>
      <p class="mt-2 text-[13px] text-ink-muted">${entrega ? 'O motoboy leva a maquininha até você.' : 'Pague na maquininha do balcão.'}</p>`;
  } else if (c.pagamento === 'dinheiro') {
    extraPagamento = `
      <div class="mt-3 grid gap-2">
        ${c.semTroco ? '' : campo({ id: 'troco', label: 'Troco para quanto?', placeholder: 'Ex: 50,00', inputmode: 'decimal' })}
        <label class="flex items-center gap-2.5 py-1 text-sm font-semibold">
          <input type="checkbox" id="semTroco" ${c.semTroco ? 'checked' : ''} class="h-5 w-5 rounded accent-amber-500" />
          Não preciso de troco
        </label>
      </div>`;
  }

  const blocoPagamento = `
    <p class="-mt-1 mb-2.5 text-[13px] text-ink-muted">Nada é cobrado pelo site — você paga ${entrega ? 'na entrega ou pelo WhatsApp' : 'na retirada'}.</p>
    <div class="grid gap-2">
      ${entrega
        ? escolha('pagamento', 'pix', 'Pix / Link', 'Pagamento online pelo WhatsApp', ICONES.pix)
        : escolha('pagamento', 'pix', 'Pix', 'Chave para copiar e colar', ICONES.pix)}
      ${entrega
        ? escolha('pagamento', 'cartao', 'Cartão (levar maquininha)', 'Crédito ou débito na entrega', ICONES.cartao)
        : escolha('pagamento', 'cartao', 'Cartão', 'Crédito ou débito no balcão', ICONES.cartao)}
      ${entrega
        ? escolha('pagamento', 'dinheiro', 'Dinheiro', 'O motoboy leva o seu troco', ICONES.dinheiro)
        : escolha('pagamento', 'dinheiro', 'Dinheiro', 'Pague no balcão', ICONES.dinheiro)}
    </div>
    ${extraPagamento}`;

  $('#cartBody').innerHTML =
    secao('1. Como quer receber?', blocoRecebimento, 'tipo') +
    (c.tipo ? secao('2. Seus dados', blocoDados) : '') +
    (c.tipo ? secao('3. Pagamento', blocoPagamento, 'pagamento') : '') +
    '<div class="h-6"></div>';

  renderCheckoutFooter();
}

function renderCheckoutFooter() {
  const entrega = state.checkout.tipo === 'entrega';
  const retirada = state.checkout.tipo === 'retirada';
  const sub = subtotal();

  $('#cartFooter').innerHTML = `
    <dl class="mb-3 grid gap-1 text-sm">
      <div class="flex justify-between"><dt class="text-ink-muted">Subtotal</dt><dd class="font-semibold">${money(sub)}</dd></div>
      <div class="flex justify-between">
        <dt class="text-ink-muted">Taxa de entrega</dt>
        <dd class="font-semibold ${entrega ? 'text-brand-700' : retirada ? 'text-emerald-700' : 'text-ink-muted'}">
          ${entrega ? FRETE_TXT : retirada ? 'Grátis' : '—'}
        </dd>
      </div>
      <div class="mt-1 flex items-baseline justify-between border-t border-dashed border-ink/15 pt-2">
        <dt class="font-extrabold">Total</dt>
        <dd class="text-right">
          <span class="text-lg font-extrabold">${money(sub)}</span>
          ${entrega ? '<span class="block text-xs font-semibold text-brand-700">(+ taxa de entrega)</span>' : ''}
        </dd>
      </div>
      ${entrega ? `<p class="text-right text-[12px] text-ink-muted">${FRETE_AMIGAVEL}</p>` : ''}
    </dl>
    <button id="sendOrder"
      class="mb-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white active:scale-[.99]">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7s1.8 2.8 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2c-.1-.1-.3-.2-.5-.3z"/></svg>
      Enviar pedido pelo WhatsApp
    </button>`;
}

/* ---------- Validação ---------- */
function parseValor(txt) {
  const limpo = String(txt).replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : NaN;
}

function validarCheckout() {
  const c = state.checkout;
  const e = {};
  if (!c.tipo) e.tipo = 'Escolha se vai retirar ou receber em casa.';
  if (c.tipo) {
    if (c.nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (c.tipo === 'entrega') {
      const end = c.endereco.trim();
      if (end.length < 5) e.endereco = 'Informe o endereço completo (Quadra, Conjunto e Casa).';
      else if (!/\d/.test(end) || end.replace(/\s+/g, '').length < 7)
        e.endereco = 'Faltou detalhe: informe a Quadra, Conjunto e Casa exatos para o GPS. Ex: QNM 5, Conjunto I, Casa 27';
      if (c.bairro.trim().length < 2) e.bairro = 'Informe o bairro para calcularmos o frete.';
    }
    if (!c.pagamento) e.pagamento = 'Escolha a forma de pagamento.';
    if (c.pagamento === 'dinheiro' && !c.semTroco) {
      const v = parseValor(c.troco);
      if (!c.troco.trim()) e.troco = 'Informe o valor ou marque “Não preciso de troco”.';
      else if (!Number.isFinite(v) || v <= subtotal()) e.troco = `O valor precisa ser maior que ${money(subtotal())}.`;
    }
  }
  state.erros = e;
  return Object.keys(e).length === 0;
}

/* ---------- Mensagem do WhatsApp ---------- */
// Remove caracteres de formatação do WhatsApp dos textos digitados pelo cliente
const limpa = (s) => String(s || '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();

function gerarIdPedido() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function montarMensagem(id) {
  const c = state.checkout;
  const entrega = c.tipo === 'entrega';
  const sub = subtotal();
  const agora = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date()).replace(',', ' às');

  const L = [];
  L.push(`*NOVO PEDIDO #${id}*`);
  L.push(`${CONFIG.nome_loja} · ${agora}`);
  L.push('');
  L.push('*ITENS*');
  state.cart.forEach((i) => {
    L.push(`*${i.qtd}x ${i.nome}* — ${money(i.total)}`);
    resumoOpcoes(i).forEach((g) => L.push(`   • ${g.grupo}: ${g.texto}`));
    if (i.obs) L.push(`   _Obs: ${limpa(i.obs)}_`);
  });
  L.push('');
  L.push(`Subtotal: ${money(sub)}`);
  if (entrega) {
    L.push('Taxa de entrega: *a calcular*');
    L.push(`*TOTAL: ${money(sub)} (+ taxa de entrega)*`);
  } else {
    L.push('Frete: Grátis (retirada)');
    L.push(`*TOTAL: ${money(sub)}*`);
  }
  L.push('');

  if (entrega) {
    L.push('*ENTREGA VIA MOTOBOY*');
    L.push(`Nome: ${limpa(c.nome)}`);
    L.push(`Endereço: ${limpa(c.endereco)}`);
    L.push(`Bairro: ${limpa(c.bairro)}`);
    if (c.referencia.trim()) L.push(`Referência: ${limpa(c.referencia)}`);
  } else {
    L.push('*RETIRADA NO BALCÃO*');
    L.push(`Nome: ${limpa(c.nome)}`);
  }
  L.push('');

  L.push('*PAGAMENTO*');
  if (c.pagamento === 'pix') L.push(entrega ? 'Pix / Link — enviar cobrança pelo WhatsApp com o total' : 'Pix');
  if (c.pagamento === 'cartao') L.push(`Cartão de ${c.cartao === 'debito' ? 'débito' : 'crédito'}${entrega ? ' — levar maquininha' : ''}`);
  if (c.pagamento === 'dinheiro') {
    L.push(c.semTroco ? 'Dinheiro — não precisa de troco' : `Dinheiro — troco para ${money(parseValor(c.troco))}`);
  }

  if (entrega) {
    L.push('');
    L.push('_Por favor, me informe a taxa de entrega para confirmar o pedido._');
  }
  return L.join('\n');
}

async function enviarPedido() {
  if (state.enviando) return;
  // Garante que nada esgotou/mudou de preço desde que o cliente montou a sacola
  const r = revalidarCarrinho();
  if (r.removidos.length || r.precoMudou) {
    renderCartBar();
    avisarMudancasCarrinho(r);
    if (!state.cart.length) return irPara('sacola');
    return renderCheckout();
  }
  // Pedido mínimo (só entrega): trava antes de gravar no banco e abrir o WhatsApp
  const falta = faltaParaMinimo();
  if (falta > 0) {
    renderCheckout();
    $('#cartBody')?.querySelector('[data-minimo]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return toast(`O valor mínimo para entrega é de ${money(pedidoMinimo())} (sem contar o frete). Faltam ${money(falta)} — adicione mais algo gostoso na sacola! 😉`);
  }

  if (!validarCheckout()) {
    renderCheckout();
    const primeiro = $('#cartBody .text-red-600');
    primeiro?.closest('section, label')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Confira os campos destacados');
    return;
  }

  const id = gerarIdPedido();
  const texto = montarMensagem(id);
  const url = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;

  // Fase 8: grava o pedido no painel ANTES de abrir o WhatsApp
  state.enviando = true;
  const btn = $('#sendOrder');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Enviando…'; }
  const token = novoToken();
  const gravado = await salvarPedidoNoBanco(montarRegistroPedido(id, token));
  state.enviando = false;

  salvarCliente();
  state.ultimoPedido = {
    id, url, texto, total: subtotal(), entrega: state.checkout.tipo === 'entrega',
    token: gravado === true ? token : null, status: 'pendente', taxa: null, criadoEm: Date.now(),
  };
  if (gravado === true) { salvarPedidoAtivo(); iniciarRastreio(); }
  renderTrackBanner();

  // Fase 17: guarda um resumo no histórico local do cliente ("Meus Pedidos")
  salvarNoHistorico({
    codigo: id, token: gravado === true ? token : null, total: subtotal(),
    entrega: state.checkout.tipo === 'entrega', itens: state.cart,
  });

  // Limpa a sacola: o pedido segue agora pela conversa do WhatsApp
  state.cart = [];
  salvarCarrinho();
  renderCartBar();
  irPara('enviado');

  window.open(url, '_blank') || (window.location.href = url);
}

function renderEnviado() {
  const p = state.ultimoPedido;
  $('#cartBody').innerHTML = `
    <div class="px-6 py-10 text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <svg class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>
      </div>
      <h3 class="mt-4 text-xl font-extrabold">Pedido #${esc(p?.id || '')} pronto!</h3>
      <p class="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-muted">
        Abrimos o WhatsApp com o seu pedido. <strong class="text-ink">Toque em enviar</strong> na conversa para confirmar.
        ${p?.entrega ? 'Em seguida, informaremos a taxa de entrega.' : ''}
      </p>
      <div class="mx-auto mt-6 max-w-xs rounded-2xl bg-white p-4 text-left text-sm ring-1 ring-ink/10">
        <div class="flex justify-between"><span class="text-ink-muted">Total dos itens</span><span class="font-bold">${money(p?.total || 0)}</span></div>
        ${p?.entrega ? '<div class="mt-1 flex justify-between"><span class="text-ink-muted">Taxa de entrega</span><span class="font-bold text-brand-700">A calcular</span></div>' : ''}
      </div>
    </div>`;

  $('#cartFooter').innerHTML = `
    <div class="mb-1 grid gap-2">
      <a href="${esc(p?.url || '#')}" target="_blank" rel="noopener"
         class="flex h-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">WhatsApp não abriu? Toque aqui</a>
      <button data-cclose class="h-12 rounded-xl font-bold text-ink ring-1 ring-ink/10">Voltar ao cardápio</button>
    </div>`;
}

async function copiarPix() {
  const chave = CONFIG.chave_pix;
  try {
    await navigator.clipboard.writeText(chave);
  } catch (_) {
    const ta = Object.assign(document.createElement('textarea'), { value: chave });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (__) {}
    ta.remove();
  }
  const b = $('#copyPix');
  if (b) { b.textContent = 'Copiado ✓'; b.classList.replace('bg-ink', 'bg-emerald-600'); }
  toast('Chave Pix copiada!');
}

/* ---------- Eventos da sacola / checkout ---------- */
$('#cart').addEventListener('click', (e) => {
  if (e.target.closest('[data-cclose]')) return fecharSacola();
  if (e.target.closest('#cartBack')) return irPara('sacola');
  if (e.target.closest('#goCheckout')) { recarregarEmSegundoPlano(0); return irPara('checkout'); }
  if (e.target.closest('#sendOrder')) return enviarPedido();
  if (e.target.closest('#copyPix')) return copiarPix();

  const op = e.target.closest('[data-cart-op]');
  if (op) return alterarItem(op.dataset.cartOp, op.dataset.uid);

  const ch = e.target.closest('[data-choice]');
  if (ch) {
    state.checkout[ch.dataset.choice] = ch.dataset.value;
    delete state.erros[ch.dataset.choice];
    const y = $('#cartBody').scrollTop;
    renderCheckout();
    $('#cartBody').scrollTop = y;
  }
});

$('#cart').addEventListener('input', (e) => {
  const f = e.target.dataset.field;
  if (f) {
    state.checkout[f] = e.target.value;
    if (state.erros[f]) {           // limpa o erro assim que o cliente corrige
      delete state.erros[f];
      e.target.classList.remove('ring-red-500', 'focus:ring-red-500');
      e.target.classList.add('ring-ink/10', 'focus:ring-brand-500');
      e.target.parentElement.querySelector('.text-red-600')?.remove();
    }
  }
});

$('#cart').addEventListener('change', (e) => {
  if (e.target.id === 'semTroco') {
    state.checkout.semTroco = e.target.checked;
    delete state.erros.troco;
    renderCheckout();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#cart').dataset.open === 'true') fecharSacola();
});
