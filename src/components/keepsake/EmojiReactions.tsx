'use client';

import type { ReactionCount } from './types';

const REACTION_EMOJIS = ['❤️', '😂', '🥹', '🙌', '💛', '🔥'];

interface EmojiReactionsProps {
  contributionId: string;
  reactions: ReactionCount[];
  onReact: (contributionId: string, emoji: string) => void;
}

export default function EmojiReactions({ contributionId, reactions, onReact }: EmojiReactionsProps) {
  return (
    <div className="emoji-reactions flex flex-wrap gap-1.5 mt-3">
      {REACTION_EMOJIS.map((emoji) => {
        const reaction = reactions.find(r => r.emoji === emoji);
        const count = reaction?.count || 0;
        const reacted = reaction?.reacted || false;

        return (
          <button
            key={emoji}
            onClick={() => onReact(contributionId, emoji)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all
              ${reacted
                ? 'bg-terracotta/10 border border-terracotta/30'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }
            `}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className={`text-[10px] ${reacted ? 'text-terracotta' : 'text-cocoa/50'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
