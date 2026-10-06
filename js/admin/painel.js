/* =====================================================================
   FASE 4 — PAINEL DE ADMINISTRAÇÃO  (rota escondida: #admin)
   A segurança real está no Supabase (RLS + tabela "admins"):
   esconder a rota só evita que clientes a encontrem por acaso.
   ===================================================================== */
const admin = {
  pronto: false,        // sessão verificada como admin
  aba: 'pedidos',       // 'pedidos' | 'operacao' | 'catalogo' | 'loja'
  pratos: [],
  grupos: [],
  config: null,
  busca: '',
  confirmarReset: false,
  canal: null,
};

const LOGO_SRC = document.querySelector('header img')?.src || '';

function rotear() {
  const emAdmin = location.hash === '#admin';
  document.body.classList.toggle('modo-admin', emAdmin);
  if (emAdmin) {
    if ($('#sheet').dataset.open === 'true') fecharSheet();
    if ($('#cart').dataset.open === 'true') fecharSacola();
    window.scrollTo(0, 0);
    abrirAdmin();
  } else if (MODO !== 'carregando') {
    if (!$('#adminModal').classList.contains('hidden')) fecharModal();
    recarregarEmSegundoPlano(0);   // volta ao cardápio já com as mudanças feitas no painel
  }
}

async function abrirAdmin() {
  if (!sb) return renderAdminAviso('Supabase não configurado', 'Preencha SUPABASE_URL e SUPABASE_ANON_KEY no código para usar o painel.');
  if (admin.pronto) return renderAdminShell();
  renderAdminCarregando();
  const { data } = await sb.auth.getSession();
  if (!data?.session) return renderLogin();
  await verificarAdmin();
}

async function verificarAdmin() {
  const { data: eAdmin, error } = await sb.rpc('is_admin');
  if (error || !eAdmin) {
    await sb.auth.signOut();
    return renderLogin(error ? 'Não foi possível verificar a permissão. Tente de novo.' : 'Esta conta não tem permissão de administrador.');
  }
  admin.pronto = true;
  renderAdminShell();
  await carregarAdmin();
  assinarAdmin();
  carregarPedidos();
  assinarPedidos();
}

/* ---------- Ecrãs base ---------- */
function renderAdminCarregando() {
  $('#adminApp').innerHTML = `
    <div class="grid min-h-screen place-items-center">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
    </div>`;
}

function renderAdminAviso(titulo, texto) {
  $('#adminApp').innerHTML = `
    <div class="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p class="text-lg font-extrabold">${esc(titulo)}</p>
        <p class="mt-2 text-sm text-ink-muted">${esc(texto)}</p>
        <a href="#" class="mt-6 inline-block font-bold text-brand-700">← Voltar ao cardápio</a>
      </div>
    </div>`;
}

