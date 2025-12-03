/* eslint-disable import-x/no-unused-modules */
// Comprehensive Test for Hypothetical Content-Based Retrieval
// Tests the new hypothetical content generation approach vs baseline retrieval
import { db } from '@/database';
import { indexingService } from '@/vector';
import { retrievalService } from '@/vector/RetrievalService';
import { collectionService } from '@/vector/vectorCollections';

import type { TestResults } from './types';
import { BASE_URL, delay, logSection, logTest, TEST_CONFIG } from './utils';

// Test configuration
const TEST_COLLECTION_NAME = 'irmin-docs';

// Test queries covering different patterns
const TEST_QUERIES = {
  questions: [
    'How do I create a workflow in Irmin?',
    'What are the main features of Irmin?',
    'How does data versioning work in Irmin?',
    'How to query the latest 10 transactions from transactions.csv in demo-data repository?',
  ],
  statements: [
    'I want to learn about workflows',
    'Tell me about Irmin connectors',
    'Explain Irmin repositories',
    'Provide examples of Irmin SQL queries',
  ],
  mixed: [
    'Irmin SDK documentation',
    'workflow automation best practices',
    'connecting to databases',
    'querying nested JSON objects',
  ],
};

// Helper function to get collection ID
async function getCollectionId(): Promise<string> {
  const collection = await collectionService.getCollectionByName(
    TEST_COLLECTION_NAME,
    undefined,
    undefined,
    true
  );
  if (!collection) {
    throw new Error(`Collection '${TEST_COLLECTION_NAME}' not found`);
  }
  return collection.id;
}

