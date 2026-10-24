import { CallProvider } from "@/components/calls";
import { AppShell } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      <AppShell>{children}</AppShell>
    </CallProvider>
  );
}
