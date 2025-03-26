package utils

import (
	"github.com/gofiber/fiber/v3"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func WriteResponse(c fiber.Ctx, status int, response irminModels.IrminAPIResponse) error {
	if response.Message == "" && len(response.Errors) > 0 {
		response.Message = response.Errors[0]
	}
	return c.Status(status).JSON(response)
}
