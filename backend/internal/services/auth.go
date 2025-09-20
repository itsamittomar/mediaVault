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
	// Validate request
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Check if user with email already exists
	existingUserByEmail := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"email": req.Email}).Decode(existingUserByEmail)
	if err == nil {
		return nil, models.ErrEmailExists
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Check if user with username already exists
	existingUserByUsername := &models.User{}
	err = a.db.database.Collection("users").FindOne(ctx, bson.M{"username": req.Username}).Decode(existingUserByUsername)
	if err == nil {
		return nil, models.ErrUsernameExists
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Hash password with higher cost for better security
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user with validation
	now := time.Now()
	user := &models.User{
		ID:        primitive.NewObjectID(),
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Role:      "user", // Default role
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Insert user with transaction safety
	_, err = a.db.database.Collection("users").InsertOne(ctx, user)
	if err != nil {
		return nil, errors.New("failed to create user account")
	}

	// Generate JWT tokens
	accessToken, refreshToken, err := a.jwtService.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate authentication tokens")
	}

	return &models.AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (a *AuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	// Validate request
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Find user by email with proper error handling
	user := &models.User{}
	err := a.db.database.Collection("users").FindOne(ctx, bson.M{"email": req.Email}).Decode(user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, models.ErrInvalidCredentials
		}
		return nil, errors.New("database error during login")
	}

	// Verify password with timing attack protection
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, models.ErrInvalidCredentials
	}

	// Update last login time
	now := time.Now()
	_, err = a.db.database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": user.ID},
		bson.M{"$set": bson.M{"updatedAt": now}},
	)
	if err != nil {
		// Log error but don't fail login
		// In production, you'd use a proper logger here
	}

	// Generate JWT tokens
	accessToken, refreshToken, err := a.jwtService.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate authentication tokens")
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
	// Validate request
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Ensure at least one field is being updated
	if req.Username == "" && req.Email == "" {
		return nil, errors.New("at least one field must be provided for update")
	}

	// Get current user to ensure they exist
	currentUser, err := a.GetUserByID(ctx, userID)
	if err != nil {
		return nil, models.ErrUserNotFound
	}

	// Build update document with proper validation
	updateDoc := bson.M{"updatedAt": time.Now()}

	if req.Username != "" && req.Username != currentUser.Username {
		// Check if username is already taken by another user
		existingUser := &models.User{}
		err := a.db.database.Collection("users").FindOne(ctx, bson.M{
			"username": req.Username,
			"_id":      bson.M{"$ne": userID},
		}).Decode(existingUser)

		if err == nil {
			return nil, models.ErrUsernameExists
		} else if err != mongo.ErrNoDocuments {
			return nil, errors.New("database error during username validation")
		}

		updateDoc["username"] = req.Username
	}

	if req.Email != "" && req.Email != currentUser.Email {
		// Check if email is already taken by another user
		existingUser := &models.User{}
		err := a.db.database.Collection("users").FindOne(ctx, bson.M{
			"email": req.Email,
			"_id":   bson.M{"$ne": userID},
		}).Decode(existingUser)

		if err == nil {
			return nil, models.ErrEmailExists
		} else if err != mongo.ErrNoDocuments {
			return nil, errors.New("database error during email validation")
		}

		updateDoc["email"] = req.Email
	}

	// If no changes needed, return current user
	if len(updateDoc) == 1 { // Only updatedAt field
		return currentUser, nil
	}

	// Update user with transaction safety
	result, err := a.db.database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		return nil, errors.New("failed to update profile")
	}

	if result.ModifiedCount == 0 {
		return nil, errors.New("no changes made to profile")
	}

	// Return updated user
	return a.GetUserByID(ctx, userID)
}

func (a *AuthService) ChangePassword(ctx context.Context, userID primitive.ObjectID, req *models.ChangePasswordRequest) error {
	// Validate request
	if err := req.Validate(); err != nil {
		return err
	}

	// Prevent same password
	if req.CurrentPassword == req.NewPassword {
		return errors.New("new password must be different from current password")
	}

	// Get current user with proper error handling
	user, err := a.GetUserByID(ctx, userID)
	if err != nil {
		return models.ErrUserNotFound
	}

	// Verify current password with timing attack protection
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword))
	if err != nil {
		return errors.New("current password is incorrect")
	}

	// Hash new password with higher security cost
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return errors.New("failed to hash new password")
	}

	// Update password with transaction safety
	result, err := a.db.database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"password":  string(hashedPassword),
			"updatedAt": time.Now(),
		}},
	)
	if err != nil {
		return errors.New("failed to update password")
	}

	if result.ModifiedCount == 0 {
		return errors.New("password was not updated")
	}

	return nil
}

func (a *AuthService) UpdateAvatar(ctx context.Context, userID primitive.ObjectID, avatarFileName string) (*models.User, error) {
	// Update avatar
	_, err := a.db.database.Collection("users").UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"avatar":    avatarFileName,
			"updatedAt": time.Now(),
		}},
	)
	if err != nil {
		return nil, err
	}

	// Return updated user
	return a.GetUserByID(ctx, userID)
}
