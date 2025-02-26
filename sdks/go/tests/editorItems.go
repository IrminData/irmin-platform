package irminSDKTests

import (
	"fmt"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateTestScriptFile creates a script file for testing the SDK
func CreateTestScriptFile(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	editorItemsService := irminCore.NewEditorItemsService(apiClient)

	// Create a new file
	newFile, res, err := editorItemsService.CreateFile(&irminModels.EditorItemsFile{
		Name:     "test.js",
		Path:     "/test.js",
		Type:     irminModels.IrminFileTypeJS,
		Contents: `console.log("Hello, world!");`,
	}, false)
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("File created:", newFile.Path)

}

// DeleteTestScript deletes the previously created script file
func DeleteTestScriptFile(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	editorItemsService := irminCore.NewEditorItemsService(apiClient)

	// Delete the script
	res, err := editorItemsService.DeleteFile("test.js", "js", "/test.js")
	if err != nil {
		fmt.Println("Error deleting file:", err)
		return
	}
	fmt.Println(res.Message)
}

func TestEditorItems(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	editorItemsService := irminCore.NewEditorItemsService(apiClient)

	// Create example folder
	folder, res, err := editorItemsService.CreateFolder(&irminModels.EditorItemsFolder{
		Name: "example",
		Path: "/example",
	})
	if err != nil {
		fmt.Println("Error creating folder:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Folder created:", folder.Path)

	// Create example file in the folder
	file, res, err := editorItemsService.CreateFile(&irminModels.EditorItemsFile{
		Name:     "test.js",
		Path:     "/example/test.js",
		Type:     irminModels.IrminFileTypeJS,
		Contents: `console.log("Hello, world!");`,
	}, false)
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("File created:", file.Path)

	// Fetch all editor items
	items, res, err := editorItemsService.FetchEditorItems()
	if err != nil {
		fmt.Println("Error fetching editor items:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Editor items fetched:", items)

	// Update the files contents
	file, res, err = editorItemsService.UpdateFile("test.js", "/example/test.js", "console.log('Updated content of the file');", "js", file.Owner, file.Path, false)
	if err != nil {
		fmt.Println("Error updating file:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("File updated:", file.Path)

	// Delete the example folder
	res, err = editorItemsService.DeleteFolder("example", "/example")
	if err != nil {
		fmt.Println("Error deleting folder:", err)
		return
	}
	fmt.Println(res.Message)

}
