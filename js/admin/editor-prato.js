/* =====================================================================
   EDITOR DE PRATO
   ===================================================================== */
function abrirEditorPrato(id = null) {
  if (!admin.ed) {
    const p = id ? admin.pratos.find((x) => String(x.id) === String(id)) : null;
    const ordemNova = Math.max(0, ...admin.pratos.map((x) => x.ordem || 0)) + 1;
    admin.ed = {
      id: p?.id ?? null,
      nome: p?.nome ?? '',
      descricao: p?.descricao ?? '',
      preco: p ? precoTxt(p.preco) : '',
      categoria: p?.categoria ?? (admin.subCatCategoria || 'almoco'),
      dias: p?.dias_disponiveis?.length ? [...p.dias_disponiveis] : [...TODOS],
      ativo: p?.ativo ?? true,
      destaque: p?.destaque ?? false,
      acompanhaCats: Array.isArray(p?.acompanha_cats) ? [...p.acompanha_cats]
        : (p?.acompanha === false ? [] : [...CATS_COMIDA]),
      ordem: p?.ordem ?? ordemNova,
      foto_url: p?.foto_url ?? null,
      fotoNova: null,          // { blob, url, antes, depois }
      removerFoto: false,
      links: (p?.prato_grupos || [])
        .slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((l) => ({ grupo_id: l.grupo_id, titulo: l.titulo || '', min: l.min_escolhas, max: l.max_escolhas })),
      erros: {},
      salvando: false,
    };
  }
  renderEditorPrato();
}

function regraTexto(min, max) {
  if (min === 0) return `Opcional · até ${max}`;
  if (min === max) return `Obrigatório · escolher ${min}`;
  return `Obrigatório · de ${min} a ${max}`;
}

