// Same helpers as app/shop/util.ts on the website.
export const fmtH = (m: number) => (m / 60).toFixed(m % 60 ? 1 : 0);
export const fmtClock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
export const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const money = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return "$" + r.toLocaleString("en-US", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 });
};

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => isoOf(new Date());
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
}
/** "Today", "Yesterday", or "Mon, Oct 6". */
export function dayLabel(iso: string) {
  if (iso === todayIso()) return "Today";
  if (iso === addDays(todayIso(), -1)) return "Yesterday";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: y === new Date().getFullYear() ? undefined : "numeric" });
}
export const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};
export const plural = (n: number, word: string, many = word + "s") => `${n} ${n === 1 ? word : many}`;

/** Convex errors arrive as "[CONVEX M(...)] Uncaught Error: <message> at handler ..."; keep the message. */
export function errText(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e);
  const data = (e as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return raw.replace(/^[\s\S]*?Uncaught (?:Convex)?Error: /, "").split("\n")[0].replace(/\s+at handler.*$/, "");
}
