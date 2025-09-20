package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"mediaVault-backend/internal/middleware"
	"mediaVault-backend/internal/models"
	"mediaVault-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type MediaHandler struct {
	dbService    *services.DatabaseService
	minioService *services.MinioService
}

func NewMediaHandler(dbService *services.DatabaseService, minioService *services.MinioService) *MediaHandler {
	return &MediaHandler{
		dbService:    dbService,
		minioService: minioService,
	}
}

// UploadFile handles file upload
func (h *MediaHandler) UploadFile(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	// Parse multipart form
	err = c.Request.ParseMultipartForm(100 << 20) // 100MB
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	// Get the file from form data
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Parse metadata from form data
	var metadata models.CreateMediaRequest

	metadata.Title = c.PostForm("title")
	if metadata.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	if description := c.PostForm("description"); description != "" {
		metadata.Description = &description
	}

	if category := c.PostForm("category"); category != "" {
		metadata.Category = &category
	}

	// Parse tags from JSON string
	if tagsStr := c.PostForm("tags"); tagsStr != "" {
		var tags []string
		if err := json.Unmarshal([]byte(tagsStr), &tags); err == nil {
			metadata.Tags = tags
		}
	}

	// Upload to MinIO
	mediaFile, err := h.minioService.UploadFile(file, metadata, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file: " + err.Error()})
		return
	}

	// Save to database
	err = h.dbService.CreateMediaFile(c.Request.Context(), mediaFile)
	if err != nil {
		// If DB save fails, try to clean up the uploaded file
		_ = h.minioService.DeleteFile(mediaFile.FileName)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata: " + err.Error()})
		return
	}

	// Get file URL
	url, err := h.minioService.GetFileURL(mediaFile.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file URL"})
		return
	}
	mediaFile.URL = url

	c.JSON(http.StatusCreated, mediaFile)
}

// GetFile retrieves a single file by ID
func (h *MediaHandler) GetFile(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	id := c.Param("id")

	mediaFile, err := h.dbService.GetMediaFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if the file belongs to the current user
	if mediaFile.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Get file URL
	url, err := h.minioService.GetFileURL(mediaFile.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file URL"})
		return
	}
	mediaFile.URL = url

	c.JSON(http.StatusOK, mediaFile)
}

// ListFiles retrieves files with pagination and filtering
func (h *MediaHandler) ListFiles(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	var query models.MediaQuery

	// Parse query parameters manually to avoid strict validation
	query.Category = c.Query("category")
	query.Type = c.Query("type")
	query.Search = c.Query("search")

	// Parse page with default
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			query.Page = page
		} else {
			query.Page = 1
		}
	} else {
		query.Page = 1
	}

	// Parse limit with default
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			query.Limit = limit
		} else {
			query.Limit = 20
		}
	} else {
		query.Limit = 20
	}

	// Get files from database
	mediaFiles, err := h.dbService.ListMediaFiles(c.Request.Context(), userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve files"})
		return
	}

	// Get total count
	totalCount, err := h.dbService.CountMediaFiles(c.Request.Context(), userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count files"})
		return
	}

	// Generate URLs for all files
	for _, mediaFile := range mediaFiles {
		if url, err := h.minioService.GetFileURL(mediaFile.FileName); err == nil {
			mediaFile.URL = url
		}
	}

	// Calculate pagination info
	totalPages := (totalCount + int64(query.Limit) - 1) / int64(query.Limit)

	response := gin.H{
		"files": mediaFiles,
		"pagination": gin.H{
			"page":       query.Page,
			"limit":      query.Limit,
			"total":      totalCount,
			"totalPages": totalPages,
			"hasNext":    query.Page < int(totalPages),
			"hasPrev":    query.Page > 1,
		},
	}

	c.JSON(http.StatusOK, response)
}

// UpdateFile updates file metadata
func (h *MediaHandler) UpdateFile(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	id := c.Param("id")

	// First check if the file exists and belongs to the user
	existingFile, err := h.dbService.GetMediaFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	if existingFile.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var updates models.UpdateMediaRequest
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	mediaFile, err := h.dbService.UpdateMediaFile(c.Request.Context(), id, &updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file: " + err.Error()})
		return
	}

	// Get file URL
	url, err := h.minioService.GetFileURL(mediaFile.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file URL"})
		return
	}
	mediaFile.URL = url

	c.JSON(http.StatusOK, mediaFile)
}

// DeleteFile deletes a file
func (h *MediaHandler) DeleteFile(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	id := c.Param("id")

	// Get file info first
	mediaFile, err := h.dbService.GetMediaFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if the file belongs to the current user
	if mediaFile.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Delete from MinIO
	if err := h.minioService.DeleteFile(mediaFile.FileName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file from storage"})
		return
	}

	// Delete from database
	if err := h.dbService.DeleteMediaFile(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file metadata"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// DownloadFile serves the file content
func (h *MediaHandler) DownloadFile(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	id := c.Param("id")

	mediaFile, err := h.dbService.GetMediaFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if the file belongs to the current user
	if mediaFile.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Get file content from MinIO
	reader, err := h.minioService.GetFileContent(mediaFile.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file content"})
		return
	}
	defer reader.Close()

	// Set appropriate headers
	c.Header("Content-Disposition", "attachment; filename=\""+mediaFile.OriginalName+"\"")
	c.Header("Content-Type", mediaFile.MimeType)
	c.Header("Content-Length", strconv.FormatInt(mediaFile.Size, 10))

	// Stream the file content
	c.DataFromReader(http.StatusOK, mediaFile.Size, mediaFile.MimeType, reader, nil)
}

// GetCategories retrieves all available categories
func (h *MediaHandler) GetCategories(c *gin.Context) {
	// Get current user ID
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User authentication required"})
		return
	}

	categories, err := h.dbService.GetCategories(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// HealthCheck endpoint for service health
func (h *MediaHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "media-vault-backend",
	})
}