function renderEditorPrato() {
  const e = admin.ed;
  const foto = e.fotoNova?.url || (!e.removerFoto && e.foto_url) || '';
  const grupoPorId = (id) => admin.grupos.find((g) => String(g.id) === String(id));
  const disponiveis = admin.grupos.filter((g) => !e.links.some((l) => String(l.grupo_id) === String(g.id)));
  const y = $('#edCorpo')?.scrollTop || 0;

  abrirModal(`
    ${cabecalhoModal(e.id ? 'Editar prato' : 'Novo prato')}
    <div id="edCorpo" class="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">

      <!-- FOTO -->
      <div class="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
        ${foto
          ? `<img src="${esc(foto)}" alt="" class="h-48 w-full object-cover" />`
          : `<div class="grid h-40 place-items-center bg-gradient-to-br from-brand-100 via-brand-200 to-brand-400 text-5xl">${emojiCat(e.categoria)}</div>`}
        <div class="flex flex-wrap items-center gap-2 p-3">
          <label class="cursor-pointer rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white">
            ${foto ? 'Trocar foto' : 'Escolher foto'}
            <input type="file" accept="image/*" data-foto class="hidden" />
          </label>
          <label class="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold ring-1 ring-ink/15">
            Tirar foto
            <input type="file" accept="image/*" capture="environment" data-foto class="hidden" />
          </label>
          ${foto ? '<button data-remover-foto class="ml-auto rounded-lg px-3 py-2 text-sm font-bold text-red-600">Remover</button>' : ''}
        </div>
        ${e.fotoNova ? `<p class="border-t border-ink/5 px-3 py-2 text-xs text-emerald-700">✓ Foto otimizada: ${kb(e.fotoNova.antes)} → <strong>${kb(e.fotoNova.depois)}</strong> (envia ao salvar)</p>` : ''}
        <p id="fotoStatus" class="hidden border-t border-ink/5 px-3 py-2 text-xs text-ink-muted"></p>
      </div>

      <!-- DADOS -->
      <div class="mt-4 grid gap-3">
        ${inputEd({ campo: 'nome', label: 'Nome do prato', valor: e.nome, placeholder: 'Ex: Marmita G', erro: e.erros.nome, max: 60 })}
        <label class="block">
          <span class="text-sm font-bold">Descrição <span class="font-normal text-ink-muted">(opcional)</span></span>
          <textarea data-ed="descricao" rows="2" maxlength="200" placeholder="Ex: Arroz, feijão, salada e farofa + 2 carnes"
            class="mt-1.5 w-full resize-none rounded-xl border-0 bg-white px-3 py-3 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500">${esc(e.descricao)}</textarea>
        </label>
        <div class="grid grid-cols-2 gap-3">
          ${inputEd({ campo: 'preco', label: 'Preço', valor: e.preco, placeholder: '0,00', inputmode: 'decimal', prefixo: 'R$', erro: e.erros.preco, max: 10 })}
          ${inputEd({ campo: 'ordem', label: 'Posição', valor: e.ordem, inputmode: 'numeric', dica: 'Menor aparece primeiro', max: 4 })}
        </div>

        <div>
          <span class="text-sm font-bold">Categoria</span>
          <div class="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1 sm:grid-cols-3">
            ${Object.entries(CATEGORIAS).map(([k, r]) => `
              <button data-ed-cat="${k}" class="rounded-lg px-2 py-2.5 text-sm font-bold ${e.categoria === k ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'}">${r}</button>`).join('')}
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold">Dias disponíveis</span>
            <button data-ed-todos class="text-xs font-bold text-brand-700">${e.dias.length === 7 ? 'Limpar' : 'Todos os dias'}</button>
          </div>
          <div class="mt-1.5 grid grid-cols-7 gap-1.5">
            ${DIAS_CURTO.map((d, i) => {
              const on = e.dias.includes(i);
              return `<button data-ed-dia="${i}" aria-pressed="${on}"
                class="rounded-lg py-2.5 text-xs font-bold ring-1 ${on ? 'bg-brand-500 text-ink ring-brand-500' : 'bg-white text-ink-muted ring-ink/10'}">${d}</button>`;
            }).join('')}
          </div>
          ${e.erros.dias ? `<p class="mt-1 text-xs font-semibold text-red-600">${esc(e.erros.dias)}</p>` : ''}
        </div>

        <div class="flex items-center justify-between rounded-2xl bg-white p-3.5 ring-1 ring-ink/10">
          <div>
            <p class="font-bold">Visível no cardápio</p>
            <p class="text-xs text-ink-muted">Desligue para esconder sem apagar</p>
          </div>
          ${interruptor({ tipo: 'ed-ativo', id: 0, ligado: e.ativo, on: 'Visível', off: 'Oculto', grande: true })}
        </div>

        <div class="flex items-center justify-between rounded-2xl bg-white p-3.5 ring-1 ring-ink/10">
          <div>
            <p class="font-bold">★ Destaque na vitrine</p>
            <p class="text-xs text-ink-muted">Aparece em grande no topo do cardápio</p>
          </div>
          ${interruptor({ tipo: 'ed-destaque', id: 0, ligado: e.destaque, on: 'Sim', off: 'Não', grande: true })}
        </div>

        ${e.categoria === 'bebidas' && _temAcompanha ? `
        <div class="rounded-2xl bg-white p-3.5 ring-1 ring-ink/10">
          <p class="font-bold">🥤 Acompanha quais pratos?</p>
          <p class="mt-0.5 text-xs text-ink-muted">Esta bebida aparece dentro do prato, em "Bebida para acompanhar". Ex.: cafezinho no café da manhã sim, no almoço não.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            ${CATS_COMIDA.map((c) => {
              const on = (e.acompanhaCats || []).includes(c);
              return `<button type="button" data-ed-acomp="${c}"
                class="rounded-full px-3 py-2 text-sm font-bold ring-1 transition ${on ? 'bg-brand-500 text-ink ring-brand-500' : 'bg-cream text-ink-muted ring-ink/10'}">
                ${on ? '✓ ' : ''}${CATEGORIAS[c]}</button>`;
            }).join('')}
            <button type="button" data-ed-acomp="todas"
              class="rounded-full px-3 py-2 text-sm font-bold text-brand-700 underline-offset-2 hover:underline">
              ${(e.acompanhaCats || []).length === CATS_COMIDA.length ? 'Nenhum' : 'Todos'}</button>
          </div>
          ${!(e.acompanhaCats || []).length ? '<p class="mt-2 text-xs font-semibold text-ink-muted">Só vai aparecer na aba Bebidas.</p>' : ''}
        </div>` : ''}
      </div>

      <!-- GRUPOS DE OPÇÕES LIGADOS -->
      <h3 class="mb-1 mt-6 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">Opções do prato</h3>
      <p class="mb-3 text-xs text-ink-muted">Ex: "Escolha 2 carnes" (obrigatório: mínimo 2, máximo 2) ou "Adicionais" (opcional: mínimo 0).</p>
      <div class="grid gap-3">
        ${e.links.map((l, i) => {
          const g = grupoPorId(l.grupo_id);
          const erro = e.erros['link' + i];
          return `
          <div class="min-w-0 rounded-2xl bg-white p-3.5 ring-1 ${erro ? 'ring-red-400' : 'ring-ink/10'}">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-bold">${esc(g?.nome || 'Grupo removido')}</p>
                <p class="truncate text-xs text-ink-muted">${esc((g?.opcoes || []).map((o) => o.nome).join(', '))}</p>
              </div>
              <button data-link-mover="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} class="grid h-8 w-8 place-items-center rounded-lg ring-1 ring-ink/10 disabled:opacity-30" aria-label="Subir">↑</button>
              <button data-link-mover="${i}" data-dir="1" ${i === e.links.length - 1 ? 'disabled' : ''} class="grid h-8 w-8 place-items-center rounded-lg ring-1 ring-ink/10 disabled:opacity-30" aria-label="Descer">↓</button>
              <button data-link-remover="${i}" class="grid h-8 w-8 place-items-center rounded-lg text-red-600 ring-1 ring-red-200" aria-label="Desligar grupo">✕</button>
            </div>
            <label class="mt-3 block">
              <span class="text-xs font-bold text-ink-muted">Título que o cliente vê</span>
              <input data-link="${i}" data-link-campo="titulo" value="${esc(l.titulo)}" placeholder="${esc(g?.nome || '')}" maxlength="50"
                class="mt-1 w-full rounded-lg border-0 bg-cream px-3 py-2 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
            </label>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="block">
                <span class="text-xs font-bold text-ink-muted">Mínimo de escolhas</span>
                <input data-link="${i}" data-link-campo="min" value="${l.min}" inputmode="numeric" maxlength="2"
                  class="mt-1 w-full rounded-lg border-0 bg-cream px-3 py-2 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
              </label>
              <label class="block">
                <span class="text-xs font-bold text-ink-muted">Máximo de escolhas</span>
                <input data-link="${i}" data-link-campo="max" value="${l.max}" inputmode="numeric" maxlength="2"
                  class="mt-1 w-full rounded-lg border-0 bg-cream px-3 py-2 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
              </label>
            </div>
            <p class="mt-2 text-xs ${erro ? 'font-semibold text-red-600' : 'text-brand-700'}" data-link-regra="${i}">${esc(erro || regraTexto(l.min, l.max))}</p>
          </div>`;
        }).join('')}

        <div class="flex flex-wrap gap-2">
          ${disponiveis.length ? `
            <select data-link-add class="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-3 text-base font-semibold ring-1 ring-ink/10">
              <option value="">+ Ligar um grupo existente…</option>
              ${disponiveis.map((g) => `<option value="${g.id}">${esc(g.nome)} (${g.opcoes.length})</option>`).join('')}
            </select>` : ''}
          <button data-link-novo class="rounded-xl bg-white px-4 py-3 text-sm font-bold text-brand-700 ring-1 ring-brand-300">+ Criar grupo novo</button>
        </div>
      </div>

      ${e.id ? `
        <div class="mt-8 border-t border-ink/10 pt-5">
          <button data-excluir-prato class="w-full rounded-xl py-3 text-sm font-bold ring-1 ${admin.confirmarExcluir ? 'bg-red-600 text-white ring-red-600' : 'text-red-600 ring-red-200'}">
            ${admin.confirmarExcluir ? 'Toque de novo para apagar definitivamente' : 'Apagar prato'}
          </button>
          <p class="mt-2 text-center text-xs text-ink-muted">Dica: para tirar só por uns dias, use "Oculto" em vez de apagar.</p>
        </div>` : ''}
    </div>

    <footer class="border-t border-ink/5 bg-white px-4 pt-3 safe-bottom">
      <button data-salvar-prato ${e.salvando ? 'disabled' : ''}
        class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 font-bold text-ink disabled:opacity-60">
        ${e.salvando ? '<span class="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink"></span> Salvando…' : e.id ? 'Salvar alterações' : 'Criar prato'}
      </button>
    </footer>`);
  $('#edCorpo').scrollTop = y;
}

