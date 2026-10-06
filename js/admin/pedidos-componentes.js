/* ---------- Pedaços de interface reutilizados ---------- */
const ICONE_CAL = `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/></svg>`;

function cartaoResumo(titulo, valor, sub, escuro) {
  return `
    <div class="rounded-2xl ${escuro ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/5'} p-3 shadow-card">
      <p class="text-[11px] font-bold uppercase tracking-wide ${escuro ? 'text-white/60' : 'text-ink-muted'}">${titulo}</p>
      <p class="mt-1 text-lg font-extrabold leading-tight">${valor}</p>
      <p class="text-[11px] ${escuro ? 'text-white/50' : 'text-ink-muted'}">${sub}</p>
    </div>`;
}

function painelPeriodo() {
  const hoje = relogioSP().ymd;
  const ini = admin.pedIni || somaDias(hoje, -6);
  const fim = admin.pedFim || hoje;
  const campo = (id, rot, v) => `
    <label class="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">${rot}
      <input id="${id}" type="date" value="${v}" max="${hoje}"
        class="h-11 w-full min-w-0 rounded-xl bg-cream px-3 text-sm font-bold normal-case tracking-normal text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:light]">
    </label>`;
  const atalho = (k, r) => `<button data-ped-atalho="${k}" class="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-muted ring-1 ring-ink/10 hover:text-ink">${r}</button>`;
  return `
    <section class="mt-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink/5">
      <div class="flex items-center justify-between">
        <p class="text-sm font-extrabold">Fechamento de caixa por período</p>
        <button data-ped-periodo-fechar class="grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-ink/5" aria-label="Fechar">✕</button>
      </div>
      <div class="no-scrollbar -mx-3 mt-2 flex gap-2 overflow-x-auto px-3">
        ${atalho('semana', 'Esta semana')}${atalho('7d', 'Últimos 7 dias')}${atalho('mes', 'Este mês')}${atalho('mes_passado', 'Mês passado')}${atalho('30d', '30 dias')}
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2">
        ${campo('pedIniInput', 'Início', ini)}${campo('pedFimInput', 'Fim', fim)}
      </div>
      <button data-ped-periodo-aplicar class="mt-3 h-11 w-full rounded-xl bg-ink text-sm font-extrabold text-white">Ver resumo do período</button>
    </section>`;
}

function renderPedidos() {
  const alvo = $('#adminConteudo');
  if (!alvo) return;
  if (admin.pedModo === 'periodo') return renderPeriodo(alvo);

  const hoje = relogioSP().ymd;
  const lista = admin.pedidos;
  const concl = lista.filter((p) => p.status === 'concluido');
  const validos = lista.filter((p) => p.status !== 'cancelado');
  const emAberto = lista.filter((p) => !['concluido', 'cancelado'].includes(p.status));
  const vendas = somaCentavos(concl, (p) => p.total);
  const frete = somaCentavos(concl, (p) => p.taxa_entrega);
  const aberto = somaCentavos(emAberto, (p) => p.total);
  const GRUPO_FILTRO = { preparo: ['preparo', 'confirmado'], saida: ['a_caminho', 'pronto'] };
  const noFiltro = (p, k) => (GRUPO_FILTRO[k] || [k]).includes(p.status);
  const conta = (k) => lista.filter((p) => noFiltro(p, k)).length;
  const filtrados = admin.pedFiltro === 'todos' ? lista : lista.filter((p) => noFiltro(p, admin.pedFiltro));

  const chip = (k, r, n) => `
    <button data-ped-filtro="${k}" class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${admin.pedFiltro === k ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-muted ring-ink/10'}">
      ${r}${n ? ` <span class="opacity-70">${n}</span>` : ''}</button>`;

  alvo.innerHTML = `${avisoNotificacoes()}
    <div class="flex items-center justify-between gap-2">
      <button data-ped-dia="-1" class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card ring-1 ring-ink/5" aria-label="Dia anterior">‹</button>

      <!-- Calendário camuflado: o input de data fica invisível por cima do rótulo -->
      <label class="relative flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white" title="Escolher uma data">
        <span class="truncate font-extrabold">${esc(rotuloDia(admin.pedDia))}</span>
        <span class="text-brand-700">${ICONE_CAL}</span>
        <input id="pedCalendario" type="date" value="${admin.pedDia}" max="${hoje}" aria-label="Ir para uma data"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:light]">
      </label>

      <button data-ped-dia="1" ${admin.pedDia >= hoje ? 'disabled' : ''} class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card ring-1 ring-ink/5 disabled:opacity-30" aria-label="Dia seguinte">›</button>
    </div>

    <div class="mt-1 flex items-center justify-center gap-3 text-xs font-bold">
      ${admin.pedDia !== hoje ? '<button data-ped-hoje class="text-brand-700 underline-offset-2 hover:underline">Voltar para hoje</button><span class="text-ink/20">·</span>' : ''}
      <button data-ped-periodo-abrir class="inline-flex items-center gap-1 text-ink-muted underline-offset-2 hover:text-ink hover:underline">↔ Filtrar período</button>
      <span class="text-ink/20">·</span>
      <button data-papel title="Largura do papel da impressora térmica" class="text-ink-muted underline-offset-2 hover:text-ink hover:underline">🖨️ Papel ${admin.papel} mm</button>
    </div>

    ${admin.pedPainelPeriodo ? painelPeriodo() : ''}

    <!-- RESUMO DO CAIXA -->
    <section class="mt-3 grid grid-cols-3 gap-2">
      ${cartaoResumo('Vendas', money(vendas), 'só concluídos', true)}
      ${cartaoResumo('Frete', money(frete), 'arrecadado')}
      ${cartaoResumo('Pedidos', validos.length, `${concl.length} concluído${concl.length === 1 ? '' : 's'}`)}
    </section>
    ${emAberto.length ? `<p class="mt-2 text-xs text-ink-muted">Em aberto: <strong class="text-ink">${money(aberto)}</strong> em ${emAberto.length} pedido${emAberto.length === 1 ? '' : 's'} (ainda não concluídos)</p>` : ''}

    ${blocoInteligencia()}

    <div class="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
      ${chip('todos', 'Todos', lista.length)}${chip('pendente', 'Pendentes', conta('pendente'))}${chip('preparo', 'Em preparo', conta('preparo'))}${chip('saida', 'Saiu / Pronto', conta('saida'))}${chip('concluido', 'Concluídos', conta('concluido'))}${chip('cancelado', 'Cancelados', conta('cancelado'))}
    </div>

    <div class="mt-3 grid gap-3">
      ${admin.pedErro ? `<p class="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">${esc(admin.pedErro)}</p>`
        : !admin.pedCarregado ? '<div class="grid place-items-center py-16"><div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div></div>'
        : filtrados.length ? filtrados.map(cartaoPedido).join('')
        : `<p class="py-14 text-center text-sm text-ink-muted">${lista.length ? 'Nenhum pedido neste filtro.' : admin.pedDia === hoje ? 'Nenhum pedido hoje ainda. Os novos aparecem aqui sozinhos 🔔' : 'Nenhum pedido neste dia.'}</p>`}
    </div>`;
}
