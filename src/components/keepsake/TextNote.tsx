import type { Contribution, ReactionCount } from './types';
import EmojiReactions from './EmojiReactions';

interface TextNoteProps {
  contribution: Contribution;
  reactions: ReactionCount[];
  onReact: (contributionId: string, emoji: string) => void;
}

export default function TextNote({ contribution, reactions, onReact }: TextNoteProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border-t-3 border-terracotta/60 shadow-sm break-inside-avoid mb-4">
      <p className="text-base text-espresso leading-relaxed mb-3 break-words">
        &ldquo;{contribution.message_text}&rdquo;
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-espresso/80">
            {contribution.contributor_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-cocoa">
            {contribution.contributor_name}
          </span>
        </div>
      </div>

      {/* Recipient reply */}
      {contribution.recipient_reply && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gold font-medium mb-1">Reply:</p>
          <p className="text-sm text-cocoa italic break-words">
            &ldquo;{contribution.recipient_reply}&rdquo;
          </p>
        </div>
      )}

      {/* Emoji reactions */}
      <EmojiReactions
        contributionId={contribution.id}
        reactions={reactions}
        onReact={onReact}
      />
    </div>
  );
}
