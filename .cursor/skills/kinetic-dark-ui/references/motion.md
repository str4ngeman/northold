# Motion system

## Contents
- [The data-attribute contract](#the-data-attribute-contract)
- [Smooth scroll wired to ScrollTrigger](#smooth-scroll-wired-to-scrolltrigger)
- [Reveal: masked text entrance](#reveal-masked-text-entrance)
- [Letter flip buttons](#letter-flip-buttons)
- [Stroke draw](#stroke-draw)
- [Marquee](#marquee)
- [Magnetic hover](#magnetic-hover)
- [Custom cursor](#custom-cursor)
- [Scroll progress ring](#scroll-progress-ring)
- [Nav hover pill](#nav-hover-pill)
- [Preloader handoff](#preloader-handoff)
- [Travelling light on a stroke](#travelling-light-on-a-stroke)

## The data-attribute contract

The reference site drives every animation off data attributes, never off CSS class names. JS selects `[data-x]`; CSS styles `.block__element`. Keep this separation: it lets the preloader animate elements it doesn't own, and lets you restyle without breaking timelines.

Use this exact vocabulary:

| Attribute | On | Meaning |
|---|---|---|
| `data-welcome="<slot>"` | any element | Enlist in the preloader → hero master timeline. Slots: `header`, `title`, `button`, `marquee`, `circle`, `bloom`, `socials`, `percent`, `blurer`, `scroll-hint`, plus any you add. |
| `data-reveal` | text block | Masked entrance on scroll. `data-reveal="lines"` (default) / `"words"` / `"chars"` / `"fade"`. |
| `data-reveal-delay="120"` | text block | Extra ms before its stagger starts. |
| `data-magnetic` | interactive | Cursor-attracted transform. Optional `data-magnetic-strength="0.35"`. |
| `data-path` | `<path>` | Stroke-draws itself when its container enters view. |
| `data-hover` | any | Custom cursor state. `true` = grow; `"arrow-left"`, `"arrow-right"`, `"drag"`, `"play"` = labelled states. |
| `data-no-pause` | animated element | Exempt from the "pause offscreen" IntersectionObserver. Use on tiny loops like rotating badges. |
| `data-lenis-prevent` | scrollable overlay | Let native scroll win inside this element (mobile nav, modal, code block). |
| `data-parallax="0.15"` | any | Y translate at this fraction of scroll distance. |
| `data-marquee-speed="40"` | marquee | Seconds per full cycle. |

Two rules: a component never reads another component's attributes, and every attribute-driven behaviour degrades to "element is simply visible" if its JS never runs. That way a hydration failure yields a static page, not an invisible one.

## Smooth scroll wired to ScrollTrigger

The single most important wiring step. Two independent RAF loops (Lenis's own plus GSAP's) causes jitter that no amount of easing tuning will fix. Drive Lenis *from* the GSAP ticker and let Lenis's scroll event update ScrollTrigger.

```js
import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

export function initScroll() {
  gsap.registerPlugin(ScrollTrigger)

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !reduce,
    syncTouch: false,                       // native momentum on touch feels better
    prevent: (node) => node.hasAttribute?.('data-lenis-prevent'),
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // images and fonts change layout; refresh once settled
  window.addEventListener('load', () => ScrollTrigger.refresh())
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh())

  return {
    lenis,
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    destroy: () => { lenis.destroy(); ScrollTrigger.getAll().forEach(t => t.kill()) },
  }
}
```

Lock scroll during the preloader with `stop()` and release on handoff. On route change: `lenis.scrollTo(0, { immediate: true })` then `ScrollTrigger.refresh()`.

## Reveal: masked text entrance

The effect: text slides up from behind a hard edge, per line. The mask is what sells it — a fade alone reads as generic.

Structure (build it in JS from the source text so it degrades to plain text without JS):

```html
<h2 data-reveal="lines">
  <span class="reveal__line"><span class="reveal__inner">Trust is the foundation</span></span>
  <span class="reveal__line"><span class="reveal__inner">of human coordination</span></span>
</h2>
```

```css
[data-reveal] .reveal__line  { display: block; overflow: hidden; }
[data-reveal] .reveal__inner { display: block; will-change: transform; }
```

```js
function splitLines(el) {
  // wrap each word, measure offsetTop, group words into lines, rebuild
  const words = el.textContent.trim().split(/\s+/)
  el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ')
  const rows = new Map()
  el.querySelectorAll('.w').forEach(w => {
    const top = Math.round(w.offsetTop)
    if (!rows.has(top)) rows.set(top, [])
    rows.get(top).push(w.textContent)
  })
  el.innerHTML = [...rows.values()]
    .map(line => `<span class="reveal__line"><span class="reveal__inner">${line.join(' ')}</span></span>`)
    .join('')
  return [...el.querySelectorAll('.reveal__inner')]
}

function reveal(el) {
  const mode = el.dataset.reveal || 'lines'
  const targets = mode === 'fade' ? [el] : splitLines(el)
  const delay = (+el.dataset.revealDelay || 0) / 1000

  gsap.from(targets, {
    yPercent: mode === 'fade' ? 0 : 110,
    opacity: mode === 'fade' ? 0 : 1,
    duration: 0.9,
    delay,
    ease: 'expo.out',                       // == cubic-bezier(.16,1,.3,1)
    stagger: 0.06,
    scrollTrigger: { trigger: el, start: 'top 80%', once: true },
  })
}
```

Re-split on resize (debounced 200ms) or lines will break mid-animation on rotate. If `document.fonts` isn't ready when you measure, lines land wrong — always split after `fonts.ready`.

## Letter flip buttons

Two stacked copies of the label; on hover the top rolls up and out while the bottom rolls up into place, staggered `7ms` per letter left to right. Plus a fill layer that wipes in behind.

```html
<a class="btn" data-magnetic data-hover="true">
  <span class="btn__text" aria-hidden="true">
    <span class="btn__top">
      <span class="btn__l" style="transition-delay:0ms">S</span>
      <span class="btn__l" style="transition-delay:7ms">t</span><!-- ... -->
    </span>
    <span class="btn__bottom"><!-- identical letter set, same delays --></span>
  </span>
  <span class="btn__fill"></span>
  <span class="sr-only">Start building</span>
</a>
```

```css
.btn { position: relative; display: inline-flex; align-items: center; gap: .6em;
       padding: 1.05em 1.9em; border: 1px solid var(--line-strong);
       border-radius: var(--r-pill); color: var(--ink);
       font-size: var(--fs-small); letter-spacing: .04em; text-decoration: none;
       overflow: hidden; isolation: isolate; }

.btn__text   { position: relative; display: block; overflow: hidden; line-height: 1.1; }
.btn__bottom { position: absolute; inset: 0; }
.btn__l      { display: inline-block; transition: transform var(--d-fast) var(--e-out); }

.btn__top    .btn__l { transform: translateY(0); }
.btn__bottom .btn__l { transform: translateY(100%); }
.btn:hover .btn__top    .btn__l { transform: translateY(-100%); }
.btn:hover .btn__bottom .btn__l { transform: translateY(0); }

.btn__fill { position: absolute; inset: 0; z-index: -1; background: var(--ink);
             transform: translateY(101%); transition: transform var(--d-fast) var(--e-out); }
.btn:hover .btn__fill { transform: translateY(0); }
.btn:hover { color: var(--bg); border-color: var(--ink); }

.btn--ghost { border-color: var(--line); }
```

Details that matter: preserve spaces as real `<span> </span>` nodes or the label collapses; put the real text in an `.sr-only` span and `aria-hidden` the animated copies so screen readers read it once; keep the stagger under ~10ms per letter or long labels ripple for too long.

## Stroke draw

Every drawn frame and diagram line uses the same primitive. Set `pathLength="1"` on the path so you never need `getTotalLength()` — dash units become fractions.

```html
<svg class="frame" viewBox="0 0 800 240" fill="none" aria-hidden="true">
  <path data-path pathLength="1" d="M800 1H107C48 1 1 48 1 107s47 106 106 106h693"
        stroke="var(--line-strong)" stroke-width="1" />
</svg>
```

```css
[data-path] { stroke-dasharray: 1; stroke-dashoffset: 1; }
```

```js
gsap.to(el.querySelectorAll('[data-path]'), {
  strokeDashoffset: 0,
  duration: 1.6, ease: 'power2.inOut', stagger: 0.12,
  scrollTrigger: { trigger: el, start: 'top 85%', once: true },
})
```

## Marquee

CSS-only, duplicated content, direction by `animation-direction`. Duplicate the content exactly twice in the DOM and translate `-50%` — this is seamless at any width without JS measurement.

```html
<div class="marquee" data-marquee-speed="28" aria-hidden="true">
  <div class="marquee__content"><span>Verifiable Internet</span><span>Verifiable Internet</span></div>
</div>
```

```css
.marquee { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
.marquee__content { display: flex; width: max-content; gap: 0.4em;
                    animation: marquee var(--speed, 28s) linear infinite; }
.marquee--reverse .marquee__content { animation-direction: reverse; }
@keyframes marquee { to { transform: translateX(-50%); } }
```

Wire `--speed` from the data attribute at mount. Always `aria-hidden` decorative marquees; if a marquee contains real links (the partner logo rows do), leave it readable and don't mask so aggressively that logos clip mid-hover.

## Magnetic hover

Interactive elements drift toward the pointer, then spring back. Subtle: max ~12px.

```js
function magnetic(el) {
  const strength = +el.dataset.magneticStrength || 0.35
  const q = { x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.6)' }),
              y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.6)' }) }

  const move = (e) => {
    const r = el.getBoundingClientRect()
    q.x((e.clientX - (r.left + r.width / 2)) * strength)
    q.y((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const leave = () => { q.x(0); q.y(0) }

  el.addEventListener('pointermove', move)
  el.addEventListener('pointerleave', leave)
  return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
}
```

Apply only when `matchMedia('(pointer: fine)')` matches. The reference also pins `will-change: transform; transform: translateZ(0); backface-visibility: hidden; -webkit-font-smoothing: subpixel-antialiased` on magnetic wrappers — the last one stops text from shimmering during sub-pixel movement.

## Custom cursor

A lerped follower with two states: dot (default) and grown ring with a label (over `[data-hover]`). Never hide the native cursor on touch, and never let it be the only affordance — hover states must still exist without it.

```js
function cursor(root) {
  if (!matchMedia('(pointer: fine)').matches) return
  document.documentElement.classList.add('has-custom-cursor')  // hides native cursor in CSS

  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const target = { ...pos }
  addEventListener('pointermove', e => { target.x = e.clientX; target.y = e.clientY })

  gsap.ticker.add(() => {
    pos.x += (target.x - pos.x) * 0.18
    pos.y += (target.y - pos.y) * 0.18
    gsap.set(root, { x: pos.x, y: pos.y })
  })

  // event delegation so dynamically added elements work
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-hover]')
    root.dataset.state = t ? (t.dataset.hover === 'true' ? 'grow' : t.dataset.hover) : ''
  })
}
```

Style the states with `[data-state="grow"]`, `[data-state="arrow-right"]` etc. Keep the cursor element `pointer-events: none` and at `z-index: var(--z-cursor)`.

## Scroll progress ring

Bottom-corner ring that doubles as back-to-top. Same `pathLength` trick on a `<circle>`.

```html
<button class="progress" data-magnetic aria-label="Back to top" style="--percent:0">
  <span class="progress__num">0%</span>
  <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" pathLength="1" /></svg>
</button>
```

```css
.progress circle { fill: none; stroke: var(--light); stroke-width: 2;
                   stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--percent));
                   transform: rotate(-90deg); transform-origin: 50% 50%; }
```

```js
lenis.on('scroll', ({ scroll, limit }) => {
  const p = limit ? scroll / limit : 0
  el.style.setProperty('--percent', p.toFixed(4))
  num.textContent = Math.round(p * 100) + '%'
})
```

## Nav hover pill

A single pill element moves between items instead of each item having its own background. Drives off two CSS vars on the nav.

```js
nav.addEventListener('pointerover', (e) => {
  const item = e.target.closest('[data-hover]')
  if (!item) return
  const nr = nav.getBoundingClientRect(), ir = item.getBoundingClientRect()
  nav.style.setProperty('--hover-width', ir.width + 'px')
  nav.style.setProperty('--hover-left', (ir.left - nr.left) + 'px')
  nav.dataset.hovering = 'true'
})
nav.addEventListener('pointerleave', () => { nav.dataset.hovering = 'false' })
```

```css
.nav__pill { position: absolute; top: 50%; translate: 0 -50%;
             left: var(--hover-left, 0); width: var(--hover-width, 0);
             height: 2.2em; border-radius: var(--r-pill); background: rgba(237,241,250,.06);
             opacity: 0; transition: left var(--d-fast) var(--e-out),
                                     width var(--d-fast) var(--e-out),
                                     opacity var(--d-fast) linear; }
.nav[data-hovering="true"] .nav__pill { opacity: 1; }
```

## Preloader handoff

One master timeline over `[data-welcome]` slots, in a fixed order, ending with scroll unlocked. Expose it as a promise so sections can await it instead of guessing at delays.

```js
export function welcome({ lenis }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const pick = (slot) => document.querySelector(`[data-welcome="${slot}"]`)
  const all  = (slot) => document.querySelectorAll(`[data-welcome="${slot}"]`)

  lenis.stop()
  if (reduce) { lenis.start(); return Promise.resolve() }

  const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 } })

  tl.to('[data-preloader]', { opacity: 0, duration: 0.6, pointerEvents: 'none' })
    .from(pick('bloom'),  { opacity: 0, scale: 1.15, duration: 2.4 }, 0.1)
    .from(pick('title'),  { yPercent: 110, duration: 1.4 }, 0.25)   // pre-split into lines
    .from(all('button'),  { y: 24, opacity: 0, stagger: 0.08 }, 0.7)
    .from(pick('header'), { yPercent: -100 }, 0.5)
    .from(pick('marquee'), { opacity: 0, duration: 1.6 }, 0.6)
    .from(pick('circle'), { opacity: 0, scale: 0.7, rotate: -90 }, 0.8)
    .from([pick('socials'), pick('percent')], { opacity: 0, x: 20, stagger: 0.06 }, 1.0)
    .add(() => lenis.start(), 0.9)

  return tl.then()
}
```

Order matters: atmosphere (bloom) → the claim (title) → affordances (buttons) → chrome (header, socials, progress). Chrome arriving first makes the page feel like an app; atmosphere first makes it feel like a film.

## Travelling light on a stroke

The recurring "energy moving through the network" effect. Two ways, both used in the reference:

**A — animated gradient stop** (works on any path, no dash maths):

```html
<linearGradient id="travel" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="5%" y2="5%">
  <stop stop-color="var(--light)" stop-opacity="0" />
  <stop offset=".5" stop-color="var(--light)" />
  <stop offset="1" stop-color="var(--light)" stop-opacity="0" />
</linearGradient>
```

Draw the same path twice: once with `stroke="var(--line)"` as the rail, once with `stroke="url(#travel)"` on top. Then animate the gradient's `x1/y1/x2/y2` from `-20%` to `120%` with a randomised delay per line:

```js
gsap.utils.toArray('linearGradient[data-travel]').forEach((g, i) => {
  gsap.fromTo(g,
    { attr: { x1: '-20%', y1: '-20%', x2: '-15%', y2: '-15%' } },
    { attr: { x1: '110%', y1: '110%', x2: '120%', y2: '120%' },
      duration: gsap.utils.random(2.4, 4.5), repeat: -1, ease: 'none',
      delay: i * 0.35 + gsap.utils.random(0, 1.5) })
})
```

**B — dash pulse** (cheaper, less controllable): `stroke-dasharray: 0.04 0.96; pathLength=1` and animate `strokeDashoffset` from `1` to `0`.

Randomise delays. Perfectly synchronised lines look like a loading bar; desynchronised ones look alive.
