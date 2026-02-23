import { Metadata } from 'next';
import RevealPageClient from './RevealPageClient';

export const metadata: Metadata = {
  title: 'You have a surprise waiting! | SendKindly',
  description: 'Someone special has put together something just for you.',
  openGraph: {
    title: 'You have a surprise waiting!',
    description: 'Someone special has put together something just for you.',
    siteName: 'SendKindly',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You have a surprise waiting!',
    description: 'Someone special has put together something just for you.',
  },
};

export default function Page() {
  return <RevealPageClient />;
}
