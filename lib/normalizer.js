// lib/normalizer.js
// Normaliza texto "de latido": minúsculas, sem acentos, sem repetição, limpa ruído.
const MAP = new Map([
  ['ñ','n'],['ç','c'],['ß','ss'],
  ['á','a'],['à','a'],['ã','a'],['â','a'],['ä','a'],
  ['é','e'],['è','e'],['ê','e'],['ë','e'],
  ['í','i'],['ì','i'],['î','i'],['ï','i'],
  ['ó','o'],['ò','o'],['õ','o'],['ô','o'],['ö','o'],
  ['ú','u'],['ù','u'],['û','u'],['ü','u']
]);

export function normalizeText(input=''){
  let s = (input || '').toString();

  // remover emojis simples e controle
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // padroniza aspas/barras e pontuação repetida
  s = s.replace(/[“”„"]/g, '"').replace(/[’‘']/g, "'")
       .replace(/[‐‑–—]/g,'-')
       .replace(/[.,!?]{2,}/g, m => m[0]); // !!! -> !

  // minúsculas
  s = s.toLowerCase();

  // remover acentos (fallback manual para ambientes sem normalize NFD)
  try { s = s.normalize('NFD').replace(/\p{Diacritic}/gu,''); } catch {
    s = s.split('').map(ch => MAP.get(ch) ?? ch).join('');
  }

  // colapsar espaços e repetições de letras (oiiiii -> oii)
  s = s.replace(/([a-z])\1{2,}/g, '$1$1');

  // substituir gírias comuns
  s = s.replace(/\bkd[eu]?\b/g, 'cadê')
       .replace(/\bblz\b/g, 'beleza')
       .replace(/\bpq\b/g, 'porque')
       .replace(/\btbm?\b/g, 'tambem')
       .replace(/\bvc\b/g, 'voce')
       .replace(/\bvcs\b/g, 'vocês')
       .replace(/\bqtd\b/g, 'quantidade')
       .replace(/\bnao\b/g, 'não');

  // remover espaços extras
  s = s.replace(/\s+/g,' ').trim();
  return s;
}
