package irminmodels

import "time"

// AIApplicationDataSource represents a data source for an AI application.
type AIApplicationDataSource struct {
	Repository string `json:"repository" validate:"required" example:"customer-analytics"`
	Branch     string `json:"branch"     validate:"required" example:"main"`
	Path       string `json:"path"       validate:"required" example:"/data/customers"`
}

// AIApplication represents an AI application in the system.
type AIApplication struct {
	ID             string                    `json:"id"              validate:"required,validsqid=ai_applications" example:"ai_8x2m9k4n7p5q"`
	Name           string                    `json:"name"            validate:"required,max=100"                   example:"Customer Analytics App"`
	Description    string                    `json:"description"     validate:"max=500"                            example:"AI application for customer data analysis"`
	Documentation  string                    `json:"documentation"   validate:"validdocumentation"                 example:"# Customer Analytics"`
	AllowedOrigins []string                  `json:"allowed_origins" validate:"dive,max=255"                       example:"https://app.example.com,http://localhost:3000"`
	DataSources    []AIApplicationDataSource `json:"data_sources"    validate:"dive"`
	Owner          User                      `json:"owner"           validate:"required"`
	Tags           []Tag                     `json:"tags,omitempty"  validate:"dive"`
	CreatedAt      time.Time                 `json:"created_at"      validate:"required"                           example:"2025-01-15T10:30:00Z"`
	UpdatedAt      time.Time                 `json:"updated_at"      validate:"required"                           example:"2025-12-01T14:22:30Z"`
}
