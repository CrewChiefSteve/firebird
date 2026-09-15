import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    return await ctx.db.query("tasks").collect();
  },
});

export const add = mutation({
  args: { phase: v.string(), title: v.string() },
  handler: async (ctx, { phase, title }) => {
    await requireCrew(ctx);
    const siblings = await ctx.db.query("tasks").withIndex("by_phase", (q) => q.eq("phase", phase)).collect();
    return await ctx.db.insert("tasks", { phase, title: title.trim(), status: "todo", order: siblings.length + 1 });
  },
});

export const cycle = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    const t = await ctx.db.get(id);
    if (!t) return;
    const next = { todo: "doing", doing: "done", done: "todo" }[t.status] as "todo" | "doing" | "done";
    await ctx.db.patch(id, { status: next, doneAt: next === "done" ? Date.now() : undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    await ctx.db.delete(id);
  },
});
