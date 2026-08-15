package mcp

// OriginAllowed applies the MCP browser-origin policy. Machine clients do not
// send Origin and remain eligible for bearer authentication. Browser clients
// must match an explicitly configured origin exactly.
func OriginAllowed(origin string, allowedOrigins []string) bool {
	if origin == "" {
		return true
	}

	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}

	return false
}
