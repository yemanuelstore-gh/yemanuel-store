export type RemoteImagePattern = { protocol: "https"; hostname: string };

export const remoteImagePatterns: RemoteImagePattern[] = [
  { protocol: "https", hostname: "**.supabase.co" },
  { protocol: "https", hostname: "*.vercel-storage.com" },
  { protocol: "https", hostname: "images.pexels.com" },
];

export function isAllowedRemoteImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return remoteImagePatterns.some((pattern) =>
      matchesHostname(parsed.hostname, pattern.hostname),
    );
  } catch {
    return false;
  }
}

/**
 * A storefront image is renderable when it is either an allowlisted remote
 * URL (Supabase storage, Vercel blob, Pexels CDN) or a same-origin absolute
 * path such as `/images/...` served from the public directory. Protocol-
 * relative or cross-origin sources are rejected.
 */
export function isAllowedStoreImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  return isAllowedRemoteImage(src);
}

function matchesHostname(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) return hostname.endsWith(pattern.slice(2));
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return hostname.length > base.length && hostname.endsWith(base);
  }
  return hostname === pattern;
}