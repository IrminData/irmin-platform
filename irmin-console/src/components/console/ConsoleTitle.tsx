import React from 'react';

import Image from 'next/image';

/**
 * Console title UI component
 *
 * @remarks
 *
 * This component is used to display the title of the console.
 * It the title of the console page.
 * On mobile, it displays the Irmin logo as well.
 *
 * @param props - The props of the component
 * @param props.title - The title of the console
 * @param props.showLogo - Whether to hide the logo or not
 */
const ConsoleTitle: React.FC<{
  title: string;
  showLogo?: boolean;
}> = ({ title, showLogo }) => {
  return (
    <div
      className={`px-4 pb-4 pt-12 text-center text-2xl font-bold text-foreground text-opacity-90 sm:text-3xl md:text-left lg:text-5xl`}
    >
      {showLogo && (
        <>
          <Image
            className='block h-8 w-auto dark:hidden md:hidden'
            src='/irmin-logo.svg'
            alt='Irmin logo'
            width={100}
            height={100}
          />
          <Image
            className='hidden h-8 w-auto dark:block md:hidden dark:md:hidden'
            src='/irmin-logo-light.svg'
            alt='Irmin logo'
            width={100}
            height={100}
          />
        </>
      )}
      <h1 className='font-display'>{title}</h1>
    </div>
  );
};

export default ConsoleTitle;
