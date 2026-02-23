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
│   ├── supabase.ts             ← Supabase client singleton
│   └── share.ts                ← Share utilities (native share + clipboard + email)
├── components/
│   └── Navbar.tsx              ← Shared navigation (auth-aware, sticky, "Dashboard" link)
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
    │   └── suggest/route.ts    ← AI message suggestions (Claude Haiku API, env var guarded)
    ├── dashboard/
    │   ├── page.tsx            ← Dashboard (celebrations + share tools + future features)
    │   └── create/page.tsx     ← 3-step create wizard (with creator name + occasion placeholders)
    └── p/[slug]/
        ├── page.tsx            ← Server wrapper (generateMetadata)
        ├── ContributorPageClient.tsx  ← Contributor page (photo/note + AI + email collection)
        ├── opengraph-image.tsx        ← Dynamic OG image (edge runtime)
        ├── keepsake/
        │   ├── page.tsx               ← Server wrapper (generateMetadata)
        │   ├── KeepsakePageClient.tsx  ← Keepsake view (contributions + moderation + replies)
        │   └── opengraph-image.tsx    ← Dynamic OG image (edge runtime)
        └── reveal/
            ├── page.tsx               ← Server wrapper
            ├── RevealPageClient.tsx    ← Animated envelope reveal
            └── opengraph-image.tsx    ← Dynamic OG image (edge runtime, intentionally vague)
