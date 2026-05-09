/**
 * Parse Instagram profile URLs and return the username segment (no @).
 */
export function extractInstagramHandle(input: string | null | undefined): string | null {
  const u = String(input || '').trim();
  if (!u) return null;
  try {
    const withProto = /^https?:/i.test(u) ? u : `https://${u}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'instagram.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    const first = parts[0].toLowerCase();
    const reserved = new Set([
      'p',
      'reel',
      'reels',
      'stories',
      'explore',
      'accounts',
      'direct',
      'tv',
      'share',
    ]);
    if (reserved.has(first)) return null;
    const raw = decodeURIComponent(parts[0]).replace(/^@/, '').trim();
    return raw || null;
  } catch {
    return null;
  }
}

/** Display label e.g. @username, or empty if not parseable. */
export function formatInstagramProfileLabel(input: string | null | undefined): string {
  const h = extractInstagramHandle(input);
  return h ? `@${h}` : '';
}

const PROFILE_RESERVED = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
  'share',
]);

/** Replace Instagram profile URLs in prose with @handle; leaves reel/post URLs unchanged. */
export function replaceInstagramUrlsInText(text: string): string {
  if (!text) return '';
  return text.replace(
    /https?:\/\/(?:www\.)?instagram\.com\/([^/?\s#]+)/gi,
    (full, segment: string) => {
      const low = segment.toLowerCase();
      if (PROFILE_RESERVED.has(low)) return full;
      const u = decodeURIComponent(segment).replace(/^@/, '').trim();
      return u ? `@${u}` : full;
    }
  );
}
