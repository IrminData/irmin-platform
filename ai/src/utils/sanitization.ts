const MAX_USER_INPUT_LENGTH = 35_000;
const MAX_SYSTEM_PROMPT_LENGTH = 210_000;

interface SanitizationResult {
  sanitized: string;
  wasTruncated: false;
}

/**
 * Preserve user-authored content while making encoding deterministic.
 *
 * Prompt injection is handled by trust labels, tool authorization, and output
 * validation. Rewriting SQL, source code, base64, or role-like text here would
 * corrupt legitimate requests and cannot provide a security boundary.
 */
class TextSanitizer {
  sanitize(
    input: string | null | undefined,
    maxLength: number | null = null
  ): SanitizationResult {
    if (input === null || input === undefined) {
      return { sanitized: '', wasTruncated: false };
    }

    const normalized = String(input).normalize('NFC').replace(/\r\n?/g, '\n');

    if (maxLength !== null && normalized.length > maxLength) {
      throw new Error(`Input exceeds the ${maxLength} character limit`);
    }

    return { sanitized: normalized, wasTruncated: false };
  }

  sanitizeUserMessage(message: string, maxLength?: number): SanitizationResult {
    return this.sanitize(message, maxLength ?? MAX_USER_INPUT_LENGTH);
  }

  sanitizeSystemPrompt(prompt: string, maxLength?: number): SanitizationResult {
    return this.sanitize(prompt, maxLength ?? MAX_SYSTEM_PROMPT_LENGTH);
  }
}

export const textSanitizer = new TextSanitizer();
