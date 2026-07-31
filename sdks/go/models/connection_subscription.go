package irminmodels

// ConnectionSubscription represents a subscription to data changes in a connection.
// When data changes in the external system, the connector sends webhook events
// to the Irmin API using the WebhookToken for authentication.
type ConnectionSubscription struct {
	ID           string   `json:"id"                     validate:"required,validsqid=connection_subscriptions"  example:"cs_5p8q2n7m9x4k"`
	Name         string   `json:"name"                   validate:"required,max=255"                             example:"CRM Lead Changes"`
	Description  string   `json:"description,omitempty"  validate:"max=1000"                                     example:"Subscribe to lead changes in the CRM"`
	ConnectionID string   `json:"connection_id"          validate:"required,validsqid=connections"               example:"conn_5p8q2n7m9x4k"`
	FilterPaths  []string `json:"filter_paths,omitempty" validate:"dive,max=500"                                 example:"leads,contacts"`
	EventTypes   []string `json:"event_types,omitempty"  validate:"dive,oneof=insert update delete upsert batch" example:"insert,update"`
	IsActive     bool     `json:"is_active"                                                                      example:"true"`
	WebhookURL   string   `json:"webhook_url,omitempty"  validate:"omitempty,url"                                example:"https://api.irmin.co/api/v1/webhooks/connectors/conn_123"`
	Owner        *User    `json:"owner,omitempty"`
	CreatedAt    string   `json:"created_at,omitempty"                                                           example:"2024-01-15T10:30:00Z"`
	UpdatedAt    string   `json:"updated_at,omitempty"                                                           example:"2024-01-15T10:30:00Z"`
}

// ConnectionSubscriptionWithToken includes the webhook token (only returned on creation).
type ConnectionSubscriptionWithToken struct {
	ConnectionSubscription
	WebhookToken string `json:"webhook_token,omitempty" example:"abc123def456..."`
}
