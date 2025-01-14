package examples

import (
	"fmt"
	"time"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/services"
)

// CreateTestRepository creates a test repository used for the examples
func CreateTestRepository(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	repositoryService := services.NewRepositoryService(apiClient)

	// Create a new repository
	repository, res, err := repositoryService.CreateRepository("Test Repository", "This is for SDK testing", "# Hello World")
	if err != nil {
		fmt.Println("Error creating repository:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("Created repository: %s (%s)\n", repository.Name, repository.Slug)
}

// DeleteTestRepository deletes the test repository used for the examples
func DeleteTestRepository(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	repositoryService := services.NewRepositoryService(apiClient)

	// Delete the test repository
	res, err := repositoryService.DeleteRepository("test-repository")
	if err != nil {
		fmt.Println("Error deleting repository:", err)
		return
	}
	fmt.Println(res.Message)
}

func TestRepositories(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	repositoryService := services.NewRepositoryService(apiClient)

	// Fetch repositories
	repositories, _, err := repositoryService.FetchRepositories()
	if err != nil {
		fmt.Println("Error fetching repositories:", err)
		return
	}
	for _, repository := range repositories {
		fmt.Printf("Repository: %s (%s)\n", repository.Name, repository.Slug)
	}

	// Fetch the test repository repository
	repository, _, err := repositoryService.FetchRepository("test-repository")
	if err != nil {
		fmt.Println("Error fetching repository:", err)
		return
	}
	fmt.Printf("Repository: %s (%s)\n", repository.Name, repository.Slug)

	// Update the description of the test repository
	res, err := repositoryService.UpdateRepository(
		repository.Slug,
		repository.Name,
		fmt.Sprintf("This is for SDK testing - %s", time.Now()),
		repository.Documentation,
	)
	if err != nil {
		fmt.Println("Error updating repository:", err)
		return
	}
	fmt.Println(res.Message)

	// Get the download URL for the test repository
	downloadUrl, res, err := repositoryService.GetRepositoryDownloadLink(repository.Slug, "main", "/")
	if err != nil {
		fmt.Println("Error getting download link:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Download URL:", *downloadUrl)
}
