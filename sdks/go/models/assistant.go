package irminmodels

import (
	"time"
)

type AssistantMessageRole string

const (
	AssistantMessageRoleUser      AssistantMessageRole = "user"
	AssistantMessageRoleAssistant AssistantMessageRole = "assistant"
)

// AssistantConversation represents a conversation with the AI assistant
type AssistantConversation struct {
	Title             string             `json:"title"              validate:"required"                      example:"My conversation"`
	ConversationID    string             `json:"conversation_id"` // Note, that this is not a SQID
	WorkspaceID       string             `json:"workspace_id"       validate:"required,validsqid=workspaces" example:"workspace_1a2b3c"`
	UserID            string             `json:"user_id"            validate:"required,validsqid=users"      example:"user_1a2b3c"`
	Metadata          map[string]any     `json:"metadata"`
	Messages          []AssistantMessage `json:"messages,omitempty"`
	TotalMessages     int                `json:"total_messages"`
	UserMessages      int                `json:"user_messages"`
	AssistantMessages int                `json:"assistant_messages"`
	EstimatedTokens   int                `json:"estimated_tokens"`
	LastMessageAt     *time.Time         `json:"last_message_at"`
	CreatedAt         time.Time          `json:"created_at"         validate:"required"                      example:"2025-01-15T10:30:00Z"`
	UpdatedAt         time.Time          `json:"updated_at"         validate:"required"                      example:"2025-12-01T14:22:30Z"`
}

type AssistantMessage struct {
	MessageID      string               `json:"message_id"`      // Note, that this is not a SQID
	ConversationID string               `json:"conversation_id"` // Note, that this is not a SQID
	Role           AssistantMessageRole `json:"role"`
	Content        string               `json:"content"`
	Metadata       map[string]any       `json:"metadata"`
	InputTokens    *int                 `json:"input_tokens"`
	OutputTokens   *int                 `json:"output_tokens"`
	AIModel        string               `json:"ai_model"`
	SentAt         time.Time            `json:"sent_at"`
	CreatedAt      time.Time            `json:"created_at"      validate:"required" example:"2025-01-15T10:30:00Z"`
	UpdatedAt      time.Time            `json:"updated_at"      validate:"required" example:"2025-12-01T14:22:30Z"`
}

type AssistantConversationStats struct {
	TotalMessages     int       `json:"total_messages"`
	UserMessages      int       `json:"user_messages"`
	AssistantMessages int       `json:"assistant_messages"`
	EstimatedTokens   int       `json:"estimated_tokens"`
	CreatedAt         time.Time `json:"created_at"`
	LastUpdated       time.Time `json:"last_updated"`
	DurationMinutes   int       `json:"duration_minutes"`
}
