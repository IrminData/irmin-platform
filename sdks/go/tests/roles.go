package irminSDKTests

import (
	"fmt"

	irminCore "github.com/IrminData/irmin-sdk-go/core-api"
)

func TestRoles(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := irminCore.NewClient(baseURL, apiToken, locale)
	roleService := irminCore.NewRoleService(apiClient)

	// Get all available roles
	roles, res, err := roleService.FetchRoles()
	if err != nil {
		fmt.Println("Error fetching roles:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Roles:", roles)
}
