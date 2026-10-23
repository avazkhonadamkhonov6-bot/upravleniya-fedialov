"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./ui";

// Recharts калон аст (~100 КБ): графикҳо танҳо дар браузер ва пас аз боркунии саҳифа бор мешаванд.
export const SalesChart = dynamic(() => import("./charts").then((m) => m.SalesChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px]" />,
});

export const BranchBars = dynamic(() => import("./charts").then((m) => m.BranchBars), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px]" />,
});
