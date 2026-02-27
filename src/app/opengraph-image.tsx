import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SendKindly — Celebrate Together';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
          background: 'linear-gradient(135deg, #F6F2EC 0%, #C8A951 40%, #C0272D 70%, #2A1F1C 100%)',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '72px' }}>🎁</span>
          <span
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            SendKindly
          </span>
        </div>
        <span
          style={{
            fontSize: '28px',
            color: '#FFFFFF',
            opacity: 0.9,
            textShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          Celebrate the people who matter most
        </span>
      </div>
    ),
    { ...size }
  );
}
