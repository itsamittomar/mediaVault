package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FilterCategory string
type ArtisticFilterType string
type MoodFilterType string

const (
	// Filter Categories
	FilterCategoryArtistic  FilterCategory = "artistic"
	FilterCategoryMood      FilterCategory = "mood"
	FilterCategoryColor     FilterCategory = "color"
	FilterCategoryTechnical FilterCategory = "technical"

	// Artistic Filters
	ArtisticWatercolor  ArtisticFilterType = "watercolor"
	ArtisticOilPainting ArtisticFilterType = "oil-painting"
	ArtisticCyberpunk   ArtisticFilterType = "cyberpunk"
	ArtisticAnime       ArtisticFilterType = "anime"
	ArtisticSketch      ArtisticFilterType = "sketch"
	ArtisticVintage     ArtisticFilterType = "vintage"
	ArtisticNoir        ArtisticFilterType = "noir"

	// Mood Filters
	MoodHappy      MoodFilterType = "happy"
	MoodDramatic   MoodFilterType = "dramatic"
	MoodCozy       MoodFilterType = "cozy"
	MoodEnergetic  MoodFilterType = "energetic"
	MoodCalm       MoodFilterType = "calm"
	MoodMysterious MoodFilterType = "mysterious"
	MoodRomantic   MoodFilterType = "romantic"
)

// FilterPreset represents a pre-defined filter configuration
type FilterPreset struct {
	ID          primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Name        string              `json:"name" bson:"name"`
	Category    FilterCategory      `json:"category" bson:"category"`
	Type        string              `json:"type" bson:"type"` // ArtisticFilterType or MoodFilterType
	Description string              `json:"description" bson:"description"`
	Thumbnail   *string             `json:"thumbnail" bson:"thumbnail,omitempty"`
	Config      FilterConfig        `json:"config" bson:"config"`
	IsCustom    bool                `json:"isCustom" bson:"isCustom"`
	CreatedBy   *primitive.ObjectID `json:"createdBy" bson:"createdBy,omitempty"`
	CreatedAt   time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt" bson:"updatedAt"`
}

// FilterConfig holds all the parameters for a filter
type FilterConfig struct {
	// CSS-like filters
	Brightness *float64 `json:"brightness,omitempty" bson:"brightness,omitempty"`
	Contrast   *float64 `json:"contrast,omitempty" bson:"contrast,omitempty"`
	Saturation *float64 `json:"saturation,omitempty" bson:"saturation,omitempty"`
	Hue        *float64 `json:"hue,omitempty" bson:"hue,omitempty"`
	Sepia      *float64 `json:"sepia,omitempty" bson:"sepia,omitempty"`
	Grayscale  *float64 `json:"grayscale,omitempty" bson:"grayscale,omitempty"`
	Blur       *float64 `json:"blur,omitempty" bson:"blur,omitempty"`
	Opacity    *float64 `json:"opacity,omitempty" bson:"opacity,omitempty"`
	Invert     *float64 `json:"invert,omitempty" bson:"invert,omitempty"`

	// Advanced effects
	Effects []Effect `json:"effects,omitempty" bson:"effects,omitempty"`
}

// Effect represents advanced image processing effects
type Effect struct {
	Type   string                 `json:"type" bson:"type"`
	Params map[string]interface{} `json:"params" bson:"params"`
}

// UserFilterPreference tracks user's filter usage and preferences
type UserFilterPreference struct {
	ID             primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID   `json:"userId" bson:"userId"`
	FrequentlyUsed []primitive.ObjectID `json:"frequentlyUsed" bson:"frequentlyUsed"`
	CustomPresets  []primitive.ObjectID `json:"customPresets" bson:"customPresets"`
	StyleProfile   StyleProfile         `json:"styleProfile" bson:"styleProfile"`
	LastUsed       *primitive.ObjectID  `json:"lastUsed" bson:"lastUsed,omitempty"`
	UsageCount     map[string]int       `json:"usageCount" bson:"usageCount"`
	CreatedAt      time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt" bson:"updatedAt"`
}

