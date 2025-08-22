package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/utils"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/packages/param"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// AI represents the main AI service with conversation management capabilities
type AI struct {
	userToken      *string
	env            *utils.CoreAPIEnv
	mcpServers     []anthropic.BetaRequestMCPServerURLDefinitionParam
	client         *anthropic.Client
	anthropicBetas []anthropic.AnthropicBeta
	conversations  map[string]*Conversation
	mutex          sync.RWMutex
}

// Conversation represents a chat conversation with history
type Conversation struct {
	ID        string
	CreatedAt time.Time
	UpdatedAt time.Time
	Messages  []Message
	Metadata  map[string]any
}

// Message represents a single message in a conversation
type Message struct {
	ID        string
	Role      anthropic.BetaMessageParamRole
	Content   string
	Timestamp time.Time
	Metadata  map[string]any
}

// MessageOptions provides configuration for message sending
type MessageOptions struct {
	AdditionalSystemPrompt string
	ConversationID         string
	MaxTokens              int64
	Model                  anthropic.Model
	Temperature            *float64
	TopP                   *float64
	Stream                 bool
	Metadata               map[string]any
	ThinkingEnabled        bool
	DocsToolsOnly          bool
	AIType                 *IrminAIType
}

// ConversationOptions provides configuration for conversation management
type ConversationOptions struct {
	MaxHistorySize int
	AutoCleanup    bool
	TTL            time.Duration
}

// NewAI creates a new AI service instance
func NewAI(env *utils.CoreAPIEnv, userToken *string) (*AI, error) {
	// Initialize Anthropic API client
	client := anthropic.NewClient(
		option.WithAPIKey(env.AnthropicAPIKey),
	)

	// Define Anthropic API Betas
	anthropicBetas := []anthropic.AnthropicBeta{
		anthropic.AnthropicBetaMCPClient2025_04_04,
	}

	// Get the token
	var mcpUserToken string
	if userToken == nil {
		mcpUserToken = ""
	} else {
		mcpUserToken = *userToken
	}

	// Define base MCP server configuration
	irminMCP := anthropic.BetaRequestMCPServerURLDefinitionParam{
		URL:                fmt.Sprintf("%s%s", env.URL, env.MCPHTTPPath),
		Name:               "irmin-mcp",
		AuthorizationToken: param.NewOpt(mcpUserToken),
		// ToolConfiguration will be set dynamically per message in ConfigureMCPServers
	}

	return &AI{
		userToken:      userToken,
		env:            env,
		mcpServers:     []anthropic.BetaRequestMCPServerURLDefinitionParam{irminMCP},
		client:         &client,
		anthropicBetas: anthropicBetas,
		conversations:  make(map[string]*Conversation),
	}, nil
}

// SendMessage sends a message and optionally maintains conversation history, with retry logic for overloaded errors
func (a *AI) SendMessage(ctx context.Context, message string, opts *MessageOptions) (*anthropic.BetaMessage, error) {
	for attempt := range MaxRetries {
		response, err := a.sendMessageInternal(ctx, message, opts)
		if err == nil {
			return response, nil
		}

		// Check if it's an overloaded error and we haven't exceeded max retries
		if strings.Contains(err.Error(), "overloaded_error") && attempt < MaxRetries-1 {
			delay := time.Duration(math.Pow(DelayBackoffFactor, float64(attempt))) * BaseDelay
			time.Sleep(delay)
			continue
		}

		return nil, err
	}

	return nil, errors.New("max retries exceeded")
}

// sendMessageInternal is the internal implementation without retry logic
func (a *AI) sendMessageInternal(
	ctx context.Context,
	message string,
	opts *MessageOptions,
) (*anthropic.BetaMessage, error) {
	opts = a.setMessageDefaults(opts)
	messages := a.prepareMessages(opts.ConversationID, message)
	params := a.prepareAPIParams(opts, messages)

	response, err := a.client.Beta.Messages.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	// TODO: We might want to return more details about the message/request sent
	// - Store the data in the database
	// - Return stuff like AI type, AI model, temperature, etc.

	a.storeConversationMessages(opts.ConversationID, message, response, opts.Metadata)
	return response, nil
}

// setMessageDefaults sets default values for message options
func (a *AI) setMessageDefaults(opts *MessageOptions) *MessageOptions {
	if opts == nil {
		opts = &MessageOptions{}
	}
	if opts.MaxTokens == 0 {
		opts.MaxTokens = int64(DefaultMaxTokens)
	}
	if opts.Model == "" {
		opts.Model = DefaultMainModel
	}
	return opts
}

