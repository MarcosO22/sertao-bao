/* =====================================================================
   BARRA DA SACOLA (a sacola completa + checkout = Fase 2)
   ===================================================================== */
function renderCartBar(animar = false) {
  const itens = state.cart.reduce((a, i) => a + i.qtd, 0);
  const total = state.cart.reduce((a, i) => a + i.total, 0);
  $('#cartBar').dataset.show = itens > 0 ? 'true' : 'false';
  $('#cartCount').textContent = itens;
  $('#cartTotal').textContent = money(total);
  if (animar) {
    const c = $('#cartCount');
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  }
}
