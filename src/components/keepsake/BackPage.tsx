import type { PageData, Contribution } from './types';

interface BackPageProps {
  page: PageData;
  contributions: Contribution[];
}

export default function BackPage({ page, contributions }: BackPageProps) {
  const uniqueNames = [...new Set(contributions.map(c => c.contributor_name))];
  const dateStr = page.event_date
    ? new Date(page.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(page.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
      {/* Gold rule */}
      <div className="gold-rule mx-auto mb-8" />

      <p className="text-xs font-medium tracking-[0.25em] text-cocoa/40 uppercase mb-6">
        With love from
      </p>

      {/* Contributor names */}
      <div className="max-w-md mx-auto mb-8">
        <p className="text-base text-cocoa leading-loose">
          {uniqueNames.map((name, i) => (
            <span key={name}>
              <span className="font-medium">{name}</span>
              {i < uniqueNames.length - 2 && ', '}
              {i === uniqueNames.length - 2 && ' & '}
            </span>
          ))}
        </p>
      </div>

      {/* Gold rule */}
      <div className="gold-rule mx-auto mb-8" />

      {/* Date */}
      <p className="text-sm text-cocoa/50 mb-12">{dateStr}</p>

      {/* SK wordmark */}
      <div className="mt-auto">
        <p className="text-xs tracking-[0.3em] text-cocoa/30 uppercase">
          SendKindly
        </p>
        <p className="text-[10px] text-cocoa/20 mt-1">
          sendkindly.com
        </p>
      </div>
    </div>
  );
}
