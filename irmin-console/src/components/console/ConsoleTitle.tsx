import React from 'react';

import Image from 'next/image';

import { cn } from '@/utils/tw';

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
 * @param props.className - The class name of the component
 */
const ConsoleTitle: React.FC<{
  title: string;
  showLogo?: boolean;
  className?: string;
}> = ({ title, showLogo, className }) => {
  return (
    <div
      className={cn(
        'text-foreground/90 px-4 pt-12 pb-4 text-center text-2xl font-bold sm:text-3xl md:text-left lg:text-5xl',
        className
      )}
    >
      {showLogo && (
        <>
          <Image
            className='block h-8 w-auto md:hidden dark:hidden'
            src='/irmin-logo.svg'
            alt='Irmin logo'
            width={100}
            height={100}
          />
          <Image
            className='hidden h-8 w-auto md:hidden dark:block dark:md:hidden'
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
