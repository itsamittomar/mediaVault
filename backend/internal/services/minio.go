package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"path/filepath"
	"time"

	"mediaVault-backend/internal/config"
	"mediaVault-backend/internal/models"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MinioService struct {
	Client     *minio.Client
	BucketName string
	region     string
}

func NewMinioService(cfg *config.Config) (*MinioService, error) {
	log.Printf("MinIO Config - Endpoint: %s, SSL: %t, Region: %s, Bucket: %s",
		cfg.MinioEndpoint, cfg.MinioUseSSL, cfg.MinioRegion, cfg.MinioBucketName)
	log.Printf("MinIO AccessKey length: %d, SecretKey length: %d",
		len(cfg.MinioAccessKey), len(cfg.MinioSecretKey))

	// Create MinIO client options
	opts := &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	}

	// Only set region if not empty - let AWS SDK auto-detect for S3
	if cfg.MinioRegion != "" {
		opts.Region = cfg.MinioRegion
	}

	client, err := minio.New(cfg.MinioEndpoint, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	service := &MinioService{
		Client:     client,
		BucketName: cfg.MinioBucketName,
		region:     cfg.MinioRegion,
	}

	// Test connection with a simple bucket list operation
	log.Printf("Testing MinIO connection...")
	ctx := context.Background()
	buckets, err := client.ListBuckets(ctx)
	if err != nil {
		log.Printf("MinIO connection test failed: %v", err)
		return nil, fmt.Errorf("failed to connect to MinIO (check credentials): %w", err)
	}
	log.Printf("MinIO connection successful. Found %d buckets", len(buckets))

	// Ensure bucket exists
	if err := service.ensureBucketExists(); err != nil {
		return nil, fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	return service, nil
}

func (ms *MinioService) ensureBucketExists() error {
	ctx := context.Background()

	exists, err := ms.Client.BucketExists(ctx, ms.BucketName)
	if err != nil {
		return fmt.Errorf("failed to check if bucket exists: %w", err)
	}

	if !exists {
		err = ms.Client.MakeBucket(ctx, ms.BucketName, minio.MakeBucketOptions{Region: ms.region})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}

		// Set bucket policy to allow public read access
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, ms.BucketName)

		err = ms.Client.SetBucketPolicy(ctx, ms.BucketName, policy)
		if err != nil {
			log.Printf("Warning: Failed to set bucket policy: %v", err)
		}
	}

	return nil
}

func (ms *MinioService) UploadFile(file *multipart.FileHeader, metadata models.CreateMediaRequest, userID primitive.ObjectID) (*models.MediaFile, error) {
	log.Printf("UploadFile - File: %s, Size: %d, ContentType: %s",
		file.Filename, file.Size, file.Header.Get("Content-Type"))

	// Open the file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Generate unique filename
	fileID := uuid.New()
	ext := filepath.Ext(file.Filename)
	fileName := fmt.Sprintf("%s%s", fileID.String(), ext)

	log.Printf("Generated filename: %s for bucket: %s", fileName, ms.BucketName)

	// Prepare MinIO metadata (only user metadata, not system headers)
	minioMetadata := map[string]string{
		"X-Amz-Meta-Original": file.Filename,
		"X-Amz-Meta-Title":    metadata.Title,
	}

	if metadata.Description != nil {
		minioMetadata["X-Amz-Meta-Description"] = *metadata.Description
	}
	if metadata.Category != nil {
		minioMetadata["X-Amz-Meta-Category"] = *metadata.Category
	}
	if metadata.Tags != nil && len(metadata.Tags) > 0 {
		// Convert tags slice to comma-separated string
		tagsStr := ""
		for i, tag := range metadata.Tags {
			if i > 0 {
				tagsStr += ","
			}
			tagsStr += tag
		}
		minioMetadata["X-Amz-Meta-Tags"] = tagsStr
	}

	// Upload to MinIO with timeout
	log.Printf("Attempting to upload %s to bucket %s (region: %s)", fileName, ms.BucketName, ms.region)

	// Create context with timeout for upload
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	_, err = ms.Client.PutObject(
		ctx,
		ms.BucketName,
		fileName,
		src,
		file.Size,
		minio.PutObjectOptions{
			ContentType:  file.Header.Get("Content-Type"),
			UserMetadata: minioMetadata,
		},
	)
	if err != nil {
		log.Printf("MinIO upload failed: %v", err)
		return nil, fmt.Errorf("failed to upload file to MinIO: %w", err)
	}
	log.Printf("MinIO upload successful for %s", fileName)

	// Create MediaFile struct
	mediaFile := &models.MediaFile{
		FileName:     fileName,
		OriginalName: file.Filename,
		Title:        metadata.Title,
		Description:  metadata.Description,
		MimeType:     file.Header.Get("Content-Type"),
		Size:         file.Size,
		Category:     metadata.Category,
		Tags:         metadata.Tags,
		UserID:       userID,
	}

	return mediaFile, nil
}

func (ms *MinioService) GetFileURL(fileName string) (string, error) {
	url, err := ms.Client.PresignedGetObject(
		context.Background(),
		ms.BucketName,
		fileName,
		7*24*time.Hour, // 7 days expiry
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url.String(), nil
}

func (ms *MinioService) DeleteFile(fileName string) error {
	err := ms.Client.RemoveObject(
		context.Background(),
		ms.BucketName,
		fileName,
		minio.RemoveObjectOptions{},
	)
	if err != nil {
		return fmt.Errorf("failed to delete file from MinIO: %w", err)
	}

	return nil
}

func (ms *MinioService) GetFileContent(fileName string) (io.ReadCloser, error) {
	obj, err := ms.Client.GetObject(
		context.Background(),
		ms.BucketName,
		fileName,
		minio.GetObjectOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get file from MinIO: %w", err)
	}

	return obj, nil
}

func (ms *MinioService) GetFileInfo(fileName string) (*minio.ObjectInfo, error) {
	info, err := ms.Client.StatObject(
		context.Background(),
		ms.BucketName,
		fileName,
		minio.StatObjectOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info from MinIO: %w", err)
	}

	return &info, nil
}
