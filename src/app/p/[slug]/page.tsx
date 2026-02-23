import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import ContributorPageClient from './ContributorPageClient';

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

  const occasion = data.template_type.charAt(0).toUpperCase()
    + data.template_type.slice(1).replace(/_/g, ' ');

  return {
    title: `Help celebrate ${data.recipient_name}! | SendKindly`,
    description: `Add your message to ${data.recipient_name}'s ${occasion} celebration. Share photos, notes, and memories.`,
    openGraph: {
      title: `Help celebrate ${data.recipient_name}!`,
      description: `Add your message to ${data.recipient_name}'s ${occasion} celebration.`,
      url: `/p/${slug}`,
      siteName: 'SendKindly',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Help celebrate ${data.recipient_name}!`,
      description: `Add your message to ${data.recipient_name}'s ${occasion} celebration.`,
    },
  };
}

export default function Page() {
  return <ContributorPageClient />;
}
