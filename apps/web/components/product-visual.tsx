import type { BusinessType } from "@filialhub/shared";
import { imageUrl } from "@/lib/image";
import { ProductIcon } from "./glyph";

/**
 * Акси мол, агар бошад; вагарна иконка. Контейнери берунӣ андоза ва кунҷҳоро медиҳад
 * (бояд overflow-hidden дошта бошад — акс тамоми ҷойро пур мекунад).
 */
export function ProductVisual({
  imageId,
  emoji,
  name,
  type,
  iconClass = "size-6",
}: {
  imageId?: number | null;
  emoji: string;
  name: string;
  type?: BusinessType | null;
  iconClass?: string;
}) {
  if (imageId) {
    // eslint-disable-next-line @next/next/no-img-element -- акс аз API-и худи сайт, аллакай фишурда (WebP ~100 КБ)
    return <img src={imageUrl(imageId)} alt={name} loading="lazy" decoding="async" className="size-full object-cover" />;
  }
  return <ProductIcon value={emoji} type={type} className={iconClass} />;
}
