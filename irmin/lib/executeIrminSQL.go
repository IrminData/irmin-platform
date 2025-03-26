package lib

import "irmin-api/dataEngine"

func ExecuteIrminSQL(locale, workspace, sql string) ([]map[string]any, error) {
	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Execute the SQL
	results, err := DataEngine.ExecuteQuery(workspace, sql)
	if err != nil {
		return nil, err
	}

	return results, nil
}
