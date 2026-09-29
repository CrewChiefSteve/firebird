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
  const payments = useQuery(api.payments.list);
  const addPayment = useMutation(api.payments.add);
  const removePayment = useMutation(api.payments.remove);
  const settle = useMutation(api.payments.settle);
  const [pay, setPay] = useState({ who: "", amount: "", date: todayIso(), note: "" });
  const [payMsg, setPayMsg] = useState("");
  const [through, setThrough] = useState(todayIso());
  const [msg, setMsg] = useState("");
  if (!board) return <div className="shop-loading">Loading…</div>;
  const { crew, sessions } = board;
  const clockers = crew.filter((c) => c.canClock);

  // Anyone who isn't the payer can be owed for receipts; the payer's own buys enter the book settled.
  const owedTo = crew.filter((c) => !c.canPay);
  const allOwed = (receipts ?? []).filter((r) => !r.reimbursed && owedTo.some((c) => c.short === r.who));
  const owedTotal = allOwed.reduce((a, r) => a + r.total, 0);

  // Bottom line: wages through the chosen date plus unpaid receipts, per person and all together.
  const [ty, tm, td] = through.split("-").map(Number);
  const throughCutoff = new Date(ty, tm - 1, td, 23, 59, 59).getTime();
  const payout = crew.map((c) => {
    const min = c.canClock ? sessions.filter((s) => s.who === c.short && !s.paid && s.start <= throughCutoff).reduce((a, s) => a + s.minutes, 0) : 0;
    const wages = (min / 60) * c.rate;
    const cash = (receipts ?? []).filter((r) => r.who === c.short && !r.reimbursed && !c.canPay).reduce((a, r) => a + r.total, 0);
    const paidSoFar = (payments ?? []).filter((p) => p.who === c.short && !p.applied).reduce((a, p) => a + p.amount, 0);
    return { c, min, wages, cash, paidSoFar, total: wages + cash - paidSoFar };
  }).filter((p) => p.total !== 0 || p.paidSoFar > 0 || p.c.canClock);
  const grand = payout.reduce((a, p) => ({ min: a.min + p.min, wages: a.wages + p.wages, cash: a.cash + p.cash, paidSoFar: a.paidSoFar + p.paidSoFar, total: a.total + p.total }), { min: 0, wages: 0, cash: 0, paidSoFar: 0, total: 0 });
  const payable = crew.filter((c) => !c.canPay);
  const openPayments = (payments ?? []).filter((p) => !p.applied);
  const settledPayments = (payments ?? []).filter((p) => p.applied);
  const nameOf = (short: string) => crew.find((c) => c.short === short)?.name ?? short;
  const owe = (n: number) => (n < 0 ? `${money(-n)} credit` : money(n));

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const who = pay.who || payable[0]?.short;
    const amount = parseFloat(pay.amount.replace(/[$,]/g, ""));
    if (!who || !(amount > 0)) return;
    await addPayment({ who, amount, date: pay.date, note: pay.note });
    setPayMsg(`Recorded ${money(amount)} paid to ${nameOf(who)}.`);
    setPay((p) => ({ ...p, amount: "", note: "" }));
  }

  return (
    <>
    <section className="panel">
      <header><h2>Payroll</h2><span className="hint">{canPay ? "what each person is owed · pay through a date, then mark it" : "what each person is owed · Jennifer marks these paid"}</span></header>
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
            const wages = (unpaidMin / 60) * c.rate;
            const [y, m, d] = through.split("-").map(Number);
            const cutoff = new Date(y, m - 1, d, 23, 59, 59).getTime();
            const dueMin = unpaid.filter((s) => s.start <= cutoff).reduce((a, s) => a + s.minutes, 0);
            const due = (dueMin / 60) * c.rate;
            return (
              <div className="pay" key={c.short} style={{ ["--pc" as string]: c.color }}>
                <div className="who">{c.name}</div>
                <div className="big"><span className="num">{money(wages)}</span> <small>owed for {fmtH(unpaidMin)} hrs{c.rate ? ` at ${money(c.rate)}/hr` : ""}</small></div>
                {!c.rate && <div className="m">No hourly rate set for {c.name} yet.</div>}
                {owed > 0 && <div className="m"><b>{money(wages + owed)} total</b> with {money(owed)} in cash receipts below</div>}
                <div className="m">{fmtH(paidMin)} hrs already paid · {mine.length} entries</div>
                {canPay && <button className="btn primary" disabled={dueMin === 0} onClick={async () => {
                  if (!confirm(`Paid ${c.name} ${money(due)} for ${fmtH(dueMin)} hrs through ${through}?`)) return;
                  const n = await markPaid({ who: c.short, through });
                  setMsg(`Paid ${c.name} ${money(due)}. Marked ${n} entr${n === 1 ? "y" : "ies"} paid.`);
                }}>Paid {money(due)} through {through.slice(5).replace("-", "/")}</button>}
                <div className="log" style={{ marginTop: 10 }}>
                  {unpaid.length === 0 && <div className="empty">Nothing outstanding.</div>}
                  {unpaid.map((s) => (
                    <div className="r" key={s._id}><i /><div>{s.phase}{s.note && <span className="m"> · {s.note}</span>}</div><div className="num">{fmtClock(s.minutes)}</div><div className="m">{fmtDate(s.start)}{c.rate ? ` · ${money((s.minutes / 60) * c.rate)}` : ""}</div></div>
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

    <section className="panel">
      <header><h2>Total Payout</h2><span className="hint">hours through {through.slice(5).replace("-", "/")} plus unpaid receipts · pay the right-hand column</span></header>
      <div className="bd">
        <div className="ledger-wrap"><table className="ledger payout">
          <thead><tr><th>Who</th><th className="num">Hours</th><th className="num">Rate</th><th className="num">Wages</th><th className="num">Receipts</th><th className="num">Paid so far</th><th className="num">Still owed</th>{canPay && <th></th>}</tr></thead>
          <tbody>
            {payout.map(({ c, min, wages, cash, paidSoFar, total }) => (
              <tr key={c.short}>
                <td><b>{c.name}</b></td>
                <td className="num">{c.canClock ? fmtH(min) : "—"}</td>
                <td className="num">{c.rate ? `${money(c.rate)}/hr` : "—"}</td>
                <td className="num">{money(wages)}</td>
                <td className="num">{money(cash)}</td>
                <td className="num">{paidSoFar > 0 ? `−${money(paidSoFar)}` : "—"}</td>
                <td className="num"><b>{owe(total)}</b></td>
                {canPay && <td>{(wages + cash + paidSoFar) > 0 && <button className="btn quiet" style={{ padding: "3px 8px" }} title="Paid in full: clears hours, receipts and payments" onClick={async () => {
                  if (!confirm(`Settle up with ${c.name}? That marks hours through ${through} paid, clears ${c.name}'s receipts, and closes out ${money(paidSoFar)} in payments. Only do this once ${c.name} is paid in full.`)) return;
                  await settle({ who: c.short, through });
                  setPayMsg(`Settled up with ${c.name}.`);
                }}>Settled up</button>}</td>}
              </tr>
            ))}
            <tr className="tot grand"><td><b>Total payout</b></td><td className="num"><b>{fmtH(grand.min)}</b></td><td></td><td className="num"><b>{money(grand.wages)}</b></td><td className="num"><b>{money(grand.cash)}</b></td><td className="num"><b>{grand.paidSoFar > 0 ? `−${money(grand.paidSoFar)}` : "—"}</b></td><td className="num"><b>{owe(grand.total)}</b></td>{canPay && <td></td>}</tr>
          </tbody>
        </table></div>
        {payMsg && <div className="hint" style={{ marginLeft: 0 }}>{payMsg}</div>}
        {canPay && (
          <form className="row" onSubmit={recordPayment} style={{ flexWrap: "wrap", alignItems: "end" }}>
            <label className="f">Paid to<select value={pay.who || payable[0]?.short || ""} onChange={(e) => setPay((p) => ({ ...p, who: e.target.value }))}>{payable.map((c) => <option key={c.short} value={c.short}>{c.name}</option>)}</select></label>
            <label className="f">Amount<input inputMode="decimal" required value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} placeholder="500" /></label>
            <label className="f">Date<input type="date" value={pay.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} /></label>
            <label className="f">Note<input value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} placeholder="check #, Venmo, cash" /></label>
            <button className="btn primary" type="submit">Record payment</button>
          </form>
        )}
        {openPayments.length > 0 && (
          <div className="log">
            {openPayments.map((p) => (
              <div className="r" key={p._id}><i /><div>{nameOf(p.who)} got {money(p.amount)}{p.note && <span className="m"> · {p.note}</span>}</div><div className="m">{fmtDate(new Date(p.date + "T12:00").getTime())}</div>{canPay ? <button className="btn quiet" style={{ padding: "3px 8px" }} title="Remove this payment" onClick={() => { if (confirm(`Remove the ${money(p.amount)} payment to ${nameOf(p.who)}?`)) removePayment({ id: p._id }); }}>✕</button> : <div />}</div>
            ))}
          </div>
        )}
        <div className="hint" style={{ marginLeft: 0 }}>{canPay ? "Paid part of it? Record the payment and it comes off. Paid someone in full? Hit Settled up and their row goes back to zero." : "Payments Jennifer records come off what's owed."}</div>
        {settledPayments.length > 0 && (
          <details>
            <summary>Settled payments ({settledPayments.length})</summary>
            <div className="log">{settledPayments.map((p) => <div className="r" key={p._id}><i /><div>{nameOf(p.who)} got {money(p.amount)}{p.note && <span className="m"> · {p.note}</span>}</div><div className="m">{fmtDate(new Date(p.date + "T12:00").getTime())}</div><div /></div>)}</div>
          </details>
        )}
      </div>
    </section>
    </>
  );
}
