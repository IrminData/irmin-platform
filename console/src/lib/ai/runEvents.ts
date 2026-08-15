/* eslint-disable import-x/no-unused-modules -- Public versioned run protocol contract. */
export const RUN_EVENT_VERSION = 1 as const;

export const RUN_EVENT_TYPES = [
  'run.started',
  'message.delta',
  'reasoning.summary',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'tool.approval_required',
  'usage',
  'run.completed',
  'run.failed',
  'run.cancelled',
] as const;

export type RunEventType = (typeof RUN_EVENT_TYPES)[number];

export interface RunEventV1 {
  version: typeof RUN_EVENT_VERSION;
  sequence: number;
  timestamp: string;
  runId: string;
  type: RunEventType;
  data: unknown;
}

export class RunProtocolError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = 'RunProtocolError';
  }
}

/** Validate an untrusted NDJSON value as a RunEventV1 envelope. */
export function parseRunEventV1(value: unknown): RunEventV1 {
  if (typeof value !== 'object' || value === null) {
    throw new RunProtocolError('Run event must be an object', 'malformed');
  }

  const event = value as Record<string, unknown>;
  if (event.version !== RUN_EVENT_VERSION) {
    throw new RunProtocolError('Unsupported run event version', 'version');
  }
  if (!Number.isInteger(event.sequence) || Number(event.sequence) < 1) {
    throw new RunProtocolError('Invalid run event sequence', 'sequence');
  }
  if (typeof event.timestamp !== 'string' || !Date.parse(event.timestamp)) {
    throw new RunProtocolError('Invalid run event timestamp', 'timestamp');
  }
  if (typeof event.runId !== 'string' || !event.runId) {
    throw new RunProtocolError('Invalid run ID', 'run_id');
  }
  if (
    typeof event.type !== 'string' ||
    !RUN_EVENT_TYPES.includes(event.type as RunEventType)
  ) {
    throw new RunProtocolError('Unknown run event type', 'event_type');
  }

  return event as unknown as RunEventV1;
}
