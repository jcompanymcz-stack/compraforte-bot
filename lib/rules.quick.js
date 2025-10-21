// lib/rules.quick.js
// Conjunto inicial de padrões focados em compras B2B alimentação.
export const INTENTS = {
  GREET: 'greet',
  IDENTITY: 'identity',
  NEGATION: 'negation',
  PRESENCE: 'presence',
  PRICING: 'pricing',
  COVERAGE: 'coverage',
  DELIVERY: 'delivery',
  PRAZO: 'prazo',
  CADASTRO_BAIRRO: 'cadastro_bairro',
  PEDIDO_DIRETO: 'pedido_direto',
  COMO_FUNCIONA: 'como_funciona',
  MARCA_SUBSTITUTO: 'marca_substituto',
  STATUS: 'status',
  CANCEL: 'cancel',
  RUDE: 'rude_smalltalk',
  FALLBACK: 'fallback'
};

const unir = (arr) => new RegExp(arr.join('|'), 'i');

const oi = ['oi','ola','olá','opa','eai','e ai','boa noite','bom dia','boa tarde','salve','fala','falae','blz','beleza'];
const ping = ['?','ta ai','tá ai','ta aí','alô','alo','tem gente','responde','oi?','alô?','alo?'];
const neg = ['nao','não','nope','negativo','prefiro nao','agora nao','sem interesse'];
const cobranca = ['quanto custa','tem mensalidade','voc[êe]s? cobram','pagar','preco do servico','taxa do servico','eh de graca','é de graça','paga quanto'];
const cobertura = ['atendem','atende','funciona para','serve para','pizzaria','lanchonete','padaria','restaurante','mercearia','mercadinho'];
const entrega = ['frete','entrega','leva','traz','camih[aã]o','entregam','taxa de entrega'];
const prazo = ['prazo','quanto tempo','chega quando','entrega quando','pra quando'];
const como = ['como funciona','o que voces fazem','explica ai','me explica','me diz como','o que e isso','como assim'];
const marca = ['marca','equivalente','substituto','pode ser outra marca','aceita similar','padr[ãa]o'];
const status = ['status','andamento','e ai','ja conseguiu','retorno','me manda as ofertas','cad[êe] as ofertas','resultado'];
const cancel = ['cancela','cancelar','esquece','deixa pra la','nao quero mais','desconsidera'];

export const rules = [
  ...oi.map(x => ({ intent: INTENTS.GREET, pattern: unir([`^${x}$`,`^${x}[.!]*$`]) })),
  ...ping.map(x => ({ intent: INTENTS.PRESENCE, pattern: unir([`^${x}$`]) })),
  { intent: INTENTS.IDENTITY, pattern: /(quem (e|é) voce|com quem falo|o que (e|é) isso|da onde fala)/i },
  ...neg.map(x => ({ intent: INTENTS.NEGATION, pattern: new RegExp(`\b${x}\b`, 'i') })),
  ...cobranca.map(x => ({ intent: INTENTS.PRICING, pattern: new RegExp(x, 'i') })),
  ...cobertura.map(x => ({ intent: INTENTS.COVERAGE, pattern: new RegExp(x, 'i') })),
  ...entrega.map(x => ({ intent: INTENTS.DELIVERY, pattern: new RegExp(x, 'i') })),
  ...prazo.map(x => ({ intent: INTENTS.PRAZO, pattern: new RegExp(x, 'i') })),
  ...como.map(x => ({ intent: INTENTS.COMO_FUNCIONA, pattern: new RegExp(x, 'i') })),
  ...marca.map(x => ({ intent: INTENTS.MARCA_SUBSTITUTO, pattern: new RegExp(x, 'i') })),
  ...status.map(x => ({ intent: INTENTS.STATUS, pattern: new RegExp(x, 'i') })),
  ...cancel.map(x => ({ intent: INTENTS.CANCEL, pattern: new RegExp(x, 'i') })),
  { intent: INTENTS.CADASTRO_BAIRRO, pattern: /(meu bairro|bairro (e|é)|moro em|sou do|falo de) [a-z ]{2,}/i },
  { intent: INTENTS.PEDIDO_DIRETO, pattern: /\b\d+\s?(kg|kilo|cx|cxs|caixa|fardo|saco|un|und|unid|lt|l|lata|pacote|pct|balao|balde|galao|galão)\b/i },
  { intent: INTENTS.RUDE, pattern: /(burro|lento|merda|porra|caralho|idiota|inutil|ta dificil)/i },
];

export const canned = {
  [INTENTS.GREET]: 'Oi! Eu busco preços e retorno 2–3 ofertas. Diga 1 item + quantidade (ex.: "molho 10 cx").',
  [INTENTS.PRESENCE]: 'Tô aqui 👋 Diga 1 item + quantidade (ex.: "farinha 25 sacos").',
  [INTENTS.IDENTITY]: 'CompraForte — cotação B2B p/ alimentação. Você manda o item e eu retorno 2–3 ofertas com frete/prazo.',
  [INTENTS.NEGATION]: 'Sem problema. Se for comércio de alimentação, posso cotar quando quiser.',
  [INTENTS.PRICING]: 'É grátis p/ você. Minha comissão vem do fornecedor. Quer começar? Item + quantidade.',
  [INTENTS.COVERAGE]: 'Atendo pizzarias, padarias, lanchonetes e restaurantes. Começamos com qual item?',
  [INTENTS.DELIVERY]: 'Incluo frete na comparação. Qual o bairro para calcular?',
  [INTENTS.PRAZO]: 'Junto o prazo com as ofertas. Qual item + quantidade você quer cotar?',
  [INTENTS.CADASTRO_BAIRRO]: 'Ok! Pode me dizer seu bairro no próximo passo, após o item. Primeiro: qual item + quantidade?',
  [INTENTS.PEDIDO_DIRETO]: '',
  [INTENTS.COMO_FUNCIONA]: 'Você manda o item + quantidade; eu retorno 2–3 ofertas com preço, frete e prazo.',
  [INTENTS.MARCA_SUBSTITUTO]: 'Se tiver marca preferida, me diga. Se não tiver, busco equivalentes com melhor custo.',
  [INTENTS.STATUS]: 'Estou buscando as ofertas. Se puder, me adianta o próximo item já com quantidade.',
  [INTENTS.CANCEL]: 'Certo, cancelo aqui. Quando quiser retomar, é só mandar 1 item + quantidade.',
  [INTENTS.RUDE]: 'Vou te ajudar. Me diga 1 item + quantidade e eu já começo.',
  [INTENTS.FALLBACK]: 'Vamos começar: item + quantidade (ex.: 10kg, 5 cx).'
};

export function extractOrderHeuristic(text=''){
  const m = text.match(/\b(\d+)\s?(kg|kilo|cx|cxs|caixa|fardo|saco|un|und|unid|lt|l|lata|pacote|pct|balao|balde|galao|galão)\b/i);
  const qtd = m ? Number(m[1]) : null;
  const unidade = m ? m[2].toLowerCase() : null;
  const produto = m ? text.replace(m[0],'').replace(/\b(de|da|do)\b/g,'').trim() : null;
  return (qtd && unidade) ? { produto: produto || null, quantidade: qtd, unidade } : null;
}
