# Multi-stage Dockerfile for API Service
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install build dependencies if needed
COPY api-service/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy production node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./api-service/node_modules
COPY api-service ./api-service
COPY common ./common

WORKDIR /app/api-service

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
