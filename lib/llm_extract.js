// lib/llm_extract.js — extração de campos do pedido via LLM (gpt-4o-mini, curto)
import OpenAI from 'openai';

const MODEL = process.env.MODEL_NAME || 'gpt-4o-mini';
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE || 0.1);
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 200);

let client = null;
function getClient(){
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * Extrai {produto, quantidade, unidade, marca?} de uma mensagem curta.
 * Retorna apenas campos confiáveis. Unidades aceitas: kg, cx, un, l.
 */
export async function extractOrderFields(text, currentDraft={}){
  const c = getClient();
  if (!c) return null;

  const sys = `Você extrai campos de pedido para um bot de WhatsApp da CompraForte.
Retorne JSON válido com chaves: produto (string), quantidade (number), unidade (string em {kg,cx,un,l}), marca (string opcional).
Se não tiver certeza, não invente — omita o campo.
Se houver só a marca ("marca Fina"), retorne {"marca":"Fina"}.
Se vier separado ("Farinha de trigo" depois "100 kg"), entenda e normalize.`;

  const user = `Mensagem: """${text}"""
Draft atual (pode complementar): ${JSON.stringify(currentDraft)}`;

  try{
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    });
    const content = res?.choices?.[0]?.message?.content || '{}';
    const obj = JSON.parse(content);
    const out = {};
    if (typeof obj.produto === 'string' && obj.produto.trim().length >= 3) out.produto = obj.produto.trim().toLowerCase();
    if (typeof obj.quantidade === 'number' && obj.quantidade > 0) out.quantidade = obj.quantidade;
    if (typeof obj.unidade === 'string' && ['kg','cx','un','l'].includes(obj.unidade)) out.unidade = obj.unidade;
    if (typeof obj.marca === 'string' && obj.marca.trim().length >= 2) out.marca = obj.marca.trim();
    return Object.keys(out).length ? out : null;
  }catch(e){
    console.error('[LLM-EXTRACT] Erro:', e?.response?.data || e.message);
    return null;
  }
}
