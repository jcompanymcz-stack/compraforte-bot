# CompraForte — WhatsApp Bot (Day-0)

Bot mínimo para operar o piloto: recebe listas pelo WhatsApp, registra pedido em CSV e envia confirmações. 
Inclui comandos básicos (*ajuda, pedido, status*), notificação para admins e simulação de comparativo.

## 1) Requisitos
- Node.js 18+
- Uma linha de WhatsApp dedicada para o bot (vai logar via QR Code)
- (Opcional) Admin numbers para receber alertas

## 2) Instalação
```bash
npm i
cp .env.example .env   # edite ADMIN_NUMBERS e BOT_NAME se quiser
npm run start          # aparece um QR no terminal — escaneie no WhatsApp
```

## 3) Comandos (usuário final)
- `ajuda` — mostra o menu
- `pedido <sua lista>` — registra um novo pedido
- `status` — retorna status de coleta

## 4) Comandos (admin)
- `comparativo <pedidoId>` — simula o comparativo (para teste)

**ADMIN_NUMBERS** (no `.env`) deve ter números no formato E.164 sem `@s.whatsapp.net`, ex: `5511999999999,5582988887777`

## 5) Dados e persistência
Os CSVs ficam em `./data` e usam o mesmo esquema das planilhas do piloto.

## 6) Próximos passos
- Comando `cotar` (gravar cotações) e `enviar-comparativo` (gerar real)
- Notificar fornecedor vencedor
- Migrar para Supabase/Postgres quando quiser painel
