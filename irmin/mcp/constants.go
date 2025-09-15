package mcp

import "time"

const (
	// MCPProtocolVersion is the Model Context Protocol version used by this server
	MCPProtocolVersion = "2025-06-18"

	// MCPServerName is the name of the MCP server implementation
	MCPServerName = "irmin-mcp"

	// MCPServerTitle is the title of the MCP server implementation
	MCPServerTitle = "Irmin MCP for data management"

	// MCPServerVersion is the version of the MCP server implementation
	MCPServerVersion = "1.0.0"

	// MCPClientName is the name used for MCP client connections
	MCPClientName = "irmin-http-attach"

	// MCPClientVersion is the version used for MCP client connections
	MCPClientVersion = "1.0.0"

	// MCPAttachTimeout is the timeout for MCP attach streaming operations
	MCPAttachTimeout = 30 * time.Second

	// MCPAuthTimeout is the timeout for MCP authentication operations
	MCPAuthTimeout = 10 * time.Second

	// TokenPrefixLength is the number of characters to show in token logs for debugging
	TokenPrefixLength = 10

	// ErrorStatusCodeThreshold is the HTTP status code threshold for error logging
	ErrorStatusCodeThreshold = 400

	// LargeResponseThreshold is the byte threshold for logging large responses
	LargeResponseThreshold = 10000
)
