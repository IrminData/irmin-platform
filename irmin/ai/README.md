# Universal AI Message Service

A comprehensive, thread-safe Go package for managing AI conversations with the Anthropic Claude API. This package provides conversation management, message history, and advanced features to avoid code repetition across your application.

## Features

- **Universal Message Sending**: Single interface for all AI interactions
- **Conversation Management**: Automatic conversation creation and management
- **Thread-Safe Operations**: Concurrent access with mutex protection
- **Message History**: Automatic storage and retrieval of conversation history
- **Flexible Configuration**: Customizable options for each message
- **Data Export/Import**: Conversation persistence and migration support
- **Statistics and Analytics**: Built-in conversation metrics
- **Automatic Cleanup**: Time-based conversation cleanup utilities

## Quick Start

### Basic Setup

```go
package main

import (
    "context"
    "log"
    "irmin-api/ai"
    "irmin-api/utils"
)

func main() {
    // Initialize API services (replace with your actual services)
    env := &utils.CoreAPIEnv{
        AnthropicAPIKey: "your-anthropic-api-key",
        URL:             "https://your-api.com",
        MCPHTTPPath:     "/mcp",
    }
    userToken := "user-token-123" // User's JWT token to authenticate Irmin MCP usage

    // Create AI service instance
    aiService, err := ai.NewAI(env, &userToken)
    if err != nil {
        log.Fatal(err)
    }

    // Send a simple message
    ctx := context.Background()
    response, err := aiService.SendMessage(ctx, "Hello, Claude!", nil)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Response ID: %s", response.ID)
}
```

### Using Conversations

```go
// Create a conversation with metadata
conversationID := "user_123_session_1"
conversation := aiService.CreateConversation(conversationID, map[string]any{
    "user_id": "user_123",
    "topic":   "technical_support",
})

// Send messages with conversation context
opts := &ai.MessageOptions{
    ConversationID: conversationID,
    MaxTokens:      2048,
    Temperature:    &[]float64{0.7}[0], // Helper for pointer
}

// First message
response1, err := aiService.SendMessage(ctx, "I need help with my API", opts)

// Follow-up message (history automatically included)
response2, err := aiService.SendMessage(ctx, "The authentication is failing", opts)

// Get conversation history
history := aiService.GetConversationHistory(conversationID)
log.Printf("Conversation has %d messages", len(history))
```

## API Reference

### Core Types

#### `AI`
Main service struct for managing AI interactions.

#### `MessageOptions`
Configuration options for message sending:
- `ConversationID`: Optional conversation identifier
- `MaxTokens`: Maximum tokens in response (default: 1024)
- `Model`: AI model to use (default: Claude Sonnet 4)
- `Temperature`: Response creativity (0.0-1.0)
- `TopP`: Nucleus sampling parameter
- `Metadata`: Custom metadata for the message

#### `Conversation`
Represents a conversation with history:
- `ID`: Unique conversation identifier
- `CreatedAt`: Creation timestamp
- `UpdatedAt`: Last modification timestamp
- `Messages`: Array of conversation messages
- `Metadata`: Custom conversation metadata

#### `Message`
Individual message in a conversation:
- `ID`: Unique message identifier
- `Role`: Message role (user/assistant)
- `Content`: Message text content
- `Timestamp`: Message timestamp
- `Metadata`: Custom message metadata

### Core Methods

#### Message Sending

```go
// Send message without conversation context
response, err := ai.SendMessage(ctx, "Hello", nil)

// Send message with full options
opts := &MessageOptions{
    ConversationID: "conv_123",
    MaxTokens:      2048,
    Temperature:    &[]float64{0.8}[0],
    Metadata:       map[string]any{"source": "chat"},
}
response, err := ai.SendMessage(ctx, "Hello", opts)
```

#### Conversation Management

```go
// Create conversation
conversation := ai.CreateConversation("conv_id", metadata)

// Get conversation
conversation := ai.GetConversation("conv_id")

// Store message manually
message := ai.Message{
    ID:        "msg_123",
    Role:      anthropic.BetaMessageParamRoleUser,
    Content:   "Hello",
    Timestamp: time.Now(),
}
ai.StoreMessage("conv_id", message)

// Get conversation history
history := ai.GetConversationHistory("conv_id")

// Clear conversation messages
ai.ClearConversation("conv_id")

// Delete conversation entirely
ai.DeleteConversation("conv_id")

// List all conversations
conversations := ai.ListConversations()
```

#### Analytics and Statistics

```go
// Get conversation statistics
stats := ai.GetConversationStats("conv_id")
// Returns: total_messages, user_messages, assistant_messages, 
//          estimated_tokens, created_at, last_updated, duration_minutes
```

#### Data Persistence

```go
// Export conversation to map
exported := ai.ExportConversation("conv_id")

// Import conversation from map
err := ai.ImportConversation(exported)

// Cleanup old conversations (older than 24 hours)
deletedCount := ai.CleanupOldConversations(24 * time.Hour)
```

