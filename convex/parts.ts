import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

const status = v.union(v.literal("need"), v.literal("ordered"), v.literal("received"), v.literal("installed"));
const fields = {
  name: v.string(), phase: v.string(), qty: v.number(), vendor: v.string(), cost: v.number(),
  pn: v.string(), eta: v.string(), status, note: v.string(),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    return await ctx.db.query("parts").collect();
  },
});

export const save = mutation({
  args: { id: v.optional(v.id("parts")), ...fields },
  handler: async (ctx, { id, ...data }) => {
    await requireCrew(ctx);
    const row = { ...data, name: data.name.trim(), updated: Date.now() };
    if (id) { await ctx.db.patch(id, row); return id; }
    return await ctx.db.insert("parts", row);
  },
});

export const advance = mutation({
  args: { id: v.id("parts") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const p = await ctx.db.get(id);
    if (!p) return;
    const order = ["need", "ordered", "received", "installed"] as const;
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    await ctx.db.patch(id, { status: next, updated: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("parts") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    await ctx.db.delete(id);
  },
});
