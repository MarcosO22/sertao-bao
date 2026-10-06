/* =====================================================================
   FASE 18 — COMANDA PARA IMPRESSORA TÉRMICA (58 mm ou 80 mm)
   Monta um cupom só com os dados do pedido e chama window.print().
   O CSS @media print esconde todo o resto do site.
   ===================================================================== */
const LS_PAPEL = 'sertaobao_papel_v1';
admin.papel = (() => { try { return localStorage.getItem(LS_PAPEL) === '58' ? '58' : '80'; } catch (_) { return '80'; } })();
function mudarPapel() {
  admin.papel = admin.papel === '80' ? '58' : '80';
  try { localStorage.setItem(LS_PAPEL, admin.papel); } catch (_) {}
  toast(`Comanda ajustada para papel de ${admin.papel} mm`);
}

function htmlComanda(p) {
  const entrega = p.tipo === 'entrega';
  const d = new Date(p.criado_em);
  const { ymd } = relogioSP(d);
  const data = `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)} ${hhmm(p.criado_em)}`;
  const linha = (a, b, cls = '') => `<div class="cmd-l ${cls}"><span>${a}</span><span>${b}</span></div>`;
  const itens = (Array.isArray(p.itens) ? p.itens : []).map((i) => `
    ${linha(`<b>${esc(i.qtd)}x ${esc(i.nome)}</b>`, money(Number(i.total) || 0))}
    ${(i.opcoes || []).map((o) => `<div class="cmd-sub">- ${esc(String(o.grupo || '').replace(/[?:]\s*$/, ''))}: ${esc(o.texto)}</div>`).join('')}
    ${i.obs ? `<div class="cmd-sub cmd-b">OBS: ${esc(i.obs)}</div>` : ''}`).join('<div style="height:1.2mm"></div>');
  const taxa = p.taxa_entrega == null ? null : Number(p.taxa_entrega);
  const total = Number(p.subtotal || 0) + (taxa || 0);
  const pag = (PAGAMENTO_ROTULO[p.pagamento] || p.pagamento || '') + (p.pagamento_detalhe ? ` - ${p.pagamento_detalhe}` : '');
  const agora = relogioSP();
  return `
    <div class="cmd-c cmd-g">SERTÃO BÃO</div>
    <div class="cmd-c">Comanda de pedido</div>
    <hr class="cmd-sep">
    <div class="cmd-c cmd-g">PEDIDO #${esc(p.codigo)}</div>
    <div class="cmd-c">${data}</div>
    <div class="cmd-inv" style="margin-top:1.2mm">${entrega ? '*** ENTREGA ***' : '*** RETIRADA NO BALCÃO ***'}</div>
    ${p.status === 'cancelado' ? '<div class="cmd-inv" style="margin-top:1mm">PEDIDO CANCELADO</div>' : ''}
    <hr class="cmd-sep">
    <div class="cmd-quebra"><b>Cliente:</b> ${esc(p.cliente_nome)}</div>
    ${entrega ? `
      <div class="cmd-quebra"><b>End.:</b> ${esc(p.endereco || '-')}</div>
      <div class="cmd-quebra"><b>Bairro:</b> ${esc(p.bairro || '-')}</div>
      ${p.referencia ? `<div class="cmd-quebra"><b>Ref.:</b> ${esc(p.referencia)}</div>` : ''}` : ''}
    <hr class="cmd-sep">
    ${itens}
    <hr class="cmd-sep">
    ${linha('Subtotal', money(Number(p.subtotal) || 0))}
    ${entrega ? linha('Entrega', taxa == null ? 'a combinar' : money(taxa)) : ''}
    ${linha('<b>TOTAL</b>', `<b>${money(total)}${entrega && taxa == null ? ' +entrega' : ''}</b>`, 'cmd-g')}
    <div class="cmd-quebra" style="margin-top:1mm"><b>Pagamento:</b> ${esc(pag)}</div>
    <hr class="cmd-sep">
    <div class="cmd-c">Impresso em ${agora.ymd.slice(8, 10)}/${agora.ymd.slice(5, 7)} ${String(Math.floor(agora.min / 60)).padStart(2, '0')}:${String(agora.min % 60).padStart(2, '0')}</div>
    <div class="cmd-c">Obrigado pela preferência!</div>`;
}

