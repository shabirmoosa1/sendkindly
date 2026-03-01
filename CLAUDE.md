# SendKindly — Claude Code Reference

> Last updated: 2026-03-01
> Project: AIGF Cohort 5 — Demo Day March 28, 2026 (Bengaluru)
> Team: Code & Heart — Prof Moosa (build), Naila (mobile/desktop testing), Viral (test cases), Sanjeev (Demo Day prep), Sammy (bug feedback)

---

## Live URLs
- **Production:** https://sendkindly-bice.vercel.app
- **Local dev:** http://localhost:3000
- **Supabase project:** https://qrczsbapizfistkdkpja.supabase.co

---

## Tech Stack
- **Framework:** Next.js 16.1.6 (Turbopack)
- **Styling:** Tailwind CSS
- **Database + Auth + Storage:** Supabase
- **Deployment:** Vercel (auto-deploys from `main` branch)
- **APIs:** Anthropic Claude (suggestions), OpenAI DALL-E 3 (AI stickers), Resend (emails)
- **Libraries:** resend, react-easy-crop (photo crop tool)

---

## Project Location
```
~/Developer/sendkindly/   ← CORRECT (iCloud-free, fast)
~/Documents/sendkindly/  ← DELETED (was causing ETIMEDOUT errors)
```

---

## Environment Variables
Set in both `.env.local` AND Vercel dashboard:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `ANTHROPIC_API_KEY` | Claude API for contribution suggestions |
| `OPENAI_API_KEY` | DALL-E 3 for AI sticker generation |
| `RESEND_API_KEY` | Transactional email sending |

> **SUPABASE_SERVICE_ROLE_KEY** is required for ALL server-side DB writes. Missing this causes silent failures. Never use client-side Supabase (anon key) for status updates — RLS will block unauthenticated writes silently.

---

## Database Schema

### `pages` table
Key columns:
- `status` — text, CHECK IN ('draft', 'active', 'revealed', 'thanked', 'complete'), DEFAULT 'active'
- `revealed_at` — timestamptz
- `thanked_at` — timestamptz
- `recipient_email` — text (collected at reveal time — not yet implemented in modal)

> When adding CHECK constraints, always UPDATE existing rows first:
> ```sql
> UPDATE pages SET status = 'active' WHERE status IS NULL;
> ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
> ALTER TABLE pages ADD CONSTRAINT pages_status_check CHECK (status IN (...));
> ```

### Other tables
- `contributions` — photos, messages, AI stickers per page
- `contribution_loves` — anonymous love votes on contributions (visitor_id + contribution_id, unique constraint)
- `recipient_thanks` — thank you messages from recipient (written via `/api/thanks`)
- `recipient_replies` — inline replies from recipient to individual contributions
- `ai_sticker_usage` — tracks DALL-E 3 usage per page (limit: 20 per page)

### `contribution_loves` table (added Feb 27)
```sql
CREATE TABLE contribution_loves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX contribution_loves_unique ON contribution_loves(contribution_id, visitor_id);
CREATE INDEX contribution_loves_contribution_idx ON contribution_loves(contribution_id);
```

> Pages use **random 8-character slugs** (e.g. `ycekqmg1`), NOT name-based slugs. Always query by slug from DB.

---

## Celebration Lifecycle

```
Creator builds page (status: active)
  → Contributors add messages/photos/stickers
  → Creator clicks Reveal (status: active → revealed)
  → Recipient receives keepsake link with ?recipient=true
  → Recipient opens keepsake, leaves thank you (status: revealed → thanked)
  → Print Keepsake unlocks (sorted by love votes)
  → Contributors see "Create your own" CTA → Viral loop
```

**Status flow:** `draft` → `active` → `revealed` → `thanked` → `complete`

**Recipient URL format:** `/p/[slug]/keepsake?recipient=true`
- The `?recipient=true` param controls which UI the recipient sees
- Without it, logged-in creator sees creator view (no thank you form)
- Recipient does NOT need an account

---

## Features Completed

### Core Platform
- [x] Creator Dashboard ("My Celebrations") with page management and status badges
- [x] Create Wizard (4-step page setup)
- [x] Contributor Page (add photos, messages, AI stickers)
- [x] Photo Crop Tool — react-easy-crop with aspect ratio toggle (4:3, 1:1, 3:4), zoom slider
- [x] Keepsake Page (elegant display, glassmorphism UI)
- [x] Supabase auth + storage with RLS policies

