package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatStoredQueryResponse(
	query *db.StoredQuery,
	sqidManager *utils.SQIDManager,
) (*irminmodels.StoredQuery, error) {
	// Structure the owner response.
	ownerResponse, err := FormatUserResponse(&query.Owner, sqidManager)
	if err != nil {
		return nil, err
	}

	// Format the query tags
	tags, err := FormatTagsResponse(query.Tags, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting query tags: %w", err)
	}

	// Construct the sqid of the query
	querySqid, err := sqidManager.Encode("queries", uint64(query.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding query sqid: %w", err)
	}

	// Construct the query object
	queryResponse := irminmodels.StoredQuery{
		ID:          querySqid,
		Name:        query.Name,
		Description: query.Description,
		SQL:         query.SQL,
		Owner:       *ownerResponse,
		Tags:        tags,
		CreatedAt:   query.CreatedAt,
		UpdatedAt:   query.UpdatedAt,
	}

	return &queryResponse, nil
}
