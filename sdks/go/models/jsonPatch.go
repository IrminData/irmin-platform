package irminmodels

// PatchOperation represents a single operation in a JSON Patch array.
type PatchOperation struct {
	// The operation: "add", "remove", "replace", "move" or "copy"
	Op string `json:"op"              validate:"required,oneof=add remove replace move copy"`
	// The JSON-Pointer location to apply the operation
	Path string `json:"path"            validate:"required,min=1"`
	// Used for "move" or "copy" operations
	From string `json:"from,omitempty"  validate:"min=1"`
	// Used for "add" or "replace" operations
	Value any `json:"value,omitempty"`
}

// Patch is a series of patch operations.
type Patch []PatchOperation
