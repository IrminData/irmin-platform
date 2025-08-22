package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/utils"
	"math"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/packages/param"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// Config holds AI service configuration
type Config struct {
	APIKey       string
	BaseURL      string
	MCPPath      string
	UserToken    *string
	DefaultModel anthropic.Model
	MaxTokens    int64
	Temperature  float64
	MaxRetries   int
	BaseDelay    time.Duration
}

// DefaultConfig returns sensible default configuration
func DefaultConfig() *Config {
	return &Config{
		DefaultModel: DefaultMainModel,
		MaxTokens:    DefaultMaxTokens,
		Temperature:  DefaultTemperature,
		MaxRetries:   MaxRetries,
		BaseDelay:    BaseDelay,
	}
}

// AI represents the AI service for sending messages
type AI struct {
	config *Config
	client *anthropic.Client
}

// MessageRequest represents a message request with options
type MessageRequest struct {
	Content                string
	ConversationID         string
	ConversationHistory    []ConversationMessage
	MaxTokens              *int64
	Model                  *anthropic.Model
	Temperature            *float64
	TopP                   *float64
	Stream                 bool
	Metadata               map[string]any
	ThinkingEnabled        bool
	DocsToolsOnly          bool
	AIType                 *IrminAIType
	AdditionalSystemPrompt string
}

// ConversationMessage represents a message in conversation history
type ConversationMessage struct {
	Role    anthropic.BetaMessageParamRole
	Content string
}

// MessageOptions provides configuration for message sending (backward compatibility)
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

// ToMessageRequest converts MessageOptions to MessageRequest
func (opts *MessageOptions) ToMessageRequest(content string) *MessageRequest {
	if opts == nil {
		return &MessageRequest{Content: content}
	}

	// Only set Model if it's not the zero value
	var model *anthropic.Model
	if opts.Model != "" {
		model = &opts.Model
	}

	// Only set MaxTokens if it's not the zero value
	var maxTokens *int64
	if opts.MaxTokens != 0 {
		maxTokens = &opts.MaxTokens
	}

	return &MessageRequest{
		Content:                content,
		ConversationID:         opts.ConversationID,
		MaxTokens:              maxTokens,
		Model:                  model,
		Temperature:            opts.Temperature,
		TopP:                   opts.TopP,
		Stream:                 opts.Stream,
		Metadata:               opts.Metadata,
		ThinkingEnabled:        opts.ThinkingEnabled,
		DocsToolsOnly:          opts.DocsToolsOnly,
		AIType:                 opts.AIType,
		AdditionalSystemPrompt: opts.AdditionalSystemPrompt,
	}
}

// NewAI creates a new AI service instance with the given configuration
func NewAI(config *Config) (*AI, error) {
	if config == nil {
		config = DefaultConfig()
	}

	if config.APIKey == "" {
		return nil, errors.New("API key is required")
	}

	// Initialize Anthropic API client
	client := anthropic.NewClient(
		option.WithAPIKey(config.APIKey),
	)

	return &AI{
		config: config,
		client: &client,
	}, nil
}

// NewAIFromEnv creates a new AI service from environment configuration
func NewAIFromEnv(env *utils.CoreAPIEnv, userToken *string) (*AI, error) {
	config := DefaultConfig()
	config.APIKey = env.AnthropicAPIKey
	config.BaseURL = env.URL
	config.MCPPath = env.MCPHTTPPath
	config.UserToken = userToken

	return NewAI(config)
}

// SendMessage sends a message and returns the response
func (a *AI) SendMessage(ctx context.Context, req *MessageRequest) (*anthropic.BetaMessage, error) {
	if req == nil {
		return nil, errors.New("message request cannot be nil")
	}

	for attempt := range a.config.MaxRetries {
		response, err := a.sendMessageInternal(ctx, req)
		if err == nil {
			return response, nil
		}

		// Check if it's an overloaded error and we haven't exceeded max retries
		if strings.Contains(err.Error(), "overloaded_error") && attempt < a.config.MaxRetries-1 {
			delay := time.Duration(math.Pow(DelayBackoffFactor, float64(attempt))) * a.config.BaseDelay
			time.Sleep(delay)
			continue
		}

		return nil, err
	}

	return nil, errors.New("max retries exceeded")
}

// sendMessageInternal is the internal implementation without retry logic
func (a *AI) sendMessageInternal(ctx context.Context, req *MessageRequest) (*anthropic.BetaMessage, error) {
	messages := a.prepareMessages(req.Content, req.ConversationHistory)
	params := a.prepareAPIParams(req, messages)

	response, err := a.client.Beta.Messages.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	return response, nil
}

