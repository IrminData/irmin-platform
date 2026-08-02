package lib

import (
	"irmin-connectors/db"
	"log/slog"
)

// UpdateConnectorInDB updates the connector registration in the database.
func UpdateConnectorInDB(
	d *db.Database,
	logger *slog.Logger,
	irminID, token, connectorName string,
) error {
	// Remove current connector registrations from the database
	regs, err := d.GetConnectorRegistrationsByConnectorName(connectorName)
	if err != nil {
		logger.Error("Error fetching connector registration",
			"error", err,
			"connector_name", connectorName)
		return err
	}
	for _, reg := range regs {
		// Remove existing connector operations from the database
		var ops []db.Operation
		ops, err = d.GetOperationsByConnectorRegistrationID(reg.ID)
		if err != nil {
			logger.Error("Error fetching connector operations",
				"error", err,
				"registration_id", reg.ID)
			return err
		}
		for _, op := range ops {
			// Remove subscriptions associated with the operation
			err = d.DeleteSubscriptionsByOperationID(op.ID)
			if err != nil {
				logger.Error("Error deleting subscriptions",
					"error", err,
					"operation_id", op.ID)
				return err
			}
			err = d.DeleteOperation(op.ID)
			if err != nil {
				logger.Error("Error deleting operation",
					"error", err,
					"operation_id", op.ID)
				return err
			}
		}
		err = d.DeleteConnectorRegistration(reg.ID)
		if err != nil {
			logger.Error("Error deleting connector registration",
				"error", err,
				"registration_id", reg.ID)
			return err
		}
	}

	// Create a new connector registration
	registration, err := d.CreateConnectorRegistration(&db.ConnectorRegistration{
		IrminID:       irminID,
		ConnectorName: connectorName,
		SystemToken:   token,
	})
	if err != nil {
		logger.Error("Error creating connector registration",
			"error", err,
			"connector_name", connectorName,
			"irmin_id", irminID)
		return err
	}

	logger.Info("Connector registration completed",
		"connector_name", connectorName,
		"registration_id", registration.ID)

	return nil
}
