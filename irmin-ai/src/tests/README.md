# Irmin AI Test Suite

This directory contains comprehensive test suites for the Irmin AI service, covering all major functionality including API endpoints, document vectorization, and system operations.

## Test Files

### `comprehensive.test.ts`
Complete API test suite covering all endpoints with proper conversation management and cleanup.

### `vectorize-docs.test.ts`
Tests the complete document vectorization pipeline including script execution, vector operations, retrievals, and database tracking.

### `retrieval.test.ts`
Comprehensive test suite for document retrieval and context generation, testing search functionality, context retrieval, and various query patterns based on llm-docs content.

### `utils.ts`
Shared test utilities and helper functions used across all test suites.

### `types.ts`
TypeScript type definitions for test results and configurations.

## Running Tests

### Prerequisites

1. **Environment Configuration**: Add your test credentials to the environment:

```bash
# Add to your .env file
TEST_IRMIN_AUTH_TOKEN=your_test_token_here
TEST_WORKSPACE_SLUG=your-workspace-slug
IRMIN_API_BASE_URL=http://localhost:3000  # or your API URL
```

2. **Server Running**: Make sure the Irmin AI server is running on the configured port and that it has access to the Irmin API with MCP.

### Test Commands

```bash
# Run comprehensive API tests
npx tsx src/tests/comprehensive.test.ts

# Run vectorize docs tests
npx tsx src/tests/vectorize-docs.test.ts

# Run retrieval tests
npx tsx src/tests/retrieval.test.ts
```

## Comprehensive Test Suite (`comprehensive.test.ts`)

Runs a complete test suite covering all API endpoints with proper conversation management and cleanup.

**Step-by-Step Test Flow:**

1. **Agent Management Tests**
   - **Agent Listing**: Tests `GET /api/agents` to retrieve available agents
   - **Agent Configuration**: Tests `GET /api/agents/:id/config` to get agent settings and capabilities

2. **Chat Endpoint Tests**
   - **Non-Streaming Chat**: 
     - Creates a test conversation
     - Sends: `"Hello! Can you tell me about Irmin?"` (generic question, no tool calls)
     - Tests `POST /api/chat` endpoint
     - Validates response structure and message content
   - **Streaming Chat**:
     - Uses the same conversation from non-streaming test
     - Sends: `"What are the main features of Irmin?"` (generic question, no tool calls)
     - Tests streaming response handling
     - Processes and validates stream chunks

3. **Agent Execution Tests**
   - **Agent Execution**:
     - Creates a new test conversation
     - Sends: `"Help me understand how to use Irmin for data management"` (likely triggers tool calls)
     - Tests `POST /api/agents/:id` with a specific agent
     - Validates agent response content and structure
     - Cleans up the test conversation
   - **Agent Streaming**:
     - Creates another test conversation
     - Sends: `"Show me how to create a repository in Irmin"` (likely triggers tool calls)
     - Tests `POST /api/agents/:id/stream` for streaming agent responses
     - Processes streaming data and validates chunks
     - Cleans up the test conversation

4. **Conversation Flow Test**
   - Creates a test conversation
   - Sends: `"I want to learn about Irmin data versioning"` (generic question, no tool calls)
   - Sends: `"Can you show me how to create a branch?"` (likely triggers tool calls)
   - Validates conversation continuity and message threading
   - Cleans up the test conversation

5. **Conversation Management Test**
   - Tests CRUD operations on conversations
   - Validates conversation listing, creation, retrieval, and deletion
   - Tests title generation functionality
   - Verifies message management

6. **Info Endpoints Test**
   - Tests user profile, workspace info, available models, and tools endpoints
   - Validates API information retrieval

## Vectorize Docs Test Suite (`vectorize-docs.test.ts`)

Tests the complete document vectorization pipeline including script execution, vector operations, retrievals, and database tracking. This includes both remote URL fetching and local file processing capabilities.

**Comprehensive Test Flow:**

1. **Script Configuration Tests**
   - **Configuration Validation**: Tests VectorizeDocsScript class initialization
   - **Parameter Verification**: Validates collection name, chunk size, replace mode, URL settings, and local file paths

2. **Script Execution Tests**
   - **Document Vectorization**: Runs the actual vectorization script with test URLs and local files
   - **Performance Monitoring**: Measures execution time and processing metrics
   - **Result Validation**: Verifies successful execution and proper result structure
   - **Mixed Source Processing**: Tests processing of both remote URLs and local files

3. **Database Operations Tests**
   - **Collection Tracking**: Tests collection creation and tracking in PostgreSQL
   - **Document Counting**: Verifies document count tracking and metadata storage
   - **Collection Metadata**: Validates embedding model, dimensions, and timestamps

4. **Vector Store Operations Tests**
   - **Qdrant Connection**: Tests connection to Qdrant vector store
   - **Collection Accessibility**: Verifies collection exists and is accessible
   - **Vector Store Configuration**: Tests vector store setup and configuration

