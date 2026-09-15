import type { Metadata } from "next";
import { Providers } from "./providers";
import { PROJECT } from "@/lib/project";
import "./public.css";
import "./shop.css";

export const metadata: Metadata = {
  metadataBase: new URL(PROJECT.siteUrl),
  title: PROJECT.title,
  description: PROJECT.tagline,
  openGraph: {
    type: "website",
    siteName: PROJECT.title,
    title: PROJECT.title,
    description: PROJECT.tagline,
    url: PROJECT.siteUrl + "/",
    images: [{ url: PROJECT.siteUrl + PROJECT.heroPhoto, width: 1600, height: 1200, alt: "The Trans Am shell on its dolly in the shop" }],
  },
  twitter: { card: "summary_large_image", title: PROJECT.title, description: PROJECT.tagline, images: [PROJECT.siteUrl + PROJECT.heroPhoto] },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23B5432A'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Impact,sans-serif' font-size='18' fill='%23F7F6F2'%3ETA%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
