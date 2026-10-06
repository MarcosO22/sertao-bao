/* ---------- Fase 14 — Link de GPS para o motoboy (Google Maps, grátis) ---------- */
// Outras cidades (RAs) que podem aparecer no bairro: nelas NÃO colocamos "Ceilândia"
const OUTRAS_RAS = /\b(taguatinga|samambaia|sol nascente|por do sol|brazlandia|aguas claras|vicente pires|recanto das emas|riacho fundo|guara|estrutural|scia|gama|santa maria|sobradinho|planaltina|plano piloto|asa (sul|norte)|nucleo bandeirante|candangolandia|sudoeste|cruzeiro|lago (sul|norte)|paranoa|itapoa|sao sebastiao|jardim botanico|arniqueira|varjao|fercal|valparaiso|aguas lindas|santo antonio do descoberto|novo gama)\b/;
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Deixa o endereço do jeito que o Google entende melhor: "qnm5 cj i cs 27" → "QNM 5, Conjunto I, Casa 27"
function enderecoParaGPS(s) {
  return String(s || '').trim().replace(/\s+/g, ' ')
    .replace(/\b(E?QN[A-Z]|QR|QS|QE|QI|QL|CN[A-Z])\s*\.?\s*(\d)/gi, (m, q, n) => `${q.toUpperCase()} ${n}`) // QNM5 → QNM 5
    .replace(/\b(qd|q)\.?\s*(?=\d)/gi, 'Quadra ')
    .replace(/\b(cj|conj)\.?(?=\s|\d|$)/gi, 'Conjunto')
    .replace(/\b(cs)\.?(?=\s|\d|$)/gi, 'Casa')
    .replace(/\b(lt)\.?(?=\s|\d|$)/gi, 'Lote')
    .replace(/\b(ch|chac)\.?(?=\s|\d|$)/gi, 'Chácara')
    .replace(/\bConjunto\s+([a-z])\b/g, (m, l) => `Conjunto ${l.toUpperCase()}`)
    .replace(/[,\s]+$/, '');
}

// "QNM 5, Conjunto I, Casa 27, Ceilândia Sul, Ceilândia, Brasília - DF, Brasil"
function enderecoCompleto(p) {
  const endereco = enderecoParaGPS(p.endereco);
  const bairro = String(p.bairro || '').trim().replace(/\s+/g, ' ').replace(/[,\s]+$/, '');
  const b = semAcento(bairro);
  // Só não acrescenta "Ceilândia" se o bairro já é outra cidade do DF (ex.: Taguatinga)
  const cidade = OUTRAS_RAS.test(b) ? '' : 'Ceilândia';
  const busca = [endereco, bairro, cidade, 'Brasília - DF', 'Brasil'].filter(Boolean).join(', ');
  return busca;
}

