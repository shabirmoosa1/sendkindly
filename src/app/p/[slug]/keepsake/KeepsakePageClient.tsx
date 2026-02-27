'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { shareOrCopy, openEmailShare } from '@/lib/share';
import Navbar from '@/components/Navbar';
import QRCodeModal from '@/components/QRCodeModal';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  creator_message: string | null;
  creator_name: string | null;
  status: string;
}

interface Contribution {
  id: string;
  contributor_name: string;
  message_text: string | null;
  photo_url: string | null;
  ai_sticker_url: string | null;
  recipient_reply: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  reply_text: string | null;
  reply_photo_url: string | null;
  created_at: string;
}

export default function KeepsakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isRecipient = searchParams.get('recipient') === 'true';

  const [page, setPage] = useState<PageData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [thanksMessage, setThanksMessage] = useState('');
  const [submittingThanks, setSubmittingThanks] = useState(false);
  const [thanksSent, setThanksSent] = useState(false);
  const [thanksData, setThanksData] = useState<{ message: string; created_at: string } | null>(null);
  const [voiceToast, setVoiceToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    async function loadData() {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (user && (pageData as any).creator_id === user.id) {
        setIsCreator(true);
      }

      const { data: contribs } = await supabase
        .from('contributions')
        .select('*')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: true });

      setContributions(contribs || []);

      const { data: replyData } = await supabase
        .from('recipient_replies')
        .select('*')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: false });

      setReplies(replyData || []);

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
    loadData();
  }, [slug]);

  // Detect mobile for share vs copy behavior
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  const handleShareContributorLink = async () => {
    if (!page) return;
    const url = `${window.location.origin}/p/${slug}`;
    const result = await shareOrCopy({
      title: `Help celebrate ${page.recipient_name}!`,
      text: `Add your message to ${page.recipient_name}'s ${formatOccasion(page.template_type)} celebration`,
      url,
    });
    if (result.copied) {
      setShareFeedback('✅ Link copied!');
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  const handleSendThanks = async () => {
    if (!page || !thanksMessage.trim()) return;
    setSubmittingThanks(true);

    try {
      const res = await fetch('/api/thanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          thanksMessage: thanksMessage.trim(),
          recipientName: page.recipient_name,
          slug,
        }),
      });

      if (res.ok) {
        setPage((prev) => prev ? { ...prev, status: 'thanked' } : prev);
        setThanksData({ message: thanksMessage.trim(), created_at: new Date().toISOString() });
        setThanksSent(true);

        // Send thanks email to creator (fire-and-forget)
        fetch('/api/email/thanks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: page.id,
            recipientName: page.recipient_name,
            thanksMessage: thanksMessage.trim(),
            slug,
          }),
        }).catch((err) => console.error('Thanks email failed:', err));

        setThanksMessage('');
      } else {
        console.error('Thanks API error:', await res.json());
      }
    } catch (err) {
      console.error('Thanks network error:', err);
    }

    setSubmittingThanks(false);
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const handleDeleteContribution = async (contrib: Contribution) => {
    if (!confirm(`Delete ${contrib.contributor_name}'s contribution? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', contrib.id);

    if (error) {
      console.error('Delete error:', error);
      alert('Failed to delete. Please try again.');
      return;
    }

    // Delete photo from storage if exists
    if (contrib.photo_url) {
      const urlParts = contrib.photo_url.split('/contributions/');
      if (urlParts.length > 1) {
        await supabase.storage.from('contributions').remove([urlParts[1]]);
      }
    }

    // Delete sticker from storage if exists
    if (contrib.ai_sticker_url) {
      const urlParts = contrib.ai_sticker_url.split('/stickers/');
      if (urlParts.length > 1) {
        await supabase.storage.from('stickers').remove([urlParts[1]]);
      }
    }

    setContributions((prev) => prev.filter((c) => c.id !== contrib.id));
  };

  const handleSaveContributionReply = async (contributionId: string) => {
    if (!inlineReplyText.trim()) return;
    setSavingReply(true);

    const { error } = await supabase
      .from('contributions')
      .update({ recipient_reply: inlineReplyText.trim() })
      .eq('id', contributionId);

    if (!error) {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, recipient_reply: inlineReplyText.trim() } : c
        )
      );
      setReplyingToId(null);
      setInlineReplyText('');
    }
    setSavingReply(false);
  };

  const bgColors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ede9fe', '#fee2e2', '#e0e7ff', '#ccfbf1'];

  const OCCASION_EMOJIS: Record<string, string> = {
    birthday: '🎂', wedding: '💒', baby_shower: '👶', graduation: '🎓',
    anniversary: '💕', farewell: '👋', get_well: '💐', thank_you: '🙏',
    work_anniversary: '🏆', retirement: '🌅', promotion: '🚀', new_job: '💼',
    memorial: '🕊️', other: '🎉',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <img src="/logo-cleaned.png" alt="SendKindly" className="w-16 h-16 mx-auto mb-4" />
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold mb-1 text-espresso">Preparing your keepsake...</p>
          <p className="text-sm text-cocoa/60">Gathering all the love in one place</p>
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

  // Access control: if page is 'active' (not yet revealed), show holding page
  // Creators can still see the full keepsake to manage it
  const isActiveHold = page.status === 'active' && !isCreator;

  if (isActiveHold) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-6">
          <div className="glass rounded-3xl ios-shadow p-10 max-w-md text-center">
            <div className="text-5xl mb-4">💛</div>
            <h1 className="text-2xl italic mb-3">This keepsake is still being prepared with love...</h1>
            <p className="text-cocoa/70 text-sm">Check back soon — something special is on its way!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero Banner */}
      <div
        className="relative h-48 sm:h-56 md:h-72 flex items-center justify-center overflow-hidden"
        style={{
          background: page.hero_image_url
            ? `url(${page.hero_image_url}) center/cover`
            : 'linear-gradient(135deg, var(--gold) 0%, var(--crimson) 40%, var(--espresso) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        {!page.hero_image_url && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 left-8 text-6xl">✨</div>
            <div className="absolute bottom-8 right-10 text-5xl">🎉</div>
            <div className="absolute top-12 right-20 text-4xl">💛</div>
          </div>
        )}
        <div className="relative z-10 text-center text-white px-6">
          <p className="text-[10px] font-medium tracking-[0.2em] opacity-60 mb-1">SENDKINDLY</p>
          <p className="text-xs font-medium tracking-widest opacity-90 mb-2">
            {page.template_type === 'other' ? 'A KEEPSAKE' : `${formatOccasion(page.template_type).toUpperCase()} KEEPSAKE`}
          </p>
          <h1 className="text-4xl md:text-5xl italic mb-3 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {page.recipient_name}
          </h1>
          <p className="text-sm opacity-90">
            {contributions.length} heartfelt {contributions.length === 1 ? 'message' : 'messages'} from people who care
          </p>
        </div>
      </div>

      {/* Contributions Grid */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Recipient's Thank You — shown when status is thanked/complete */}
        {thanksData && ['thanked', 'complete'].includes(page.status) && (
          <div className="max-w-[600px] mx-auto mb-10">
            <div className="glass rounded-2xl p-6 ios-shadow border-l-4 border-gold">
              <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">
                A MESSAGE FROM {page.recipient_name.toUpperCase()} 💛
              </p>
              <p className="text-gray-800 leading-relaxed italic text-lg break-words">
                &ldquo;{thanksData.message}&rdquo;
              </p>
              <p className="text-xs text-cocoa/40 mt-3">
                {new Date(thanksData.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        )}

        {/* Organizer's Message — pinned at top */}
        {page.creator_message && (
          <div className="max-w-[600px] mx-auto mb-10">
            <div className="glass rounded-2xl p-6 ios-shadow border-l-4 border-crimson">
              <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">
                {page.creator_name ? `${page.creator_name.toUpperCase()}'S MESSAGE` : 'A MESSAGE FROM THE ORGANIZER'}
              </p>
              <p className="text-gray-800 leading-relaxed italic text-lg break-words">
                &ldquo;{page.creator_message}&rdquo;
              </p>
            </div>
          </div>
        )}

        {contributions.length === 0 && (
          <div className="text-center py-12">
            {!page.creator_message && (
              <>
                <div className="text-5xl mb-4">💌</div>
                <h2 className="text-xl italic mb-2">No contributions yet</h2>
              </>
            )}
            <p className="text-cocoa mb-6">Share the link with friends and family to start collecting messages!</p>
            {isCreator && page.status !== 'revealed' && (
              <div className="flex flex-col sm:flex-row gap-3 max-w-[400px] mx-auto">
                <button
                  onClick={() => window.location.href = `/p/${slug}`}
                  className="flex-1 btn-primary"
                >
                  ✍️ Add Your Contribution
                </button>
                <button
                  onClick={handleShareContributorLink}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
                >
                  {shareFeedback || '📨 Share Link'}
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/40 text-cocoa hover:border-cocoa transition-all"
                >
                  📱 QR Code
                </button>
              </div>
            )}
          </div>
        )}

        {contributions.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {contributions.map((contrib, i) => (
              <div
                key={contrib.id}
                className="break-inside-avoid glass rounded-2xl p-6 ios-shadow"
                style={{ backgroundColor: bgColors[i % bgColors.length] }}
              >
                {contrib.ai_sticker_url && (
                  <div className="mb-4 flex flex-col items-center">
                    <img
                      src={contrib.ai_sticker_url}
                      alt={`AI sticker from ${contrib.contributor_name}`}
                      className="w-[200px] h-[200px] rounded-2xl object-cover"
                      loading="lazy"
                    />
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold/80">
                      ✨ AI-generated sticker
                    </span>
                  </div>
                )}

                {contrib.photo_url && !contrib.ai_sticker_url && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={contrib.photo_url}
                      alt={`From ${contrib.contributor_name}`}
                      className="w-full object-cover max-h-[300px]"
                      loading="lazy"
                    />
                  </div>
                )}

                {contrib.message_text && (
                  <p className="text-gray-800 leading-relaxed mb-4 break-words">
                    &ldquo;{contrib.message_text}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-espresso">
                      {contrib.contributor_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-espresso">
                      {contrib.contributor_name}
                    </span>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => handleDeleteContribution(contrib)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-cocoa/30 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                      title="Delete contribution"

                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Existing recipient reply */}
                {contrib.recipient_reply && (
                  <div className="mt-3 pt-3 border-t border-gray-200/60">
                    <p className="text-xs font-semibold text-cocoa/50 mb-1">
                      💛 {page.recipient_name}&apos;s reply
                    </p>
                    <p className="text-sm text-gray-700 italic break-words">
                      &ldquo;{contrib.recipient_reply}&rdquo;
                    </p>
                  </div>
                )}

                {/* Reply form — recipient only, when no reply yet */}
                {isRecipient && !isCreator && !contrib.recipient_reply && (
                  <div className="mt-3 pt-3 border-t border-gray-200/60">
                    {replyingToId === contrib.id ? (
                      <div className="animate-fade-in">
                        <textarea
                          value={inlineReplyText}
                          onChange={(e) => setInlineReplyText(e.target.value.slice(0, 200))}
                          placeholder={`Say thanks to ${contrib.contributor_name}...`}
                          rows={2}
                          className="w-full input-warm resize-none text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setReplyingToId(null); setInlineReplyText(''); }}
                            className="flex-1 py-1.5 rounded-full text-xs border border-gray-300 text-cocoa"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveContributionReply(contrib.id)}
                            disabled={savingReply || !inlineReplyText.trim()}
                            className="flex-1 py-1.5 rounded-full text-xs bg-crimson text-white disabled:opacity-50"
                          >
                            {savingReply ? 'Saving...' : 'Reply 💛'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingToId(contrib.id); setInlineReplyText(''); }}
                        className="text-xs text-crimson hover:text-crimson/80 font-medium transition-colors"
                      >
                        Reply to {contrib.contributor_name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Thank You Prompt — shown to recipients when status is 'revealed' */}
        {isRecipient && !isCreator && page.status === 'revealed' && !thanksSent && (
          <div className="mt-12 mb-10">
            <div className="max-w-[600px] mx-auto">
              <div className="glass rounded-3xl ios-shadow p-8 text-center border border-gold/30">
                <div className="text-4xl mb-3">💛</div>
                <h3 className="text-xl italic mb-2">Leave a thank you</h3>
                <p className="text-sm text-cocoa/70 mb-6">Your message will be shared with everyone who contributed</p>
                <textarea
                  value={thanksMessage}
                  onChange={(e) => setThanksMessage(e.target.value.slice(0, 500))}
                  placeholder="Write your thank you message..."
                  rows={4}
                  className="w-full input-warm resize-none mb-2 text-left"
                />
                <p className="text-xs text-cocoa/40 text-right mb-4">{thanksMessage.length}/500</p>
                <button
                  onClick={() => setVoiceToast(true)}
                  className="w-full py-2.5 rounded-full text-sm font-medium border-2 border-cocoa/20 text-cocoa/50 mb-3 transition-all"
                >
                  Record Voice Message 🎤
                </button>
                <button
                  onClick={handleSendThanks}
                  disabled={submittingThanks || !thanksMessage.trim()}
                  className="w-full py-3 rounded-full text-sm font-semibold bg-crimson text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {submittingThanks ? 'Sending...' : 'Send My Thanks 🎉'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thank You Success — confetti state */}
        {isRecipient && !isCreator && thanksSent && (
          <div className="mt-12 mb-10">
            <div className="max-w-[600px] mx-auto text-center" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="confetti-container">
                {[
                  { left: '10%', color: '#C8A951', delay: '0s' },
                  { left: '20%', color: '#C0272D', delay: '0.1s' },
                  { left: '30%', color: '#C8A951', delay: '0.2s' },
                  { left: '40%', color: '#F2C4CE', delay: '0s' },
                  { left: '50%', color: '#C0272D', delay: '0.3s' },
                  { left: '60%', color: '#C8A951', delay: '0.1s' },
                  { left: '70%', color: '#C8CBE8', delay: '0.2s' },
                  { left: '80%', color: '#C0272D', delay: '0s' },
                  { left: '90%', color: '#C8A951', delay: '0.3s' },
                  { left: '15%', color: '#F2C4CE', delay: '0.15s' },
                  { left: '45%', color: '#C0272D', delay: '0.25s' },
                  { left: '75%', color: '#C8CBE8', delay: '0.05s' },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: p.left,
                      backgroundColor: p.color,
                      animationDelay: p.delay,
                      animationDuration: `${1.2 + (i % 3) * 0.3}s`,
                    }}
                  />
                ))}
              </div>
              <div className="glass rounded-3xl ios-shadow p-8 animate-scale-in">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-xl italic mb-2">Your thanks has been sent!</h3>
                <p className="text-sm text-cocoa/70">Everyone who contributed will see your message</p>
              </div>
            </div>
          </div>
        )}

        {/* Creator View: Simplified tools — hidden after reveal */}
        {isCreator && !['revealed', 'thanked', 'complete'].includes(page.status) && (
          <div className="mt-16 mb-10">
            <div className="max-w-[600px] mx-auto">
              <div className="glass rounded-3xl ios-shadow p-6 text-center">
                <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">CREATOR TOOLS</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => window.location.href = `/p/${slug}`}
                    className="flex-1 py-3 rounded-full text-sm font-semibold btn-gold"
                  >
                    ✍️ Add Your Contribution
                  </button>
                  <button
                    onClick={handleShareContributorLink}
                    className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
                  >
                    {shareFeedback || '📨 Ask Others to Contribute'}
                  </button>
                  <button
                    onClick={() => setShowQR(true)}
                    className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/40 text-cocoa hover:border-cocoa transition-all"
                  >
                    📱 QR Code
                  </button>
                </div>
                {/* Desktop email option */}
                {!isMobile && (
                  <button
                    onClick={() => {
                      if (!page) return;
                      const url = `${window.location.origin}/p/${slug}`;
                      openEmailShare({
                        subject: `Help celebrate ${page.recipient_name}!`,
                        body: `Hi!\n\nI'm putting together a special keepsake for ${page.recipient_name}'s ${formatOccasion(page.template_type)} celebration. Would you add a message or photo?\n\nHere's the link: ${url}\n\nThanks!`,
                      });
                    }}
                    className="w-full mt-3 py-2 text-xs text-cocoa/50 hover:text-cocoa transition-colors"
                  >
                    ✉️ Or email this link to friends
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Replies Section — visible to everyone (read-only) */}
        {replies.length > 0 && !isCreator && (
          <div className="mt-16 mb-4">
            <div className="max-w-[600px] mx-auto text-center">
              <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-4">
                💛 {page.recipient_name.toUpperCase()}&apos;S REPLY
              </p>
              {replies.map((reply) => (
                <div key={reply.id} className="glass rounded-2xl ios-shadow p-6 mb-4">
                  <p className="text-cocoa italic break-words">&ldquo;{reply.reply_text}&rdquo;</p>
                  <p className="text-sm text-cocoa/60 mt-2">— {page.recipient_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contributor Conversion CTA */}
        {!isCreator && (
          <div className="mt-16 mb-8">
            <div className="max-w-[600px] mx-auto">
              <div className="bg-ivory rounded-3xl p-8 text-center border-2 border-crimson/20">
                <p className="text-lg italic text-espresso mb-4">
                  Want to create something this special for someone you love? 💛
                </p>
                <a
                  href="/dashboard"
                  className="inline-block btn-gold px-8 shadow-lg hover:scale-105 transition-transform"
                >
                  Create a free keepsake →
                </a>
                <p className="text-xs text-cocoa/50 mt-3">
                  Free to create · Takes 2 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          {contributions.length > 0 && ['thanked', 'complete'].includes(page.status) && (
            <a
              href={`/p/${slug}/keepsake/print`}
              className="inline-flex items-center gap-2 mb-4 px-5 py-2.5 rounded-full text-sm font-medium text-cocoa border border-cocoa/20 hover:bg-cocoa/5 transition-colors"
            >
              🖨️ Print Keepsake
            </a>
          )}
          {contributions.length > 0 && page.status === 'revealed' && (
            <span className="inline-flex items-center gap-2 mb-4 px-5 py-2.5 rounded-full text-sm font-medium text-cocoa/50 border border-cocoa/10 opacity-50 cursor-not-allowed">
              🖨️ Print unlocks after thank you
            </span>
          )}
          <p className="text-sm text-cocoa/60">
            Made with 💛 on <span className="font-semibold text-espresso">SendKindly</span>
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && page && (
        <QRCodeModal
          slug={slug}
          recipientName={page.recipient_name}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Voice Message Toast */}
      {voiceToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" onClick={() => setVoiceToast(false)}>
          <div className="glass rounded-2xl ios-shadow px-8 py-6 text-center max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-sm font-medium text-espresso mb-1">Coming soon in Premium</p>
            <p className="text-xs text-cocoa/60">Voice messages will be available in a future update</p>
            <button onClick={() => setVoiceToast(false)} className="mt-4 px-6 py-2 rounded-full text-xs font-medium border border-cocoa/20 text-cocoa">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
