'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
}

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    async function loadPage() {
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, recipient_name, template_type')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPage(data);
      setLoading(false);
    }
    loadPage();
  }, [slug]);

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const handleOpen = () => {
    setOpened(true);
    setTimeout(() => {
      router.push(`/p/${slug}/keepsake?recipient=true`);
    }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ivory) 0%, #E8D8C4 50%, var(--ivory) 100%)' }}>
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--ivory) 0%, #E8D8C4 50%, var(--ivory) 100%)' }}
    >
      {/* Envelope Container */}
      <div className={`relative animate-envelope-appear ${opened ? 'scale-95 opacity-0 transition-all duration-500' : ''}`}>

        {/* Decorative sparkles */}
        <div className="absolute -top-8 -left-6 text-3xl opacity-60 animate-pulse">✨</div>
        <div className="absolute -top-4 -right-8 text-2xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}>💛</div>
        <div className="absolute -bottom-6 -right-4 text-2xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }}>✨</div>

        {/* Envelope Body */}
        <div className="relative w-[320px] sm:w-[380px]">

          {/* Flap (triangle) */}
          <div className="animate-flap-open" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
            <div
              className="w-0 h-0 mx-auto"
              style={{
                borderLeft: '160px solid transparent',
                borderRight: '160px solid transparent',
                borderTop: '100px solid var(--terracotta)',
                filter: 'brightness(0.9)',
              }}
            />
          </div>

          {/* Envelope base */}
          <div
            className="relative rounded-b-2xl p-8 pt-6 -mt-1"
            style={{ backgroundColor: 'var(--terracotta)' }}
          >
            {/* Inner shadow at top */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/10 to-transparent rounded-t-none" />

            {/* Inner flap decorations */}
            <div
              className="w-0 h-0 mx-auto absolute -top-[1px] left-1/2 -translate-x-1/2"
              style={{
                borderLeft: '160px solid transparent',
                borderRight: '160px solid transparent',
                borderBottom: '80px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>

          {/* Card rising from envelope */}
          <div className="absolute left-4 right-4 bottom-6 animate-card-rise">
            <div className="card p-8 text-center">
              <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-2">
                {page.template_type === 'other' ? 'CELEBRATION' : `${formatOccasion(page.template_type).toUpperCase()} CELEBRATION`}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-espresso">
                {page.recipient_name}
              </h1>
              <p className="text-sm text-cocoa mb-6">
                Something special awaits you
              </p>
              <button
                onClick={handleOpen}
                className="btn-gold px-8 shadow-lg hover:scale-105 transition-transform"
              >
                Open Your Keepsake 💛
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-12 text-sm text-cocoa/50">
        Made with 💛 on <span className="font-semibold text-espresso">SendKindly</span>
      </p>
    </div>
  );
}
