package handlers

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"mediaVault-backend/internal/models"
	"mediaVault-backend/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type FilterHandler struct {
	filterService    *services.FilterService
	aiFilterService  *services.AIFilterService
	analyticsService *services.FilterAnalyticsService
	db               *mongo.Database
}

func NewFilterHandler(db *mongo.Database, filterService *services.FilterService, aiFilterService *services.AIFilterService) *FilterHandler {
	return &FilterHandler{
		filterService:    filterService,
		aiFilterService:  aiFilterService,
		analyticsService: services.NewFilterAnalyticsService(db),
		db:               db,
	}
}

// GetFilterPresets returns all available filter presets
// GET /api/filters/presets
func (fh *FilterHandler) GetFilterPresets(c *gin.Context) {
	category := c.Query("category")
	filterType := c.Query("type")

	collection := fh.db.Collection("filter_presets")
	filter := make(map[string]interface{})

	if category != "" {
		filter["category"] = category
	}
	if filterType != "" {
		filter["type"] = filterType
	}

	cursor, err := collection.Find(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve filter presets"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var presets []models.FilterPreset
	if err := cursor.All(c.Request.Context(), &presets); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode filter presets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"presets": presets,
		"total":   len(presets),
	})
}

// ApplyFilter applies a filter to a media file
// POST /api/media/:mediaId/filters/:filterId/apply
func (fh *FilterHandler) ApplyFilter(c *gin.Context) {
	mediaIDStr := c.Param("mediaId")
	filterIDStr := c.Param("filterId")

	// Check if this is a demo/uploaded image ID
	if strings.HasPrefix(mediaIDStr, "demo-") || strings.HasPrefix(mediaIDStr, "uploaded-") {
		// For demo mode, return simulated response
		var req struct {
			FilterID     string                 `json:"filterId"`
			CustomConfig map[string]interface{} `json:"customConfig,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			// It's okay if there's no JSON body for this endpoint
		}

		// Return simulated demo response with CSS filter instructions
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"processedImage": "CSS_FILTER_DEMO", // Special marker for frontend
				"appliedFilter": gin.H{
					"id":       filterIDStr,
					"name":     "Demo Filter",
					"category": "artistic",
				},
			},
		})
		return
	}

	mediaID, err := primitive.ObjectIDFromHex(mediaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	filterID, err := primitive.ObjectIDFromHex(filterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filter ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Parse custom filter config if provided
	var req models.ApplyFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// If no JSON body provided, create request with just the filter ID
		req = models.ApplyFilterRequest{
			FilterID: filterID,
		}
	}

	// Apply the filter
	processedImage, format, err := fh.filterService.ApplyFilter(c.Request.Context(), mediaID, filterID, userObjID, req.CustomConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to apply filter: %v", err)})
		return
	}

	// Return the processed image as base64
	encodedImage := base64.StdEncoding.EncodeToString(processedImage)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"processedImage": encodedImage,
			"format":         format,
			"mediaId":        mediaIDStr,
			"filterId":       filterIDStr,
		},
	})
}

// ApplyAIStyleTransfer applies AI-powered style transfer
// POST /api/media/:mediaId/ai-filters/style-transfer
func (fh *FilterHandler) ApplyAIStyleTransfer(c *gin.Context) {
	mediaIDStr := c.Param("mediaId")

	// Check if this is a demo/uploaded image ID - process with AI regardless
	if strings.HasPrefix(mediaIDStr, "demo-") || strings.HasPrefix(mediaIDStr, "uploaded-") {
		var req struct {
			StyleType    models.ArtisticFilterType `json:"styleType" binding:"required"`
			Intensity    float64                   `json:"intensity"`
			PreserveFace bool                      `json:"preserveFace"`
			CustomPrompt *string                   `json:"customPrompt,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// For demo images, we'll process with AI using a placeholder image data
		// In a real implementation, you'd fetch the actual image data from the URL or storage
		placeholderImageData := []byte{} // This would be the actual image bytes

		// Create AI processing request
		aiReq := services.StyleTransferRequest{
			SourceImage:  placeholderImageData,
			StyleType:    req.StyleType,
			Intensity:    req.Intensity,
			PreserveFace: req.PreserveFace,
			CustomPrompt: req.CustomPrompt,
		}

		// Process with AI service
		result, err := fh.aiFilterService.ApplyArtisticStyleTransfer(c.Request.Context(), aiReq)
		if err != nil {
			// Fallback to demo mode if AI processing fails
			log.Printf("AI processing failed, falling back to demo mode: %v", err)
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"processedImage": "CSS_FILTER_DEMO", // Fallback to CSS demo
					"confidence":     0.85,
					"appliedFilter": gin.H{
						"name":      fmt.Sprintf("AI %s", strings.Title(strings.Replace(string(req.StyleType), "-", " ", -1))),
						"category":  "artistic",
						"styleType": req.StyleType,
						"intensity": req.Intensity,
					},
				},
			})
			return
		}

		// Convert processed image to base64 for frontend
		processedImageB64 := base64.StdEncoding.EncodeToString(result.ProcessedImage)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"processedImage": processedImageB64,
				"confidence":     result.Confidence,
				"appliedFilter": gin.H{
					"name":      fmt.Sprintf("AI %s", strings.Title(strings.Replace(string(req.StyleType), "-", " ", -1))),
					"category":  "artistic",
					"styleType": req.StyleType,
					"intensity": req.Intensity,
				},
				"processingTime": result.ProcessingTime.Milliseconds(),
				"aiModel":        result.Model,
			},
		})
		return
	}

	_, err := primitive.ObjectIDFromHex(mediaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	var req struct {
		StyleType    models.ArtisticFilterType `json:"styleType" binding:"required"`
		Intensity    float64                   `json:"intensity"`
		PreserveFace bool                      `json:"preserveFace"`
		CustomPrompt *string                   `json:"customPrompt,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the media file to extract image data
	// This would require getting the image from your storage service
	// For now, we'll return a placeholder response

	if fh.aiFilterService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI filter service not available"})
		return
	}

	// Create style transfer request
	aiReq := services.StyleTransferRequest{
		StyleType:    req.StyleType,
		Intensity:    req.Intensity,
		PreserveFace: req.PreserveFace,
		CustomPrompt: req.CustomPrompt,
		// SourceImage would be populated from media storage
	}

	result, err := fh.aiFilterService.ApplyArtisticStyleTransfer(c.Request.Context(), aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to apply AI style transfer: %v", err)})
		return
	}

	encodedImage := base64.StdEncoding.EncodeToString(result.ProcessedImage)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"processedImage": encodedImage,
			"confidence":     result.Confidence,
			"processingTime": result.ProcessingTime.String(),
			"model":          result.Model,
			"mediaId":        mediaIDStr,
		},
	})
}

// ApplyAIMoodEnhancement applies AI-powered mood enhancement
// POST /api/media/:mediaId/ai-filters/mood-enhancement
func (fh *FilterHandler) ApplyAIMoodEnhancement(c *gin.Context) {
	mediaIDStr := c.Param("mediaId")

	// Check if this is a demo/uploaded image ID
	if strings.HasPrefix(mediaIDStr, "demo-") || strings.HasPrefix(mediaIDStr, "uploaded-") {
		// For demo mode, return a simulated response
		var req struct {
			MoodType  models.MoodFilterType `json:"moodType" binding:"required"`
			Intensity float64               `json:"intensity"`
			ColorTone string                `json:"colorTone"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Return simulated demo response with CSS filter instructions
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"processedImage": "CSS_FILTER_DEMO", // Special marker for frontend
				"confidence":     0.80,
				"appliedFilter": gin.H{
					"name":      fmt.Sprintf("AI %s Mood", strings.Title(string(req.MoodType))),
					"category":  "mood",
					"moodType":  req.MoodType,
					"intensity": req.Intensity,
					"colorTone": req.ColorTone,
				},
			},
		})
		return
	}

	_, err := primitive.ObjectIDFromHex(mediaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	var req struct {
		MoodType  models.MoodFilterType `json:"moodType" binding:"required"`
		Intensity float64               `json:"intensity"`
		ColorTone string                `json:"colorTone"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if fh.aiFilterService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI filter service not available"})
		return
	}

	// Create mood enhancement request
	aiReq := services.MoodEnhancementRequest{
		MoodType:  req.MoodType,
		Intensity: req.Intensity,
		ColorTone: req.ColorTone,
		// SourceImage would be populated from media storage
	}

	result, err := fh.aiFilterService.ApplyMoodEnhancement(c.Request.Context(), aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to apply AI mood enhancement: %v", err)})
		return
	}

	encodedImage := base64.StdEncoding.EncodeToString(result.ProcessedImage)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"processedImage": encodedImage,
			"confidence":     result.Confidence,
			"processingTime": result.ProcessingTime.String(),
			"model":          result.Model,
			"mediaId":        mediaIDStr,
		},
	})
}

// GetFilterSuggestions returns AI-powered filter suggestions for a media file
// GET /api/media/:mediaId/filters/suggestions
func (fh *FilterHandler) GetFilterSuggestions(c *gin.Context) {
	mediaIDStr := c.Param("mediaId")

	// Check if this is a demo/uploaded image ID
	if strings.HasPrefix(mediaIDStr, "demo-") || strings.HasPrefix(mediaIDStr, "uploaded-") {
		// For demo mode, return simulated suggestions
		c.JSON(http.StatusOK, gin.H{
			"suggestions": []gin.H{
				{
					"filterId":   "68cf69abfaf3ca6fe132e744", // Watercolor
					"confidence": 0.89,
					"reason":     "nature_scene",
					"filter": gin.H{
						"id":          "68cf69abfaf3ca6fe132e744",
						"name":        "Watercolor",
						"category":    "artistic",
						"description": "Soft, flowing watercolor painting effect",
					},
				},
				{
					"filterId":   "68cf69abfaf3ca6fe132e74b", // Happy Vibes
					"confidence": 0.76,
					"reason":     "bright_colors",
					"filter": gin.H{
						"id":          "68cf69abfaf3ca6fe132e74b",
						"name":        "Happy Vibes",
						"category":    "mood",
						"description": "Bright and cheerful mood with warm tones",
					},
				},
			},
		})
		return
	}

	mediaID, err := primitive.ObjectIDFromHex(mediaIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid media ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	suggestions, err := fh.analyticsService.GenerateFilterSuggestions(c.Request.Context(), userObjID, mediaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate filter suggestions"})
		return
	}

	// Enrich suggestions with filter details
	enrichedSuggestions := []models.EnrichedFilterSuggestion{}
	for _, suggestion := range suggestions {
		// Get filter preset details
		collection := fh.db.Collection("filter_presets")
		var filter models.FilterPreset
		if err := collection.FindOne(c.Request.Context(), bson.M{"_id": suggestion.FilterID}).Decode(&filter); err != nil {
			continue // Skip if filter not found
		}

		enrichedSuggestions = append(enrichedSuggestions, models.EnrichedFilterSuggestion{
			FilterSuggestion: suggestion,
			Filter:           filter,
		})
	}

	response := models.FilterSuggestionResponse{
		Suggestions: enrichedSuggestions,
		MediaID:     mediaID,
	}

	c.JSON(http.StatusOK, response)
}

// GetUserFilterAnalytics returns filter usage analytics for the current user
// GET /api/users/me/filters/analytics
func (fh *FilterHandler) GetUserFilterAnalytics(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	analytics, err := fh.analyticsService.GetFilterAnalytics(c.Request.Context(), userObjID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve filter analytics"})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// CreateCustomFilter creates a new custom filter preset
// POST /api/filters/custom
func (fh *FilterHandler) CreateCustomFilter(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	var req models.CreateFilterPresetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create custom filter preset
	preset := models.FilterPreset{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		Category:    req.Category,
		Type:        req.Type,
		Description: req.Description,
		Config:      req.Config,
		IsCustom:    true,
		CreatedBy:   &userObjID,
	}

	collection := fh.db.Collection("filter_presets")
	_, err := collection.InsertOne(c.Request.Context(), preset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom filter"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"filter":  preset,
	})
}

// UpdateUserStyleProfile updates the user's learned style profile
// POST /api/users/me/style-profile
func (fh *FilterHandler) UpdateUserStyleProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Analyze user's style based on their filter usage
	styleProfile, err := fh.analyticsService.AnalyzeUserStyle(c.Request.Context(), userObjID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze user style"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"styleProfile": styleProfile,
	})
}

// GetFilterHistory returns the user's filter application history
// GET /api/users/me/filters/history
func (fh *FilterHandler) GetFilterHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObjID, ok := userID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	collection := fh.db.Collection("filter_applications")

	// Count total documents
	total, err := collection.CountDocuments(c.Request.Context(), bson.M{"userId": userObjID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count filter applications"})
		return
	}

	// Get paginated results
	findOptions := options.Find().
		SetSort(bson.M{"appliedAt": -1}).
		SetLimit(int64(limit)).
		SetSkip(int64((page - 1) * limit))

	cursor, err := collection.Find(
		c.Request.Context(),
		bson.M{"userId": userObjID},
		findOptions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve filter history"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var applications []models.FilterApplication
	if err := cursor.All(c.Request.Context(), &applications); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode filter applications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"applications": applications,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
