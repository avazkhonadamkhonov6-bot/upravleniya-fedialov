import { SearchX } from "lucide-react";
import Link from "next/link";

// Матнҳо бе tr(): ин саҳифа дар сервер сохта мешавад, забони интихобшуда дар браузер аст
export default function NotFound() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center bg-bg px-4 py-20 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
        <SearchX className="size-7" />
      </div>
      <p className="font-display text-5xl font-extrabold text-ink">404</p>
      <h1 className="mt-3 text-lg font-bold text-ink">Саҳифа ёфт нашуд</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">Шояд суроға нодуруст бошад ё саҳифа ҷойи дигар гузошта шуда бошад.</p>
      <Link href="/" className="brand-gradient mt-6 inline-flex h-12 items-center rounded-[14px] px-5 text-[15px] font-bold text-white transition hover:brightness-110">
        Ба саҳифаи асосӣ
      </Link>
    </main>
  );
}
