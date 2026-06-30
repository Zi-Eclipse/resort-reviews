# ResortReviews Design System

## Color palette

### Light mode (default)

| Variable | Hex | Usage |
|---|---|---|
| `--bg` | `#f7f6f3` | Warm linen page background |
| `--card-bg` | `#ffffff` | Cards, navbar, modal surfaces |
| `--bg-secondary` | `#f0efe9` | Subtle hover/active backgrounds |
| `--text` | `#111827` | Primary text |
| `--text-muted` | `#6b7280` | Secondary text, captions |
| `--border` | `#e5e7eb` | Default borders |
| `--blue` | `#1877f2` | Legacy accent — still used for card icons' background tint, checkmarks, "Continue as guest →", "Resort login →" card links |
| `--blue-light` | `#e8f1fd` | Card icon backgrounds |
| `--accent-dark` | `#1a1a1a` | Primary CTA button, card icon glyphs |
| `--lavender` | `#e8def8` | Badge, "Most popular" tag, theme button, Resort login nav button |
| `--lavender-text` | `#5b3e8a` | Available, but text on lavender currently uses `--accent-dark` (black) |
| `--teal` | `#14b8a6` | Stats borders + labels |
| `--pink` | `#ec4899` | Featured card border, footer heart icon |

### Dark mode

Triggered by `data-theme="dark"` on `<html>`. Overrides:

- `--bg` → dark navy
- `--card-bg` → near-black
- `--text` → near-white
- `--border` → darker grey
- `.btn-primary` flips from `--accent-dark` (black) to `#ffffff` background with `#1a1a1a` text

Lavender / teal / pink remain unchanged in dark mode (visible against dark bg).

## Logo

Deep purple `#2E1745` rounded square with white silhouette + wave arcs. Used as nav logo on every page, and as `favicon.svg`.

```svg
<svg width="32" height="32" viewBox="0 0 32 32" style="flex-shrink:0;">
  <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.5" fill="#2E1745" stroke="transparent" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  <circle cx="16" cy="11" r="4" fill="white"/>
  <path d="M10 24 Q16 18 22 24" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M7 24 Q16 14 25 24" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>
</svg>
```

## Typography

- Stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- Base body: 15px, line-height 1.6
- H1: 36–40px, weight 600
- H2 / card headings: 18px, weight 600
- Small / muted: 13px, color `--text-muted`

## Buttons

- `.btn-primary` — solid `--accent-dark`, white text, 10px radius, 12px×24px padding. Flips to white-on-black in dark mode.
- `.btn-outline` — transparent, `--text` text, 1px solid `--text` border, 10px radius. Visible in both themes.
- `.btn-resort-login` (nav) — `--lavender` background, `--accent-dark` text, lavender border, 8px radius.
- `.theme-btn` — circular, `--lavender` background, `--accent-dark` icon.
- `.action-btn` (review card Comment/Share) — flat, `padding: 10px 12px` (symmetric — don't change to asymmetric padding, it crops the text).

## Cards

- `.card` — white, 12px radius, soft shadow, hover lift.
- `.card-featured` — variant with 1.5px `--pink` border, pink-tinted hover shadow.
- `.card-icon` — 46×46 rounded square, `--blue-light` background, glyph `--accent-dark`.

## Modals

Standard structure:

```html
<div class="modal-overlay" id="xxxModal" onclick="closeXxxModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <!-- header + content -->
    </div>
</div>
```

- Overlay classes that close on outside click: `.modal-overlay`, `.comment-modal-overlay`, `.image-modal-overlay`
- Drag-safe close is handled globally by `modal-protection.js` — don't add per-modal protection
- Comment modal in `guest-feed.html` follows Instagram-style split: photo on left (black bg, `object-fit: contain`) + 360px info column with resort name, rating, close, review text, comments

## Forms

- Inputs: 12px×16px padding, 8px radius, 1px solid `--border`, `--card-bg` background
- Focus: blue ring or border color shift, no harsh outline
- Labels: 13px, weight 500, `--text-muted`

## Spacing rhythm

- Section vertical padding: 60–80px
- Card internal padding: 24–28px
- Grid gap between cards: 20–24px
- Stack gap between list items: 10–12px

## Patterns to avoid

- Asymmetric button padding (e.g. `8px 12px 0`) — looks cropped due to inherited line-height
- Using `--border` (`#e5e7eb`) for button outlines — too pale to see; use `--text` or `--text-muted`
- Adding inline `onclick` on inner modal content — use `event.stopPropagation()` on the modal content div instead
