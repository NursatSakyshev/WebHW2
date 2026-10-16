# Small official base image
FROM node:20-alpine

# Working directory inside the container
WORKDIR /app

# Non-secret defaults; DB credentials are passed at runtime by compose.yaml
ENV NODE_ENV=production \
    PORT=3000

# Copy only dependency manifests first to use Docker layer caching:
# dependencies are reinstalled only when package*.json changes
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src ./src
COPY public ./public

# Run as the non-root user provided by the node image
USER node

# Document the port the app listens on
EXPOSE 3000

# Check that the app responds and the database is reachable
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "src/server.js"]
