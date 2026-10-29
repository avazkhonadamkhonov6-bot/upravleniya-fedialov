import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { MotionFX } from "@/components/motion-fx";
import { ToastProvider } from "@/components/toast";
import { AuthProvider } from "@/lib/auth";
import { LangProvider } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// Як ҳарф барои тамоми сайт: Manrope — ҳамаи ҳарфҳои тоҷикӣ (ӣ ӯ ҳ ҷ қ ғ), вазнҳо аз матн то сарлавҳа
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — идоракунии филиалҳо`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["CRM", "филиал", "тарабхона", "фурӯш", "фоида", "кормандон", "кассир", "POS", "бонус", "Тоҷикистон", "Душанбе", "управление филиалами", "restaurant CRM"],
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — идоракунии филиалҳо`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "tg_TJ",
    alternateLocale: ["ru_RU", "en_US"],
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#120c0d" },
  ],
};

// Мавзӯъро пеш аз намоиш мегузорад, то саҳифа «милт» назанад.
const themeScript = `try{var t=localStorage.getItem('fh-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" className={`${manrope.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>
          <AuthProvider>
            <LangProvider>
              {children}
              <MotionFX />
            </LangProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
