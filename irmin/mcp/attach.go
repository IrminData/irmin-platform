package mcp

import (
	"net/http"

	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// registerAttachRoute adds GET {MCPHTTPPath}/attach that uses the Streamable HTTP transport.
// This endpoint provides a single-step SSE connection for HTTP-only clients (e.g., Langflow).
// The Streamable HTTP handler automatically handles initialization and SSE streaming.
func registerAttachRoute(
	app *fiber.App,
	apiServices *services.APIServices,
	httpHandler http.Handler,
	cfg *authConfig,
) {
	path := apiServices.Env.MCPHTTPPath + "/attach"

	// Create a wrapper that proxies GET requests to the base MCP path
	attachHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Rewrite the path to the base MCP path so the SDK handler processes it correctly
		r.URL.Path = apiServices.Env.MCPHTTPPath
		r.URL.RawPath = ""

		// Ensure Accept header is set for SSE if not already present
		if r.Header.Get("Accept") == "" {
			r.Header.Set("Accept", "text/event-stream")
		}

		// Proxy to the SDK handler
		httpHandler.ServeHTTP(w, r)
	})

	// Wrap with auth and mount
	authWrapped := wrapWithHTTPAuth(attachHandler, cfg)
	app.Get(path, adaptor.HTTPHandler(authWrapped))
}

// newStreamableHandler creates an HTTP handler for the Streamable HTTP transport.
func newStreamableHandler(server *sdkmcp.Server) http.Handler {
	return sdkmcp.NewStreamableHTTPHandler(func(*http.Request) *sdkmcp.Server { return server }, nil)
}
