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
	client     *minio.Client
	bucketName string
	region     string
}

func NewMinioService(cfg *config.Config) (*MinioService, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
		Region: cfg.MinioRegion,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	service := &MinioService{
		client:     client,
		bucketName: cfg.MinioBucketName,
		region:     cfg.MinioRegion,
	}

	// Ensure bucket exists
	if err := service.ensureBucketExists(); err != nil {
		return nil, fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	return service, nil
}

func (ms *MinioService) ensureBucketExists() error {
	ctx := context.Background()

	exists, err := ms.client.BucketExists(ctx, ms.bucketName)
	if err != nil {
		return fmt.Errorf("failed to check if bucket exists: %w", err)
	}

	if !exists {
		err = ms.client.MakeBucket(ctx, ms.bucketName, minio.MakeBucketOptions{Region: ms.region})
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
		}`, ms.bucketName)

		err = ms.client.SetBucketPolicy(ctx, ms.bucketName, policy)
		if err != nil {
			log.Printf("Warning: Failed to set bucket policy: %v", err)
		}
	}

	return nil
}

func (ms *MinioService) UploadFile(file *multipart.FileHeader, metadata models.CreateMediaRequest, userID primitive.ObjectID) (*models.MediaFile, error) {
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

	// Upload to MinIO
	_, err = ms.client.PutObject(
		context.Background(),
		ms.bucketName,
		fileName,
		src,
		file.Size,
		minio.PutObjectOptions{
			ContentType:  file.Header.Get("Content-Type"),
			UserMetadata: minioMetadata,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to MinIO: %w", err)
	}

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
	url, err := ms.client.PresignedGetObject(
		context.Background(),
		ms.bucketName,
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
	err := ms.client.RemoveObject(
		context.Background(),
		ms.bucketName,
		fileName,
		minio.RemoveObjectOptions{},
	)
	if err != nil {
		return fmt.Errorf("failed to delete file from MinIO: %w", err)
	}

	return nil
}

func (ms *MinioService) GetFileContent(fileName string) (io.ReadCloser, error) {
	obj, err := ms.client.GetObject(
		context.Background(),
		ms.bucketName,
		fileName,
		minio.GetObjectOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get file from MinIO: %w", err)
	}

	return obj, nil
}

func (ms *MinioService) GetFileInfo(fileName string) (*minio.ObjectInfo, error) {
	info, err := ms.client.StatObject(
		context.Background(),
		ms.bucketName,
		fileName,
		minio.StatObjectOptions{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info from MinIO: %w", err)
	}

	return &info, nil
}
