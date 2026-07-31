import type { JSX } from 'react';

import Link from 'next/link';

/**
 * A card that links to a page. Used on the workspace home page.
 *
 * @param props - The card properties.
 * @param props.title - The title of the card.
 * @param props.href - (optional) The link for the card.
 * @param props.onClick - (optional) The onClick event of the card.
 * @param props.description - The description of the card.
 * @param props.icon - The icon of the card.
 */
const LinkCard = ({
  title,
  href,
  onClick,
  description,
  icon,
}: {
  title: string;
  href?: string;
  onClick?: () => void;
  description: string;
  icon: JSX.Element;
}) => {
  return (
    <Link
      href={href ?? ''}
      onClick={onClick}
      className={`
        flex w-96 max-w-full cursor-pointer flex-col items-center justify-center
        gap-4 rounded-lg border-2 border-transparent bg-card p-4 text-center
        text-card-foreground transition-colors
        hover:border-accent
        md:p-6 md:py-8
      `}
    >
      <div
        className={`
          aspect-square rounded-full bg-accent/20 p-4 text-2xl text-accent
          lg:text-4xl
        `}
      >
        {icon}
      </div>
      <h2
        className={`
          text-base font-medium
          lg:text-lg
        `}
      >
        {title}
      </h2>
      <p
        className={`
          text-xs
          lg:text-sm
        `}
      >
        {description}
      </p>
    </Link>
  );
};

export default LinkCard;
