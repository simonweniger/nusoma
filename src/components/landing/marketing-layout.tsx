import { Footer } from "@/components/landing/footer";
import { CookieBanner } from "@/components/landing/fragments/cookie-banner";
import { Navbar } from "@/components/landing/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
