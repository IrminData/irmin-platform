package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/utils"
	"log/slog"
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
	AnthropicAPIKey string
	IrminBaseURL    string
	IrminMCPPath    string
	UserToken       *string
	DefaultModel    anthropic.Model
	MaxTokens       int64
	Temperature     float64
	MaxRetries      int
	BaseDelay       time.Duration
	Logger          *slog.Logger
}

// DefaultConfig returns sensible default configuration
func DefaultConfig() *Config {
	return &Config{
		DefaultModel: DefaultMainModel,
		MaxTokens:    DefaultMaxTokens,
		Temperature:  DefaultTemperature,
		MaxRetries:   MaxRetries,
		BaseDelay:    BaseDelay,
		Logger:       slog.Default(),
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

// NewAI creates a new AI service instance with the given configuration
func NewAI(config *Config) (*AI, error) {
	if config == nil {
		config = DefaultConfig()
		config.Logger.Info("Using default configuration for AI service")
	}

	if config.AnthropicAPIKey == "" {
		config.Logger.Error("Failed to create AI service: API key is required")
		return nil, errors.New("API key is required")
	}

	client := anthropic.NewClient(option.WithAPIKey(config.AnthropicAPIKey))

	config.Logger.Info("AI service initialized successfully",
		"defaultModel", config.DefaultModel,
		"maxTokens", config.MaxTokens,
		"temperature", config.Temperature,
		"maxRetries", config.MaxRetries,
		"baseDelay", config.BaseDelay)

	return &AI{
		config: config,
		client: &client,
	}, nil
}

// NewAIFromEnv creates a new AI service from environment configuration
func NewAIFromEnv(env *utils.CoreAPIEnv, userToken *string, logger *slog.Logger) (*AI, error) {
	logger.Info("Initializing AI service from environment configuration",
		"irminBaseURL", env.URL,
		"irminMCPPath", env.MCPHTTPPath,
		"hasUserToken", userToken != nil && *userToken != "")

	config := DefaultConfig()
	config.AnthropicAPIKey = env.AnthropicAPIKey
	config.IrminBaseURL = env.URL
	config.IrminMCPPath = env.MCPHTTPPath
	config.UserToken = userToken
	config.Logger = logger

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
			a.config.Logger.InfoContext(ctx, "Retrying due to overloaded error",
				"attempt", attempt+1,
				"maxRetries", a.config.MaxRetries,
				"delay", delay,
				"error", err.Error())
			time.Sleep(delay)
			continue
		}

		a.config.Logger.ErrorContext(ctx, "Message sending failed after retries",
			"attempts", attempt+1,
			"maxRetries", a.config.MaxRetries,
			"finalError", err.Error())
		return nil, err
	}

	return nil, errors.New("max retries exceeded")
}

