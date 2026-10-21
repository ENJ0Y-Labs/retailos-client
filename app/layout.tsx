import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { TourProvider } from "@/components/tour/TourProvider";
import "./globals.css";

const siteName = "TX RetailOS";
const description =
  "Manage products, track stock, record sales, and keep daily shop operations organized with TX RetailOS, built for provision shops and growing retailers.";

export const metadata: Metadata = {
  title: {
    default: "TX RetailOS | Retail and Stock Management",
    template: "%s | TX RetailOS",
  },
  description,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    title: "TX RetailOS | Retail and Stock Management",
    description,
    locale: "en_NG",
  },
  twitter: {
    card: "summary",
    title: "TX RetailOS | Retail and Stock Management",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TourProvider>{children}</TourProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
