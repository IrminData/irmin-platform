package postgresControllers

import (
	"irmin-connectors/utils"
	"net/http"
)

func SchemaGet(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r)

	// TODO: Implement the SchemaGet endpoint
}
