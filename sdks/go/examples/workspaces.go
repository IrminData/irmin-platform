package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func CreateTestWorkspace(baseURL, apiToken, locale string) *string {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	workspaceService := services.NewWorkspaceService(apiClient)

	// Create a new workspace
	workspace, res, err := workspaceService.CreateWorkspace("Test Workspace", "This is for SDK testing")
	if err != nil {
		fmt.Println("Error creating workspace:", err)
		return nil
	}
	fmt.Println(res.Message)
	fmt.Printf("Created workspace: %s (%s)\n", workspace.Name, workspace.Slug)

	return &workspace.Slug
}

func DeleteTestWorkspace(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	workspaceService := services.NewWorkspaceService(apiClient)

	// Delete the new workspace
	res, err := workspaceService.DeleteWorkspace("test-workspace")
	if err != nil {
		fmt.Println("Error deleting workspace:", err)
		return
	}
	fmt.Println(res.Message)
}

func TestWorkspaces(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	workspaceService := services.NewWorkspaceService(apiClient)

	// Fetch workspaces
	workspaces, res, err := workspaceService.FetchWorkspaces()
	if err != nil {
		fmt.Println("Error fetching workspaces:", err)
		return
	}
	fmt.Println(res.Message)

	for _, workspace := range workspaces {
		fmt.Printf("Workspace: %s (%s)\n", workspace.Name, workspace.Slug)
	}

	// Switch to the first workspace
	if len(workspaces) == 0 {
		fmt.Println("No workspaces found")
		return
	}
	res, err = workspaceService.SwitchWorkspace(workspaces[0].Slug)
	if err != nil {
		fmt.Println("Error switching workspace:", err)
		return
	}
	fmt.Println(res.Message)

	// Switch to the test workspace
	res, err = workspaceService.SwitchWorkspace("test-workspace")
	if err != nil {
		fmt.Println("Error switching workspace:", err)
		return
	}
	fmt.Println(res.Message)

	// Fetch the current workspace
	currentWorkspace, _, err := workspaceService.FetchWorkspace(workspaces[0].Slug)
	if err != nil {
		fmt.Println("Error fetching workspace:", err)
		return
	}
	fmt.Printf("Current workspace: %s (%s)\n", currentWorkspace.Name, currentWorkspace.Slug)
}
