'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  status: string;
}

interface ThanksData {
  message: string;
  created_at: string;
}

export default function ThanksPageClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [thanks, setThanks] = useState<ThanksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      const { data: thanksRow } = await supabase
        .from('recipient_thanks')
        .select('message, created_at')
        .eq('page_id', pageData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (thanksRow) {
        setThanks(thanksRow);
      }

      setLoading(false);
    }
    loadData();
  }, [slug]);

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-5xl mb-4">💛</div>
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold mb-1 text-espresso">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl italic mb-2">Page not found</h1>
        </div>
      </div>
    );
  }

  if (!thanks) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-6">
          <div className="glass rounded-3xl ios-shadow p-10 max-w-md text-center">
            <div className="text-5xl mb-4">💌</div>
            <h1 className="text-2xl italic mb-3">No thank you message yet</h1>
            <p className="text-cocoa/70 text-sm mb-6">{page.recipient_name} hasn&apos;t sent a thank you yet — check back soon!</p>
            <a
              href={`/p/${slug}/keepsake`}
              className="inline-block btn-primary"
            >
              View Keepsake →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="max-w-lg w-full">
          {/* Thank you card */}
          <div className="glass rounded-3xl ios-shadow p-8 text-center border border-gold/30">
            <div className="text-5xl mb-4">💛</div>
            <p className="text-xs font-medium tracking-widest text-cocoa/60 mb-4">
              A MESSAGE FROM {page.recipient_name.toUpperCase()}
            </p>
            <p className="text-gray-800 leading-relaxed italic text-xl break-words mb-4">
              &ldquo;{thanks.message}&rdquo;
            </p>
            <p className="text-xs text-cocoa/40">
              {new Date(thanks.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* View keepsake link */}
          <div className="text-center mt-6">
            <a
              href={`/p/${slug}/keepsake`}
              className="inline-block btn-primary"
            >
              View Full Keepsake →
            </a>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-cocoa/60 mt-8">
            Made with 💛 on <span className="font-semibold text-espresso">SendKindly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
