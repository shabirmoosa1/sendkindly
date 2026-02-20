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
      case 'collecting': return 'bg-blue-100 text-blue-700';
      case 'locked': return 'bg-orange-100 text-orange-700';
      case 'shared': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your celebrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f5' }}>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <span className="text-xl font-bold" style={{ color: '#1e3a5f' }}>SendKindly</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{userEmail}</span>
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#1e3a5f' }}>Your Celebrations</h1>
          <button onClick={() => router.push('/dashboard/create')} className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg transition-all hover:opacity-90 shadow-sm" style={{ backgroundColor: '#1e3a5f' }}>
            <span className="text-lg">+</span> New Celebration
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {(['all', 'active', 'completed'] as FilterTab[]).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === tab ? 'text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`} style={filter === tab ? { backgroundColor: '#1e3a5f' } : {}}>
              {tab === 'all' ? 'All Projects' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {filteredPages.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e3a5f' }}>{filter === 'all' ? 'Create your first celebration!' : `No ${filter} celebrations yet`}</h2>
            <p className="text-gray-500 mb-6">Start a page for someone special and invite friends to contribute.</p>
            <button onClick={() => router.push('/dashboard/create')} className="text-white font-semibold px-6 py-3 rounded-lg transition-all hover:opacity-90" style={{ backgroundColor: '#1e3a5f' }}>+ New Celebration</button>
          </div>
        )}

        {filteredPages.length > 0 && (
          <>
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-4">ACTIVE CELEBRATIONS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {filteredPages.map((page) => (
                <div key={page.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#1e3a5f' }}>{page.recipient_name}</h3>
                      <p className="text-sm text-gray-500">{formatOccasion(page.template_type)} Celebration</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusStyle(page.status)}`}>{getStatusLabel(page.status)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>✨ {page.contribution_count || 0} contributions</span>
                    <span>·</span>
                    <span>{formatDate(page.created_at)}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => copyShareLink(page.slug)} className="flex-1 text-center py-2 rounded-lg text-sm font-medium border transition-all" style={{ borderColor: '#c9a961', color: copiedSlug === page.slug ? '#16a34a' : '#c9a961' }}>
                      {copiedSlug === page.slug ? '✓ Link Copied!' : '🔗 Copy Share Link'}
                    </button>
                    <button onClick={() => router.push(`/p/${page.slug}/keepsake`)} className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90" style={{ backgroundColor: '#1e3a5f' }}>View Keepsake</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors" onClick={() => router.push('/dashboard/create')}>
          <span className="text-3xl mb-2 block">✨</span>
          <p className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>Planning something new?</p>
          <p className="text-sm text-gray-500">Start a collaborative gift in seconds</p>
        </div>
      </main>
    </div>
  );
}
