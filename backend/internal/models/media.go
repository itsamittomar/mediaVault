package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MediaFile struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	FileName     string             `json:"fileName" bson:"fileName"`
	OriginalName string             `json:"originalName" bson:"originalName"`
	Title        string             `json:"title" bson:"title"`
	Description  *string            `json:"description" bson:"description,omitempty"`
	MimeType     string             `json:"mimeType" bson:"mimeType"`
	Size         int64              `json:"size" bson:"size"`
	Category     *string            `json:"category" bson:"category,omitempty"`
	Tags         []string           `json:"tags" bson:"tags"`
	UserID       primitive.ObjectID `json:"userId" bson:"userId"`
	URL          string             `json:"url" bson:"-"` // Not stored in DB, generated on request
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type CreateMediaRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description *string  `json:"description"`
	Category    *string  `json:"category"`
	Tags        []string `json:"tags"`
}

type UpdateMediaRequest struct {
	Title       *string  `json:"title"`
	Description *string  `json:"description"`
	Category    *string  `json:"category"`
	Tags        []string `json:"tags"`
}

type MediaResponse struct {
	ID           primitive.ObjectID `json:"id"`
	FileName     string             `json:"fileName"`
	OriginalName string             `json:"originalName"`
	Title        string             `json:"title"`
	Description  *string            `json:"description"`
	MimeType     string             `json:"mimeType"`
	Size         int64              `json:"size"`
	Category     *string            `json:"category"`
	Tags         []string           `json:"tags"`
	UserID       primitive.ObjectID `json:"userId"`
	URL          string             `json:"url"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
}

type MediaQuery struct {
	Category string `form:"category"`
	Type     string `form:"type"`
	Search   string `form:"search"`
	Page     int    `form:"page" binding:"min=1"`
	Limit    int    `form:"limit" binding:"min=1,max=100"`
}