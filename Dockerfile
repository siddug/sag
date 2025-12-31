# Use the official Node.js image (non-Alpine to avoid native module issues)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install build tools for native modules on ARM64
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

# Rebuild better-sqlite3 for ARM64
RUN npm rebuild better-sqlite3

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3456

# Ensure database directory exists and copy database if it exists
RUN mkdir -p /app/prisma && cp /app/dev.db /app/prisma/dev.db 2>/dev/null || true

# Command to run the application
CMD ["npm", "run", "dev"]