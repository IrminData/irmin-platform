package utils

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

const (
	// MaxSubParts represents the maximum allowed number of parts when splitting by '@'.
	MaxSubParts = 2
	// MinPartsWithWorkspace represents the number of parts when workspace is included.
	MinPartsWithWorkspace = 3
	// MinPartsWithoutWorkspace represents the number of parts when workspace is omitted.
	MinPartsWithoutWorkspace = 2
)

// ParsedQueryPlaceholder represents a parsed placeholder in an Irmin query.
type ParsedQueryPlaceholder struct {
	Workspace   string `json:"workspace"`   // The workspace (e.g. "acme-corp")
	Repository  string `json:"repository"`  // The repository (e.g. "mobile-app")
	Object      string `json:"object"`      // The object including its file extension (e.g. "users.json")
	Ref         string `json:"ref"`         // The branch or reference (e.g. "main"); optional
	Placeholder string `json:"placeholder"` // The full query placeholder string (e.g. $["..."])
	Replacer    string `json:"replacer"`    // The value that replaces the placeholder
	Operation   string `json:"operation"`   // The determined operation: "read" or "write"
}

// ParsedIrminQuery encapsulates the entire query, including its original form,
// a formatted version with placeholders replaced, and a slice of parsed placeholders.
type ParsedIrminQuery struct {
	Placeholders   []ParsedQueryPlaceholder `json:"placeholders"`
	OriginalQuery  string                   `json:"original_query"`
	FormattedQuery string                   `json:"formatted_query"`
}

// ReplaceFn is the type for a function that computes a replacement string for a parsed placeholder.
// It receives a pointer to ParsedQueryPlaceholder and returns a string to be substituted along with any error.
type ReplaceFn func(pi *ParsedQueryPlaceholder) (string, error)

// DetectContext looks at the portion of the query preceding the placeholder start index
// and heuristically determines whether the placeholder is in a read or write context.
// It returns "write" if the last keyword is "TO" or "INTO" (indicating a write operation),
// "read" if "FROM" is the most recent keyword, or "read" by default.
func DetectContext(query string, placeholderStart int) string {
	// Take the substring up to the placeholder start.
	contextSnippet := query[:placeholderStart]
	// Convert to uppercase to allow case-insensitive matching.
	upperContext := strings.ToUpper(contextSnippet)

	// Find the last occurrence of "FROM", "TO", and "INTO" using word boundaries.
	// This prevents partial matches like "HISTORIAN" matching "TO" or "INVENTORY" matching "INTO".
	lastFrom := findLastIndexRegex(upperContext, `\bFROM\b`)
	lastTo := findLastIndexRegex(upperContext, `\bTO\b`)
	lastInto := findLastIndexRegex(upperContext, `\bINTO\b`)

	// If "TO" or "INTO" appear after "FROM", assume write context.
	if lastTo > lastFrom || lastInto > lastFrom {
		return "write"
	}
	// Otherwise assume read context.
	return "read"
}

// findLastIndexRegex finds the last start index of a regex match in the string.
// Returns -1 if not found.
func findLastIndexRegex(s, pattern string) int {
	re := regexp.MustCompile(pattern)
	matches := re.FindAllStringIndex(s, -1)
	if len(matches) == 0 {
		return -1
	}
	// Return the start index of the last match
	return matches[len(matches)-1][0]
}

// ErrNoPlaceholders is returned when a query contains no Irmin placeholders.
var ErrNoPlaceholders = errors.New("no valid query placeholders found")

