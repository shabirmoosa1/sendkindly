import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { pageId, slug } = await request.json();
    console.log('[reveal] Request received:', { pageId, slug });

    if (!pageId || !slug) {
      console.log('[reveal] Missing required fields');
      return NextResponse.json(
        { error: 'pageId and slug are required' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('[reveal] Supabase admin client created');

    // Update status to 'revealed'
    const { data: pageData, error: updateError } = await supabaseAdmin
      .from('pages')
      .update({ status: 'revealed', revealed_at: new Date().toISOString() })
      .eq('id', pageId)
      .select('recipient_name, recipient_email')
      .single();

    if (updateError) {
      console.error('[reveal] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update page status', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[reveal] Status updated to revealed:', { pageId, recipient: pageData?.recipient_name });

    // Send reveal email if recipient email is set
    if (pageData?.recipient_email) {
      console.log('[reveal] Sending reveal email to:', pageData.recipient_email);

      const keepsakeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sendkindly-bice.vercel.app'}/p/${slug}/keepsake?recipient=true`;

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #F6F2EC; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #C8A951 0%, #C0272D 100%); padding: 40px 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
            <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.3;">
              ${pageData.recipient_name}, you have a<br/>special surprise waiting!
            </h1>
          </div>
          <div style="padding: 32px; text-align: center;">
            <p style="color: #5A4B45; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Someone who loves you created something special for you. People who care about you have come together to share their heartfelt messages.
            </p>
            <a href="${keepsakeUrl}" style="display: inline-block; background: #C0272D; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px;">
              Open My Surprise 🎁
            </a>
            <p style="color: #5A4B45; opacity: 0.5; font-size: 12px; margin-top: 24px;">
              Made with 💛 on SendKindly
            </p>
          </div>
        </div>
      `;

      const sent = await sendEmail({
        to: pageData.recipient_email,
        subject: `🎁 You have a special surprise waiting, ${pageData.recipient_name}!`,
        html,
      });
      console.log('[reveal] Email sent:', sent);
    } else {
      console.log('[reveal] No recipient email set — skipping email');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reveal] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
