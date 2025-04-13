package lib

import (
	"fmt"
	"irmin-connectors/db"
)

// UpdateConnectorInDB updates the connector registration in the database.
func UpdateConnectorInDB(irminId, token, connectorName string) error {
	// Remove current connector registrations from the database
	regs, err := db.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		fmt.Printf("Error fetching connector registration: %v\n", err)
		return err
	}
	for _, reg := range regs {
		// Remove existing connector operations from the database
		ops, err := db.GetOperationsByConnectorRegistrationID(reg.ID)
		if err != nil {
			fmt.Printf("Error fetching connector operations: %v\n", err)
			return err
		}
		for _, op := range ops {
			// Remove subscriptions associated with the operation
			err = db.DeleteSubscriptionsByOperationID(op.ID)
			if err != nil {
				fmt.Printf("Error deleting subscriptions: %v\n", err)
				return err
			}
			err = db.DeleteOperation(op.ID)
			if err != nil {
				fmt.Printf("Error deleting operation: %v\n", err)
				return err
			}
		}
		err = db.DeleteConnectorRegistration(reg.ID)
		if err != nil {
			fmt.Printf("Error deleting connector registration: %v\n",
				err)
			return err
		}
	}

	// Create a new connector registration
	registration, err := db.CreateConnectorRegistration(&db.ConnectorRegistration{
		IrminID:       irminId,
		ConnectorName: connectorName,
		SystemToken:   token,
	})
	if err != nil {
		fmt.Printf("Error creating connector registration: %v\n", err)
		return err
	}

	fmt.Printf("Connector registered: %s, token: %s, registration ID: %d\n", connectorName, token, registration.ID)

	return nil
}