function imprimirComanda(id) {
  const p = admin.pedidos.find((x) => String(x.id) === String(id));
  if (!p) return toast('Pedido não encontrado');
  if (!Array.isArray(p.itens)) return toast('Abra o dia do pedido para imprimir a comanda');
  let el = $('#comandaImpressao');
  if (!el) { el = document.createElement('div'); el.id = 'comandaImpressao'; document.body.appendChild(el); }
  el.className = `papel-${admin.papel}`;
  el.innerHTML = htmlComanda(p);
  // Tamanho da página = largura do rolo × altura do cupom (mede o conteúdo fora da tela)
  el.style.cssText = 'display:block;position:absolute;left:-9999px;top:0';
  const alturaMm = Math.ceil(el.offsetHeight * 25.4 / 96) + 10;
  el.style.cssText = '';
  let pg = $('#estiloPapel');
  if (!pg) { pg = document.createElement('style'); pg.id = 'estiloPapel'; document.head.appendChild(pg); }
  pg.textContent = `@page { size: ${admin.papel}mm ${Math.max(60, alturaMm)}mm; margin: 0; }`;
  document.documentElement.classList.add('imprimindo');
  const limpar = () => { document.documentElement.classList.remove('imprimindo'); window.removeEventListener('afterprint', limpar); };
  window.addEventListener('afterprint', limpar);
  setTimeout(() => { window.print(); setTimeout(limpar, 1000); }, 50);
}

/* ---------- Eventos da aba Pedidos ---------- */
$('#adminApp').addEventListener('click', (ev) => {
  const t = ev.target;
  const f = t.closest('[data-ped-filtro]');
  if (f) { admin.pedFiltro = f.dataset.pedFiltro; return renderPedidos(); }
  const d = t.closest('[data-ped-dia]');
  if (d && !d.disabled) return mudarDia(Number(d.dataset.pedDia));
  const zm = t.closest('[data-zona-modo]');
  if (zm) { admin.zonaModo = zm.dataset.zonaModo; return renderPedidos(); }
  const imp = t.closest('[data-imprimir]');
  if (imp) return imprimirComanda(imp.dataset.imprimir);
  if (t.closest('[data-papel]')) { mudarPapel(); return renderPedidos(); }
  // Fase 11 — calendário e período
  if (t.id === 'pedCalendario') { try { t.showPicker?.(); } catch (_) {} return; }
  if (t.closest('[data-notif-ativar]')) return pedirPermissaoNotificacao();
  if (t.closest('[data-ped-hoje]')) return irParaDia(relogioSP().ymd);
  const irDia = t.closest('[data-ped-ir-dia]');
  if (irDia) return irParaDia(irDia.dataset.pedIrDia);
  if (t.closest('[data-ped-periodo-abrir]')) { admin.pedPainelPeriodo = !admin.pedPainelPeriodo; return renderPedidos(); }
  if (t.closest('[data-ped-periodo-fechar]')) { admin.pedPainelPeriodo = false; return renderPedidos(); }
  if (t.closest('[data-ped-periodo-sair]')) return sairDoPeriodo();
  const at = t.closest('[data-ped-atalho]');
  if (at) { const [i, f] = atalhoPeriodo(at.dataset.pedAtalho); return aplicarPeriodo(i, f); }
  if (t.closest('[data-ped-periodo-aplicar]')) return aplicarPeriodo($('#pedIniInput')?.value, $('#pedFimInput')?.value);
  const s = t.closest('[data-ped-status]');
  if (s && !s.disabled) return mudarStatusPedido(s.dataset.id, s.dataset.pedStatus);
  const fr = t.closest('[data-salvar-frete]');
  if (fr) return salvarFrete(fr.dataset.salvarFrete);
});
$('#adminApp').addEventListener('change', (ev) => {
  if (ev.target.id === 'pedCalendario' && ev.target.value) irParaDia(ev.target.value);
});
$('#adminApp').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.dataset?.frete) { ev.preventDefault(); salvarFrete(ev.target.dataset.frete); }
});
