"use client";
import { useState } from "react";
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

export function Receipts({ me, canPay }: { me: string; canPay: boolean }) {
  const receipts = useQuery(api.receipts.list);
  const crew = useQuery(api.crew.list);
  const phases = useQuery(api.phases.list);
  const add = useMutation(api.receipts.add);
  const remove = useMutation(api.receipts.remove);
  const setReimbursed = useMutation(api.receipts.setReimbursed);
  const reimburseAll = useMutation(api.receipts.reimburseAll);
  const uploadUrl = useMutation(api.receipts.generateUploadUrl);

  const [form, setForm] = useState({ who: me, date: todayIso(), vendor: "", total: "", phase: "other", note: "" });
  const [file, setFile] = useState<Pending | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [msg, setMsg] = useState("");
  if (!receipts || !crew || !phases) return <div className="shop-loading">Loading receipts…</div>;

  const name = (short: string) => crew.find((c) => c.short === short)?.name ?? short;
  const color = (short: string) => crew.find((c) => c.short === short)?.color ?? "#888";
  const phaseName = Object.fromEntries(phases.map((p) => [p.key, p.name]));
  const open = receipts.filter((r) => !r.reimbursed);
  const done = receipts.filter((r) => r.reimbursed);
  const owed: Record<string, number> = {};
  for (const r of open) owed[r.who] = (owed[r.who] ?? 0) + r.total;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const payers = crew.filter((c) => c.canClock);
  const who = payers.some((c) => c.short === form.who) ? form.who : payers[0]?.short ?? me;

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
    if (!file) { setMsg("Attach a photo or PDF of the receipt first."); return; }
    setSaving(true);
    try {
      await add({ who, date: form.date, vendor: form.vendor, total: Number(form.total), phase: form.phase, note: form.note, storageId: file.storageId, kind: file.kind });
      setMsg(`Saved. ${name(who)} is owed ${money((owed[who] ?? 0) + Number(form.total))}.`);
      setForm((f) => ({ ...f, vendor: "", total: "", note: "" })); setFile(null);
    } catch (err) { setMsg("Couldn't save: " + (err as Error).message); }
    finally { setSaving(false); }
  }

  const row = (r: (typeof receipts)[number]) => (
    <div className="rcpt" key={r._id} style={{ ["--pc" as string]: color(r.who) }}>
      <a href={r.url ?? "#"} target="_blank" rel="noopener" className="scan" title="Open the receipt">
        {r.kind === "image" && r.url ? <img src={r.url} alt="" /> : <span>PDF</span>}
      </a>
      <div className="tx">
        <div className="pt">{r.vendor || "Receipt"} <span className="num">{money(r.total)}</span></div>
        <div className="m">{name(r.who)} · {r.date} · {phaseName[r.phase] ?? "Other"}{r.note && <> · {r.note}</>}</div>
        {r.reimbursed && r.reimbursedAt && <div className="m">Reimbursed {new Date(r.reimbursedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
      </div>
      <div className="row">
        {canPay && !r.reimbursed && <button className="btn primary" onClick={() => setReimbursed({ id: r._id, reimbursed: true })}>Reimbursed</button>}
        {canPay && r.reimbursed && <button className="btn quiet" onClick={() => setReimbursed({ id: r._id, reimbursed: false })}>Undo</button>}
        {!r.reimbursed && <button className="btn quiet" onClick={() => { if (confirm(`Delete this ${money(r.total)} receipt from ${r.vendor || "unknown vendor"}?`)) remove({ id: r._id }); }}>✕</button>}
      </div>
    </div>
  );

  return (
    <div className="two posts-layout">
      <section className="panel">
        <header><h2>Add a receipt</h2><span className="hint">{msg}</span></header>
        <form className="bd" onSubmit={submit}>
          <label className="f">Receipt photo or PDF
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
            <label className="f">Vendor<input value={form.vendor} onChange={set("vendor")} placeholder="Lowe's" required /></label>
            <label className="f">Total<input type="number" step="0.01" min="0.01" inputMode="decimal" value={form.total} onChange={set("total")} placeholder="0.00" required /></label>
          </div>
          <div className="row">
            <label className="f">Date<input type="date" value={form.date} onChange={set("date")} /></label>
            <label className="f">Paid by<select value={who} onChange={set("who")}>{payers.map((c) => <option key={c.short} value={c.short}>{c.name}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f">Phase<select value={form.phase} onChange={set("phase")}>{phases.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}<option value="other">Other</option></select></label>
            <label className="f">What for<input value={form.note} onChange={set("note")} placeholder="wire wheels, cutoff discs" /></label>
          </div>
          <div className="row">
            <button className="btn primary" type="submit" disabled={saving || uploading || !file}>{saving ? "Saving…" : "Save receipt"}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <header><h2>Waiting on reimbursement</h2><span className="hint">{open.length === 0 ? "all square" : money(open.reduce((a, r) => a + r.total, 0)) + " outstanding"}</span></header>
        <div className="bd">
          {Object.keys(owed).length > 0 && (
            <div className="owed">
              {Object.entries(owed).map(([w, amt]) => (
                <div className="ow" key={w} style={{ ["--pc" as string]: color(w) }}>
                  <div className="who">{name(w)}</div>
                  <div className="big"><span className="num">{money(amt)}</span> <small>owed</small></div>
                  {canPay && <button className="btn" onClick={async () => {
                    if (!confirm(`Mark all of ${name(w)}'s receipts (${money(amt)}) reimbursed?`)) return;
                    const n = await reimburseAll({ who: w });
                    setMsg(`Marked ${n} receipt${n === 1 ? "" : "s"} reimbursed.`);
                  }}>Reimburse all {money(amt)}</button>}
                </div>
              ))}
            </div>
          )}
          {open.length === 0 && <div className="empty">Nothing outstanding.</div>}
          {open.map(row)}
          {done.length > 0 && (
            <>
              <button className="linkbtn" style={{ marginTop: 12 }} onClick={() => setShowPaid((s) => !s)}>{showPaid ? "Hide" : "Show"} {done.length} reimbursed</button>
              {showPaid && done.map(row)}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
