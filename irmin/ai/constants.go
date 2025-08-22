package ai

import (
	"time"

	"github.com/anthropics/anthropic-sdk-go"
)

const (
	// DefaultMainModel is the default model to use for AI messages
	DefaultMainModel = anthropic.ModelClaudeSonnet4_20250514
	// DefaultSmallModel is the smaller, cheaper and faster model to use for AI messages
	DefaultSmallModel = anthropic.ModelClaude3_5HaikuLatest

	// DefaultTemperature is the default temperature for AI messages
	DefaultTemperature = 0.75

	// DefaultMaxTokens is the default maximum number of tokens for a message
	DefaultMaxTokens = 1024 * 15

	// DefaultThinkingMaxTokens is the default maximum number of tokens for thinking
	DefaultThinkingMaxTokens = 1024 * 5

	// MaxRetries is the maximum number of retries for overloaded errors
	MaxRetries = 3
	// BaseDelay is the base delay for overloaded errors
	BaseDelay = time.Second * 2
	// DelayBackoffFactor is the factor to multiply the delay by
	DelayBackoffFactor = 2

	// MaxTitleLength is the maximum length for conversation titles
	MaxTitleLength = 50
	// TitleMaxTokens is the maximum tokens for title generation
	TitleMaxTokens = 50
)
