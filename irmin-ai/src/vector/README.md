# Vector Services - RAG Implementation

This directory contains the vector services for implementing Retrieval Augmented Generation (RAG) in the Irmin AI system.

## Overview

RAG (Retrieval Augmented Generation) is a technique that combines information retrieval with text generation to provide more accurate and contextual responses. Our implementation follows the standard RAG architecture with two main phases:

1. **Indexing**: Processing and storing documents for later retrieval
2. **Retrieval + Generation**: Searching for relevant content and generating responses

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Documents     │    │   User Query     │
└─────────┬───────┘    └─────────┬────────┘
          │                      │
          ▼                      │
┌─────────────────┐              │
│  IndexingService │              │
├─────────────────┤              │
│ • Load docs     │              │
│ • Split text    │              │
│ • Create embeds │              │
│ • Store vectors │              │
└─────────┬───────┘              │
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌──────────────────┐
│  Vector Store   │    │ RetrievalService │
│   (Qdrant)      │◄───┤ • Search similar │
└─────────────────┘    │ • Rank results   │
                       │ • Prepare context│
                       └─────────┬────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │   Generated      │
                       │   Response       │
                       └──────────────────┘
```

## Services

### IndexingService

Handles the **Indexing** phase of RAG:

- **Document Loading**: Accepts documents in various formats
- **Text Splitting**: Chunks documents into manageable pieces
- **Embedding Creation**: Converts text to vector embeddings using OpenAI
- **Vector Storage**: Stores embeddings in Qdrant vector database

#### Key Methods

```typescript
// Create or connect to vector store
await indexingService.createVectorStore(config);
await indexingService.createNewVectorStore(config);

// Index documents
await indexingService.indexDocuments(vectorStore, documents);

// Create embeddings
await indexingService.createEmbeddings(texts);
await indexingService.createEmbedding(text);
```

### RetrievalService

Handles the **Retrieval and Generation** phase of RAG:

- **Similarity Search**: Finds relevant documents using vector similarity
- **Query Analysis**: Optimizes queries for better retrieval
- **Context Preparation**: Formats retrieved content for generation
- **Advanced Retrieval**: Multi-query, compression, and filtering strategies

#### Key Methods

```typescript
// Basic similarity search
await retrievalService.searchSimilar(vectorStore, options);

// Advanced retrieval with query analysis
await retrievalService.retrieveWithAnalysis(vectorStore, analysis);

// Prepare context for LLM generation
await retrievalService.retrieveContext(vectorStore, query, options);

// Multi-query retrieval
await retrievalService.multiQueryRetrieval(vectorStore, queries);

// Contextual compression
await retrievalService.retrieveWithCompression(vectorStore, query, options);
```

## Usage Examples

### Basic RAG Implementation

```typescript
import { indexingService, retrievalService } from '@/vector';

// 1. Indexing Phase
const config = indexingService.getDefaultConfig();
const vectorStore = await indexingService.createVectorStore(config);

const documents = [
  { pageContent: "The capital of France is Paris.", metadata: { source: "geography" } },
  { pageContent: "Paris is known for the Eiffel Tower.", metadata: { source: "landmarks" } }
];

await indexingService.indexDocuments(vectorStore, documents);

// 2. Retrieval Phase
const query = "What is the capital of France?";
const searchResults = await retrievalService.searchSimilar(vectorStore, {
  query,
  k: 5,
  scoreThreshold: 0.7
});

// 3. Context Preparation
const { context, sources } = await retrievalService.retrieveContext(
  vectorStore,
  query,
  { maxDocuments: 3, includeMetadata: true }
);

// Now use context with your LLM for generation
```

### Advanced RAG with Query Analysis

```typescript
// Enhanced retrieval with query analysis
const analysis = {
  query: "recent developments in artificial intelligence",
  filters: { category: "technology", year: { $gte: 2023 } },
  contextWindow: 10
};

const results = await retrievalService.retrieveWithAnalysis(vectorStore, analysis);
```

### Multi-Query Retrieval

```typescript
// For complex questions requiring multiple perspectives
const queries = [
  "What is machine learning?",
  "How does deep learning work?",
  "Applications of neural networks"
];

const allResults = await retrievalService.multiQueryRetrieval(
  vectorStore,
  queries,
  { deduplicateByContent: true }
);
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=http://localhost:6333

# Optional
QDRANT_API_KEY=your_qdrant_api_key
```

### Vector Store Configuration

```typescript
const config = {
  collectionName: 'my-documents',
  url: 'http://localhost:6333',
  apiKey: 'optional-api-key'
};
```

## Best Practices

### Indexing

1. **Document Chunking**: Keep chunks between 100-1000 tokens for optimal retrieval
2. **Metadata**: Include relevant metadata for filtering and context
3. **Batch Processing**: Index documents in batches for better performance
4. **Version Control**: Use collection names to manage different document versions

### Retrieval

1. **Query Optimization**: Use query analysis for complex questions
2. **Score Thresholds**: Set appropriate similarity thresholds to filter irrelevant results
3. **Context Window**: Balance context size with token limits
4. **Result Ranking**: Consider both similarity scores and metadata for ranking

### Performance

1. **Caching**: Cache embeddings for frequently used queries
2. **Parallel Processing**: Use batch operations when possible
3. **Monitoring**: Track retrieval performance and accuracy metrics
4. **Indexing Strategy**: Regularly update and maintain vector indices

## Advanced Features

### Query Analysis

Transform user queries into optimized search parameters:

```typescript
const analysis = {
  query: "optimized search terms",
  filters: { category: "specific", date: "recent" },
  contextWindow: 5
};
```

### Contextual Compression

Reduce irrelevant content while maintaining context:

```typescript
const compressed = await retrievalService.retrieveWithCompression(
  vectorStore,
  query,
  { compressionThreshold: 0.6, maxChunkSize: 500 }
);
```

### Multi-Modal Support

Handle different content types with appropriate metadata:

```typescript
const documents = [
  { 
    pageContent: "Text content",
    metadata: { type: "text", source: "document.pdf" }
  },
  {
    pageContent: "Code snippet",
    metadata: { type: "code", language: "typescript" }
  }
];
```

## Integration with LangChain

Our services are designed to work seamlessly with LangChain components:

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

// Retrieve context
const { context } = await retrievalService.retrieveContext(vectorStore, query);

// Create prompt with context
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Use the following context to answer the question: {context}"],
  ["human", "{question}"]
]);

// Generate response
const llm = new ChatOpenAI();
const chain = prompt.pipe(llm);
const response = await chain.invoke({ context, question: query });
```
