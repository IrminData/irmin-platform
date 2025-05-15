package db

import (
	"time"

	"gorm.io/gorm"
)

type APIToken struct {
	gorm.Model

	Name      string    `json:"name"`
	Hidden    bool      `json:"hidden"`
	Token     string    `json:"token,omitempty" gorm:"uniqueIndex"`
	ExpiresAt time.Time `json:"expiry"`
	User      User      `json:"user"            gorm:"foreignKey:UserID"`
	UserID    uint      `json:"user_id"`
}

// GetAPIToken retrieves an API token by its ID.
func (d *Database) GetAPIToken(id uint) (*APIToken, error) {
	var t APIToken
	if err := d.Where("id = ?", id).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// GetAPITokenByToken retrieves an API token by its token value.
func (d *Database) GetAPITokenByToken(token string) (*APIToken, error) {
	var t APIToken
	if err := d.Preload("User").Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// GetAPITokensByUserID retrieves all API tokens for a user.
func (d *Database) GetAPITokensByUserID(userID uint) ([]APIToken, error) {
	var tokens []APIToken
	if err := d.Where("user_id = ?", userID).Order("created_at desc").Find(&tokens).Error; err != nil {
		return nil, err
	}
	return tokens, nil
}

// CreateAPIToken creates a new API token.
func (d *Database) CreateAPIToken(token *APIToken) (*APIToken, error) {
	if err := d.Create(&token).Error; err != nil {
		return nil, err
	}
	return token, nil
}

// DeleteAPIToken deletes an API token by its ID.
func (d *Database) DeleteAPIToken(id uint) error {
	return d.Where("id = ?", id).Delete(&APIToken{}).Error
}
