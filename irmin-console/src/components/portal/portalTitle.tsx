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
      className={`px-4 pb-8 pt-6 text-lg font-medium text-irmin_black text-opacity-80 md:pb-8 md:pt-12 md:text-3xl`}
    >
      {showLogo && (
        <Image
          src='/irmin-logo.svg'
          alt='Irmin'
          width={80}
          height={20}
          className={`h-8 md:hidden`}
        />
      )}
      <h1>{title}</h1>
    </div>
  );
};

export default PortalTitle;
