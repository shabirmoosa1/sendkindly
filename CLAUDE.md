# SendKindly — Claude Code Reference

> Last updated: 2026-02-27
> Project: AIGF Cohort 5 — Demo Day March 28, 2026 (Bengaluru)
> Team: Code & Heart — Prof Moosa (build), Naila (mobile/desktop testing), Viral (test cases), Sanjeev (Demo Day prep), Sammy (bug feedback)

---

## 🚀 Live URLs
- **Production:** https://sendkindly-bice.vercel.app
- **Local dev:** http://localhost:3000
- **Supabase project:** https://qrczsbapizfistkdkpja.supabase.co

---

## 🛠 Tech Stack
- **Framework:** Next.js 16.1.6 (Turbopack)
- **Styling:** Tailwind CSS
- **Database + Auth + Storage:** Supabase
- **Deployment:** Vercel (auto-deploys from `main` branch)
- **APIs:** Anthropic Claude (suggestions), OpenAI DALL-E 3 (AI stickers), Resend (emails)
- **Libraries:** resend (jspdf and html2canvas removed — use Print Keepsake route instead)

---

## 📁 Project Location
```
~/Developer/sendkindly/   ← CORRECT (iCloud-free, fast)
~/Documents/sendkindly/  ← DELETED (was causing ETIMEDOUT errors)
```

---

## 🔑 Environment Variables
Set in both `.env.local` AND Vercel dashboard:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `ANTHROPIC_API_KEY` | Claude API for contribution suggestions |
| `OPENAI_API_KEY` | DALL-E 3 for AI sticker generation |
| `RESEND_API_KEY` | Transactional email sending |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is required for ALL server-side DB writes. Missing this causes silent failures. Never use client-side Supabase (anon key) for status updates — RLS will block unauthenticated writes silently.

---

## 🗄 Database Schema — `pages` table

Key columns:
- `status` — text, CHECK IN ('draft', 'active', 'revealed', 'thanked', 'complete'), DEFAULT 'active'
- `revealed_at` — timestamptz
- `thanked_at` — timestamptz
- `recipient_email` — text (collected at reveal time — not yet implemented in modal)

> ⚠️ When adding CHECK constraints, always UPDATE existing rows first:
> ```sql
> UPDATE pages SET status = 'active' WHERE status IS NULL;
> ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
> ALTER TABLE pages ADD CONSTRAINT pages_status_check CHECK (status IN (...));
> ```

Other tables:
- `contributions` — photos, messages, AI stickers per page
- `recipient_thanks` — thank you messages from recipient (written via `/api/thanks`)
- `recipient_replies` — inline replies from recipient to individual contributions
- `ai_sticker_usage` — tracks DALL-E 3 usage per page

> ⚠️ Pages use **random 8-character slugs** (e.g. `ycekqmg1`), NOT name-based slugs. Always query by slug from DB.

---

## 🎯 Celebration Lifecycle

```
Creator builds page (status: active)
  → Contributors add messages/photos/stickers
  → Creator clicks Reveal (status: active → revealed)
  → Recipient receives keepsake link with ?recipient=true
  → Recipient opens keepsake, leaves thank you (status: revealed → thanked)
  → Print Keepsake unlocks 📄
  → Contributors see "Create your own" CTA → Viral loop
```

**Status flow:** `draft` → `active` → `revealed` → `thanked` → `complete`

**Recipient URL format:** `/p/[slug]/keepsake?recipient=true`
- The `?recipient=true` param controls which UI the recipient sees
- Without it, logged-in creator sees creator view (no thank you form)
- Recipient does NOT need an account

---

## ✅ Features Completed (as of Feb 27, 2026)

### Core Platform
- [x] Creator Dashboard with page management and status badges
- [x] Create Wizard (4-step page setup)
- [x] Contributor Page (add photos, messages, AI stickers)
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

### Print & PDF
- [x] **Print Keepsake** — `/p/[slug]/keepsake/print` — A4, cream background, serif fonts
- [x] **"With Gratitude" section** — recipient's thank you message appears on final print page
- [x] **"With Love From" footer** — lists all contributor names
- [x] Download PDF button **removed** — was using broken jspdf/html2canvas approach

### AI & Enrichment
- [x] **AI Contribution Suggestions** — Claude Haiku, context-aware prompts
- [x] **AI Stickers** — DALL-E 3 generation, stored in Supabase storage

### Email (Resend)
- [x] **Reveal email** — sent to recipient when creator reveals (requires recipient_email)
- [x] **Thanks email** — sent to creator when recipient submits thank you
- [ ] **Contributor notification email** — not yet confirmed working end-to-end

