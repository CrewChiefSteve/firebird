import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

/** Every payment on account, newest first. Anyone on the crew can look. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    const rows = await ctx.db.query("payments").collect();
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  },
});

/** Jennifer records money paid toward what someone is owed. */
export const add = mutation({
  args: { who: v.string(), amount: v.number(), date: v.string(), note: v.string() },
  handler: async (ctx, { who, amount, date, note }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can record payments");
    if (!(amount > 0)) throw new Error("Amount has to be more than zero");
    const to = await ctx.db.query("crew").withIndex("by_short", (q) => q.eq("short", who)).unique();
    if (!to) throw new Error(`No crew member ${who}`);
    return await ctx.db.insert("payments", {
      who, amount: Math.round(amount * 100) / 100, date, note: note.trim(), by: me.short, applied: false, createdAt: Date.now(),
    });
  },
});

/** Take back an open payment entered by mistake. Settled ones stay put. */
export const remove = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, { id }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can remove payments");
    const row = await ctx.db.get(id);
    if (row?.applied) throw new Error("That payment is already settled");
    await ctx.db.delete(id);
  },
});

/** Paid in full: mark hours through the date paid, receipts reimbursed, and open payments settled. */
export const settle = mutation({
  args: { who: v.string(), through: v.string() },
  handler: async (ctx, { who, through }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can settle up");
    const [y, m, d] = through.split("-").map(Number);
    const cutoff = new Date(y, m - 1, d, 23, 59, 59).getTime();
    const now = Date.now();
    const sessions = await ctx.db.query("sessions").withIndex("by_who", (q) => q.eq("who", who).lte("start", cutoff)).collect();
    for (const s of sessions) if (!s.paid) await ctx.db.patch(s._id, { paid: true, paidAt: now });
    const receipts = await ctx.db.query("receipts").withIndex("by_who", (q) => q.eq("who", who)).collect();
    for (const r of receipts) if (!r.reimbursed) await ctx.db.patch(r._id, { reimbursed: true, reimbursedAt: now });
    const payments = await ctx.db.query("payments").withIndex("by_who", (q) => q.eq("who", who)).collect();
    for (const p of payments) if (!p.applied) await ctx.db.patch(p._id, { applied: true, appliedAt: now });
  },
});
