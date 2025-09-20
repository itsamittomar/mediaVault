# Multi-stage Dockerfile for MediaVault on Railway

# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install

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
FROM golang:1.21-alpine AS backend-build
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
FROM alpine:latest
WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy the backend binary
COPY --from=backend-build /app/main .

# Copy the frontend build
COPY --from=frontend-build /app/dist ./static

# Use Railway's $PORT environment variable
EXPOSE $PORT

# Run the application
CMD ["./main"]