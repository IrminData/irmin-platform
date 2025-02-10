package postgresControllers

import (
	"net/http"
)

// DocsPage serves static HTML content with the documentation for the PostgreSQL connector.
func DocsPage(w http.ResponseWriter, r *http.Request) {
	htmlContent := `
		<html>
			<head>
				<title>IRMIN PostgreSQL Connector - Documentation</title>
				<style>
					body { font-family: Arial, sans-serif; }
				</style>
			</head>
			<body>
				<img src="/public/postgres.png" alt="PostgreSQL Logo" style="max-width:200px;">
				<h1>IRMIN PostgreSQL Connector - Documentation</h1>
				<p>This documentation provides a technical overview of the PostgreSQL connector's operation.</p>
				<p><strong>Client Operations:</strong></p>
				<ul>
					<li>The connector initializes a PostgreSQL client using standard fields such as host, port, user, password, and optional database name.</li>
					<li>After validation, the client establishes a connection to the PostgreSQL server, facilitating secure data access and manipulation.</li>
					<li>All database interactions are wrapped in transactions to maintain atomicity and consistency.</li>
				</ul>
				<p><strong>Event Listeners:</strong></p>
				<ul>
					<li>The connector employs notification triggers on database tables to monitor for inserts, updates, and deletes.</li>
					<li>An internal event listener subscribes to these triggers and forwards notifications via webhooks.</li>
					<li>This mechanism enables real-time data synchronization and reactive workflows.</li>
				</ul>
				<p>For more in-depth technical details on PostgreSQL connections, queries, and trigger mechanisms, please refer to the 
				<a href="https://www.postgresql.org/docs/">PostgreSQL Documentation</a>.</p>
				<p>This technical guide is aimed at administrators and developers who intend to integrate and troubleshoot the IRMIN PostgreSQL connector within complex environments.</p>
				<p><a href="/postgres/details">About the connector</a></p>
			</body>
		</html>
	`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(htmlContent))
}
