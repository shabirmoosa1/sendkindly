import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Toggle a love on a contribution (insert or delete). */
export async function POST(request: NextRequest) {
  try {
    const { contributionId, visitorId } = await request.json();

    if (!contributionId || !visitorId) {
      return NextResponse.json(
        { error: 'contributionId and visitorId are required' },
        { status: 400 }
      );
    }

    // Check if already loved
    const { data: existing } = await supabaseAdmin
      .from('contribution_loves')
      .select('id')
      .eq('contribution_id', contributionId)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existing) {
      // Unlike — remove the love
      await supabaseAdmin
        .from('contribution_loves')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ loved: false });
    } else {
      // Love it
      const { error } = await supabaseAdmin
        .from('contribution_loves')
        .insert({ contribution_id: contributionId, visitor_id: visitorId });

      if (error) {
        console.error('[love] Insert failed:', error);
        return NextResponse.json(
          { error: 'Failed to save love', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ loved: true });
    }
  } catch (error) {
    console.error('[love] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Get love counts + visitor's loves for a set of contributions. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');
    const visitorId = searchParams.get('visitorId');

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Get all contribution IDs for this page
    const { data: contribs } = await supabaseAdmin
      .from('contributions')
      .select('id')
      .eq('page_id', pageId);

    if (!contribs || contribs.length === 0) {
      return NextResponse.json({ loves: {} });
    }

    const contribIds = contribs.map((c) => c.id);

    // Get all loves for these contributions
    const { data: allLoves } = await supabaseAdmin
      .from('contribution_loves')
      .select('contribution_id, visitor_id')
      .in('contribution_id', contribIds);

    // Build counts + visitor's loves
    const counts: Record<string, number> = {};
    const visitorLoved: Record<string, boolean> = {};

    for (const love of allLoves || []) {
      counts[love.contribution_id] = (counts[love.contribution_id] || 0) + 1;
      if (visitorId && love.visitor_id === visitorId) {
        visitorLoved[love.contribution_id] = true;
      }
    }

    return NextResponse.json({ loves: counts, visitorLoved });
  } catch (error) {
    console.error('[love] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
