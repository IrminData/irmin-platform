import React, { ComponentPropsWithoutRef } from 'react';

import Image from 'next/image';

interface PortalTitleProps {
  title: string;
  props?: ComponentPropsWithoutRef<'div'>;
}

const PortalTitle: React.FC<PortalTitleProps> = ({ title, props }) => {
  const _props = { ...props };
  delete _props.className;
  return (
    <div
      className={`px-4 pb-6 pt-4 text-lg font-semibold text-irmin_black md:pb-8 md:pt-12 md:text-3xl ${props?.className ?? ''}`}
      {..._props}
    >
      <Image
        src='/irmin-logo.svg'
        alt='Irmin'
        width={120}
        height={120}
        className={`h-14 md:hidden ${props?.className ?? ''}`}
      />
      <h1 className={`${props?.className ?? ''}`}>{title}</h1>
    </div>
  );
};

export default PortalTitle;
