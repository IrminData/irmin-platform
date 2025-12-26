package tools

import (
	"context"
	"encoding/json"
	"irmin-api/formatter"
	"irmin-api/mcp/helpers"
	"net/http"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoryObjectsArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to list repository objects in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to list objects in"`
	Ref            *string `json:"ref"             jsonschema:"The reference to list objects from. Can be branches, tags or commit hashes. If not provided, the default branch will be used."`
}

type getRepositoryObjectSchemaArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to get the repository object schema in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to get the repository object schema in"`
	Branch         *string `json:"branch"          jsonschema:"optional,The branch to get the repository object schema from. If not provided, the default branch will be used."`
	Path           string  `json:"path"            jsonschema:"The path to get the repository object schema from. For example, 'users.json' or 'users/user_123.json'"`
}

type getRepositoryObjectContentArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to get the repository object content in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to get the repository object content in"`
	Branch         *string `json:"branch"          jsonschema:"optional,The branch to get the repository object content from. If not provided, the default branch will be used."`
	Path           string  `json:"path"            jsonschema:"required,The path to get the repository object content from. For example, 'users.json' or 'users/user_123.json'"`
}

type getRepositoryObjectHistoryArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to get the repository object history in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to get the repository object history in"`
	Branch         *string `json:"branch"          jsonschema:"required,The branch to get the repository object history from. If not provided, the default branch will be used."`
	Path           string  `json:"path"            jsonschema:"required,The path to get the repository object history from. For example, 'users.json' or 'users/user_123.json'"`
}

type moveOrCopyRepositoryObjectArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to move or copy the repository object in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to move or copy the repository object in"`
	Branch         *string `json:"branch"          jsonschema:"required,The branch where the object being moved or copied is located. Can be branches, tags or commit hashes. If not provided, the default branch will be used."`
	Action         string  `json:"action"          jsonschema:"required,The action to perform on the repository object. Can be 'move' or 'copy'. If not provided, the object will be moved or copied to the root of the repository."`
	Path           string  `json:"path"            jsonschema:"required,The path to move or copy the repository object from. If not provided, the object will be moved or copied from the root of the repository."`
	NewPath        string  `json:"new_path"        jsonschema:"required,The path to move or copy the repository object to. If not provided, the object will be moved or copied to the root of the repository."`
}

type saveTextRepositoryObjectArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to save the text repository object in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to save the text repository object in"`
	Branch         *string `json:"branch"          jsonschema:"required,The branch to save the text repository object to. If not provided, the default branch will be used."`
	Path           string  `json:"path"            jsonschema:"required,The full path, with a filename, to save the new object to. For example, 'users.json' or 'users/user_123.json'"`
	Content        string  `json:"content"         jsonschema:"required,The text content to save to the repository object, which could be a JSON, YAML, XML, TXT, CSV, etc."`
}

type uploadRepositoryObjectFromURLArgs struct {
	WorkspaceSlug  string            `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to upload the repository object from a URL in"`
	RepositorySlug string            `json:"repository_slug" jsonschema:"required,The slug of the repository to upload the repository object from a URL in"`
	Branch         *string           `json:"branch"          jsonschema:"required,The branch to upload the repository object from a URL to. If not provided, the default branch will be used."`
	Path           string            `json:"path"            jsonschema:"required,The path to upload the repository object from a URL to. For example, 'users.json' or 'users/user_123.json'"`
	URL            string            `json:"url"             jsonschema:"required,The URL to GET the repository object from. For example, 'https://example.com/users.json' or 'https://example.com/users/user_123.json'"`
	Headers        map[string]string `json:"headers"         jsonschema:"optional,The headers to pass to the URL. For example, 'Authorization: Bearer <token>', would be a JSON object with the key 'Authorization' and the value 'Bearer <token>'"`
}

type deleteRepositoryObjectArgs struct {
	WorkspaceSlug  string  `json:"workspace_slug"  jsonschema:"required,The slug of the workspace to delete the repository object in"`
	RepositorySlug string  `json:"repository_slug" jsonschema:"required,The slug of the repository to delete the repository object in"`
	Branch         *string `json:"branch"          jsonschema:"required,The branch to delete the repository object from. If not provided, the default branch will be used."`
	Path           string  `json:"path"            jsonschema:"required,The path to delete the repository object from. For example, 'users.json' or 'users/user_123.json'"`
}

