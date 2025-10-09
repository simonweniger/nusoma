import { ReactNode } from "react";

export default function UnauthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  // These routes are only accessible when wrapped in <db.SignedOut>
  return <div className="min-h-screen bg-background">{children}</div>;
}
