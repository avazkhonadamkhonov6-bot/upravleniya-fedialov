import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "FilialHub — идоракунии филиалҳо";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Идоракунии филиалҳо", subtitle: "Фурӯш, кормандон, мизоҷон ва бозори онлайн — дар як ҷо", badge: "CRM барои тарабхона ва мағоза" });
}
