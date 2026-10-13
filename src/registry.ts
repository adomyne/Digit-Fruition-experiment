/**
 * Lab registry: the single ordered list of experiments.
 * The shell reads it for arrow order (index = position + 1 = URL number)
 * and for the corner label. Add a section by appending an entry and
 * creating its folder under src/sections/<id>/.
 */

export type Stack = 'astro' | 'react' | 'svelte' | 'vue' | 'vanilla' | 'nextjs' | 'sveltekit' | 'nuxt';
export type AnimationLib = 'none' | 'gsap' | 'motion' | 'motion-v' | 'animejs' | 'svelte-transition';
export type Status = 'planned' | 'in-progress' | 'done';

export interface Section {
  /** Folder name under src/sections/, also used as a stable key. */
  id: string;
  title: string;
  stack: Stack;
  /** One animation library per section (see AGENTS.md). */
  animation: AnimationLib;
  /** Figma frame link, or null until a frame exists. */
  figma: string | null;
  status: Status;
  /** For apps in apps/: a URL to link to or iframe instead of a section component. */
  appUrl?: string;
}

export const sections: Section[] = [
  {
    id: '01-static-check',
    title: 'Static check',
    stack: 'astro',
    animation: 'none',
    figma: null,
    status: 'done',
  },
  {
    id: '02-hero-react-gsap',
    title: 'Hero (baseline)',
    stack: 'react',
    animation: 'gsap',
    figma: 'https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159',
    status: 'done',
  },
];
