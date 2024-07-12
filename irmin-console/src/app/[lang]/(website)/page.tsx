import WebsiteContentSection from '@/components/website/websiteContentSection';
import WebsiteCTASection from '@/components/website/websiteCTASection';
import WebsiteFeaturesSection from '@/components/website/websiteFeaturesSection';
import WebsiteHeroSection from '@/components/website/websiteHeroSection';
import WebsiteLogoCloudSection from '@/components/website/websiteLogoCloudSection';
import WebsiteNumbersSection from '@/components/website/websiteNumbersSection';
import WebsiteTestimonialsSection from '@/components/website/websiteTestimonialsSection';

export default function Home() {
  return (
    <>
      <WebsiteHeroSection />
      <WebsiteLogoCloudSection />
      <WebsiteFeaturesSection />
      <WebsiteTestimonialsSection />
      <WebsiteNumbersSection />
      <WebsiteContentSection />
      <WebsiteCTASection />
    </>
  );
}
