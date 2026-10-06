/* =====================================================================
   ESTADO
   ===================================================================== */
const state = {
  tab: 'cafe_da_manha',
  busca: '',
  cart: [],          // [{ uid, pratoId, nome, qtd, opcoes:[{grupo,nome,qtd,preco}], obs, unit, total }]
  sheet: null,       // { prato, sel: {grupoId: {opcaoId: qtd}}, qtd, obs }
  step: 'sacola',    // 'sacola' | 'checkout' | 'enviado'
  checkout: {
    tipo: '',        // 'retirada' | 'entrega'
    nome: '', endereco: '', bairro: '', referencia: '',
    pagamento: '',   // 'pix' | 'cartao' | 'dinheiro'
    cartao: 'credito', troco: '', semTroco: false,
  },
  erros: {},
  ultimoPedido: null,
};
