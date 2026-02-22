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
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">SendKindly</h1>
                    <p className="text-gray-600">Reset your password</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="text-center">
                        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 text-sm">
                            Check your email for a password reset link. It may take a minute to arrive.
                        </div>
                        <Link href="/login" className="text-accent hover:underline font-medium text-sm">
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-6">
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>

                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 transition duration-200 font-medium disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-600">
                            Remember your password?{' '}
                            <Link href="/login" className="text-accent hover:underline font-medium">
                                Sign in
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
