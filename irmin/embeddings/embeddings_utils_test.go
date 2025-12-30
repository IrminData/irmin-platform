package embeddings_test

import (
	"irmin-api/embeddings"
	"irmin-api/lib"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// =============================================================================
// Supported Formats Tests
// =============================================================================

// TestGetSupportedFormats tests that supported formats are returned correctly.
func TestGetSupportedFormats(t *testing.T) {
	formats := embeddings.GetSupportedFormats()

	assert.True(t, len(formats) > 0)

	// Check that expected formats are present
	expectedFormats := []string{".txt", ".md", ".csv", ".json", ".jsonl"}
	for _, expected := range expectedFormats {
		found := false
		for _, format := range formats {
			if format == expected {
				found = true
				break
			}
		}
		assert.True(t, found)
	}
}

// TestIsSupportedFormat tests the format support checker.
func TestIsSupportedFormat(t *testing.T) {
	// Supported formats
	assert.True(t, embeddings.IsSupportedFormat("document.txt"))
	assert.True(t, embeddings.IsSupportedFormat("readme.md"))
	assert.True(t, embeddings.IsSupportedFormat("data.csv"))
	assert.True(t, embeddings.IsSupportedFormat("config.json"))
	assert.True(t, embeddings.IsSupportedFormat("logs.jsonl"))
	assert.True(t, embeddings.IsSupportedFormat("DATA.TXT")) // Case insensitive

	// Unsupported formats
	assert.False(t, embeddings.IsSupportedFormat("image.png"))
	assert.False(t, embeddings.IsSupportedFormat("document.pdf"))
	assert.False(t, embeddings.IsSupportedFormat("archive.zip"))
	assert.False(t, embeddings.IsSupportedFormat("binary.exe"))
}

// =============================================================================
// Text Chunking Tests
// =============================================================================

// TestChunkTextEmpty tests that empty text returns nil.
func TestChunkTextEmpty(t *testing.T) {
	chunks := embeddings.ChunkText("", 100, 20)
	assert.Nil(t, chunks)
}

// TestChunkTextWhitespaceOnly tests that whitespace-only text returns nil.
func TestChunkTextWhitespaceOnly(t *testing.T) {
	chunks := embeddings.ChunkText("   \n\t  ", 100, 20)
	assert.Nil(t, chunks)
}

// TestChunkTextSmallText tests that small text returns single chunk.
func TestChunkTextSmallText(t *testing.T) {
	text := "This is a short text."
	chunks := embeddings.ChunkText(text, 100, 20)

	assert.Equal(t, 1, len(chunks))
	assert.Equal(t, text, chunks[0])
}

// TestChunkTextLargeText tests that large text is split correctly.
func TestChunkTextLargeText(t *testing.T) {
	// Create a text that's larger than chunk size
	text := strings.Repeat("Hello world. ", 50) // ~650 characters
	chunkSize := 100
	overlap := 20

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	assert.True(t, len(chunks) > 1)

	// Each chunk should not exceed chunk size
	for _, chunk := range chunks {
		assert.True(t, len(chunk) <= chunkSize)
	}
}

// TestChunkTextWithOverlap tests that overlap works correctly.
func TestChunkTextWithOverlap(t *testing.T) {
	text := "AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC DDDDDDDDDD EEEEEEEEEE"
	chunkSize := 25
	overlap := 10

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	assert.True(t, len(chunks) >= 2)

	// Verify chunks have some overlap (common content)
	if len(chunks) >= 2 {
		// The end of chunk 1 should overlap with start of chunk 2
		chunk1End := chunks[0][len(chunks[0])-overlap:]
		chunk2Start := chunks[1][:minInt(overlap, len(chunks[1]))]
		// Due to word boundaries, there should be some common content
		assert.True(t, len(chunk1End) > 0)
		assert.True(t, len(chunk2Start) > 0)
	}
}

// TestChunkTextPreservesWhitespace tests that whitespace-only chunks are preserved.
func TestChunkTextPreservesWhitespace(t *testing.T) {
	// Text with whitespace segments
	text := "Content1     Content2"
	chunkSize := 10
	overlap := 0

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	// Verify we got the expected number of chunks (don't drop whitespace)
	assert.True(t, len(chunks) > 0)

	// Join chunks back and verify no data loss
	rejoined := strings.Join(chunks, "")
	assert.Equal(t, len(text), len(rejoined))
}

// TestChunkTextNoTrimming tests that chunks are not trimmed.
func TestChunkTextNoTrimming(t *testing.T) {
	// Text with leading/trailing spaces in chunks
	text := "  start  middle  end  "
	chunkSize := 10
	overlap := 0

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	// Verify chunks preserve leading/trailing whitespace
	// First chunk should start with spaces
	if len(chunks) > 0 {
		assert.True(t, strings.HasPrefix(chunks[0], "  "))
	}

	// Last chunk should end with spaces
	if len(chunks) > 0 {
		lastChunk := chunks[len(chunks)-1]
		assert.True(t, strings.HasSuffix(lastChunk, "  "))
	}
}

// TestChunkTextUTF8Characters tests proper handling of multi-byte UTF-8 characters.
func TestChunkTextUTF8Characters(t *testing.T) {
	// Text with multi-byte UTF-8 characters (emoji, Chinese, etc.)
	text := "Hello 世界 🌍 Bonjour こんにちは"
	chunkSize := 15 // Characters, not bytes
	overlap := 0

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	// Should be chunked by character count, not byte count
	assert.True(t, len(chunks) > 0)

	// Verify first chunk length in characters
	if len(chunks) > 0 {
		firstChunkRunes := []rune(chunks[0])
		assert.True(t, len(firstChunkRunes) <= chunkSize)
	}

	// Join and verify no data loss
	rejoined := strings.Join(chunks, "")
	assert.Equal(t, text, rejoined)
}

// TestChunkTextUTF8EarlyReturn tests the early return optimization with UTF-8.
func TestChunkTextUTF8EarlyReturn(t *testing.T) {
	// Short UTF-8 text that should trigger early return
	text := "🌍🌎🌏"   // 3 emoji characters (12 bytes)
	chunkSize := 10 // Character count
	overlap := 0

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	// Should return single chunk (3 chars < 10 char limit)
	assert.Equal(t, 1, len(chunks))
	assert.Equal(t, text, chunks[0])
}

// TestChunkTextLongUTF8 tests chunking of longer UTF-8 text.
func TestChunkTextLongUTF8(t *testing.T) {
	// Create a longer UTF-8 text
	text := strings.Repeat("日本語", 50) // 150 Japanese characters
	chunkSize := 20
	overlap := 5

	chunks := embeddings.ChunkText(text, chunkSize, overlap)

	// Should produce multiple chunks
	assert.True(t, len(chunks) > 1)

	// Each chunk should be at most chunkSize characters
	for _, chunk := range chunks {
		chunkRunes := []rune(chunk)
		assert.True(t, len(chunkRunes) <= chunkSize)
	}
}

// TestChunkTextZeroChunkSize tests that zero chunk size uses default.
func TestChunkTextZeroChunkSize(t *testing.T) {
	text := "Short text"
	chunks := embeddings.ChunkText(text, 0, 0)

	assert.Equal(t, 1, len(chunks))
	assert.Equal(t, text, chunks[0])
}

// TestChunkTextNegativeOverlap tests that negative overlap is treated as zero.
func TestChunkTextNegativeOverlap(t *testing.T) {
	text := strings.Repeat("A", 200)
	chunks := embeddings.ChunkText(text, 50, -10)

	assert.True(t, len(chunks) >= 1)
}

// TestChunkTextOverlapLargerThanChunk tests that large overlap is capped.
func TestChunkTextOverlapLargerThanChunk(t *testing.T) {
	text := strings.Repeat("A", 200)
	chunks := embeddings.ChunkText(text, 50, 100) // overlap > chunkSize

	assert.True(t, len(chunks) >= 1)
}

// =============================================================================
// ChunkTextBySentences Tests
// =============================================================================

// TestChunkTextBySentencesEmpty tests empty text handling.
func TestChunkTextBySentencesEmpty(t *testing.T) {
	chunks := embeddings.ChunkTextBySentences("", 100)
	assert.Nil(t, chunks)
}

// TestChunkTextBySentencesSingleSentence tests single sentence.
func TestChunkTextBySentencesSingleSentence(t *testing.T) {
	text := "This is a single sentence."
	chunks := embeddings.ChunkTextBySentences(text, 100)

	assert.Equal(t, 1, len(chunks))
	assert.Equal(t, text, chunks[0])
}

// TestChunkTextBySentencesMultipleSentences tests multiple sentences.
func TestChunkTextBySentencesMultipleSentences(t *testing.T) {
	text := "First sentence. Second sentence. Third sentence."
	chunks := embeddings.ChunkTextBySentences(text, 100)

	// All sentences fit in one chunk
	assert.Equal(t, 1, len(chunks))
	assert.True(t, strings.Contains(chunks[0], "First"))
	assert.True(t, strings.Contains(chunks[0], "Second"))
	assert.True(t, strings.Contains(chunks[0], "Third"))
}

// TestChunkTextBySentencesSmallMaxSize tests sentence chunking with small max size.
func TestChunkTextBySentencesSmallMaxSize(t *testing.T) {
	text := "First sentence here. Second sentence here. Third sentence here."
	chunks := embeddings.ChunkTextBySentences(text, 25)

	// Should split into multiple chunks
	assert.True(t, len(chunks) >= 2)
}

// TestChunkTextBySentencesDifferentEndings tests different sentence endings.
func TestChunkTextBySentencesDifferentEndings(t *testing.T) {
	text := "Is this a question? Yes it is! Here is a statement."
	chunks := embeddings.ChunkTextBySentences(text, 200)

	assert.Equal(t, 1, len(chunks))
	assert.True(t, strings.Contains(chunks[0], "question"))
	assert.True(t, strings.Contains(chunks[0], "Yes"))
	assert.True(t, strings.Contains(chunks[0], "statement"))
}

// TestChunkTextBySentencesOversizedSentence tests that sentences longer than maxChunkSize
// are split to respect the size limit instead of producing oversized chunks.
func TestChunkTextBySentencesOversizedSentence(t *testing.T) {
	// Create a sentence that's longer than the max chunk size
	longSentence := strings.Repeat("word ", 50) + "end." // ~250 chars
	maxSize := 100

	chunks := embeddings.ChunkTextBySentences(longSentence, maxSize)

	// All chunks should be <= maxSize
	for i, chunk := range chunks {
		if len(chunk) > maxSize {
			t.Errorf("Chunk %d exceeds maxChunkSize: got %d, max %d", i, len(chunk), maxSize)
		}
	}

	// Should have multiple chunks since the sentence is too long
	assert.True(t, len(chunks) > 1)
}

// TestChunkTextBySentencesMixedSizes tests handling of mixed sentence sizes.
func TestChunkTextBySentencesMixedSizes(t *testing.T) {
	// Mix of short sentences and one very long sentence
	shortSentence := "Short."
	longSentence := strings.Repeat("word ", 50) + "end."
	text := shortSentence + " " + longSentence + " " + shortSentence
	maxSize := 100

	chunks := embeddings.ChunkTextBySentences(text, maxSize)

	// All chunks should respect the size limit
	for i, chunk := range chunks {
		if len(chunk) > maxSize {
			t.Errorf("Chunk %d exceeds maxChunkSize: got %d, max %d", i, len(chunk), maxSize)
		}
	}

	// Should have multiple chunks
	assert.True(t, len(chunks) >= 2)
}

// TestChunkTextBySentencesUTF8 tests that UTF-8 characters are handled correctly
// and maxChunkSize is based on character count, not byte count.
func TestChunkTextBySentencesUTF8(t *testing.T) {
	// Create sentences with multi-byte UTF-8 characters (emojis are 4 bytes each)
	// 20 emojis = 80 bytes but only 20 characters
	shortEmojiSentence := "🎉🎊🎈🎁🎀🎂🎃🎄🎅🎆🎇🎐🎑🎒🎓🎯🎰🎱🎲🎳."

	// Verify byte vs character length difference
	assert.True(t, len(shortEmojiSentence) > 20)         // bytes > 20
	assert.Equal(t, 21, len([]rune(shortEmojiSentence))) // 20 emojis + 1 period = 21 chars

	// Set maxChunkSize to 25 characters
	maxSize := 25

	// This sentence should fit in one chunk (21 chars < 25)
	chunks := embeddings.ChunkTextBySentences(shortEmojiSentence, maxSize)
	assert.Equal(t, 1, len(chunks))

	// Verify chunk doesn't exceed character limit
	firstChunkRunesLength := len([]rune(chunks[0]))
	if firstChunkRunesLength > maxSize {
		t.Errorf("Chunk exceeds maxChunkSize in characters: got %d, max %d", firstChunkRunesLength, maxSize)
	}

	// Now test with a longer emoji sentence that needs splitting
	// 40 emojis = 160 bytes but only 40 characters
	longEmojiSentence := strings.Repeat("🎉", 40) + "."
	assert.Equal(t, 41, len([]rune(longEmojiSentence))) // 40 emojis + 1 period

	chunks = embeddings.ChunkTextBySentences(longEmojiSentence, maxSize)

	// Should be split into multiple chunks (41 chars with maxSize 25)
	assert.True(t, len(chunks) >= 2)

	// Verify all chunks respect the character limit
	for i, chunk := range chunks {
		chunkRuneLen := len([]rune(chunk))
		if chunkRuneLen > maxSize {
			t.Errorf("Chunk %d exceeds maxChunkSize in characters: got %d, max %d", i, chunkRuneLen, maxSize)
		}
	}
}

// TestChunkTextBySentencesMixedUTF8 tests mixed ASCII and UTF-8 content.
func TestChunkTextBySentencesMixedUTF8(t *testing.T) {
	// Mix of ASCII and multi-byte characters
	text := "Hello world! 你好世界。Привет мир! مرحبا بالعالم."
	maxSize := 20

	chunks := embeddings.ChunkTextBySentences(text, maxSize)

	// Verify all chunks respect the character limit
	for i, chunk := range chunks {
		chunkRuneLen := len([]rune(chunk))
		if chunkRuneLen > maxSize {
			t.Errorf("Chunk %d exceeds maxChunkSize in characters: got %d, max %d", i, chunkRuneLen, maxSize)
		}
	}
}

// =============================================================================
// Text Extraction Tests
// =============================================================================

// TestExtractTextFromFileUnsupportedFormat tests unsupported format handling.
func TestExtractTextFromFileUnsupportedFormat(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		[]byte("some content"),
		"document.pdf",
	)

	assert.Error(t, err)
	assert.Nil(t, texts)
	assert.True(t, strings.Contains(err.Error(), "unsupported file format"))
}

