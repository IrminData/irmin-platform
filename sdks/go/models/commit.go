package irminmodels

// Commit represents a repository commit.
type Commit struct {
	// Hash of the commit
	Hash string `json:"hash"                    validate:"required,min=1,max=64"`
	// Commit message
	Message string `json:"message"                 validate:"required,min=1,max=500"`
	// Commit timestamp
	Timestamp string `json:"timestamp"               validate:"required,datetime"`
	// Commit author
	Author string `json:"author"                  validate:"required,min=1,max=100"`
	// Previous commit hash, if any (optional)
	PreviousHash *string `json:"previous_hash,omitempty" validate:"min=1,max=64,notsamefield=Hash"`
}
