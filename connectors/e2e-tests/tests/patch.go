package tests

import (
	"context"
	"os"

	"irmin-connectors/e2e-tests/helpers"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// TestPatch tests the patch capability of a connector.
func TestPatch(ctx context.Context, client *helpers.ConnectorClient, patchFile string) error {
	// Create test patch data if patchFile is not provided
	var testFilePath string
	var cleanupNeeded bool

	if patchFile != "" && fileExistsPatch(patchFile) {
		testFilePath = patchFile
	} else {
		// Create sample patch operations
		newValue := any("Updated Name")
		patches := []irminmodels.PatchOperation{
			{
				Op:    "replace",
				Path:  "/users.json/1/name",
				Value: &newValue,
			},
		}

		filePath, err := helpers.CreatePatchFile(patches)
		if err != nil {
			return err
		}
		testFilePath = filePath
		cleanupNeeded = true
	}

	// Ensure cleanup
	if cleanupNeeded {
		defer func() {
			_ = helpers.CleanupTestFile(testFilePath)
		}()
	}

	// Create form file
	formFile := helpers.CreateFormFile(testFilePath, "patches")

	// Apply the patch
	response, err := client.OperationPatch(ctx, formFile)
	if err != nil {
		return err
	}

	// Validate response
	if response == "" {
		return &helpers.TestError{Message: "Expected non-empty response from patch operation"}
	}

	return nil
}

// fileExistsPatch checks if a file exists (patch version).
func fileExistsPatch(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