/* ---------- Foto: compressão no navegador ---------- */
async function comprimirImagem(file, maxLado = 1200, qualidade = 0.8) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um ficheiro de imagem.');
  let fonte;
  try {
    fonte = await createImageBitmap(file, { imageOrientation: 'from-image' });   // respeita a rotação do telemóvel
  } catch (_) {
    fonte = await new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => falha(new Error('Não foi possível ler esta imagem.'));
      img.src = URL.createObjectURL(file);
    });
  }
  const escala = Math.min(1, maxLado / Math.max(fonte.width, fonte.height));
  const w = Math.round(fonte.width * escala);
  const h = Math.round(fonte.height * escala);
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, 0, 0, w, h);
  const gerar = (tipo) => new Promise((r) => canvas.toBlob(r, tipo, qualidade));
  let blob = await gerar('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await gerar('image/jpeg');   // Safari antigo
  if (!blob) throw new Error('Não foi possível processar a foto.');
  return { blob, antes: file.size, depois: blob.size };
}

async function escolherFoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  const st = $('#fotoStatus');
  st.classList.remove('hidden');
  st.textContent = 'Otimizando foto…';
  try {
    const r = await comprimirImagem(file);
    if (admin.ed.fotoNova?.url) URL.revokeObjectURL(admin.ed.fotoNova.url);
    admin.ed.fotoNova = { ...r, url: URL.createObjectURL(r.blob) };
    admin.ed.removerFoto = false;
    renderEditorPrato();
  } catch (err) {
    st.textContent = err.message;
    st.className = 'border-t border-ink/5 px-3 py-2 text-xs font-semibold text-red-600';
  }
}

