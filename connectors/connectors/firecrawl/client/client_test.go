package client_test

import (
	"strings"
	"testing"

	"irmin-connectors/connectors/firecrawl/client"

	"github.com/zeebo/assert"
)

// TestURLToFilename tests the URL to filename conversion.
func TestURLToFilename(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{
			name:     "simple URL",
			url:      "https://example.com/page",
			expected: "example.com_page",
		},
		{
			name:     "URL with multiple path segments",
			url:      "https://example.com/blog/2024/article",
			expected: "example.com_blog_2024_article",
		},
		{
			name:     "URL with special characters in path",
			url:      "https://example.com/page!test",
			expected: "example.com_pagetest",
		},
		{
			name:     "URL with query string",
			url:      "https://example.com/page?id=123&name=test",
			expected: "example.com_page_qid123nam",
		},
		{
			name:     "empty URL",
			url:      "",
			expected: "document",
		},
		{
			name:     "invalid URL",
			url:      "not a url",
			expected: "_not_a_url", // parsed as relative path
		},
		{
			name:     "very long URL gets truncated",
			url:      "https://example.com/" + strings.Repeat("a", 200),
			expected: "example.com_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // Truncated to 100 chars
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := client.URLToFilename(tt.url)
			assert.Equal(t, tt.expected, result)
			assert.That(t, len(result) <= 100)
		})
	}
}

// TestURLToFilename_Collisions tests that URLs that could produce collisions
// produce different base filenames when possible.
func TestURLToFilename_Collisions(t *testing.T) {
	tests := []struct {
		name  string
		url1  string
		url2  string
		equal bool
	}{
		{
			name:  "different query strings produce different filenames",
			url1:  "https://example.com/page?id=1",
			url2:  "https://example.com/page?id=2",
			equal: false,
		},
		{
			name:  "special characters removed but paths still different",
			url1:  "https://example.com/page-test",
			url2:  "https://example.com/pagetest",
			equal: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result1 := client.URLToFilename(tt.url1)
			result2 := client.URLToFilename(tt.url2)
			if tt.equal {
				assert.Equal(t, result1, result2)
			} else {
				assert.That(t, result1 != result2)
			}
		})
	}
}

