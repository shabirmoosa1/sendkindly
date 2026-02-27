import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'You have a surprise waiting!';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch just the recipient name — keep everything else a surprise
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pages?slug=eq.${encodeURIComponent(slug)}&select=recipient_name`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    }
  );

  const rows = await res.json();
  const data = rows?.[0];
  const name = data?.recipient_name;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(160deg, #2A1F1C 0%, #5A4B45 30%, #C0272D 60%, #C8A951 100%)',
          padding: 48,
        }}
      >
        {/* Envelope emoji */}
        <span style={{ fontSize: 120 }}>💌</span>

        {/* Headline */}
        <span
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#FFFFFF',
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            marginTop: 24,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {name
            ? `${name}, you have a surprise!`
            : 'You have a surprise waiting!'}
        </span>

        {/* Sub text */}
        <span
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Someone special put together something just for you
        </span>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 36,
            fontSize: 20,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span>🎁</span>
          <span>SendKindly</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
