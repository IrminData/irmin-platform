/* eslint-disable import-x/no-unused-modules -- Public versioned run protocol contract. */
export const RUN_EVENT_VERSION = 1 as const;

export type RunEventType =
  | 'run.started'
  | 'message.delta'
  | 'reasoning.summary'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'tool.approval_required'
  | 'usage'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled';

export interface RunEventV1 {
  version: typeof RUN_EVENT_VERSION;
  sequence: number;
  timestamp: string;
  runId: string;
  type: RunEventType;
  data: unknown;
}

const TERMINAL_EVENT_TYPES = new Set<RunEventType>([
  'run.completed',
  'run.failed',
  'run.cancelled',
]);

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : undefined;
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((block) => {
      const value = asRecord(block);
      return value?.type === 'text' && typeof value.text === 'string'
        ? value.text
        : '';
    })
    .join('');
}

function chunkFromEvent(event: UnknownRecord): UnknownRecord | undefined {
  const data = asRecord(event.data);
  const chunk = asRecord(data?.chunk);
  return asRecord(chunk?.kwargs) ?? chunk;
}

function usageFromChunk(chunk: UnknownRecord | undefined): unknown {
  const usage = asRecord(chunk?.usage_metadata);
  if (!usage) return undefined;
  return { reported: true };
}

function isInternalModelEvent(event: UnknownRecord): boolean {
  const metadata = asRecord(event.metadata);
  const source = metadata?.lc_source;
  const node = metadata?.langgraph_node;
  return (
    source === 'summarization' ||
    (typeof node === 'string' && /summari[sz]/i.test(node))
  );
}

function approvalFromOutput(output: unknown): UnknownRecord | undefined {
  const visit = (value: unknown): UnknownRecord | undefined => {
    if (typeof value === 'string') {
      try {
        return visit(JSON.parse(value));
      } catch {
        return undefined;
      }
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    }
    const record = asRecord(value);
    if (!record) return undefined;
    if (
      record.requires_approval === true &&
      typeof record.pending_operation_id === 'string'
    ) {
      return record;
    }
    for (const child of Object.values(record)) {
      const found = visit(child);
      if (found) return found;
    }
    return undefined;
  };
  return visit(output);
}

function completedMessageId(event: unknown): string | undefined {
  const value = asRecord(event);
  if (value?.event !== 'on_chat_model_end') return undefined;
  const output = asRecord(asRecord(value.data)?.output);
  const message = asRecord(output?.kwargs) ?? output;
  return typeof message?.id === 'string' ? message.id : undefined;
}

/** Convert one internal LangChain event into provider-neutral browser events. */
export function normalizeLangChainEvent(
  rawEvent: unknown
): Array<{ type: RunEventType; data: unknown }> {
  const event = asRecord(rawEvent);
  if (!event || typeof event.event !== 'string') return [];
  if (event.event.startsWith('on_chat_model_') && isInternalModelEvent(event)) {
    return [];
  }

  const runId = typeof event.run_id === 'string' ? event.run_id : undefined;
  const name = typeof event.name === 'string' ? event.name : undefined;

  switch (event.event) {
    case 'on_chat_model_start':
      return [
        {
          type: 'reasoning.summary',
          data: { summary: 'Reviewing context and planning the next step.' },
        },
      ];
    case 'on_chat_model_stream': {
      const chunk = chunkFromEvent(event);
      const text = textFromContent(chunk?.content);
      const normalized: Array<{ type: RunEventType; data: unknown }> = [];
      if (text)
        normalized.push({ type: 'message.delta', data: { delta: text } });
      const usage = usageFromChunk(chunk);
      if (usage) normalized.push({ type: 'usage', data: usage });
      return normalized;
    }
    case 'on_tool_start':
      return [
        {
          type: 'reasoning.summary',
          data: { summary: 'Using an authorized tool to continue.' },
        },
        {
          type: 'tool.started',
          data: { toolCallId: runId, toolName: name },
        },
      ];
    case 'on_tool_end': {
      const approval = approvalFromOutput(asRecord(event.data)?.output);
      if (approval) {
        return [
          {
            type: 'tool.approval_required',
            data: {
              toolCallId: runId,
              toolName: name,
              pendingOperationId: approval.pending_operation_id,
              approvalPreview: approval.approval_preview,
              workspaceSlug: approval.workspace_slug,
            },
          },
        ];
      }
      return [
        {
          type: 'tool.completed',
          data: { toolCallId: runId, toolName: name },
        },
      ];
    }
    case 'on_tool_error':
      return [
        {
          type: 'tool.failed',
          data: {
            toolCallId: runId,
            toolName: name,
            message: 'Tool execution failed',
          },
        },
      ];
    default:
      return [];
  }
}

