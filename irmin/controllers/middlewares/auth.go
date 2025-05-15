package middlewares

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

// AuthMiddleware handles the user authentication for the API, tokens and user details syncing with Clerk.
func (api *APIMiddlewares) AuthMiddleware(c fiber.Ctx) error {
	ctx := c.Context()

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the Authorization header.
	headers, err := utils.ParseHeaders(c, []string{"Authorization"}, nil)
	if err != nil {
		log.Printf("Error parsing headers: %v", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}
	token := strings.TrimPrefix(headers["Authorization"], "Bearer ")
	if token == "" {
		log.Printf("No token provided")
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	var clerkID string
	var irminUser *db.User

	// Check if the token is a system token.
	if token == env.SystemToken {
		// No need to set the user in the context for system tokens, since it should not be used for user-specific actions.
		c.Locals("is_system", true)
		return c.Next()
	}

	// If the token has a "cred_" prefix, it is an API token.
	if strings.HasPrefix(token, "cred_") {
		// Find the API token in our database.
		apiToken, err := api.DB.GetAPITokenByToken(token)
		if err != nil {
			log.Printf("Error retrieving API token: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}
		if apiToken == nil {
			log.Printf("API token not found")
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}
		if apiToken.ExpiresAt.Before(time.Now()) {
			log.Printf("API token expired")
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}
		irminUser = &apiToken.User
		clerkID = apiToken.User.ClerkID
	} else {
		// Validate the JWT token.
		jwt, err := utils.ValidateJWT(token, []byte(env.ClerkSigningKey), env.ClerkSigningAlgorithm)
		if err != nil {
			log.Printf("Error validating JWT: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}

		// Extract the subject (ClerkID) from the JWT.
		clerkID, err = jwt.Claims.GetSubject()
		if err != nil {
			log.Printf("Error extracting subject from JWT: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}

		// Try to find the user in our database.
		irminUser, _ = api.DB.GetUserByClerkID(clerkID)
	}

	// If the user is not found or the last update was more than 5 minutes ago, fetch the user from Clerk.
	// This is to ensure that we have the latest user details.
	if irminUser == nil || irminUser.UpdatedAt.Before(time.Now().Add(-(time.Minute * 5))) {
		// Set the API key with your Clerk Secret Key.
		clerk.SetKey(env.ClerkSecretKey)

		// Get the user details from Clerk.
		clerkUser, err := user.Get(ctx, clerkID)
		if err != nil {
			log.Printf("Error getting user details from Clerk: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
		}

		// Find the user's primary email address.
		var primaryEmail string
		if clerkUser.PrimaryEmailAddressID != nil && len(clerkUser.EmailAddresses) > 0 {
			for _, email := range clerkUser.EmailAddresses {
				if email.ID == *clerkUser.PrimaryEmailAddressID {
					primaryEmail = email.EmailAddress
					break
				}
			}
		}
		if primaryEmail == "" && len(clerkUser.EmailAddresses) > 0 {
			primaryEmail = clerkUser.EmailAddresses[0].EmailAddress
		}

		// Find the user's primary phone number.
		var primaryPhone string
		if clerkUser.PrimaryPhoneNumberID != nil && len(clerkUser.PhoneNumbers) > 0 {
			for _, phone := range clerkUser.PhoneNumbers {
				if phone.ID == *clerkUser.PrimaryPhoneNumberID {
					primaryPhone = phone.PhoneNumber
					break
				}
			}
		}
		if primaryPhone == "" && len(clerkUser.PhoneNumbers) > 0 {
			primaryPhone = clerkUser.PhoneNumbers[0].PhoneNumber
		}

		if irminUser == nil {
			// If the user does not exist in the database, create it synchronously.
			irminUser, err = api.DB.CreateUser(&db.User{
				ClerkID:        clerkID,
				FirstName:      *clerkUser.FirstName,
				LastName:       *clerkUser.LastName,
				Email:          primaryEmail,
				Phone:          primaryPhone,
				ProfilePicture: *clerkUser.ImageURL,
			})
			if err != nil {
				log.Printf("Error creating user: %v", err)
				return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
			}
		} else {
			// If the user exists, update the stored user details asynchronously.
			utils.Async(func() (*db.User, error) {
				updatedUser, err := api.DB.UpdateUser(irminUser.ID, map[string]any{
					"clerk_id":        clerkUser.ID,
					"first_name":      *clerkUser.FirstName,
					"last_name":       *clerkUser.LastName,
					"email":           primaryEmail,
					"phone":           primaryPhone,
					"profile_picture": *clerkUser.ImageURL,
				})
				if err != nil {
					log.Printf("Error updating user: %v", err)
				}
				return updatedUser, err
			})
		}
	}

	// Set the user in the context for subsequent handlers.
	c.Locals("user", irminUser)
	c.Locals("is_system", false)

	return c.Next()
}
