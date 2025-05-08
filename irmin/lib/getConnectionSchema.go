package lib

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"log"
	"sync"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

var connectionSchemaCacheUpdateMutex sync.Map

// GetConnectionSchema returns the schema for a connection.
// It first checks if the schema is cached, and if so, returns the cached schema.
// Otherwise, it fetches the schema from the Data Engine and caches it.
// The cache is updated in a goroutine to avoid blocking the main thread.
func GetConnectionSchema(
	c context.Context,
	connection *db.Connection,
	operationMethod, locale string,
) (*irminmodels.ObjectSchema, error) {
	// Find a relevant connection schema cache
	schemaCache, err := db.FindConnectionSchemaCache(connection.ID, operationMethod)
	if err != nil {
		log.Printf("Warning: Error finding schema cache: %v", err)
		// Continue with fetching fresh schema
	}

	if schemaCache != nil {
		// Check if the schema cache is not older than 12 hours
		schemaCacheMaxAge := 12 * time.Hour
		if time.Since(schemaCache.UpdatedAt) < schemaCacheMaxAge {
			// Return the cached schema
			return schemaCache.Schema, nil
		}
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the schema of the connection
	schema, err := dataEngine.DataMovementSchema(c, connection, operationMethod)
	if err != nil {
		log.Printf("Error getting connection schema: %v", err)
		return nil, err
	}

	// Create a unique key for this cache entry
	cacheKey := fmt.Sprintf("%d-%s", connection.ID, operationMethod)

	// Use sync.Map to prevent concurrent updates to the same cache entry
	if _, loaded := connectionSchemaCacheUpdateMutex.LoadOrStore(cacheKey, true); !loaded {
		defer connectionSchemaCacheUpdateMutex.Delete(cacheKey)

		// Update the connection with the new schema in a goroutine
		go func() {
			var err error
			if schemaCache != nil {
				schemaCache.Schema = schema
				schemaCache, err = db.SaveConnectionSchemaCache(schemaCache)
			} else {
				schemaCache, err = db.SaveConnectionSchemaCache(&db.ConnectionSchemaCache{
					Schema:       schema,
					OpMethod:     &operationMethod,
					ConnectionID: connection.ID,
				})
			}
			if err != nil {
				log.Printf("Error saving connection schema cache: %v", err)
			}
		}()
	}

	return schema, nil
}
