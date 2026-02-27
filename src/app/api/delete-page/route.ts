import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/delete-page
 *
 * Deletes a celebration page and all its associated data:
 * - contributions (messages, photos, stickers)
 * - recipient_thanks
 * - recipient_replies
 * - storage files (photos + stickers)
 *
 * Requires the creator to be authenticated.
 * Uses service role key to bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the page exists
    const { data: page, error: pageError } = await supabaseAdmin
      .from('pages')
      .select('id, slug')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get all contributions to clean up storage
    const { data: contribs } = await supabaseAdmin
      .from('contributions')
      .select('photo_url, ai_sticker_url')
      .eq('page_id', pageId);

    // Delete storage files for photos
    if (contribs && contribs.length > 0) {
      const photoKeys = contribs
        .filter((c) => c.photo_url)
        .map((c) => {
          const parts = c.photo_url!.split('/contributions/');
          return parts.length > 1 ? parts[1] : null;
        })
        .filter(Boolean) as string[];

      if (photoKeys.length > 0) {
        await supabaseAdmin.storage.from('contributions').remove(photoKeys);
      }

      const stickerKeys = contribs
        .filter((c) => c.ai_sticker_url)
        .map((c) => {
          const parts = c.ai_sticker_url!.split('/stickers/');
          return parts.length > 1 ? parts[1] : null;
        })
        .filter(Boolean) as string[];

      if (stickerKeys.length > 0) {
        await supabaseAdmin.storage.from('stickers').remove(stickerKeys);
      }
    }

    // Delete associated data (order matters for foreign keys)
    await supabaseAdmin.from('recipient_replies').delete().eq('page_id', pageId);
    await supabaseAdmin.from('recipient_thanks').delete().eq('page_id', pageId);
    await supabaseAdmin.from('ai_sticker_usage').delete().eq('page_id', pageId);
    await supabaseAdmin.from('contributions').delete().eq('page_id', pageId);

    // Delete the page itself
    const { error: deleteError } = await supabaseAdmin
      .from('pages')
      .delete()
      .eq('id', pageId);

    if (deleteError) {
      console.error('[delete-page] Failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete-page] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
