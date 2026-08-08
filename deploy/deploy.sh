#!/usr/bin/env bash
# ============================================================
# Despliegue de la landing (Astro estático) detrás del proxy
# Traefik de Coolify, con HTTPS automático (Let's Encrypt).
#
# Pensado para CLONAR la app a nuevas marcas: solo cambian las
# variables BRAND / DOMAIN / SITE_URL / webhooks.
#
# Requisitos locales: node+npm, ssh, scp, tar.
# Uso:
#   BRAND=couva \
#   DOMAIN=couva.148-72-153-91.sslip.io \
#   VPS=root@148.72.153.91 \
#   SSH_KEY=~/.ssh/vps_coolify_ed25519 \
#   ./deploy/deploy.sh
# ============================================================
set -euo pipefail

# Git Bash (MSYS) convierte valores tipo '/' en rutas de Windows (C:/Program Files/Git),
# lo que corrompe el `base` de Astro y rompe TODOS los assets. Esto lo desactiva.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

BRAND="${BRAND:-couva}"
DOMAIN="${DOMAIN:-couva.148-72-153-91.sslip.io}"
VPS="${VPS:-root@148.72.153.91}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/vps_coolify_ed25519}"
SITE_URL="${SITE_URL:-https://${DOMAIN}}"
N8N_BASE="${N8N_BASE:-https://n8n.148-72-153-91.sslip.io}"
PROXY_NET="${PROXY_NET:-coolify}"        # red compartida del proxy Traefik de Coolify
CERT_RESOLVER="${CERT_RESOLVER:-letsencrypt}"

echo "▶ Build ${BRAND} → ${SITE_URL}"
PUBLIC_SITE_URL="${SITE_URL}" \
PUBLIC_BASE_PATH="/" \
PUBLIC_N8N_WEBHOOK_URL="${N8N_BASE}/webhook/${BRAND}-lead" \
PUBLIC_N8N_CHAT_URL="${N8N_BASE}/webhook/${BRAND}-chat" \
  npm run build

echo "▶ Empaquetar dist"
tar czf "/tmp/${BRAND}-dist.tar.gz" -C dist .

echo "▶ Subir artefactos al VPS"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "/tmp/${BRAND}-dist.tar.gz" "${VPS}:/tmp/${BRAND}-dist.tar.gz"
scp -i "$SSH_KEY" deploy/nginx.conf "${VPS}:/tmp/${BRAND}-nginx.conf"

echo "▶ Desplegar contenedor detrás de Traefik"
ssh -i "$SSH_KEY" "${VPS}" \
  BRAND="$BRAND" DOMAIN="$DOMAIN" PROXY_NET="$PROXY_NET" CERT_RESOLVER="$CERT_RESOLVER" REDIRECT_FROM="${REDIRECT_FROM:-}" 'bash -s' <<'REMOTE'
set -e
DIR="/opt/${BRAND}"
mkdir -p "${DIR}/html"
rm -rf "${DIR}/html"/*
tar xzf "/tmp/${BRAND}-dist.tar.gz" -C "${DIR}/html"
cp "/tmp/${BRAND}-nginx.conf" "${DIR}/nginx.conf"
# Redirección 301 opcional desde un dominio viejo (preserva la ruta).
REDIR=()
if [ -n "${REDIRECT_FROM}" ]; then
  RE="^https?://${REDIRECT_FROM//./\\.}/(.*)"
  REDIR=(
    --label "traefik.http.middlewares.${BRAND}-old.redirectregex.regex=${RE}"
    --label "traefik.http.middlewares.${BRAND}-old.redirectregex.replacement=https://${DOMAIN}/\${1}"
    --label "traefik.http.middlewares.${BRAND}-old.redirectregex.permanent=true"
    --label "traefik.http.routers.${BRAND}-oldhttp.entrypoints=http"
    --label "traefik.http.routers.${BRAND}-oldhttp.rule=Host(\`${REDIRECT_FROM}\`)"
    --label "traefik.http.routers.${BRAND}-oldhttp.middlewares=${BRAND}-old"
    --label "traefik.http.routers.${BRAND}-oldhttps.entrypoints=https"
    --label "traefik.http.routers.${BRAND}-oldhttps.rule=Host(\`${REDIRECT_FROM}\`)"
    --label "traefik.http.routers.${BRAND}-oldhttps.tls=true"
    --label "traefik.http.routers.${BRAND}-oldhttps.tls.certresolver=${CERT_RESOLVER}"
    --label "traefik.http.routers.${BRAND}-oldhttps.middlewares=${BRAND}-old"
  )
fi
docker rm -f "${BRAND}-landing" 2>/dev/null || true
docker run -d --name "${BRAND}-landing" --restart unless-stopped \
  --network "${PROXY_NET}" \
  -v "${DIR}/html:/usr/share/nginx/html:ro" \
  -v "${DIR}/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  --label 'traefik.enable=true' \
  --label "traefik.docker.network=${PROXY_NET}" \
  --label "traefik.http.routers.${BRAND}-http.entrypoints=http" \
  --label "traefik.http.routers.${BRAND}-http.rule=Host(\`${DOMAIN}\`)" \
  --label "traefik.http.routers.${BRAND}-http.middlewares=${BRAND}-redirect" \
  --label "traefik.http.middlewares.${BRAND}-redirect.redirectscheme.scheme=https" \
  --label "traefik.http.routers.${BRAND}-https.entrypoints=https" \
  --label "traefik.http.routers.${BRAND}-https.rule=Host(\`${DOMAIN}\`)" \
  --label "traefik.http.routers.${BRAND}-https.tls=true" \
  --label "traefik.http.routers.${BRAND}-https.tls.certresolver=${CERT_RESOLVER}" \
  --label "traefik.http.services.${BRAND}.loadbalancer.server.port=80" \
  "${REDIR[@]}" \
  nginx:1.27-alpine >/dev/null
echo "✔ ${BRAND}-landing en https://${DOMAIN}${REDIRECT_FROM:+ (301 desde ${REDIRECT_FROM})}"
docker ps --filter "name=${BRAND}-landing" --format '{{.Names}} | {{.Status}}'
REMOTE

echo "✅ Listo → ${SITE_URL}"