// sendMessageInternal is the internal implementation without retry logic
func (a *AI) sendMessageInternal(ctx context.Context, req *MessageRequest) (*anthropic.BetaMessage, error) {
	messages := a.prepareMessages(req.Content, req.ConversationHistory)
	params := a.prepareAPIParams(ctx, req, messages)

	a.config.Logger.InfoContext(ctx, "Sending message to Anthropic with final parameters",
		"finalModel", params.Model,
		"requestedModel", req.Model,
		"aiType", req.AIType,
		"maxTokens", params.MaxTokens,
		"thinkingEnabled", params.Thinking.OfEnabled != nil,
		"mcpServers", len(params.MCPServers),
		"conversationHistoryLength", len(req.ConversationHistory),
		"contentLength", len(req.Content))

	response, err := a.client.Beta.Messages.New(ctx, params)
	if err != nil {
		a.config.Logger.ErrorContext(ctx, "Failed to send message to Anthropic",
			"error", err.Error(),
			"model", params.Model)
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	a.config.Logger.DebugContext(ctx, "Successfully received response from Anthropic",
		"model", params.Model,
		"responseLength", len(response.Content))

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
	ctx context.Context,
	req *MessageRequest,
	messages []anthropic.BetaMessageParam,
) anthropic.BetaMessageNewParams {
	systemPrompts := a.buildSystemPrompts(req)
	mcpServers := a.configureMCPServers(req)
	aiTypeDefaults := a.getAITypeDefaults(req.AIType)

	initialModel := a.getModel(req.Model, req.AIType)
	params := anthropic.BetaMessageNewParams{
		MaxTokens:  a.getMaxTokens(req.MaxTokens),
		Messages:   messages,
		Model:      initialModel,
		MCPServers: mcpServers,
		Betas:      []anthropic.AnthropicBeta{anthropic.AnthropicBetaMCPClient2025_04_04},
		System:     systemPrompts,
	}

	a.config.Logger.InfoContext(ctx, "Initial model selection",
		"requestedModel", req.Model,
		"aiType", req.AIType,
		"initialSelectedModel", initialModel,
		"willUseModelRouter", req.AIType != nil && *req.AIType == AssistantAI && req.Model == nil)

	// Handle special case for AssistantAI - use model router if no explicit model specified
	if req.AIType != nil && *req.AIType == AssistantAI && req.Model == nil {
		a.config.Logger.InfoContext(ctx, "AssistantAI detected, using model router for model selection",
			"requestedModel", req.Model,
			"aiType", *req.AIType,
			"contentLength", len(req.Content))
		selectedModel := a.selectModelForAssistantAI(ctx, req.Content)
		params.Model = selectedModel
		a.config.Logger.InfoContext(ctx, "Model router selected final model",
			"selectedModel", selectedModel,
			"wasExplicitlyRequested", req.Model != nil)
	}

	// Configure thinking
	a.configureThinking(&params, req, aiTypeDefaults)

	// Set temperature - not supported when thinking is enabled
	if !req.ThinkingEnabled && params.Thinking.OfEnabled == nil {
		params.Temperature = a.getTemperature(req, aiTypeDefaults)
	}

	// Add optional parameters
	if req.TopP != nil {
		params.TopP = param.NewOpt(*req.TopP)
	}

	a.config.Logger.DebugContext(ctx, "Prepared API parameters",
		"model", params.Model,
		"maxTokens", params.MaxTokens,
		"thinkingEnabled", params.Thinking.OfEnabled != nil,
		"temperature", params.Temperature,
		"systemPrompts", len(systemPrompts),
		"mcpServers", len(mcpServers),
		"aiType", req.AIType)

	return params
}

// modelSupportsThinking checks if the given model supports thinking mode
func (a *AI) modelSupportsThinking(model anthropic.Model) bool {
	// Only Sonnet 4 and newer models support thinking
	modelStr := string(model)

	// Sonnet 4 models support thinking
	if strings.Contains(modelStr, "sonnet-4") {
		return true
	}

	// Opus models support thinking
	if strings.Contains(modelStr, "opus") {
		return true
	}

	// Haiku and older Sonnet models do not support thinking
	return false
}

// buildSystemPrompts builds the system prompts for the request
func (a *AI) buildSystemPrompts(req *MessageRequest) []anthropic.BetaTextBlockParam {
	var systemPrompts []anthropic.BetaTextBlockParam

	// Add AI type-specific system prompt if specified
	if req.AIType != nil {
		if aiSystemPrompt := GetSystemPrompt(*req.AIType); aiSystemPrompt != "" {
			systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{Text: aiSystemPrompt})
		}
	}

	// Add the additional system prompt if provided
	if req.AdditionalSystemPrompt != "" {
		systemPrompts = append(systemPrompts, anthropic.BetaTextBlockParam{Text: req.AdditionalSystemPrompt})
	}

	return systemPrompts
}