### Lifecycle & Status
- [x] **Page Status System** — draft/active/revealed/thanked/complete
- [x] **Reveal Flow** — `/api/reveal` (server-side, uses service role key)
- [x] **Contributor Page locks after reveal** — shows "This keepsake has been delivered" message
- [x] **Creator Tools hidden after reveal** — cannot add contributions post-reveal
- [x] **Recipient Thank You** — `/api/thanks` (server-side, bypasses RLS)
- [x] **Print gate** — Print Keepsake unlocks only after status = thanked/complete
- [x] **Print page gate** — `/p/[slug]/keepsake/print` shows "Not ready" card if not yet thanked

### Love/Vote System (Feb 27 evening)
- [x] **Anonymous love votes** — visitors tap heart on any contribution, tracked via localStorage visitor ID
- [x] **Optimistic UI toggle** — instant heart fill/unfill, reverts on API failure
- [x] **Love counts** — displayed on keepsake page and print cards
- [x] **Print ordering by loves** — most-loved contributions rank higher in printable keepsake (`layoutScore()` uses `loves * 1000` as primary sort signal)
- [x] **`/api/love` route** — POST toggles love (insert/delete), GET returns counts + visitor's loves

### Dashboard & Management (Feb 27 afternoon)
- [x] **Active/Archived tabs** — replaces All/Active/Completed; Active = draft/active/revealed, Archived = thanked/complete
- [x] **Delete celebration** — `/api/delete-page` with cascading cleanup (storage files, contributions, thanks, replies, sticker usage)
- [x] **Delete contributions** — creator can remove individual contributions from keepsake page (client-side)
- [x] **Renamed "Dashboard" → "My Celebrations"** throughout app (Navbar, create page, homepage)

### Sharing (Feb 27 afternoon)
- [x] **Copy** — copies full invite message text (not just URL) via `shareOrCopy()` in `src/lib/share.ts`
- [x] **WhatsApp** — uses `wa.me/?text=` universally (no more web.whatsapp.com login page on desktop)
- [x] **Email** — Gmail web compose URL (`mail.google.com/mail/?view=cm&fs=1&su=...&body=...`) instead of broken `mailto:`
- [x] **Share URL helper** — `getShareUrl()` in `src/lib/getShareUrl.ts` detects localhost and returns production URL

### Print & PDF
- [x] **Print Keepsake** — `/p/[slug]/keepsake/print` — A4, cream background, serif fonts
- [x] **"With Gratitude" section** — recipient's thank you message appears on its own page
- [x] **"With Love From" footer** — lists all contributor names
- [x] **Love count badges** on print cards (TextNote, PhotoUnit, StickerUnit)
- [x] Download PDF button **removed** — was using broken jspdf/html2canvas approach

### AI & Enrichment
- [x] **AI Contribution Suggestions** — Claude Haiku, context-aware prompts
- [x] **AI Thank You Suggestions** — "Need inspiration?" button on thank you form
- [x] **AI Stickers** — DALL-E 3 generation, stored in Supabase storage
- [x] **Edit/delete own contributions** — contributors can modify before reveal

### Email (Resend)
- [x] **Reveal email** — sent to recipient when creator reveals (requires recipient_email)
- [x] **Thanks email** — sent to creator when recipient submits thank you
- [ ] **Contributor notification email** — not yet confirmed working end-to-end

### Responsive Design (Feb 27 afternoon)
- [x] **Navbar** — responsive Tailwind classes (`px-3 sm:px-6`, `text-xs sm:text-sm`, `gap-2 sm:gap-4`)
- [x] **Dashboard cards** — responsive padding, smaller emojis on mobile, scaled headings
- [x] **Keepsake page** — responsive hero banner, contribution grid
- [x] **Homepage** — responsive hero, feature cards
- [x] **All key pages** tested for 320px–1440px viewport range