// prepareMessages prepares messages for API call including conversation history
func (a *AI) prepareMessages(conversationID, message string) []anthropic.BetaMessageParam {
	var messages []anthropic.BetaMessageParam

	if conversationID != "" {
		conversation := a.GetConversation(conversationID)
		if conversation != nil {
			messages = a.convertConversationMessages(conversation.Messages)
		}
	}

	// Add current message
	messages = append(messages, anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(message)))
	return messages
}

// convertConversationMessages converts conversation messages to API format
func (a *AI) convertConversationMessages(conversationMessages []Message) []anthropic.BetaMessageParam {
	var messages []anthropic.BetaMessageParam

	for _, msg := range conversationMessages {
		switch msg.Role {
		case anthropic.BetaMessageParamRoleUser:
			messages = append(messages, anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(msg.Content)))
		case anthropic.BetaMessageParamRoleAssistant:
			// Create proper assistant message to maintain conversation structure
			messages = append(messages, anthropic.BetaMessageParam{
				Role:    anthropic.BetaMessageParamRoleAssistant,
				Content: []anthropic.BetaContentBlockParamUnion{anthropic.NewBetaTextBlock(msg.Content)},
			})
		}
	}

	return messages
}

// prepareAPIParams prepares API parameters for the message request
func (a *AI) prepareAPIParams(
	opts *MessageOptions,
	messages []anthropic.BetaMessageParam,
) anthropic.BetaMessageNewParams {
	// Prepare system prompts
	var systemPrompts []anthropic.BetaTextBlockParam

	// Add AI type-specific system prompt if specified
	if opts.AIType != nil {
		aiSystemPrompt := GetSystemPrompt(*opts.AIType)
		if aiSystemPrompt != "" {
			systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{
				Text: aiSystemPrompt,
			})
		}
	}

	// Add the additional system prompt if provided
	if opts.AdditionalSystemPrompt != "" {
		systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{
			Text: opts.AdditionalSystemPrompt,
		})
	}

	// Configure MCP servers based on message options
	mcpServers := a.ConfigureMCPServers(opts)

	// Prepare request parameters
	params := anthropic.BetaMessageNewParams{
		MaxTokens:  opts.MaxTokens,
		Messages:   messages,
		Model:      opts.Model,
		MCPServers: mcpServers,
		Betas:      a.anthropicBetas,
		System:     systemPrompts,
	}

	// Enable thinking if needed
	if opts.ThinkingEnabled {
		params.Thinking = anthropic.BetaThinkingConfigParamUnion{
			OfEnabled: &anthropic.BetaThinkingConfigEnabledParam{
				BudgetTokens: DefaultThinkingMaxTokens,
			},
		}
	} else {
		// Temperature is not supported when thinking is enabled
		if opts.Temperature != nil {
			params.Temperature = param.NewOpt(*opts.Temperature)
		} else {
			params.Temperature = param.NewOpt(DefaultTemperature)
		}
	}

	// Add optional parameters
	if opts.TopP != nil {
		params.TopP = param.NewOpt(*opts.TopP)
	}

	return params
}

// ConfigureMCPServers configures MCP servers based on message options
func (a *AI) ConfigureMCPServers(opts *MessageOptions) []anthropic.BetaRequestMCPServerURLDefinitionParam {
	// Start with the base MCP server configuration
	mcpServers := make([]anthropic.BetaRequestMCPServerURLDefinitionParam, len(a.mcpServers))
	copy(mcpServers, a.mcpServers)

	// Configure tool access based on message options
	for i := range mcpServers {
		if opts.DocsToolsOnly {
			// Restrict to only docs tools
			mcpServers[i].ToolConfiguration = anthropic.BetaRequestMCPServerToolConfigurationParam{
				Enabled: anthropic.Bool(true),
				AllowedTools: []string{
					"list_docs",
					"get_docs",
				},
			}
		} else {
			// Allow all tools (default behavior)
			mcpServers[i].ToolConfiguration = anthropic.BetaRequestMCPServerToolConfigurationParam{
				Enabled: anthropic.Bool(true),
				// By not setting AllowedTools, all tools are available
			}
		}
	}

	return mcpServers
}

// SetMCPServers sets the MCP servers (used for testing)
func (a *AI) SetMCPServers(servers []anthropic.BetaRequestMCPServerURLDefinitionParam) {
	a.mcpServers = servers
}

