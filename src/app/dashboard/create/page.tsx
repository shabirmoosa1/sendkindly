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

    const { error: insertError } = await supabase
      .from('pages')
      .insert({
        creator_id: user.id,
        slug,
        recipient_name: recipientName.trim(),
        template_type: occasion,
        creator_message: creatorMessage.trim() || null,
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

              <div className="mb-8">
                <label className="block text-sm font-medium text-cocoa mb-1">
                  Welcome note for contributors <span className="text-cocoa/50">(optional)</span>
                </label>
                <p className="text-xs text-cocoa/50 mb-2">Help friends understand why this celebration matters</p>
                <textarea
                  value={creatorMessage}
                  onChange={(e) => setCreatorMessage(e.target.value.slice(0, 500))}
                  placeholder="e.g., Grandma is turning 80 and we want to surprise her with messages from everyone who loves her!"
                  rows={3}
                  className="w-full input-warm resize-none"
                />
                <p className="text-xs text-cocoa/50 text-right mt-1">{creatorMessage.length}/500</p>
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

              <button
                onClick={() => setStep(3)}
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
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-cocoa shrink-0">Welcome Note</span>
                    <span className="text-sm text-espresso text-right ml-4 line-clamp-3">&ldquo;{creatorMessage.trim()}&rdquo;</span>
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
