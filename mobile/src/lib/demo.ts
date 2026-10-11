// Sample data for demo mode (see useQ in ./data.ts). Typed against the real Convex functions,
// so a schema change that breaks a screen breaks the typecheck here too. Dev builds only.
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import type { Id, TableNames } from "@convex/_generated/dataModel";
import { isoOf } from "./format";

type R<K extends keyof typeof fixtures> = (typeof fixtures)[K];
const now = Date.now();
const day = (n: number) => now - n * 24 * 3600000;
const iso = (t: number) => isoOf(new Date(t));
const id = <T extends TableNames>(_table: T, s: string) => s as Id<T>;

const crewDocs = [
  { _id: id("crew", "c1"), _creationTime: 0, email: "steve@example.com", name: "Steve", short: "steve", color: "#2B5FAA", canClock: true, canPay: false, rate: 30, order: 1 },
  { _id: id("crew", "c2"), _creationTime: 0, email: "nick@example.com", name: "Nick", short: "nick", color: "#2E7D4F", canClock: true, canPay: false, rate: 25, order: 2 },
  { _id: id("crew", "c3"), _creationTime: 0, email: "jen@example.com", name: "Jennifer", short: "jen", color: "#B5432A", canClock: false, canPay: true, order: 3 },
];

const session = (n: number, who: string, phase: string, note: string, ago: number, minutes: number, paid = false) => ({
  _id: id("sessions", "s" + n), _creationTime: 0, who, phase, note, start: day(ago), end: day(ago) + minutes * 60000, minutes, manual: false, paid,
});

