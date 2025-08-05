package templates

import (
	_ "embed"
)

//go:embed connector-details/mysql.html
var MySQLDetailsHTML []byte

//go:embed connector-details/postgres.html
var PostgresDetailsHTML []byte

//go:embed connector-details/sftp.html
var SFTPDetailsHTML []byte

//go:embed swagger/swagger-ui.html
var SwaggerUIHTML []byte
