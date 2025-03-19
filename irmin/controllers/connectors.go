package controllers

import (
	"encoding/json"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminConnectorClient "github.com/IrminData/irmin-sdk-go/connector"
	"github.com/gofiber/fiber/v3"
)

func ConnectorsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)

	// Get all connectors from the database
	connectors, err := db.GetAllConnectors()
	if err != nil {
		log.Printf("Error retrieving connectors: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Format the connectors for the response
	var connectorsResponse []db.ConnectorResponse
	for _, connector := range connectors {
		// Create the response
		connectorResponse, err := lib.FormatConnectorResponse(connector)
		if err != nil {
			log.Printf("Error formatting connector response: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		// Append the connector to the response
		connectorsResponse = append(connectorsResponse, *connectorResponse)
	}

	// Return the connectors
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: connectorsResponse,
	})
}

func ConnectorsShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	connector := c.Locals("connector").(*db.Connector)

	// Create the response
	connectorResponse, err := lib.FormatConnectorResponse(*connector)
	if err != nil {
		log.Printf("Error formatting connector response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the connector info
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: connectorResponse,
	})
}

func ConnectorsStore(c fiber.Ctx) error {
	isSystem := c.Locals("is_system").(bool)
	if !isSystem {
		// Only system requests can create connectors
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}
	dict := c.Locals("dict").(locales.Dictionary)
	locale := c.Locals("locale").(string)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"url", "system_token"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create new connector client
	connectorClient := irminConnectorClient.NewClient(fields["url"], fields["system_token"], locale)

	// Request the info endpoint of the connector
	connectorInfo, err := connectorClient.GetInfo()
	if err != nil {
		log.Printf("Error fetching connector info: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Check if the connector is already registered
	connector, err := db.GetConnectorByAPIBaseURL(connectorInfo.APIBaseURL)
	if err != nil {
		// If the connector is not found, create a new connector
		connector, err = db.CreateConnector(&db.Connector{
			APIBaseURL:       connectorInfo.APIBaseURL,
			SystemToken:      fields["system_token"],
			Name:             connectorInfo.Name,
			Description:      connectorInfo.Description,
			Version:          connectorInfo.Version,
			StructureVersion: connectorInfo.StructureVersion,
			Author:           connectorInfo.Author,
			LogoURL:          connectorInfo.LogoURL,
			Capabilities:     connectorInfo.Capabilities,
			Locales:          connectorInfo.Locales,
			PrimaryCategory:  connectorInfo.PrimaryCategory,
			Categories:       connectorInfo.Categories,
			AuthorEmail:      connectorInfo.AuthorEmail,
			ReadMoreURL:      connectorInfo.ReadMoreURL,
		})
	} else {
		// If the connector is found, update the connector
		// Marshal capabilities, locales, and categories to JSON
		capabilitiesJSON, err := json.Marshal(connectorInfo.Capabilities)
		if err != nil {
			log.Printf("Error marshalling capabilities: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		localesJSON, err := json.Marshal(connectorInfo.Locales)
		if err != nil {
			log.Printf("Error marshalling locales: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		categoriesJSON, err := json.Marshal(connectorInfo.Categories)
		if err != nil {
			log.Printf("Error marshalling categories: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		// Update the connector
		connector, err = db.UpdateConnector(connector.ID, map[string]interface{}{
			"system_token":      fields["system_token"],
			"name":              connectorInfo.Name,
			"description":       connectorInfo.Description,
			"version":           connectorInfo.Version,
			"structure_version": connectorInfo.StructureVersion,
			"author":            connectorInfo.Author,
			"logo_url":          connectorInfo.LogoURL,
			"capabilities":      capabilitiesJSON,
			"locales":           localesJSON,
			"primary_category":  connectorInfo.PrimaryCategory,
			"categories":        categoriesJSON,
			"author_email":      connectorInfo.AuthorEmail,
			"read_more_url":     connectorInfo.ReadMoreURL,
		})
	}
	if err != nil {
		log.Printf("Error creating/updating connector: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the response
	connectorResponse, err := lib.FormatConnectorResponse(*connector)
	if err != nil {
		log.Printf("Error formatting connector response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the connector info
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connector_refreshed"),
		Data:    connectorResponse,
	})
}

func ConnectorsUpdate(c fiber.Ctx) error {
	isSystem := c.Locals("is_system").(bool)
	if !isSystem {
		// Only system requests can create connectors
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}
	dict := c.Locals("dict").(locales.Dictionary)
	locale := c.Locals("locale").(string)
	connector := c.Locals("connector").(*db.Connector)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"url", "system_token"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create new connector client
	connectorClient := irminConnectorClient.NewClient(fields["url"], fields["system_token"], locale)

	// Request the info endpoint of the connector
	connectorInfo, err := connectorClient.GetInfo()
	if err != nil {
		log.Printf("Error fetching connector info: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Marshal capabilities, locales, and categories to JSON
	capabilitiesJSON, err := json.Marshal(connectorInfo.Capabilities)
	if err != nil {
		log.Printf("Error marshalling capabilities: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	localesJSON, err := json.Marshal(connectorInfo.Locales)
	if err != nil {
		log.Printf("Error marshalling locales: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	categoriesJSON, err := json.Marshal(connectorInfo.Categories)
	if err != nil {
		log.Printf("Error marshalling categories: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Update the connector
	connector, err = db.UpdateConnector(connector.ID, map[string]interface{}{
		"api_base_url":      fields["url"],
		"system_token":      fields["system_token"],
		"name":              connectorInfo.Name,
		"description":       connectorInfo.Description,
		"version":           connectorInfo.Version,
		"structure_version": connectorInfo.StructureVersion,
		"author":            connectorInfo.Author,
		"logo_url":          connectorInfo.LogoURL,
		"capabilities":      capabilitiesJSON,
		"locales":           localesJSON,
		"primary_category":  connectorInfo.PrimaryCategory,
		"categories":        categoriesJSON,
		"author_email":      connectorInfo.AuthorEmail,
		"read_more_url":     connectorInfo.ReadMoreURL,
	})
	if err != nil {
		log.Printf("Error updating connector: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the response
	connectorResponse, err := lib.FormatConnectorResponse(*connector)
	if err != nil {
		log.Printf("Error formatting connector response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the connector info
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connector_refreshed"),
		Data:    connectorResponse,
	})
}

func ConnectorsDestroy(c fiber.Ctx) error {
	isSystem := c.Locals("is_system").(bool)
	if !isSystem {
		// Only system requests can create connectors
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}
	dict := c.Locals("dict").(locales.Dictionary)
	connector := c.Locals("connector").(*db.Connector)

	// Delete the connector from the database
	err := db.DeleteConnector(connector.ID)
	if err != nil {
		log.Printf("Error deleting connector: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the success response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connector_deleted"),
	})
}

func ShowConnectorConfigurationFields(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	connector := c.Locals("connector").(*db.Connector)

	// Get the type of the configuration fields to fetch
	configurationType := c.Params("type")
	if configurationType == "" {
		log.Printf("Error fetching connection settings fields: configuration type is required")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Create new connector client
	connectorClient := irminConnectorClient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Get the connection settings
	configurationFields, err := connectorClient.GetConfigFields(configurationType, details, settings)
	if err != nil {
		log.Printf("Error fetching connection configuration fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the array of the dynamic fields required for the connection settings
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: configurationFields,
	})
}

func ValidateConnectorConfiguration(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	connector := c.Locals("connector").(*db.Connector)

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Create new connector client
	connectorClient := irminConnectorClient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Test the connection
	testResponse, err := connectorClient.ValidateConfigFields(details, settings)
	if err != nil {
		log.Printf("Error testing connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: testResponse,
	})
}
