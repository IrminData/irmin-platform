package templates

import (
	_ "embed"
)

//go:embed email/invitations/workspace-invitation.html
var WorkspaceInvitationHTML []byte

//go:embed email/invitations/workspace-invitation.txt
var WorkspaceInvitationTXT []byte
