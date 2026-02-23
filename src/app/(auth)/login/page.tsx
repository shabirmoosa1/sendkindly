'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.toLowerCase().includes('invalid login credentials')) {
                    setError('Incorrect email or password. Please try again or reset your password.');
                } else if (error.message.toLowerCase().includes('email not confirmed')) {
                    setError('Your email has not been confirmed yet. Please check your inbox or ask Shabir to help.');
                } else if (error.message.toLowerCase().includes('rate limit')) {
                    setError('Too many login attempts. Please wait a few minutes and try again.');
                } else {
                    setError(error.message);
                }
                setLoading(false);
                return;
            }

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md card p-8 animate-fade-in">
                <div className="text-center mb-8">
                    <Link href="/" className="no-underline"><h1 className="text-3xl font-bold text-terracotta mb-2">SendKindly</h1></Link>
                    <p className="text-cocoa">Welcome back</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-cocoa mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full input-warm"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-cocoa">
                                Password
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-gold hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full input-warm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-cocoa">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-gold hover:underline font-medium">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
