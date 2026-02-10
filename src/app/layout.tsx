import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { Providers } from "@/components/Providers";
import { fetchSeoSettings, getBaseUrlFromHeaders } from "@/lib/seoSettings";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const defaults = {
    title: "SKALLARS | Modern Legal Solutions",
    description:
      "SKALLARS is a forward-thinking law firm providing comprehensive legal services across Central Europe. Corporate law, litigation, real estate, and international business advisory.",
  };

  const settings = await fetchSeoSettings([
    "seo_home_title",
    "seo_home_description",
    "seo_home_og_image",
  ]);

  const baseUrl = await getBaseUrlFromHeaders();
  const title = settings.seo_home_title || defaults.title;
  const description = settings.seo_home_description || defaults.description;
  const ogImage = settings.seo_home_og_image;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords: ["law firm", "legal services", "Slovakia", "corporate law", "litigation", "Central Europe"],
    authors: [{ name: "SKALLARS" }],
    openGraph: {
      title,
      description,
      type: "website",
      locale: "sk_SK",
      url: baseUrl,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SiteHeader />
          <div className="pt-20">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
