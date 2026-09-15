import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** One-time seed. Safe to re-run: skips tables that already have rows. */
export const run = internalMutation({
  args: { crew: v.array(v.object({ email: v.string(), name: v.string(), short: v.string(), color: v.string(), canClock: v.boolean(), canPay: v.boolean(), order: v.number() })) },
  handler: async (ctx, { crew }) => {
    const report: Record<string, number> = {};
    if (!(await ctx.db.query("crew").first())) {
      for (const c of crew) await ctx.db.insert("crew", { ...c, email: c.email.toLowerCase() });
      report.crew = crew.length;
    }
    if (!(await ctx.db.query("phases").first())) {
      const phases = [
        ["teardown", "Teardown", "done", 100, "Stripped to a shell years ago and put in primer."],
        ["rust", "Rust Repair", "active", 5, "Floors, trunk, rails. Cut it out, weld it in."],
        ["por15", "POR-15", "up-next", 0, "Underside and interior sealed for good."],
        ["rearend", "Rear End", "up-next", 0, "Assembled rear end goes back under the car."],
        ["frontclip", "Front Clip", "up-next", 0, "Subframe bolted up. Wheels on. Off the stands."],
        ["drivetrain", "Drivetrain", "later", 0, "Engine, trans, fuel, brakes, wiring."],
        ["body", "Body & Paint", "later", 0, "Panels hung, gaps set, color laid down."],
        ["interior", "Interior", "later", 0, "Seats, dash, glass, the finishing touches."],
        ["firstdrive", "First Drive", "later", 0, "February 14, 2027. Keys to Joe."],
      ] as const;
      let i = 0;
      for (const [key, name, status, pct, blurb] of phases) await ctx.db.insert("phases", { key, name, status, pct, blurb, order: i++ });
      report.phases = phases.length;
    }
    if (!(await ctx.db.query("tasks").first())) {
      const t: [string, string, string?][] = [
        ["Rust Repair", "Walk the shell and mark every rust spot with tape"],
        ["Rust Repair", "Cut out rotted floor pan sections"],
        ["Rust Repair", "Fab and weld in floor patches"],
        ["Rust Repair", "Trunk floor and drop-offs"],
        ["Rust Repair", "Frame rails and subframe mounts checked and repaired"],
        ["Rust Repair", "Grind welds, seam seal"],
        ["POR-15", "Wire wheel and degrease underside"],
        ["POR-15", "Metal Prep etch, rinse, dry"],
        ["POR-15", "POR-15 underside, coat 1"],
        ["POR-15", "POR-15 underside, coat 2"],
        ["POR-15", "POR-15 interior floor and trunk"],
        ["Rear End", "Inspect leaf springs, shackles, bushings"],
        ["Rear End", "Bolt up assembled rear end"],
        ["Rear End", "Shocks and brake lines hung"],
        ["Front Clip", "New subframe body bushings"],
        ["Front Clip", "Bolt front clip to body, torque bushing bolts"],
        ["Front Clip", "Wheels and tires on, off the jack stands", "Rolling chassis milestone"],
      ];
      const counts: Record<string, number> = {};
      for (const [phase, title, note] of t) {
        counts[phase] = (counts[phase] ?? 0) + 1;
        await ctx.db.insert("tasks", { phase, title, status: "todo", order: counts[phase], note });
      }
      report.tasks = t.length;
    }
    if (!(await ctx.db.query("parts").first())) {
      const now = Date.now();
      const parts: [string, string, "need" | "ordered" | "received" | "installed", string][] = [
        ["POR-15 Rust Preventive Coating, black", "POR-15", "ordered", "gallon should cover underside plus interior"],
        ["POR-15 Cleaner Degreaser", "POR-15", "need", ""],
        ["POR-15 Metal Prep", "POR-15", "need", ""],
        ["Sheet steel for patch panels, 18 ga", "Rust Repair", "need", "size after marking rust"],
        ["Weld-through primer", "Rust Repair", "need", ""],
        ["Subframe body bushing kit", "Front Clip", "need", "confirm year for correct kit"],
        ["Floor pans", "Rust Repair", "received", "picked up Sept 14"],
      ];
      for (const [name, phase, status, note] of parts) await ctx.db.insert("parts", { name, phase, qty: 1, vendor: "", cost: 0, pn: "", eta: "", status, note, updated: now });
      report.parts = parts.length;
    }
    if (!(await ctx.db.query("sessions").first())) {
      await ctx.db.insert("sessions", {
        who: "steve", phase: "Other", note: "Moved the car into position, laid out pieces and parts",
        start: 1757865600000, end: 1757876400000, minutes: 180, manual: true, paid: false,
      });
      report.sessions = 1;
    }
    return report;
  },
});

export const upsertPost = internalMutation({
  args: {
    slug: v.string(), title: v.string(), date: v.string(), phase: v.string(), summary: v.string(), body: v.string(),
    photos: v.array(v.object({ url: v.string(), caption: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("posts").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    const now = Date.now();
    if (existing) { await ctx.db.patch(existing._id, { ...args, updatedAt: now }); return existing._id; }
    return await ctx.db.insert("posts", { ...args, published: true, createdAt: now, updatedAt: now });
  },
});