```

---

## Database Schema (Supabase)

```sql
pages (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users,
  creator_name TEXT,                -- organizer's display name (added Session 5)
  slug TEXT UNIQUE,
  template_type TEXT,              -- occasion: birthday, wedding, baby_shower, etc.
  recipient_name TEXT,
  hero_image_url TEXT,
  color_scheme TEXT,
  event_date DATE,
  status TEXT DEFAULT 'collecting', -- 'draft' | 'collecting' | 'locked' | 'shared'
  is_premium BOOLEAN DEFAULT false,
  creator_message TEXT,            -- organizer's personal message FOR the recipient (added Session 3)
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
  recipient_reply TEXT,            -- per-contribution reply from recipient (added Session 4)
  contributor_email TEXT,          -- optional email for keepsake notification (added Session 4)
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
- `ALTER TABLE contributions ADD COLUMN recipient_reply TEXT;` (Session 4)
- `ALTER TABLE contributions ADD COLUMN contributor_email TEXT;` (Session 4)
- `ALTER TABLE pages ADD COLUMN creator_name TEXT;` (Session 5)

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
- **Right (logged in):** "Dashboard" link, user email (hidden on mobile), Sign Out button
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
- **Primary buttons:** "Share Contributor Link" (native share on mobile / clipboard on desktop) + "View Keepsake"
- **Expandable "More options":** Copy Reveal Link (for recipient) + Copy Reminder Message (nudge)
- Empty state with "Create your first celebration!" CTA
- Dashed "Planning something new?" card
- **"COMING IN FUTURE" section:** 6 placeholder cards (Group Gift Fund, QR Code Sharing, Co-Organizers, Video Messages, Print Keepsake, Notifications)

### Create Wizard (`src/app/dashboard/create/page.tsx`)
3-step wizard with progress dots:
- **Step 1:** Recipient name, **Your name** (creator), occasion dropdown (12 options, **dynamic placeholders** per occasion), "Your message for {name}" (500 chars), "Instructions for contributors" (200 chars)
- **Step 2:** Template selection (Classic ✨, Playful 🎨, Memorial 🕊️) + optional cover image upload
- **Step 3:** Review all fields + "Create Celebration 🎉" button
- Generates 8-char random slug, inserts into `pages` table, **redirects to contributor page** (so organizer can immediately contribute photos/notes)

### Contributor Page (`src/app/p/[slug]/ContributorPageClient.tsx`)
What people see when they open a shared link — most important page for engagement:
- **Hero card:** Tall image area (h-56), occasion label, recipient name, contribution count
- **Organizer's message:** Displayed prominently as "{CREATOR_NAME}'S MESSAGE" with terracotta left-border, italic text (falls back to "A MESSAGE FROM THE ORGANIZER" for older pages)
- **Contribution prompt:** Gold callout with 💡 below hero card ("Instructions for contributors")
- **Contribution types:** 2x2 grid (Add Photo, Write Note, Voice Note [coming soon], AI Sticker [coming soon])
- **Write Note form:** Name input, textarea with 500-char limit, "Need inspiration? ✨" AI suggestion button
- **Add Photo form:** Name input, file picker, optional caption
- **Success state:** "Your contribution has been added!" + optional email collection ("Want to see the final keepsake?") + "Add Another" button
- **Navigation:** "View Keepsake" link at bottom
- **Dynamic OG image:** `opengraph-image.tsx` (edge runtime) — shows hero photo or warm gradient, occasion emoji, recipient name

### Keepsake Page (`src/app/p/[slug]/keepsake/KeepsakePageClient.tsx`)
- **Hero banner:** Full-width gradient or hero image, occasion label, recipient name, contribution count
- **Organizer's message:** Pinned card at top — "{CREATOR_NAME}'S MESSAGE" with terracotta left-border (visible to everyone)
- **Contributions grid:** Masonry-style 3-column layout, pastel background colors cycling
- **Per-contribution features:**
  - Creator: delete button (✕) on each card with confirmation
  - Recipient: reply button per card, inline textarea, saved replies shown with 💛
- **Creator Tools** (visible only to logged-in creator):
  - "Add Your Contribution" button + "Ask Others to Contribute" (native share / clipboard + email option)
- **Recipient reply section:** Global "Say Thanks" form (with `?recipient=true`) + per-contribution inline replies
- **Dynamic OG image:** `keepsake/opengraph-image.tsx` — "A Keepsake for {name}"

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
| **Organizer's Message** | `creator_message` | Personal message FROM organizer FOR the recipient | Everyone (contributor page + keepsake) | "{CREATOR_NAME}'S MESSAGE" — terracotta left-border, italic, prominent |
| **Instructions** | `contribution_prompt` | Guidance for contributors on what kind of messages to write | Contributors only (contributor page) | Gold callout with 💡, smaller, below hero |

**Example:** For Grandma's 80th birthday (organizer: Shabir):
- Organizer's message: "Happy 80th birthday Grandma! You fill our lives with so much love and laughter." → displays as "SHABIR'S MESSAGE"
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

### Session 4: Demo Polish + Dynamic OG Images

**Phase D: Demo Polish** — COMPLETE ✅
- **D1:** Seed demo data — "Grandma Sarah" birthday with 8 contributions (text + photos)
- **D2:** Error handling + loading states across all pages
- **D3:** Mobile responsive fixes
- **D4:** Hero image upload in create wizard (Step 2) with preview + 5MB limit
- **D5:** Dynamic per-celebration OG images (3 files, edge runtime, Supabase REST API):
  - `p/[slug]/opengraph-image.tsx` — hero photo or gradient, occasion emoji, name
  - `p/[slug]/keepsake/opengraph-image.tsx` — "A Keepsake for {name}"
  - `p/[slug]/reveal/opengraph-image.tsx` — intentionally vague "💌 {name}, you have a surprise!"
- Occasion emoji mapping for 13 types in OG images

**Commits:** `6ff7b83` (Phase D + OG images)

### Session 5: UX Overhaul + Creator Experience

**Shabir's feedback that drove this session:**
- "Remove Copy Reveal Link and Copy Reminder Link from keepsake, move to Dashboard"
- "Remove 'Back to Dashboard' button, rename 'My Celebrations' to 'Dashboard'"
- "Tips/examples should be occasion-specific, not just birthdays"
- "AI suggestions don't work" (missing ANTHROPIC_API_KEY in Vercel)
- "Need review/delete option at organiser end"
- "Recipient should be able to comment on each post"
- "Collect emails from contributors to share final keepsake"
- "'Other Celebration' should just say 'Celebration'"
- "Remove 'For' from recipient name headings"
- "Instead of 'THE ORGANIZER'S WISH' it should say '{Name}'s message'"
- "Organizer should be able to contribute like others"
- "Add future feature placeholders to show product vision"

**Changes made (7 priorities + polish):**

1. **P1: Creator Tools moved to Dashboard** — Reveal link + reminder message moved to expandable "More options" per card. Keepsake cleaned down to 2 buttons: "Add Your Contribution" + "Ask Others to Contribute"
2. **P2: AI suggestions fixed** — Moved Anthropic client inside handler, env var check (503), safe JSON parse, client-side error guard. `ANTHROPIC_API_KEY` added to Vercel env vars.
3. **P3: Dynamic occasion placeholders** — 12-occasion `OCCASION_PLACEHOLDERS` map in create wizard, textarea placeholders change per occasion
4. **P4: Native share + email** — `src/lib/share.ts` with `shareOrCopy()` (native share on mobile, clipboard on desktop) + `openEmailShare()` via `mailto:`
5. **P5: Creator moderation** — Delete button (✕) on contribution cards, confirmation dialog, removes from DB + storage
6. **P6: Per-contribution replies** — Recipients can reply inline to individual contributions, replies saved to `contributions.recipient_reply`
7. **P7: Contributor email collection** — Optional email input after contributing ("Want to see the final keepsake?"), stored in `contributions.contributor_email`
8. **Label fixes** — "Other Celebration" → "Celebration", removed "For" prefix from all name headings
9. **Creator name** — Added "Your Name" field to create wizard, stored as `creator_name` in pages table. Label changed: "THE ORGANIZER'S WISH" → "{NAME}'S MESSAGE"
10. **Post-creation redirect** — After creating, redirects to contributor page (not dashboard) so organizer can contribute photos/notes
11. **Future features** — "COMING IN FUTURE" section on dashboard: Group Gift Fund, QR Code Sharing, Co-Organizers, Video Messages, Print Keepsake, Notifications
12. **Navbar** — "My Celebrations" renamed to "Dashboard"

**DB migrations (all applied):**
- `ALTER TABLE contributions ADD COLUMN recipient_reply TEXT;`
- `ALTER TABLE contributions ADD COLUMN contributor_email TEXT;`
- `ALTER TABLE pages ADD COLUMN creator_name TEXT;`

**New files:**
- `src/lib/share.ts` — Share utilities
- `src/app/p/[slug]/opengraph-image.tsx` — Dynamic OG (contributor)
- `src/app/p/[slug]/keepsake/opengraph-image.tsx` — Dynamic OG (keepsake)
- `src/app/p/[slug]/reveal/opengraph-image.tsx` — Dynamic OG (reveal)

**Commits:** `32fa792` (P1-P7 UX overhaul), `37629a2` (label fixes), `26db2e5` (creator name + redirect), `c6efc07` (future features)

### Session 6: Phase E Visual Upgrade

**Goal:** Apply Sammy's Stitch screen designs across all pages — glassmorphism, italic serif headings, uppercase micro-labels, iOS soft shadows. CSS-only changes, zero logic modifications.

**Reference materials used:**
- 7 Stitch hero screen PNGs from `SendKindly Group Efforts/2 Build Efforts/Stitch screens/`
- Master Prompt design doc from Sammy
- Session Handoff doc with 7-step plan

**Changes made (7 steps across 2 PRs):**

**PR #1 — Auth pages + contributor success state:**
1. **Login page** — Glass form card (`.glass rounded-3xl ios-shadow`), italic serif heading, uppercase labels, password eye toggle with SVG icons
2. **Signup page** — Same glass pattern + `EyeIcon` component + "Failed to fetch" network error fix + rate limit hint text
3. **Forgot/Reset password pages** — Glass card pattern applied consistently
4. **Contributor success state** — Confetti animation, branded logo with checkmark badge, italic serif heading "Your contribution is safe.", glass panel
5. **globals.css** — Added confetti keyframes (`.confetti-container`, `.confetti-piece`) + `.luminous-border` gradient class

**PR #2 — Dashboard, create wizard, contributor page, keepsake:**
6. **Dashboard** — "OWNER STUDIO" micro-label, italic h1, glass celebration cards, glass filter tabs, glass future feature cards, glass "Planning something new?" card
7. **Create Wizard** — Glass card wrapper, "STEP X OF 3" label, italic headings, uppercase form labels, glass review panel
8. **Contributor Page** — "A KIND GESTURE" branding label, glass hero card, glass organizer message, "CHOOSE YOUR EXPRESSION" subtitle, glass type picker cards, glass form panels, uppercase form labels
9. **Keepsake Page** — "A KEEPSAKE" / "SENDKINDLY" banner labels, italic heading, glass organizer message, glass contribution cards, glass creator tools, glass reply sections

**Bug fixes included:**
- Password eye toggle on login + signup (was missing)
- "Failed to fetch" network error handling on signup
- Rate limit hint text for Supabase free-tier signup limits

**Design system ingredients applied consistently:**
- `.glass` — glassmorphism (blur 12px, semi-transparent white bg, terracotta border)
- `.ios-shadow` — soft shadow
- `.rounded-3xl` / `.rounded-2xl` — rounded corners
- `italic` — Newsreader serif via global CSS `h1-h6` rule
- `text-xs font-medium tracking-widest` — uppercase micro-labels
- `text-cocoa/60` — muted secondary text

**Commits:**
- `5e3a3f8` — Phase E visual upgrade: auth pages glass styling, eye toggle, bug fixes (PR #1)
- `6503f13` — Phase E visual upgrade: dashboard, create wizard, contributor, keepsake glass styling (PR #2)
- `cee690f` — Minor polish: italic not-found headings, SENDKINDLY watermark on keepsake banner

---

## Current Status (as of 23 Feb 2026)

| Phase | Status |
|-------|--------|
| Phase A: Design System | ✅ COMPLETE |
| Phase B: Reskin | ✅ COMPLETE |
| Phase C: Tier 1 Features | ✅ COMPLETE |
| Session 3: Homepage & UX Overhaul | ✅ COMPLETE |
| Session 4: Demo Polish + OG Images | ✅ COMPLETE |
| Session 5: UX Overhaul + Creator Experience | ✅ COMPLETE |
| **Session 6: Phase E Visual Upgrade** | **✅ COMPLETE** |

### Phase E: Remaining Testing — TODO
- [ ] End-to-end flow testing (create → contribute → reveal → keepsake → reply)
- [ ] Mobile responsive testing (all pages, especially contributor page and keepsake)
- [ ] Test per-contribution replies (recipient flow)
- [ ] Test contributor email collection
- [ ] Test AI suggestions with ANTHROPIC_API_KEY in production
- [ ] Test native share on mobile devices (WhatsApp, iMessage)
- [ ] Test creator moderation (delete contributions)
- [ ] Seed fresh demo data for demo day with creator_name populated
- [ ] Edge cases: empty states, very long messages, special characters, multiple photos
- [ ] Performance: loading states, error handling, offline graceful degradation
- [ ] WhatsApp/iMessage OG preview validation for all page types

### Future Features (shown as placeholders on dashboard)
- 🎁 Group Gift Fund — pool money towards a gift together
- 📱 QR Code Sharing — scan to contribute at in-person events
- 👥 Co-Organizers — invite others to help manage the celebration
- 🎥 Video Messages — record video contributions
- 🖨️ Print Keepsake — export as a beautiful PDF
- 🔔 Notifications — get notified when someone contributes

### Other Future Features (not yet shown)
- Voice notes (UI placeholder exists, backend not built)
- AI stickers (UI placeholder exists, backend not built)
- Photo gallery view in keepsake (currently just inline)
- Profile page for users
- Premium tier / payment integration

---

## Important Patterns

- **Supabase client:** `import { supabase } from '@/lib/supabase'` (singleton)
- **Auth check:** `const { data: { user } } = await supabase.auth.getUser()`
- **Page load pattern:** `useEffect` + async function + loading/notFound states
- **No SSR data fetching** — all client-side with `'use client'`
- **Server/Client split:** `page.tsx` (server, `generateMetadata`) + `*Client.tsx` (client, interactive UI)
- **Shared Navbar:** `import Navbar from '@/components/Navbar'` — used on all pages EXCEPT auth pages and reveal page
- **Slug-based routing:** `/p/[slug]` for public pages
- **Storage:** Supabase `contributions` bucket for photos, public URLs via `getPublicUrl()`
- **Middleware:** `src/middleware.ts` — redirects authenticated users away from auth pages, unauthenticated away from dashboard
- **AI suggestions:** POST `/api/suggest` with `{ recipientName, occasion, prompt? }` → `{ suggestions: string[] }` via Claude Haiku. Env var guarded (503 if missing).
- **Rate limiting:** localStorage `sk-suggest-{pageId}` counter, max 3 calls per page per session
- **Reveal flow:** Creator shares `/p/{slug}/reveal` → envelope animation → redirect to `/p/{slug}/keepsake?recipient=true`
- **Creator detection:** Compare `pageData.creator_id === user.id` to show Creator Tools
- **Two personalization fields:** `creator_message` (message for recipient) vs `contribution_prompt` (instructions for contributors) — different purposes, different display styles
- **Share utility:** `import { shareOrCopy, openEmailShare } from '@/lib/share'` — native share on mobile, clipboard fallback on desktop
- **Mobile detection:** `isMobile` state via `useEffect` + `/Mobi|Android/i.test(navigator.userAgent)` to avoid SSR issues
- **OG images:** Edge runtime, fetch Supabase REST API directly (no cookies needed for public data), `ImageResponse` from `next/og`
- **Occasion label:** "Other" type shows just "CELEBRATION" (not "OTHER CELEBRATION") — handled with ternary in all display locations
- **Name display:** No "For" prefix — just the recipient name directly
- **Creator name display:** `{creator_name}'S MESSAGE` or fallback `A MESSAGE FROM THE ORGANIZER`
- **Glass card pattern:** All cards now use `glass rounded-3xl ios-shadow` (or `rounded-2xl` for smaller cards) instead of `.card`. The `.card` class (white bg) is no longer used on any page.
- **Heading pattern:** All main headings use `italic` (Newsreader serif via global CSS). No `font-bold` on headings — the serif italic is the visual weight.
- **Micro-label pattern:** Section labels use `text-xs font-medium tracking-widest text-cocoa/60` (uppercase in JSX text). Examples: "OWNER STUDIO", "A KIND GESTURE", "CHOOSE YOUR EXPRESSION", "STEP 1 OF 3", "CREATOR TOOLS"
- **Auth page pattern:** Logo icon (`w-24 h-24 rounded-[2rem] bg-ivory ios-shadow`) + glass form card + `EyeIcon` component for password toggle
- **Password eye toggle:** `showPassword` / `showConfirm` state + inline SVG `EyeIcon` component (defined per auth page, not shared)

## Things NOT to Do
- Don't use Geist font (removed in Phase A)
- Don't use `#1e3a5f` (old navy) — use `--espresso` (#2A1F1C) or `--terracotta` (#B76E4C)
- Don't use blue focus rings or `ring-blue-*` — global CSS handles warm focus
- Don't add `.env*` files to git (env.local incident was fixed)
- Don't use `style={{}}` inline styles unless dynamic values (gradients, textShadow, dynamic bg colors) — use Tailwind classes with design tokens
- Don't add Navbar to auth pages (keep clean) or reveal page (immersive experience)
- Don't confuse `creator_message` (message for recipient) with `contribution_prompt` (instructions for contributors)
- Don't require login for contributors or recipients
- Don't prefix recipient names with "For" — just show the name directly
- Don't show "OTHER CELEBRATION" — use just "CELEBRATION" for the "other" occasion type
- Don't say "THE ORGANIZER'S WISH" — use "{NAME}'S MESSAGE" (from `creator_name` column)
- Don't put Creator Tools (reveal link, reminder) on keepsake page — those belong on the dashboard
- Don't instantiate Anthropic client at module level — must be inside handler with env var check
- Don't use `.card` class for new components — use `glass rounded-3xl ios-shadow` (or `rounded-2xl` for smaller items)
- Don't use `font-bold` on main headings — use `italic` (Newsreader serif provides visual weight)
- Don't use `font-semibold` on micro-labels — use `font-medium tracking-widest` for the uppercase label pattern
