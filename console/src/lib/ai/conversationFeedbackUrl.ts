/**
 * Builds a feedback endpoint without allowing identifiers to alter the
 * configured AI service origin or URL structure.
 */
export function conversationFeedbackUrl(
  baseUrl: string,
  conversationId: string,
  messageId?: string
): string {
  const conversation = encodeURIComponent(conversationId);
  const message =
    messageId === undefined ? '' : `/${encodeURIComponent(messageId)}`;

  return new URL(
    `/api/conversations/${conversation}/feedback${message}`,
    baseUrl
  ).toString();
}
