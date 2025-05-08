package postgresmodels

type ConnectionDetails struct {
	Host      string `json:"host"`
	Port      string `json:"port"`
	User      string `json:"user"`
	Password  string `json:"password"`
	SSLMode   string `json:"ssl_mode"`
	DefaultDB string `json:"default_db"`
}
