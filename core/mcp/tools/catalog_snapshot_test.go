package tools_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"slices"
	"testing"

	"irmin-api/db"
	"irmin-api/mcp/tools"
	"irmin-api/toolregistry"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestCanonicalCatalogSnapshot(t *testing.T) {
	t.Parallel()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "snapshot", Version: "1"}, nil)
	mcpTools := tools.NewMCPTools(server, nil, func(context.Context) (*db.User, bool) { return nil, false })
	mcpTools.RegisterAll()
	catalog := mcpTools.Catalog()
	if len(catalog) != 53 {
		t.Fatalf("catalog contains %d tools, want 53", len(catalog))
	}
	for index := 1; index < len(catalog); index++ {
		if catalog[index-1].Name >= catalog[index].Name {
			t.Fatalf("catalog is not strictly ordered at %q", catalog[index].Name)
		}
	}

	encoded, err := json.Marshal(catalog)
	if err != nil {
		t.Fatal(err)
	}
	hash := sha256.Sum256(encoded)
	if got := hex.EncodeToString(hash[:]); got != "1dacca484c46a5fd41d7045b37efaafb51c3b89c63370d6730c848aef021e4f6" {
		t.Fatalf("tool descriptor snapshot changed: %s", got)
	}
}

func TestDestructiveCatalogPolicy(t *testing.T) {
	t.Parallel()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "risk", Version: "1"}, nil)
	mcpTools := tools.NewMCPTools(server, nil, func(context.Context) (*db.User, bool) { return nil, false })
	mcpTools.RegisterAll()
	var destructive []string
	for _, descriptor := range mcpTools.Catalog() {
		if descriptor.Risk == toolregistry.RiskDestructive {
			destructive = append(destructive, descriptor.Name)
		}
	}
	want := []string{
		"irmin_repository_branch_delete",
		"irmin_repository_changes_revert",
		"irmin_repository_object_delete",
		"irmin_repository_object_move_or_copy",
		"irmin_repository_ref_merge",
		"irmin_workflow_run_cancel",
	}
	if !slices.Equal(destructive, want) {
		t.Fatalf("destructive tools = %v, want %v", destructive, want)
	}
}
