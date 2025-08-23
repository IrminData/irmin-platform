package ai

import (
	_ "embed"
)

//go:embed system-prompts/model-router.txt
var modelRouterPrompt string

//go:embed system-prompts/conversation-title-generator.txt
var conversationTitleGeneratorPrompt string

//go:embed system-prompts/assistant.txt
var assistantPrompt string

//go:embed system-prompts/query.txt
var queryPrompt string

//go:embed system-prompts/scripting.txt
var scriptingPrompt string

// IrminAIType represents the type of AI system
type IrminAIType string

const (
	// ModelRouterAI represents the Irmin Model Router AI
	ModelRouterAI IrminAIType = "model-router"
	// ConversationTitleGenerator represents the Irmin Conversation Title Generator AI
	ConversationTitleGenerator IrminAIType = "conversation-title-generator"
	// AssistantAI represents the Irmin Assistant AI
	AssistantAI IrminAIType = "assistant"
	// QueryAI represents the Irmin Query AI
	QueryAI IrminAIType = "query"
	// ScriptingAI represents the Irmin Scripting AI
	ScriptingAI IrminAIType = "scripting"
)

// GetSystemPrompt returns the system prompt for the specified AI type
func GetSystemPrompt(aiType IrminAIType) string {
	switch aiType {
	case ModelRouterAI:
		return modelRouterPrompt
	case ConversationTitleGenerator:
		return conversationTitleGeneratorPrompt
	case AssistantAI:
		return assistantPrompt
	case QueryAI:
		return queryPrompt
	case ScriptingAI:
		return scriptingPrompt
	default:
		return ""
	}
}