// configureThinking configures the thinking parameter based on request and defaults
func (a *AI) configureThinking(
	params *anthropic.BetaMessageNewParams,
	req *MessageRequest,
	aiTypeDefaults map[string]any,
) {
	// Only enable thinking if the model supports it
	if !a.modelSupportsThinking(params.Model) {
		a.config.Logger.Debug("Model does not support thinking, disabling thinking mode",
			"model", params.Model)
		params.Thinking = anthropic.BetaThinkingConfigParamUnion{}
		return
	}

	if req.ThinkingEnabled || (req.AIType != nil && aiTypeDefaults["thinkingEnabled"] == true) {
		a.config.Logger.Debug("Enabling thinking mode",
			"requested", req.ThinkingEnabled,
			"aiTypeDefault", aiTypeDefaults["thinkingEnabled"],
			"budgetTokens", DefaultThinkingMaxTokens)
		params.Thinking = anthropic.BetaThinkingConfigParamUnion{
			OfEnabled: &anthropic.BetaThinkingConfigEnabledParam{
				BudgetTokens: DefaultThinkingMaxTokens,
			},
		}
	}
}

// getTemperature returns the temperature value based on request and defaults
func (a *AI) getTemperature(req *MessageRequest, aiTypeDefaults map[string]any) param.Opt[float64] {
	if req.Temperature != nil {
		return param.NewOpt(*req.Temperature)
	}

	if req.AIType != nil && aiTypeDefaults["temperature"] != nil {
		if temp, ok := aiTypeDefaults["temperature"].(float64); ok {
			return param.NewOpt(temp)
		}
	}

	return param.NewOpt(a.config.Temperature)
}

// configureMCPServers configures MCP servers based on AI type and message options
func (a *AI) configureMCPServers(req *MessageRequest) []anthropic.BetaRequestMCPServerURLDefinitionParam {
	// Priority 1: Explicit caller overrides take precedence
	if req.DocsToolsOnly {
		// Caller explicitly requested docs-only access, respect that regardless of AI type
		a.config.Logger.Debug("Configuring MCP servers for docs-only access")
		return a.createMCPServer([]string{"list_docs", "get_docs"})
	}

	// Priority 2: AI type-specific defaults (when no explicit override)
	if req.AIType == nil {
		// No AI type specified - default to full MCP access (legacy behavior)
		a.config.Logger.Debug("No AI type specified, using full MCP access")
		return a.createMCPServer(nil)
	}

	// Priority 3: AI type-specific MCP configuration
	switch *req.AIType {
	case ModelRouterAI, ConversationTitleGenerator:
		// These AI types don't need MCP access at all
		a.config.Logger.Debug("AI type does not require MCP access", "aiType", *req.AIType)
		return []anthropic.BetaRequestMCPServerURLDefinitionParam{}
	case QueryAI:
		// Query AI only needs docs tools
		a.config.Logger.Debug("Configuring MCP servers for QueryAI (docs-only)")
		return a.createMCPServer([]string{"list_docs", "get_docs"})
	case AssistantAI, ScriptingAI:
		// Assistant AI and Scripting AI get full MCP access by default
		a.config.Logger.Debug("Configuring MCP servers for AI type (full access)", "aiType", *req.AIType)
		return a.createMCPServer(nil)
	default:
		// Unknown AI type, default to full access
		a.config.Logger.Warn("Unknown AI type, defaulting to full MCP access", "aiType", *req.AIType)
		return a.createMCPServer(nil)
	}
}

