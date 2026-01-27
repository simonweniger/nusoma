import { CustomerPortal } from "@polar-sh/nextjs";
import { NextRequest } from "next/server";

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error("POLAR_ACCESS_TOKEN is not defined in environment variables");
}
if (!process.env.SUCCESS_URL) {
  throw new Error("SUCCESS_URL is not defined in environment variables");
}

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  getCustomerId: async (req: NextRequest) => "", // Function to resolve a Polar Customer ID
  returnUrl: "https://myapp.com", // An optional URL which renders a back-button in the Customer Portal
  server: process.env.ENV === "development" ? "sandbox" : "production",
});
