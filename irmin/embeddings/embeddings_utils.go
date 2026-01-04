package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/nguyenthenguyen/docx"
	"github.com/xuri/excelize/v2"
	"gopkg.in/yaml.v3"
)

// GetSupportedFormats returns a list of file extensions supported for embedding creation.
func GetSupportedFormats() []string {
	return []string{
		".txt", ".md", // Plain text
		".csv",              // CSV
		".json",             // JSON
		".jsonl", ".ndjson", // JSONL
		".tsv", ".tab", // TSV
		".parquet",       // Parquet
		".xlsx", ".xlsm", // Excel (XLSX and macro-enabled XLSX only)
		".xml",          // XML
		".yaml", ".yml", // YAML
		".pdf",  // PDF
		".docx", // Word
	}
}

// IsSupportedFormat checks if the given file extension is supported for text extraction.
func IsSupportedFormat(fileName string) bool {
	ext := strings.ToLower(filepath.Ext(fileName))
	supportedFormats := GetSupportedFormats()
	return slices.Contains(supportedFormats, ext)
}

// ExtractTextFromFile extracts text content from a file based on its format.
// Returns a slice of text strings that can be chunked and embedded.
func ExtractTextFromFile(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	fileContent []byte,
	fileName string,
) ([]string, error) {
	if len(fileContent) == 0 {
		return nil, errors.New("file content is empty")
	}

	ext := strings.ToLower(filepath.Ext(fileName))

	switch ext {
	case ".txt", ".md":
		return extractFromPlainText(fileContent)
	case ".csv":
		return extractFromCSV(ctx, duckDBClient, fileContent, fileName)
	case ".json":
		return extractFromJSON(ctx, duckDBClient, fileContent, fileName)
	case ".jsonl", ".ndjson":
		return extractFromJSONL(ctx, duckDBClient, fileContent, fileName)
	case ".tsv", ".tab":
		return extractFromTSV(ctx, duckDBClient, fileContent, fileName)
	case ".parquet":
		return extractFromParquet(ctx, duckDBClient, fileContent, fileName)
	case ".xlsx", ".xlsm":
		return extractFromExcel(fileContent, fileName)
	case ".xml":
		return extractFromXML(fileContent)
	case ".yaml", ".yml":
		return extractFromYAML(fileContent)
	case ".pdf":
		return extractFromPDF(fileContent)
	case ".docx":
		return extractFromDOCX(fileContent)
	default:
		return nil, fmt.Errorf("unsupported file format: %s", ext)
	}
}

// extractFromPlainText extracts text from plain text files (txt, md).
func extractFromPlainText(content []byte) ([]string, error) {
	text := strings.TrimSpace(string(content))
	if text == "" {
		return nil, nil
	}
	return []string{text}, nil
}

// extractFromCSV extracts text from CSV files by concatenating all text fields.
func extractFromCSV(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
) ([]string, error) {
	return extractFromStructuredFile(ctx, duckDBClient, content, fileName, "read_csv_auto")
}

// extractFromJSON extracts text from JSON files.
func extractFromJSON(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
) ([]string, error) {
	return extractFromStructuredFile(ctx, duckDBClient, content, fileName, "read_json_auto")
}

// extractFromJSONL extracts text from JSONL/NDJSON files.
func extractFromJSONL(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
) ([]string, error) {
	// For JSONL, we can use read_json_auto with newline_delimited format
	return extractFromStructuredFile(ctx, duckDBClient, content, fileName, "read_json_auto")
}

// extractFromTSV extracts text from TSV files.
func extractFromTSV(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
) ([]string, error) {
	return extractFromStructuredFile(ctx, duckDBClient, content, fileName, "read_csv_auto")
}

// extractFromStructuredFile uses DuckDB to extract text from structured files.
//
//nolint:gocognit // This function is complex but it is necessary to extract text from structured files.
func extractFromStructuredFile(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
	readFunction string,
) ([]string, error) {
	// Write content to a temporary file for DuckDB to read
	tempFile, err := os.CreateTemp("", "embed_*"+filepath.Ext(fileName))
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Build query to extract all text columns concatenated
	// First, get the schema to identify text columns
	escapedPath := duckdb.EscapeSQLString(tempFile.Name())

	// Query to get all data and concatenate text fields
	query := fmt.Sprintf(`
		SELECT * FROM %s('%s')
	`, readFunction, escapedPath)

	rows, err := duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query file: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	var texts []string

	// Scan each row and concatenate all string values
	for rows.Next() {
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
			return nil, fmt.Errorf("failed to scan row: %w", scanErr)
		}

		var textParts []string
		for _, v := range values {
			if v == nil {
				continue
			}
			// Convert value to string representation
			strVal := convertToString(v)
			if strVal != "" {
				textParts = append(textParts, strVal)
			}
		}

		if len(textParts) > 0 {
			texts = append(texts, strings.Join(textParts, " "))
		}
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating rows: %w", rowsErr)
	}

	return texts, nil
}

