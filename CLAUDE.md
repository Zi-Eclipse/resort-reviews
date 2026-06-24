# ResortReviews

Anonymous review platform for Maldives resort staff. Live at resortreviews.pro.

## Stack
- Vanilla HTML/CSS/JS (no framework)
- Supabase (auth + database)
- Vercel (hosting + serverless functions)
- Resend (transactional email)

## Design system
- Background: #f7f6f3 (warm linen)
- Cards: white #ffffff
- Accents: --accent-dark #1a1a1a, --lavender #e8def8, --teal #14b8a6, --pink #ec4899
- Legacy --blue #1877f2 (being phased out)
- Dark mode via data-theme="dark" on <html> + localStorage
- Logo: deep purple #2E1745 rounded square with white silhouette and waves

## Pages
- index.html — landing
- guest-feed.html — anonymous review feed
- resort.html?id=N — individual resort profile (requires ?id=)
- resort-login.html — resort sign-in (with Forgot Password)
- resort-dashboard.html — logged-in resort portal (redirects to login if no session)
- admin.html — admin panel (password admin123, client-side check)
- admin-verification.html — resort verification flow
- admin-reposts.html — reported content review
- about.html — about page

## Working style
I have no coding background. Communicate in plain English. Show diffs before applying. Push back if I'm wrong — don't just agree.

## Testing
- Local: `npx serve .` then localhost:3000
- Live: resortreviews.pro
- Test resort account: nayizziyan100@gmail.com (Niku Maldives) — use Forgot Password
- Admin password: admin123
