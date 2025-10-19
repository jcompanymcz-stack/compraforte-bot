import LRU from 'lru-cache';

// guarda as últimas mensagens por 10 minutos
const seen = new LRU({ max: 5000, ttl: 1000 * 60 * 10 });

export function shouldProcessMessage(msg) {
  if (!msg || !msg.key) return false;
  if (msg.key.fromMe) return false; // ignora mensagens enviadas pelo próprio bot
  if (msg.messageStubType) return false; // ignora mensagens de sistema
  if (!msg.message) return false;

  const jid = msg.key.remoteJid || '';
  const id = msg.key.id || '';
  const key = `${jid}:${id}`;

  if (seen.has(key)) return false; // se já respondeu, sai
  seen.set(key, true);             // marca como respondida
  return true;                     // se chegou até aqui, pode responder
}
