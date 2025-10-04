/* eslint-disable import-x/no-unused-modules */
// Assistant Agent API Test Utility for Irmin AI
// Tests the assistant agent functionality including both streaming and non-streaming modes
import type { AgentConfig, TestResults } from './types';
import {
  BASE_URL,
  createAgentRequest,
  createTestConversation,
  delay,
  deleteTestConversation,
  logSection,
  logTest,
  makeRequest,
  makeStreamingRequest,
  processStream,
  TEST_AUTH_TOKEN,
  TEST_CONFIG,
  WORKSPACE_SLUG,
} from './utils';

// Helper function to safely access response data
function getResponseData<T>(
  result: { ok: boolean; data: unknown },
  key: string
): T | null {
  if (
    result.ok &&
    result.data &&
    typeof result.data === 'object' &&
    key in result.data
  ) {
    return (result.data as Record<string, T>)[key];
  }
  return null;
}

// Test functions
async function testAgentListing(): Promise<AgentConfig[]> {
  logTest('Agent Listing', 'RUNNING');

  const result = await makeRequest(`${BASE_URL}/api/agents`);
  const agents = getResponseData<AgentConfig[]>(result, 'agents');

  if (agents) {
    logTest('Agent Listing', 'PASS', `Found ${agents.length} agents`);
    agents.forEach((agent: AgentConfig) => {
      console.log(`  - ${agent.name} (${agent.id}): ${agent.description}`);
      console.log(
        `    Provider: ${agent.modelProvider}, Streaming: ${agent.streaming}`
      );
    });
    return agents;
  } else {
    logTest('Agent Listing', 'FAIL', result.error || 'No agents found');
    return [];
  }
}

async function testAssistantAgentConfig(): Promise<boolean> {
  logTest('Assistant Agent Config', 'RUNNING');

  const result = await makeRequest(`${BASE_URL}/api/agents/assistant/config`);

  if (result.ok && result.data && typeof result.data === 'object') {
    const config = result.data as Record<string, unknown>;
    logTest('Assistant Agent Config', 'PASS', `Type: ${config.type}`);
    console.log(`  Model: ${config.modelProvider}/${config.model}`);
    console.log(`  Streaming: ${config.streaming}`);
    console.log(`  Max Tool Calls: ${config.maxToolCalls}`);
    console.log(`  Use Agent Graph: ${config.useAgentGraph}`);
    console.log(
      `  Context Requirements: ${Array.isArray(config.contextRequirements) ? config.contextRequirements.length : 0}`
    );

    // Log tool selection if present
    if (config.toolSelection && typeof config.toolSelection === 'object') {
      const toolSelection = config.toolSelection as Record<string, unknown>;
      console.log(`  Tool Selection:`);
      console.log(`    Include All: ${toolSelection.includeAll}`);
      if (
        toolSelection.includeTools &&
        Array.isArray(toolSelection.includeTools)
      ) {
        console.log(
          `    Include Tools: ${toolSelection.includeTools.join(', ')}`
        );
      }
      if (
        toolSelection.excludeTools &&
        Array.isArray(toolSelection.excludeTools)
      ) {
        console.log(
          `    Exclude Tools: ${toolSelection.excludeTools.join(', ')}`
        );
      }
    }
    return true;
  } else {
    logTest(
      'Assistant Agent Config',
      'FAIL',
      result.error || 'Invalid response'
    );
    return false;
  }
}

async function testNonStreamingAssistantAgent(): Promise<string | null> {
  logTest('Non-Streaming Assistant Agent', 'RUNNING');

  // Create a test conversation first
  const conversationId = await createTestConversation(
    'Non-Streaming Assistant Agent Test'
  );
  if (!conversationId) {
    logTest(
      'Non-Streaming Assistant Agent',
      'FAIL',
      'Failed to create test conversation'
    );
    return null;
  }

  const agentRequest = createAgentRequest(
    'Hello! Can you tell me about Irmin and help me understand what it does?',
    {
      conversationId,
    }
  );

  const result = await makeRequest(`${BASE_URL}/api/agents/assistant`, {
    method: 'POST',
    body: JSON.stringify(agentRequest),
  });

  const content = getResponseData<string>(result, 'content');
  const messages = getResponseData<Array<Record<string, unknown>>>(
    result,
    'messages'
  );

  if (content) {
    logTest(
      'Non-Streaming Assistant Agent',
      'PASS',
      `Response length: ${content.length}`
    );
    console.log(`  Content preview: ${content.substring(0, 200)}...`);

    if (messages) {
      console.log(`  Messages: ${messages.length}`);
      messages.forEach((msg: Record<string, unknown>, index: number) => {
        const msgContent =
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content);
        console.log(
          `    ${index + 1}. ${msg.role}: ${msgContent.substring(0, 100)}...`
        );

        // Log tool calls if present
        if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
          console.log(`      Tool calls: ${msg.toolCalls.length}`);
          msg.toolCalls.forEach(
            (toolCall: Record<string, unknown>, toolIndex: number) => {
              console.log(
                `        ${toolIndex + 1}. ${toolCall.name} (${toolCall.id})`
              );
            }
          );
        }
      });
    }

    return conversationId;
  } else {
    logTest(
      'Non-Streaming Assistant Agent',
      'FAIL',
      result.error || 'Invalid response'
    );
    // Clean up the conversation on failure
    await deleteTestConversation(conversationId);
    return null;
  }
}

