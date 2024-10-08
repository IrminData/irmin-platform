import * as Icons from 'react-icons/fa6';

/**
 * Dynamic Font Awesome icon component
 *
 * @remarks
 *
 * Used to dynamically render Font Awesome icons based on the name prop, which is a string.
 * This is useful when the icon name is coming from the backend or a CMS.
 */
export default function DynamicFaIcon({
  name,
  ...props
}: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) {
  if (name in Icons) {
    try {
      // @ts-expect-error - The key is coming from the Wordpress as a text
      const Icon = Icons[name];
      return <Icon {...props} />;
    } catch {
      return <Icons.FaBacon {...props} />;
    }
  } else {
    return <Icons.FaBacon {...props} />;
  }
}
