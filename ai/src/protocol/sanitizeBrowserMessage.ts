type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : undefined;
}

/** Remove provider reasoning artifacts from a serialized message sent to a browser. */
export function sanitizeBrowserMessage(message: unknown): unknown {
  const copy = structuredClone(message);
  const root = record(copy);
  const data = record(root?.data);
  if (!data) return copy;

  if (Array.isArray(data.content)) {
    data.content = data.content.filter((block) => {
      const value = record(block);
      return value?.type !== 'thinking' && !('thinking' in (value ?? {}));
    });
  }

  for (const field of ['additional_kwargs', 'response_metadata']) {
    const metadata = record(data[field]);
    if (!metadata) continue;
    delete metadata.reasoning_details;
    delete metadata.thinking;
    delete metadata.signature;
  }
  return copy;
}
