# Tokens

## Contents
- [Root block](#root-block)
- [Palette reasoning](#palette-reasoning)
- [Type](#type)
- [Space and container](#space-and-container)
- [Motion](#motion)
- [Reduced motion](#reduced-motion)
- [Base styles](#base-styles)

## Root block

Drop this in a global stylesheet before anything else. Every value below is used by the components in `vue-nuxt.md`.

```css
:root {
  /* ---- canvas ---- */
  --bg:            #050917;   /* the only background colour on the site */
  --bg-raise:      #0A1024;   /* nav dropdowns, announcement bar, overlays only */
  --bg-sink:       #030611;   /* footer, preloader */

  /* ---- ink ---- */
  --ink:           #EDF1FA;
  --ink-2:         rgba(237, 241, 250, 0.64);   /* body copy */
  --ink-3:         rgba(237, 241, 250, 0.38);   /* labels, meta */
  --ink-4:         rgba(237, 241, 250, 0.16);   /* disabled, decorative type */

  /* ---- lines ---- */
  --line:          rgba(237, 241, 250, 0.10);
  --line-strong:   rgba(237, 241, 250, 0.22);

  /* ---- the one accent ---- */
  --light:         #9BE8FF;                     /* travelling gradients, cursor, hairline highlight */
  --light-dim:     rgba(155, 232, 255, 0.32);
  --accent:        #3E7BFA;                     /* use sparingly: focus rings, active nav */

  /* ---- bloom (behind content, never on it) ---- */
  --bloom-cool:    #12386E;
  --bloom-deep:    #0B1F4A;

  /* ---- type ---- */
  --font: "InterVariable", "Inter Tight", system-ui, -apple-system, sans-serif;

  --fs-display: clamp(3.2rem, 8vw, 8.5rem);
  --fs-h2:      clamp(2.1rem, 4.4vw, 4.25rem);
  --fs-h3:      clamp(1.3rem, 1.8vw, 1.9rem);
  --fs-body:    clamp(0.95rem, 1.05vw, 1.0625rem);
  --fs-small:   0.8125rem;
  --fs-label:   0.6875rem;

  --lh-display: 0.94;
  --lh-heading: 1.04;
  --lh-body:    1.55;

  --tr-display: -0.03em;   /* letter-spacing */
  --tr-heading: -0.02em;
  --tr-label:   0.18em;

  /* ---- space (8px base, but sections think in vh) ---- */
  --s-1: 0.5rem;  --s-2: 1rem;   --s-3: 1.5rem;  --s-4: 2rem;
  --s-5: 3rem;    --s-6: 4.5rem; --s-7: 7rem;    --s-8: 11rem;

  --container: 1440px;
  --gutter: clamp(1.25rem, 4vw, 4rem);

  /* ---- radius: 0 or a full arc. nothing in between ---- */
  --r-0: 0;
  --r-pill: 999px;

  /* ---- motion ---- */
  --e-out:   cubic-bezier(0.16, 1, 0.30, 1);    /* the house ease */
  --e-inout: cubic-bezier(0.83, 0, 0.17, 1);    /* wipes, page transitions */
  --e-linear: linear;                            /* marquees, rotations only */

  --d-fast: 0.28s;
  --d-mid:  0.6s;
  --d-slow: 1.2s;
  --d-cine: 2.4s;

  --stagger-letter: 7ms;    /* per-letter button flip — matches the reference exactly */
  --stagger-line:   60ms;   /* per-line heading reveal */
  --stagger-item:   90ms;   /* per-card / per-list-item */

  --z-bloom: 0;  --z-content: 1;  --z-chrome: 50;  --z-cursor: 90;  --z-preload: 100;
}
```

## Palette reasoning

`#050917` is not a neutral black — it is blue-shifted, which is why the light hue can be cyan without clashing. If you shift the canvas warm, the whole system falls apart; move it along the blue axis only (e.g. `#05091C`, `#040A14`).

The palette has exactly three jobs:
- **Canvas** carries 90% of pixels.
- **Ink** carries text, at four fixed opacities. Never introduce a fifth.
- **Light** carries motion. It should appear only where something is moving or has just moved.

If the brief needs a brand hue that isn't cyan, swap `--light` and `--accent` together and keep the same *value* relationship (light is brighter and less saturated than accent). Do not add a hue.

## Type

One variable family. The reference loads a single `next/font` variable and does everything with weight and size.

Roles:

```css
.display { font-size: var(--fs-display); line-height: var(--lh-display);
           letter-spacing: var(--tr-display); font-weight: 500; text-wrap: balance; }

.h2      { font-size: var(--fs-h2); line-height: var(--lh-heading);
           letter-spacing: var(--tr-heading); font-weight: 500; }

.body    { font-size: var(--fs-body); line-height: var(--lh-body);
           color: var(--ink-2); max-width: 46ch; }

.label   { font-size: var(--fs-label); text-transform: uppercase;
           letter-spacing: var(--tr-label); color: var(--ink-3); font-weight: 500; }
```

Rules that matter:
- Display weight stays at 400–500. Bold display type reads corporate, not technical.
- `max-width: 46ch` on every paragraph, always. Long measure is the single most common tell of an unconsidered dark site.
- Inline glyphs inside headings are sized `0.72em`, `vertical-align: -0.06em`, and inherit `currentColor` at ~70% opacity.

Font suggestions if the brief is open, in descending order of "not the default": PP Neue Montreal, Söhne, Geist, Inter Tight, Satoshi. Avoid plain Inter at default tracking — it is the AI-generated-site signature.

## Space and container

```css
.container { width: 100%; max-width: var(--container); margin-inline: auto;
             padding-inline: var(--gutter); }

.section   { position: relative; padding-block: clamp(6rem, 14vh, 12rem); }
.section--tall { min-height: 100vh; display: grid; align-content: center; }
```

Vertical rhythm inside a section, top to bottom: label → `--s-4` → heading → `--s-5` → paragraph → `--s-6` → CTA or media. Do not compress this on desktop; the emptiness is the design.

## Motion

Duration by purpose — this mapping is the difference between "choreographed" and "twitchy":

| Purpose | Duration | Ease |
|---|---|---|
| Hover state, letter flip | `--d-fast` | `--e-out` |
| Text reveal on scroll | `--d-mid` | `--e-out` |
| SVG stroke draw, frame reveal | `--d-slow` | `--e-out` |
| Ambient loops (rotation, marquee, tunnel light) | 8s–40s | `--e-linear` |
| Preloader → hero handoff | `--d-cine` total | `--e-inout` |

Scroll triggers fire at `start: "top 80%"` for text and `"top 70%"` for media. Never `once: false` on entrance animations — replaying reveals on scroll-up feels broken.

## Reduced motion

Non-negotiable, and cheap:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  [data-reveal] { opacity: 1 !important; transform: none !important; clip-path: none !important; }
  .marquee__content { animation: none !important; }
}
```

In JS, also: skip Lenis smooth wheel, resolve the preloader promise immediately, render revealed text in its final state, and disable the custom cursor and magnetic hover. See `motion.md`.

## Base styles

```css
* { box-sizing: border-box; }

html { background: var(--bg); }

body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}

::selection { background: var(--light); color: var(--bg); }

:focus-visible {
  outline: 2px solid var(--light);
  outline-offset: 3px;
  border-radius: 2px;
}

img, svg, video { display: block; max-width: 100%; }
img { user-select: none; }   /* the reference sets draggable="false" on every image */
```

Note on `overflow-x: clip` over `hidden`: the drawn arcs and bloom layers deliberately bleed past the viewport edge, and `clip` does that without creating a scroll container that breaks `position: sticky`.
