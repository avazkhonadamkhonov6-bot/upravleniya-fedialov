"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TableQr } from "@/components/table-qr";
import { PageHeader } from "@/components/ui";
import { tr } from "@/lib/i18n";

// Ҳангоми чоп танҳо варақаҳои QR — менюҳо ва тугмаҳои сайт пинҳон
const PRINT_CSS = `@media print {
  @page { margin: 12mm; }
  body * { visibility: hidden !important; }
  .table-qr-sheet, .table-qr-sheet * { visibility: visible !important; }
  .table-qr-sheet { position: absolute; inset: 0 auto auto 0; width: 100%; grid-template-columns: repeat(3, 1fr) !important; }
}`;

export default function TablesPage() {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <Link href="/online" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink print:hidden">
        <ArrowLeft className="size-4" /> {tr("Фармоишҳои онлайн")}
      </Link>
      <PageHeader title={tr("QR барои мизҳо")} subtitle={tr("Менюи рақамӣ: мизоҷ аз миз фармоиш медиҳад")} />
      <TableQr />
    </>
  );
}
