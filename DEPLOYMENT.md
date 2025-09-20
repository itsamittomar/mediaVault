# MediaVault Deployment Guide

This guide covers deploying MediaVault with proper production configuration to avoid localhost hardcoding issues.

## Architecture Overview

MediaVault consists of:
- **Frontend**: React + Vite application
- **Backend**: Go Gin API server
- **Database**: MongoDB
- **Storage**: MinIO (S3-compatible object storage)

## Production Configuration

### Fixed Localhost Issues

The application is now properly configured to work in production environments:

1. **Frontend API Configuration**: Uses environment-based API URLs:
   - Development: `http://localhost:8080/api/v1`
   - Production: `/api/v1` (relative path)
   - Custom: Set `VITE_API_BASE_URL` environment variable

2. **Backend CORS Configuration**: Automatically handles CORS origins:
   - Development: Allows localhost origins
   - Production: Use `CORS_ORIGINS` environment variable

3. **Environment Files Created**:
   - `.env.production`: Template for production deployments
   - `.env.heroku`: Heroku-specific configuration

## Deployment Options

### Option 1: Vercel (Frontend Only) + Separate Backend

**Best for**: Quick frontend deployment with existing backend infrastructure

#### Steps:

1. **Deploy Frontend to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy from root directory
   vercel
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   ```
   VITE_API_BASE_URL=https://your-backend-url.herokuapp.com/api/v1
   ```

3. **Deploy Backend Separately:**
   - Use Heroku, Railway, or any Go hosting service
   - Set up MongoDB Atlas or your preferred database
   - Set up MinIO or AWS S3 for storage

---

### Option 2: Heroku (Full-Stack Container)

**Best for**: Complete application deployment with managed services

#### Prerequisites:

1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku

   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

#### Deploy Steps:

1. **Create Heroku App:**
   ```bash
   heroku create your-mediavault-app
   ```

2. **Set Stack to Container:**
   ```bash
   heroku stack:set container -a your-mediavault-app
   ```

3. **Set Environment Variables:**
   ```bash
   # Server Configuration
   heroku config:set PORT=8080 -a your-mediavault-app
   heroku config:set GIN_MODE=release -a your-mediavault-app

   # MongoDB (use MongoDB Atlas)
   heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/mediavault" -a your-mediavault-app
   heroku config:set MONGODB_DATABASE=mediavault -a your-mediavault-app

   # MinIO/S3 Storage
   heroku config:set MINIO_ENDPOINT="s3.amazonaws.com" -a your-mediavault-app
   heroku config:set MINIO_ACCESS_KEY="your-aws-access-key" -a your-mediavault-app
   heroku config:set MINIO_SECRET_KEY="your-aws-secret-key" -a your-mediavault-app
   heroku config:set MINIO_USE_SSL=true -a your-mediavault-app
   heroku config:set MINIO_BUCKET_NAME="your-bucket-name" -a your-mediavault-app
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

#### Alternative: Using heroku.yml

1. **Enable Container Stack:**
   ```bash
   heroku stack:set container -a your-mediavault-app
   ```

2. **Deploy with heroku.yml:**
   ```bash
   git add heroku.yml
   git commit -m "Add heroku.yml"
   git push heroku main
   ```

---

### Option 3: Railway (Full-Stack)

**Best for**: Modern deployment with built-in database and storage

1. **Connect GitHub Repository to Railway**
2. **Add Environment Variables:**
   ```
   PORT=8080
   GIN_MODE=release
   MONGODB_URI=${{Mongo.DATABASE_URL}}
   MONGODB_DATABASE=mediavault
   MINIO_ENDPOINT=your-s3-endpoint
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_USE_SSL=true
   MINIO_BUCKET_NAME=mediavault
   ```

3. **Deploy automatically on push**

---

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account:** https://www.mongodb.com/atlas
2. **Create Cluster**
3. **Get Connection String:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/mediavault
   ```
4. **Add to Environment Variables**

### Local MongoDB for Development

```bash
# Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
```

---

## Storage Setup

### AWS S3 (Recommended for Production)

1. **Create S3 Bucket**
2. **Create IAM User with S3 permissions**
3. **Get Access Key and Secret Key**
4. **Set Environment Variables:**
   ```
   MINIO_ENDPOINT=s3.amazonaws.com
   MINIO_ACCESS_KEY=your-aws-access-key
   MINIO_SECRET_KEY=your-aws-secret-key
   MINIO_USE_SSL=true
   MINIO_BUCKET_NAME=your-bucket-name
   ```

### MinIO for Development

```bash
# Using Docker
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

---

## Environment Variables Reference

### Backend (.env)
```bash
# Server
PORT=8080
GIN_MODE=release

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mediavault
MONGODB_DATABASE=mediavault

# Storage
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=mediavault
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=https://your-app.herokuapp.com/api/v1
```

---

## Post-Deployment Checklist

1. **Test API Endpoints:**
   ```bash
   curl https://your-app.herokuapp.com/health
   ```

2. **Test File Upload:**
   - Go to your deployed frontend
   - Try uploading a file
   - Verify it appears in your storage bucket

3. **Check Logs:**
   ```bash
   heroku logs --tail -a your-mediavault-app
   ```

4. **Monitor Performance:**
   - Set up monitoring for API response times
   - Monitor database connection pool
   - Monitor storage usage

---

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Ensure CORS is configured for your frontend domain
   - Check that API_BASE_URL is correct

2. **Database Connection:**
   - Verify MongoDB URI is correct
   - Check if IP addresses are whitelisted in MongoDB Atlas

3. **Storage Issues:**
   - Verify MinIO/S3 credentials
   - Check bucket permissions
   - Ensure bucket exists

4. **Build Failures:**
   - Check that all dependencies are in package.json
   - Verify Go module is properly configured
   - Check Docker build logs

### Getting Help:

- Check application logs: `heroku logs --tail`
- Verify environment variables: `heroku config`
- Test database connectivity separately
- Test storage connectivity separately

---

## Security Considerations

1. **Environment Variables:**
   - Never commit secrets to version control
   - Use strong, unique passwords
   - Rotate credentials regularly

2. **Database Security:**
   - Use connection strings with authentication
   - Restrict database access to your application IPs
   - Enable database encryption

3. **Storage Security:**
   - Use signed URLs for file access
   - Implement proper access controls
   - Enable bucket encryption

4. **API Security:**
   - Implement rate limiting
   - Use HTTPS only
   - Validate all input data
   - Implement proper CORS policies