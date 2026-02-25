import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { recipientName, recipientEmail, slug } = await request.json();

    if (!recipientEmail || !recipientName || !slug) {
      return NextResponse.json(
        { error: 'recipientName, recipientEmail, and slug are required' },
        { status: 400 }
      );
    }

    const keepsakeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sendkindly-bice.vercel.app'}/p/${slug}/keepsake?recipient=true`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #F6F2EC; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #C8A951 0%, #B76E4C 100%); padding: 40px 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
          <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.3;">
            ${recipientName}, you have a<br/>special surprise waiting!
          </h1>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="color: #5A4B45; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Someone who loves you created something special for you. People who care about you have come together to share their heartfelt messages.
          </p>
          <a href="${keepsakeUrl}" style="display: inline-block; background: #B76E4C; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px;">
            Open My Surprise 🎁
          </a>
          <p style="color: #5A4B45; opacity: 0.5; font-size: 12px; margin-top: 24px;">
            Made with 💛 on SendKindly
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject: `🎁 You have a special surprise waiting, ${recipientName}!`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reveal email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
