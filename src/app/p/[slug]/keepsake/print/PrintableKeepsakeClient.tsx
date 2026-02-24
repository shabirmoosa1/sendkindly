'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { PageData, Contribution, Reaction, ReactionCount } from '@/components/keepsake/types';
import A4Page from '@/components/keepsake/A4Page';
import CoverPage from '@/components/keepsake/CoverPage';
import FullPageFeature from '@/components/keepsake/FullPageFeature';
import TextNote from '@/components/keepsake/TextNote';
import PhotoUnit from '@/components/keepsake/PhotoUnit';
import BackPage from '@/components/keepsake/BackPage';

// --- Layout scoring ---

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function layoutScore(c: Contribution): number {
  let score = 0;
  if (c.photo_url) score += 100;
  score += wordCount(c.message_text);
  return score;
}

function layoutWeight(c: Contribution): number {
  if (c.photo_url) return 0.5;
  if (wordCount(c.message_text) > 120) return 0.45;
  return 0.28;
}

// --- Page grouping ---

interface ContentPage {
  contributions: Contribution[];
}

function groupIntoPages(contributions: Contribution[]): ContentPage[] {
  const pages: ContentPage[] = [];
  let current: Contribution[] = [];
  let weight = 0;

  for (const c of contributions) {
    const w = layoutWeight(c);
    if (weight + w > 0.92 && current.length > 0) {
      pages.push({ contributions: current });
      current = [c];
      weight = w;
    } else {
      current.push(c);
      weight += w;
    }
  }

  if (current.length > 0) {
    pages.push({ contributions: current });
  }

  return pages;
}

// --- Visitor ID for reactions ---

function getVisitorId(): string {
  const key = 'sk-visitor-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// --- Component ---

export default function PrintableKeepsakeClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionCount[]>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Load page data and contributions
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

      const sortedContribs = (contribs || []);
      setContributions(sortedContribs);

      // Load reactions (gracefully fail if table doesn't exist)
      try {
        const contribIds = sortedContribs.map(c => c.id);
        if (contribIds.length > 0) {
          const { data: reactionData } = await supabase
            .from('contribution_reactions')
            .select('*')
            .in('contribution_id', contribIds);

          if (reactionData) {
            const visitorId = getVisitorId();
            const grouped: Record<string, ReactionCount[]> = {};

            for (const contrib of sortedContribs) {
              const contribReactions = (reactionData as Reaction[]).filter(
                r => r.contribution_id === contrib.id
              );

              const emojiMap = new Map<string, { count: number; reacted: boolean }>();
              for (const r of contribReactions) {
                const existing = emojiMap.get(r.emoji) || { count: 0, reacted: false };
                existing.count++;
                if (r.reactor_name === visitorId) existing.reacted = true;
                emojiMap.set(r.emoji, existing);
              }

              grouped[contrib.id] = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
                emoji,
                count: data.count,
                reacted: data.reacted,
              }));
            }

            setReactions(grouped);
          }
        }
      } catch {
        // Table may not exist yet — reactions will just be empty
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  // Handle emoji reaction
  const handleReact = useCallback(async (contributionId: string, emoji: string) => {
    const visitorId = getVisitorId();

    // Optimistic update
    setReactions(prev => {
      const current = prev[contributionId] || [];
      const existing = current.find(r => r.emoji === emoji);

      if (existing?.reacted) {
        // Already reacted — remove
        return {
          ...prev,
          [contributionId]: current.map(r =>
            r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted: false } : r
          ).filter(r => r.count > 0 || r.emoji === emoji),
        };
      }

      // Add reaction
      if (existing) {
        return {
          ...prev,
          [contributionId]: current.map(r =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          ),
        };
      }

      return {
        ...prev,
        [contributionId]: [...current, { emoji, count: 1, reacted: true }],
      };
    });

    // Persist to DB
    try {
      const existingReaction = (reactions[contributionId] || []).find(
        r => r.emoji === emoji && r.reacted
      );

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('contribution_reactions')
          .delete()
          .eq('contribution_id', contributionId)
          .eq('emoji', emoji)
          .eq('reactor_name', visitorId);
      } else {
        // Add reaction
        await supabase
          .from('contribution_reactions')
          .insert({
            contribution_id: contributionId,
            reactor_name: visitorId,
            emoji,
          });
      }
    } catch {
      // Silently fail if table doesn't exist
    }
  }, [reactions]);

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

  // Sort by layout score (photos & long messages first)
  const sorted = [...contributions].sort((a, b) => layoutScore(b) - layoutScore(a));
  const featured = sorted[0] || null;
  const remaining = sorted.slice(1);
  const contentPages = groupIntoPages(remaining);

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

      {/* Featured contribution (full page) */}
      {featured && (
        <A4Page>
          <FullPageFeature contribution={featured} />
        </A4Page>
      )}

      {/* Content pages */}
      {contentPages.length > 0 ? (
        contentPages.map((cp, pageIndex) => (
          <A4Page key={pageIndex}>
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="columns-1 sm:columns-2 gap-5">
                {cp.contributions.map((c) => {
                  if (c.photo_url) {
                    return (
                      <PhotoUnit
                        key={c.id}
                        contribution={c}
                        reactions={reactions[c.id] || []}
                        onReact={handleReact}
                      />
                    );
                  }
                  return (
                    <TextNote
                      key={c.id}
                      contribution={c}
                      reactions={reactions[c.id] || []}
                      onReact={handleReact}
                    />
                  );
                })}
              </div>
            </div>
          </A4Page>
        ))
      ) : (
        /* No contributions beyond the featured one */
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

      {/* Back Page */}
      <A4Page>
        <BackPage page={page} contributions={contributions} />
      </A4Page>
    </div>
  );
}
