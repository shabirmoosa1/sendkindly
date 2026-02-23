'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                if (error.message.toLowerCase().includes('rate limit')) {
                    setError('Too many reset attempts. Please wait a few minutes and try again.');
                } else {
                    setError(error.message);
                }
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            {/* Logo Icon */}
            <div className="w-24 h-24 rounded-[2rem] bg-ivory ios-shadow flex items-center justify-center mb-6 border border-white/40">
                <span className="text-4xl">🌿</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl italic text-espresso mb-2">Reset Password</h1>
            <p className="text-cocoa text-sm mb-10">We&apos;ll send you a reset link</p>

            {/* Glass Form Card */}
            <div className="w-full max-w-md glass rounded-3xl ios-shadow p-8 animate-fade-in">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="text-center">
                        <div className="bg-green-50 text-green-700 p-4 rounded-2xl mb-6 text-sm">
                            Check your email for a password reset link. It may take a minute to arrive.
                        </div>
                        <Link href="/login" className="text-terracotta font-semibold hover:underline text-sm">
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-cocoa mb-6">
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>

                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-terracotta/30 focus:outline-none transition-shadow"
                                    placeholder="hello@sendkindly.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-cocoa">
                            Remember your password?{' '}
                            <Link href="/login" className="text-terracotta font-semibold hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
