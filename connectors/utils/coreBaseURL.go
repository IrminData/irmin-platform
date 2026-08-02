package utils

import "strings"

// NormalizeCoreBaseURL trims a trailing slash from coreBaseURL and, if the
// remaining suffix is `/api` or `/api/v1`, strips that too. Used by the env
// loader so a misconfigured IRMIN_API_BASE_URL does not silently break
// downstream URL construction.
//
// Why this exists: the contract is that callers append the path they need.
// The OAuth token client wants `IRMIN_API_BASE_URL + "/api/v1/system/oauth/...`;
// the SDK wants `IRMIN_API_BASE_URL + "/api"` already baked in. A reader of
// our docs can easily fold the `/api` prefix into the env value because the
// redirect-URI guidance reads `{IRMIN_API_BASE_URL}/api/v1/oauth/callback`,
// and once it's in the env value, a previously-working SDK call with shape
// `BaseURL + "/v1/..."` produces `/api/api/v1/...` and Core 404s. By stripping
// at env-load time, we make the env value canonical (host, no path) and let
// each caller append the prefix they need:
//
//   - SDK callers:           Env.SDKBaseURL()  → host + "/api"
//   - OAuth token client:    Env.APIBaseURL    → host (it appends /api/v1/... itself)
//
// Genuine path-prefixed deployments (e.g. a reverse-proxy-mounted Core at
// /irmin-core) are NOT stripped because they don't end in /api or /api/v1.
//
// Also exported so the OAuth token client can normalize independently — it's
// expected to be used as a public construction helper by anyone wiring up
// Core access tokens, not just code that reads from our env loader.
func NormalizeCoreBaseURL(coreBaseURL string) string {
	trimmed := strings.TrimRight(coreBaseURL, "/")
	for _, suffix := range []string{"/api/v1", "/api"} {
		if cut, ok := strings.CutSuffix(trimmed, suffix); ok {
			trimmed = cut
			break
		}
	}
	return trimmed
}
