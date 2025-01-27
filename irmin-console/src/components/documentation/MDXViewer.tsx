'use client';

import Markdown from 'markdown-to-jsx';

/**
 * Component to render Markdown content. Used to visualise the content of the documentations.
 */
const MDXViewer = ({ content }: { content: string }) => {
  return (
    <div className='mdx-viewer bg-background w-full'>
      <Markdown options={{ wrapper: 'article' }}>{content}</Markdown>
    </div>
  );
};

export default MDXViewer;
