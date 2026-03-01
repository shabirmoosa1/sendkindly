import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI stickers are not available — API key not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { pageId, prompt, pageSlug } = body;

    if (!pageId || !prompt || !pageSlug) {
      return NextResponse.json(
        { error: 'pageId, prompt, and pageSlug are required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 503 }
      );
    }

    // Server-side Supabase client (service role for storage uploads)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check usage limit (20 per page)
    const { count, error: countError } = await supabaseAdmin
      .from('ai_sticker_usage')
      .select('*', { count: 'exact', head: true })
      .eq('page_id', pageId);

    if (countError) {
      console.error('Count query error:', countError);
      return NextResponse.json(
        { error: 'Failed to check sticker usage' },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: 'limit_reached' }, { status: 429 });
    }

    // Generate image with DALL-E 3
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stickerPrompt = `Cute cartoon sticker in a universal, globally-appealing kawaii illustration style. Vibrant colors, clean white background, no text or words. Do not assume any specific ethnicity or cultural context for people: ${prompt}`;

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: stickerPrompt,
      size: '1024x1024',
      n: 1,
    });

    const generatedUrl = imageResponse.data?.[0]?.url;
    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate sticker image' },
        { status: 500 }
      );
    }

    // Download the generated image
    const imageRes = await fetch(generatedUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: 'Failed to download generated image' },
        { status: 500 }
      );
    }
    const imageBlob = await imageRes.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${pageSlug}/${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('stickers')
      .upload(fileName, Buffer.from(imageBlob), {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to save sticker image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('stickers')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Record usage
    const { error: usageError } = await supabaseAdmin
      .from('ai_sticker_usage')
      .insert({
        page_id: pageId,
        prompt_text: prompt,
        image_url: publicUrl,
      });

    if (usageError) {
      console.error('Usage insert error:', usageError);
      // Non-fatal — sticker was generated successfully
    }

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (error) {
    console.error('Sticker generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sticker' },
      { status: 500 }
    );
  }
}
