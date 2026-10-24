# PeopleFlow motion audit

## Phase 3 effects

| Page or surface | Motion |
| --- | --- |
| Admin dashboard | Reveal and count-up from Phase 2; stat cards tilt up to 5 degrees with subtle pointer glare and the existing hover lift. |
| Employee dashboard | Reveal and count-up from Phase 2; stat cards tilt up to 5 degrees with subtle pointer glare and the existing hover lift. |
| Login and signup | Auth video parallax up to 8px opposite pointer movement, headline drift up to 14px, brand-block drift and tilt up to 6px/4 degrees, 4-degree feature-chip tilt, and a 6-second brand-icon float. Form sheets remain stationary. |
| Other application pages | Existing Phase 1/2 reveals, count-ups, progress, menus, loaders, hover feedback, and route transitions; no Phase 3 tilt or parallax targets. |

## Audit findings

- No `transition: all` or shorthand transitions that animate width, height, top, left, or margin were found. The only layout-property transition is the explicitly allowed `.main-area` `margin-inline-start`.
- CSS keyframes and transitions are disabled by the global `prefers-reduced-motion` override in `src/styles/_motion.scss`; the reveal/count-up directives also provide reduced-motion final states.
- No permanently declared `will-change` was found. Tilt adds `will-change: transform` only while the pointer is over an enabled card and removes it on leave or destroy.
- Tilt is attached only to dashboard stat cards and auth visual brand/chip elements. Parallax runs only on auth visual layers. Tables, forms, modal surfaces, menus, and data-entry areas receive neither effect.
- `TiltDirective` is imported only by the admin dashboard, employee dashboard, login, and signup components. `ParallaxDirective` is imported only by login and signup.
- No navbar `setInterval` or RxJS `interval` polling remains.

## Remaining risks

- Tilt, glare, and parallax are deliberately unavailable when fine-pointer hover support is absent, below 900px for parallax, or reduced motion is requested.
- Visual behavior was validated by build and source audit, not by automated cross-device screenshot comparison; browser-specific video compositing may vary slightly.
