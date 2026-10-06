/* =====================================================================
   BOTTOM-SHEET — DETALHE DO PRATO E ADICIONAIS
   ===================================================================== */
const totalGrupo = (gid) => Object.values(state.sheet.sel[gid] || {}).reduce((a, b) => a + b, 0);
const qtdOpcao = (gid, oid) => (state.sheet.sel[gid] || {})[oid] || 0;

function precoUnitario() {
  const { prato, sel } = state.sheet;
  let extra = 0;
  prato.grupos.forEach((g) => g.opcoes.forEach((o) => { extra += (sel[g.id]?.[o.id] || 0) * o.preco; }));
  return prato.preco + extra;
}

function gruposValidos() {
  return state.sheet.prato.grupos.every((g) => totalGrupo(g.id) >= g.min);
}

function abrirPrato(id) {
  const prato = PRATOS.find((p) => p.id === id);
  if (!prato) return;
  const d = disponibilidade(prato);
  if (!d.pode) { toast(d.tipo === 'esgotado' ? 'Este prato esgotou por hoje 😕' : `${prato.nome}: ${d.texto.toLowerCase()}`); return; }

  state.sheet = { prato, sel: {}, qtd: 1, obs: '' };
  renderSheet();
  const s = $('#sheet');
  s.dataset.open = 'true';
  s.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('#sheetBody').scrollTop = 0;
}

