/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
// Aba inicial: Café até ao fim do café da manhã; depois Almoço
function escolherAbaInicial() {
  const { min } = relogioSP();
  const fimCafe = hm(CONFIG.cafe_ate || '10:00');
  state.tab = min < fimCafe || min >= hm(CONFIG.hora_fecha || '23:59') ? 'cafe_da_manha' : 'almoco';
  const visiveis = categoriasVisiveis();
  if (!visiveis.includes(state.tab)) state.tab = visiveis[0];
}

// Relógio: a cada 20 s confere se a loja abriu/fechou ou se o café/almoço mudou
let _assinaturaTempo = '';
function assinaturaTempo() {
  const { min, dia } = relogioSP();
  const e = estadoLoja();
  return [e.aberta, e.modo, dia, ...Object.keys(CATEGORIAS).map((c) => {
    const j = janelaCategoria(c);
    return j ? (min >= j.ini && min < j.fim) : 1;
  })].join('|');
}
function tickRelogio() {
  const a = assinaturaTempo();
  if (a === _assinaturaTempo) return;
  _assinaturaTempo = a;
  HOJE = hojeSP();
  if (MODO === 'carregando') return;
  aplicarPratosDoDia();   // muda o dia → muda carne, acompanhamento e bebida do dia
  // Acabou o café e o almoço já está a ser servido → muda de aba sozinho
  const jc = janelaCategoria('cafe_da_manha');
  const { min } = relogioSP();
  if (state.tab === 'cafe_da_manha' && !state.busca && jc && min >= jc.fim && lojaAberta()) state.tab = 'almoco';
  const r = revalidarCarrinho();
  renderTudo();
  avisarMudancasCarrinho(r);
  if (admin.pronto && admin.aba === 'operacao' && location.hash === '#admin') renderOperacao();
}
escolherAbaInicial();

(async function iniciar() {
  rotear();            // abre o painel direto se o endereço terminar em #admin
  renderHeader();
  renderTabs();
  renderSkeleton();
  try {
    await carregarCardapio();
  } catch (err) {
    renderErroCarregamento();
    return;
  }
  escolherAbaInicial();
  carregarDadosSalvos();
  renderTudo();
  carregarPedidoAtivo();
  assinarMudancas();
  _assinaturaTempo = assinaturaTempo();
  setInterval(tickRelogio, 20000);
})();
