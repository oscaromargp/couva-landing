#!/usr/bin/env bash
# ============================================================
# Despliega el servicio de inspección PDI en el VPS, detrás de
# Traefik/Coolify, en su propio dominio con HTTPS automático.
#
# Uso:
#   DOMAIN=couva.oscaromargp.xyz \
#   VPS=root@148.72.153.91 \
#   SSH_KEY=~/.ssh/vps_coolify_ed25519 \
#   ADMIN_USER=oscaromargp \
#   ADMIN_HASH=<sha256-hex> \
#   ./inspeccion-service/deploy-inspeccion.sh
# ============================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

DOMAIN="${DOMAIN:-couva.oscaromargp.xyz}"
VPS="${VPS:-root@148.72.153.91}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/vps_coolify_ed25519}"
ADMIN_USER="${ADMIN_USER:-oscaromargp}"
ADMIN_HASH="${ADMIN_HASH:?Define ADMIN_HASH = sha256(hex) de la contraseña}"
PROXY_NET="${PROXY_NET:-coolify}"
CERT_RESOLVER="${CERT_RESOLVER:-letsencrypt}"
SSH="ssh -F /dev/null -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

echo "▶ Empaquetar inspeccion-service"
tar czf /tmp/couva-inspeccion.tar.gz -C inspeccion-service .
scp -F /dev/null -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new /tmp/couva-inspeccion.tar.gz "${VPS}:/tmp/couva-inspeccion.tar.gz"

echo "▶ Construir y levantar en el VPS"
$SSH "$VPS" DOMAIN="$DOMAIN" ADMIN_USER="$ADMIN_USER" ADMIN_HASH="$ADMIN_HASH" PROXY_NET="$PROXY_NET" CERT_RESOLVER="$CERT_RESOLVER" 'bash -s' <<'REMOTE'
set -e
DIR="/opt/couva/inspeccion-service"
mkdir -p "$DIR" /opt/couva/inspecciones-data
rm -rf "$DIR"/* ; tar xzf /tmp/couva-inspeccion.tar.gz -C "$DIR"
cd "$DIR"
docker build -q -t couva-inspeccion:latest . >/dev/null
SF=/opt/couva/inspeccion.secret; [ -f "$SF" ] || openssl rand -hex 24 > "$SF"
OR=""; [ -f /opt/couva/openrouter.key ] && OR=$(cat /opt/couva/openrouter.key)
TGT=""; [ -f /opt/couva/tg.token ] && TGT=$(cat /opt/couva/tg.token)
TGC=""; [ -f /opt/couva/tg.chat ] && TGC=$(cat /opt/couva/tg.chat)
docker rm -f couva-inspeccion 2>/dev/null || true
docker run -d --name couva-inspeccion --restart unless-stopped \
  --network "$PROXY_NET" \
  -v /opt/couva/inspecciones-data:/data \
  -e "SITE_URL=https://${DOMAIN}" -e "ADMIN_USER=${ADMIN_USER}" -e "ADMIN_HASH=${ADMIN_HASH}" -e "APP_SECRET=$(cat "$SF")" \
  ${OR:+-e OPENROUTER_API_KEY=$OR} \
  ${TGT:+-e TELEGRAM_BOT_TOKEN=$TGT} ${TGC:+-e TELEGRAM_CHAT_ID=$TGC} \
  --label traefik.enable=true --label "traefik.docker.network=${PROXY_NET}" \
  --label "traefik.http.routers.pdi-http.entrypoints=http" \
  --label "traefik.http.routers.pdi-http.rule=Host(\`${DOMAIN}\`)" \
  --label "traefik.http.routers.pdi-http.middlewares=pdi-redirect" \
  --label "traefik.http.middlewares.pdi-redirect.redirectscheme.scheme=https" \
  --label "traefik.http.routers.pdi-https.entrypoints=https" \
  --label "traefik.http.routers.pdi-https.rule=Host(\`${DOMAIN}\`)" \
  --label "traefik.http.routers.pdi-https.tls=true" \
  --label "traefik.http.routers.pdi-https.tls.certresolver=${CERT_RESOLVER}" \
  --label "traefik.http.services.pdi.loadbalancer.server.port=8080" \
  couva-inspeccion:latest >/dev/null
sleep 2; docker ps --filter name=couva-inspeccion --format '{{.Names}} | {{.Status}}'
REMOTE
echo "✅ PDI → https://${DOMAIN}"
