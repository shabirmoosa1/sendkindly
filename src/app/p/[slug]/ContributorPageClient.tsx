'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxWidth) {
        resolve(file);
        return;
      }
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  creator_message: string | null;
  creator_name: string | null;
  contribution_prompt: string | null;
  status: string;
}

type ContribType = 'photo' | 'note' | null;

export default function ContributorPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [contribCount, setContribCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [contribType, setContribType] = useState<ContribType>(null);
  const [contributorName, setContributorName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [lastContributionId, setLastContributionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(data);

      const { count } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', data.id);

      setContribCount(count || 0);
      setLoading(false);
    }
    loadPage();
  }, [slug]);

  const handleSubmit = async () => {
    if (!page) return;
    if (!contributorName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (contribType === 'note' && !messageText.trim()) {
      setError('Please write a message.');
      return;
    }
    if (contribType === 'photo' && !photoFile) {
      setError('Please select a photo.');
      return;
    }

    setSubmitting(true);
    setError('');

    if (contribType === 'photo' && photoFile && photoFile.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB. Please choose a smaller image.');
      setSubmitting(false);
      return;
    }

    let photoUrl: string | null = null;

    if (contribType === 'photo' && photoFile) {
      const resized = await resizeImage(photoFile);
      const fileExt = resized.name.split('.').pop();
      const fileName = `${page.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contributions')
        .upload(fileName, resized);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Failed to upload photo. Please try again.');
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('contributions')
        .getPublicUrl(fileName);

      photoUrl = urlData.publicUrl;
    }

    const { data: insertData, error: insertError } = await supabase
      .from('contributions')
      .insert({
        page_id: page.id,
        contributor_name: contributorName.trim(),
        message_text: contribType === 'note' ? messageText.trim() : (photoCaption.trim() || null),
        photo_url: photoUrl,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    if (insertData) {
      setLastContributionId(insertData.id);
    }
    setSubmitted(true);
    setContribCount((c) => c + 1);
    setSubmitting(false);
  };

  const resetForm = () => {
    setContribType(null);
    setContributorName('');
    setMessageText('');
    setPhotoFile(null);
    setPhotoCaption('');
    setSubmitted(false);
    setError('');
  };

  const fetchSuggestions = async () => {
    if (!page) return;

    const storageKey = `sk-suggest-${page.id}`;
    const used = parseInt(localStorage.getItem(storageKey) || '0', 10);
    if (used >= 3) return;

    setLoadingSuggestions(true);
    setSuggestionError('');
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: page.recipient_name,
          occasion: page.template_type,
          prompt: page.contribution_prompt || undefined,
        }),
      });
      if (!res.ok) {
        console.error('Suggest API returned', res.status);
        setSuggestionError(res.status === 503 ? 'AI suggestions are temporarily unavailable.' : 'Could not load suggestions. Please try again.');
        setLoadingSuggestions(false);
        return;
      }
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        localStorage.setItem(storageKey, String(used + 1));
      } else {
        setSuggestionError('Could not load suggestions. Please try again.');
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestionError('Network error. Please check your connection.');
    }
    setLoadingSuggestions(false);
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-5xl mb-4">✨</div>
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-espresso mb-1">Loading celebration...</p>
          <p className="text-sm text-cocoa/60">Just a moment</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl italic mb-2">Page not found</h1>
          <p className="text-cocoa">This celebration doesn&apos;t exist or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-[700px] mx-auto px-6 py-6">

        {/* Kind Gesture Label */}
        <p className="text-center text-xs font-medium tracking-widest text-terracotta/70 mb-4">A KIND GESTURE</p>

        {/* Hero Card */}
        <div className="glass rounded-3xl ios-shadow overflow-hidden mb-6">
          <div
            className="h-56 sm:h-64 flex items-end relative overflow-hidden"
            style={{
              background: page.hero_image_url
                ? `url(${page.hero_image_url}) center/cover`
                : 'linear-gradient(135deg, var(--gold) 0%, var(--terracotta) 40%, var(--espresso) 100%)',
            }}
          >
            {!page.hero_image_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-15">
                <span className="text-8xl">🎁</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/40 to-transparent" />
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-1">
              {page.template_type === 'other' ? 'CELEBRATION' : `${formatOccasion(page.template_type).toUpperCase()} CELEBRATION`}
            </p>
            <h1 className="text-3xl sm:text-4xl italic mb-2">
              {page.recipient_name}
            </h1>
            <p className="text-sm text-cocoa">
              {contribCount === 0
                ? '✨ Be the first to share a memory!'
                : `✨ ${contribCount} ${contribCount === 1 ? 'memory' : 'memories'} shared so far`}
            </p>

            {/* Organizer's Message */}
            {page.creator_message && (
              <div className="mt-5 p-5 rounded-2xl glass border-l-4 border-terracotta">
                <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-2">
                  {page.creator_name ? `${page.creator_name.toUpperCase()}'S MESSAGE` : 'A MESSAGE FROM THE ORGANIZER'}
                </p>
                <p className="text-base text-espresso leading-relaxed italic">
                  &ldquo;{page.creator_message}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions for contributors */}
        {page.contribution_prompt && !submitted && (
          <div className="rounded-2xl p-4 mb-6 bg-gold/10 border border-gold/20">
            <p className="text-sm text-cocoa">
              <span className="font-semibold text-gold">💡 </span>
              {page.contribution_prompt}
            </p>
          </div>
        )}

        {/* Success State */}
        {submitted && (
          <div className="relative glass rounded-3xl ios-shadow p-8 text-center animate-scale-in overflow-hidden">
            {/* Confetti */}
            <div className="confetti-container">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#C8A951', '#E5C467', '#B76E4C', '#FFD700'][i % 4],
                    animationDuration: `${2 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 0.8}s`,
                  }}
                />
              ))}
            </div>

            {/* Branded Logo with Checkmark */}
            <div className="relative inline-block mb-6 mt-4">
              <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-green-500 to-green-600 ios-shadow flex items-center justify-center">
                <span className="text-5xl">🌿</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center ios-shadow border-4 border-ivory">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            <h2 className="text-3xl italic mb-3">
              You&apos;re amazing! 🎉
            </h2>
            <p className="text-cocoa mb-2 max-w-[280px] mx-auto leading-relaxed">
              Your {contribType === 'photo' ? 'photo' : 'message'} has been added to {page.recipient_name}&apos;s keepsake.
            </p>
            <p className="text-sm text-cocoa/60 mb-8 max-w-[280px] mx-auto">
              They&apos;re going to love it 💛
            </p>

            {/* Optional email collection */}
            {!emailSaved && (
              <div className="mb-6 p-4 rounded-2xl bg-gold/10 border border-gold/20 text-left">
                <p className="text-sm font-semibold text-espresso mb-1">
                  Want to see the final keepsake?
                </p>
                <p className="text-xs text-cocoa mb-3">
                  Leave your email and we&apos;ll let you know when it&apos;s ready.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-white/50 border-none rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-terracotta/30 focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!contributorEmail.trim() || !lastContributionId) return;
                      const { error: emailError } = await supabase
                        .from('contributions')
                        .update({ contributor_email: contributorEmail.trim() })
                        .eq('id', lastContributionId);
                      if (!emailError) {
                        setEmailSaved(true);
                      }
                    }}
                    disabled={!contributorEmail.trim()}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-terracotta text-white disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {emailSaved && (
              <div className="mb-6 p-3 rounded-2xl bg-green-50 text-green-700 text-sm">
                We&apos;ll notify you when the keepsake is ready!
              </div>
            )}

            <button
              onClick={() => { resetForm(); setEmailSaved(false); setContributorEmail(''); setLastContributionId(null); }}
              className="w-full btn-primary"
            >
              Add Another Contribution
            </button>
          </div>
        )}

        {/* Contribution Selection */}
        {!submitted && !contribType && (
          <>
            <h2 className="text-2xl italic mb-1">
              Add your message for {page.recipient_name}
            </h2>
            <p className="text-xs font-medium tracking-widest text-cocoa/50 mb-5">CHOOSE YOUR EXPRESSION</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setContribType('photo')}
                className="glass rounded-2xl ios-shadow p-6 sm:p-8 hover:shadow-md transition-all text-center active:scale-95"
              >
                <span className="text-4xl block mb-3">📷</span>
                <span className="font-semibold text-espresso">Add Photo</span>
                <span className="block text-xs text-cocoa/50 mt-1">Share a memory</span>
              </button>
              <button
                onClick={() => setContribType('note')}
                className="glass rounded-2xl ios-shadow p-6 sm:p-8 hover:shadow-md transition-all text-center active:scale-95"
              >
                <span className="text-4xl block mb-3">✍️</span>
                <span className="font-semibold text-espresso">Write Note</span>
                <span className="block text-xs text-cocoa/50 mt-1">Send a message</span>
              </button>
            </div>
          </>
        )}

        {/* Contribution Form */}
        {!submitted && contribType && (
          <div className="glass rounded-3xl ios-shadow p-6 animate-fade-in">
            <button
              onClick={() => { setContribType(null); setError(''); }}
              className="text-cocoa hover:text-espresso text-sm mb-4 block"
            >
              ← Back to options
            </button>

            <h2 className="text-xl italic mb-6">
              {contribType === 'photo' ? '📷 Add a Photo' : '✍️ Write a Note'}
            </h2>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="e.g., Aunt Priya"
                className="w-full input-warm"
              />
            </div>

            {contribType === 'note' && (
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Your Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value.slice(0, 500))}
                  placeholder="Write something heartfelt..."
                  rows={5}
                  className="w-full input-warm resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={fetchSuggestions}
                    disabled={loadingSuggestions || parseInt(localStorage.getItem(`sk-suggest-${page.id}`) || '0', 10) >= 3}
                    className="text-xs font-medium text-terracotta hover:text-terracotta/80 disabled:text-cocoa/40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingSuggestions ? 'Thinking...' : 'Need inspiration? ✨'}
                  </button>
                  <p className="text-xs text-cocoa/60">{messageText.length}/500</p>
                </div>

                {suggestionError && (
                  <p className="mt-2 text-xs text-red-500">{suggestionError}</p>
                )}

                {suggestions.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setMessageText(s); setSuggestions([]); }}
                        className="text-left text-sm p-3 rounded-xl bg-gold/10 border border-gold/20 text-espresso hover:bg-gold/20 transition-colors break-words"
                      >
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {contribType === 'photo' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Choose Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-cocoa file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-terracotta/10 file:text-terracotta hover:file:bg-terracotta/20"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Caption (optional)</label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="e.g., Summer of '23!"
                    className="w-full input-warm"
                  />
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full btn-primary"
            >
              {submitting ? 'Sending...' : 'Send your love 💛'}
            </button>
          </div>
        )}

        {/* Navigation Link */}
        <div className="mt-8 mb-4">
          <a
            href={`/p/${slug}/keepsake`}
            className="block text-center py-3 rounded-full text-sm font-semibold border-2 border-gold text-gold transition-all hover:opacity-90"
          >
            View Keepsake
          </a>
        </div>
      </div>
    </div>
  );
}
