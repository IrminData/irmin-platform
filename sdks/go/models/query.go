package models

// JSONValue represents a JSON-compatible value.
type JSONValue interface{}

// JSONObject represents a JSON-compatible object.
type JSONObject map[string]JSONValue

// JSONArray represents a JSON-compatible array.
type JSONArray []JSONValue

// Query represents a query object.
type Query struct {
	// Unique ID of the query
	ID string `json:"id"`
	// Name of the query
	Name string `json:"name"`
	// Description of the query
	Description string `json:"description"`
	// The query itself
	Content string `json:"content"`
	// The type of the query (e.g., "sql", "js", etc.)
	Type IrminFileType `json:"type"`
	// The ID of the user who created the query
	Owner string `json:"owner"`
	// Whether the query results are stored in the system
	Stored bool `json:"stored"`
	// Timestamp when the query execution started
	StartedAt string `json:"started_at"`
	// Timestamp when the query execution finished
	FinishedAt string `json:"finished_at"`
	// Time taken to execute the query in milliseconds
	ExecutionTime int `json:"execution_time"`
	// Logs from the query execution
	Logs []string `json:"logs"`
}

// QueryExecutionResult represents the result of a query execution.
type QueryExecutionResult struct {
	// The resulting data from the query execution
	Result JSONValue `json:"result"`
	// Time taken to execute the query in milliseconds
	ExecutionTime int `json:"execution_time"`
	// Logs from the query execution
	Logs []string `json:"logs"`
}