5. **Retrieval Operations Tests**
   - **Basic Similarity Search**: Tests document retrieval with similarity search and score thresholds
   - **Context Retrieval**: Tests context preparation for LLM with token limits and metadata inclusion
   - **Multi-Query Retrieval**: Tests complex queries with multiple search terms and deduplication

6. **Mode Testing**
   - **Replace Mode**: Verifies old documents are removed after new indexing (prevents duplicates)
   - **Append Mode**: Verifies new documents are added without removing old ones
   - **Document Count Tracking**: Ensures database counts are accurately updated

7. **Local File Operations Tests**
   - **Local File Vectorization**: Tests vectorization of local markdown files from `llm-docs/` directory
   - **File System Integration**: Tests reading and processing of local files
   - **Content Retrieval**: Verifies local file content can be retrieved through similarity search
   - **Source Tracking**: Ensures local files are properly marked with `source: 'local'` metadata

8. **Embedding Operations Tests**
   - **Embedding Generation**: Tests OpenAI embedding creation for sample text
   - **Dimension Validation**: Verifies embedding dimensions and format
   - **Service Integration**: Tests embedding service integration

9. **Cleanup Operations**
   - **Test Data Removal**: Automatically removes test collection from database and vector store
   - **Resource Cleanup**: Ensures no test data remains after completion

**Test Configuration:**
- **Test Collection**: `vectorize-docs-test-collection`
- **Test URLs**: Go SDK documentation and README from GitHub
- **Test Local Files**: LLM documentation files (`llm-docs/concepts.md`, `llm-docs/workflows.md`)
- **Chunk Size**: 1000 characters with 200 character overlap
- **Max Concurrent**: 3 requests for parallel processing

**Expected Results:**
- All tests passing with proper document vectorization
- Successful retrieval operations returning relevant results
- Replace mode preventing document duplication
- Append mode adding new documents correctly
- Local file vectorization working correctly
- Proper cleanup of test data

## Retrieval Test Suite (`retrieval.test.ts`)

Comprehensive test suite for document retrieval and context generation, testing search functionality, context retrieval, and various query patterns based on llm-docs content. This test suite validates the RAG (Retrieval-Augmented Generation) capabilities of the system.

**Comprehensive Test Flow:**

1. **Basic Retrieval Operations**
   - **Basic Search**: Tests similarity search with score thresholds and result validation
   - **Context Retrieval**: Tests context preparation for LLM with token limits and metadata inclusion
   - **Performance Monitoring**: Measures search latency and processing times

2. **Domain-Specific Query Testing**
   - **Concepts Queries**: Tests queries about Irmin core concepts and data versioning
   - **Workflows Queries**: Tests workflow automation and management queries
   - **Connections Queries**: Tests external data source connection queries
   - **Scripting Queries**: Tests script execution and management queries
   - **SQL Queries**: Tests SQL functionality and optimization queries
   - **Object Schema Queries**: Tests object type definition and validation queries

3. **Advanced Retrieval Operations**
   - **Multi-Query Retrieval**: Tests complex queries with multiple search terms and deduplication
   - **High Score Threshold**: Tests precision-focused searches with high relevance thresholds
   - **Low Score Threshold**: Tests recall-focused searches with low relevance thresholds
   - **Context Generation**: Tests context preparation with different parameters and token limits

4. **Dynamic Collection Management**
   - **Collection ID Resolution**: Dynamically gets collection ID by name instead of hardcoding
   - **Collection Validation**: Ensures collection exists before running tests
   - **Error Handling**: Graceful failure if collection doesn't exist

**Test Configuration:**
- **Test Collection**: `irmin-docs` (main documentation collection)
- **Query Categories**: 6 domain-specific categories with 3 queries each
- **Score Thresholds**: Tests both high (0.7) and low (0.1) thresholds
- **Context Limits**: Tests various token limits (1000, 1500, 2000)
- **Metadata Inclusion**: Tests with and without metadata in results

**Query Examples:**
- **Concepts**: "What is Irmin and how does it work?", "Explain data versioning concepts"
- **Workflows**: "How to create and manage workflows?", "What are workflow automation best practices?"
- **Connections**: "How to connect to external data sources?", "What connectors are available?"
- **Scripting**: "How to write scripts in Irmin?", "What scripting languages are supported?"
- **SQL**: "How to write SQL queries in Irmin?", "What SQL features are available?"
- **Object Schema**: "What is the object schema in Irmin?", "How to define custom object types?"

**Expected Results:**
- All 12 test categories passing with relevant document retrieval
- Context generation working with proper token counting
- Multi-query retrieval handling complex search scenarios
- Score threshold filtering working correctly
- Dynamic collection ID resolution functioning properly
- Performance metrics within acceptable ranges (300-600ms)