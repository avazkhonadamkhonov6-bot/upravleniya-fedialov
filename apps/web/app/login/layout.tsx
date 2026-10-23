import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Даромадан",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/login" },
};

// Маълумоти сохторӣ (schema.org) барои Google.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: ["tg", "ru", "en"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "TJS" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      {children}
    </>
  );
}
