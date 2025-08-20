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
	// Conversation identifier
	ConversationID string `json:"conversation_id"`

	// Workspace this conversation belongs to
	WorkspaceID string    `json:"workspace_id" validate:"required,validsqid=workspaces" example:"workspace_1a2b3c"`
	Workspace   Workspace `json:"workspace"`

	// User who owns this conversation
	UserID string `json:"user_id" validate:"required,validsqid=users" example:"user_1a2b3c"`
	User   User   `json:"user"`

	// Conversation metadata
	Metadata map[string]any `json:"metadata"`

	// Messages in this conversation
	Messages []AssistantMessage `json:"messages"`

	// Statistics
	TotalMessages     int `json:"total_messages"`
	UserMessages      int `json:"user_messages"`
	AssistantMessages int `json:"assistant_messages"`
	EstimatedTokens   int `json:"estimated_tokens"`

	// Timestamps
	LastMessageAt *time.Time `json:"last_message_at"`
	CreatedAt     time.Time  `json:"created_at"      validate:"required" example:"2025-01-15T10:30:00Z"`
	UpdatedAt     time.Time  `json:"updated_at"      validate:"required" example:"2025-12-01T14:22:30Z"`
}

type AssistantMessage struct {
	// Message identifier
	MessageID string `json:"message_id"`

	// Conversation this message belongs to
	ConversationID string `json:"conversation_id"`

	// Message role (user or assistant)
	Role AssistantMessageRole `json:"role"`

	// Message content
	Content string `json:"content"`

	// Message metadata
	Metadata map[string]any `json:"metadata"`

	// Token usage information
	InputTokens  *int `json:"input_tokens"`
	OutputTokens *int `json:"output_tokens"`

	// AI model used for this message
	AIModel string `json:"ai_model"`

	// Timestamps
	SentAt    time.Time `json:"sent_at"`
	CreatedAt time.Time `json:"created_at" validate:"required" example:"2025-01-15T10:30:00Z"`
	UpdatedAt time.Time `json:"updated_at" validate:"required" example:"2025-12-01T14:22:30Z"`
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
