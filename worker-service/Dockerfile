# Multi-stage Dockerfile for Worker Service
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY worker-service/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# Copy production node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./worker-service/node_modules
COPY worker-service ./worker-service
COPY common ./common

WORKDIR /app/worker-service

ENV NODE_ENV=production

CMD ["node", "src/worker.js"]
