package utils

import (
	"net/url"
	"strings"
)

// JoinURL properly joins a base URL with a path, handling absolute URLs and slashes correctly.
// Used to properly format full URLs to public links, like the connector web pages, and assets like logos.
// It prevents malformed URLs like:
// - https://example.com/https://other.com/path (absolute URL concatenation)
// - https://example.com//path (double slashes)
// - https://example.compath (missing slash)
func JoinURL(baseURL, path string) string {
	// If path is already an absolute URL, return it as-is
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}

	// If path is empty, return base URL
	if path == "" {
		return baseURL
	}

	// Parse the base URL to ensure it's valid
	base, err := url.Parse(baseURL)
	if err != nil {
		// If base URL is invalid, fall back to simple concatenation
		return strings.TrimSuffix(baseURL, "/") + "/" + strings.TrimPrefix(path, "/")
	}

	// Parse the path
	pathURL, err := url.Parse(path)
	if err != nil {
		// If path is invalid, treat it as a simple path
		// Handle double slashes by normalizing them
		normalizedPath := strings.TrimPrefix(path, "/")
		base.Path = strings.TrimSuffix(base.Path, "/") + "/" + normalizedPath
		return base.String()
	}

	// If path is root-relative (starts with /), use it as-is with the base URL's scheme and host
	if strings.HasPrefix(path, "/") {
		base.Path = pathURL.Path
		base.RawQuery = pathURL.RawQuery
		base.Fragment = pathURL.Fragment
		return base.String()
	}

	// Join the paths properly
	base.Path = strings.TrimSuffix(base.Path, "/") + "/" + strings.TrimPrefix(path, "/")
	return base.String()
}
