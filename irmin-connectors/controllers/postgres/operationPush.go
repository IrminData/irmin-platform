package postgresControllers

import (
	"irmin-connectors/utils"
	"net/http"
)

func OperationPush(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	if !utils.ValidateOperationToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// TODO: Implement the PUSH operation for the Postgres connector

	_, err := w.Write([]byte("This is the Postgres connector"))

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
