/* =====================================================================
   FASE 8 — PAINEL: PEDIDOS DO DIA (mini PDV)
   ===================================================================== */
const STATUS = {
  pendente:   { rotulo: 'Pendente',   cor: 'bg-amber-100 text-amber-800 ring-amber-300',       borda: 'ring-amber-300' },
  preparo:    { rotulo: 'Em preparo', cor: 'bg-sky-100 text-sky-800 ring-sky-300',             borda: 'ring-sky-300' },
  a_caminho:  { rotulo: 'Saiu p/ entrega', cor: 'bg-violet-100 text-violet-800 ring-violet-300', borda: 'ring-violet-300' },
  pronto:     { rotulo: 'Pronto p/ retirada', cor: 'bg-violet-100 text-violet-800 ring-violet-300', borda: 'ring-violet-300' },
  confirmado: { rotulo: 'Em preparo', cor: 'bg-sky-100 text-sky-800 ring-sky-300',             borda: 'ring-sky-300' },
  concluido:  { rotulo: 'Concluído',  cor: 'bg-emerald-100 text-emerald-800 ring-emerald-300', borda: 'ring-emerald-200' },
  cancelado:  { rotulo: 'Cancelado',  cor: 'bg-ink/10 text-ink-muted ring-ink/15',             borda: 'ring-ink/10' },
};
const PAGAMENTO_ROTULO = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

Object.assign(admin, {
  pedidos: [],
  pedDia: relogioSP().ymd,
  pedFiltro: 'todos',
  pedErro: null,
  pedCarregado: false,
  confirmarCancel: null,
  canalPedidos: null,
  // Fase 11 — histórico e fechamento de caixa por período
  pedModo: 'dia',          // 'dia' | 'periodo'
  pedIni: null,            // 'AAAA-MM-DD'
  pedFim: null,
  pedPainelPeriodo: false, // painel "Filtrar período" aberto no modo dia
  pedLimite: false,        // true se o período passou do máximo de linhas
  pedSeq: 0,               // descarta respostas antigas (troca rápida de dia/período)
});

const hhmm = (iso) => { const { min } = relogioSP(new Date(iso)); return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; };
const somaCentavos = (lista, f) => Math.round(lista.reduce((a, p) => a + Number(f(p) || 0), 0) * 100) / 100;
const ddmm = (ymd) => { const [, m, d] = ymd.split('-'); return `${d}/${m}`; };
const somaDias = (ymd, n) => relogioSP(new Date(dataSP(ymd, 720).getTime() + n * 86400000)).ymd;
const difDias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const PERIODO_MAX_DIAS = 366;
const PERIODO_MAX_LINHAS = 10000;
// No modo período: colunas do caixa + "itens" (ranking) + bairro/endereço (zonas quentes)
const COLUNAS_PERIODO = 'id,codigo,cliente_nome,tipo,pagamento,subtotal,taxa_entrega,total,status,criado_em,itens,bairro,endereco';

async function carregarPedidos() {
  const seq = ++admin.pedSeq;
  const periodo = admin.pedModo === 'periodo';
  const ini = dataSP(periodo ? admin.pedIni : admin.pedDia, 0);
  const fim = dataSP(periodo ? admin.pedFim : admin.pedDia, 1440);

  let data = [], error = null, limite = false;
  if (!periodo) {
    ({ data, error } = await sb.from('pedidos').select('*')
      .gte('criado_em', ini.toISOString()).lt('criado_em', fim.toISOString())
      .order('criado_em', { ascending: false }));
  } else {
    // O Supabase devolve no máximo 1000 linhas por vez: busca em páginas
    const PAG = 1000;
    for (let de = 0; de < PERIODO_MAX_LINHAS; de += PAG) {
      const r = await sb.from('pedidos').select(COLUNAS_PERIODO)
        .gte('criado_em', ini.toISOString()).lt('criado_em', fim.toISOString())
        .order('criado_em', { ascending: false }).order('id', { ascending: false })
        .range(de, de + PAG - 1);
      if (r.error) { error = r.error; break; }
      data = data.concat(r.data || []);
      if (!r.data || r.data.length < PAG) break;
      if (de + PAG >= PERIODO_MAX_LINHAS) limite = true;
    }
  }
  if (seq !== admin.pedSeq) return; // chegou resposta de uma busca antiga

  admin.pedCarregado = true;
  admin.pedLimite = limite;
  if (error) {
    console.error('[Pedidos]', error);
    admin.pedErro = error.code === '42P01' || /pedidos/.test(error.message || '')
      ? 'Rode primeiro o SQL da Fase 8 (tabela de pedidos) no Supabase.'
      : 'Não foi possível carregar os pedidos. Verifique a internet.';
  } else {
    admin.pedErro = null;
    admin.pedidos = data || [];
  }
  atualizarBadgePedidos();
  if (admin.aba === 'pedidos' && location.hash === '#admin') renderPedidos();
}
