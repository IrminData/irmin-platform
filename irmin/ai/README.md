# AI Communication Service

A lightweight Go package for communicating with the Anthropic Claude API with intelligent model selection and MCP integration.

## Quick Start

```go
package main

import (
    "context"
    "irmin-api/ai"
)

func main() {
    // Create AI service
    aiService, err := ai.NewAIFromEnv(env, &userToken)
    if err != nil {
        log.Fatal(err)
    }

    // Send message
    ctx := context.Background()
    req := &ai.MessageRequest{
        Content: "Hello, Claude!",
        AIType:  &ai.AssistantAI, // Gets automatic model selection
    }
    
    response, err := aiService.SendMessage(ctx, req)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Core Types

### `MessageRequest`
```go
type MessageRequest struct {
    Content                string                    // Required message content
    ConversationID         string                    // Conversation identifier
    ConversationHistory    []ConversationMessage    // Previous messages
    MaxTokens              *int64                   // Response token limit
    Model                  *anthropic.Model         // Specific model to use
    Temperature            *float64                 // Creativity (0.0-1.0)
    TopP                   *float64                 // Nucleus sampling parameter
    Stream                 bool                     // Enable streaming responses
    Metadata               map[string]any           // Custom metadata
    ThinkingEnabled        bool                     // Enable thinking mode (Sonnet 4+ only)
    DocsToolsOnly          bool                     // Restrict to docs tools only
    AIType                 *IrminAIType            // AI type for system prompts
    AdditionalSystemPrompt string                   // Custom system instructions
}
```

### `Config`
```go
type Config struct {
    AnthropicAPIKey       string        // Required Anthropic API key
    IrminBaseURL          string        // MCP server base URL
    IrminMCPPath          string        // MCP server path
    UserToken             *string       // MCP authentication token
    DefaultModel          anthropic.Model // Default model (Claude Sonnet 4)
    MaxTokens             int64         // Default max tokens (10,240)
    Temperature           float64       // Default temperature (0.8)
    MaxRetries            int           // Maximum number of retries (3)
    BaseDelay             time.Duration // Base delay between retries (2s)
    Logger                *slog.Logger  // Logger for debugging
}
```

## AI Types & Model Selection

### Available AI Types
- **`AssistantAI`**: Full-featured with automatic model selection (Sonnet 4 or Haiku 3.5)
- **`QueryAI`**: Fast responses for simple queries (Haiku 3.5)
- **`ModelRouterAI`**: Fast model classification (Haiku 3.5)
- **`ConversationTitleGenerator`**: Optimized for title generation (Haiku 3.5)

### Thinking Mode Support
- **Sonnet 4 models**: ✅ Full thinking mode support
- **Opus models**: ✅ Full thinking mode support
- **Haiku models**: ❌ No thinking mode (automatically disabled)
- **Automatic detection**: Thinking is only enabled for supported models

### Automatic Model Selection
```go
// AssistantAI automatically selects the best model
assistantType := ai.AssistantAI
req := &ai.MessageRequest{
    Content: "Design a complex workflow with error handling",
    AIType:  &assistantType, // Will use Sonnet 4 for complex tasks
}

// Simple queries use the faster model
req := &ai.MessageRequest{
    Content: "What is a workspace?",
    AIType:  &ai.QueryAI, // Will use Haiku 3.5 for simple queries
}
```

## MCP Configuration

### Priority System
1. **Explicit Overrides**: `DocsToolsOnly: true` always restricts to docs tools
2. **AI Type Defaults**: Applied when no explicit override
3. **Legacy Behavior**: Full MCP access when no AI type specified

### Examples
```go
// Override AI type default
req := &ai.MessageRequest{
    Content:        "Help me with this task",
    AIType:         &ai.AssistantAI,     // Would normally get full MCP access
    DocsToolsOnly:  true,                // But explicitly restricted to docs only
}

// Use AI type default
req := &ai.MessageRequest{
    Content: "What is a workspace?",
    AIType:  &ai.QueryAI,                // Gets docs tools by default
}
```

## Response Processing

```go
// Extract all content blocks
contentBlocks := ai.ExtractResponseBlocks(response.Content)
for _, block := range contentBlocks {
    log.Printf("Type: %s, Content: %s", block.Type, block.Content)
}

// Extract text content (backward compatibility)
textContent := ai.ExtractResponseContent(response.Content)
```

## Conversation Management

```go
// Generate conversation title
title, err := aiService.GenerateConversationTitle(ctx, "I need help with my API")
if err != nil {
    log.Printf("Failed to generate title: %v", err)
}

// Select model manually
model, err := aiService.SelectModel(ctx, "Design a complex workflow")
if err != nil {
    log.Printf("Failed to select model: %v", err)
}
```

## Best Practices

- **Use `AssistantAI`** for complex tasks requiring automatic model selection
- **Use `QueryAI`** for simple lookups and documentation questions
- **Let `AssistantAI` handle model selection** automatically instead of manually specifying models
- **MCP access is automatically configured** based on AI type, but can be overridden with `DocsToolsOnly`
- **Create AI services per request** for most use cases
- **Implement proper error handling** with retry logic for production use

## Thread Safety

This package is stateless and thread-safe. Each AI service instance can be used safely from multiple goroutines.
