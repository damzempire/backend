FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose health endpoint
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "monitor.js"]
