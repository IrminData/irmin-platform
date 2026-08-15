/* eslint-disable import-x/no-unused-modules -- Public reducer contract for UI controllers. */
import type { RunEventV1 } from './runEvents';

export type RunStatus =
  'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunToolState {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'approval_required';
  summary?: string;
  error?: string;
  pendingOperationId?: string;
  approvalPreview?: string;
  workspaceSlug?: string;
}

export interface RunState {
  runId?: string;
  messageId?: string;
  nextSequence: number;
  status: RunStatus;
  content: string;
  reasoningSummaries: string[];
  tools: Record<string, RunToolState>;
  error?: { code: string; message: string };
}

export const initialRunState: RunState = {
  nextSequence: 1,
  status: 'idle',
  content: '',
  reasoningSummaries: [],
  tools: {},
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function protocolFailure(
  state: RunState,
  code: string,
  message: string
): RunState {
  return { ...state, status: 'failed', error: { code, message } };
}

/** Reduce one validated event with strict sequencing and terminal semantics. */
export function reduceRunEvent(state: RunState, event: RunEventV1): RunState {
  if (
    state.status === 'completed' ||
    state.status === 'failed' ||
    state.status === 'cancelled'
  ) {
    return state;
  }
  if (event.sequence < state.nextSequence) return state;
  if (event.sequence > state.nextSequence) {
    return protocolFailure(
      state,
      'out_of_order',
      'The response stream arrived out of order'
    );
  }
  if (state.runId && event.runId !== state.runId) {
    return protocolFailure(
      state,
      'run_mismatch',
      'The response stream changed run ID'
    );
  }

  const data = record(event.data);
  const next = {
    ...state,
    runId: state.runId ?? event.runId,
    nextSequence: state.nextSequence + 1,
  };

  if (event.type !== 'run.started' && state.status === 'idle') {
    return protocolFailure(
      next,
      'missing_start',
      'The response stream did not start correctly'
    );
  }

  switch (event.type) {
    case 'run.started':
      return state.status === 'idle'
        ? { ...next, status: 'running' }
        : protocolFailure(
            next,
            'duplicate_start',
            'The response stream started twice'
          );
    case 'message.delta':
      return typeof data.delta === 'string'
        ? { ...next, content: next.content + data.delta }
        : protocolFailure(
            next,
            'invalid_delta',
            'The response contained an invalid text update'
          );
    case 'reasoning.summary':
      return typeof data.summary === 'string'
        ? {
            ...next,
            reasoningSummaries: [...next.reasoningSummaries, data.summary],
          }
        : next;
    case 'tool.started':
    case 'tool.completed':
    case 'tool.failed':
    case 'tool.approval_required': {
      const id =
        typeof data.toolCallId === 'string'
          ? data.toolCallId
          : `tool-${event.sequence}`;
      const previous = next.tools[id];
      const name =
        typeof data.toolName === 'string'
          ? data.toolName
          : (previous?.name ?? 'unknown');
      const status =
        event.type === 'tool.started'
          ? 'running'
          : event.type === 'tool.completed'
            ? 'completed'
            : event.type === 'tool.failed'
              ? 'failed'
              : 'approval_required';
      return {
        ...next,
        tools: {
          ...next.tools,
          [id]: {
            ...previous,
            id,
            name,
            status,
            summary:
              typeof data.summary === 'string'
                ? data.summary
                : previous?.summary,
            error:
              typeof data.message === 'string' ? data.message : previous?.error,
            pendingOperationId:
              typeof data.pendingOperationId === 'string'
                ? data.pendingOperationId
                : previous?.pendingOperationId,
            approvalPreview:
              typeof data.approvalPreview === 'string'
                ? data.approvalPreview
                : previous?.approvalPreview,
            workspaceSlug:
              typeof data.workspaceSlug === 'string'
                ? data.workspaceSlug
                : previous?.workspaceSlug,
          },
        },
      };
    }
    case 'usage':
      // Exact usage is operational telemetry and is never retained by the UI.
      return next;
    case 'run.completed':
      return {
        ...next,
        status: 'completed',
        messageId:
          typeof data.messageId === 'string' ? data.messageId : next.runId,
      };
    case 'run.failed':
      return {
        ...next,
        status: 'failed',
        error: {
          code: typeof data.code === 'string' ? data.code : 'run_failed',
          message:
            typeof data.message === 'string'
              ? data.message
              : 'The agent run failed',
        },
      };
    case 'run.cancelled':
      return { ...next, status: 'cancelled' };
  }
}

/** Convert a non-terminal end-of-file into a deterministic protocol failure. */
export function finalizeRunState(state: RunState): RunState {
  return state.status === 'running' || state.status === 'idle'
    ? protocolFailure(
        state,
        'missing_terminal',
        'The response ended before a terminal event'
      )
    : state;
}
