package controllers_test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"irmin-api/controllers"
	"irmin-api/engine/validation"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
	"github.com/zeebo/assert"
)

// TestCollectMultipartFiles_SingleFile tests collecting a single file from multipart form.
func TestCollectMultipartFiles_SingleFile(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "file")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with single file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.json")
	part.Write([]byte(`{"id": 1, "name": "Alice"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 1, len(collectedFiles))
	assert.Equal(t, `{"id": 1, "name": "Alice"}`, string(collectedFiles["test.json"]))
}

// TestCollectMultipartFiles_MultipleFiles tests collecting multiple files from multipart form.
func TestCollectMultipartFiles_MultipleFiles(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with multiple files
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part1, _ := writer.CreateFormFile("files", "users.json")
	part1.Write([]byte(`{"name": "Alice"}`))

	part2, _ := writer.CreateFormFile("files", "orders.json")
	part2.Write([]byte(`{"total": 99.99}`))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 2, len(collectedFiles))
	assert.Equal(t, `{"name": "Alice"}`, string(collectedFiles["users.json"]))
	assert.Equal(t, `{"total": 99.99}`, string(collectedFiles["orders.json"]))
}

// TestCollectMultipartFiles_MultipleFieldNames tests collecting files from different field names.
func TestCollectMultipartFiles_MultipleFieldNames(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		// Pass both "files" and "file" field names (like the actual controller does)
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files", "file")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with files in both field names
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// File in "files" field (array style)
	part1, _ := writer.CreateFormFile("files", "users.json")
	part1.Write([]byte(`{"name": "Alice"}`))

	// File in legacy "file" field
	part2, _ := writer.CreateFormFile("file", "legacy.json")
	part2.Write([]byte(`{"legacy": true}`))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 2, len(collectedFiles))
	assert.Equal(t, `{"name": "Alice"}`, string(collectedFiles["users.json"]))
	assert.Equal(t, `{"legacy": true}`, string(collectedFiles["legacy.json"]))
}

// TestCollectMultipartFiles_NoFiles tests behavior when no files are provided.
func TestCollectMultipartFiles_NoFiles(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create empty multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 0, len(collectedFiles))
}

// TestCollectMultipartFiles_FieldNotFound tests behavior when specified field doesn't exist.
func TestCollectMultipartFiles_FieldNotFound(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "nonexistent_field")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with a different field name
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("other_field", "test.json")
	part.Write([]byte(`{"data": "value"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 0, len(collectedFiles))
}

// TestCollectMultipartFiles_DifferentFileTypes tests collecting various file types.
func TestCollectMultipartFiles_DifferentFileTypes(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with different file types
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// JSON file
	jsonPart, _ := writer.CreateFormFile("files", "data.json")
	jsonPart.Write([]byte(`[{"id": 1}]`))

	// CSV file
	csvPart, _ := writer.CreateFormFile("files", "data.csv")
	csvPart.Write([]byte("id,name\n1,Alice\n2,Bob"))

	// JSONL file
	jsonlPart, _ := writer.CreateFormFile("files", "data.jsonl")
	jsonlPart.Write([]byte("{\"id\": 1}\n{\"id\": 2}"))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 3, len(collectedFiles))
	assert.Equal(t, `[{"id": 1}]`, string(collectedFiles["data.json"]))
	assert.Equal(t, "id,name\n1,Alice\n2,Bob", string(collectedFiles["data.csv"]))
	assert.Equal(t, "{\"id\": 1}\n{\"id\": 2}", string(collectedFiles["data.jsonl"]))
}

