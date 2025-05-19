package engine

import (
	"context"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log/slog"
)

// Client represents the Irmin Data Engine API client.
type Client struct {
	ctx          context.Context
	Locale       string
	LakeFSClient *lakefs.Client
	Logger       *slog.Logger
	Env          *utils.CoreAPIEnv
}

// NewClient creates a new Irmin Data Engine API client with default settings.
func NewClient(ctx context.Context, locale string, logger *slog.Logger, env *utils.CoreAPIEnv) (*Client, error) {
	// Create LakeFS client.
	lakefsClient, err := lakefs.CreateClient(ctx, logger, env)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create LakeFS client", "error", err)
		return nil, err
	}

	// Construct the Client
	client := &Client{
		ctx:          ctx,
		Locale:       locale,
		LakeFSClient: lakefsClient,
		Env:          env,
		Logger:       logger,
	}
	return client, nil
}
