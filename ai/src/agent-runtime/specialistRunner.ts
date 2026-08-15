/* eslint-disable import-x/no-unused-modules -- Public agent runtime module. */
import type { BaseMessage } from '@langchain/core/messages';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { AgentResponse, SpecialistResult } from '@/agents/types';

import { getContentAsString } from '@/utils/getContentAsString';

import { toolCatalog } from './toolCatalog';

const execFileAsync = promisify(execFile);
const SQL_START =
  /^\s*(?:SELECT|WITH|INSERT|UPDATE|DELETE|COPY|CREATE\s+(?:OR\s+REPLACE\s+)?TEMP(?:ORARY)?\s+(?:TABLE|VIEW)|DESCRIBE|SHOW)\b/i;
const BLOCKED_SQL =
  /\b(?:ATTACH|INSTALL|LOAD|EXPORT\s+DATABASE|IMPORT\s+DATABASE|CREATE\s+SECRET|DROP\s+SECRET)\b/i;

/** Executes the typed specialist acceptance boundary without checkpoints. */
export class SpecialistRunner {
  acceptSql(response: AgentResponse): SpecialistResult {
    const content = lastContent(response.messages);
    const cleaned = stripFence(content);
    if (!SQL_START.test(cleaned)) {
      return { kind: 'clarification', message: cleaned };
    }
    if (BLOCKED_SQL.test(cleaned) || !balancedSql(cleaned)) {
      return {
        kind: 'clarification',
        message: 'The generated SQL did not pass the DuckDB safety parser.',
      };
    }
    if (!hasSuccessfulSqlExecution(response.messages, cleaned)) {
      return {
        kind: 'clarification',
        message: 'The generated SQL could not be verified by DuckDB.',
      };
    }
    return { kind: 'sql', sql: cleaned };
  }

  async acceptGo(
    response: AgentResponse,
    signal?: AbortSignal
  ): Promise<SpecialistResult> {
    const content = stripFence(lastContent(response.messages));
    if (
      !/\bpackage\s+main\b/.test(content) ||
      !/\bfunc\s+main\s*\(/.test(content)
    ) {
      return { kind: 'clarification', message: content };
    }
    try {
      return { kind: 'go', code: await formatAndCompileGo(content, signal) };
    } catch (error) {
      return {
        kind: 'clarification',
        message: `The generated Go script did not compile: ${error instanceof Error ? error.message : 'unknown compiler error'}`,
      };
    }
  }
}

function lastContent(messages: BaseMessage[] | undefined): string {
  const message = messages?.at(-1);
  return message ? getContentAsString(message.content).trim() : '';
}

function stripFence(content: string): string {
  return content
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

function hasSuccessfulSqlExecution(
  messages: BaseMessage[] | undefined,
  finalSql: string
): boolean {
  const matchingCallIds = new Set<string>();
  for (const message of messages ?? []) {
    const candidate = message as BaseMessage & {
      tool_calls?: Array<{
        id?: string;
        name?: string;
        args?: Record<string, unknown>;
      }>;
    };
    for (const call of candidate.tool_calls ?? []) {
      if (
        call.id &&
        call.name &&
        toolCatalog.hasCapability(call.name, ['query.execute']) &&
        call.args?.sql === finalSql
      ) {
        matchingCallIds.add(call.id);
      }
    }
  }
  return (messages ?? []).some((message) => {
    const candidate = message as BaseMessage & {
      name?: string;
      status?: string;
      tool_call_id?: string;
    };
    return (
      candidate.getType() === 'tool' &&
      typeof candidate.name === 'string' &&
      toolCatalog.hasCapability(candidate.name, ['query.execute']) &&
      typeof candidate.tool_call_id === 'string' &&
      matchingCallIds.has(candidate.tool_call_id) &&
      candidate.status !== 'error'
    );
  });
}

function balancedSql(sql: string): boolean {
  let quote: "'" | '"' | undefined;
  let parentheses = 0;
  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    if (quote) {
      if (character === quote && sql[index + 1] === quote) {
        index++;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === '(') parentheses++;
    else if (character === ')' && --parentheses < 0) return false;
  }
  return quote === undefined && parentheses === 0;
}

async function formatAndCompileGo(
  source: string,
  signal?: AbortSignal
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'irmin-specialist-go-'));
  const sourcePath = path.join(directory, 'main.go');
  const modulePath = path.resolve(process.cwd(), '../sdks/go');
  try {
    assertAllowedGoImports(source);
    const localSdk = await access(modulePath).then(
      () => true,
      () => false
    );
    const sdkRequirement = localSdk
      ? `require github.com/IrminData/irmin-platform/sdks/go v0.0.0\nreplace github.com/IrminData/irmin-platform/sdks/go => ${modulePath}`
      : 'require github.com/IrminData/irmin-platform/sdks/go v0.1.0';
    await Promise.all([
      writeFile(sourcePath, source),
      writeFile(
        path.join(directory, 'go.mod'),
        `module irmin-specialist-check\n\ngo 1.26.5\n\n${sdkRequirement}\n`
      ),
    ]);
    await execFileAsync('gofmt', ['-w', sourcePath], {
      timeout: 10_000,
      signal,
    });
    await execFileAsync('go', ['build', '-o', 'compiled-check', '.'], {
      cwd: directory,
      timeout: 60_000,
      env: { ...process.env, CGO_ENABLED: '0', GOWORK: 'off' },
      signal,
    });
    return await readFile(sourcePath, 'utf8');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function assertAllowedGoImports(source: string): void {
  const imports = [
    ...[...source.matchAll(/^\s*import\s+(?:[.\w]+\s+)?"([^"]+)"/gm)].map(
      (match) => match[1]
    ),
    ...[...source.matchAll(/^\s*import\s*\(([\s\S]*?)^\s*\)/gm)].flatMap(
      (block) =>
        [...block[1].matchAll(/^\s*(?:[.\w]+\s+)?"([^"]+)"/gm)].map(
          (match) => match[1]
        )
    ),
  ];
  for (const imported of imports) {
    if (
      imported.includes('.') &&
      !imported.startsWith('github.com/IrminData/irmin-platform/sdks/go/')
    ) {
      throw new Error(`unsupported import ${imported}`);
    }
  }
}

export const specialistRunner = new SpecialistRunner();
