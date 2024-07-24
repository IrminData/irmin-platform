import { Locale } from '@/dictionaries';

import WebsiteBlogPosts from '@/components/website/websiteBlogPosts';
import WebsiteCareersSection from '@/components/website/websiteCareersSection';
import WebsiteContactSection from '@/components/website/websiteContactSection';
import WebsiteContentSection from '@/components/website/websiteContentSection';
import WebsiteCTADarkSection from '@/components/website/WebsiteCTADarkSection';
import WebsiteCTASection from '@/components/website/websiteCTASection';
import WebsiteFaqsSection from '@/components/website/websiteFaqsSection';
import WebsiteFeaturesSection from '@/components/website/websiteFeaturesSection';
import WebsiteHeroSection from '@/components/website/websiteHeroSection';
import WebsiteLogoCloudSection from '@/components/website/websiteLogoCloudSection';
import WebsiteNewsletterSection from '@/components/website/websiteNewsletterSection';
import WebsiteNumbersSection from '@/components/website/websiteNumbersSection';
import WebsitePricingSection from '@/components/website/websitePricingSection';
import WebsiteTeamSection from '@/components/website/websiteTeamSection';
import WebsiteTestimonialsSection from '@/components/website/websiteTestimonialsSection';

import {
  ArticlesSection,
  CareersSection,
  ContactSection,
  ContentSection,
  CTADarkSection,
  CTASection,
  FAQSection,
  FeaturesSection,
  HeroSection,
  IrminWebsiteSection,
  LogoCloudSection,
  NewsletterSection,
  NumbersSection,
  PriceSection,
  TeamSection,
  TestimonialSection,
} from '@/types/website/Wordpress';

export default function WebsiteSections({
  sections,
  lang,
}: {
  sections: IrminWebsiteSection[];
  lang: Locale;
}) {
  return (
    <>
      {sections?.map((section, index) => {
        switch (section.acf_fc_layout) {
          case 'careers':
            return (
              <WebsiteCareersSection
                section={section as CareersSection}
                key={`section-careers-${index}`}
              />
            );
          case 'contact':
            return (
              <WebsiteContactSection
                section={section as ContactSection}
                key={`section-contact-${index}`}
              />
            );
          case 'newsletter':
            return (
              <WebsiteNewsletterSection
                section={section as NewsletterSection}
                key={`section-newsletter-${index}`}
              />
            );
          case 'testimonials':
            return (
              <WebsiteTestimonialsSection
                section={section as TestimonialSection}
                key={`section-testimonials-${index}`}
              />
            );
          case 'logo_cloud':
            return (
              <WebsiteLogoCloudSection
                section={section as LogoCloudSection}
                key={`section-logo-cloud-${index}`}
              />
            );
          case 'hero':
            return (
              <WebsiteHeroSection
                section={section as HeroSection}
                key={`section-hero-${index}`}
              />
            );
          case 'prices':
            return (
              <WebsitePricingSection
                section={section as PriceSection}
                key={`section-prices-${index}`}
              />
            );
          case 'faq':
            return (
              <WebsiteFaqsSection
                section={section as FAQSection}
                key={`section-faq-${index}`}
              />
            );
          case 'cta':
            return (
              <WebsiteCTASection
                section={section as CTASection}
                key={`section-cta-${index}`}
              />
            );
          case 'cta_dark':
            return (
              <WebsiteCTADarkSection
                section={section as CTADarkSection}
                key={`section-cta-dark-${index}`}
              />
            );
          case 'team':
            return (
              <WebsiteTeamSection
                section={section as TeamSection}
                key={`section-team-${index}`}
              />
            );
          case 'features':
            return (
              <WebsiteFeaturesSection
                section={section as FeaturesSection}
                key={`section-features-${index}`}
              />
            );
          case 'content':
            return (
              <WebsiteContentSection
                section={section as ContentSection}
                key={`section-content-${index}`}
              />
            );
          case 'numbers':
            return (
              <WebsiteNumbersSection
                section={section as NumbersSection}
                key={`section-numbers-${index}`}
              />
            );
          case 'articles':
            return (
              <WebsiteBlogPosts
                section={section as ArticlesSection}
                key={`section-articles-${index}`}
                lang={lang}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
