"use client";

import { ErrorView } from "@/components/error-view";

export default function ShopError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} home="/shop" />;
}
