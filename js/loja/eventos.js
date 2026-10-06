/* =====================================================================
   EVENTOS
   ===================================================================== */
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  state.busca = '';
  $('#search').value = '';
  renderTabs(); renderMenu();
  window.scrollTo({ top: Math.min(window.scrollY, $('header').offsetHeight), behavior: 'smooth' });
});

$('#search').addEventListener('input', (e) => {
  state.busca = e.target.value;
  renderTabs(); renderMenu();
});

$('#vitrine').addEventListener('click', (e) => {
  const b = e.target.closest('[data-prato]');
  if (b) abrirPrato(Number(b.dataset.prato));
});

$('#menuList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-prato]');
  if (b) abrirPrato(Number(b.dataset.prato));
});

$('#sheet').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return fecharSheet();
  const opBtn = e.target.closest('[data-op]');
  if (opBtn && !opBtn.disabled) alterarOpcao(opBtn.dataset.op, opBtn.dataset.g, opBtn.dataset.o);
});

$('#sheetBody').addEventListener('input', (e) => {
  if (e.target.id === 'obs') {
    state.sheet.obs = e.target.value;
    $('#obsCount').textContent = `${e.target.value.length}/140`;
  }
});

$('#qtyMinus').addEventListener('click', () => { if (state.sheet.qtd > 1) { state.sheet.qtd--; renderSheetFooter(); } });
$('#qtyPlus').addEventListener('click', () => { if (state.sheet.qtd < 20) { state.sheet.qtd++; renderSheetFooter(); } });
$('#addBtn').addEventListener('click', adicionarAoCarrinho);

$('#cartBtn').addEventListener('click', () => abrirSacola());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#sheet').dataset.open === 'true') fecharSheet();
});
