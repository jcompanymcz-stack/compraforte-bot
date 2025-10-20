// lib/dedupe.js — versão SEM dependências externas (funciona em ESM)
// Evita respostas duplicadas: 1 resposta por (remoteJid:id) em ~10 minutos.

const TTL_MS = 10 * 60 * 1000; // 10 minutos
const seen = new Map();        // key -> expiresAt (timestamp ms)

// limpeza periódica para não crescer memória
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of seen.entries()) {
    if (exp <= now) seen.delete(k);
  }
}, 60 * 1000).unref?.(); // roda a cada 60s

export function shouldProcessMessage(msg) {
  try {
    if (!msg || !msg.key) return false;
    if (msg.key.fromMe) return false;       // ignora mensagens enviadas pelo próprio bot
    if (msg.messageStubType) return false;  // ignora mensagens de sistema
    if (!msg.message) return false;

    const jid = msg.key.remoteJid || "";
    const id  = msg.key.id || "";
    if (!jid || !id) return false;

    const key = `${jid}:${id}`;

    if (seen.has(key)) return false;  // já processada
    seen.set(key, Date.now() + TTL_MS);
    return true;
  } catch {
    return false;
  }
}
