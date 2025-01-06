package models

// Commit represents a repository commit.
type Commit struct {
	// Hash of the commit
	Hash string `json:"hash"`
	// Commit message
	Message string `json:"message"`
	// Commit timestamp
	Timestamp string `json:"timestamp"`
	// Commit author
	Author string `json:"author"`
	// Previous commit hash, if any (optional)
	PreviousHash *string `json:"previous_hash,omitempty"`
}
