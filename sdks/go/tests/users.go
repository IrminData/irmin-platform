package irminSDKTests

import (
	"fmt"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
)

func TestUsers(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	profileService := irminCore.NewProfileService(apiClient)
	userService := irminCore.NewUserService(apiClient)

	// Fetch the current user
	profile, _, err := profileService.GetProfile()
	if err != nil {
		fmt.Println("Error fetching profile:", err)
		return
	}
	fmt.Printf("Current User: %s (%s)\n", profile.FirstName, profile.Email)

	// Fetch users in the current workspace
	users, _, err := userService.FetchWorkspaceUsers()
	if err != nil {
		fmt.Println("Error fetching users:", err)
		return
	}
	for _, user := range users {
		fmt.Printf("User: %s (%s)\n", user.FirstName, user.Email)
	}
}
