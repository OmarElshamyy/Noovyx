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
    "Noovyx — Egypt's destination for authentic In-Ear Monitors (IEMs), Hi-Fi portable DACs, upgrade audio cables, and wireless audio gear. Cash on Delivery across Egypt.",
  applicationName: "Noovyx",
  keywords: [
    "Noovyx",
    "noovyx.com",
    "IEM Egypt",
    "In-Ear Monitors Egypt",
    "Pro Audio Egypt",
    "KZ IEM Egypt",
    "Portable DAC Egypt",
    "Gaming Earphones Egypt",
  ],
  alternates: {
    canonical: "https://noovyx.com",
  },
  openGraph: {
    type: "website",
    url: "https://noovyx.com",
    siteName: "Noovyx",
    title: "Noovyx | Pro Audio & IEM Store Egypt",
    description:
      "Authentic In-Ear Monitors (IEMs), portable DACs, upgrade cables, and wireless audio gear delivered across Egypt with Cash on Delivery.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noovyx | Pro Audio & IEM Store Egypt",
    description:
      "Authentic In-Ear Monitors (IEMs), portable DACs, upgrade cables, and wireless audio gear delivered across Egypt.",
  },
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
