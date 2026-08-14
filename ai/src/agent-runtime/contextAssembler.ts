/* eslint-disable import-x/no-unused-modules -- Public agent runtime module. */
import type { ModelRole } from '@/inference';
import { MODEL_PROFILE } from '@/inference/profiles';

export type ContextTrust =
  'trusted-system' | 'workspace-data' | 'user-provided';

export interface ContextProvenance {
  key: string;
  source: string;
  trust: ContextTrust;
  estimatedTokens: number;
  summarized: boolean;
}

export class ContextBudgetExceededError extends Error {}

const USER_CONTEXT_KEYS = new Set([
  'current-sql',
  'current-script-content',
  'script-name',
  'repository-slug',
  'repository-object-path',
  'repository-ref',
]);

/** Build deterministic, trust-labelled context within the role's input budget. */
export class ContextAssembler {
  assemble(
    role: ModelRole,
    rawContext: Readonly<Record<string, unknown>>,
    reservedInput = ''
  ): Record<string, unknown> {
    const tokenBudget = Math.max(
      0,
      Math.floor(MODEL_PROFILE.roles[role].maxInputTokens * 0.75) -
        estimateTokens(reservedInput)
    );
    const entries = Object.entries(rawContext).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    const result: Record<string, unknown> = {};
    const provenance: ContextProvenance[] = [];
    let remaining = tokenBudget;

    for (const [key, value] of entries) {
      const serialized = serialize(value);
      const estimatedTokens = estimateTokens(serialized);
      const allowance = Math.max(0, remaining);
      const summarized = estimatedTokens > allowance;
      const stored = summarized ? summarize(serialized, allowance * 4) : value;
      const storedTokens = estimateTokens(serialize(stored));
      if (storedTokens > remaining) {
        throw new ContextBudgetExceededError(
          `Context exceeds the ${tokenBudget} token budget for ${role}`
        );
      }
      result[key] = stored;
      provenance.push({
        key,
        source: sourceFor(key),
        trust: trustFor(key),
        estimatedTokens: storedTokens,
        summarized,
      });
      remaining -= storedTokens;
    }

    result._irmin_context = {
      version: 1,
      role,
      tokenBudget,
      estimatedTokens: tokenBudget - remaining,
      provenance,
    };
    return result;
  }
}

function serialize(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

function summarize(value: string, maxCharacters: number): string {
  if (maxCharacters < 80) {
    throw new ContextBudgetExceededError(
      'Context budget has no room for a bounded summary'
    );
  }
  if (value.length <= maxCharacters) return value;
  const marker = '\n…[context summarized to fit budget]…\n';
  const available = maxCharacters - marker.length;
  const head = Math.ceil(available * 0.7);
  return value.slice(0, head) + marker + value.slice(-(available - head));
}

function trustFor(key: string): ContextTrust {
  if (USER_CONTEXT_KEYS.has(key)) return 'user-provided';
  if (key.includes('documentation')) return 'trusted-system';
  return 'workspace-data';
}

function sourceFor(key: string): string {
  if (USER_CONTEXT_KEYS.has(key)) return 'request.context';
  if (key.includes('documentation')) return 'retrieval';
  return 'irmin-api';
}

export const contextAssembler = new ContextAssembler();