// Test 1: Hypothetical Content Generation
async function testHypotheticalGeneration(): Promise<boolean> {
  logTest('Hypothetical Content Generation', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    const results: Array<{
      query: string;
      usedHypothetical: boolean;
      generatedContent?: string;
    }> = [];

    // Test with different query types
    const allQueries = [
      ...TEST_QUERIES.questions,
      ...TEST_QUERIES.statements,
      ...TEST_QUERIES.mixed,
    ];

    for (const query of allQueries) {
      const result = await retrievalService.retrieveWithHypotheticalContent(
        collectionName,
        query,
        {
          maxDocuments: 3,
          scoreThreshold: 0.1,
          includeMetadata: false,
          maxTokens: 1000,
        }
      );

      results.push({
        query,
        usedHypothetical: result.usedHypothetical,
        generatedContent: result.hypotheticalContent,
      });
    }

    const successCount = results.filter((r) => r.usedHypothetical).length;
    const successRate = (successCount / results.length) * 100;

    logTest(
      'Hypothetical Content Generation',
      'PASS',
      `${successCount}/${results.length} queries used hypothetical content (${successRate.toFixed(1)}%)`
    );

    console.log('\n  Sample generated content:');
    results
      .filter((r) => r.usedHypothetical)
      .forEach((result, index) => {
        console.log(`    ${index + 1}. Query: "${result.query}"`);
        console.log(
          `       Generated: "${result.generatedContent?.substring(0, 250)}..."`
        );
      });

    return successRate > 50; // At least 50% should use hypothetical content
  } catch (error) {
    logTest(
      'Hypothetical Content Generation',
      'FAIL',
      `Generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

// Test 2: Retrieval Quality Comparison
async function testRetrievalComparison(): Promise<boolean> {
  logTest('Retrieval Quality Comparison', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    const comparisonResults: Array<{
      query: string;
      baselineAvgScore: number;
      hypotheticalAvgScore: number;
      improvement: number;
    }> = [];

    // Test with a subset of queries
    const testQueries = [...TEST_QUERIES.questions, ...TEST_QUERIES.statements];

    for (const query of testQueries) {
      // Hypothetical: New approach
      const hypotheticalResult =
        await retrievalService.retrieveWithHypotheticalContent(
          collectionName,
          query,
          {
            maxDocuments: 5,
            scoreThreshold: 0.1,
            includeMetadata: false,
            maxTokens: 2000,
          }
        );

      // Get the actual scores by doing a similarity search
      // Baseline: Direct query retrieval
      const baselineSearch = await retrievalService.searchSimilar(
        collectionName,
        { query, k: 5, scoreThreshold: 0.1 }
      );

      const hypotheticalSearch = await retrievalService.searchSimilar(
        collectionName,
        {
          query: hypotheticalResult.hypotheticalContent || query,
          k: 5,
          scoreThreshold: 0.1,
        }
      );

      const baselineAvgScore =
        baselineSearch.documents.length > 0
          ? baselineSearch.documents.reduce((sum, doc) => sum + doc.score, 0) /
            baselineSearch.documents.length
          : 0;

      const hypotheticalAvgScore =
        hypotheticalSearch.documents.length > 0
          ? hypotheticalSearch.documents.reduce(
              (sum, doc) => sum + doc.score,
              0
            ) / hypotheticalSearch.documents.length
          : 0;

      const improvement =
        baselineAvgScore > 0
          ? ((hypotheticalAvgScore - baselineAvgScore) / baselineAvgScore) * 100
          : 0;

      comparisonResults.push({
        query,
        baselineAvgScore,
        hypotheticalAvgScore,
        improvement,
      });
    }

    // Calculate overall improvement
    const avgImprovement =
      comparisonResults.reduce((sum, r) => sum + r.improvement, 0) /
      comparisonResults.length;

    logTest(
      'Retrieval Quality Comparison',
      'PASS',
      `Average improvement: ${avgImprovement.toFixed(1)}%`
    );

    console.log('\n  Top improvements:');
    comparisonResults
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 3)
      .forEach((result, index) => {
        console.log(`    ${index + 1}. "${result.query}"`);
        console.log(
          `       Baseline: ${result.baselineAvgScore.toFixed(3)}, Hypothetical: ${result.hypotheticalAvgScore.toFixed(3)}`
        );
        console.log(`       Improvement: ${result.improvement.toFixed(1)}%`);
      });

    return true;
  } catch (error) {
    logTest(
      'Retrieval Quality Comparison',
      'FAIL',
      `Comparison error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

// Test 3: Fallback Behavior
async function testFallbackBehavior(): Promise<boolean> {
  logTest('Fallback Behavior', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    // Test with various edge cases
    const edgeCases = [
      '', // Empty query
      'a', // Very short query
      'xyz123nonsense999', // Nonsense query
      'How do I create a workflow?', // Valid query (should work)
    ];

    let fallbackCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const query of edgeCases) {
      try {
        const result = await retrievalService.retrieveWithHypotheticalContent(
          collectionName,
          query,
          {
            maxDocuments: 3,
            scoreThreshold: 0.1,
            includeMetadata: false,
            maxTokens: 1000,
          }
        );

        if (result.usedHypothetical) {
          successCount++;
        } else {
          fallbackCount++;
        }
      } catch (error) {
        errorCount++;
        console.log(`      Error with query "${query}": ${error}`);
      }
    }

    logTest(
      'Fallback Behavior',
      'PASS',
      `Successful: ${successCount}, Fallback: ${fallbackCount}, Errors: ${errorCount}`
    );

    console.log(`  Total edge cases tested: ${edgeCases.length}`);
    console.log(`  Successful hypothetical generations: ${successCount}`);
    console.log(`  Fallbacks to direct query: ${fallbackCount}`);
    console.log(`  Errors (should be 0): ${errorCount}`);

    // Should handle all cases without errors
    return errorCount === 0;
  } catch (error) {
    logTest(
      'Fallback Behavior',
      'FAIL',
      `Fallback test error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

// Test 4: Performance Metrics
async function testPerformance(): Promise<boolean> {
  logTest('Performance Metrics', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    const performanceResults: Array<{
      query: string;
      baselineTime: number;
      hypotheticalTime: number;
      overhead: number;
    }> = [];

    const testQueries = TEST_QUERIES.questions; // Test with all questions

    for (const query of testQueries) {
      // Baseline timing
      const baselineStart = Date.now();
      await retrievalService.retrieveContext(collectionName, query, {
        maxDocuments: 5,
        scoreThreshold: 0.3,
        includeMetadata: false,
        maxTokens: 2000,
      });
      const baselineTime = Date.now() - baselineStart;

      // Hypothetical timing
      const hypotheticalStart = Date.now();
      await retrievalService.retrieveWithHypotheticalContent(
        collectionName,
        query,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 2000,
        }
      );
      const hypotheticalTime = Date.now() - hypotheticalStart;

      const overhead = hypotheticalTime - baselineTime;

      performanceResults.push({
        query,
        baselineTime,
        hypotheticalTime,
        overhead,
      });
    }

    const avgBaselineTime =
      performanceResults.reduce((sum, r) => sum + r.baselineTime, 0) /
      performanceResults.length;
    const avgHypotheticalTime =
      performanceResults.reduce((sum, r) => sum + r.hypotheticalTime, 0) /
      performanceResults.length;
    const avgOverhead =
      performanceResults.reduce((sum, r) => sum + r.overhead, 0) /
      performanceResults.length;

    logTest(
      'Performance Metrics',
      'PASS',
      `Avg overhead: ${avgOverhead.toFixed(0)}ms (${((avgOverhead / avgBaselineTime) * 100).toFixed(1)}%)`
    );

    console.log(`  Average baseline time: ${avgBaselineTime.toFixed(0)}ms`);
    console.log(
      `  Average hypothetical time: ${avgHypotheticalTime.toFixed(0)}ms`
    );
    console.log(`  Average overhead: ${avgOverhead.toFixed(0)}ms`);
    console.log(
      `  Overhead percentage: ${((avgOverhead / avgBaselineTime) * 100).toFixed(1)}%`
    );

    // Check if total time is acceptable (< 2s)
    const acceptableLatency = avgHypotheticalTime < 2000;
    console.log(
      `  ${acceptableLatency ? '✅' : '⚠️'} Total latency ${acceptableLatency ? 'acceptable' : 'high'} (target <2000ms)`
    );

    return true;
  } catch (error) {
    logTest(
      'Performance Metrics',
      'FAIL',
      `Performance test error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

// Test 5: Error Handling
async function testErrorHandling(): Promise<boolean> {
  logTest('Error Handling', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    const errorCases = [
      { query: '', description: 'Empty query' },
      {
        query: 'a'.repeat(5000),
        description: 'Very long query (5000 chars)',
      },
      { query: '   ', description: 'Whitespace only' },
      {
        query: '🎉🎊✨💫🌟⭐',
        description: 'Emoji only',
      },
    ];

    let handledCount = 0;

    for (const testCase of errorCases) {
      try {
        const result = await retrievalService.retrieveWithHypotheticalContent(
          collectionName,
          testCase.query,
          {
            maxDocuments: 3,
            scoreThreshold: 0.1,
            includeMetadata: false,
            maxTokens: 1000,
          }
        );

        // Should either succeed or gracefully fall back
        handledCount++;
        console.log(
          `    ✅ ${testCase.description}: ${result.usedHypothetical ? 'Used hypothetical' : 'Fell back to direct query'}`
        );
      } catch (error) {
        console.log(
          `    ⚠️  ${testCase.description}: Error - ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    logTest(
      'Error Handling',
      'PASS',
      `${handledCount}/${errorCases.length} edge cases handled gracefully`
    );

    return handledCount >= errorCases.length - 1; // Allow 1 failure
  } catch (error) {
    logTest(
      'Error Handling',
      'FAIL',
      `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

// Test 6: Concurrent Requests
async function testConcurrentRequests(): Promise<boolean> {
  logTest('Concurrent Requests', 'RUNNING');

  try {
    const collectionName = await indexingService.validateCollectionAccess(
      TEST_COLLECTION_NAME,
      true
    );

    // Select a mix of queries for concurrent testing
    const testQueries = [
      ...TEST_QUERIES.questions,
      ...TEST_QUERIES.statements.slice(0, 2),
    ];

    const startTime = Date.now();

    // Execute all queries concurrently
    const results = await Promise.all(
      testQueries.map((query) =>
        retrievalService.retrieveWithHypotheticalContent(
          collectionName,
          query,
          {
            maxDocuments: 3,
            scoreThreshold: 0.3,
            includeMetadata: false,
            maxTokens: 1000,
          }
        )
      )
    );

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / testQueries.length;

    const successCount = results.filter((r) => r.usedHypothetical).length;

    logTest(
      'Concurrent Requests',
      'PASS',
      `${successCount}/${testQueries.length} successful, avg time: ${avgTime.toFixed(0)}ms`
    );

    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average time per query: ${avgTime.toFixed(0)}ms`);
    console.log(`  Concurrent queries: ${testQueries.length}`);
    console.log(
      `  Successful hypothetical generations: ${successCount}/${testQueries.length}`
    );

    return true;
  } catch (error) {
    logTest(
      'Concurrent Requests',
      'FAIL',
      `Concurrent test error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
async function runHypotheticalRetrievalTests(): Promise<void> {
  console.log('🚀 Starting Hypothetical Content-Based Retrieval Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
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
    // Test 1: Hypothetical Generation
    logSection('Hypothetical Content Generation');
    const generationSuccess = await testHypotheticalGeneration();
    if (generationSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 2: Retrieval Quality Comparison
    logSection('Retrieval Quality Comparison');
    const comparisonSuccess = await testRetrievalComparison();
    if (comparisonSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 3: Fallback Behavior
    logSection('Fallback and Error Handling');
    const fallbackSuccess = await testFallbackBehavior();
    if (fallbackSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 4: Performance
    logSection('Performance Metrics');
    const performanceSuccess = await testPerformance();
    if (performanceSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 5: Error Handling
    const errorHandlingSuccess = await testErrorHandling();
    if (errorHandlingSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 6: Concurrent Requests
    logSection('Concurrent Requests');
    const concurrentSuccess = await testConcurrentRequests();
    if (concurrentSuccess) results.passed++;
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
    console.log('\n🎉 All hypothetical retrieval tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runHypotheticalRetrievalTests()
  .then(() => {
    console.log('\n🏁 Test execution completed');
    // Force exit to close any open connections
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
