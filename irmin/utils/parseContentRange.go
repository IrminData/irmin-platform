package utils

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseContentRange parses a Content-Range header of the form "bytes start-end/total".
func ParseContentRange(cr string) (start, end, total int64, err error) {
	// Remove "bytes " prefix if present.
	cr = strings.TrimPrefix(cr, "bytes ")
	parts := strings.Split(cr, "/")
	if len(parts) != 2 {
		return 0, 0, 0, fmt.Errorf("invalid Content-Range header: %s", cr)
	}

	rangePart, totalPart := parts[0], parts[1]
	total, err = strconv.ParseInt(totalPart, 10, 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid total in Content-Range header: %w", err)
	}

	rangeBounds := strings.Split(rangePart, "-")
	if len(rangeBounds) != 2 {
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
