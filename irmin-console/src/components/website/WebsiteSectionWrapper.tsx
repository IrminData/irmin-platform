/**
 * Used to wrap website sections and provide correct background pattern
 */
const WebsiteSectionWrapper = ({
  id,
  children,
}: Readonly<{ id: string; children: React.ReactNode }>) => {
  return (
    <section
      id={id}
      className='pattern-bg relative overflow-hidden bg-background bg-contain bg-top bg-no-repeat'
    >
      {children}
    </section>
  );
};

export default WebsiteSectionWrapper;
