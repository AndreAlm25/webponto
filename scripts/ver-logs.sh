#!/bin/bash

# Script para VER LOGS do projeto
# Pressione Ctrl+C para sair

# Ir para raiz do projeto
cd "$(dirname "$0")/.."

echo "📋 Mostrando logs do projeto..."
echo "   (Pressione Ctrl+C para sair)"
echo ""

docker compose logs -f
