package ai

import (
	_ "embed"
)

//go:embed system-prompts/assistant.txt
var assistantPrompt string

//go:embed system-prompts/query.txt
var queryPrompt string

// IrminAIType represents the type of AI system
type IrminAIType string

const (
	// AssistantAI represents the Irmin Assistant AI
	AssistantAI IrminAIType = "assistant"
	// QueryAI represents the Irmin Query AI
	QueryAI IrminAIType = "query"
)

// GetSystemPrompt returns the system prompt for the specified AI type
func GetSystemPrompt(aiType IrminAIType) string {
	switch aiType {
	case AssistantAI:
		return assistantPrompt
	case QueryAI:
		return queryPrompt
	default:
		return ""
	}
}
