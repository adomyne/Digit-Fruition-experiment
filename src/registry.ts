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
  /**
   * Landing page section this screen shows, for the info bar's section tag
   * (see docs/site-structure.md). Scrolling sections mark each part with
   * data-lab-part="<name>" instead, and the tag follows the scroll.
   */
  part?: string;
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
    part: 'Hero',
  },
  {
    id: '03-hero-svelte-gsap',
    title: 'Hero · Svelte',
    stack: 'svelte',
    animation: 'gsap',
    figma: 'https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159',
    status: 'done',
    part: 'Hero',
  },
  {
    id: '04-hero-vue-motion',
    title: 'Hero · Vue',
    stack: 'vue',
    animation: 'motion-v',
    figma: 'https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159',
    status: 'done',
    part: 'Hero',
  },
  {
    id: '05-hero-vanilla-anime',
    title: 'Hero · Vanilla',
    stack: 'vanilla',
    animation: 'animejs',
    figma: 'https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159',
    status: 'done',
    part: 'Hero',
  },
  {
    id: '06-landing-skeleton',
    title: 'Landing skeleton',
    stack: 'astro',
    animation: 'none',
    figma: null,
    status: 'in-progress',
  },
  {
    id: '07-three-react-motion',
    title: 'Three.js · React',
    stack: 'react',
    animation: 'motion',
    figma: null,
    status: 'in-progress',
  },
];
