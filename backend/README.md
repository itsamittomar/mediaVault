# MediaVault Backend

A Go-based backend service for MediaVault that provides file upload/download functionality with MinIO storage and MongoDB for metadata.

## Prerequisites

- Go 1.21 or higher
- MongoDB (running on localhost:27017)
- MinIO server (running on localhost:9000)

## Setup

1. **Install dependencies:**
   ```bash
   make deps
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and adjust the values as needed.

3. **Start required services:**

   **MongoDB:**
   ```bash
   # Using Docker
   docker run -d --name mongodb -p 27017:27017 mongo:latest

   # Or install locally and start
   mongod
   ```

   **MinIO:**
   ```bash
   # Using Docker
   docker run -d --name minio \
     -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"

   # Or download and run locally
   # Download from https://min.io/download
   ./minio server ./data --console-address ":9001"
   ```

## Running the Application

### Development
```bash
make dev
```

### Production Build
```bash
make build
make run
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Media Management
- `POST /api/v1/media/upload` - Upload a file
- `GET /api/v1/media` - List files (with pagination and filtering)
- `GET /api/v1/media/:id` - Get file metadata
- `PUT /api/v1/media/:id` - Update file metadata
- `DELETE /api/v1/media/:id` - Delete file
- `GET /api/v1/media/:id/download` - Download file

### Categories
- `GET /api/v1/categories` - Get all categories

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `GIN_MODE` | `debug` | Gin framework mode |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `mediavault` | MongoDB database name |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_USE_SSL` | `false` | Use SSL for MinIO connection |
| `MINIO_BUCKET_NAME` | `mediavault` | MinIO bucket name |

## File Upload Example

```bash
curl -X POST http://localhost:8080/api/v1/media/upload \
  -F "file=@example.jpg" \
  -F "title=My Image" \
  -F "description=A sample image" \
  -F "category=image" \
  -F "tags=[\"nature\", \"photography\"]"
```

## Development

The application automatically creates the MongoDB collection and MinIO bucket on startup.

For development with hot reload, you can use [air](https://github.com/cosmtrek/air):

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```