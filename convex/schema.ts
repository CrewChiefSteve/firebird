import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Who may sign in. Matched against the Clerk email, case-insensitive.
  crew: defineTable({
    email: v.string(),
    name: v.string(),
    short: v.string(), // "steve" | "nick" | "jen" — stable key used in sessions
    color: v.string(),
    canClock: v.boolean(), // Jennifer sees the clock but doesn't punch
    canPay: v.boolean(), // Jennifer marks hours paid
    order: v.number(),
  }).index("by_email", ["email"]).index("by_short", ["short"]),

  active: defineTable({
    who: v.string(), // crew.short
    start: v.number(),
    phase: v.string(),
    note: v.string(),
  }).index("by_who", ["who"]),

  sessions: defineTable({
    who: v.string(),
    phase: v.string(),
    note: v.string(),
    start: v.number(),
    end: v.number(),
    minutes: v.number(),
    manual: v.boolean(),
    paid: v.boolean(),
    paidAt: v.optional(v.number()),
  }).index("by_start", ["start"]).index("by_who", ["who", "start"]),

  tasks: defineTable({
    phase: v.string(),
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("doing"), v.literal("done")),
    order: v.number(),
    note: v.optional(v.string()),
    doneAt: v.optional(v.number()),
  }).index("by_phase", ["phase", "order"]),

  parts: defineTable({
    name: v.string(),
    phase: v.string(),
    qty: v.number(),
    vendor: v.string(),
    cost: v.number(),
    pn: v.string(),
    eta: v.string(), // YYYY-MM-DD or ""
    // hot = needed now, hold = parked but keep the research
    status: v.union(v.literal("hot"), v.literal("need"), v.literal("ordered"), v.literal("received"), v.literal("installed"), v.literal("hold")),
    note: v.string(),
    updated: v.number(),
    public: v.optional(v.boolean()), // listed on the public Adopt-a-part page
    sponsor: v.optional(
      v.object({
        name: v.string(),
        company: v.optional(v.string()),
        credit: v.union(v.literal("name"), v.literal("company"), v.literal("anon")),
        pledgeId: v.optional(v.id("pledges")),
      }),
    ),
  }),

  // Someone offering to cover a part. Jennifer confirms or declines from the Parts tab.
  pledges: defineTable({
    partId: v.id("parts"),
    partName: v.string(),
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    credit: v.union(v.literal("name"), v.literal("company"), v.literal("anon")),
    how: v.union(v.literal("cost"), v.literal("ship")), // cover the cost, or buy it and ship it to the shop
    message: v.string(),
    status: v.union(v.literal("new"), v.literal("confirmed"), v.literal("declined")),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  }).index("by_status", ["status"]).index("by_part", ["partId"]),

  phases: defineTable({
    key: v.string(),
    name: v.string(),
    status: v.union(v.literal("done"), v.literal("active"), v.literal("up-next"), v.literal("later")),
    pct: v.number(),
    blurb: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]).index("by_key", ["key"]),

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    date: v.string(), // YYYY-MM-DD
    phase: v.string(), // phases.key
    summary: v.string(),
    body: v.string(), // simple markdown
    photos: v.array(
      v.object({
        storageId: v.optional(v.id("_storage")),
        url: v.optional(v.string()), // legacy static photo under /photos
        caption: v.optional(v.string()),
      }),
    ),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_date", ["date"]),

  // The ledger: every dollar spent on the car. Crew out-of-pocket rows wait on reimbursement
  // from Jennifer; rows she paid herself are settled on entry.
  receipts: defineTable({
    who: v.string(), // crew.short of whoever paid
    date: v.string(), // YYYY-MM-DD on the receipt
    vendor: v.string(),
    total: v.number(), // dollars
    phase: v.string(), // phases.key or "other"
    note: v.string(),
    storageId: v.optional(v.id("_storage")), // the receipt scan, if there is one
    kind: v.optional(v.union(v.literal("image"), v.literal("pdf"))),
    reimbursed: v.boolean(),
    reimbursedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_who", ["who", "date"]).index("by_date", ["date"]),
});
