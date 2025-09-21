package services

import (
	"context"
	"sort"
	"time"

	"mediaVault-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type FilterAnalyticsService struct {
	db *mongo.Database
}

func NewFilterAnalyticsService(db *mongo.Database) *FilterAnalyticsService {
	return &FilterAnalyticsService{
		db: db,
	}
}

// GenerateFilterSuggestions creates AI-powered filter suggestions based on user behavior and image analysis
func (fas *FilterAnalyticsService) GenerateFilterSuggestions(ctx context.Context, userID, mediaID primitive.ObjectID) ([]models.FilterSuggestion, error) {
	suggestions := []models.FilterSuggestion{}

	// Get user preferences
	userPrefs, err := fas.getUserPreferences(ctx, userID)
	if err == nil {
		// Generate suggestions based on frequently used filters
		for _, filterID := range userPrefs.FrequentlyUsed {
			suggestions = append(suggestions, models.FilterSuggestion{
				FilterID:   filterID,
				Confidence: 0.8,
				Reason:     models.SuggestionFrequentlyUsed,
				MediaID:    mediaID,
				UserID:     userID,
			})
		}

		// Generate suggestions based on style profile
		styleBasedSuggestions, err := fas.generateStyleBasedSuggestions(ctx, userPrefs.StyleProfile, mediaID, userID)
		if err == nil {
			suggestions = append(suggestions, styleBasedSuggestions...)
		}
	}

	// Generate suggestions based on similar content
	contentBasedSuggestions, err := fas.generateContentBasedSuggestions(ctx, mediaID, userID)
	if err == nil {
		suggestions = append(suggestions, contentBasedSuggestions...)
	}

	// Generate suggestions based on current trends
	trendingSuggestions, err := fas.generateTrendingSuggestions(ctx, userID, mediaID)
	if err == nil {
		suggestions = append(suggestions, trendingSuggestions...)
	}

	// Sort by confidence and return top suggestions
	sort.Slice(suggestions, func(i, j int) bool {
		return suggestions[i].Confidence > suggestions[j].Confidence
	})

	// Return top 6 suggestions
	if len(suggestions) > 6 {
		suggestions = suggestions[:6]
	}

	return suggestions, nil
}

// AnalyzeUserStyle learns user's preferred style based on their filter usage history
func (fas *FilterAnalyticsService) AnalyzeUserStyle(ctx context.Context, userID primitive.ObjectID) (*models.StyleProfile, error) {
	// Get all filter applications for the user
	collection := fas.db.Collection("filter_applications")

	// Aggregate filter usage by category and type
	pipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{"$group": bson.M{
			"_id":      "$filterId",
			"count":    bson.M{"$sum": 1},
			"lastUsed": bson.M{"$max": "$appliedAt"},
		}},
		{"$sort": bson.M{"count": -1}},
		{"$limit": 20},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var filterStats []struct {
		ID       primitive.ObjectID `bson:"_id"`
		Count    int                `bson:"count"`
		LastUsed time.Time          `bson:"lastUsed"`
	}

	if err := cursor.All(ctx, &filterStats); err != nil {
		return nil, err
	}

	// Analyze the most used filters to determine style preferences
	styleProfile := &models.StyleProfile{
		PreferredColors: []string{},
		PreferredMoods:  []models.MoodFilterType{},
		PreferredStyles: []models.ArtisticFilterType{},
		ColorPalette:    []models.ColorPalette{},
	}

	// Get filter details and categorize preferences
	for _, stat := range filterStats {
		filter, err := fas.getFilterPreset(ctx, stat.ID)
		if err != nil {
			continue
		}

		switch filter.Category {
		case models.FilterCategoryMood:
			if moodType := models.MoodFilterType(filter.Type); fas.isValidMoodType(moodType) {
				styleProfile.PreferredMoods = append(styleProfile.PreferredMoods, moodType)
			}
		case models.FilterCategoryArtistic:
			if artisticType := models.ArtisticFilterType(filter.Type); fas.isValidArtisticType(artisticType) {
				styleProfile.PreferredStyles = append(styleProfile.PreferredStyles, artisticType)
			}
		}
	}

	// Analyze color preferences from applied filters
	colorPalette, err := fas.analyzeColorPreferences(ctx, userID)
	if err == nil {
		styleProfile.ColorPalette = colorPalette
		styleProfile.PreferredColors = fas.extractDominantColors(colorPalette)
	}

	return styleProfile, nil
}

