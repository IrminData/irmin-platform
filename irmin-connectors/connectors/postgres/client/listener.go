package postgresclient

import (
	"context"
	_ "embed"
	"fmt"
)

//go:embed remove_triggers_for_all_tables.sql
var removeTriggersSQL []byte

//go:embed create_triggers_for_all_tables.sql
var createTriggersSQL []byte

func SetupNotifications(dbClient *PostgresClient) error {
	var err error

	// Remove all existing notification triggers for all tables in the database
	if _, err = dbClient.Exec(context.Background(), string(removeTriggersSQL)); err != nil {
		return fmt.Errorf("failed to remove triggers: %w", err)
	}

	// Create notification triggers for all tables in the database
	if _, err = dbClient.Exec(context.Background(), string(createTriggersSQL)); err != nil {
		return fmt.Errorf("failed to create triggers: %w", err)
	}

	return nil
}
