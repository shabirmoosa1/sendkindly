import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SendKindly Keepsake';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const OCCASION_EMOJI: Record<string, string> = {
  birthday: '🎂',
  wedding: '💒',
  baby_shower: '👶',
  graduation: '🎓',
  anniversary: '💕',
  retirement: '🏖️',
  farewell: '👋',
  thank_you: '🙏',
  congratulations: '🎊',
  work_anniversary: '🏆',
  promotion: '🌟',
  new_job: '🚀',
  other: '🎉',
};

function formatOccasion(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pages?slug=eq.${encodeURIComponent(slug)}&select=recipient_name,template_type,hero_image_url`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    }
  );

  const rows = await res.json();
  const data = rows?.[0];

  if (!data) {
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
              'linear-gradient(135deg, #F6F2EC 0%, #C8A951 50%, #B76E4C 100%)',
          }}
        >
          <span style={{ fontSize: 80 }}>🎁</span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#FFFFFF',
              marginTop: 16,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            SendKindly
          </span>
        </div>
      ),
      { ...size }
    );
  }

  const emoji = OCCASION_EMOJI[data.template_type] || '🎉';
  const occasion = formatOccasion(data.template_type).toUpperCase();
  const name = data.recipient_name;
  const heroUrl = data.hero_image_url;

  // ── WITH hero image ──────────────────────────────────────────────
  if (heroUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
          }}
        >
          <img
            src={heroUrl}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              background:
                'linear-gradient(to bottom, rgba(42,31,28,0.25) 0%, rgba(42,31,28,0.7) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 26,
                color: '#C8A951',
                letterSpacing: 4,
              }}
            >
              <span>{emoji}</span>
              <span>{data.template_type === 'other' ? 'CELEBRATION' : occasion}</span>
            </div>
            <span
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: '#FFFFFF',
                textShadow: '0 3px 16px rgba(0,0,0,0.5)',
                marginTop: 16,
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              A Keepsake for {name}
            </span>
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 20,
              }}
            >
              Messages and memories from people who care
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 32,
                fontSize: 20,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <span>🎁</span>
              <span>SendKindly</span>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // ── WITHOUT hero image — warm gradient ───────────────────────────
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
            'linear-gradient(145deg, #F6F2EC 0%, #E8D5C4 20%, #C8A951 45%, #B76E4C 70%, #5A4B45 100%)',
          padding: 48,
        }}
      >
        <span style={{ fontSize: 100 }}>{emoji}</span>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#F6F2EC',
            letterSpacing: 4,
            marginTop: 24,
          }}
        >
          {data.template_type === 'other' ? 'CELEBRATION' : occasion}
        </div>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            marginTop: 12,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          A Keepsake for {name}
        </span>
        <span
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 16,
          }}
        >
          Messages and memories from people who care
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 28,
            fontSize: 18,
            color: 'rgba(255,255,255,0.65)',
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
