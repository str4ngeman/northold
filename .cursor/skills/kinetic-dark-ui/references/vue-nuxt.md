# Vue 3 / Nuxt implementation

Working components for every primitive. Ionic/Capacitor-friendly (no SSR-only APIs at module scope). For React/Next the DOM structures and CSS are identical — swap `onMounted` for `useEffect` and template refs for `useRef`.

## Contents
- [Install](#install)
- [Scroll plugin](#scroll-plugin)
- [useReveal composable](#usereveal-composable)
- [Reveal.vue](#revealvue)
- [LetterButton.vue](#letterbuttonvue)
- [Magnetic.vue](#magneticvue)
- [Marquee.vue](#marqueevue)
- [CircleText.vue](#circletextvue)
- [StrokeFrame.vue](#strokeframevue)
- [TunnelLines.vue](#tunnellinesvue)
- [Cursor.vue](#cursorvue)
- [ScrollProgress.vue](#scrollprogressvue)
- [Preloader.vue](#preloadervue)
- [A composed section](#a-composed-section)
- [Nuxt config notes](#nuxt-config-notes)

## Install

```bash
pnpm add gsap lenis
```

GSAP 3.13+ ships SplitText and DrawSVG free, but the recipes here avoid both so the skill works on any version and in any bundler.

## Scroll plugin

`plugins/scroll.client.ts`

```ts
import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = matchMedia('(pointer: fine)').matches

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !reduce,
    prevent: (node: Element) => node.hasAttribute?.('data-lenis-prevent'),
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh())

  const router = useRouter()
  router.afterEach(() => {
    lenis.scrollTo(0, { immediate: true })
    requestAnimationFrame(() => ScrollTrigger.refresh())
  })

  nuxtApp.hook('app:beforeMount', () => { if (!reduce) lenis.stop() })

  return { provide: { lenis, gsap, reduce, finePointer } }
})
```

Access anywhere with `const { $lenis, $gsap, $reduce } = useNuxtApp()`.

## useReveal composable

`composables/useReveal.ts`

```ts
import type { Ref } from 'vue'

export function useReveal(el: Ref<HTMLElement | null>, opts: { mode?: 'lines' | 'fade'; delay?: number } = {}) {
  const { $gsap, $reduce } = useNuxtApp()
  let ctx: gsap.Context | null = null

  const splitLines = (node: HTMLElement) => {
    const raw = node.dataset.text ?? node.textContent?.trim() ?? ''
    node.dataset.text = raw                                      // keep source for re-split
    node.innerHTML = raw.split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ')

    const rows = new Map<number, string[]>()
    node.querySelectorAll<HTMLElement>('.w').forEach((w) => {
      const top = Math.round(w.offsetTop)
      if (!rows.has(top)) rows.set(top, [])
      rows.get(top)!.push(w.textContent ?? '')
    })
    node.innerHTML = [...rows.values()]
      .map(l => `<span class="reveal__line"><span class="reveal__inner">${l.join(' ')}</span></span>`)
      .join('')
    return [...node.querySelectorAll<HTMLElement>('.reveal__inner')]
  }

  const build = () => {
    const node = el.value
    if (!node) return
    ctx?.revert()
    if ($reduce) return

    ctx = $gsap.context(() => {
      const targets = opts.mode === 'fade' ? [node] : splitLines(node)
      $gsap.from(targets, {
        yPercent: opts.mode === 'fade' ? 0 : 110,
        opacity: opts.mode === 'fade' ? 0 : 1,
        duration: 0.9,
        delay: (opts.delay ?? 0) / 1000,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: node, start: 'top 80%', once: true },
      })
    }, node)
  }

  let t: ReturnType<typeof setTimeout>
  const onResize = () => { clearTimeout(t); t = setTimeout(build, 200) }

  onMounted(async () => {
    if (document.fonts) await document.fonts.ready
    build()
    addEventListener('resize', onResize)
  })
  onUnmounted(() => { removeEventListener('resize', onResize); ctx?.revert() })
}
```

`gsap.context()` is what keeps this leak-free across route changes — one `revert()` kills every tween and ScrollTrigger it created.

## Reveal.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  as?: string; mode?: 'lines' | 'fade'; delay?: number
}>(), { as: 'div', mode: 'lines', delay: 0 })

const el = ref<HTMLElement | null>(null)
useReveal(el, { mode: props.mode, delay: props.delay })
</script>

<template>
  <component :is="as" ref="el" data-reveal :data-reveal="mode"><slot /></component>
</template>

<style>
[data-reveal] .reveal__line  { display: block; overflow: hidden; }
[data-reveal] .reveal__inner { display: block; will-change: transform; }
</style>
```

Only pass plain text as the slot content — the composable rewrites `innerHTML`. For headings with inline glyphs, use `mode="fade"` and animate the glyph separately, or split at the markup level into several `<Reveal>` lines.

## LetterButton.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string; to?: string; variant?: 'solid' | 'ghost'; stagger?: number
}>(), { variant: 'solid', stagger: 7 })

const letters = computed(() => [...props.label])
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))
</script>

<template>
  <component :is="tag" :to="to" class="btn" :class="`btn--${variant}`" data-magnetic data-hover="true">
    <span class="btn__text" aria-hidden="true">
      <span class="btn__row btn__row--top">
        <span v-for="(c, i) in letters" :key="`t${i}`" class="btn__l"
              :style="{ transitionDelay: `${i * stagger}ms` }">{{ c === ' ' ? '\u00A0' : c }}</span>
      </span>
      <span class="btn__row btn__row--bottom">
        <span v-for="(c, i) in letters" :key="`b${i}`" class="btn__l"
              :style="{ transitionDelay: `${i * stagger}ms` }">{{ c === ' ' ? '\u00A0' : c }}</span>
      </span>
    </span>
    <span class="btn__fill" aria-hidden="true" />
    <span class="sr-only">{{ label }}</span>
  </component>
</template>

<style scoped>
.btn { position: relative; display: inline-flex; align-items: center;
       padding: 1.05em 1.9em; border: 1px solid var(--line-strong); border-radius: var(--r-pill);
       color: var(--ink); font-size: var(--fs-small); letter-spacing: .04em;
       text-decoration: none; background: none; cursor: pointer;
       overflow: hidden; isolation: isolate;
       transition: color var(--d-fast) var(--e-out), border-color var(--d-fast) var(--e-out); }
.btn--ghost { border-color: var(--line); }

.btn__text { position: relative; display: block; overflow: hidden; line-height: 1.15; }
.btn__row--bottom { position: absolute; inset: 0; display: flex; }
.btn__row--top { display: flex; }
.btn__l { display: inline-block; transition: transform var(--d-fast) var(--e-out); }
.btn__row--bottom .btn__l { transform: translateY(100%); }

.btn:hover .btn__row--top .btn__l    { transform: translateY(-110%); }
.btn:hover .btn__row--bottom .btn__l { transform: translateY(0); }

.btn__fill { position: absolute; inset: 0; z-index: -1; background: var(--ink);
             transform: translateY(101%); transition: transform var(--d-fast) var(--e-out); }
.btn:hover .btn__fill { transform: translateY(0); }
.btn:hover { color: var(--bg); border-color: var(--ink); }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden;
           clip-path: inset(50%); white-space: nowrap; }
</style>
```

## Magnetic.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{ strength?: number }>(), { strength: 0.35 })
const el = ref<HTMLElement | null>(null)
const { $gsap, $finePointer } = useNuxtApp()

onMounted(() => {
  if (!$finePointer || !el.value) return
  const node = el.value
  const qx = $gsap.quickTo(node, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.6)' })
  const qy = $gsap.quickTo(node, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.6)' })

  const move = (e: PointerEvent) => {
    const r = node.getBoundingClientRect()
    qx((e.clientX - (r.left + r.width / 2)) * props.strength)
    qy((e.clientY - (r.top + r.height / 2)) * props.strength)
  }
  const leave = () => { qx(0); qy(0) }

  node.addEventListener('pointermove', move)
  node.addEventListener('pointerleave', leave)
  onUnmounted(() => {
    node.removeEventListener('pointermove', move)
    node.removeEventListener('pointerleave', leave)
  })
})
</script>

<template>
  <span ref="el" class="magnetic" data-magnetic><slot /></span>
</template>

<style scoped>
.magnetic { display: inline-block; will-change: transform; transform: translateZ(0);
            backface-visibility: hidden; -webkit-font-smoothing: subpixel-antialiased; }
</style>
```

## Marquee.vue

```vue
<script setup lang="ts">
withDefaults(defineProps<{ speed?: number; reverse?: boolean }>(), { speed: 28, reverse: false })
</script>

<template>
  <div class="marquee" :class="{ 'marquee--reverse': reverse }"
       :style="{ '--speed': `${speed}s` }" aria-hidden="true">
    <div class="marquee__content">
      <div class="marquee__set"><slot /></div>
      <div class="marquee__set"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.marquee { overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.marquee__content { display: flex; width: max-content;
                    animation: marquee var(--speed) linear infinite; }
.marquee__set { display: flex; align-items: center; gap: clamp(2rem, 5vw, 5rem);
                padding-right: clamp(2rem, 5vw, 5rem); }
.marquee--reverse .marquee__content { animation-direction: reverse; }
@keyframes marquee { to { transform: translateX(-50%); } }
</style>
```

Rendering the slot twice is what makes the loop seamless — `translateX(-50%)` lands exactly on the second copy.

## CircleText.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{ text: string; duration?: number }>(), { duration: 22 })
const id = useId()
const loop = computed(() => `${props.text} · `)
</script>

<template>
  <div class="badge">
    <svg class="badge__ring" viewBox="0 0 170 170" :style="{ '--dur': `${duration}s` }" aria-hidden="true">
      <defs><path :id="id" d="M 85 15 a 70 70 0 1 1 -0.01 0 Z" /></defs>
      <text font-size="11" letter-spacing="0.18em" fill="var(--ink-3)">
        <textPath :href="`#${id}`">{{ loop }}</textPath>
        <textPath :href="`#${id}`" startOffset="50%">{{ loop }}</textPath>
      </text>
    </svg>
    <div class="badge__center"><slot /></div>
  </div>
</template>

<style scoped>
.badge { position: relative; width: 9rem; aspect-ratio: 1; display: grid; place-items: center; }
.badge__ring { position: absolute; inset: 0; animation: spin var(--dur) linear infinite; }
.badge__center { width: 30%; display: grid; place-items: center; }
@keyframes spin { to { rotate: 360deg; } }
</style>
```

Keep `loop` short enough to fit twice around the ring — roughly 22 characters per copy at `font-size: 11`.

## StrokeFrame.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  w?: number; h?: number; cap?: 'left' | 'right' | 'both'; draw?: boolean
}>(), { w: 800, h: 240, cap: 'left', draw: true })

const el = ref<SVGSVGElement | null>(null)
const { $gsap, $reduce } = useNuxtApp()

const d = computed(() => {
  const { w, h, cap } = props, i = 0.5, r = h / 2 - i
  const x0 = i, x1 = w - i, y0 = i, y1 = h - i
  if (cap === 'left')  return `M ${x1} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} H ${x1}`
  if (cap === 'right') return `M ${x0} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0}`
  return `M ${x0 + r} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`
})

onMounted(() => {
  if (!props.draw || $reduce || !el.value) return
  const ctx = $gsap.context(() => {
    $gsap.to('[data-path]', {
      strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12,
      scrollTrigger: { trigger: el.value, start: 'top 85%', once: true },
    })
  }, el.value)
  onUnmounted(() => ctx.revert())
})
</script>

<template>
  <svg ref="el" class="frame" :viewBox="`0 0 ${w} ${h}`" fill="none"
       preserveAspectRatio="none" aria-hidden="true">
    <path :d="d" data-path pathLength="1" stroke="var(--line-strong)" stroke-width="1"
          vector-effect="non-scaling-stroke" />
  </svg>
</template>

<style scoped>
.frame { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.frame [data-path] { stroke-dasharray: 1; stroke-dashoffset: 1; }
</style>
```

If `draw` is false, drop the dash offset in CSS too or the frame stays invisible.

## TunnelLines.vue

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{ lines?: number; travel?: boolean }>(), { lines: 6, travel: true })
const { $gsap, $reduce } = useNuxtApp()
const el = ref<SVGSVGElement | null>(null)
const uid = useId()

const W = 1250, H = 765, VX = W / 2

const paths = computed(() =>
  Array.from({ length: props.lines }, (_, i) => {
    const t = i / (props.lines - 1)
    const startX = t * (VX * 0.86)
    const cx = VX - (VX - startX) * 0.38
    const cy = H * (0.28 + t * 0.22)
    return `M ${startX.toFixed(1)} 1 C ${cx.toFixed(1)} ${cy.toFixed(1)} ${VX} ${(H * 0.55).toFixed(1)} ${VX} ${H}`
  }),
)

onMounted(() => {
  if (!props.travel || $reduce || !el.value) return
  const ctx = $gsap.context(() => {
    $gsap.utils.toArray<SVGElement>('[data-travel]').forEach((g, i) => {
      $gsap.fromTo(g,
        { attr: { x1: '-20%', y1: '-20%', x2: '-15%', y2: '-15%' } },
        { attr: { x1: '110%', y1: '110%', x2: '120%', y2: '120%' },
          duration: $gsap.utils.random(2.6, 4.8), repeat: -1, ease: 'none',
          delay: i * 0.3 + $gsap.utils.random(0, 1.6) })
    })
  }, el.value)
  onUnmounted(() => ctx.revert())
})
</script>

<template>
  <svg ref="el" class="tunnel" :viewBox="`0 0 ${W} ${H}`" fill="none" aria-hidden="true">
    <defs>
      <linearGradient v-for="(_, i) in paths" :key="i" :id="`${uid}-g${i}`" data-travel
                      gradientUnits="objectBoundingBox" x1="0" y1="0" x2="5%" y2="5%">
        <stop stop-color="var(--light)" stop-opacity="0" />
        <stop offset=".5" stop-color="var(--light)" />
        <stop offset="1" stop-color="var(--light)" stop-opacity="0" />
      </linearGradient>
      <g :id="`${uid}-half`">
        <path v-for="(d, i) in paths" :key="`r${i}`" :d="d" stroke="var(--line)" stroke-width="1" />
        <path v-for="(d, i) in paths" :key="`t${i}`" :d="d" :stroke="`url(#${uid}-g${i})`" stroke-width="1.4" />
      </g>
    </defs>

    <path :d="`M ${VX} 0 V ${H}`" stroke="var(--line)" stroke-width="1" />
    <use :href="`#${uid}-half`" />
    <use :href="`#${uid}-half`" :transform="`scale(-1,1) translate(${-W},0)`" />
  </svg>
</template>

<style scoped>
.tunnel { width: 100%; height: 100%; opacity: .6; }
</style>
```

## Cursor.vue

Mount once in the layout.

```vue
<script setup lang="ts">
const el = ref<HTMLElement | null>(null)
const state = ref('')
const { $gsap, $finePointer } = useNuxtApp()

onMounted(() => {
  if (!$finePointer || !el.value) return
  document.documentElement.classList.add('has-cursor')

  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const target = { ...pos }
  const onMove = (e: PointerEvent) => { target.x = e.clientX; target.y = e.clientY }
  const tick = () => {
    pos.x += (target.x - pos.x) * 0.18
    pos.y += (target.y - pos.y) * 0.18
    $gsap.set(el.value, { x: pos.x, y: pos.y })
  }
  const onOver = (e: Event) => {
    const t = (e.target as Element).closest?.('[data-hover]') as HTMLElement | null
    state.value = t ? (t.dataset.hover === 'true' ? 'grow' : t.dataset.hover!) : ''
  }

  addEventListener('pointermove', onMove)
  document.addEventListener('pointerover', onOver)
  $gsap.ticker.add(tick)
  onUnmounted(() => {
    removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerover', onOver)
    $gsap.ticker.remove(tick)
    document.documentElement.classList.remove('has-cursor')
  })
})
</script>

<template>
  <div ref="el" class="cursor" :data-state="state" aria-hidden="true">
    <span class="cursor__ring" />
    <span class="cursor__dot" />
  </div>
</template>

<style>
.has-cursor, .has-cursor * { cursor: none !important; }
</style>

<style scoped>
.cursor { position: fixed; top: 0; left: 0; z-index: var(--z-cursor);
          pointer-events: none; translate: -50% -50%; }
.cursor__ring { position: absolute; inset: -1.25rem; border: 1px solid var(--light-dim);
                border-radius: 50%; scale: 0.4; opacity: 0;
                transition: scale var(--d-fast) var(--e-out), opacity var(--d-fast) linear; }
.cursor__dot  { display: block; width: 6px; height: 6px; border-radius: 50%; background: var(--light); }
.cursor[data-state="grow"] .cursor__ring { scale: 1; opacity: 1; }
.cursor[data-state="grow"] .cursor__dot  { scale: 0.5; }
</style>
```

`cursor: none !important` is the one place a global `!important` is justified — link and button rules would otherwise win. Keep `:focus-visible` styling intact; keyboard users never see this component.

## ScrollProgress.vue

```vue
<script setup lang="ts">
const { $lenis } = useNuxtApp()
const pct = ref(0)

onMounted(() => {
  const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
    pct.value = limit ? scroll / limit : 0
  }
  $lenis.on('scroll', onScroll)
  onUnmounted(() => $lenis.off('scroll', onScroll))
})
</script>

<template>
  <Magnetic :strength="0.2">
    <button class="progress" :style="{ '--percent': pct.toFixed(4) }" data-hover="true"
            aria-label="Back to top" @click="$lenis.scrollTo(0)">
      <span class="progress__num">{{ Math.round(pct * 100) }}%</span>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" pathLength="1" /></svg>
    </button>
  </Magnetic>
</template>

<style scoped>
.progress { position: fixed; right: var(--gutter); bottom: var(--gutter); z-index: var(--z-chrome);
            width: 4rem; aspect-ratio: 1; display: grid; place-items: center;
            background: none; border: 0; color: var(--ink-3); font-size: var(--fs-label);
            letter-spacing: .1em; cursor: pointer; }
.progress svg { position: absolute; inset: 0; }
.progress circle { fill: none; stroke: var(--light); stroke-width: 1.5;
                   stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--percent));
                   rotate: -90deg; transform-origin: 50% 50%; }
</style>
```

## Preloader.vue

```vue
<script setup lang="ts">
const { $gsap, $lenis, $reduce } = useNuxtApp()
const done = useState('welcome-done', () => false)

onMounted(async () => {
  if ($reduce) { $lenis.start(); done.value = true; return }
  if (document.fonts) await document.fonts.ready

  const pick = (s: string) => document.querySelector(`[data-welcome="${s}"]`)
  const all  = (s: string) => document.querySelectorAll(`[data-welcome="${s}"]`)

  const tl = $gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 },
                              onComplete: () => { done.value = true } })

  tl.to('[data-preloader]', { opacity: 0, duration: 0.6, pointerEvents: 'none' })
    .from(pick('bloom'),   { opacity: 0, scale: 1.15, duration: 2.4 }, 0.1)
    .from(pick('title'),   { yPercent: 110, duration: 1.4 }, 0.25)
    .from(all('button'),   { y: 24, opacity: 0, stagger: 0.08 }, 0.7)
    .from(pick('header'),  { yPercent: -100 }, 0.5)
    .from(pick('marquee'), { opacity: 0, duration: 1.6 }, 0.6)
    .from(pick('circle'),  { opacity: 0, scale: 0.7, rotate: -90 }, 0.8)
    .from([pick('socials'), pick('percent')].filter(Boolean),
          { opacity: 0, x: 20, stagger: 0.06 }, 1.0)
    .add(() => $lenis.start(), 0.9)
})
</script>

<template>
  <div v-if="!done" class="preloader" data-preloader>
    <CircleText text="Loading" :duration="6" />
  </div>
</template>

<style scoped>
.preloader { position: fixed; inset: 0; z-index: var(--z-preload); background: var(--bg-sink);
             display: grid; place-items: center; }
</style>
```

The hero must be rendered (not `v-if`'d away) behind the preloader — the timeline animates its real elements. If the hero mounts after the timeline builds, the `from()` tweens find nothing and the hero appears unanimated.

## A composed section

What a real section looks like once the primitives exist. Note how little section-specific code there is — that is the payoff of building in the order the SKILL prescribes.

```vue
<template>
  <section class="section section--tall trust">
    <div class="container trust__grid">
      <p class="label">Verifiable Network</p>

      <Reveal as="h2" class="h2 trust__title">
        Trust is the foundation of human coordination, and mathematical certainty is its purest form.
      </Reveal>

      <div class="trust__aside">
        <Reveal as="p" class="body">
          A universal verification layer that secures state transitions across a decentralised,
          cryptographically bound network.
        </Reveal>
        <div class="trust__cta">
          <LetterButton label="Read the whitepaper" to="/whitepaper" />
          <CircleText text="Verifiable" />
        </div>
        <StrokeFrame :w="900" :h="240" cap="left" class="trust__frame" />
      </div>
    </div>
    <Bloom class="trust__bloom" />
  </section>
</template>

<style scoped>
.trust__grid { display: grid; gap: var(--s-5) var(--s-6);
               grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); align-items: start; }
.trust__grid > .label { grid-column: 1 / -1; }
.trust__aside { position: relative; padding-block: var(--s-5); }
.trust__cta { display: flex; align-items: center; gap: var(--s-4); margin-top: var(--s-5); }
.trust__frame { inset: auto 0 0 -12vw; height: 15rem; }
.trust__bloom { inset: auto -12% -20% auto; width: 60vw; rotate: 24deg; }

@media (width < 900px) {
  .trust__grid { grid-template-columns: 1fr; }
  .trust__frame { display: none; }
}
</style>
```

## Nuxt config notes

```ts
export default defineNuxtConfig({
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],
  app: {
    head: {
      meta: [{ name: 'theme-color', content: '#050917' }],
      link: [{ rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
               href: '/fonts/display-variable.woff2' }],
    },
  },
  components: [{ path: '~/components', pathPrefix: false }],
})
```

Also:
- Every animation component is client-only in effect; guard `matchMedia`/`document` inside `onMounted`, never at module scope, or SSR build fails.
- Serve the sprite sheet from `/public/sprites.svg` (same origin) so cross-file `<use href>` resolves.
- Set `theme-color` to `--bg` so mobile browser chrome matches the canvas — a small detail that does a lot of work on iOS.
- For Ionic/Capacitor builds, skip Lenis on native (`Capacitor.isNativePlatform()`) and let the WebView scroll natively; keep the reveals, drop the smooth scroll.
