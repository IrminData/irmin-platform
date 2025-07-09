package mysqlcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the MySQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	htmlContent := `
		<html>
			<head>
				<title>IRMIN MySQL Connector - Details</title>
				<style>
					body { font-family: Arial, sans-serif; }
				</style>
			</head>
			<body>
				<img src="/public/mysql.png" alt="MySQL Logo" style="max-width:200px;">
				<h1>IRMIN MySQL Connector - Details</h1>
				<p>This connector uses standard MySQL connection fields such as host, port, user, password, and (optionally) the default database to establish a secure connection.</p>
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
				<p><strong>Event Listening:</strong> The connector can monitor MySQL binary logs for real-time change detection. This enables capture of inserts, updates, and deletes which can be forwarded via webhook endpoints for reactive workflows.</p>
				<p><a href="/mysql/docs">Read connector documentation</a></p>
			</body>
		</html>
	`
	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
