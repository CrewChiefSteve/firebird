import { useState } from "react";
import { View } from "react-native";
import { api } from "@convex/_generated/api";
import { useM, useQ } from "@/lib/data";
import { useCrew } from "@/lib/crew";
import { F, useColors } from "@/lib/theme";
import { errText, fmtClock, fmtDate, fmtH, money, todayIso } from "@/lib/format";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Chips, DateField, Divider, Empty, Field, H3, Loading, Msg, Muted, P, Row, Screen, Section } from "@/components/ui";

const short = (iso: string) => iso.slice(5).replace("-", "/");
const endOf = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, 23, 59, 59).getTime(); };

/** What each person is owed. Everyone can look; only the payer (Jennifer) marks things paid. */
export default function Payroll() {
  const c = useColors();
  const { canPay } = useCrew();
  const board = useQ(api.clock.board);
  const receipts = useQ(api.receipts.list);
  const payments = useQ(api.payments.list);
  const markPaid = useM(api.clock.markPaid);
  const setReimbursed = useM(api.receipts.setReimbursed);
  const reimburseAll = useM(api.receipts.reimburseAll);
  const addPayment = useM(api.payments.add);
  const removePayment = useM(api.payments.remove);
  const settle = useM(api.payments.settle);
  const [through, setThrough] = useState(todayIso());
  const [pay, setPay] = useState({ who: "", amount: "", date: todayIso(), note: "" });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showSettled, setShowSettled] = useState(false);
  const [msg, setMsg] = useState("");
  if (!board || !receipts || !payments) return <Loading />;

  const { crew, sessions } = board;
  const clockers = crew.filter((x) => x.canClock);
  const owedTo = crew.filter((x) => !x.canPay);
  const cutoff = endOf(through);
  const nameOf = (s: string) => crew.find((x) => x.short === s)?.name ?? s;
  const owe = (n: number) => (n < 0 ? `${money(-n)} credit` : money(n));
  const payout = crew.map((x) => {
    const min = x.canClock ? sessions.filter((s) => s.who === x.short && !s.paid && s.start <= cutoff).reduce((a, s) => a + s.minutes, 0) : 0;
    const wages = (min / 60) * x.rate;
    const cash = receipts.filter((r) => r.who === x.short && !r.reimbursed && !x.canPay).reduce((a, r) => a + r.total, 0);
    const paidSoFar = payments.filter((p) => p.who === x.short && !p.applied).reduce((a, p) => a + p.amount, 0);
    return { x, min, wages, cash, paidSoFar, total: wages + cash - paidSoFar };
  }).filter((p) => p.total !== 0 || p.paidSoFar > 0 || p.x.canClock);
  const grand = payout.reduce((a, p) => ({ min: a.min + p.min, wages: a.wages + p.wages, cash: a.cash + p.cash, paidSoFar: a.paidSoFar + p.paidSoFar, total: a.total + p.total }), { min: 0, wages: 0, cash: 0, paidSoFar: 0, total: 0 });
  const payable = crew.filter((x) => !x.canPay);
  const payWho = pay.who || payable[0]?.short || "";
  const openPayments = payments.filter((p) => !p.applied);
  const settledPayments = payments.filter((p) => p.applied);
  const run = (p: Promise<unknown>) => p.catch((e) => setMsg(errText(e)));

  async function recordPayment() {
    const amount = parseFloat(pay.amount.replace(/[$,]/g, ""));
    if (!payWho || !(amount > 0)) return setMsg("Needs an amount.");
    await run(addPayment({ who: payWho, amount, date: pay.date, note: pay.note }));
    setMsg(`Recorded ${money(amount)} paid to ${nameOf(payWho)}.`);
    setPay((p) => ({ ...p, amount: "", note: "" }));
  }

  const line = (label: string, value: string, bold = false) => (
    <Row><P style={{ flex: 1, color: bold ? c.ink : c.ink2 }}>{label}</P><P style={{ fontFamily: bold ? F.mono : F.mono4 }}>{value}</P></Row>
  );

  return (
    <Screen>
      {canPay && <DateField label="Paid through" value={through} onChange={setThrough} />}
      <Msg text={msg} />

      <Section title="Total payout" hint={`hours through ${short(through)} plus unpaid receipts`}>
        {payout.map(({ x, min, wages, cash, paidSoFar, total }) => (
          <Card key={x.short} accent={x.color}>
            <Row><H3 style={{ flex: 1, fontSize: 18 }}>{x.name}</H3><P style={{ fontFamily: F.mono, fontSize: 18 }}>{owe(total)}</P></Row>
            {x.canClock && line(`${fmtH(min)} hrs${x.rate ? ` at ${money(x.rate)}/hr` : " · no rate set"}`, money(wages))}
            {cash > 0 && line("Receipts", money(cash))}
            {paidSoFar > 0 && line("Paid so far", `−${money(paidSoFar)}`)}
            {canPay && wages + cash + paidSoFar > 0 && (
              <Btn small title="Settled up" onPress={async () => {
                if (!(await confirm(`Settle up with ${x.name}?`, `That marks hours through ${through} paid, clears ${x.name}'s receipts, and closes out ${money(paidSoFar)} in payments. Only do this once ${x.name} is paid in full.`, "Settled up"))) return;
                await run(settle({ who: x.short, through }));
                setMsg(`Settled up with ${x.name}.`);
              }} />
            )}
          </Card>
        ))}
        <Card style={{ backgroundColor: c.surface2 }}>
          {line(`Total · ${fmtH(grand.min)} hrs`, owe(grand.total), true)}
          <Muted>{money(grand.wages)} wages + {money(grand.cash)} receipts{grand.paidSoFar > 0 ? ` − ${money(grand.paidSoFar)} paid` : ""}</Muted>
        </Card>
        <Muted>{canPay ? "Paid part of it? Record the payment below and it comes off. Paid someone in full? Hit Settled up and their row goes back to zero." : "Payments Jennifer records come off what’s owed."}</Muted>
      </Section>

      <Section title="Hours" hint={canPay ? "pay through the date above, then mark it" : "Jennifer marks these paid"}>
        {clockers.map((x) => {
          const mine = sessions.filter((s) => s.who === x.short);
          const unpaid = mine.filter((s) => !s.paid);
          const unpaidMin = unpaid.reduce((a, s) => a + s.minutes, 0);
          const paidMin = mine.filter((s) => s.paid).reduce((a, s) => a + s.minutes, 0);
          const dueMin = unpaid.filter((s) => s.start <= cutoff).reduce((a, s) => a + s.minutes, 0);
          const due = (dueMin / 60) * x.rate;
          const showing = open[x.short];
          return (
            <Card key={x.short} accent={x.color}>
              <Row><H3 style={{ flex: 1, fontSize: 18 }}>{x.name}</H3><P style={{ fontFamily: F.mono, fontSize: 18 }}>{money((unpaidMin / 60) * x.rate)}</P></Row>
              <Muted>owed for {fmtH(unpaidMin)} hrs{x.rate ? ` at ${money(x.rate)}/hr` : ""} · {fmtH(paidMin)} hrs already paid</Muted>
              {!x.rate && <Muted>No hourly rate set for {x.name} yet.</Muted>}
              {canPay && (
                <Btn small kind="primary" disabled={dueMin === 0} title={`Paid ${money(due)} through ${short(through)}`} onPress={async () => {
                  if (!(await confirm(`Paid ${x.name} ${money(due)}?`, `${fmtH(dueMin)} hrs through ${through}`, "Paid"))) return;
                  const n = await markPaid({ who: x.short, through });
                  setMsg(`Paid ${x.name} ${money(due)}. Marked ${n} entr${n === 1 ? "y" : "ies"} paid.`);
                }} />
              )}
              {unpaid.length > 0 && <Btn small kind="quiet" title={`${showing ? "Hide" : "Show"} ${unpaid.length} unpaid entr${unpaid.length === 1 ? "y" : "ies"}`} onPress={() => setOpen((o) => ({ ...o, [x.short]: !showing }))} />}
              {showing && unpaid.map((s) => (
                <Row key={s._id}>
                  <Muted style={{ flex: 1 }}>{fmtDate(s.start)} · {s.phase}{s.note ? ` · ${s.note}` : ""}</Muted>
                  <Muted style={{ fontFamily: F.mono4 }}>{fmtClock(s.minutes)}{x.rate ? ` · ${money((s.minutes / 60) * x.rate)}` : ""}</Muted>
                </Row>
              ))}
              {unpaid.length === 0 && <Muted>Nothing outstanding.</Muted>}
            </Card>
          );
        })}
      </Section>

      <Section title="Cash reimbursements" hint={canPay ? "pay a line or the whole list, then clear it" : "Jennifer clears these when she pays"}>
        {owedTo.map((x) => {
          const rows = receipts.filter((r) => r.who === x.short && !r.reimbursed).sort((a, b) => a.date.localeCompare(b.date));
          const total = rows.reduce((a, r) => a + r.total, 0);
          const last = receipts.filter((r) => r.who === x.short && r.reimbursed && r.reimbursedAt).sort((a, b) => (b.reimbursedAt ?? 0) - (a.reimbursedAt ?? 0))[0];
          return (
            <Card key={x.short} accent={x.color}>
              <Row><H3 style={{ flex: 1, fontSize: 18 }}>{x.name}</H3><P style={{ fontFamily: F.mono, fontSize: 18 }}>{money(total)}</P></Row>
              <Muted>{rows.length === 0 ? "nothing owed" : `owed on ${rows.length} receipt${rows.length === 1 ? "" : "s"}`}{last?.reimbursedAt ? ` · last paid ${fmtDate(last.reimbursedAt)}` : ""}</Muted>
              {rows.map((r) => (
                <Row key={r._id}>
                  <Muted style={{ flex: 1 }}>{short(r.date)} · {r.vendor || "—"}{r.note ? ` · ${r.note}` : ""}</Muted>
                  <Muted style={{ fontFamily: F.mono4 }}>{money(r.total)}</Muted>
                  {canPay && <Btn small kind="quiet" title="Paid" onPress={() => run(setReimbursed({ id: r._id, reimbursed: true }))} />}
                </Row>
              ))}
              {canPay && rows.length > 0 && (
                <Btn small kind="primary" title={`Paid ${x.name} ${money(total)}, clear it`} onPress={async () => {
                  if (!(await confirm(`Paid ${x.name} ${money(total)}?`, `For ${rows.length} receipt${rows.length === 1 ? "" : "s"}. This clears the list.`, "Paid"))) return;
                  const n = await reimburseAll({ who: x.short });
                  setMsg(`Paid ${x.name} ${money(total)}. Cleared ${n} receipt${n === 1 ? "" : "s"}.`);
                }} />
              )}
            </Card>
          );
        })}
      </Section>

      {(canPay || openPayments.length > 0) && (
        <Section title="Payments" hint="money handed over before a full settle-up">
          {canPay && (
            <Card style={{ gap: 10 }}>
              <Chips label="Paid to" value={payWho} onChange={(v) => setPay((p) => ({ ...p, who: v }))} options={payable.map((x) => [x.short, x.name] as const)} />
              <Row gap={10}>
                <Field label="Amount" value={pay.amount} onChangeText={(v) => setPay((p) => ({ ...p, amount: v }))} placeholder="500" keyboardType="decimal-pad" />
                <Field label="Note" value={pay.note} onChangeText={(v) => setPay((p) => ({ ...p, note: v }))} placeholder="check #, Venmo" />
              </Row>
              <DateField label="Date" value={pay.date} onChange={(v) => setPay((p) => ({ ...p, date: v }))} />
              <Btn title="Record payment" kind="primary" onPress={recordPayment} />
            </Card>
          )}
          {openPayments.length === 0 && <Empty>No open payments.</Empty>}
          {openPayments.map((p) => (
            <Card key={p._id} style={{ paddingVertical: 10 }}>
              <Row>
                <P style={{ flex: 1 }}>{nameOf(p.who)} got {money(p.amount)}{p.note ? <Muted> · {p.note}</Muted> : null}</P>
                <Muted>{short(p.date)}</Muted>
                {canPay && <Btn small kind="quiet" title="✕" onPress={async () => { if (await confirm(`Remove the ${money(p.amount)} payment to ${nameOf(p.who)}?`, "", "Remove", true)) run(removePayment({ id: p._id })); }} />}
              </Row>
            </Card>
          ))}
          {settledPayments.length > 0 && <Btn small kind="quiet" title={`${showSettled ? "Hide" : "Show"} settled payments (${settledPayments.length})`} onPress={() => setShowSettled((s) => !s)} />}
          {showSettled && (
            <Card style={{ gap: 6 }}>
              {settledPayments.map((p, i) => (
                <View key={p._id} style={{ gap: 6 }}>
                  {i > 0 && <Divider />}
                  <Row><P style={{ flex: 1 }}>{nameOf(p.who)} got {money(p.amount)}</P><Muted>{short(p.date)}</Muted></Row>
                </View>
              ))}
            </Card>
          )}
        </Section>
      )}
    </Screen>
  );
}
