// lib/core.js — Router determinístico + bairro ANTES do protocolo (orçamento)
// Trocas de texto: 'pedido' -> 'orçamento'; protocolo só após confirmar bairro.

import { v4 as uuidv4 } from 'uuid'
import { extractOrderFields } from './llm_extract.js'
import { askMissingOrFAQ } from './llm.js'
import { route } from './router.js'

let TABLES = null
const S = new Map()

export async function setupCore(tables) {
  TABLES = tables
}

const nowIso = () => new Date().toISOString()
const genProtocolo = () => 'CF-' + uuidv4().slice(0, 4).toUpperCase()

function getState(id) {
  if (!S.has(id))
    S.set(id, {
      stage: 'initial',     // initial -> collecting -> awaiting_neighborhood -> done
      draft: {},            // { produto, quantidade, unidade, marca, bairro? }
      protocolo: null,
      lastPromptAt: 0,
      lastPromptTag: ''
    })
  return S.get(id)
}

async function sendOnce(send, state, tag, text, cooldownMs = 15000) {
  const now = Date.now()
  if (state.lastPromptTag === tag && now - state.lastPromptAt < cooldownMs)
    return false
  await send(text)
  state.lastPromptTag = tag
  state.lastPromptAt = now
  return true
}

function hasSlots(d){
  return !!(d?.produto && d?.quantidade && d?.unidade)
}

export async function onText({ from, text, send }) {
  const state = getState(from)
  const clean = (text || '').trim()

  // === 1) Router determinístico ===
  const r = route(clean)
  if (r.matched) {
    // respostas informativas (não-orçamento)
    if (r.reply && r.intent !== 'pedido_direto') {
      await sendOnce(send, state, r.intent, r.reply)
      if (state.stage === 'initial') state.stage = 'collecting'
      return
    }

    // pedido direto detectado -> guarda slots, PEDE BAIRRO (NÃO cria protocolo ainda)
    if (r.fields) {
      state.draft = { ...state.draft, ...r.fields }
      await sendOnce(
        send, state, 'ask_bairro',
        'Beleza. Se tiver marca preferida, me diga. Qual **bairro** para calcular frete e prazo?'
      )
      state.stage = 'awaiting_neighborhood'
      return
    }
  }

  // === 2) Se router não resolveu, tenta extrair via LLM (opcional) ===
  if (!hasSlots(state.draft)) {
    try {
      const extracted = await extractOrderFields(clean, state.draft)
      if (extracted) state.draft = { ...state.draft, ...extracted }
    } catch {}
  }

  // === 3) Se já temos produto+quantidade+unidade mas falta bairro, peça bairro ===
  if (hasSlots(state.draft) && state.stage !== 'awaiting_neighborhood' && !state.draft.bairro) {
    await sendOnce(send, state, 'ask_bairro', 'Qual **bairro** para calcular frete e prazo?')
    state.stage = 'awaiting_neighborhood'
    return
  }

  // === 4) Receber bairro e só então gerar protocolo + persistir orçamento ===
  if (state.stage === 'awaiting_neighborhood') {
    const bairro = clean.replace(/\s+/g,' ').trim()
    if (bairro.length < 2 || /^(bairro|centro|cidade)$/i.test(bairro)) {
      await sendOnce(send, state, 'ask_bairro_again', 'Me diga o **bairro** (ex.: Ponta Verde, Jatiúca, Tabuleiro).')
      return
    }

    // evita reprocessar se usuário repetir o bairro
    if (!state.draft.bairro) state.draft.bairro = bairro

    // criar protocolo e salvar agora
    if (!state.protocolo) state.protocolo = genProtocolo()
    const resumo = `${state.draft.quantidade}${state.draft.unidade} ${state.draft.produto}${state.draft.marca ? ' | marca ' + state.draft.marca : ''}`

    // persistência
    try {
      await TABLES.pedidos.append({
        pedido_id: state.protocolo,               // mantendo nome da coluna
        cliente_id: from,
        data_hora_recebido: nowIso(),
        canal: 'whatsapp',
        itens_texto_livre: `${resumo} | bairro: ${state.draft.bairro}`,
        status: 'recebido',
        sla_limite_horas: 2,
        data_hora_resposta_enviada: ''
      })
      // opcional: salvar/atualizar cliente
      try {
        await TABLES.clientes.append({
          cliente_id: from,
          contato_whatsapp: from,
          bairro: state.draft.bairro,
          cidade: '',
          status_piloto: 'ativo',
          data_inicio: nowIso(),
          observacoes: 'auto'
        })
      } catch {}
    } catch (e) {
      console.error('Erro ao gravar orçamento:', e.message)
    }

    await sendOnce(
      send, state, 'orcamento_ok',
      `✅ Seu **orçamento** ${state.protocolo} foi registrado: ${resumo}\nBairro: ${state.draft.bairro}. Vou buscar 2–3 ofertas e retorno ainda hoje.`,
      8000
    )

    // preparar para próximo item
    state.stage = 'done'
    state.draft = {}
    state.protocolo = null
    return
  }

  // === 5) LLM auxiliar para perguntas soltas ===
  const reply = await askMissingOrFAQ(clean, state.draft, state.stage)
  if (reply) {
    await sendOnce(send, state, 'faq', reply)
    if (state.stage === 'initial') state.stage = 'collecting'
    return
  }

  // === 6) Fallback controlado ===
  await sendOnce(
    send, state, 'fallback',
    'Vamos começar: qual *produto* você quer cotar? Depois me diga *quantidade + unidade* (ex.: 10kg, 5 cx).'
  )
  state.stage = 'collecting'
}
