package db

import (
	"errors"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// Template represents a template from which a script or query can be created.
type Template struct {
	gorm.Model
	Title        string                            `json:"title"`
	Description  string                            `json:"description"`
	Content      string                            `json:"content"`
	Type         irminmodels.TemplateType          `json:"type"`
	Language     irminmodels.TemplateLanguage      `json:"language"`
	Tags         []string                          `json:"tags"         gorm:"type:jsonb;serializer:json"`
	Placeholders []irminmodels.TemplatePlaceholder `json:"placeholders" gorm:"type:jsonb;serializer:json"`
}

// GetTemplatesByType retrieves all templates of a specific type from the database.
func (d *Database) GetTemplatesByType(templateType irminmodels.TemplateType) ([]Template, error) {
	var templates []Template
	if err := d.Where("type = ?", templateType).Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// UpsertTemplate creates or updates a template based on title and type.
func (d *Database) UpsertTemplate(template *Template) error {
	var existing Template
	err := d.Where("title = ? AND type = ?", template.Title, template.Type).First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Template doesn't exist, create it
		return d.Create(template).Error
	} else if err != nil {
		// Some other error occurred
		return err
	}

	// Template exists, update it
	template.ID = existing.ID
	template.CreatedAt = existing.CreatedAt
	return d.Save(template).Error
}

// DeleteTemplatesNotInIDs deletes all templates that are not in the provided list of IDs.
func (d *Database) DeleteTemplatesNotInIDs(ids []uint) error {
	if len(ids) == 0 {
		// If no IDs provided, delete all templates
		return d.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&Template{}).Error
	}
	return d.Where("id NOT IN ?", ids).Delete(&Template{}).Error
}
