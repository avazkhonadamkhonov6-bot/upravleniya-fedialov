"use client";

import { PAYMENT_LABELS, type Order } from "@filialhub/shared";
import { formatMoney, tr } from "./i18n";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const when = (iso: string) => new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

/** Матни чек — барои WhatsApp/Telegram ва барои чоп */
export function receiptText(o: Order, shop: string) {
  const lines = o.items.map((i) => `${i.name} × ${i.qty} = ${formatMoney(i.unitPrice * i.qty)}`);
  return [
    `🧾 ${shop}`,
    `${tr("Чек")} #${o.id} · ${when(o.createdAt)}`,
    o.branchName,
    "",
    ...lines,
    "",
    ...(o.discount ? [`${tr("Тахфиф (бонус)")}: −${formatMoney(o.discount)}`] : []),
    `${tr("Ҳамагӣ")}: ${formatMoney(o.total)} (${tr(PAYMENT_LABELS[o.payment])})`,
    ...(o.pointsEarned ? [`🎁 +${o.pointsEarned} ${tr("балл")}`] : []),
    "",
    tr("Ташаккур барои харид!"),
  ].join("\n");
}

/** Чоп дар принтери чек (58 ё 80 мм): тирезаи алоҳида, то услубҳои сайт халал нарасонанд */
export function printReceipt(o: Order, shop: string, width: 58 | 80 = 80) {
  const w = window.open("", "receipt", "width=420,height=640");
  if (!w) return false;
  const rows = o.items
    .map((i) => `<tr><td>${esc(i.name)}<br><small>${i.qty} × ${esc(formatMoney(i.unitPrice))}</small></td><td class="r">${esc(formatMoney(i.unitPrice * i.qty))}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(tr("Чек"))} #${o.id}</title><style>
    @page { size: ${width}mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body { width: ${width - 4}mm; margin: 0 auto; font: ${width === 58 ? 11 : 12}px/1.35 ui-monospace, "Courier New", monospace; color: #000; }
    h1 { font-size: 1.35em; text-align: center; margin: 0 0 2px; }
    .c { text-align: center; } .r { text-align: right; white-space: nowrap; vertical-align: bottom; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    td { padding: 3px 0; border-bottom: 1px dashed #999; }
    .total { font-size: 1.4em; font-weight: 700; display: flex; justify-content: space-between; margin-top: 4px; }
    small { color: #333; }
  </style></head><body>
    <h1>${esc(shop)}</h1>
    <div class="c">${esc(o.branchName)}</div>
    <div class="c">${esc(tr("Чек"))} #${o.id} · ${esc(when(o.createdAt))}</div>
    <div class="c"><small>${esc(tr("Кассир"))}: ${esc(o.userName)}${o.customerName ? ` · ${esc(o.customerName)}` : ""}</small></div>
    <table>${rows}</table>
    ${o.discount ? `<div style="display:flex;justify-content:space-between"><span>${esc(tr("Тахфиф (бонус)"))}</span><span>−${esc(formatMoney(o.discount))}</span></div>` : ""}
    <div class="total"><span>${esc(tr("Ҳамагӣ"))}</span><span>${esc(formatMoney(o.total))}</span></div>
    <div>${esc(tr(PAYMENT_LABELS[o.payment]))}${o.pointsEarned ? ` · +${o.pointsEarned} ${esc(tr("балл"))}` : ""}</div>
    <p class="c">${esc(tr("Ташаккур барои харид!"))}</p>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };<\/script>
  </body></html>`);
  w.document.close();
  return true;
}

/** WhatsApp бо матни чек; агар рақам бошад — рост ба мизоҷ */
export function whatsappReceiptUrl(o: Order, shop: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(receiptText(o, shop))}`;
}
