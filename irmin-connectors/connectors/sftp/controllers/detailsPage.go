package sftpcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the SFTP connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	htmlContent := `
		<html>
			<head>
				<title>IRMIN SFTP Connector - Details</title>
				<style>
					body { font-family: Arial, sans-serif; }
				</style>
			</head>
			<body>
				<img src="/public/sftp.png" alt="SFTP Logo" style="max-width:200px;">
				<h1>IRMIN SFTP Connector - Details</h1>
				<p>This connector uses standard SFTP connection fields such as host, port, username, and authentication method to establish a secure file transfer connection.</p>
				<p>Steps for establishing the connection:</p>
				<ul>
					<li><strong>Credential Validation:</strong> The provided host, port, username, and authentication credentials (password or SSH key) are validated to ensure proper setup before any operation.</li>
					<li><strong>Path Configuration:</strong> An optional remote_path field allows operators to specify the target directory on the SFTP server.</li>
				</ul>
				<p>File transfer operations are implemented as follows:</p>
				<ul>
					<li><strong>Push:</strong> Local files are securely transferred to the remote SFTP server, with support for various file types including text, binary, and archive files.</li>
					<li><strong>Pull:</strong> Files can be downloaded from the SFTP server based on specified patterns or individual file selection.</li>
					<li><strong>File Patterns:</strong> Supports pattern-based file selection for bulk operations using standard file globbing patterns.</li>
				</ul>
				<p><strong>Authentication Methods:</strong> The connector supports both password-based authentication and SSH key-based authentication for secure access to SFTP servers.</p>
				<p><strong>Note:</strong> SFTP is a file transfer protocol and does not support real-time event listening or subscriptions like database connectors.</p>
				<p><a href="/sftp/docs">Read connector documentation</a></p>
			</body>
		</html>
	`
	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
