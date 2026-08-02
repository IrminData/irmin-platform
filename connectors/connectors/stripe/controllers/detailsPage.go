package stripecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/stripe/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get Stripe connector details page
// @Description Get an HTML page with detailed information about the Stripe connector including capabilities, authentication methods, and usage examples
// @Tags stripe
// @Accept json
// @Produce text/html
// @Success 200 {string} string "Stripe connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"stripe",
		config.GetConnectorInfo,
		"This connector imports Stripe resources (customers, charges, invoices, subscriptions, payouts) as JSON "+
			"snapshots into a LakeFS branch, and supports pushing JSON records back to Stripe to create or update "+
			"customers, invoices, products, and prices. Authentication uses a Stripe restricted API key — no OAuth "+
			"setup required.",
	)
}