function renderLogin(msgErro = '') {
  $('#adminApp').innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-10">
      <img src="${LOGO_SRC}" alt="" class="h-24 w-24 rounded-full ring-2 ring-brand-500/70" />
      <form id="loginForm" class="mt-6 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" novalidate>
        <h1 class="text-xl font-extrabold">Área restrita</h1>
        <p class="mt-1 text-sm text-ink-muted">Painel de gestão do Sertão Bão</p>

        <label class="mt-5 block">
          <span class="text-sm font-bold">Email</span>
          <input id="loginEmail" type="email" required autocomplete="username" inputmode="email"
            class="mt-1.5 w-full rounded-xl border-0 bg-cream px-3 py-3 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
        </label>
        <label class="mt-3 block">
          <span class="text-sm font-bold">Senha</span>
          <div class="relative mt-1.5">
            <input id="loginSenha" type="password" required autocomplete="current-password"
              class="w-full rounded-xl border-0 bg-cream px-3 py-3 pr-16 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
            <button type="button" id="verSenha" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-ink-muted">Mostrar</button>
          </div>
        </label>

        <p id="loginErro" class="mt-3 text-sm font-semibold text-red-600 ${msgErro ? '' : 'hidden'}">${esc(msgErro)}</p>

        <button id="loginBtn" type="submit"
          class="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 font-bold text-ink disabled:opacity-60">
          Entrar
        </button>
      </form>
      <a href="#" class="mt-6 text-sm font-semibold text-white/60 hover:text-white">← Voltar ao cardápio</a>
    </div>`;
  $('#loginEmail').focus();
}

async function fazerLogin(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginSenha').value;
  const erro = $('#loginErro');
  if (!email || !password) {
    erro.textContent = 'Preencha o email e a senha.';
    return erro.classList.remove('hidden');
  }
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink"></span> Entrando…';

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    erro.textContent = /invalid login/i.test(error.message) ? 'Email ou senha incorretos.'
      : /rate|too many/i.test(error.message) ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
      : 'Não foi possível entrar. Verifique a internet.';
    return erro.classList.remove('hidden');
  }
  await verificarAdmin();
}

async function sairAdmin() {
  fecharModal();
  pararAlarme();
  if (admin.canalPedidos) { sb.removeChannel(admin.canalPedidos); admin.canalPedidos = null; }
  admin.canal && sb.removeChannel(admin.canal);
  Object.assign(admin, { pronto: false, canal: null, pratos: [], grupos: [], config: null });
  await sb.auth.signOut();
  renderLogin();
}

/* ---------- Estrutura do painel ---------- */
function renderAdminShell() {
  const aba = (k, rotulo) => `
    <button data-admin-aba="${k}" class="relative flex-1 whitespace-nowrap px-1 py-3 text-[13px] font-bold sm:text-sm ${admin.aba === k
      ? "text-white after:absolute after:inset-x-6 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand-500 after:content-['']"
      : 'text-white/50'}">${rotulo}</button>`;

  $('#adminApp').innerHTML = `
    <header class="sticky top-0 z-30 bg-ink text-white shadow-lg">
      <div class="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-3">
        <img src="${LOGO_SRC}" alt="" class="h-10 w-10 rounded-full ring-1 ring-brand-500/60" />
        <div class="min-w-0 flex-1 leading-tight">
          <p class="font-extrabold">Painel</p>
          <p class="text-xs text-white/50">Sertão Bão</p>
        </div>
        <a href="#" class="rounded-lg px-3 py-2 text-xs font-bold text-white/70 ring-1 ring-white/15 hover:text-white">Ver cardápio</a>
        <button id="adminSair" class="rounded-lg px-3 py-2 text-xs font-bold text-white/70 ring-1 ring-white/15 hover:text-white">Sair</button>
      </div>
      <nav class="mx-auto flex max-w-3xl px-4">${aba('pedidos', 'Pedidos <span id="badgePedidos" class="ml-0.5 hidden rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">0</span>')}${aba('operacao', 'Operação')}${aba('catalogo', 'Cardápio')}${aba('loja', 'Loja')}</nav>
    </header>
    <main id="adminConteudo" class="mx-auto max-w-3xl px-4 pb-24 pt-4"></main>`;

  renderAdminConteudo();
  atualizarBadgePedidos();
}

function renderAdminConteudo() {
  const alvo = $('#adminConteudo');
  if (!alvo) return;
  if (!admin.config) {
    alvo.innerHTML = `<div class="grid place-items-center py-24"><div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div></div>`;
    return;
  }
  if (admin.aba === 'pedidos') { renderPedidos(); verificarNotificacoes(); }
  else if (admin.aba === 'operacao') renderOperacao();
  else if (admin.aba === 'catalogo') renderCatalogo();
  else renderLoja();
}

/* ---------- Dados ---------- */
// Grupos + opções (com foto_url se a coluna já existir — Fase 10)
async function buscarGruposAdmin() {
  const campos = (foto, dias) => `id, nome, opcoes ( id, nome, preco, max_quantidade, esgotado, ativo, ordem${foto ? ', foto_url' : ''}${dias ? ', dias_disponiveis' : ''} ), prato_grupos ( prato:pratos ( nome ) )`;
  let r = await sb.from('grupos_opcoes').select(campos(admin.fotoOpcao !== false, _temDiasOpcao)).order('id');
  if (r.error?.code === '42703' && /dias_disponiveis/.test(r.error.message || '')) {
    _temDiasOpcao = false;
    r = await sb.from('grupos_opcoes').select(campos(admin.fotoOpcao !== false, false)).order('id');
  }
  if (r.error?.code === '42703' && /foto_url/.test(r.error.message || '')) {
    admin.fotoOpcao = false;
    r = await sb.from('grupos_opcoes').select(campos(false, _temDiasOpcao)).order('id');
  } else if (!r.error) admin.fotoOpcao = true;
  return r;
}

