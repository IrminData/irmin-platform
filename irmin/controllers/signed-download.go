package controllers

import (
	"bufio"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
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

	// Handle repository zip downloads
	if payload.Type == "zip" {
		return api.serveSignedZipDownload(c, workspace, repo, payload)
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

	// Create engine client
	dataEngine, engineErr := engine.NewClient(c.Context(), api.Logger, api.Env, api.DB)
	if engineErr != nil {
		api.Logger.Error("Signed download: error creating data engine client", "error", engineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	// Determine filename and content type from path
	filename := filepath.Base(payload.Path)
	contentType := detectContentType(filename)

	return api.serveSignedDownloadByTier(c, dataEngine, workspace, repo, payload, filename, contentType)
}

// serveSignedZipDownload streams a zip archive of the entire repository at the given ref.
func (api *APIControllers) serveSignedZipDownload(
	c fiber.Ctx,
	workspace *db.Workspace,
	repo *db.Repository,
	payload *utils.SignedURLPayload,
) error {
	// Look up the root object from the database
	rootPath := ""
	object, objectErr := api.DB.FindObject(&rootPath, &repo.ID, &payload.Ref)
	if objectErr != nil {
		if errors.Is(objectErr, gorm.ErrRecordNotFound) {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{"Repository has no objects at the specified ref"},
			})
		}
		api.Logger.Error("Signed zip download: error finding root object",
			"workspace", workspace.Slug, "repo", repo.Slug, "ref", payload.Ref, "error", objectErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	// Determine total size to decide between in-memory and streaming zip
	maxInMemoryBytes := int64(api.Env.MaxInMemorySizeMB) * int64(utils.BytesPerMB)
	var totalSize int64
	var sizeErr error
	if object.Type == irminmodels.ObjectTypeGroup {
		totalSize, sizeErr = services.CalculateObjectTotalSize(api.DB, object)
		if sizeErr != nil {
			api.Logger.Warn("Signed zip download: size calculation failed, falling back to streaming",
				"workspace", workspace.Slug, "repo", repo.Slug, "ref", payload.Ref, "error", sizeErr,
			)
		}
	} else {
		totalSize = object.SizeBytes
	}

	dataEngine, engineErr := engine.NewClient(c.Context(), api.Logger, api.Env, api.DB)
	if engineErr != nil {
		api.Logger.Error("Signed zip download: error creating data engine client", "error", engineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	timestamp := time.Now().UnixMilli()
	zipName := fmt.Sprintf("%s-%s-%s-%d.zip", workspace.Slug, repo.Slug, payload.Ref, timestamp)

	// For small repositories, use in-memory zip
	if sizeErr == nil && totalSize <= maxInMemoryBytes {
		files := make(map[string][]byte)
		if processErr := services.CollectObjectFiles(
			api.DB, dataEngine, object, workspace, repo, payload.Ref, files,
		); processErr != nil {
			api.Logger.Error("Signed zip download: error collecting files", "error", processErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{"Internal server error"},
			})
		}

		zipContent, zipErr := irminutils.ZipFiles(files)
		if zipErr != nil {
			api.Logger.Error("Signed zip download: error creating zip", "error", zipErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{"Internal server error"},
			})
		}

		return utils.WriteFileDownloadResponse(c, fiber.StatusOK, zipName, "application/zip", zipContent)
	}

	// For larger repositories, stream the zip directly to the response
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, zipName))
	c.Status(fiber.StatusOK)

	return c.SendStreamWriter(func(w *bufio.Writer) {
		streamErr := services.StreamObjectsToZip(
			api.DB, dataEngine, object, workspace, repo, payload.Ref, w,
		)
		if streamErr != nil {
			api.Logger.Error("Signed zip download: error streaming zip", "error", streamErr)
		}
		_ = w.Flush()
	})
}

// serveSignedDownloadByTier fetches object metadata and routes the download to the appropriate
// tier (in-memory, streaming, or presigned redirect) based on file size.
func (api *APIControllers) serveSignedDownloadByTier(
	c fiber.Ctx,
	dataEngine *engine.Client,
	workspace *db.Workspace,
	repo *db.Repository,
	payload *utils.SignedURLPayload,
	filename, contentType string,
) error {
	lakeFSRepoName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repo.Slug)

	// Fetch metadata with presign=true so PhysicalAddress is a presigned URL.
	// This lets the redirect/async tier use it directly without a second metadata call.
	metadata, metadataErr := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepoName, payload.Ref, payload.Path, false, true,
	)
	if metadataErr != nil {
		if strings.Contains(metadataErr.Error(), "status 404") {
			return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
				Errors: []string{"Object not found"},
			})
		}
		api.Logger.Error("Signed download: error fetching object metadata",
			"path", payload.Path, "ref", payload.Ref, "error", metadataErr,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Internal server error"},
		})
	}

	tier := utils.DetermineFileSizeTier(metadata.SizeBytes, api.Env)

	switch tier {
	case utils.FileSizeTierInMemory:
		content, contentErr := dataEngine.GetObjectContent(
			workspace.Slug, repo.Slug, payload.Path, payload.Ref,
		)
		if contentErr != nil {
			api.Logger.Error("Signed download: error fetching object content",
				"path", payload.Path, "ref", payload.Ref, "error", contentErr,
			)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{"Internal server error"},
			})
		}
		return utils.WriteFileDownloadResponse(c, fiber.StatusOK, filename, contentType, content)

	case utils.FileSizeTierStream:
		stream, contentLen, streamErr := dataEngine.GetObjectContentStream(
			workspace.Slug, repo.Slug, payload.Path, payload.Ref,
		)
		if streamErr != nil {
			api.Logger.Error("Signed download: error streaming object content",
				"path", payload.Path, "ref", payload.Ref, "error", streamErr,
			)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{"Internal server error"},
			})
		}
		// Do not defer stream.Close() here — fasthttp reads from the stream
		// after the handler returns and closes it automatically via
		// Response.closeBodyStream() for readers that implement io.Closer.
		return utils.WriteStreamDownloadResponse(c, fiber.StatusOK, filename, contentType, stream, contentLen)

	case utils.FileSizeTierRedirect, utils.FileSizeTierAsync:
		// PhysicalAddress is already a presigned HTTP URL from the metadata call above.
		return c.Redirect().Status(fiber.StatusFound).To(metadata.PhysicalAddress)
	}

	return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
		Errors: []string{"Internal server error"},
	})
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
