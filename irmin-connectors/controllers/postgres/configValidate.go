package postgresControllers

import (
	"irmin-connectors/utils"
	"net/http"
)

func ConfigValidate(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// TODO: Implement the ConfigValidate endpoint
}
