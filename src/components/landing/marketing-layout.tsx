import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
