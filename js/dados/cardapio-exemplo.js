/* =====================================================================
   DADOS DE EXEMPLO (MOCK)
   Na Fase 3 estes objetos serão substituídos por consultas ao Supabase.
   A estrutura já segue o esquema da base de dados.
   ===================================================================== */

const CONFIG = {
  nome_loja: 'Sertão Bão',
  whatsapp: '5561999999999',            // número do quiosque (DDI + DDD + número, só dígitos)
  chave_pix: 'sertaobao@exemplo.com',    // chave Pix de exemplo
  titular_pix: 'Maria S. (exemplo)',
  loja_aberta: true,
  mensagem_aviso: '',
  pedido_minimo: 20,         // valor mínimo dos itens para ENTREGA (retirada não tem mínimo)
  // Horário automático (valores reais vêm da tabela "configuracoes")
  horario_auto: true,
  hora_abre: '07:00',
  hora_fecha: '14:30',
  cafe_ate: '10:00',
  almoco_desde: '10:00',
  dias_abertos: [0, 1, 2, 3, 4, 5, 6],
  status_manual: null,       // 'aberta' | 'fechada' (abrir/fechar manual no painel)
  status_manual_ate: null,   // até quando vale o manual
  // Frete: sempre "a calcular no WhatsApp", conforme o bairro
};
// Na Fase 3 estes valores são substituídos pelos da tabela "configuracoes".

