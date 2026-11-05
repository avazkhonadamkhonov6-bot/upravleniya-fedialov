# FilialHub дар сервери худ (Oracle Cloud Always Free, ARM). Сайт ва API дар як контейнер — мисли Render.
# Сохтан аз решаи репозиторий: docker compose -f deploy/oracle/docker-compose.yml build
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Аввал танҳо package.json-ҳо — то вобастагиҳо аз кеши Docker гирифта шаванд, агар тағйир наёфта бошанд
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --include=dev

COPY . .

# Сайт инҳоро ҳангоми build менависад (rewrites ба API, canonical/SEO, сервери TURN барои занг)
ARG SITE_URL
ARG NEXT_PUBLIC_TURN_URL=""
ARG NEXT_PUBLIC_TURN_USERNAME=""
ARG NEXT_PUBLIC_TURN_CREDENTIAL=""
ENV SITE_URL=$SITE_URL \
    API_URL=http://127.0.0.1:4100 \
    NEXT_PUBLIC_TURN_URL=$NEXT_PUBLIC_TURN_URL \
    NEXT_PUBLIC_TURN_USERNAME=$NEXT_PUBLIC_TURN_USERNAME \
    NEXT_PUBLIC_TURN_CREDENTIAL=$NEXT_PUBLIC_TURN_CREDENTIAL
RUN npm run build

ENV NODE_ENV=production \
    API_PORT=4100 \
    PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start:docker"]
