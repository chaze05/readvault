import { isIP } from "node:net";

const PRESET_HOSTS = new Set(["api.deepseek.com", "api.openai.com"]);

export class AiUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUrlError";
  }
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function parseAllowedHosts(allowedHosts?: string[] | string): Set<string> {
  const raw =
    allowedHosts === undefined
      ? (process.env.AI_ALLOWED_HOSTS ?? "").split(",")
      : Array.isArray(allowedHosts)
        ? allowedHosts
        : allowedHosts.split(",");

  const hosts = new Set<string>();

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    try {
      const parsed = trimmed.includes("://")
        ? new URL(trimmed)
        : new URL(`https://${trimmed}`);
      hosts.add(normalizeHost(parsed.hostname));
    } catch {
      continue;
    }
  }

  return hosts;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((octet) => Number(octet));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  const firstHextet = Number.parseInt(normalized.split(":")[0] || "0", 16);
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  if ((firstHextet & 0xfe00) === 0xfc00) return true;
  if ((firstHextet & 0xffc0) === 0xfec0) return true;
  if ((firstHextet & 0xff00) === 0xff00) return true;

  if (normalized.startsWith("::ffff:")) {
    return true;
  }

  return false;
}

function isBlockedHost(host: string): boolean {
  const withoutBrackets = host.replace(/^\[|\]$/g, "");
  const ipVersion = isIP(withoutBrackets);

  if (ipVersion === 4) {
    return isPrivateIpv4(withoutBrackets);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(withoutBrackets);
  }

  return (
    withoutBrackets === "localhost" ||
    withoutBrackets.endsWith(".localhost")
  );
}

export function validateAiBaseUrl(
  rawUrl: string,
  allowedHosts?: string[] | string
): string {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new AiUrlError("Enter a valid AI provider URL.");
  }

  if (url.protocol !== "https:") {
    throw new AiUrlError("AI provider URLs must use HTTPS.");
  }

  if (url.username || url.password) {
    throw new AiUrlError("AI provider URLs cannot include credentials.");
  }

  const host = normalizeHost(url.hostname);
  if (!host) {
    throw new AiUrlError("Enter a valid AI provider URL.");
  }

  if (isBlockedHost(host)) {
    throw new AiUrlError("AI provider URLs cannot use a local or private host.");
  }

  const allowed = new Set([
    ...PRESET_HOSTS,
    ...parseAllowedHosts(allowedHosts),
  ]);

  if (!allowed.has(host)) {
    throw new AiUrlError(
      "This AI provider host is not approved. Add it to AI_ALLOWED_HOSTS."
    );
  }

  const pathname = url.pathname.replace(/\/+$/, "");

  return `${url.protocol}//${url.host}${pathname}`;
}
