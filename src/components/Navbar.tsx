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
      className="sticky top-0 z-50 flex items-center justify-between"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: 'var(--glass-border)',
        boxShadow: '0 2px 16px var(--crimson-light)',
        padding: '0 24px',
        height: '60px',
      }}
    >
      {/* Logo + Wordmark */}
      <Link href="/" className="no-underline flex items-center gap-2">
        <Image
          src="/logo-cleaned.png"
          alt="SendKindly"
          width={32}
          height={32}
          className=""
        />
        <span
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '22px',
            color: 'var(--crimson)',
            letterSpacing: '-0.3px',
            fontWeight: 600,
          }}
        >
          SendKindly
        </span>
      </Link>

      {/* Nav links + CTA */}
      {authChecked && (
        <nav className="flex items-center gap-4">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="no-underline transition-colors"
                style={{ color: 'var(--cocoa)', fontSize: '14px', fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cocoa)')}
              >
                Dashboard
              </Link>
              <span
                className="hidden sm:inline truncate max-w-[160px]"
                style={{ fontSize: '14px', color: 'var(--cocoa-light)' }}
              >
                {userEmail}
              </span>
              <button
                onClick={handleSignOut}
                className="transition-colors"
                style={{ color: 'var(--cocoa)', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cocoa)')}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="no-underline transition-colors"
                style={{ color: 'var(--cocoa)', fontSize: '14px', fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cocoa)')}
              >
                Sign In
              </Link>
              <Link
                href="/dashboard/create"
                className="btn-primary no-underline"
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
