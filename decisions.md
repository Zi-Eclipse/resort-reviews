# Decisions

A running log of architectural and design choices, with reasoning. New entries on top. Update this when something non-obvious changes — saves future-you (and future-Claude) from having to reverse-engineer the "why."

## June 2026 — Modal drag-close fix

**Decision:** Added global `modal-protection.js` that intercepts clicks on modal overlays in the capture phase and blocks the close if mousedown started elsewhere.

**Why:** When users drag to select text inside a modal and release outside it, the click event fires on the overlay and closes the modal — losing whatever they were doing. Existing `onclick="closeXxxModal()"` handlers had this bug across 7+ modals.

**Alternative considered:** Patch each modal individually. Rejected — too repetitive, prone to drift.

## June 2026 — Resort dashboard redirects to resort-login.html

**Decision:** Removed embedded login form from `resort-dashboard.html`. Logged-out users get redirected to `resort-login.html`.

**Why:**
1. The embedded form used the deprecated plaintext `temp_password` check, which always fails now that values are NULL.
2. Visually outdated (old blue umbrella icon, no dark mode, no Forgot Password).
3. Maintaining two login UIs is duplicate work and risks drift.

**Trade-off:** One extra navigation step for logged-out users. Acceptable.

## June 2026 — Comment modal Instagram-style redesign

**Decision:** Split-panel layout. Left: photo area (black bg, `object-fit: contain` for both portrait and landscape). Right: 360px info column with resort name (linked to resort page), rating badge, close button, review text, comments.

**Why:** Previous Facebook-style cramped photo display was hiding image content. Instagram pattern uses photo space honestly; looks more "like a real product."

## June 2026 — Color palette evolution

**Decision:** Moved away from single-blue accent. New palette: black for primary CTA, lavender for secondary/tag, teal for stats, pink for featured card border. Logo became deep purple `#2E1745`.

**Why:** Single-blue felt generic. The new palette gives each functional area a distinct accent while keeping the warm linen base consistent.

**Trade-off:** More colors to maintain. CSS variables in `:root` mean future tweaks are one-line changes per color.

## June 2026 — SVG favicon, single file

**Decision:** Created `favicon.svg` at project root, linked from every HTML page. Skipped ICO/PNG fallbacks.

**Why:** All modern browsers support SVG favicons. Single file is simpler to update and stays sharp at any size.

**Caveat:** Very old browsers fall back to no favicon. Acceptable since the audience is mostly modern.

## June 2026 — XSS hardening across all pages

**Decision:** Added `escapeHtml()` helper, wrapped every user-supplied text render with it across `admin.html`, `guest-feed.html`, `resort.html`, `resort-login.html`, `script.js`.

**Why:** User-submitted text was being rendered via `innerHTML` — stored XSS vulnerability. Output encoding everywhere is the only reliable defense.

## June 2026 — API endpoint auth

**Decision:** All three API endpoints require `X-Admin-Secret` header matching `ADMIN_API_SECRET`. Self-service password reset exempted via `X-Reset-Password: true` header.

**Why:** Endpoints were unauthenticated — anyone could trigger emails or create auth users. Header-based auth is simple, no token machinery needed.

**Trade-off:** Admin secret is referenced in client-side `admin.html`. Acceptable for current scale; needs server-side admin auth before public launch.

## June 2026 — Plaintext password column emptied

**Decision:** Ran SQL to set all `resorts.temp_password` values to NULL. Auth flows now use Supabase Auth exclusively.

**Why:** Plaintext passwords in a database are an unacceptable risk. The column was a stopgap from before auth was wired up.

**Pending:** Drop the column entirely once code is verified to not reference it anywhere.
