package main

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func main() {
	apiClient := client.NewClient("https://api.irmin.dev", "your-api-token", "en")
	workspaceService := services.NewWorkspaceService(apiClient)

	workspaces, err := workspaceService.FetchWorkspaces()
	if err != nil {
		fmt.Println("Error fetching workspaces:", err)
		return
	}

	for _, workspace := range workspaces {
		fmt.Printf("Workspace: %s (%s)\n", workspace.Name, workspace.Slug)
	}
}
