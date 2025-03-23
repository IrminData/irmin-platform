package utils

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
)

// WriteFileDownloadResponse writes a file download response with the given status and filename.
// It sets the appropriate headers and sends the file data.
// Parameters:
// - c: the Fibre context.
// - status: the HTTP status code.
// - filename: the name for the file to be downloaded.
// - data: the file content.
func WriteFileDownloadResponse(c fiber.Ctx, status int, filename string, data []byte) error {
	// Set the Content-Type to indicate binary data
	c.Set("Content-Type", "application/octet-stream")
	// Set the Content-Disposition to prompt a file download with the given filename
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	// Set the HTTP status code
	c.Status(status)
	// Send the file content as the response
	return c.Send(data)
}
