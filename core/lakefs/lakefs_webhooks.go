package lakefs

import "time"

// WebhookEventType represents the type of webhook event from LakeFS.
type WebhookEventType string

const (
	PreCommit        WebhookEventType = "pre-commit"
	PostCommit       WebhookEventType = "post-commit"
	PreMerge         WebhookEventType = "pre-merge"
	PostMerge        WebhookEventType = "post-merge"
	PreCreateBranch  WebhookEventType = "pre-create-branch"
	PostCreateBranch WebhookEventType = "post-create-branch"
	PreDeleteBranch  WebhookEventType = "pre-delete-branch"
	PostDeleteBranch WebhookEventType = "post-delete-branch"
	PreCreateTag     WebhookEventType = "pre-create-tag"
	PostCreateTag    WebhookEventType = "post-create-tag"
	PreDeleteTag     WebhookEventType = "pre-delete-tag"
	PostDeleteTag    WebhookEventType = "post-delete-tag"
)

// WebhookEvent represents a webhook event from LakeFS.
type WebhookEvent struct {
	EventType      WebhookEventType   `json:"event_type"`
	EventTime      time.Time          `json:"event_time"`
	ActionName     string             `json:"action_name"`
	HookID         string             `json:"hook_id"`
	RepositoryID   string             `json:"repository_id"`
	BranchID       *string            `json:"branch_id,omitempty"`
	SourceRef      *string            `json:"source_ref,omitempty"`
	CommitID       *string            `json:"commit_id,omitempty"`
	CommitMessage  *string            `json:"commit_message,omitempty"`
	Committer      *string            `json:"committer,omitempty"`
	CommitMetadata *map[string]string `json:"commit_metadata,omitempty"`
	TagID          *string            `json:"tag_id,omitempty"`
}
