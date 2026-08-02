package linearclient

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
)

// allowedAPIHostsEnv is the env var the operator sets to expand the
// allowlist beyond the defaults. Comma-separated list of hostnames
// (suffix match — `linear.example.com` allows
// `api.linear.example.com` too). Used by self-hosted Linear
// deployments and by integration tests that need a stable hostname.
const allowedAPIHostsEnv = "LINEAR_ALLOWED_API_HOSTS"

// allowLoopbackEnv must be set to "true" before the loopback fast-path
// (127.0.0.0/8, ::1, `localhost`) accepts an mcp_endpoint override.
// The flag exists because httptest fixtures need loopback access but
// production deployments don't — without the gate, a workspace member
// with connection-edit rights could point the connector at a sidecar
// service in its own container and exfiltrate the OAuth bearer.
const allowLoopbackEnv = "LINEAR_ALLOW_LOOPBACK_ENDPOINT"

// defaultAllowedHostSuffixes returns the baseline allowlist baked
// into the connector. Only `linear.app` (covers mcp.linear.app and
// regional subdomains). Loopback hosts go through isLoopbackHost +
// the LINEAR_ALLOW_LOOPBACK_ENDPOINT gate — they are deliberately
// NOT in the suffix allowlist, otherwise a host like
// `evil.localhost` would suffix-match `localhost` and bypass the
// loopback gate entirely.
// Returned as a fresh slice each call (lint disallows package-level
// slice variables) — callers are read-only consumers.
func defaultAllowedHostSuffixes() []string {
	return []string{"linear.app"}
}

// ResolveEndpoint validates a user-supplied `mcp_endpoint` setting
// against the allowlist and returns the URL the MCP client should
// dial. An empty setting resolves to DefaultMCPEndpoint.
//
// Why an allowlist: a workspace member with connection-edit rights
// could otherwise point the endpoint at an attacker-controlled URL
// and exfiltrate the OAuth bearer. The allowlist closes that vector
// while preserving overrides for self-hosted Linear MCP deployments
// and integration tests.
//
// Allowed hosts:
//   - Anything ending in `linear.app` (Linear's production MCP host
//     mcp.linear.app and any future regional subdomains).
//   - Loopback (127.0.0.0/8, ::1, `localhost`) — only when
//     LINEAR_ALLOW_LOOPBACK_ENDPOINT=true. Production builds reject
//     loopback so a sidecar service can't receive the bearer.
//   - Suffixes listed in the LINEAR_ALLOWED_API_HOSTS env var.
//
// Scheme must be http or https; http is accepted only behind the
// loopback gate (httptest fixtures, local dev).
func ResolveEndpoint(setting string) (string, error) {
	trimmed := strings.TrimSpace(setting)
	if trimmed == "" {
		return DefaultMCPEndpoint, nil
	}

	u, parseErr := url.Parse(trimmed)
	if parseErr != nil {
		return "", fmt.Errorf("linear: mcp_endpoint %q is not a valid URL: %w", setting, parseErr)
	}
	if u.Scheme != "https" && u.Scheme != "http" {
		return "", fmt.Errorf(
			"linear: mcp_endpoint %q must use http or https (got %q)",
			setting, u.Scheme,
		)
	}
	// DNS hostnames are case-insensitive (RFC 4343), but
	// url.Hostname() preserves whatever the caller typed. Lowercase
	// once here so `https://MCP.LINEAR.APP/mcp` matches the
	// lowercase allowlist instead of getting falsely rejected.
	host := strings.ToLower(u.Hostname())
	if host == "" {
		return "", fmt.Errorf("linear: mcp_endpoint %q has no host component", setting)
	}

	if isLoopbackHost(host) {
		if os.Getenv(allowLoopbackEnv) != "true" {
			return "", fmt.Errorf(
				"linear: mcp_endpoint host %q is loopback; set %s=true on the connectors service to allow (dev/test only)",
				host,
				allowLoopbackEnv,
			)
		}
		// Loopback path: http is fine — httptest fixtures only serve
		// plain http and the loopback gate already proves intent.
		return trimmed, nil
	}

	// Non-loopback: require https. Sending the OAuth bearer over
	// cleartext http to a remote host would expose it to anyone on
	// the network path, so an `http://mcp.linear.app/mcp` setting is
	// rejected even though the host suffix-matches the allowlist.
	if u.Scheme != "https" {
		return "", fmt.Errorf(
			"linear: mcp_endpoint %q must use https for non-loopback hosts (got %q); "+
				"http is accepted only behind %s=true",
			setting, u.Scheme, allowLoopbackEnv,
		)
	}

	if hostMatchesAllowlist(host, defaultAllowedHostSuffixes()) {
		return trimmed, nil
	}
	if extra := os.Getenv(allowedAPIHostsEnv); extra != "" {
		extras := splitAndTrim(extra)
		if hostMatchesAllowlist(host, extras) {
			return trimmed, nil
		}
	}

	return "", fmt.Errorf(
		"linear: mcp_endpoint host %q is not in the allowlist; "+
			"set %s on the connectors service to expand it",
		host, allowedAPIHostsEnv,
	)
}

// isLoopbackHost reports whether host is a loopback address or the
// `localhost` hostname. Loopback IPs are recognised via net.IP.IsLoopback
// (covers 127.0.0.0/8 and ::1) so an operator who wraps `localhost` in
// a hosts-file entry pointing at a non-loopback IP doesn't accidentally
// open the door — only literal loopback IPs and the canonical hostname
// pass.
func isLoopbackHost(host string) bool {
	if host == "localhost" {
		return true
	}
	if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		return true
	}
	return false
}

// hostMatchesAllowlist suffix-matches host against each allowlist
// entry. Suffix-match is the right shape because Linear is likely to
// ship regional endpoints (e.g., `api-eu.linear.app`) that should
// inherit the allowlist without an env update.
func hostMatchesAllowlist(host string, allow []string) bool {
	for _, entry := range allow {
		entry = strings.ToLower(strings.TrimSpace(entry))
		if entry == "" {
			continue
		}
		if host == entry || strings.HasSuffix(host, "."+entry) {
			return true
		}
	}
	return false
}

// splitAndTrim splits a comma-separated env value and discards
// whitespace-only entries. Tolerates extra commas and surrounding
// spaces so operators copy-pasting from a config file don't have to
// hand-clean the string.
func splitAndTrim(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
