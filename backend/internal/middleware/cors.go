package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Allow specific origins in development (can't use AllowAllOrigins with credentials)
	config.AllowOrigins = []string{
		"http://localhost:3000",
		"http://localhost:5173", // Vite dev server
		"http://127.0.0.1:3000",
		"http://127.0.0.1:5173",
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
