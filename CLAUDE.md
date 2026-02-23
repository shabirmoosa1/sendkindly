# SendKindly — Project Context for Claude

## What is SendKindly?
A collaborative celebration/keepsake platform for the Antigravity accelerator program. Creators make a celebration page, share a link with friends/family, everyone contributes messages and photos, then the creator shares the collected keepsake with the recipient.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, TypeScript, `'use client'` components)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline` syntax)
- **Backend:** Supabase (auth, Postgres DB, storage, Row Level Security)
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
src/app/
├── globals.css              ← Design system tokens + utility classes + envelope animations
├── layout.tsx               ← Root layout (Newsreader + Inter fonts)
├── page.tsx                 ← Homepage (redirects to /dashboard)
├── middleware.ts             ← Auth redirect logic
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── api/
│   └── suggest/route.ts     ← AI message suggestions (Claude Haiku API)
├── dashboard/
│   ├── page.tsx             ← Main dashboard (list celebrations)
│   └── create/page.tsx      ← 3-step create wizard (+ contribution prompt)
└── p/[slug]/
    ├── page.tsx             ← Contributor page (photo/note + AI suggestions)
    ├── keepsake/page.tsx    ← Keepsake view (all contributions)
    └── reveal/page.tsx      ← Animated envelope reveal for recipients
```

## Database Schema (Supabase)

```sql
pages (id, creator_id, slug, template_type, recipient_name, hero_image_url,
       color_scheme, event_date, status, is_premium, contribution_prompt,
       created_at, locked_at)
  -- status: 'draft' | 'collecting' | 'locked' | 'shared'
  -- contribution_prompt: optional text shown to contributors (added Phase C)

contributions (id, page_id, contributor_name, message_text, photo_url,
              voice_note_url, ai_sticker_url, created_at)

recipient_replies (id, page_id, reply_text, reply_photo_url, created_at)

ai_sticker_usage (id, page_id, prompt_text, image_url, created_at)
```

Schema SQL: `/Users/shabirmoosa/Documents/0 AI/_Our Group Build/SendKindly Group Efforts/2 Build Efforts/sendkindly_schema.sql`

## Role System (no auth for contributors/recipients)
- **Creator**: Logged-in user who created the page. Sees "Creator Tools" on keepsake page.
- **Contributor**: Anyone with the share link (`/p/{slug}`). No login required.
- **Recipient**: Anyone with `?recipient=true` URL param (`/p/{slug}/keepsake?recipient=true`). Sees "Say Thanks" form.

---

## Design System (Phase A — COMPLETE)

Sammy's warm palette applied to `globals.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` / `--ivory` | `#F6F2EC` | Warm Ivory — page backgrounds |
| `--foreground` / `--espresso` | `#2A1F1C` | Deep Espresso — headings, strong text |
| `--primary` / `--terracotta` | `#B76E4C` | Muted Terracotta — primary buttons, CTAs |
| `--accent` / `--gold` | `#C8A951` | Antique Gold — highlights, accents |
| `--cocoa` | `#5A4B45` | Muted Cocoa — body text, secondary |

**Tailwind theme colors** (usable as `bg-terracotta`, `text-espresso`, etc.):
`background`, `foreground`, `primary`, `accent`, `espresso`, `cocoa`, `terracotta`, `gold`, `ivory`

**Utility classes defined in globals.css:**
- `.glass` — glassmorphism (blur 12px, semi-transparent white, terracotta border)
- `.ios-shadow` — soft shadow (`0 4px 30px rgba(0,0,0,0.05)`)
- `.card` — white bg, rounded-3xl, ios-shadow
- `.btn-primary` — terracotta, rounded-full, min-h 52px, hover lift, active scale
- `.btn-secondary` — espresso outline, rounded-full, hover fill
- `.btn-gold` — gold, rounded-full, min-h 52px
- `.input-warm` — ivory bg, borderless, rounded-2xl, warm placeholder

