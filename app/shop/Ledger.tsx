"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { money, todayIso } from "./util";

/** Receipts need to stay legible, so shrink less than build-log photos (max 2200px, quality .88). PDFs go up as-is. */
async function prep(file: File): Promise<{ blob: Blob; kind: "image" | "pdf" }> {
  if (file.type === "application/pdf") return { blob: file, kind: "pdf" };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { blob: file, kind: "image" };
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1_500_000) return { blob: file, kind: "image" };
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.88));
  return { blob, kind: "image" };
}

type Pending = { storageId: Id<"_storage">; kind: "image" | "pdf"; preview: string; name: string };
const fmtDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }); };

/**
 * The ledger: every dollar spent on the car, newest first, with a running total.
 * Anyone on the crew can add a row. Rows paid by a clocker wait on Jennifer to mark them
 * reimbursed; rows Jennifer paid herself are settled the moment they go in.
 */
export function Ledger({ me, canPay }: { me: string; canPay: boolean }) {
  const rows = useQuery(api.receipts.list);
  const crew = useQuery(api.crew.list);
  const phases = useQuery(api.phases.list);
  const parts = useQuery(api.parts.list);
  const add = useMutation(api.receipts.add);
  const remove = useMutation(api.receipts.remove);
  const setReimbursed = useMutation(api.receipts.setReimbursed);
  const reimburseAll = useMutation(api.receipts.reimburseAll);
  const uploadUrl = useMutation(api.receipts.generateUploadUrl);

  const [form, setForm] = useState({ who: me, date: todayIso(), vendor: "", total: "", phase: "other", note: "" });
  const [file, setFile] = useState<Pending | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "owed" | string>("all");

  const book = useMemo(() => {
    if (!rows) return [];
    // Oldest first to accumulate, then flip so the newest sits on top.
    const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    let run = 0;
    return asc.map((r) => ({ ...r, run: (run += r.total) })).reverse();
  }, [rows]);

  if (!rows || !crew || !phases || !parts) return <div className="shop-loading">Opening the ledger…</div>;

  const name = (short: string) => crew.find((c) => c.short === short)?.name ?? short;
  const color = (short: string) => crew.find((c) => c.short === short)?.color ?? "#888";
  const isPayer = (short: string) => !!crew.find((c) => c.short === short)?.canPay;
  const phaseName: Record<string, string> = { other: "Other", ...Object.fromEntries(phases.map((p) => [p.key, p.name])) };
  const total = rows.reduce((a, r) => a + r.total, 0);
  const owed: Record<string, number> = {};
  for (const r of rows) if (!r.reimbursed) owed[r.who] = (owed[r.who] ?? 0) + r.total;
  const owedTotal = Object.values(owed).reduce((a, b) => a + b, 0);
  const byPhase: Record<string, number> = {};
  for (const r of rows) byPhase[r.phase] = (byPhase[r.phase] ?? 0) + r.total;
  const byWho: Record<string, number> = {};
  for (const r of rows) byWho[r.who] = (byWho[r.who] ?? 0) + r.total;
  const stillToBuy = parts.filter((p) => p.status === "need" || p.status === "hot").reduce((a, p) => a + p.cost * p.qty, 0);
  const onOrder = parts.filter((p) => p.status === "ordered").reduce((a, p) => a + p.cost * p.qty, 0);
  const month = todayIso().slice(0, 7);
  const thisMonth = rows.filter((r) => r.date.startsWith(month)).reduce((a, r) => a + r.total, 0);

  const shown = book.filter((r) => filter === "all" ? true : filter === "owed" ? !r.reimbursed : r.who === filter);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setUploading(true); setMsg("");
    try {
      const { blob, kind } = await prep(f);
      const url = await uploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
      const { storageId } = await res.json();
      setFile({ storageId, kind, preview: kind === "image" ? URL.createObjectURL(blob) : "", name: f.name });
    } catch (e) { setMsg("Upload failed: " + (e as Error).message); }
    finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await add({ who: form.who, date: form.date, vendor: form.vendor, total: Number(form.total), phase: form.phase, note: form.note, storageId: file?.storageId, kind: file?.kind });
      setMsg(isPayer(form.who) ? `Entered. ${money(total + Number(form.total))} spent so far.` : `Entered. ${name(form.who)} is owed ${money((owed[form.who] ?? 0) + Number(form.total))}.`);
      setForm((f) => ({ ...f, vendor: "", total: "", note: "" })); setFile(null);
    } catch (err) { setMsg("Couldn't save: " + (err as Error).message); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["Date", "Vendor", "What for", "Phase", "Paid by", "Amount", "Running total", "Status", "Receipt"].join(",")];
    for (const r of [...book].reverse()) {
      lines.push([r.date, r.vendor, r.note, phaseName[r.phase] ?? r.phase, name(r.who), r.total.toFixed(2), r.run.toFixed(2),
        isPayer(r.who) ? "paid direct" : r.reimbursed ? "reimbursed" : "owed", r.url ?? ""].map(esc).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `trans-am-ledger-${todayIso()}.csv`;
    a.click();
  }

  return (
    <>
      <div className="ledger-stats">
        <div className="st gold"><div className="l">Spent on the car</div><div className="v num">{money(total)}</div><div className="m">{rows.length} entr{rows.length === 1 ? "y" : "ies"}</div></div>
        <div className="st"><div className="l">This month</div><div className="v num">{money(thisMonth)}</div><div className="m">since the 1st</div></div>
        <div className="st"><div className="l">Owed to crew</div><div className="v num">{money(owedTotal)}</div><div className="m">{owedTotal === 0 ? "all square" : Object.entries(owed).map(([w, a]) => `${name(w)} ${money(a)}`).join(" · ")}</div></div>
        <div className="st"><div className="l">Parts still to buy</div><div className="v num">{money(stillToBuy)}</div><div className="m">{onOrder > 0 ? `plus ${money(onOrder)} on order` : "from the Parts tab"}</div></div>
      </div>

      <div className="two posts-layout">
        <section className="panel">
          <header><h2>Enter a purchase</h2><span className="hint">{msg}</span></header>
          <form className="bd" onSubmit={submit}>
            <div className="row">
              <label className="f">Vendor<input value={form.vendor} onChange={set("vendor")} placeholder="Lowe's, Rock Auto, NPD" required /></label>
              <label className="f">Amount<input type="number" step="0.01" min="0.01" inputMode="decimal" value={form.total} onChange={set("total")} placeholder="0.00" required /></label>
            </div>
            <div className="row">
              <label className="f">Date<input type="date" value={form.date} onChange={set("date")} /></label>
              <label className="f">Paid by<select value={form.who} onChange={set("who")}>{crew.map((c) => <option key={c.short} value={c.short}>{c.name}{c.canPay ? " (project funds)" : ""}</option>)}</select></label>
            </div>
            <div className="row">
              <label className="f">Phase<select value={form.phase} onChange={set("phase")}>{phases.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}<option value="other">Other</option></select></label>
              <label className="f">What for<input value={form.note} onChange={set("note")} placeholder="ball joints, tie rod ends" /></label>
            </div>
            <label className="f">Receipt photo or PDF <span className="hint">(optional)</span>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => pick(e.target.files)} />
            </label>
            {(file || uploading) && (
              <div className="thumbs">
                <div className={`thumb${uploading ? " uploading" : ""}`}>
                  {uploading ? "Uploading…" : file?.kind === "image" ? <img src={file.preview} alt="" /> : <span>{file?.name}</span>}
                </div>
              </div>
            )}
            <div className="row">
              <button className="btn primary" type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Enter it"}</button>
              <span className="hint" style={{ alignSelf: "center" }}>{isPayer(form.who) ? "Paid from project funds. Nothing owed." : `${name(form.who)} gets reimbursed for this.`}</span>
            </div>
          </form>
        </section>

        <section className="panel">
          <header><h2>Where it went</h2><span className="hint">totals</span></header>
          <div className="bd breakdown">
            <div>
              <div className="row2"><b>By phase</b><span /></div>
              {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div className="row2" key={k}><span>{phaseName[k] ?? k}</span><span className="num">{money(v)}</span></div>)}
              {rows.length === 0 && <div className="row2"><span className="m">Nothing yet.</span><span /></div>}
            </div>
            <div>
              <div className="row2"><b>By who paid</b><span /></div>
              {Object.entries(byWho).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div className="row2" key={k}><span>{name(k)}{owed[k] ? <span className="m"> · {money(owed[k])} owed</span> : null}</span><span className="num">{money(v)}</span></div>
              ))}
              {canPay && owedTotal > 0 && (
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  {Object.entries(owed).map(([w, amt]) => (
                    <button className="btn" key={w} onClick={async () => {
                      if (!confirm(`Mark all of ${name(w)}'s receipts (${money(amt)}) reimbursed?`)) return;
                      const n = await reimburseAll({ who: w });
                      setMsg(`Marked ${n} entr${n === 1 ? "y" : "ies"} reimbursed.`);
                    }}>Reimburse {name(w)} {money(amt)}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 14 }}>
        <header>
          <h2>The book</h2>
          <span className="row" style={{ gap: 8, alignItems: "center" }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Everything</option>
              <option value="owed">Waiting on reimbursement</option>
              {crew.map((c) => <option key={c.short} value={c.short}>Paid by {c.name}</option>)}
            </select>
            <button className="btn" type="button" onClick={exportCsv} disabled={rows.length === 0}>Download CSV</button>
          </span>
        </header>
        <div className="bd ledger-wrap">
          <table className="ledger">
            <thead><tr><th>Date</th><th>Vendor</th><th>What for</th><th>Phase</th><th>Paid by</th><th className="num">Amount</th><th className="num">Running</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td className="empty" colSpan={9}>Nothing here yet.</td></tr>}
              {shown.map((r) => (
                <tr key={r._id} style={{ ["--pc" as string]: color(r.who) }}>
                  <td className="m" style={{ whiteSpace: "nowrap" }}>{fmtDay(r.date)}</td>
                  <td><b>{r.vendor || "—"}</b></td>
                  <td className="m">{r.note}</td>
                  <td className="m">{phaseName[r.phase] ?? r.phase}</td>
                  <td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color(r.who), marginRight: 6 }} />{name(r.who)}</td>
                  <td className="num">{money(r.total)}</td>
                  <td className="num run">{money(r.run)}</td>
                  <td className="m">
                    {isPayer(r.who) ? "paid direct" : r.reimbursed ? `reimbursed${r.reimbursedAt ? " " + new Date(r.reimbursedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : <b style={{ color: "var(--oxide, #B5432A)" }}>owed</b>}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.url && <a href={r.url} target="_blank" rel="noopener" className="scan" title="Open the receipt">{r.kind === "image" ? <img src={r.url} alt="" /> : "PDF"}</a>}
                    {" "}
                    {canPay && !isPayer(r.who) && !r.reimbursed && <button className="btn primary" style={{ padding: "3px 8px" }} onClick={() => setReimbursed({ id: r._id, reimbursed: true })}>Reimbursed</button>}
                    {canPay && !isPayer(r.who) && r.reimbursed && <button className="btn quiet" style={{ padding: "3px 8px" }} onClick={() => setReimbursed({ id: r._id, reimbursed: false })}>Undo</button>}
                    {(canPay || !r.reimbursed) && <button className="btn quiet" style={{ padding: "3px 8px" }} title="Delete" onClick={() => { if (confirm(`Delete the ${money(r.total)} ${r.vendor || ""} entry?`)) remove({ id: r._id }); }}>✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
