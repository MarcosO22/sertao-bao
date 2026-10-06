/* =====================================================================
   FASE 5 — GESTÃO DO CARDÁPIO (pratos, grupos de opções e fotos)
   ===================================================================== */
const BUCKET = 'fotos-pratos';

const precoTxt = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
const kb = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

/* ---------- Lista do catálogo ---------- */
function renderCatalogo() {
  const sub = admin.subCat || 'pratos';
  const seg = (k, r) => `<button data-subcat="${k}" class="flex-1 rounded-lg py-2 text-sm font-bold ${sub === k ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'}">${r}</button>`;

  let corpo = '';
  if (sub === 'pratos') {
    corpo = Object.entries(CATEGORIAS).map(([cat, titulo]) => {
      const lista = admin.pratos.filter((p) => p.categoria === cat);
      return `
        <h2 class="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">${titulo}</h2>
        ${lista.length ? `<ul class="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
          ${lista.map((p) => {
            const nG = (p.prato_grupos || []).length;
            const dias = p.dias_disponiveis?.length < 7 ? textoDias(p.dias_disponiveis) : '';
            return `
            <li class="flex items-center gap-1 pr-2 ${p.esgotado ? 'bg-red-50/60' : ''}">
              <button data-editar-prato="${p.id}" class="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left active:bg-cream">
              ${p.foto_url
                ? `<img src="${esc(p.foto_url)}" alt="" loading="lazy" class="h-14 w-14 shrink-0 rounded-xl object-cover ${p.ativo ? '' : 'opacity-40 grayscale'}" />`
                : `<span class="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-300 text-2xl ${p.ativo ? '' : 'opacity-40 grayscale'}">${emojiCat(cat)}</span>`}
              <span class="min-w-0 flex-1">
                <span class="block truncate font-bold ${p.esgotado ? 'text-ink-muted line-through' : p.ativo ? '' : 'text-ink-muted'}">${esc(p.nome)}</span>
                <span class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                  <span class="font-semibold text-ink">${money(Number(p.preco))}</span>
                  ${p.esgotado ? '<span class="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">Esgotado</span>' : ''}
                  ${!p.ativo ? '<span class="rounded bg-ink/10 px-1.5 py-0.5 font-bold">Oculto</span>' : ''}
                  ${p.destaque ? '<span class="rounded bg-brand-500 px-1.5 py-0.5 font-bold text-ink">★ Destaque</span>' : ''}
                  ${dias ? `<span class="rounded bg-brand-100 px-1.5 py-0.5 font-bold text-brand-800">${esc(dias)}</span>` : ''}
                  ${nG ? `<span>${nG} grupo${nG > 1 ? 's' : ''} de opções</span>` : ''}
                  ${!p.foto_url ? '<span class="text-brand-700">sem foto</span>' : ''}
                </span>
              </span>
              <svg class="h-5 w-5 shrink-0 text-ink/30" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              ${interruptor({ tipo: 'prato', id: p.id, ligado: !p.esgotado })}
            </li>`;
          }).join('')}
        </ul>` : '<p class="rounded-2xl bg-white/60 px-4 py-6 text-center text-sm text-ink-muted ring-1 ring-dashed ring-ink/10">Nenhum prato nesta categoria.</p>'}`;
    }).join('');
  } else {
    corpo = `
      <p class="mt-4 text-[13px] leading-snug text-ink-muted">Um grupo é uma lista de opções (ex: "Carnes do dia"). Depois, dentro de cada prato, você liga o grupo e define quantas escolhas o cliente pode fazer.</p>
      ${admin.grupos.length ? `<ul class="mt-3 divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
        ${admin.grupos.map((g) => `
          <li><button data-editar-grupo="${g.id}" class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-cream">
            <span class="min-w-0 flex-1">
              <span class="block font-bold">${esc(g.nome)}</span>
              <span class="block truncate text-xs text-ink-muted">${g.opcoes.length} opç${g.opcoes.length === 1 ? 'ão' : 'ões'}: ${esc(g.opcoes.map((o) => o.nome).join(', ') || '—')}</span>
              <span class="block truncate text-xs ${g.usadoEm.length ? 'text-brand-700' : 'text-ink-muted'}">${g.usadoEm.length ? 'Usado em: ' + esc(g.usadoEm.join(', ')) : 'Ainda não ligado a nenhum prato'}</span>
            </span>
            <svg class="h-5 w-5 shrink-0 text-ink/30" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
          </button></li>`).join('')}
      </ul>` : '<p class="mt-4 text-center text-sm text-ink-muted">Nenhum grupo criado ainda.</p>'}`;
  }

  $('#adminConteudo').innerHTML = `
    <div class="flex gap-1 rounded-xl bg-ink/5 p-1">${seg('pratos', `Pratos (${admin.pratos.length})`)}${seg('grupos', `Grupos de opções (${admin.grupos.length})`)}</div>
    ${corpo}
    <button data-novo="${sub === 'pratos' ? 'prato' : 'grupo'}"
      class="fixed bottom-5 right-5 z-20 flex h-14 items-center gap-2 rounded-full bg-brand-500 pl-5 pr-6 font-extrabold text-ink shadow-xl shadow-brand-700/30 active:scale-95">
      <span class="text-2xl leading-none">+</span> ${sub === 'pratos' ? 'Novo prato' : 'Novo grupo'}
    </button>`;
}

/* ---------- Modal genérico do painel ---------- */
function abrirModal(html) {
  const m = $('#adminModal');
  m.innerHTML = `
    <div class="absolute inset-0 bg-ink/60" data-modal-fechar></div>
    <section role="dialog" aria-modal="true"
      class="absolute inset-x-0 bottom-0 top-0 flex flex-col overflow-hidden bg-cream sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
      ${html}
    </section>`;
  m.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  $('#adminModal').classList.add('hidden');
  $('#adminModal').innerHTML = '';
  document.body.style.overflow = '';
  if (admin.ed?.fotoNova?.url) URL.revokeObjectURL(admin.ed.fotoNova.url);
  admin.ed = null;
  admin.edGrupo = null;
  admin.confirmarExcluir = false;
}

function cabecalhoModal(titulo) {
  return `
    <header class="flex items-center gap-2 border-b border-ink/5 bg-white px-2 py-2">
      <button data-modal-fechar class="grid h-10 w-10 place-items-center rounded-full hover:bg-cream" aria-label="Fechar">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <h2 class="flex-1 truncate text-base font-extrabold">${titulo}</h2>
    </header>`;
}

function inputEd({ campo, label, valor, placeholder = '', dica = '', erro = '', inputmode = '', max = 120, prefixo = '' }) {
  return `
    <label class="block">
      <span class="text-sm font-bold">${label}</span>
      <span class="relative mt-1.5 block">
        ${prefixo ? `<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">${prefixo}</span>` : ''}
        <input data-ed="${campo}" value="${esc(valor ?? '')}" placeholder="${esc(placeholder)}" maxlength="${max}" ${inputmode ? `inputmode="${inputmode}"` : ''}
          class="w-full rounded-xl border-0 bg-white py-3 ${prefixo ? 'pl-10' : 'pl-3'} pr-3 text-base outline-none ring-1 focus:ring-2 ${erro ? 'ring-red-500' : 'ring-ink/10 focus:ring-brand-500'}" />
      </span>
      ${erro ? `<span class="mt-1 block text-xs font-semibold text-red-600">${esc(erro)}</span>` : dica ? `<span class="mt-1 block text-xs text-ink-muted">${dica}</span>` : ''}
    </label>`;
}
