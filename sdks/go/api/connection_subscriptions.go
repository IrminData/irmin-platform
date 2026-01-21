package irmincore

// CreateConnectionSubscriptionRequest represents the JSON request body for creating connection subscriptions.
type CreateConnectionSubscriptionRequest struct {
	Name        string   `json:"name"                   validate:"required,max=255"                             example:"CRM Lead Changes"`
	Description string   `json:"description,omitempty"  validate:"max=1000"                                     example:"Subscribe to lead changes in the CRM"`
	FilterPaths []string `json:"filter_paths,omitempty" validate:"dive,max=500"                                 example:"leads,contacts"`
	EventTypes  []string `json:"event_types,omitempty"  validate:"dive,oneof=insert update delete upsert batch" example:"insert,update"`
}

// UpdateConnectionSubscriptionRequest represents the JSON request body for updating connection subscriptions.
type UpdateConnectionSubscriptionRequest struct {
	Name        *string   `json:"name,omitempty"         validate:"omitnil,max=255"                                      example:"CRM Lead Changes"`
	Description *string   `json:"description,omitempty"  validate:"omitnil,max=1000"                                     example:"Subscribe to lead changes in the CRM"`
	FilterPaths *[]string `json:"filter_paths,omitempty" validate:"omitnil,dive,max=500"                                 example:"leads,contacts"`
	EventTypes  *[]string `json:"event_types,omitempty"  validate:"omitnil,dive,oneof=insert update delete upsert batch" example:"insert,update"`
	IsActive    *bool     `json:"is_active,omitempty"                                                                    example:"true"`
}
