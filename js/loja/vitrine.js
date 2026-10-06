/* =====================================================================
   FASE 6 — VITRINE DE DESTAQUES
   ===================================================================== */
function renderVitrine() {
  const lista = PRATOS.filter((p) => p.destaque && disponibilidade(p).pode);
  $('#vitrine').classList.toggle('hidden', !lista.length);
  $('#vitrineLista').innerHTML = lista.map((p) => {
    const d = disponibilidade(p);
    return `
      <button data-prato="${p.id}"
        class="group relative w-60 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-card ring-2 ring-brand-400 transition active:scale-[.98]">
        <div class="relative">
          ${fotoHTML(p, 'h-36 w-full')}
          <span class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink/50 to-transparent"></span>
          <span class="absolute left-2.5 top-2.5 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink shadow">★ Destaque</span>
          ${d.tipo === 'hoje' ? `<span class="absolute right-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">Só hoje</span>` : ''}
        </div>
        <div class="p-3">
          <h3 class="truncate font-extrabold">${esc(p.nome)}</h3>
          <p class="line-clamp-2 mt-0.5 h-9 text-[13px] leading-snug text-ink-muted">${esc(p.descricao)}</p>
          <div class="mt-2.5 flex items-center justify-between">
            <span class="text-lg font-extrabold">${aPartirDe(p) ? '<span class="block text-[11px] font-semibold leading-none text-ink-muted">a partir de</span>' : ''}${money(p.preco)}</span>
            <span class="rounded-full bg-brand-500 px-3.5 py-1.5 text-sm font-bold text-ink transition group-hover:bg-brand-400">Pedir</span>
          </div>
        </div>
      </button>`;
  }).join('');
}
