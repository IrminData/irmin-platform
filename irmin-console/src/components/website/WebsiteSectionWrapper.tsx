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
      className='pattern-bg relative overflow-hidden bg-white bg-contain bg-center bg-no-repeat dark:bg-irmin_black'
    >
      {children}
    </section>
  );
};

export default WebsiteSectionWrapper;
