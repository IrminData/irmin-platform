package connectorsclient

import (
	"fmt"
	"net/http"
	"strconv"

	irminsdkgo "github.com/IrminData/irmin-sdk-go"
)

// HeaderConnectionID is sent on every outbound connector request so
// the receiving service can identify which Irmin Connection the
// operation belongs to. The value mirrors the exact string used by
// the existing Core-side connectors-client so migration is a drop-in.
//
// Using Go's canonical HTTP header form avoids net/http silently
// rewriting it at send time and keeps reads consistent.
const HeaderConnectionID = "X-Irmin-Connection-Id"

// Client is the async-protocol connector-service HTTP client.
//
// A Client is safe for concurrent use. It keeps two underlying
// http.Clients: one for short request/response calls (status, start,
// cancel) and one without a top-level timeout for the streaming
// result fetch, so long zip downloads are not cut off by the
// request-response timer.
type Client struct {
	// BaseURL is the connector service base, e.g.
	// "https://connectors.irmin.dev/stripe". It must include the
	// connector-specific prefix the service expects.
	BaseURL string

	// Token is the operation or system token for the connector,
	// set on the Authorization header as "Bearer <token>".
	Token string

	// Locale is used to request localised messages from the
	// connector service via the Accept-Language header.
	Locale string

	// HTTPClient is the client used for short requests (start,
	// status, cancel). Defaults to a client with
	// irminsdkgo.DefaultConnectorTimeout. Callers that need custom
	// transports, proxies, or timeouts may replace it.
	HTTPClient *http.Client

	// streamClient is used for /operation/result reads. It
	// intentionally has no top-level Timeout so large zip downloads
	// are not aborted by the response-level timer; lifecycle is
	// instead tied to the request context.
	streamClient *http.Client

	// ConnectionID is the Irmin Connection ID this client is
	// operating on behalf of. When non-zero it is sent as
	// HeaderConnectionID on every outbound request so OAuth-backed
	// connectors can fetch the right access token. Leave zero for
	// calls that are not connection-scoped.
	ConnectionID uint
}

// NewClient creates a new connector-service client with sensible
// default http.Client settings. The two underlying clients share a
// single transport so connection pooling and TLS sessions are
// reused across short and streaming calls.
func NewClient(baseURL, token, locale string) *Client {
	transport := http.DefaultTransport
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		Locale:  locale,
		HTTPClient: &http.Client{
			Timeout:   irminsdkgo.DefaultConnectorTimeout,
			Transport: transport,
		},
		streamClient: &http.Client{Transport: transport},
	}
}

// WithConnectionID returns the receiver after setting ConnectionID,
// enabling a fluent call-site:
//
//	client := connectorsclient.NewClient(url, tok, "en").WithConnectionID(conn.ID)
//
// Mutates and returns the same pointer. Passing 0 clears the
// connection context.
func (c *Client) WithConnectionID(id uint) *Client {
	c.ConnectionID = id
	return c
}

// applyDefaultHeaders sets the headers common to every request this
// client issues: auth, locale, the optional connection ID, and a
// caller-supplied Accept if the caller did not set one.
func (c *Client) applyDefaultHeaders(req *http.Request, accept string) {
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	req.Header.Set("Accept-Language", c.Locale)
	if req.Header.Get("Accept") == "" && accept != "" {
		req.Header.Set("Accept", accept)
	}
	if c.ConnectionID != 0 {
		req.Header.Set(HeaderConnectionID, strconv.FormatUint(uint64(c.ConnectionID), 10))
	}
}
