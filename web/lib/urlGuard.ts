import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// SSRF guard for user-supplied URLs: only http(s), no private/internal targets,
// redirects re-checked per hop. DNS is resolved once per hop before fetching —
// a rebinding race between check and fetch is accepted at MVP scale.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||           // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const low = ip.toLowerCase();
  if (low === "::" || low === "::1") return true;
  if (low.startsWith("fe8") || low.startsWith("fe9") || low.startsWith("fea") || low.startsWith("feb")) return true; // link-local
  if (low.startsWith("fc") || low.startsWith("fd")) return true; // unique-local
  if (low.startsWith("::ffff:")) return isPrivateIPv4(low.slice(7)); // v4-mapped
  return false;
}

function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not an IP — caller resolves via DNS
}

/** Throws if the URL is not a public http(s) target. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError("Only http(s) URLs are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new UrlGuardError("URL resolves to a private address");
    return url;
  }
  let addresses;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UrlGuardError(`Could not resolve host ${host}`);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new UrlGuardError("URL resolves to a private address");
  }
  return url;
}

export class UrlGuardError extends Error {}

/**
 * fetch() with the SSRF guard applied to the initial URL and every redirect hop.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  { maxRedirects = 3, timeoutMs = 15000 } = {}
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { ...init, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new UrlGuardError("Too many redirects");
}
