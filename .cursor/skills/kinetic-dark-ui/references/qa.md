# QA, performance, accessibility

Motion-heavy dark sites fail in predictable ways. Work through this before calling anything done.

## Performance

- **One RAF loop.** Lenis driven from `gsap.ticker`, nothing else running its own loop. Two loops = permanent micro-jitter that reads as "cheap".
- **Animate only `transform` and `opacity`.** No animated `filter`, `box-shadow`, `width`, `height`, `top`, or `background-position`. The bloom is a static image precisely to avoid animated blur.
- **`will-change` is temporary.** Set it on elements that are actively animating and remove it after. Leaving it on 40 elements creates 40 compositor layers and tanks mobile.
- **Pause offscreen.** IntersectionObserver pauses videos, marquees, and travelling-light tweens outside the viewport. Exempt only tiny loops marked `data-no-pause`.
- **`ScrollTrigger.refresh()` after fonts and images.** Otherwise every trigger position is computed against the wrong layout and reveals fire early or never.
- **Budget:** LCP under 2.5s on a mid-range Android over 4G. That means the hero is text + one bloom webp, no hero video, no three.js on first paint. If you want a 3D or canvas hero, lazy-load it after the preloader resolves and ship a static fallback image.
- **Image discipline:** webp/avif, explicit `width`/`height` on every `<img>` to reserve layout, quality ~75 (only bump to 100 for a single detailed illustration), and lazy-load everything below the fold.
- **Fonts:** one variable woff2, preloaded, `font-display: swap`. A second family doubles the blocking cost for no design benefit here.
- **Video:** `preload="none"` + poster, play on intersection, webm first. Never autoplay above the fold.

## Accessibility

This is where these sites usually fail hardest, and all of it is cheap to fix.

- **Contrast.** `--ink-2` on `--bg` clears 4.5:1; `--ink-3` does not — restrict it to non-essential labels, or raise its opacity when it carries meaning. Check every text block that sits over a bloom, since bloom raises the local background luminance.
- **Focus is visible.** The custom cursor does nothing for keyboard users. Keep `:focus-visible` rings on every interactive element and tab the whole page once before shipping.
- **Letter-flip buttons read once.** Animated letter spans are `aria-hidden="true"`; the label lives in an `.sr-only` span. Without this, screen readers announce the label twice, character by character.
- **Decorative SVG is hidden.** `aria-hidden="true"` on frames, tunnels, grilles, glyphs, and bloom images. `alt=""` on decorative `<img>`.
- **Marquees.** `aria-hidden` if decorative. If a marquee holds real links (partner logos), keep it accessible, make it pausable on hover/focus, and ensure tab order still reaches every link.
- **Reduced motion.** Honour it in CSS *and* JS: no smooth wheel, preloader resolves instantly, revealed text renders in final state, marquees static, no custom cursor, no magnetic hover, videos stay on their poster. Test by toggling the OS setting, not by trusting the media query.
- **Heading order.** One `h1` (the hero claim), sections in `h2`, no level skipping. Big type does not imply a heading tag.
- **Touch targets** at least 44×44px, including the scroll-progress button and the nav close button.

## Mobile

- Kill the custom cursor, magnetic hover, and nav hover pill on `(pointer: coarse)`.
- Native scroll on touch (`syncTouch: false`) — hijacked touch scrolling is the single most complained-about pattern on sites like this.
- Reduce display type to the low end of the clamp and re-split reveal lines on resize/rotate.
- Drawn frames and tunnels: hide rather than shrink below ~900px. A 1px arc at 380px wide reads as a stray line.
- Bloom opacity down ~15% on small screens; the same asset covers proportionally more of the viewport.
- The mobile nav panel needs `data-lenis-prevent` or it will not scroll.

## Correctness traps

Ordered by how often they bite:

1. **Reveal lines measured before fonts load** → wrong line breaks, text stuck offscreen. Always `await document.fonts.ready`.
2. **Hero hidden behind `v-if` during the preloader** → `gsap.from()` targets don't exist, hero renders unanimated. Render it, cover it.
3. **Preloader never resolves** → scroll locked forever. Always add a hard timeout that calls `lenis.start()` regardless.
4. **No `gsap.context()`** → tweens and ScrollTriggers leak across route changes; scroll positions drift and animations double-fire.
5. **Duplicated marquee content mismatched** → visible seam every cycle. Render the same slot twice, not two hand-written copies.
6. **`stroke-dashoffset` left at 1 when the draw animation is skipped** (reduced motion, JS error) → invisible frames. Reset in the reduced-motion block.
7. **`overflow: hidden` on a wrapper for the bleeding arcs** → breaks `position: sticky` further down. Use `overflow-x: clip`.
8. **Cross-origin `<use href>`** → sprites silently don't render. Serve the sprite same-origin or inline it.

## Ship checklist

```
[ ] Lighthouse mobile: perf ≥ 85, a11y ≥ 95
[ ] Tab through the entire page — every interactive element has a visible ring
[ ] prefers-reduced-motion on: page is fully readable, nothing moves, nothing hidden
[ ] JS disabled: all text visible, all links work (degraded, not broken)
[ ] 380px, 768px, 1440px, 2560px — no horizontal scrollbar, no clipped display type
[ ] Rotate a phone mid-scroll — reveal lines re-split, no stuck text
[ ] Throttled 4G: hero readable under 2.5s, no video bytes until scroll
[ ] Screen reader pass on hero + one button + the nav
[ ] theme-color matches --bg on iOS Safari
[ ] No console errors on route change; no leaked ScrollTriggers (ScrollTrigger.getAll().length is stable)
[ ] Every asset is original — no path data, sprite, video, or copy lifted from the reference site
```
