'use client';

import { useTheme } from 'next-themes';

/**
 * Used to wrap website sections and provide correct background pattern
 */
const WebsiteSectionWrapper = ({
  id,
  children,
}: Readonly<{ id: string; children: React.ReactNode }>) => {
  const { theme } = useTheme();
  return (
    <section
      id={id}
      className='relative overflow-hidden bg-white bg-contain bg-center py-12 dark:bg-irmin_black'
      style={{
        backgroundImage: `url("/ui-assets/elements/${theme !== 'dark' ? 'pattern-white' : 'pattern-dark'}.svg")`,
      }}
    >
      {children}
    </section>
  );
};

export default WebsiteSectionWrapper;
