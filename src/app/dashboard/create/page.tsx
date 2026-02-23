'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

type Step = 1 | 2 | 3;

const occasions = [
  'birthday', 'wedding', 'baby_shower', 'graduation',
  'farewell', 'memorial', 'thank_you',
  'work_anniversary', 'retirement', 'promotion', 'new_job',
  'other'
];

const templates = [
  { id: 'classic', name: 'Classic', desc: 'Clean and elegant', emoji: '✨', color: '#f8f6f3' },
  { id: 'playful', name: 'Playful', desc: 'Colorful and fun', emoji: '🎨', color: '#fef3c7' },
  { id: 'memorial', name: 'Memorial', desc: 'Dark and respectful', emoji: '🕊️', color: '#e2e8f0' },
];

const OCCASION_PLACEHOLDERS: Record<string, { wish: string; instructions: string }> = {
  birthday: {
    wish: 'Happy 80th birthday Grandma! You fill our lives with so much love and laughter.',
    instructions: 'Share your favorite memory with Grandma or tell her what she means to you!',
  },
  wedding: {
    wish: 'Congratulations on your beautiful wedding! Wishing you a lifetime of love.',
    instructions: 'Share your favorite moment with the couple or a piece of marriage advice!',
  },
  baby_shower: {
    wish: "So excited to meet your little one! You're going to be amazing parents.",
    instructions: 'Share your best parenting tip or a sweet wish for the baby!',
  },
  graduation: {
    wish: "Congratulations on your graduation! We're so proud of everything you've achieved.",
    instructions: 'Share a favorite school memory or words of encouragement for the future!',
  },
  farewell: {
    wish: "We'll miss you so much! Thank you for all the incredible memories.",
    instructions: 'Tell them what working together meant to you or share a favorite moment!',
  },
  memorial: {
    wish: 'Your light touched so many lives. We carry your memory with love.',
    instructions: 'Share a cherished memory or what they meant to you.',
  },
  thank_you: {
    wish: 'Thank you for everything you do. You make such a difference in our lives!',
    instructions: 'Share how they have helped or inspired you!',
  },
  work_anniversary: {
    wish: 'Happy work anniversary! Your dedication and contributions are truly valued.',
    instructions: 'Share a favorite work memory or what you appreciate about working with them!',
  },
  retirement: {
    wish: 'Happy retirement! Enjoy every moment of this exciting new chapter.',
    instructions: 'Share a work memory or your wishes for their retirement!',
  },
  promotion: {
    wish: 'Congratulations on your well-deserved promotion! So proud of you.',
    instructions: 'Share why they deserve this or a favorite work moment together!',
  },
  new_job: {
    wish: "Exciting new beginnings! You're going to do amazing things.",
    instructions: 'Share your wishes for their new journey or a favorite memory together!',
  },
  other: {
    wish: 'Thinking of you and wishing you all the best!',
    instructions: 'Share a memory, a wish, or something you appreciate about them!',
  },
};

function getPlaceholders(occ: string) {
  return OCCASION_PLACEHOLDERS[occ] || OCCASION_PLACEHOLDERS['other'];
}

/**
 * Resize an image file to max 1200px width, returns a compressed JPEG blob.
 * This prevents oversized hero images from causing slow loads.
 */
