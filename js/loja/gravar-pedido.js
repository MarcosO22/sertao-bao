/* =====================================================================
   FASE 8 — PEDIDOS: gravação no checkout (cliente)
   ===================================================================== */
function montarRegistroPedido(codigo, token) {
  const c = state.checkout;
  const entrega = c.tipo === 'entrega';
  let detalhe = null;
  if (c.pagamento === 'cartao') detalhe = c.cartao === 'debito' ? 'Débito' : 'Crédito';
  if (c.pagamento === 'dinheiro') detalhe = c.semTroco ? 'Sem troco' : `Troco para ${money(parseValor(c.troco))}`;
  if (c.pagamento === 'pix' && entrega) detalhe = 'Enviar Pix/link com o total';
  const corta = (s, n) => (limpa(s) || null)?.slice(0, n) ?? null;
  return {
    codigo,
    token,
    cliente_nome: corta(c.nome, 120),
    tipo: c.tipo,
    endereco: entrega ? corta(c.endereco, 200) : null,
    bairro: entrega ? corta(c.bairro, 120) : null,
    referencia: entrega ? corta(c.referencia, 200) : null,
    pagamento: c.pagamento,
    pagamento_detalhe: detalhe,
    itens: state.cart.map((i) => ({
      nome: i.nome, qtd: i.qtd, unit: i.unit, total: i.total,
      obs: i.obs ? limpa(i.obs) : null,
      opcoes: resumoOpcoes(i),
    })),
    subtotal: Math.round(subtotal() * 100) / 100,
  };
}

// Grava o pedido (sem bloquear a venda: se falhar, o WhatsApp abre na mesma)
async function salvarPedidoNoBanco(registro) {
  if (!sb) return false;
  try {
    const tentar = (reg) => Promise.race([
      sb.from('pedidos').insert(reg),
      new Promise((ok) => setTimeout(() => ok({ error: { message: 'tempo esgotado' } }), 6000)),
    ]);
    let r = await tentar(registro);
    // Banco ainda sem a coluna "token" (SQL da Fase 9 não rodado): grava sem rastreio
    if (r.error && /token/.test(r.error.message || '')) {
      const { token, ...semToken } = registro;
      r = await tentar(semToken);
      if (!r.error) return 'sem-rastreio';
    }
    if (r.error) throw r.error;
    return true;
  } catch (err) {
    console.warn('[Pedido] não foi gravado no painel:', err);
    return false;
  }
}
