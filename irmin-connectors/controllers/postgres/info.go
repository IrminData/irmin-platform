package postgresControllers

import (
	"net/http"
)

func Info(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("This is the Postgres connector"))

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
