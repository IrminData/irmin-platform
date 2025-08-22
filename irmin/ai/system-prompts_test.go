package ai_test

import (
	"irmin-api/ai"
	"strings"
	"testing"
)

func TestGetSystemPrompt(t *testing.T) {
	tests := []struct {
		name     string
		aiType   ai.IrminAIType
		expected string
	}{
		{
			name:     "Assistant AI prompt",
			aiType:   ai.AssistantAI,
			expected: "You are Irmin Assistant",
		},
		{
			name:     "Query AI prompt",
			aiType:   ai.QueryAI,
			expected: "Role and scope",
		},
		{
			name:     "Unknown AI type",
			aiType:   ai.IrminAIType("unknown"),
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ai.GetSystemPrompt(tt.aiType)
			if tt.expected == "" {
				if result != "" {
					t.Errorf("Expected empty string for unknown AI type, got: %s", result)
				}
			} else if !strings.Contains(result, tt.expected) {
				t.Errorf("Expected prompt to contain '%s', got: %s", tt.expected, result)
			}
		})
	}
}

func TestIrminAITypeConstants(t *testing.T) {
	if ai.AssistantAI != "assistant" {
		t.Errorf("Expected AssistantAI to be 'assistant', got: %s", ai.AssistantAI)
	}
	if ai.QueryAI != "query" {
		t.Errorf("Expected QueryAI to be 'query', got: %s", ai.QueryAI)
	}
}
