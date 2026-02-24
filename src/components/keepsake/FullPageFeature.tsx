import type { Contribution } from './types';

interface FullPageFeatureProps {
  contribution: Contribution;
}

export default function FullPageFeature({ contribution }: FullPageFeatureProps) {
  const hasPhoto = !!contribution.photo_url;
  const hasText = !!contribution.message_text;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      {hasPhoto && (
        <div className="polaroid mb-8 max-w-sm w-full mx-auto">
          <img
            src={contribution.photo_url!}
            alt={`From ${contribution.contributor_name}`}
            className="w-full rounded-sm"
          />
          {hasText && (
            <p className="mt-3 text-sm text-cocoa/70 font-caveat text-center leading-relaxed">
              {contribution.message_text}
            </p>
          )}
          <p className="mt-2 text-xs text-cocoa/50 text-center">
            — {contribution.contributor_name}
          </p>
        </div>
      )}

      {!hasPhoto && hasText && (
        <div className="max-w-lg mx-auto text-center">
          <div className="text-5xl text-terracotta/20 mb-4">&ldquo;</div>
          <p
            className="text-xl sm:text-2xl italic text-espresso leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}
          >
            {contribution.message_text}
          </p>
          <div className="gold-rule mx-auto mb-4" />
          <p className="text-sm text-cocoa/60">
            — {contribution.contributor_name}
          </p>
        </div>
      )}
    </div>
  );
}
