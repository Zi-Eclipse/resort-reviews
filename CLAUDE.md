# ResortReviews

Anonymous review platform for Maldives resort staff. Live at https://resortreviews.pro.

## Owner & working style

- **Owner: Eclipse.** No coding background — works entirely through conversation.
- Communicate in plain English, not jargon.
- Always show diffs before applying file changes.
- Push back if I'm wrong — don't just agree. If a "fix" I describe doesn't match what's actually in the code, tell me before changing anything.
- If a string-to-replace doesn't exist in the file, stop and ask — don't invent or improvise.

## Stack

- **Frontend:** vanilla HTML / CSS / JS (no framework, no build step)
- **Backend:** Supabase (auth + Postgres)
- **Hosting:** Vercel (`api/` folder = serverless functions)
- **Email:** Resend (transactional only)
- **Local preview:** `npx serve .` → http://localhost:3000

## Pages

| File | Purpose | Notes |
|---|---|---|
| `index.html` | Landing page | Public |
| `about.html` | About page | Public |
| `guest-feed.html` | Anonymous review feed | Public |
| `resort.html` | Individual resort profile | Requires `?id=N` query param |
| `resort-login.html` | Resort sign-in + Forgot Password | Public, uses Supabase Auth |
| `resort-dashboard.html` | Logged-in resort portal | Redirects to resort-login.html if no session |
| `admin.html` | Admin panel | Password `admin123` (client-side only) |
| `admin-verification.html` | Resort verification flow | Admin-only |
| `admin-reports.html` | Reported content review | Admin-only |

## Serverless API (`api/`)

| Endpoint | Purpose | Auth |
|---|---|---|
| `api/send-email.js` | Email via Resend | `X-Admin-Secret` or `X-Reset-Password: true` |
| `api/create-resort-user.js` | Create/update Supabase Auth user | `X-Admin-Secret` or `X-Reset-Password: true` |
| `api/delete-resort-user.js` | Delete Supabase Auth user | `X-Admin-Secret` only |

## Environment variables (Vercel)

- `RESEND_API_KEY` — Resend email sending
- `SUPABASE_URL` — `https://yaqtahzosvsrvbzurhgn.supabase.co`
- `SUPABASE_SERVICE_KEY` — Service role for admin operations
- `ADMIN_API_SECRET` — Auth secret for API endpoints

## Supabase tables

- `resorts` — integer IDs, directory data, `auth_user_id` links to `auth.users`
- `resort_profiles` — UUID IDs matching `auth.users`, dashboard-updated profile data
- `reviews` — staff reviews, status field (pending/approved/rejected)
- `resort_comments` — official resort responses on reviews
- `resort_jobs` — job listings posted by resorts
- `categories` — 9 entries: Accommodation, Cafeteria, Gym, Staff Facilities, Recreation, Transport, Management, Mosque, Other
- `reports` — flagged content for admin review

## Active patterns

- **Auth:** Supabase Auth only. `resorts.temp_password` is deprecated (NULL across the board). Never compare passwords directly; use `supabaseClient.auth.signInWithPassword()`.
- **Dark mode:** `data-theme="dark"` on `<html>`. Persists in `localStorage` under key `theme`.
- **Modals:** Overlay closes via `onclick="closeXxxModal()"`. Drag-to-select protection is handled globally by `modal-protection.js`, loaded in every page with modals. Don't remove or duplicate that script.
- **XSS:** All user-supplied text rendered via `escapeHtml()` helper. Never inject raw user text into `innerHTML`.
- **API auth:** Send `X-Admin-Secret` header for admin operations, or `X-Reset-Password: true` for self-service password resets.

## Testing rules

- Always test on `http://localhost:3000` or `https://resortreviews.pro` — never `file://`
- Hard refresh (Ctrl+F5) after deploys; mobile browsers cache hard
- Test login/session behavior in incognito to bypass cache
- After config changes, restart `npx serve .` (it reads `serve.json` on startup)

## Known test accounts

- **Resort:** `nayizziyan100@gmail.com` (Niku Maldives) — use Forgot Password to reset
- **Admin:** password `admin123`

## Pending tech debt (acceptable but not invisible)

- `resorts.temp_password` column can be dropped (data already NULL)
- Admin auth is client-side only — fine for current scale, needs proper auth before wider team use
- `style.css` has duplicate `.review-actions` and `.action-btn` rules (harmless)