function caminhoDaUrl(url) {
  const marca = `/object/public/${BUCKET}/`;
  const i = url ? url.indexOf(marca) : -1;
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length).split('?')[0]) : null;
}

async function enviarFoto(pratoId, foto) {
  const ext = foto.blob.type === 'image/webp' ? 'webp' : 'jpg';
  const caminho = `pratos/${pratoId}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(caminho, foto.blob, {
    contentType: foto.blob.type, cacheControl: '31536000', upsert: false,
  });
  if (error) throw new Error('Falha no envio da foto: ' + error.message);
  return sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

async function apagarFoto(url) {
  const caminho = caminhoDaUrl(url);
  if (caminho) await sb.storage.from(BUCKET).remove([caminho]).catch(() => {});
}

/* ---------- Validação e gravação do prato ---------- */
function validarPrato() {
  const e = admin.ed;
  const erros = {};
  if (e.nome.trim().length < 2) erros.nome = 'Dê um nome ao prato.';
  const preco = parseValor(e.preco);
  if (!String(e.preco).trim() || !Number.isFinite(preco) || preco < 0) erros.preco = 'Preço inválido.';
  if (!e.dias.length) erros.dias = 'Escolha pelo menos um dia.';
  e.links.forEach((l, i) => {
    const g = admin.grupos.find((x) => String(x.id) === String(l.grupo_id));
    const nOp = g ? g.opcoes.filter((o) => o.ativo).length : 0;
    if (!Number.isInteger(l.min) || !Number.isInteger(l.max) || l.min < 0 || l.max < 1) erros['link' + i] = 'Use números inteiros (mínimo 0, máximo 1 ou mais).';
    else if (l.min > l.max) erros['link' + i] = 'O mínimo não pode ser maior que o máximo.';
    else if (l.min > nOp) erros['link' + i] = `O grupo só tem ${nOp} opç${nOp === 1 ? 'ão' : 'ões'} visíveis; o mínimo é maior.`;
  });
  e.erros = erros;
  return { ok: !Object.keys(erros).length, preco };
}

async function salvarPrato() {
  const e = admin.ed;
  const { ok, preco } = validarPrato();
  if (!ok) { renderEditorPrato(); return toast('Confira os campos destacados'); }

  e.salvando = true; renderEditorPrato();
  try {
    const dados = {
      nome: e.nome.trim(),
      descricao: e.descricao.trim() || null,
      preco,
      categoria: e.categoria,
      dias_disponiveis: [...e.dias].sort(),
      ativo: e.ativo,
      destaque: e.destaque,
      ordem: parseInt(e.ordem, 10) || 0,
      ...(_temAcompanha ? {
        acompanha: (e.acompanhaCats || []).length > 0,
        acompanha_cats: e.categoria === 'bebidas' ? (e.acompanhaCats || []) : [...CATS_COMIDA],
      } : {}),
    };

    // 1. Grava o prato
    const res = e.id
      ? await sb.from('pratos').update(dados).eq('id', e.id).select('id').single()
      : await sb.from('pratos').insert(dados).select('id').single();
    if (res.error) throw res.error;
    const id = res.data.id;

    // 2. Foto (enviada depois de ter o id)
    const fotoAntiga = e.foto_url;
    if (e.fotoNova) {
      const url = await enviarFoto(id, e.fotoNova);
      const r = await sb.from('pratos').update({ foto_url: url }).eq('id', id);
      if (r.error) throw r.error;
      if (fotoAntiga) apagarFoto(fotoAntiga);
    } else if (e.removerFoto && fotoAntiga) {
      const r = await sb.from('pratos').update({ foto_url: null }).eq('id', id);
      if (r.error) throw r.error;
      apagarFoto(fotoAntiga);
    }

    // 3. Grupos ligados: substitui a lista inteira
    const del = await sb.from('prato_grupos').delete().eq('prato_id', id);
    if (del.error) throw del.error;
    if (e.links.length) {
      const ins = await sb.from('prato_grupos').insert(e.links.map((l, i) => ({
        prato_id: id, grupo_id: l.grupo_id, titulo: l.titulo.trim() || null,
        min_escolhas: l.min, max_escolhas: l.max, ordem: i + 1,
      })));
      if (ins.error) throw ins.error;
    }

    toast(e.id ? 'Prato atualizado ✓' : 'Prato criado ✓');
    fecharModal();
    await carregarAdmin();
  } catch (err) {
    console.error('[Catálogo]', err);
    e.salvando = false; renderEditorPrato();
    toast(err.message?.startsWith('Falha') ? err.message : 'Não foi possível salvar. Verifique a internet.');
  }
}

async function excluirPrato() {
  if (!admin.confirmarExcluir) { admin.confirmarExcluir = true; return renderEditorPrato(); }
  const e = admin.ed;
  const { error } = await sb.from('pratos').delete().eq('id', e.id);
  if (error) return toast('Não foi possível apagar.');
  if (e.foto_url) apagarFoto(e.foto_url);
  toast(`${e.nome} apagado`);
  fecharModal();
  await carregarAdmin();
}
