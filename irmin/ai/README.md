# AI Communication Service

A lightweight, stateless Go package for communicating with the Anthropic Claude API. This package provides a clean interface for sending messages and processing AI responses without managing conversation state.

## Features

- **Stateless Design**: No in-memory conversation storage or mutexes
- **Universal Message Sending**: Single interface for all AI interactions
- **MCP Integration**: Built-in support for Model Context Protocol servers
- **Flexible Configuration**: Customizable options for each message
- **Response Processing**: Utilities for extracting and processing AI responses
- **Error Handling**: Built-in retry logic with exponential backoff
- **Conversation History Support**: Accepts conversation history from external sources

## Quick Start

### Basic Setup

```go
package main

import (
    "context"
    "log"
    "irmin-api/ai"
)

func main() {
    // Create AI service with custom configuration
    config := &ai.Config{
        APIKey:       "your-anthropic-api-key",
        BaseURL:      "https://your-api.com",
        MCPPath:      "/mcp",
        UserToken:    &userToken, // Required for MCP authentication
        DefaultModel: ai.DefaultMainModel,
        MaxTokens:    ai.DefaultMaxTokens,
        Temperature:  ai.DefaultTemperature,
    }
    
    aiService, err := ai.NewAI(config)
    if err != nil {
        log.Fatal(err)
    }

    // Send a simple message
    ctx := context.Background()
    req := &ai.MessageRequest{
        Content: "Hello, Claude!",
    }
    
    response, err := aiService.SendMessage(ctx, req)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Response ID: %s", response.ID)
}
```

### Using Environment Configuration

```go
// For existing Irmin projects, use the environment-based constructor
// This automatically handles MCP authentication with the user token
aiService, err := ai.NewAIFromEnv(env, &userToken)
if err != nil {
    log.Fatal(err)
}
```

**Note**: The `userToken` is required for MCP server authentication. Without it, the AI service won't be able to access Irmin-specific tools and functionality.

### Using Conversation History

```go
// Prepare conversation history from your database
conversationHistory := []ai.ConversationMessage{
    {
        Role:    anthropic.BetaMessageParamRoleUser,
        Content: "I need help with my API",
    },
    {
        Role:    anthropic.BetaMessageParamRoleAssistant,
        Content: "I'd be happy to help! What specific issue are you experiencing?",
    },
}

// Send message with conversation context
req := &ai.MessageRequest{
    Content:             "The authentication is failing",
    ConversationHistory: conversationHistory,
    MaxTokens:           &[]int64{2048}[0],
    Temperature:         &[]float64{0.7}[0],
}

response, err := aiService.SendMessage(ctx, req)
```

## API Reference

### Core Types

#### `Config`
Configuration for the AI service:
- `APIKey`: Anthropic API key (required)
- `BaseURL`: Base URL for MCP server
- `MCPPath`: MCP server path
- `UserToken`: User authentication token for MCP server access
- `DefaultModel`: Default AI model to use
- `MaxTokens`: Default maximum tokens
- `Temperature`: Default temperature setting
- `MaxRetries`: Maximum retry attempts
- `BaseDelay`: Base delay between retries

#### `MessageRequest`
Configuration for message sending:
- `Content`: The message content (required)
- `ConversationHistory`: Array of previous conversation messages
- `MaxTokens`: Maximum tokens in response
- `Model`: AI model to use
- `Temperature`: Response creativity (0.0-1.0)
- `TopP`: Nucleus sampling parameter
- `Metadata`: Custom metadata for the message
- `ThinkingEnabled`: Enable thinking mode
- `DocsToolsOnly`: Restrict to documentation tools only
- `AIType`: AI type for system prompts
- `AdditionalSystemPrompt`: Additional system instructions

#### `ConversationMessage`
Represents a message in conversation history:
- `Role`: Message role (user/assistant)
- `Content`: Message text content

### Core Methods

#### Message Sending

```go
// Send message without conversation context
req := &ai.MessageRequest{Content: "Hello"}
response, err := ai.SendMessage(ctx, req)

// Send message with conversation history
req := &ai.MessageRequest{
    Content:             "Hello",
    ConversationHistory: conversationHistory,
    MaxTokens:           &[]int64{2048}[0],
    Temperature:         &[]float64{0.8}[0],
    Metadata:            map[string]any{"source": "chat"},
}
response, err := ai.SendMessage(ctx, req)
```

#### Response Processing

```go
// Extract all content blocks from AI response
contentBlocks := ai.ExtractResponseBlocks(response.Content)
for _, block := range contentBlocks {
    log.Printf("Content type: %s, Content: %s", block.Type, block.Content)
}

// Extract text content (backward compatibility)
textContent := ai.ExtractResponseContent(response.Content)
log.Printf("Text content: %s", textContent)
```

#### Conversation Title Generation

```go
// Generate a title for a conversation based on the first message
title, err := aiService.GenerateConversationTitle(ctx, "I need help with my API authentication")
if err != nil {
    log.Printf("Failed to generate title: %v", err)
} else {
    log.Printf("Generated title: %s", title)
}
```

## Advanced Usage Patterns

### MCP Server Configuration

