import type { Contribution } from './types';
import EmojiReactions from './EmojiReactions';

interface PhotoUnitProps {
  contribution: Contribution;
}

export default function PhotoUnit({ contribution }: PhotoUnitProps) {
  return (
    <div className="polaroid break-inside-avoid mb-4">
      <img
        src={contribution.photo_url!}
        alt={`From ${contribution.contributor_name}`}
        className="w-full max-h-[280px] object-cover rounded-lg"
      />

      {/* Caption or message */}
      {contribution.message_text && (
        <p className="mt-3 text-sm text-cocoa/70 font-caveat leading-relaxed">
          {contribution.message_text}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-espresso/80">
          {contribution.contributor_name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-cocoa">
          {contribution.contributor_name}
        </span>
      </div>

      {/* Recipient reply */}
      {contribution.recipient_reply && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gold font-medium mb-1">Reply:</p>
          <p className="text-xs text-cocoa italic break-words">
            &ldquo;{contribution.recipient_reply}&rdquo;
          </p>
        </div>
      )}

      {/* Emoji reactions */}
      <EmojiReactions contributionId={contribution.id} />
    </div>
  );
}
