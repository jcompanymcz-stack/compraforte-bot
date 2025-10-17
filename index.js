// index.js — CompraForte (base limpa)
// Inicializa Baileys e delega fluxo para core.onText()

import 'dotenv/config';
import makeWASocket, { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import Pino from 'pino';
import qrcode from 'qrcode-terminal';

import { setupCore, onText } from './lib/core.js';
import { initAll } from './lib/db.js';

const normalize = (jid) => (jid || '').replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');

async function start(){
  const tables = await initAll();
  await setupCore(tables);

  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.windows('Chrome'),
    logger: Pino({ level: 'info' }),
    syncFullHistory: false
  });

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr){ console.log('🟩 Escaneie o QR:'); qrcode.generate(qr, { small: true }); }
    if (connection) console.log('🔗 Conexão:', connection);
    if (lastDisconnect?.error) console.error('❌', lastDisconnect.error?.message || lastDisconnect.error);
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ type, messages }) => {
    if (type !== 'notify') return;
    for (const m of messages){
      try{
        if (!m.message) continue;
        if (m.key.fromMe) continue;

        const jid = m.key.remoteJid;
        const from = normalize(jid);
        const msg = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
        const text = (msg || '').trim();
        if (!text) continue;

        const send = async (t) => sock.sendMessage(jid, { text: t });
        await onText({ from, text, send });
      }catch(e){
        console.error('Erro msg:', e.message);
      }
    }
  });
}

start().catch(err => console.error('FALHA:', err));
