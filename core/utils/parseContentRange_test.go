package utils_test

import (
	"irmin-api/utils"
	"strings"
	"testing"
)

func TestParseContentRange_Valid(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantStart int64
		wantEnd   int64
		wantTotal int64
	}{
		{
			name:      "valid range with bytes prefix",
			input:     "bytes 0-1023/2048",
			wantStart: 0,
			wantEnd:   1023,
			wantTotal: 2048,
		},
		{
			name:      "valid range without bytes prefix",
			input:     "0-1023/2048",
			wantStart: 0,
			wantEnd:   1023,
			wantTotal: 2048,
		},
		{
			name:      "single byte range",
			input:     "bytes 0-0/100",
			wantStart: 0,
			wantEnd:   0,
			wantTotal: 100,
		},
		{
			name:      "middle range",
			input:     "bytes 1000-1999/5000",
			wantStart: 1000,
			wantEnd:   1999,
			wantTotal: 5000,
		},
		{
			name:      "last byte range",
			input:     "bytes 4999-4999/5000",
			wantStart: 4999,
			wantEnd:   4999,
			wantTotal: 5000,
		},
		{
			name:      "large file range",
			input:     "bytes 0-1048575/10485760",
			wantStart: 0,
			wantEnd:   1048575,
			wantTotal: 10485760,
		},
		{
			name:      "negative total",
			input:     "bytes 0-1023/-2048",
			wantStart: 0,
			wantEnd:   1023,
			wantTotal: -2048,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end, total, err := utils.ParseContentRange(tt.input)
			if err != nil {
				t.Errorf("ParseContentRange(%q) unexpected error: %v", tt.input, err)
				return
			}
			if start != tt.wantStart {
				t.Errorf("ParseContentRange(%q) start = %d, expected %d", tt.input, start, tt.wantStart)
			}
			if end != tt.wantEnd {
				t.Errorf("ParseContentRange(%q) end = %d, expected %d", tt.input, end, tt.wantEnd)
			}
			if total != tt.wantTotal {
				t.Errorf("ParseContentRange(%q) total = %d, expected %d", tt.input, total, tt.wantTotal)
			}
		})
	}
}

func TestParseContentRange_Errors(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		errorMsg string
	}{
		{
			name:     "missing total",
			input:    "bytes 0-1023",
			errorMsg: "invalid Content-Range header",
		},
		{
			name:     "missing range",
			input:    "bytes /2048",
			errorMsg: "invalid range in Content-Range header",
		},
		{
			name:     "invalid total - not a number",
			input:    "bytes 0-1023/abc",
			errorMsg: "invalid total in Content-Range header",
		},
		{
			name:     "invalid start - not a number",
			input:    "bytes abc-1023/2048",
			errorMsg: "invalid start in Content-Range header",
		},
		{
			name:     "invalid end - not a number",
			input:    "bytes 0-abc/2048",
			errorMsg: "invalid end in Content-Range header",
		},
		{
			name:     "missing dash in range",
			input:    "bytes 01023/2048",
			errorMsg: "invalid range in Content-Range header",
		},
		{
			name:     "extra parts",
			input:    "bytes 0-1023/2048/extra",
			errorMsg: "invalid Content-Range header",
		},
		{
			name:     "empty string",
			input:    "",
			errorMsg: "invalid Content-Range header",
		},
		{
			name:     "only bytes prefix",
			input:    "bytes ",
			errorMsg: "invalid Content-Range header",
		},
		{
			name:     "negative start",
			input:    "bytes -100-1023/2048",
			errorMsg: "invalid range in Content-Range header",
		},
		{
			name:     "negative end",
			input:    "bytes 0--100/2048",
			errorMsg: "invalid range in Content-Range header",
		},
		{
			name:     "multiple dashes in range",
			input:    "bytes 0-100-200/2048",
			errorMsg: "invalid range in Content-Range header",
		},
		{
			name:     "spaces in numbers",
			input:    "bytes 0 - 1023 / 2048",
			errorMsg: "invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, _, err := utils.ParseContentRange(tt.input)
			if err == nil {
				t.Errorf("ParseContentRange(%q) expected error containing %q, got nil", tt.input, tt.errorMsg)
				return
			}
			if !strings.Contains(err.Error(), tt.errorMsg) {
				t.Errorf(
					"ParseContentRange(%q) error = %q, expected error containing %q",
					tt.input,
					err.Error(),
					tt.errorMsg,
				)
			}
		})
	}
}
