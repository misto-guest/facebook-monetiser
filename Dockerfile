# Dockerfile for Facebook Monetiser on Fly.io
# Using standard Node.js image (not Alpine) for better sqlite3 compatibility

# Use Node.js LTS
FROM node:20

# Install build tools for native modules
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild sqlite3 from source
RUN npm ci \
    && npm rebuild sqlite3 --build-from-source \
    && npm cache clean --force

# Copy application code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/facebook-monetiser.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "backend/server.js"]
