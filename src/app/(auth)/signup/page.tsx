'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                if (error.message.toLowerCase().includes('rate limit')) {
                    setError('Too many signup attempts. Please wait a few minutes and try again, or ask Shabir to create your account from the Supabase dashboard.');
                } else if (error.message.toLowerCase().includes('already registered')) {
                    setError('This email is already registered. Try signing in instead.');
                } else {
                    setError(error.message);
                }
                setLoading(false);
                return;
            }

            if (data?.user && !data.session) {
                setError(null);
                alert('Check your email for a confirmation link, then sign in.');
                router.push('/login');
            } else {
                router.push('/dashboard');
            }
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
                    <h1 className="text-3xl font-bold text-terracotta mb-2">SendKindly</h1>
                    <p className="text-cocoa">Create your account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-6">
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
                        <label className="block text-sm font-medium text-cocoa mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full input-warm"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cocoa mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full input-warm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-cocoa">
                    Already have an account?{' '}
                    <Link href="/login" className="text-gold hover:underline font-medium">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
