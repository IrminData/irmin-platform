import { decodeNDJSONStream } from '@/lib/ai/decodeNDJSONStream';
import { parseRunEventV1 } from '@/lib/ai/runEvents';
import {
  finalizeRunState,
  initialRunState,
  reduceRunEvent,
  type RunState,
} from '@/lib/ai/runReducer';

import type { ServerStreamEvent } from './types';

function partsFromState(state: RunState): ServerStreamEvent[] {
  const parts: ServerStreamEvent[] = state.reasoningSummaries.map(
    (summary, index) => ({
      type: 'reasoning-end',
      id: `summary-${index}`,
      delta: summary,
    })
  );

  for (const tool of Object.values(state.tools)) {
    parts.push({
      type: 'tool-input-available',
      toolCallId: tool.id,
      toolName: tool.name,
      input:
        typeof tool.input === 'object' && tool.input !== null
          ? (tool.input as Record<string, unknown>)
          : {},
    });
    if (tool.status === 'completed') {
      parts.push({
        type: 'tool-output-available',
        toolCallId: tool.id,
        toolName: tool.name,
        output:
          typeof tool.output === 'string'
            ? tool.output
            : JSON.stringify(tool.output),
      });
    } else if (tool.status === 'failed') {
      parts.push({ type: 'stream-error', error: tool.error });
    } else if (tool.status === 'approval_required') {
      parts.push({
        type: 'tool-approval-required',
        toolCallId: tool.id,
        toolName: tool.name,
        approvalPreview: tool.error,
      });
    }
  }

  if (state.status === 'completed') parts.push({ type: 'stream-complete' });
  if (state.status === 'failed') {
    parts.push({ type: 'stream-error', error: state.error?.message });
  }
  return parts;
}

function createFrameBatcher(onUpdate: (state: RunState) => void): {
  schedule: (state: RunState) => void;
  flush: (state: RunState) => void;
} {
  let pending: RunState | undefined;
  let scheduled = false;
  const publish = () => {
    scheduled = false;
    if (pending) onUpdate(pending);
    pending = undefined;
  };
  return {
    schedule(state) {
      pending = state;
      if (scheduled) return;
      scheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(publish);
      } else {
        queueMicrotask(publish);
      }
    },
    flush(state) {
      pending = state;
      publish();
    },
  };
}

/** Decode, validate, and reduce a provider-neutral Irmin run stream. */
export const processStream = async (
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  onContentUpdate?: (content: string) => void,
  onPartsUpdate?: (parts: ServerStreamEvent[]) => void
): Promise<{
  content: string;
  parts: ServerStreamEvent[];
  status: RunState['status'];
  runId?: string;
  messageId?: string;
}> => {
  let state = initialRunState;
  const batcher = createFrameBatcher((next) => {
    onContentUpdate?.(next.content);
    onPartsUpdate?.(partsFromState(next));
  });

  for await (const value of decodeNDJSONStream<unknown>(stream, signal)) {
    state = reduceRunEvent(state, parseRunEventV1(value));
    batcher.schedule(state);
  }

  state = finalizeRunState(state);
  batcher.flush(state);
  return {
    content: state.content,
    parts: partsFromState(state),
    status: state.status,
    runId: state.runId,
    messageId: state.messageId,
  };
};
