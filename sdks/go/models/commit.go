package irminmodels

// Commit represents a repository commit.
type Commit struct {
	// Hash of the commit
	Hash string `json:"hash"                    validate:"required"          example:"1a2b3c4dn7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3"`
	// Commit message
	Message string `json:"message"                 validate:"required"          example:"Initial commit"`
	// Commit timestamp
	Timestamp string `json:"timestamp"               validate:"required,datetime" example:"2025-01-15T10:30:00Z"`
	// Commit author
	Author string `json:"author"                  validate:"required"          example:"John Doe"`
	// Previous commit hash, if any (optional)
	PreviousHash *string `json:"previous_hash,omitempty"                              example:"16z7a8b9c02j3k4l5m6n7o8p9q0r1"`
}
