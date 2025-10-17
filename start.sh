#!/bin/bash
echo "🚀 Iniciando CompraForte bot..."
mkdir -p /data/auth

# copia a sessão local para o volume, se existir
if [ -d "./auth" ]; then
  echo "📦 Copiando sessão ./auth → /data/auth"
  cp -r ./auth/* /data/auth/
fi

# inicia o bot normalmente
node index.js
