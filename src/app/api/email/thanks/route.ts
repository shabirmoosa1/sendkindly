import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { pageId, recipientName, thanksMessage, slug } = await request.json();

    if (!pageId || !recipientName || !slug) {
      return NextResponse.json(
        { error: 'pageId, recipientName, and slug are required' },
        { status: 400 }
      );
    }

    // Use service role to look up creator's email from auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get creator_id from the page
    const { data: pageData, error: pageError } = await supabaseAdmin
      .from('pages')
      .select('creator_id')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData?.creator_id) {
      console.error('Failed to look up page creator:', pageError);
      return NextResponse.json({ ok: true }); // Silently skip — don't block the user
    }

    // Get creator's email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      pageData.creator_id
    );

    if (userError || !userData?.user?.email) {
      console.error('Failed to look up creator email:', userError);
      return NextResponse.json({ ok: true }); // Silently skip
    }

    const creatorEmail = userData.user.email;
    const keepsakeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sendkindly-bice.vercel.app'}/p/${slug}/keepsake`;

    // Truncate preview to 200 chars
    const preview = thanksMessage
      ? thanksMessage.length > 200
        ? thanksMessage.slice(0, 200) + '...'
        : thanksMessage
      : 'They left a heartfelt message for you.';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #F6F2EC; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #C8A951 0%, #C0272D 100%); padding: 40px 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">💛</div>
          <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.3;">
            ${recipientName} left you a<br/>thank you message!
          </h1>
        </div>
        <div style="padding: 32px; text-align: center;">
          <div style="background: #FFFFFF; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #C8A951;">
            <p style="color: #5A4B45; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">
              &ldquo;${preview}&rdquo;
            </p>
            <p style="color: #5A4B45; opacity: 0.5; font-size: 13px; margin-top: 8px;">
              &mdash; ${recipientName}
            </p>
          </div>
          <a href="${keepsakeUrl}" style="display: inline-block; background: #C0272D; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; margin-bottom: 12px;">
            View Full Keepsake
          </a>
          <br/>
          <a href="${keepsakeUrl}" style="display: inline-block; background: #C8A951; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 50px; margin-top: 12px;">
            Download PDF
          </a>
          <p style="color: #5A4B45; opacity: 0.5; font-size: 12px; margin-top: 24px;">
            Made with 💛 on SendKindly
          </p>
        </div>
      </div>
    `;

    // Send thank you email to creator
    await sendEmail({
      to: creatorEmail,
      subject: `${recipientName} left you a thank you message! 💛`,
      html,
    });

    // Notify contributors who left their email
    const { data: contributors } = await supabaseAdmin
      .from('contributions')
      .select('contributor_name, contributor_email')
      .eq('page_id', pageId)
      .not('contributor_email', 'is', null);

    if (contributors && contributors.length > 0) {
      // Deduplicate by email (a contributor may have multiple contributions)
      const seen = new Set<string>();
      const unique = contributors.filter(c => {
        if (!c.contributor_email || seen.has(c.contributor_email)) return false;
        seen.add(c.contributor_email);
        return true;
      });

      for (const contrib of unique) {
        const contributorHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #F6F2EC; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #C8A951 0%, #C0272D 100%); padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">✨</div>
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.3;">
                ${recipientName} loved your<br/>contribution!
              </h1>
            </div>
            <div style="padding: 32px; text-align: center;">
              <p style="color: #5A4B45; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
                Hi ${contrib.contributor_name},
              </p>
              <p style="color: #5A4B45; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${recipientName} has seen their keepsake and left a heartfelt thank you. Your words made a difference!
              </p>
              <a href="${keepsakeUrl}" style="display: inline-block; background: #C0272D; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px;">
                View the Keepsake
              </a>
              <p style="color: #5A4B45; opacity: 0.5; font-size: 12px; margin-top: 24px;">
                Made with 💛 on SendKindly
              </p>
            </div>
          </div>
        `;

        // Fire-and-forget — don't block the response
        sendEmail({
          to: contrib.contributor_email!,
          subject: `✨ ${recipientName} loved your contribution!`,
          html: contributorHtml,
        }).catch(err => console.error('Contributor email failed:', err));
      }

      console.log(`[thanks-email] Notified ${unique.length} contributor(s)`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Thanks email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
