package main

import (
	"log"
	"net/http"

	"mediaVault-backend/internal/config"
	"mediaVault-backend/internal/handlers"
	"mediaVault-backend/internal/middleware"
	"mediaVault-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize database service
	dbService, err := services.NewDatabaseService(cfg.MongoURI, cfg.MongoDatabase)
	if err != nil {
		log.Fatal("Failed to initialize database service:", err)
	}
	defer dbService.Close()

	// Initialize MinIO service
	minioService, err := services.NewMinioService(cfg)
	if err != nil {
		log.Fatal("Failed to initialize MinIO service:", err)
	}

	// Initialize handlers
	mediaHandler := handlers.NewMediaHandler(dbService, minioService)

	// Create Gin router
	router := gin.New()

	// Add middleware
	router.Use(middleware.CORSMiddleware())
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// Health check endpoint
	router.GET("/health", mediaHandler.HealthCheck)

	// API routes
	api := router.Group("/api/v1")
	{
		// Media endpoints
		media := api.Group("/media")
		{
			media.POST("/upload", mediaHandler.UploadFile)
			media.GET("", mediaHandler.ListFiles)  // Remove the trailing slash
			media.GET("/", mediaHandler.ListFiles) // Keep both for compatibility
			media.GET("/:id", mediaHandler.GetFile)
			media.PUT("/:id", mediaHandler.UpdateFile)
			media.DELETE("/:id", mediaHandler.DeleteFile)
			media.GET("/:id/download", mediaHandler.DownloadFile)
		}

		// Categories endpoint
		api.GET("/categories", mediaHandler.GetCategories)
	}

	// Start server
	log.Printf("Starting server on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}