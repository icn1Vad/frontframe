FROM node:24.18.0-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_PROOFSPACE_JAVA_SLICE=true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build \
    && npm prune --omit=dev


FROM node:24.18.0-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
