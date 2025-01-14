package routes

import (
	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {
	r := mux.NewRouter()

	r = setupPostgresRoutes(r)

	return r
}
