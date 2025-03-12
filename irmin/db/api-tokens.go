package db

import (
	"time"

	"gorm.io/gorm"
)

type APIToken struct {
	gorm.Model

	Name      string    `json:"name"`
	Token     string    `json:"token,omitempty" gorm:"uniqueIndex"`
	ExpiresAt time.Time `json:"expiry"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	UserID    uint      `json:"user_id"`
}

type APITokenResponse struct {
	ID        uint      `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Name      string    `json:"name"`
	Token     string    `json:"token,omitempty"`
	ExpiresAt time.Time `json:"expiry"`
}

// GetAPIToken retrieves an API token by its ID.
func GetAPIToken(id uint) (*APIToken, error) {
	var t APIToken
	if err := DB.Where("id = ?", id).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// GetAPITokenByToken retrieves an API token by its token value.
func GetAPITokenByToken(token string) (*APIToken, error) {
	var t APIToken
	if err := DB.Preload("User").Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// GetAPITokensByUserID retrieves all API tokens for a user.
func GetAPITokensByUserID(userID uint) ([]APIToken, error) {
	var tokens []APIToken
	if err := DB.Where("user_id = ?", userID).Find(&tokens).Error; err != nil {
		return nil, err
	}
	return tokens, nil
}

// CreateAPIToken creates a new API token.
func CreateAPIToken(token *APIToken) (*APIToken, error) {
	if err := DB.Create(&token).Error; err != nil {
		return nil, err
	}
	return token, nil
}

// DeleteAPIToken deletes an API token by its ID.
func DeleteAPIToken(id uint) error {
	return DB.Where("id = ?", id).Delete(&APIToken{}).Error
}
