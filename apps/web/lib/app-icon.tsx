import { ImageResponse } from "next/og";

/**
 * Иконкаи PNG барои насби сайт дар телефон (Android ва iPhone PNG-и 192/512 мехоҳанд).
 * Ҳамон тамғаи app/icon.svg: майдони сурх, ҳарфи F ва нуқтаи зард.
 */
export function appIcon(size: number) {
  const u = size / 64;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(135deg, #ff3b4f, #c8001f)" }}>
        {/* F: сутун ва ду хати уфуқӣ (мисли path-и icon.svg) */}
        <div style={{ position: "absolute", left: 18 * u, top: 18 * u, width: 7 * u, height: 28 * u, background: "#fff", display: "flex" }} />
        <div style={{ position: "absolute", left: 18 * u, top: 18 * u, width: 22 * u, height: 6 * u, background: "#fff", display: "flex" }} />
        <div style={{ position: "absolute", left: 18 * u, top: 30 * u, width: 20 * u, height: 6 * u, background: "#fff", display: "flex" }} />
        <div style={{ position: "absolute", left: 41 * u, top: 37 * u, width: 10 * u, height: 10 * u, borderRadius: 9999, background: "#ffd27a", display: "flex" }} />
      </div>
    ),
    { width: size, height: size },
  );
}