// prepareMessages prepares messages for API call including conversation history
func (a *AI) prepareMessages(message string, history []ConversationMessage) []anthropic.BetaMessageParam {
	var messages []anthropic.BetaMessageParam

	// Add conversation history
	for _, msg := range history {
		switch msg.Role {
		case anthropic.BetaMessageParamRoleUser:
			messages = append(messages, anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(msg.Content)))
		case anthropic.BetaMessageParamRoleAssistant:
			messages = append(messages, anthropic.BetaMessageParam{
				Role:    anthropic.BetaMessageParamRoleAssistant,
				Content: []anthropic.BetaContentBlockParamUnion{anthropic.NewBetaTextBlock(msg.Content)},
			})
		}
	}

	// Add current message
	messages = append(messages, anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(message)))
	return messages
}

// prepareAPIParams prepares API parameters for the message request
func (a *AI) prepareAPIParams(
	req *MessageRequest,
	messages []anthropic.BetaMessageParam,
) anthropic.BetaMessageNewParams {
	// Prepare system prompts
	var systemPrompts []anthropic.BetaTextBlockParam

	// Add AI type-specific system prompt if specified
	if req.AIType != nil {
		aiSystemPrompt := GetSystemPrompt(*req.AIType)
		if aiSystemPrompt != "" {
			systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{
				Text: aiSystemPrompt,
			})
		}
	}

	// Add the additional system prompt if provided
	if req.AdditionalSystemPrompt != "" {
		systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{
			Text: req.AdditionalSystemPrompt,
		})
	}

	// Configure MCP servers
	mcpServers := a.configureMCPServers(req)

	// Prepare request parameters
	params := anthropic.BetaMessageNewParams{
		MaxTokens:  a.getMaxTokens(req.MaxTokens),
		Messages:   messages,
		Model:      a.getModel(req.Model),
		MCPServers: mcpServers,
		Betas:      []anthropic.AnthropicBeta{anthropic.AnthropicBetaMCPClient2025_04_04},
		System:     systemPrompts,
	}

	// Enable thinking if needed
	if req.ThinkingEnabled {
		params.Thinking = anthropic.BetaThinkingConfigParamUnion{
			OfEnabled: &anthropic.BetaThinkingConfigEnabledParam{
				BudgetTokens: DefaultThinkingMaxTokens,
			},
		}
	} else {
		// Temperature is not supported when thinking is enabled
		if req.Temperature != nil {
			params.Temperature = param.NewOpt(*req.Temperature)
		} else {
			params.Temperature = param.NewOpt(a.config.Temperature)
		}
	}

	// Add optional parameters
	if req.TopP != nil {
		params.TopP = param.NewOpt(*req.TopP)
	}

	return params
}

// configureMCPServers configures MCP servers based on message options
func (a *AI) configureMCPServers(req *MessageRequest) []anthropic.BetaRequestMCPServerURLDefinitionParam {
	// Configure Irmin MCP tool access based on message options
	toolConfig := anthropic.BetaRequestMCPServerToolConfigurationParam{
		Enabled: anthropic.Bool(true),
	}

	if req.DocsToolsOnly {
		// Restrict to only docs tools
		toolConfig.AllowedTools = []string{
			"list_docs",
			"get_docs",
		}
	}

	// Create MCP server configuration
	mcpServer := anthropic.BetaRequestMCPServerURLDefinitionParam{
		URL:               fmt.Sprintf("%s%s", a.config.BaseURL, a.config.MCPPath),
		Name:              "irmin-mcp",
		ToolConfiguration: toolConfig,
	}

	// Add authorization token if available
	if a.config.UserToken != nil && *a.config.UserToken != "" {
		mcpServer.AuthorizationToken = param.NewOpt(*a.config.UserToken)
	}

	return []anthropic.BetaRequestMCPServerURLDefinitionParam{mcpServer}
}

// getMaxTokens returns the max tokens value, using default if not specified
func (a *AI) getMaxTokens(maxTokens *int64) int64 {
	if maxTokens != nil {
		return *maxTokens
	}
	return a.config.MaxTokens
}

// getModel returns the model value, using default if not specified
func (a *AI) getModel(model *anthropic.Model) anthropic.Model {
	if model != nil {
		return *model
	}
	return a.config.DefaultModel
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
	req := &MessageRequest{
		Content:   prompt,
		MaxTokens: &[]int64{TitleMaxTokens}[0],
		Model:     &[]anthropic.Model{DefaultSmallModel}[0],
	}

	// Send the request
	response, err := a.SendMessage(ctx, req)
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
