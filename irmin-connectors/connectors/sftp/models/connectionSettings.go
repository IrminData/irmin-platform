package sftpmodels

type ConnectionSettings struct {
	RemotePath         string   `json:"remote_path"`         // Default remote directory path
	FilePatterns       []string `json:"file_patterns"`       // File patterns to include/exclude
	PreserveTimestamps bool     `json:"preserve_timestamps"` // Whether to preserve file modification times
	OverwriteExisting  bool     `json:"overwrite_existing"`  // Whether to overwrite existing files during push
	CreateDirectories  bool     `json:"create_directories"`  // Whether to create missing directories
	TransferMode       string   `json:"transfer_mode"`       // "binary" or "text" transfer mode
}
