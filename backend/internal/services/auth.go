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
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Check if user already exists - separate checks for better error handling
	existingUser := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"email": req.Email}).Decode(existingUser)
	if err == nil {
		return nil, models.ErrEmailExists
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	err = a.db.database.Collection("users").FindOne(ctx, bson.M{"username": req.Username}).Decode(existingUser)
	if err == nil {
		return nil, models.ErrUsernameExists
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Hash password with higher cost for better security
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
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
	if err := models.ValidateEmail(req.Email); err != nil {
		return nil, err
	}

	// Find user by email
	user := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"email": req.Email}).Decode(user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrInvalidCredentials
		}
		return nil, err
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, models.ErrInvalidCredentials
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

func (a *AuthService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req *models.UpdateProfileRequest) (*models.User, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Check for conflicts if email or username is being updated
	if req.Email != nil {
		existingUser := &models.User{}
		err := a.db.database.Collection("users").FindOne(ctx, bson.M{
			"email": *req.Email,
			"_id":   bson.M{"$ne": userID},
		}).Decode(existingUser)
		if err == nil {
			return nil, models.ErrEmailExists
		} else if err != mongo.ErrNoDocuments {
			return nil, err
		}
	}

	if req.Username != nil {
		existingUser := &models.User{}
		err := a.db.database.Collection("users").FindOne(ctx, bson.M{
			"username": *req.Username,
			"_id":      bson.M{"$ne": userID},
		}).Decode(existingUser)
		if err == nil {
			return nil, models.ErrUsernameExists
		} else if err != mongo.ErrNoDocuments {
			return nil, err
		}
	}

	// Build update document
	updateDoc := bson.M{"updatedAt": time.Now()}
	if req.Username != nil {
		updateDoc["username"] = *req.Username
	}
	if req.Email != nil {
		updateDoc["email"] = *req.Email
	}
	if req.Avatar != nil {
		updateDoc["avatar"] = *req.Avatar
	}

	// Update user
	_, err := a.db.database.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		return nil, err
	}

	return a.GetUserByID(ctx, userID)
}

func (a *AuthService) ChangePassword(ctx context.Context, userID primitive.ObjectID, req *models.ChangePasswordRequest) error {
	if err := models.ValidatePassword(req.NewPassword); err != nil {
		return err
	}

	// Get current user
	user, err := a.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify current password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword))
	if err != nil {
		return models.ErrInvalidCredentials
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return err
	}

	// Update password
	_, err = a.db.database.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"password":  string(hashedPassword),
			"updatedAt": time.Now(),
		}},
	)
	return err
}
