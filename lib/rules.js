// lib/rules.js — intents simples (baratas) + respostas curtinhas
export const quickRules = [
  // Identidade
  { pattern: /^(quem (?:é|e) voc[eê]|quem (?:é|e) vc|com quem falo|da onde fala|o que [ée] isso)$/i,
    reply: 'CompraForte — cotação rápida p/ comércios. Te mando 2–3 ofertas com preço, prazo e frete. Manda item + quantidade.',
    tag: 'identity' },

  // Saudação / presença
  { pattern: /^(ol[aá]|ola|opa|oi|bom dia|boa tarde|boa noite)$/i,
    reply: 'Oi! Eu busco preços e retorno 2–3 ofertas. Qual item + quantidade?',
    tag: 'greeting' },
  { pattern: /^(al[oô]\?|oi\?|t[áa] a[ií]\?|ta ai\?|\?{1,3})$/i,
    reply: 'Tô aqui 👋 Manda 1 item + quantidade que eu começo.',
    tag: 'presence' },

  // Explicação curta
  { pattern: /^(como assim|explica melhor|como funciona)$/i,
    reply: 'Eu pesquiso fornecedores locais e devolvo 2–3 opções com preço unit., prazo e frete. Manda o 1º item + quantidade.',
    tag: 'explain' },

  // Preço do serviço
  { pattern: /(quanto custa (isso|o servi[cç]o)|voc[eê]s cobram|tem mensalidade|[eé] de gra[çc]a)/i,
    reply: 'Grátis p/ você. Comissão vem do fornecedor. Quer começar? Item + quantidade.',
    tag: 'service_price' },

  // Cobertura / nichos
  { pattern: /(atendem padaria|atendem lanchonete|pizzaria|funciona pra padaria)/i,
    reply: 'Atendo padarias, lanchonetes e pizzarias. Envie item + quantidade que eu cotar agora.',
    tag: 'coverage' },

  // Entrega / frete
  { pattern: /(fazem entrega|frete|prazo de entrega)/i,
    reply: 'Incluo frete/prazo no comparativo. Qual bairro?',
    tag: 'delivery' },

  // Pagamento
  { pattern: /(pix|boleto|cart[aã]o|prazo \d{2}d)/i,
    reply: 'Condição de pagamento aparece no comparativo (PIX, boleto, prazos 14d/28d etc.).',
    tag: 'payment' },

  // CTA direta
  { pattern: /(quero cotar|vamos cotar|pode cotar)/i,
    reply: 'Manda o item + quantidade (ex.: “10kg farinha”).',
    tag: 'cta' },
];

export function quickRule(text){
  const t = (text || '').trim();
  for (const r of quickRules){
    if (r.pattern.test(t)) return { reply: r.reply, tag: r.tag };
  }
  return null;
}

export const altReplies = {
  greeting: 'Beleza. Item + quantidade e eu já cotar.',
  explain:  'Resumindo: eu comparo e te devolvo 2–3 ofertas com frete.',
  service_price: 'Pode usar sem custo. Começamos com qual item?',
  coverage: 'Atendo sim. Qual item + quantidade?',
  presence: 'Tô online. Me manda 1 item + qtd.',
  __default: 'Fechado. Item + quantidade e eu sigo.'
};