const fixtures = {
  "crew:list": crewDocs.map(({ email: _e, ...rest }) => rest) satisfies FunctionReturnType<typeof api.crew.list>,
  "clock:board": {
    me: { short: "steve", canClock: true, canPay: false, name: "Steve" },
    crew: crewDocs.map((c) => ({ short: c.short, name: c.name, color: c.color, canClock: c.canClock, canPay: c.canPay, rate: c.rate ?? 0 })),
    active: [{ _id: id("active", "a1"), _creationTime: 0, who: "nick", start: now - 95 * 60000, phase: "POR-15", note: "trunk floor" }],
    sessions: [
      session(1, "steve", "Rust Repair", "driver floor pan", 0.2, 185),
      session(2, "nick", "Rust Repair", "trunk drop-offs", 1, 240),
      session(3, "steve", "Front Clip", "subframe bushings", 2, 150),
      session(4, "nick", "POR-15", "", 3, 120),
      session(5, "steve", "Rust Repair", "cut out floors", 6, 300, true),
      session(6, "nick", "Rust Repair", "", 6, 280, true),
    ],
  } satisfies FunctionReturnType<typeof api.clock.board>,
  "jobs:list": [
    { _id: id("jobs", "j1"), _creationTime: 0, title: "Second coat of POR-15 on the trunk floor", where: "trunk", phase: "POR-15", priority: "now" as const, time: "1 hr", needs: "POR-15 quart, black (paint cabinet, top shelf)\nChip brushes (drawer under the bench)\nNitrile gloves", steps: "First coat should be tacky, not wet\nThin coat, don't glob it\nPour leftovers out, never back in the can", status: "open" as const, addedBy: "steve", createdAt: day(1), updatedAt: day(1) },
    { _id: id("jobs", "j2"), _creationTime: 0, title: "Weld in passenger floor patch", where: "passenger floor", phase: "Rust Repair", priority: "now" as const, time: "half a day", needs: "MIG welder, .023 wire\nPatch panel (on the cart)", steps: "Tack in four corners\nStitch weld, alternate sides so it doesn't warp\nGrind flush", status: "claimed" as const, claimedBy: "nick", claimedAt: day(0.1), addedBy: "steve", createdAt: day(2), updatedAt: day(0.1) },
    { _id: id("jobs", "j3"), _creationTime: 0, title: "Bag and tag the door hardware", where: "bench", phase: "Other", priority: "whenever" as const, time: "1 hr", needs: "Zip bags and a Sharpie (bench drawer)", steps: "", status: "open" as const, addedBy: "jen", createdAt: day(3), updatedAt: day(3) },
    { _id: id("jobs", "j4"), _creationTime: 0, title: "Wire-wheel the rear frame rails", where: "under the car", phase: "Rust Repair", priority: "soon" as const, time: "2 hrs", needs: "", steps: "", status: "done" as const, doneBy: "steve", doneAt: day(1), result: "Driver side has a soft spot near the shackle, marked with tape", addedBy: "steve", createdAt: day(5), updatedAt: day(1) },
  ] satisfies FunctionReturnType<typeof api.jobs.list>,
  "tasks:list": [
    { _id: id("tasks", "t1"), _creationTime: 0, phase: "Rust Repair", title: "Cut out rotted floor pan sections", status: "done" as const, order: 1, doneAt: day(5) },
    { _id: id("tasks", "t2"), _creationTime: 0, phase: "Rust Repair", title: "Fab and weld in floor patches", status: "doing" as const, order: 2 },
    { _id: id("tasks", "t3"), _creationTime: 0, phase: "Rust Repair", title: "Trunk floor and drop-offs", status: "todo" as const, order: 3 },
    { _id: id("tasks", "t4"), _creationTime: 0, phase: "POR-15", title: "Wire wheel and degrease underside", status: "todo" as const, order: 1 },
    { _id: id("tasks", "t5"), _creationTime: 0, phase: "Front Clip", title: "Wheels and tires on, off the jack stands", status: "todo" as const, order: 1, note: "Rolling chassis milestone" },
  ] satisfies FunctionReturnType<typeof api.tasks.list>,
  "parts:list": [
    { _id: id("parts", "p1"), _creationTime: 0, name: "Upper ball joints", phase: "Front Clip", qty: 2, vendor: "Rock Auto", cost: 21.79, pn: "Moog K5208", eta: "", status: "hot" as const, note: "", updated: day(1), public: true },
    { _id: id("parts", "p2"), _creationTime: 0, name: "POR-15 Rust Preventive, black, quart", phase: "POR-15", qty: 1, vendor: "Summit", cost: 54.99, pn: "", eta: iso(day(-3)), status: "ordered" as const, note: "", updated: day(2) },
    { _id: id("parts", "p3"), _creationTime: 0, name: "Subframe body bushing kit", phase: "Front Clip", qty: 1, vendor: "NPD", cost: 89.95, pn: "", eta: "", status: "need" as const, note: "", updated: day(3), public: true, sponsor: { name: "Pat Smith", credit: "name" as const } },
    { _id: id("parts", "p4"), _creationTime: 0, name: "Trunk floor pan", phase: "Rust Repair", qty: 1, vendor: "LMC", cost: 189, pn: "", eta: "", status: "installed" as const, note: "", updated: day(6) },
    { _id: id("parts", "p5"), _creationTime: 0, name: "Shaker hood scoop", phase: "Body & Paint", qty: 1, vendor: "", cost: 450, pn: "", eta: "", status: "hold" as const, note: "keep the research, later", updated: day(9) },
  ] satisfies FunctionReturnType<typeof api.parts.list>,
  "pledges:list": [
    { _id: id("pledges", "pl1"), _creationTime: 0, partId: id("parts", "p1"), partName: "Upper ball joints", name: "Sam Rivera", email: "sam@example.com", credit: "name" as const, how: "cost" as const, message: "Happy birthday, Joe!", status: "new" as const, createdAt: day(0.5) },
  ] satisfies FunctionReturnType<typeof api.pledges.list>,
  "receipts:list": [
    { _id: id("receipts", "r1"), _creationTime: 0, who: "steve", date: iso(day(1)), vendor: "Lowe's", total: 64.12, phase: "rust", note: "flap discs, cutoff wheels", reimbursed: false, createdAt: day(1), url: null },
    { _id: id("receipts", "r2"), _creationTime: 0, who: "jen", date: iso(day(4)), vendor: "Rock Auto", total: 212.4, phase: "frontclip", note: "ball joints, tie rod ends", reimbursed: true, reimbursedAt: day(4), createdAt: day(4), url: null },
    { _id: id("receipts", "r3"), _creationTime: 0, who: "nick", date: iso(day(8)), vendor: "Harbor Freight", total: 38.5, phase: "por15", note: "wire wheels", reimbursed: true, reimbursedAt: day(2), createdAt: day(8), url: null },
  ] satisfies FunctionReturnType<typeof api.receipts.list>,
  "payments:list": [
    { _id: id("payments", "pm1"), _creationTime: 0, who: "steve", amount: 200, date: iso(day(2)), note: "Venmo", by: "jen", applied: false, createdAt: day(2) },
  ] satisfies FunctionReturnType<typeof api.payments.list>,
  "posts:all": [
    { _id: id("posts", "po1"), _creationTime: 0, slug: "demo-floors-are-out", title: "Floors are out", date: iso(day(3)), phase: "rust", summary: "Both floor pans cut out, trunk next.", body: "Cut both floors out today.\n\n- Driver side was worse than it looked\n- Trunk drop-offs are next", photos: [], published: true, createdAt: day(3), updatedAt: day(3) },
    { _id: id("posts", "po2"), _creationTime: 0, slug: "demo-draft", title: "POR-15, coat one", date: iso(day(0)), phase: "por15", summary: "", body: "", photos: [], published: false, createdAt: day(0), updatedAt: day(0) },
  ] satisfies FunctionReturnType<typeof api.posts.all>,
};

function me(as: "steve" | "jen"): FunctionReturnType<typeof api.crew.me> {
  const crew = crewDocs.find((c) => c.short === as)!;
  return { signedIn: true, email: crew.email, crew };
}

export function demoQuery(name: string, as: "steve" | "jen"): unknown {
  if (name === "crew:me") return me(as);
  if (name === "clock:board") {
    const b: R<"clock:board"> = fixtures["clock:board"];
    const c = crewDocs.find((x) => x.short === as)!;
    return { ...b, me: { short: c.short, canClock: c.canClock, canPay: c.canPay, name: c.name } };
  }
  return name in fixtures ? fixtures[name as keyof typeof fixtures] : undefined;
}

export function demoWrite(name: string) {
  console.log(`[demo] ${name} skipped: demo mode doesn't write`);
  return 0;
}
