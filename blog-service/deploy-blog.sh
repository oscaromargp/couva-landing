#!/usr/bin/env bash
# ============================================================
# Despliega el servicio de blog (SSR + editor tipo Shopify) en el VPS,
# detrás del proxy Traefik de Coolify, con HTTPS automático.
# Enruta  Host(DOMAIN) && PathPrefix(/blog)  → contenedor del blog,
# sin tocar la landing estática (que sigue sirviendo el resto).
#
# Uso:
#   BRAND=couva \
#   DOMAIN=couva.148-72-153-91.sslip.io \
#   VPS=root@148.72.153.91 \
#   SSH_KEY=~/.ssh/vps_coolify_ed25519 \
#   ADMIN_USER=oscaromargp \
#   ADMIN_HASH=<sha256-hex-de-tu-contraseña> \
#   ./blog-service/deploy-blog.sh
# ============================================================
set -euo pipefail

BRAND="${BRAND:-couva}"
DOMAIN="${DOMAIN:-couva.148-72-153-91.sslip.io}"
VPS="${VPS:-root@148.72.153.91}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/vps_coolify_ed25519}"
ADMIN_USER="${ADMIN_USER:-oscaromargp}"
ADMIN_HASH="${ADMIN_HASH:?Define ADMIN_HASH = sha256(hex) de la contraseña del panel}"
PROXY_NET="${PROXY_NET:-coolify}"
CERT_RESOLVER="${CERT_RESOLVER:-letsencrypt}"

echo "▶ Empaquetar blog-service"
tar czf "/tmp/${BRAND}-blog-service.tar.gz" -C blog-service .
scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "/tmp/${BRAND}-blog-service.tar.gz" "${VPS}:/tmp/${BRAND}-blog-service.tar.gz"

echo "▶ Construir y levantar en el VPS"
ssh -i "$SSH_KEY" "$VPS" \
  BRAND="$BRAND" DOMAIN="$DOMAIN" ADMIN_USER="$ADMIN_USER" ADMIN_HASH="$ADMIN_HASH" \
  PROXY_NET="$PROXY_NET" CERT_RESOLVER="$CERT_RESOLVER" 'bash -s' <<'REMOTE'
set -e
DIR="/opt/${BRAND}"
mkdir -p "${DIR}/blog-service" "${DIR}/blog/posts" "${DIR}/uploads"
tar xzf "/tmp/${BRAND}-blog-service.tar.gz" -C "${DIR}/blog-service"
cd "${DIR}/blog-service"
docker build -q -t "${BRAND}-blog:latest" . >/dev/null
SF="${DIR}/blog.secret"; [ -f "$SF" ] || openssl rand -hex 24 > "$SF"
docker rm -f "${BRAND}-blog" 2>/dev/null || true
docker run -d --name "${BRAND}-blog" --restart unless-stopped \
  --network "${PROXY_NET}" \
  -v "${DIR}/blog/posts:/data/posts" -v "${DIR}/uploads:/data/uploads" \
  -e "SITE_URL=https://${DOMAIN}" -e "BRAND=${BRAND} · PardeSantos" \
  -e "ADMIN_USER=${ADMIN_USER}" -e "ADMIN_HASH=${ADMIN_HASH}" -e "BLOG_SECRET=$(cat "$SF")" \
  --label traefik.enable=true --label "traefik.docker.network=${PROXY_NET}" \
  --label "traefik.http.routers.${BRAND}blog.entrypoints=https" \
  --label "traefik.http.routers.${BRAND}blog.rule=Host(\`${DOMAIN}\`) && PathPrefix(\`/blog\`)" \
  --label "traefik.http.routers.${BRAND}blog.priority=1000" \
  --label "traefik.http.routers.${BRAND}blog.tls=true" \
  --label "traefik.http.routers.${BRAND}blog.tls.certresolver=${CERT_RESOLVER}" \
  --label "traefik.http.services.${BRAND}blog.loadbalancer.server.port=8080" \
  "${BRAND}-blog:latest" >/dev/null
docker ps --filter "name=${BRAND}-blog" --format '{{.Names}} | {{.Status}}'
REMOTE

echo "✅ Blog → https://${DOMAIN}/blog   ·   Editor → https://${DOMAIN}/blog/admin"
