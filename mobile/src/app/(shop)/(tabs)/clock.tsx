import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api } from "@convex/_generated/api";
import { useM, useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { errText, fmtClock, fmtDate, fmtH, fmtTime, todayIso } from "@/lib/format";
import { SHOP_PHASES } from "@/lib/site";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Chips, DateField, Empty, Field, Label, Loading, Msg, Muted, P, Row, Screen, Section, Sheet, Stat } from "@/components/ui";

const AGO = [[0, "Just now"], [15, "15 min ago"], [30, "30 min ago"], [45, "45 min ago"], [60, "1 hr ago"], [90, "1.5 hr ago"], [120, "2 hr ago"], [180, "3 hr ago"], [240, "4 hr ago"]] as const;
const phaseOpts = SHOP_PHASES.map((p) => [p, p] as const);
const buzz = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export default function Clock() {
  const c = useColors();
  const board = useQ(api.clock.board);
  const punchIn = useM(api.clock.punchIn);
  const punchOut = useM(api.clock.punchOut);
  const adjustStart = useM(api.clock.adjustStart);
  const addManual = useM(api.clock.addManual);
  const remove = useM(api.clock.remove);
  const [phase, setPhase] = useState(SHOP_PHASES[0]);
  const [note, setNote] = useState("");
  const [ago, setAgo] = useState<number>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);

  const [manual, setManual] = useState(false);
  const [mWho, setMWho] = useState("");
  const [mDate, setMDate] = useState(todayIso());
  const [mHrs, setMHrs] = useState("");
  const [mPhase, setMPhase] = useState(SHOP_PHASES[0]);
  const [mNote, setMNote] = useState("");

  if (!board) return <Loading text="Loading the clock…" />;
  const { crew, active, sessions } = board;
  const clockers = crew.filter((x) => x.canClock);
  const byWho = Object.fromEntries(crew.map((x) => [x.short, x]));
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = sessions.filter((s) => s.start >= weekAgo).reduce((a, s) => a + s.minutes, 0);
  const unpaid = sessions.filter((s) => !s.paid).reduce((a, s) => a + s.minutes, 0);
  const byPhase: Record<string, number> = {};
  for (const s of sessions) byPhase[s.phase] = (byPhase[s.phase] ?? 0) + s.minutes;
  const who = mWho || clockers[0]?.short || "";

  async function punch(short: string) {
    setBusy(short); setMsg("");
    try {
      if (active.some((a) => a.who === short)) await punchOut({ who: short });
      else { await punchIn({ who: short, phase, note: note.trim(), startedAgoMinutes: ago }); setAgo(0); }
      buzz();
    } catch (e) { setMsg(errText(e)); }
    finally { setBusy(null); }
  }

  async function submitManual() {
    const hours = parseFloat(mHrs);
    if (!(hours > 0)) return setMsg("Hours must be more than zero.");
    const whos = who === "both" ? clockers.map((x) => x.short) : [who];
    try {
      for (const w of whos) await addManual({ who: w, date: mDate, hours, phase: mPhase, note: mNote.trim() });
      setMsg(`Added ${hours} hr${hours === 1 ? "" : "s"} for ${who === "both" ? "both" : byWho[who]?.name ?? who}.`);
      setMHrs(""); setMNote(""); setManual(false); buzz();
    } catch (e) { setMsg(errText(e)); }
  }

  return (
    <Screen>
      <Row wrap gap={10}>
        <Stat label="Hours on the car" value={fmtH(total)} unit="hrs" foot={`last 7 days: ${fmtH(week)} hrs`} tone="hot" />
        <Stat label="Unpaid hours" value={fmtH(unpaid)} unit="hrs" foot="Jennifer marks these paid" />
      </Row>

      <Section title="Punch" hint="pick what you’re working on, then tap your name">
        <Chips label="Working on" options={phaseOpts} value={phase} onChange={setPhase} />
        <Field label="Note" hint="(optional)" value={note} onChangeText={setNote} placeholder="e.g. driver floor pan" />
        <Chips label="Forgot to clock in?" options={AGO} value={ago} onChange={setAgo} />
        <Msg text={msg} />
        {clockers.map((x) => {
          const a = active.find((y) => y.who === x.short);
          const elapsed = a ? Math.floor((Date.now() - a.start) / 60000) : 0;
          const mine = sessions.filter((s) => s.who === x.short).reduce((t, s) => t + s.minutes, 0);
          return (
            <Pressable key={x.short} onPress={() => punch(x.short)} disabled={busy === x.short} accessibilityRole="button" accessibilityLabel={`${a ? "Clock out" : "Clock in"} ${x.name}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: busy === x.short ? 0.6 : 1 })}>
              <View style={{ borderWidth: 2, borderColor: a ? x.color : c.line, backgroundColor: a ? c.surface : c.surface2, borderRadius: 10, padding: 16, gap: 6 }}>
                <Row>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: x.color }} />
                  <Text style={{ flex: 1, fontFamily: F.cond, fontSize: 28, textTransform: "uppercase", color: c.ink }}>{x.name}</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 24, color: c.ink }}>{fmtClock(elapsed)}</Text>
                </Row>
                <Label>{a ? `On the clock · ${a.phase} · since ${fmtTime(a.start)}` : `Off the clock · ${fmtH(mine)} hrs logged`}</Label>
                <View style={{ backgroundColor: a ? c.critSolid : c.goodSolid, borderRadius: 6, paddingVertical: 12, alignItems: "center", marginTop: 4 }}>
                  <Text style={{ fontFamily: F.sans7, fontSize: 16, color: "#fff" }}>{a ? "Clock out" : "Clock in"}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {active.map((a) => (
          <Card key={a._id} accent={byWho[a.who]?.color}>
            <P>{byWho[a.who]?.name ?? a.who} punched in late? Slide the start back.</P>
            <Row wrap>
              {[15, 30, 60, 120].map((m) => (
                <Btn key={m} small title={`−${m < 60 ? m + " min" : m / 60 + " hr"}`} onPress={() => adjustStart({ who: a.who, backMinutes: m }).catch((e) => setMsg(errText(e)))} />
              ))}
            </Row>
          </Card>
        ))}
        <Btn title="Add hours by hand" onPress={() => setManual(true)} />
      </Section>

      {Object.keys(byPhase).length > 0 && (
        <Section title="Hours by phase">
          <Card style={{ gap: 6 }}>
            {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([p, m]) => (
              <Row key={p}><P style={{ flex: 1 }}>{p}</P><P style={{ fontFamily: F.mono }}>{fmtH(m)} hrs</P></Row>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Time log" hint="unpaid entries can be deleted">
        {sessions.length === 0 && <Empty>No time logged yet. Clock in when you hit the shop.</Empty>}
        {sessions.slice(0, 60).map((s) => (
          <Card key={s._id} accent={byWho[s.who]?.color ?? c.muted} style={{ paddingVertical: 10 }}>
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <P style={{ fontFamily: F.sans6 }}>{byWho[s.who]?.name ?? s.who} · {s.phase}</P>
                <Muted>{fmtDate(s.start)}{s.manual ? " · by hand" : ""}{s.note ? ` · ${s.note}` : ""}{s.paid ? " · paid" : ""}</Muted>
              </View>
              <P style={{ fontFamily: F.mono }}>{fmtClock(s.minutes)}</P>
              {!s.paid && (
                <Btn small kind="quiet" title="✕" onPress={async () => { if (await confirm("Delete this time entry?", `${fmtClock(s.minutes)} on ${fmtDate(s.start)}`, "Delete", true)) remove({ id: s._id }).catch((e) => setMsg(errText(e))); }} />
              )}
            </Row>
          </Card>
        ))}
      </Section>

      <Sheet visible={manual} onClose={() => setManual(false)} title="Add hours by hand">
        <Chips label="Who" value={who} onChange={setMWho} options={[...clockers.map((x) => [x.short, x.name] as const), ["both", "Both"] as const]} />
        <DateField label="Date" value={mDate} onChange={setMDate} />
        <Field label="Hours" value={mHrs} onChangeText={setMHrs} placeholder="2.5" keyboardType="decimal-pad" />
        <Chips label="Phase" options={phaseOpts} value={mPhase} onChange={setMPhase} />
        <Field label="Note" value={mNote} onChangeText={setMNote} placeholder="what got done" />
        <Btn title="Add" kind="primary" onPress={submitManual} />
      </Sheet>
    </Screen>
  );
}
