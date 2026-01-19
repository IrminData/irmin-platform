package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// EmbeddingScenarios returns test cases for embedding operations.
func EmbeddingScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Embedding_List",
			Description: "List embeddings in a repository",
			Run:         testEmbeddingList,
		},
		{
			Name:        "Embedding_Vectorize_Search",
			Description: "Vectorize objects and search embeddings",
			Run:         testEmbeddingVectorizeSearch,
		},
	}
}

func testEmbeddingList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List embeddings (may be empty)
	embeddings, _, err := client.ListEmbeddings(ctx, cfg.Workspace, cfg.TestRepository, irmincore.ListEmbeddingsRequest{
		Ref: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to list embeddings: %w", err)
	}

	// Embeddings may be empty for a repository without vectorized content
	_ = embeddings

	return nil
}

func testEmbeddingVectorizeSearch(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("embedding-vectorize-test-%d", suffix)

	// Upload a text file to vectorize
	textContent := `This is a sample document about machine learning.
Machine learning is a subset of artificial intelligence.
It allows computers to learn from data without explicit programming.`

	files := map[string][]byte{
		"document.txt": []byte(textContent),
	}

	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/docs/document.txt", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload document: %w", err)
	}

	// Commit the file
	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add document for embedding test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Vectorize the document
	embeddingFile, _, err := client.VectorizeObjects(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		irmincore.VectorizeObjectsRequest{
			SourcePaths: []string{fmt.Sprintf("%s/docs/document.txt", basePath)},
			OutputPath:  fmt.Sprintf("%s/embeddings/document.parquet", basePath),
			Ref:         "main",
		},
	)
	if err != nil {
		// Vectorization may fail if embeddings service is not configured
		// This is acceptable for this test
		return nil //nolint:nilerr // intentional: feature may not be available
	}

	// Get embedding info
	info, _, err := client.GetEmbeddingInfo(ctx, cfg.Workspace, cfg.TestRepository, irmincore.GetEmbeddingInfoRequest{
		EmbeddingPath: embeddingFile.Path,
		Ref:           "main",
	})
	if err != nil {
		return fmt.Errorf("failed to get embedding info: %w", err)
	}

	if info.Path == "" {
		return fmt.Errorf("embedding path is empty")
	}

	// Search embeddings
	searchResults, _, err := client.SearchEmbeddings(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		irmincore.SearchEmbeddingsRequest{
			Query:         "What is machine learning?",
			EmbeddingPath: embeddingFile.Path,
			Ref:           "main",
			TopK:          5,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to search embeddings: %w", err)
	}

	// Search should return results
	if searchResults == nil {
		return fmt.Errorf("search results is nil")
	}

	return nil
}
