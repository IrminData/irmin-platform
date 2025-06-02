package tests

import (
	"irmin-api/db"
	"irmin-api/utils"
)

func InitTestEnv() (*utils.CoreAPIEnv, *db.Database, error) {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, nil, err
	}

	// Initialise the database connection
	d, err := db.InitialiseDB(env)
	if err != nil {
		return nil, nil, err
	}

	return env, d, nil
}
