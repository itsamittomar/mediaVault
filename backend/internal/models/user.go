package models

import (
	"errors"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidUsername    = errors.New("username must be 3-50 characters, alphanumeric and underscore only")
	ErrWeakPassword       = errors.New("password must be at least 6 characters")
	ErrUsernameExists     = errors.New("username already exists")
	ErrEmailExists        = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username  string             `json:"username" bson:"username"`
	Email     string             `json:"email" bson:"email"`
	Password  string             `json:"-" bson:"password"` // Never return password in JSON
	Role      string             `json:"role" bson:"role"`  // "admin" or "user"
	Avatar    string             `json:"avatar" bson:"avatar"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	User         *UserResponse `json:"user"`
	AccessToken  string        `json:"accessToken"`
	RefreshToken string        `json:"refreshToken"`
}

type UserResponse struct {
	ID        primitive.ObjectID `json:"id"`
	Username  string             `json:"username"`
	Email     string             `json:"email"`
	Role      string             `json:"role"`
	Avatar    string             `json:"avatar"`
	CreatedAt time.Time          `json:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type UpdateProfileRequest struct {
	Username *string `json:"username,omitempty"`
	Email    *string `json:"email,omitempty"`
	Avatar   *string `json:"avatar,omitempty"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

func ValidateEmail(email string) error {
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}
	return nil
}

func ValidateUsername(username string) error {
	if len(username) < 3 || len(username) > 50 {
		return ErrInvalidUsername
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 6 {
		return ErrWeakPassword
	}
	return nil
}

func (req *RegisterRequest) Validate() error {
	if err := ValidateEmail(req.Email); err != nil {
		return err
	}
	if err := ValidateUsername(req.Username); err != nil {
		return err
	}
	if err := ValidatePassword(req.Password); err != nil {
		return err
	}
	return nil
}

func (req *UpdateProfileRequest) Validate() error {
	if req.Email != nil {
		if err := ValidateEmail(*req.Email); err != nil {
			return err
		}
	}
	if req.Username != nil {
		if err := ValidateUsername(*req.Username); err != nil {
			return err
		}
	}
	return nil
}

func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		Role:      u.Role,
		Avatar:    u.Avatar,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
