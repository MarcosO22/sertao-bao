/* =====================================================================
   FASE 3 — LIGAÇÃO AO SUPABASE
   Cole aqui os dados do seu projeto: Supabase → Project Settings → API
   (a "anon public key" pode ficar visível: a segurança está no RLS)
   ===================================================================== */
const SUPABASE_URL = 'https://xbkkulrsayaqhjmkwdgn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NWoMvY3_SRd6pavMKiiOGQ_k1GmjoKL';   // chave PUBLICÁVEL (nunca a secret!)

const LS_MENU = 'sertaobao_cardapio_cache_v1';
const supaConfigurado = /^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL) && (SUPABASE_ANON_KEY.startsWith('sb_publishable_') || SUPABASE_ANON_KEY.length > 40);
const sb = supaConfigurado && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let MODO = 'carregando';   // 'online' | 'cache' | 'demo'

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });

// Converte as linhas do banco para o formato usado pela interface
function mapearPrato(r) {
  return {
    id: r.id,
    categoria: r.categoria,
    nome: r.nome,
    descricao: r.descricao || '',
    preco: Number(r.preco),
    foto_url: r.foto_url,
    dias: r.dias_disponiveis?.length ? r.dias_disponiveis : TODOS,
    esgotado: r.esgotado,
    destaque: !!r.destaque,
    // Em quais categorias de prato esta bebida aparece como "Bebida para acompanhar"
    acompanhaCats: r.acompanha === false ? []
      : (Array.isArray(r.acompanha_cats) ? r.acompanha_cats : CATS_COMIDA),
    ordem: r.ordem,
    grupos: (r.prato_grupos || [])
      .filter((pg) => pg.grupo)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((pg) => ({
        id: `${r.id}-${pg.grupo.id}`,
        nome: pg.titulo || pg.grupo.nome,
        min: pg.min_escolhas,
        max: pg.max_escolhas,
        opcoes: (pg.grupo.opcoes || [])
          .filter((o) => o.ativo)
          .sort(porOrdem)
          .map((o) => ({ id: String(o.id), nome: o.nome, preco: Number(o.preco), max: o.max_quantidade, esgotado: o.esgotado,
                         foto_url: o.foto_url || null, dias: o.dias_disponiveis?.length ? o.dias_disponiveis : TODOS })),
      }))
      .filter((g) => g.opcoes.length),
  };
}

let _temDestaque = true;   // vira false se a coluna "destaque" ainda não existir no banco
let _temAcompanha = true;  // colunas "acompanha"/"acompanha_cats": onde a bebida acompanha o prato
let _temFotoOpcao = true;
let _temDiasOpcao = true;  // coluna "opcoes.dias_disponiveis": carne/acompanhamento por dia da semana
async function buscarCardapio() {
  try { return await _buscarCardapio(); }
  catch (err) {
    if (err?.code === '42703') {
      if (_temFotoOpcao && /foto_url/.test(err.message || '')) { _temFotoOpcao = false; return buscarCardapio(); }
      if (_temDiasOpcao && /dias_disponiveis/.test(err.message || '')) { _temDiasOpcao = false; return buscarCardapio(); }
      if (_temAcompanha && /acompanha/.test(err.message || '')) { _temAcompanha = false; return buscarCardapio(); }
      if (_temDestaque) { _temDestaque = false; return buscarCardapio(); }
    }
    throw err;
  }
}

