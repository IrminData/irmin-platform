export default function PortalWorkspaceContainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className='container relative mx-auto max-w-6xl'
      id='portal-workspace-container-layout'
    >
      {children}
    </div>
  );
}
