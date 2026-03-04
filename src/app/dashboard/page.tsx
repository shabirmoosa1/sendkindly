'use client';

/**
 * Dashboard — "My Celebrations"
 *
 * Lists all celebration pages the logged-in user has created.
 * Cards show status, contribution count, and expand to reveal
 * sharing tools (WhatsApp, Email, Copy, QR) and reveal actions.
 *
 * Tabs: Active (draft/active/revealed) | Archived (thanked/complete)
 * Status flow: draft → active → revealed → thanked → complete
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import { getShareUrl } from '@/lib/getShareUrl';
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

type FilterTab = 'active' | 'archived';

export default function DashboardPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [revealCopiedSlug, setRevealCopiedSlug] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ slug: string; recipientName: string } | null>(null);
  const [revealModal, setRevealModal] = useState<Page | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealToast, setRevealToast] = useState<string | null>(null);
  const [revealEmail, setRevealEmail] = useState('');
  const [revealPhase, setRevealPhase] = useState<'confirm' | 'success'>('confirm');
  const [revealEmailSent, setRevealEmailSent] = useState(false);
  const [revealLinkCopied, setRevealLinkCopied] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Page | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // ─── Sharing helpers ───────────────────────────────────────

  /** Build the full invite message text for a page */
  const getInviteMessage = (page: Page) => {
    const url = getShareUrl(`/p/${page.slug}`);
    const occasion = page.template_type === 'other' ? '' : `${formatOccasion(page.template_type)} `;
    return `Hey! We're putting together a special keepsake for ${page.recipient_name}'s ${occasion}celebration. Would you add a message, photo, or memory?\n\n${url}`;
  };

  /** Copy the full invite message (not just URL) to clipboard */
  const copyInviteMessage = async (page: Page) => {
    const message = getInviteMessage(page);
    await copyToClipboard(message);
    setCopiedSlug(page.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  /** Open WhatsApp with a pre-composed invite. Uses wa.me which works on all platforms. */
  const shareOnWhatsApp = (page: Page) => {
    const text = getInviteMessage(page);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  /** Open email compose — tries mailto: first, falls back to Gmail web compose */
  const shareViaEmail = (page: Page) => {
    const url = getShareUrl(`/p/${page.slug}`);
    const occasion = page.template_type === 'other' ? '' : `${formatOccasion(page.template_type)} `;
    const subject = `Help celebrate ${page.recipient_name}! Add your message`;
    const body = `Hi!\n\nWe're putting together a special keepsake for ${page.recipient_name}'s ${occasion}celebration. Would you add a message, photo, or memory?\n\nHere's the link:\n${url}\n\nThanks!`;
    // Use Gmail web compose (more reliable than mailto: across all platforms)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  // ─── Status helpers ────────────────────────────────────────

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'draft':    return 'bg-cocoa/10 text-cocoa';
      case 'active':   return 'bg-cocoa/10 text-cocoa';
      case 'revealed': return 'bg-gold/15 text-gold';
      case 'thanked':  return 'bg-crimson/15 text-crimson';
      case 'complete': return 'bg-green-100 text-green-700';
      default:         return 'bg-cocoa/10 text-cocoa';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':    return '○ DRAFT';
      case 'active':   return '● ACTIVE';
      case 'revealed': return '✨ REVEALED';
      case 'thanked':  return '💛 THANKED';
      case 'complete': return '✓ COMPLETE';
      default:         return status.toUpperCase();
    }
  };

  // ─── Actions ───────────────────────────────────────────────

  const handleRevealConfirm = async () => {
    if (!revealModal) return;
    setRevealing(true);

    const emailTrimmed = revealEmail.trim();

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: revealModal.id,
          slug: revealModal.slug,
          recipientEmail: emailTrimmed || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Reveal error:', data);
        setRevealToast('Failed to reveal. Please try again.');
        setTimeout(() => setRevealToast(null), 3000);
        setRevealing(false);
        return;
      }

      setPages((prev) =>
        prev.map((p) => p.id === revealModal.id ? { ...p, status: 'revealed' } : p)
      );
      setRevealEmailSent(!!emailTrimmed);
      setRevealPhase('success');
    } catch (err) {
      console.error('Reveal network error:', err);
      setRevealToast('Network error. Please try again.');
      setTimeout(() => setRevealToast(null), 3000);
    }

    setRevealing(false);
  };

  const closeRevealModal = () => {
    setRevealModal(null);
    setRevealEmail('');
    setRevealPhase('confirm');
    setRevealEmailSent(false);
    setRevealLinkCopied(false);
  };

  const getRevealUrl = (slug: string) => getShareUrl(`/p/${slug}/keepsake?recipient=true`);

  const getRevealMessage = (recipientName: string, slug: string) => {
    const url = getRevealUrl(slug);
    return `🎁 ${recipientName}, you have a special surprise waiting! Open your keepsake:\n\n${url}`;
  };

  const shareRevealWhatsApp = (recipientName: string, slug: string) => {
    const text = getRevealMessage(recipientName, slug);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareRevealEmail = (recipientName: string, slug: string) => {
    const url = getRevealUrl(slug);
    const subject = `🎁 A special surprise is waiting for you, ${recipientName}!`;
    const body = `Hi ${recipientName}!\n\nSomeone who loves you has put together a special keepsake just for you. People who care about you have come together to share their heartfelt messages.\n\nOpen your surprise here:\n${url}\n\nMade with love on SendKindly`;
    const to = revealEmail.trim();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${encodeURIComponent(to)}` : ''}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const copyRevealLink = async (slug: string) => {
    if (!revealModal) return;
    const text = getRevealMessage(revealModal.recipient_name, slug);
    await copyToClipboard(text);
    setRevealLinkCopied(true);
    setTimeout(() => setRevealLinkCopied(false), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setDeleting(true);

    try {
      const res = await fetch('/api/delete-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: deleteModal.id }),
      });

      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== deleteModal.id));
        setRevealToast(`"${deleteModal.recipient_name}" celebration deleted`);
        setTimeout(() => setRevealToast(null), 3000);
      } else {
        const data = await res.json();
        console.error('Delete error:', data);
        setRevealToast('Failed to delete. Please try again.');
        setTimeout(() => setRevealToast(null), 3000);
      }
    } catch (err) {
      console.error('Delete network error:', err);
      setRevealToast('Network error. Please try again.');
      setTimeout(() => setRevealToast(null), 3000);
    }

    setDeleting(false);
    setDeleteModal(null);
  };

  // ─── Formatting helpers ────────────────────────────────────

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  // ─── Filtering ─────────────────────────────────────────────

  const filteredPages = pages.filter((page) => {
    if (filter === 'active') return ['draft', 'active', 'revealed'].includes(page.status);
    if (filter === 'archived') return ['thanked', 'complete'].includes(page.status);
    return true;
  });

  const activeCount = pages.filter((p) => ['draft', 'active', 'revealed'].includes(p.status)).length;
  const archivedCount = pages.filter((p) => ['thanked', 'complete'].includes(p.status)).length;

  // ─── Render ────────────────────────────────────────────────

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

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl italic">My Celebrations</h1>
          </div>
          <button onClick={() => router.push('/dashboard/create')} className="btn-primary flex items-center justify-center gap-2 shrink-0">
            <span className="text-lg">+</span> New Celebration
          </button>
        </div>

        {/* Filter tabs: Active / Archived */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'active' ? 'bg-crimson text-white ios-shadow' : 'glass text-cocoa hover:bg-white/60'}`}
          >
            Active{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'archived' ? 'bg-crimson text-white ios-shadow' : 'glass text-cocoa hover:bg-white/60'}`}
          >
            Archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
          </button>
        </div>

        {/* Empty state */}
        {filteredPages.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-5xl sm:text-6xl mb-4">{filter === 'active' ? '🎉' : '📦'}</div>
            <h2 className="text-xl sm:text-2xl italic mb-3">
              {filter === 'active' ? 'Create your first celebration!' : 'No archived celebrations yet'}
            </h2>
            <p className="text-cocoa mb-6">
              {filter === 'active'
                ? 'Start a page for someone special and invite friends to contribute.'
                : 'Celebrations move here once the recipient has sent their thank you.'}
            </p>
            {filter === 'active' && (
              <button onClick={() => router.push('/dashboard/create')} className="btn-primary">+ New Celebration</button>
            )}
          </div>
        )}

        {/* Celebration cards */}
        {filteredPages.length > 0 && (
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
                {/* Primary action */}
                <div className="px-6 pb-3">
                  <button onClick={() => router.push(`/p/${page.slug}/keepsake`)} className="w-full text-center py-2.5 rounded-full text-sm font-medium bg-crimson text-white transition-all hover:opacity-90">Open Keepsake →</button>
                </div>

                {/* Expand/collapse for tools */}
                <button
                  onClick={() => setExpandedSlug(expandedSlug === page.slug ? null : page.slug)}
                  className="w-full text-center text-xs text-cocoa/50 hover:text-cocoa py-3 transition-colors"
                >
                  {expandedSlug === page.slug ? 'Hide options ▲' : 'Options ▼'}
                </button>

                {expandedSlug === page.slug && (
                  <div className="mx-6 mb-6 pt-3 border-t border-gray-100 flex flex-col gap-3 animate-fade-in">
                    {/* Invite contributors — only for active pages */}
                    {['draft', 'active'].includes(page.status) && (
                      <div>
                        <p className="text-xs text-cocoa/60 mb-2">📨 Invite friends to contribute:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => shareOnWhatsApp(page)}
                            className="flex-1 text-center py-2.5 rounded-full text-sm font-medium border-2 border-green-500 text-green-600 hover:bg-green-50 transition-all"
                          >
                            WhatsApp
                          </button>
                          <button
                            onClick={() => shareViaEmail(page)}
                            className="flex-1 text-center py-2.5 rounded-full text-sm font-medium border-2 border-gold text-gold hover:bg-gold/5 transition-all"
                          >
                            ✉️ Email
                          </button>
                          <button
                            onClick={() => copyInviteMessage(page)}
                            className={`flex-1 text-center py-2.5 rounded-full text-sm font-medium border-2 transition-all ${copiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-cocoa/30 text-cocoa hover:border-cocoa/50'}`}
                          >
                            {copiedSlug === page.slug ? '✅ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* QR code — only for active pages */}
                    {['draft', 'active'].includes(page.status) && (
                      <button
                        onClick={() => setQrModal({ slug: page.slug, recipientName: page.recipient_name })}
                        className="w-full py-2.5 rounded-full text-sm font-medium border-2 border-cocoa/30 text-cocoa hover:border-cocoa transition-all"
                      >
                        📱 QR Code
                      </button>
                    )}
                    {/* Reveal — only when active with contributions */}
                    {page.status === 'active' && (page.contribution_count || 0) > 0 && (
                      <div>
                        <p className="text-xs text-cocoa/60 mb-1.5">🎁 Ready to deliver? Reveal to {page.recipient_name}:</p>
                        <button
                          onClick={() => setRevealModal(page)}
                          className="w-full py-2.5 rounded-full text-sm font-medium btn-gold"
                        >
                          Reveal to {page.recipient_name} 🎁
                        </button>
                      </div>
                    )}
                    {/* Copy reveal link — only after revealed */}
                    {['revealed', 'thanked', 'complete'].includes(page.status) && (
                      <div>
                        <p className="text-xs text-cocoa/60 mb-1.5">🎁 Send this to {page.recipient_name} — they&apos;ll see a surprise reveal</p>
                        <button
                          onClick={async () => {
                            const url = getShareUrl(`/p/${page.slug}/keepsake?recipient=true`);
                            await copyToClipboard(url);
                            setRevealCopiedSlug(page.slug);
                            setTimeout(() => setRevealCopiedSlug(null), 2000);
                          }}
                          className={`w-full py-2.5 rounded-full text-sm font-medium border-2 transition-all ${revealCopiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-espresso text-espresso hover:opacity-90'}`}
                        >
                          {revealCopiedSlug === page.slug ? '✅ Copied!' : '🎁 Copy Reveal Link'}
                        </button>
                      </div>
                    )}
                    {/* Delete celebration */}
                    <button
                      onClick={() => setDeleteModal(page)}
                      className="w-full py-2 rounded-full text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all mt-1"
                    >
                      🗑 Delete celebration
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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

      {/* Reveal Modal — two phases: confirm → success */}
      {revealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="glass rounded-3xl ios-shadow p-8 max-w-md w-full text-center animate-scale-in">
            {revealPhase === 'confirm' ? (
              <>
                <div className="text-5xl mb-4">🎁</div>
                <h3 className="text-xl italic mb-2">Ready to reveal this keepsake to {revealModal.recipient_name}?</h3>
                <p className="text-sm text-cocoa/70 mb-5">Once revealed, contributors can no longer add messages.</p>

                {/* Recipient email input */}
                <div className="text-left mb-6">
                  <label htmlFor="reveal-email" className="block text-sm font-medium text-espresso mb-1.5">
                    {revealModal.recipient_name}&apos;s email <span className="text-cocoa/50 font-normal">(optional)</span>
                  </label>
                  <input
                    id="reveal-email"
                    type="email"
                    value={revealEmail}
                    onChange={(e) => setRevealEmail(e.target.value)}
                    placeholder={`${revealModal.recipient_name.split(' ')[0].toLowerCase()}@example.com`}
                    className="w-full px-4 py-3 rounded-xl border border-cocoa/20 bg-white/80 text-espresso placeholder:text-cocoa/30 focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson/40 text-sm"
                  />
                  <p className="text-xs text-cocoa/50 mt-1.5">
                    {revealEmail.trim()
                      ? "We'll send them a beautiful reveal email with a link to their keepsake"
                      : "You can share the reveal link yourself via WhatsApp or copy"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeRevealModal}
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
                    {revealing ? 'Revealing...' : 'Reveal Now 🎁'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-xl italic mb-2">Keepsake revealed!</h3>

                {revealEmailSent ? (
                  <p className="text-sm text-green-600 font-medium mb-5">
                    ✅ Reveal email sent to {revealEmail.trim()}
                  </p>
                ) : (
                  <p className="text-sm text-cocoa/70 mb-5">
                    Share the reveal link with {revealModal.recipient_name}:
                  </p>
                )}

                {/* Share options */}
                <div className="flex flex-col gap-2.5 mb-6">
                  <button
                    onClick={() => shareRevealWhatsApp(revealModal.recipient_name, revealModal.slug)}
                    className="w-full py-2.5 rounded-full text-sm font-medium border-2 border-green-500 text-green-600 hover:bg-green-50 transition-all"
                  >
                    📱 Share via WhatsApp
                  </button>
                  <button
                    onClick={() => shareRevealEmail(revealModal.recipient_name, revealModal.slug)}
                    className="w-full py-2.5 rounded-full text-sm font-medium border-2 border-gold text-gold hover:bg-gold/5 transition-all"
                  >
                    ✉️ Share via Email
                  </button>
                  <button
                    onClick={() => copyRevealLink(revealModal.slug)}
                    className={`w-full py-2.5 rounded-full text-sm font-medium border-2 transition-all ${revealLinkCopied ? 'border-green-500 text-green-600' : 'border-cocoa/30 text-cocoa hover:border-cocoa/50'}`}
                  >
                    {revealLinkCopied ? '✅ Copied!' : '📋 Copy Reveal Link'}
                  </button>
                </div>

                <button
                  onClick={closeRevealModal}
                  className="w-full py-2.5 rounded-full text-sm font-medium bg-crimson text-white transition-all hover:opacity-90"
                >
                  Done ✨
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="glass rounded-3xl ios-shadow p-8 max-w-md w-full text-center animate-scale-in">
            <div className="text-5xl mb-4">🗑</div>
            <h3 className="text-xl italic mb-2">Delete &ldquo;{deleteModal.recipient_name}&rdquo; celebration?</h3>
            <p className="text-sm text-cocoa/70 mb-2">This will permanently delete:</p>
            <ul className="text-sm text-cocoa/70 mb-6 text-left max-w-[280px] mx-auto">
              <li>• All {deleteModal.contribution_count || 0} contributions</li>
              <li>• Photos and AI stickers</li>
              <li>• Thank you messages</li>
            </ul>
            <p className="text-xs text-red-500 font-medium mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border-2 border-cocoa/30 text-cocoa transition-all hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full text-sm font-medium bg-red-600 text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
