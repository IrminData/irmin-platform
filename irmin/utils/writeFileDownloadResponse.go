package utils

import (
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// isSafeForInline reports whether the given content type can be rendered inline
// without risk of script execution. Types not on the safelist (e.g. text/html, SVG)
// should use Content-Disposition: attachment to prevent stored XSS.
func isSafeForInline(contentType string) bool {
	ct := strings.ToLower(contentType)
	// SVG can contain <script> tags and event handlers — never render inline.
	if strings.HasPrefix(ct, "image/svg") {
		return false
	}
	for _, safe := range []string{
		"image/",
		"video/",
		"audio/",
		"application/pdf",
		"text/plain",
		"text/csv",
	} {
		if strings.HasPrefix(ct, safe) {
			return true
		}
	}
	return false
}

// closeIfCloser closes the reader if it implements io.Closer.
func closeIfCloser(r io.Reader) {
	if closer, ok := r.(io.Closer); ok {
		_ = closer.Close()
	}
}

// WriteFileDownloadResponse writes a file download response with the given status and filename.
// It sets the appropriate headers and sends the file data.
// Parameters:
// - c: the Fibre context.
// - status: the HTTP status code.
// - filename: the name for the file to be downloaded.
// - data: the file content.
func WriteFileDownloadResponse(c fiber.Ctx, status int, filename, contentType string, data []byte) error {
	// Set the Content-Type to indicate binary data
	c.Set("Content-Type", contentType)
	// Set the Content-Disposition to prompt a file download with the given filename
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	// Set the HTTP status code
	c.Status(status)
	// Send the file content as the response
	return c.Send(data)
}

// WriteFileInlineResponse writes a file response for inline display (not download).
// For safe content types (images, PDFs, plain text, etc.) it sets Content-Disposition
// to "inline". For potentially dangerous types (HTML, SVG, XML) it falls back to
// "attachment" to prevent stored XSS via user-uploaded content.
func WriteFileInlineResponse(c fiber.Ctx, status int, filename, contentType string, data []byte) error {
	c.Set("Content-Type", contentType)
	disposition := "attachment"
	if isSafeForInline(contentType) {
		disposition = "inline"
	}
	c.Set("Content-Disposition", fmt.Sprintf(`%s; filename="%s"`, disposition, filename))
	c.Status(status)
	return c.Send(data)
}

// WriteStreamDownloadResponse writes a streaming file download response, piping content
// directly from the reader to the client without buffering the entire file in memory.
func WriteStreamDownloadResponse(
	c fiber.Ctx,
	status int,
	filename, contentType string,
	reader io.Reader,
	contentLength int64,
) error {
	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	if contentLength > 0 {
		c.Set("Content-Length", strconv.FormatInt(contentLength, 10))
	}
	c.Status(status)
	var sendErr error
	if contentLength > 0 && contentLength <= math.MaxInt {
		sendErr = c.SendStream(reader, int(contentLength))
	} else {
		sendErr = c.SendStream(reader)
	}
	// If SendStream fails before attaching the reader to the response body,
	// fasthttp never gets a reference to close it. Close it ourselves to
	// prevent leaking the underlying connection (e.g. from LakeFS).
	if sendErr != nil {
		closeIfCloser(reader)
	}
	return sendErr
}
