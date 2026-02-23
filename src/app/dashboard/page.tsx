'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  status: string;
  is_premium: boolean;
  created_at: string;
  contribution_count?: number;
}

type FilterTab = 'all' | 'active' | 'completed';

export default function DashboardPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');

      const { data: pagesData, error } = await supabase
        .from('pages')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pages:', error);
        setLoading(false);
        return;
      }

      if (pagesData && pagesData.length > 0) {
        const pagesWithCounts = await Promise.all(
          pagesData.map(async (page) => {
            const { count } = await supabase
              .from('contributions')
              .select('*', { count: 'exact', head: true })
              .eq('page_id', page.id);
            return { ...page, contribution_count: count || 0 };
          })
        );
        setPages(pagesWithCounts);
      } else {
        setPages([]);
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const copyShareLink = async (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'collecting': return 'bg-terracotta/10 text-terracotta';
      case 'locked': return 'bg-orange-100 text-orange-700';
      case 'shared': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-cocoa';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collecting': return 'COLLECTING';
      case 'locked': return 'FINALIZING';
      case 'shared': return 'DELIVERED';
      case 'draft': return 'DRAFT';
      default: return status.toUpperCase();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatOccasion = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const filteredPages = pages.filter((page) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['draft', 'collecting', 'locked'].includes(page.status);
    if (filter === 'completed') return page.status === 'shared';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-terracotta border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cocoa">Loading your celebrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <span className="text-lg sm:text-xl font-bold text-espresso">SendKindly</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm text-cocoa hidden sm:inline truncate max-w-[200px]">{userEmail}</span>
            <button onClick={handleSignOut} className="text-sm text-cocoa hover:text-espresso transition-colors whitespace-nowrap">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Your Celebrations</h1>
          <button onClick={() => router.push('/dashboard/create')} className="btn-primary flex items-center justify-center gap-2 shrink-0">
            <span className="text-lg">+</span> New Celebration
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {(['all', 'active', 'completed'] as FilterTab[]).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === tab ? 'bg-terracotta text-white shadow-sm' : 'bg-white text-cocoa hover:bg-gray-50 border border-gray-200'}`}>
              {tab === 'all' ? 'All Projects' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {filteredPages.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">{filter === 'all' ? 'Create your first celebration!' : `No ${filter} celebrations yet`}</h2>
            <p className="text-cocoa mb-6">Start a page for someone special and invite friends to contribute.</p>
            <button onClick={() => router.push('/dashboard/create')} className="btn-primary">+ New Celebration</button>
          </div>
        )}

        {filteredPages.length > 0 && (
          <>
            <p className="text-xs font-semibold tracking-widest text-cocoa/60 mb-4">ACTIVE CELEBRATIONS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {filteredPages.map((page) => (
                <div key={page.id} className="card p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{page.recipient_name}</h3>
                      <p className="text-sm text-cocoa">{formatOccasion(page.template_type)} Celebration</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusStyle(page.status)}`}>{getStatusLabel(page.status)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-cocoa mb-4">
                    <span>✨ {page.contribution_count || 0} contributions</span>
                    <span>·</span>
                    <span>{formatDate(page.created_at)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => copyShareLink(page.slug)} className={`flex-1 text-center py-2.5 rounded-full text-sm font-medium border-2 transition-all ${copiedSlug === page.slug ? 'border-green-500 text-green-600' : 'border-gold text-gold'}`}>
                      {copiedSlug === page.slug ? '✓ Link Copied!' : '🔗 Copy Share Link'}
                    </button>
                    <button onClick={() => router.push(`/p/${page.slug}/keepsake`)} className="flex-1 text-center py-2.5 rounded-full text-sm font-medium bg-terracotta text-white transition-all hover:opacity-90">View Keepsake</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-2 border-dashed border-cocoa/20 rounded-3xl p-8 text-center cursor-pointer hover:border-cocoa/40 transition-colors" onClick={() => router.push('/dashboard/create')}>
          <span className="text-3xl mb-2 block">✨</span>
          <p className="text-lg font-semibold text-espresso">Planning something new?</p>
          <p className="text-sm text-cocoa">Start a collaborative gift in seconds</p>
        </div>
      </main>
    </div>
  );
}
