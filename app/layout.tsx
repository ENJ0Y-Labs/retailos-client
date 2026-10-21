import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { TourProvider } from "@/components/tour/TourProvider";
import "./globals.css";

const siteName = "TX RetailOS";
const description =
  "Manage products, track stock, record sales, and keep daily shop operations organized with TX RetailOS, built for provision shops and growing retailers.";

export const metadata: Metadata = {
  title: "TX RetailOS | Retail and Stock Management",
  description,
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TX RetailOS | Retail and Stock Management",
    description,
    locale: "en_NG",
    url: "https://retailos-client-sigma.vercel.app/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TX RetailOS retail management platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TX RetailOS | Retail and Stock Management",
    description,
    images: ["/og-image.png"],
  },
  robots: "index, follow",
  index: true,
} as Metadata;

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
