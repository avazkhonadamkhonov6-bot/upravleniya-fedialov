import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import { AuthProvider } from "@/lib/auth";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

export const metadata: Metadata = {
  title: "FilialHub — идоракунии филиалҳо",
  description: "Системаи идоракунии шабакаи филиалҳо: кормандон, фурӯш ва фоида",
};

// Мавзӯъро пеш аз намоиш мегузорад, то саҳифа «милт» назанад.
const themeScript = `try{var t=localStorage.getItem('fh-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tg" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>
          <AuthProvider>
            <LangProvider>{children}</LangProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
