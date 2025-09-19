.PHONY: build run dev clean deps

# Build the application
build:
	go build -o bin/server ./cmd/server

# Run the application
run: build
	./bin/server

# Run in development mode with hot reload (if using air)
dev:
	go run ./cmd/server

# Install dependencies
deps:
	go mod download
	go mod tidy

# Clean build artifacts
clean:
	rm -rf bin/

# Initialize Go modules (run once)
init:
	go mod init mediaVault-backend
	go mod tidy

# Test the application
test:
	go test -v ./...

# Build for production
build-prod:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/server ./cmd/server