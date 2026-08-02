package linearcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/linear/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get Linear connector details page
// @Description Renders an HTML page describing what the Linear connector does, what it supports, and how to set it up. Public — no authentication required.
// @Tags linear
// @Accept json
// @Produce text/html
// @Success 200 {string} string "Linear connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"linear",
		config.GetConnectorInfo,
		"This connector pulls Linear issues, projects, cycles, and teams as JSON snapshots into a "+
			"LakeFS branch, and supports pushing or patching issues back to Linear via OAuth-backed "+
			"MCP tool calls against mcp.linear.app. Authentication is OAuth 2.1 with Dynamic Client "+
			"Registration against the same Linear MCP server — there is no admin-configured app, no "+
			"API key to manage, and no per-environment setup. Click Connect, approve the grant, and "+
			"Irmin handles tokens transparently from there.",
	)
}
