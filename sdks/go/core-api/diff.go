package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// DiffService provides methods to compare and merge refs
type DiffService struct {
	client *Client
}

// NewDiffService creates a new instance of DiffService
func NewDiffService(client *Client) *DiffService {
	return &DiffService{
		client: client,
	}
}

// CompareRefs compares two refs in a repository and returns the differences
func (s *DiffService) CompareRefs(repository, baseRef, compareRef string) (*irminModels.Diff, *irminModels.IrminAPIResponse, error) {
	endpoint := fmt.Sprintf("/v1/repositories/%s/compare?base_ref=%s&compare_ref=%s", repository, baseRef, compareRef)

	var diff irminModels.Diff
	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: endpoint,
	}, &diff)
	if err != nil {
		return nil, nil, fmt.Errorf("compare refs error: %w", err)
	}
	return &diff, apiResp, nil
}

// MergeRefs merges one ref into another
func (s *DiffService) MergeRefs(repository, baseRef, compareRef, description, strategy string) (*irminModels.IrminAPIResponse, error) {
	form := map[string]string{
		"base_ref":    baseRef,
		"compare_ref": compareRef,
		"description": description,
		"strategy":    strategy, // The merge strategy (default, source-wins, dest-wins)
	}

	apiResp, err := s.client.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/repositories/%s/merge", repository),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("merge refs error: %w", err)
	}
	return apiResp, nil
}
