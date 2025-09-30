/* eslint-disable import-x/no-unused-modules */
// Comprehensive Test for Vectorize Docs Script
// Tests the entire vectorization pipeline: script execution, vector operations, retrievals, and database tracking
import { db } from '@/database';
import { VectorizeDocsScript } from '@/scripts/vectorize-docs';
import { indexingService } from '@/vector';
import { retrievalService } from '@/vector/RetrievalService';
import { collectionService } from '@/vector/vectorCollections';

import type { TestResults } from './types';
import {
  BASE_URL,
  delay,
  logSection,
  logTest,
  TEST_AUTH_TOKEN,
  TEST_CONFIG,
  WORKSPACE_SLUG,
} from './utils';

// Test configuration
const TEST_COLLECTION_NAME = 'vectorize-docs-test-collection';
const TEST_URLS = [
  'https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/docs/docs.md',
  'https://raw.githubusercontent.com/IrminData/irmin-sdk-go/refs/heads/development/README.md',
];

// Test local file paths
const TEST_LOCAL_PATHS = ['llm-docs/concepts.md', 'llm-docs/workflows.md'];

// Test functions
async function testScriptConfiguration(): Promise<boolean> {
  logTest('Script Configuration', 'RUNNING');

  try {
    const config = {
      collectionName: TEST_COLLECTION_NAME,
      chunkSize: 500,
      chunkOverlap: 100,
      maxConcurrent: 2,
      urls: TEST_URLS,
      localPaths: TEST_LOCAL_PATHS,
      replaceMode: true,
    };

    const script = new VectorizeDocsScript(config);

    // Verify configuration is properly set
    if (script['config'].collectionName !== TEST_COLLECTION_NAME) {
      logTest(
        'Script Configuration',
        'FAIL',
        'Collection name not set correctly'
      );
      return false;
    }

    if (script['config'].replaceMode !== true) {
      logTest('Script Configuration', 'FAIL', 'Replace mode not set correctly');
      return false;
    }

    if (script['config'].chunkSize !== 500) {
      logTest('Script Configuration', 'FAIL', 'Chunk size not set correctly');
      return false;
    }

    if (script['config'].localPaths.length !== TEST_LOCAL_PATHS.length) {
      logTest('Script Configuration', 'FAIL', 'Local paths not set correctly');
      return false;
    }

    logTest(
      'Script Configuration',
      'PASS',
      'Configuration properly initialized'
    );
    return true;
  } catch (error) {
    logTest(
      'Script Configuration',
      'FAIL',
      `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testScriptExecution(): Promise<{
  success: boolean;
  result?: {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
    error?: string;
    executionTime: number;
    timestamp: string;
  };
}> {
  logTest('Script Execution', 'RUNNING');

  try {
    const config = {
      collectionName: TEST_COLLECTION_NAME,
      chunkSize: 1000,
      chunkOverlap: 200,
      maxConcurrent: 3,
      urls: TEST_URLS,
      localPaths: TEST_LOCAL_PATHS,
      replaceMode: true,
    };

    const script = new VectorizeDocsScript(config);
    const result = await script.execute();

    if (result.success) {
      logTest(
        'Script Execution',
        'PASS',
        `Processed ${result.data?.documentsProcessed || 0} documents into ${result.data?.chunksCreated || 0} chunks`
      );
      console.log(`  Execution time: ${result.executionTime}ms`);
      console.log(`  Collection ID: ${result.data?.collectionId}`);
      console.log(`  URLs processed: ${result.data?.urlsProcessed}`);
      console.log(
        `  Local files processed: ${result.data?.localFilesProcessed}`
      );
      console.log(`  Replace mode: ${result.data?.replaceMode}`);
      console.log(
        `  Old documents removed: ${result.data?.oldDocumentsRemoved || 0}`
      );
      return { success: true, result };
    } else {
      logTest(
        'Script Execution',
        'FAIL',
        result.error || 'Script execution failed'
      );
      return { success: false };
    }
  } catch (error) {
    logTest(
      'Script Execution',
      'FAIL',
      `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { success: false };
  }
}

async function testCollectionDatabase(): Promise<boolean> {
  logTest('Collection Database', 'RUNNING');

  try {
    // Get collection from database
    const collection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);

    if (!collection) {
      logTest(
        'Collection Database',
        'FAIL',
        'Collection not found in database'
      );
      return false;
    }

    logTest(
      'Collection Database',
      'PASS',
      `Collection found: ${collection.name}`
    );
    console.log(`  Collection ID: ${collection.id}`);
    console.log(`  Description: ${collection.description}`);
    console.log(`  Document count: ${collection.documentCount}`);
    console.log(`  Embedding model: ${collection.embeddingModel}`);
    console.log(`  Embedding dimensions: ${collection.embeddingDimensions}`);
    console.log(`  Is active: ${collection.isActive}`);
    console.log(`  Is system collection: ${collection.isSystemCollection}`);
    console.log(`  Created at: ${collection.createdAt}`);
    console.log(`  Last indexed: ${collection.lastIndexedAt}`);

    return true;
  } catch (error) {
    logTest(
      'Collection Database',
      'FAIL',
      `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testVectorStoreConnection(): Promise<boolean> {
  logTest('Vector Store Connection', 'RUNNING');

  try {
    // Create vector store connection
    const vectorStore = await indexingService.initVectorStore(
      TEST_COLLECTION_NAME,
      true
    );

    if (!vectorStore) {
      logTest(
        'Vector Store Connection',
        'FAIL',
        'Failed to create vector store connection'
      );
      return false;
    }

    logTest(
      'Vector Store Connection',
      'PASS',
      'Vector store connection established'
    );
    console.log(`  Collection name: ${TEST_COLLECTION_NAME}`);
    console.log(`  Vector store type: QdrantVectorStore`);

    return true;
  } catch (error) {
    logTest(
      'Vector Store Connection',
      'FAIL',
      `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testDocumentRetrieval(): Promise<boolean> {
  logTest('Document Retrieval', 'RUNNING');

  try {
    // Create vector store for retrieval
    const vectorStore = await indexingService.initVectorStore(
      TEST_COLLECTION_NAME,
      true
    );

    // Test basic similarity search
    const searchResult = await retrievalService.searchSimilar(
      vectorStore,
      {
        query: 'Irmin SDK documentation',
        k: 3,
        scoreThreshold: 0.1,
      },
      TEST_COLLECTION_NAME
    );

    if (searchResult.documents.length === 0) {
      logTest(
        'Document Retrieval',
        'FAIL',
        'No documents retrieved from vector store'
      );
      return false;
    }

    logTest(
      'Document Retrieval',
      'PASS',
      `Retrieved ${searchResult.documents.length} documents`
    );
    console.log(`  Query: ${searchResult.query}`);
    console.log(`  Processing time: ${searchResult.processingTime}ms`);
    console.log(`  Total results: ${searchResult.totalResults}`);

    // Log sample results
    searchResult.documents.forEach((result, index) => {
      console.log(`    ${index + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(
        `       Content preview: ${result.document.pageContent.substring(0, 100)}...`
      );
      console.log(
        `       Metadata: ${JSON.stringify(result.document.metadata)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Document Retrieval',
      'FAIL',
      `Retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testContextRetrieval(): Promise<boolean> {
  logTest('Context Retrieval', 'RUNNING');

  try {
    // Create vector store for retrieval
    const vectorStore = await indexingService.initVectorStore(
      TEST_COLLECTION_NAME,
      true
    );

    // Test context retrieval
    const contextResult = await retrievalService.retrieveContext(
      vectorStore,
      'How to use Irmin SDK for data management',
      {
        maxDocuments: 3,
        scoreThreshold: 0.2,
        includeMetadata: true,
        maxTokens: 2000,
      },
      TEST_COLLECTION_NAME
    );

    if (!contextResult.context || contextResult.sources.length === 0) {
      logTest('Context Retrieval', 'FAIL', 'No context retrieved');
      return false;
    }

    logTest(
      'Context Retrieval',
      'PASS',
      `Retrieved context with ${contextResult.sources.length} sources`
    );
    console.log(`  Context length: ${contextResult.context.length} characters`);
    console.log(`  Estimated tokens: ${contextResult.totalTokens}`);
    console.log(`  Sources count: ${contextResult.sources.length}`);
    console.log(
      `  Context preview: ${contextResult.context.substring(0, 200)}...`
    );

    return true;
  } catch (error) {
    logTest(
      'Context Retrieval',
      'FAIL',
      `Context retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testMultiQueryRetrieval(): Promise<boolean> {
  logTest('Multi-Query Retrieval', 'RUNNING');

  try {
    // Create vector store for retrieval
    const vectorStore = await indexingService.initVectorStore(
      TEST_COLLECTION_NAME,
      true
    );

    // Test multi-query retrieval
    const queries = [
      'Irmin SDK installation',
      'data versioning with Irmin',
      'repository management',
    ];

    const multiQueryResult = await retrievalService.multiQueryRetrieval(
      vectorStore,
      queries,
      {
        maxDocumentsPerQuery: 2,
        combineResults: true,
        deduplicateByContent: true,
      },
      TEST_COLLECTION_NAME
    );

    if (multiQueryResult.length !== queries.length) {
      logTest(
        'Multi-Query Retrieval',
        'FAIL',
        `Expected ${queries.length} results, got ${multiQueryResult.length}`
      );
      return false;
    }

    const totalDocuments = multiQueryResult.reduce(
      (sum, result) => sum + result.totalResults,
      0
    );

    logTest(
      'Multi-Query Retrieval',
      'PASS',
      `Retrieved ${totalDocuments} total documents across ${queries.length} queries`
    );

    multiQueryResult.forEach((result, index) => {
      console.log(`    Query ${index + 1}: "${queries[index]}"`);
      console.log(`      Results: ${result.totalResults}`);
      console.log(`      Processing time: ${result.processingTime}ms`);
    });

    return true;
  } catch (error) {
    logTest(
      'Multi-Query Retrieval',
      'FAIL',
      `Multi-query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testReplaceModeFunctionality(): Promise<boolean> {
  logTest('Replace Mode Functionality', 'RUNNING');

  try {
    // First, get initial document count
    const initialCollection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
    const initialCount = initialCollection?.documentCount || 0;

    console.log(`  Initial document count: ${initialCount}`);

    // Run script again in replace mode
    const config = {
      collectionName: TEST_COLLECTION_NAME,
      chunkSize: 1000,
      chunkOverlap: 200,
      maxConcurrent: 3,
      urls: TEST_URLS,
      localPaths: TEST_LOCAL_PATHS,
      replaceMode: true,
    };

    const script = new VectorizeDocsScript(config);
    const result = await script.execute();

    if (!result.success) {
      logTest('Replace Mode Functionality', 'FAIL', 'Script execution failed');
      return false;
    }

    // Check final document count
    const finalCollection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
    const finalCount = finalCollection?.documentCount || 0;

    console.log(`  Final document count: ${finalCount}`);
    console.log(
      `  Old documents removed: ${result.data?.oldDocumentsRemoved || 0}`
    );

    // In replace mode, the count should be similar (not doubled)
    if (finalCount > initialCount * 1.5) {
      logTest(
        'Replace Mode Functionality',
        'FAIL',
        `Document count increased too much: ${initialCount} -> ${finalCount}`
      );
      return false;
    }

    logTest(
      'Replace Mode Functionality',
      'PASS',
      'Replace mode working correctly'
    );
    return true;
  } catch (error) {
    logTest(
      'Replace Mode Functionality',
      'FAIL',
      `Replace mode error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testAppendModeFunctionality(): Promise<boolean> {
  logTest('Append Mode Functionality', 'RUNNING');

  try {
    // Get initial document count
    const initialCollection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
    const initialCount = initialCollection?.documentCount || 0;

    console.log(`  Initial document count: ${initialCount}`);

    // Run script in append mode
    const config = {
      collectionName: TEST_COLLECTION_NAME,
      chunkSize: 1000,
      chunkOverlap: 200,
      maxConcurrent: 3,
      urls: TEST_URLS,
      localPaths: TEST_LOCAL_PATHS,
      replaceMode: false, // Append mode
    };

    const script = new VectorizeDocsScript(config);
    const result = await script.execute();

    if (!result.success) {
      logTest('Append Mode Functionality', 'FAIL', 'Script execution failed');
      return false;
    }

    // Check final document count
    const finalCollection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
    const finalCount = finalCollection?.documentCount || 0;

    console.log(`  Final document count: ${finalCount}`);
    console.log(`  Documents added: ${result.data?.chunksCreated || 0}`);

    // In append mode, the count should increase
    if (finalCount <= initialCount) {
      logTest(
        'Append Mode Functionality',
        'FAIL',
        `Document count did not increase: ${initialCount} -> ${finalCount}`
      );
      return false;
    }

    logTest(
      'Append Mode Functionality',
      'PASS',
      'Append mode working correctly'
    );
    return true;
  } catch (error) {
    logTest(
      'Append Mode Functionality',
      'FAIL',
      `Append mode error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testLocalFileVectorization(): Promise<boolean> {
  logTest('Local File Vectorization', 'RUNNING');

  try {
    // Test with only local files
    const config = {
      collectionName: TEST_COLLECTION_NAME,
      chunkSize: 1000,
      chunkOverlap: 200,
      maxConcurrent: 3,
      urls: [], // No URLs
      localPaths: TEST_LOCAL_PATHS,
      replaceMode: true,
    };

    const script = new VectorizeDocsScript(config);
    const result = await script.execute();

    if (!result.success) {
      logTest('Local File Vectorization', 'FAIL', 'Script execution failed');
      return false;
    }

    // Verify local files were processed
    if (result.data?.localFilesProcessed !== TEST_LOCAL_PATHS.length) {
      logTest(
        'Local File Vectorization',
        'FAIL',
        `Expected ${TEST_LOCAL_PATHS.length} local files processed, got ${result.data?.localFilesProcessed}`
      );
      return false;
    }

    // Test retrieval of local file content
    const vectorStore = await indexingService.initVectorStore(
      TEST_COLLECTION_NAME,
      true
    );

    // Search for content that should be in local files
    const searchResult = await retrievalService.searchSimilar(
      vectorStore,
      {
        query: 'Irmin core concepts',
        k: 3,
        scoreThreshold: 0.1,
      },
      TEST_COLLECTION_NAME
    );

    // Check if we found local file content
    const hasLocalContent = searchResult.documents.some(
      (doc) => doc.document.metadata.source === 'local'
    );

    if (!hasLocalContent) {
      logTest(
        'Local File Vectorization',
        'FAIL',
        'No local file content found in search results'
      );
      return false;
    }

    logTest(
      'Local File Vectorization',
      'PASS',
      `Successfully vectorized ${result.data?.localFilesProcessed} local files`
    );
    console.log(`  Local files processed: ${result.data?.localFilesProcessed}`);
    console.log(`  Documents created: ${result.data?.chunksCreated}`);
    console.log(`  Found local content in search results: ${hasLocalContent}`);

    return true;
  } catch (error) {
    logTest(
      'Local File Vectorization',
      'FAIL',
      `Local file error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testEmbeddingGeneration(): Promise<boolean> {
  logTest('Embedding Generation', 'RUNNING');

  try {
    // Test embedding generation for a sample text
    const sampleText = 'This is a test document for embedding generation';
    const embeddings = await indexingService.createEmbeddings([sampleText]);

    if (!embeddings || embeddings.length === 0) {
      logTest('Embedding Generation', 'FAIL', 'No embeddings generated');
      return false;
    }

    const embedding = embeddings[0];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      logTest('Embedding Generation', 'FAIL', 'Invalid embedding format');
      return false;
    }

    logTest(
      'Embedding Generation',
      'PASS',
      `Generated embedding with ${embedding.length} dimensions`
    );
    console.log(`  Text: "${sampleText}"`);
    console.log(`  Embedding dimensions: ${embedding.length}`);
    console.log(
      `  Sample values: [${embedding
        .slice(0, 5)
        .map((v) => v.toFixed(4))
        .join(', ')}...]`
    );

    return true;
  } catch (error) {
    logTest(
      'Embedding Generation',
      'FAIL',
      `Embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function cleanupTestData(): Promise<void> {
  logTest('Cleanup', 'RUNNING');

  try {
    // Delete the test collection
    const collection =
      await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
    if (collection) {
      await collectionService.deleteCollection(collection.id);
      logTest('Cleanup', 'PASS', 'Test collection deleted');
    } else {
      logTest('Cleanup', 'PASS', 'No test collection to delete');
    }
  } catch (error) {
    logTest(
      'Cleanup',
      'FAIL',
      `Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function cleanupConnections(): Promise<void> {
  try {
    // Close database connection
    await db.$client.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Main test runner
async function runVectorizeDocsTests(): Promise<void> {
  console.log('🚀 Starting Vectorize Docs Script Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Workspace: ${WORKSPACE_SLUG}`);
  console.log(`🔑 Auth Token: ${TEST_AUTH_TOKEN.substring(0, 20)}...`);
  console.log(`📚 Test Collection: ${TEST_COLLECTION_NAME}`);
  console.log(`🔗 Test URLs: ${TEST_URLS.length} URLs`);
  console.log(`📁 Test Local Files: ${TEST_LOCAL_PATHS.length} files`);

  const results: TestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Test 1: Script Configuration
    logSection('Script Configuration');
    const configSuccess = await testScriptConfiguration();
    if (configSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 2: Script Execution
    logSection('Script Execution');
    const executionResult = await testScriptExecution();
    if (executionResult.success) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 3: Collection Database
    logSection('Database Operations');
    const dbSuccess = await testCollectionDatabase();
    if (dbSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 4: Vector Store Connection
    logSection('Vector Store Operations');
    const vectorStoreSuccess = await testVectorStoreConnection();
    if (vectorStoreSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 5: Document Retrieval
    logSection('Retrieval Operations');
    const retrievalSuccess = await testDocumentRetrieval();
    if (retrievalSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 6: Context Retrieval
    const contextSuccess = await testContextRetrieval();
    if (contextSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 7: Multi-Query Retrieval
    const multiQuerySuccess = await testMultiQueryRetrieval();
    if (multiQuerySuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 8: Replace Mode Functionality
    logSection('Mode Testing');
    const replaceSuccess = await testReplaceModeFunctionality();
    if (replaceSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 9: Append Mode Functionality
    const appendSuccess = await testAppendModeFunctionality();
    if (appendSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 10: Local File Vectorization
    logSection('Local File Operations');
    const localFileSuccess = await testLocalFileVectorization();
    if (localFileSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 11: Embedding Generation
    logSection('Embedding Operations');
    const embeddingSuccess = await testEmbeddingGeneration();
    if (embeddingSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Cleanup
    logSection('Cleanup');
    await cleanupTestData();
    await cleanupConnections();
  } catch (error) {
    console.error(
      '❌ Test suite error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    results.failed++;
  }

  // Summary
  logSection('Test Summary');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📊 Total: ${results.passed + results.failed + results.skipped}`);

  if (results.failed === 0) {
    console.log('\n🎉 All vectorize docs tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runVectorizeDocsTests()
  .then(() => {
    console.log('\n🏁 Test execution completed');
    // Force exit to close any open connections
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
