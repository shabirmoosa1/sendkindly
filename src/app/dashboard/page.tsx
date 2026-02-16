'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-4">Welcome to Dashboard</h1>
                <p className="text-lg mb-8">You have successfully logged in.</p>
                <button
                    onClick={handleSignOut}
                    className="bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 transition duration-200"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
