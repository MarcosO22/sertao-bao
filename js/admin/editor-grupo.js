/* =====================================================================
   EDITOR DE GRUPO DE OPÇÕES
   ===================================================================== */
let _chaveOp = 0;
function abrirEditorGrupo(id = null, voltarParaPrato = false) {
  const g = id ? admin.grupos.find((x) => String(x.id) === String(id)) : null;
  admin.edGrupo = {
    id: g?.id ?? null,
    nome: g?.nome ?? '',
    opcoes: (g?.opcoes || []).map((o) => ({
      k: ++_chaveOp, id: o.id, nome: o.nome, preco: precoTxt(o.preco), max: String(o.max_quantidade ?? 1), ativo: o.ativo, foto: o.foto_url || '',
      dias: o.dias_disponiveis?.length ? [...o.dias_disponiveis] : [...TODOS],
    })),
    removidas: [],
    usadoEm: g?.usadoEm || [],
    voltarParaPrato,
    erros: {},
    salvando: false,
    confirmarExcluir: false,
  };
  if (!g) admin.edGrupo.opcoes.push({ k: ++_chaveOp, id: null, nome: '', preco: '0,00', max: '1', ativo: true, dias: [...TODOS] });
  renderEditorGrupo();
}

function renderEditorGrupo() {
  const g = admin.edGrupo;
  const y = $('#edCorpo')?.scrollTop || 0;
  abrirModal(`
    ${cabecalhoModal(g.id ? 'Editar grupo' : 'Novo grupo de opções')}
    <div id="edCorpo" class="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      ${inputEd({ campo: 'g_nome', label: 'Nome do grupo', valor: g.nome, placeholder: 'Ex: Carnes do dia', erro: g.erros.nome, max: 50,
        dica: 'Nome interno. Em cada prato você pode dar outro título (ex: "Escolha 2 carnes").' })}
      ${g.usadoEm.length ? `<p class="mt-2 text-xs text-brand-700">Usado em: ${esc(g.usadoEm.join(', '))} — mudanças valem para todos.</p>` : ''}

      <h3 class="mb-2 mt-6 text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">Opções</h3>
      <div class="grid gap-2">
        ${g.opcoes.map((o, i) => {
          const erro = g.erros['op' + o.k];
          return `
          <div class="min-w-0 rounded-2xl bg-white p-3 ring-1 ${erro ? 'ring-red-400' : 'ring-ink/10'} ${o.ativo ? '' : 'opacity-60'}">
            <div class="flex items-center gap-2">
              <input data-op="${o.k}" data-op-campo="nome" value="${esc(o.nome)}" placeholder="Nome da opção (ex: Frango assado)" maxlength="50"
                class="min-w-0 flex-1 rounded-lg border-0 bg-cream px-3 py-2 text-base font-semibold outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
              <button data-op-mover="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} class="grid h-9 w-8 place-items-center rounded-lg ring-1 ring-ink/10 disabled:opacity-30" aria-label="Subir">↑</button>
              <button data-op-mover="${i}" data-dir="1" ${i === g.opcoes.length - 1 ? 'disabled' : ''} class="grid h-9 w-8 place-items-center rounded-lg ring-1 ring-ink/10 disabled:opacity-30" aria-label="Descer">↓</button>
              <button data-op-remover="${o.k}" class="grid h-9 w-8 place-items-center rounded-lg text-red-600 ring-1 ring-red-200" aria-label="Remover opção">✕</button>
            </div>
            <div class="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
              <label class="block">
                <span class="text-[11px] font-bold text-ink-muted">Preço extra</span>
                <span class="relative mt-0.5 block">
                  <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">R$</span>
                  <input data-op="${o.k}" data-op-campo="preco" value="${esc(o.preco)}" inputmode="decimal" maxlength="8"
                    class="w-full rounded-lg border-0 bg-cream py-2 pl-9 pr-2 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
                </span>
              </label>
              <label class="block">
                <span class="text-[11px] font-bold text-ink-muted">Máx. por pedido</span>
                <input data-op="${o.k}" data-op-campo="max" value="${esc(o.max)}" inputmode="numeric" maxlength="2"
                  class="mt-0.5 w-full rounded-lg border-0 bg-cream px-3 py-2 text-base outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
              </label>
              <button data-op-ativo="${o.k}" class="h-10 rounded-lg px-2.5 text-xs font-bold ring-1 ${o.ativo ? 'text-emerald-700 ring-emerald-200' : 'text-ink-muted ring-ink/15'}">${o.ativo ? 'Visível' : 'Oculta'}</button>
            </div>
            ${admin.fotoOpcao !== false ? `
            <label class="mt-2 flex items-center gap-2">
              ${o.foto ? `<img src="${esc(o.foto)}" alt="" class="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-ink/10" onerror="this.style.opacity=.2" />`
                : '<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream text-xs text-ink-muted ring-1 ring-ink/10">📷</span>'}
              <input data-op="${o.k}" data-op-campo="foto" value="${esc(o.foto)}" placeholder="Link da foto (opcional) — https://…" inputmode="url"
                class="min-w-0 flex-1 rounded-lg border-0 bg-cream px-3 py-2 text-sm outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-500" />
            </label>` : ''}
            ${_temDiasOpcao ? `
            <div class="mt-2 rounded-xl bg-cream p-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-ink-muted">Dias em que esta opção aparece</span>
                <button data-op-dias-todos="${o.k}" class="text-[11px] font-bold text-brand-700">${(o.dias || []).length === 7 ? 'Limpar' : 'Todos'}</button>
              </div>
              <div class="mt-1 grid grid-cols-7 gap-1">
                ${DIAS_CURTO.map((d, i) => {
                  const on = (o.dias || []).includes(i);
                  return `<button data-op-dia="${o.k}" data-dia="${i}" aria-pressed="${on}"
                    class="rounded-md py-1.5 text-[11px] font-bold ring-1 ${on ? 'bg-brand-500 text-ink ring-brand-500' : 'bg-white text-ink-muted ring-ink/10'}">${d}</button>`;
                }).join('')}
              </div>
              ${!(o.dias || []).length ? '<p class="mt-1 text-[11px] font-semibold text-red-600">Sem dia marcado: esta opção não aparece nunca.</p>' : ''}
            </div>` : ''}
            ${erro ? `<p class="mt-1.5 text-xs font-semibold text-red-600">${esc(erro)}</p>` : ''}
          </div>`;
        }).join('')}
      </div>
      <button data-op-add class="mt-3 w-full rounded-xl border-2 border-dashed border-brand-300 py-3 text-sm font-bold text-brand-700">+ Adicionar opção</button>
      <p class="mt-2 text-xs text-ink-muted">Preço 0,00 = sem custo (ex: escolha da carne). "Máx. por pedido" 2 permite, por exemplo, 2 ovos.</p>
      ${g.erros.opcoes ? `<p class="mt-2 text-xs font-semibold text-red-600">${esc(g.erros.opcoes)}</p>` : ''}

      ${g.id ? `
        <div class="mt-8 border-t border-ink/10 pt-5">
          <button data-excluir-grupo class="w-full rounded-xl py-3 text-sm font-bold ring-1 ${g.confirmarExcluir ? 'bg-red-600 text-white ring-red-600' : 'text-red-600 ring-red-200'}">
            ${g.confirmarExcluir ? 'Toque de novo para apagar' : 'Apagar grupo'}
          </button>
          ${g.usadoEm.length ? `<p class="mt-2 text-center text-xs text-ink-muted">Será desligado de: ${esc(g.usadoEm.join(', '))}.</p>` : ''}
        </div>` : ''}
    </div>
    <footer class="flex gap-2 border-t border-ink/5 bg-white px-4 pt-3 safe-bottom">
      ${g.voltarParaPrato ? '<button data-grupo-voltar class="h-12 rounded-xl px-4 font-bold ring-1 ring-ink/15">Voltar</button>' : ''}
      <button data-salvar-grupo ${g.salvando ? 'disabled' : ''}
        class="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 font-bold text-ink disabled:opacity-60">
        ${g.salvando ? '<span class="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink"></span> Salvando…' : g.voltarParaPrato ? 'Criar e ligar ao prato' : g.id ? 'Salvar grupo' : 'Criar grupo'}
      </button>
    </footer>`);
  $('#edCorpo').scrollTop = y;
}