// Pedido mínimo só vale para ENTREGA (quem retira no balcão pode levar 1 pastel)
const pedidoMinimo = () => {
  const v = Number(CONFIG.pedido_minimo);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const faltaParaMinimo = () => (state.checkout.tipo === 'entrega' ? Math.max(0, pedidoMinimo() - subtotal()) : 0);

const FRETE_TXT = 'A calcular no WhatsApp';
const FRETE_AMIGAVEL = 'Fique tranquilo, locais próximos têm entrega bem barata!';

// Opções partilhadas pelas marmitas
const CARNES = [
  { id: 'c1', nome: 'Carne assada',      preco: 0, max: 1 },
  { id: 'c2', nome: 'Frango assado',     preco: 0, max: 1 },
  { id: 'c3', nome: 'Costela cozida',    preco: 0, max: 1 },
  { id: 'c4', nome: 'Carne de panela',   preco: 0, max: 1 },
  { id: 'c5', nome: 'Linguiça',          preco: 0, max: 1 },
  { id: 'c6', nome: 'Galinha caipira',   preco: 0, max: 1 },
];

// Saladas (à vontade, sem custo)
const SALADAS = [
  { id: 's1', nome: 'Maionese',  preco: 0, max: 1 },
  { id: 's2', nome: 'Alface',    preco: 0, max: 1 },
  { id: 's3', nome: 'Tomate',    preco: 0, max: 1 },
  { id: 's4', nome: 'Beterraba', preco: 0, max: 1 },
  { id: 's5', nome: 'Vinagrete', preco: 0, max: 1 },
];

// Complementos que já acompanham a marmita (o cliente marca o que quer)
const COMPLEMENTOS = [
  { id: 'k1', nome: 'Arroz',    preco: 0, max: 1 },
  { id: 'k2', nome: 'Feijão',   preco: 0, max: 1 },
  { id: 'k3', nome: 'Macarrão', preco: 0, max: 1 },
  { id: 'k4', nome: 'Farofa',   preco: 0, max: 1 },
];

const ADIC_MARMITA = [
  { id: 'am1', nome: 'Ovo frito',          preco: 2.00, max: 3 },
  { id: 'am2', nome: 'Porção de torresmo', preco: 5.00, max: 1 },
];

// dias: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
const TODOS = [0, 1, 2, 3, 4, 5, 6];

const MOCK_PRATOS = [
  // ---------- CAFÉ DA MANHÃ ----------
  {
    id: 1, categoria: 'cafe_da_manha', nome: 'Pão na Chapa', preco: 8.00, emoji: '🍞',
    descricao: 'Pão francês quentinho, tostado na chapa com bastante manteiga.',
    dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g1', nome: 'Turbine seu pão', min: 0, max: 5, opcoes: [
        { id: 'p1', nome: 'Ovo frito', preco: 2.00, max: 2 },
        { id: 'p2', nome: 'Queijo muçarela', preco: 3.00, max: 1 },
        { id: 'p3', nome: 'Presunto', preco: 2.50, max: 1 },
      ]},
    ],
  },
  {
    id: 2, categoria: 'cafe_da_manha', nome: 'Pingado', preco: 4.00, emoji: '☕',
    descricao: 'Café coado na hora com leite quente, do jeitinho do interior.',
    dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g2', nome: 'Como prefere adoçar?', min: 1, max: 1, opcoes: [
        { id: 'a1', nome: 'Com açúcar', preco: 0, max: 1 },
        { id: 'a2', nome: 'Com adoçante', preco: 0, max: 1 },
        { id: 'a3', nome: 'Sem açúcar', preco: 0, max: 1 },
      ]},
    ],
  },
  {
    id: 3, categoria: 'cafe_da_manha', nome: 'Cuscuz com Ovo e Queijo', preco: 12.00, emoji: '🌽', destaque: true,
    descricao: 'Cuscuz nordestino fofinho com ovo frito e queijo derretido por cima.',
    dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g3', nome: 'Adicionais', min: 0, max: 6, opcoes: [
        { id: 'k1', nome: 'Ovo extra', preco: 2.00, max: 3 },
        { id: 'k2', nome: 'Calabresa acebolada', preco: 4.00, max: 1 },
        { id: 'k3', nome: 'Carne de sol desfiada', preco: 6.00, max: 1 },
      ]},
    ],
  },
  { // DEMO: item esgotado — pode apagar
    id: 4, categoria: 'cafe_da_manha', nome: 'Tapioca de Queijo Coalho', preco: 10.00, emoji: '🫓',
    descricao: 'Tapioca crocante recheada com queijo coalho. (item de demonstração)',
    dias: TODOS, esgotado: true, foto_url: null, grupos: [],
  },

  // ---------- ALMOÇO ----------
  {
    id: 10, categoria: 'almoco', nome: 'Marmita Pequena', preco: 22.00, emoji: '🍱',
    descricao: 'Marmita menor com 1 tipo de carne. Monte do seu jeito: salada e complementos inclusos.',
    dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g10', nome: 'Escolha a carne', min: 1, max: 1, opcoes: CARNES },
      { id: 'g10s', nome: 'Salada (à vontade)', min: 0, max: 5, opcoes: SALADAS },
      { id: 'g10c', nome: 'Complementos (já vão na marmita)', min: 0, max: 4, opcoes: COMPLEMENTOS },
      { id: 'g11', nome: 'Quer adicionar algo?', min: 0, max: 4, opcoes: ADIC_MARMITA },
    ],
  },
  {
    id: 11, categoria: 'almoco', nome: 'Marmita Tradicional', preco: 25.00, emoji: '🍱', destaque: true,
    descricao: 'A marmita cheia do Sertão, com até 2 tipos de carne, salada e complementos.',
    dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g12', nome: 'Escolha até 2 carnes', min: 1, max: 2, opcoes: CARNES },
      { id: 'g12s', nome: 'Salada (à vontade)', min: 0, max: 5, opcoes: SALADAS },
      { id: 'g12c', nome: 'Complementos (já vão na marmita)', min: 0, max: 4, opcoes: COMPLEMENTOS },
      { id: 'g13', nome: 'Quer adicionar algo?', min: 0, max: 4, opcoes: ADIC_MARMITA },
    ],
  },
  { // Só às SEXTAS e SÁBADOS (dias: 5 e 6) — nos outros dias nem aparece no cardápio
    id: 12, categoria: 'almoco', nome: 'Marmita Especial (Rabada)', preco: 30.00, emoji: '🍲',
    descricao: 'Do tamanho da tradicional, com a nossa rabada cozida lentamente. Só sexta e sábado!',
    dias: [5, 6], esgotado: false, foto_url: null,
    grupos: [
      { id: 'g14c2', nome: 'Quer mais uma carne junto?', min: 0, max: 1, opcoes: CARNES },
      { id: 'g14s', nome: 'Salada (à vontade)', min: 0, max: 5, opcoes: SALADAS },
      { id: 'g14k', nome: 'Complementos (já vão na marmita)', min: 0, max: 4, opcoes: COMPLEMENTOS },
      { id: 'g14', nome: 'Quer adicionar algo?', min: 0, max: 4, opcoes: ADIC_MARMITA },
    ],
  },

  // ---------- BEBIDAS ----------
  {
    id: 20, categoria: 'bebidas', nome: 'Suco Natural de Laranja', preco: 8.00, emoji: '🍊',
    descricao: 'Espremido na hora, 400 ml.', dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g20', nome: 'Como prefere?', min: 0, max: 2, opcoes: [
        { id: 'b1', nome: 'Com gelo', preco: 0, max: 1 },
        { id: 'b2', nome: 'Sem açúcar', preco: 0, max: 1 },
      ]},
    ],
  },
  {
    id: 21, categoria: 'bebidas', nome: 'Refrigerante Lata', preco: 6.00, emoji: '🥤',
    descricao: 'Lata 350 ml bem gelada.', dias: TODOS, esgotado: false, foto_url: null,
    grupos: [
      { id: 'g21', nome: 'Escolha o sabor', min: 1, max: 1, opcoes: [
        { id: 'b3', nome: 'Coca-Cola', preco: 0, max: 1 },
        { id: 'b4', nome: 'Guaraná', preco: 0, max: 1 },
      ]},
    ],
  },
  {
    id: 22, categoria: 'bebidas', nome: 'Água Mineral', preco: 3.00, emoji: '💧',
    descricao: 'Garrafa 500 ml, com ou sem gás.', dias: TODOS, esgotado: false, foto_url: null, grupos: [],
  },
];
let PRATOS = [];   // preenchido pelo Supabase (ou pelos exemplos acima, em modo demonstração)
