//nolint:testpackage // Testing internal function requires same package
package pineconecontrollers

import (
	"encoding/json"
	"testing"
	"time"

	pineconeclient "irmin-connectors/connectors/pinecone/client"
)

//nolint:gocognit // Test function with multiple test cases
func TestParseEmbeddingFromPatchValue(t *testing.T) {
	tests := []struct {
		name        string
		vectorID    string
		value       any
		wantErr     bool
		wantContent string
	}{
		{
			name:     "valid embedding with float64 array",
			vectorID: "vec-123",
			value: map[string]any{
				"embedding": []float64{0.1, 0.2, 0.3},
				"content":   "test content",
			},
			wantErr:     false,
			wantContent: "test content",
		},
		{
			name:     "valid embedding with any array",
			vectorID: "vec-456",
			value: map[string]any{
				"embedding": []any{0.1, 0.2, 0.3},
				"content":   "another test",
			},
			wantErr:     false,
			wantContent: "another test",
		},
		{
			name:     "missing embedding field",
			vectorID: "vec-789",
			value: map[string]any{
				"content": "no embedding",
			},
			wantErr: true,
		},
		{
			name:     "nil value",
			vectorID: "vec-nil",
			value:    nil,
			wantErr:  true,
		},
		{
			name:     "with metadata",
			vectorID: "vec-meta",
			value: map[string]any{
				"embedding": []float64{0.5, 0.6, 0.7},
				"metadata": map[string]any{
					"source": "test",
					"type":   "document",
				},
			},
			wantErr: false,
		},
		{
			name:     "with all fields",
			vectorID: "vec-full",
			value: map[string]any{
				"embedding":   []float64{0.1, 0.2, 0.3},
				"content":     "full content",
				"source_file": "test.txt",
				"chunk_index": 5,
				"created_at":  "2024-01-15T10:30:00Z",
			},
			wantErr:     false,
			wantContent: "full content",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var valuePtr *any
			if tt.value != nil {
				valuePtr = &tt.value
			}

			record, err := parseEmbeddingFromPatchValue(tt.vectorID, valuePtr)

			if tt.wantErr {
				if err == nil {
					t.Errorf("parseEmbeddingFromPatchValue() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("parseEmbeddingFromPatchValue() unexpected error: %v", err)
				return
			}

			if record.ID != tt.vectorID {
				t.Errorf("parseEmbeddingFromPatchValue() ID = %v, want %v", record.ID, tt.vectorID)
			}

			if tt.wantContent != "" && record.Content != tt.wantContent {
				t.Errorf("parseEmbeddingFromPatchValue() Content = %v, want %v", record.Content, tt.wantContent)
			}

			if len(record.Embedding) == 0 {
				t.Errorf("parseEmbeddingFromPatchValue() Embedding should not be empty")
			}
		})
	}
}

func TestParseEmbeddingValue(t *testing.T) {
	tests := []struct {
		name    string
		raw     any
		wantLen int
		wantErr bool
	}{
		{
			name:    "float32 slice",
			raw:     []float32{0.1, 0.2, 0.3},
			wantLen: 3,
			wantErr: false,
		},
		{
			name:    "float64 slice",
			raw:     []float64{0.1, 0.2, 0.3, 0.4},
			wantLen: 4,
			wantErr: false,
		},
		{
			name:    "any slice with float64",
			raw:     []any{0.1, 0.2, 0.3},
			wantLen: 3,
			wantErr: false,
		},
		{
			name:    "json string array",
			raw:     "[0.1, 0.2, 0.3]",
			wantLen: 3,
			wantErr: false,
		},
		{
			name:    "empty json array",
			raw:     "[]",
			wantLen: 0,
			wantErr: false,
		},
		{
			name:    "invalid string",
			raw:     "not a valid embedding",
			wantErr: true,
		},
		{
			name:    "unsupported type",
			raw:     123,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseEmbeddingValue(tt.raw)

			if tt.wantErr {
				if err == nil {
					t.Errorf("parseEmbeddingValue() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("parseEmbeddingValue() unexpected error: %v", err)
				return
			}

			if len(result) != tt.wantLen {
				t.Errorf("parseEmbeddingValue() len = %v, want %v", len(result), tt.wantLen)
			}
		})
	}
}

func TestParseIntValue(t *testing.T) {
	tests := []struct {
		name string
		raw  any
		want int
	}{
		{name: "int", raw: 42, want: 42},
		{name: "int64", raw: int64(42), want: 42},
		{name: "float64", raw: float64(42.7), want: 42},
		{name: "string", raw: "42", want: 42},
		{name: "invalid string", raw: "not a number", want: 0},
		{name: "json number", raw: json.Number("42"), want: 42},
		{name: "nil-like", raw: nil, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseIntValue(tt.raw)
			if result != tt.want {
				t.Errorf("parseIntValue() = %v, want %v", result, tt.want)
			}
		})
	}
}

func TestEmbeddingRecordDefaults(t *testing.T) {
	value := map[string]any{
		"embedding": []float64{0.1, 0.2, 0.3},
	}
	valuePtr := any(value)

	record, err := parseEmbeddingFromPatchValue("test-id", &valuePtr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check defaults
	if record.ID != "test-id" {
		t.Errorf("ID = %v, want test-id", record.ID)
	}

	if record.Metadata == nil {
		t.Error("Metadata should not be nil")
	}

	if record.CreatedAt.IsZero() {
		t.Error("CreatedAt should not be zero")
	}

	// CreatedAt should be close to now
	if time.Since(record.CreatedAt) > time.Minute {
		t.Error("CreatedAt should be close to current time")
	}
}

// BenchmarkParseEmbeddingFromPatchValue benchmarks the parsing function
func BenchmarkParseEmbeddingFromPatchValue(b *testing.B) {
	embedding := make([]float64, 1536) // Typical OpenAI embedding size
	for i := range embedding {
		embedding[i] = float64(i) / 1536.0
	}

	value := map[string]any{
		"embedding":   embedding,
		"content":     "benchmark content",
		"source_file": "benchmark.txt",
		"chunk_index": 0,
	}
	valuePtr := any(value)

	b.ResetTimer()
	for range b.N {
		_, _ = parseEmbeddingFromPatchValue("vec-bench", &valuePtr)
	}
}

// Ensure pineconeclient is used to avoid import error
var _ = pineconeclient.EmbeddingRecord{}
