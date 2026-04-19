import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getServerDict } from '@/lib/dict/server';

import WorkspaceTagSection from '@/components/workspace/WorkspaceTagSection';

type TagPageParams = { tag: string; lang: string };

export async function generateMetadata(props: {
  params: Promise<TagPageParams>;
}): Promise<Metadata> {
  const { lang, tag } = await props.params;
  const dict = getServerDict(lang);
  // No tag-by-id fetch available on the core API; fall back to showing the
  // slug with an ellipsis so the title is still informative.
  return { title: `${dict.metadata.fallback.tag} ${tag}…` };
}

/**
 * Tag detail page
 */
const TagPage = async ({ params }: { params: Promise<TagPageParams> }) => {
  const { tag: tagId } = await params;

  if (!tagId) {
    return notFound();
  }

  return <WorkspaceTagSection tagId={tagId} />;
};

export default TagPage;
