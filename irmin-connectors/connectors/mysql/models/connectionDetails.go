package mysqlmodels

type ConnectionDetails struct {
	Host      string `json:"host"`
	Port      string `json:"port"`
	User      string `json:"user"`
	Password  string `json:"password"`
	DefaultDB string `json:"default_db"`
}
