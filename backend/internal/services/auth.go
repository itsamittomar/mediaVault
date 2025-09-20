package services

import (
	"context"
	"errors"
	"time"

	"mediaVault-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db         *DatabaseService
	jwtService *JWTService
}

func NewAuthService(db *DatabaseService, jwtService *JWTService) *AuthService {
	return &AuthService{
		db:         db,
		jwtService: jwtService,
	}
}

func (a *AuthService) Register(ctx context.Context, req *models.RegisterRequest) (*models.AuthResponse, error) {
	// Check if user already exists
	existingUser := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"email": req.Email},
			{"username": req.Username},
		},
	}).Decode(existingUser)

	if err == nil {
		return nil, errors.New("user with this email or username already exists")
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		ID:        primitive.NewObjectID(),
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Role:      "user", // Default role
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Insert user
	_, err = a.db.database.Collection("users").InsertOne(ctx, user)
	if err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, refreshToken, err := a.jwtService.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (a *AuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	// Find user by email
	user := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"email": req.Email}).Decode(user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	accessToken, refreshToken, err := a.jwtService.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (a *AuthService) RefreshToken(ctx context.Context, req *models.RefreshTokenRequest) (*models.AuthResponse, error) {
	// Validate refresh token
	claims, err := a.jwtService.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Find user
	user := &models.User{}
	err = a.db.database.Collection("users").FindOne(ctx, bson.M{"_id": claims.UserID}).Decode(user)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Generate new tokens
	accessToken, refreshToken, err := a.jwtService.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (a *AuthService) GetUserByID(ctx context.Context, userID primitive.ObjectID) (*models.User, error) {
	user := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(user)
	if err != nil {
		return nil, err
	}
	return user, nil
}