package middleware

import (
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Get CORS origins from environment variable
	corsOrigins := os.Getenv("CORS_ORIGINS")

	if corsOrigins != "" {
		// Production: use configured origins
		if corsOrigins == "*" {
			config.AllowAllOrigins = true
		} else {
			config.AllowOrigins = strings.Split(corsOrigins, ",")
		}
	} else {
		// Development: allow localhost origins
		config.AllowOrigins = []string{
			"http://localhost:3000",
			"http://localhost:5173", // Vite dev server
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5173",
		}
	}

	// Allow specific headers
	config.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Content-Length",
		"Accept-Encoding",
		"Authorization",
		"Cache-Control",
		"X-Requested-With",
	}

	// Allow specific methods
	config.AllowMethods = []string{
		"GET",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"OPTIONS",
	}

	// Allow credentials
	config.AllowCredentials = true

	return cors.New(config)
}