async function _buscarCardapio() {
  const [pr, cf] = await Promise.all([
    sb.from('pratos')
      .select(`id, categoria, nome, descricao, preco, foto_url, dias_disponiveis, esgotado, ordem${_temDestaque ? ', destaque' : ''}${_temAcompanha ? ', acompanha, acompanha_cats' : ''},
               prato_grupos ( titulo, min_escolhas, max_escolhas, ordem,
                 grupo:grupos_opcoes ( id, nome,
                   opcoes ( id, nome, preco, max_quantidade, esgotado, ativo, ordem${_temFotoOpcao ? ', foto_url' : ''}${_temDiasOpcao ? ', dias_disponiveis' : ''} ) ) )`)
      .eq('ativo', true)
      .order('ordem')
      .order('id'),
    sb.from('configuracoes').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (pr.error) throw pr.error;
  if (cf.error) throw cf.error;
  return { pratos: pr.data.map(mapearPrato), config: cf.data };
}

let PRATOS_RAW = [];   // cardápio completo (todos os dias), como veio do banco

// Monta o cardápio de HOJE: cada opção (carne, acompanhamento…) só entra
// nos dias marcados para ela. Ex.: feijão tropeiro só seg, qua e sex.
function aplicarPratosDoDia() {
  PRATOS = comBebidas(PRATOS_RAW.map((p) => ({
    ...p,
    grupos: p.grupos
      .filter((g) => !String(g.id).endsWith('-bebidas'))
      .map((g) => ({ ...g, opcoes: g.opcoes.filter((o) => (o.dias || TODOS).includes(HOJE)) })),
  })));
}

function aplicarDados({ pratos, config }) {
  if (config) Object.assign(CONFIG, config);
  PRATOS_RAW = pratos;
  aplicarPratosDoDia();
}

/* ---------- Bebidas como adicional em todos os pratos ----------
   Não há nada para cadastrar: as bebidas da aba "Bebidas" entram sozinhas
   num grupo "Bebida para acompanhar" em cada prato, com o MESMO preço da aba.
   Mudou o preço ou esgotou a bebida no painel → muda aqui também.
   Bebida com escolha obrigatória (ex: sabor do refrigerante) vira uma
   opção por sabor: "Refrigerante Lata (Guaraná)". */
const BEBIDAS_MAX_POR_PRATO = 10;

function comBebidas(pratos) {
  // Uma lista de bebidas POR CATEGORIA de prato: o café da manhã tem cafezinho,
  // o almoço não; refrigerante, suco e água entram em todas.
  const porCategoria = {};
  CATS_COMIDA.forEach((c) => { porCategoria[c] = []; });

  pratos
    .filter((b) => b.categoria === 'bebidas' && b.dias.includes(HOJE))
    .forEach((b) => {
      const cats = (b.acompanhaCats ?? CATS_COMIDA).filter((c) => porCategoria[c]);
      if (!cats.length) return;
      const esgotada = !disponibilidade(b).pode;
      const escolha = b.grupos.find((g) => g.min >= 1 && g.max === 1);
      const itens = escolha
        ? escolha.opcoes.map((o) => ({
            id: `beb-${b.id}-${o.id}`, nome: `${b.nome} (${o.nome})`,
            preco: b.preco + o.preco, max: 5, esgotado: esgotada || !!o.esgotado,
            foto_url: o.foto_url || b.foto_url || null, bebida: true,
          }))
        : [{ id: `beb-${b.id}`, nome: b.nome, preco: b.preco, max: 5, esgotado: esgotada, foto_url: b.foto_url || null, bebida: true }];
      cats.forEach((c) => porCategoria[c].push(...itens));
    });

  return pratos.map((p) => {
    const lista = porCategoria[p.categoria];
    if (p.categoria === 'bebidas' || !lista?.length) return p;
    return {
      ...p,
      grupos: [...p.grupos, {
        id: `${p.id}-bebidas`, nome: 'Bebida para acompanhar', min: 0, max: BEBIDAS_MAX_POR_PRATO,
        opcoes: lista.map((o) => ({ ...o })),
      }],
    };
  });
}

async function carregarCardapio() {
  if (!sb) {                         // Supabase ainda não configurado → dados de exemplo
    aplicarDados({ pratos: MOCK_PRATOS, config: null });
    MODO = 'demo';
    return;
  }
  try {
    const dados = await buscarCardapio();
    aplicarDados(dados);
    MODO = 'online';
    try { localStorage.setItem(LS_MENU, JSON.stringify(dados)); } catch (_) {}
  } catch (err) {
    console.error('[Supabase]', err);
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(LS_MENU) || 'null'); } catch (_) {}
    if (!cache) throw err;
    aplicarDados(cache);             // sem internet: usa o último cardápio salvo
    MODO = 'cache';
  }
}

// Recarrega em segundo plano (tempo real, volta ao separador, entrada no checkout)
let _recarga = null;
function recarregarEmSegundoPlano(atraso = 300) {
  if (!sb) return;
  clearTimeout(_recarga);
  _recarga = setTimeout(async () => {
    try {
      const dados = await buscarCardapio();
      aplicarDados(dados);
      MODO = 'online';
      try { localStorage.setItem(LS_MENU, JSON.stringify(dados)); } catch (_) {}
      const r = revalidarCarrinho();
      renderTudo();
      avisarMudancasCarrinho(r);
    } catch (err) { console.warn('[Supabase] recarga falhou', err); }
  }, atraso);
}

function assinarMudancas() {
  if (!sb) return;
  sb.channel('cardapio-publico')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pratos' }, () => recarregarEmSegundoPlano())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'opcoes' }, () => recarregarEmSegundoPlano())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos_opcoes' }, () => recarregarEmSegundoPlano())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prato_grupos' }, () => recarregarEmSegundoPlano())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, () => recarregarEmSegundoPlano())
    .subscribe();

  // Plano B: ao voltar para a página depois de um tempo, recarrega
  let saiuEm = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saiuEm = Date.now();
    else if (Date.now() - saiuEm > 60_000) recarregarEmSegundoPlano(0);
  });
}

