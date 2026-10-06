# Sertão Bão — cardápio digital

Site estático, sem build: basta abrir o `index.html` ou publicar a pasta inteira.
Tailwind e Supabase vêm por CDN.

## Estrutura

```
index.html                 HTML da página (estrutura, modais, carregamento dos scripts)
og-image.jpg               imagem da pré-visualização do link
css/estilos.css            CSS próprio (o resto é Tailwind nas classes do HTML)
js/
  tailwind.config.js       cores, fontes e sombras do tema
  dados/cardapio-exemplo.js  cardápio/config de exemplo (usado sem Supabase)
  util.js                  utilitários: dinheiro, horário de funcionamento, etc.
  estado.js                estado global da página
  supabase.js              chaves e ligação ao Supabase, carregar cardápio
  loja/                    o que o cliente vê
    cabecalho-abas.js  cartoes.js  vitrine.js  detalhe-prato.js
    barra-sacola.js  eventos.js  persistencia.js  sacola.js  checkout.js
    gravar-pedido.js       grava o pedido no Supabase ao finalizar
  admin/                   painel de gestão (#admin)
    painel.js              login, abas, operação, loja e Pix
    catalogo.js  editor-prato.js  editor-grupo.js
    pedidos.js  pedido-cartao.js  pedidos-componentes.js
    alarme.js              som/alerta de pedido novo e notificações
    ranking.js  zonas-quentes.js  caixa.js  comanda.js (impressão térmica)
  cliente/                 área do cliente (sem login)
    meus-pedidos.js  rastreio.js  jogo.js
  main.js                  inicialização (sempre o último script)
```

## Regras importantes

- **A ordem dos `<script>` no `index.html` importa.** Os arquivos são scripts
  normais (não módulos) e compartilham as mesmas variáveis globais. Um arquivo
  pode *chamar dentro de funções* algo de um arquivo posterior, mas não pode
  *usar na hora em que carrega* algo que ainda não foi carregado.
- Arquivo novo: crie em `js/<pasta>/` e adicione o `<script>` antes do `main.js`.
- Mexer na conexão com o Supabase: `js/supabase.js` (topo do arquivo).