// Abre o app de mapas já com a ROTA até o cliente
function linkGPS(p) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoCompleto(p))}&travelmode=driving`;
}

function cartaoPedido(p) {
  const st = STATUS[p.status] || STATUS.pendente;
  const entrega = p.tipo === 'entrega';
  const semFrete = entrega && p.taxa_entrega == null;
  const editavel = p.status !== 'cancelado' && p.status !== 'concluido';
  const confirmandoCancel = admin.confirmarCancel === p.id;

  const itens = (Array.isArray(p.itens) ? p.itens : []).map((i) => `
    <li class="py-1.5">
      <div class="flex justify-between gap-2"><span class="font-semibold">${esc(i.qtd)}x ${esc(i.nome)}</span><span class="shrink-0 text-ink-muted">${money(Number(i.total) || 0)}</span></div>
      ${(i.opcoes || []).map((o) => `<p class="text-xs text-ink-muted">${esc(o.grupo)}: ${esc(o.texto)}</p>`).join('')}
      ${i.obs ? `<p class="text-xs italic text-brand-800">Obs: ${esc(i.obs)}</p>` : ''}
    </li>`).join('');

  const acoes = [];
  // Fluxo: Pendente → Em preparo → Saiu para entrega / Pronto para retirada → Concluído
  const btn = (status, rotulo, cor, desativado = false, rotuloDesat = '') => `
    <button data-ped-status="${status}" data-id="${p.id}" ${desativado ? 'disabled' : ''}
      class="h-10 flex-1 rounded-xl text-sm font-bold text-white ${cor} disabled:bg-ink/10 disabled:text-ink/40">${desativado ? rotuloDesat : rotulo}</button>`;
  if (p.status === 'pendente') acoes.push(btn('preparo', '👩🏽‍🍳 Aceitar e preparar', 'bg-sky-600'));
  if (p.status === 'preparo' || p.status === 'confirmado') {
    acoes.push(entrega
      ? btn('a_caminho', '🛵 Saiu para entrega', 'bg-violet-600', semFrete, 'Informe o frete')
      : btn('pronto', '🛍️ Pronto p/ retirada', 'bg-violet-600'));
  }
  if (p.status === 'a_caminho' || p.status === 'pronto') {
    acoes.push(btn('concluido', entrega ? '✓ Entregue' : '✓ Retirado', 'bg-emerald-600', semFrete, 'Informe o frete'));
  }
  if (editavel) {
    acoes.push(`<button data-ped-status="cancelado" data-id="${p.id}"
      class="h-10 rounded-xl px-3 text-sm font-bold ring-1 ${confirmandoCancel ? 'bg-red-600 text-white ring-red-600' : 'text-red-600 ring-red-200'}">${confirmandoCancel ? 'Confirmar cancelamento' : 'Cancelar'}</button>`);
  } else {
    acoes.push(`<button data-ped-status="${p.status === 'cancelado' ? 'pendente' : (entrega ? 'a_caminho' : 'pronto')}" data-id="${p.id}" class="h-9 rounded-xl px-3 text-xs font-bold text-ink-muted ring-1 ring-ink/15">Reabrir</button>`);
  }

  return `
    <article class="min-w-0 rounded-2xl bg-white p-4 shadow-card ring-1 ${st.borda} ${p.status === 'cancelado' ? 'opacity-60' : ''}">
      <header class="flex flex-wrap items-center gap-2">
        <p class="text-lg font-extrabold">#${esc(p.codigo)}</p>
        <span class="text-xs text-ink-muted">${hhmm(p.criado_em)}</span>
        <button data-imprimir="${p.id}" title="Imprimir comanda (${admin.papel} mm)"
          class="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-ink-muted ring-1 ring-ink/15 hover:bg-ink/5 hover:text-ink">🖨️ Imprimir</button>
        <span class="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ring-1 ${st.cor}">${st.rotulo}</span>
      </header>
      <div class="mt-1 flex flex-wrap items-center gap-2">
        <p class="font-bold">${esc(p.cliente_nome)}</p>
        <span class="rounded-md px-2 py-0.5 text-[11px] font-bold ${entrega ? 'bg-brand-100 text-brand-800' : 'bg-ink/5 text-ink-muted'}">${entrega ? '🛵 Entrega' : '🏪 Retirada'}</span>
      </div>
      ${entrega ? `
      <div class="mt-1 flex items-start gap-2">
        <p class="min-w-0 flex-1 text-[13px] leading-snug text-ink-muted">${esc(p.endereco || '')}${p.bairro ? ` · <strong class="text-ink">${esc(p.bairro)}</strong>` : ''}${p.referencia ? `<br>Ref.: ${esc(p.referencia)}` : ''}</p>
        ${p.endereco || p.bairro ? `<a href="${esc(linkGPS(p))}" target="_blank" rel="noopener"
           class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
           title="Abrir rota no Google Maps">📍 Abrir no GPS</a>` : ''}
      </div>` : ''}

      <ul class="mt-2 divide-y divide-ink/5 border-y border-ink/5 text-sm">${itens}</ul>

      <p class="mt-2 text-[13px]"><span class="text-ink-muted">Pagamento:</span> <strong>${PAGAMENTO_ROTULO[p.pagamento] || esc(p.pagamento)}</strong>${p.pagamento_detalhe ? ` · ${esc(p.pagamento_detalhe)}` : ''}</p>

      <dl class="mt-2 grid gap-1 text-sm">
        <div class="flex justify-between"><dt class="text-ink-muted">Subtotal</dt><dd>${money(Number(p.subtotal))}</dd></div>
        ${entrega ? `
          <div class="flex items-center justify-between gap-2">
            <dt class="text-ink-muted">Frete</dt>
            <dd class="flex items-center gap-1.5">
              ${editavel ? `
                <span class="relative">
                  <span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">R$</span>
                  <input data-frete="${p.id}" value="${p.taxa_entrega == null ? '' : precoFrete(p.taxa_entrega)}" placeholder="0,00" inputmode="decimal" maxlength="7"
                    class="w-24 rounded-lg border-0 bg-cream py-1.5 pl-7 pr-2 text-right text-base font-semibold outline-none ring-1 ${semFrete ? 'ring-amber-400' : 'ring-ink/10'} focus:ring-2 focus:ring-brand-500" />
                </span>
                <button data-salvar-frete="${p.id}" class="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-white">Salvar</button>`
              : `<span>${p.taxa_entrega == null ? '—' : money(Number(p.taxa_entrega))}</span>`}
            </dd>
          </div>` : ''}
        <div class="flex justify-between border-t border-dashed border-ink/15 pt-1.5 text-base">
          <dt class="font-extrabold">Total</dt>
          <dd class="font-extrabold">${money(Number(p.total))}${semFrete ? ' <span class="text-xs font-semibold text-amber-700">+ frete</span>' : ''}</dd>
        </div>
      </dl>

      <div class="mt-3 flex gap-2">${acoes.join('')}</div>
    </article>`;
}
const precoFrete = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');

async function mudarStatusPedido(id, status) {
  const p = admin.pedidos.find((x) => String(x.id) === String(id));
  if (!p) return;
  if (status === 'cancelado' && admin.confirmarCancel !== p.id) {
    admin.confirmarCancel = p.id;
    renderPedidos();
    setTimeout(() => { if (admin.confirmarCancel === p.id) { admin.confirmarCancel = null; admin.aba === 'pedidos' && renderPedidos(); } }, 4000);
    return;
  }
  admin.confirmarCancel = null;
  if (p.tipo === 'entrega' && p.taxa_entrega == null && ['a_caminho', 'concluido'].includes(status)) {
    return toast('Informe o frete antes de mandar para entrega');
  }
  const antes = p.status;
  p.status = status;
  renderPedidos(); atualizarBadgePedidos();
  const { data, error } = await sb.from('pedidos').update({ status }).eq('id', p.id).select('id');
  if (error || !data?.length) {
    p.status = antes; renderPedidos(); atualizarBadgePedidos();
    if (error) console.error('[Pedidos] status', error);
    return toast(error?.code === '23514' || /status_check|check constraint/i.test(error?.message || '')
      ? 'Falta rodar o SQL da Fase 9 (fase9_rastreio.sql) no Supabase.'
      : 'Não foi possível salvar. Verifique a internet.');
  }
  toast({
    preparo: `#${p.codigo} em preparo — o cliente já vê no site`,
    a_caminho: `🛵 #${p.codigo} saiu para entrega`,
    pronto: `#${p.codigo} pronto para retirada`,
    concluido: `#${p.codigo} concluído ✓`,
    cancelado: `#${p.codigo} cancelado`,
    pendente: `#${p.codigo} reaberto`,
  }[status] || 'Status atualizado');
}

async function salvarFrete(id) {
  const p = admin.pedidos.find((x) => String(x.id) === String(id));
  const input = document.querySelector(`[data-frete="${id}"]`);
  if (!p || !input) return;
  const txt = input.value.trim();
  const valor = txt === '' ? null : parseValor(txt);
  if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 500)) {
    input.focus();
    return toast('Valor de frete inválido');
  }
  const { data, error } = await sb.from('pedidos').update({ taxa_entrega: valor }).eq('id', p.id).select('taxa_entrega, total').maybeSingle();
  if (error || !data) return toast('Não foi possível salvar o frete.');
  Object.assign(p, data);
  renderPedidos();
  toast(valor === null ? 'Frete apagado' : `Frete de #${p.codigo}: ${money(valor)} · total ${money(Number(data.total))}`);
}
