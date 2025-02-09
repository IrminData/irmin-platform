package subscriptions

import (
	"context"
	postgresControllers "irmin-connectors/controllers/postgres"
	"irmin-connectors/db"
)

func StartSubscriptionListeners(ctx context.Context) error {
	// Get all connector registrations
	registrations, err := db.GetAllConnectorRegistrations()
	if err != nil {
		return err
	}

	// Get all existing subscriptions
	subscriptions, err := db.GetAllSubscriptions()
	if err != nil {
		return err
	}

	// Loop through all subscriptions and start listeners
	for _, subscription := range subscriptions {
		// Find the registration for the subscription
		var registration db.ConnectorRegistration
		for _, reg := range registrations {
			if reg.ID == subscription.ConnectorRegistrationID {
				registration = reg
				break
			}
		}
		// Start the listener using the correct controller's controller
		var err error
		switch registration.ConnectorName {
		case "PostgreSQL":
			err = postgresControllers.StartListenerForSubscription(subscription, ctx)
		}
		if err != nil {
			return err
		}
	}

	return nil
}
