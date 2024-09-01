/**
 * Component to render Markdown content. Used to visualise the content of the documentations.
 */
const MDXViewer = ({ content }: { content: string }) => {
  return <div className='mdx-viewer'>{content}</div>;
};

export default MDXViewer;
