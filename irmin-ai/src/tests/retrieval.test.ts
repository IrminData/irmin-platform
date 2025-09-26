/* eslint-disable import-x/no-unused-modules */
// Comprehensive Test for Document Retrieval and Context Generation
// Tests search, context retrieval, and various query patterns based on llm-docs content
import { db } from '@/database';
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
const TEST_COLLECTION_NAME = 'irmin-docs';

// Test queries based on llm-docs content
const TEST_QUERIES = {
  concepts: [
    'What is Irmin and how does it work?',
    'Explain data versioning concepts',
    'How does Git-like versioning work in Irmin?',
  ],
  workflows: [
    'How to create and manage workflows?',
    'What are workflow automation best practices?',
    'How to handle workflow errors and retries?',
  ],
  connections: [
    'How to connect to external data sources?',
    'What connectors are available?',
    'How to configure database connections?',
  ],
  scripting: [
    'How to write scripts in Irmin?',
    'What scripting languages are supported?',
    'How to execute scripts and handle results?',
  ],
  sql: [
    'How to write SQL queries in Irmin?',
    'What SQL features are available?',
    'How to optimize SQL performance?',
  ],
  objectSchema: [
    'What is the object schema in Irmin?',
    'How to define custom object types?',
    'How to validate object schemas?',
  ],
};

// Helper function to get collection ID
async function getCollectionId(): Promise<string> {
  const collection =
    await collectionService.getCollectionByName(TEST_COLLECTION_NAME);
  if (!collection) {
    throw new Error(`Collection '${TEST_COLLECTION_NAME}' not found`);
  }
  return collection.id;
}