// createMCPServer creates an MCP server configuration with the specified tool restrictions
func (a *AI) createMCPServer(allowedTools []string) []anthropic.BetaRequestMCPServerURLDefinitionParam {
	toolConfig := anthropic.BetaRequestMCPServerToolConfigurationParam{
		Enabled: anthropic.Bool(true),
	}

	// If allowedTools is specified, restrict to those tools
	if allowedTools != nil {
		toolConfig.AllowedTools = allowedTools
		a.config.Logger.Debug("Restricting MCP tools", "allowedTools", allowedTools)
	} else {
		a.config.Logger.Debug("No tool restrictions for MCP server")
	}

	mcpServer := anthropic.BetaRequestMCPServerURLDefinitionParam{
		URL:               fmt.Sprintf("%s%s", a.config.IrminBaseURL, a.config.IrminMCPPath),
		Name:              "irmin-mcp",
		ToolConfiguration: toolConfig,
	}

	// Add authorization token if available
	if a.config.UserToken != nil && *a.config.UserToken != "" {
		mcpServer.AuthorizationToken = param.NewOpt(*a.config.UserToken)
		a.config.Logger.Debug("Added authorization token to MCP server")
	} else {
		a.config.Logger.Debug("No authorization token for MCP server")
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

// getModel returns the model value, using AI type-specific defaults if not specified
func (a *AI) getModel(model *anthropic.Model, aiType *IrminAIType) anthropic.Model {
	if model != nil {
		return *model
	}

	if aiType == nil {
		return a.config.DefaultModel
	}

	return a.getAITypeDefaultModel(*aiType)
}

// getAITypeDefaultModel returns the default model for a specific AI type
func (a *AI) getAITypeDefaultModel(aiType IrminAIType) anthropic.Model {
	switch aiType {
	case ModelRouterAI, ConversationTitleGenerator, QueryAI:
		return DefaultSmallModel
	case AssistantAI, ScriptingAI:
		return DefaultMainModel
	default:
		return a.config.DefaultModel
	}
}

// getAITypeDefaults returns AI type-specific default configuration
func (a *AI) getAITypeDefaults(aiType *IrminAIType) map[string]any {
	if aiType == nil {
		return map[string]any{
			"maxTokens":       a.config.MaxTokens,
			"temperature":     a.config.Temperature,
			"thinkingEnabled": false,
		}
	}

	defaults := make(map[string]any)
	switch *aiType {
	case ModelRouterAI:
		// Model router should be fast and cheap
		defaults["maxTokens"] = ModelRouterMaxTokens
		defaults["temperature"] = 0.1
		defaults["thinkingEnabled"] = false
	case ConversationTitleGenerator:
		// Title generation should be fast and focused
		defaults["maxTokens"] = TitleMaxTokens
		defaults["temperature"] = 0.3
		defaults["thinkingEnabled"] = false
	case QueryAI:
		// Query AI should be fast for simple queries
		defaults["maxTokens"] = a.config.MaxTokens
		defaults["temperature"] = 0.3
		defaults["thinkingEnabled"] = false
	case AssistantAI, ScriptingAI:
		// Assistant AI and Scripting AI get full configuration with thinking enabled by default
		defaults["maxTokens"] = a.config.MaxTokens
		defaults["temperature"] = a.config.Temperature
		defaults["thinkingEnabled"] = true
	default:
		// Default to global defaults
		defaults["maxTokens"] = a.config.MaxTokens
		defaults["temperature"] = a.config.Temperature
		defaults["thinkingEnabled"] = false
	}

	return defaults
}

// selectModelForAssistantAI selects the appropriate model for AssistantAI using the model router
func (a *AI) selectModelForAssistantAI(ctx context.Context, content string) anthropic.Model {
	a.config.Logger.InfoContext(ctx, "Selecting model for AssistantAI using model router",
		"content", content,
		"contentLength", len(content))

	modelRouterAI := &AI{config: a.config, client: a.client}

	if selectedModel, err := modelRouterAI.SelectModel(ctx, content); err == nil {
		a.config.Logger.InfoContext(ctx, "Model router selected model for AssistantAI",
			"selectedModel", selectedModel,
			"contentLength", len(content))
		return selectedModel
	}

	a.config.Logger.WarnContext(ctx, "Model router failed, using default model for AssistantAI",
		"defaultModel", DefaultMainModel,
		"error", "model selection failed")
	return DefaultMainModel
}

// ContentBlock represents a single content block from the AI response
type ContentBlock struct {
	Type    irminmodels.AssistantMessageContentType `json:"type"`
	Content string                                  `json:"content"`
	Index   int                                     `json:"index"`
}

// extractContentBlock extracts content from a content block with safe type assertion
func extractContentBlock(block anthropic.BetaContentBlockUnion) (string, error) {
	switch block.Type {
	case "text":
		textBlock := block.AsText()
		return textBlock.Text, nil
	case "thinking":
		thinkingBlock := block.AsThinking()
		return thinkingBlock.Thinking, nil
	case "redacted_thinking":
		redactedBlock := block.AsRedactedThinking()
		return redactedBlock.Data, nil
	case "tool_use":
		toolBlock := block.AsToolUse()
		return toolBlock.Name, nil
	case "server_tool_use":
		serverBlock := block.AsServerToolUse()
		return string(serverBlock.Name), nil
	case "web_search_tool_result":
		webBlock := block.AsWebSearchToolResult()
		jsonData, err := json.Marshal(webBlock.Content)
		return string(jsonData), err
	case "code_execution_tool_result":
		codeBlock := block.AsCodeExecutionToolResult()
		jsonData, err := json.Marshal(codeBlock.Content)
		return string(jsonData), err
	case "mcp_tool_use":
		mcpBlock := block.AsMCPToolUse()
		return fmt.Sprintf("Server: %s\nTool: %s\nInput: %v", mcpBlock.ServerName, mcpBlock.Name, mcpBlock.Input), nil
	case "mcp_tool_result":
		mcpResultBlock := block.AsMCPToolResult()
		jsonData, err := json.Marshal(mcpResultBlock.Content)
		return string(jsonData), err
	case "container_upload":
		uploadBlock := block.AsContainerUpload()
		return uploadBlock.FileID, nil
	default:
		return "", fmt.Errorf("unsupported content block type: %s", block.Type)
	}
}

// ExtractResponseBlocks extracts all content blocks from AI response
func ExtractResponseBlocks(content []anthropic.BetaContentBlockUnion) []ContentBlock {
	if len(content) == 0 {
		return []ContentBlock{}
	}

	var blocks []ContentBlock
	for i, block := range content {
		contentStr, err := extractContentBlock(block)
		if err != nil || contentStr == "" {
			continue
		}

		blocks = append(blocks, ContentBlock{
			Type:    getContentBlockType(block.Type),
			Content: contentStr,
			Index:   i,
		})
	}

	return blocks
}

// getContentBlockType maps Anthropic content block types to Irmin types
func getContentBlockType(blockType string) irminmodels.AssistantMessageContentType {
	switch blockType {
	case "text":
		return irminmodels.AssistantMessageContentTypeText
	case "thinking":
		return irminmodels.AssistantMessageContentTypeThinking
	case "redacted_thinking":
		return irminmodels.AssistantMessageContentTypeRedactedThinking
	case "tool_use":
		return irminmodels.AssistantMessageContentTypeToolUse
	case "server_tool_use":
		return irminmodels.AssistantMessageContentTypeServerToolUse
	case "web_search_tool_result":
		return irminmodels.AssistantMessageContentTypeWebSearchToolResult
	case "code_execution_tool_result":
		return irminmodels.AssistantMessageContentTypeCodeExecutionToolResult
	case "mcp_tool_use":
		return irminmodels.AssistantMessageContentTypeMCPToolUse
	case "mcp_tool_result":
		return irminmodels.AssistantMessageContentTypeMCPToolResult
	case "container_upload":
		return irminmodels.AssistantMessageContentTypeContainerUpload
	default:
		return irminmodels.AssistantMessageContentTypeText
	}
}

// ExtractResponseContent extracts content from AI response (kept for backward compatibility)
func ExtractResponseContent(content []anthropic.BetaContentBlockUnion) string {
	blocks := ExtractResponseBlocks(content)
	if len(blocks) == 0 {
		return ""
	}

	// Return the first text block content for backward compatibility
	for _, block := range blocks {
		if block.Type == irminmodels.AssistantMessageContentTypeText {
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
	a.config.Logger.DebugContext(ctx, "Generating conversation title", "messageLength", len(firstMessage))

	fallbackTitle := fmt.Sprintf("New Conversation %s", time.Now().Format("2006-01-02 15:04:05"))
	if firstMessage == "" {
		a.config.Logger.DebugContext(ctx, "Empty message, using fallback title", "fallbackTitle", fallbackTitle)
		return fallbackTitle, nil
	}

	req := &MessageRequest{
		Content:   firstMessage,
		MaxTokens: &[]int64{TitleMaxTokens}[0],
		Model:     &[]anthropic.Model{DefaultSmallModel}[0],
		AIType:    &[]IrminAIType{ConversationTitleGenerator}[0],
	}

	response, err := a.SendMessage(ctx, req)
	if err != nil {
		a.config.Logger.ErrorContext(ctx, "Failed to generate conversation title",
			"error", err.Error(),
			"messageLength", len(firstMessage))
		return fallbackTitle, fmt.Errorf("failed to generate title: %w", err)
	}

	title := strings.Trim(strings.TrimSpace(ExtractResponseContent(response.Content)), `"'`)

	// Limit to max title length
	if len(title) > MaxTitleLength {
		originalTitle := title
		title = title[:MaxTitleLength-3] + "..."
		a.config.Logger.DebugContext(ctx, "Title truncated due to length limit",
			"originalLength", len(originalTitle),
			"maxLength", MaxTitleLength,
			"truncatedTitle", title)
	}

	if title == "" {
		a.config.Logger.WarnContext(
			ctx,
			"Generated title is empty, using fallback title",
			"fallbackTitle",
			fallbackTitle,
		)
		return fallbackTitle, nil
	}

	a.config.Logger.InfoContext(ctx, "Successfully generated conversation title",
		"title", title,
		"titleLength", len(title))
	return title, nil
}

// SelectModel selects the appropriate model for a given user prompt using the model router AI
func (a *AI) SelectModel(ctx context.Context, userPrompt string) (anthropic.Model, error) {
	a.config.Logger.DebugContext(ctx, "Selecting model using model router", "promptLength", len(userPrompt))

	if userPrompt == "" {
		a.config.Logger.DebugContext(ctx, "Empty prompt, using default main model", "defaultModel", DefaultMainModel)
		return DefaultMainModel, nil
	}

	req := &MessageRequest{
		Content:   userPrompt,
		MaxTokens: &[]int64{ModelRouterMaxTokens}[0],
		Model:     &[]anthropic.Model{DefaultSmallModel}[0],
		AIType:    &[]IrminAIType{ModelRouterAI}[0],
	}

	response, err := a.SendMessage(ctx, req)
	if err != nil {
		a.config.Logger.ErrorContext(ctx, "Model router failed to select model",
			"error", err.Error(),
			"promptLength", len(userPrompt))
		return DefaultMainModel, fmt.Errorf("failed to select model: %w", err)
	}

	const (
		modelSelectionMain  = "main"
		modelSelectionSmall = "small"
	)

	rawContent := ExtractResponseContent(response.Content)
	modelSelection := strings.ToLower(strings.TrimSpace(rawContent))

	a.config.Logger.InfoContext(ctx, "Model router raw response",
		"rawContent", rawContent,
		"trimmedSelection", modelSelection,
		"promptLength", len(userPrompt),
		"isValidSelection", modelSelection == modelSelectionMain || modelSelection == modelSelectionSmall)

	// Validate the model router output
	if modelSelection != modelSelectionMain && modelSelection != modelSelectionSmall {
		a.config.Logger.WarnContext(ctx, "Model router returned invalid selection, using default main model",
			"invalidSelection", modelSelection,
			"rawContent", rawContent,
			"prompt", userPrompt)
	}

	var selectedModel anthropic.Model
	switch modelSelection {
	case modelSelectionSmall:
		selectedModel = DefaultSmallModel
	case modelSelectionMain:
		selectedModel = DefaultMainModel
	default:
		selectedModel = DefaultMainModel
		a.config.Logger.WarnContext(ctx, "Model router returned unknown selection, using default",
			"selection", modelSelection,
			"defaultModel", selectedModel)
	}

	a.config.Logger.InfoContext(ctx, "Model router selected model",
		"selection", modelSelection,
		"selectedModel", selectedModel,
		"promptLength", len(userPrompt))

	return selectedModel, nil
}
