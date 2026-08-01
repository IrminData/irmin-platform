import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';

import SignUpSection from '@/components/user/SignUpSection';

type SignUpParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<SignUpParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return { title: dict.metadata.auth.signUp };
}

export default function SignUpPage() {
  return <SignUpSection />;
}
