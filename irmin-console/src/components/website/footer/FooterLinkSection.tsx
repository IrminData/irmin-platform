import Link from 'next/link';

import { WebsiteFooterLinkSection } from '@/types/website/WebsiteNavigation';

/**
 * Website footer link section
 *
 * @param props - The props of the component
 * @param props.section - The section of the footer links
 * @param props.sectionId - The key of the section
 */
const FooterLinkSection = ({
  section,
  sectionId,
}: {
  section: WebsiteFooterLinkSection;
  sectionId: string;
}) => (
  <div className='min-w-28 text-left' id={sectionId}>
    <h3 className='mb-4 text-lg font-medium text-white text-opacity-80'>
      {section.title}
    </h3>
    <ul>
      {section.links.map((link, idx) => (
        <li className='mb-2' key={`${sectionId}-footer-link-${idx}`}>
          <Link
            className='inline-block text-sm font-normal text-white text-opacity-60 transition-colors duration-200 hover:text-irmin_green'
            href={link.href}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default FooterLinkSection;
