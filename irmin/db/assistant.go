package db

import (
	"errors"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"gorm.io/gorm"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// AssistantConversation represents a conversation with the AI assistant
type AssistantConversation struct {
	gorm.Model

	// Conversation title (auto-generated or user-defined)
	Title string `gorm:"type:varchar(255);not null;default:''" json:"title"`

	// Workspace this conversation belongs to
	WorkspaceID uint      `gorm:"index;not null"         json:"workspace_id"`
	Workspace   Workspace `gorm:"foreignKey:WorkspaceID" json:"workspace"`

	// User who owns this conversation
	UserID uint `gorm:"not null"          json:"user_id"`
	User   User `gorm:"foreignKey:UserID" json:"user"`

	// Conversation metadata (stored as JSON)
	Metadata map[string]any `gorm:"type:jsonb;serializer:json" json:"metadata"`

	// Messages in this conversation
	Messages []AssistantMessage `json:"messages" gorm:"foreignKey:ConversationID"`

	// Statistics
	TotalMessages     int `gorm:"default:0" json:"total_messages"`
	UserMessages      int `gorm:"default:0" json:"user_messages"`
	AssistantMessages int `gorm:"default:0" json:"assistant_messages"`
	EstimatedTokens   int `gorm:"default:0" json:"estimated_tokens"`

	// Timestamps
	LastMessageAt *time.Time `json:"last_message_at"`
}

// AssistantMessage represents a single message in a conversation
type AssistantMessage struct {
	gorm.Model

	// Conversation this message belongs to
	ConversationID *uint                  `json:"conversation_id" gorm:"column:conversation_id;index"`
	Conversation   *AssistantConversation `json:"conversation"    gorm:"foreignKey:ConversationID"`

	// Message role (user or assistant)
	Role anthropic.BetaMessageParamRole `gorm:"not null" json:"role"`

	// Message content
	Content string `gorm:"type:text;not null" json:"content"`

	// Content type (text, image, tool_call, etc.)
	ContentType irminmodels.AssistantMessageContentType `gorm:"type:varchar(50);not null;default:'text'" json:"content_type"`

	// Block index within the AI response (0-based, for ordering multiple blocks)
	BlockIndex *int `gorm:"default:0" json:"block_index"`

	// Message status (pending, sent, error, etc.)
	Status irminmodels.AssistantMessageStatus `gorm:"type:varchar(50);not null;default:'pending'" json:"status"`

	// Error message if status is error
	ErrorMessage *string `gorm:"type:text" json:"error_message"`

	// Message metadata (stored as JSON)
	Metadata map[string]any `gorm:"type:jsonb;serializer:json" json:"metadata"`

	// Token usage information
	InputTokens  *int `json:"input_tokens"`
	OutputTokens *int `json:"output_tokens"`

	// AI model used for this message
	AIModel string `json:"ai_model"`

	// Anthropic ID (for AI responses only)
	AnthropicID string `json:"anthropic_id"`

	// Timestamps
	SentAt time.Time `json:"sent_at"`
}

/*
* Assistant operation functions
 */

// GetAssistantConversationByID retrieves a conversation by its ID
func (d *Database) GetAssistantConversationByID(conversationID uint) (*AssistantConversation, error) {
	var conversation AssistantConversation
	if err := d.Preload("User").Preload("Workspace").
		First(&conversation, conversationID).
		Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

// GetAssistantConversationWithMessages retrieves a conversation by its ID with all messages
func (d *Database) GetAssistantConversationWithMessages(conversationID uint) (*AssistantConversation, error) {
	var conversation AssistantConversation
	if err := d.Preload("Messages").Preload("User").Preload("Workspace").
		First(&conversation, conversationID).
		Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

// GetAssistantConversationsByWorkspace retrieves all conversations in a workspace
func (d *Database) GetAssistantConversationsByWorkspace(workspaceID uint) ([]AssistantConversation, error) {
	var conversations []AssistantConversation
	if err := d.Preload("User").
		Where(&AssistantConversation{WorkspaceID: workspaceID}).
		Order("last_message_at DESC NULLS LAST, created_at DESC").
		Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}

// GetAssistantConversationsByUser retrieves all conversations for a specific user in a workspace
func (d *Database) GetAssistantConversationsByUser(workspaceID, userID uint) ([]AssistantConversation, error) {
	var conversations []AssistantConversation
	if err := d.Where(&AssistantConversation{WorkspaceID: workspaceID, UserID: userID}).
		Order("last_message_at DESC NULLS LAST, created_at DESC").
		Find(&conversations).Error; err != nil {
		return nil, err
	}
	return conversations, nil
}

// CreateAssistantConversation creates a new conversation
func (d *Database) CreateAssistantConversation(conversation *AssistantConversation) error {
	// Initialize metadata if nil
	if conversation.Metadata == nil {
		conversation.Metadata = make(map[string]any)
	}
	return d.Create(conversation).Error
}

// UpdateAssistantConversation updates an existing conversation
func (d *Database) UpdateAssistantConversation(conversation *AssistantConversation) error {
	return d.Save(conversation).Error
}

// DeleteAssistantConversation deletes a conversation and all its messages
func (d *Database) DeleteAssistantConversation(conversationID uint) error {
	// Delete all messages first
	if err := d.Where(&AssistantMessage{ConversationID: &conversationID}).Delete(&AssistantMessage{}).Error; err != nil {
		return err
	}

	// Then delete the conversation
	return d.Delete(&AssistantConversation{}, conversationID).Error
}

// ClearAssistantConversationMessages removes all messages from a conversation
func (d *Database) ClearAssistantConversationMessages(conversationID uint) error {
	// Delete all messages for this conversation using GORM struct-based query
	if err := d.Where(&AssistantMessage{ConversationID: &conversationID}).Delete(&AssistantMessage{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	// Get the conversation
	conversation := &AssistantConversation{}
	if err := d.First(conversation, conversationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	// Reset conversation statistics
	conversation.TotalMessages = 0
	conversation.UserMessages = 0
	conversation.AssistantMessages = 0
	conversation.EstimatedTokens = 0
	conversation.LastMessageAt = nil
	if err := d.Save(conversation).Error; err != nil {
		return err
	}

	return nil
}

// CreateAssistantMessage creates a new message in a conversation
func (d *Database) CreateAssistantMessage(message *AssistantMessage) error {
	// Initialize metadata if nil
	if message.Metadata == nil {
		message.Metadata = make(map[string]any)
	}

	// Set timestamp if zero
	if message.SentAt.IsZero() {
		message.SentAt = time.Now()
	}

	// Set default status if not set
	if message.Status == "" {
		message.Status = irminmodels.AssistantMessageStatusPending
	}

	// Create the message
	return d.Create(message).Error
}

// TrackNewMessageUsage updates the conversation statistics with the new message usage
func (d *Database) TrackNewMessageUsage(
	conversation *AssistantConversation,
	inputTokens int,
	outputTokens int,
	assistantMessageCount int,
	userMessageCount int,
) error {
	conversation.EstimatedTokens += inputTokens + outputTokens
	conversation.UserMessages += userMessageCount
	conversation.AssistantMessages += assistantMessageCount
	conversation.TotalMessages = conversation.UserMessages + conversation.AssistantMessages
	now := time.Now()
	conversation.LastMessageAt = &now

	return d.Save(conversation).Error
}

// DeleteAssistantMessage deletes a message and updates conversation statistics
func (d *Database) DeleteAssistantMessage(messageID uint) error {
	// Get the message first to access its properties for statistics update
	var message AssistantMessage
	if err := d.First(&message, messageID).Error; err != nil {
		return err
	}

	// Delete the message
	if err := d.Delete(&message).Error; err != nil {
		return err
	}

	// Update conversation statistics
	var conversation AssistantConversation
	if err := d.First(&conversation, message.ConversationID).Error; err != nil {
		return err
	}

	// Update message counts
	conversation.TotalMessages--
	switch message.Role {
	case anthropic.BetaMessageParamRoleUser:
		conversation.UserMessages--
	case anthropic.BetaMessageParamRoleAssistant:
		conversation.AssistantMessages--
	}

	// Update token counts
	if message.InputTokens != nil {
		conversation.EstimatedTokens -= *message.InputTokens
	}
	if message.OutputTokens != nil {
		conversation.EstimatedTokens -= *message.OutputTokens
	}

	// Ensure counts don't go negative
	if conversation.TotalMessages < 0 {
		conversation.TotalMessages = 0
	}
	if conversation.UserMessages < 0 {
		conversation.UserMessages = 0
	}
	if conversation.AssistantMessages < 0 {
		conversation.AssistantMessages = 0
	}
	if conversation.EstimatedTokens < 0 {
		conversation.EstimatedTokens = 0
	}

	// Save the updated conversation
	return d.Save(&conversation).Error
}

// UpdateAssistantMessageStatus updates the status of a message
func (d *Database) UpdateAssistantMessageStatus(
	messageID uint,
	status irminmodels.AssistantMessageStatus,
	errorMessage *string,
) error {
	var message AssistantMessage
	if err := d.First(&message, messageID).Error; err != nil {
		return err
	}

	message.Status = status
	message.ErrorMessage = errorMessage

	return d.Save(&message).Error
}

// GetAssistantConversationStats retrieves statistics for a conversation
func (d *Database) GetAssistantConversationStats(
	conversationID uint,
) (*irminmodels.AssistantConversationStats, error) {
	var conversation AssistantConversation
	if err := d.First(&conversation, conversationID).Error; err != nil {
		return nil, err
	}

	// Calculate duration
	var durationMinutes int
	if conversation.LastMessageAt != nil {
		durationMinutes = int(time.Since(conversation.CreatedAt).Minutes())
	}

	return &irminmodels.AssistantConversationStats{
		TotalMessages:     conversation.TotalMessages,
		UserMessages:      conversation.UserMessages,
		AssistantMessages: conversation.AssistantMessages,
		EstimatedTokens:   conversation.EstimatedTokens,
		CreatedAt:         conversation.CreatedAt,
		LastUpdated:       conversation.UpdatedAt,
		DurationMinutes:   durationMinutes,
	}, nil
}
