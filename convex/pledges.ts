import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireCrew } from "./lib";

const credit = v.union(v.literal("name"), v.literal("company"), v.literal("anon"));
const how = v.union(v.literal("cost"), v.literal("ship"));

/** Public: someone offering to cover a listed part. No sign-in. */
export const submit = mutation({
  args: { partId: v.id("parts"), name: v.string(), email: v.string(), company: v.optional(v.string()), credit, how, message: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 80);
    const email = args.email.trim().toLowerCase().slice(0, 120);
    const company = args.company?.trim().slice(0, 80) || undefined;
    const message = args.message.trim().slice(0, 1000);
    if (name.length < 2) throw new Error("Please give us a name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email doesn't look right.");
    if (args.credit === "company" && !company) throw new Error("Add the company name, or pick a different credit.");
    const part = await ctx.db.get(args.partId);
    if (!part || !part.public) throw new Error("That part isn't listed.");
    if (part.sponsor) throw new Error("Someone already has that one. Pick another, and thank you.");
    const now = Date.now();
    const id = await ctx.db.insert("pledges", { partId: args.partId, partName: part.name, name, email, company, credit: args.credit, how: args.how, message, status: "new", createdAt: now });
    await ctx.scheduler.runAfter(0, internal.pledges.notify, { id });
    return id;
  },
});

/** Crew: every pledge, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrew(ctx);
    const rows = await ctx.db.query("pledges").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Crew: confirm puts the sponsor on the part; decline frees the part back up. */
export const decide = mutation({
  args: { id: v.id("pledges"), action: v.union(v.literal("confirm"), v.literal("decline")) },
  handler: async (ctx, { id, action }) => {
    await requireCrew(ctx);
    const p = await ctx.db.get(id);
    if (!p) return;
    const now = Date.now();
    await ctx.db.patch(id, { status: action === "confirm" ? "confirmed" : "declined", decidedAt: now });
    const part = await ctx.db.get(p.partId);
    if (!part) return;
    if (action === "confirm") {
      await ctx.db.patch(part._id, { sponsor: { name: p.name, company: p.company, credit: p.credit, pledgeId: id }, updated: now });
    } else if (part.sponsor?.pledgeId === id) {
      await ctx.db.patch(part._id, { sponsor: undefined, updated: now });
    }
  },
});

export const get = internalQuery({
  args: { id: v.id("pledges") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

/**
 * Emails Jennifer (and a receipt to the sponsor) through Resend. Needs RESEND_API_KEY on the
 * deployment; without it the pledge still lands on the Parts tab and this just returns "skipped".
 *   npx convex env set --prod RESEND_API_KEY re_...
 *   npx convex env set --prod PLEDGE_FROM "Project Trans Am <pledges@crewchiefsteve.com>"   (a domain verified in Resend)
 *   npx convex env set --prod PLEDGE_TO jencobb@me.com                                       (default)
 */
export const notify = internalAction({
  args: { id: v.id("pledges") },
  handler: async (ctx, { id }) => {
    const p = await ctx.runQuery(internal.pledges.get, { id });
    if (!p) return "no pledge";
    const key = process.env.RESEND_API_KEY;
    if (!key) return "skipped: RESEND_API_KEY not set";
    const to = process.env.PLEDGE_TO ?? "jencobb@me.com";
    const from = process.env.PLEDGE_FROM ?? "Project Trans Am <pledges@crewchiefsteve.com>";
    const site = process.env.SITE_URL ?? "https://firebird.crewchiefsteve.com";
    const howText = p.how === "ship" ? "will buy the part and ship it to the shop" : "wants to cover the cost";
    const creditText = p.credit === "anon" ? "anonymous" : p.credit === "company" ? `as ${p.company}` : `as ${p.name}`;
    const send = (body: object) =>
      fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const r1 = await send({
      from, to: [to], reply_to: p.email,
      subject: `Part pledge: ${p.partName} from ${p.name}`,
      text: [
        `${p.name}${p.company ? ` (${p.company})` : ""} ${howText}: ${p.partName}.`,
        `Credit on the site: ${creditText}.`,
        `Email: ${p.email}`,
        p.message ? `\nTheir note:\n${p.message}` : "",
        `\nConfirm or decline it on the Parts tab: ${site}/shop`,
        `Reply to this email to reach them directly.`,
      ].join("\n"),
    });
    const r2 = await send({
      from, to: [p.email], reply_to: to,
      subject: `Thank you for adopting the ${p.partName}`,
      text: [
        `${p.name},`,
        ``,
        `Thank you. You're down for the ${p.partName} on Joe's Trans Am.`,
        `Jennifer will be in touch from this address to sort out the details${p.how === "ship" ? " and give you the shop's shipping address" : ""}.`,
        `When it goes on the car, it goes on the build log: ${site}`,
        ``,
        `Jennifer, Steve, and Nick`,
      ].join("\n"),
    });
    return `jennifer:${r1.status} sponsor:${r2.status}`;
  },
});
