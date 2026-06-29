import { Router } from "express";
import { promises as dns } from "node:dns";
import { CheckBrandAvailabilityBody } from "@workspace/api-zod";

const router = Router();

type Status = "available" | "taken" | "unknown";

const SOCIAL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// Every registered domain has NS records at the registry, so an NXDOMAIN result
// means the name is unregistered. DNS is fast and not rate-limited (unlike RDAP),
// and matches the ranking used during generation.
async function domainStatus(domain: string): Promise<Status> {
  const lookup = (async (): Promise<Status> => {
    try {
      const ns = await dns.resolveNs(domain.toLowerCase());
      return ns.length > 0 ? "taken" : "available";
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND" || code === "ENODATA") return "available";
      return "unknown";
    }
  })();
  const timeout = new Promise<Status>((resolve) =>
    setTimeout(() => resolve("unknown"), 4000),
  );
  return Promise.race([lookup, timeout]);
}

// Profile-page probe: 404 => handle is free, 200 => taken, anything else
// (blocked / rate-limited / error) => unknown rather than a misleading guess.
async function urlStatus(url: string): Promise<Status> {
  try {
    const resp = await fetch(url, {
      headers: SOCIAL_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (resp.status === 404) return "available";
    if (resp.status === 200) return "taken";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// X/Twitter and LinkedIn return a reliable 404 (free) / 200 (taken) to anonymous
// requests, so these can be verified.
const checkTwitter = (username: string): Promise<Status> =>
  urlStatus(`https://x.com/${username}`);
const checkLinkedIn = (username: string): Promise<Status> =>
  urlStatus(`https://www.linkedin.com/company/${username}`);

// Instagram serves a login wall (HTTP 200) to anonymous requests for BOTH real
// and nonexistent handles, and its web profile API requires authentication — so
// it cannot be verified server-side. Report "unknown" instead of a false result.
async function checkInstagram(_username: string): Promise<Status> {
  return "unknown";
}

router.post("/brands/availability", async (req, res) => {
  const parsed = CheckBrandAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { name, domain } = parsed.data;
  // Derive a clean username: lowercase, remove non-alphanumeric
  const username = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  try {
    const [domainResult, twitter, linkedin, instagram] = await Promise.all([
      domainStatus(domain),
      checkTwitter(username),
      checkLinkedIn(username),
      checkInstagram(username),
    ]);

    res.json({
      domain: { name: domain, status: domainResult },
      social: { instagram, twitter, linkedin },
    });
  } catch (err) {
    req.log.error({ err }, "Availability check failed");
    res.status(500).json({ error: "Availability check failed" });
  }
});

export default router;
