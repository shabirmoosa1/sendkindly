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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
            if (err.message === 'Failed to fetch') {
                setError('Unable to connect. Please check your internet connection and try again.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const EyeIcon = ({ open }: { open: boolean }) => open ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            {/* Logo Icon */}
            <div className="w-24 h-24 rounded-[2rem] bg-ivory ios-shadow flex items-center justify-center mb-6 border border-white/40">
                <span className="text-4xl">🌿</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl italic text-espresso mb-2">Join SendKindly</h1>
            <p className="text-cocoa text-sm mb-10">Create your account to get started</p>

            {/* Glass Form Card */}
            <div className="w-full max-w-md glass rounded-3xl ios-shadow p-8 animate-fade-in">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-crimson/30 focus:outline-none transition-shadow"
                            placeholder="hello@sendkindly.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 pr-12 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-crimson/30 focus:outline-none transition-shadow"
                                placeholder="At least 8 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-cocoa/60 hover:text-cocoa transition-colors"
                                tabIndex={-1}
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 pr-12 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-crimson/30 focus:outline-none transition-shadow"
                                placeholder="Repeat your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-cocoa/60 hover:text-cocoa transition-colors"
                                tabIndex={-1}
                            >
                                <EyeIcon open={showConfirm} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="text-xs text-cocoa/50 text-center">
                        If sign-up seems slow, Supabase may be rate-limiting. Wait 1-2 minutes and try again.
                    </p>
                </form>
            </div>

            {/* Bottom link */}
            <div className="mt-8 text-center text-sm text-cocoa">
                Already have an account?{' '}
                <Link href="/login" className="text-crimson font-semibold hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    );
}
