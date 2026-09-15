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
  const [through, setThrough] = useState(todayIso());
  const [msg, setMsg] = useState("");
  if (!board) return <div className="shop-loading">Loading…</div>;
  const { crew, sessions } = board;
  const clockers = crew.filter((c) => c.canClock);

  return (
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
                <div className="m">{fmtH(paidMin)} hrs already paid · {mine.length} entries{owed > 0 && <> · <b>{money(owed)} in receipts</b> on the Receipts tab</>}</div>
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
  );
}