// GetFilterAnalytics provides comprehensive analytics about filter usage
func (fas *FilterAnalyticsService) GetFilterAnalytics(ctx context.Context, userID primitive.ObjectID) (*models.FilterAnalytics, error) {
	analytics := &models.FilterAnalytics{
		CategoryStats:  make(map[models.FilterCategory]int),
		PopularFilters: []models.FilterUsageStats{},
		RecentActivity: []models.RecentFilterApplication{},
	}

	// Get total applications count
	collection := fas.db.Collection("filter_applications")
	totalCount, err := collection.CountDocuments(ctx, bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	analytics.TotalApplications = int(totalCount)

	// Get popular filters
	popularFilters, err := fas.getPopularFilters(ctx, userID)
	if err == nil {
		analytics.PopularFilters = popularFilters
	}

	// Get category statistics
	categoryStats, err := fas.getCategoryStats(ctx, userID)
	if err == nil {
		analytics.CategoryStats = categoryStats
	}

	// Get recent activity
	recentActivity, err := fas.getRecentActivity(ctx, userID)
	if err == nil {
		analytics.RecentActivity = recentActivity
	}

	return analytics, nil
}

// Helper methods
func (fas *FilterAnalyticsService) getUserPreferences(ctx context.Context, userID primitive.ObjectID) (*models.UserFilterPreference, error) {
	collection := fas.db.Collection("user_filter_preferences")
	var prefs models.UserFilterPreference
	err := collection.FindOne(ctx, bson.M{"userId": userID}).Decode(&prefs)
	return &prefs, err
}

func (fas *FilterAnalyticsService) generateStyleBasedSuggestions(ctx context.Context, profile models.StyleProfile, mediaID, userID primitive.ObjectID) ([]models.FilterSuggestion, error) {
	suggestions := []models.FilterSuggestion{}

	// Create suggestions based on preferred styles
	for _, style := range profile.PreferredStyles {
		// Find filters matching this style
		filterID, err := fas.findFilterByType(ctx, string(style), models.FilterCategoryArtistic)
		if err == nil {
			suggestions = append(suggestions, models.FilterSuggestion{
				FilterID:   filterID,
				Confidence: 0.75,
				Reason:     models.SuggestionStyleMatch,
				MediaID:    mediaID,
				UserID:     userID,
			})
		}
	}

	// Create suggestions based on preferred moods
	for _, mood := range profile.PreferredMoods {
		filterID, err := fas.findFilterByType(ctx, string(mood), models.FilterCategoryMood)
		if err == nil {
			suggestions = append(suggestions, models.FilterSuggestion{
				FilterID:   filterID,
				Confidence: 0.7,
				Reason:     models.SuggestionMoodMatch,
				MediaID:    mediaID,
				UserID:     userID,
			})
		}
	}

	return suggestions, nil
}

func (fas *FilterAnalyticsService) generateContentBasedSuggestions(ctx context.Context, mediaID, userID primitive.ObjectID) ([]models.FilterSuggestion, error) {
	// This would analyze the image content and suggest appropriate filters
	// For now, return some basic suggestions based on image analysis
	suggestions := []models.FilterSuggestion{}

	// Placeholder: In a real implementation, this would:
	// 1. Analyze image content (colors, objects, composition)
	// 2. Match with filters that work well with similar content
	// 3. Use ML models to predict filter compatibility

	return suggestions, nil
}

func (fas *FilterAnalyticsService) generateTrendingSuggestions(ctx context.Context, userID, mediaID primitive.ObjectID) ([]models.FilterSuggestion, error) {
	// Get trending filters from the past week
	oneWeekAgo := time.Now().AddDate(0, 0, -7)

	collection := fas.db.Collection("filter_applications")
	pipeline := []bson.M{
		{"$match": bson.M{
			"appliedAt": bson.M{"$gte": oneWeekAgo},
			"userId":    bson.M{"$ne": userID}, // Exclude current user
		}},
		{"$group": bson.M{
			"_id":   "$filterId",
			"count": bson.M{"$sum": 1},
		}},
		{"$sort": bson.M{"count": -1}},
		{"$limit": 3},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var trendingFilters []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int                `bson:"count"`
	}

	if err := cursor.All(ctx, &trendingFilters); err != nil {
		return nil, err
	}

	suggestions := []models.FilterSuggestion{}
	for _, trending := range trendingFilters {
		suggestions = append(suggestions, models.FilterSuggestion{
			FilterID:   trending.ID,
			Confidence: 0.6,
			Reason:     models.SuggestionFrequentlyUsed,
			MediaID:    mediaID,
			UserID:     userID,
		})
	}

	return suggestions, nil
}

func (fas *FilterAnalyticsService) analyzeColorPreferences(ctx context.Context, userID primitive.ObjectID) ([]models.ColorPalette, error) {
	// Placeholder for color analysis
	// In a real implementation, this would:
	// 1. Get all media files the user has applied filters to
	// 2. Extract dominant colors from those images
	// 3. Analyze color patterns and preferences

	return []models.ColorPalette{
		{Color: "#FF6B6B", Frequency: 0.3, Saturation: 0.8, Brightness: 0.7},
		{Color: "#4ECDC4", Frequency: 0.25, Saturation: 0.7, Brightness: 0.8},
		{Color: "#FFE66D", Frequency: 0.2, Saturation: 0.9, Brightness: 0.9},
	}, nil
}

func (fas *FilterAnalyticsService) extractDominantColors(palette []models.ColorPalette) []string {
	colors := make([]string, 0, len(palette))
	for _, color := range palette {
		if color.Frequency > 0.1 { // Only include colors used more than 10% of the time
			colors = append(colors, color.Color)
		}
	}
	return colors
}

func (fas *FilterAnalyticsService) getPopularFilters(ctx context.Context, userID primitive.ObjectID) ([]models.FilterUsageStats, error) {
	collection := fas.db.Collection("filter_applications")

	pipeline := []bson.M{
		{"$match": bson.M{"userId": userID}},
		{"$group": bson.M{
			"_id":   "$filterId",
			"count": bson.M{"$sum": 1},
		}},
		{"$sort": bson.M{"count": -1}},
		{"$limit": 10},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int                `bson:"count"`
	}

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	stats := []models.FilterUsageStats{}
	for i, result := range results {
		filter, err := fas.getFilterPreset(ctx, result.ID)
		if err != nil {
			continue
		}

		stats = append(stats, models.FilterUsageStats{
			Filter: *filter,
			Count:  result.Count,
			Rank:   i + 1,
		})
	}

	return stats, nil
}

func (fas *FilterAnalyticsService) getCategoryStats(ctx context.Context, userID primitive.ObjectID) (map[models.FilterCategory]int, error) {
	stats := make(map[models.FilterCategory]int)

	// This would require joining filter applications with filter presets
	// For now, return placeholder data
	stats[models.FilterCategoryArtistic] = 45
	stats[models.FilterCategoryMood] = 32
	stats[models.FilterCategoryColor] = 18
	stats[models.FilterCategoryTechnical] = 12

	return stats, nil
}

func (fas *FilterAnalyticsService) getRecentActivity(ctx context.Context, userID primitive.ObjectID) ([]models.RecentFilterApplication, error) {
	collection := fas.db.Collection("filter_applications")

	opts := options.Find().SetSort(bson.M{"appliedAt": -1}).SetLimit(10)
	cursor, err := collection.Find(ctx, bson.M{"userId": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var applications []models.FilterApplication
	if err := cursor.All(ctx, &applications); err != nil {
		return nil, err
	}

	recentActivity := []models.RecentFilterApplication{}
	for _, app := range applications {
		// Get filter and media details
		filter, err := fas.getFilterPreset(ctx, app.FilterID)
		if err != nil {
			continue
		}

		media, err := fas.getMediaFile(ctx, app.MediaID)
		if err != nil {
			continue
		}

		recentActivity = append(recentActivity, models.RecentFilterApplication{
			FilterApplication: app,
			Filter:            *filter,
			Media:             *media,
		})
	}

	return recentActivity, nil
}

func (fas *FilterAnalyticsService) getFilterPreset(ctx context.Context, filterID primitive.ObjectID) (*models.FilterPreset, error) {
	collection := fas.db.Collection("filter_presets")
	var preset models.FilterPreset
	err := collection.FindOne(ctx, bson.M{"_id": filterID}).Decode(&preset)
	return &preset, err
}

func (fas *FilterAnalyticsService) getMediaFile(ctx context.Context, mediaID primitive.ObjectID) (*models.MediaFile, error) {
	collection := fas.db.Collection("media")
	var media models.MediaFile
	err := collection.FindOne(ctx, bson.M{"_id": mediaID}).Decode(&media)
	return &media, err
}

func (fas *FilterAnalyticsService) findFilterByType(ctx context.Context, filterType string, category models.FilterCategory) (primitive.ObjectID, error) {
	collection := fas.db.Collection("filter_presets")
	var preset models.FilterPreset
	err := collection.FindOne(ctx, bson.M{"type": filterType, "category": category}).Decode(&preset)
	return preset.ID, err
}

func (fas *FilterAnalyticsService) isValidMoodType(mood models.MoodFilterType) bool {
	validMoods := []models.MoodFilterType{
		models.MoodHappy, models.MoodDramatic, models.MoodCozy,
		models.MoodEnergetic, models.MoodCalm, models.MoodMysterious,
		models.MoodRomantic,
	}

	for _, validMood := range validMoods {
		if mood == validMood {
			return true
		}
	}
	return false
}

func (fas *FilterAnalyticsService) isValidArtisticType(style models.ArtisticFilterType) bool {
	validStyles := []models.ArtisticFilterType{
		models.ArtisticWatercolor, models.ArtisticOilPainting,
		models.ArtisticCyberpunk, models.ArtisticAnime,
		models.ArtisticSketch, models.ArtisticVintage,
		models.ArtisticNoir,
	}

	for _, validStyle := range validStyles {
		if style == validStyle {
			return true
		}
	}
	return false
}
