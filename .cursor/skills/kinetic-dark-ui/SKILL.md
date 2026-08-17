---
name: kinetic-dark-ui
description: Build cinematic dark "protocol lab" web interfaces in the visual language of high-end crypto-infra sites — near-black canvas, ambient image bloom, SVG stroke-drawn pill/arc section frames, per-letter button hovers, marquees, rotating circle text, perspective light-tunnels, magnetic hover, custom cursor, Lenis smooth scroll wired to GSAP scroll reveals, and a preloader that hands off to a hero timeline. Use this skill whenever the user asks for a landing page, marketing site, hero section, docs home, launch page, or portfolio and mentions any of these — cinematic, dark, kinetic, "Awwwards-style", "agency-quality", "doesn't look AI-generated", smooth scroll, scroll animations, custom cursor, marquee, animated SVG lines, or a "protocol / infra / L2 / zk" aesthetic. Also use it when the user wants something "like that site I showed you", asks to reuse a design DNA extracted from a reference site, or asks for GSAP/Lenis/ScrollTrigger choreography in Vue, Nuxt, React, Next, Astro, or plain HTML.
---

# Kinetic Dark UI

A build system for dark, motion-first marketing interfaces. The reference genotype is layeredge.io: a single near-black canvas, one typeface, one light hue, and a dozen small kinetic devices that all fire on scroll. This skill encodes that system so it can be rebuilt from scratch in any framework — without copying the reference site's assets.

## The ten laws

Follow these unless the brief overrides them. They are what makes the look cohere; breaking one at random is what makes an imitation read as cheap.

1. **One canvas, one light.** A single near-black background (`#050917`) across every section. No section gets its own colour. Depth comes from ambient bloom, not from swapping background colours or adding cards.
2. **Bloom, not shadow.** Glow comes from large, soft, pre-blurred images positioned behind content (the reference ships a ~1043×1198 webp reused a dozen times at different rotations and scales). Never `box-shadow`. Never a hard radial gradient with visible banding.
3. **Radius is 0 or an arc.** No 8px/12px rounded cards. Geometry is either a hard edge or a full pill / semicircle / capsule drawn at section scale. This single rule kills most of the "generic SaaS template" feel.
4. **Frames are drawn, not bordered.** Section boundaries are inline SVG paths (pills, half-capsules, stadium shapes) that stroke-draw themselves when scrolled into view. See `references/motifs.md`.
5. **Nothing arrives static.** Every heading, paragraph, and label enters via a masked reveal on scroll. If an element is visible at rest without having animated in, it looks pasted on.
6. **Type is kinetic.** Buttons flip letter-by-letter with a ~7ms per-letter stagger. Headings reveal per line. Circular badges rotate continuously. Marquees run edge to edge. Text is the primary animated material.
7. **Icons live inside sentences.** Small inline glyphs sit mid-headline (`LayerEdge enables ⬡ Anchoring as the foundation for the ✳ new Internet`). Icons are never a decorative grid of feature bullets at 48px.
8. **Extreme type scale contrast, one family.** One variable sans across the whole site. Display type is enormous and tightly tracked; labels are 11px uppercase with wide tracking; body is small and dimmed to ~60% opacity. No second font family, no serif accent.
9. **The pointer is part of the design.** Custom cursor, magnetic hover on interactive elements, a scroll-progress ring pinned to a corner. These say "engineered" more than any copy does.
10. **Copy is compressed.** Headlines are 2–6 words ("Trust-native Internet"). Body paragraphs are one sentence. Section labels are nouns. If a paragraph needs a second sentence, the design is carrying too little.

## Signature motif

Every site in this family has one repeated geometric signature. In the reference it is the **perspective tunnel**: a vanishing-point fan of curved lines, mirrored left/right, with a light gradient travelling along individual strokes. It appears behind the proof-aggregation diagram and twice in the CTA band.

Pick or generate one signature for the project and reuse it at three different scales. Do not invent a second one. `references/motifs.md` has a generator for the tunnel plus alternatives (isogrid, radial ticks, contour rings).

## Token system

Read `references/tokens.md` for the full copy-pasteable `:root` block. The short version:

| Role | Value | Notes |
|---|---|---|
| Canvas | `#050917` | Confirmed from the reference's `theme-color`. |
| Ink | `#EDF1FA` | Body text runs at 60–65% opacity of this. |
| Light | `#9BE8FF` | The one accent. Used for travelling gradients, hairline highlights, the cursor. |
| Line | `rgba(237,241,250,.10)` | All hairlines. `.22` for emphasis. |
| Display | `clamp(3.2rem, 8vw, 8.5rem)`, tracking `-0.03em` | |
| Label | `11px`, uppercase, tracking `0.18em` | |
| Ease | `cubic-bezier(.16,1,.3,1)` | The house ease. Use it for ~everything. |
| Durations | `.28s` / `.6s` / `1.2s` / `2.4s` | Fast, mid, slow, cinematic. |

