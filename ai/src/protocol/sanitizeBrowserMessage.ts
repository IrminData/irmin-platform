type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : undefined;
}

const PRIVATE_REASONING_FIELDS = [
  'reasoning_content',
  'reasoning_details',
  'thinking',
  'signature',
] as const;

function sanitizeContent(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((block) => {
        const content = record(block);
        return content?.type !== 'thinking' && content?.type !== 'reasoning';
      })
      .map(sanitizeContent);
  }
  const content = record(value);
  if (!content) return value;
  for (const child of Object.keys(content)) {
    content[child] = sanitizeContent(content[child]);
  }
  return content;
}

/** Remove provider reasoning artifacts from a serialized message sent to a browser. */
export function sanitizeBrowserMessage(message: unknown): unknown {
  const copy = structuredClone(message);
  const root = record(copy);
  const data = record(root?.data);
  if (!data) return copy;

  if (root?.type === 'tool') {
    return {
      type: 'tool',
      data: {
        content: 'Authorized tool execution completed.',
        name: data.name,
        tool_call_id: data.tool_call_id,
      },
    };
  }

  if (Array.isArray(data.content)) {
    data.content = sanitizeContent(data.content);
  }

  // Provider metadata, usage, and tool call arguments are operational or
  // server-internal data. The browser only needs the curated message content.
  data.additional_kwargs = {};
  data.response_metadata = {};
  delete data.usage_metadata;
  delete data.tool_calls;
  delete data.invalid_tool_calls;

  for (const privateField of PRIVATE_REASONING_FIELDS) {
    delete data[privateField];
  }
  return copy;
}
