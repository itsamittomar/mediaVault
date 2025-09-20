package main

import (
	"log"
	"net/http"
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

	// Initialize handlers
	mediaHandler := handlers.NewMediaHandler(dbService, minioService)
	authHandler := handlers.NewAuthHandler(authService, minioService)

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
			// User profile endpoints
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
