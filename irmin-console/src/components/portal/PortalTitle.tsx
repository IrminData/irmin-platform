import React from 'react';

import Image from 'next/image';

/**
 * Portal title UI component
 *
 * @remarks
 *
 * This component is used to display the title of the portal.
 * It the title of the portal page.
 * On mobile, it displays the Irmin logo as well.
 *
 * @param props - The props of the component
 * @param props.title - The title of the portal
 * @param props.showLogo - Whether to hide the logo or not
 */
const PortalTitle: React.FC<{
  title: string;
  showLogo?: boolean;
}> = ({ title, showLogo }) => {
  return (
    <div
      className={`px-4 pb-4 pt-8 text-center text-2xl font-medium text-irmin_black text-opacity-80 sm:text-3xl md:pb-8 md:pt-8 md:text-left dark:text-white`}
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
          />
        </>
      )}
      <h1>{title}</h1>
    </div>
  );
};

export default PortalTitle;
