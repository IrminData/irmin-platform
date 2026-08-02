import type { Metadata } from 'next';

import { getServerDict } from '@/lib/dict/server';
import { ROBOTS_AUTH, SITE_NAME } from '@/lib/metadata';

import AuthLayoutWrapper from '@/components/user/AuthLayoutWrapper';

import AuthenticationErrorHandlerConnected from './AuthenticationErrorHandlerConnected';

type AuthLayoutParams = { lang: string };

export async function generateMetadata(props: {
  params: Promise<AuthLayoutParams>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = getServerDict(lang);
  return {
    title: {
      default: `${dict.metadata.auth.signIn} · ${SITE_NAME}`,
      template: `%s · ${SITE_NAME}`,
    },
    robots: ROBOTS_AUTH,
  };
}

/**
 * Authentication layout.
 *
 * AuthenticationErrorHandler is mounted here so that (authentication) routes
 * (/sign-in, /sign-up, /forgot-password, /invite/[id], etc.) get the same
 * auth/profile error reporting pipeline as the console. Without this, any
 * setAuthError during profile bootstrap on these routes would be silently
 * dropped — no Sentry capture, no redirect for stale tokens.
 *
 * Mirror of the mount inside ConsoleWrapper; see `CLAUDE.md` (Error Handling).
 */
export default function AuthenticationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthLayoutWrapper>
      <AuthenticationErrorHandlerConnected>
        {children}
      </AuthenticationErrorHandlerConnected>
    </AuthLayoutWrapper>
  );
}
