package db

import "gorm.io/gorm"

type Role struct {
	gorm.Model

	Role        string `json:"role"        gorm:"uniqueIndex"`
	Description string `json:"description"`
	IsOwner     bool   `json:"is_owner"`
	IsDefault   bool   `json:"is_default"`
}

func (d *Database) GetDefaultRole() (*Role, error) {
	var role Role
	if err := d.Where(&Role{IsDefault: true}).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (d *Database) GetOwnerRole() (*Role, error) {
	var role Role
	if err := d.Where(&Role{IsOwner: true}).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (d *Database) GetRole(id uint) (*Role, error) {
	var role Role
	if err := d.First(&role, id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (d *Database) GetRoles() ([]Role, error) {
	var roles []Role
	if err := d.Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}
