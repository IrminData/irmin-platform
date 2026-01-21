package irminmodels

// PatchOperation represents a single operation in a JSON Patch array.
type PatchOperation struct {
	// The operation: "add", "remove", "replace", "move" or "copy"
	Op string `json:"op"                     validate:"required,oneof=add remove replace move copy" example:"replace"`
	// The JSON-Pointer location to apply the operation
	Path string `json:"path"                   validate:"required"                                    example:"/users.json/1/name"`
	// Used for "move" or "copy" operations
	From *string `json:"from,omitempty"         validate:"required_if=Op move,required_if=Op copy"     example:"/users.json/1/name"`
	// Used for "add" or "replace" operations
	Value *any `json:"value,omitempty"        validate:"required_if=Op add,required_if=Op replace"   example:"John"`
	// ContentType indicates the MIME type for binary data.
	// When set, Value should be base64-encoded binary content.
	ContentType *string `json:"content_type,omitempty"                                                        example:"image/png"`
}

// Patch is a series of patch operations.
type Patch []PatchOperation