// convertToString converts a value to its string representation.
func convertToString(v any) string {
	switch val := v.(type) {
	case string:
		return strings.TrimSpace(val)
	case []byte:
		return strings.TrimSpace(string(val))
	case nil:
		return ""
	default:
		// For other types (numbers, booleans, etc.), use JSON marshaling
		bytes, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		// Remove quotes from JSON string representation
		result := string(bytes)
		if len(result) >= 2 && result[0] == '"' && result[len(result)-1] == '"' {
			result = result[1 : len(result)-1]
		}
		return result
	}
}

// ChunkText splits text into chunks of the specified size with overlap.
func ChunkText(text string, chunkSize, overlap int) []string {
	if chunkSize <= 0 {
		chunkSize = DefaultChunkSize
	}
	if overlap < 0 {
		overlap = 0
	}
	const defaultOverlapDivisor = 2
	if overlap >= chunkSize {
		overlap = chunkSize / defaultOverlapDivisor
	}

	// Check for empty or whitespace-only text
	if text == "" || strings.TrimSpace(text) == "" {
		return nil
	}

	// Convert to runes for proper character-based chunking
	runes := []rune(text)
	textLen := len(runes)

	// If text is smaller than chunk size, return as single chunk
	if textLen <= chunkSize {
		return []string{text}
	}

	var chunks []string
	step := chunkSize - overlap

	for i := 0; i < textLen; i += step {
		end := i + chunkSize
		if end > textLen {
			end = textLen
		}

		chunk := string(runes[i:end])
		// Don't trim or skip chunks - preserve all content including whitespace
		// Applications that want trimmed content can do so after chunking
		chunks = append(chunks, chunk)

		// If we've reached the end, stop
		if end >= textLen {
			break
		}
	}

	return chunks
}