// storeConversationMessages stores user message and AI response in conversation
func (a *AI) storeConversationMessages(
	conversationID, message string,
	response *anthropic.BetaMessage,
	metadata map[string]any,
) {
	if conversationID == "" {
		return
	}

	// Generate unique IDs for our internal tracking that won't conflict with database IDs
	// Use a prefix to distinguish from database IDs and include timestamp for uniqueness
	userMessageID := fmt.Sprintf("ai_user_%s_%d", conversationID, time.Now().UnixNano())

	// Store user message
	a.StoreMessage(conversationID, Message{
		ID:        userMessageID,
		Role:      anthropic.BetaMessageParamRoleUser,
		Content:   message,
		Timestamp: time.Now(),
		Metadata:  metadata,
	})

	// Store AI response blocks
	if len(response.Content) > 0 {
		contentBlocks := ExtractResponseBlocks(response.Content)
		for i, block := range contentBlocks {
			aiMessageID := fmt.Sprintf("ai_assistant_%s_%d_%d", conversationID, time.Now().UnixNano(), i)
			a.StoreMessage(conversationID, Message{
				ID:        aiMessageID,
				Role:      anthropic.BetaMessageParamRoleAssistant,
				Content:   block.Content,
				Timestamp: time.Now(),
				Metadata:  metadata,
			})
		}
	}
}

// ContentBlock represents a single content block from the AI response
type ContentBlock struct {
	Type    irminmodels.AssistantMessageContentType `json:"type"`
	Content string                                  `json:"content"`
	Index   int                                     `json:"index"`
}

// ExtractResponseBlocks extracts all content blocks from AI response
//
//nolint:funlen // We have a long switch statement here, to handle all the different content block types
func ExtractResponseBlocks(content []anthropic.BetaContentBlockUnion) []ContentBlock {
	if len(content) == 0 {
		return []ContentBlock{}
	}

	var blocks []ContentBlock
	for i, block := range content {
		contentBlock := ContentBlock{
			Index: i,
		}

		switch block.Type {
		case "text":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeText
			contentBlock.Content = block.AsText().Text
		case "thinking":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeThinking
			contentBlock.Content = block.AsThinking().Thinking
		case "redacted_thinking":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeRedactedThinking
			contentBlock.Content = block.AsRedactedThinking().Data
		case "tool_use":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeToolUse
			contentBlock.Content = block.AsToolUse().Name
		case "server_tool_use":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeServerToolUse
			contentBlock.Content = string(block.AsServerToolUse().Name)
		case "web_search_tool_result":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeWebSearchToolResult
			webSearchToolResultJSON, err := json.Marshal(block.AsWebSearchToolResult().Content)
			if err != nil {
				continue
			}
			contentBlock.Content = string(webSearchToolResultJSON)
		case "code_execution_tool_result":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeCodeExecutionToolResult
			codeExecutionToolResultJSON, err := json.Marshal(block.AsCodeExecutionToolResult().Content)
			if err != nil {
				continue
			}
			contentBlock.Content = string(codeExecutionToolResultJSON)
		case "mcp_tool_use":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeMCPToolUse
			serverName := block.AsMCPToolUse().ServerName
			toolName := block.AsMCPToolUse().Name
			toolInput := block.AsMCPToolUse().Input
			contentBlock.Content = fmt.Sprintf("Server: %s\nTool: %s\nInput: %v", serverName, toolName, toolInput)
		case "mcp_tool_result":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeMCPToolResult
			toolResultJSON, err := json.Marshal(block.AsMCPToolResult().Content)
			if err != nil {
				continue
			}
			contentBlock.Content = string(toolResultJSON)
		case "container_upload":
			contentBlock.Type = irminmodels.AssistantMessageContentTypeContainerUpload
			contentBlock.Content = block.AsContainerUpload().FileID
		default:
			continue
		}

		// Only add blocks with meaningful content
		if contentBlock.Content != "" {
			blocks = append(blocks, contentBlock)
		}
	}

	return blocks
}

// ExtractResponseContent extracts content from AI response (kept for backward compatibility)
func ExtractResponseContent(content []anthropic.BetaContentBlockUnion) string {
	blocks := ExtractResponseBlocks(content)
	if len(blocks) == 0 {
		return ""
	}

	// Return the first text block content for backward compatibility
	for _, block := range blocks {
		if block.Type == "text" {
			return block.Content
		}
	}

	// Fallback: return first available content
	if len(blocks) > 0 {
		return blocks[0].Content
	}

	return "Content could not be extracted"
}

