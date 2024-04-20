import PersonalDashboardNavigation from "@/components/personalDashboardNavigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Irmin",
  description: "A better home for your data",
};

export default function PersonalDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PersonalDashboardNavigation>{children}</PersonalDashboardNavigation>
    </>
  );
}
