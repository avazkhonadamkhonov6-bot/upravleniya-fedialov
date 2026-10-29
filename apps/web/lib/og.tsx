import { ImageResponse } from "next/og";

// Расми пешнамоиш барои Telegram, WhatsApp, Facebook (Open Graph), 1200×630.
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Ҳарфи Manrope танҳо барои ҳарфҳои ҳамин матн (ӣ ӯ ҳ ҷ қ ғ ҳам) аз Google Fonts.
 * Агар дастрас набошад — ҳарфи стандартии ImageResponse (расм бе ҳарфи зебо, вале кор мекунад).
 */
async function manrope(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Manrope:wght@800&text=${encodeURIComponent(text)}`)).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const BG = "#16120f";

export async function ogImage({ title, subtitle, badge, accent: wanted = "#dc3b1c" }: { title: string; subtitle: string; badge: string; accent?: string }) {
  // Ранги мағозаи либос худи заминаи сиёҳ аст — доира ноаён мешуд
  const accent = wanted.toLowerCase() === BG ? "#dc3b1c" : wanted;
  const font = await manrope(`${title}${subtitle}${badge}FilialHub`);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, color: "#fff", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, borderRadius: 9999, background: accent, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -60, right: 260, width: 140, height: 140, borderRadius: 9999, background: "#ffc531", display: "flex" }} />
        <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 9999, background: "rgba(255,255,255,0.12)", fontSize: 30 }}>{badge}</div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
          <div style={{ fontSize: title.length > 28 ? 64 : 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          <div style={{ marginTop: 22, fontSize: 34, color: "rgba(255,255,255,0.72)", lineHeight: 1.3 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 32, fontWeight: 800 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: accent, marginRight: 14, display: "flex" }} />
          FilialHub
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(font ? { fonts: [{ name: "Manrope", data: font, weight: 800 as const, style: "normal" as const }] } : {}) },
  );
}
