'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[56px] sm:h-[60px] px-3 sm:px-6"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: 'var(--glass-border)',
        boxShadow: '0 2px 16px var(--crimson-light)',
      }}
    >
      {/* Logo + Wordmark */}
      <Link href="/" className="no-underline flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Image
          src="/logo-cleaned.png"
          alt="SendKindly"
          width={28}
          height={28}
          className="sm:w-8 sm:h-8"
        />
        <span className="font-semibold italic text-lg sm:text-[22px] text-crimson tracking-tight font-serif">
          SendKindly
        </span>
      </Link>

      {/* Navigation */}
      {authChecked && (
        <nav className="flex items-center gap-2 sm:gap-4">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="no-underline text-xs sm:text-sm font-medium text-cocoa hover:text-crimson transition-colors"
              >
                My Celebrations
              </Link>
              <span className="hidden md:inline truncate max-w-[160px] text-sm text-cocoa/50">
                {userEmail}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs sm:text-sm font-medium text-cocoa hover:text-crimson transition-colors bg-transparent border-none cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="no-underline text-xs sm:text-sm font-medium text-cocoa hover:text-crimson transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard/create"
                className="btn-primary no-underline text-xs sm:text-sm whitespace-nowrap"
              >
                Create a keepsake
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
