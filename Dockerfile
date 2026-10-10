FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
# Cloud Run corre una sola instancia; SQLite y fotos viven en su disco hasta que la instancia reinicia.
ENV PARTPROOF_DB=/tmp/partproof/partproof.sqlite PARTPROOF_UPLOADS=/tmp/partproof/photos
CMD ["sh", "-c", "exec npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