type validateRepositoryObjectArgs struct {
	WorkspaceSlug        string  `json:"workspace_slug"    jsonschema:"required,The slug of the workspace to validate the repository object in"`
	RepositorySlug       string  `json:"repository_slug"   jsonschema:"required,The slug of the repository to validate the repository object in"`
	Branch               *string `json:"branch"            jsonschema:"optional,The branch to validate the repository object from. If not provided, the default branch will be used."`
	Path                 string  `json:"path"              jsonschema:"required,The path to validate the repository object from. For example, 'users.json' or 'users/user_123.json'"`
	ValidationSchemaJSON string  `json:"validation_schema" jsonschema:"required,The schema to validate the object against (as JSON string)"`
	ValidationMode       string  `json:"validation_mode"   jsonschema:"required,The validation mode to use. Can be 'strict' or 'permissive'. Strict mode fails on any error, permissive mode logs errors but continues."`
}

// RegisterRepositoryObjectsTools registers all repository object-related tools.
func (mcpTools *MCPTools) RegisterRepositoryObjectsTools() {
	mcpTools.registerListRepositoryObjectsTool()
	mcpTools.registerGetRepositoryObjectSchemaTool()
	mcpTools.registerGetRepositoryObjectContentTool()
	mcpTools.registerGetRepositoryObjectHistoryTool()
	mcpTools.registerSaveTextRepositoryObjectTool()
	mcpTools.registerUploadRepositoryObjectFromURLTool()
	mcpTools.registerMoveOrCopyRepositoryObjectTool()
	mcpTools.registerDeleteRepositoryObjectTool()
	mcpTools.registerValidateRepositoryObjectTool()
}

