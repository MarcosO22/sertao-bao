/* =====================================================================
   RENDER — CABEÇALHO E ABAS
   ===================================================================== */
function renderHeader() {
  $('#storeName').textContent = CONFIG.nome_loja;
  $('#todayLabel').textContent = 'Hoje é ' + DIAS_LONGO[HOJE];

  const est = estadoLoja();
  const aberto = est.aberta;
  const prox = est.modo !== 'fixo' ? proximaAbertura() : null;
  $('#closedBanner').textContent = prox
    ? `Estamos fechados agora. Abrimos ${prox.texto} — já pode espiar o cardápio! 😉`
    : 'Estamos fechados no momento. Você pode ver o cardápio, mas os pedidos estão pausados.';
  $('#closedBanner').classList.toggle('hidden', aberto);
  $('#storeStatus').className = aberto
    ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300'
    : 'inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-red-300';
  $('#storeStatus').innerHTML = aberto
    ? `<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> ${est.modo === 'auto' ? `Aberto · fecha às ${fmtHora(CONFIG.hora_fecha)}` : 'Aberto agora'}`
    : `<span class="h-1.5 w-1.5 rounded-full bg-red-400"></span> ${prox ? `Fechado · abre ${prox.texto}` : 'Fechado'}`;
}

function categoriasVisiveis() {
  const cats = Object.keys(CATEGORIAS).filter((k) => !categoriaEncerrada(k));
  if (!PRATOS.length) return cats;                       // ainda carregando: mostra todas
  const comPratos = cats.filter((k) => PRATOS.some((p) => p.categoria === k));
  return comPratos.length ? comPratos : cats;
}

function renderTabs() {
  const tabs = $('#tabs');
  const visiveis = categoriasVisiveis();
  if (!visiveis.includes(state.tab)) state.tab = visiveis[0];
  const assinatura = visiveis.join('|');
  if (tabs.dataset.cats !== assinatura) {
    tabs.dataset.cats = assinatura;
    tabs.innerHTML = visiveis.map((k) =>
      `<button role="tab" data-tab="${k}" class="tab relative shrink-0 py-3 text-[15px] font-bold transition-colors">${CATEGORIAS[k]}</button>`).join('');
  }
  document.querySelectorAll('.tab').forEach((b) => {
    const ativo = b.dataset.tab === state.tab && !state.busca;
    b.setAttribute('aria-selected', ativo);
    b.className = 'tab relative shrink-0 py-3 text-[15px] font-bold transition-colors ' +
      (ativo
        ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand-500 after:content-['']"
        : 'text-ink-muted hover:text-ink');
  });
}
