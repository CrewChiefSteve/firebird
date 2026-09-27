"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { fmtClock, fmtDate, fmtH, money, todayIso } from "./util";

/** Unpaid hours per person. Everyone can look; only the payer (Jennifer) can mark hours paid. */
export function Payroll({ canPay }: { canPay: boolean }) {
  const board = useQuery(api.clock.board);
  const receipts = useQuery(api.receipts.list);
  const markPaid = useMutation(api.clock.markPaid);
  const setReimbursed = useMutation(api.receipts.setReimbursed);
  const reimburseAll = useMutation(api.receipts.reimburseAll);
  const [cashMsg, setCashMsg] = useState("");
  const [through, setThrough] = useState(todayIso());
  const [msg, setMsg] = useState("");
  if (!board) return <div className="shop-loading">Loading…</div>;
  const { crew, sessions } = board;
  const clockers = crew.filter((c) => c.canClock);

  // Anyone who isn't the payer can be owed for receipts; the payer's own buys enter the book settled.
  const owedTo = crew.filter((c) => !c.canPay);
  const allOwed = (receipts ?? []).filter((r) => !r.reimbursed && owedTo.some((c) => c.short === r.who));
  const owedTotal = allOwed.reduce((a, r) => a + r.total, 0);

  return (
    <>
    <section className="panel">
      <header><h2>Payroll</h2><span className="hint">{canPay ? "unpaid hours by person · mark paid through a date" : "unpaid hours by person · Jennifer marks these paid"}</span></header>
      <div className="bd">
        {canPay && <div className="row">
          <label className="f">Paid through<input type="date" value={through} onChange={(e) => setThrough(e.target.value)} /></label>
          <span className="hint" style={{ alignSelf: "end" }}>{msg}</span>
        </div>}
        <div className="pay-grid">
          {clockers.map((c) => {
            const mine = sessions.filter((s) => s.who === c.short);
            const unpaid = mine.filter((s) => !s.paid);
            const unpaidMin = unpaid.reduce((a, s) => a + s.minutes, 0);
            const paidMin = mine.filter((s) => s.paid).reduce((a, s) => a + s.minutes, 0);
            const owed = (receipts ?? []).filter((r) => r.who === c.short && !r.reimbursed).reduce((a, r) => a + r.total, 0);
            return (
              <div className="pay" key={c.short} style={{ ["--pc" as string]: c.color }}>
                <div className="who">{c.name}</div>
                <div className="big"><span className="num">{fmtH(unpaidMin)}</span> <small>hrs unpaid</small></div>
                <div className="m">{fmtH(paidMin)} hrs already paid · {mine.length} entries{owed > 0 && <> · <b>{money(owed)} in receipts</b> on the Ledger tab</>}</div>
                {canPay && <button className="btn primary" disabled={unpaidMin === 0} onClick={async () => {
                  if (!confirm(`Mark all of ${c.name}'s unpaid hours through ${through} as paid?`)) return;
                  const n = await markPaid({ who: c.short, through });
                  setMsg(`Marked ${n} ${c.name} entr${n === 1 ? "y" : "ies"} paid.`);
                }}>Mark paid through {through}</button>}
                <div className="log" style={{ marginTop: 10 }}>
                  {unpaid.length === 0 && <div className="empty">Nothing outstanding.</div>}
                  {unpaid.map((s) => (
                    <div className="r" key={s._id}><i /><div>{s.phase}{s.note && <span className="m"> · {s.note}</span>}</div><div className="num">{fmtClock(s.minutes)}</div><div className="m">{fmtDate(s.start)}</div></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    <section className="panel">
      <header><h2>Cash Reimbursements</h2><span className="hint">{owedTotal > 0 ? `${money(owedTotal)} owed across the crew` : "all square"} · {canPay ? "pay a line or the whole table, then clear it" : "Jennifer clears these when she pays"}</span></header>
      <div className="bd">
        {!receipts && <div className="shop-loading">Loading receipts…</div>}
        {cashMsg && <div className="hint" style={{ marginLeft: 0 }}>{cashMsg}</div>}
        {receipts && (
          <div className="cash-grid">
            {owedTo.map((c) => {
              const rows = receipts.filter((r) => r.who === c.short && !r.reimbursed).sort((a, b) => a.date.localeCompare(b.date));
              const total = rows.reduce((a, r) => a + r.total, 0);
              const last = receipts.filter((r) => r.who === c.short && r.reimbursed && r.reimbursedAt).sort((a, b) => (b.reimbursedAt ?? 0) - (a.reimbursedAt ?? 0))[0];
              return (
                <div className="pay cash" key={c.short} style={{ ["--pc" as string]: c.color }}>
                  <div className="who">{c.name}</div>
                  <div className="big"><span className="num">{money(total)}</span> <small>{rows.length === 0 ? "nothing owed" : `owed on ${rows.length} receipt${rows.length === 1 ? "" : "s"}`}</small></div>
                  {last?.reimbursedAt && <div className="m">Last paid {fmtDate(last.reimbursedAt)}</div>}
                  {rows.length > 0 && (
                    <div className="ledger-wrap"><table className="ledger">
                      <thead><tr><th>Date</th><th>Vendor</th><th>For</th><th></th><th className="num">Amount</th>{canPay && <th></th>}</tr></thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r._id}>
                            <td className="num">{r.date.slice(5).replace("-", "/")}</td>
                            <td>{r.vendor || "—"}</td>
                            <td><span className="m">{[r.phase, r.note].filter(Boolean).join(" · ")}</span></td>
                            <td>{r.url ? <a className="scan" href={r.url} target="_blank" rel="noreferrer">{r.kind === "pdf" ? "PDF" : <img src={r.url} alt="receipt" />}</a> : null}</td>
                            <td className="num">{money(r.total)}</td>
                            {canPay && <td><button className="btn quiet" style={{ padding: "3px 8px" }} title="Paid this one" onClick={() => setReimbursed({ id: r._id, reimbursed: true })}>Paid</button></td>}
                          </tr>
                        ))}
                        <tr className="tot"><td colSpan={4}><b>Total to pay {c.name}</b></td><td className="num"><b>{money(total)}</b></td>{canPay && <td></td>}</tr>
                      </tbody>
                    </table></div>
                  )}
                  {canPay && rows.length > 0 && <button className="btn primary" onClick={async () => {
                    if (!confirm(`Paid ${c.name} ${money(total)} for ${rows.length} receipt${rows.length === 1 ? "" : "s"}? This clears the table.`)) return;
                    const n = await reimburseAll({ who: c.short });
                    setCashMsg(`Paid ${c.name} ${money(total)}. Cleared ${n} receipt${n === 1 ? "" : "s"}.`);
                  }}>Paid {c.name} {money(total)}, clear it</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
