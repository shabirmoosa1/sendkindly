'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#faf8f5' }}>
      <div className="w-full max-w-[560px]">

        {/* Back Button */}
        <button
          onClick={() => step === 1 ? router.push('/dashboard') : setStep((step - 1) as Step)}
          className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          ← {step === 1 ? 'Dashboard' : 'Back'}
        </button>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? 'w-8' : 'w-2'}`}
              style={{ backgroundColor: s === step ? '#1e3a5f' : '#d1d5db' }}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
                Who are we celebrating?
              </h1>
              <p className="text-gray-500 mb-8">Tell us about the person and the moment.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Grandma Sarah"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800"
                  style={{ backgroundColor: '#faf8f5' }}
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 appearance-none"
                  style={{ backgroundColor: '#faf8f5' }}
                >
                  <option value="">Select an occasion</option>
                  {occasions.map((occ) => (
                    <option key={occ} value={occ}>{formatOccasion(occ)}</option>
                  ))}
                </select>
              </div>

              <p className="text-center text-xs tracking-widest text-gray-400 mb-6">
                ✨ SENDKINDLY REFINED SETUP ✨
              </p>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-40"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Next →
              </button>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
                Choose a look
              </h1>
              <p className="text-gray-500 mb-8">Pick a style that fits the celebration.</p>

              <div className="flex flex-col gap-3 mb-8">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      template === t.id ? 'shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      backgroundColor: t.color,
                      borderColor: template === t.id ? '#1e3a5f' : undefined,
                    }}
                  >
                    <span className="text-3xl shrink-0">{t.emoji}</span>
                    <div>
                      <span className="font-semibold text-sm block" style={{ color: '#1e3a5f' }}>{t.name}</span>
                      <span className="text-xs text-gray-500">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-40"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Next →
              </button>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
                Review & Create
              </h1>
              <p className="text-gray-500 mb-8">Everything look good? Let's launch it!</p>

              <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#faf8f5' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Recipient</span>
                  <span className="font-semibold" style={{ color: '#1e3a5f' }}>{recipientName}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Occasion</span>
                  <span className="font-semibold" style={{ color: '#1e3a5f' }}>{formatOccasion(occasion)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Style</span>
                  <span className="font-semibold" style={{ color: '#1e3a5f' }}>
                    {templates.find(t => t.id === template)?.name || template}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-60"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {submitting ? 'Creating...' : 'Create Celebration 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
