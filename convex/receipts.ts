import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

/** Crew: every receipt, newest first, with a signed URL for the scan. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    const rows = await ctx.db.query("receipts").withIndex("by_date").order("desc").collect();
    return await Promise.all(rows.map(async (r) => ({ ...r, url: await ctx.storage.getUrl(r.storageId) })));
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
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("pdf")),
  },
  handler: async (ctx, args) => {
    await requireCrew(ctx);
    if (!(args.total > 0)) throw new Error("Total must be more than zero");
    return await ctx.db.insert("receipts", { ...args, vendor: args.vendor.trim(), note: args.note.trim(), reimbursed: false, createdAt: Date.now() });
  },
});

/** Anyone on the crew can pull a receipt back as long as it hasn't been reimbursed. */
export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const r = await ctx.db.get(id);
    if (!r) return;
    if (r.reimbursed) throw new Error("Already reimbursed; can't delete");
    await ctx.storage.delete(r.storageId);
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
