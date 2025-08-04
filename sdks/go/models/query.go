package irminmodels

import "time"

type StoredQuery struct {
	ID          string    `json:"id"             validate:"required,validsqid=queries" example:"query_1a2b3c4d5e"`
	Name        string    `json:"name"           validate:"required,max=100"           example:"Monthly Sales Report"`
	Description string    `json:"description"    validate:"max=500"                    example:"Monthly aggregated sales data by region and product category"`
	SQL         string    `json:"sql"            validate:"required,validsql"          example:"select * from $['demo-data;Meteo.json@main'] WHERE 'Granularity' = 'Hour' LIMIT 2;"`
	Owner       User      `json:"owner"          validate:"required"`
	Tags        []Tag     `json:"tags,omitempty" validate:"dive"`
	CreatedAt   time.Time `json:"created_at"     validate:"required"                   example:"2025-01-15T10:30:00Z"`
	UpdatedAt   time.Time `json:"updated_at"     validate:"required"                   example:"2025-12-01T14:22:30Z"`
}

type QueryResult struct {
	Columns    []string         `json:"columns,omitempty"     validate:"dive"  example:"region,category,total_sales"`
	Data       []map[string]any `json:"data,omitempty"                         example:"[{'region':'North','category':'Electronics','total_sales':125000.50}]"`
	HasErrors  bool             `json:"has_errors,omitempty"                   example:"false"`      // Whether the query execution encountered errors
	Duration   time.Duration    `json:"duration,omitempty"    validate:"min=0" example:"1500000000"` // Time between two instants as an int64 nanosecond count
	StartedAt  time.Time        `json:"started_at,omitempty"                   example:"2025-12-01T14:22:30.100Z"`
	FinishedAt time.Time        `json:"finished_at,omitempty"                  example:"2025-12-01T14:22:31.600Z"`
	Logs       []string         `json:"logs,omitempty"        validate:"dive"  example:"Query started,Scanning 50,000 rows,Query completed successfully"`
}