// GenerateConversationTitle generates a title for a conversation based on the first user message
func (a *AI) GenerateConversationTitle(ctx context.Context, firstMessage string) (string, error) {
	fallbackTitle := fmt.Sprintf("New Conversation %s", time.Now().Format("2006-01-02 15:04:05"))
	if firstMessage == "" {
		return fallbackTitle, nil
	}

	// Create a simple prompt for title generation
	prompt := fmt.Sprintf(
		"Generate a short, descriptive title (max 50 characters) for a conversation that starts with: \"%s\"\n\nTitle:",
		firstMessage,
	)

	// Prepare the message
	messages := []anthropic.BetaMessageParam{
		anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(prompt)),
	}

	// Create parameters for a quick, focused response
	params := anthropic.BetaMessageNewParams{
		MaxTokens: TitleMaxTokens, // Very short response for title
		Messages:  messages,
		Model:     DefaultSmallModel, // Use the smaller model
	}

	// Send the request
	response, err := a.client.Beta.Messages.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("failed to generate title: %w", err)
	}

	// Extract the title from the response
	title := ExtractResponseContent(response.Content)

	// Clean up the title (remove quotes, extra whitespace, etc.)
	title = strings.TrimSpace(title)
	title = strings.Trim(title, `"'`)

	// Limit to max title length
	if len(title) > MaxTitleLength {
		title = title[:MaxTitleLength-3] + "..."
	}

	// Fallback if title is empty
	if title == "" {
		return fallbackTitle, nil
	}

	return title, nil
}

// CreateConversation creates a new conversation
func (a *AI) CreateConversation(id string, metadata map[string]any) *Conversation {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	conversation := &Conversation{
		ID:        id,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Messages:  make([]Message, 0),
		Metadata:  metadata,
	}

	a.conversations[id] = conversation
	return conversation
}

// GetConversation retrieves a conversation by ID
func (a *AI) GetConversation(id string) *Conversation {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	conversation, exists := a.conversations[id]
	if !exists {
		return nil
	}

	return conversation
}

// StoreMessage adds a message to a conversation
func (a *AI) StoreMessage(conversationID string, message Message) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	conversation, exists := a.conversations[conversationID]
	if !exists {
		// Create the conversation while holding the lock to prevent race conditions
		conversation = &Conversation{
			ID:        conversationID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Messages:  make([]Message, 0),
			Metadata:  nil,
		}
		a.conversations[conversationID] = conversation
	}

	conversation.Messages = append(conversation.Messages, message)
	conversation.UpdatedAt = time.Now()
}

// GetConversationHistory returns all messages in a conversation
func (a *AI) GetConversationHistory(conversationID string) []Message {
	conversation := a.GetConversation(conversationID)
	if conversation == nil {
		return nil
	}
	return conversation.Messages
}

// ClearConversation removes all messages from a conversation
func (a *AI) ClearConversation(conversationID string) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if conversation, exists := a.conversations[conversationID]; exists {
		conversation.Messages = make([]Message, 0)
		conversation.UpdatedAt = time.Now()
	}
}

// DeleteConversation removes a conversation entirely
func (a *AI) DeleteConversation(conversationID string) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	delete(a.conversations, conversationID)
}

// UpdateConversationMetadata updates the metadata of an existing conversation
func (a *AI) UpdateConversationMetadata(conversationID string, metadata map[string]any) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if conversation, exists := a.conversations[conversationID]; exists {
		conversation.Metadata = metadata
		conversation.UpdatedAt = time.Now()
	}
}

// GetConversationMetadata retrieves the metadata of a conversation
func (a *AI) GetConversationMetadata(conversationID string) map[string]any {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	if conversation, exists := a.conversations[conversationID]; exists {
		return conversation.Metadata
	}
	return nil
}

// UpdateConversationMetadataField updates a specific metadata field
func (a *AI) UpdateConversationMetadataField(conversationID string, key string, value any) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if conversation, exists := a.conversations[conversationID]; exists {
		if conversation.Metadata == nil {
			conversation.Metadata = make(map[string]any)
		}
		conversation.Metadata[key] = value
		conversation.UpdatedAt = time.Now()
	}
}

// ListConversations returns all conversation IDs
func (a *AI) ListConversations() []string {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	ids := make([]string, 0, len(a.conversations))
	for id := range a.conversations {
		ids = append(ids, id)
	}
	return ids
}

// GetConversationStats returns statistics about a conversation
func (a *AI) GetConversationStats(conversationID string) map[string]any {
	conversation := a.GetConversation(conversationID)
	if conversation == nil {
		return nil
	}

	userMessageCount := 0
	assistantMessageCount := 0
	totalTokens := 0

	for _, msg := range conversation.Messages {
		switch msg.Role {
		case anthropic.BetaMessageParamRoleUser:
			userMessageCount++
		case anthropic.BetaMessageParamRoleAssistant:
			assistantMessageCount++
		}
		// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
		const charsPerToken = 4
		totalTokens += len(msg.Content) / charsPerToken
	}

	return map[string]any{
		"total_messages":     len(conversation.Messages),
		"user_messages":      userMessageCount,
		"assistant_messages": assistantMessageCount,
		"estimated_tokens":   totalTokens,
		"created_at":         conversation.CreatedAt,
		"last_updated":       conversation.UpdatedAt,
		"duration_minutes":   int(time.Since(conversation.CreatedAt).Minutes()),
	}
}