**Global focus rings:** All `input:focus`, `textarea:focus`, `select:focus` use warm terracotta ring (`rgba(183,110,76,0.3)`), no blue anywhere.

**Animations:** `.animate-fade-in` (300ms), `.animate-scale-in` (250ms), `.animate-envelope-appear` (600ms), `.animate-flap-open` (800ms, 1.2s delay), `.animate-card-rise` (700ms, 1.8s delay), `.animate-shimmer` (gold text shimmer)

**Fonts in layout.tsx:**
- `--font-newsreader` → Newsreader (weights 300-700, normal+italic)
- `--font-inter` → Inter
- Headings auto-inherit Newsreader via `h1-h6` CSS rule

---

## Sprint Plan

Full plan at: `~/.claude/plans/zippy-meandering-sonnet.md`

### Phase A: Design System Foundation — COMPLETE ✅
- `globals.css`: All Sammy tokens, utility classes, warm focus rings, animations
- `layout.tsx`: Newsreader + Inter fonts, updated metadata
- Committed: `33839ad`

### Phase B: Reskin Existing Pages — COMPLETE ✅
- All 8 page files reskinned to warm design system
- `#1e3a5f`: 44 → 0 occurrences
- `#faf8f5` / `#c9a961`: 23 → 0 occurrences
- `bg-blue` / `text-blue` / `ring-blue`: 10 → 0 occurrences
- `style={{}}`: 67 → 5 remaining (all legitimate dynamic values: gradients, textShadow, dynamic bg colors)
- Auth pages: `.card`, `.btn-primary`, `.input-warm`, `text-cocoa`, `text-gold`
- Dashboard/Create: `.card`, `.btn-primary`, `bg-ivory`, `text-espresso`, `text-cocoa`, `border-gold`
- Contributor/Keepsake: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-gold`, `bg-ivory`, CSS var gradients
- Committed: Phase B commit

### Phase C: Tier 1 Features — COMPLETE ✅
- C1: "Copy Reminder Message" + "Copy Reveal Link" buttons in Creator Tools
- C2: Optional `contribution_prompt` field in create wizard, gold callout on contributor page
- C3: `/api/suggest` route (Claude Haiku) + "Need inspiration?" UI with 3 suggestion chips, rate limited 3/session
- C4: `/p/{slug}/reveal` animated envelope page with CSS keyframe animations
- Committed: `ec337cc`

### Phase D: Demo Polish — NEXT
- Seed demo data, end-to-end testing, mobile responsive check

---

## Important Patterns

- **Supabase client:** `import { supabase } from '@/lib/supabase'` (singleton)
- **Auth check:** `const { data: { user } } = await supabase.auth.getUser()`
- **Page load pattern:** `useEffect` + async function + loading/notFound states
- **No SSR data fetching** — all client-side with `'use client'`
- **Slug-based routing:** `/p/[slug]` for public pages
- **Storage:** Supabase `contributions` bucket for photos, public URLs via `getPublicUrl()`
- **Middleware:** Redirects authenticated users away from auth pages, unauthenticated away from dashboard
- **AI suggestions:** POST `/api/suggest` with `{ recipientName, occasion, prompt? }` → `{ suggestions: string[] }` via Claude Haiku
- **Rate limiting:** localStorage `sk-suggest-{pageId}` counter, max 3 calls per page per session
- **Reveal flow:** Creator shares `/p/{slug}/reveal` → envelope animation → redirects to `/p/{slug}/keepsake?recipient=true`

## Things NOT to do
- Don't use Geist font (removed in Phase A)
- Don't use `#1e3a5f` (old navy) — use `--espresso` (#2A1F1C) or `--terracotta` (#B76E4C)
- Don't use blue focus rings or `ring-blue-*` — global CSS handles warm focus
- Don't add `.env*` files to git (env.local incident was fixed)
- Don't use `style={{}}` inline styles — use Tailwind classes with design tokens
