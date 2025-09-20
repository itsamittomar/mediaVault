package handlers

import (
	"net/http"

	"mediaVault-backend/internal/models"
	"mediaVault-backend/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.authService.Register(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set refresh token as httpOnly cookie
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Set refresh token as httpOnly cookie
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
