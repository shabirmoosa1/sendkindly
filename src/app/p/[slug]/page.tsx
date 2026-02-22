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

    let photoUrl: string | null = null;

    if (contribType === 'photo' && photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${page.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contributions')
        .upload(fileName, photoFile);

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

    const { error: insertError } = await supabase
      .from('contributions')
      .insert({
        page_id: page.id,
        contributor_name: contributorName.trim(),
        message_text: contribType === 'note' ? messageText.trim() : (photoCaption.trim() || null),
        photo_url: photoUrl,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
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

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e3a5f' }}>Page not found</h1>
          <p className="text-gray-500">This celebration doesn&apos;t exist or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f5' }}>
      {/* Header */}
      <div className="text-center pt-6 pb-2">
        <span className="text-sm font-bold tracking-widest" style={{ color: '#1e3a5f' }}>SendKindly</span>
      </div>

      {/* Main Content */}
      <div className="max-w-[700px] mx-auto px-6 py-6">

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div
            className="h-48 flex items-end relative overflow-hidden"
            style={{
              background: page.hero_image_url
                ? `url(${page.hero_image_url}) center/cover`
                : 'linear-gradient(135deg, #c9a961 0%, #b76e4c 40%, #1e3a5f 100%)',
            }}
          >
            {/* Decorative elements when no image */}
            {!page.hero_image_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-15">
                <span className="text-8xl">🎁</span>
              </div>
            )}
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/30 to-transparent" />
          </div>
          <div className="p-6">
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">
              {formatOccasion(page.template_type).toUpperCase()} CELEBRATION
            </p>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
              For {page.recipient_name}
            </h1>
            <p className="text-sm text-gray-500">✨ {contribCount} memories shared so far</p>
          </div>
        </div>

        {/* Success State */}
        {submitted && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
              Your contribution has been added!
            </h2>
            <p className="text-gray-500 mb-6">
              {page.recipient_name} is going to love it.
            </p>
            <button
              onClick={resetForm}
              className="px-6 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{ borderColor: '#1e3a5f', color: '#1e3a5f' }}
            >
              Add Another
            </button>
          </div>
        )}

        {/* Contribution Selection */}
        {!submitted && !contribType && (
          <>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1e3a5f' }}>
              Add your contribution
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setContribType('photo')}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
              >
                <span className="text-4xl block mb-3">📷</span>
                <span className="font-semibold" style={{ color: '#1e3a5f' }}>Add Photo</span>
              </button>
              <button
                onClick={() => setContribType('note')}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
              >
                <span className="text-4xl block mb-3">✍️</span>
                <span className="font-semibold" style={{ color: '#1e3a5f' }}>Write Note</span>
              </button>
              <button
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center opacity-50 cursor-not-allowed"
              >
                <span className="text-4xl block mb-3">🎙️</span>
                <span className="font-semibold text-gray-400">Voice Note</span>
                <span className="block text-xs text-gray-400 mt-1">Coming soon</span>
              </button>
              <button
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center opacity-50 cursor-not-allowed"
              >
                <span className="text-4xl block mb-3">🎨</span>
                <span className="font-semibold text-gray-400">AI Sticker</span>
                <span className="block text-xs text-gray-400 mt-1">Coming soon</span>
              </button>
            </div>
          </>
        )}

        {/* Contribution Form */}
        {!submitted && contribType && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button
              onClick={() => { setContribType(null); setError(''); }}
              className="text-gray-500 hover:text-gray-700 text-sm mb-4 block"
            >
              ← Back to options
            </button>

            <h2 className="text-xl font-bold mb-6" style={{ color: '#1e3a5f' }}>
              {contribType === 'photo' ? '📷 Add a Photo' : '✍️ Write a Note'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="e.g., Aunt Priya"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{ backgroundColor: '#faf8f5' }}
              />
            </div>

            {contribType === 'note' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value.slice(0, 500))}
                  placeholder="Write something heartfelt..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  style={{ backgroundColor: '#faf8f5' }}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{messageText.length}/500</p>
              </div>
            )}

            {contribType === 'photo' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption (optional)</label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="e.g., Summer of '23!"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    style={{ backgroundColor: '#faf8f5' }}
                  />
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-60"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {submitting ? 'Sending...' : 'Send your love 💛'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
