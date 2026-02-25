export interface PageData {
  id: string;
  slug: string;
  recipient_name: string;
  template_type: string;
  hero_image_url: string | null;
  creator_message: string | null;
  creator_name: string | null;
  status: string;
  event_date: string | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  contributor_name: string;
  message_text: string | null;
  photo_url: string | null;
  ai_sticker_url: string | null;
  recipient_reply: string | null;
  created_at: string;
}

export interface Reaction {
  id: string;
  contribution_id: string;
  reactor_name: string;
  emoji: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean; // whether current visitor reacted with this emoji
}
