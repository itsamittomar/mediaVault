package models

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username  string             `json:"username" bson:"username"`
	Email     string             `json:"email" bson:"email"`
	Password  string             `json:"-" bson:"password"` // Never return password in JSON
	Role      string             `json:"role" bson:"role"`   // "admin" or "user"
	Avatar    string             `json:"avatar,omitempty" bson:"avatar,omitempty"` // Avatar file name/path
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
	Avatar    string             `json:"avatar,omitempty"`
	CreatedAt time.Time          `json:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
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

// Profile update requests
type UpdateProfileRequest struct {
	Username string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Email    string `json:"email,omitempty" binding:"omitempty,email"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required,min=6"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// Validation errors
var (
	ErrInvalidEmail      = errors.New("invalid email format")
	ErrInvalidUsername   = errors.New("username must be 3-50 characters and contain only letters, numbers, and underscores")
	ErrWeakPassword      = errors.New("password must be at least 6 characters long")
	ErrInvalidRole       = errors.New("role must be either 'user' or 'admin'")
	ErrUsernameExists    = errors.New("username already exists")
	ErrEmailExists       = errors.New("email already exists")
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid email or password")
)

// Regular expressions for validation
var (
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,50}$`)
)

// ValidateEmail validates email format using regex
func ValidateEmail(email string) error {
	if email == "" {
		return ErrInvalidEmail
	}
	email = strings.TrimSpace(strings.ToLower(email))
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}
	return nil
}

// ValidateUsername validates username format and length
func ValidateUsername(username string) error {
	if username == "" {
		return ErrInvalidUsername
	}
	username = strings.TrimSpace(username)
	if !usernameRegex.MatchString(username) {
		return ErrInvalidUsername
	}
	return nil
}

// ValidatePassword validates password strength
func ValidatePassword(password string) error {
	if len(password) < 6 {
		return ErrWeakPassword
	}
	return nil
}

// ValidateRole validates user role
func ValidateRole(role string) error {
	if role != "user" && role != "admin" {
		return ErrInvalidRole
	}
	return nil
}

// Validate validates the RegisterRequest
func (r *RegisterRequest) Validate() error {
	if err := ValidateEmail(r.Email); err != nil {
		return err
	}
	if err := ValidateUsername(r.Username); err != nil {
		return err
	}
	if err := ValidatePassword(r.Password); err != nil {
		return err
	}

	// Clean up inputs
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Username = strings.TrimSpace(r.Username)

	return nil
}

// Validate validates the LoginRequest
func (r *LoginRequest) Validate() error {
	if err := ValidateEmail(r.Email); err != nil {
		return err
	}
	if len(r.Password) == 0 {
		return ErrWeakPassword
	}

	// Clean up email input
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))

	return nil
}

// Validate validates the UpdateProfileRequest
func (r *UpdateProfileRequest) Validate() error {
	if r.Email != "" {
		if err := ValidateEmail(r.Email); err != nil {
			return err
		}
		r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	}

	if r.Username != "" {
		if err := ValidateUsername(r.Username); err != nil {
			return err
		}
		r.Username = strings.TrimSpace(r.Username)
	}

	return nil
}

// Validate validates the ChangePasswordRequest
func (r *ChangePasswordRequest) Validate() error {
	if len(r.CurrentPassword) == 0 {
		return errors.New("current password is required")
	}
	if err := ValidatePassword(r.NewPassword); err != nil {
		return err
	}
	return nil
}

// IsAdmin checks if user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

// HasPermission checks if user has permission for a specific action
func (u *User) HasPermission(action string) bool {
	switch action {
	case "manage_users", "delete_any_file", "view_admin_panel":
		return u.IsAdmin()
	case "upload_file", "view_own_files", "update_profile":
		return true // All authenticated users can do these
	default:
		return false
	}
}