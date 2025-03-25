package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
)

func FormatStoredQueryResponse(query *db.StoredQuery) (*db.StoredQueryResponse, error) {
	// Construct the owner sqid
	ownerSqid, err := utils.EncodeSqids("users", uint64(query.OwnerID))
	if err != nil {
		return nil, fmt.Errorf("error encoding user sqid: %w", err)
	}
	// Construct the owner object
	ownerResponse := db.UserResponse{
		ID:             ownerSqid,
		FirstName:      query.Owner.FirstName,
		LastName:       query.Owner.LastName,
		Email:          query.Owner.Email,
		Phone:          query.Owner.Phone,
		Company:        query.Owner.Company,
		ProfilePicture: query.Owner.ProfilePicture,
	}
	// Construct the sqid of the query
	querySqid, err := utils.EncodeSqids("queries", uint64(query.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding query sqid: %w", err)
	}
	// Construct the query object
	queryResponse := db.StoredQueryResponse{
		ID:          querySqid,
		Name:        query.Name,
		Description: query.Description,
		SQL:         query.SQL,
		Owner:       ownerResponse,
		CreatedAt:   query.CreatedAt,
		UpdatedAt:   query.UpdatedAt,
	}

	return &queryResponse, nil
}