### Design System v2 (Feb 27)
- [x] **Crimson + Glassmorphism rebrand** — retired Navy (#1E3A5F) and Terracotta (#B76E4C), replaced with Crimson (#C0272D) globally
- [x] **New CSS design tokens** — crimson, blush, lavender, glass recipe (`:root` + `@theme inline`)
- [x] **Glass utilities** — `.glass-panel` (blush/lavender gradient, backdrop blur, white border, layered shadows)
- [x] **Navbar redesign** — glass header, crimson italic wordmark, cocoa nav links, "Create a keepsake" CTA
- [x] **Logo-cleaned branding** — `public/logo-cleaned.png` glassmorphic app icon, occasion cards with logo-box
- [x] **Confetti palette** — gold, blush, crimson, lavender

---

## Pending

- [ ] **Reveal Modal with contact options** — replace current reveal button with modal offering Email / WhatsApp / Copy Link
- [ ] **Recipient email collection** — `recipient_email` column exists but is never populated; needs input field in reveal modal
- [ ] **Organiser drag-to-reorder** (Option B) — manual print order control for creators (love votes is Option A, done)
- [ ] **Demo Day seed data** — one frozen perfect demo page in `thanked` state with love votes
- [ ] **Mobile testing** — Naila to test love votes on iOS and Android
- [ ] **Turbopack workspace root warning** — add `turbopack: { root: __dirname }` to next.config.ts
- [ ] **Middleware deprecation** — rename `src/middleware.ts` → `src/proxy.ts`

---

## API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/reveal` | POST | Update status → revealed, send reveal email | Service role |
| `/api/thanks` | POST | Insert recipient_thanks, update status → thanked | Service role |
| `/api/email/thanks` | POST | Send thanks email to creator (fire-and-forget) | Service role |
| `/api/suggest` | POST | AI contribution suggestions via Claude Haiku | Anon |
| `/api/generate-sticker` | POST | DALL-E 3 sticker generation | Anon |
| `/api/delete-page` | POST | Cascading delete: storage + contributions + thanks + replies + page | Service role |
| `/api/love` | GET | Get love counts + visitor's loves for a page's contributions | Service role |
| `/api/love` | POST | Toggle love on a contribution (insert or delete) | Service role |

> All status-changing API routes MUST use service role Supabase client. RLS blocks unauthenticated writes silently.

---

## Key Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Creator's "My Celebrations" hub (Active/Archived tabs) |
| `/dashboard/create` | New page wizard |
| `/p/[slug]` | Contributor page (add messages, photos, stickers with crop tool) |
| `/p/[slug]/keepsake` | Keepsake display (creator + recipient views, love votes) |
| `/p/[slug]/keepsake?recipient=true` | Recipient view — shows thank you form |
| `/p/[slug]/keepsake/print` | Printable A4 keepsake — sorted by love count, gated behind thanked status |
| `/p/[slug]/reveal` | Reveal confirmation page |

---

## Key Implementation Details

### Love/Vote System (`/api/love` + `KeepsakePageClient.tsx`)
- Anonymous: uses `sk_visitor_id` in localStorage (UUID, generated once per browser)
- One love per visitor per contribution (unique constraint in DB)
- Optimistic UI: heart toggles instantly, reverts if API fails
- Print sort: `layoutScore()` = `loves * 1000 + mediaBonus + wordCount` — loves are primary signal
- Print cards show love count badges when > 0

### Sharing (`src/lib/share.ts` + `src/lib/getShareUrl.ts`)
- `shareOrCopy()` tries native share on mobile, falls back to clipboard copy of **full invite message** (not just URL)
- `getShareUrl()` returns production URL even on localhost, so shared links always work
- WhatsApp: `wa.me/?text=` (universal, no login page)
- Email: Gmail compose URL (not mailto:)

### Photo Crop (`react-easy-crop` in `ContributorPageClient.tsx`)
- Aspect ratio toggle: Landscape (4:3), Square (1:1), Portrait (3:4)
- Zoom slider (1–3x)
- `src/lib/cropImage.ts` canvas utility produces cropped JPEG File
- Cropped result replaces `photoFile` before upload — no display surprises

### Print Layout (`PrintableKeepsakeClient.tsx`)
- `layoutScore()` — sorts contributions (loves primary, then media + word count)
- `layoutWeight()` — estimates how much A4 space each contribution needs
- `groupIntoPages()` — bins contributions into A4 pages (max weight ~0.90 per page)
- Featured contribution (highest score) goes on cover page
- BackPage inlined on last content page if room (weight <= 0.80), otherwise separate page

### Dashboard Tabs (`src/app/dashboard/page.tsx`)
- **Active** tab: `draft`, `active`, `revealed` statuses — shows share + manage tools
- **Archived** tab: `thanked`, `complete` statuses — read-only, delete available
- Tab counts shown in badges

---

## Known Issues & Fixes Applied

### RLS blocks client-side status updates (FIXED)
Any Supabase write that changes `pages.status` must go through a server-side API route using the service role key. The anon client silently fails on unauthenticated writes.

### DB status constraint mismatch (FIXED)
Old constraint had `('draft','collecting','locked','shared')`. Updated to `('draft','active','revealed','thanked','complete')`. Dead status values `collecting`, `locked`, `shared` cleaned from all code.

### Create wizard used 'collecting' status (FIXED — `472dedd`)
Create wizard was setting `status: 'collecting'` which violated the DB constraint. Changed to `status: 'active'`.

### WhatsApp opening login page on desktop (FIXED — `6cc2612`)
`web.whatsapp.com/send?text=` requires being logged into WhatsApp Web. Changed to `wa.me/?text=` universally which handles redirects.

### Email opening blank browser (FIXED — `6cc2612`)
`mailto:` links don't work on many systems (especially webmail users). Changed to Gmail web compose URL.

### Copy only pasting URL (FIXED — `6cc2612`)
`shareOrCopy()` was copying `options.url` in clipboard fallback. Changed to copy `options.text` (full invite message).

### Clickable emojis in printable keepsake (FIXED — `c270612`)
`EmojiReactions` component rendered interactive buttons in print view. Removed from all print components. `EmojiReactions.tsx` deleted entirely.

### Print page 404 (FIXED)
`page.tsx` was not passing `slug` prop to `PrintableKeepsakeClient`. Fixed by making Page async, awaiting params, and passing slug as prop.

### Duplicate thank you forms (FIXED)
Two separate forms existed. Old form removed entirely.

### Port conflict
```bash
pkill -f "next dev"
npm run dev
```

### iCloud sync causing build errors (ETIMEDOUT)
Always develop in `~/Developer/` not `~/Documents/`

---

## Git Workflow
- `main` branch → auto-deploys to Vercel
- Claude Code commits directly to main for Prof Moosa's solo builds
- Always run `npx tsc --noEmit` before committing — must show no output (zero errors)
- **Push after every commit** — keeps Vercel deploys granular and makes rollback easy

### Session Tracking Convention
Each Claude Code conversation = one session. Follow this at the **start and end** of every session:

**Start of session:**
1. Read CLAUDE.md for context
2. Announce the session name: `YYYY-MM-DD <Purpose>` (e.g., `2026-03-05 Reveal Modal`)
3. Commit and push after each feature/fix (not in batches)

**End of session:**
1. Run `npx tsc --noEmit` — confirm zero errors
2. Update the Session Log table in CLAUDE.md with all commits from this session
3. Update any changed sections (Features Completed, Pending, API Routes, etc.)
4. Commit CLAUDE.md update: `docs: update CLAUDE.md with <session name>`
5. Push

**Session naming:** `YYYY-MM-DD <Purpose>`
- Use the date the session started
- Purpose should be 2–4 words: `Build Features`, `Design Rebrand`, `Bug Fixes`, `Demo Day Prep`
- If two sessions happen on the same day, add time of day: `2026-03-05 AM Bug Fixes`, `2026-03-05 PM New Features`

### Session Log (chronological)

> **Convention:** Sessions named by date + purpose. Each push is individually tracked.
> Commits marked BATCH were pushed together; PUSH means pushed individually right after commit.

**Pre-push era (Feb 15–24) — batch-pushed, 38 commits**
Multiple Claude Code sessions across initial build. All committed locally and pushed to GitHub in bulk. Not individually tracked. Key milestones:
- Feb 15–16: Initial Next.js + Supabase scaffolding
- Feb 20: Phase 2 core pages (Dashboard, Create, Contributor, Keepsake)
- Feb 22: Auth, Sammy feedback fixes, occasions, env cleanup
- Feb 23 AM: Phases A–D marathon (design system, features, homepage)
- Feb 23 PM: Phase E visual upgrade (PRs #1 + #2), Sammy bug fixes, UX polish
- Feb 24 AM: Printable keepsake, emoji reactions, print layout

**2026-02-25 Build Features (13:18–23:49) — 16 commits, each pushed individually**
| Commit | Time | Description |
|--------|------|-------------|
| `bef53be` | 13:18 | feat: AI Sticker feature + fix CoverPage build error |
| `1bfa1c5` | 13:26 | feat: sticker support to print keepsake + cleanup |
| `cd7b0b8` | 13:54 | feat: QR Code sharing to Dashboard and Keepsake |
| `a59ac6b` | 15:37 | feat: PDF download to keepsake page |
| `06626b7` | 16:03 | feat: page status lifecycle: reveal flow, access control, PDF gate |
| `ddf1d85` | 16:14 | feat: recipient thank you with prompt, display, standalone page |
| `1c0156c` | 16:50 | feat: email notifications for reveal/thanks lifecycle |
| `64aba1a` | 16:52 | fix: reveal button → server-side API route |
| `8d33030` | 18:29 | fix: lock contributions and hide creator tools after reveal |
| `560f313` | 18:41 | feat: gate print behind thank you, add thanks to print layout |
| `fa0d6b6` | 22:49 | fix: pass slug to PrintableKeepsakeClient |
| `3f7a7b7` | 23:13 | fix: remove duplicate thank you form |
| `d8f9cf3` | 23:24 | fix: move thanks status update to server-side API (RLS bypass) |
| `6bf3588` | 23:37 | fix: remove broken Download PDF, keep Print Keepsake; fix confetti |
| `4329ba7` | 23:41 | fix: confetti colour and position |
| `23bb336` | 23:49 | **docs: CLAUDE.md update** |

**2026-02-27 Design Rebrand (06:10–06:20) — 2 commits, batch-pushed at 06:20**
| Commit | Time | Description |
|--------|------|-------------|
| `7685ce4` | 06:10 | feat: design system v2 — crimson + glassmorphism rebrand (24 files) |
| `d7368c1` | 06:20 | **docs: CLAUDE.md update** (pushed both commits) |

**2026-02-27 Build Features 2 (14:25–22:34) — 13 commits, each pushed individually**
| Commit | Time | Description |
|--------|------|-------------|
| `35540ce` | 14:25 | feat: logo-cleaned branding, logo-box occasion cards |
| `038de93` | 14:58 | fix: AI inspiration working + suggestions for thank you and replies |
| `a6277d8` | 16:10 | feat: edit/delete own contributions + clearer inspiration hints |
| `f20498b` | 16:34 | feat: photo crop tool for contributors (react-easy-crop, issue #4) |
| `c459f18` | 16:42 | fix: share links use production URL + WhatsApp/Email share buttons |
| `472dedd` | 18:36 | fix: create wizard used status 'collecting' — changed to 'active' |
| `819cd32` | 20:30 | refactor: clean up dashboard cards + keepsake creator tools layout |
| `8e2b895` | 20:39 | refactor: clean dashboard cards, smarter WhatsApp, remove Reminder |
| `893a971` | 20:56 | fix: responsive design + rename Dashboard to My Celebrations |
| `6cc2612` | 21:27 | feat: sharing fixes, Active/Archived tabs, delete celebration |
| `c270612` | 22:13 | fix: remove clickable emoji reactions from printable keepsake |
| `1cec069` | 22:27 | feat: love/vote system for keepsake contributions |
| `4839414` | 22:34 | **docs: CLAUDE.md update** |

**2026-03-01 Housekeeping — 1 commit**
| Commit | Time | Description |
|--------|------|-------------|
| `f3cd85a` | — | feat: increase AI sticker limit from 5 to 20 per page |

---

## Brand (Design System v2)

### Colour Palette
| Token | Hex | Usage |
|-------|-----|-------|
| **Crimson** | `#C0272D` | Primary brand, CTA buttons, links, wordmark |
| **Blush** | `#F2C4CE` | Glass panel gradient start, confetti |
| **Lavender** | `#C8CBE8` | Glass panel gradient end, confetti |
| **Gold** | `#C8A951` | Accent, decorative rules, confetti |
| **Ivory** | `#F6F2EC` | Page backgrounds |
| **Espresso** | `#2A1F1C` | Headings, primary text |
| **Cocoa** | `#5A4B45` | Body text, nav links |

> Navy (#1E3A5F) and Terracotta (#B76E4C) are **retired** as of Feb 27. All references replaced with Crimson.

### Glass Recipe
```css
background: linear-gradient(135deg, rgba(242,196,206,0.45), rgba(200,203,232,0.35));
backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.6);
box-shadow: 0 8px 32px rgba(192,39,45,0.08), 0 2px 8px rgba(200,203,232,0.3), inset 0 1px 0 rgba(255,255,255,0.8);
border-radius: 16px;
```
Utility classes: `.glass-panel`, `.glass` (navbar), `.btn-primary`, `.btn-secondary`, `.gold-rule`

### Typography & Style
- **Display font:** `'Newsreader', Georgia, serif` — keepsake headings, wordmark (italic)
- **Body font:** `'Inter', system-ui, sans-serif` — UI text
- **Keepsake style:** Cream A4, multi-page book format, "With Gratitude" page, love count badges
- **Logo:** `public/logo-cleaned.png` — glassmorphic app icon, displayed in BackPage footer

---

## Quick Start
```bash
cd ~/Developer/sendkindly
npm run dev
# Open http://localhost:3000
```

## Team Communication
- Bug reports via WhatsApp with screenshots → Prof Moosa relays to code
- Naila: mobile/desktop testing (issues tracked by number, e.g. #4 = photo crop, #9 = responsive)
- Viral: test case coordination
- Sanjeev: Demo Day preparation (March 28, Bengaluru)
- Sammy: bug feedback
