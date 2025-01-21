package postgresControllers

import (
	"irmin-connectors/utils"
	"net/http"
)

func ConfigFields(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r)

	// TODO: Implement the ConfigFields endpoint
}
