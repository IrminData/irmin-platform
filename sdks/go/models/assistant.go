package irminmodels

import (
	"time"
)

type AssistantMessageRole string

const (
	AssistantMessageRoleUser      AssistantMessageRole = "user"
	AssistantMessageRoleAssistant AssistantMessageRole = "assistant"
)

type AssistantMessageStatus string

const (
	AssistantMessageStatusPending AssistantMessageStatus = "pending"
	AssistantMessageStatusSent    AssistantMessageStatus = "sent"
	AssistantMessageStatusError   AssistantMessageStatus = "error"
	AssistantMessageStatusFailed  AssistantMessageStatus = "failed"
)

// AssistantConversation represents a conversation with the AI assistant
type AssistantConversation struct {
	ID                string             `json:"id"                 validate:"required,validsqid=assistant_conversations" example:"assistant_conversation_1a2b3c"`
	Title             string             `json:"title"              validate:"required"                                   example:"My conversation"`
	WorkspaceID       string             `json:"workspace_id"       validate:"required,validsqid=workspaces"              example:"workspace_1a2b3c"`
	UserID            string             `json:"user_id"            validate:"required,validsqid=users"                   example:"user_1a2b3c"`
	Metadata          map[string]any     `json:"metadata"`
	Messages          []AssistantMessage `json:"messages,omitempty"`
	TotalMessages     int                `json:"total_messages"`
	UserMessages      int                `json:"user_messages"`
	AssistantMessages int                `json:"assistant_messages"`
	EstimatedTokens   int                `json:"estimated_tokens"`
	LastMessageAt     *time.Time         `json:"last_message_at"`
	CreatedAt         time.Time          `json:"created_at"         validate:"required"                                   example:"2025-01-15T10:30:00Z"`
	UpdatedAt         time.Time          `json:"updated_at"         validate:"required"                                   example:"2025-12-01T14:22:30Z"`
}

type AssistantMessage struct {
	ID             string                 `json:"id"                      validate:"required,validsqid=assistant_messages"      example:"assistant_message_1a2b3c"`
	ConversationID string                 `json:"conversation_id"         validate:"required,validsqid=assistant_conversations" example:"assistant_conversation_1a2b3c"`
	Role           AssistantMessageRole   `json:"role"`
	Content        string                 `json:"content"`
	Metadata       map[string]any         `json:"metadata"`
	InputTokens    *int                   `json:"input_tokens"`
	OutputTokens   *int                   `json:"output_tokens"`
	AIModel        string                 `json:"ai_model"`
	Status         AssistantMessageStatus `json:"status"                  validate:"required,oneof=pending sent error failed"`
	ErrorMessage   *string                `json:"error_message,omitempty"`
	SentAt         time.Time              `json:"sent_at"`
	CreatedAt      time.Time              `json:"created_at"              validate:"required"                                   example:"2025-01-15T10:30:00Z"`
	UpdatedAt      time.Time              `json:"updated_at"              validate:"required"                                   example:"2025-12-01T14:22:30Z"`
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
