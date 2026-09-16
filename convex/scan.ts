import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, Infer } from "convex/values";
import { currentCrew } from "./lib";

/**
 * Receipt reader for the Ledger tab. Same approach as reccat and 1099Pro: the photo goes to
 * OpenAI with a strict JSON schema and the fields come back to prefill the purchase form.
 * Needs OPENAI_API_KEY on the deployment (npx convex env set OPENAI_API_KEY ... --prod).
 * OPENAI_RECEIPT_MODEL overrides the model (default gpt-4.1-mini).
 */

const result = v.object({
  date: v.union(v.string(), v.null()),
  vendor: v.union(v.string(), v.null()),
  total: v.union(v.number(), v.null()),
  description: v.union(v.string(), v.null()),
  phaseKey: v.union(v.string(), v.null()),
  paymentMethod: v.union(v.string(), v.null()),
  cardLast4: v.union(v.string(), v.null()),
  reviewNeeded: v.boolean(),
  notes: v.union(v.string(), v.null()),
});

type Scan = Infer<typeof result>;
type ScanCtx = { crew: boolean; phases: { key: string; name: string }[] };

export const ctxForScan = internalQuery({
  args: {},
  handler: async (ctx): Promise<ScanCtx> => {
    const me = await currentCrew(ctx);
    const phases = await ctx.db.query("phases").collect();
    return { crew: !!me, phases: phases.map((p) => ({ key: p.key, name: p.name })) };
  },
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "vendor", "total", "description", "phase", "paymentMethod", "cardLast4", "reviewNeeded", "notes"],
  properties: {
    date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    vendor: { type: ["string", "null"] },
    total: { type: ["number", "null"] },
    description: { type: ["string", "null"] },
    phase: { type: ["string", "null"] },
    paymentMethod: { type: ["string", "null"] },
    cardLast4: { type: ["string", "null"] },
    reviewNeeded: { type: "boolean" },
    notes: { type: ["string", "null"] },
  },
};

function prompt(phaseNames: string[]) {
  return `You are reading a purchase receipt for a car restoration shop ledger (a 1975 Pontiac Trans Am rebuild).

Return only JSON matching the schema.

Fields:
- date: the purchase date as YYYY-MM-DD, or null if not visible.
- vendor: the store or seller as a short familiar name, e.g. "Lowe's", "Rock Auto", "NPD", "Summit Racing", "AutoZone", "Harbor Freight", "eBay". Not the full legal name or the address.
- total: the grand total actually paid, including tax, as a number. Null if unclear.
- description: two to eight words saying what was bought, in shop language, e.g. "ball joints, tie rod ends" or "POR-15 quart, brushes, gloves". Null if unclear.
- phase: which part of the build this spend belongs to. Pick exactly one of: ${phaseNames.map((n) => `"${n}"`).join(", ")}. Use null if you can't tell.
- paymentMethod: cash, debit, credit, Visa, Mastercard, etc. if shown, else null.
- cardLast4: the last four digits of the card if shown, else null.
- reviewNeeded: true if the total or date is unclear, the image is blurry or cut off, or this looks like a duplicate/reprint.
- notes: anything a bookkeeper should know (partial receipt, return, reprint, multiple receipts in one photo). Else null.

Rules:
- Do not guess. Unclear means null.
- Steel, sheet metal, welding supplies, rust products (POR-15, rust converter) belong with rust repair or POR-15.
- Suspension, steering, brakes, differential and axle parts belong with Front Clip or Rear End by where they go on the car.`;
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export const read = action({
  args: { storageId: v.id("_storage") },
  returns: result,
  handler: async (ctx, { storageId }): Promise<Scan> => {
    const { crew, phases }: ScanCtx = await ctx.runQuery(internal.scan.ctxForScan, {});
    if (!crew) throw new Error("Not on the crew list");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Receipt reading isn't set up yet. Jennifer or Steve: set OPENAI_API_KEY on the Convex deployment.");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("That upload isn't in storage");
    const mime = blob.type || "image/jpeg";
    if (!mime.startsWith("image/")) throw new Error("Only photos can be read automatically. Type this one in.");
    const dataUrl = `data:${mime};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`;

    const phaseNames = [...phases.map((p) => p.name), "Other"];
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_RECEIPT_MODEL ?? "gpt-4.1-mini",
        input: [{ role: "user", content: [
          { type: "input_text", text: prompt(phaseNames) },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "receipt", strict: true, schema: jsonSchema } },
      }),
    });
    if (!res.ok) throw new Error(`Receipt reader failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    const raw: string | undefined = body.output_text
      ?? body.output?.flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? []).find((c: { type: string }) => c.type === "output_text")?.text;
    if (!raw) throw new Error("Receipt reader returned nothing");
    const j = JSON.parse(raw);

    // Map the phase name the model picked back to a phases.key ("other" for Other).
    const picked = typeof j.phase === "string" ? j.phase.trim().toLowerCase() : "";
    const hit = phases.find((p) => p.name.toLowerCase() === picked);
    const phaseKey = hit ? hit.key : picked === "other" ? "other" : null;

    const num = (x: unknown) => (typeof x === "number" && isFinite(x) ? Math.round(x * 100) / 100 : null);
    const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
    const date = str(j.date);
    return {
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      vendor: str(j.vendor),
      total: num(j.total),
      description: str(j.description),
      phaseKey,
      paymentMethod: str(j.paymentMethod),
      cardLast4: str(j.cardLast4),
      reviewNeeded: !!j.reviewNeeded,
      notes: str(j.notes),
    };
  },
});
