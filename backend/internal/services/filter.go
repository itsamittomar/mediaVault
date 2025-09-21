package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"math"
	"strings"
	"time"

	"mediaVault-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type FilterService struct {
	db        *mongo.Database
	minioSvc  *MinioService
	presets   map[string]*models.FilterPreset
	analytics *FilterAnalyticsService
}

func NewFilterService(db *mongo.Database, minioSvc *MinioService) *FilterService {
	fs := &FilterService{
		db:       db,
		minioSvc: minioSvc,
		presets:  make(map[string]*models.FilterPreset),
	}

	// Initialize default presets
	fs.initializeDefaultPresets()

	// Initialize analytics service
	fs.analytics = NewFilterAnalyticsService(db)

	return fs
}

func (fs *FilterService) initializeDefaultPresets() {
	defaultPresets := []*models.FilterPreset{
		// Artistic Filters
		{
			ID:          primitive.NewObjectID(),
			Name:        "Watercolor",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticWatercolor),
			Description: "Soft, flowing watercolor painting effect",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.1),
				Saturation: floatPtr(0.8),
				Blur:       floatPtr(0.5),
				Effects: []models.Effect{
					{Type: "edge_preserve", Params: map[string]interface{}{"strength": 0.3}},
					{Type: "texture_overlay", Params: map[string]interface{}{"texture": "watercolor", "opacity": 0.4}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Oil Painting",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticOilPainting),
			Description: "Rich, textured oil painting effect",
			Config: models.FilterConfig{
				Brightness: floatPtr(0.95),
				Contrast:   floatPtr(1.2),
				Saturation: floatPtr(1.3),
				Effects: []models.Effect{
					{Type: "brush_strokes", Params: map[string]interface{}{"size": 3, "strength": 0.7}},
					{Type: "impasto", Params: map[string]interface{}{"depth": 0.5}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Cyberpunk",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticCyberpunk),
			Description: "Neon-lit futuristic cyberpunk aesthetic",
			Config: models.FilterConfig{
				Contrast:   floatPtr(1.4),
				Saturation: floatPtr(1.5),
				Hue:        floatPtr(30),
				Effects: []models.Effect{
					{Type: "neon_glow", Params: map[string]interface{}{"color": "#00ff41", "intensity": 0.8}},
					{Type: "chromatic_aberration", Params: map[string]interface{}{"strength": 0.3}},
					{Type: "scanlines", Params: map[string]interface{}{"density": 0.2, "opacity": 0.1}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Anime Style",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticAnime),
			Description: "Clean, vibrant anime-style illustration",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.05),
				Contrast:   floatPtr(1.3),
				Saturation: floatPtr(1.4),
				Effects: []models.Effect{
					{Type: "cell_shading", Params: map[string]interface{}{"levels": 4, "smoothing": 0.2}},
					{Type: "edge_enhance", Params: map[string]interface{}{"strength": 0.8}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},

		// Mood Filters
		{
			ID:          primitive.NewObjectID(),
			Name:        "Happy",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodHappy),
			Description: "Bright and cheerful mood enhancement",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.15),
				Contrast:   floatPtr(1.1),
				Saturation: floatPtr(1.2),
				Hue:        floatPtr(10), // Slight warm shift
				Effects: []models.Effect{
					{Type: "warm_tint", Params: map[string]interface{}{"intensity": 0.3}},
					{Type: "highlight_boost", Params: map[string]interface{}{"amount": 0.2}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Dramatic",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodDramatic),
			Description: "High contrast dramatic effect",
			Config: models.FilterConfig{
				Brightness: floatPtr(0.9),
				Contrast:   floatPtr(1.5),
				Saturation: floatPtr(0.8),
				Effects: []models.Effect{
					{Type: "vignette", Params: map[string]interface{}{"intensity": 0.6, "radius": 0.7}},
					{Type: "shadow_lift", Params: map[string]interface{}{"amount": -0.2}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          primitive.NewObjectID(),
			Name:        "Cozy",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodCozy),
			Description: "Warm, comfortable, homely feeling",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.05),
				Contrast:   floatPtr(0.95),
				Saturation: floatPtr(1.1),
				Hue:        floatPtr(15), // Warm orange shift
				Effects: []models.Effect{
					{Type: "warm_filter", Params: map[string]interface{}{"temperature": 3200}},
					{Type: "soft_glow", Params: map[string]interface{}{"radius": 2, "intensity": 0.3}},
				},
			},
			IsCustom:  false,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, preset := range defaultPresets {
		fs.presets[preset.ID.Hex()] = preset
	}
}

// ApplyFilter applies a filter to an image and returns the processed image data
func (fs *FilterService) ApplyFilter(ctx context.Context, mediaID, filterID primitive.ObjectID, userID primitive.ObjectID, customConfig *models.FilterConfig) ([]byte, string, error) {
	// Get the original image from MinIO
	media, err := fs.getMediaFile(ctx, mediaID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get media file: %w", err)
	}

	// Check if it's an image
	if !strings.HasPrefix(media.MimeType, "image/") {
		return nil, "", fmt.Errorf("filter can only be applied to images")
	}

	// Get filter preset
	filter, err := fs.getFilterPreset(ctx, filterID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get filter preset: %w", err)
	}

	// Download image from MinIO
	reader, err := fs.minioSvc.GetFileContent(media.FileName)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download image: %w", err)
	}
	defer reader.Close()

	imageData, err := io.ReadAll(reader)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read image data: %w", err)
	}

	// Apply filter processing
	processedImage, outputFormat, err := fs.processImage(imageData, filter.Config, customConfig)
	if err != nil {
		return nil, "", fmt.Errorf("failed to process image: %w", err)
	}

	// Record filter application
	go fs.recordFilterApplication(context.Background(), mediaID, userID, filterID, customConfig)

	return processedImage, outputFormat, nil
}

func (fs *FilterService) processImage(imageData []byte, filterConfig models.FilterConfig, customConfig *models.FilterConfig) ([]byte, string, error) {
	// Decode image
	reader := bytes.NewReader(imageData)
	img, format, err := image.Decode(reader)
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Apply custom config if provided
	config := filterConfig
	if customConfig != nil {
		config = mergeConfigs(filterConfig, *customConfig)
	}

	// Apply CSS-like filters
	processedImg := fs.applyCSSFilters(img, config)

	// Apply advanced effects
	for _, effect := range config.Effects {
		processedImg = fs.applyEffect(processedImg, effect)
	}

	// Encode processed image
	var buf bytes.Buffer
	switch format {
	case "jpeg", "jpg":
		err = jpeg.Encode(&buf, processedImg, &jpeg.Options{Quality: 90})
	case "png":
		err = png.Encode(&buf, processedImg)
	default:
		// Default to JPEG
		err = jpeg.Encode(&buf, processedImg, &jpeg.Options{Quality: 90})
		format = "jpeg"
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to encode processed image: %w", err)
	}

	return buf.Bytes(), format, nil
}

func (fs *FilterService) applyCSSFilters(img image.Image, config models.FilterConfig) image.Image {
	bounds := img.Bounds()
	processedImg := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()

			// Convert to 0-1 range
			rf, gf, bf, af := float64(r)/65535, float64(g)/65535, float64(b)/65535, float64(a)/65535

			// Apply brightness
			if config.Brightness != nil {
				brightness := *config.Brightness
				rf *= brightness
				gf *= brightness
				bf *= brightness
			}

			// Apply contrast
			if config.Contrast != nil {
				contrast := *config.Contrast
				rf = (rf-0.5)*contrast + 0.5
				gf = (gf-0.5)*contrast + 0.5
				bf = (bf-0.5)*contrast + 0.5
			}

			// Apply saturation
			if config.Saturation != nil {
				saturation := *config.Saturation
				// Convert to HSL and adjust saturation
				rf, gf, bf = adjustSaturation(rf, gf, bf, saturation)
			}

			// Apply sepia
			if config.Sepia != nil {
				sepia := *config.Sepia
				newR := rf*(1-sepia) + (rf*0.393+gf*0.769+bf*0.189)*sepia
				newG := gf*(1-sepia) + (rf*0.349+gf*0.686+bf*0.168)*sepia
				newB := bf*(1-sepia) + (rf*0.272+gf*0.534+bf*0.131)*sepia
				rf, gf, bf = newR, newG, newB
			}

			// Apply grayscale
			if config.Grayscale != nil {
				gray := *config.Grayscale
				luminance := 0.299*rf + 0.587*gf + 0.114*bf
				rf = rf*(1-gray) + luminance*gray
				gf = gf*(1-gray) + luminance*gray
				bf = bf*(1-gray) + luminance*gray
			}

			// Apply opacity
			if config.Opacity != nil {
				af *= *config.Opacity
			}

			// Apply invert
			if config.Invert != nil {
				invert := *config.Invert
				rf = rf*(1-invert) + (1-rf)*invert
				gf = gf*(1-invert) + (1-gf)*invert
				bf = bf*(1-invert) + (1-bf)*invert
			}

			// Clamp values
			rf = math.Max(0, math.Min(1, rf))
			gf = math.Max(0, math.Min(1, gf))
			bf = math.Max(0, math.Min(1, bf))
			af = math.Max(0, math.Min(1, af))

			// Convert back to uint8
			processedImg.Set(x, y, color.RGBA{
				R: uint8(rf * 255),
				G: uint8(gf * 255),
				B: uint8(bf * 255),
				A: uint8(af * 255),
			})
		}
	}

	return processedImg
}

func (fs *FilterService) applyEffect(img image.Image, effect models.Effect) image.Image {
	switch effect.Type {
	case "edge_preserve":
		return fs.applyEdgePreserve(img, effect.Params)
	case "brush_strokes":
		return fs.applyBrushStrokes(img, effect.Params)
	case "neon_glow":
		return fs.applyNeonGlow(img, effect.Params)
	case "vignette":
		return fs.applyVignette(img, effect.Params)
	case "warm_filter":
		return fs.applyWarmFilter(img, effect.Params)
	case "cell_shading":
		return fs.applyCellShading(img, effect.Params)
	default:
		return img // Return original if effect not implemented
	}
}

// Placeholder effect implementations - these would need proper image processing algorithms
func (fs *FilterService) applyEdgePreserve(img image.Image, params map[string]interface{}) image.Image {
	// Implement edge-preserving smoothing
	return img
}

func (fs *FilterService) applyBrushStrokes(img image.Image, params map[string]interface{}) image.Image {
	// Implement brush stroke effect
	return img
}

func (fs *FilterService) applyNeonGlow(img image.Image, params map[string]interface{}) image.Image {
	// Implement neon glow effect
	return img
}

func (fs *FilterService) applyVignette(img image.Image, params map[string]interface{}) image.Image {
	// Implement vignette effect
	bounds := img.Bounds()
	processedImg := image.NewRGBA(bounds)

	centerX := float64(bounds.Dx()) / 2
	centerY := float64(bounds.Dy()) / 2
	maxRadius := math.Sqrt(centerX*centerX + centerY*centerY)

	intensity := 0.6
	if val, ok := params["intensity"].(float64); ok {
		intensity = val
	}

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()

			// Calculate distance from center
			dx := float64(x) - centerX
			dy := float64(y) - centerY
			distance := math.Sqrt(dx*dx + dy*dy)

			// Calculate vignette factor
			factor := 1.0 - (distance/maxRadius)*intensity
			factor = math.Max(0, math.Min(1, factor))

			// Apply vignette
			processedImg.Set(x, y, color.RGBA{
				R: uint8(float64(r>>8) * factor),
				G: uint8(float64(g>>8) * factor),
				B: uint8(float64(b>>8) * factor),
				A: uint8(a >> 8),
			})
		}
	}

	return processedImg
}

func (fs *FilterService) applyWarmFilter(img image.Image, params map[string]interface{}) image.Image {
	// Implement warm color temperature filter
	return img
}

func (fs *FilterService) applyCellShading(img image.Image, params map[string]interface{}) image.Image {
	// Implement cel shading effect
	return img
}

// Helper functions
func floatPtr(f float64) *float64 {
	return &f
}

func adjustSaturation(r, g, b, saturation float64) (float64, float64, float64) {
	// Simple saturation adjustment using luminance
	luminance := 0.299*r + 0.587*g + 0.114*b
	return r*(1-saturation) + luminance*saturation,
		g*(1-saturation) + luminance*saturation,
		b*(1-saturation) + luminance*saturation
}

func mergeConfigs(base, custom models.FilterConfig) models.FilterConfig {
	merged := base

	if custom.Brightness != nil {
		merged.Brightness = custom.Brightness
	}
	if custom.Contrast != nil {
		merged.Contrast = custom.Contrast
	}
	if custom.Saturation != nil {
		merged.Saturation = custom.Saturation
	}
	// ... merge other fields

	return merged
}

func (fs *FilterService) getMediaFile(ctx context.Context, mediaID primitive.ObjectID) (*models.MediaFile, error) {
	collection := fs.db.Collection("media")
	var media models.MediaFile
	err := collection.FindOne(ctx, bson.M{"_id": mediaID}).Decode(&media)
	return &media, err
}

func (fs *FilterService) getFilterPreset(ctx context.Context, filterID primitive.ObjectID) (*models.FilterPreset, error) {
	// First check in-memory presets
	if preset, exists := fs.presets[filterID.Hex()]; exists {
		return preset, nil
	}

	// Then check database for custom presets
	collection := fs.db.Collection("filter_presets")
	var preset models.FilterPreset
	err := collection.FindOne(ctx, bson.M{"_id": filterID}).Decode(&preset)
	return &preset, err
}

func (fs *FilterService) recordFilterApplication(ctx context.Context, mediaID, userID, filterID primitive.ObjectID, customConfig *models.FilterConfig) {
	application := models.FilterApplication{
		ID:           primitive.NewObjectID(),
		MediaID:      mediaID,
		UserID:       userID,
		FilterID:     filterID,
		CustomConfig: customConfig,
		AppliedAt:    time.Now(),
	}

	collection := fs.db.Collection("filter_applications")
	collection.InsertOne(ctx, application)

	// Update user preferences
	fs.updateUserPreferences(ctx, userID, filterID)
}

func (fs *FilterService) updateUserPreferences(ctx context.Context, userID, filterID primitive.ObjectID) {
	collection := fs.db.Collection("user_filter_preferences")

	// Upsert user preferences
	filter := bson.M{"userId": userID}
	update := bson.M{
		"$inc": bson.M{
			fmt.Sprintf("usageCount.%s", filterID.Hex()): 1,
		},
		"$set": bson.M{
			"lastUsed":  filterID,
			"updatedAt": time.Now(),
		},
		"$setOnInsert": bson.M{
			"userId":         userID,
			"frequentlyUsed": []primitive.ObjectID{},
			"customPresets":  []primitive.ObjectID{},
			"styleProfile":   models.StyleProfile{},
			"createdAt":      time.Now(),
		},
	}

	collection.UpdateOne(ctx, filter, update, nil)
}
