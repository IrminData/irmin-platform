package sftpmodels

type ConnectionDetails struct {
	Host                 string `json:"host"`                   // SFTP server hostname/IP
	Port                 int    `json:"port"`                   // SFTP server port (default 22)
	Username             string `json:"username"`               // Authentication username
	Password             string `json:"password"`               // Authentication password (optional if using key)
	PrivateKey           string `json:"private_key"`            // SSH private key content (optional if using password)
	PrivateKeyPassphrase string `json:"private_key_passphrase"` // Passphrase for encrypted private key
	HostKeyFingerprint   string `json:"host_key_fingerprint"`   // Expected host key fingerprint for verification
}
