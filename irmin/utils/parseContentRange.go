package utils

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	// contentRangeParts represents the expected number of parts in a Content-Range header
	// Format: "bytes start-end/total" -> 2 parts: "start-end" and "total".
	contentRangeParts = 2

	// rangeBoundsParts represents the expected number of parts in a range specification
	// Format: "start-end" -> 2 parts: "start" and "end".
	rangeBoundsParts = 2
)

// ParseContentRange parses a Content-Range HTTP header value.
// It expects a string in the format "bytes start-end/total" (e.g. "bytes 0-1023/2048")
// and returns the start byte, end byte, total size, and any parsing error.
func ParseContentRange(cr string) (int64, int64, int64, error) {
	var start, end, total int64
	var err error

	// Remove "bytes " prefix if present.
	cr = strings.TrimPrefix(cr, "bytes ")
	parts := strings.Split(cr, "/")
	if len(parts) != contentRangeParts {
		return 0, 0, 0, fmt.Errorf("invalid Content-Range header: %s", cr)
	}

	rangePart, totalPart := parts[0], parts[1]
	total, err = strconv.ParseInt(totalPart, 10, 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid total in Content-Range header: %w", err)
	}

	rangeBounds := strings.Split(rangePart, "-")
	if len(rangeBounds) != rangeBoundsParts {
		return 0, 0, 0, fmt.Errorf("invalid range in Content-Range header: %s", cr)
	}
	start, err = strconv.ParseInt(rangeBounds[0], 10, 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid start in Content-Range header: %w", err)
	}
	end, err = strconv.ParseInt(rangeBounds[1], 10, 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid end in Content-Range header: %w", err)
	}
	return start, end, total, nil
}
