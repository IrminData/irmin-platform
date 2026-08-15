package tools

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"slices"
	"testing"

	"irmin-api/db"
	"irmin-api/toolregistry"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestCanonicalCatalogSnapshot(t *testing.T) {
	t.Parallel()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "snapshot", Version: "1"}, nil)
	tools := NewMCPTools(server, nil, func(context.Context) (*db.User, bool) { return nil, false })
	tools.RegisterAll()
	catalog := tools.Catalog()
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
	if got := hex.EncodeToString(hash[:]); got != "c324e82a4637e2172f9583bb5df5621dfb86b6f3854abb34dd0035d1c058697d" {
		t.Fatalf("tool descriptor snapshot changed: %s", got)
	}
}

func TestDestructiveCatalogPolicy(t *testing.T) {
	t.Parallel()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "risk", Version: "1"}, nil)
	tools := NewMCPTools(server, nil, func(context.Context) (*db.User, bool) { return nil, false })
	tools.RegisterAll()
	var destructive []string
	for _, descriptor := range tools.Catalog() {
		if descriptor.Risk == toolregistry.RiskDestructive {
			destructive = append(destructive, descriptor.Name)
		}
	}
	want := []string{
		"irmin_repository_branch_delete",
		"irmin_repository_changes_revert",
		"irmin_repository_object_delete",
		"irmin_repository_ref_merge",
		"irmin_workflow_run_cancel",
	}
	if !slices.Equal(destructive, want) {
		t.Fatalf("destructive tools = %v, want %v", destructive, want)
	}
}
