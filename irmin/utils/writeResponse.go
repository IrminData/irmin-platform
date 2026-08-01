package utils

import (
	"github.com/gofiber/fiber/v3"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func WriteResponse(c fiber.Ctx, status int, response irminmodels.IrminAPIResponse) error {
	if response.Message == "" && len(response.Errors) > 0 {
		response.Message = response.Errors[0]
	}
	return c.Status(status).JSON(response)
}
