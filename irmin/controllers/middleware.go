package controllers

import (
	"context"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

// APIMiddleware sets the dictionary based on the requested locale,
// verifies the user's JWT, retrieves their details from Clerk,
// and ensures the database is up to date.
func APIMiddleware(c fiber.Ctx) error {
	ctx := context.Background()

	// Get the dictionary for the request's language.
	dict := locales.GetDictionary(c)

	// Set the dictionary in the context for subsequent handlers.
	c.Locals("dict", dict)

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Parse the Authorization header.
	headers, err := utils.ParseHeaders(c, []string{"Authorization"}, nil)
	if err != nil {
		log.Printf("Error parsing headers: %v", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}
	token := strings.TrimPrefix(headers["Authorization"], "Bearer ")
	if token == "" {
		log.Printf("No token provided")
		return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	var clerkID string
	var irminUser *db.User

	// If the token has a "cred_" prefix, it is an API token.
	if strings.HasPrefix(token, "cred_") {
		// Find the API token in our database.
		apiToken, err := db.GetAPITokenByToken(token)
		if err != nil {
			log.Printf("Error retrieving API token: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
				Errors: []string{dict.T("access_denied")},
			})
		}
		if apiToken == nil {
			log.Printf("API token not found")
			return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
				Errors: []string{dict.T("access_denied")},
			})
		}
		if apiToken.ExpiresAt.Before(time.Now()) {
			log.Printf("API token expired")
			return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
				Errors: []string{dict.T("access_denied")},
			})
		}
		irminUser = &apiToken.User
		clerkID = apiToken.User.ClerkID
	} else {
		// Validate the JWT token.
		jwt, err := utils.ValidateJWT(token, []byte(env.ClerkSigningKey), env.ClerkSigningAlgorithm)
		if err != nil {
			log.Printf("Error validating JWT: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
				Errors: []string{dict.T("access_denied")},
			})
		}

		// Extract the subject (ClerkID) from the JWT.
		clerkID, err = jwt.Claims.GetSubject()
		if err != nil {
			log.Printf("Error extracting subject from JWT: %v", err)
			return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
				Errors: []string{dict.T("access_denied")},
			})
		}

		// Try to find the user in our database.
		irminUser, _ = db.GetUserByClerkID(clerkID)
	}

	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(env.ClerkSecretKey)

	// Get the user details from Clerk.
	clerkUser, err := user.Get(ctx, clerkID)
	if err != nil {
		log.Printf("Error getting user details from Clerk: %v", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
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
		irminUser, err = db.CreateUser(&db.User{
			ClerkID:        clerkID,
			FirstName:      *clerkUser.FirstName,
			LastName:       *clerkUser.LastName,
			Email:          primaryEmail,
			Phone:          primaryPhone,
			ProfilePicture: *clerkUser.ImageURL,
		})
		if err != nil {
			log.Printf("Error creating user: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
	} else {
		// If the user exists, update the stored user details asynchronously.
		utils.Async(func() (*db.User, error) {
			updatedUser, err := db.UpdateUser(irminUser.ID, &db.User{
				ClerkID:        clerkUser.ID,
				FirstName:      *clerkUser.FirstName,
				LastName:       *clerkUser.LastName,
				Email:          primaryEmail,
				Phone:          primaryPhone,
				ProfilePicture: *clerkUser.ImageURL,
			})
			if err != nil {
				log.Printf("Error updating user: %v", err)
			}
			return updatedUser, err
		})
	}

	// Set the user in the context for subsequent handlers.
	c.Locals("user", irminUser)

	return c.Next()
}
