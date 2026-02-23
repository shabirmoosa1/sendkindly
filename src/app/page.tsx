'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const occasions = [
  { emoji: '🎂', label: 'Birthday' },
  { emoji: '💒', label: 'Wedding' },
  { emoji: '👶', label: 'Baby Shower' },
  { emoji: '🎓', label: 'Graduation' },
  { emoji: '👋', label: 'Farewell' },
  { emoji: '🕊️', label: 'Memorial' },
  { emoji: '🙏', label: 'Thank You' },
  { emoji: '🎉', label: 'Retirement' },
];

const sampleContributions = [
  {
    message: 'Happy birthday, Grandma! Your stories always make us laugh and your kindness never goes unnoticed.',
    name: 'Priya',
    initial: 'P',
    color: 'bg-terracotta',
  },
  {
    message: 'You taught me that the best things in life are the people you share them with. Love you always.',
    name: 'Rahul',
    initial: 'R',
    color: 'bg-gold',
  },
  {
    message: "You've always been there for everyone. It's our turn to show you how much you mean to us.",
    name: 'Mom & Dad',
    initial: 'M',
    color: 'bg-espresso',
  },
];

export default function HomePage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const ctaHref = user ? '/dashboard/create' : '/signup';

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-[1100px] mx-auto px-6 pt-16 sm:pt-20 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-espresso leading-tight">
          Celebrate the people<br className="hidden sm:block" /> who matter most
        </h1>
        <p className="text-lg sm:text-xl text-cocoa mt-6 max-w-[620px] mx-auto leading-relaxed">
          Collect heartfelt messages, photos, and memories from friends and family — all in one beautiful keepsake.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={ctaHref}>
            <button className="btn-primary text-lg px-10">
              Start a Celebration
            </button>
          </Link>
          {authChecked && user && (
            <Link href="/dashboard">
              <button className="btn-secondary px-8">
                My Celebrations
              </button>
            </Link>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-[900px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-espresso mb-3">
            How it works
          </h2>
          <p className="text-cocoa text-center mb-14">
            Three simple steps to create something unforgettable
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {[
              {
                step: '1',
                title: 'Create',
                desc: 'Pick the occasion, name the person you\'re celebrating, and write a welcome note for contributors.',
                bg: 'bg-terracotta/10 text-terracotta',
              },
              {
                step: '2',
                title: 'Collect',
                desc: 'Share a link with friends and family. Everyone adds messages, photos, and memories — no login needed.',
                bg: 'bg-gold/10 text-gold',
              },
              {
                step: '3',
                title: 'Share',
                desc: 'When you\'re ready, send the beautiful keepsake to your person — complete with a surprise envelope reveal.',
                bg: 'bg-espresso/10 text-espresso',
              },
            ].map((item) => (
              <div key={item.step}>
                <div className={`w-16 h-16 mx-auto mb-5 rounded-full ${item.bg} flex items-center justify-center`}>
                  <span className="text-2xl font-bold">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-espresso mb-2">{item.title}</h3>
                <p className="text-cocoa leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occasion Types */}
      <section className="max-w-[1100px] mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-espresso mb-3">
          For every moment that matters
        </h2>
        <p className="text-cocoa text-center mb-12">
          Birthdays, weddings, farewells, and more
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {occasions.map((o) => (
            <div
              key={o.label}
              className="card p-6 text-center hover:shadow-md transition-shadow cursor-default"
            >
              <span className="text-3xl block mb-2">{o.emoji}</span>
              <span className="text-sm font-semibold text-espresso">{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Keepsake Preview */}
      <section className="bg-white py-20">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-espresso mb-3">
            A keepsake they&apos;ll treasure
          </h2>
          <p className="text-cocoa mb-12">
            Every contribution becomes part of a beautiful collection
          </p>

          <div className="max-w-[600px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sampleContributions.map((c, i) => (
              <div
                key={i}
                className={`card p-5 text-left ${i === 2 ? 'sm:col-span-2' : ''}`}
              >
                <p className="text-sm text-gray-800 italic leading-relaxed mb-3">
                  &ldquo;{c.message}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full ${c.color} text-white text-xs font-bold flex items-center justify-center`}>
                    {c.initial}
                  </div>
                  <span className="text-xs font-semibold text-espresso">{c.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[700px] mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-espresso mb-4">
          Ready to make someone&apos;s day?
        </h2>
        <p className="text-cocoa mb-8">
          It only takes a minute to start something meaningful.
        </p>
        <Link href={ctaHref}>
          <button className="btn-primary text-lg px-10">
            Start a Celebration
          </button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <p className="text-sm text-cocoa/60">
            Made with 💛 by the <span className="font-semibold text-espresso">SendKindly</span> team
          </p>
        </div>
      </footer>
    </div>
  );
}
