package services

import (
	"archive/zip"
	"fmt"
	"io"

	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CollectObjectFiles recursively collects all file contents from an object tree into a map.
// Paths are sanitized to prevent zip-slip attacks.
// This is the shared implementation used by both authenticated (service) and
// public signed-URL (controller) download paths.
func CollectObjectFiles(
	database *db.Database,
	dataEngine *engine.Client,
	object *db.RepositoryObject,
	workspace *db.Workspace,
	repo *db.Repository,
	ref string,
	files map[string][]byte,
) error {
	if object.Type == irminmodels.ObjectTypeGroup {
		children, childErr := database.FindChildObjects(object.ID)
		if childErr != nil {
			return fmt.Errorf("error finding children for %s: %w", object.Path, childErr)
		}
		for i := range children {
			if err := CollectObjectFiles(
				database, dataEngine, &children[i], workspace, repo, ref, files,
			); err != nil {
				return err
			}
		}
		return nil
	}

	// Sanitize path to prevent zip-slip attacks
	safePath, sanitizeErr := utils.SanitizeZipEntryPath(object.Path)
	if sanitizeErr != nil {
		return fmt.Errorf("unsafe zip entry path %s: %w", object.Path, sanitizeErr)
	}

	content, contentErr := dataEngine.GetObjectContent(workspace.Slug, repo.Slug, object.Path, ref)
	if contentErr != nil {
		return fmt.Errorf("error getting content for %s: %w", object.Path, contentErr)
	}
	files[safePath] = content
	return nil
}

// StreamObjectsToZip recursively streams object content from an object tree into a zip writer
// without loading all files into memory at once.
// Paths are sanitized to prevent zip-slip attacks.
// This is the shared implementation used by both authenticated (service) and
// public signed-URL (controller) download paths.
func StreamObjectsToZip(
	database *db.Database,
	dataEngine *engine.Client,
	object *db.RepositoryObject,
	workspace *db.Workspace,
	repo *db.Repository,
	ref string,
	writer io.Writer,
) error {
	zipWriter := zip.NewWriter(writer)

	if err := streamObjectToZipEntry(
		database, dataEngine, object, workspace, repo, ref, zipWriter,
	); err != nil {
		return err
	}

	return zipWriter.Close()
}

// streamObjectToZipEntry recursively writes object content into individual zip entries.
func streamObjectToZipEntry(
	database *db.Database,
	dataEngine *engine.Client,
	object *db.RepositoryObject,
	workspace *db.Workspace,
	repo *db.Repository,
	ref string,
	zipWriter *zip.Writer,
) error {
	if object.Type == irminmodels.ObjectTypeGroup {
		children, childErr := database.FindChildObjects(object.ID)
		if childErr != nil {
			return fmt.Errorf("error finding children for %s: %w", object.Path, childErr)
		}
		for i := range children {
			if err := streamObjectToZipEntry(
				database, dataEngine, &children[i], workspace, repo, ref, zipWriter,
			); err != nil {
				return err
			}
		}
		return nil
	}

	// Sanitize path to prevent zip-slip attacks
	safePath, sanitizeErr := utils.SanitizeZipEntryPath(object.Path)
	if sanitizeErr != nil {
		return fmt.Errorf("unsafe zip entry path %s: %w", object.Path, sanitizeErr)
	}

	// Stream file content from LakeFS directly into the zip entry
	stream, _, streamErr := dataEngine.GetObjectContentStream(
		workspace.Slug, repo.Slug, object.Path, ref,
	)
	if streamErr != nil {
		return fmt.Errorf("error streaming object %s: %w", object.Path, streamErr)
	}
	defer stream.Close()

	entry, createErr := zipWriter.Create(safePath)
	if createErr != nil {
		return fmt.Errorf("error creating zip entry for %s: %w", safePath, createErr)
	}

	if _, copyErr := io.Copy(entry, stream); copyErr != nil {
		return fmt.Errorf("error writing zip entry for %s: %w", safePath, copyErr)
	}

	return nil
}
