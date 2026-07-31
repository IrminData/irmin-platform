import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import SignInSection from '@/components/user/SignInSection';

type SignInParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<SignInParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.auth.signIn };
}

export default function SignInPage() {
  return <SignInSection />;
}