async function testStreamingAssistantAgent(
  conversationId: string
): Promise<boolean> {
  logTest('Streaming Assistant Agent', 'RUNNING');

  const agentRequest = createAgentRequest(
    'What are the main features of Irmin? Can you explain how data versioning works?',
    {
      conversationId,
    }
  );

  const result = await makeStreamingRequest(
    `${BASE_URL}/api/agents/assistant/stream`,
    {
      method: 'POST',
      body: JSON.stringify(agentRequest),
    }
  );

  if (result.ok && result.stream) {
    logTest('Streaming Assistant Agent', 'PASS', 'Stream received');

    // Process the stream
    const streamData = await processStream(result.stream);
    console.log(`  Stream data length: ${streamData.length} characters`);

    // Try to parse as JSON lines
    const lines = streamData.split('\n').filter((line) => line.trim());
    console.log(`  Stream chunks: ${lines.length}`);

    // Log sample stream content
    if (lines.length > 0) {
      console.log(`  Sample stream content:`);
      lines.slice(0, 3).forEach((line, index) => {
        try {
          const parsed = JSON.parse(line);
          console.log(
            `    ${index + 1}. ${JSON.stringify(parsed).substring(0, 100)}...`
          );
        } catch {
          console.log(`    ${index + 1}. ${line.substring(0, 100)}...`);
        }
      });
      if (lines.length > 3) {
        console.log(`    ... and ${lines.length - 3} more chunks`);
      }
    }

    return true;
  } else {
    logTest(
      'Streaming Assistant Agent',
      'FAIL',
      result.error || 'No stream received'
    );
    return false;
  }
}

async function testAssistantAgentFlow(): Promise<boolean> {
  logTest('Assistant Agent Flow', 'RUNNING');

  // Create a new conversation with first message
  const conversationId = await createTestConversation(
    'Assistant Agent Flow Test'
  );
  if (!conversationId) {
    logTest(
      'Assistant Agent Flow',
      'FAIL',
      'Failed to create test conversation'
    );
    return false;
  }

  const firstRequest = createAgentRequest(
    'I want to learn about Irmin data versioning and how it works',
    {
      conversationId,
    }
  );

  const firstResult = await makeRequest(`${BASE_URL}/api/agents/assistant`, {
    method: 'POST',
    body: JSON.stringify(firstRequest),
  });

  if (!firstResult.ok) {
    logTest('Assistant Agent Flow', 'FAIL', 'Failed to send first message');
    console.log(`  First result: ${JSON.stringify(firstResult, null, 2)}`);
    await deleteTestConversation(conversationId);
    return false;
  }

  console.log(`  Created conversation: ${conversationId}`);

  // Add follow-up message
  await delay(1000);

  const followUpRequest = createAgentRequest(
    'Can you show me how to create a branch and work with repositories?',
    {
      conversationId,
    }
  );

  const followUpResult = await makeRequest(`${BASE_URL}/api/agents/assistant`, {
    method: 'POST',
    body: JSON.stringify(followUpRequest),
  });

  const messages = getResponseData<Array<Record<string, unknown>>>(
    followUpResult,
    'messages'
  );

  if (followUpResult.ok && messages) {
    logTest(
      'Assistant Agent Flow',
      'PASS',
      `Total messages: ${messages.length}`
    );

    messages.forEach((msg: Record<string, unknown>, index: number) => {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content);
      console.log(
        `    ${index + 1}. ${msg.role}: ${content.substring(0, 120)}${content.length > 120 ? '...' : ''}`
      );

      // Log tool calls if present
      if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
        console.log(`      Tool calls: ${msg.toolCalls.length}`);
        msg.toolCalls.forEach(
          (toolCall: Record<string, unknown>, toolIndex: number) => {
            console.log(
              `        ${toolIndex + 1}. ${toolCall.name} (${toolCall.id})`
            );
          }
        );
      }
    });
  } else {
    logTest('Assistant Agent Flow', 'FAIL', 'Failed to add follow-up message');
    console.log(
      `  Follow-up result: ${JSON.stringify(followUpResult, null, 2)}`
    );
    // Clean up the conversation
    await deleteTestConversation(conversationId);
    return false;
  }

  // Clean up the conversation
  await deleteTestConversation(conversationId);
  return true;
}