// ChunkTextBySentences splits text into chunks by sentence boundaries.
// This provides more semantically meaningful chunks.
//
//nolint:gocognit,funlen // This function is complex but it is necessary to split text into sentences.
func ChunkTextBySentences(text string, maxChunkSize int) []string {
	if maxChunkSize <= 0 {
		maxChunkSize = DefaultChunkSize
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	// Split by common sentence endings
	sentenceEndings := []string{". ", "! ", "? ", ".\n", "!\n", "?\n"}

	var sentences []string
	remaining := text

	for len(remaining) > 0 {
		// Find the earliest sentence ending
		minIdx := len(remaining)
		endLen := 0

		for _, ending := range sentenceEndings {
			idx := strings.Index(remaining, ending)
			if idx >= 0 && idx < minIdx {
				minIdx = idx
				endLen = len(ending)
			}
		}

		if minIdx == len(remaining) {
			// No sentence ending found, take the rest
			sentences = append(sentences, strings.TrimSpace(remaining))
			break
		}

		sentence := strings.TrimSpace(remaining[:minIdx+endLen])
		if sentence != "" {
			sentences = append(sentences, sentence)
		}
		remaining = remaining[minIdx+endLen:]
	}

	// Combine sentences into chunks that don't exceed maxChunkSize
	var chunks []string
	var currentChunk strings.Builder
	var currentChunkRuneLen int // Track rune length, not byte length

	for _, sentence := range sentences {
		sentenceRunes := []rune(sentence)
		sentenceLen := len(sentenceRunes) // Use character count, not byte count

		// If adding this sentence would exceed maxChunkSize
		if currentChunkRuneLen+sentenceLen+1 > maxChunkSize && currentChunkRuneLen > 0 {
			chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
			currentChunk.Reset()
			currentChunkRuneLen = 0
		}

		// If a single sentence exceeds maxChunkSize, we need to split it
		if sentenceLen > maxChunkSize {
			// If we have content in current chunk, save it first
			if currentChunkRuneLen > 0 {
				chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
				currentChunk.Reset()
				currentChunkRuneLen = 0
			}

			// Split the oversized sentence using character-based chunking
			for i := 0; i < len(sentenceRunes); i += maxChunkSize {
				end := i + maxChunkSize
				if end > len(sentenceRunes) {
					end = len(sentenceRunes)
				}
				chunk := string(sentenceRunes[i:end])
				chunks = append(chunks, strings.TrimSpace(chunk))
			}
			continue
		}

		if currentChunkRuneLen > 0 {
			currentChunk.WriteString(" ")
			currentChunkRuneLen++ // Account for the space
		}
		currentChunk.WriteString(sentence)
		currentChunkRuneLen += sentenceLen
	}

	if currentChunkRuneLen > 0 {
		chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
	}

	return chunks
}

// extractFromParquet extracts text from Parquet files by querying all columns.
func extractFromParquet(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	content []byte,
	fileName string,
) ([]string, error) {
	return extractFromStructuredFile(ctx, duckDBClient, content, fileName, "read_parquet")
}

// extractFromExcel extracts text from Excel files using the Excelize library.
// This provides consistent handling without requiring DuckDB's spatial extension.
func extractFromExcel(
	content []byte,
	fileName string,
) ([]string, error) {
	// Create a temporary file for the Excel content
	tempFile, err := os.CreateTemp("", "embed_*"+filepath.Ext(fileName))
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Open the Excel file using Excelize
	f, err := excelize.OpenFile(tempFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer func() {
		_ = f.Close() // Ignore close error in defer
	}()

	var texts []string

	// Iterate over all sheets and extract text from cells
	for _, sheetName := range f.GetSheetList() {
		rows, getSheetListRowsErr := f.GetRows(sheetName)
		if getSheetListRowsErr != nil {
			return nil, fmt.Errorf("failed to get rows from sheet %s: %w", sheetName, getSheetListRowsErr)
		}

		// Process each row
		for _, row := range rows {
			joinedText := strings.Join(utils.ConvertToStringSlice(row), " ")
			// Only append rows with meaningful content (non-empty after trimming whitespace)
			if strings.TrimSpace(joinedText) != "" {
				texts = append(texts, joinedText)
			}
		}
	}

	return texts, nil
}

// xmlNode represents a simple XML node for text extraction.
type xmlNode struct {
	XMLName xml.Name  `xml:""`
	Content string    `xml:",chardata"`
	Nodes   []xmlNode `xml:",any"`
}

// extractFromXML extracts text content from XML files.
func extractFromXML(content []byte) ([]string, error) {
	var node xmlNode
	if err := xml.Unmarshal(content, &node); err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}

	// Extract all text content from the XML tree
	text := extractXMLText(&node)
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, nil
	}

	return []string{text}, nil
}

// extractXMLText recursively extracts text from XML nodes.
func extractXMLText(node *xmlNode) string {
	var parts []string

	// Add content from this node
	if trimmed := strings.TrimSpace(node.Content); trimmed != "" {
		parts = append(parts, trimmed)
	}

	// Recursively extract from child nodes
	for i := range node.Nodes {
		if childText := extractXMLText(&node.Nodes[i]); childText != "" {
			parts = append(parts, childText)
		}
	}

	return strings.Join(parts, " ")
}

// extractFromYAML extracts text content from YAML files.
func extractFromYAML(content []byte) ([]string, error) {
	var data any
	if err := yaml.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	// Extract all string values from the YAML structure
	text := extractYAMLText(data)
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, nil
	}

	return []string{text}, nil
}

// extractYAMLText recursively extracts text from YAML data structures.
func extractYAMLText(data any) string {
	var parts []string

	switch v := data.(type) {
	case string:
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			parts = append(parts, trimmed)
		}
	case map[string]any:
		// Sort keys to ensure deterministic iteration order
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			if text := extractYAMLText(v[k]); text != "" {
				parts = append(parts, text)
			}
		}
	case []any:
		for _, item := range v {
			if text := extractYAMLText(item); text != "" {
				parts = append(parts, text)
			}
		}
	// For numbers, booleans, etc., we convert to string
	case int, int64, float64, bool:
		parts = append(parts, fmt.Sprintf("%v", v))
	}

	return strings.Join(parts, " ")
}

