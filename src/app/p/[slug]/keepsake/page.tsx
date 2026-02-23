'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  creator_message: string | null;
  status: string;
}

interface Contribution {
  id: string;
  contributor_name: string;
  message_text: string | null;
  photo_url: string | null;
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

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [reminderCopied, setReminderCopied] = useState(false);
  const [contributorCopied, setContributorCopied] = useState(false);
  const [revealCopied, setRevealCopied] = useState(false);

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
      setLoading(false);
    }
    loadData();
  }, [slug]);

  const handleSendReply = async () => {
    if (!page || !replyText.trim()) return;
    setSubmittingReply(true);

    const { error } = await supabase
      .from('recipient_replies')
      .insert({
        page_id: page.id,
        reply_text: replyText.trim(),
      });

    if (!error) {
      setReplySent(true);
      setReplies((prev) => [
        { id: Date.now().toString(), reply_text: replyText.trim(), reply_photo_url: null, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setReplyText('');
    }
    setSubmittingReply(false);
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const bgColors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ede9fe', '#fee2e2', '#e0e7ff', '#ccfbf1'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-5xl mb-4">🎁</div>
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
          <h1 className="text-2xl font-bold">Page not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero Banner */}
      <div
        className="relative h-72 flex items-center justify-center overflow-hidden"
        style={{
          background: page.hero_image_url
            ? `url(${page.hero_image_url}) center/cover`
            : 'linear-gradient(135deg, var(--gold) 0%, var(--terracotta) 40%, var(--espresso) 100%)',
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
          <p className="text-sm font-semibold tracking-widest opacity-90 mb-2">
            {formatOccasion(page.template_type).toUpperCase()} CELEBRATION
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            For {page.recipient_name}
          </h1>
          <p className="text-sm opacity-90">
            {contributions.length} heartfelt {contributions.length === 1 ? 'message' : 'messages'} from people who care
          </p>
        </div>
      </div>

      {/* Contributions Grid */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Organizer's Wish — pinned at top */}
        {page.creator_message && (
          <div className="max-w-[600px] mx-auto mb-10">
            <div className="rounded-2xl p-6 ios-shadow border-l-4 border-terracotta bg-white">
              <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-3">
                THE ORGANIZER&apos;S WISH
              </p>
              <p className="text-gray-800 leading-relaxed italic text-lg">
                &ldquo;{page.creator_message}&rdquo;
              </p>
            </div>
          </div>
        )}

        {contributions.length === 0 && !page.creator_message && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💌</div>
            <h2 className="text-xl font-bold mb-2">
              No contributions yet
            </h2>
            <p className="text-cocoa">Share the link with friends and family to start collecting messages!</p>
          </div>
        )}

        {contributions.length === 0 && page.creator_message && (
          <div className="text-center py-8">
            <p className="text-cocoa">Share the link with friends and family to start collecting messages!</p>
          </div>
        )}

        {contributions.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {contributions.map((contrib, i) => (
              <div
                key={contrib.id}
                className="break-inside-avoid rounded-2xl p-6 ios-shadow border border-gray-100"
                style={{ backgroundColor: bgColors[i % bgColors.length] }}
              >
                {contrib.photo_url && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={contrib.photo_url}
                      alt={`From ${contrib.contributor_name}`}
                      className="w-full object-cover max-h-[300px]"
                    />
                  </div>
                )}

                {contrib.message_text && (
                  <p className="text-gray-800 leading-relaxed mb-4">
                    &ldquo;{contrib.message_text}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-espresso">
                    {contrib.contributor_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-espresso">
                    {contrib.contributor_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creator View: Share & Manage */}
        {isCreator && (
          <div className="mt-16 mb-10">
            <div className="max-w-[600px] mx-auto space-y-4">
              <div className="card p-6 text-center">
                <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-3">CREATOR TOOLS</p>

                {/* Navigation — primary next steps */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    onClick={() => window.location.href = `/p/${slug}`}
                    className="flex-1 py-3 rounded-full text-sm font-semibold btn-gold"
                  >
                    ✍️ Add Your Contribution
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex-1 py-3 rounded-full text-white text-sm font-semibold bg-terracotta transition-all hover:opacity-90"
                  >
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <p className="text-sm font-semibold text-espresso mb-4">
                    Share links
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs text-cocoa/70 mb-1.5">Send this to friends &amp; family so they can add messages and photos</p>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/p/${slug}`;
                          navigator.clipboard.writeText(url);
                          setContributorCopied(true);
                          setTimeout(() => setContributorCopied(false), 2000);
                        }}
                        className="w-full py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
                      >
                        {contributorCopied ? '✅ Copied!' : '🔗 Copy Contributor Link'}
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-cocoa/70 mb-1.5">Send this to {page.recipient_name} — opens with a surprise envelope animation</p>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/p/${slug}/reveal`;
                          navigator.clipboard.writeText(url);
                          setRevealCopied(true);
                          setTimeout(() => setRevealCopied(false), 2000);
                        }}
                        className="w-full py-3 rounded-full text-sm font-semibold border-2 border-espresso text-espresso transition-all hover:opacity-90"
                      >
                        {revealCopied ? '✅ Copied!' : '🎁 Copy Reveal Link'}
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-cocoa/70 mb-1.5">Copy a ready-made reminder to nudge people who haven&apos;t contributed yet</p>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/p/${slug}`;
                          const message = `Hey! Don't forget to add your message for ${page.recipient_name}'s ${formatOccasion(page.template_type)} celebration: ${url}`;
                          navigator.clipboard.writeText(message);
                          setReminderCopied(true);
                          setTimeout(() => setReminderCopied(false), 2000);
                        }}
                        className="w-full py-3 rounded-full text-sm font-semibold border-2 border-terracotta text-terracotta transition-all hover:opacity-90"
                      >
                        {reminderCopied ? '✅ Copied!' : '📋 Copy Reminder Message'}
                      </button>
                    </div>
                  </div>
                </div>
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
                <div key={reply.id} className="card p-6 mb-4">
                  <p className="text-cocoa italic">&ldquo;{reply.reply_text}&rdquo;</p>
                  <p className="text-sm text-cocoa/60 mt-2">— {page.recipient_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipient-Only: Say Thanks Form (only shows with ?recipient=true) */}
        {isRecipient && !isCreator && (
          <div className="mt-8 mb-10">
            <div className="max-w-[600px] mx-auto text-center">
              {!showReplyForm && !replySent && (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="btn-gold shadow-lg transition-all hover:scale-105"
                >
                  💛 Say Thanks to Everyone
                </button>
              )}

              {showReplyForm && !replySent && (
                <div className="card p-6 text-left animate-fade-in">
                  <h3 className="text-lg font-bold mb-4">
                    Say thanks to everyone
                  </h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                    placeholder="Thank you all so much..."
                    rows={4}
                    className="w-full input-warm resize-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReplyForm(false)}
                      className="flex-1 py-2 rounded-full border border-gray-300 text-cocoa text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={submittingReply || !replyText.trim()}
                      className="flex-1 py-2 rounded-full text-white text-sm font-semibold bg-terracotta disabled:opacity-50"
                    >
                      {submittingReply ? 'Sending...' : 'Send Reply 💛'}
                    </button>
                  </div>
                </div>
              )}

              {replySent && (
                <div className="card p-6 animate-scale-in">
                  <div className="text-4xl mb-2">💛</div>
                  <p className="font-semibold text-espresso">Your thanks has been sent!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-cocoa/60">
            Made with 💛 on <span className="font-semibold text-espresso">SendKindly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
