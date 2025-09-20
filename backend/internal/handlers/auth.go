package handlers

import (
	"net/http"
	"strings"

	"mediaVault-backend/internal/models"
	"mediaVault-backend/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	authService  *services.AuthService
	minioService *services.MinioService
}

func NewAuthHandler(authService *services.AuthService, minioService *services.MinioService) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		minioService: minioService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	response, err := h.authService.Register(c.Request.Context(), &req)
	if err != nil {
		// Handle specific Go validation errors
		switch err {
		case models.ErrInvalidEmail:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		case models.ErrInvalidUsername:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid username format"})
		case models.ErrWeakPassword:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
		case models.ErrEmailExists:
			c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		case models.ErrUsernameExists:
			c.JSON(http.StatusConflict, gin.H{"error": "Username already taken"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration failed"})
		}
		return
	}

	// Set refresh token as httpOnly cookie with secure options
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("refresh_token", response.RefreshToken, 7*24*3600, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"user":        response.User,
		"accessToken": response.AccessToken,
		"message":     "User registered successfully",
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		// Handle specific Go authentication errors
		switch err {
		case models.ErrInvalidEmail:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		case models.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Login failed"})
		}
		return
	}

	// Set refresh token as httpOnly cookie with secure options
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("refresh_token", response.RefreshToken, 7*24*3600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"user":        response.User,
		"accessToken": response.AccessToken,
		"message":     "Login successful",
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Try to get refresh token from cookie first
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		// If not in cookie, try to get from body
		var req models.RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token required"})
			return
		}
		refreshToken = req.RefreshToken
	}

	req := &models.RefreshTokenRequest{
		RefreshToken: refreshToken,
	}

	response, err := h.authService.RefreshToken(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Update refresh token cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("refresh_token", response.RefreshToken, 7*24*3600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"user":        response.User,
		"accessToken": response.AccessToken,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear the refresh token cookie
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID.(primitive.ObjectID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user.ToResponse(),
	})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	user, err := h.authService.UpdateProfile(c.Request.Context(), userID.(primitive.ObjectID), &req)
	if err != nil {
		switch err {
		case models.ErrInvalidEmail:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		case models.ErrInvalidUsername:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid username format"})
		case models.ErrEmailExists:
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		case models.ErrUsernameExists:
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Profile update failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":    user.ToResponse(),
		"message": "Profile updated successfully",
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	err := h.authService.ChangePassword(c.Request.Context(), userID.(primitive.ObjectID), &req)
	if err != nil {
		switch err {
		case models.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		case models.ErrWeakPassword:
			c.JSON(http.StatusBadRequest, gin.H{"error": "New password must be at least 6 characters"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Password change failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}

func (h *AuthHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type (images only)
	if !strings.HasPrefix(header.Header.Get("Content-Type"), "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only image files are allowed"})
		return
	}

	// Validate file size (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size must be less than 5MB"})
		return
	}

	// Create media metadata for avatar
	description := "User avatar image"
	category := "avatar"
	metadata := models.CreateMediaRequest{
		Title:       "Avatar - " + header.Filename,
		Description: &description,
		Category:    &category,
		Tags:        []string{"avatar", "profile"},
	}

	// Upload to MinIO using the correct signature
	mediaFile, err := h.minioService.UploadFile(header, metadata, userID.(primitive.ObjectID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload avatar"})
		return
	}

	// Generate URL for the uploaded avatar
	avatarURL, err := h.minioService.GetFileURL(mediaFile.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate avatar URL"})
		return
	}

	// Update user's avatar field with the media file URL
	// Update user's avatar field with the media file URL
	avatarURL := mediaFile.URL
	user, err := h.authService.UpdateProfile(c.Request.Context(), userID.(primitive.ObjectID), &models.UpdateProfileRequest{
		Avatar: &avatarURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":    user.ToResponse(),
		"message": "Avatar updated successfully",
	})
}
