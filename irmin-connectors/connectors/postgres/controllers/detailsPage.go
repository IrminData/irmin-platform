package postgrescontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the PostgreSQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	htmlContent := `
		<html>
			<head>
				<title>IRMIN PostgreSQL Connector - Details</title>
				<style>
					body { font-family: Arial, sans-serif; }
				</style>
			</head>
			<body>
				<img src="/public/postgres.png" alt="PostgreSQL Logo" style="max-width:200px;">
				<h1>IRMIN PostgreSQL Connector - Details</h1>
				<p>This connector uses standard PostgreSQL connection fields such as host, port, user, password, and (optionally) the default database to establish a secure connection.</p>
				<p>Steps for establishing the connection:</p>
				<ul>
					<li><strong>Credential Validation:</strong> The provided host, port, user, and password are validated to ensure the proper setup before any operation.</li>
					<li><strong>Database Selection:</strong> An optional database field allows operators to specify which database to target.</li>
				</ul>
				<p>Data movement operations are implemented as follows:</p>
				<ul>
					<li><strong>Push:</strong> Existing data in a target table is cleared and replaced in a single transaction by truncating the table and inserting new rows.</li>
					<li><strong>Pull:</strong> Data can be fetched for entire tables or individual rows, returning the results as downloadable JSON files.</li>
					<li><strong>Patch:</strong> Both row-level and column-level modifications are performed using atomic transactions to ensure data consistency.</li>
				</ul>
				<p><strong>Event Listening:</strong> The connector sets up notification triggers on all tables. These triggers broadcast changes (inserts, updates, deletes) which are then captured by an event listener. The listener processes these notifications and can forward them via webhook endpoints, enabling real-time reactive workflows.</p>
				<p><a href="/postgres/docs">Read connector documentation</a></p>
			</body>
		</html>
	`
	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
