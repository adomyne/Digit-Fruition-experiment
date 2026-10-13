# apps/next: Next.js spike

A Next.js 16 (App Router) app with Three.js and Motion (`motion/react`, the
new name of Framer Motion). It is a separate project with its own
`package.json`, lockfile and dev server; it does not share `node_modules`
with the lab.

```sh
cd apps/next
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
```

- `app/tokens.css` is a copy of the lab's `src/styles/tokens.css`. Re-copy it
  when the tokens change.
- The GitHub Pages deploy only publishes the Astro lab, not this app.
