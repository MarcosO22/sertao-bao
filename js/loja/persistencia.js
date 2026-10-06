/* =====================================================================
   FASE 2 — PERSISTÊNCIA LOCAL (sacola e dados do cliente)
   ===================================================================== */
const LS_CART = 'sertaobao_sacola_v1';
const LS_CLIENTE = 'sertaobao_cliente_v1';

function salvarCarrinho() {
  try { localStorage.setItem(LS_CART, JSON.stringify(state.cart)); } catch (_) {}
}

function salvarCliente() {
  const { tipo, nome, endereco, bairro, referencia, pagamento } = state.checkout;
  try { localStorage.setItem(LS_CLIENTE, JSON.stringify({ tipo, nome, endereco, bairro, referencia, pagamento })); } catch (_) {}
}

function carregarDadosSalvos() {
  try {
    const cart = JSON.parse(localStorage.getItem(LS_CART) || '[]');
    // Mantém só itens de pratos que ainda existem e estão disponíveis hoje
    state.cart = Array.isArray(cart) ? cart : [];
    revalidarCarrinho();   // remove esgotados e atualiza preços
    Object.assign(state.checkout, JSON.parse(localStorage.getItem(LS_CLIENTE) || '{}'));
  } catch (_) { state.cart = []; }
}