async function carregarAdmin() {
  const [p, g, c] = await Promise.all([
    sb.from('pratos')
      .select(`id, nome, descricao, preco, categoria, foto_url, dias_disponiveis, esgotado, destaque, ativo, ordem${_temAcompanha ? ', acompanha, acompanha_cats' : ''}, prato_grupos ( grupo_id, titulo, min_escolhas, max_escolhas, ordem )`)
      .order('ordem').order('id'),
    buscarGruposAdmin(),
    sb.from('configuracoes').select('*').eq('id', 1).maybeSingle(),
  ]);
  const erro = p.error || g.error || c.error;
  // Banco ainda sem a coluna "acompanha" (SQL da Fase 27): tenta de novo sem ela
  if (erro?.code === '42703' && /acompanha/.test(erro.message || '') && _temAcompanha) {
    _temAcompanha = false;
    return carregarAdmin();
  }
  if (erro) {
    console.error('[Admin]', erro);
    $('#adminConteudo').innerHTML = `
      <div class="rounded-2xl bg-white p-6 text-center shadow-card">
        <p class="font-bold">Não foi possível carregar os dados</p>
        <button id="adminRetry" class="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 font-bold text-ink">Tentar de novo</button>
      </div>`;
    return;
  }
  admin.pratos = p.data;
  admin.grupos = g.data.map((gr) => ({
    ...gr,
    opcoes: (gr.opcoes || []).sort(porOrdem),
    usadoEm: [...new Set((gr.prato_grupos || []).map((x) => x.prato?.nome).filter(Boolean))],
  }));
  admin.config = c.data;
  renderAdminConteudo();
}

function assinarAdmin() {
  if (admin.canal) return;
  let t;
  const recarregar = () => {
    clearTimeout(t);
    // Outro aparelho mudou algo: atualiza, mas nunca por cima de um formulário a ser editado
    t = setTimeout(() => { if (admin.pronto && admin.aba === 'operacao') carregarAdmin(); }, 500);
  };
  admin.canal = sb.channel('painel-admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pratos' }, recarregar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'opcoes' }, recarregar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, recarregar)
    .subscribe();
}

/* ---------- Componentes ---------- */
function interruptor({ tipo, id, ligado, on = 'Disponível', off = 'Esgotado', grande = false }) {
  return `
    <button role="switch" aria-checked="${ligado}" data-toggle="${tipo}" data-id="${id}"
      class="flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-2 active:scale-95">
      <span class="${grande ? '' : 'hidden min-[420px]:inline'} text-xs font-extrabold uppercase tracking-wide ${ligado ? 'text-emerald-700' : 'text-red-600'}">${ligado ? on : off}</span>
      <span class="relative ${grande ? 'h-8 w-14' : 'h-7 w-12'} rounded-full transition-colors ${ligado ? 'bg-emerald-500' : 'bg-red-500/80'}">
        <span class="absolute top-0.5 ${grande ? 'h-7 w-7' : 'h-6 w-6'} rounded-full bg-white shadow transition-all
          ${ligado ? (grande ? 'left-[26px]' : 'left-[22px]') : 'left-0.5'}"></span>
      </span>
    </button>`;
}

