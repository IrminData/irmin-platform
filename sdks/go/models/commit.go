package irminmodels

// Commit represents a repository commit.
type Commit struct {
	// Hash of the commit
	Hash string `json:"hash"                    validate:"required"`
	// Commit message
	Message string `json:"message"                 validate:"required"`
	// Commit timestamp
	Timestamp string `json:"timestamp"               validate:"required,datetime"`
	// Commit author
	Author string `json:"author"                  validate:"required"`
	// Previous commit hash, if any (optional)
	PreviousHash *string `json:"previous_hash,omitempty"`
}
