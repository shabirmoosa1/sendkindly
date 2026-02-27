import type { Contribution } from './types';

interface StickerUnitProps {
  contribution: Contribution;
}

/** AI sticker contribution card — used in the printable keepsake layout */
export default function StickerUnit({ contribution }: StickerUnitProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm break-inside-avoid mb-4 text-center">
      <img
        src={contribution.ai_sticker_url!}
        alt={`AI sticker from ${contribution.contributor_name}`}
        style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '12px', margin: '0 auto', display: 'block' }}
      />

      <p className="mt-2 text-gold/70 font-medium" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
        ✨ AI-generated sticker
      </p>

      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold bg-espresso/80" style={{ fontSize: '9px' }}>
          {contribution.contributor_name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-cocoa" style={{ fontSize: '11px' }}>
          {contribution.contributor_name}
        </span>
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
