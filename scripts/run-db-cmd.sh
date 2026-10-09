#!/usr/bin/env bash
# Wrapper para scripts TS do StudyMoon no sandbox:
# 1) injeta DATABASE_URL do .env (o sandbox tem um DATABASE_URL orfao que sobrescreveria)
# 2) contorna o KI-010 (tsx/esbuild EPIPE) usando bun (TS nativo + aliases tsconfig)
# Uso: bash scripts/run-db-cmd.sh scripts/seed.ts
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [[ -z "$DB_URL" || "$DB_URL" == *"[YOUR-PASSWORD]"* ]]; then
  echo "ERRO: DATABASE_URL ausente ou com placeholder no .env" >&2
  exit 1
fi
export DATABASE_URL="$DB_URL"

# env real tem precedencia sobre .env no bun tambem, entao o export acima garante o valor certo
exec bun "$@"
