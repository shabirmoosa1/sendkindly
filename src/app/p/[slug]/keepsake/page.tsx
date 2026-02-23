import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import KeepsakePageClient from './KeepsakePageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('pages')
    .select('recipient_name, template_type')
    .eq('slug', slug)
    .single();

  if (!data) {
    return { title: 'SendKindly' };
  }

  const rawOccasion = data.template_type.charAt(0).toUpperCase()
    + data.template_type.slice(1).replace(/_/g, ' ');
  const occasion = data.template_type === 'other' ? '' : rawOccasion + ' ';

  return {
    title: `A keepsake for ${data.recipient_name} | SendKindly`,
    description: `A collection of messages and memories for ${data.recipient_name}'s ${occasion}celebration.`,
    openGraph: {
      title: `A keepsake for ${data.recipient_name}`,
      description: `A collection of messages and memories for ${data.recipient_name}'s ${occasion}celebration.`,
      url: `/p/${slug}/keepsake`,
      siteName: 'SendKindly',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `A keepsake for ${data.recipient_name}`,
      description: `A collection of messages and memories for ${data.recipient_name}'s ${occasion}celebration.`,
    },
  };
}

export default function Page() {
  return <KeepsakePageClient />;
}
