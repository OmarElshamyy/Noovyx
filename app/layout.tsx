import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://noovyx.com"),
  title: {
    default: "Noovyx | Pro Audio & IEM Store Egypt",
    template: "%s | Noovyx",
  },
  description:
    "Noovyx (noovyx.com) — Egypt's #1 store for authentic In-Ear Monitors (IEMs), KZ Castor, KZ ZS10 Pro 2, Hi-Fi Type-C DACs, upgrade cables, and wireless audio gear. Fast Cash on Delivery across Egypt.",
  applicationName: "Noovyx",
  keywords: [
    "Noovyx",
    "noovyx.com",
    "Noovyx Egypt",
    "IEM Egypt",
    "In-Ear Monitors Egypt",
    "Pro Audio Egypt",
    "KZ Audio Egypt",
    "KZ IEM Egypt",
    "KZ Castor Egypt",
    "KZ Castor Bass Edition Egypt",
    "KZ ZS10 Pro 2 Egypt",
    "KZ ZSN Pro X Egypt",
    "KZ EDX Pro X Egypt",
    "KZ AZ09 Wireless Egypt",
    "Moondrop Egypt",
    "Gaming IEM Egypt",
    "Gaming Earphones Egypt",
    "USB-C DAC Egypt",
    "Portable DAC Dongle Egypt",
    "Audiophile Egypt",
    "Stage Monitors Egypt",
    "سماعات KZ مصر",
    "سماعات IEM مصر",
    "سماعات جيمنج احترافية",
    "سماعات مونيتور مصر",
    "متجر سماعات مصر",
    "نوفيكس",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://noovyx.com",
  },
  openGraph: {
    type: "website",
    url: "https://noovyx.com",
    siteName: "Noovyx",
    title: "Noovyx | Pro Audio & IEM Store Egypt",
    description:
      "Authentic In-Ear Monitors (IEMs), portable Hi-Fi DACs, upgrade cables, and wireless audio gear delivered across Egypt with Cash on Delivery.",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Noovyx — Pro Audio & IEM Store Egypt (noovyx.com)",
      },
      {
        url: "/products/kz-castor-bass.png",
        width: 800,
        height: 800,
        alt: "KZ Castor Bass Edition In-Ear Monitor at Noovyx Egypt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Noovyx | Pro Audio & IEM Store Egypt",
    description:
      "Authentic In-Ear Monitors (IEMs), portable DACs, upgrade cables, and wireless audio gear delivered across Egypt with Cash on Delivery.",
    images: ["/opengraph-image"],
  },
  category: "electronics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ background: "#05070d", colorScheme: "dark" }}>
      <head>
        {/* Critical: dark background & baseline resets before ANY CSS loads */}
        <style>{`
          *,html,body{margin:0;box-sizing:border-box;}
          html{background:#05070d;color-scheme:dark;}
          body{
            background:linear-gradient(180deg,#05070d 0%,#08111f 45%,#05070d 100%);
            color:#f4f8ff;
            font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;
          }
          img{max-width:100%;height:auto;display:block;}
          a{color:inherit;text-decoration:none;}
        `}</style>
      </head>
      <body style={{ background: "linear-gradient(180deg,#05070d 0%,#08111f 45%,#05070d 100%)", color: "#f4f8ff", margin: 0 }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
