export const fmtH = (m: number) => (m / 60).toFixed(m % 60 ? 1 : 0);
export const fmtClock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
export const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const money = (n: number) => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
