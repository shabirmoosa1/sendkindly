'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
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
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Preparing your keepsake...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Page not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f5' }}>

      {/* Hero Banner */}
      <div
        className="relative h-72 flex items-center justify-center"
        style={{
          background: page.hero_image_url
            ? `url(${page.hero_image_url}) center/cover`
            : 'linear-gradient(135deg, #c9a961 0%, #1e3a5f 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center text-white px-6">
          <p className="text-sm font-semibold tracking-widest opacity-80 mb-2">
            {formatOccasion(page.template_type).toUpperCase()} CELEBRATION
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            For {page.recipient_name}
          </h1>
          <p className="text-sm opacity-80">
            {contributions.length} heartfelt {contributions.length === 1 ? 'message' : 'messages'} from people who care
          </p>
        </div>
      </div>

      {/* Contributions Grid */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {contributions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💌</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
              No contributions yet
            </h2>
            <p className="text-gray-500">Share the link with friends and family to start collecting messages!</p>
          </div>
        )}

        {contributions.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {contributions.map((contrib, i) => (
              <div
                key={contrib.id}
                className="break-inside-avoid rounded-xl p-6 shadow-sm border border-gray-100"
                style={{ backgroundColor: bgColors[i % bgColors.length] }}
              >
                {/* Photo */}
                {contrib.photo_url && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={contrib.photo_url}
                      alt={`From ${contrib.contributor_name}`}
                      className="w-full object-cover"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                {/* Message */}
                {contrib.message_text && (
                  <p className="text-gray-800 leading-relaxed mb-4">
                    &ldquo;{contrib.message_text}&rdquo;
                  </p>
                )}

                {/* Name */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    {contrib.contributor_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>
                    {contrib.contributor_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Say Thanks Section */}
        <div className="mt-16 mb-10">
          <div className="max-w-[600px] mx-auto text-center">

            {/* Existing Replies */}
            {replies.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">
                  💛 {page.recipient_name.toUpperCase()}&apos;S REPLY
                </p>
                {replies.map((reply) => (
                  <div key={reply.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-4">
                    <p className="text-gray-700 italic">&ldquo;{reply.reply_text}&rdquo;</p>
                    <p className="text-sm text-gray-400 mt-2">— {page.recipient_name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {!showReplyForm && !replySent && (
              <button
                onClick={() => setShowReplyForm(true)}
                className="px-8 py-3 rounded-full text-white font-semibold shadow-lg transition-all hover:scale-105"
                style={{ backgroundColor: '#c9a961' }}
              >
                💛 Say Thanks to Everyone
              </button>
            )}

            {showReplyForm && !replySent && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#1e3a5f' }}>
                  Say thanks to everyone
                </h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                  placeholder="Thank you all so much..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none mb-4"
                  style={{ backgroundColor: '#faf8f5' }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReplyForm(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={submittingReply || !replyText.trim()}
                    className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    {submittingReply ? 'Sending...' : 'Send Reply 💛'}
                  </button>
                </div>
              </div>
            )}

            {replySent && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-4xl mb-2">💛</div>
                <p className="font-semibold" style={{ color: '#1e3a5f' }}>Your thanks has been sent!</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            Made with 💛 on <span className="font-semibold" style={{ color: '#1e3a5f' }}>SendKindly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
