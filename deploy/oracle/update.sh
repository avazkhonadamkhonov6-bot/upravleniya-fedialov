#!/usr/bin/env bash
# Нав кардани сайт дар сервер: коди охирин → build → иваз (сайт танҳо чанд сония дастрас нест).
# GitHub Actions (deploy-oracle.yml) инро пас аз ҳар CI-и сабз худкор иҷро мекунад.
set -euo pipefail
cd "$(dirname "$0")"

git -C ../.. pull --ff-only
# Build дар вақти кори версияи кӯҳна — сайт хомӯш намешавад
docker compose build app
docker compose up -d
docker image prune -f >/dev/null

echo "Интизорӣ то сайт тайёр шавад..."
for _ in $(seq 1 40); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)")" = healthy ]; then
    echo "✅ Тайёр: https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
    exit 0
  fi
  sleep 5
done
echo "❌ Сайт дар 200 сония тайёр нашуд. Лог: docker compose -f $(pwd)/docker-compose.yml logs --tail 100 app"
exit 1
