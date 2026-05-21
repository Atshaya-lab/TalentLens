FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create .next directory
RUN mkdir -p .next

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001 || exit 1

# Start the application
CMD ["npm", "run", "dev"]
