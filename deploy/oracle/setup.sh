#!/usr/bin/env bash
# Насби якдафъаина дар сервери нави Oracle Cloud (Ubuntu 22.04/24.04, ARM Ampere A1).
# Дар сервер иҷро кунед:
#   curl -fsSL https://raw.githubusercontent.com/avazkhonadamkhonov6-bot/upravleniya-fedialov/main/deploy/oracle/setup.sh | bash
set -euo pipefail

REPO="${REPO:-https://github.com/avazkhonadamkhonov6-bot/upravleniya-fedialov.git}"
DIR="${DIR:-$HOME/filialhub}"

echo "== 1/4 Docker ва git"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 git iptables-persistent >/dev/null
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "== 2/4 Портҳои 80 ва 443 (Ubuntu-и Oracle онҳоро дар iptables мебандад)"
for rule in "-p tcp --dport 80" "-p tcp --dport 443" "-p udp --dport 443"; do
  # shellcheck disable=SC2086
  sudo iptables -C INPUT $rule -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 $rule -j ACCEPT
done
sudo netfilter-persistent save >/dev/null

echo "== 3/4 Код"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
cd "$DIR/deploy/oracle"

if [ ! -f .env ]; then
  cp .env.example .env
  ip="$(curl -fsS https://api.ipify.org)"
  sed -i "s|^DOMAIN=.*|DOMAIN=${ip//./-}.sslip.io|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
fi

if ! grep -q '^DATABASE_URL=..*' .env; then
  echo
  echo "== 4/4 Қадами охирин: $DIR/deploy/oracle/.env-ро кушоед:"
  echo "   nano $DIR/deploy/oracle/.env"
  echo "   DATABASE_URL (Neon) ва дигар калидҳоро аз Render → Environment гузоред, баъд иҷро кунед:"
  echo "   sg docker -c $DIR/deploy/oracle/update.sh"
  exit 0
fi

echo "== 4/4 Сохтан ва ба кор андохтан"
# Гурӯҳи docker танҳо пас аз воридшавии нав кор мекунад — sg онро ҳозир медиҳад
sg docker -c "$DIR/deploy/oracle/update.sh"
