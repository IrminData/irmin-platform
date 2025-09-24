import type {
  CurrentReasoning,
  CurrentToolCall,
  ServerStreamEvent,
} from './types';

// Process streaming response chunks
export const processStream = async (
  stream: ReadableStream,
  signal?: AbortSignal,
  onContentUpdate?: (content: string) => void,
  onPartsUpdate?: (parts: ServerStreamEvent[]) => void
): Promise<{ content: string; parts: ServerStreamEvent[] }> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = '';
  const parts: ServerStreamEvent[] = [];
  let currentToolCall: CurrentToolCall = {};
  let currentReasoning: CurrentReasoning = { content: '' };

  try {
    while (true) {
      if (signal?.aborted) {
        reader.releaseLock();
        return { content, parts };
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as ServerStreamEvent;

          switch (parsed.type) {
            case 'text-start':
              break;
            case 'text-delta':
              if (parsed.delta) {
                content += parsed.delta;
                onContentUpdate?.(content);
              }
              break;
            case 'text-end':
              break;
            case 'tool-input-start':
              currentToolCall = {
                id: parsed.toolCallId,
                name: parsed.toolName,
              };
              break;
            case 'tool-input-available': {
              currentToolCall = {
                id: parsed.toolCallId,
                name: parsed.toolName,
                input: parsed.input,
              };
              // Check if this tool call input is already in parts to avoid duplicates
              const existingInputIndex = parts.findIndex(
                (p) =>
                  p.type === 'tool-input-available' &&
                  p.toolCallId === parsed.toolCallId
              );
              if (existingInputIndex === -1) {
                parts.push({
                  type: 'tool-input-available',
                  toolCallId: parsed.toolCallId,
                  toolName: parsed.toolName,
                  input: parsed.input,
                });
              }
              onPartsUpdate?.(parts);
              break;
            }
            case 'tool-output-available': {
              currentToolCall.output = parsed.output;
              // Check if this tool call output is already in parts to avoid duplicates
              const existingOutputIndex = parts.findIndex(
                (p) =>
                  p.type === 'tool-output-available' &&
                  p.toolCallId === parsed.toolCallId
              );
              if (existingOutputIndex === -1) {
                parts.push({
                  type: 'tool-output-available',
                  toolCallId: parsed.toolCallId,
                  output: parsed.output,
                });
              }
              onPartsUpdate?.(parts);
              break;
            }
            case 'reasoning-start':
              currentReasoning = { id: parsed.id, content: '' };
              break;
            case 'reasoning-delta':
              if (parsed.delta) {
                currentReasoning.content += parsed.delta;
              }
              break;
            case 'reasoning-end':
              if (currentReasoning.content.trim()) {
                parts.push({
                  type: 'reasoning-end',
                  id: currentReasoning.id,
                  delta: currentReasoning.content,
                });
                onPartsUpdate?.(parts);
              }
              break;
            case 'system':
              parts.push(parsed);
              onPartsUpdate?.(parts);
              break;
            case 'source':
              parts.push(parsed);
              onPartsUpdate?.(parts);
              break;
            case 'stream-complete':
              parts.push(parsed);
              onPartsUpdate?.(parts);
              break;
            case 'stream-error':
            case 'error':
              console.error('Stream error:', parsed.error || parsed.content);
              parts.push(parsed);
              onPartsUpdate?.(parts);
              break;
            default:
              break;
          }
        } catch {
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content, parts };
};
