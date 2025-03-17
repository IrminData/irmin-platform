package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

func CredentialsIndex(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Get the API tokens for the user.
	tokens, err := db.GetAPITokensByUserID(user.ID)
	if err != nil {
		log.Printf("Error retrieving API tokens: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Map tokens to API token response, omitting the Token field.
	var listResponse []db.APITokenResponse
	for _, token := range tokens {
		sqid, _ := utils.EncodeSqids("api_tokens", uint64(token.ID))
		listResponse = append(listResponse, db.APITokenResponse{
			ID:        sqid,
			CreatedAt: token.CreatedAt,
			UpdatedAt: token.UpdatedAt,
			Name:      token.Name,
			ExpiresAt: token.ExpiresAt,
		})
	}

	// Return the API tokens.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: listResponse,
	})
}

func CredentialsStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"name", "expiry"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Generate a random 64-character token.
	token, err := utils.GenerateRandomString()
	if err != nil {
		log.Printf("Error generating random string: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Parse the expiry field as an integer.
	expiryMs, err := strconv.Atoi(fields["expiry"])
	if err != nil {
		log.Printf("Error parsing expiry field: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Expiry is seconds until expiry, so add it to the current time.
	expiresAt := time.Now().Add(time.Duration(expiryMs) * time.Second).UTC()

	// Create the API token.
	apiToken, err := db.CreateAPIToken(&db.APIToken{
		Name:      fields["name"],
		Token:     fmt.Sprintf("cred_%s", token),
		ExpiresAt: expiresAt,
		UserID:    user.ID,
	})
	if err != nil {
		log.Printf("Error creating API token: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Conver the API token to an API token response.
	sqid, _ := utils.EncodeSqids("api_tokens", uint64(apiToken.ID))
	apiTokenResponse := db.APITokenResponse{
		ID:        sqid,
		CreatedAt: apiToken.CreatedAt,
		UpdatedAt: apiToken.UpdatedAt,
		Name:      apiToken.Name,
		Token:     apiToken.Token,
		ExpiresAt: apiToken.ExpiresAt,
	}

	// Return the API token.
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Message: dict.T("api_token_created"),
		Data:    apiTokenResponse,
	})
}

func CredentialsDestroy(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the token from the request URL.
	tokenSqid := c.Params("credential")
	if tokenSqid == "" {
		log.Printf("No token provided")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Decode the SQID to get the token ID.
	id, err := utils.DecodeSqids("api_tokens", tokenSqid)
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the API token to ensure it exists and belongs to the user.
	apiToken, err := db.GetAPIToken(uint(id))
	if err != nil {
		log.Printf("Error retrieving API token: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	if apiToken.UserID != user.ID {
		log.Printf("API token does not belong to user")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Delete the API token.
	if err := db.DeleteAPIToken(uint(id)); err != nil {
		log.Printf("Error deleting API token: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("api_token_deleted"),
	})
}