// Test functions
async function testBasicSearch(): Promise<boolean> {
  logTest('Basic Search', 'RUNNING');

  try {
    // Create vector store connection
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
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
        'Basic Search',
        'FAIL',
        'No documents retrieved from vector store'
      );
      return false;
    }

    logTest(
      'Basic Search',
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
      if (result.document.metadata) {
        console.log(
          `       Metadata: ${JSON.stringify(result.document.metadata)}`
        );
      }
    });

    return true;
  } catch (error) {
    logTest(
      'Basic Search',
      'FAIL',
      `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testContextRetrieval(): Promise<boolean> {
  logTest('Context Retrieval', 'RUNNING');

  try {
    // Create vector store connection
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
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

async function testConceptsQueries(): Promise<boolean> {
  logTest('Concepts Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.concepts) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'Concepts Queries',
      'PASS',
      `Processed ${TEST_QUERIES.concepts.length} concept queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Concepts Queries',
      'FAIL',
      `Concepts query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testWorkflowsQueries(): Promise<boolean> {
  logTest('Workflows Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.workflows) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'Workflows Queries',
      'PASS',
      `Processed ${TEST_QUERIES.workflows.length} workflow queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Workflows Queries',
      'FAIL',
      `Workflows query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testConnectionsQueries(): Promise<boolean> {
  logTest('Connections Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.connections) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'Connections Queries',
      'PASS',
      `Processed ${TEST_QUERIES.connections.length} connection queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Connections Queries',
      'FAIL',
      `Connections query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testScriptingQueries(): Promise<boolean> {
  logTest('Scripting Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.scripting) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'Scripting Queries',
      'PASS',
      `Processed ${TEST_QUERIES.scripting.length} scripting queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Scripting Queries',
      'FAIL',
      `Scripting query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testSqlQueries(): Promise<boolean> {
  logTest('SQL Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.sql) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'SQL Queries',
      'PASS',
      `Processed ${TEST_QUERIES.sql.length} SQL queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'SQL Queries',
      'FAIL',
      `SQL query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testObjectSchemaQueries(): Promise<boolean> {
  logTest('Object Schema Queries', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    let totalResults = 0;
    const queryResults: Array<{
      query: string;
      results: number;
      avgScore: number;
    }> = [];

    for (const query of TEST_QUERIES.objectSchema) {
      const result = await retrievalService.searchSimilar(
        vectorStore,
        {
          query,
          k: 3,
          scoreThreshold: 0.1,
        },
        TEST_COLLECTION_NAME
      );

      const avgScore =
        result.documents.length > 0
          ? result.documents.reduce((sum, doc) => sum + doc.score, 0) /
            result.documents.length
          : 0;

      queryResults.push({
        query,
        results: result.totalResults,
        avgScore,
      });

      totalResults += result.totalResults;
    }

    logTest(
      'Object Schema Queries',
      'PASS',
      `Processed ${TEST_QUERIES.objectSchema.length} object schema queries`
    );
    console.log(`  Total results across all queries: ${totalResults}`);

    queryResults.forEach((result, index) => {
      console.log(`    ${index + 1}. "${result.query}"`);
      console.log(
        `       Results: ${result.results}, Avg Score: ${result.avgScore.toFixed(3)}`
      );
    });

    return true;
  } catch (error) {
    logTest(
      'Object Schema Queries',
      'FAIL',
      `Object schema query error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testMultiQueryRetrieval(): Promise<boolean> {
  logTest('Multi-Query Retrieval', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    // Test multi-query retrieval with concepts
    const queries = [
      'Irmin data versioning',
      'workflow automation',
      'database connections',
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

async function testHighScoreThreshold(): Promise<boolean> {
  logTest('High Score Threshold', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    // Test with high score threshold
    const result = await retrievalService.searchSimilar(
      vectorStore,
      {
        query: 'Irmin SDK Go documentation',
        k: 10,
        scoreThreshold: 0.7, // High threshold
      },
      TEST_COLLECTION_NAME
    );

    logTest(
      'High Score Threshold',
      'PASS',
      `High threshold search returned ${result.totalResults} results`
    );
    console.log(`  Query: ${result.query}`);
    console.log(`  Score threshold: 0.7`);
    console.log(`  Results: ${result.totalResults}`);
    console.log(`  Processing time: ${result.processingTime}ms`);

    if (result.documents.length > 0) {
      console.log(
        `  Top result score: ${result.documents[0].score.toFixed(3)}`
      );
    }

    return true;
  } catch (error) {
    logTest(
      'High Score Threshold',
      'FAIL',
      `High threshold error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testLowScoreThreshold(): Promise<boolean> {
  logTest('Low Score Threshold', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    // Test with low score threshold
    const result = await retrievalService.searchSimilar(
      vectorStore,
      {
        query: 'data management platform',
        k: 10,
        scoreThreshold: 0.1, // Low threshold
      },
      TEST_COLLECTION_NAME
    );

    logTest(
      'Low Score Threshold',
      'PASS',
      `Low threshold search returned ${result.totalResults} results`
    );
    console.log(`  Query: ${result.query}`);
    console.log(`  Score threshold: 0.1`);
    console.log(`  Results: ${result.totalResults}`);
    console.log(`  Processing time: ${result.processingTime}ms`);

    if (result.documents.length > 0) {
      const scores = result.documents.map((doc) => doc.score);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      console.log(
        `  Score range: ${minScore.toFixed(3)} - ${maxScore.toFixed(3)}`
      );
    }

    return true;
  } catch (error) {
    logTest(
      'Low Score Threshold',
      'FAIL',
      `Low threshold error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

async function testContextGeneration(): Promise<boolean> {
  logTest('Context Generation', 'RUNNING');

  try {
    const vectorStore = await indexingService.createVectorStore(
      {
        collectionName: TEST_COLLECTION_NAME,
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
      },
      'system',
      'system'
    );

    // Test context generation with different parameters
    const testCases = [
      {
        query: 'How to set up Irmin for enterprise use?',
        maxDocuments: 5,
        scoreThreshold: 0.2,
        maxTokens: 1000,
      },
      {
        query: 'What are the best practices for data versioning?',
        maxDocuments: 3,
        scoreThreshold: 0.3,
        maxTokens: 2000,
      },
      {
        query: 'How to connect to external databases?',
        maxDocuments: 4,
        scoreThreshold: 0.15,
        maxTokens: 1500,
      },
    ];

    let totalContexts = 0;
    let totalTokens = 0;

    for (const testCase of testCases) {
      const result = await retrievalService.retrieveContext(
        vectorStore,
        testCase.query,
        {
          maxDocuments: testCase.maxDocuments,
          scoreThreshold: testCase.scoreThreshold,
          includeMetadata: true,
          maxTokens: testCase.maxTokens,
        },
        TEST_COLLECTION_NAME
      );

      totalContexts++;
      totalTokens += result.totalTokens;

      console.log(`    Query: "${testCase.query}"`);
      console.log(`      Context length: ${result.context.length} chars`);
      console.log(`      Estimated tokens: ${result.totalTokens}`);
      console.log(`      Sources: ${result.sources.length}`);
    }

    logTest(
      'Context Generation',
      'PASS',
      `Generated ${totalContexts} contexts with ${totalTokens} total tokens`
    );
    console.log(
      `  Average tokens per context: ${Math.round(totalTokens / totalContexts)}`
    );

    return true;
  } catch (error) {
    logTest(
      'Context Generation',
      'FAIL',
      `Context generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
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
async function runRetrievalTests(): Promise<void> {
  console.log('🚀 Starting Document Retrieval Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Workspace: ${WORKSPACE_SLUG}`);
  console.log(`🔑 Auth Token: ${TEST_AUTH_TOKEN.substring(0, 20)}...`);
  console.log(`📚 Test Collection: ${TEST_COLLECTION_NAME}`);

  // Get collection ID dynamically
  let collectionId: string;
  try {
    collectionId = await getCollectionId();
    console.log(`🆔 Collection ID: ${collectionId}`);
  } catch (error) {
    console.error(
      `❌ Failed to get collection ID: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.log(
      '💡 Make sure the collection exists by running the vectorize-docs script first'
    );
    process.exit(1);
  }

  const results: TestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Test 1: Basic Search
    logSection('Basic Retrieval Operations');
    const basicSearchSuccess = await testBasicSearch();
    if (basicSearchSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 2: Context Retrieval
    const contextRetrievalSuccess = await testContextRetrieval();
    if (contextRetrievalSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 3: Concepts Queries
    logSection('Domain-Specific Queries');
    const conceptsSuccess = await testConceptsQueries();
    if (conceptsSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 4: Workflows Queries
    const workflowsSuccess = await testWorkflowsQueries();
    if (workflowsSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 5: Connections Queries
    const connectionsSuccess = await testConnectionsQueries();
    if (connectionsSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 6: Scripting Queries
    const scriptingSuccess = await testScriptingQueries();
    if (scriptingSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 7: SQL Queries
    const sqlSuccess = await testSqlQueries();
    if (sqlSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 8: Object Schema Queries
    const objectSchemaSuccess = await testObjectSchemaQueries();
    if (objectSchemaSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 9: Multi-Query Retrieval
    logSection('Advanced Retrieval Operations');
    const multiQuerySuccess = await testMultiQueryRetrieval();
    if (multiQuerySuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 10: High Score Threshold
    const highThresholdSuccess = await testHighScoreThreshold();
    if (highThresholdSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 11: Low Score Threshold
    const lowThresholdSuccess = await testLowScoreThreshold();
    if (lowThresholdSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 12: Context Generation
    const contextGenerationSuccess = await testContextGeneration();
    if (contextGenerationSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Cleanup
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
    console.log('\n🎉 All retrieval tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runRetrievalTests()
  .then(() => {
    console.log('\n🏁 Test execution completed');
    // Force exit to close any open connections
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