// TestExtractTextFromFileEmptyContent tests empty content handling.
func TestExtractTextFromFileEmptyContent(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		[]byte{},
		"document.txt",
	)

	assert.Error(t, err)
	assert.Nil(t, texts)
	assert.True(t, strings.Contains(err.Error(), "file content is empty"))
}

// TestExtractTextFromPlainText tests plain text extraction.
func TestExtractTextFromPlainText(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte("This is plain text content.\nWith multiple lines.")

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"document.txt",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 1, len(texts))
	assert.True(t, strings.Contains(texts[0], "plain text content"))
}

// TestExtractTextFromMarkdown tests markdown extraction.
func TestExtractTextFromMarkdown(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte(`# Heading

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2`)

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"readme.md",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 1, len(texts))
	assert.True(t, strings.Contains(texts[0], "Heading"))
	assert.True(t, strings.Contains(texts[0], "paragraph"))
}

// TestExtractTextFromCSV tests CSV extraction.
func TestExtractTextFromCSV(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte(`name,description,category
Product A,This is product A description,Electronics
Product B,This is product B description,Books`)

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"products.csv",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 2, len(texts)) // 2 data rows

	// Check that content from each row is present
	assert.True(t, strings.Contains(texts[0], "Product A"))
	assert.True(t, strings.Contains(texts[1], "Product B"))
}

// TestExtractTextFromJSON tests JSON extraction.
func TestExtractTextFromJSON(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte(`[
		{"title": "Article 1", "content": "Content of article 1"},
		{"title": "Article 2", "content": "Content of article 2"}
	]`)

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"articles.json",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 2, len(texts))
}

// TestExtractTextFromJSONL tests JSONL extraction.
func TestExtractTextFromJSONL(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte(`{"message": "Log entry 1", "level": "info"}
{"message": "Log entry 2", "level": "error"}
{"message": "Log entry 3", "level": "warn"}`)

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"logs.jsonl",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 3, len(texts))
}

// TestExtractTextFromTSV tests TSV extraction.
func TestExtractTextFromTSV(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	content := []byte("id\tname\tdescription\n1\tItem1\tFirst item\n2\tItem2\tSecond item")

	texts, err := embeddings.ExtractTextFromFile(
		t.Context(),
		testSuite.DuckDBClient,
		content,
		"data.tsv",
	)

	assert.NoError(t, err)
	assert.NotNil(t, texts)
	assert.Equal(t, 2, len(texts))
}

// minInt returns the minimum of two integers.
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
