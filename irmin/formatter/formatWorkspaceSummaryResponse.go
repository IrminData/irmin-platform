package formatter

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatWorkspaceSummaryResponse formats a WorkspaceSummaryRow into a WorkspaceSummary API response.
func FormatWorkspaceSummaryResponse(
	summary *db.WorkspaceSummaryRow,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.WorkspaceSummary, error) {
	sqid, _ := sqidManager.Encode("workspaces", uint64(summary.ID))
	ownerSqid, _ := sqidManager.Encode("users", uint64(summary.Owner.ID))

	var lastAccessedAt *string
	if summary.LastAccessedAt != nil {
		formatted := summary.LastAccessedAt.Format("2006-01-02T15:04:05Z")
		lastAccessedAt = &formatted
	}

	return &irminmodels.WorkspaceSummary{
		ID:          sqid,
		Name:        summary.Name,
		Slug:        summary.Slug,
		Description: summary.Description,
		Owner: irminmodels.User{
			ID:             ownerSqid,
			FirstName:      summary.Owner.FirstName,
			LastName:       summary.Owner.LastName,
			Email:          summary.Owner.Email,
			Phone:          summary.Owner.Phone,
			Company:        summary.Owner.Company,
			ProfilePicture: summary.Owner.ProfilePicture,
		},
		MemberCount:     summary.MemberCount,
		RepositoryCount: summary.RepositoryCount,
		WorkflowCount:   summary.WorkflowCount,
		ConnectionCount: summary.ConnectionCount,
		LastAccessedAt:  lastAccessedAt,
	}, nil
}
