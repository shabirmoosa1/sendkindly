/**
 * Returns the correct base URL for sharing links.
 *
 * On production (Vercel) this is the real origin.
 * On localhost (dev) this returns the production URL so that:
 *   - WhatsApp/social crawlers can reach the page and render OG previews
 *   - Recipients can actually open the link on their devices
 */

const PRODUCTION_URL = 'https://sendkindly-bice.vercel.app';

export function getShareBase(): string {
  if (typeof window === 'undefined') return PRODUCTION_URL;
  // On localhost / 127.0.0.1 → use production URL
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return PRODUCTION_URL;
  }
  return window.location.origin;
}

/** Build a full shareable URL for any path (e.g. `/p/abc123`) */
export function getShareUrl(path: string): string {
  return `${getShareBase()}${path}`;
}