function linhaItem({ tipo, item, detalhe }) {
  const esg = item.esgotado;
  return `
    <li class="flex items-center gap-3 px-4 py-3 ${esg ? 'bg-red-50/60' : ''}">
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold ${esg ? 'text-ink-muted line-through' : ''}">${esc(item.nome)}</p>
        <p class="text-xs text-ink-muted">${detalhe}</p>
      </div>
      ${tipo === 'prato' ? `
        <button data-toggle="destaque" data-id="${item.id}" aria-pressed="${!!item.destaque}" aria-label="Destaque na vitrine"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ring-1 transition active:scale-90
                 ${item.destaque ? 'bg-brand-500 text-ink ring-brand-500' : 'text-ink/30 ring-ink/10'}">${item.destaque ? '★' : '☆'}</button>` : ''}
      ${interruptor({ tipo, id: item.id, ligado: !esg })}
    </li>`;
}

const normTxt = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- Aba: Operação ---------- */
function renderOperacao() {
  const est = estadoLoja(admin.config);
  const aberta = est.aberta;
  const automatico = admin.config.horario_auto === true;
  let subtitulo, controle;
  if (est.modo === 'manual') {
    subtitulo = `${aberta ? 'Aberta' : 'Fechada'} manualmente até ${quandoTexto(est.ate)}`;
    controle = `<button data-loja-acao="auto" class="shrink-0 rounded-xl bg-white px-3 py-2.5 text-xs font-bold ring-1 ring-ink/15">Voltar ao automático</button>`;
  } else if (automatico) {
    subtitulo = aberta
      ? `Automático · fecha às ${fmtHora(admin.config.hora_fecha)}`
      : `Automático · abre ${proximaAbertura(admin.config)?.texto || '—'}`;
    controle = aberta
      ? `<button data-loja-acao="fechar" class="shrink-0 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white">Fechar por hoje</button>`
      : `<button data-loja-acao="abrir" class="shrink-0 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white">Abrir agora</button>`;
  } else {
    subtitulo = aberta ? 'Recebendo pedidos (horário automático desligado)' : 'Clientes veem o cardápio, mas não conseguem pedir';
    controle = interruptor({ tipo: 'loja', id: 1, ligado: aberta, on: 'Aberta', off: 'Fechada', grande: true });
  }
  const pratosAtivos = admin.pratos.filter((p) => p.ativo);
  const opcoesAtivas = admin.grupos.flatMap((g) => g.opcoes.filter((o) => o.ativo));
  const nEsg = pratosAtivos.filter((p) => p.esgotado).length + opcoesAtivas.filter((o) => o.esgotado).length;

  $('#adminConteudo').innerHTML = `
    <section class="flex items-center gap-4 rounded-2xl p-4 shadow-card ring-1 ${aberta ? 'bg-emerald-50 ring-emerald-200' : 'bg-red-50 ring-red-200'}">
      <span class="relative flex h-3 w-3 shrink-0">
        ${aberta ? '<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>' : ''}
        <span class="relative inline-flex h-3 w-3 rounded-full ${aberta ? 'bg-emerald-500' : 'bg-red-500'}"></span>
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-extrabold">${aberta ? 'Loja aberta' : 'Loja fechada'}</p>
        <p class="text-[13px] text-ink-muted">${esc(subtitulo)}</p>
      </div>
      ${controle}
    </section>

    <div class="mt-4 flex items-center gap-2">
      <label class="relative block flex-1">
        <span class="sr-only">Buscar item</span>
        <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="adminBusca" type="search" value="${esc(admin.busca)}" placeholder="Buscar prato ou opção…"
          class="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-3 text-base shadow-card outline-none ring-1 ring-ink/5 focus:ring-2 focus:ring-brand-500" />
      </label>
      ${nEsg ? `
        <button id="adminReset" class="shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold ring-1 transition
          ${admin.confirmarReset ? 'bg-red-600 text-white ring-red-600' : 'bg-white text-ink ring-ink/10'}">
          ${admin.confirmarReset ? 'Toque p/ confirmar' : `Reativar tudo (${nEsg})`}
        </button>` : ''}
    </div>

    <p class="mt-3 text-xs text-ink-muted">Toque na <span class="font-bold text-brand-700">★</span> para colocar o prato na vitrine de destaques do cardápio.</p>
    <div id="adminLista"></div>`;

  renderListaAdmin();
}

function renderListaAdmin() {
  const termo = normTxt(admin.busca.trim());
  const bate = (nome) => !termo || normTxt(nome).includes(termo);

  const secaoPratos = (cat, titulo) => {
    const lista = admin.pratos.filter((p) => p.ativo && p.categoria === cat && bate(p.nome));
    if (!lista.length) return '';
    return `
      <h2 class="mb-2 mt-6 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">${titulo}</h2>
      <ul class="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
        ${lista.map((p) => linhaItem({ tipo: 'prato', item: p, detalhe: money(Number(p.preco)) })).join('')}
      </ul>`;
  };

  const gruposHTML = admin.grupos.map((g) => {
    const lista = g.opcoes.filter((o) => o.ativo && (bate(o.nome) || bate(g.nome)));
    if (!lista.length) return '';
    return `
      <div class="mt-3 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
        <div class="border-b border-ink/5 bg-cream-dark/60 px-4 py-2.5">
          <p class="font-bold">${esc(g.nome)}</p>
          ${g.usadoEm.length ? `<p class="text-xs text-ink-muted">Usado em: ${esc(g.usadoEm.join(', '))}</p>` : ''}
        </div>
        <ul class="divide-y divide-ink/5">
          ${lista.map((o) => linhaItem({ tipo: 'opcao', item: o, detalhe: Number(o.preco) > 0 ? '+ ' + money(Number(o.preco)) : 'Sem custo' })).join('')}
        </ul>
      </div>`;
  }).join('');

  const html =
    Object.entries(CATEGORIAS).map(([k, r]) => secaoPratos(k, r)).join('') +
    (gruposHTML ? `<h2 class="mb-1 mt-6 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">Opções, carnes e adicionais</h2>
                   <p class="text-xs text-ink-muted">Esgotar aqui vale para todos os pratos que usam a opção.</p>${gruposHTML}` : '');

  $('#adminLista').innerHTML = html || '<p class="py-16 text-center text-ink-muted">Nada encontrado.</p>';
}

// Redesenha a aba que está aberta (a chave de esgotado existe na Operação e no Cardápio)
function renderAbaAtual() {
  if (location.hash !== '#admin' || !admin.pronto) return;
  if (admin.aba === 'operacao') renderOperacao();
  else if (admin.aba === 'catalogo' && !admin.ed && !admin.edGrupo) renderCatalogo();
}

async function alternarItem(tipo, id) {
  if (tipo === 'destaque') {
    const item = admin.pratos.find((p) => String(p.id) === String(id));
    if (!item) return;
    const novo = !item.destaque;
    item.destaque = novo;
    renderAbaAtual();
    const { data, error } = await sb.from('pratos').update({ destaque: novo }).eq('id', item.id).select('id');
    if (error || !data?.length) {
      item.destaque = !novo; renderAbaAtual();
      return toast(error?.code === '42703' || /destaque/.test(error?.message || '')
        ? 'Rode primeiro o SQL da Fase 6 no Supabase.' : 'Não foi possível salvar. Verifique a internet.');
    }
    return toast(novo ? `★ ${item.nome} está na vitrine` : `${item.nome} saiu da vitrine`);
  }

  if (tipo === 'loja') {
    const novo = !admin.config.loja_aberta;
    admin.config.loja_aberta = novo;
    renderAbaAtual();
    const { data, error } = await sb.from('configuracoes').update({ loja_aberta: novo }).eq('id', 1).select('id');
    if (error || !data?.length) {
      admin.config.loja_aberta = !novo; renderAbaAtual();
      return toast('Não foi possível salvar. Verifique a internet.');
    }
    return toast(novo ? 'Loja aberta! Pedidos liberados.' : 'Loja fechada. Pedidos pausados.');
  }

  const tabela = tipo === 'prato' ? 'pratos' : 'opcoes';
  const item = tipo === 'prato'
    ? admin.pratos.find((p) => String(p.id) === String(id))
    : admin.grupos.flatMap((g) => g.opcoes).find((o) => String(o.id) === String(id));
  if (!item) return;

  const novo = !item.esgotado;
  item.esgotado = novo;             // atualização otimista: resposta instantânea no ecrã
  renderAbaAtual();
  const { data, error } = await sb.from(tabela).update({ esgotado: novo }).eq('id', item.id).select('id');
  if (error || !data?.length) {
    item.esgotado = !novo; renderAbaAtual();
    return toast('Não foi possível salvar. Verifique a internet.');
  }
  toast(`${item.nome}: ${novo ? 'esgotado' : 'disponível de novo'}`);
}

// Abrir/fechar manual por cima do horário automático (expira sozinho)
async function acaoLoja(acao) {
  const cfg = admin.config;
  let dados;
  if (acao === 'auto') dados = { status_manual: null, status_manual_ate: null };
  if (acao === 'fechar') {
    const prox = proximaAbertura(cfg);   // fecha até a próxima abertura (ex: amanhã 7h)
    dados = { status_manual: 'fechada', status_manual_ate: (prox?.data || dataSP(relogioSP().ymd, 1439)).toISOString() };
  }
  if (acao === 'abrir') {
    // Antes do horário: abre até a hora normal de abrir (depois o automático assume e fecha às 14h30).
    // Depois do horário: fica aberta até à meia-noite (ou até tocar em "Voltar ao automático").
    const prox = proximaAbertura(cfg);
    const ateHoje = prox && prox.texto.startsWith('hoje');
    dados = { status_manual: 'aberta', status_manual_ate: (ateHoje ? prox.data : dataSP(relogioSP().ymd, 1439)).toISOString() };
  }
  const antes = { ...cfg };
  Object.assign(cfg, dados);
  renderOperacao();
  const { data, error } = await sb.from('configuracoes').update(dados).eq('id', 1).select('id');
  if (error || !data?.length) {
    admin.config = antes; renderOperacao();
    return toast(error?.code === '42703' || /status_manual/.test(error?.message || '')
      ? 'Rode primeiro o SQL do horário automático no Supabase.' : 'Não foi possível salvar. Verifique a internet.');
  }
  toast(acao === 'auto' ? 'Voltou ao horário automático' : acao === 'fechar' ? 'Loja fechada por hoje' : 'Loja aberta! Pedidos liberados.');
}

async function reativarTudo() {
  if (!admin.confirmarReset) {
    admin.confirmarReset = true;
    renderOperacao();
    setTimeout(() => { if (admin.confirmarReset) { admin.confirmarReset = false; admin.aba === 'operacao' && renderOperacao(); } }, 4000);
    return;
  }
  admin.confirmarReset = false;
  const [a, b] = await Promise.all([
    sb.from('pratos').update({ esgotado: false }).eq('esgotado', true).select('id'),
    sb.from('opcoes').update({ esgotado: false }).eq('esgotado', true).select('id'),
  ]);
  if (a.error || b.error) toast('Não foi possível reativar tudo.');
  else toast(`${(a.data?.length || 0) + (b.data?.length || 0)} itens disponíveis de novo`);
  await carregarAdmin();
}

/* ---------- Aba: Loja e Pix ---------- */
function formatarWhats(d) {
  const m = String(d || '').match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : String(d || '');
}

function normalizarWhats(txt) {
  let d = String(txt).replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;   // sem o 55 → acrescenta
  return /^55\d{10,11}$/.test(d) ? d : null;
}

function renderLoja() {
  const c = admin.config;
  const campoCfg = ({ id, label, valor, dica = '', tipo = 'text', inputmode = '', max = 120 }) => `
    <label class="block">
      <span class="text-sm font-bold">${label}</span>
      <input id="cfg_${id}" type="${tipo}" value="${esc(valor || '')}" maxlength="${max}" ${inputmode ? `inputmode="${inputmode}"` : ''}
        class="mt-1.5 w-full rounded-xl border-0 bg-white px-3 py-3 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
      ${dica ? `<span class="mt-1 block text-xs text-ink-muted">${dica}</span>` : ''}
    </label>`;

  $('#adminConteudo').innerHTML = `
    <form id="cfgForm" class="grid gap-5" novalidate>
      <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-extrabold">Horário de funcionamento</h2>
            <p class="text-[13px] text-ink-muted">A loja abre e fecha sozinha. Na aba Operação dá para abrir ou fechar na hora.</p>
          </div>
          <label class="flex shrink-0 items-center gap-2 text-sm font-bold">
            <input id="cfg_horario_auto" type="checkbox" ${c.horario_auto === true ? 'checked' : ''} class="h-5 w-5 accent-amber-500" /> Automático
          </label>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          ${[['hora_abre', 'Abre às'], ['hora_fecha', 'Fecha às'], ['cafe_ate', 'Café da manhã até'], ['almoco_desde', 'Almoço a partir de']].map(([k, r]) => `
            <label class="block">
              <span class="text-xs font-bold text-ink-muted">${r}</span>
              <input id="cfg_${k}" type="time" value="${esc(String(c[k] || CONFIG[k] || '').slice(0, 5))}"
                class="mt-1 w-full rounded-xl border-0 bg-cream px-3 py-2.5 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
            </label>`).join('')}
        </div>
        <p class="mt-2 text-xs text-ink-muted">Almoço vai até a hora de fechar. Porções, lanches e bebidas: o dia todo.</p>
        <span class="mt-4 block text-xs font-bold text-ink-muted">Dias abertos</span>
        <div class="mt-1 grid grid-cols-7 gap-1.5">
          ${DIAS_CURTO.map((d, i) => `
            <label class="cursor-pointer">
              <input type="checkbox" data-cfg-dia="${i}" ${diasAbertos(c).includes(i) ? 'checked' : ''} class="peer sr-only" />
              <span class="block rounded-lg py-2 text-center text-xs font-bold ring-1 ring-ink/10 peer-checked:bg-brand-500 peer-checked:text-ink peer-checked:ring-brand-500">${d}</span>
            </label>`).join('')}
        </div>
        <p id="erroHorario" class="mt-2 hidden text-xs font-semibold text-red-600"></p>
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <h2 class="font-extrabold">WhatsApp do quiosque</h2>
        <p class="mb-3 text-[13px] text-ink-muted">Os pedidos dos clientes chegam neste número.</p>
        ${campoCfg({ id: 'whatsapp', label: 'Número com DDD', valor: formatarWhats(c.whatsapp), tipo: 'tel', inputmode: 'tel', dica: 'Ex: (61) 99999-9999', max: 25 })}
        <p id="erroWhats" class="mt-1 hidden text-xs font-semibold text-red-600">Número inválido. Use DDD + número, ex: (61) 99999-9999.</p>
        <a id="testarWhats" href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener"
           class="mt-3 inline-flex text-sm font-bold text-emerald-700">Testar este número no WhatsApp →</a>
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <h2 class="font-extrabold">Entrega</h2>
        <p class="mb-3 text-[13px] text-ink-muted">Valor mínimo dos itens para o cliente pedir entrega. A taxa do motoboy não conta. Quem retira no balcão não tem mínimo.</p>
        ${campoCfg({ id: 'pedido_minimo', label: 'Valor mínimo do pedido (R$)', valor: precoTxt(c.pedido_minimo ?? 20), inputmode: 'decimal', dica: 'Deixe 0 para não exigir mínimo', max: 10 })}
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <h2 class="font-extrabold">Pix</h2>
        <div class="mb-4 mt-2 flex gap-2.5 rounded-xl bg-brand-50 p-3 text-[13px] leading-snug text-brand-800 ring-1 ring-brand-200">
          <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></svg>
          <span>Esta chave aparece no checkout, com botão de copiar, para quem escolhe <strong>Retirar no Balcão</strong>.
          Para <strong>Entrega</strong>, o cliente é avisado de que receberá o Pix ou link de pagamento pelo WhatsApp, já com a taxa.</span>
        </div>
        <div class="grid gap-3">
          ${campoCfg({ id: 'chave_pix', label: 'Chave Pix', valor: c.chave_pix, dica: 'CPF, CNPJ, celular, email ou chave aleatória' })}
          ${campoCfg({ id: 'titular_pix', label: 'Nome do titular', valor: c.titular_pix, dica: 'Ajuda o cliente a confirmar que está pagando a pessoa certa' })}
        </div>
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <h2 class="font-extrabold">Aviso no cardápio</h2>
        <p class="mb-3 text-[13px] text-ink-muted">Aparece numa faixa no topo do site. Deixe vazio para esconder.</p>
        <textarea id="cfg_mensagem_aviso" rows="2" maxlength="140" placeholder="Ex: Hoje tem feijoada! 🍲"
          class="w-full resize-none rounded-xl border-0 bg-white px-3 py-3 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500">${esc(c.mensagem_aviso || '')}</textarea>
      </section>

      <button id="cfgSalvar" type="submit"
        class="sticky bottom-4 flex h-12 items-center justify-center rounded-xl bg-brand-500 font-bold text-ink shadow-xl shadow-brand-700/20 disabled:opacity-60">
        Salvar alterações
      </button>
    </form>`;
}

async function salvarConfig(e) {
  e.preventDefault();
  const whats = normalizarWhats($('#cfg_whatsapp').value);
  $('#erroWhats').classList.toggle('hidden', !!whats);
  if (!whats) return $('#cfg_whatsapp').focus();

  // Horário
  const h = (id) => $('#cfg_' + id).value;
  const dias = [...document.querySelectorAll('[data-cfg-dia]')].filter((x) => x.checked).map((x) => Number(x.dataset.cfgDia));
  const erroH = $('#erroHorario');
  const msgH = !h('hora_abre') || !h('hora_fecha') ? 'Preencha a hora de abrir e de fechar.'
    : hm(h('hora_abre')) >= hm(h('hora_fecha')) ? 'A hora de fechar tem de ser depois da de abrir.'
    : !dias.length ? 'Escolha pelo menos um dia aberto.' : '';
  erroH.textContent = msgH;
  erroH.classList.toggle('hidden', !msgH);
  if (msgH) return erroH.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const dados = {
    horario_auto: $('#cfg_horario_auto').checked,
    hora_abre: h('hora_abre'),
    hora_fecha: h('hora_fecha'),
    cafe_ate: h('cafe_ate') || null,
    almoco_desde: h('almoco_desde') || null,
    dias_abertos: dias,
    whatsapp: whats,
    chave_pix: $('#cfg_chave_pix').value.trim() || null,
    titular_pix: $('#cfg_titular_pix').value.trim() || null,
    mensagem_aviso: $('#cfg_mensagem_aviso').value.trim() || null,
    pedido_minimo: (() => {
      const v = parseValor($('#cfg_pedido_minimo').value);
      return Number.isFinite(v) && v >= 0 ? Math.min(v, 500) : 0;
    })(),
  };
  const btn = $('#cfgSalvar');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const { data, error } = await sb.from('configuracoes').update(dados).eq('id', 1).select().maybeSingle();
  btn.disabled = false; btn.textContent = 'Salvar alterações';
  if (error || !data) return toast(error?.code === '42703' && /pedido_minimo/.test(error?.message || '')
    ? 'Rode o SQL do pedido mínimo (Fase 30) no Supabase.'
    : error?.code === '42703' || /hora_|horario|dias_abertos/.test(error?.message || '')
    ? 'Rode primeiro o SQL do horário automático no Supabase.' : 'Não foi possível salvar. Verifique a internet.');
  admin.config = data;
  renderLoja();
  toast('Configurações salvas ✓');
}

/* ---------- Eventos do painel ---------- */
$('#adminApp').addEventListener('submit', (e) => {
  if (e.target.id === 'loginForm') fazerLogin(e);
  if (e.target.id === 'cfgForm') salvarConfig(e);
});

$('#adminApp').addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('#verSenha')) {
    const i = $('#loginSenha'); const ver = i.type === 'password';
    i.type = ver ? 'text' : 'password'; t.closest('#verSenha').textContent = ver ? 'Ocultar' : 'Mostrar';
    return;
  }
  if (t.closest('#adminSair')) return sairAdmin();
  if (t.closest('#adminRetry')) return carregarAdmin();
  if (t.closest('#adminReset')) return reativarTudo();
  const la = t.closest('[data-loja-acao]');
  if (la) return acaoLoja(la.dataset.lojaAcao);
  const aba = t.closest('[data-admin-aba]');
  if (aba) { admin.aba = aba.dataset.adminAba; admin.confirmarReset = false; renderAdminShell(); if (admin.aba === 'pedidos') { carregarPedidos(); verificarNotificacoes(); } else if (admin.aba !== 'loja') carregarAdmin(); return; }
  const tg = t.closest('[data-toggle]');
  if (tg) return alternarItem(tg.dataset.toggle, tg.dataset.id);
});

$('#adminApp').addEventListener('input', (e) => {
  if (e.target.id === 'adminBusca') { admin.busca = e.target.value; renderListaAdmin(); }
  if (e.target.id === 'cfg_whatsapp') {
    const n = normalizarWhats(e.target.value);
    if (n) $('#testarWhats').href = `https://wa.me/${n}`;
    $('#erroWhats').classList.add('hidden');
  }
});

window.addEventListener('hashchange', rotear);
