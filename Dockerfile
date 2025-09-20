# Multi-stage Dockerfile for MediaVault on Railway

# Stage 1: Build the React frontend
FROM node:18-slim AS frontend-build
WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Workaround for npm optional dependencies bug
RUN rm -f package-lock.json && \
    npm cache clean --force && \
    npm install --no-optional && \
    npm install @rollup/rollup-linux-x64-gnu --save-optional

# Copy frontend source (exclude backend and node_modules)
COPY src ./src
COPY index.html ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig*.json ./
COPY components.json ./

# Build the frontend
RUN npm run build

# Stage 2: Build the Go backend
FROM golang:1.24-alpine AS backend-build
WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy backend source
COPY backend/ ./

# Download Go dependencies
RUN go mod download

# Build the backend binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/server/main.go

# Stage 3: Production image
FROM node:18-slim
WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apt-get update && \
    apt-get install -y ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*

# Copy the backend binary
COPY --from=backend-build /app/main .

# Copy the frontend build
COPY --from=frontend-build /app/dist ./static

# Make binary executable
RUN chmod +x ./main

# Use Railway's $PORT environment variable
EXPOSE 8080