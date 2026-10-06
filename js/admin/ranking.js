/* ---------- Fase 12 — Ranking de vendas (pratos mais vendidos) ---------- */
// Nomes de bebidas vendidas como item avulso (categoria "bebidas" do cardápio)
const PALAVRAS_BEBIDA = new Set(['refri', 'refrigerante', 'suco', 'água', 'agua', 'coca', 'guaraná', 'guarana', 'fanta', 'sprite', 'pepsi', 'cerveja', 'bebida', 'refrigerantes', 'sucos']);
const pareceBebida = (nome) => nome.split(/[^a-z0-9à-ÿ]+/).some((w) => PALAVRAS_BEBIDA.has(w));
function nomesDeBebidas() {
  const fonte = (admin.pratos && admin.pratos.length) ? admin.pratos : PRATOS;
  return new Set((fonte || []).filter((p) => p.categoria === 'bebidas').map((p) => normalizaNome(p.nome)));
}
const normalizaNome = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Conta a quantidade vendida de cada PRATO BASE nos pedidos concluídos.
 * - Lê o JSON da coluna "itens" de cada pedido: [{ nome, qtd, unit, total, obs, opcoes }]
 * - Soma "qtd" (2x Prato Normal conta 2)
 * - Ignora bebidas avulsas e tudo que está em "opcoes" (recheios, extras,
 *   bebida para acompanhar) — o foco é o prato principal
 * - Junta nomes iguais (ex.: o mesmo prato de seg–sex e de sábado)
 */
function rankingPratos(pedidos, limite = 5) {
  const bebidas = nomesDeBebidas();
  const mapa = new Map();
  let totalPratos = 0;
  for (const p of pedidos) {
    if (p.status !== 'concluido') continue;
    let itens = p.itens;
    if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch (_) { itens = []; } }
    if (!Array.isArray(itens)) continue;
    for (const it of itens) {
      const chave = normalizaNome(it?.nome);
      if (!chave || bebidas.has(chave) || pareceBebida(chave)) continue;
      const qtd = Math.max(1, Math.round(Number(it.qtd) || 1));
      const r = mapa.get(chave) || { nome: String(it.nome).trim(), qtd: 0, valor: 0 };
      r.qtd += qtd;
      r.valor += Number(it.total) || 0;
      mapa.set(chave, r);
      totalPratos += qtd;
    }
  }
  const top = [...mapa.values()]
    .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, limite);
  return { top, totalPratos, variedade: mapa.size };
}

// Guarda o último cálculo: só recalcula quando a lista de pedidos muda
let _rankCache = { ref: null, res: null };
function rankingAtual() {
  if (_rankCache.ref !== admin.pedidos) _rankCache = { ref: admin.pedidos, res: rankingPratos(admin.pedidos) };
  return _rankCache.res;
}

function blocoRanking() {
  if (admin.pedErro || !admin.pedCarregado) return '';
  const { top, totalPratos, variedade } = rankingAtual();
  const rotulo = admin.pedModo === 'periodo' ? rotuloPeriodo(admin.pedIni, admin.pedFim) : rotuloDia(admin.pedDia);
  const max = top[0]?.qtd || 1;
  const medalha = ['bg-brand-500 text-ink', 'bg-ink/80 text-white', 'bg-brand-800 text-white', 'bg-ink/10 text-ink', 'bg-ink/10 text-ink'];
  return `
    <!-- RANKING DE VENDAS -->
    <section class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-sm font-extrabold">🏆 Ranking de Vendas</h3>
        <span class="truncate text-[11px] font-bold text-ink-muted">${esc(rotulo)}</span>
      </div>
      ${!top.length ? '<p class="py-5 text-center text-sm text-ink-muted">Nenhum prato concluído neste período ainda.</p>' : `
      <ol class="mt-3 grid gap-2.5">
        ${top.map((r, i) => `
          <li class="flex items-center gap-3">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${medalha[i]}">${i + 1}º</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-bold">${esc(r.nome)}</p>
                <p class="shrink-0 text-sm font-extrabold tabular-nums">${r.qtd}x</p>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
                <div class="h-full rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-brand-300'}" style="width:${Math.max(4, Math.round((r.qtd / max) * 100))}%"></div>
              </div>
            </div>
          </li>`).join('')}
      </ol>
      <p class="mt-3 border-t border-dashed border-ink/10 pt-2 text-[11px] text-ink-muted">
        ${totalPratos} prato${totalPratos === 1 ? '' : 's'} vendido${totalPratos === 1 ? '' : 's'} · ${variedade} tipo${variedade === 1 ? '' : 's'} diferente${variedade === 1 ? '' : 's'} · só pedidos concluídos, sem bebidas e extras
      </p>`}
    </section>`;
}
