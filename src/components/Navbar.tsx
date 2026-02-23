'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-2xl">🎁</span>
          <span className="text-lg sm:text-xl font-bold text-espresso" style={{ fontFamily: 'var(--font-newsreader), serif' }}>
            SendKindly
          </span>
        </Link>

        {authChecked && (
          <div className="flex items-center gap-3 sm:gap-4">
            {userEmail ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-cocoa hover:text-terracotta transition-colors no-underline relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-terracotta after:transition-all hover:after:w-full"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-cocoa/60 hidden sm:inline truncate max-w-[160px]">
                  {userEmail}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-cocoa hover:text-terracotta transition-colors whitespace-nowrap relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-terracotta after:transition-all hover:after:w-full"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-cocoa hover:text-terracotta transition-colors no-underline relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-terracotta after:transition-all hover:after:w-full"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
