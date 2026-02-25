import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { pageId, thanksMessage, recipientName, slug } = await request.json();

    if (!pageId || !thanksMessage || !recipientName || !slug) {
      return NextResponse.json(
        { error: 'pageId, thanksMessage, recipientName, and slug are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert into recipient_thanks
    const { error: insertError } = await supabaseAdmin
      .from('recipient_thanks')
      .insert({
        page_id: pageId,
        message: thanksMessage,
      });

    if (insertError) {
      console.error('[thanks] Insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to save thank you message', details: insertError.message },
        { status: 500 }
      );
    }

    // Update page status to 'thanked'
    const { error: updateError } = await supabaseAdmin
      .from('pages')
      .update({ status: 'thanked', thanked_at: new Date().toISOString() })
      .eq('id', pageId);

    if (updateError) {
      console.error('[thanks] Status update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update page status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[thanks] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
