package connectorjobs

import (
	"irmin-api/db"

	"github.com/IrminData/irmin-platform/sdks/go/connectorsclient"
)

// NewConnectorClient builds a connectorsclient.Client targeting the
// connector that backs the given Connection, with the connection ID
// header pre-stamped so every request the caller issues carries the
// correct X-Irmin-Connection-Id.
//
// This package is the central seam for outbound async connector calls
// (Run, IsWaitError, WaitError live here too), and engine, orchestrator,
// and services all import it. Hosting the helper here lets every caller
// converge on the same construction without forcing a back-edge from
// engine → lib that would create an import cycle (lib already imports
// engine).
//
// Callers that need a bare client for connector-level (not
// connection-level) calls — e.g. registering a brand-new connector
// before any connection exists — should call connectorsclient.NewClient
// directly with the connector's APIBaseURL and SystemToken.
func NewConnectorClient(connection *db.Connection) *connectorsclient.Client {
	return connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		connection.Connector.SystemToken,
	).WithConnectionID(connection.ID)
}