// registerListRepositoryObjectsTool registers the irmin_list_repository_objects tool for listing repository objects in a workspace
func (mcpTools *MCPTools) registerListRepositoryObjectsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_repository_objects",
			Description: "List all data objects (files and folders) in a repository at a specific reference. Objects can be structured data (JSON, CSV, XML, YAML) or unstructured files (images, videos, documents). Returns a hierarchical tree structure with object metadata including path, type, size, and modification info. Requires workspace_slug and repository_slug. Optionally specify ref (branch, tag, or commit) to list objects at that version. Use this to explore repository contents before reading or querying data.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listRepositoryObjectsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the ref to list the objects from
			ref := args.Ref
			if ref == nil {
				ref = &repository.DefaultBranch
			}

			// List the objects in the repository
			rootObject, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				"",
				*ref,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error listing repository objects", "error", err)
				return helpers.MCPError("Error listing repository objects"), struct{}{}, nil
			}

			// Format the object for the response.
			repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(
				rootObject,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting repository object", "error", err)
				return helpers.MCPError("Error formatting repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(repositoryObjectResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerGetRepositoryObjectSchemaTool registers the irmin_get_repository_object_schema tool for getting the schema of a repository object in a workspace
func (mcpTools *MCPTools) registerGetRepositoryObjectSchemaTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_repository_object_schema",
			Description: "Retrieve the data schema for a structured repository object, showing column names, data types, and descriptions without loading the full content. Essential for writing SQL queries against large datasets. Returns schema metadata derived from the object structure. Requires workspace_slug, repository_slug, and path. Optionally specify branch (defaults to repository's default branch). Use this before querying to understand available columns and write efficient SQL queries.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryObjectSchemaArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to get the repository object schema from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the repository object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Get the repository object schema
			schema, err := mcpTools.apiServices.GetRepositoryObjectSchema(
				ctx,
				"en",
				user,
				workspace,
				repository,
				object,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object schema", "error", err)
				return helpers.MCPError("Failed to get repository object schema"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(schema)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// isAllowedTextType checks if the MIME type is a supported text type
func isAllowedTextType(mimeType string) bool {
	allowedAppTypes := []string{
		"application/json",
		"application/ld+json",
		"application/xml",
		"application/xhtml+xml",
		"application/x-yaml",
		"application/yaml",
		"application/csv",
		"application/sql",
		"application/graphql",
		"application/javascript",
		"application/ecmascript",
		"application/x-latex",
		"application/x-sh",
		"application/x-toml",
		"application/x-ini",
	}
	if strings.HasPrefix(mimeType, "text/") {
		return true
	}
	for _, t := range allowedAppTypes {
		if strings.HasPrefix(mimeType, t) {
			return true
		}
	}
	return false
}

// registerGetRepositoryObjectContentTool registers the irmin_get_repository_object_content tool for getting the content of a repository object in a workspace
func (mcpTools *MCPTools) registerGetRepositoryObjectContentTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_repository_object_content",
			Description: "Retrieve the full content of a text-based repository object. Supports structured formats (JSON, CSV, YAML, XML) and text files (TXT, SQL, markdown). Returns the raw file content with MIME type metadata. Requires workspace_slug, repository_slug, and path. Optionally specify branch. Large files are automatically size-limited for MCP. Binary files cannot be fetched via MCP. Use this to read configuration files, examine data samples, or analyze individual data objects.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryObjectContentArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to get the repository object content from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the repository object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Get the repository object content
			content, err := mcpTools.apiServices.GetRepositoryObjectContent(
				ctx,
				"en",
				user,
				workspace,
				repository,
				object,
				true, // Always limit response for MCP
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object content", "error", err)
				return helpers.MCPError("Failed to get repository object content"), struct{}{}, nil
			}

			// Detect MIME type
			mimeType := http.DetectContentType(content)

			// Allow only text-based formats
			if isAllowedTextType(mimeType) {
				return &sdkmcp.CallToolResult{
					Content: []sdkmcp.Content{
						&sdkmcp.TextContent{
							Text: string(content),
							Meta: sdkmcp.Meta{
								"mimeType":   mimeType,
								"fileName":   object.Name,
								"path":       object.Path,
								"size":       len(content),
								"branch":     branch,
								"workspace":  workspace.Slug,
								"repository": repository.Slug,
							},
						},
					},
				}, struct{}{}, nil
			}

			// If not text-based, return error
			return helpers.MCPError(
				"The content of this object is not a supported text format and cannot be fetched using the MCP server. Structured objects can be still be queried using SQL. Unstructured objects are viewable and downloadable in the Irmin Console, or through the API by the user.",
			), struct{}{}, nil
		},
	)
}

// registerGetRepositoryObjectHistoryTool registers the irmin_get_repository_object_history tool for getting the history of a repository object in a workspace
func (mcpTools *MCPTools) registerGetRepositoryObjectHistoryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_get_repository_object_history",
			Description: "Retrieve the version history of a specific data object, showing all commits that modified it. Returns an array of commits with SHA, message, author, timestamp, and change type. Requires workspace_slug, repository_slug, and path. Optionally specify branch to trace history along that branch. Use this to understand when and why data was changed, track data lineage, or find who made specific modifications.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args getRepositoryObjectHistoryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to get the repository object history from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the repository object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Get the repository object history
			history, err := mcpTools.apiServices.GetRepositoryObjectHistory(
				ctx,
				"en",
				user,
				workspace,
				repository,
				object,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object history", "error", err)
				return helpers.MCPError("Failed to get repository object history"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(history)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerSaveTextRepositoryObjectTool registers the irmin_save_text_repository_object tool for saving a text repository object in a workspace, which can be something like a TXT, JSON, CSV, YAML, XML, etc.
func (mcpTools *MCPTools) registerSaveTextRepositoryObjectTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_save_text_repository_object",
			Description: "Create a new text-based data object or overwrite an existing one with text content. Supports structured formats (JSON, CSV, YAML, XML) and plain text. The operation creates an uncommitted change that must be committed separately. Requires workspace_slug, repository_slug, path (full path with filename), and content string. Optionally specify branch. Returns the saved object metadata. Use this to add or update configuration files, data files, or any text-based content in the repository.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args saveTextRepositoryObjectArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to save the text repository object to
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Create a file from the content
			fileContent := irminutils.NewFile(args.Content, args.Path)
			file := fileContent.MultipartFile()

			// Save the text repository object
			object, err := mcpTools.apiServices.UploadRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
				file,
				nil,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to save text repository object", "error", err)
				return helpers.MCPError("Failed to save text repository object, please try again"), struct{}{}, nil
			}

			// Format the object for the response.
			repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(
				object,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting repository object", "error", err)
				return helpers.MCPError("Error formatting repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(repositoryObjectResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUploadRepositoryObjectFromURLTool registers the irmin_upload_repository_object_from_url tool for uploading a repository object from a URL in a workspace
func (mcpTools *MCPTools) registerUploadRepositoryObjectFromURLTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_upload_repository_object_from_url",
			Description: "Upload any file type to the repository by fetching it from a URL. Supports all file types including structured data (JSON, CSV, Excel), documents (PDF, TXT), and media files. Makes a GET request to the specified URL with optional custom headers. Creates an uncommitted change that must be committed separately. Requires workspace_slug, repository_slug, path, and url. Optionally provide headers for authentication. Returns uploaded object metadata. Use this to import external data sources or sync files from web APIs.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args uploadRepositoryObjectFromURLArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to upload the repository object from the URL to
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Upload the object from the URL to the path in the repository at ref
			object, err := mcpTools.apiServices.UploadRepositoryObjectFromURL(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
				args.URL,
				args.Headers,
				nil,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to upload repository object from URL", "error", err)
				return helpers.MCPError("Failed to upload repository object from URL"), struct{}{}, nil
			}

			// Format the object for the response.
			repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(
				object,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting repository object", "error", err)
				return helpers.MCPError("Error formatting repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(repositoryObjectResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerMoveOrCopyRepositoryObjectTool registers the irmin_move_or_copy_repository_object tool for moving or copying a repository object in a workspace
//
//nolint:gocognit // Nothing complex, just wanted to put both copy and move in the same tool
func (mcpTools *MCPTools) registerMoveOrCopyRepositoryObjectTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_move_or_copy_repository_object",
			Description: "Move or copy a data object from one path to another within the repository. Move removes the original, copy creates a duplicate. Both operations create uncommitted changes requiring a commit. Requires workspace_slug, repository_slug, action ('move' or 'copy'), path (source), and new_path (destination). Optionally specify branch. Returns the resulting object metadata. Use this to reorganize repository structure, duplicate data for testing, or rename objects.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args moveOrCopyRepositoryObjectArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to move or copy the repository object from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Move or copy the object
			if args.Action == "move" {
				// Move the object
				object, err = mcpTools.apiServices.MoveRepositoryObject(
					ctx,
					"en",
					user,
					workspace,
					repository,
					object,
					irmincore.MoveObjectRequest{
						NewPath: args.NewPath,
					},
				)
				if err != nil {
					mcpTools.apiServices.Logger.Error("Failed to move repository object", "error", err)
					return helpers.MCPError("Failed to move repository object"), struct{}{}, nil
				}
			} else {
				// Copy the object
				object, err = mcpTools.apiServices.CopyRepositoryObject(ctx, "en", user, workspace, repository, object, irmincore.MoveObjectRequest{
					NewPath: args.NewPath,
				})
				if err != nil {
					mcpTools.apiServices.Logger.Error("Failed to copy repository object", "error", err)
					return helpers.MCPError("Failed to copy repository object"), struct{}{}, nil
				}
			}

			// Format the object for the response.
			repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(
				object,
				mcpTools.apiServices.SQIDManager,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Error formatting repository object", "error", err)
				return helpers.MCPError("Error formatting repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(repositoryObjectResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerDeleteRepositoryObjectTool registers the irmin_delete_repository_object tool for deleting a repository object in a workspace
func (mcpTools *MCPTools) registerDeleteRepositoryObjectTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_delete_repository_object",
			Description: "Delete a data object from the repository. This operation creates an uncommitted change that must be committed to be permanent. The object can be recovered by reverting uncommitted changes before committing. Requires workspace_slug, repository_slug, and path. Optionally specify branch. Returns success confirmation. Use this to remove obsolete data, clean up test files, or manage repository content.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args deleteRepositoryObjectArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to delete the repository object from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Delete the object
			err = mcpTools.apiServices.DeleteRepositoryObject(ctx, "en", user, workspace, repository, object)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to delete repository object", "error", err)
				return helpers.MCPError("Failed to delete repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(map[string]string{
				"message": "Object deleted successfully",
			})
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerValidateRepositoryObjectTool registers the irmin_validate_repository_object tool for validating a repository object against a schema
func (mcpTools *MCPTools) registerValidateRepositoryObjectTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_validate_repository_object",
			Description: "Validate a repository object's data against a provided schema definition. Checks data quality, type correctness, and schema compliance without modifying the object. Supports two validation modes: 'strict' (fails on any error) or 'permissive' (logs errors but continues). Returns validation results with detailed logs showing which checks passed or failed. Requires workspace_slug, repository_slug, path, validation_schema, and validation_mode. Optionally specify branch. Use this to ensure data integrity, verify imports, or check data quality before processing.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args validateRepositoryObjectArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the repository
			repository, err := mcpTools.apiServices.GetRepositoryBySlug(
				ctx,
				"en",
				user,
				workspace,
				args.RepositorySlug,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository", "error", err)
				return helpers.MCPError("Failed to get repository"), struct{}{}, nil
			}

			// Determine the branch to validate the repository object from
			branch := args.Branch
			if branch == nil {
				branch = &repository.DefaultBranch
			}

			// Get the object
			object, _, _, err := mcpTools.apiServices.GetRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				args.Path,
				*branch,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get repository object", "error", err)
				return helpers.MCPError("Failed to get repository object"), struct{}{}, nil
			}

			// Parse the validation schema from JSON string
			var validationSchema irminmodels.ObjectSchema
			if inputSchemaUnmarshalErr := json.Unmarshal([]byte(args.ValidationSchemaJSON), &validationSchema); inputSchemaUnmarshalErr != nil {
				mcpTools.apiServices.Logger.Error("Failed to parse validation schema", "error", inputSchemaUnmarshalErr)
				return helpers.MCPError(
					"Failed to parse validation schema: " + inputSchemaUnmarshalErr.Error(),
				), struct{}{}, nil
			}

			// Validate the object
			validationResponse, validationErr := mcpTools.apiServices.ValidateRepositoryObject(
				ctx,
				"en",
				user,
				workspace,
				repository,
				object,
				&validationSchema,
				args.ValidationMode,
			)
			if validationErr != nil {
				mcpTools.apiServices.Logger.Error("Failed to validate repository object", "error", validationErr)
				return helpers.MCPError("Failed to validate repository object"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(validationResponse)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
