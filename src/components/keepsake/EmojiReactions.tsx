'use client';

import { useState } from 'react';

const REACTION_EMOJIS = ['❤️', '😂', '😢', '🙌', '✨', '🎉'];

interface EmojiReactionsProps {
  contributionId: string;
}

export default function EmojiReactions({ contributionId }: EmojiReactionsProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const handleClick = (emoji: string) => {
    setCounts(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
  };

  return (
    <div className="emoji-reactions flex flex-wrap mt-3" style={{ gap: '6px' }}>
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] || 0;

        return (
          <button
            key={`${contributionId}-${emoji}`}
            onClick={() => handleClick(emoji)}
            className="inline-flex items-center rounded-full transition-all"
            style={{
              height: '28px',
              padding: '0 8px',
              gap: '4px',
              background: 'rgba(183,110,76,0.08)',
              border: '1px solid rgba(183,110,76,0.2)',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--cocoa)' }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
