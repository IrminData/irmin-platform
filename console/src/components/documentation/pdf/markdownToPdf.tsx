import { Text, View } from '@react-pdf/renderer';

import { styles } from './styles';

/**
 * Convert a markdown string to @react-pdf/renderer elements.
 * Handles headings, bold, italic, lists, links, and paragraphs.
 */
export function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={styles.mdSubheading}>
          {line.slice(4)}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={styles.mdSubheading}>
          {line.slice(3)}
        </Text>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <Text key={i} style={styles.mdHeading}>
          {line.slice(2)}
        </Text>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <Text key={i} style={styles.mdListItem}>
          {'• ' + renderInline(line.slice(2))}
        </Text>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)$/);
      if (match) {
        elements.push(
          <Text key={i} style={styles.mdListItem}>
            {match[1] + ' ' + renderInline(match[2])}
          </Text>
        );
      }
    } else {
      elements.push(
        <Text key={i} style={styles.mdParagraph}>
          {renderInline(line)}
        </Text>
      );
    }
  }

  return <View>{elements}</View>;
}

function renderInline(text: string): string {
  // Strip markdown formatting for PDF (bold, italic, links, code)
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
