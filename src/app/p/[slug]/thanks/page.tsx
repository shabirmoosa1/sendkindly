import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import ThanksPageClient from './ThanksPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('pages')
    .select('recipient_name')
    .eq('slug', slug)
    .single();

  if (!data) {
    return { title: 'SendKindly' };
  }

  return {
    title: `A thank you from ${data.recipient_name} | SendKindly`,
    description: `${data.recipient_name} sent a thank you message to everyone who contributed.`,
    openGraph: {
      title: `A thank you from ${data.recipient_name}`,
      description: `${data.recipient_name} sent a thank you message to everyone who contributed.`,
      url: `/p/${slug}/thanks`,
      siteName: 'SendKindly',
      type: 'website',
    },
  };
}

export default function Page() {
  return <ThanksPageClient />;
}