// ParseIrminQuery extracts and parses all Irmin query placeholders from the given string,
// replacing each placeholder with the value returned by the provided replaceFn.
// The expected placeholder format is: $["workspace;repository;object@ref"]
// The workspace and ref components are optional (for example, "@main" might be omitted).
//
// Example query string with multiple placeholders:
//
//	"Preamble text $[\"acme;mobile-app;users.json@main\"] some middle text $[\"other;repo;file.json\"] end text"
//
// Returns a ParsedIrminQuery containing the original query, the formatted query, and the parsed placeholders.
// ErrNoPlaceholders is returned when a query contains no Irmin placeholders.
func ParseIrminQuery(query string, replaceFn ReplaceFn) (ParsedIrminQuery, error) {
	// Regular expression to match placeholders in the form: $["..."]
	rex := regexp.MustCompile(`\$\["([^"]+)"\]`)
	matches := rex.FindAllStringSubmatchIndex(query, -1)

	if len(matches) == 0 {
		return ParsedIrminQuery{}, ErrNoPlaceholders
	}

	var placeholders []*ParsedQueryPlaceholder
	var sb strings.Builder
	lastIndex := 0

	// Iterate over each match (each placeholder).
	for _, match := range matches {
		// match[0] and match[1] are the start and end indices of the entire match.
		// match[2] and match[3] are the start and end indices of the captured group.
		start, end := match[0], match[1]
		groupStart, groupEnd := match[2], match[3]

		// Append the text before the match.
		sb.WriteString(query[lastIndex:start])

		// Determine the context (read/write) for this placeholder.
		operation := DetectContext(query, start)

		// Extract the inner content of the placeholder.
		content := query[groupStart:groupEnd]

		// Parse the placeholder content.
		parts := strings.Split(content, ";")
		var workspace, repo, object, ref string

		switch {
		case len(parts) == MinPartsWithWorkspace:
			// Full syntax: workspace;repository;object[@ref]
			workspace = parts[0]
			repo = parts[1]
			subParts := strings.Split(parts[2], "@")
			if len(subParts) > MaxSubParts {
				return ParsedIrminQuery{}, fmt.Errorf(
					"invalid query format in placeholder: %s; too many '@' symbols",
					content,
				)
			}
			object = subParts[0]
			if len(subParts) == MaxSubParts {
				ref = subParts[1]
			}
		case len(parts) == MinPartsWithoutWorkspace:
			// Simplified syntax: repository;object[@ref] (workspace omitted)
			repo = parts[0]
			subParts := strings.Split(parts[1], "@")
			if len(subParts) > MaxSubParts {
				return ParsedIrminQuery{}, fmt.Errorf(
					"invalid query format in placeholder: %s; too many '@' symbols",
					content,
				)
			}
			object = subParts[0]
			if len(subParts) == MaxSubParts {
				ref = subParts[1]
			}
		default:
			return ParsedIrminQuery{}, fmt.Errorf(
				"invalid query format in placeholder: %s; expected 2 or 3 parts separated by ';'",
				content,
			)
		}

		// Create the parsed placeholder instance.
		parsed := &ParsedQueryPlaceholder{
			Workspace:   workspace,
			Repository:  repo,
			Object:      object,
			Ref:         ref,
			Placeholder: query[start:end],
			Operation:   operation,
		}

		// Compute the replacement using the provided function.
		replacement, err := replaceFn(parsed)
		if err != nil {
			return ParsedIrminQuery{}, fmt.Errorf(
				"failed to compute replacement for placeholder '%s': %w",
				content,
				err,
			)
		}
		parsed.Replacer = replacement

		// Append the replacement text.
		sb.WriteString(replacement)

		// Update lastIndex to the end of the current match.
		lastIndex = end

		// Add to the slice of parsed placeholders.
		placeholders = append(placeholders, parsed)
	}

	// Append any remaining text after the last placeholder.
	sb.WriteString(query[lastIndex:])

	// Convert slice of pointers to slice of values.
	var placeholderValues []ParsedQueryPlaceholder
	for _, p := range placeholders {
		placeholderValues = append(placeholderValues, *p)
	}

	// Construct the final ParsedIrminQuery.
	parsedQuery := ParsedIrminQuery{
		Placeholders:   placeholderValues,
		OriginalQuery:  query,
		FormattedQuery: sb.String(),
	}

	return parsedQuery, nil
}
