// lib/router.js
import { normalizeText } from './normalizer.js';
import { rules, canned, INTENTS, extractOrderHeuristic } from './rules.quick.js';

export function route(textRaw=''){
  const text = normalizeText(textRaw);

  for (const r of rules){
    if (r.pattern.test(text)){
      const intent = r.intent;
      if (intent === INTENTS.PEDIDO_DIRETO){
        const fields = extractOrderHeuristic(text);
        return { matched: true, intent, reply: '', fields };
      }
      const reply = canned[intent] || '';
      return { matched: true, intent, reply };
    }
  }

  return { matched: false, intent: INTENTS.FALLBACK, reply: canned[INTENTS.FALLBACK] };
}
