package controllers

import (
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func LogsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	logEvents, err := db.GetLogEventsForWorkspace(workspace.ID)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	var response []irminModels.LogEvent
	for _, event := range logEvents {
		formattedEvent, err := formatter.FormatLogEventResponse(event)
		if err != nil {
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		response = append(response, *formattedEvent)
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: response,
	})
}
