package middleware

import (
	"net/http"
	"strings"

	"mediaVault-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// ValidateRegistration validates registration request
func ValidateRegistration() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": "Please provide valid JSON data",
			})
			c.Abort()
			return
		}

		// Custom Go validation
		if err := req.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set("validated_request", req)
		c.Next()
	}
}

// ValidateLogin validates login request
func ValidateLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": "Please provide valid JSON data",
			})
			c.Abort()
			return
		}

		// Custom Go validation
		if err := req.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set("validated_request", req)
		c.Next()
	}
}

// ValidateProfileUpdate validates profile update request
func ValidateProfileUpdate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": "Please provide valid JSON data",
			})
			c.Abort()
			return
		}

		// Ensure at least one field is provided
		if req.Username == "" && req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": "At least one field (username or email) must be provided",
			})
			c.Abort()
			return
		}

		// Custom Go validation
		if err := req.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set("validated_request", req)
		c.Next()
	}
}

// ValidatePasswordChange validates password change request
func ValidatePasswordChange() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": "Please provide valid JSON data",
			})
			c.Abort()
			return
		}

		// Check if passwords are the same
		if req.CurrentPassword == req.NewPassword {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": "New password must be different from current password",
			})
			c.Abort()
			return
		}

		// Custom Go validation
		if err := req.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set("validated_request", req)
		c.Next()
	}
}

// ValidateFileUpload validates file upload requests
func ValidateFileUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse multipart form
		if err := c.Request.ParseMultipartForm(100 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid file upload",
				"details": "Failed to parse multipart form (max 100MB)",
			})
			c.Abort()
			return
		}

		// Get the file
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "File required",
				"details": "No file provided in the request",
			})
			c.Abort()
			return
		}

		// Validate file size (100MB max)
		if file.Size > 100<<20 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "File too large",
				"details": "File size must be less than 100MB",
			})
			c.Abort()
			return
		}

		// Store file info in context
		c.Set("uploaded_file", file)
		c.Next()
	}
}

// ValidateAvatarUpload validates avatar upload requests
func ValidateAvatarUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse multipart form
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid avatar upload",
				"details": "Failed to parse multipart form (max 10MB)",
			})
			c.Abort()
			return
		}

		// Get the avatar file
		file, err := c.FormFile("avatar")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Avatar file required",
				"details": "No avatar file provided in the request",
			})
			c.Abort()
			return
		}

		// Validate file size (10MB max for avatars)
		if file.Size > 10<<20 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Avatar too large",
				"details": "Avatar file size must be less than 10MB",
			})
			c.Abort()
			return
		}

		// Validate file type (images only)
		contentType := file.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid file type",
				"details": "Avatar must be an image file (JPEG, PNG, GIF, etc.)",
			})
			c.Abort()
			return
		}

		// Store file info in context
		c.Set("avatar_file", file)
		c.Next()
	}
}

// SecurityHeaders adds security headers to responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers for Go backend
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Don't cache sensitive endpoints
		if strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth") ||
		   strings.HasPrefix(c.Request.URL.Path, "/api/v1/profile") {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		}

		c.Next()
	}
}

// RateLimitByIP implements basic rate limiting (simplified version)
func RateLimitByIP() gin.HandlerFunc {
	// In production, use Redis or similar for distributed rate limiting
	return func(c *gin.Context) {
		// This is a simplified rate limiter
		// In production, implement proper rate limiting with Redis/Memcached
		c.Next()
	}
}