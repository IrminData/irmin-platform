package examples

import (
	"fmt"

	"github.com/IrminData/irmin-sdk-go/client"
	"github.com/IrminData/irmin-sdk-go/services"
)

func TestProfile(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	profileService := services.NewProfileService(apiClient)

	// Fetch the user's profile
	profile, res, err := profileService.GetProfile()
	if err != nil {
		fmt.Println("Error fetching profile:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("Profile: %+v\n", profile)

	// Update the user's profile
	updatedProfile, res, err := profileService.UpdateProfile("Updated", "Name", profile.Email, profile.Phone, "Test Inc.", nil)
	if err != nil {
		fmt.Println("Error updating profile:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("Updated profile: %+v\n", updatedProfile)

	// Return the user's profile to the original state
	_, res, err = profileService.UpdateProfile(profile.FirstName, profile.LastName, profile.Email, profile.Phone, *profile.Company, nil)
	if err != nil {
		fmt.Println("Error updating profile:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Profile returned to original state")
}
