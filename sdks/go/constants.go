package irminsdkgo

import "time"

// API client timeout constants.
const (
	// DefaultAPITimeout is the default timeout for core API requests.
	DefaultAPITimeout = 10 * time.Second

	// DefaultConnectorTimeout is the default timeout for connector API requests.
	DefaultConnectorTimeout = 120 * time.Second
)

// Field length validation constants for names and identifiers.
const (
	// NameMinLength is the minimum length for name fields.
	NameMinLength = 1
	// NameMaxLength is the maximum length for most name fields (entities, objects, etc.)
	NameMaxLength = 100
	// ShortNameMaxLength is the maximum length for shorter name fields (first/last names, roles).
	ShortNameMaxLength = 50
	// LongNameMaxLength is the maximum length for longer name fields (object names, schemas).
	LongNameMaxLength = 255
)

// Field length validation constants for descriptions and text content.
const (
	// ShortDescriptionMaxLength is the maximum length for short description fields (tags, roles).
	ShortDescriptionMaxLength = 200
	// DescriptionMaxLength is the maximum length for standard description fields.
	DescriptionMaxLength = 500
	// LongDescriptionMaxLength is the maximum length for longer description fields (logs).
	LongDescriptionMaxLength = 1000
)

// Field length validation constants for technical fields.
const (
	// VersionMaxLength is the maximum length for version strings.
	VersionMaxLength = 20
	// LanguageMaxLength is the maximum length for language identifiers.
	LanguageMaxLength = 20
	// ContentTypeMaxLength is the maximum length for content type fields.
	ContentTypeMaxLength = 100
	// SystemTokenMaxLength is the maximum length for system tokens.
	SystemTokenMaxLength = 100
	// HashMaxLength is the maximum length for hash fields (commits, etc.)
	HashMaxLength = 64
	// RefMaxLength is the maximum length for git reference fields.
	RefMaxLength = 100
	// SlugMaxLength is the maximum length for slug fields.
	SlugMaxLength = 100
)

// Field length validation constants for user input fields.
const (
	// HelpTextMaxLength is the maximum length for help text fields.
	HelpTextMaxLength = 200
	// ExampleMaxLength is the maximum length for example fields.
	ExampleMaxLength = 100
	// CompanyMaxLength is the maximum length for company fields.
	CompanyMaxLength = 100
	// MessageMaxLength is the maximum length for message fields.
	MessageMaxLength = 1000
	// KeyMaxLength is the maximum length for key fields.
	KeyMaxLength = 50
	// ValueMaxLength is the maximum length for value fields.
	ValueMaxLength = 100
)

// Field length validation constants for locale and internationalization.
const (
	// LocaleMinLength is the minimum length for locale identifiers.
	LocaleMinLength = 2
	// LocaleMaxLength is the maximum length for locale identifiers.
	LocaleMaxLength = 5
)

// Field length validation constants for retention and limits.
const (
	// RetentionMinDays is the minimum retention period in days.
	RetentionMinDays = 1
	// RetentionMaxDays is the maximum retention period in days.
	RetentionMaxDays = 3650
	// MaxRetriesMin is the minimum number of retries.
	MaxRetriesMin = 0
	// MaxRetriesMax is the maximum number of retries.
	MaxRetriesMax = 10
	// SearchLimitMin is the minimum search limit.
	SearchLimitMin = 1
	// SearchLimitMax is the maximum search limit.
	SearchLimitMax = 100
	// PerPageMin is the minimum per page value.
	PerPageMin = 1
	// PerPageMax is the maximum per page value.
	PerPageMax = 1000
)