async function salvarGrupo() {
  const g = admin.edGrupo;
  const erros = {};
  if (g.nome.trim().length < 2) erros.nome = 'Dê um nome ao grupo.';
  const validas = g.opcoes.filter((o) => o.nome.trim() || o.id);
  if (!validas.length) erros.opcoes = 'Adicione pelo menos uma opção.';
  const linhas = validas.map((o, i) => {
    const preco = parseValor(o.preco || '0');
    const max = parseInt(o.max, 10);
    if (!o.nome.trim()) erros['op' + o.k] = 'Dê um nome à opção.';
    else if (!Number.isFinite(preco) || preco < 0) erros['op' + o.k] = 'Preço inválido.';
    else if (!Number.isInteger(max) || max < 1 || max > 20) erros['op' + o.k] = 'Máximo deve ser de 1 a 20.';
    const foto = (o.foto || '').trim();
    if (foto && !/^https:\/\//.test(foto)) erros['op' + o.k] = 'O link da foto tem de começar com https://';
    const dados = { nome: o.nome.trim(), preco, max_quantidade: max, ativo: o.ativo, ordem: i + 1 };
    if (admin.fotoOpcao !== false) dados.foto_url = foto || null;
    if (_temDiasOpcao) dados.dias_disponiveis = [...(o.dias || TODOS)].sort((a, b) => a - b);
    return { o, dados };
  });
  g.erros = erros;
  if (Object.keys(erros).length) { renderEditorGrupo(); return toast('Confira os campos destacados'); }

  g.salvando = true; renderEditorGrupo();
  try {
    const res = g.id
      ? await sb.from('grupos_opcoes').update({ nome: g.nome.trim() }).eq('id', g.id).select('id').single()
      : await sb.from('grupos_opcoes').insert({ nome: g.nome.trim() }).select('id').single();
    if (res.error) throw res.error;
    const gid = res.data.id;

    if (g.removidas.length) {
      const r = await sb.from('opcoes').delete().in('id', g.removidas);
      if (r.error) throw r.error;
    }
    const existentes = linhas.filter((l) => l.o.id);
    const novas = linhas.filter((l) => !l.o.id);
    const resultados = await Promise.all(existentes.map((l) => sb.from('opcoes').update(l.dados).eq('id', l.o.id)));
    const falha = resultados.find((r) => r.error);
    if (falha) throw falha.error;
    if (novas.length) {
      const r = await sb.from('opcoes').insert(novas.map((l) => ({ ...l.dados, grupo_id: gid })));
      if (r.error) throw r.error;
    }

    toast(g.id ? 'Grupo atualizado ✓' : 'Grupo criado ✓');
    const voltar = g.voltarParaPrato;
    admin.edGrupo = null;
    await carregarAdmin();
    if (voltar && admin.ed) {
      // Volta ao prato que estava a ser editado, já com o grupo novo ligado
      const nOp = linhas.filter((l) => l.dados.ativo).length;
      admin.ed.links.push({ grupo_id: gid, titulo: '', min: 0, max: Math.max(1, nOp) });
      renderEditorPrato();
    } else {
      fecharModal();
    }
  } catch (err) {
    console.error('[Catálogo]', err);
    g.salvando = false; renderEditorGrupo();
    toast('Não foi possível salvar. Verifique a internet.');
  }
}

async function excluirGrupo() {
  const g = admin.edGrupo;
  if (!g.confirmarExcluir) { g.confirmarExcluir = true; return renderEditorGrupo(); }
  const { error } = await sb.from('grupos_opcoes').delete().eq('id', g.id);
  if (error) return toast('Não foi possível apagar.');
  toast(`Grupo "${g.nome}" apagado`);
  fecharModal();
  await carregarAdmin();
}

/* ---------- Eventos do catálogo ---------- */
$('#adminApp').addEventListener('click', (ev) => {
  const t = ev.target;
  const sc = t.closest('[data-subcat]');
  if (sc) { admin.subCat = sc.dataset.subcat; return renderCatalogo(); }
  const ep = t.closest('[data-editar-prato]');
  if (ep) { admin.ed = null; return abrirEditorPrato(ep.dataset.editarPrato); }
  const eg = t.closest('[data-editar-grupo]');
  if (eg) return abrirEditorGrupo(eg.dataset.editarGrupo);
  const nv = t.closest('[data-novo]');
  if (nv) { admin.ed = null; return nv.dataset.novo === 'prato' ? abrirEditorPrato() : abrirEditorGrupo(); }
});

$('#adminModal').addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('[data-modal-fechar]')) return fecharModal();

  // --- prato ---
  const e = admin.ed;
  if (t.closest('[data-salvar-prato]')) return salvarPrato();
  if (t.closest('[data-excluir-prato]')) return excluirPrato();
  if (t.closest('[data-remover-foto]')) {
    if (e.fotoNova?.url) URL.revokeObjectURL(e.fotoNova.url);
    e.fotoNova = null; e.removerFoto = true; return renderEditorPrato();
  }
  const cat = t.closest('[data-ed-cat]');
  if (cat) { e.categoria = cat.dataset.edCat; return renderEditorPrato(); }
  const dia = t.closest('[data-ed-dia]');
  if (dia) {
    const d = Number(dia.dataset.edDia);
    e.dias = e.dias.includes(d) ? e.dias.filter((x) => x !== d) : [...e.dias, d].sort();
    delete e.erros.dias; return renderEditorPrato();
  }
  if (t.closest('[data-ed-todos]')) { e.dias = e.dias.length === 7 ? [] : [...TODOS]; return renderEditorPrato(); }
  if (t.closest('[data-toggle="ed-ativo"]')) { e.ativo = !e.ativo; return renderEditorPrato(); }
  if (t.closest('[data-toggle="ed-destaque"]')) { e.destaque = !e.destaque; return renderEditorPrato(); }
  const ac = t.closest('[data-ed-acomp]');
  if (ac) {
    const c = ac.dataset.edAcomp;
    const atual = e.acompanhaCats || [];
    if (c === 'todas') e.acompanhaCats = atual.length === CATS_COMIDA.length ? [] : [...CATS_COMIDA];
    else e.acompanhaCats = atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c];
    return renderEditorPrato();
  }
  const lm = t.closest('[data-link-mover]');
  if (lm && !lm.disabled) {
    const i = Number(lm.dataset.linkMover), j = i + Number(lm.dataset.dir);
    [e.links[i], e.links[j]] = [e.links[j], e.links[i]]; e.erros = {}; return renderEditorPrato();
  }
  const lr = t.closest('[data-link-remover]');
  if (lr) { e.links.splice(Number(lr.dataset.linkRemover), 1); e.erros = {}; return renderEditorPrato(); }
  if (t.closest('[data-link-novo]')) return abrirEditorGrupo(null, true);

  // --- grupo ---
  const g = admin.edGrupo;
  if (t.closest('[data-salvar-grupo]')) return salvarGrupo();
  if (t.closest('[data-excluir-grupo]')) return excluirGrupo();
  if (t.closest('[data-grupo-voltar]')) { admin.edGrupo = null; return renderEditorPrato(); }
  if (t.closest('[data-op-add]')) {
    g.opcoes.push({ k: ++_chaveOp, id: null, nome: '', preco: '0,00', max: '1', ativo: true });
    renderEditorGrupo();
    const ins = document.querySelectorAll('#adminModal [data-op-campo="nome"]');
    ins[ins.length - 1]?.focus();
    return;
  }
  const om = t.closest('[data-op-mover]');
  if (om && !om.disabled) {
    const i = Number(om.dataset.opMover), j = i + Number(om.dataset.dir);
    [g.opcoes[i], g.opcoes[j]] = [g.opcoes[j], g.opcoes[i]]; return renderEditorGrupo();
  }
  const orm = t.closest('[data-op-remover]');
  if (orm) {
    const k = Number(orm.dataset.opRemover);
    const o = g.opcoes.find((x) => x.k === k);
    if (o?.id) g.removidas.push(o.id);
    g.opcoes = g.opcoes.filter((x) => x.k !== k);
    return renderEditorGrupo();
  }
  const oa = t.closest('[data-op-ativo]');
  if (oa) { const o = g.opcoes.find((x) => x.k === Number(oa.dataset.opAtivo)); o.ativo = !o.ativo; return renderEditorGrupo(); }
  // Dias de cada opção (ex.: feijão tropeiro só seg, qua e sex)
  const od = t.closest('[data-op-dia]');
  if (od) {
    const o = g.opcoes.find((x) => x.k === Number(od.dataset.opDia));
    const d = Number(od.dataset.dia);
    o.dias = (o.dias || []).includes(d) ? o.dias.filter((x) => x !== d) : [...(o.dias || []), d].sort((a, b) => a - b);
    return renderEditorGrupo();
  }
  const odt = t.closest('[data-op-dias-todos]');
  if (odt) {
    const o = g.opcoes.find((x) => x.k === Number(odt.dataset.opDiasTodos));
    o.dias = (o.dias || []).length === 7 ? [] : [...TODOS];
    return renderEditorGrupo();
  }
});