// TestDeduplicateFilename tests the filename deduplication logic.
func TestDeduplicateFilename(t *testing.T) {
	tests := []struct {
		name           string
		filename       string
		existingFiles  map[string][]byte
		filenameCounts map[string]int
		expected       string
	}{
		{
			name:           "no collision - first file",
			filename:       "document.md",
			existingFiles:  map[string][]byte{},
			filenameCounts: map[string]int{},
			expected:       "document.md",
		},
		{
			name:     "collision - second file",
			filename: "document.md",
			existingFiles: map[string][]byte{
				"document.md": []byte("content1"),
			},
			filenameCounts: map[string]int{
				"document.md": 1,
			},
			expected: "document_2.md",
		},
		{
			name:     "collision - third file",
			filename: "document.md",
			existingFiles: map[string][]byte{
				"document.md":   []byte("content1"),
				"document_2.md": []byte("content2"),
			},
			filenameCounts: map[string]int{
				"document.md": 2,
			},
			expected: "document_3.md",
		},
		{
			name:     "collision - file without extension",
			filename: "document",
			existingFiles: map[string][]byte{
				"document": []byte("content1"),
			},
			filenameCounts: map[string]int{
				"document": 1,
			},
			expected: "document_2",
		},
		{
			name:     "collision - multiple dots in filename",
			filename: "my.file.name.md",
			existingFiles: map[string][]byte{
				"my.file.name.md": []byte("content1"),
			},
			filenameCounts: map[string]int{
				"my.file.name.md": 1,
			},
			expected: "my.file.name_2.md",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := client.DeduplicateFilename(tt.filename, tt.filenameCounts, tt.existingFiles)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestDeduplicateFilename_Sequential tests that sequential calls with the same filename
// produce correctly numbered files.
func TestDeduplicateFilename_Sequential(t *testing.T) {
	existingFiles := make(map[string][]byte)
	filenameCounts := make(map[string]int)

	// Add same filename 5 times
	filenames := []string{
		"document.md",
		"document_2.md",
		"document_3.md",
		"document_4.md",
		"document_5.md",
	}

	for i, expected := range filenames {
		result := client.DeduplicateFilename("document.md", filenameCounts, existingFiles)
		assert.Equal(t, expected, result)

		// Add to existing files to simulate the real usage
		existingFiles[result] = []byte("content" + string(rune('1'+i)))
	}
}

// TestSanitizeFilename tests filename sanitization.
func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "alphanumeric preserved",
			input:    "abc123XYZ",
			expected: "abc123XYZ",
		},
		{
			name:     "dots dashes underscores preserved",
			input:    "file.name-test_123",
			expected: "file.name-test_123",
		},
		{
			name:     "spaces converted to underscores",
			input:    "my file name",
			expected: "my_file_name",
		},
		{
			name:     "special characters removed",
			input:    "file!@#$%^&*()",
			expected: "file",
		},
		{
			name:     "mixed characters",
			input:    "My File: Test (2024)!",
			expected: "My_File_Test_2024",
		},
		{
			name:     "unicode characters removed",
			input:    "文档名称",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := client.SanitizeFilename(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCrawlCollisionHandling tests that the crawl operation handles filename collisions
// by verifying the deduplication logic with realistic scenarios.
func TestCrawlCollisionHandling(t *testing.T) {
	// Simulate multiple URLs that would produce the same filename
	urls := []string{
		"https://example.com/page",
		"https://example.com/page?ref=google",
		"https://example.com/page?ref=twitter",
	}

	files := make(map[string][]byte)
	filenameCounts := make(map[string]int)

	// Generate filenames from URLs
	for i, url := range urls {
		baseFilename := client.URLToFilename(url)
		filename := baseFilename + ".md"

		uniqueFilename := client.DeduplicateFilename(filename, filenameCounts, files)
		files[uniqueFilename] = []byte("content" + string(rune('1'+i)))
	}

	// Verify we have 3 unique files
	assert.Equal(t, 3, len(files))

	// Verify none of the content was overwritten
	foundContents := make(map[string]bool)
	for _, content := range files {
		foundContents[string(content)] = true
	}
	assert.Equal(t, 3, len(foundContents))
	assert.True(t, foundContents["content1"])
	assert.True(t, foundContents["content2"])
	assert.True(t, foundContents["content3"])
}

// TestCollisionScenarios tests the exact collision scenarios mentioned in the issue.
func TestCollisionScenarios(t *testing.T) {
	t.Run("special characters removed cause collision", func(t *testing.T) {
		// /page!test and /pagetest would have collided before
		url1 := "https://example.com/page!test"
		url2 := "https://example.com/pagetest"

		filename1 := client.URLToFilename(url1)
		filename2 := client.URLToFilename(url2)

		// Both produce the same base filename after sanitization
		assert.Equal(t, "example.com_pagetest", filename1)
		assert.Equal(t, "example.com_pagetest", filename2)

		// But deduplication handles this
		files := make(map[string][]byte)
		filenameCounts := make(map[string]int)

		unique1 := client.DeduplicateFilename(filename1+".md", filenameCounts, files)
		files[unique1] = []byte("content1")

		unique2 := client.DeduplicateFilename(filename2+".md", filenameCounts, files)
		files[unique2] = []byte("content2")

		assert.Equal(t, 2, len(files))
		assert.That(t, unique1 != unique2)
	})

	t.Run("truncation causes collision", func(t *testing.T) {
		// URLs that differ after character 100 would have collided
		longPath1 := strings.Repeat("a", 95) + "12345"
		longPath2 := strings.Repeat("a", 95) + "67890"

		url1 := "https://example.com/" + longPath1
		url2 := "https://example.com/" + longPath2

		filename1 := client.URLToFilename(url1)
		filename2 := client.URLToFilename(url2)

		// Both get truncated to the same 100 characters
		assert.Equal(t, 100, len(filename1))
		assert.Equal(t, 100, len(filename2))

		// But deduplication handles this
		files := make(map[string][]byte)
		filenameCounts := make(map[string]int)

		unique1 := client.DeduplicateFilename(filename1+".md", filenameCounts, files)
		files[unique1] = []byte("content1")

		unique2 := client.DeduplicateFilename(filename2+".md", filenameCounts, files)
		files[unique2] = []byte("content2")

		assert.Equal(t, 2, len(files))
		assert.That(t, unique1 != unique2)
	})

	t.Run("query strings ignored causes collision", func(t *testing.T) {
		// Query strings now produce different filenames
		url1 := "https://example.com/page?id=123"
		url2 := "https://example.com/page?id=456"

		filename1 := client.URLToFilename(url1)
		filename2 := client.URLToFilename(url2)

		// Query strings should make these different
		assert.That(t, filename1 != filename2)
	})
}
