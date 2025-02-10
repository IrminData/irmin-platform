package postgresClient

import (
	"context"
	"fmt"
	"os"
)

func SetupNotifications(dbClient *PostgresClient) error {
	// Remove all existing notification triggers for all tables in the database
	content, err := os.ReadFile("connectors/postgres/client/remove_triggers_for_all_tables.sql")
	if err != nil {
		return fmt.Errorf("failed to read trigger script: %v", err)
	}
	if _, err := dbClient.Exec(context.Background(), string(content)); err != nil {
		return fmt.Errorf("failed to remove triggers: %v", err)
	}

	// Create notification triggers for all tables in the database
	content, err = os.ReadFile("connectors/postgres/client/create_triggers_for_all_tables.sql")
	if err != nil {
		return fmt.Errorf("failed to read trigger script: %v", err)
	}
	if _, err := dbClient.Exec(context.Background(), string(content)); err != nil {
		return fmt.Errorf("failed to create triggers: %v", err)
	}

	return nil
}
