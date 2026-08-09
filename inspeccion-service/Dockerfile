FROM node:20-alpine
# Chromium para generar el PDF del reporte (Puppeteer) + fuentes (incluye emojis)
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto font-noto-emoji
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
COPY public ./public
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server.js"]
