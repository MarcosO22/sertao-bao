# 🍽️ Sertão Bão — cardápio digital e sistema de pedidos

![Sertão Bão](og-image.jpg)

**🔗 Site no ar:** [sertaobao.netlify.app](https://sertaobao.netlify.app)

Sistema web que está **em produção e é usado todo dia** por um quiosque de comida (café da manhã, marmitas caseiras e bebidas). O cliente monta o pedido pelo celular e envia pelo WhatsApp. O quiosque gerencia o cardápio e acompanha os pedidos num painel próprio.

## ✨ Funcionalidades

**Para o cliente**
- Cardápio por categorias (café da manhã, almoço, porções, lanches e bebidas), com busca
- Pratos com opções e adicionais (escolhas obrigatórias, limites e preços extras)
- Sacola, checkout (retirada ou entrega, Pix, cartão ou dinheiro) e envio do pedido formatado para o WhatsApp
- Horário de funcionamento automático: categorias e pratos aparecem só no dia e no horário certos
- Atualização em tempo real: se um prato esgota, ele sai da tela e da sacola na hora
- Acompanhamento do pedido e funcionamento offline com o último cardápio salvo

**Para o quiosque (painel `#admin`)**
- Login com Supabase Auth
- Gestão do cardápio, grupos de opções e fotos (Supabase Storage)
- Pedidos em tempo real com alarme sonoro de pedido novo
- Mini PDV com resumo do caixa do dia, ranking de pratos e impressão de comanda em impressora térmica (58/80 mm)

## 🛠️ Tecnologias
- **Front-end:** HTML, JavaScript e Tailwind CSS (sem build)
- **Banco e back-end:** Supabase (PostgreSQL, Auth, Row Level Security, Realtime e Storage)
- **Deploy:** Netlify

## 🗄️ Banco de dados
Modelagem relacional em PostgreSQL: `pratos`, `grupos_opcoes`, `opcoes`, `prato_grupos` (relação N:N entre pratos e grupos de opções reutilizáveis), `configuracoes` e pedidos (com JSONB). A segurança fica no **Row Level Security**: o site público tem acesso limitado, e a gestão do cardápio e dos pedidos exige login.

## 🤖 Como foi feito: desenvolvimento orquestrando IA
O código foi escrito com apoio de IA (Claude). O meu papel foi o de **orquestrador do projeto**:
- **Requisitos:** levantei com o quiosque o que o sistema precisava fazer e transformei isso em tarefas.
- **Direção técnica:** defini o banco no Supabase, a estrutura do projeto e a ordem das entregas, fase por fase.
- **Revisão e testes:** li o que era gerado, testei no celular e no painel, apontei o que estava errado ou podia melhorar e validei o que estava certo.
- **Dados e deploy:** carreguei o cardápio real via SQL e publiquei no Netlify.
- **Manutenção:** acompanho o uso no dia a dia, corrijo problemas e faço ajustes conforme o quiosque pede.

---

## 📁 Para quem vai mexer no código

Site estático, sem build: basta abrir o `index.html` ou publicar a pasta inteira.
Tailwind e Supabase vêm por CDN.

### Estrutura

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

### Regras importantes

- **A ordem dos `<script>` no `index.html` importa.** Os arquivos são scripts
  normais (não módulos) e compartilham as mesmas variáveis globais. Um arquivo
  pode *chamar dentro de funções* algo de um arquivo posterior, mas não pode
  *usar na hora em que carrega* algo que ainda não foi carregado.
- Arquivo novo: crie em `js/<pasta>/` e adicione o `<script>` antes do `main.js`.
- Mexer na conexão com o Supabase: `js/supabase.js` (topo do arquivo).
