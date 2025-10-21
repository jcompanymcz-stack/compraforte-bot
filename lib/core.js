// lib/core.js — Integrado com router determinístico e LLM opcional
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
const genPedidoId = () => 'CF-' + uuidv4().slice(0, 4).toUpperCase()

function getState(id) {
  if (!S.has(id))
    S.set(id, {
      stage: 'initial',
      draft: {},
      pedidoId: null,
      lastPromptAt: 0,
      lastPromptTag: ''
    })
  return S.get(id)
}

async function sendOnce(send, state, tag, text, cooldownMs = 20000) {
  const now = Date.now()
  if (state.lastPromptTag === tag && now - state.lastPromptAt < cooldownMs)
    return false
  await send(text)
  state.lastPromptTag = tag
  state.lastPromptAt = now
  return true
}

export async function onText({ from, text, send }) {
  const state = getState(from)
  const clean = (text || '').trim()

  // === 1) Router determinístico (rápido e barato) ===
  const r = route(clean)
  if (r.matched) {
    // resposta direta
    if (r.reply) await sendOnce(send, state, r.intent, r.reply)

    // pedido direto detectado
    if (r.fields) {
      state.draft = { ...state.draft, ...r.fields }
      const pedidoId = genPedidoId()
      state.pedidoId = pedidoId
      const resumo = `${state.draft.quantidade}${state.draft.unidade} ${state.draft.produto}`
      try {
        await TABLES.pedidos.append({
          pedido_id: pedidoId,
          cliente_id: from,
          data_hora_recebido: nowIso(),
          canal: 'whatsapp',
          itens_texto_livre: resumo,
          status: 'recebido',
          sla_limite_horas: 2,
          data_hora_resposta_enviada: ''
        })
      } catch (e) {
        console.error('Erro ao gravar pedido:', e.message)
      }
      await sendOnce(
        send,
        state,
        'pedido_ok',
        `✅ Pedido ${pedidoId} registrado: ${resumo}\nQual bairro para calcular frete/prazo?`,
        10000
      )
      state.stage = 'awaiting_neighborhood'
    }
    return
  }

  // === 2) Se o router não entendeu, tenta LLM extraction opcional ===
  try {
    const extracted = await extractOrderFields(clean, state.draft)
    if (extracted) state.draft = { ...state.draft, ...extracted }
  } catch {}

  const hasProduto = !!state.draft.produto
  const hasQtd = !!state.draft.quantidade
  const hasUn = !!state.draft.unidade

  // todos presentes → registra pedido
  if (hasProduto && hasQtd && hasUn) {
    const pedidoId = genPedidoId()
    state.pedidoId = pedidoId
    const resumo = `${state.draft.quantidade}${state.draft.unidade} ${state.draft.produto}`
    try {
      await TABLES.pedidos.append({
        pedido_id: pedidoId,
        cliente_id: from,
        data_hora_recebido: nowIso(),
        canal: 'whatsapp',
        itens_texto_livre: resumo,
        status: 'recebido',
        sla_limite_horas: 2,
        data_hora_resposta_enviada: ''
      })
    } catch (e) {
      console.error('Erro ao gravar pedido:', e.message)
    }
    await sendOnce(
      send,
      state,
      'pedido_ok',
      `✅ Pedido ${pedidoId} registrado: ${resumo}\nQual bairro para calcular frete/prazo?`,
      10000
    )
    state.stage = 'awaiting_neighborhood'
    return
  }

  // 3) LLM auxiliar para perguntas soltas
  const reply = await askMissingOrFAQ(clean, state.draft, state.stage)
  if (reply) {
    await sendOnce(send, state, 'faq', reply)
    return
  }

  // 4) fallback
  await sendOnce(
    send,
    state,
    'fallback',
    'Vamos começar: qual *produto* você quer cotar? Depois me diga *quantidade + unidade* (ex.: 10kg, 5 cx).'
  )
}
