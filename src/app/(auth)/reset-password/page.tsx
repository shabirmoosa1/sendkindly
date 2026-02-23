'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true);
            }
        });
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
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
            <h1 className="text-4xl italic text-espresso mb-2">New Password</h1>
            <p className="text-cocoa text-sm mb-10">Set a new password for your account</p>

            {/* Glass Form Card */}
            <div className="w-full max-w-md glass rounded-3xl ios-shadow p-8 animate-fade-in">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                {!ready ? (
                    <div className="text-center">
                        <p className="text-sm text-cocoa mb-4">
                            Loading your reset session... If this takes too long, the link may have expired.
                        </p>
                        <Link href="/forgot-password" className="text-terracotta font-semibold hover:underline text-sm">
                            Request a new reset link
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-cocoa font-medium mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 pr-12 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-terracotta/30 focus:outline-none transition-shadow"
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
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full bg-white/50 border-none rounded-2xl px-5 py-4 pr-12 text-espresso placeholder:text-stone-400 focus:ring-2 focus:ring-terracotta/30 focus:outline-none transition-shadow"
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
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
