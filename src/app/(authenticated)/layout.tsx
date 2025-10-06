import { ReactNode } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  // These routes are only accessible when wrapped in <db.SignedIn>
  return <div className="min-h-screen bg-background">{children}</div>;
}
