import WebsiteHeroSection from "@/components/website/websiteHeroSection";
import WebsiteLogoCloudSection from "@/components/website/websiteLogoCloudSection";
import WebsiteFeaturesSection from "@/components/website/websiteFeaturesSection";
import WebsiteTestimonialsSection from "@/components/website/websiteTestimonialsSection";
import WebsiteNumbersSection from "@/components/website/websiteNumbersSection";
import WebsiteContentSection from "@/components/website/websiteContentSection";
import WebsiteCTASection from "@/components/website/websiteCTASection";

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
