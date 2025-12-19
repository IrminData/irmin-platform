package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

func FormatTemplateResponse(
	template *db.Template,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.Template, error) {
	// Construct the sqid of the template
	templateSqid, err := sqidManager.Encode("templates", uint64(template.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding template sqid: %w", err)
	}

	// Construct the template object
	templateResponse := irminmodels.Template{
		ID:           templateSqid,
		Title:        template.Title,
		Description:  template.Description,
		Content:      template.Content,
		Type:         template.Type,
		Language:     template.Language,
		Tags:         template.Tags,
		Placeholders: template.Placeholders,
	}

	// Ensure Tags and Placeholders are not nil
	if templateResponse.Tags == nil {
		templateResponse.Tags = []string{}
	}
	if templateResponse.Placeholders == nil {
		templateResponse.Placeholders = []irminmodels.TemplatePlaceholder{}
	}

	return &templateResponse, nil
}
