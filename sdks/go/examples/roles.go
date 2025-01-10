package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
)

func TestRoles(baseURL, apiToken, locale string) {
	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	roleService := services.NewRoleService(apiClient)

	// Get all available roles
	roles, res, err := roleService.FetchRoles()
	if err != nil {
		fmt.Println("Error fetching roles:", err)
		return
	}
	fmt.Println(res.Message)
	fmt.Println("Roles:", roles)
}
