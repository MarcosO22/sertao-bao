/* =====================================================================
   RENDER — CARTÕES DO CARDÁPIO
   ===================================================================== */
function fotoHTML(p, classes) {
  if (p.foto_url) {
    return `<img src="${esc(p.foto_url)}" alt="${esc(p.nome)}" loading="lazy" class="${classes} object-cover" />`;
  }
  return `<div class="${classes} grid place-items-center bg-gradient-to-br from-brand-100 via-brand-200 to-brand-400">
            <span class="text-4xl drop-shadow-sm">${p.emoji || emojiCat(p.categoria)}</span>
          </div>`;
}

function badgeHTML(d) {
  if (d.tipo === 'esgotado')
    return `<span class="rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Esgotado</span>`;
  if (d.tipo === 'horario')
    return `<span class="inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink-muted">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${esc(d.texto)}</span>`;
  if (d.tipo === 'dia')
    return `<span class="inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink-muted">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${esc(d.texto)}</span>`;
  if (d.tipo === 'hoje')
    return `<span class="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800">★ ${esc(d.texto)}</span>`;
  return '';
}

// Preço base + escolha obrigatória com opções pagas → mostra "a partir de"
function aPartirDe(p) {
  return p.grupos.some((g) => g.min > 0 && g.opcoes.some((o) => o.preco > 0));
}

function temAdicionais(p) {
  return p.grupos.some((g) => g.opcoes.some((o) => o.preco > 0));
}

function renderMenu() {
  const termo = state.busca.trim().toLowerCase();
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  let lista = termo
    ? PRATOS.filter((p) => norm(p.nome + ' ' + p.descricao).includes(norm(termo)))
    : PRATOS.filter((p) => p.categoria === state.tab);
  // Passou do horário da categoria (ex.: café depois das 10h): some do cardápio
  lista = lista.filter((p) => !categoriaEncerrada(p.categoria));
  // Prato de outro dia da semana (ex.: rabada só sexta e sábado): não aparece hoje
  lista = lista.filter((p) => disponibilidade(p).tipo !== 'dia');

  // Ex: "Prato Normal" seg-sex e "Prato Normal" sábado → mostra só o de hoje
  const nomesHoje = new Set(lista.filter((p) => disponibilidade(p).tipo !== 'dia').map((p) => norm(p.nome)));
  lista = lista.filter((p) => disponibilidade(p).tipo !== 'dia' || !nomesHoje.has(norm(p.nome)));

  // Disponíveis primeiro, indisponíveis no fim
  lista = [...lista].sort((a, b) => disponibilidade(b).pode - disponibilidade(a).pode);

  $('#tabHint').textContent = termo
    ? `${lista.length} resultado(s) para “${state.busca}”`
    : CAT_DICA[state.tab] || '';

  $('#emptyState').classList.toggle('hidden', lista.length > 0);
  $('#emptyTexto').textContent = termo ? 'Nenhum prato encontrado' : 'Em breve teremos novidades por aqui!';

  $('#menuList').innerHTML = lista.map((p) => {
    const d = disponibilidade(p);
    const off = !d.pode;
    return `
      <li>
        <button data-prato="${p.id}" ${off ? 'aria-disabled="true"' : ''}
          class="card-prato brilho-topo group flex w-full gap-3.5 rounded-3xl bg-white p-3.5 text-left ring-1 ring-ink/[.06]
                 ${off ? 'cursor-default' : 'hover:shadow-lift hover:ring-brand-300'}">
          <div class="flex min-w-0 flex-1 flex-col ${off ? 'opacity-60' : ''}">
            <h3 class="font-extrabold leading-snug">${esc(p.nome)}</h3>
            <p class="desc-prato line-clamp-2 mt-1 text-ink-muted">${esc(p.descricao)}</p>
            <div class="mt-auto flex flex-wrap items-center gap-2 pt-3">
              <span class="preco-prato text-[15px] font-extrabold ${off ? 'text-ink-muted' : 'text-ink'}">${aPartirDe(p) ? '<span class="text-xs font-semibold text-ink-muted">a partir de </span>' : ''}${money(p.preco)}</span>
              ${badgeHTML(d)}
              ${p.destaque && !off ? '<span class="rounded-md bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-ink">★ Destaque</span>' : ''}
              ${!off && !aPartirDe(p) && temAdicionais(p) ? '<span class="text-[11px] font-semibold text-brand-700">+ adicionais</span>' : ''}
            </div>
          </div>
          <div class="relative shrink-0">
            ${fotoHTML(p, `h-[104px] w-[104px] rounded-2xl ring-1 ring-ink/5 ${off ? 'grayscale' : ''}`)}
            ${!off ? `<span class="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg font-bold text-ink shadow-lift ring-[3px] ring-white transition group-hover:scale-110 group-active:scale-95">+</span>` : ''}
          </div>
        </button>
      </li>`;
  }).join('');
}
