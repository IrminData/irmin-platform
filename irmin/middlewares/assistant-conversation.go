package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// AssistantConversationMiddleware verifies that the user has access to the assistant conversation they are trying to access.
func (api *APIMiddlewares) AssistantConversationMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(
		api,
		c,
		"assistant_conversation",
		"assistant_conversations",
		api.DB.GetAssistantConversationWithMessages,
	)
}