function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxWidth) {
        resolve(file); // already small enough
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

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [recipientName, setRecipientName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [template, setTemplate] = useState('classic');
  const [creatorMessage, setCreatorMessage] = useState('');
  const [contributionPrompt, setContributionPrompt] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // AI suggestion state for message and instructions
  const [messageSuggestions, setMessageSuggestions] = useState<string[]>([]);
  const [instructionSuggestions, setInstructionSuggestions] = useState<string[]>([]);
  const [loadingMessageAI, setLoadingMessageAI] = useState(false);
  const [loadingInstructionAI, setLoadingInstructionAI] = useState(false);

  const fetchMessageSuggestions = async () => {
    if (!recipientName.trim() || !occasion) return;
    setLoadingMessageAI(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          occasion,
          prompt: 'Write 3 short personal messages FROM an organizer TO the recipient for their celebration page. These are the organizer\'s own heartfelt wishes.',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setMessageSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      console.error('AI message suggestion error:', err);
    }
    setLoadingMessageAI(false);
  };

  const fetchInstructionSuggestions = async () => {
    if (!recipientName.trim() || !occasion) return;
    setLoadingInstructionAI(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          occasion,
          prompt: 'Write 3 short instruction prompts that an organizer would give to contributors, telling them what kind of messages to write. Each should be 1 sentence, like "Share your favorite memory with them!" or "Tell them what they mean to you!"',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setInstructionSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      console.error('AI instruction suggestion error:', err);
    }
    setLoadingInstructionAI(false);
  };

  const canProceedStep1 = recipientName.trim().length > 0 && creatorName.trim().length > 0 && occasion.length > 0;
  const canProceedStep2 = template.length > 0;

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const slug = generateSlug();

    let heroImageUrl: string | null = null;

    if (heroFile) {
      const resized = await resizeImage(heroFile);
      const fileExt = resized.name.split('.').pop();
      const fileName = `hero/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contributions')
        .upload(fileName, resized);

      if (uploadError) {
        console.error('Hero upload error:', uploadError);
        setError('Failed to upload cover image. Please try again.');
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('contributions')
        .getPublicUrl(fileName);

      heroImageUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase
      .from('pages')
      .insert({
        creator_id: user.id,
        creator_name: creatorName.trim(),
        slug,
        recipient_name: recipientName.trim(),
        template_type: occasion,
        creator_message: creatorMessage.trim() || null,
        contribution_prompt: contributionPrompt.trim() || null,
        hero_image_url: heroImageUrl,
        status: 'collecting',
      });

    if (insertError) {
      console.error('Error creating page:', insertError);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    router.push(`/p/${slug}`);
  };

  const formatOccasion = (occ: string) => {
    return occ.charAt(0).toUpperCase() + occ.slice(1).replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[560px]">

        {/* Back Button */}
        <button
          onClick={() => step === 1 ? router.push('/dashboard') : setStep((step - 1) as Step)}
          className="mb-6 text-cocoa hover:text-espresso transition-colors flex items-center gap-1"
        >
          ← {step === 1 ? 'Dashboard' : 'Back'}
        </button>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2.5 rounded-full transition-all ${s === step ? 'w-10 bg-terracotta' : s < step ? 'w-2.5 bg-gold' : 'w-2.5 bg-cocoa/20'}`}
            />
          ))}
        </div>

        {/* Step Label */}
        <p className="text-center text-xs font-medium tracking-widest text-cocoa/50 mb-4">STEP {step} OF 3</p>

        {/* Card */}
        <div className="glass rounded-3xl ios-shadow p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="text-3xl italic mb-2">
                Who are we celebrating?
              </h1>
              <p className="text-cocoa italic mb-8">Tell us about the person and the moment.</p>

              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Grandma Sarah"
                  className="w-full input-warm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="e.g., Shabir"
                  className="w-full input-warm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full input-warm appearance-none"
                >
                  <option value="">Select an occasion</option>
                  {occasions.map((occ) => (
                    <option key={occ} value={occ}>{formatOccasion(occ)}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-cocoa mb-1">
                  Your message for {recipientName || 'them'} <span className="text-cocoa/50">(optional)</span>
                </label>
                <p className="text-xs text-cocoa/50 mb-2">A personal message — shown to contributors and in the keepsake</p>
                <textarea
                  value={creatorMessage}
                  onChange={(e) => setCreatorMessage(e.target.value.slice(0, 500))}
                  placeholder={`e.g., ${occasion ? getPlaceholders(occasion).wish : 'Happy birthday! You mean the world to us.'}`}
                  rows={3}
                  className="w-full input-warm resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={fetchMessageSuggestions}
                    disabled={loadingMessageAI || !recipientName.trim() || !occasion}
                    className="text-xs font-medium text-terracotta hover:text-terracotta/80 disabled:text-cocoa/40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingMessageAI ? 'Thinking...' : 'Need inspiration? ✨'}
                  </button>
                  <p className="text-xs text-cocoa/50">{creatorMessage.length}/500</p>
                </div>
                {messageSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {messageSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setCreatorMessage(s); setMessageSuggestions([]); }}
                        className="text-left text-sm p-3 rounded-xl bg-gold/10 border border-gold/20 text-espresso hover:bg-gold/20 transition-colors break-words"
                      >
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-cocoa mb-1">
                  Instructions for contributors <span className="text-cocoa/50">(optional)</span>
                </label>
                <p className="text-xs text-cocoa/50 mb-2">Tell friends what kind of messages to write</p>
                <textarea
                  value={contributionPrompt}
                  onChange={(e) => setContributionPrompt(e.target.value.slice(0, 200))}
                  placeholder={`e.g., ${occasion ? getPlaceholders(occasion).instructions : 'Share your favorite memory or tell them what they mean to you!'}`}
                  rows={2}
                  className="w-full input-warm resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={fetchInstructionSuggestions}
                    disabled={loadingInstructionAI || !recipientName.trim() || !occasion}
                    className="text-xs font-medium text-terracotta hover:text-terracotta/80 disabled:text-cocoa/40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingInstructionAI ? 'Thinking...' : 'Suggest instructions ✨'}
                  </button>
                  <p className="text-xs text-cocoa/50">{contributionPrompt.length}/200</p>
                </div>
                {instructionSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {instructionSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setContributionPrompt(s.slice(0, 200)); setInstructionSuggestions([]); }}
                        className="text-left text-sm p-3 rounded-xl bg-gold/10 border border-gold/20 text-espresso hover:bg-gold/20 transition-colors break-words"
                      >
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full btn-primary"
              >
                Next →
              </button>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="text-3xl italic mb-2">
                Choose a look
              </h1>
              <p className="text-cocoa italic mb-8">Pick a style that fits the celebration.</p>

              <div className="flex flex-col gap-3 mb-8">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      template === t.id ? 'border-terracotta shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: t.color }}
                  >
                    <span className="text-3xl shrink-0">{t.emoji}</span>
                    <div>
                      <span className="font-semibold text-sm block text-espresso">{t.name}</span>
                      <span className="text-xs text-cocoa">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cover Image Upload */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-cocoa mb-1">
                  Cover Image <span className="text-cocoa/50">(optional)</span>
                </label>
                <p className="text-xs text-cocoa/50 mb-3">
                  Add a photo that represents this celebration
                </p>
                {heroPreview ? (
                  <div className="relative rounded-2xl overflow-hidden mb-3">
                    <img src={heroPreview} alt="Cover preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setHeroFile(null); setHeroPreview(null); }}
                      className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-espresso text-sm font-bold hover:bg-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          setError('Image must be under 5MB.');
                          return;
                        }
                        setError('');
                        setHeroFile(file);
                        setHeroPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-sm text-cocoa file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-terracotta/10 file:text-terracotta hover:file:bg-terracotta/20"
                  />
                )}
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>

              <button
                onClick={() => { setError(''); setStep(3); }}
                disabled={!canProceedStep2}
                className="w-full btn-primary"
              >
                Next →
              </button>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h1 className="text-3xl italic mb-2">
                Review & Create
              </h1>
              <p className="text-cocoa italic mb-8">Everything look good? Let&apos;s launch it!</p>

              <div className="glass rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-cocoa">Recipient</span>
                  <span className="font-semibold text-espresso">{recipientName}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-cocoa">Your Name</span>
                  <span className="font-semibold text-espresso">{creatorName}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-cocoa">Occasion</span>
                  <span className="font-semibold text-espresso">{formatOccasion(occasion)}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-cocoa">Style</span>
                  <span className="font-semibold text-espresso">
                    {templates.find(t => t.id === template)?.name || template}
                  </span>
                </div>
                {creatorMessage.trim() && (
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-cocoa shrink-0">Your Message</span>
                    <span className="text-sm text-espresso text-right ml-4 line-clamp-3">&ldquo;{creatorMessage.trim()}&rdquo;</span>
                  </div>
                )}
                {contributionPrompt.trim() && (
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-cocoa shrink-0">Instructions</span>
                    <span className="text-sm text-espresso text-right ml-4">&ldquo;{contributionPrompt.trim()}&rdquo;</span>
                  </div>
                )}
                {heroPreview && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-cocoa shrink-0">Cover Image</span>
                    <img src={heroPreview} alt="Cover" className="w-24 h-16 object-cover rounded-lg ml-4" />
                  </div>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full btn-primary"
              >
                {submitting ? 'Creating...' : 'Create Celebration 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