// StyleProfile represents user's learned style preferences
type StyleProfile struct {
	PreferredColors []string             `json:"preferredColors" bson:"preferredColors"`
	PreferredMoods  []MoodFilterType     `json:"preferredMoods" bson:"preferredMoods"`
	PreferredStyles []ArtisticFilterType `json:"preferredStyles" bson:"preferredStyles"`
	ColorPalette    []ColorPalette       `json:"colorPalette" bson:"colorPalette"`
}

// ColorPalette represents dominant colors in user's preferred content
type ColorPalette struct {
	Color      string  `json:"color" bson:"color"`         // Hex color
	Frequency  float64 `json:"frequency" bson:"frequency"` // 0.0 - 1.0
	Saturation float64 `json:"saturation" bson:"saturation"`
	Brightness float64 `json:"brightness" bson:"brightness"`
}

// FilterApplication tracks when filters are applied to media
type FilterApplication struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	MediaID      primitive.ObjectID `json:"mediaId" bson:"mediaId"`
	UserID       primitive.ObjectID `json:"userId" bson:"userId"`
	FilterID     primitive.ObjectID `json:"filterId" bson:"filterId"`
	CustomConfig *FilterConfig      `json:"customConfig" bson:"customConfig,omitempty"`
	AppliedAt    time.Time          `json:"appliedAt" bson:"appliedAt"`
}

// FilterSuggestion represents AI-generated filter recommendations
type FilterSuggestion struct {
	FilterID   primitive.ObjectID `json:"filterId" bson:"filterId"`
	Confidence float64            `json:"confidence" bson:"confidence"` // 0.0 - 1.0
	Reason     SuggestionReason   `json:"reason" bson:"reason"`
	MediaID    primitive.ObjectID `json:"mediaId" bson:"mediaId"`
	UserID     primitive.ObjectID `json:"userId" bson:"userId"`
}

type SuggestionReason string

const (
	SuggestionStyleMatch     SuggestionReason = "style_match"
	SuggestionMoodMatch      SuggestionReason = "mood_match"
	SuggestionFrequentlyUsed SuggestionReason = "frequently_used"
	SuggestionSimilarContent SuggestionReason = "similar_content"
	SuggestionColorHarmony   SuggestionReason = "color_harmony"
)

// Request/Response models
type ApplyFilterRequest struct {
	FilterID     primitive.ObjectID `json:"filterId" binding:"required"`
	CustomConfig *FilterConfig      `json:"customConfig,omitempty"`
}

type CreateFilterPresetRequest struct {
	Name        string         `json:"name" binding:"required"`
	Category    FilterCategory `json:"category" binding:"required"`
	Type        string         `json:"type" binding:"required"`
	Description string         `json:"description" binding:"required"`
	Config      FilterConfig   `json:"config" binding:"required"`
}

type FilterSuggestionResponse struct {
	Suggestions []EnrichedFilterSuggestion `json:"suggestions"`
	MediaID     primitive.ObjectID         `json:"mediaId"`
}

type EnrichedFilterSuggestion struct {
	FilterSuggestion
	Filter FilterPreset `json:"filter"`
}

type FilterAnalytics struct {
	TotalApplications int                       `json:"totalApplications"`
	PopularFilters    []FilterUsageStats        `json:"popularFilters"`
	CategoryStats     map[FilterCategory]int    `json:"categoryStats"`
	RecentActivity    []RecentFilterApplication `json:"recentActivity"`
}

type FilterUsageStats struct {
	Filter FilterPreset `json:"filter"`
	Count  int          `json:"count"`
	Rank   int          `json:"rank"`
}

type RecentFilterApplication struct {
	FilterApplication
	Filter FilterPreset `json:"filter"`
	Media  MediaFile    `json:"media"`
}
