// lib/core.js — LLM-first + slot-filling (produto, quantidade, unidade, marca)
// Patch: evita repetição do mesmo prompt em sequência (cooldown) e trata smalltalk.

import { v4 as uuidv4 } from 'uuid';
import { extractOrderFields } from './llm_extract.js';
import { askMissingOrFAQ } from './llm.js';

let TABLES = null;

// Estado por usuário
const S = new Map(); // from -> { stage, draft, pedidoId, lastMsgTs, shortBurst, lastPromptTag, lastPromptAt }

export async function setupCore(tables){
  TABLES = tables;
}

const nowIso = () => new Date().toISOString();
const genPedidoId = () => 'CF-' + uuidv4().slice(0,4).toUpperCase();

function getState(id){
  if (!S.has(id)) S.set(id, { stage: 'initial', draft: {}, pedidoId: null, lastMsgTs: 0, shortBurst: 0, lastPromptTag: '', lastPromptAt: 0 });
  return S.get(id);
}

function missingSlots(d){
  const miss = [];
  if (!d.produto) miss.push('produto');
  if (!d.quantidade) miss.push('quantidade');
  if (!d.unidade) miss.push('unidade');
  return miss;
}

// Envia no máximo 1x o mesmo tipo de prompt em uma janela (ex.: 20s)
async function sendOnce(send, state, tag, text, cooldownMs = 20000){
  const now = Date.now();
  if (state.lastPromptTag === tag && (now - state.lastPromptAt) < cooldownMs){
    return false; // suprime repetição
  }
  await send(text);
  state.lastPromptTag = tag;
  state.lastPromptAt = now;
  return true;
}

export async function onText({ from, text, send }){
  const state = getState(from);
  const t = (text || '').trim();
  const now = Date.now();

  // Anti-flood de pings
  const isPing = /^((al[oô]\?)|(oi\?)|(t[áa] a[ií]\?)|(ta ai\?)|(\?{1,3}))$/i.test(t);
  if (isPing){
    if (now - state.lastMsgTs < 4000) state.shortBurst++; else state.shortBurst = 1;
    state.lastMsgTs = now;
    if (state.shortBurst > 2) return;
  }

  // 0) Smalltalk / cumprimentos – responda uma vez e empurre para a ação
  const isGreeting = /^(ol[aá]|oi|opa|e[ai]|boa noite|bom dia|boa tarde|tudo bem\??)$/i.test(t);
  if (state.stage === 'initial' || state.stage === 'intro' || state.stage === 'collecting'){
    if (isGreeting){
      await sendOnce(send, state, 'greet', 'Oi! Eu busco preços e retorno 2–3 ofertas. Me diga 1 item + quantidade (ex.: "molho 10 cx").');
      state.stage = 'collecting';
      return;
    }
  }

  // 1) Mensagem inicial (primeira do usuário)
  if (state.stage === 'initial'){
    await sendOnce(send, state, 'intro', 'Sou da CompraForte. Eu busco preços e te retorno 2–3 ofertas com frete. Tem comércio de alimentação?');
    state.stage = 'intro';
    return;
  }

  // 2) Sempre tentar extrair campos do pedido via LLM (estrutura JSON)
  try{
    const extracted = await extractOrderFields(t, state.draft);
    if (extracted){
      state.draft = { ...state.draft, ...extracted };
    }
  }catch{ /* silencioso */ }

  // 3) Se já temos todos os slots, grava pedido e pede bairro
  const miss = missingSlots(state.draft);
  if (state.stage !== 'awaiting_neighborhood' && miss.length === 0){
    const pedidoId = genPedidoId();
    state.pedidoId = pedidoId;
    const resumo = `${state.draft.quantidade}${state.draft.unidade} ${state.draft.produto}${state.draft.marca ? ' | marca ' + state.draft.marca : ''}`;

    try{
      await TABLES.pedidos.append({
        pedido_id: pedidoId,
        cliente_id: from,
        data_hora_recebido: nowIso(),
        canal: 'whatsapp',
        itens_texto_livre: resumo,
        status: 'recebido',
        sla_limite_horas: 2,
        data_hora_resposta_enviada: ''
      });
    }catch(e){ console.error('Erro ao gravar pedido:', e.message); }

    await sendOnce(send, state, 'pedido_ok', `✅ Pedido ${pedidoId} registrado: ${resumo}\nQual bairro para calcular frete/prazo?`, 10000);
    state.stage = 'awaiting_neighborhood';
    return;
  }

  // 4) Se estamos aguardando bairro
  if (state.stage === 'awaiting_neighborhood'){
    const bairro = t.replace(/\s+/g,' ').trim();
    if (bairro.length < 2){
      await sendOnce(send, state, 'bairro_agora', 'Qual o **bairro**? Ex.: Ponta Verde, Jatiúca, Centro.');
      return;
    }
    try{
      await TABLES.clientes.append({
        cliente_id: from,
        nome_fantasia: '',
        contato_whatsapp: from,
        bairro: bairro,
        cidade: '',
        perfil_gasto_mensal_estimado: '',
        frequencia_pedidos_semana: '',
        status_piloto: 'ativo',
        data_inicio: nowIso(),
        observacoes: 'auto'
      });
    }catch(e){ /* pode já existir */ }
    await sendOnce(send, state, 'bairro_ok', `Bairro registrado: ${bairro}. Vou buscar 2–3 ofertas e retorno ainda hoje.`, 10000);
    // limpa draft para próxima cotação
    state.draft = {};
    state.stage = 'done';
    return;
  }

  // 5) Caso contrário, peça exatamente o que falta ou responda FAQ via LLM
  const reply = await askMissingOrFAQ(t, state.draft, state.stage);
  if (reply){
    await sendOnce(send, state, 'ask_or_faq', reply);
    // Se usuário disse que NÃO tem comércio, encerramos
    if (/\b(n[aã]o tenho|n[aã]o sou|nao tenho|nao sou)\b/i.test(t)) state.stage = 'done';
    else state.stage = 'collecting';
    return;
  }

  // 6) Fallback (raro) – evita repetir a mesma frase em sequência
  await sendOnce(send, state, 'fallback', 'Vamos começar: qual **produto** você quer cotar? Depois me diga **quantidade + unidade** (ex.: 10kg, 5 cx).');
  state.stage = 'collecting';
}
