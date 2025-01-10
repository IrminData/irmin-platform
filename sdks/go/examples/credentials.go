package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func TestCredentials(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	credentialService := services.NewCredentialService(apiClient)

	// Create a new system token
	newToken, res, err := credentialService.CreateSystemToken("sdk test token", 3600) // 1 hour
	if err != nil {
		fmt.Println("Error creating system token:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("New System Token: %s\n", *newToken.Token)

	// Fetch all system tokens
	tokens, res, err := credentialService.GetSystemTokens()
	if err != nil {
		fmt.Println("Error fetching system tokens:", err)
		return
	}
	fmt.Println(res.Message)
	for _, token := range tokens {
		fmt.Printf("System Token: %s\n", token.ID)
	}

	// Revoke the new system token
	res, err = credentialService.RevokeSystemToken(newToken.ID)
	if err != nil {
		fmt.Println("Error revoking system token:", err)
		return
	}
	fmt.Println(res.Message)
}
