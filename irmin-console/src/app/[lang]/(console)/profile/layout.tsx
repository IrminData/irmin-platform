import ProfileLayoutWrapper from '@/components/user/ProfileLayoutWrapper';

/**
 * Layout for the User profile settings pages in the Console
 * @param props0 - The layout properties
 * @param props0.children - The children to render
 */
export default function ProfilePagesLayout({
  children,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return <ProfileLayoutWrapper>{children}</ProfileLayoutWrapper>;
}
