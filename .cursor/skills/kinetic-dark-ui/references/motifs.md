# Motifs and geometry

The visual furniture. Generate all of it — do not lift path data from a reference site.

## Contents
- [Stroke frames (the arc language)](#stroke-frames-the-arc-language)
- [Perspective tunnel generator](#perspective-tunnel-generator)
- [Alternative signatures](#alternative-signatures)
- [Circle text badge](#circle-text-badge)
- [Ambient bloom](#ambient-bloom)
- [Grille and mask overlays](#grille-and-mask-overlays)
- [Sprite sheet strategy](#sprite-sheet-strategy)
- [Video handling](#video-handling)
- [Inline heading glyphs](#inline-heading-glyphs)

## Stroke frames (the arc language)

The whole layout vocabulary is built from **stadium geometry**: a rectangle with one or both ends capped by a semicircle, drawn as a 1px stroke, bleeding off the viewport edge. Four variants cover every use:

```
A. Left-capped rail        B. Right-capped rail       C. Full pill        D. Half dome
   ╭──────────────         ──────────────╮            ╭────────╮        ╭──────────╮
   │                                     │            │        │        │          │
   ╰──────────────         ──────────────╯            ╰────────╯        └──────────┘
```

Generate them rather than hand-writing `d` strings:

```js
/** Stadium/rail path. cap: 'left' | 'right' | 'both' | 'none' */
export function railPath({ w, h, cap = 'left', inset = 0.5 }) {
  const r = h / 2 - inset
  const y0 = inset, y1 = h - inset
  const x0 = inset, x1 = w - inset
  const arcL = `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`
  const arcR = `A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`
  if (cap === 'left')  return `M ${x1} ${y1} H ${x0 + r} ${arcL.replace('A', 'A')} H ${x1}`
  if (cap === 'right') return `M ${x0} ${y0} H ${x1 - r} ${arcR} H ${x0}`
  if (cap === 'both')  return `M ${x0 + r} ${y0} H ${x1 - r} ${arcR} H ${x0 + r} ${arcL}`
  return `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`
}
```

Usage rules:
- Always `fill: none`, `stroke: var(--line-strong)`, `stroke-width: 1`, `vector-effect: non-scaling-stroke`.
- The arc end sits **inside** the content area; the flat end bleeds past the viewport edge. Never centre a complete pill behind a section — asymmetry is the point.
- One frame per section maximum. Two competing arcs read as decoration.
- Combine with `data-path` from `motion.md` so it draws on scroll.
- Mark `aria-hidden="true"` on every decorative SVG.

## Perspective tunnel generator

The signature. A fan of curves from the top edge converging to a vanishing point at the bottom centre, mirrored horizontally, with light travelling along random strokes.

```js
/**
 * Converging perspective lines.
 * Returns { paths: string[], viewBox: string } — mirror with a transform, don't double the maths.
 */
export function tunnel({ w = 1250, h = 765, lines = 6, vanishX = null, curve = 0.62 } = {}) {
  const vx = vanishX ?? w / 2
  const paths = []
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1)              // 0 = outermost, 1 = nearest centre
    const startX = t * (vx * 0.86)         // spread across the top-left edge
    const cx = vx - (vx - startX) * (1 - curve)
    const cy = h * (0.28 + t * 0.22)       // deeper control point for inner lines
    paths.push(`M ${startX.toFixed(1)} 1 C ${cx.toFixed(1)} ${cy.toFixed(1)} ${vx} ${(h * 0.55).toFixed(1)} ${vx} ${h}`)
  }
  return { paths, viewBox: `0 0 ${w} ${h}` }
}
```

Render once into a global `<defs>` as a `<g id="tunnel-lines">`, then reuse:

```html
<svg width="0" height="0" aria-hidden="true">
  <defs>
    <g id="tunnel-lines">
      <path d="M625 0V765" stroke="var(--line)" />
      <g id="tunnel-half"><!-- generated paths: rail stroke + travelling stroke per line --></g>
      <use href="#tunnel-half" transform="scale(-1,1) translate(-1250,0)" />
    </g>
  </defs>
</svg>

<!-- then anywhere -->
<svg class="tunnel" viewBox="0 0 1250 765" aria-hidden="true"><use href="#tunnel-lines" /></svg>
```

Reuse it at three scales: full-bleed behind the CTA band (opacity ~0.5), half-height behind a diagram, and small/rotated in a corner. Rotating the same asset 180° reads as a different motif at a glance and costs nothing.

## Alternative signatures

If a tunnel is wrong for the subject, pick exactly one of these and apply the same rules (generate it, reuse at three scales, travelling light on strokes):

- **Isogrid** — 30°/150° line lattice, fading toward the top. Reads structural/industrial.
- **Contour rings** — nested offset ellipses like a topographic map. Reads geographic/data.
- **Radial ticks** — a partial dial of hairlines around a focal point, lengths varying by a sine function. Reads instrument/measurement.
- **Orbit paths** — 3–4 nested rotated ellipses with a dot travelling each. Reads network/satellite. Cheaper than three.js and hits the same note.

## Circle text badge

Rotating circular caption. Duplicate the `textPath` at `startOffset="50%"` so the loop is seamless with a single linear rotation.

```html
<div class="badge" data-welcome="circle">
  <svg viewBox="0 0 170 170" class="badge__text" data-no-pause aria-hidden="true">
    <defs><path id="ring" d="M 85 15 a 70 70 0 1 1 -0.01 0 Z" /></defs>
    <text font-size="11" letter-spacing="0.18em" fill="var(--ink-3)">
      <textPath href="#ring">Verifiable Internet · </textPath>
      <textPath href="#ring" startOffset="50%">Verifiable Internet · </textPath>
    </text>
  </svg>
  <svg class="badge__mark" viewBox="0 0 71 69"><use href="#logo-mark" /></svg>
</div>
```

```css
.badge { position: relative; width: 9rem; aspect-ratio: 1; display: grid; place-items: center; }
.badge__text { position: absolute; inset: 0; animation: spin 22s linear infinite; }
.badge__mark { width: 28%; }
@keyframes spin { to { rotate: 360deg; } }
```

Put the two text copies' content identical or the seam shows. 20–26s per rotation; faster looks frantic.

## Ambient bloom

The depth trick. One large pre-blurred image, reused everywhere at different transforms — cheaper and more organic than `filter: blur()`, which is expensive to composite and produces banding on dark backgrounds.

Making the asset (once, at build time or in any image tool):
1. Canvas ~1040×1200, transparent.
2. Two or three overlapping soft radial blobs in `--bloom-cool` and `--bloom-deep`, plus one small `--light` core at ~20% opacity.
3. Gaussian blur ~140px. Export webp, quality ~75. Target well under 100KB.

Placement:

```css
.bloom { position: absolute; z-index: var(--z-bloom); pointer-events: none;
         opacity: .55; mix-blend-mode: screen; }
.bloom img { width: 100%; height: auto; }

/* per instance, vary all four: */
.hero .bloom   { inset: 20% -10% auto auto; width: 70vw; rotate: -12deg; opacity: .6; }
.footer .bloom { inset: auto auto -30% -15%; width: 90vw; rotate: 140deg; opacity: .35; }
```

Rules: 1–2 blooms per viewport, never behind body copy at more than 0.4 opacity (it kills contrast), `mix-blend-mode: screen` on a near-black canvas, and `will-change: opacity` only while animating. If you must do it in pure CSS, use a `radial-gradient` at 3 stops with `filter: blur(90px)` on a static element — never animate that filter.

## Grille and mask overlays

Media is never shown bare. Two overlays:

- **Grille** — an SVG of evenly spaced hairlines (vertical, ~14px apart) laid over video at ~0.25 opacity, masked to fade toward the centre. Reads as a screen/scan surface.
- **Semicircle mask** — a large arc that clips the top of a full-bleed illustration so it emerges from the canvas rather than sitting in a box.

```css
.media { position: relative; overflow: hidden; }
.media__grille { position: absolute; inset: 0; opacity: .25;
  -webkit-mask-image: radial-gradient(60% 60% at 50% 50%, transparent, #000);
          mask-image: radial-gradient(60% 60% at 50% 50%, transparent, #000); }
```

Generate the grille: `Array.from({length: n}, (_, i) => \`M${i * gap} 0V${h}\`).join(' ')` as one path.

## Sprite sheet strategy

The reference keeps every decorative glyph in one `sprites.svg` and references symbols with `<use href="/sprites.svg#logo-e">`. Do the same:

- One file, `<symbol id="..." viewBox="...">` per glyph, served with long cache headers.
- Components take an `id` prop and render `<svg :viewBox="vb"><use :href="\`/sprites.svg#\${id}\`" /></svg>`.
- Strokes/fills use `currentColor` so glyphs inherit ink opacity from context.
- Cross-file `<use href>` needs the file same-origin; if you're on a separate CDN, inline the sprite into the document head at build time instead.

## Video handling

Copy the reference's discipline here — it is why the page still loads fast with three videos:

```html
<video
  poster="/media/role.webp"
  preload="none"
  muted loop playsinline
  disablepictureinpicture
  controlslist="nodownload noplaybackrate noremoteplayback">
  <source src="/media/role.webm" type="video/webm" />
</video>
```

Then play only when visible:

```js
const io = new IntersectionObserver(([e]) => {
  e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()
}, { threshold: 0.25 })
```

`preload="none"` plus a webp poster means zero video bytes until scroll. Ship webm (VP9/AV1) with an mp4 fallback only if Safari support matters for that specific clip. Under `prefers-reduced-motion`, don't autoplay — leave the poster.

## Inline heading glyphs

The most copied-wrong detail. Glyphs sit *inside* the sentence, between words, at ~0.72em:

```html
<h2 class="h2" data-reveal>
  Anchoring
  <svg class="h2__glyph" viewBox="0 0 73 73" aria-hidden="true"><use href="/sprites.svg#flower" /></svg>
  as the foundation for the new
  <span class="h2__mark">Internet<i></i></span>
</h2>
```

```css
.h2__glyph { display: inline-block; width: .72em; height: .72em; vertical-align: -0.06em;
             opacity: .7; margin-inline: .15em; }

/* underline that draws in on reveal */
.h2__mark { position: relative; white-space: nowrap; }
.h2__mark i { position: absolute; left: 0; right: 0; bottom: .08em; height: 2px;
              background: var(--light); transform: scaleX(0); transform-origin: left;
              transition: transform var(--d-slow) var(--e-out); }
.h2__mark.is-in i { transform: scaleX(1); }
```

Two glyphs per heading maximum, and they must be different shapes. Repeating the same glyph twice looks like a bullet list that escaped.