interface CreateRunEventStreamOptions {
  runId: string;
  agentId: string;
  conversationId: string;
  signal: AbortSignal;
  source: () => Promise<ReadableStream<unknown>>;
  onCancel?: (reason?: unknown) => void;
  onEvent?: (event: RunEventV1) => void | Promise<void>;
}

/** Wrap an internal model stream in the stable Irmin NDJSON run protocol. */
export function createRunEventStream({
  runId,
  agentId,
  conversationId,
  signal,
  source,
  onCancel,
  onEvent,
}: CreateRunEventStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sequence = 0;
  let sourceReader: ReadableStreamDefaultReader<unknown> | undefined;
  let terminal = false;
  let messageId: string | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = async (type: RunEventType, data: unknown) => {
        if (terminal) return;
        const event: RunEventV1 = {
          version: RUN_EVENT_VERSION,
          sequence: ++sequence,
          timestamp: new Date().toISOString(),
          runId,
          type,
          data,
        };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        if (TERMINAL_EVENT_TYPES.has(type)) terminal = true;
        void Promise.resolve()
          .then(() => onEvent?.(event))
          .catch((error) => {
            console.error('[RunEvents] Event side effect failed', error);
          });
      };

      void (async () => {
        try {
          await emit('run.started', { agentId, conversationId });
          if (signal.aborted) {
            await emit('run.cancelled', { reason: 'cancelled' });
            controller.close();
            return;
          }

          const stream = await source();
          sourceReader = stream.getReader();
          while (!terminal) {
            if (signal.aborted) {
              await sourceReader.cancel(signal.reason).catch(() => undefined);
              await emit('run.cancelled', { reason: 'cancelled' });
              break;
            }

            const { done, value } = await sourceReader.read();
            if (done) break;
            messageId = completedMessageId(value) ?? messageId;
            for (const normalized of normalizeLangChainEvent(value)) {
              await emit(normalized.type, normalized.data);
            }
          }

          if (!terminal) {
            await emit('run.completed', { conversationId, messageId });
          }
          controller.close();
        } catch (error) {
          const cancelled =
            signal.aborted ||
            (error instanceof Error && error.name === 'AbortError');
          await emit(
            cancelled ? 'run.cancelled' : 'run.failed',
            cancelled
              ? { reason: 'cancelled' }
              : { message: 'The agent run failed', code: 'internal_error' }
          ).catch(() => undefined);
          try {
            controller.close();
          } catch {
            // The consumer may already have cancelled the stream.
          }
        } finally {
          sourceReader?.releaseLock();
        }
      })();
    },
    async cancel(reason) {
      onCancel?.(reason);
      await sourceReader?.cancel(reason).catch(() => undefined);
      if (!terminal) {
        terminal = true;
        const event: RunEventV1 = {
          version: RUN_EVENT_VERSION,
          sequence: ++sequence,
          timestamp: new Date().toISOString(),
          runId,
          type: 'run.cancelled',
          data: { reason: 'cancelled' },
        };
        void Promise.resolve()
          .then(() => onEvent?.(event))
          .catch((error) => {
            console.error('[RunEvents] Cancellation side effect failed', error);
          });
      }
    },
  });
}