// TestCollectMultipartFiles_LargeFile tests handling of larger file content.
func TestCollectMultipartFiles_LargeFile(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create a larger JSON array
	largeContent := bytes.Buffer{}
	largeContent.WriteString("[")
	for i := range 1000 {
		if i > 0 {
			largeContent.WriteString(",")
		}
		largeContent.WriteString(`{"id":` + string(rune('0'+i%10)) + `,"name":"User` + string(rune('0'+i%10)) + `"}`)
	}
	largeContent.WriteString("]")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "large.json")
	part.Write(largeContent.Bytes())
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	assert.Equal(t, 1, len(collectedFiles))
	assert.Equal(t, largeContent.Len(), len(collectedFiles["large.json"]))
}

// TestCollectMultipartFiles_DuplicateFilenames tests behavior with duplicate filenames.
func TestCollectMultipartFiles_DuplicateFilenames(t *testing.T) {
	app := fiber.New()

	var collectedFiles map[string][]byte
	var collectErr error

	app.Post("/test", func(c fiber.Ctx) error {
		collectedFiles, collectErr = controllers.CollectMultipartFiles(c, "files")
		return c.SendStatus(fiber.StatusOK)
	})

	// Create multipart form with duplicate filenames
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// First file named "data.json"
	part1, _ := writer.CreateFormFile("files", "data.json")
	part1.Write([]byte(`{"version": 1}`))

	// Second file also named "data.json" - should overwrite
	part2, _ := writer.CreateFormFile("files", "data.json")
	part2.Write([]byte(`{"version": 2}`))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/test", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.NoError(t, collectErr)
	// Duplicate filename results in only one entry (last one wins)
	assert.Equal(t, 1, len(collectedFiles))
	assert.Equal(t, `{"version": 2}`, string(collectedFiles["data.json"]))
}

// =============================================================================
// Integration Tests: Schema Validation Flow
// =============================================================================
// These tests verify the end-to-end flow of collecting files and validating
// them against a schema, simulating the full ConnectionSchemaValidate behavior.

// TestSchemaValidation_ValidSingleFile tests validating a valid JSON file against a schema.
func TestSchemaValidation_ValidSingleFile(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Schema that expects an object with id (integer) and name (string)
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id":   {Type: "integer"},
				"name": {Type: "string"},
			},
			Required: []string{"id"},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, schema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create valid JSON file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "data.json")
	part.Write([]byte(`{"id": 1, "name": "Alice"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.True(t, validationResult.Valid)
	assert.Equal(t, 0, len(validationResult.Errors))
}

// TestSchemaValidation_InvalidSingleFile tests validating an invalid JSON file against a schema.
func TestSchemaValidation_InvalidSingleFile(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Schema that expects an object with id (integer)
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id": {Type: "integer"},
			},
			Required: []string{"id"},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, schema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create invalid JSON file (id is string instead of integer)
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "data.json")
	part.Write([]byte(`{"id": "not_an_integer"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.False(t, validationResult.Valid)
	assert.True(t, len(validationResult.Errors) > 0)
}

// TestSchemaValidation_GroupSchema_MatchingFiles tests validating multiple files
// against a group schema with auto-matching by filename.
func TestSchemaValidation_GroupSchema_MatchingFiles(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Group schema with two children: users.json and orders.json
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"name": {Type: "string"},
					},
				},
			},
			{
				Name: "orders.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"total": {Type: "number"},
					},
				},
			},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create files matching the group schema children
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	usersPart, _ := writer.CreateFormFile("files", "users.json")
	usersPart.Write([]byte(`{"name": "Alice"}`))

	ordersPart, _ := writer.CreateFormFile("files", "orders.json")
	ordersPart.Write([]byte(`{"total": 99.99}`))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.True(t, validationResult.Valid)
	assert.Equal(t, 0, len(validationResult.Errors))
}

