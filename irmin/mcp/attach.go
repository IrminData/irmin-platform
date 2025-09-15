package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"irmin-api/db"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	// Buffer size for reading data from connections
	bufferSize = 32 * 1024
	// Heartbeat interval for keeping connections alive
	heartbeatInterval = 25 * time.Second
	// Maximum parts to split a line
	maxParts = 2
)

// registerAttachRoute adds GET {MCPHTTPPath}/attach that streams SSE in a single step.
// It authenticates Bearer, creates an MCP session (POST initialize) to obtain
// Mcp-Session-Id, then attaches via GET and streams the SSE body via Fiber v3.
func registerAttachRoute(
	app *fiber.App,
	apiServices *services.APIServices,
	httpHandler http.Handler,
	cfg *authConfig,
) {
	path := apiServices.Env.MCPHTTPPath + "/attach"
	app.Get(path, func(c fiber.Ctx) error {
		return handleAttachRequest(c, apiServices, httpHandler, cfg)
	})
}

//nolint:gocognit // It's OK, maybe someday we'll refactor this
func handleAttachRequest(
	c fiber.Ctx,
	apiServices *services.APIServices,
	httpHandler http.Handler,
	cfg *authConfig,
) error {
	// Create a context with timeout for the entire operation
	ctx, cancel := context.WithTimeout(c, MCPAttachTimeout)
	defer cancel()

	// 1) Authenticate
	user, err := authenticateUser(c, cfg, apiServices)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}

	// 2) Create session (POST initialize) -> get Mcp-Session-Id
	sessionID, err := internalCreateSession(ctx, apiServices, httpHandler, user)
	if err != nil {
		apiServices.Logger.ErrorContext(ctx, "attach: initialize failed", "error", err)
		return fiber.NewError(fiber.StatusBadGateway, "attach: init failed")
	}

	// 3) Open SSE with session id
	reader, closer, err := internalOpenSSE(apiServices, httpHandler, user, sessionID)
	if err != nil {
		apiServices.Logger.ErrorContext(ctx, "attach: open SSE failed", "error", err)
		return fiber.NewError(fiber.StatusBadGateway, "attach: stream failed")
	}
	defer closer.Close()

	// 4) Outbound SSE headers
	setSSEHeaders(c)

	// 5) Stream to client with heartbeat and read deadlines
	c.Set("Transfer-Encoding", "chunked")

	// Write initial SSE event
	_, _ = c.Write([]byte("event: open\ndata: {}\n\n"))

	// Send initial MCP notification to keep connection alive
	initialNotification := `event: notification
data: {"jsonrpc":"2.0","method":"ping","params":{}}

`
	_, _ = c.Write([]byte(initialNotification))

	// Stream data with proper timeout and cancellation handling
	buf := make([]byte, bufferSize)
	heartbeatTicker := time.NewTicker(heartbeatInterval)
	defer heartbeatTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			// Context cancelled or timed out
			apiServices.Logger.InfoContext(ctx, "attach: context cancelled", "error", ctx.Err())
			return nil
		case <-heartbeatTicker.C:
			// Send heartbeat
			heartbeat := `event: notification
data: {"jsonrpc":"2.0","method":"ping","params":{}}

`
			if _, writeErr := c.Write([]byte(heartbeat)); writeErr != nil {
				apiServices.Logger.ErrorContext(ctx, "attach: heartbeat write failed", "error", writeErr)
				return nil
			}
		default:
			// Try to read data with a short timeout
			_ = reader.SetReadDeadline(time.Now().Add(1 * time.Second))
			n, readBodyErr := reader.Read(buf)
			if n > 0 {
				// Stream the actual MCP SSE data directly
				if _, writeErr := c.Write(buf[:n]); writeErr != nil {
					apiServices.Logger.ErrorContext(ctx, "attach: data write failed", "error", writeErr)
					return nil
				}
			}
			if readBodyErr != nil {
				var ne net.Error
				if errors.As(readBodyErr, &ne) && ne.Timeout() {
					// Timeout is expected, continue to next iteration
					continue
				}
				if errors.Is(readBodyErr, io.EOF) {
					// End of stream
					apiServices.Logger.InfoContext(ctx, "attach: stream ended normally")
					return nil
				}
				apiServices.Logger.ErrorContext(ctx, "attach: read body failed", "error", readBodyErr)
				return nil
			}
		}
	}
}

// authenticateUser validates the authorization header and returns the user.
func authenticateUser(c fiber.Ctx, cfg *authConfig, apiServices *services.APIServices) (*db.User, error) {
	authHeader := c.Get("Authorization")
	user, err := validateAuthAndGetUser(cfg, authHeader)
	if err != nil {
		apiServices.Logger.ErrorContext(c, "attach: auth failed", "error", err)
		return nil, err
	}
	return user, nil
}

// --- Internal handshake helpers ---

