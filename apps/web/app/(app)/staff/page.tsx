"use client";

import { StaffTable } from "@/components/staff-table";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";

export default function StaffPage() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  return (
    <>
      <PageHeader
        title={tr("Кормандон")}
        subtitle={isChef ? tr("Менеҷерҳо ва кормандони ҳамаи филиалҳо") : tr("Кормандони филиали {0}", user?.branch?.name ?? "")}
      />
      <StaffTable />
    </>
  );
}
