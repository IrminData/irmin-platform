package postgresControllers

import (
	"irmin-connectors/utils"
	"net/http"
)

func SubscribeToChanges(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r)

	// TODO: Implement the SubscribeToChanges endpoint
}
