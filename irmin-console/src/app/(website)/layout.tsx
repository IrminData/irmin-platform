import WebsiteNavigation from "@/components/website/websiteNavigation";
import WebsiteFooter from "@/components/website/websiteFooter";

export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <WebsiteNavigation />
      {children}
      <WebsiteFooter />
    </>
  );
}
