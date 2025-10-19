// lib/rules.quick.js
export const quickRules = [
  { pattern:/^(ol[aá]|oi|opa|bom dia|boa tarde|boa noite)$/i,
    reply:"Oi! Eu busco preços e retorno 2–3 ofertas. Me diga 1 item + quantidade (ex.: 'molho de tomate 20 cx').",
    tag:"greet" },

  { pattern:/^(quem (?:é|e) você|com quem falo|o que é isso|da onde fala)$/i,
    reply:"CompraForte — cotação B2B rápida p/ alimentação. Você pede um item e eu volto com 2–3 ofertas com frete/prazo.",
    tag:"identity" },

  { pattern:/^(n[aã]o|nope|negativo)$/i,
    reply:"Sem problema. Se for comércio de alimentação (pizzaria, lanchonete, padaria), posso cotar. Tem interesse?",
    tag:"negation" },

  { pattern:/pizz(ar)?ia/i,
    reply:"Perfeito — atendo pizzarias sim. Qual item da sua lista quer cotar primeiro? (ex.: caixa de mussarela 15kg, tomate pelado 10 cx)",
    tag:"pizza_probe" },

  { pattern:/\?{1,3}$/i,
    reply:"Tô aqui 👋. Envie 1 item + quantidade (ex.: 'farinha 25 sacos').",
    tag:"presence" },

  { pattern:/(quanto custa|voc[eê]s cobram|mensalidade|[eé] de gra[çc]a)/i,
    reply:"É grátis p/ você. Eu cobro do fornecedor. Bora começar? Item + quantidade.",
    tag:"pricing" },
];

export function quickRule(text){
  const t=(text||"").trim();
  for(const r of quickRules){ if(r.pattern.test(t)) return {reply:r.reply, tag:r.tag}; }
  return null;
}