function fecharSheet() {
  const s = $('#sheet');
  s.dataset.open = 'false';
  s.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function grupoHTML(g) {
  const total = totalGrupo(g.id);
  const obrig = g.min > 0;
  const completo = total >= g.min;
  const unico = g.max === 1;

  let regra;
  if (unico) regra = 'Escolha 1 opção';
  else if (g.min === g.max) regra = `Escolha ${g.min} opções`;
  else if (g.min > 0) regra = `Escolha de ${g.min} a ${g.max}`;
  else regra = `Escolha até ${g.max}`;

  const chip = obrig
    ? (completo
        ? '<span class="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">✓</span>'
        : '<span class="rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold uppercase text-white">Obrigatório</span>')
    : '<span class="text-xs font-semibold text-ink-muted">Opcional</span>';

  const opcoes = g.opcoes.map((o) => {
    const q = qtdOpcao(g.id, o.id);
    const cheio = total >= g.max;
    // Opção sem custo: em grupos opcionais mostra "Grátis" (incentiva a escolha); em escolhas obrigatórias não mostra preço
    const precoTxt = o.preco > 0
      ? `<span class="text-sm font-semibold text-brand-700">+ ${money(o.preco)}</span>`
      : g.min === 0 ? '<span class="text-xs font-medium text-emerald-700">Grátis</span>' : '';

    if (o.esgotado) {
      return `<li class="flex items-center justify-between gap-3 px-4 py-3.5 opacity-50">
                <span class="font-medium line-through">${esc(o.nome)}</span>
                <span class="text-[11px] font-bold uppercase text-ink-muted">Esgotado</span>
              </li>`;
    }

    let controle;
    if (unico) {
      controle = `<span class="grid h-6 w-6 place-items-center rounded-full border-2 ${q ? 'border-brand-600' : 'border-ink/25'}">
                    ${q ? '<span class="h-3 w-3 rounded-full bg-brand-600"></span>' : ''}</span>`;
    } else if (o.max === 1) {
      const bloq = !q && cheio;
      controle = `<span class="grid h-6 w-6 place-items-center rounded-md border-2 ${q ? 'border-brand-600 bg-brand-600 text-white' : bloq ? 'border-ink/10' : 'border-ink/25'}">
                    ${q ? '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>' : ''}</span>`;
    } else {
      const podeMais = q < o.max && !cheio;
      controle = `<div class="flex items-center gap-1" data-stepper>
          ${q ? `<button data-op="dec" data-g="${g.id}" data-o="${o.id}" class="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-brand-700 ring-1 ring-ink/10" aria-label="Remover ${esc(o.nome)}">−</button>
                 <span class="w-5 text-center font-bold">${q}</span>` : ''}
          <button data-op="inc" data-g="${g.id}" data-o="${o.id}" ${podeMais ? '' : 'disabled'}
                  class="grid h-8 w-8 place-items-center rounded-full text-lg font-bold ${podeMais ? 'bg-brand-500 text-ink' : 'bg-ink/5 text-ink/25'}" aria-label="Adicionar ${esc(o.nome)}">+</button>
        </div>`;
    }

    const clicavel = unico || o.max === 1;
    // Miniatura: foto da opção (ex: arroz) · bebida sem foto → 🥤 · resto sem imagem
    const thumb = o.foto_url
      ? `<img src="${esc(o.foto_url)}" alt="" loading="lazy" class="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-ink/5" onerror="this.remove()" />`
      : o.bebida ? '<span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-2xl ring-1 ring-sky-100">🥤</span>' : '';
    return `<li>
        <${clicavel ? `button data-op="toggle" data-g="${g.id}" data-o="${o.id}"` : 'div'}
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${clicavel ? 'active:bg-cream' : ''}">
          <span class="flex min-w-0 items-center gap-3">
            ${thumb}
            <span class="flex flex-col">
              <span class="font-medium">${esc(o.nome)}</span>
              ${precoTxt}
            </span>
          </span>
          ${controle}
        </${clicavel ? 'button' : 'div'}>
      </li>`;
  }).join('');

  return `
    <div class="border-t border-ink/5">
      <div class="sticky top-0 z-[1] flex items-center justify-between bg-cream-dark/95 py-3 pl-4 pr-14 backdrop-blur">
        <div>
          <h4 class="font-bold">${esc(g.nome)}</h4>
          <p class="text-xs text-ink-muted">${regra}${!unico && g.max > 1 ? ` · ${total}/${g.max}` : ''}</p>
        </div>
        ${chip}
      </div>
      <ul class="divide-y divide-ink/5">${opcoes}</ul>
    </div>`;
}

function renderSheet() {
  const { prato, qtd, obs } = state.sheet;
  const d = disponibilidade(prato);

  $('#sheetBody').innerHTML = `
    ${fotoHTML(prato, 'h-48 w-full sm:h-56')}
    <div class="px-4 pb-4 pt-4">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="sheetTitle" class="text-xl font-extrabold">${esc(prato.nome)}</h2>
        ${badgeHTML(d)}
      </div>
      <p class="mt-1.5 text-[15px] leading-relaxed text-ink-muted">${esc(prato.descricao)}</p>
      <p class="mt-3 text-lg font-extrabold">${money(prato.preco)}</p>
    </div>
    ${prato.grupos.map(grupoHTML).join('')}
    <div class="border-t border-ink/5 px-4 py-4">
      <label for="obs" class="flex items-center justify-between text-sm font-bold">
        Alguma observação?
        <span id="obsCount" class="text-xs font-normal text-ink-muted">${obs.length}/140</span>
      </label>
      <textarea id="obs" maxlength="140" rows="2" placeholder="Ex: sem cebola, feijão à parte…"
        class="mt-2 w-full resize-none rounded-xl border-0 bg-cream px-3 py-2.5 text-[15px] outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500">${esc(obs)}</textarea>
    </div>`;

  renderSheetFooter();
}

function renderSheetFooter() {
  const { qtd } = state.sheet;
  const ok = gruposValidos();
  $('#qtyValue').textContent = qtd;
  $('#qtyMinus').disabled = qtd <= 1;
  $('#addBtn').disabled = !ok || !lojaAberta();
  $('#addLabel').textContent = !lojaAberta() ? 'Loja fechada' : ok ? 'Adicionar' : 'Escolha acima';
  $('#addPrice').textContent = money(precoUnitario() * qtd);
}

function alterarOpcao(op, gid, oid) {
  const g = state.sheet.prato.grupos.find((x) => x.id === gid);
  const o = g.opcoes.find((x) => x.id === oid);
  const sel = (state.sheet.sel[gid] ||= {});
  const q = sel[oid] || 0;
  const total = totalGrupo(gid);

  if (op === 'toggle') {
    if (g.max === 1) {                   // rádio: substitui a escolha
      state.sheet.sel[gid] = q ? {} : { [oid]: 1 };
    } else if (q) {
      delete sel[oid];
    } else if (total < g.max) {
      sel[oid] = 1;
    } else {
      toast(`Máximo de ${g.max} opções em “${g.nome}”`);
      return;
    }
  } else if (op === 'inc') {
    if (q >= o.max || total >= g.max) return;
    sel[oid] = q + 1;
  } else if (op === 'dec') {
    if (q <= 1) delete sel[oid]; else sel[oid] = q - 1;
  }

  // Re-render preservando posição do scroll e texto da observação
  const body = $('#sheetBody');
  const y = body.scrollTop;
  state.sheet.obs = $('#obs')?.value || '';
  renderSheet();
  body.scrollTop = y;
}

/* QA: limites da sacola (o banco aceita no máx. 60 linhas e R$ 10.000 por pedido) */
const MAX_POR_ITEM = 20;     // unidades do mesmo item
const MAX_LINHAS = 30;       // itens diferentes na sacola
const MAX_UNIDADES = 99;     // total de unidades no pedido
const totalUnidades = () => state.cart.reduce((a, i) => a + i.qtd, 0);
const assinaturaItem = (pratoId, opcoes, obs) =>
  JSON.stringify([pratoId, opcoes.map((o) => [o.grupoId, o.id, o.qtd]).sort(), (obs || '').toLowerCase()]);

function adicionarAoCarrinho() {
  const { prato, sel, qtd } = state.sheet;
  const obs = ($('#obs')?.value || '').trim().slice(0, 140);

  const opcoes = [];
  prato.grupos.forEach((g) => g.opcoes.forEach((o) => {
    const q = sel[g.id]?.[o.id];
    if (q) opcoes.push({ grupoId: g.id, id: o.id, grupo: g.nome, nome: o.nome, qtd: q, preco: o.preco });
  }));

  const unit = precoUnitario();
  if (totalUnidades() + qtd > MAX_UNIDADES)
    return toast(`Limite de ${MAX_UNIDADES} unidades por pedido. Para encomendas grandes, fale com a gente no WhatsApp 😉`);
  // Mesmo prato, mesmas opções e mesma observação → soma na linha que já existe
  const chave = assinaturaItem(prato.id, opcoes, obs);
  const igual = state.cart.find((i) => assinaturaItem(i.pratoId, i.opcoes, i.obs) === chave);
  if (igual) {
    if (igual.qtd + qtd > MAX_POR_ITEM) return toast(`Máximo de ${MAX_POR_ITEM} unidades do mesmo item`);
    igual.qtd += qtd;
    igual.total = igual.unit * igual.qtd;
  } else {
    if (state.cart.length >= MAX_LINHAS) return toast(`Sua sacola já tem ${MAX_LINHAS} itens diferentes. Finalize este pedido primeiro.`);
    state.cart.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                      pratoId: prato.id, nome: prato.nome, qtd, opcoes, obs, unit, total: unit * qtd });
  }
  salvarCarrinho();

  fecharSheet();
  renderCartBar(true);
  toast(`${qtd}× ${prato.nome} adicionado à sacola`);
}
