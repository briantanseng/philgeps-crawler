# Use Node.js Alpine image for smaller size
FROM node:20-alpine

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory (will be overridden by volume mount if DATABASE_TYPE=sqlite3)
RUN mkdir -p data /data

# Cloud Run uses PORT environment variable
ENV PORT=8080

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
# Also prepare /data directory for GCS mount
RUN chown -R nodejs:nodejs /data || true
USER nodejs

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "src/index.js"]