// lib/llm.js — guia LLM-first: responde FAQs em 2 linhas e pergunta só o que falta
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

let MODEL = process.env.MODEL_NAME || 'gpt-4o-mini';
if (MODEL === 'gpt-3.5') MODEL = 'gpt-3.5-turbo';
if (MODEL === 'gpt-4') MODEL = 'gpt-4-turbo';

const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 320);
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE || 0.2);

let SYSTEM = '';
try{
  const sys = fs.readFileSync(path.resolve('./prompts/system.txt'), 'utf8');
  const about = fs.readFileSync(path.resolve('./prompts/sobre.txt'), 'utf8');
  SYSTEM = `Você é o assistente da CompraForte no WhatsApp. Fale curto e direto.
${sys}

Identidade:
${about}

Regras finais:
- Responda SEMPRE em até 2 linhas, sem enrolar.
- Se a mensagem do usuário for pergunta/FAQ (ex.: "quem é você?", "vocês são distribuidores?", "cobram?"), responda objetivamente e termine com CTA para enviar item + quantidade.
- Se a mensagem puder completar campos do pedido, **pergunte EXATAMENTE o(s) campo(s) que faltam** (entre: produto, quantidade, unidade, marca). Não refaça a conversa do zero.
- Ex.: se só faltar unidade, pergunte: "Falta a unidade (kg/cx/un/l). Qual é?"
- Não peça bairro antes do pedido estar completo.`;
}catch{
  SYSTEM = 'Você é o assistente da CompraForte. Responda em até 2 linhas e peça só o que falta (produto/quantidade/unidade/marca).';
}

let client = null;
function getClient(){
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * Pergunta exatamente os slots que faltam OU responde FAQ curto com CTA.
 * @param {string} userText
 * @param {{produto?:string, quantidade?:number, unidade?:string, marca?:string}} draft
 * @param {string} stage
 * @returns {string|null}
 */
export async function askMissingOrFAQ(userText, draft={}, stage=''){
  const c = getClient();
  if (!c) return null;

  const user = [
    `Mensagem do usuário: ${userText}`,
    `Stage: ${stage}`,
    `Draft atual: ${JSON.stringify(draft)}`,
    `Tarefa: Se for FAQ, responda curto e feche com CTA (item + quantidade). Se puder completar o pedido, pergunte só os slots que faltam (entre: produto, quantidade, unidade, marca).`
  ].join('\n');

  try{
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user }
      ]
    });
    let out = res?.choices?.[0]?.message?.content?.trim();
    if (!out) return null;
    let lines = out.split('\n').map(s=>s.trim()).filter(Boolean);
    if (lines.length > 2) lines = lines.slice(0,2);
    out = lines.join('\n');
    console.log(`[LLM] Guide (${MODEL}): "${out.replace(/\n/g,' \\n ')}"`);
    return out;
  }catch(e){
    console.error('[LLM] askMissingOrFAQ erro:', e?.response?.data || e.message);
    return null;
  }
}
