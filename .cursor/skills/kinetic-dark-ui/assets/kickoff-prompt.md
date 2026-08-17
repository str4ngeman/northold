# Kickoff prompt template

Hand this to an agent (Claude Code, Cursor, an MCP-connected agent) when starting a page in this design language. Fill the bracketed fields; delete what doesn't apply. The specificity is the point — a vague brief in this style produces a generic dark landing page.

---

## Template

```
Build [PAGE: e.g. the marketing home page] for [PROJECT + one-line description of what it actually does].

Use the `kinetic-dark-ui` skill as the design system of record. Read SKILL.md first, then
references/tokens.md and references/vue-nuxt.md before writing any code. Follow the ten laws
and the build order exactly; if you deviate, say which law and why.

STACK
- Framework: [Nuxt 4 / Vue 3 + Vite / Next / Astro]
- Styling: [plain CSS with the token block / Tailwind mapped to the tokens]
- Motion: GSAP + ScrollTrigger + Lenis, one ticker, per references/motion.md
- Deploy target: [static / SSR on VPS / Capacitor]

BRAND OVERRIDES (leave blank to use the skill defaults)
- Canvas: [hex, blue-shifted near-black]
- Light accent: [hex]
- Display typeface: [name + where it's licensed from]
- Signature motif: [tunnel / isogrid / contour rings / radial ticks / orbit paths]

SECTIONS, in order — one idea each, alternating the three layout types
1. Hero — claim: "[2–6 word headline]". Sub: one sentence, mechanism-first. Two CTAs: [labels].
2. [Section name] — [layout type] — [the one idea]
3. ...
[N]. Footer — [column groups]

CONTENT
Real copy only, written to the voice rules in SKILL.md. No lorem ipsum, no placeholder
"Feature One". If you don't have a fact, ask me rather than inventing a metric.

CONSTRAINTS
- Every asset original. Do not copy path data, sprites, video, or copy from any reference site.
- Ship the reduced-motion path and the no-JS path in the same pass, not as a follow-up.
- Mobile: no hijacked touch scroll, no custom cursor, drawn frames hidden below 900px.
- Run the ship checklist in references/qa.md and paste the results.

DELIVERABLES
- Token CSS + base CSS
- The primitives: Reveal, Magnetic, LetterButton, Marquee, CircleText, StrokeFrame,
  [signature motif], Cursor, ScrollProgress, Preloader
- The sections above, composed from those primitives
- A short README: how to change the accent hue, the signature motif, and the section order

Work in this order: tokens → shell → primitives → motifs → sections → preloader.
Show me the tokens and one finished section before building the rest.
```

---

## The rewritten version of the original ask

For reference, the prompt that generated this skill, written the way it should have been written:

```
Attached is the rendered HTML of [SITE URL]. I want the design system, not a clone.

Reverse-engineer its visual and motion DNA from the markup — the class taxonomy, data
attributes used as animation hooks, SVG techniques, component structure, animation library
choices, and any tokens exposed as CSS custom properties or meta tags — and tell me
explicitly which parts you inferred versus read directly, since the stylesheets aren't in
the source.

Then package it as an agent skill: a SKILL.md with a triggering description plus reference
files, structured so an agent can build a new site in this language without me re-explaining
it. Target [Nuxt 4 / Vue 3] with GSAP + Lenis, and include working component code, not
prose descriptions of components.

Cover: tokens, the motion contract, the geometric motifs and how to generate them
(don't copy their path data), the build order, the anti-patterns that make this look cheap
when imitated, and a performance/accessibility checklist — this style fails hard on both if
done naively.

Ask me anything you need about my stack or brand before you start.
```

The differences that matter: it names the deliverable format, states the target stack, demands generated geometry over copied assets, asks for the failure modes and not just the recipe, and separates what was observed from what was inferred.
