# SendKindly — Project Context for Claude

## What is SendKindly?
A collaborative celebration/keepsake platform for the Antigravity accelerator program. Creators make a celebration page, share a link with friends/family, everyone contributes messages and photos, then the creator shares the collected keepsake with the recipient via an animated envelope reveal.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, TypeScript, `'use client'` components)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline` syntax)
- **Backend:** Supabase (auth, Postgres DB, storage, Row Level Security)
- **AI:** Anthropic Claude Haiku (`@anthropic-ai/sdk`) for message suggestions
- **Fonts:** Newsreader (serif, headings) + Inter (sans, body) via `next/font/google`
- **Deployment:** Vercel → sendkindly-bice.vercel.app
- **Repo:** github.com/shabirmoosa1/sendkindly (main branch, direct push)

## Team
- **Shabir** — lead builder (this Claude user)
- **Sammy** — design (Stitch screens) + testing (Android Brave)
- **Viral** — testing
- **Naila** — mobile testing
- **Sanjeev** — pitch

## Key Dates
- Technical Sprint: 28 Feb 2026
- Product Qualifiers: 7-8 Mar 2026
- Demo Day: 28 Mar 2026 (Bengaluru)

---

## File Structure

```
src/
├── middleware.ts                ← Auth redirect logic (dashboard↔auth pages)
├── lib/
│   └── supabase.ts             ← Supabase client singleton
├── components/
│   └── Navbar.tsx              ← Shared navigation (auth-aware, sticky)
└── app/
    ├── globals.css             ← Design system tokens + utility classes + animations
    ├── layout.tsx              ← Root layout (Newsreader + Inter fonts, metadata)
    ├── page.tsx                ← Landing page (hero, how-it-works, occasions, CTA)
    ├── (auth)/
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   ├── forgot-password/page.tsx
    │   └── reset-password/page.tsx
    ├── api/
    │   └── suggest/route.ts    ← AI message suggestions (Claude Haiku API)
    ├── dashboard/
    │   ├── page.tsx            ← Main dashboard (list/filter celebrations)
    │   └── create/page.tsx     ← 3-step create wizard
    └── p/[slug]/
        ├── page.tsx            ← Contributor page (photo/note + AI suggestions)
        ├── keepsake/page.tsx   ← Keepsake view (all contributions + creator tools)
        └── reveal/page.tsx     ← Animated envelope reveal for recipients
```

---

## Database Schema (Supabase)

```sql
pages (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users,
  slug TEXT UNIQUE,
  template_type TEXT,              -- occasion: birthday, wedding, baby_shower, etc.
  recipient_name TEXT,
  hero_image_url TEXT,
  color_scheme TEXT,
  event_date DATE,
  status TEXT DEFAULT 'collecting', -- 'draft' | 'collecting' | 'locked' | 'shared'
  is_premium BOOLEAN DEFAULT false,
  creator_message TEXT,            -- organizer's personal wish FOR the recipient (added Session 3)
  contribution_prompt TEXT,        -- instructions for contributors on what to write (added Phase C)
  created_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ
)

contributions (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES pages,
  contributor_name TEXT,
  message_text TEXT,
  photo_url TEXT,
  voice_note_url TEXT,             -- reserved for future use
  ai_sticker_url TEXT,             -- reserved for future use
  created_at TIMESTAMPTZ
)

recipient_replies (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES pages,
  reply_text TEXT,
  reply_photo_url TEXT,
  created_at TIMESTAMPTZ
)

