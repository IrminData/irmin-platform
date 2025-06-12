import { notFound } from 'next/navigation';

import WorkspaceTagSection from '@/components/workspace/WorkspaceTagSection';

/**
 * Tag detail page
 *
 * This page displays the details of a specific tag, including its properties
 * and all related assets. It allows editing and deletion of the tag.
 */
const TagPage = async ({ params }: { params: Promise<{ tag: string }> }) => {
  const { tag: tagId } = await params;

  if (!tagId) {
    return notFound();
  }

  return <WorkspaceTagSection tagId={tagId} />;
};

export default TagPage;
