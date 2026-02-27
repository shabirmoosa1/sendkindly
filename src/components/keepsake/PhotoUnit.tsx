import type { Contribution } from './types';

interface PhotoUnitProps {
  contribution: Contribution;
  loveCount?: number;
}

/** Photo contribution card — used in the printable keepsake layout */
export default function PhotoUnit({ contribution, loveCount }: PhotoUnitProps) {
  return (
    <div className="polaroid break-inside-avoid" style={{ marginBottom: '10px', maxHeight: '200px', overflow: 'hidden' }}>
      <img
        src={contribution.photo_url!}
        alt={`From ${contribution.contributor_name}`}
        style={{ height: '140px', width: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', borderRadius: '6px 6px 0 0' }}
      />

      {/* Caption or message */}
      {contribution.message_text && (
        <p className="mt-2 text-cocoa/70 font-caveat" style={{ fontSize: '12px', lineHeight: 1.4 }}>
          {contribution.message_text}
        </p>
      )}

      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold bg-espresso/80" style={{ fontSize: '9px' }}>
            {contribution.contributor_name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-cocoa" style={{ fontSize: '11px' }}>
            {contribution.contributor_name}
          </span>
        </div>
        {loveCount != null && loveCount > 0 && (
          <span className="text-cocoa/40" style={{ fontSize: '10px' }}>
            ❤️ {loveCount}
          </span>
        )}
      </div>

      {/* Recipient reply */}
      {contribution.recipient_reply && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
          <p className="text-gold font-medium mb-0.5" style={{ fontSize: '10px' }}>Reply:</p>
          <p className="text-cocoa italic break-words" style={{ fontSize: '11px' }}>
            &ldquo;{contribution.recipient_reply}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