## Advanced Usage Patterns

### Multi-User Support

```go
// Create user-specific conversation IDs
userID := "user_123"
sessionID := "session_456"
conversationID := fmt.Sprintf("conv_%s_%s", userID, sessionID)

conversation := aiService.CreateConversation(conversationID, map[string]any{
    "user_id":    userID,
    "session_id": sessionID,
    "created_by": "support_system",
})
```

### Conversation Templates

```go
// Create conversation factory function
func createSupportConversation(userID, ticketID string) *ai.Conversation {
    conversationID := fmt.Sprintf("support_%s_%s", userID, ticketID)
    metadata := map[string]any{
        "type":      "support",
        "user_id":   userID,
        "ticket_id": ticketID,
        "priority":  "medium",
    }
    return aiService.CreateConversation(conversationID, metadata)
}
```

### Batch Operations

```go
// Process multiple conversations
conversations := aiService.ListConversations()
for _, convID := range conversations {
    stats := aiService.GetConversationStats(convID)
    if stats["duration_minutes"].(int) > 60 {
        // Archive long conversations
        exported := aiService.ExportConversation(convID)
        // Save to database/file
        aiService.DeleteConversation(convID)
    }
}
```

### Error Handling Patterns

```go
func sendMessageSafely(ai *ai.AI, ctx context.Context, msg string, opts *ai.MessageOptions) (*anthropic.BetaMessage, error) {
    response, err := ai.SendMessage(ctx, msg, opts)
    if err != nil {
        // Log error with context
        log.Printf("AI message failed: %v, conversation: %s", err, opts.ConversationID)
        
        // Optionally retry with simplified options
        if opts.ConversationID != "" {
            simpleOpts := &ai.MessageOptions{ConversationID: opts.ConversationID}
            return ai.SendMessage(ctx, msg, simpleOpts)
        }
        return nil, err
    }
    return response, nil
}
```

### Conversation Monitoring

```go
// Monitor conversation health
func monitorConversations(ai *ai.AI) {
    conversations := ai.ListConversations()
    for _, convID := range conversations {
        stats := ai.GetConversationStats(convID)
        
        // Alert on long conversations
        if stats["total_messages"].(int) > 100 {
            log.Printf("Long conversation detected: %s with %d messages", 
                convID, stats["total_messages"])
        }
        
        // Alert on high token usage
        if stats["estimated_tokens"].(int) > 10000 {
            log.Printf("High token usage in conversation: %s (%d tokens)", 
                convID, stats["estimated_tokens"])
        }
    }
}
```

## Best Practices

### 1. Conversation ID Naming
Use descriptive, hierarchical conversation IDs:
```go
// Good
"user_123_session_456_chat"
"support_ticket_789_conversation"
"onboarding_user_123_step_2"

// Avoid
"conv1"
"chat"
"conversation"
```

### 2. Metadata Usage
Store relevant context in metadata:
```go
metadata := map[string]any{
    "user_id":      userID,
    "session_id":   sessionID,
    "feature":      "chat_support",
    "version":      "1.0",
    "environment":  "production",
    "created_by":   "user_action",
}
```

### 3. Resource Management
Implement cleanup strategies:
```go
// Daily cleanup of old conversations
go func() {
    ticker := time.NewTicker(24 * time.Hour)
    for range ticker.C {
        deleted := aiService.CleanupOldConversations(7 * 24 * time.Hour)
        log.Printf("Cleaned up %d old conversations", deleted)
    }
}()
```

### 4. Error Recovery
Always handle conversation creation failures:
```go
conversation := aiService.GetConversation(conversationID)
if conversation == nil {
    // Conversation doesn't exist, create it
    conversation = aiService.CreateConversation(conversationID, defaultMetadata)
}
```

### 5. Performance Optimization
For high-frequency usage:
- Use conversation IDs strategically to avoid memory bloat
- Implement periodic exports for long-term storage
- Monitor conversation count and clean up proactively

## Thread Safety

All methods in this package are thread-safe and can be called concurrently. The package uses read-write mutexes to ensure data consistency while allowing concurrent read operations.

```go
// Safe to call from multiple goroutines
go aiService.SendMessage(ctx, "Message 1", opts1)
go aiService.SendMessage(ctx, "Message 2", opts2)
go aiService.GetConversationHistory("conv_id")
```

## Migration and Persistence

The package supports full conversation export/import for data migration:

```go
// Export all conversations
allConversations := aiService.ListConversations()
exports := make(map[string]any)

for _, convID := range allConversations {
    exports[convID] = aiService.ExportConversation(convID)
}

// Later, reimport conversations
for convID, exported := range exports {
    err := aiService.ImportConversation(exported)
    if err != nil {
        log.Printf("Failed to import conversation %s: %v", convID, err)
    }
}
```
