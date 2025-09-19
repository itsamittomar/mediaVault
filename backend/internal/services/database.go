package services

import (
	"context"
	"fmt"
	"time"

	"mediaVault-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DatabaseService struct {
	client     *mongo.Client
	database   *mongo.Database
	collection *mongo.Collection
}

func NewDatabaseService(mongoURI, dbName string) (*DatabaseService, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test connection
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	database := client.Database(dbName)
	collection := database.Collection("media_files")

	// Create indexes
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "fileName", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	}

	_, err = collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return nil, fmt.Errorf("failed to create index: %w", err)
	}

	return &DatabaseService{
		client:     client,
		database:   database,
		collection: collection,
	}, nil
}

func (ds *DatabaseService) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return ds.client.Disconnect(ctx)
}

func (ds *DatabaseService) CreateMediaFile(ctx context.Context, media *models.MediaFile) error {
	media.CreatedAt = time.Now()
	media.UpdatedAt = time.Now()

	result, err := ds.collection.InsertOne(ctx, media)
	if err != nil {
		return fmt.Errorf("failed to create media file: %w", err)
	}

	media.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (ds *DatabaseService) GetMediaFileByID(ctx context.Context, id string) (*models.MediaFile, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid ID format: %w", err)
	}

	var media models.MediaFile
	err = ds.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&media)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("media file not found")
		}
		return nil, fmt.Errorf("failed to get media file: %w", err)
	}

	return &media, nil
}

func (ds *DatabaseService) GetMediaFileByFileName(ctx context.Context, fileName string) (*models.MediaFile, error) {
	var media models.MediaFile
	err := ds.collection.FindOne(ctx, bson.M{"fileName": fileName}).Decode(&media)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("media file not found")
		}
		return nil, fmt.Errorf("failed to get media file: %w", err)
	}

	return &media, nil
}

func (ds *DatabaseService) UpdateMediaFile(ctx context.Context, id string, updates *models.UpdateMediaRequest) (*models.MediaFile, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid ID format: %w", err)
	}

	updateDoc := bson.M{
		"updatedAt": time.Now(),
	}

	if updates.Title != nil {
		updateDoc["title"] = *updates.Title
	}
	if updates.Description != nil {
		updateDoc["description"] = *updates.Description
	}
	if updates.Category != nil {
		updateDoc["category"] = *updates.Category
	}
	if updates.Tags != nil {
		updateDoc["tags"] = updates.Tags
	}

	_, err = ds.collection.UpdateOne(
		ctx,
		bson.M{"_id": objectID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update media file: %w", err)
	}

	return ds.GetMediaFileByID(ctx, id)
}

func (ds *DatabaseService) DeleteMediaFile(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid ID format: %w", err)
	}

	result, err := ds.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return fmt.Errorf("failed to delete media file: %w", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("media file not found")
	}

	return nil
}

func (ds *DatabaseService) ListMediaFiles(ctx context.Context, query models.MediaQuery) ([]*models.MediaFile, error) {
	filter := bson.M{}

	// Apply category filter
	if query.Category != "" {
		filter["category"] = query.Category
	}

	// Apply type filter based on mimeType
	if query.Type != "" {
		switch query.Type {
		case "image":
			filter["mimeType"] = bson.M{"$regex": "^image/", "$options": "i"}
		case "video":
			filter["mimeType"] = bson.M{"$regex": "^video/", "$options": "i"}
		case "audio":
			filter["mimeType"] = bson.M{"$regex": "^audio/", "$options": "i"}
		case "document":
			filter["mimeType"] = bson.M{"$not": bson.M{"$regex": "^(image|video|audio)/", "$options": "i"}}
		}
	}

	// Apply search filter
	if query.Search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": query.Search, "$options": "i"}},
			{"originalName": bson.M{"$regex": query.Search, "$options": "i"}},
			{"description": bson.M{"$regex": query.Search, "$options": "i"}},
			{"tags": bson.M{"$in": []string{query.Search}}},
		}
	}

	// Set default values
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 20
	}

	// Calculate skip
	skip := (query.Page - 1) * query.Limit

	// Find options
	findOptions := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetLimit(int64(query.Limit)).
		SetSkip(int64(skip))

	cursor, err := ds.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to find media files: %w", err)
	}
	defer cursor.Close(ctx)

	var mediaFiles []*models.MediaFile
	if err = cursor.All(ctx, &mediaFiles); err != nil {
		return nil, fmt.Errorf("failed to decode media files: %w", err)
	}

	return mediaFiles, nil
}

func (ds *DatabaseService) CountMediaFiles(ctx context.Context, query models.MediaQuery) (int64, error) {
	filter := bson.M{}

	// Apply category filter
	if query.Category != "" {
		filter["category"] = query.Category
	}

	// Apply search filter
	if query.Search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": query.Search, "$options": "i"}},
			{"originalName": bson.M{"$regex": query.Search, "$options": "i"}},
			{"description": bson.M{"$regex": query.Search, "$options": "i"}},
			{"tags": bson.M{"$in": []string{query.Search}}},
		}
	}

	count, err := ds.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count media files: %w", err)
	}

	return count, nil
}

func (ds *DatabaseService) GetCategories(ctx context.Context) ([]string, error) {
	pipeline := []bson.M{
		{"$group": bson.M{
			"_id": "$category",
		}},
		{"$match": bson.M{
			"_id": bson.M{"$ne": nil},
		}},
		{"$sort": bson.M{
			"_id": 1,
		}},
	}

	cursor, err := ds.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode categories: %w", err)
	}

	var categories []string
	for _, result := range results {
		if category, ok := result["_id"].(string); ok {
			categories = append(categories, category)
		}
	}

	return categories, nil
}
