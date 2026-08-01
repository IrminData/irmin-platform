package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestDetermineEditorItemLanguageFromPath(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected *string
	}{
		// JavaScript files
		{name: "js file", input: "/path/to/script.js", expected: utils.StringPtr("js")},
		{name: "js file no path", input: "script.js", expected: utils.StringPtr("js")},
		{name: "js file relative", input: "path/to/script.js", expected: utils.StringPtr("js")},

		// JSON files
		{name: "json file", input: "/config/data.json", expected: utils.StringPtr("json")},
		{name: "json file simple", input: "data.json", expected: utils.StringPtr("json")},

		// SQL files
		{name: "sql file", input: "/queries/select.sql", expected: utils.StringPtr("sql")},
		{name: "sql file simple", input: "query.sql", expected: utils.StringPtr("sql")},

		// Go files
		{name: "go file", input: "/src/main.go", expected: utils.StringPtr("go")},
		{name: "go file simple", input: "main.go", expected: utils.StringPtr("go")},

		// Python files
		{name: "python file", input: "/scripts/app.py", expected: utils.StringPtr("py")},
		{name: "python file simple", input: "app.py", expected: utils.StringPtr("py")},

		// Case insensitive
		{name: "uppercase extension", input: "SCRIPT.JS", expected: utils.StringPtr("js")},
		{name: "mixed case extension", input: "Script.Py", expected: utils.StringPtr("py")},
		{name: "mixed case", input: "FILE.JSON", expected: utils.StringPtr("json")},

		// Unsupported extensions default to txt
		{name: "txt file", input: "readme.txt", expected: utils.StringPtr("txt")},
		{name: "unknown extension", input: "file.xyz", expected: utils.StringPtr("txt")},
		{name: "cpp file", input: "main.cpp", expected: utils.StringPtr("txt")},
		{name: "html file", input: "index.html", expected: utils.StringPtr("txt")},

		// Directories/groups (no extension)
		{name: "directory", input: "/path/to/group", expected: nil},
		{name: "directory simple", input: "group", expected: nil},
		{name: "nested directory", input: "path/to/group", expected: nil},

		// Edge cases
		{name: "empty path", input: "", expected: nil},
		{name: "root path", input: "/", expected: nil},
		{name: "only slashes", input: "///", expected: nil},
		{name: "file with no extension", input: "Makefile", expected: nil},
		{name: "hidden file with extension", input: ".gitignore.js", expected: utils.StringPtr("js")},
		{name: "hidden file no extension", input: ".gitignore", expected: utils.StringPtr("txt")},
		{name: "dot file", input: ".env", expected: utils.StringPtr("txt")},

		// Complex paths
		{name: "nested path with js", input: "/very/deep/path/to/file.js", expected: utils.StringPtr("js")},
		{name: "path with dots", input: "/path.with.dots/file.py", expected: utils.StringPtr("py")},
		{name: "multiple extensions", input: "file.test.js", expected: utils.StringPtr("js")},

		// Path edge cases
		{name: "trailing slash", input: "/path/to/dir/", expected: nil},
		{name: "double slash", input: "//path//to//file.go", expected: utils.StringPtr("go")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.DetermineEditorItemLanguageFromPath(tt.input)

			if tt.expected == nil {
				if result != nil {
					t.Errorf("DetermineEditorItemLanguageFromPath(%q) = %v, expected nil", tt.input, *result)
				}
			} else {
				if result == nil {
					t.Errorf("DetermineEditorItemLanguageFromPath(%q) = nil, expected %q", tt.input, *tt.expected)
				} else if *result != *tt.expected {
					t.Errorf("DetermineEditorItemLanguageFromPath(%q) = %q, expected %q", tt.input, *result, *tt.expected)
				}
			}
		})
	}
}
