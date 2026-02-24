import type { PageData } from './types';

const OCCASION_EMOJI: Record<string, string> = {
  birthday: '🎂',
  wedding: '💍',
  baby_shower: '🍼',
  graduation: '🎓',
  anniversary: '💕',
  farewell: '👋',
  thank_you: '🙏',
  get_well: '💐',
  memorial: '🕊️',
  work_anniversary: '🏆',
  retirement: '🎉',
  promotion: '🥂',
  new_job: '🚀',
  other: '✨',
};

function formatOccasion(type: string): string {
  if (type === 'other') return 'Celebration';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

interface CoverPageProps {
  page: PageData;
  contributionCount: number;
}

export default function CoverPage({ page, contributionCount }: CoverPageProps) {
  const emoji = OCCASION_EMOJI[page.template_type] || '✨';
  const occasion = formatOccasion(page.template_type);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center relative">
      {/* Hero image or decorative background */}
      {page.hero_image_url ? (
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden mb-8 border-4 border-white shadow-lg mx-auto">
          <img
            src={page.hero_image_url}
            alt={page.recipient_name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="text-7xl sm:text-8xl mb-8">{emoji}</div>
      )}

      {/* Occasion label */}
      <p className="text-xs font-medium tracking-[0.25em] text-cocoa/50 uppercase mb-3">
        {occasion}
      </p>

      {/* Gold rule */}
      <div className="gold-rule mx-auto mb-6" />

      {/* Recipient name */}
      <h1
        className="text-4xl sm:text-5xl md:text-6xl italic text-espresso mb-6"
        style={{ lineHeight: 1.2 }}
      >
        {page.recipient_name}
      </h1>

      {/* Gold rule */}
      <div className="gold-rule mx-auto mb-8" />

      {/* Contribution count */}
      <p className="text-sm text-cocoa/60">
        {contributionCount} heartfelt {contributionCount === 1 ? 'message' : 'messages'} from people who care
      </p>

      {/* Organizer credit */}
      {page.creator_name && (
        <p className="text-xs text-cocoa/40 mt-4">
          Lovingly organized by {page.creator_name}
        </p>
      )}

      {/* Organizer's message */}
      {page.creator_message && (
        <div className="mt-8 max-w-md mx-auto border-l-3 border-terracotta pl-5 text-left">
          <p className="text-xs font-medium tracking-widest text-cocoa/50 mb-2">
            {page.creator_name ? `${page.creator_name.toUpperCase()}'S MESSAGE` : 'A MESSAGE FROM THE ORGANIZER'}
          </p>
          <p className="text-base text-cocoa italic leading-relaxed">
            &ldquo;{page.creator_message}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
