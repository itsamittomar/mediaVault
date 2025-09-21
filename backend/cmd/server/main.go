package main

import (
	"log"
	"net/http"
	"os"
	"strings"

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

	// Initialize JWT service
	jwtService := services.NewJWTService(cfg.JWTSecret)

	// Initialize auth service
	authService := services.NewAuthService(dbService, jwtService)

	// Initialize filter services
	filterService := services.NewFilterService(dbService.GetDatabase(), minioService)

	// Initialize AI filter service with configured provider
	aiProvider := services.AIProvider(os.Getenv("AI_PROVIDER"))
	if aiProvider == "" {
		aiProvider = services.ProviderLocal
	}

	var apiKey string
	switch aiProvider {
	case services.ProviderHuggingFace:
		apiKey = os.Getenv("HUGGINGFACE_API_KEY")
	case services.ProviderStability:
		apiKey = os.Getenv("STABILITY_AI_API_KEY")
	case services.ProviderOpenAI:
		apiKey = os.Getenv("OPENAI_AI_API_KEY")
	default:
		aiProvider = services.ProviderLocal
		apiKey = ""
	}

	log.Printf("Initializing AI service with provider: %s", aiProvider)
	aiFilterService := services.NewAIFilterService(aiProvider, apiKey)

	// Initialize handlers
	mediaHandler := handlers.NewMediaHandler(dbService, minioService)
	authHandler := handlers.NewAuthHandler(authService, minioService)
	filterHandler := handlers.NewFilterHandler(dbService.GetDatabase(), filterService, aiFilterService)

	// Create Gin router
	router := gin.New()

	// Add middleware
	router.Use(middleware.CORSMiddleware())
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// Health check endpoint
	router.GET("/health", mediaHandler.HealthCheck)

	// MinIO test endpoint (public for debugging)
	router.GET("/test-minio", mediaHandler.TestMinIO)

	// API routes
	api := router.Group("/api/v1")
	{
		// Public auth endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtService))
		{
			// User profile management
			protected.GET("/profile", authHandler.GetProfile)
			protected.PUT("/profile", authHandler.UpdateProfile)
			protected.POST("/profile/change-password", authHandler.ChangePassword)
			protected.POST("/profile/avatar", authHandler.UploadAvatar)

			// Media endpoints (now protected)
			media := protected.Group("/media")
			{
				media.POST("/upload", mediaHandler.UploadFile)
				media.GET("", mediaHandler.ListFiles)  // Remove the trailing slash
				media.GET("/", mediaHandler.ListFiles) // Keep both for compatibility
				media.GET("/:id", mediaHandler.GetFile)
				media.PUT("/:id", mediaHandler.UpdateFile)
				media.DELETE("/:id", mediaHandler.DeleteFile)
				media.GET("/:id/download", mediaHandler.DownloadFile)
			}

			// Categories endpoint (now protected)
			protected.GET("/categories", mediaHandler.GetCategories)

			// Filter endpoints
			filters := protected.Group("/filters")
			{
				filters.GET("/presets", filterHandler.GetFilterPresets)
				filters.POST("/custom", filterHandler.CreateCustomFilter)
			}

			// Media filter endpoints - use different base path to avoid conflict
			mediaFilters := protected.Group("/filters/media/:mediaId")
			{
				mediaFilters.POST("/apply/:filterId", filterHandler.ApplyFilter)
				mediaFilters.GET("/suggestions", filterHandler.GetFilterSuggestions)
			}

			// AI filter endpoints
			aiFilters := protected.Group("/ai-filters/media/:mediaId")
			{
				aiFilters.POST("/style-transfer", filterHandler.ApplyAIStyleTransfer)
				aiFilters.POST("/mood-enhancement", filterHandler.ApplyAIMoodEnhancement)
			}

			// User filter analytics endpoints
			userFilters := protected.Group("/users/me/filters")
			{
				userFilters.GET("/analytics", filterHandler.GetUserFilterAnalytics)
				userFilters.GET("/history", filterHandler.GetFilterHistory)
				userFilters.POST("/style-profile", filterHandler.UpdateUserStyleProfile)
			}
		}
	}

	// Serve static files for production deployment
	router.Static("/assets", "./static/assets")         // Serve assets directory
	router.StaticFile("/vite.svg", "./static/vite.svg") // Serve favicon
	router.NoRoute(func(c *gin.Context) {
		// Check if the request is for static assets first
		path := c.Request.URL.Path
		if gin.Mode() == gin.ReleaseMode && !gin.IsDebugging() {
			// For SPA support, serve index.html for non-API, non-asset routes
			if !strings.HasPrefix(path, "/api") && !strings.HasPrefix(path, "/assets") && !strings.Contains(path, ".") {
				c.File("./static/index.html")
				return
			}
		}
		c.JSON(404, gin.H{"error": "Route not found"})
	})

	// Start server
	log.Printf("Starting server on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
