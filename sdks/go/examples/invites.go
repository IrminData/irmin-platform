package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func TestInvites(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	inviteService := services.NewInviteService(apiClient)

	// Send an invite to a user
	newInvite, res, err := inviteService.InviteUserToWorkspace("John", "Doe", "tim@irmin.co", "+1234567890", "Irmin", "viewer")
	if err != nil {
		fmt.Println("Error inviting user:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("New Invite: %s\n", newInvite.ID)

	// Fetch all invites
	invites, res, err := inviteService.FetchInvites("test-workspace", "", false, false)
	if err != nil {
		fmt.Println("Error fetching invites:", err)
		return
	}
	fmt.Println(res.Message)
	for _, invite := range invites {
		fmt.Printf("Invite: %s\n", invite.Email)
	}

	// Resend the new invite
	res, err = inviteService.ResendUserInvite(newInvite.ID)
	if err != nil {
		fmt.Println("Error resending invite:", err)
		return
	}
	fmt.Println(res.Message)

	// Cancel the new invite
	res, err = inviteService.CancelUserInvite(newInvite.ID)
	if err != nil {
		fmt.Println("Error cancelling invite:", err)
		return
	}
	fmt.Println(res.Message)
}
