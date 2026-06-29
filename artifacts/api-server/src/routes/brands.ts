import { Router } from "express";
import { promises as dns } from "node:dns";
import { GenerateBrandsBody } from "@workspace/api-zod";

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type BrandSuggestion = {
  name: string;
  tagline: string;
  suggestedDomain: string;
};

function cleanName(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return cleaned || "Brand";
}

// A clean, lowercase, alphanumeric handle/domain stem derived from a brand name.
function toSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// The model is asked for `{ "names": [...] }`, but be tolerant of a bare array or
// other common wrapper keys so a minor format slip doesn't fail the whole call.
function extractNameList(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["names", "brands", "suggestions", "results"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}

function generateLocalSuggestions(
  description: string,
  category: string,
  keywords?: string,
): BrandSuggestion[] {
  const seed = cleanName(keywords || description);
  const categorySeed = cleanName(category);
  const names = [
    `${seed}ly`,
    `Nova${seed}`,
    `${seed}Hub`,
    `${categorySeed}Nest`,
    `Bright${seed}`,
    `${seed}Labs`,
    `Get${seed}`,
    `${seed}ify`,
    `${categorySeed}Forge`,
    `${seed}Spark`,
    `Try${seed}`,
    `${seed}Wave`,
    `Hello${seed}`,
    `${seed}Loop`,
    `${categorySeed}Peak`,
    `${seed}Mint`,
  ];

  const taglines = [
    "Built for bold ideas",
    "Make it instantly memorable",
    "Where vision gets named",
    "Simple names, strong starts",
    "Launch with a lasting name",
    "Crafted to stand out",
    "Your idea, beautifully named",
    "Names that mean business",
    "Forge a brand worth remembering",
    "Spark the perfect first impression",
    "A name as bold as you",
    "Ride the next big wave",
    "Say hello to your brand",
    "Keep customers coming back",
    "Reach the top, name first",
    "Fresh, clean, unforgettable",
  ];

  // De-duplicate (seeds can collide) while preserving order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return unique.map((name, index) => ({
    name,
    tagline: taglines[index % taglines.length] as string,
    suggestedDomain: `${name.toLowerCase()}.com`,
  }));
}

function hasGroqApiKey(): boolean {
  return Boolean(GROQ_API_KEY && GROQ_API_KEY !== "placeholder");
}

// Rank helper: 2 = available (unregistered), 0 = taken, 1 = unknown.
// Every registered domain has NS records at the registry, so NXDOMAIN => free.
// DNS is fast and not rate-limited (unlike RDAP/WHOIS), ideal for ranking a pool.
async function domainAvailabilityScore(domain: string): Promise<number> {
  const lookup = (async () => {
    try {
      const ns = await dns.resolveNs(domain.toLowerCase());
      return ns.length > 0 ? 0 : 2;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND" || code === "ENODATA") return 2;
      return 1;
    }
  })();
  // Cap each lookup so a slow resolver can't stall generation.
  const timeout = new Promise<number>((resolve) => setTimeout(() => resolve(1), 3000));
  return Promise.race([lookup, timeout]);
}

router.post("/brands/generate", async (req, res) => {
  const parsed = GenerateBrandsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { description, category, keywords } = parsed.data;

  try {
    if (!hasGroqApiKey()) {
      res.json(generateLocalSuggestions(description, category, keywords));
      return;
    }

    const systemPrompt = `You are an expert startup brand-namer. You invent ORIGINAL, coined brand names that are highly likely to be UNREGISTERED — a free .com domain and free social handles.

Hard requirements for EVERY name:
- An INVENTED / coined word or an unexpected portmanteau — NOT a common dictionary word and NOT the name of any existing company or product. In the spirit of Spotify, Twilio, Klarna, Zalando, Notion, Stripe.
- A single word, 5-14 letters, no spaces, no hyphens, easy to pronounce and spell.
- Do NOT lean on overused, already-taken patterns like the suffixes/prefixes "ly", "ify", "hub", "get", "go", "app", "io", "labs", "tech", "ai", "nest", "spark", "wave" unless they are fused into a genuinely novel coined word.
- All names must be clearly distinct from one another.
- Tagline: punchy, under 8 words.

Respond ONLY with a JSON object of exactly this shape — no markdown, no commentary:
{ "names": [ { "name": "Coinedname", "tagline": "Short catchy tagline" } ] }
Return exactly 18 entries in "names".`;

    const userPrompt = `Business: ${description}
Industry: ${category}${keywords ? `\nStyle / keywords: ${keywords}` : ""}`;

    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        max_tokens: 2048,
        // JSON mode forces syntactically valid JSON, eliminating the markdown /
        // prose wrapping that previously broke parsing.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!groqResponse.ok) {
      req.log.error({ status: groqResponse.status }, "Groq request failed");
      res.status(500).json({ error: "Brand generation failed" });
      return;
    }

    const groqJson = (await groqResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = groqJson.choices?.[0]?.message?.content ?? "{}";

    let rawList: unknown[];
    try {
      rawList = extractNameList(JSON.parse(content) as unknown);
    } catch {
      req.log.error({ content }, "Failed to parse Groq JSON response");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    // Validate, normalise and de-duplicate the model's output. The domain is
    // always derived from the slugified name, so the availability check matches
    // the brand we display regardless of what the model returned for it.
    const seen = new Set<string>();
    const suggestions: BrandSuggestion[] = [];
    for (const item of rawList) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const slug = toSlug(name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const tagline =
        typeof record.tagline === "string" && record.tagline.trim()
          ? record.tagline.trim()
          : "Your idea, beautifully named";
      suggestions.push({ name, tagline, suggestedDomain: `${slug}.com` });
    }

    // If the model returned nothing usable, fall back to the local generator
    // rather than showing the user an empty result.
    if (suggestions.length === 0) {
      res.json(generateLocalSuggestions(description, category, keywords));
      return;
    }

    // Check real .com availability for the whole pool, then surface the
    // registrable names first so users aren't shown already-taken brands.
    const scored = await Promise.all(
      suggestions.map(async (s) => ({
        s,
        score: await domainAvailabilityScore(s.suggestedDomain),
      })),
    );
    scored.sort((a, b) => b.score - a.score);
    const ranked = scored.map((x) => x.s).slice(0, 12);

    res.json(ranked.length > 0 ? ranked : suggestions.slice(0, 12));
  } catch (err) {
    req.log.error({ err }, "Brand generation failed");
    res.status(500).json({ error: "Brand generation failed" });
  }
});

export default router;
