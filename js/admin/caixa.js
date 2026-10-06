/* ---------- Modo período: fechamento de caixa ---------- */
function rotuloPeriodo(ini, fim) {
  const ano = relogioSP().ymd.slice(0, 4);
  const f = (d) => ddmm(d) + (d.slice(0, 4) !== ano ? `/${d.slice(2, 4)}` : '');
  return ini === fim ? f(ini) : `${f(ini)} → ${f(fim)}`;
}
const LINHAS_TABELA = 400; // acima disso mostra só o resumo por dia (evita travar o celular)

function renderPeriodo(alvo) {
  const lista = admin.pedidos;
  const concl = lista.filter((p) => p.status === 'concluido');
  const cancel = lista.filter((p) => p.status === 'cancelado');
  const abertos = lista.filter((p) => !['concluido', 'cancelado'].includes(p.status));
  const vendas = somaCentavos(concl, (p) => p.total);
  const frete = somaCentavos(concl, (p) => p.taxa_entrega);
  const ticket = concl.length ? Math.round((vendas / concl.length) * 100) / 100 : 0;
  const nDias = difDias(admin.pedIni, admin.pedFim) + 1;

  // Totais por forma de pagamento (só concluídos)
  const porPag = ['pix', 'cartao', 'dinheiro'].map((k) => {
    const l = concl.filter((p) => p.pagamento === k);
    return { k, n: l.length, v: somaCentavos(l, (p) => p.total) };
  });

  // Totais por dia (só concluídos), do mais recente para o mais antigo
  const mapaDias = new Map();
  for (const p of concl) {
    const d = relogioSP(new Date(p.criado_em)).ymd;
    const r = mapaDias.get(d) || { n: 0, v: 0, f: 0 };
    r.n += 1; r.v += Number(p.total || 0); r.f += Number(p.taxa_entrega || 0);
    mapaDias.set(d, r);
  }
  const dias = [...mapaDias.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const melhor = dias.reduce((m, d) => (!m || d[1].v > m[1].v ? d : m), null);

  const cab = (t, dir) => `<th class="px-2 py-2 ${dir ? 'text-right' : 'text-left'} text-[10px] font-bold uppercase tracking-wide text-ink-muted">${t}</th>`;
  const tabelaDias = dias.length > 1 ? `
    <h3 class="mt-5 text-sm font-extrabold">Por dia</h3>
    <div class="mt-2 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
      <table class="w-full text-sm tabular-nums">
        <thead class="bg-cream"><tr>${cab('Dia')}${cab('Pedidos', 1)}${cab('Frete', 1)}${cab('Vendas', 1)}</tr></thead>
        <tbody class="divide-y divide-ink/5">
          ${dias.map(([d, r]) => `
            <tr data-ped-ir-dia="${d}" class="cursor-pointer hover:bg-brand-50" title="Abrir este dia">
              <td class="px-2 py-2 font-semibold">${ddmm(d)} <span class="text-[11px] font-normal text-ink-muted">${DIAS_LONGO[relogioSP(dataSP(d, 720)).dia].slice(0, 3)}</span></td>
              <td class="px-2 py-2 text-right">${r.n}</td>
              <td class="px-2 py-2 text-right text-ink-muted">${money(Math.round(r.f * 100) / 100)}</td>
              <td class="px-2 py-2 text-right font-bold">${money(Math.round(r.v * 100) / 100)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const mostrar = concl.slice(0, LINHAS_TABELA);
  const tabelaPedidos = concl.length ? `
    <h3 class="mt-5 text-sm font-extrabold">Vendas concluídas <span class="font-semibold text-ink-muted">(${concl.length})</span></h3>
    <div class="mt-2 overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
      <table class="w-full text-[13px] tabular-nums">
        <thead class="bg-cream"><tr>${cab('Data')}${cab('Pedido')}${cab('Cliente')}${cab('Pgto')}${cab('Total', 1)}</tr></thead>
        <tbody class="divide-y divide-ink/5">
          ${mostrar.map((p) => `
            <tr>
              <td class="whitespace-nowrap px-2 py-1.5 text-ink-muted">${ddmm(relogioSP(new Date(p.criado_em)).ymd)} ${hhmm(p.criado_em)}</td>
              <td class="whitespace-nowrap px-2 py-1.5 font-bold">#${esc(p.codigo)}</td>
              <td class="max-w-[7.5rem] truncate px-2 py-1.5">${esc(p.cliente_nome)}${p.tipo === 'entrega' ? ' <span title="Entrega">🛵</span>' : ''}</td>
              <td class="whitespace-nowrap px-2 py-1.5 text-ink-muted">${PAGAMENTO_ROTULO[p.pagamento] || esc(p.pagamento)}</td>
              <td class="whitespace-nowrap px-2 py-1.5 text-right font-bold">${money(Number(p.total || 0))}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${concl.length > LINHAS_TABELA ? `<p class="mt-2 text-center text-xs text-ink-muted">Mostrando os ${LINHAS_TABELA} mais recentes. Os totais acima somam todos os ${concl.length}.</p>` : ''}` : '';

  alvo.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <button data-ped-periodo-sair class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-card ring-1 ring-ink/5" aria-label="Voltar para o dia">‹</button>
      <button data-ped-periodo-abrir class="flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white" title="Mudar período">
        <span class="truncate font-extrabold">${rotuloPeriodo(admin.pedIni, admin.pedFim)}</span>
        <span class="text-brand-700">${ICONE_CAL}</span>
      </button>
      <span class="w-9 shrink-0 text-right text-[11px] font-bold text-ink-muted">${nDias}d</span>
    </div>
    <div class="mt-1 text-center text-xs font-bold">
      <button data-ped-periodo-sair class="text-ink-muted underline-offset-2 hover:text-ink hover:underline">✕ Sair do período</button>
    </div>

    ${admin.pedPainelPeriodo ? painelPeriodo() : ''}

    <!-- RESUMO DO PERÍODO (só pedidos concluídos) -->
    <section class="mt-3 grid grid-cols-3 gap-2">
      ${cartaoResumo('Vendas', money(vendas), 'só concluídos', true)}
      ${cartaoResumo('Frete', money(frete), 'arrecadado')}
      ${cartaoResumo('Pedidos', concl.length, `concluído${concl.length === 1 ? '' : 's'}`)}
    </section>

    ${admin.pedErro ? `<p class="mt-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">${esc(admin.pedErro)}</p>`
      : !admin.pedCarregado ? '<div class="grid place-items-center py-16"><div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div></div>'
      : !concl.length ? `<p class="py-14 text-center text-sm text-ink-muted">Nenhum pedido concluído neste período.</p>`
      : `
    <section class="mt-2 grid grid-cols-3 gap-2 text-center">
      ${porPag.map((x) => `
        <div class="rounded-xl bg-white px-2 py-2 ring-1 ring-ink/5">
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink-muted">${PAGAMENTO_ROTULO[x.k]} · ${x.n}</p>
          <p class="text-sm font-extrabold">${money(x.v)}</p>
        </div>`).join('')}
    </section>
    <p class="mt-2 text-xs text-ink-muted">
      Ticket médio <strong class="text-ink">${money(ticket)}</strong>
      ${melhor && dias.length > 1 ? ` · melhor dia <strong class="text-ink">${ddmm(melhor[0])}</strong> (${money(Math.round(melhor[1].v * 100) / 100)})` : ''}
      ${cancel.length ? ` · ${cancel.length} cancelado${cancel.length === 1 ? '' : 's'}` : ''}
      ${abertos.length ? ` · ${abertos.length} ainda em aberto (fora da soma)` : ''}
    </p>
    ${admin.pedLimite ? `<p class="mt-2 rounded-xl bg-brand-50 p-2 text-xs text-brand-800 ring-1 ring-brand-200">Período muito grande: foram lidos só os ${PERIODO_MAX_LINHAS} pedidos mais recentes. Escolha um intervalo menor para o total exato.</p>` : ''}
    ${blocoInteligencia()}
    ${tabelaDias}
    ${tabelaPedidos}`}`;
}
