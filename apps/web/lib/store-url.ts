// Суроғаи зебои мағоза барои SEO: /shop/12-burger-khaus (ID + номи лотинӣ).
// Танҳо ID муҳим аст — агар ном иваз шавад, суроғаи кӯҳна ҳам кор мекунад.

const LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "gh", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", ӣ: "i", й: "y",
  к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ӯ: "u", ф: "f",
  х: "kh", ҳ: "h", ц: "ts", ч: "ch", ҷ: "j", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(s: string) {
  return [...s.toLowerCase()]
    .map((c) => LATIN[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function storePath(store: { id: number; name: string }) {
  const s = slugify(store.name);
  return `/shop/${store.id}${s ? `-${s}` : ""}`;
}

/** «12-burger-khaus» → 12; суроғаи нодуруст → null */
export function storeIdFrom(slug: string) {
  const m = /^(\d+)(?:-|$)/.exec(slug);
  return m ? Number(m[1]) : null;
}
