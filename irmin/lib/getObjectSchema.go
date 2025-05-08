package lib

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"irmin-api/db"
	"irmin-api/engine"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// objectSchemaCacheUpdateMutex is used to prevent concurrent updates to the same object schema cache entry
var objectSchemaCacheUpdateMutex sync.Map

// GetObjectSchema returns the schema for an object.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it.
// The cache is updated in a goroutine to avoid blocking the main thread.
func GetObjectSchema(c context.Context, workspace *db.Workspace, repository *db.Repository, object *irminModels.Object, ref, locale string) (*irminModels.ObjectSchema, error) {
	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Find a relevant repository object schema cache
	schemaCache, err := db.FindRepositorySchemaCache(repository.ID, object.Path, ref)
	if err != nil {
		log.Printf("Warning: Error finding schema cache: %v", err)
		// Continue with fetching fresh schema
	}

	if schemaCache != nil {
		// Check if the schema cache is not older than 30 minutes
		schemaCacheMaxAge := 30 * time.Minute
		if time.Since(schemaCache.UpdatedAt) < schemaCacheMaxAge {
			// Return the cached schema
			return schemaCache.Schema, nil
		}
	}

	// Get the schema of the object in the repository at ref
	schema, err := dataEngine.GenerateObjectSchema(workspace.Slug, repository.Slug, object.Path, ref)
	if err != nil {
		log.Printf("Error getting object schema: %v", err)
		return nil, fmt.Errorf("failed to get object schema: %w", err)
	}

	// Create a unique key for this cache entry using a more efficient format
	cacheKey := fmt.Sprintf("%d:%s:%s", repository.ID, object.Path, ref)

	// Use sync.Map to prevent concurrent updates to the same cache entry
	if _, loaded := objectSchemaCacheUpdateMutex.LoadOrStore(cacheKey, true); !loaded {
		defer objectSchemaCacheUpdateMutex.Delete(cacheKey)

		// Update the cache in a goroutine
		go func() {
			var err error
			if schemaCache != nil {
				schemaCache.Schema = schema
				schemaCache, err = db.SaveRepositorySchemaCache(schemaCache)
			} else {
				schemaCache, err = db.SaveRepositorySchemaCache(&db.RepositorySchemaCache{
					Path:         object.Path,
					Ref:          ref,
					Schema:       schema,
					RepositoryID: repository.ID,
				})
			}
			if err != nil {
				log.Printf("Error saving repository schema cache: %v", err)
			}
		}()
	}

	return schema, nil
}
