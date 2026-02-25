'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { PageData, Contribution } from '@/components/keepsake/types';
import A4Page from '@/components/keepsake/A4Page';
import CoverPage from '@/components/keepsake/CoverPage';
import TextNote from '@/components/keepsake/TextNote';
import PhotoUnit from '@/components/keepsake/PhotoUnit';
import StickerUnit from '@/components/keepsake/StickerUnit';
import BackPage from '@/components/keepsake/BackPage';

// --- Layout scoring ---

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function layoutScore(c: Contribution): number {
  let score = 0;
  if (c.photo_url || c.ai_sticker_url) score += 100;
  score += wordCount(c.message_text);
  return score;
}

function layoutWeight(c: Contribution): number {
  if (c.photo_url) return 0.20;
  if (c.ai_sticker_url) return 0.18; // stickers are slightly smaller than photos
  const wc = wordCount(c.message_text);
  if (wc > 120) return 0.24;
  if (wc > 60) return 0.18;
  return 0.13;
}

// --- Page grouping ---

interface ContentPage {
  contributions: Contribution[];
  weight: number;
}

function groupIntoPages(contributions: Contribution[]): ContentPage[] {
  const pages: ContentPage[] = [];
  let current: Contribution[] = [];
  let weight = 0;

  for (const c of contributions) {
    const w = layoutWeight(c);
    if (weight + w > 0.90 && current.length >= 3) {
      pages.push({ contributions: current, weight });
      current = [c];
      weight = w;
    } else {
      current.push(c);
      weight += w;
    }
  }

  if (current.length > 0) {
    pages.push({ contributions: current, weight });
  }

  return pages;
}

// --- Component ---

export default function PrintableKeepsakeClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [thanksData, setThanksData] = useState<{ message: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pageError || !pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData);

      const { data: contribs } = await supabase
        .from('contributions')
        .select('*')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: true });

      setContributions(contribs || []);

      // Load recipient thanks
      const { data: thanksRow } = await supabase
        .from('recipient_thanks')
        .select('message, created_at')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (thanksRow) {
        setThanksData(thanksRow);
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-5xl mb-4">🖨️</div>
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1 text-espresso">Preparing your printable keepsake...</p>
          <p className="text-sm text-cocoa/60">Laying out pages for printing</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl italic mb-2">Page not found</h1>
        </div>
      </div>
    );
  }

  // Gate: print only available after recipient has said thanks
  if (!['thanked', 'complete'].includes((page as any).status)) {
    return (
      <div className="min-h-screen bg-ivory">
        <div className="flex items-center justify-center min-h-[70vh] px-6">
          <div className="glass rounded-3xl ios-shadow p-10 max-w-md text-center">
            <div className="text-5xl mb-4">💛</div>
            <h1 className="text-2xl italic mb-3">Not ready to print yet</h1>
            <p className="text-cocoa/70 text-sm mb-6">
              This keepsake will be available to print after {page.recipient_name} leaves a thank you.
            </p>
            <a
              href={`/p/${slug}/keepsake`}
              className="inline-block btn-primary px-8"
            >
              ← Back to Keepsake
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Sort by layout score — top one goes on cover, rest into content pages
  const sorted = [...contributions].sort((a, b) => layoutScore(b) - layoutScore(a));
  const featured = sorted.length > 0 && layoutScore(sorted[0]) > 0 ? sorted[0] : null;
  const remaining = featured ? sorted.slice(1) : sorted;
  const contentPages = groupIntoPages(remaining);

  // Decide whether back page is inline on last content page or separate
  const lastPage = contentPages[contentPages.length - 1];
  const backPageInline = lastPage && lastPage.weight <= 0.80;

  return (
    <div className="keepsake-print-view bg-ivory min-h-screen pb-20 print:pb-0 print:bg-white">
      {/* Print button — fixed, hidden on print */}
      <button
        onClick={() => window.print()}
        className="no-print fixed bottom-6 right-6 z-50 btn-primary flex items-center gap-2 shadow-lg"
      >
        🖨️ Print / Save PDF
      </button>

      {/* Back to keepsake link */}
      <div className="no-print text-center pt-6 pb-2">
        <a
          href={`/p/${slug}/keepsake`}
          className="text-sm text-terracotta hover:underline"
        >
          ← Back to interactive keepsake
        </a>
      </div>

      {/* Cover Page */}
      <A4Page>
        <CoverPage page={page} contributionCount={contributions.length} />
      </A4Page>

      {/* Content pages */}
      {contentPages.length > 0 ? (
        contentPages.map((cp, pageIndex) => {
          const isLast = pageIndex === contentPages.length - 1;
          return (
            <A4Page key={pageIndex}>
              <div className="px-6 py-6 sm:px-10 sm:py-8">
                <div className="columns-1 sm:columns-2 gap-4">
                  {cp.contributions.map((c) => {
                    if (c.ai_sticker_url) {
                      return <StickerUnit key={c.id} contribution={c} />;
                    }
                    if (c.photo_url) {
                      return <PhotoUnit key={c.id} contribution={c} />;
                    }
                    return <TextNote key={c.id} contribution={c} />;
                  })}
                </div>

                {/* Inline back matter on last page if room */}
                {isLast && backPageInline && (
                  <>
                    <hr style={{ width: '60px', margin: '32px auto', border: 'none', borderTop: '1px solid #C8A951' }} />
                    <BackPage page={page} contributions={contributions} />
                  </>
                )}
              </div>
            </A4Page>
          );
        })
      ) : (
        /* No contributions at all */
        contributions.length === 0 && (
          <A4Page>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">💌</div>
                <p className="text-lg italic text-cocoa/60">No messages yet — share the link to start collecting!</p>
              </div>
            </div>
          </A4Page>
        )
      )}

      {/* WITH GRATITUDE — recipient's thank you message */}
      {thanksData && (
        <A4Page>
          <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
            <hr style={{ width: '60px', margin: '0 auto 32px', border: 'none', borderTop: '2px solid #C8A951' }} />
            <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-6">
              WITH GRATITUDE FROM {page.recipient_name.toUpperCase()}
            </p>
            <p className="text-lg italic text-espresso leading-relaxed max-w-md">
              &ldquo;{thanksData.message}&rdquo;
            </p>
            <p className="text-xs text-cocoa/40 mt-4">
              {new Date(thanksData.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <hr style={{ width: '60px', margin: '32px auto 0', border: 'none', borderTop: '2px solid #C8A951' }} />
          </div>
        </A4Page>
      )}

      {/* Separate back page if last content page was too full, or no content pages */}
      {(contentPages.length === 0 || !backPageInline) && contributions.length > 0 && (
        <A4Page>
          <div className="flex flex-col items-center justify-center h-full px-8 py-12">
            <BackPage page={page} contributions={contributions} />
          </div>
        </A4Page>
      )}
    </div>
  );
}
