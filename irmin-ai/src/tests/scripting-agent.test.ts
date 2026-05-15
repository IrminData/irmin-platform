/* eslint-disable import-x/no-unused-modules */
// Scripting Agent API test utility for Irmin AI.
// Mirrors assistant-agent.test.ts but targets the synchronous scripting agent
// and exercises the query_sql_assistant sub-agent delegation tool.
import type { AgentConfig, TestResults } from './types';
import {
  BASE_URL,
  createAgentRequest,
  delay,
  logSection,
  logTest,
  makeRequest,
  TEST_AUTH_TOKEN,
  TEST_CONFIG,
  WORKSPACE_SLUG,
} from './utils';

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

async function testScriptingAgentListed(): Promise<boolean> {
  logTest('Scripting Agent Listed', 'RUNNING');
  const result = await makeRequest(`${BASE_URL}/api/agents`);
  const agents = getResponseData<AgentConfig[]>(result, 'agents');
  const scripting = agents?.find((a) => a.id === 'scripting');
  if (scripting) {
    logTest('Scripting Agent Listed', 'PASS', scripting.description);
    return true;
  }
  logTest('Scripting Agent Listed', 'FAIL', 'scripting agent not in registry');
  return false;
}

async function testScriptingAgentConfig(): Promise<boolean> {
  logTest('Scripting Agent Config', 'RUNNING');
  const result = await makeRequest(`${BASE_URL}/api/agents/scripting/config`);
  if (result.ok && result.data && typeof result.data === 'object') {
    const config = result.data as Record<string, unknown>;
    logTest('Scripting Agent Config', 'PASS', `id=${config.id}`);
    const reqs = config.contextRequirements;
    if (Array.isArray(reqs)) {
      const required = reqs.filter(
        (r: Record<string, unknown>) => r.required
      ) as Array<{ name: string }>;
      console.log(
        `  Required context: ${required.map((r) => r.name).join(', ') || '(none)'}`
      );
    }
    return true;
  }
  logTest('Scripting Agent Config', 'FAIL', result.error || 'invalid response');
  return false;
}

// Basic Go script generation — no SQL needed.
async function testBasicScriptGeneration(): Promise<boolean> {
  logTest('Basic Script Generation', 'RUNNING');
  const agentRequest = createAgentRequest(
    'Write a Go script that lists every workspace and prints its name.',
    {
      context: { 'script-name': 'list-workspaces.go' },
    }
  );
  const result = await makeRequest(`${BASE_URL}/api/agents/scripting`, {
    method: 'POST',
    body: JSON.stringify(agentRequest),
  });
  if (!result.ok) {
    logTest(
      'Basic Script Generation',
      'FAIL',
      result.error || 'request failed'
    );
    return false;
  }
  const messages = getResponseData<Array<Record<string, unknown>>>(
    result,
    'messages'
  );
  const last = messages?.[messages.length - 1];
  const content = extractTextContent(last);
  const looksLikeGo =
    content.includes('package main') ||
    content.includes('func main') ||
    content.includes('irmincore.NewClient');
  if (looksLikeGo) {
    logTest(
      'Basic Script Generation',
      'PASS',
      `${content.length} chars, contains Go markers`
    );
    return true;
  }
  logTest(
    'Basic Script Generation',
    'FAIL',
    `response did not look like Go: ${content.slice(0, 200)}`
  );
  return false;
}

// Prompt that should trigger query_sql_assistant. We inspect the response's
// messages for a tool_call to query_sql_assistant.
async function testSqlDelegation(): Promise<boolean> {
  logTest('SQL Delegation', 'RUNNING');
  const agentRequest = createAgentRequest(
    'Write a Go script that runs a DuckDB query joining customers and orders on customer_id from the sales repository main branch and writes the result as joined.json.',
    {
      context: {
        'script-name': 'join-customers-orders.go',
        'repository-slug': 'sales',
        'repository-ref': 'main',
      },
    }
  );
  const result = await makeRequest(`${BASE_URL}/api/agents/scripting`, {
    method: 'POST',
    body: JSON.stringify(agentRequest),
  });
  if (!result.ok) {
    logTest('SQL Delegation', 'FAIL', result.error || 'request failed');
    return false;
  }
  const messages = getResponseData<Array<Record<string, unknown>>>(
    result,
    'messages'
  );
  if (!messages) {
    logTest('SQL Delegation', 'FAIL', 'no messages in response');
    return false;
  }
  const calledSqlAssistant = messages.some((msg) => {
    const data = msg as Record<string, unknown>;
    const kwargs = data.kwargs as Record<string, unknown> | undefined;
    const toolCalls = kwargs?.tool_calls as
      | Array<{ name?: string }>
      | undefined;
    return toolCalls?.some((tc) => tc.name === 'query_sql_assistant') ?? false;
  });
  if (calledSqlAssistant) {
    logTest('SQL Delegation', 'PASS', 'query_sql_assistant was invoked');
    return true;
  }
  logTest(
    'SQL Delegation',
    'FAIL',
    'scripting agent did not delegate to query_sql_assistant'
  );
  return false;
}

function extractTextContent(
  message: Record<string, unknown> | undefined
): string {
  if (!message) return '';
  const kwargs = message.kwargs as Record<string, unknown> | undefined;
  const content = kwargs?.content ?? message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'text' in c) {
          return String((c as { text: unknown }).text);
        }
        return '';
      })
      .join('\n');
  }
  return '';
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Scripting Agent API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Workspace: ${WORKSPACE_SLUG}`);
  console.log(`🔑 Auth Token: ${TEST_AUTH_TOKEN.substring(0, 20)}...`);

  const results: TestResults = { passed: 0, failed: 0, skipped: 0 };

  const tally = (ok: boolean) => {
    if (ok) results.passed++;
    else results.failed++;
  };

  try {
    logSection('Agent Registration');
    tally(await testScriptingAgentListed());
    await delay(TEST_CONFIG.delay);

    tally(await testScriptingAgentConfig());
    await delay(TEST_CONFIG.delay);

    logSection('Script Generation');
    tally(await testBasicScriptGeneration());
    await delay(TEST_CONFIG.delay);

    logSection('SQL Sub-agent Delegation');
    tally(await testSqlDelegation());
  } catch (error) {
    console.error(
      '❌ Test suite error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    results.failed++;
  }

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

runAllTests().catch(console.error);
