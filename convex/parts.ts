import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCrew } from "./lib";

// hot = needed now, need = on the list, hold = parked (keeps the research, drops out of totals and the public page)
const status = v.union(v.literal("hot"), v.literal("need"), v.literal("ordered"), v.literal("received"), v.literal("installed"), v.literal("hold"));
const fields = {
  name: v.string(), phase: v.string(), qty: v.number(), vendor: v.string(), cost: v.number(),
  pn: v.string(), eta: v.string(), status, note: v.string(),
  public: v.optional(v.boolean()),
};

/** How a sponsor asked to be shown. */
export function sponsorLabel(s: { name: string; company?: string; credit: "name" | "company" | "anon" }) {
  if (s.credit === "anon") return "a friend of the family";
  if (s.credit === "company" && s.company) return s.company;
  return s.name;
}

/** Public: the parts the crew chose to list, with sponsor credit but no email or notes. */
export const publicList = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("parts").collect();
    const out = [];
    for (const p of all) {
      if (!p.public || p.status === "hold") continue;
      const pending = p.sponsor ? false : !!(await ctx.db.query("pledges").withIndex("by_part", (q) => q.eq("partId", p._id)).filter((q) => q.eq(q.field("status"), "new")).first());
      out.push({ _id: p._id, name: p.name, phase: p.phase, qty: p.qty, cost: p.cost, vendor: p.vendor, pn: p.pn, status: p.status, sponsor: p.sponsor ? sponsorLabel(p.sponsor) : null, pending });
    }
    return out;
  },
});

export const setPublic = mutation({
  args: { id: v.id("parts"), public: v.boolean() },
  handler: async (ctx, { id, public: pub }) => {
    await requireCrew(ctx);
    await ctx.db.patch(id, { public: pub, updated: Date.now() });
  },
});

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
    // Tap-to-advance walks the buying workflow. Hot behaves like need; hold comes back to need.
    const next = p.status === "hot" ? "ordered" : p.status === "hold" ? "need" : p.status === "need" ? "ordered" : p.status === "ordered" ? "received" : p.status === "received" ? "installed" : "need";
    await ctx.db.patch(id, { status: next, updated: Date.now() });
  },
});

export const setStatus = mutation({
  args: { id: v.id("parts"), status },
  handler: async (ctx, { id, status: s }) => {
    await requireCrew(ctx);
    await ctx.db.patch(id, { status: s, updated: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("parts") },
  handler: async (ctx, { id }) => {
    await requireCrew(ctx);
    await ctx.db.delete(id);
  },
});

/** Admin knobs for the CLI. adminUpsert matches on name so re-running doesn't duplicate rows.
 *  npx convex run --prod parts:adminList
 *  npx convex run --prod parts:adminUpsert '{"rows":[{"name":"...","phase":"front","qty":2,"vendor":"Rock Auto","cost":21.79,"pn":"Moog K5208","eta":"","status":"need","note":""}]}'
 */
export const adminList = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("parts").collect(),
});

export const adminUpsert = internalMutation({
  args: { rows: v.array(v.object(fields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("parts").collect();
    const out: string[] = [];
    for (const r of rows) {
      const name = r.name.trim();
      const hit = existing.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (hit) { await ctx.db.patch(hit._id, { ...r, name, updated: Date.now() }); out.push("updated " + name); }
      else { await ctx.db.insert("parts", { ...r, name, updated: Date.now() }); out.push("added " + name); }
    }
    return out;
  },
});
