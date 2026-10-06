/* ---------- Fase 13 — Zonas Quentes (para onde mais sai entrega) ---------- */
admin.zonaModo = 'bairro'; // 'bairro' | 'quadra'

// "Ceilândia  sul" e "ceilandia Sul" viram a mesma chave
const chaveTexto = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tituloBonito = (s) => String(s || '').trim().replace(/\s+/g, ' ')
  .toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Qn[a-z]|Qr|Qs|Qe|Qi|Ql|Cn[a-z]|Eqn[a-z])\b/g, (m) => m.toUpperCase()); // QNM, QNN…

/**
 * Pega a "quadra" do começo do endereço (padrão de Brasília/Ceilândia):
 *   "QNM 18 Conjunto A Casa 5" → "QNM 18"   ·  "qnn12 cj b" → "QNN 12"
 *   "Quadra 12 Lote 3" / "Qd. 12" → "Quadra 12"  ·  "EQNM 18/20" → "EQNM 18"
 */
function quadraDoEndereco(endereco) {
  const e = String(endereco || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  let m = e.match(/\b(?:QUADRA|QD)\.?\s*(\d{1,3})\b/);
  if (m) return `Quadra ${Number(m[1])}`;
  m = e.match(/\b(E?QN[A-Z]|QR|QS|QE|QI|QL|CN[A-Z])\s*\.?\s*(\d{1,3})\b/);
  if (m) return `${m[1]} ${Number(m[2])}`;
  return null;
}

/**
 * Conta as entregas CONCLUÍDAS por região e soma o frete cobrado.
 * modo 'bairro' → usa o campo "bairro" (se vazio, tenta a quadra do endereço)
 * modo 'quadra' → usa a quadra do começo do "endereco" (se não achar, usa o bairro)
 */
function zonasQuentes(pedidos, modo = 'bairro', limite = 5) {
  const mapa = new Map();
  let total = 0, freteTotal = 0, semFrete = 0;
  for (const p of pedidos) {
    if (p.status !== 'concluido' || p.tipo !== 'entrega') continue;
    const bairro = String(p.bairro || '').trim();
    const quadra = quadraDoEndereco(p.endereco);
    const nome = modo === 'quadra' ? (quadra || bairro) : (bairro || quadra);
    const chave = chaveTexto(nome) || '?';
    const r = mapa.get(chave) || { nome: nome ? tituloBonito(nome) : 'Sem região informada', n: 0, frete: 0, comFrete: 0 };
    r.n += 1;
    if (p.taxa_entrega != null) { r.frete += Number(p.taxa_entrega) || 0; r.comFrete += 1; } else semFrete += 1;
    mapa.set(chave, r);
    total += 1;
    freteTotal += Number(p.taxa_entrega) || 0;
  }
  const top = [...mapa.values()]
    .map((r) => ({ ...r, frete: Math.round(r.frete * 100) / 100, media: r.comFrete ? Math.round((r.frete / r.comFrete) * 100) / 100 : null }))
    .sort((a, b) => b.n - a.n || b.frete - a.frete || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, limite);
  return { top, total, regioes: mapa.size, freteTotal: Math.round(freteTotal * 100) / 100, semFrete };
}

let _zonaCache = { ref: null, modo: null, res: null };
function zonasAtuais() {
  if (_zonaCache.ref !== admin.pedidos || _zonaCache.modo !== admin.zonaModo)
    _zonaCache = { ref: admin.pedidos, modo: admin.zonaModo, res: zonasQuentes(admin.pedidos, admin.zonaModo) };
  return _zonaCache.res;
}

function blocoZonas() {
  if (admin.pedErro || !admin.pedCarregado) return '';
  const { top, total, regioes, freteTotal } = zonasAtuais();
  const max = top[0]?.n || 1;
  const chipZona = (k, r) => `<button data-zona-modo="${k}" class="rounded-full px-2.5 py-1 text-[11px] font-bold ${admin.zonaModo === k ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'}">${r}</button>`;
  return `
    <!-- ZONAS QUENTES (ENTREGAS) -->
    <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-extrabold">🔥 Zonas Quentes <span class="font-semibold text-ink-muted">(Entregas)</span></h3>
        <div class="flex shrink-0 rounded-full bg-cream p-0.5 ring-1 ring-ink/5">${chipZona('bairro', 'Bairro')}${chipZona('quadra', 'Quadra')}</div>
      </div>
      ${!top.length ? '<p class="py-5 text-center text-sm text-ink-muted">Nenhuma entrega concluída neste período ainda.</p>' : `
      <ol class="mt-3 grid gap-2.5">
        ${top.map((r, i) => `
          <li class="flex items-center gap-3">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-400 text-white' : i === 2 ? 'bg-brand-300 text-ink' : 'bg-ink/10 text-ink'}">${i + 1}º</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-bold">${esc(r.nome)}</p>
                <p class="shrink-0 text-sm font-extrabold tabular-nums">${r.n} <span class="text-[11px] font-semibold text-ink-muted">entrega${r.n === 1 ? '' : 's'}</span></p>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
                <div class="h-full rounded-full ${i === 0 ? 'bg-red-500' : 'bg-orange-300'}" style="width:${Math.max(4, Math.round((r.n / max) * 100))}%"></div>
              </div>
              <p class="mt-1 text-[11px] text-ink-muted tabular-nums">${money(r.frete)} em frete${r.media != null && r.n > 1 ? ` · média ${money(r.media)}` : ''}</p>
            </div>
          </li>`).join('')}
      </ol>
      <p class="mt-3 border-t border-dashed border-ink/10 pt-2 text-[11px] text-ink-muted">
        ${total} entrega${total === 1 ? '' : 's'} em ${regioes} regi${regioes === 1 ? 'ão' : 'ões'} · ${money(freteTotal)} de frete no total · só entregas concluídas
      </p>`}
    </section>`;
}

// Ranking de pratos + Zonas Quentes lado a lado (no celular, um embaixo do outro)
const blocoInteligencia = () => (admin.pedErro || !admin.pedCarregado) ? ''
  : `<div class="mt-3 grid items-start gap-3 md:grid-cols-2">${blocoRanking()}${blocoZonas()}</div>`;
