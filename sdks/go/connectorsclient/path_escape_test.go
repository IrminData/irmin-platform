package connectorsclient_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func TestGetSchemaEscapesMethodPathSegment(t *testing.T) {
	const wantEscapedPath = "/operation/schema/pull%2Fpreview%3Fmode=full"

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.URL.EscapedPath() != wantEscapedPath {
			t.Errorf("escaped path = %q, want %q", r.URL.EscapedPath(), wantEscapedPath)
		}
		if got := r.URL.Query().Get("path"); got != "/datasets/quarterly reports" {
			t.Errorf("query path = %q, want /datasets/quarterly reports", got)
		}

		_ = json.NewEncoder(w).Encode(irminmodels.ObjectSchema{
			Name: "quarterly reports",
			Path: "/datasets/quarterly reports",
			Type: irminmodels.ObjectTypeGroup,
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok")
	schema, err := c.GetSchema(context.Background(), "pull/preview?mode=full", "/datasets/quarterly reports")
	if err != nil {
		t.Fatalf("GetSchema: %v", err)
	}
	if schema.Name != "quarterly reports" {
		t.Errorf("schema.Name = %q, want quarterly reports", schema.Name)
	}
}

func TestGetConfigFieldsEscapesConfigTypePathSegment(t *testing.T) {
	const wantEscapedPath = "/configuration/details%2Fadvanced%3Fbeta/fields"

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.URL.EscapedPath() != wantEscapedPath {
			t.Errorf("escaped path = %q, want %q", r.URL.EscapedPath(), wantEscapedPath)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm: %v", err)
		}
		if got := r.FormValue("details[account/id]"); got != "acct/123" {
			t.Errorf("details form value = %q, want acct/123", got)
		}

		_ = json.NewEncoder(w).Encode(map[string]irminmodels.DynamicField{
			"account": {
				Type:  irminmodels.FieldTypeText,
				Label: "Account",
			},
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok")
	fields, err := c.GetConfigFields(
		context.Background(),
		"details/advanced?beta",
		map[string]string{"account/id": "acct/123"},
		nil,
	)
	if err != nil {
		t.Fatalf("GetConfigFields: %v", err)
	}
	if fields["account"].Label != "Account" {
		t.Errorf("field label = %q, want Account", fields["account"].Label)
	}
}
