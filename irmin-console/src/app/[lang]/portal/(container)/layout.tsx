export default function PortalContainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className='container relative mx-auto max-w-6xl'
      id='portal-container-layout'
    >
      {children}
    </div>
  );
}