$('#adminModal').addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.ed) {
    if (t.dataset.ed === 'g_nome') admin.edGrupo.nome = t.value;
    else admin.ed[t.dataset.ed] = t.value;
    return;
  }
  if (t.dataset.link !== undefined) {
    const l = admin.ed.links[Number(t.dataset.link)];
    const campo = t.dataset.linkCampo;
    l[campo] = campo === 'titulo' ? t.value : (t.value.trim() === '' ? NaN : Number(t.value));
    const regra = document.querySelector(`[data-link-regra="${t.dataset.link}"]`);
    if (regra && Number.isInteger(l.min) && Number.isInteger(l.max) && l.min <= l.max) {
      regra.textContent = regraTexto(l.min, l.max);
      regra.className = 'mt-2 text-xs text-brand-700';
    }
    return;
  }
  if (t.dataset.op) {
    const o = admin.edGrupo.opcoes.find((x) => x.k === Number(t.dataset.op));
    o[t.dataset.opCampo] = t.value;
  }
});

$('#adminModal').addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.matches('[data-foto]')) return escolherFoto(t);
  if (t.matches('[data-link-add]') && t.value) {
    const g = admin.grupos.find((x) => String(x.id) === t.value);
    const nOp = g.opcoes.filter((o) => o.ativo).length;
    admin.ed.links.push({ grupo_id: g.id, titulo: '', min: 0, max: Math.max(1, nOp) });
    renderEditorPrato();
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#adminModal').classList.contains('hidden')) fecharModal();
});
