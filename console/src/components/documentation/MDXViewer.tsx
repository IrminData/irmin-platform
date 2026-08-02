'use client';

import MarkdownRenderer from 'markdown-to-jsx';

/**
 * Enhanced component to render Markdown content with improved styling.
 * Used to visualise the content of the documentations.
 */
const MDXViewer = ({ content }: { content: string }) => {
  return (
    <div
      className={`
        mdx-viewer w-full max-w-none bg-background leading-relaxed
        text-foreground
      `}
    >
      <MarkdownRenderer
        options={{
          wrapper: 'article',
          overrides: {
            h1: {
              props: {
                className:
                  'text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0',
              },
            },
            h2: {
              props: {
                className:
                  'text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0',
              },
            },
            h3: {
              props: {
                className:
                  'text-lg font-medium text-foreground mb-2 mt-4 first:mt-0',
              },
            },
            p: {
              props: {
                className: 'text-sm text-muted-foreground leading-relaxed mb-3',
              },
            },
            ul: {
              props: {
                className: 'text-sm text-muted-foreground space-y-1 mb-3 ml-4',
              },
            },
            ol: {
              props: {
                className: 'text-sm text-muted-foreground space-y-1 mb-3 ml-4',
              },
            },
            li: {
              props: {
                className: 'text-sm text-muted-foreground leading-relaxed',
              },
            },
            code: {
              props: {
                className:
                  'bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded text-xs font-mono',
              },
            },
            pre: {
              props: {
                className:
                  'bg-muted/30 border border-border/30 rounded-lg p-4 overflow-x-auto text-xs font-mono mb-4',
              },
            },
            blockquote: {
              props: {
                className:
                  'border-l-4 border-primary/30 bg-muted/20 pl-4 py-2 mb-4 italic text-muted-foreground',
              },
            },
            a: {
              props: {
                className:
                  'text-primary hover:text-primary/80 underline transition-colors',
              },
            },
          },
        }}
      >
        {content}
      </MarkdownRenderer>
    </div>
  );
};

export default MDXViewer;