Colour budget per screen: ~90% canvas, ~8% ink, ~2% light. If a third hue appears, delete it.

## The animation contract

The reference decouples motion from styling with **data attributes**, not classes: `data-welcome="title"`, `data-hero`, `data-magnetic`, `data-path`, `data-hover`, `data-lenis-prevent`, `data-no-pause`. JS queries attributes; CSS owns classes. Adopt this — it means a designer can restyle without breaking the timeline, and the preloader can orchestrate elements it doesn't own.

Reserved attributes and their meaning are listed in `references/motion.md`. Use that exact vocabulary so components stay swappable.

## Build order

Do not build sections first. The shell and primitives are what make sections cheap.

1. **Tokens** — `:root` block, single variable font preloaded, `prefers-reduced-motion` overrides.
2. **Shell** — smooth scroll (Lenis) driving GSAP ScrollTrigger from one ticker, custom cursor, scroll-progress ring, ambient bloom layer.
3. **Primitives** — `Reveal`, `Magnetic`, `LetterButton`, `Sprite`. Nothing else may animate directly.
4. **Motifs** — `StrokeFrame`, `TunnelLines`, `CircleText`, `Marquee`, `Bloom`.
5. **Sections** — compose primitives + motifs. Each section: label → display heading with inline glyph → one-sentence paragraph → CTA or diagram.
6. **Preloader last** — a master timeline over `[data-welcome]` elements that resolves a promise the hero awaits. Building it first will make you fight it all week.

## Section rhythm

The reference alternates three layouts and never repeats one twice in a row:

- **Centred cinematic** — hero, CTA band. Big type, marquee behind, bloom below.
- **Asymmetric split** — display heading left (60%), dimmed paragraph + CTA right (40%), decorative drawn arc bleeding off one edge.
- **Full-bleed media** — video or diagram with a grille/mask overlay, caption columns beneath.

Give each section `min-height: 100vh` or close, one idea, and a lot of empty canvas. Density is the enemy here.

## Reference files

Read the one you need; don't load all four.

- `references/tokens.md` — full token block, type scale, spacing, container, reduced-motion resets.
- `references/motion.md` — the data-attribute contract, Lenis + GSAP wiring, reveal / stagger / stroke-draw / marquee / magnetic / cursor / preloader recipes.
- `references/motifs.md` — stroke frames, tunnel generator, circle text, bloom, grille overlays, sprite sheet strategy, video handling.
- `references/vue-nuxt.md` — working Vue 3 / Nuxt SFCs and composables for every primitive above. For React/Next, the same logic ports directly; the DOM structures are identical.
- `references/qa.md` — performance, accessibility, reduced motion, mobile fallbacks, and the ship checklist.
- `assets/kickoff-prompt.md` — a prompt template to hand an agent when starting a new page in this language.

## Copy voice

Write like a protocol whitepaper's abstract, not like a SaaS landing page.

- Headline: a compound noun or a claim. "Trust-native Internet." "Verifiable Network."
- Subhead: one sentence, mechanism-first. Name the actual thing that happens ("proofs are recursively aggregated and verified at leaf level"), not the benefit.
- Labels: bare nouns — `Ecosystem`, `Lifecycle`, `Use Cases`.
- Never: "revolutionary", "seamless", "unlock", "supercharge", emoji, exclamation marks.
- Buttons: verb + object, and the same words all the way through the flow. "Start building", "Run a light node", "View documentation".

## Anti-patterns

These are the specific ways this look gets botched:

- Rounded cards with `1px solid rgba(255,255,255,.1)` borders and a slight background lift — the generic dark-dashboard default. Use drawn arcs and bare hairlines instead.
- Purple→blue diagonal gradients, glassmorphism, neon glow text-shadows.
- A second accent colour for "success" or "highlight".
- Animating everything with the same 0.5s ease-out. Vary: 0.28s for hover, 0.6s for reveals, 1.2s for stroke draws, 2.4s+ for ambient loops.
- 48px feature icons in a 3-up grid.
- Centre-aligning every section.
- Autoplaying a heavy hero video with `preload="auto"`.
- Building the preloader as a fake spinner with a fake percentage.

## Provenance and originality

Rebuild the **system**, never the assets. Do not copy the reference site's SVG path data, sprite sheets, blur webp, video files, logo, three.js model, or copy text; do not reuse its name or marks. Generate equivalent geometry programmatically (see `references/motifs.md`) and write original copy. The value here is the ruleset, and a site built from these rules will not look like a clone — it will look like a sibling.
