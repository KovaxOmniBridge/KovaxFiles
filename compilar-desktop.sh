#!/bin/bash

echo "========================================================"
echo "  KOVAXFILES DESKTOP — COMPILAÇÃO NATIVA MAC & LINUX"
echo "========================================================"
echo ""

echo "[1/3] Instalando dependências..."
npm install

echo "[2/3] Compilando assets e TypeScript..."
npm run build

echo "[3/3] Gerando pacotes macOS (.dmg) e Linux (.AppImage)..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  npm run package:mac
else
  npm run package:linux
fi

echo ""
echo "========================================================"
echo "  SUCESSO! Pacotes gerados na pasta: release/"
echo "========================================================"
