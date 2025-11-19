#!/usr/bin/env bash
set -Eeuo pipefail

# Mata todos os subprocessos quando sair
cleanup() { pkill -P $$ || true; }

trap cleanup EXIT

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

API_URL="${NEXT_PUBLIC_API_URL:-}"
for arg in "$@"; do
  case $arg in
    --api=*)
      API_URL="${arg#*=}"
      ;;
  esac
done
if [[ -n "${API_URL}" ]]; then
  export NEXT_PUBLIC_API_URL="${API_URL}"
  echo "[env] NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
fi

# Se NEXT_PUBLIC_API_URL ainda não estiver setada, tenta ler de frontend/.env.local
if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  FRONT_ENV="${ROOT_DIR}/frontend/.env.local"
  if [[ -f "${FRONT_ENV}" ]]; then
    ENV_API=$(grep -E '^NEXT_PUBLIC_API_URL=' "${FRONT_ENV}" | tail -n1 | cut -d'=' -f2-)
    if [[ -n "${ENV_API}" ]]; then
      export NEXT_PUBLIC_API_URL="${ENV_API}"
      echo "[env] NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} (from frontend/.env.local)"
    fi
  fi
fi

start_proc() {
  local name="$1"; shift
  echo "[$name] starting..."
  (
    cd "$ROOT_DIR/$1" # subdir
    shift
    # Executa comando e prefixa logs com o nome do serviço
    "$@"
  ) \
    > >(sed -u "s/^/[$name] /") \
    2> >(sed -u "s/^/[$name] ERR /" >&2) &
}

# Backend (NestJS)
start_proc "backend" backend npm run start:dev

# Prisma Studio (usa schema do backend)
start_proc "prisma" backend npm run prisma:studio

# Frontend (Next.js)
start_proc "frontend" frontend npm run dev

echo ""
echo "Services are starting..."
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}') || true
echo "- Frontend (localhost): http://localhost:3000"
if [[ -n "${HOST_IP:-}" ]]; then
  echo "- Frontend (IP):        http://${HOST_IP}:3000"
fi
if [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "- API URL:              ${NEXT_PUBLIC_API_URL}"
  # tenta inferir a porta para exibir também o localhost
  api_hostport=$(echo "${NEXT_PUBLIC_API_URL}" | sed -E 's#^https?://##' | cut -d'/' -f1)
  api_port=$(echo "$api_hostport" | awk -F: '{print $2}')
  if [[ -n "$api_port" ]]; then
    echo "- API (localhost):      http://localhost:${api_port}"
  fi
else
  echo "- API URL:              (defina com --api=http://SEU_IP:4000)"
fi
echo "- Prisma Studio (localhost): http://localhost:5555"
if [[ -n "${HOST_IP:-}" ]]; then
  echo "- Prisma Studio (IP):        http://${HOST_IP}:5555"
fi
echo ""
echo "Press Ctrl+C to stop all."

# ===== Bloco final: imprime links quando serviços estiverem prontos =====
print_links() {
  echo "[services] \xE2\x9A\xA1 Aplicação iniciada com sucesso"
  echo "- Frontend (localhost): http://localhost:3000"
  if [[ -n "${HOST_IP:-}" ]]; then
    echo "- Frontend (IP):        http://${HOST_IP}:3000"
  fi
  if [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
    echo "- API URL:              ${NEXT_PUBLIC_API_URL}"
    api_hostport=$(echo "${NEXT_PUBLIC_API_URL}" | sed -E 's#^https?://##' | cut -d'/' -f1)
    api_port=$(echo "$api_hostport" | awk -F: '{print $2}')
    if [[ -n "$api_port" ]]; then
      echo "- API (localhost):      http://localhost:${api_port}"
    fi
  else
    echo "- API URL:              (defina com --api=http://SEU_IP:4000)"
  fi
  echo "- Prisma Studio (localhost): http://localhost:5555"
  if [[ -n "${HOST_IP:-}" ]]; then
    echo "- Prisma Studio (IP):        http://${HOST_IP}:5555"
  fi
}

wait_port() {
  # $1 host, $2 port, $3 timeout seconds
  local host="$1" port="$2" timeout="${3:-60}"
  local start=$(date +%s)
  while :; do
    if (echo > "/dev/tcp/${host}/${port}" ) >/dev/null 2>&1; then
      return 0
    fi
    local now=$(date +%s)
    if (( now - start >= timeout )); then
      return 1
    fi
    sleep 0.5
  done
}

(
  # Assim que o frontend estiver pronto, imprime o bloco final
  if wait_port 127.0.0.1 3000 90; then
    print_links
  fi
) &

# Mensagens incrementais: Prisma pronto
(
  if wait_port 127.0.0.1 5555 90; then
    echo "[services] OK: Prisma Studio em http://localhost:5555"
    if [[ -n "${HOST_IP:-}" ]]; then
      echo "- Prisma Studio (IP): http://${HOST_IP}:5555"
    fi
  fi
) &

# Mensagens incrementais: API pronta (se conhecida)
(
  if [[ -n "${NEXT_PUBLIC_API_URL:-}" ]]; then
    api_hostport=$(echo "$NEXT_PUBLIC_API_URL" | sed -E 's#^https?://##' | cut -d'/' -f1)
    api_host=$(echo "$api_hostport" | cut -d':' -f1)
    api_port=$(echo "$api_hostport" | awk -F: '{print $2}')
    if [[ -n "$api_port" ]]; then
      if wait_port "$api_host" "$api_port" 90; then
        echo "[services] OK: API pronta em ${NEXT_PUBLIC_API_URL}"
        echo "- API (localhost): http://localhost:${api_port}"
      fi
    fi
  fi
) &

# Mantém o script vivo enquanto processos rodam
wait
