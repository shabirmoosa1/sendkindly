import { copyToClipboard } from './clipboard';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

/**
 * Attempts native share (mobile), falls back to clipboard copy.
 * Returns { shared, copied } to indicate what happened.
 */
export async function shareOrCopy(
  options: ShareOptions
): Promise<{ shared: boolean; copied: boolean }> {
  // Try native share on mobile
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    /Mobi|Android/i.test(navigator.userAgent)
  ) {
    try {
      await navigator.share(options);
      return { shared: true, copied: false };
    } catch {
      // User cancelled or share failed — fall through to copy
    }
  }

  // Fallback: copy URL to clipboard
  const success = await copyToClipboard(options.url);
  return { shared: false, copied: success };
}

/**
 * Opens a mailto: link with pre-filled subject and body.
 */
export function openEmailShare(options: { subject: string; body: string }) {
  const mailto = `mailto:?subject=${encodeURIComponent(options.subject)}&body=${encodeURIComponent(options.body)}`;
  window.open(mailto, '_blank');
}
