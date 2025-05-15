package engine

import (
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"
)

// Client represents the Irmin Data Engine API client.
type Client struct {
	Locale       string
	LakeFSClient *lakefs.Client
	Env          *utils.CoreAPIEnv
}

// NewClient creates a new Irmin Data Engine API client with default settings.
func NewClient(locale string) *Client {
	// Create LakeFS client.
	lakefsClient, env, err := lakefs.CreateClient()
	if err != nil {
		fmt.Printf("failed to create LakeFS client: %v\n", err)
		return nil
	}

	// Construct the Client
	return &Client{
		Locale:       locale,
		LakeFSClient: lakefsClient,
		Env:          env,
	}
}
