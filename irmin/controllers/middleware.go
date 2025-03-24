package controllers

import (
	"irmin-api/dataEngine"
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

// APIMiddleware sets the dictionary and handles the user authentication for the API, tokens and
// user details syncing with Clerk.
func APIMiddleware(c fiber.Ctx) error {
	ctx := c.Context()

	// Get the dictionary for the request's language.
	dict, locale := locales.GetDictionary(c)

	// Set the dictionary in the context for subsequent handlers.
	c.Locals("dict", dict)
	c.Locals("locale", locale)

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
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

	// Check if the token is a system token.
	if token == env.SystemToken {
		// No need to set the user in the context for system tokens, since it should not be used for user-specific actions.
		c.Locals("is_system", true)
		return c.Next()
	}

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
				Errors: []string{dict.T("error_occurred")},
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

	// Refetch the Irmin user to ensure the latest data is used.
	irminUser, err = db.GetUser(irminUser.ID)
	if err != nil {
		log.Printf("Error fetching user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the user in the context for subsequent handlers.
	c.Locals("user", irminUser)
	c.Locals("is_system", false)

	return c.Next()
}

// WorkspaceMiddleware verifies that the user has access to the workspace they are trying to access.
func WorkspaceMiddleware(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the user is a member of the workspace.
	isMember, err := db.IsUserInWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error checking user membership: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	if !isMember {
		log.Printf("User not a member of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the workspace in the context for subsequent handlers.
	c.Locals("workspace", workspace)

	return c.Next()
}

// WorkflowMiddleware verifies that the user has access to the workflow they are trying to access.
func WorkflowMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the workflow sqid from the request URL.
	workflowSqid := c.Params("workflow")
	if workflowSqid == "" {
		log.Printf("No workflow selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the workflow ID.
	workflowID, err := utils.DecodeSqids("workflows", workflowSqid)
	if err != nil {
		log.Printf("Error decoding workflow sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workflow by its ID.
	workflow, err := db.GetWorkflowByID(uint(workflowID))
	if err != nil {
		log.Printf("Error retrieving workflow: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the workflow belongs to the workspace.
	if workflow.WorkspaceID != workspace.ID {
		log.Printf("Workflow does not belong to the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the workflow in the context for subsequent handlers.
	c.Locals("workflow", workflow)

	return c.Next()
}

// ConnectionMiddleware verifies that the user has access to the connection they are trying to access.
func ConnectionMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the connection sqid from the request URL.
	connectionSqid := c.Params("connection")
	if connectionSqid == "" {
		log.Printf("No connection selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the connection ID.
	connectionID, err := utils.DecodeSqids("connections", connectionSqid)
	if err != nil {
		log.Printf("Error decoding connection sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the connection by its ID.
	connection, err := db.GetConnectionByID(uint(connectionID))
	if err != nil {
		log.Printf("Error fetching connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the connection belongs to the workspace.
	if connection.WorkspaceID != workspace.ID {
		log.Printf("Connection does not belong to the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the connection in the context for subsequent handlers.
	c.Locals("connection", connection)

	return c.Next()
}

func ConnectorMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)

	// Parse the connector SQID from the request URL.
	connectorSQID := c.Params("connector")
	if connectorSQID == "" {
		log.Printf("No connector selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the connector SQID
	connectorID, err := utils.DecodeSqids("connectors", connectorSQID)
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the connector from the database
	connector, err := db.GetConnector(uint(connectorID))
	if err != nil {
		log.Printf("Error retrieving connector: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the connector in the context for subsequent handlers.
	c.Locals("connector", connector)

	return c.Next()
}

func UserMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the user sqid from the request URL.
	userSqid := c.Params("user")
	if userSqid == "" {
		log.Printf("No user selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the user ID.
	userID, err := utils.DecodeSqids("users", userSqid)
	if err != nil {
		log.Printf("Error decoding user sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the workspace user by their ID and the workspace ID.
	workspaceUser, err := db.GetWorkspaceUser(workspace.ID, uint(userID))
	if err != nil {
		log.Printf("Error retrieving user: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the workspace user in the context for subsequent handlers.
	c.Locals("workspace_user", workspaceUser)

	return c.Next()
}

func InviteMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the invite sqid from the request URL.
	inviteSqid := c.Params("invite")
	if inviteSqid == "" {
		log.Printf("No invite selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the invite ID.
	inviteID, err := utils.DecodeSqids("invites", inviteSqid)
	if err != nil {
		log.Printf("Error decoding invite sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the invite by its ID.
	invite, err := db.GetInviteByID(uint(inviteID))
	if err != nil {
		log.Printf("Error retrieving invite: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Make sure the invite is either to the workspace user has access to or to the user.
	hasAccess := invite.Email == user.Email
	for _, workspaceUser := range user.Workspaces {
		if workspaceUser.WorkspaceID == invite.WorkspaceID {
			hasAccess = true
			break
		}
	}

	if hasAccess {
		// Set the invite in the context for subsequent handlers.
		c.Locals("invite", invite)
		return c.Next()
	} else {
		log.Printf("Invite does not belong to the workspace or the user")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}
}

func RepositoryMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the repository slug from the request URL.
	repositorySlug := c.Params("repository")
	if repositorySlug == "" {
		log.Printf("No repository selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the repository by its slug and workspace ID.
	repository, err := db.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
	if err != nil {
		log.Printf("Error retrieving repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Get the repository from the data engine.
	dataEngineRepository, err := DataEngine.GetRepository(workspace.Slug, repositorySlug)
	if err != nil {
		log.Printf("Error retrieving repository from Data Engine: %v", err)
		dataEngineRepository = &dataEngine.Repository{}
	}

	// Set the repository in the context for subsequent handlers.
	c.Locals("repository", repository)
	c.Locals("data_engine_repository", dataEngineRepository)

	return c.Next()
}

func BranchMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the branch name from the request URL.
	branchName := c.Params("branch")
	if branchName == "" {
		log.Printf("No branch selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Get the branch from the data engine.
	dataEngineBranch, err := DataEngine.GetBranch(workspace.Slug, repository.Slug, branchName)
	if err != nil {
		log.Printf("Error retrieving branch from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the branch in the context for subsequent handlers.
	c.Locals("branch", dataEngineBranch)

	return c.Next()
}

func TagMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the tag name from the request URL.
	tagName := c.Params("tag")
	if tagName == "" {
		log.Printf("No tag selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Get the tag from the data engine.
	dataEngineTag, err := DataEngine.GetTag(workspace.Slug, repository.Slug, tagName)
	if err != nil {
		log.Printf("Error retrieving tag from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the tag in the context for subsequent handlers.
	c.Locals("tag", dataEngineTag)

	return c.Next()
}

func ObjectMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the query parameters.
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "path"})
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	ref := repository.DefaultBranch
	if params["ref"] != "" {
		ref = params["ref"]
	}
	path := "/"
	if params["path"] != "" {
		path = params["path"]
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Get the object from the data engine.
	repositoryObject, _ := DataEngine.GetPath(workspace.Slug, repository.Slug, path, ref)

	// Set the object in the context for subsequent handlers.
	c.Locals("object", repositoryObject)
	c.Locals("object_ref", ref)
	c.Locals("object_path", path)

	return c.Next()
}