// extractFromPDF extracts text content from PDF files using ledongthuc/pdf.
// This is a pure Go implementation with no external dependencies.
func extractFromPDF(content []byte) ([]string, error) {
	// Create a temporary file for the PDF content
	tempFile, err := os.CreateTemp("", "embed_*.pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Open the PDF file
	f, r, err := pdf.Open(tempFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF: %w", err)
	}
	defer f.Close()

	// Extract plain text from the PDF
	var buf bytes.Buffer
	b, err := r.GetPlainText()
	if err != nil {
		return nil, fmt.Errorf("failed to extract text from PDF: %w", err)
	}
	if _, copyErr := buf.ReadFrom(b); copyErr != nil {
		return nil, fmt.Errorf("failed to read PDF text: %w", copyErr)
	}

	text := strings.TrimSpace(buf.String())
	if text == "" {
		return nil, nil
	}

	return []string{text}, nil
}

// XML structures for parsing Word documents.
// Word documents use the 'w:' namespace prefix. Go's xml package
// matches element local names, so "p" matches both <p> and <w:p>.
type docxText struct {
	XMLName xml.Name `xml:"t"`
	Text    string   `xml:",chardata"`
}

type docxRun struct {
	XMLName xml.Name   `xml:"r"`
	Texts   []docxText `xml:"t"`
}

type docxParagraph struct {
	XMLName xml.Name  `xml:"p"`
	Runs    []docxRun `xml:"r"`
}

type docxBody struct {
	XMLName    xml.Name        `xml:"body"`
	Paragraphs []docxParagraph `xml:"p"`
}

type docxDocument struct {
	XMLName xml.Name `xml:"document"`
	Body    docxBody `xml:"body"`
}

// docxHasContent checks if the parsed document contains any text.
func docxHasContent(doc *docxDocument) bool {
	for _, para := range doc.Body.Paragraphs {
		for _, run := range para.Runs {
			for _, t := range run.Texts {
				if strings.TrimSpace(t.Text) != "" {
					return true
				}
			}
		}
	}
	return false
}

// docxExtractText extracts text from a parsed DOCX document.
func docxExtractText(doc *docxDocument) string {
	var textParts []string
	for _, para := range doc.Body.Paragraphs {
		paraText := docxExtractParagraphText(&para)
		if paraText != "" {
			textParts = append(textParts, paraText)
		}
	}
	return strings.Join(textParts, "\n")
}

// docxExtractParagraphText extracts text from a single paragraph.
func docxExtractParagraphText(para *docxParagraph) string {
	var paraText strings.Builder
	for _, run := range para.Runs {
		for _, t := range run.Texts {
			if trimmed := strings.TrimSpace(t.Text); trimmed != "" {
				if paraText.Len() > 0 {
					paraText.WriteString(" ")
				}
				paraText.WriteString(trimmed)
			}
		}
	}
	return paraText.String()
}

// extractFromDOCX extracts text content from Word DOCX files.
// DOCX files are ZIP archives containing XML. We extract text from document.xml.
func extractFromDOCX(content []byte) ([]string, error) {
	xmlContent, err := readDOCXContent(content)
	if err != nil {
		return nil, err
	}

	// Try to parse the XML structure
	var wdoc docxDocument
	xmlUnmarshalErr := xml.Unmarshal([]byte(xmlContent), &wdoc)

	// If XML parsing failed or extracted no content, use fallback
	if xmlUnmarshalErr != nil || !docxHasContent(&wdoc) {
		text := stripXMLTags(xmlContent)
		if text == "" {
			return nil, nil
		}
		return []string{text}, nil
	}

	// Extract text from parsed document
	text := docxExtractText(&wdoc)
	if text == "" {
		// Fallback if structured extraction yielded nothing
		text = stripXMLTags(xmlContent)
		if text == "" {
			return nil, nil
		}
	}

	return []string{text}, nil
}

// readDOCXContent reads the XML content from a DOCX file.
func readDOCXContent(content []byte) (string, error) {
	// Create a temporary file for the DOCX content
	tempFile, err := os.CreateTemp("", "embed_*.docx")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return "", fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return "", fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Open the DOCX file
	r, err := docx.ReadDocxFile(tempFile.Name())
	if err != nil {
		return "", fmt.Errorf("failed to open DOCX: %w", err)
	}
	defer r.Close()

	// Get the editable document and return XML content
	doc := r.Editable()
	return doc.GetContent(), nil
}

// stripXMLTags removes XML tags from a string as a fallback method.
func stripXMLTags(xmlContent string) string {
	var result strings.Builder
	inTag := false

	for _, char := range xmlContent {
		if char == '<' {
			inTag = true
			continue
		}
		if char == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result.WriteRune(char)
		}
	}

	// Clean up whitespace
	text := result.String()
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")

	// Remove excessive whitespace
	lines := strings.Split(text, "\n")
	var cleanLines []string
	for _, line := range lines {
		if trimmed := strings.TrimSpace(line); trimmed != "" {
			cleanLines = append(cleanLines, trimmed)
		}
	}

	return strings.Join(cleanLines, "\n")
}
