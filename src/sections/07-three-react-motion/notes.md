# 07 · Three.js · React

**Stack:** React island + Three.js (WebGL) + Motion (`motion/react`) · **Status:** in progress
**Built by:** Claude Code (cloud), as a starter so Three.js and Motion are wired into the lab.

## What's built
- `Scene.tsx`: a Three.js torus knot in the section's accent colour, lit by an
  ambient and a key light, spinning in `renderer.setAnimationLoop`. Colours
  are read from the tokens with `getComputedStyle`, so there are no raw hex values.
- The title and subtitle fade up with Motion (`motion.h1`, `motion.p`), using
  the hero's `power3.out` curve as a cubic-bezier.
- One library per element: Three.js owns everything inside the canvas, Motion
  owns the DOM copy.
- Mounted with `client:only="react"` because WebGL only exists in the browser.
  The `fallback` slot in `Section.astro` shows the same copy before the island
  loads or without JS.
- Reduced motion: the knot renders once without spinning and the copy skips its intro.
- Three.js is loaded with a dynamic `import()` inside the effect, so the copy
  and Motion show first and the 3D library arrives in its own chunk.
- Cleanup: the effect return stops the animation loop, disconnects the
  `ResizeObserver` and disposes the geometry, material and renderer.

## Packages
`three` and `motion` are installed at the repo root, so any section can use
them. `motion` is the current name of Framer Motion (import from
`motion/react`). It is the React package; Vue sections keep `motion-v`.

## Unfinished
- No Figma frame yet; the scene is a placeholder for a real 3D design.