```go
// Configure MCP servers with custom tool access
req := &ai.MessageRequest{
    Content:        "Search the documentation",
    DocsToolsOnly:  true, // Restricts to only docs tools
    ThinkingEnabled: true, // Enables thinking mode
}
```

### System Prompt Management

```go
// Add AI type-specific system prompts
req := &ai.MessageRequest{
    Content: "Help me with this task",
    AIType:  &ai.IrminAIType, // Uses predefined system prompt
}

// Add custom system prompts
req := &ai.MessageRequest{
    Content:                "Process this data",
    AdditionalSystemPrompt: "You are a data processing expert. Always validate inputs.",
}
```

### Error Handling Patterns

```go
func sendMessageSafely(ai *ai.AI, ctx context.Context, msg string, history []ai.ConversationMessage) (*anthropic.BetaMessage, error) {
    req := &ai.MessageRequest{
        Content:             msg,
        ConversationHistory: history,
    }
    
    response, err := ai.SendMessage(ctx, req)
    if err != nil {
        // Log error with context
        log.Printf("AI message failed: %v, history length: %d", err, len(history))
        return nil, err
    }
    
    return response, nil
}
```

### Conversation History Management

```go
// Example of how to manage conversation history in your application
type ConversationManager struct {
    db *Database
}

func (cm *ConversationManager) SendMessage(conversationID string, message string) (*anthropic.BetaMessage, error) {
    // 1. Retrieve conversation history from database
    history, err := cm.db.GetConversationMessages(conversationID)
    if err != nil {
        return nil, fmt.Errorf("failed to get history: %w", err)
    }
    
    // 2. Convert to AI format
    conversationHistory := make([]ai.ConversationMessage, len(history))
    for i, msg := range history {
        conversationHistory[i] = ai.ConversationMessage{
            Role:    msg.Role,
            Content: msg.Content,
        }
    }
    
    // 3. Send message with history
    aiService, err := ai.NewAIFromEnv(env, userToken)
    if err != nil {
        return nil, err
    }
    
    req := &ai.MessageRequest{
        Content:             message,
        ConversationHistory: conversationHistory,
    }
    
    return aiService.SendMessage(ctx, req)
}
```

## Best Practices

### 1. Conversation History Management
Since this package doesn't store conversation state, manage it in your application:

```go
// Store messages in your database
func storeMessage(db *Database, conversationID string, role string, content string) error {
    message := &Message{
        ConversationID: conversationID,
        Role:          role,
        Content:       content,
        Timestamp:     time.Now(),
    }
    return db.Create(message)
}

// Retrieve history when needed
func getConversationHistory(db *Database, conversationID string) ([]ai.ConversationMessage, error) {
    messages, err := db.GetMessagesByConversation(conversationID)
    if err != nil {
        return nil, err
    }
    
    history := make([]ai.ConversationMessage, len(messages))
    for i, msg := range messages {
        history[i] = ai.ConversationMessage{
            Role:    msg.Role,
            Content: msg.Content,
        }
    }
    
    return history, nil
}
```

### 2. AI Service Lifecycle
Create AI services per request or use a connection pool:

```go
// Per-request creation (recommended for most use cases)
func handleRequest(ctx context.Context, userToken string) error {
    aiService, err := ai.NewAIFromEnv(env, &userToken)
    if err != nil {
        return err
    }
    
    // Use service for this request
    response, err := aiService.SendMessage(ctx, req)
    // ... handle response
    
    return nil
}

// Connection pooling for high-frequency usage
type AIServicePool struct {
    services chan *ai.AI
}

func (p *AIServicePool) GetService(userToken string) (*ai.AI, error) {
    select {
    case service := <-p.services:
        // Reuse existing service
        return service, nil
    default:
        // Create new service
        return ai.NewAIFromEnv(env, &userToken)
    }
}
```

### 3. Error Recovery
Implement proper error handling and retry logic:

```go
func sendMessageWithRetry(ai *ai.AI, ctx context.Context, req *ai.MessageRequest, maxRetries int) (*anthropic.BetaMessage, error) {
    var lastErr error
    
    for attempt := 0; attempt < maxRetries; attempt++ {
        response, err := ai.SendMessage(ctx, req)
        if err == nil {
            return response, nil
        }
        
        lastErr = err
        
        // Check if it's a retryable error
        if strings.Contains(err.Error(), "overloaded_error") {
            // Wait before retry
            time.Sleep(time.Duration(attempt+1) * time.Second)
            continue
        }
        
        // Non-retryable error
        break
    }
    
    return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}
```

### 4. Performance Optimization
For high-frequency usage:
- Reuse AI service instances when possible
- Implement conversation history caching
- Monitor API rate limits and implement backoff strategies

## Thread Safety

This package is designed to be stateless and thread-safe. Each AI service instance can be used safely from multiple goroutines, and you can create multiple instances for concurrent use.

```go
// Safe to use concurrently
go func() {
    aiService1, _ := ai.NewAIFromEnv(env, &userToken1)
    aiService1.SendMessage(ctx, req1)
}()

go func() {
    aiService2, _ := ai.NewAIFromEnv(env, &userToken2)
    aiService2.SendMessage(ctx, req2)
}()
```