async function testConversationManagement(): Promise<boolean> {
  logTest('Conversation Management', 'RUNNING');

  // Test 1: List conversations
  const listResult = await makeRequest(`${BASE_URL}/api/conversations`);
  if (!listResult.ok) {
    logTest('Conversation Management', 'FAIL', 'Failed to list conversations');
    console.log(`  List result: ${JSON.stringify(listResult, null, 2)}`);
    return false;
  }

  const conversations = getResponseData<Array<Record<string, unknown>>>(
    listResult,
    'data'
  );
  console.log(`  Found ${conversations?.length || 0} existing conversations`);

  // Test 2: Create a new conversation
  const createResult = await makeRequest(`${BASE_URL}/api/conversations`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Conversation Management',
      metadata: { test: true },
      agentId: 'assistant',
    }),
  });

  if (!createResult.ok) {
    logTest('Conversation Management', 'FAIL', 'Failed to create conversation');
    return false;
  }

  const newConversation = createResult.data as Record<string, unknown>;
  const conversationId = newConversation?.id as string;

  if (!conversationId) {
    logTest('Conversation Management', 'FAIL', 'No conversation ID returned');
    return false;
  }

  console.log(`  Created conversation: ${conversationId}`);

  // Test 3: Get specific conversation
  const getResult = await makeRequest(
    `${BASE_URL}/api/conversations/${conversationId}`
  );
  if (!getResult.ok) {
    logTest('Conversation Management', 'FAIL', 'Failed to get conversation');
    await deleteTestConversation(conversationId);
    return false;
  }

  const conversation = getResponseData<Record<string, unknown>>(
    getResult,
    'data'
  );
  console.log(`  Retrieved conversation: ${conversation?.title}`);

  // Test 4: Update conversation
  const updateResult = await makeRequest(
    `${BASE_URL}/api/conversations/${conversationId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Test Conversation',
        metadata: { test: true, updated: true },
      }),
    }
  );

  if (!updateResult.ok) {
    logTest('Conversation Management', 'FAIL', 'Failed to update conversation');
    await deleteTestConversation(conversationId);
    return false;
  }

  const updatedConversation = getResponseData<Record<string, unknown>>(
    updateResult,
    'data'
  );
  console.log(`  Updated conversation: ${updatedConversation?.title}`);

  // Test 5: Generate title (requires a user message first)
  const userMessageResult = await makeRequest(
    `${BASE_URL}/api/agents/assistant`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'This is a test message for title generation',
        conversationId,
      }),
    }
  );

  if (userMessageResult.ok) {
    const generateTitleResult = await makeRequest(
      `${BASE_URL}/api/conversations/${conversationId}/generate-title`,
      {
        method: 'POST',
      }
    );

    if (generateTitleResult.ok) {
      const titledConversation = getResponseData<Record<string, unknown>>(
        generateTitleResult,
        'data'
      );
      console.log(`  Generated title: ${titledConversation?.title}`);
    } else {
      console.log('  Title generation failed (non-critical)');
    }
  }

  // Test 6: Get conversation messages
  const messagesResult = await makeRequest(
    `${BASE_URL}/api/conversations/${conversationId}/messages`
  );

  if (messagesResult.ok) {
    const messages = getResponseData<Array<Record<string, unknown>>>(
      messagesResult,
      'data'
    );
    console.log(`  Found ${messages?.length || 0} messages in conversation`);
  } else {
    console.log('  Failed to get conversation messages (non-critical)');
  }

  // Test 7: Delete conversation
  const deleteResult = await makeRequest(
    `${BASE_URL}/api/conversations/${conversationId}`,
    {
      method: 'DELETE',
    }
  );

  if (!deleteResult.ok) {
    logTest('Conversation Management', 'FAIL', 'Failed to delete conversation');
    return false;
  }

  console.log(`  Deleted conversation: ${conversationId}`);

  logTest(
    'Conversation Management',
    'PASS',
    'All conversation operations successful'
  );
  return true;
}

async function testInfoEndpoints(): Promise<boolean> {
  logTest('Info Endpoints', 'RUNNING');

  let allPassed = true;

  // Test 1: Get user profile
  const userResult = await makeRequest(`${BASE_URL}/api/info/user`);
  if (userResult.ok) {
    const userData = userResult.data as Record<string, unknown>;
    const userName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (userData?.user as any)?.name ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (userData as any)?.name ||
      'Unknown';
    console.log(`  User: ${userName}`);
  } else {
    console.log('  Failed to get user profile');
    allPassed = false;
  }

  // Test 2: Get workspace info
  const workspaceResult = await makeRequest(`${BASE_URL}/api/info/workspace`);
  if (workspaceResult.ok) {
    const workspaceData = workspaceResult.data as Record<string, unknown>;
    const workspaceName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (workspaceData?.workspace as any)?.name ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (workspaceData as any)?.name ||
      'Unknown';
    console.log(`  Workspace: ${workspaceName}`);
  } else {
    console.log('  Failed to get workspace info');
    allPassed = false;
  }

  // Test 3: Get available models
  const modelsResult = await makeRequest(`${BASE_URL}/api/info/models`);
  if (modelsResult.ok) {
    const modelsData = modelsResult.data as Record<string, unknown>;
    const models = modelsData?.models as Array<Record<string, unknown>>;
    console.log(`  Available models: ${models?.length || 0}`);
    if (models && models.length > 0) {
      console.log(`    Sample: ${models[0].name} (${models[0].provider})`);
    }
  } else {
    console.log('  Failed to get models');
    allPassed = false;
  }

  // Test 4: Get available tools
  const toolsResult = await makeRequest(`${BASE_URL}/api/info/tools`);
  if (toolsResult.ok) {
    const toolsData = toolsResult.data as Record<string, unknown>;
    const tools = toolsData?.tools as Array<Record<string, unknown>>;
    const toolsCount = toolsData?.count as number;
    console.log(`  Available tools: ${toolsCount || 0}`);
    if (tools && Array.isArray(tools)) {
      console.log(
        `    Sample tools: ${tools
          .slice(0, 3)
          .map((t: Record<string, unknown>) => t.name)
          .join(', ')}`
      );
    }
  } else {
    console.log('  Failed to get tools');
    allPassed = false;
  }

  if (allPassed) {
    logTest('Info Endpoints', 'PASS', 'All info endpoints accessible');
  } else {
    logTest('Info Endpoints', 'FAIL', 'Some info endpoints failed');
  }

  return allPassed;
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Assistant Agent API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Workspace: ${WORKSPACE_SLUG}`);
  console.log(`🔑 Auth Token: ${TEST_AUTH_TOKEN.substring(0, 20)}...`);

  const results: TestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Test 1: Agent Listing
    logSection('Agent Management');
    const agents = await testAgentListing();
    if (agents.length > 0) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 2: Assistant Agent Configuration
    const agentConfigSuccess = await testAssistantAgentConfig();
    if (agentConfigSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 3: Non-Streaming Assistant Agent
    logSection('Assistant Agent Endpoints');
    const conversationId = await testNonStreamingAssistantAgent();
    if (conversationId) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 4: Streaming Assistant Agent (using the conversation from non-streaming test)
    const streamingAgentSuccess = await testStreamingAssistantAgent(
      conversationId || ''
    );
    if (streamingAgentSuccess) results.passed++;
    else results.failed++;

    // Clean up the conversation after both agent tests are done
    if (conversationId) {
      await deleteTestConversation(conversationId);
    }

    await delay(TEST_CONFIG.delay);

    // Test 5: Assistant Agent Flow
    logSection('Assistant Agent Flow');
    const agentFlowSuccess = await testAssistantAgentFlow();
    if (agentFlowSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 6: Conversation Management
    logSection('Conversation Management');
    const conversationManagementSuccess = await testConversationManagement();
    if (conversationManagementSuccess) results.passed++;
    else results.failed++;

    await delay(TEST_CONFIG.delay);

    // Test 7: Info Endpoints
    logSection('Info Endpoints');
    const infoEndpointsSuccess = await testInfoEndpoints();
    if (infoEndpointsSuccess) results.passed++;
    else results.failed++;
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
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runAllTests().catch(console.error);
