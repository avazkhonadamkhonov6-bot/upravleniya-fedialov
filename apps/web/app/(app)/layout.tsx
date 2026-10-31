import { CallProvider } from "@/components/calls";
import { AppShell } from "@/components/shell";
import type { Metadata } from "next";

// Саҳифаҳои корӣ танҳо пас аз воридшавӣ — дар Google набошанд ва canonical-и «/»-ро аз layout-и асосӣ мерос нагиранд.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      <AppShell>{children}</AppShell>
    </CallProvider>
  );
}
