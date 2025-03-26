package irminModels

// PatchOperation represents a single operation in a JSON Patch array.
type PatchOperation struct {
	// The operation: "add", "remove", "replace", "move" or "copy"
	Op string `json:"op"`
	// The JSON-Pointer location to apply the operation
	Path string `json:"path"`
	// Used for "move" or "copy" operations
	From string `json:"from,omitempty"`
	// Used for "add" or "replace" operations
	Value any `json:"value,omitempty"`
}

// Patch is a series of patch operations.
type Patch []PatchOperation
