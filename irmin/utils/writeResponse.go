package utils

import (
	"github.com/gofiber/fiber/v3"
)

type IrminAPIResponse struct {
	Metadata map[string]string `json:"metadata,omitempty"`
	Message  string            `json:"message,omitempty"`
	Errors   []string          `json:"errors,omitempty"`
	Data     any               `json:"data,omitempty"`
}

func WriteResponse(c fiber.Ctx, status int, response IrminAPIResponse) error {
	if response.Message == "" && len(response.Errors) > 0 {
		response.Message = response.Errors[0]
	}
	return c.Status(status).JSON(response)
}
