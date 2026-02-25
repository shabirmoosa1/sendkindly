# SendKindly — Claude Code Reference

> Last updated: 2026-02-25
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

## ✅ Features Completed (as of Feb 25, 2026)

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

---

## ⏳ Pending (as of Feb 25, 2026)

- [ ] **Reveal Modal with contact options** — replace current reveal button with modal offering Email / WhatsApp / Copy Link — this is how the recipient actually receives the keepsake
- [ ] **Recipient email collection** — `recipient_email` column exists but is never populated; needs input field in reveal modal
- [ ] **Confetti polish** — appears but weak; needs full-screen treatment
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

### Recent commits (Feb 25, 2026)
| Commit | Description |
|--------|-------------|
| `d8f9cf3` | fix: move thanks status update to server-side API to bypass RLS |
| `3f7a7b7` | fix: remove duplicate thank you form, keep recipient_thanks flow only |
| `fa0d6b6` | fix: pass slug to PrintableKeepsakeClient so print route loads correctly |
| `560f313` | feat: gate print behind thank you, add thanks to print layout |
| `8d33030` | fix: lock contributions and hide creator tools after reveal |
| `64aba1a` | fix: reveal button by moving status update to server-side API route |

---

## 🎨 Brand
- **Navy:** `#1E3A5F`
- **Gold:** `#C9A961`
- **Terracotta:** `#B76E4C`
- **Ivory/Cream:** background colour for keepsake pages
- **Fonts:** Serif italic for keepsake headings, sans-serif for UI
- **Keepsake style:** Cream A4, multi-page book format, "With Gratitude" thank you page at end

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