// TestSchemaValidation_GroupSchema_UnmatchedFile tests validating a file that
// doesn't match any child in a group schema.
func TestSchemaValidation_GroupSchema_UnmatchedFile(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Group schema that only has users.json
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
				},
			},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create file that doesn't match any schema child
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "unknown.json")
	part.Write([]byte(`{"data": "value"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Should add warning for unmatched file
	assert.True(t, len(validationResult.Warnings) > 0)
}

// TestSchemaValidation_GroupSchema_CaseInsensitiveMatching tests that file
// matching against group schema children is case-insensitive.
func TestSchemaValidation_GroupSchema_CaseInsensitiveMatching(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Group schema with lowercase child name
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"name": {Type: "string"},
					},
				},
			},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Upload file with uppercase name - should still match
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "USERS.JSON")
	part.Write([]byte(`{"name": "Alice"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.True(t, validationResult.Valid)
	assert.Equal(t, 0, len(validationResult.Errors))
}

// TestSchemaValidation_MultipleFilesOneInvalid tests that if one file in a batch
// is invalid, the overall validation fails.
func TestSchemaValidation_MultipleFilesOneInvalid(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Group schema with two children
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"id": {Type: "integer"},
					},
					Required: []string{"id"},
				},
			},
			{
				Name: "orders.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"total": {Type: "number"},
					},
				},
			},
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create files - users.json is valid, orders.json is invalid
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	usersPart, _ := writer.CreateFormFile("files", "users.json")
	usersPart.Write([]byte(`{"id": 1}`))

	// orders.json has string instead of number for total
	ordersPart, _ := writer.CreateFormFile("files", "orders.json")
	ordersPart.Write([]byte(`{"total": "not_a_number"}`))

	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.False(t, validationResult.Valid)
	assert.True(t, len(validationResult.Errors) > 0)
}

// TestSchemaValidation_NilSchema tests behavior when no schema is provided.
func TestSchemaValidation_NilSchema(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, nil, nil)
		validationResult = result
		return c.JSON(result)
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "data.json")
	part.Write([]byte(`{"any": "data"}`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Should add warning but be valid (skipping validation)
	assert.True(t, validationResult.Valid)
	assert.True(t, len(validationResult.Warnings) > 0)
}

// TestSchemaValidation_EmptyFiles tests behavior when no files are provided.
func TestSchemaValidation_EmptyFiles(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, schema, nil)
		validationResult = result
		return c.JSON(result)
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// No files means valid (nothing to validate)
	assert.True(t, validationResult.Valid)
}

// TestSchemaValidation_MalformedJSON tests handling of malformed JSON files.
func TestSchemaValidation_MalformedJSON(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
		},
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		result := validation.ValidateFiles(context.Background(), files, schema, nil)
		validationResult = result
		return c.JSON(result)
	})

	// Create malformed JSON file
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "bad.json")
	part.Write([]byte(`{not valid json`))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Malformed JSON should result in validation error
	assert.False(t, validationResult.Valid)
	assert.True(t, len(validationResult.Errors) > 0)
}

// TestSchemaValidation_SizeConstraint tests validation of file size constraints.
// Note: This tests via ValidateFile directly since ValidateFiles only applies size constraints
// when schema type is structured with a JSON schema.
func TestSchemaValidation_SizeConstraint(t *testing.T) {
	app := fiber.New()

	var validationResult *irminmodels.SchemaValidationResult

	// Schema with size constraint of 10 bytes
	size := 10
	schema := &irminmodels.ObjectSchema{
		Size: &size,
	}

	app.Post("/validate", func(c fiber.Ctx) error {
		files, collectErr := controllers.CollectMultipartFiles(c, "files")
		if collectErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": collectErr.Error()})
		}
		// Use ValidateFile directly to test size constraint
		for fileName, data := range files {
			result := validation.ValidateFile(context.Background(), fileName, data, schema, nil)
			validationResult = result
			break
		}
		return c.JSON(validationResult)
	})

	// Create file that exceeds size limit
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("files", "large.txt")
	part.Write([]byte("12345678901234567890")) // 20 bytes, exceeds 10 byte limit
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/validate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	assert.False(t, validationResult.Valid)
	assert.True(t, len(validationResult.Errors) > 0)
}
