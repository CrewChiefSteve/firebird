import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

/** Crew: every ledger row, newest first, with a signed URL for the scan when there is one. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    const rows = await ctx.db.query("receipts").withIndex("by_date").order("desc").collect();
    return await Promise.all(rows.map(async (r) => ({ ...r, url: r.storageId ? await ctx.storage.getUrl(r.storageId) : null })));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    who: v.string(),
    date: v.string(),
    vendor: v.string(),
    total: v.number(),
    phase: v.string(),
    note: v.string(),
    storageId: v.optional(v.id("_storage")),
    kind: v.optional(v.union(v.literal("image"), v.literal("pdf"))),
  },
  handler: async (ctx, args) => {
    await requireCrew(ctx);
    if (!(args.total > 0)) throw new Error("Total must be more than zero");
    // Money the payer spent herself is not owed to anyone, so it enters the book already settled.
    const payer = await ctx.db.query("crew").withIndex("by_short", (q) => q.eq("short", args.who)).unique();
    const settled = !!payer?.canPay;
    const now = Date.now();
    return await ctx.db.insert("receipts", {
      ...args, vendor: args.vendor.trim(), note: args.note.trim(),
      reimbursed: settled, ...(settled ? { reimbursedAt: now } : {}), createdAt: now,
    });
  },
});

/** Crew can delete an unreimbursed row; the payer can delete anything (her own rows enter as settled). */
export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, { id }) => {
    const me = await requireCrew(ctx);
    const r = await ctx.db.get(id);
    if (!r) return;
    if (r.reimbursed && !me.canPay) throw new Error("Already reimbursed; ask Jennifer to remove it");
    if (r.storageId) await ctx.storage.delete(r.storageId);
    await ctx.db.delete(id);
  },
});

/** Payer only: flip one receipt to reimbursed (or back, if it was a mistake). */
export const setReimbursed = mutation({
  args: { id: v.id("receipts"), reimbursed: v.boolean() },
  handler: async (ctx, { id, reimbursed }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can mark receipts reimbursed");
    await ctx.db.patch(id, { reimbursed, reimbursedAt: reimbursed ? Date.now() : undefined });
  },
});

/** Payer only: reimburse everything one person has outstanding. Returns the count. */
export const reimburseAll = mutation({
  args: { who: v.string() },
  handler: async (ctx, { who }) => {
    const me = await requireCrew(ctx);
    if (!me.canPay) throw new Error("Only the payer can mark receipts reimbursed");
    const rows = await ctx.db.query("receipts").withIndex("by_who", (q) => q.eq("who", who)).collect();
    const now = Date.now();
    let n = 0;
    for (const r of rows) if (!r.reimbursed) { await ctx.db.patch(r._id, { reimbursed: true, reimbursedAt: now }); n++; }
    return n;
  },
});
