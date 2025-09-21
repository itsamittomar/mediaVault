package main

import (
	"context"
	"log"
	"time"

	"mediaVault-backend/internal/config"
	"mediaVault-backend/internal/models"
	"mediaVault-backend/internal/services"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	log.Println("Initializing default filter presets...")

	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database service
	dbService, err := services.NewDatabaseService(cfg.MongoURI, cfg.MongoDatabase)
	if err != nil {
		log.Fatal("Failed to initialize database service:", err)
	}
	defer dbService.Close()

	db := dbService.GetDatabase()
	collection := db.Collection("filter_presets")

	// Check if presets already exist
	ctx := context.Background()
	count, err := collection.CountDocuments(ctx, bson.M{"isCustom": false})
	if err != nil {
		log.Fatal("Failed to check existing presets:", err)
	}

	if count > 0 {
		log.Printf("Found %d existing default presets, skipping initialization", count)
		return
	}

	// Create default presets
	defaultPresets := getDefaultFilterPresets()

	// Insert presets
	for _, preset := range defaultPresets {
		_, err := collection.InsertOne(ctx, preset)
		if err != nil {
			log.Printf("Failed to insert preset %s: %v", preset.Name, err)
			continue
		}
		log.Printf("Inserted preset: %s", preset.Name)
	}

	log.Println("Default filter presets initialization completed!")
}

func floatPtr(f float64) *float64 {
	return &f
}

func getDefaultFilterPresets() []*models.FilterPreset {
	now := time.Now()

	return []*models.FilterPreset{
		// Artistic Filters
		{
			Name:        "Watercolor",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticWatercolor),
			Description: "Soft, flowing watercolor painting effect with gentle transitions",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.1),
				Contrast:   floatPtr(0.9),
				Saturation: floatPtr(0.8),
				Blur:       floatPtr(0.5),
				Effects: []models.Effect{
					{Type: "edge_preserve", Params: map[string]interface{}{"strength": 0.3}},
					{Type: "texture_overlay", Params: map[string]interface{}{"texture": "watercolor", "opacity": 0.4}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Oil Painting",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticOilPainting),
			Description: "Rich, textured oil painting effect with visible brush strokes",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Cyberpunk",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticCyberpunk),
			Description: "Futuristic cyberpunk aesthetic with neon accents and high contrast",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Anime Style",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticAnime),
			Description: "Clean, vibrant anime-style illustration with enhanced colors",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Pencil Sketch",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticSketch),
			Description: "Hand-drawn pencil sketch effect with fine line details",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.2),
				Contrast:   floatPtr(1.1),
				Grayscale:  floatPtr(0.8),
				Effects: []models.Effect{
					{Type: "edge_detection", Params: map[string]interface{}{"threshold": 0.1}},
					{Type: "pencil_texture", Params: map[string]interface{}{"grain": 0.3}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Vintage",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticVintage),
			Description: "Classic vintage photography with aged appearance",
			Config: models.FilterConfig{
				Brightness: floatPtr(0.9),
				Contrast:   floatPtr(0.8),
				Sepia:      floatPtr(0.6),
				Effects: []models.Effect{
					{Type: "vignette", Params: map[string]interface{}{"intensity": 0.4}},
					{Type: "film_grain", Params: map[string]interface{}{"amount": 0.3}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Film Noir",
			Category:    models.FilterCategoryArtistic,
			Type:        string(models.ArtisticNoir),
			Description: "Classic black and white film noir with dramatic shadows",
			Config: models.FilterConfig{
				Brightness: floatPtr(0.85),
				Contrast:   floatPtr(1.6),
				Grayscale:  floatPtr(1.0),
				Effects: []models.Effect{
					{Type: "vignette", Params: map[string]interface{}{"intensity": 0.7}},
					{Type: "high_contrast", Params: map[string]interface{}{"strength": 0.8}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},

		// Mood Filters
		{
			Name:        "Happy Vibes",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodHappy),
			Description: "Bright and cheerful mood with warm, uplifting tones",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Dramatic Scene",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodDramatic),
			Description: "High contrast dramatic effect with intense shadows",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Cozy Comfort",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodCozy),
			Description: "Warm, comfortable atmosphere perfect for intimate moments",
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
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "High Energy",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodEnergetic),
			Description: "Dynamic and vibrant filter for action and movement",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.1),
				Contrast:   floatPtr(1.3),
				Saturation: floatPtr(1.4),
				Effects: []models.Effect{
					{Type: "vibrance", Params: map[string]interface{}{"amount": 0.4}},
					{Type: "clarity", Params: map[string]interface{}{"strength": 0.3}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Peaceful Calm",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodCalm),
			Description: "Serene and tranquil atmosphere with soft tones",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.05),
				Contrast:   floatPtr(0.9),
				Saturation: floatPtr(0.9),
				Effects: []models.Effect{
					{Type: "soft_focus", Params: map[string]interface{}{"radius": 1, "amount": 0.2}},
					{Type: "cool_tone", Params: map[string]interface{}{"intensity": 0.2}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Mysterious Shadow",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodMysterious),
			Description: "Dark and enigmatic atmosphere with deep shadows",
			Config: models.FilterConfig{
				Brightness: floatPtr(0.8),
				Contrast:   floatPtr(1.4),
				Saturation: floatPtr(0.7),
				Effects: []models.Effect{
					{Type: "dark_corners", Params: map[string]interface{}{"intensity": 0.5}},
					{Type: "desaturate_highlights", Params: map[string]interface{}{"amount": 0.3}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			Name:        "Romantic Glow",
			Category:    models.FilterCategoryMood,
			Type:        string(models.MoodRomantic),
			Description: "Soft, dreamy lighting perfect for romantic scenes",
			Config: models.FilterConfig{
				Brightness: floatPtr(1.1),
				Contrast:   floatPtr(0.9),
				Saturation: floatPtr(1.15),
				Effects: []models.Effect{
					{Type: "soft_light", Params: map[string]interface{}{"intensity": 0.4}},
					{Type: "warm_highlights", Params: map[string]interface{}{"amount": 0.3}},
					{Type: "dreamy_glow", Params: map[string]interface{}{"radius": 3, "opacity": 0.2}},
				},
			},
			IsCustom:  false,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
}
