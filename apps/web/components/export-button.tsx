"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { getToken, qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useToast } from "./toast";
import { Button, Modal, Segmented } from "./ui";

type Range = "month" | "prev" | "all";

/** Аввали моҳ бо вақти Душанбе (UTC+5) → ISO */
function monthStart(offset: number) {
  const now = new Date(Date.now() + 5 * 3600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1) - 5 * 3600_000).toISOString();
}

/** «Excel»: фурӯш ё хароҷот бо филтрҳои ҳозира ба файли .xlsx */
export function ExportButton({ path, params, name }: { path: string; params: Record<string, string | number | undefined>; name: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<Range>("month");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const period = range === "month" ? { from: monthStart(0) } : range === "prev" ? { from: monthStart(-1), to: monthStart(0) } : {};
      const token = getToken();
      const res = await fetch(`/api${path}${qs({ ...params, ...period })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(tr("Хатогӣ ({0})", res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.xlsx` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setOpen(false);
    } catch (e) {
      toast.error(tr("Файл сохта нашуд"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" /> Excel
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={tr("Боргирӣ ба Excel")}>
        <div className="space-y-5">
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "month", label: "Ин моҳ" },
              { value: "prev", label: "Моҳи гузашта" },
              { value: "all", label: "Ҳама" },
            ]}
          />
          <p className="text-sm text-muted">{tr("Филиали интихобшуда ҳисоб карда мешавад. Файл дар Excel, Google Sheets ва LibreOffice кушода мешавад.")}</p>
          <Button className="w-full" loading={busy} onClick={download}>
            <FileSpreadsheet className="size-4" /> {tr("Боргирӣ")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
