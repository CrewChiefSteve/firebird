import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

export const board = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireCrew(ctx);
    const crew = (await ctx.db.query("crew").collect()).sort((a, b) => a.order - b.order);
    const active = await ctx.db.query("active").collect();
    const sessions = await ctx.db.query("sessions").withIndex("by_start").order("desc").take(500);
    return {
      me: { short: me.short, canClock: me.canClock, canPay: me.canPay, name: me.name },
      crew: crew.map((c) => ({ short: c.short, name: c.name, color: c.color, canClock: c.canClock })),
      active,
      sessions,
    };
  },
});

/** How far back a punch can be backdated: half a day. */
const MAX_BACK_MINUTES = 12 * 60;

export const punchIn = mutation({
  // startedAgoMinutes: "forgot to clock in" — the punch starts this many minutes in the past.
  args: { who: v.string(), phase: v.string(), note: v.string(), startedAgoMinutes: v.optional(v.number()) },
  handler: async (ctx, { who, phase, note, startedAgoMinutes }) => {
    const me = await requireCrew(ctx);
    const target = await ctx.db.query("crew").withIndex("by_short", (q) => q.eq("short", who)).unique();
    if (!target || !target.canClock) throw new Error("That person doesn't clock in");
    // Anyone on the crew can punch anyone who clocks (Steve punches Nick from the shop iPad).
    const existing = await ctx.db.query("active").withIndex("by_who", (q) => q.eq("who", who)).unique();
    if (existing) return existing._id;
    void me;
    const back = Math.min(MAX_BACK_MINUTES, Math.max(0, Math.round(startedAgoMinutes ?? 0)));
    return await ctx.db.insert("active", { who, phase, note, start: Date.now() - back * 60000 });
  },
});

/** Already on the clock but punched late: slide the start time back by `backMinutes`. */
export const adjustStart = mutation({
  args: { who: v.string(), backMinutes: v.number() },
  handler: async (ctx, { who, backMinutes }) => {
    await requireCrew(ctx);
    const a = await ctx.db.query("active").withIndex("by_who", (q) => q.eq("who", who)).unique();
    if (!a) throw new Error("Not on the clock");
    const floor = Date.now() - MAX_BACK_MINUTES * 60000;
    const start = Math.max(floor, a.start - Math.max(0, Math.round(backMinutes)) * 60000);
    await ctx.db.patch(a._id, { start });
    return start;
  },
});

export const punchOut = mutation({
  args: { who: v.string() },
  handler: async (ctx, { who }) => {
    await requireCrew(ctx);
    const a = await ctx.db.query("active").withIndex("by_who", (q) => q.eq("who", who)).unique();
    if (!a) return null;
    const end = Date.now();
    const minutes = Math.max(1, Math.round((end - a.start) / 60000));
    const id = await ctx.db.insert("sessions", {
      who, phase: a.phase, note: a.note, start: a.start, end, minutes, manual: false, paid: false,
    });
    await ctx.db.delete(a._id);
    return id;
  },
});

export const addManual = mutation({
  args: { who: v.string(), date: v.string(), hours: v.number(), phase: v.string(), note: v.string() },
  handler: async (ctx, { who, date, hours, phase, note }) => {
    await requireCrew(ctx);
    if (!(hours > 0)) throw new Error("Hours must be positive");
    const [y, m, d] = date.split("-").map(Number);
    const start = new Date(y, m - 1, d, 12, 0, 0).getTime();
    return await ctx.db.insert("sessions", {
      who, phase, note, start, end: start + hours * 3600000, minutes: Math.round(hours * 60), manual: true, paid: false,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const s = await ctx.db.get(id);
    if (s?.paid) throw new Error("That entry is already paid");
    await ctx.db.delete(id);
  },
});

/** Mark every unpaid session for `who` that ended on or before `throughDate` as paid. */
export const markPaid = mutation({
  args: { who: v.string(), through: v.string() },
  handler: async (ctx, { who, through }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can mark hours paid");
    const [y, m, d] = through.split("-").map(Number);
    const cutoff = new Date(y, m - 1, d, 23, 59, 59).getTime();
    const rows = await ctx.db.query("sessions").withIndex("by_who", (q) => q.eq("who", who).lte("start", cutoff)).collect();
    const now = Date.now();
    let n = 0;
    for (const r of rows) {
      if (!r.paid) { await ctx.db.patch(r._id, { paid: true, paidAt: now }); n++; }
    }
    return n;
  },
});
