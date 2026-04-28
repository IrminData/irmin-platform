package linearclient_test

import (
	"strings"
	"testing"

	linearclient "irmin-connectors/connectors/linear/client"
)

type endpointCase struct {
	name          string
	setting       string
	envExtra      string
	allowLoopback bool   // sets LINEAR_ALLOW_LOOPBACK_ENDPOINT=true (httptest fixtures)
	wantPrefix    string // resolved URL must start with this; "" means error
	wantErr       string
}

// runEndpointCase exists so the table-driven test below stays
// shallow enough for `gocognit` while still asserting both branches
// (success-prefix and error-substring) per case.
func runEndpointCase(t *testing.T, tc endpointCase) {
	t.Helper()
	if tc.envExtra != "" {
		t.Setenv("LINEAR_ALLOWED_API_HOSTS", tc.envExtra)
	}
	if tc.allowLoopback {
		t.Setenv("LINEAR_ALLOW_LOOPBACK_ENDPOINT", "true")
	}
	got, err := linearclient.ResolveEndpoint(tc.setting)
	if tc.wantErr != "" {
		if err == nil {
			t.Fatalf("expected error containing %q, got URL %q", tc.wantErr, got)
		}
		if !strings.Contains(err.Error(), tc.wantErr) {
			t.Errorf("error = %q, want substring %q", err.Error(), tc.wantErr)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(got, tc.wantPrefix) {
		t.Errorf("resolved %q, want prefix %q", got, tc.wantPrefix)
	}
}

func TestResolveEndpoint_DefaultsAndAllowlist(t *testing.T) {
	cases := []endpointCase{
		{
			name:       "empty defaults to canonical",
			setting:    "",
			wantPrefix: "https://mcp.linear.app/mcp",
		},
		{
			name:       "linear.app subdomain accepted",
			setting:    "https://mcp.linear.app/mcp",
			wantPrefix: "https://mcp.linear.app",
		},
		{
			name:       "regional linear.app subdomain accepted",
			setting:    "https://mcp-eu.linear.app/graphql",
			wantPrefix: "https://mcp-eu.linear.app",
		},
		{
			name:          "loopback IP accepted (httptest pattern)",
			setting:       "http://127.0.0.1:8080/graphql",
			allowLoopback: true,
			wantPrefix:    "http://127.0.0.1",
		},
		{
			name:          "ipv6 loopback accepted",
			setting:       "http://[::1]:8080/graphql",
			allowLoopback: true,
			wantPrefix:    "http://[::1]",
		},
		{
			name:          "localhost hostname accepted",
			setting:       "http://localhost:9000/graphql",
			allowLoopback: true,
			wantPrefix:    "http://localhost",
		},
		{
			name:    "loopback rejected without allow-env (production default)",
			setting: "http://127.0.0.1:8080/mcp",
			wantErr: "is loopback; set LINEAR_ALLOW_LOOPBACK_ENDPOINT=true",
		},
		{
			name:    "localhost rejected without allow-env (production default)",
			setting: "http://localhost:8080/mcp",
			wantErr: "is loopback; set LINEAR_ALLOW_LOOPBACK_ENDPOINT=true",
		},
		{
			name:    "non-allowlisted host rejected",
			setting: "https://attacker.example.com/graphql",
			wantErr: "not in the allowlist",
		},
		{
			// Pin Cursor Bot finding: an `http://` allowlist-match
			// must NOT be accepted — it would send the OAuth bearer
			// in cleartext to a remote host. Loopback is the only
			// non-https path, and it has its own gate.
			name:    "http on allowlisted host rejected (cleartext bearer)",
			setting: "http://mcp.linear.app/mcp",
			wantErr: "must use https for non-loopback hosts",
		},
		{
			name:     "http on env-override host rejected (cleartext bearer)",
			setting:  "http://gql.acme-internal.io/mcp",
			envExtra: "acme-internal.io",
			wantErr:  "must use https for non-loopback hosts",
		},
		{
			name:    "ftp scheme rejected",
			setting: "ftp://api.linear.app/graphql",
			wantErr: "must use http or https",
		},
		{
			name:    "garbage URL rejected",
			setting: "://nope",
			wantErr: "not a valid URL",
		},
		{
			name:       "env override admits a custom host",
			setting:    "https://gql.acme-internal.io/graphql",
			envExtra:   "acme-internal.io",
			wantPrefix: "https://gql.acme-internal.io",
		},
		{
			name:       "env override: multiple comma-separated entries",
			setting:    "https://gql.acme.io/graphql",
			envExtra:   "  example.org , acme.io ,, foo.bar  ",
			wantPrefix: "https://gql.acme.io",
		},
		{
			name:    "host similar but not suffix-match still rejected",
			setting: "https://linear.app.evil.com/graphql",
			wantErr: "not in the allowlist",
		},
		{
			name:    "naked linear.app (no subdomain) accepted",
			setting: "https://linear.app/graphql",
			// host equals the suffix entry, so accepted
			wantPrefix: "https://linear.app",
		},
		{
			// Regression: url.Hostname() preserves case, but DNS is
			// case-insensitive (RFC 4343). The allowlist entries are
			// stored lowercase, so the incoming host has to be
			// lowercased too — otherwise valid uppercase URLs get
			// falsely rejected.
			name:       "uppercase host accepted (case-insensitive DNS)",
			setting:    "https://API.LINEAR.APP/graphql",
			wantPrefix: "https://API.LINEAR.APP",
		},
		{
			name:          "mixed-case localhost accepted",
			setting:       "http://LocalHost:9000/graphql",
			allowLoopback: true,
			wantPrefix:    "http://LocalHost",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) { runEndpointCase(t, tc) })
	}
}

// TestResolveEndpoint_RejectsLocalhostSubdomainBypass guards against
// a Cursor Bot finding: `evil.localhost` would suffix-match a
// `localhost` entry in the public allowlist and bypass the loopback
// gate. defaultAllowedHostSuffixes must NOT include `localhost` — it
// goes through isLoopbackHost + LINEAR_ALLOW_LOOPBACK_ENDPOINT only.
func TestResolveEndpoint_RejectsLocalhostSubdomainBypass(t *testing.T) {
	// LINEAR_ALLOW_LOOPBACK_ENDPOINT deliberately NOT set — production
	// behaviour. evil.localhost must not be admitted as a loopback
	// (isLoopbackHost matches the literal `localhost` only) AND must
	// not be admitted via the suffix allowlist either.
	_, err := linearclient.ResolveEndpoint("https://evil.localhost/mcp")
	if err == nil {
		t.Fatal("evil.localhost must be rejected; allowlist entry would otherwise bypass the loopback gate")
	}
}

// TestResolveEndpoint_LocalhostHostsFileBypass guards against the
// classic bypass where an attacker convinces the operator to point
// `localhost` at an external IP via /etc/hosts. Our isLoopbackHost
// only treats the literal `localhost` string and IPs that
// net.IP.IsLoopback() recognises as loopback, so a hosts-file alias
// like `evil.localdomain → 1.2.3.4` doesn't slip through.
func TestResolveEndpoint_LocalhostHostsFileBypass(t *testing.T) {
	// `localhost-but-evil` is not the literal string `localhost`,
	// so it has to win on a suffix match against `localhost` to
	// pass — and it doesn't, because suffix-match requires a
	// preceding `.`.
	_, err := linearclient.ResolveEndpoint("http://localhost-but-evil/graphql")
	if err == nil {
		t.Fatal("expected localhost-bypass to be rejected")
	}
}
