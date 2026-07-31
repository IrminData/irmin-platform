/**
 * Simple, permissive sanitization for LLM inputs
 * Focuses on length limits and specific prompt injection pattern removal
 * Uses targeted patterns to avoid removing legitimate content
 */

// Global constants for input limits (based on ~3.5 chars per token)
const MAX_USER_INPUT_LENGTH = 35000; // ~10k tokens for user messages
const MAX_SYSTEM_PROMPT_LENGTH = 210000; // ~60k tokens for system prompts

interface SanitizationResult {
  sanitized: string;
  wasTruncated: boolean;
}

class TextSanitizer {
  /**
   * Sanitize text with length limit and basic malicious input removal
   */
  sanitize(
    input: string | null | undefined,
    maxLength: number | null = null
  ): SanitizationResult {
    if (!input) {
      return { sanitized: '', wasTruncated: false };
    }

    let sanitized = String(input);
    let wasTruncated = false;

    // Length limit (only if maxLength is specified)
    if (maxLength !== null && sanitized.length > maxLength) {
      if (maxLength <= 3) {
        // For very small limits, just truncate without ellipsis
        sanitized = sanitized.substring(0, maxLength);
      } else {
        // For larger limits, truncate and add ellipsis
        const truncateAt = maxLength - 3;
        sanitized = sanitized.substring(0, truncateAt) + '...';
      }
      wasTruncated = true;
    }

    // Remove only structurally specific patterns that are almost never legitimate
    // These patterns are flexible on formatting (case, spacing, delimiter count)
    // but specific on structure (pipe syntax, angle brackets, semantic markers)
    const injectionPatterns = [
      // Chat format role markers with pipe syntax (OpenAI, ChatML format)
      // Flexible on spacing around pipes and inside pipes
      /<\s*\|\s*system\s*\|\s*>/gi,
      /<\s*\|\s*assistant\s*\|\s*>/gi,
      /<\s*\|\s*user\s*\|\s*>/gi,
      /<\s*\|\s*end\s*\|\s*>/gi,
      /<\s*\|\s*im_start\s*\|\s*>/gi,
      /<\s*\|\s*im_end\s*\|\s*>/gi,
      /<\s*\|\s*endoftext\s*\|\s*>/gi,
      /<\s*\|\s*[a-z_]+\s*\|\s*>/gi, // Any other special tokens with pipe syntax

      // Alternative role markers (LLaMA format) - flexible on spacing and bracket count
      /\[+\s*inst\s*\]+/gi,
      /\[+\s*\/\s*inst\s*\]+/gi,
      /<+\s*sys\s*>+/gi,
      /<+\s*\/\s*sys\s*>+/gi,

      // XML-style role tags (match with any spacing and bracket count)
      /<+\s*system\s*>+/gi,
      /<+\s*\/\s*system\s*>+/gi,
      /<+\s*assistant\s*>+/gi,
      /<+\s*\/\s*assistant\s*>+/gi,
      /<+\s*user\s*>+/gi,
      /<+\s*\/\s*user\s*>+/gi,

      // Anthropic Claude-specific markers (flexible on spacing and colon)
      /(\n|\r|^)\s*human\s*:+/gi,
      /(\n|\r|^)\s*assistant\s*:+/gi,

      // Function/tool call injection attempts (flexible brackets and spacing)
      /<+\s*function_?calls?\s*>+/gi,
      /<+\s*\/\s*function_?calls?\s*>+/gi,
      /<+\s*tool_?calls?\s*>+/gi,
      /<+\s*\/\s*tool_?calls?\s*>+/gi,
      /<+\s*invoke\s*>+/gi,
      /<+\s*\/\s*invoke\s*>+/gi,
      /`+\s*function_?call/gi,
      /`+\s*tool_?use/gi,

      // Prompt delimiter sequences - flexible on delimiter type, count, spacing
      // Match any delimiter chars (1+) + semantic keywords + any delimiter chars (1+)
      /[=\-*#_~]+\s*end\s*(of|the)?\s*(prompt|instructions?|system|context)\s*[=\-*#_~]+/gi,
      /[=\-*#_~]+\s*ignore\s*(everything|all|this)?\s*(above|before|previous|prior)\s*[=\-*#_~]+/gi,
      /[=\-*#_~]+\s*system\s*(override|prompt|mode|reset)\s*[=\-*#_~]+/gi,
      /[=\-*#_~]+\s*new\s*(instructions?|prompt|system|context)\s*[=\-*#_~]+/gi,
      /[=\-*#_~]+\s*start\s*(of|the)?\s*(new)?\s*(prompt|instructions?|context)\s*[=\-*#_~]+/gi,
      /[=\-*#_~]+\s*begin\s*(new)?\s*(prompt|instructions?|context)\s*[=\-*#_~]+/gi,

      // Common delimiter patterns without specific text (lines of repeated chars)
      /^\s*[=]{8,}\s*$/gm,
      /^\s*[-]{8,}\s*$/gm,
      /^\s*[#]{4,}\s*$/gm,
      /^\s*[*]{8,}\s*$/gm,
      /^\s*[_]{8,}\s*$/gm,
      /^\s*[~]{8,}\s*$/gm,

      // Token/encoding manipulation markers
      /\\x[0-9a-f]{2}/gi,
      /\\u[0-9a-f]{4}/gi,
      /\\U[0-9a-f]{8}/gi,
      /&#x[0-9a-f]+;/gi,
      /&#\d+;/gi,
      /%[0-9a-f]{2}/gi,

      // Zero-width and invisible characters
      /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g,

      // Control characters
      // eslint-disable-next-line no-control-regex
      /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g,

      // Base64-like strings (long alphanumeric sequences)
      /^\s*[A-Za-z0-9+/]{30,}={0,2}\s*$/gm,
    ];

    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Check for malicious code and exploits
    sanitized = this.detectMaliciousCode(sanitized);

    // Remove excessive whitespace and normalize line breaks
    sanitized = sanitized
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Handle old Mac line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces/tabs with single space
      .trim(); // Remove leading/trailing whitespace

    return { sanitized, wasTruncated };
  }

  /**
   * Detect and filter only the most dangerous patterns
   */
  private detectMaliciousCode(input: string): string {
    let sanitized = input;

    // Only the most dangerous patterns that could cause real harm
    const dangerousPatterns = [
      // Script injection (most dangerous)
      /<script[^>]*>.*?<\/script>/gi,
      /javascript\s*:/gi,
      /vbscript\s*:/gi,

      // Command injection (only the most dangerous)
      /(\brm\s+-rf\s+\/)/gi, // Only dangerous rm commands
      /(\bchmod\s+777\s+\/)/gi, // Only dangerous chmod on root
      /(\bcat\s+\/etc\/passwd\b)/gi, // Password file access
      /(\bcat\s+\/etc\/shadow\b)/gi, // Shadow file access

      // SQL injection (only the most dangerous)
      /(\bunion\b.*\bselect\b.*\bfrom\b.*\bwhere\b)/gi, // Only complex union attacks
      /(\bdrop\s+table\b)/gi, // Table destruction
      /(\bdelete\s+from\b.*\bwhere\b.*\b1\s*=\s*1\b)/gi, // Mass deletion
    ];

    // Apply only the most dangerous patterns
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Sanitize user message content
   */
  sanitizeUserMessage(message: string, maxLength?: number): SanitizationResult {
    return this.sanitize(message, maxLength || MAX_USER_INPUT_LENGTH);
  }

  /**
   * Sanitize system prompt content
   */
  sanitizeSystemPrompt(prompt: string, maxLength?: number): SanitizationResult {
    return this.sanitize(prompt, maxLength || MAX_SYSTEM_PROMPT_LENGTH);
  }
}

// Export singleton instance
export const textSanitizer = new TextSanitizer();
