package googledrivecontrollers

import (
	"irmin-connectors/connectors/common"
	googledriveconfig "irmin-connectors/connectors/googledrive/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get Google Drive connector details page
// @Description Renders an HTML page describing what the Google Drive connector does, what it supports, and how to set it up. Public — no authentication required.
// @Tags googledrive
// @Accept json
// @Produce text/html
// @Success 200 {string} string "Google Drive connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"googledrive",
		googledriveconfig.GetConnectorInfo,
		"This connector pulls Google Drive files and metadata as JSON snapshots into a "+
			"LakeFS branch. Authentication is OAuth 2.0 + PKCE with a static client "+
			"registered in Google Cloud Console. Click Connect, approve the grant, and "+
			"Irmin handles tokens transparently from there.",
	)
}
