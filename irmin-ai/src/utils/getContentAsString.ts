export const getContentAsString = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if ('text' in item) return String(item.text);
          if ('content' in item) return String(item.content);
        }
        return String(item);
      })
      .join(' ');
  }
  if (content && typeof content === 'object') {
    if ('text' in content) return String(content.text);
    if ('content' in content) return String(content.content);
  }
  return String(content || '');
};
