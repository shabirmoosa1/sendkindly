'use client';

/**
 * Contributor Page — `/p/[slug]`
 *
 * Public page where friends and family add messages, photos,
 * or AI stickers to a celebration. Includes:
 * - Photo upload with crop tool (react-easy-crop)
 * - Text message with AI-powered suggestions
 * - AI sticker generation (DALL-E 3)
 * - "My Contributions" section to review past submissions
 *
 * Locks after the page is revealed (status !== 'active').
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabase';
import { getCroppedImg, type CropArea } from '@/lib/cropImage';
import Navbar from '@/components/Navbar';

interface MyContribution {
  id: string;
  contributor_name: string;
  message_text: string | null;
  photo_url: string | null;
  ai_sticker_url: string | null;
  created_at: string;
}

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

type ContribType = 'photo' | 'note' | 'sticker' | null;

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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState(4 / 3);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [cropConfirmed, setCropConfirmed] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [lastContributionId, setLastContributionId] = useState<string | null>(null);

  // AI Sticker state
  const [stickerPrompt, setStickerPrompt] = useState('');
  const [stickerUrl, setStickerUrl] = useState<string | null>(null);
  const [generatingSticker, setGeneratingSticker] = useState(false);
  const [stickerError, setStickerError] = useState('');
  const [stickerLimitReached, setStickerLimitReached] = useState(false);
  const [stickerName, setStickerName] = useState('');

  // My Contributions state
  const [myContributions, setMyContributions] = useState<MyContribution[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const myContribsRef = useRef<HTMLDivElement>(null);

  const getMyContribIds = (pageId: string): string[] => {
    try {
      const raw = localStorage.getItem(`sk-my-contribs-${pageId}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const saveContribId = (pageId: string, contribId: string) => {
    const ids = getMyContribIds(pageId);
    if (!ids.includes(contribId)) {
      ids.push(contribId);
      localStorage.setItem(`sk-my-contribs-${pageId}`, JSON.stringify(ids));
    }
  };

  const removeContribId = (pageId: string, contribId: string) => {
    const ids = getMyContribIds(pageId).filter(id => id !== contribId);
    localStorage.setItem(`sk-my-contribs-${pageId}`, JSON.stringify(ids));
  };

  const fetchMyContributions = async (pageId: string) => {
    const ids = getMyContribIds(pageId);
    if (ids.length === 0) { setMyContributions([]); return; }
    const { data } = await supabase
      .from('contributions')
      .select('id, contributor_name, message_text, photo_url, ai_sticker_url, created_at')
      .in('id', ids)
      .order('created_at', { ascending: false });
    setMyContributions(data || []);
  };

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

      // Load my contributions from localStorage IDs
      fetchMyContributions(data.id);
    }
    loadPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (contribType === 'photo' && (!photoFile || !cropConfirmed)) {
      setError(photoFile ? 'Please confirm your crop first.' : 'Please select a photo.');
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
      saveContribId(page.id, insertData.id);
    }
    setSubmitted(true);
    setContribCount((c) => c + 1);
    setSubmitting(false);
    // Refresh my contributions list
    fetchMyContributions(page.id);
  };

  const onCropComplete = useCallback((_croppedArea: CropArea, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handlePhotoSelect = (file: File | null) => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    if (file) {
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setCropConfirmed(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropAspect(4 / 3);
    } else {
      setPhotoPreviewUrl(null);
    }
    setPhotoFile(file);
  };

  const handleConfirmCrop = async () => {
    if (!photoPreviewUrl || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const croppedFile = await getCroppedImg(photoPreviewUrl, croppedAreaPixels);
      setPhotoFile(croppedFile);
      setCropConfirmed(true);
    } catch (err) {
      console.error('Crop error:', err);
      setError('Failed to crop image. Please try again.');
    }
    setCropping(false);
  };

  const handleRecrop = () => {
    setCropConfirmed(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const resetForm = () => {
    setContribType(null);
    setContributorName('');
    setMessageText('');
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoCaption('');
    setCropConfirmed(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropAspect(4 / 3);
    setSubmitted(false);
    setError('');
    setStickerPrompt('');
    setStickerUrl(null);
    setStickerError('');
    setStickerLimitReached(false);
    setStickerName('');
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

  const generateSticker = async () => {
    if (!page || !stickerPrompt.trim()) return;
    setGeneratingSticker(true);
    setStickerError('');
    setStickerUrl(null);

    try {
      const res = await fetch('/api/generate-sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          prompt: stickerPrompt.trim(),
          pageSlug: page.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'limit_reached') {
          setStickerLimitReached(true);
        } else {
          setStickerError(data.error || 'Failed to generate sticker. Please try again.');
        }
        setGeneratingSticker(false);
        return;
      }

      setStickerUrl(data.imageUrl);
    } catch {
      setStickerError('Network error. Please check your connection.');
    }
    setGeneratingSticker(false);
  };

  const handleStickerSubmit = async () => {
    if (!page || !stickerUrl) return;
    setSubmitting(true);
    setError('');

    const { data: insertData, error: insertError } = await supabase
      .from('contributions')
      .insert({
        page_id: page.id,
        contributor_name: (stickerName.trim() || 'Anonymous'),
        ai_sticker_url: stickerUrl,
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
      saveContribId(page.id, insertData.id);
    }
    setSubmitted(true);
    setContribCount((c) => c + 1);
    setSubmitting(false);
    // Refresh my contributions list
    fetchMyContributions(page.id);
  };

  const handleEditSave = async (contrib: MyContribution) => {
    setSavingEdit(true);
    const { error } = await supabase
      .from('contributions')
      .update({
        contributor_name: editName.trim() || contrib.contributor_name,
        message_text: editMessage.trim() || null,
      })
      .eq('id', contrib.id);

    if (!error) {
      setMyContributions(prev => prev.map(c =>
        c.id === contrib.id
          ? { ...c, contributor_name: editName.trim() || c.contributor_name, message_text: editMessage.trim() || null }
          : c
      ));
      setEditingId(null);
    }
    setSavingEdit(false);
  };

  const handleDeleteOwn = async (contrib: MyContribution) => {
    if (!confirm(`Delete your ${contrib.photo_url ? 'photo' : contrib.ai_sticker_url ? 'sticker' : 'message'}? This cannot be undone.`)) return;
    if (!page) return;

    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', contrib.id);

    if (error) { console.error('Delete error:', error); return; }

    // Clean up storage files
    if (contrib.photo_url) {
      const urlParts = contrib.photo_url.split('/contributions/');
      if (urlParts.length > 1) {
        await supabase.storage.from('contributions').remove([urlParts[1]]);
      }
    }
    if (contrib.ai_sticker_url) {
      const urlParts = contrib.ai_sticker_url.split('/stickers/');
      if (urlParts.length > 1) {
        await supabase.storage.from('stickers').remove([urlParts[1]]);
      }
    }

    removeContribId(page.id, contrib.id);
    setMyContributions(prev => prev.filter(c => c.id !== contrib.id));
    setContribCount(c => Math.max(0, c - 1));
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

  // Block contributions after the keepsake has been revealed
  if (['revealed', 'thanked', 'complete'].includes(page.status)) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-6">
          <div className="glass rounded-3xl ios-shadow p-10 max-w-md text-center">
            <img src="/logo-cleaned.png" alt="SendKindly" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl italic mb-3">This keepsake has been delivered</h1>
            <p className="text-cocoa/70 text-sm">
              The contributions for {page.recipient_name} have been sealed and shared.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-6">

        {/* Kind Gesture Label */}
        <p className="text-center text-xs font-medium tracking-widest text-crimson/70 mb-4">A KIND GESTURE</p>

        {/* Hero Card */}
        <div className="glass rounded-3xl ios-shadow overflow-hidden mb-6">
          <div
            className="h-56 sm:h-64 flex items-end relative overflow-hidden"
            style={{
              background: page.hero_image_url
                ? `url(${page.hero_image_url}) center/cover`
                : 'linear-gradient(135deg, var(--gold) 0%, var(--crimson) 40%, var(--espresso) 100%)',
            }}
          >
            {!page.hero_image_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-15">
                <img src="/logo-cleaned.png" alt="" className="w-24 h-24" />
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
              <div className="mt-5 p-5 rounded-2xl glass border-l-4 border-crimson">
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
                    backgroundColor: ['#C8A951', '#F2C4CE', '#C0272D', '#C8CBE8'][i % 4],
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
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-crimson text-white flex items-center justify-center ios-shadow border-4 border-ivory">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            <h2 className="text-3xl italic mb-3">
              You&apos;re amazing! 🎉
            </h2>
            <p className="text-cocoa mb-2 max-w-[280px] mx-auto leading-relaxed">
              Your {contribType === 'photo' ? 'photo' : contribType === 'sticker' ? 'sticker' : 'message'} has been added to {page.recipient_name}&apos;s keepsake.
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
                    className="flex-1 bg-white/50 border-none rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-crimson/30 focus:outline-none"
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
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-crimson text-white disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
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

            {myContributions.length > 0 && (
              <button
                onClick={() => myContribsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-3 text-sm text-crimson hover:text-crimson/80 transition-colors cursor-pointer"
              >
                View my contributions ({myContributions.length}) ↓
              </button>
            )}
          </div>
        )}

        {/* Contribution Selection */}
        {!submitted && !contribType && (
          <>
            <h2 className="text-2xl italic mb-1">
              Add your message for {page.recipient_name}
            </h2>
            <p className="text-xs font-medium tracking-widest text-cocoa/50 mb-5">CHOOSE YOUR EXPRESSION</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => setContribType('photo')}
                className="glass rounded-2xl ios-shadow p-5 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all text-center active:scale-95"
              >
                <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">📷</span>
                <span className="font-semibold text-espresso text-sm sm:text-base">Add Photo</span>
                <span className="block text-xs text-cocoa/50 mt-1">Share a memory</span>
              </button>
              <button
                onClick={() => setContribType('note')}
                className="glass rounded-2xl ios-shadow p-5 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all text-center active:scale-95"
              >
                <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">✍️</span>
                <span className="font-semibold text-espresso text-sm sm:text-base">Write Note</span>
                <span className="block text-xs text-cocoa/50 mt-1">Send a message</span>
              </button>
              <div className="glass rounded-2xl p-5 sm:p-8 text-center opacity-50 relative">
                <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🎤</span>
                <span className="font-semibold text-espresso text-sm sm:text-base">Voice Note</span>
                <span className="block text-xs text-cocoa/50 mt-1">Coming soon</span>
              </div>
              <button
                onClick={() => setContribType('sticker')}
                className="glass rounded-2xl ios-shadow p-5 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all text-center active:scale-95"
              >
                <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🎨</span>
                <span className="font-semibold text-espresso text-sm sm:text-base">AI Sticker</span>
                <span className="block text-xs text-cocoa/50 mt-1">Create with AI</span>
              </button>
            </div>
          </>
        )}

        {/* Contribution Form — Photo / Note */}
        {!submitted && contribType && contribType !== 'sticker' && (
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
                    className="text-xs font-medium text-crimson hover:text-crimson/80 disabled:text-cocoa/40 disabled:cursor-not-allowed transition-colors"
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
                {/* File picker — only show when no photo selected yet */}
                {!photoPreviewUrl && (
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Choose Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                      className="w-full text-sm text-cocoa file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-crimson/10 file:text-crimson hover:file:bg-crimson/20"
                    />
                  </div>
                )}

                {/* Crop UI — shown after file selected, before crop confirmed */}
                {photoPreviewUrl && !cropConfirmed && (
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Frame Your Photo</label>
                    <p className="text-xs text-cocoa/60 mb-3">Drag to move, pinch or scroll to zoom</p>

                    {/* Cropper */}
                    <div className="relative h-[280px] rounded-xl overflow-hidden bg-espresso/10 mb-3">
                      <Cropper
                        image={photoPreviewUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={cropAspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        showGrid={false}
                        style={{
                          containerStyle: { borderRadius: '12px' },
                        }}
                      />
                    </div>

                    {/* Aspect ratio toggle */}
                    <div className="flex gap-2 mb-3">
                      {[
                        { label: 'Landscape', value: 4 / 3 },
                        { label: 'Square', value: 1 },
                        { label: 'Portrait', value: 3 / 4 },
                      ].map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setCropAspect(value)}
                          className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                            cropAspect === value
                              ? 'bg-crimson text-white'
                              : 'border-2 border-cocoa/20 text-cocoa hover:bg-cocoa/5'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Zoom slider */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs text-cocoa/60">🔍</span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-crimson"
                      />
                      <span className="text-xs text-cocoa/60">🔍+</span>
                    </div>

                    {/* Confirm / Change photo */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmCrop}
                        disabled={cropping}
                        className="flex-1 btn-primary"
                      >
                        {cropping ? 'Cropping...' : 'Confirm Crop ✅'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePhotoSelect(null)}
                        className="px-4 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/20 text-cocoa hover:bg-cocoa/5 transition-all"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Cropped preview — shown after crop confirmed */}
                {photoPreviewUrl && cropConfirmed && photoFile && (
                  <div className="mb-4">
                    <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Your Photo</label>
                    <div className="rounded-xl overflow-hidden bg-espresso/5 flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(photoFile)}
                        alt="Cropped preview"
                        className="max-h-[250px] object-contain rounded-xl"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRecrop}
                      className="mt-2 text-xs text-crimson hover:text-crimson/80 transition-colors cursor-pointer"
                    >
                      🔄 Re-crop
                    </button>
                  </div>
                )}

                {/* Caption — always visible when photo selected */}
                {photoPreviewUrl && (
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
                )}
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

        {/* AI Sticker Panel */}
        {!submitted && contribType === 'sticker' && (
          <div className="glass rounded-3xl ios-shadow p-6 animate-fade-in">
            <button
              onClick={() => { setContribType(null); setStickerError(''); setStickerUrl(null); setStickerPrompt(''); setStickerLimitReached(false); }}
              className="text-cocoa hover:text-espresso text-sm mb-4 block"
            >
              ← Back to options
            </button>

            <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-1">CREATE YOUR STICKER</p>
            <h2 className="text-xl italic mb-6">🎨 AI Sticker Generator</h2>

            {/* Limit reached banner */}
            {stickerLimitReached && (
              <div className="mb-6 p-4 rounded-2xl bg-gold/15 border border-gold/30">
                <p className="text-sm font-semibold text-espresso mb-1">All 5 free stickers used</p>
                <p className="text-xs text-cocoa">This page has used all 5 free stickers — ask the creator to upgrade to Premium for more.</p>
              </div>
            )}

            {!stickerLimitReached && !stickerUrl && (
              <>
                <div className="mb-3">
                  <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Describe Your Sticker</label>
                  <input
                    type="text"
                    value={stickerPrompt}
                    onChange={(e) => setStickerPrompt(e.target.value.slice(0, 150))}
                    placeholder="Describe your sticker..."
                    className="w-full input-warm"
                    disabled={generatingSticker}
                  />
                  <p className="text-xs text-cocoa/50 mt-1 text-right">{stickerPrompt.length}/150</p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    'Baby elephant with balloons 🐘',
                    'Fireworks saying CONGRATS 🎆',
                    'Teddy bear with birthday cake 🎂',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStickerPrompt(chip)}
                      disabled={generatingSticker}
                      className="text-xs px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-espresso hover:bg-gold/20 transition-colors disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {stickerError && (
                  <p className="text-red-500 text-sm mb-4">{stickerError}</p>
                )}

                {/* Generating state */}
                {generatingSticker && (
                  <div className="text-center py-10">
                    <div className="inline-block w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-4 mx-auto animate-pulse">
                      <span className="text-3xl">🎨</span>
                    </div>
                    <p className="text-sm font-semibold text-espresso mb-1">Creating your sticker...</p>
                    <p className="text-xs text-cocoa/60">This takes about 10 seconds</p>
                  </div>
                )}

                {!generatingSticker && (
                  <button
                    onClick={generateSticker}
                    disabled={!stickerPrompt.trim()}
                    className="w-full btn-gold"
                  >
                    Generate Sticker ✨
                  </button>
                )}
              </>
            )}

            {/* Sticker preview */}
            {stickerUrl && !stickerLimitReached && (
              <div className="animate-fade-in">
                <div className="flex justify-center mb-6">
                  <div className="glass rounded-2xl ios-shadow p-4 inline-block">
                    <img
                      src={stickerUrl}
                      alt="Generated sticker"
                      className="w-48 h-48 rounded-2xl object-cover"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Your Name (optional)</label>
                  <input
                    type="text"
                    value={stickerName}
                    onChange={(e) => setStickerName(e.target.value)}
                    placeholder="e.g., Aunt Priya"
                    className="w-full input-warm"
                  />
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStickerUrl(null); setStickerPrompt(''); }}
                    className="flex-1 py-3 rounded-full text-sm font-semibold border-2 border-cocoa/20 text-cocoa transition-all hover:bg-cocoa/5"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleStickerSubmit}
                    disabled={submitting}
                    className="flex-1 btn-primary"
                  >
                    {submitting ? 'Saving...' : 'Use This Sticker 🎉'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Contributions Section */}
        {myContributions.length > 0 && (
          <div ref={myContribsRef} className="mt-8">
            <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-3">✏️ MY CONTRIBUTIONS</p>
            <div className="flex flex-col gap-3">
              {myContributions.map((contrib) => (
                <div key={contrib.id} className="glass rounded-2xl ios-shadow p-4 animate-fade-in">
                  {editingId === contrib.id ? (
                    /* Edit Mode */
                    <div>
                      <div className="mb-3">
                        <label className="block text-xs text-cocoa/60 mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full input-warm text-sm"
                        />
                      </div>
                      {(contrib.message_text || (!contrib.photo_url && !contrib.ai_sticker_url)) && (
                        <div className="mb-3">
                          <label className="block text-xs text-cocoa/60 mb-1">Message</label>
                          <textarea
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value.slice(0, 500))}
                            rows={3}
                            className="w-full input-warm text-sm resize-none"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(contrib)}
                          disabled={savingEdit}
                          className="flex-1 py-2 rounded-full text-sm font-semibold bg-crimson text-white hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {savingEdit ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 rounded-full text-sm font-semibold border-2 border-cocoa/20 text-cocoa hover:bg-cocoa/5 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Photo or sticker thumbnail */}
                          {(contrib.photo_url || contrib.ai_sticker_url) && (
                            <img
                              src={contrib.photo_url || contrib.ai_sticker_url || ''}
                              alt=""
                              className="w-20 h-20 rounded-xl object-contain bg-espresso/5 mb-2"
                            />
                          )}
                          {/* Message */}
                          {contrib.message_text && (
                            <p className="text-sm text-espresso leading-relaxed mb-1">
                              &ldquo;{contrib.message_text}&rdquo;
                            </p>
                          )}
                          {/* Name + time */}
                          <p className="text-xs text-cocoa/60">
                            — {contrib.contributor_name} · {new Date(contrib.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Edit + Delete buttons */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(contrib.id);
                              setEditName(contrib.contributor_name);
                              setEditMessage(contrib.message_text || '');
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-cocoa/40 hover:text-crimson hover:bg-crimson/10 transition-colors text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteOwn(contrib)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-cocoa/40 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