### Design System v2 (Feb 27)
- [x] **Crimson + Glassmorphism rebrand** — retired Navy (#1E3A5F) and Terracotta (#B76E4C), replaced with Crimson (#C0272D) globally
- [x] **New CSS design tokens** — crimson, blush, lavender, glass recipe (`:root` + `@theme inline`)
- [x] **Glass utilities** — `.glass-panel` (blush/lavender gradient, backdrop blur, white border, layered shadows)
- [x] **Navbar redesign** — glass header, crimson italic wordmark, cocoa nav links, "Create a keepsake" CTA
- [x] **Keepsake cover glass-panel** — organizer message card uses glassmorphism
- [x] **BackPage crimson branding** — crimson labels, logo-cleaned.png, sendkindly.com link
- [x] **Global color sweep** — all 24 files updated; hex refs, Tailwind classes, email templates, OG images, confetti palettes
- [x] **Confetti palette updated** — gold, blush, crimson, lavender (replaces navy/terracotta)

---

## ⏳ Pending (as of Feb 27, 2026)

- [ ] **Reveal Modal with contact options** — replace current reveal button with modal offering Email / WhatsApp / Copy Link — this is how the recipient actually receives the keepsake
- [ ] **Recipient email collection** — `recipient_email` column exists but is never populated; needs input field in reveal modal
- [ ] **Mobile testing** — Naila to test on iOS and Android
- [ ] **Demo Day seed data** — one frozen perfect demo page in `thanked` state
- [ ] **Turbopack workspace root warning** — add `turbopack: { root: __dirname }` to next.config.ts
- [ ] **Middleware deprecation** — rename `src/middleware.ts` → `src/proxy.ts`

---

## 🔌 API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/reveal` | POST | Update status → revealed, send reveal email | Service role |
| `/api/thanks` | POST | Insert recipient_thanks, update status → thanked | Service role |
| `/api/email/thanks` | POST | Send thanks email to creator (fire-and-forget) | Service role |
| `/api/suggest` | POST | AI contribution suggestions via Claude Haiku | Anon |
| `/api/generate-sticker` | POST | DALL-E 3 sticker generation | Anon |

> ⚠️ All status-changing API routes MUST use service role Supabase client, not the cookie-based server client. RLS blocks unauthenticated status updates silently — no error is thrown, the update just doesn't happen.

---

## 📱 Key Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Creator's page management hub |
| `/dashboard/create` | New page wizard |
| `/p/[slug]` | Contributor page (add messages) |
| `/p/[slug]/keepsake` | Keepsake display (creator + recipient views) |
| `/p/[slug]/keepsake?recipient=true` | Recipient view — shows thank you form |
| `/p/[slug]/keepsake/print` | Printable A4 keepsake — gated behind thanked status |
| `/p/[slug]/reveal` | Reveal confirmation page |

---

## 🐛 Known Issues & Fixes Applied

### RLS blocks client-side status updates (FIXED)
Any Supabase write that changes `pages.status` must go through a server-side API route using the service role key. The anon client silently fails on unauthenticated writes. Both `/api/reveal` and `/api/thanks` now use service role.

### DB status constraint mismatch (FIXED)
Old constraint had `('draft','collecting','locked','shared')`. Updated to `('draft','active','revealed','thanked','complete')` via SQL Editor. Existing rows migrated to `active`.

### Print page 404 (FIXED)
`page.tsx` was not passing `slug` prop to `PrintableKeepsakeClient`. Fixed by making Page async, awaiting params, and passing slug as prop.

### Duplicate thank you forms (FIXED)
Two separate thank you forms existed — "Leave a thank you" (correct, writes to recipient_thanks) and "Say Thanks to Everyone" (old, writes to recipient_replies). Old form removed entirely.

### Port conflict
```bash
pkill -f "next dev"
npm run dev
```

### iCloud sync causing build errors (ETIMEDOUT)
Always develop in `~/Developer/` not `~/Documents/`

---

## 🌿 Git Workflow
- `main` branch → auto-deploys to Vercel
- Claude Code commits directly to main for Prof Moosa's solo builds
- Always run `npx tsc --noEmit` before committing — must show no output (zero errors)

### Recent commits (Feb 27, 2026)
| Commit | Description |
|--------|-------------|
| `7685ce4` | feat: design system v2 — crimson + glassmorphism rebrand (24 files) |
| `23bb336` | docs: update CLAUDE.md with Feb 25 fixes and current app state |
| `4329ba7` | fix: add colour and position to confetti pieces so they are visible |
| `6bf3588` | fix: remove broken Download PDF, keep Print Keepsake only; fix confetti on thanks |
| `d8f9cf3` | fix: move thanks status update to server-side API to bypass RLS |
| `3f7a7b7` | fix: remove duplicate thank you form, keep recipient_thanks flow only |

---

## 🎨 Brand (Design System v2)

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

> Navy (#1E3A5F) and Terracotta (#B76E4C) are **retired** as of Feb 27, 2026. All references replaced with Crimson.

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
- **Keepsake style:** Cream A4, multi-page book format, "With Gratitude" thank you page at end
- **Logo:** `public/logo-cleaned.png` — glassmorphic app icon, displayed in BackPage footer

---

## 🏃 Quick Start
```bash
cd ~/Developer/sendkindly
npm run dev
# Open http://localhost:3000
```

## 📋 Team Communication
- Bug reports via WhatsApp with screenshots → Prof Moosa relays to code
- Naila: mobile/desktop testing
- Viral: test case coordination  
- Sanjeev: Demo Day preparation (March 28, Bengaluru)
- Sammy: bug feedback