type initParams struct {
	ProtocolVersion string         `json:"protocolVersion"`
	Capabilities    map[string]any `json:"capabilities"`
	ClientInfo      struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"clientInfo"`
}

type jsonrpcReq struct {
	JSONRPC string     `json:"jsonrpc"`
	ID      any        `json:"id"`
	Method  string     `json:"method"`
	Params  initParams `json:"params"`
}

// internalCreateSession performs the POST initialize against the in-process
// SDK handler and extracts Mcp-Session-Id from the response headers.
func internalCreateSession(
	ctx context.Context,
	apiServices *services.APIServices,
	httpHandler http.Handler,
	user *db.User,
) (string, error) {
	// Build initialize JSON-RPC request
	var body bytes.Buffer
	reqObj := jsonrpcReq{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params: initParams{
			ProtocolVersion: MCPProtocolVersion,
			Capabilities:    map[string]any{},
		},
	}
	reqObj.Params.ClientInfo.Name = MCPClientName
	reqObj.Params.ClientInfo.Version = MCPClientVersion
	if err := json.NewEncoder(&body).Encode(reqObj); err != nil {
		apiServices.Logger.ErrorContext(ctx, "internalCreateSession: failed to encode request", "error", err)
		return "", err
	}

	req := (&http.Request{
		Method:     http.MethodPost,
		URL:        &url.URL{Path: apiServices.Env.MCPHTTPPath},
		Header:     make(http.Header),
		Proto:      "HTTP/1.1",
		ProtoMajor: 1,
		ProtoMinor: 1,
		Body:       io.NopCloser(bytes.NewReader(body.Bytes())),
	}).WithContext(withUserInContext(ctx, user))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.ContentLength = int64(body.Len())
	apiServices.Logger.InfoContext(ctx, "internalCreateSession: request created", "path", apiServices.Env.MCPHTTPPath)

	// Serve handler via in-memory pipe
	srvConn, cliConn := net.Pipe()
	rw := newPipeResponseWriter(srvConn)
	go func() {
		defer srvConn.Close()
		httpHandler.ServeHTTP(rw, req)
		rw.Flush()
	}()

	reader := bufio.NewReader(cliConn)

	// Headers: find Mcp-Session-Id
	var sessionID string
	for {
		line, findSessionIDErr := reader.ReadString('\n')
		if findSessionIDErr != nil {
			apiServices.Logger.ErrorContext(
				ctx,
				"internalCreateSession: failed to read header line",
				"error",
				findSessionIDErr,
			)
			_ = cliConn.Close()
			return "", findSessionIDErr
		}
		if line == "\r\n" {
			break
		}
		parts := strings.SplitN(strings.TrimRight(line, "\r\n"), ": ", maxParts)
		if len(parts) == maxParts && strings.EqualFold(parts[0], "Mcp-Session-Id") {
			sessionID = strings.TrimSpace(parts[1])
		}
	}
	if sessionID == "" {
		// Best-effort drain then close; return a clear error
		apiServices.Logger.ErrorContext(ctx, "internalCreateSession: no session ID found")
		_, _ = io.Copy(io.Discard, reader)
		_ = cliConn.Close()
		return "", errors.New("no Mcp-Session-Id in initialize response")
	}

	// Optional: drain the rest then close
	_, _ = io.Copy(io.Discard, reader)
	_ = cliConn.Close()
	return sessionID, nil
}

// deadlineReader is a reader that supports SetReadDeadline (backed by net.Conn).
type deadlineReader interface {
	io.Reader
	SetReadDeadline(t time.Time) error
}

// sseReader avoids embedding to prevent Read() ambiguity.
type sseReader struct {
	r *bufio.Reader
	c net.Conn
}

func (sr *sseReader) Read(p []byte) (int, error) {
	return sr.r.Read(p)
}

func (sr *sseReader) SetReadDeadline(t time.Time) error {
	return sr.c.SetReadDeadline(t)
}

// internalOpenSSE performs the GET attach using Mcp-Session-Id and returns a
// reader with deadline capability plus a closer to end the stream.
func internalOpenSSE(
	apiServices *services.APIServices,
	httpHandler http.Handler,
	user *db.User,
	sessionID string,
) (deadlineReader, io.Closer, error) {
	req := (&http.Request{
		Method:     http.MethodGet,
		URL:        &url.URL{Path: apiServices.Env.MCPHTTPPath},
		Header:     make(http.Header),
		Proto:      "HTTP/1.1",
		ProtoMajor: 1,
		ProtoMinor: 1,
	}).WithContext(withUserInContext(context.Background(), user))

	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Mcp-Session-Id", sessionID)

	srvConn, cliConn := net.Pipe()
	rw := newPipeResponseWriter(srvConn)

	go func() {
		defer srvConn.Close()
		httpHandler.ServeHTTP(rw, req)
		rw.Flush()
	}()

	reader := bufio.NewReader(cliConn)

	// Read and discard status + headers
	if _, readStatusLineErr := reader.ReadString('\n'); readStatusLineErr != nil {
		apiServices.Logger.Error("internalOpenSSE: failed to read status line", "error", readStatusLineErr)
		_ = cliConn.Close()
		return nil, nil, readStatusLineErr
	}

	for {
		line, readLineErr := reader.ReadString('\n')
		if readLineErr != nil {
			apiServices.Logger.Error("internalOpenSSE: failed to read header line", "error", readLineErr)
			_ = cliConn.Close()
			return nil, nil, readLineErr
		}
		if line == "\r\n" {
			break
		}
	}
	return &sseReader{r: reader, c: cliConn}, cliConn, nil
}

// --- Streaming utilities ---

func setSSEHeaders(c fiber.Ctx) {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")
}

// Helper for completeness if you need to reuse the SDK handler construction externally.
func newStreamableHandler(server *sdkmcp.Server) http.Handler {
	return sdkmcp.NewStreamableHTTPHandler(func(*http.Request) *sdkmcp.Server { return server }, nil)
}