/* ---------- Mantém a sacola coerente com o cardápio atual ---------- */
// Remove itens esgotados/indisponíveis e atualiza preços que mudaram
function revalidarCarrinho() {
  const removidos = [];
  let precoMudou = false;

  if (state.cart.length > MAX_LINHAS) state.cart = state.cart.slice(0, MAX_LINHAS);
  state.cart = state.cart.filter((item) => {
    const prato = PRATOS.find((p) => p.id === item.pratoId);
    if (!prato || !disponibilidade(prato).pode || !Array.isArray(item.opcoes)) { removidos.push(item.nome); return false; }
    // QA: quantidade sempre inteira entre 1 e 20; observação no máx. 140 caracteres
    item.qtd = Math.min(MAX_POR_ITEM, Math.max(1, Math.floor(Number(item.qtd)) || 1));
    item.obs = String(item.obs || '').slice(0, 140);
    for (const o of item.opcoes) o.qtd = Math.min(20, Math.max(1, Math.floor(Number(o.qtd)) || 1));

    let extra = 0;
    for (const o of item.opcoes) {
      const grupo = prato.grupos.find((g) => g.id === o.grupoId);
      const atual = grupo?.opcoes.find((x) => x.id === o.id);
      if (!atual || atual.esgotado) { removidos.push(item.nome); return false; }
      o.preco = atual.preco;
      o.nome = atual.nome;
      o.grupo = grupo.nome;
      extra += atual.preco * o.qtd;
    }
    // grupos obrigatórios que o item não cumpre (regra mudou) → remove
    const invalido = prato.grupos.some((g) =>
      item.opcoes.filter((o) => o.grupoId === g.id).reduce((a, o) => a + o.qtd, 0) < g.min);
    if (invalido) { removidos.push(item.nome); return false; }

    const unit = Number(prato.preco) + extra;
    if (!Number.isFinite(unit) || unit < 0) { removidos.push(item.nome); return false; }
    if (Math.abs(unit - item.unit) > 0.001) precoMudou = true;
    item.nome = prato.nome;
    item.unit = unit;
    item.total = unit * item.qtd;
    return true;
  });

  salvarCarrinho();
  return { removidos: [...new Set(removidos)], precoMudou };
}

function avisarMudancasCarrinho({ removidos, precoMudou }) {
  if (removidos.length) toast(`Saiu da sacola (indisponível agora): ${removidos.join(', ')}`);
  else if (precoMudou) toast('Alguns preços foram atualizados na sua sacola');
}

/* ---------- Estados de carregamento / erro / avisos ---------- */
function renderSkeleton() {
  $('#menuList').innerHTML = Array.from({ length: 4 }, () => `
    <li class="flex animate-pulse gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink/5">
      <div class="flex-1 space-y-2 py-1">
        <div class="h-4 w-2/3 rounded bg-ink/10"></div>
        <div class="h-3 w-full rounded bg-ink/5"></div>
        <div class="h-3 w-4/5 rounded bg-ink/5"></div>
        <div class="h-4 w-1/4 rounded bg-ink/10 !mt-4"></div>
      </div>
      <div class="h-24 w-24 rounded-xl bg-ink/10"></div>
    </li>`).join('');
}

function renderErroCarregamento() {
  $('#tabHint').textContent = '';
  $('#menuList').innerHTML = `
    <li class="col-span-full rounded-2xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-ink/5">
      <div class="text-4xl">📡</div>
      <p class="mt-3 font-bold">Não conseguimos carregar o cardápio</p>
      <p class="mt-1 text-sm text-ink-muted">Verifique sua internet e tente de novo.</p>
      <button onclick="location.reload()" class="mt-5 rounded-xl bg-brand-500 px-5 py-2.5 font-bold text-ink">Tentar de novo</button>
    </li>`;
}

function renderAvisos() {
  const el = $('#avisoBanner');
  let html = '';
  if (MODO === 'demo') html = '<strong>Modo demonstração:</strong> configure o Supabase para ver o cardápio real.';
  else if (MODO === 'cache') html = 'Sem conexão — mostrando o último cardápio salvo.';
  else if (CONFIG.mensagem_aviso) html = esc(CONFIG.mensagem_aviso);
  el.innerHTML = html;
  el.classList.toggle('hidden', !html);
}

function renderTudo() {
  renderHeader();
  renderAvisos();
  renderTabs();
  renderVitrine();
  renderMenu();
  renderCartBar();

  // Se o prato aberto esgotou enquanto o cliente escolhia, fecha a janela
  if (state.sheet && $('#sheet').dataset.open === 'true') {
    const atual = PRATOS.find((p) => p.id === state.sheet.prato.id);
    if (!atual || !disponibilidade(atual).pode) {
      fecharSheet();
      toast(`${state.sheet.prato.nome} acabou de esgotar 😕`);
    }
  }
  // Atualiza a sacola aberta
  if ($('#cart').dataset.open === 'true' && state.step === 'sacola') renderCart();
  if ($('#cart').dataset.open === 'true' && state.step === 'checkout') renderCheckoutFooter();
}