ai_sticker_usage (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES pages,
  prompt_text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
```

**DB migrations run manually in Supabase SQL Editor:**
- `ALTER TABLE pages ADD COLUMN contribution_prompt TEXT;` (Phase C)
- `ALTER TABLE pages ADD COLUMN creator_message TEXT;` (Session 3)

Schema SQL reference: `/Users/shabirmoosa/Documents/0 AI/_Our Group Build/SendKindly Group Efforts/2 Build Efforts/sendkindly_schema.sql`

---

## Role System (no auth for contributors/recipients)

| Role | Access | Auth Required | How They Get There |
|------|--------|---------------|-------------------|
| **Creator** | Dashboard, create wizard, Creator Tools on keepsake | Yes (Supabase auth) | Signs up, creates page |
| **Contributor** | Contributor page (`/p/{slug}`) — add photo/note | No | Receives shared link |
| **Recipient** | Keepsake + "Say Thanks" form | No | Receives reveal link (`/p/{slug}/reveal`) |

- Creator detected via `pageData.creator_id === user.id`
- Recipient detected via `?recipient=true` URL parameter
- Contributors need no login — just a name

---

## Design System (Sammy's Warm Palette)

Applied to `globals.css` in Phase A, used consistently across all pages:

| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| `--background` / `--ivory` | `#F6F2EC` | `bg-ivory` | Page backgrounds |
| `--foreground` / `--espresso` | `#2A1F1C` | `text-espresso` | Headings, strong text |
| `--primary` / `--terracotta` | `#B76E4C` | `bg-terracotta`, `text-terracotta` | Primary buttons, CTAs, accents |
| `--accent` / `--gold` | `#C8A951` | `bg-gold`, `text-gold` | Highlights, secondary CTAs |
| `--cocoa` | `#5A4B45` | `text-cocoa` | Body text, secondary text |

**Derived tokens:** `--card-bg` (#FFFFFF), `--input-bg` (#F6F2EC), `--glass-bg`, `--glass-border`, `--ring-color`

**Utility classes in globals.css:**
- `.glass` — glassmorphism (blur 12px, semi-transparent white, terracotta border)
- `.ios-shadow` — soft shadow (`0 4px 30px rgba(0,0,0,0.05)`)
- `.card` — white bg, rounded-3xl, ios-shadow
- `.btn-primary` — terracotta, rounded-full, min-h 52px, hover lift, active scale
- `.btn-secondary` — espresso outline, rounded-full, hover fill
- `.btn-gold` — gold, rounded-full, min-h 52px
- `.input-warm` — ivory bg, borderless, rounded-2xl, warm placeholder

**Global focus rings:** All `input:focus`, `textarea:focus`, `select:focus`, `button:focus-visible` use warm terracotta ring (`rgba(183,110,76,0.3)`). No blue anywhere.

**Animations:**
- `.animate-fade-in` (300ms) — content appearing
- `.animate-scale-in` (250ms) — success states
- `.animate-envelope-appear` (600ms) — reveal page envelope
- `.animate-flap-open` (800ms, 1.2s delay) — envelope flap opening
- `.animate-card-rise` (700ms, 1.8s delay) — card rising from envelope
- `.animate-shimmer` — gold text shimmer loop

**Typography:**
- `--font-newsreader` → Newsreader (weights 300-700, normal+italic) — headings via CSS `h1-h6` rule
- `--font-inter` → Inter — body text via `font-family` on `body`

---

## Key Components & Pages

### Navbar (`src/components/Navbar.tsx`)
Shared `'use client'` component used on all pages except auth pages and reveal page:
- **Left:** 🎁 SendKindly logo (Newsreader serif) → links to `/` (homepage)
- **Right (logged in):** "My Celebrations" link, user email (hidden on mobile), Sign Out button
- **Right (not logged in):** "Sign In" link
- Sticky, white bg, `z-20`, `border-b`
- Sign out redirects to `/` (homepage)
- Auth pages don't use Navbar — instead the "SendKindly" heading in each auth card is a `<Link href="/">`

### Landing Page (`src/app/page.tsx`)
Full marketing page (was previously just a redirect to dashboard):
- **Hero:** "Celebrate the people who matter most" + CTA (→ `/signup` or `/dashboard/create`)
- **How It Works:** 3-step (Create → Collect → Share) with numbered circles
- **Occasion Types:** 4x3 grid of 12 occasions with emojis
- **Keepsake Preview:** 3 sample contribution cards showing what messages look like
- **Final CTA:** "Ready to make someone's day?"
- **Footer:** "Made with 💛 by the SendKindly team"

### Dashboard (`src/app/dashboard/page.tsx`)
- Filter tabs: All Projects / Active / Completed
- Card grid showing each celebration: name, occasion, contribution count, date, status badge
- "Copy Share Link" + "View Keepsake" buttons per card
- Empty state with "Create your first celebration!" CTA
- Dashed "Planning something new?" card at bottom

### Create Wizard (`src/app/dashboard/create/page.tsx`)
3-step wizard with progress dots:
- **Step 1:** Recipient name, occasion dropdown (12 options), "Your wish for {name}" (500 chars, personal message for the recipient), "Instructions for contributors" (200 chars, guidance on what to write)
- **Step 2:** Template selection (Classic ✨, Playful 🎨, Memorial 🕊️)
- **Step 3:** Review all fields + "Create Celebration 🎉" button
- Generates 8-char random slug, inserts into `pages` table, redirects to dashboard

### Contributor Page (`src/app/p/[slug]/page.tsx`)
What people see when they open a shared link — most important page for engagement:
- **Hero card:** Tall image area (h-56), occasion label, "For {name}", contribution count
- **Organizer's wish:** Displayed prominently inside hero card as "THE ORGANIZER'S WISH" with terracotta left-border, italic text
- **Contribution prompt:** Gold callout with 💡 below hero card ("Instructions for contributors")
- **Contribution types:** 2x2 grid (Add Photo, Write Note, Voice Note [coming soon], AI Sticker [coming soon])
- **Write Note form:** Name input, textarea with 500-char limit, "Need inspiration? ✨" AI suggestion button
- **Add Photo form:** Name input, file picker, optional caption
- **Success state:** "Your contribution has been added!" with "Add Another" button
- **Navigation:** "View Keepsake" link at bottom

### Keepsake Page (`src/app/p/[slug]/keepsake/page.tsx`)
- **Hero banner:** Full-width gradient or hero image, occasion label, "For {name}", contribution count
- **Organizer's wish:** Pinned card at top with terracotta left-border (visible to everyone)
- **Contributions grid:** Masonry-style 3-column layout, pastel background colors cycling
- **Creator Tools** (visible only to logged-in creator):
  - Navigation: "Add Your Contribution" + "Back to Dashboard" buttons at top
  - Share links section: Copy Contributor Link, Copy Reveal Link, Copy Reminder Message — each with explanatory label
- **Recipient reply section:** Visible when replies exist (read-only for non-creators)
- **Say Thanks form:** Only visible with `?recipient=true` URL param

### Reveal Page (`src/app/p/[slug]/reveal/page.tsx`)
Immersive animated envelope experience (NO Navbar — intentionally fullscreen):
- Warm gradient background
- Animated envelope with CSS keyframes: appear → flap opens → card rises
- Card shows occasion, recipient name, "Open Your Keepsake 💛" button
- Button click → fade out → redirect to `/p/{slug}/keepsake?recipient=true`

### AI Suggestions API (`src/app/api/suggest/route.ts`)
- POST with `{ recipientName, occasion, prompt? }`
- Calls Claude Haiku (`claude-haiku-4-5-20251001`) with system prompt for warm, personal messages
- Returns `{ suggestions: string[] }` (3 suggestions)
- Rate limited client-side: localStorage `sk-suggest-{pageId}` counter, max 3 calls per page per session

---

## Two Distinct Personalization Fields

These serve different purposes and should NOT be confused:

| Field | DB Column | Purpose | Visible To | Display Style |
|-------|-----------|---------|------------|---------------|
| **Organizer's Wish** | `creator_message` | Personal message FROM organizer FOR the recipient | Everyone (contributor page + keepsake) | "THE ORGANIZER'S WISH" — terracotta left-border, italic, prominent |
| **Instructions** | `contribution_prompt` | Guidance for contributors on what kind of messages to write | Contributors only (contributor page) | Gold callout with 💡, smaller, below hero |

**Example:** For Grandma's 80th birthday:
- Organizer's wish: "Happy 80th birthday Grandma! You fill our lives with so much love and laughter."
- Instructions: "Share your favorite memory with Grandma or tell her what she means to you!"

---

## Build History (All Sessions)

### Session 1: Foundation + Reskin

**Phase A: Design System Foundation** — COMPLETE ✅
- `globals.css`: Sammy's warm palette tokens, utility classes (.card, .btn-primary, .btn-secondary, .btn-gold, .input-warm, .glass, .ios-shadow), warm focus rings, animations
- `layout.tsx`: Newsreader + Inter fonts, updated metadata
- Committed: `33839ad`

**Phase B: Reskin Existing Pages** — COMPLETE ✅
- All 8 page files reskinned from old navy/blue theme to warm design system
- Removed: `#1e3a5f` (44→0), `#faf8f5`/`#c9a961` (23→0), `bg-blue`/`text-blue`/`ring-blue` (10→0)
- Remaining `style={{}}`: 5 instances (all legitimate dynamic values: gradients, textShadow, dynamic bg)
- Auth pages: `.card`, `.btn-primary`, `.input-warm`, `text-cocoa`, `text-gold`
- Dashboard/Create: `.card`, `.btn-primary`, `bg-ivory`, `text-espresso`, `text-cocoa`, `border-gold`
- Contributor/Keepsake: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-gold`, `bg-ivory`, CSS var gradients
- Committed: `ad04da0`

**Sammy's Testing Feedback (applied during Session 1):**
- Fixed creator/contributor/recipient role separation on keepsake page (`c20430e`)
- Added office occasions (work_anniversary, retirement, promotion, new_job) and fixed template card layout on mobile (`e97be31`)
- Fixed keepsake banner, loading states, mobile layout (`07837ca`)
- Removed leaked `.env.local` from git, updated `.gitignore` (`517beb1`)

### Session 2: Features + Polish

**Phase C: Tier 1 Features** — COMPLETE ✅
- **C1:** "Copy Reminder Message" + "Copy Reveal Link" buttons in Creator Tools
- **C2:** Optional `contribution_prompt` field in create wizard, gold callout on contributor page
- **C3:** `/api/suggest` route (Claude Haiku) + "Need inspiration?" UI with 3 suggestion chips, rate limited 3/session via localStorage
- **C4:** `/p/{slug}/reveal` animated envelope page with CSS keyframe animations (envelopeAppear, flapOpen, cardRise, shimmer)
- Committed: `ec337cc`

**Post-Phase C fixes:**
- Fixed copy button feedback (✅ Copied!) + warm focus ring on buttons (`8121dbc`)
- Added navigation links to contributor page (View Keepsake + Back to Dashboard) (`7d04426`)

### Session 3: Homepage & UX Overhaul

**Shabir's feedback that drove this session:**
- "The Home page seems boring with nothing selling the idea"
- "Not sure if the icon and title SendKindly leads back to home page"
- "The contributor page is bland when shared — there must be something personalised"
- "The organizer's wishes should be on the shared link AND in the keepsake"

**Changes made:**
1. **Shared Navbar component** (`src/components/Navbar.tsx`) — consistent navigation across all pages, auth-aware, sticky
2. **Landing page rewrite** (`src/app/page.tsx`) — from redirect to full marketing page with hero, how-it-works, 12 occasions, keepsake preview, CTA
3. **Dashboard cleanup** — replaced inline nav with shared Navbar
4. **Create wizard update** — added `creator_message` (organizer's wish) + kept `contribution_prompt` (instructions)
5. **Contributor page personality** — taller hero, organizer's wish displayed prominently, personal heading ("Add your message for {name}"), contribution prompt as gold hint
6. **Keepsake page updates** — organizer's wish pinned at top, Creator Tools reordered (navigation first, share links below with labels)
7. **Auth pages** — "SendKindly" heading links to `/` for easy navigation home
8. **Occasion grid** — expanded from 8 to 12 types (added Work Anniversary, Promotion, New Job, Other)

**DB migration:** `ALTER TABLE pages ADD COLUMN creator_message TEXT;`

**Commits:**
- `905134a` — Homepage redesign + shared Navbar + contributor page personality
- `18d63db` — Expand occasion grid to 12 cards
- `17142d6` — Separate organizer's wish from contributor instructions, pin wish to keepsake

---

## Current Status (as of 23 Feb 2026)

| Phase | Status |
|-------|--------|
| Phase A: Design System | ✅ COMPLETE |
| Phase B: Reskin | ✅ COMPLETE |
| Phase C: Tier 1 Features | ✅ COMPLETE |
| Homepage & UX Overhaul | ✅ COMPLETE |
| **Phase D: Demo Polish** | **⬜ NEXT** |

### Phase D: Demo Polish — TODO
- [ ] Seed demo data (a complete celebration with 5-8 contributions for demo day)
- [ ] End-to-end flow testing (create → contribute → reveal → keepsake → reply)
- [ ] Mobile responsive testing (all pages, especially contributor page and keepsake)
- [ ] Hero image upload support (currently placeholder gradient only)
- [ ] Edge cases: empty states, very long messages, special characters, multiple photos
- [ ] Performance: loading states, error handling, offline graceful degradation
- [ ] SEO/OG meta tags for shared links (so contributor links preview nicely in WhatsApp/iMessage)
- [ ] Sammy's Stitch screen pixel-perfect alignment pass

### Future Features (post-demo, if time allows)
- Voice notes (UI placeholder exists, backend not built)
- AI stickers (UI placeholder exists, backend not built)
- Photo gallery view in keepsake (currently just inline)
- Hero image upload on create page
- Profile page for users
- Premium tier / payment integration
- Email notifications when contributions are added
- PDF/print export of keepsake

---

## Important Patterns

- **Supabase client:** `import { supabase } from '@/lib/supabase'` (singleton)
- **Auth check:** `const { data: { user } } = await supabase.auth.getUser()`
- **Page load pattern:** `useEffect` + async function + loading/notFound states
- **No SSR data fetching** — all client-side with `'use client'`
- **Shared Navbar:** `import Navbar from '@/components/Navbar'` — used on all pages EXCEPT auth pages and reveal page
- **Slug-based routing:** `/p/[slug]` for public pages
- **Storage:** Supabase `contributions` bucket for photos, public URLs via `getPublicUrl()`
- **Middleware:** `src/middleware.ts` — redirects authenticated users away from auth pages, unauthenticated away from dashboard
- **AI suggestions:** POST `/api/suggest` with `{ recipientName, occasion, prompt? }` → `{ suggestions: string[] }` via Claude Haiku
- **Rate limiting:** localStorage `sk-suggest-{pageId}` counter, max 3 calls per page per session
- **Reveal flow:** Creator shares `/p/{slug}/reveal` → envelope animation → redirect to `/p/{slug}/keepsake?recipient=true`
- **Creator detection:** Compare `pageData.creator_id === user.id` to show Creator Tools
- **Two personalization fields:** `creator_message` (wish for recipient) vs `contribution_prompt` (instructions for contributors) — different purposes, different display styles

## Things NOT to Do
- Don't use Geist font (removed in Phase A)
- Don't use `#1e3a5f` (old navy) — use `--espresso` (#2A1F1C) or `--terracotta` (#B76E4C)
- Don't use blue focus rings or `ring-blue-*` — global CSS handles warm focus
- Don't add `.env*` files to git (env.local incident was fixed)
- Don't use `style={{}}` inline styles unless dynamic values (gradients, textShadow, dynamic bg colors) — use Tailwind classes with design tokens
- Don't add Navbar to auth pages (keep clean) or reveal page (immersive experience)
- Don't confuse `creator_message` (wish for recipient) with `contribution_prompt` (instructions for contributors)
- Don't require login for contributors or recipients
