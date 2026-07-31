import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';
import { buildTitle, buildTitleTemplate } from '@/lib/metadata';

import ProfileLayoutWrapper from '@/components/user/ProfileLayoutWrapper';

type ProfileLayoutParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<ProfileLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  const profile = dict.metadata.workspace.profile;
  return {
    title: {
      default: buildTitle([profile]),
      template: buildTitleTemplate([profile]),
    },
  };
}

/**
 * Layout for the User profile settings pages in the Console
 */
export default function ProfilePagesLayout({
  children,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return <ProfileLayoutWrapper>{children}</ProfileLayoutWrapper>;
}
