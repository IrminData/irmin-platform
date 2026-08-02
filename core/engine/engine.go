package engine

import (
	"context"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log/slog"
)

// PermissionChecker interface defines the method for checking permissions.
type PermissionChecker interface {
	IsAllowed(
		user *db.User,
		workspace *db.Workspace,
		resource db.PolicyResource,
		resourceID *uint,
		action db.PolicyAction,
	) (bool, error)
}

// Client represents the Irmin Data Engine API client.
type Client struct {
	ctx               context.Context
	LakeFSClient      *lakefs.Client
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	DB                *db.Database
	PermissionChecker PermissionChecker
}

// NewClient creates a new Irmin Data Engine API client with default
// settings. Connector responses are English-only — the client carries
// no locale state and stamps no Accept-Language header on outbound
// connector calls.
func NewClient(
	ctx context.Context,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	db *db.Database,
) (*Client, error) {
	// Create LakeFS client.
	lakefsClient, err := lakefs.CreateClient(ctx, logger, env)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create LakeFS client", "error", err)
		return nil, err
	}

	// Construct the Client
	client := &Client{
		ctx:          ctx,
		LakeFSClient: lakefsClient,
		Env:          env,
		Logger:       logger,
		DB:           db,
	}
	return client, nil
}

// SetPermissionChecker sets the PermissionChecker for the client.
func (c *Client) SetPermissionChecker(pc PermissionChecker) {
	c.PermissionChecker = pc
}
