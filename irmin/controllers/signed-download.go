package controllers

import (
	"errors"
	"irmin-api/engine"
	"irmin-api/utils"
	"path/filepath"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// SignedDownload godoc
// @Summary Download a repository object via signed URL
// @Description Public endpoint that validates a signed token and streams the file content.
// @Description No authentication required — the token itself authorizes the download.
// @Tags signed-urls
// @Produce application/octet-stream
// @Param token query string true "Signed download token"
// @Success 200 {file} file "File content"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing token or pointer file"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or expired token"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - system path access denied"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /api/v1/signed/download [get]
func (api *APIControllers) SignedDownload(c fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Missing token parameter"},
		})
	}

	// Require a dedicated signing secret — never fall back to ClerkSigningKey
	// which may be public JWT verification material in asymmetric setups.
	secret := api.Env.SignedURLSecret
	if secret == "" {
		api.Logger.Error("SIGNED_URL_SECRET is not configured, cannot validate signed URLs")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Signed downloads are not configured"},
		})
	}

	// Validate the signed token
	payload, validateErr := utils.ValidateSignedToken([]byte(secret), token)
	if validateErr != nil {
		api.Logger.Warn("Invalid signed download token", "error", validateErr)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Errors: []string{"Invalid or expired download link"},
		})
	}

	// Look up workspace and repository
	workspace, wsErr := api.DB.GetWorkspaceBySlug(payload.Workspace)
	if wsErr != nil {
		if errors.Is(wsErr, gorm.ErrRecordNotFound) {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{"Resource not found"},
			})
		}
		api.Logger.Error("Signed download: workspace lookup error", "slug", payload.Workspace, "error", wsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	repo, repoErr := api.DB.GetRepositoryBySlugAndWorkspaceID(payload.Repo, workspace.ID)
	if repoErr != nil {
		if errors.Is(repoErr, gorm.ErrRecordNotFound) {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{"Resource not found"},
			})
		}
		api.Logger.Error(
			"Signed download: repository lookup error",
			"slug", payload.Repo,
			"workspace", payload.Workspace,
			"error", repoErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	// Block access to system paths and pointer files
	if engine.IsSystemPath(payload.Path) {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}
	if engine.IsPointerPath(payload.Path) {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Signed downloads of pointer files are not supported"},
		})
	}

	// Create engine client and fetch object content
	dataEngine, engineErr := engine.NewClient(c.Context(), "en", api.Logger, api.Env, api.DB)
	if engineErr != nil {
		api.Logger.Error("Signed download: error creating data engine client", "error", engineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	content, contentErr := dataEngine.GetObjectContent(
		workspace.Slug,
		repo.Slug,
		payload.Path,
		payload.Ref,
	)
	if contentErr != nil {
		if strings.Contains(contentErr.Error(), "status 404") {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{"Object not found"},
			})
		}
		api.Logger.Error(
			"Signed download: error fetching object content",
			"path", payload.Path,
			"ref", payload.Ref,
			"error", contentErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	// Determine filename and content type from path
	filename := filepath.Base(payload.Path)
	contentType := detectContentType(filename)

	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, filename, contentType, content)
}

// detectContentType returns a MIME type based on file extension.
func detectContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return "text/csv"
	case ".json":
		return "application/json"
	case ".parquet":
		return "application/vnd.apache.parquet"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	case ".xml":
		return "application/xml"
	case ".zip":
		return "application/zip"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	default:
		return "application/octet-stream"
	}
}