// CleanupOldConversations removes conversations older than the specified TTL
func (a *AI) CleanupOldConversations(ttl time.Duration) int {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	cutoff := time.Now().Add(-ttl)
	deletedCount := 0

	for id, conversation := range a.conversations {
		if conversation.UpdatedAt.Before(cutoff) {
			delete(a.conversations, id)
			deletedCount++
		}
	}

	return deletedCount
}

// ExportConversation exports a conversation to a structured format
func (a *AI) ExportConversation(conversationID string) map[string]any {
	conversation := a.GetConversation(conversationID)
	if conversation == nil {
		return nil
	}

	messages := make([]map[string]any, len(conversation.Messages))
	for i, msg := range conversation.Messages {
		messages[i] = map[string]any{
			"id":        msg.ID,
			"role":      string(msg.Role),
			"content":   msg.Content,
			"timestamp": msg.Timestamp,
			"metadata":  msg.Metadata,
		}
	}

	return map[string]any{
		"id":         conversation.ID,
		"created_at": conversation.CreatedAt,
		"updated_at": conversation.UpdatedAt,
		"messages":   messages,
		"metadata":   conversation.Metadata,
		"stats":      a.GetConversationStats(conversationID),
	}
}

// ImportConversation imports a conversation from a structured format
func (a *AI) ImportConversation(data map[string]any) error {
	id, ok := data["id"].(string)
	if !ok {
		return errors.New("invalid conversation ID")
	}

	conversation := a.CreateConversation(id, nil)
	a.importMessages(data, conversation)
	a.importMetadata(data, conversation)

	return nil
}

// importMessages imports messages from the data into the conversation
func (a *AI) importMessages(data map[string]any, conversation *Conversation) {
	messagesData, messagesOk := data["messages"].([]any)
	if !messagesOk {
		return
	}

	for _, msgData := range messagesData {
		msgMap, msgOk := msgData.(map[string]any)
		if !msgOk {
			continue
		}

		message := a.createMessageFromData(msgMap)
		if message != nil {
			conversation.Messages = append(conversation.Messages, *message)
		}
	}
}

// createMessageFromData creates a Message from message data
func (a *AI) createMessageFromData(msgMap map[string]any) *Message {
	role := a.parseMessageRole(msgMap)
	if role == "" {
		return nil
	}

	content, _ := msgMap["content"].(string)
	timestamp := a.parseMessageTimestamp(msgMap)
	msgID, msgIDOk := msgMap["id"].(string)
	if !msgIDOk {
		return nil
	}

	message := &Message{
		ID:        msgID,
		Role:      role,
		Content:   content,
		Timestamp: timestamp,
		Metadata:  make(map[string]any),
	}

	a.setMessageMetadata(msgMap, message)
	return message
}

// parseMessageRole parses the role from message data
func (a *AI) parseMessageRole(msgMap map[string]any) anthropic.BetaMessageParamRole {
	roleStr, _ := msgMap["role"].(string)
	switch roleStr {
	case "user":
		return anthropic.BetaMessageParamRoleUser
	case "assistant":
		return anthropic.BetaMessageParamRoleAssistant
	default:
		return ""
	}
}

// parseMessageTimestamp parses the timestamp from message data
func (a *AI) parseMessageTimestamp(msgMap map[string]any) time.Time {
	timestampStr, _ := msgMap["timestamp"].(string)
	if timestampStr == "" {
		return time.Now()
	}

	if parsed, err := time.Parse(time.RFC3339, timestampStr); err == nil {
		return parsed
	}
	return time.Now()
}

// setMessageMetadata sets metadata for a message if available
func (a *AI) setMessageMetadata(msgMap map[string]any, message *Message) {
	if metadata, metadataOk := msgMap["metadata"].(map[string]any); metadataOk {
		message.Metadata = metadata
	}
}

// importMetadata imports metadata from the data into the conversation
func (a *AI) importMetadata(data map[string]any, conversation *Conversation) {
	if metadata, metadataOk := data["metadata"].(map[string]any); metadataOk {
		conversation.Metadata = metadata
	}
}
