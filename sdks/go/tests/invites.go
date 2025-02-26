package irminSDKTests

import (
	"fmt"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
)

func TestInvites(workspaceSlug, baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	inviteService := irminCore.NewInviteService(apiClient)

	// Send an invite to a user
	newInvite, res, err := inviteService.InviteUserToWorkspace("John", "Doe", "tim@irmin.co", "+442087599036", "Irmin", "viewer")
	if err != nil {
		fmt.Println("Error inviting user:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Printf("New Invite: %s\n", newInvite.ID)

	// Fetch all invites
	invites, res, err := inviteService.FetchInvites(workspaceSlug, "", false, false)
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
