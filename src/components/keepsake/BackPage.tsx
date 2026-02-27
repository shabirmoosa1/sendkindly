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

      <p
        className="text-xs font-medium tracking-[0.25em] uppercase mb-6"
        style={{ color: 'var(--crimson)' }}
      >
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

      {/* SK wordmark + logo */}
      <div className="mt-auto flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo Option 4.png"
          alt="SendKindly"
          style={{ height: '32px', opacity: 0.85, marginBottom: '8px' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{ color: 'var(--crimson)' }}
        >
          SendKindly
        </p>
        <a
          href="https://sendkindly-bice.vercel.app"
          className="mt-1"
          style={{ color: 'var(--crimson)', fontSize: '10px', textDecoration: 'none' }}
        >
          sendkindly.com
        </a>
      </div>
    </div>
  );
}
