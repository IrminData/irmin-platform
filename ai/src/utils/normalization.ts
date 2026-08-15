const MAX_USER_INPUT_LENGTH = 35_000;

/**
 * Preserve user-authored content while making encoding deterministic.
 *
 * Prompt injection is handled by trust labels, tool authorization, and output
 * validation. Rewriting SQL, source code, base64, or role-like text here would
 * corrupt legitimate requests and cannot provide a security boundary.
 */
class TextNormalizer {
  normalize(
    input: string | null | undefined,
    maxLength: number | null = null
  ): string {
    if (input === null || input === undefined) return '';

    const normalized = String(input).normalize('NFC').replace(/\r\n?/g, '\n');
    if (maxLength !== null && normalized.length > maxLength) {
      throw new Error(`Input exceeds the ${maxLength} character limit`);
    }
    return normalized;
  }

  normalizeUserMessage(message: string, maxLength?: number): string {
    return this.normalize(message, maxLength ?? MAX_USER_INPUT_LENGTH);
  }
}

export const textNormalizer = new TextNormalizer();
