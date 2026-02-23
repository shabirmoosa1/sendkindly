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
  const [occasion, setOccasion] = useState('');
  const [template, setTemplate] = useState('classic');
  const [creatorMessage, setCreatorMessage] = useState('');
  const [contributionPrompt, setContributionPrompt] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canProceedStep1 = recipientName.trim().length > 0 && occasion.length > 0;
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
      const fileExt = heroFile.name.split('.').pop();
      const fileName = `hero/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contributions')
        .upload(fileName, heroFile);

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

    router.push('/dashboard');
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
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-terracotta' : 'w-2 bg-gray-300'}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="card p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold mb-2">
                Who are we celebrating?
              </h1>
              <p className="text-cocoa mb-8">Tell us about the person and the moment.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-cocoa mb-2">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Grandma Sarah"
                  className="w-full input-warm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-cocoa mb-2">Occasion</label>
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
                  Your wish for {recipientName || 'them'} <span className="text-cocoa/50">(optional)</span>
                </label>
                <p className="text-xs text-cocoa/50 mb-2">Your personal message — shown to contributors and in the keepsake</p>
                <textarea
                  value={creatorMessage}
                  onChange={(e) => setCreatorMessage(e.target.value.slice(0, 500))}
                  placeholder={`e.g., ${occasion ? getPlaceholders(occasion).wish : 'Happy birthday! You mean the world to us.'}`}
                  rows={3}
                  className="w-full input-warm resize-none"
                />
                <p className="text-xs text-cocoa/50 text-right mt-1">{creatorMessage.length}/500</p>
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
                <p className="text-xs text-cocoa/50 text-right mt-1">{contributionPrompt.length}/200</p>
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
              <h1 className="text-3xl font-bold mb-2">
                Choose a look
              </h1>
              <p className="text-cocoa mb-8">Pick a style that fits the celebration.</p>

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
              <h1 className="text-3xl font-bold mb-2">
                Review & Create
              </h1>
              <p className="text-cocoa mb-8">Everything look good? Let&apos;s launch it!</p>

              <div className="rounded-2xl p-6 mb-8 bg-ivory">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-cocoa">Recipient</span>
                  <span className="font-semibold text-espresso">{recipientName}</span>
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
                    <span className="text-sm text-cocoa shrink-0">Your Wish</span>
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
