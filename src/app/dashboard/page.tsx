'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import Navbar from '@/components/Navbar';
import QRCodeModal from '@/components/QRCodeModal';

interface Page {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  status: string;
  is_premium: boolean;
  created_at: string;
  contribution_count?: number;
}

type FilterTab = 'all' | 'active' | 'completed';

export default function DashboardPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [revealCopiedSlug, setRevealCopiedSlug] = useState<string | null>(null);
  const [reminderCopiedSlug, setReminderCopiedSlug] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ slug: string; recipientName: string } | null>(null);
  const [revealModal, setRevealModal] = useState<Page | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealToast, setRevealToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: pagesData, error } = await supabase
        .from('pages')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pages:', error);
        setLoading(false);
        return;
      }

      // Show pages immediately (with 0 counts) for fast load
      const pagesWithZero = (pagesData || []).map((p) => ({ ...p, contribution_count: 0 }));
      setPages(pagesWithZero);
      setLoading(false);

      // Then load counts in parallel (non-blocking)
      if (pagesData && pagesData.length > 0) {
        const counts = await Promise.all(
          pagesData.map(async (page) => {
            const { count } = await supabase
              .from('contributions')
              .select('*', { count: 'exact', head: true })
              .eq('page_id', page.id);
            return { id: page.id, count: count || 0 };
          })
        );
        setPages((prev) =>
          prev.map((p) => {
            const found = counts.find((c) => c.id === p.id);
            return found ? { ...p, contribution_count: found.count } : p;
          })
        );
      }
    }
    loadData();
  }, [router]);

  const copyShareLink = async (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    await copyToClipboard(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'collecting': return 'bg-cocoa/10 text-cocoa';
      case 'active': return 'bg-cocoa/10 text-cocoa';
      case 'revealed': return 'bg-gold/15 text-gold';
      case 'thanked': return 'bg-crimson/15 text-crimson';
      case 'complete': return 'bg-green-100 text-green-700';
      case 'locked': return 'bg-crimson/15 text-crimson';
      case 'shared': return 'bg-green-100 text-green-700';
      default: return 'bg-cocoa/10 text-cocoa';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collecting': return '● COLLECTING';
      case 'active': return '● COLLECTING';
      case 'revealed': return '✨ REVEALED';
      case 'thanked': return '💛 THANKED';
      case 'complete': return '✓ COMPLETE';
      case 'locked': return '◉ FINALIZING';
      case 'shared': return '✓ DELIVERED';
      case 'draft': return '○ DRAFT';
      default: return status.toUpperCase();
    }
  };

  const handleRevealConfirm = async () => {
    if (!revealModal) return;
    setRevealing(true);

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: revealModal.id,
          slug: revealModal.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Reveal error:', data);
        setRevealToast('Failed to reveal. Please try again.');
        setTimeout(() => setRevealToast(null), 3000);
      } else {
        setPages((prev) =>
          prev.map((p) => p.id === revealModal.id ? { ...p, status: 'revealed' } : p)
        );
        setRevealToast(`Keepsake revealed! ${revealModal.recipient_name} has been notified ✨`);
        setTimeout(() => setRevealToast(null), 3500);
      }
    } catch (err) {
      console.error('Reveal network error:', err);
      setRevealToast('Network error. Please try again.');
      setTimeout(() => setRevealToast(null), 3000);
    }

    setRevealing(false);
    setRevealModal(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const filteredPages = pages.filter((page) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['draft', 'collecting', 'locked', 'active', 'revealed'].includes(page.status);
    if (filter === 'completed') return ['shared', 'thanked', 'complete'].includes(page.status);
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <img src="/logo-cleaned.png" alt="SendKindly" className="w-16 h-16 mx-auto mb-4" />
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-espresso mb-1">Loading your celebrations...</p>
          <p className="text-sm text-cocoa/60">Getting everything ready</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium tracking-widest text-cocoa/50 mb-1">OWNER STUDIO</p>
            <h1 className="text-3xl sm:text-4xl italic">My Celebrations</h1>
          </div>
          <button onClick={() => router.push('/dashboard/create')} className="btn-primary flex items-center justify-center gap-2 shrink-0">
            <span className="text-lg">+</span> New Celebration
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {(['all', 'active', 'completed'] as FilterTab[]).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === tab ? 'bg-crimson text-white ios-shadow' : 'glass text-cocoa hover:bg-white/60'}`}>
              {tab === 'all' ? 'All Projects' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {filteredPages.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl italic mb-3">{filter === 'all' ? 'Create your first celebration!' : `No ${filter} celebrations yet`}</h2>
            <p className="text-cocoa mb-6">Start a page for someone special and invite friends to contribute.</p>
            <button onClick={() => router.push('/dashboard/create')} className="btn-primary">+ New Celebration</button>
          </div>
        )}

        {filteredPages.length > 0 && (
          <>
            <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-4">ACTIVE CELEBRATIONS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {filteredPages.map((page) => (
                <div key={page.id} className="glass rounded-3xl ios-shadow hover:shadow-md transition-shadow">
                  {/* Clickable card header — opens keepsake */}
                  <div
                    className="p-6 pb-0 cursor-pointer"
                    onClick={() => router.push(`/p/${page.slug}/keepsake`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-espresso">{page.recipient_name}</h3>
                        <p className="text-sm text-cocoa">{page.template_type === 'other' ? 'Celebration' : `${formatOccasion(page.template_type)} Celebration`}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusStyle(page.status)}`}>{getStatusLabel(page.status)}</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-cocoa/60 mb-1.5">
                        <span>✨ {page.contribution_count || 0} contributions</span>
                        <span className="text-gold font-semibold">{formatDate(page.created_at)}</span>
                      </div>
                      <div className="h-1.5 bg-cocoa/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full transition-all"
                          style={{ width: `${Math.min(((page.contribution_count || 0) / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => copyShareLink(page.slug)} className={`flex-1 text-center py-2.5 rounded-full text-sm font-medium border-2 transition-all ${copiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-gold text-gold'}`}>
                      {copiedSlug === page.slug ? '✅ Copied!' : '🔗 Share Link'}
                    </button>
                    <button onClick={() => router.push(`/p/${page.slug}/keepsake`)} className="flex-1 text-center py-2.5 rounded-full text-sm font-medium bg-crimson text-white transition-all hover:opacity-90">Open Keepsake →</button>
                  </div>
                  {/* Reveal button — only when active with contributions */}
                  {(page.status === 'active' || page.status === 'collecting') && (page.contribution_count || 0) > 0 && (
                    <div className="px-6 pb-6">
                      <button
                        onClick={() => setRevealModal(page)}
                        className="w-full text-center py-2.5 rounded-full text-sm font-medium btn-gold"
                      >
                        Reveal to {page.recipient_name} 🎁
                      </button>
                    </div>
                  )}
                  {!((page.status === 'active' || page.status === 'collecting') && (page.contribution_count || 0) > 0) && (
                    <div className="pb-3" />
                  )}

                  {/* Expand/collapse for reveal + reminder links */}
                  <button
                    onClick={() => setExpandedSlug(expandedSlug === page.slug ? null : page.slug)}
                    className="w-full text-center text-xs text-cocoa/50 hover:text-cocoa py-3 transition-colors"
                  >
                    {expandedSlug === page.slug ? 'Hide options ▲' : 'More options ▼'}
                  </button>

                  {expandedSlug === page.slug && (
                    <div className="mx-6 mb-6 pt-3 border-t border-gray-100 flex flex-col gap-3 animate-fade-in">
                      <div>
                        <p className="text-xs text-cocoa/60 mb-1.5">🎁 Share this with {page.recipient_name} — they&apos;ll see a surprise envelope reveal</p>
                        <button
                          onClick={async () => {
                            const url = `${window.location.origin}/p/${page.slug}/reveal`;
                            await copyToClipboard(url);
                            setRevealCopiedSlug(page.slug);
                            setTimeout(() => setRevealCopiedSlug(null), 2000);
                          }}
                          className={`w-full py-2.5 rounded-full text-sm font-medium border-2 transition-all ${revealCopiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-espresso text-espresso hover:opacity-90'}`}
                        >
                          {revealCopiedSlug === page.slug ? '✅ Copied!' : '🎁 Copy Reveal Link'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-cocoa/60 mb-1.5">Nudge people who haven&apos;t contributed yet</p>
                        <button
                          onClick={async () => {
                            const url = `${window.location.origin}/p/${page.slug}`;
                            const message = `Hey! Don\u2019t forget to add your message for ${page.recipient_name}\u2019s ${formatOccasion(page.template_type)} celebration: ${url}`;
                            await copyToClipboard(message);
                            setReminderCopiedSlug(page.slug);
                            setTimeout(() => setReminderCopiedSlug(null), 2000);
                          }}
                          className={`w-full py-2.5 rounded-full text-sm font-medium border-2 transition-all ${reminderCopiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-crimson text-crimson hover:opacity-90'}`}
                        >
                          {reminderCopiedSlug === page.slug ? '✅ Copied!' : '📋 Copy Reminder Message'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-cocoa/60 mb-1.5">📱 Let guests scan to contribute at in-person events</p>
                        <button
                          onClick={() => setQrModal({ slug: page.slug, recipientName: page.recipient_name })}
                          className="w-full py-2.5 rounded-full text-sm font-medium border-2 border-cocoa/40 text-cocoa hover:border-cocoa hover:opacity-90 transition-all"
                        >
                          📱 Show QR Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="glass border-2 border-dashed border-crimson/20 rounded-3xl p-8 text-center cursor-pointer hover:border-crimson/40 transition-colors" onClick={() => router.push('/dashboard/create')}>
          <span className="text-3xl mb-2 block">✨</span>
          <p className="text-lg font-semibold text-espresso">Planning something new?</p>
          <p className="text-sm text-cocoa">Start a collaborative gift in seconds</p>
        </div>

        {/* Coming Soon Features */}
        <div className="mt-12 mb-4">
          <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-4">COMING IN FUTURE</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🎁', title: 'Group Gift Fund', desc: 'Pool money towards a gift together' },
              { icon: '👥', title: 'Co-Organizers', desc: 'Invite others to help manage' },
              { icon: '🎥', title: 'Video Messages', desc: 'Record video contributions' },
              { icon: '🔔', title: 'Notifications', desc: 'Get notified of new messages' },
            ].map((feature) => (
              <div key={feature.title} className="glass rounded-2xl p-4 text-center opacity-60">
                <span className="text-2xl block mb-2">{feature.icon}</span>
                <p className="text-sm font-semibold text-espresso">{feature.title}</p>
                <p className="text-xs text-cocoa/60 mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {qrModal && (
        <QRCodeModal
          slug={qrModal.slug}
          recipientName={qrModal.recipientName}
          onClose={() => setQrModal(null)}
        />
      )}

      {/* Reveal Confirmation Modal */}
      {revealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="glass rounded-3xl ios-shadow p-8 max-w-md w-full text-center animate-scale-in">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-xl italic mb-2">Ready to reveal this keepsake to {revealModal.recipient_name}?</h3>
            <p className="text-sm text-cocoa/70 mb-6">Contributors will be notified.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRevealModal(null)}
                disabled={revealing}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border-2 border-cocoa/30 text-cocoa transition-all hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={handleRevealConfirm}
                disabled={revealing}
                className="flex-1 py-2.5 rounded-full text-sm font-medium bg-crimson text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                {revealing ? 'Revealing...' : 'Reveal Now ✨'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal Toast */}
      {revealToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="glass rounded-2xl ios-shadow px-6 py-3 text-sm font-medium text-espresso">
            {revealToast}
          </div>
        </div>
      )}
    </div>
  );
}
