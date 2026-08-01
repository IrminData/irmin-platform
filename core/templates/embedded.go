package templates

import (
	_ "embed"
)

//go:embed swagger/swagger-ui.html
var SwaggerUIHTML []byte
