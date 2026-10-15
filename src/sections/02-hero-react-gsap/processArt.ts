// Path data for the Process illustration, read from the SVG files in
// assets/process/ (copied from docs/briefs/process/svg/parts/). Each file is
// one or a few filled paths; the scene draws them with fill="currentColor".
import seedSvg from './assets/process/seed.svg?raw';
import rootsSvg from './assets/process/roots.svg?raw';
import sproutSvg from './assets/process/sprout.svg?raw';
import treeSvg from './assets/process/tree.svg?raw';
import mangoSvg from './assets/process/mango.svg?raw';
import arrowSvg from './assets/process/arrow.svg?raw';

const paths = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);

export const SEED = paths(seedSvg)[0];
export const ROOTS = paths(rootsSvg)[0];
export const SPROUT = paths(sproutSvg)[0];
/** tree.svg: the tree, then its top-left and top-right leaves. */
export const [TREE, LEAF_LEFT, LEAF_RIGHT] = paths(treeSvg);
export const MANGO = paths(mangoSvg)[0];
export const ARROW = paths(arrowSvg)[0];

/*
 * Layout, in each file's own units.
 *
 * World = tree.svg units (486 x 561). The seed, roots and sprout are drawn
 * as in reference/seed-sprouting.svg (402 x 586), where they sit at these
 * offsets (matched point for point against the reference):
 */
export const SPROUTING = {
  seed: [78.76, 219.16],
  roots: [0, 448.94],
  sprout: [166.39, 0],
  /** Where the sprout leaves the seed: the ground point. */
  emerge: [306, 228],
} as const;

/** Ground line and trunk base, in tree units. */
export const GROUND_Y = 530;
export const TRUNK_X = 241;
/** Where the sprout stops riding up the trunk: the base of the top leaf. */
export const TREE_TIP = 140;
/** Size of the sprouting group next to the tree. */
export const SPROUTING_SCALE = 0.35;

/**
 * Step 3: the roots grow up through the seed to the sprout's base, getting
 * bigger than the seed, then spread into the tree's root flares at the
 * trunk base. Reference units: the trunk base (241, 520 in tree units) is
 * (306, 199.4) here, and a scale of 1 tree unit is 1 / 0.35.
 */
export const ROOTS_TO = {
  /** Where the sprout leaves the seed, in seed.svg units: the seed
   *  shrinks into it while the roots grow up through the seed to it. */
  seedTip: [227.2, 8.8],
  outgrow: 1.7,
  x: 196,
  y: -249.5,
  sx: 1.1 / 0.35,
  sy: 0.3 / 0.35,
} as const;

/** Pivot points (own units): where each part grows from. */
export const PIVOT = {
  seedCentre: [120, 120],
  roots: [110, 0],
  sprout: [140, 237],
  leafLeft: [205, 158],
  leafRight: [270, 155],
  mangoStem: [152, 4],
  mangoCentre: [106.5, 143.5],
} as const;

/**
 * The three mangoes of reference/tree-with-mangoes.svg, fitted with
 * mango.svg (over 96% overlap): centre, scale and rotation in tree units.
 */
export const MANGOES = [
  { x: 251, y: 243, s: 0.425, r: -8 },
  { x: 122, y: 335, s: 0.435, r: -8 },
  { x: 370.5, y: 348.5, s: 0.45, r: -15 },
] as const;

/** The scene's frame: the Figma graphic box (686 x 320). */
export const VIEW = { w: 686, h: 320 } as const;

/**
 * Camera per step: world point at the frame's centre and zoom (screen units
 * per tree unit). Step 3 and 4 match Figma: the tree is 277.4 x 320 at x 204.
 */
export const CAMERA = {
  1: { cx: 203.65, cy: 568.7, z: 2.75, r: 0 },
  2: { cx: 204.25, cy: 552.75, z: 1.414, r: 0 },
  3: { cx: 243.5, cy: 280.4, z: 0.5707, r: 0 },
  /** Step 4 -> 1: close on the centre mango, turned upright, at the size
   *  the seed has in step 1, so the morph only changes the shape. */
  loop: {
    cx: MANGOES[0].x,
    cy: MANGOES[0].y,
    z: (2.75 * SPROUTING_SCALE) / MANGOES[0].s,
    r: -MANGOES[0].r,
  },
} as const;

/** The camera as an SVG transform: world point (cx, cy) at the frame's
 *  centre, turned by r degrees, zoomed by z. */
export const cameraAt = ({ cx, cy, z, r }: { cx: number; cy: number; z: number; r: number }) =>
  `translate(${VIEW.w / 2} ${VIEW.h / 2}) rotate(${r}) scale(${z}) translate(${-cx} ${-cy})`;

/*
 * Step 4 -> 1 morph. The seed and mango files are one path each: an outline
 * plus details cut out as holes (the seed's husk gap and grooves, the
 * mango's highlight). The outline morphs; the details are drawn on top in
 * the background colour (even-odd) and fade. Everything is carried into
 * screen units (the 686 x 320 frame): the mango as the close-up camera shows
 * it, the seed as step 1 shows it, so the morph only changes the shape.
 */
const NUMBER = /-?\d*\.?\d+(?:e-?\d+)?/g;
const subpaths = (d: string) => d.split(/(?=M)/).map((p) => p.trim()).filter(Boolean);
const extent = (d: string) => {
  const n = (d.match(NUMBER) ?? []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
};
const outlineFirst = (d: string) => subpaths(d).sort((a, b) => extent(b) - extent(a));

/** A uniform placement: translate(x y) rotate(r) scale(s). */
type Place = { x: number; y: number; r: number; s: number };
const then = (a: Place, b: Place): Place => {
  const c = Math.cos((a.r * Math.PI) / 180);
  const n = Math.sin((a.r * Math.PI) / 180);
  return { x: a.x + a.s * (c * b.x - n * b.y), y: a.y + a.s * (n * b.x + c * b.y), r: a.r + b.r, s: a.s * b.s };
};
const at = (x: number, y: number, r = 0, s = 1): Place => ({ x, y, r, s });
const cameraPlace = (c: { cx: number; cy: number; z: number; r: number }) =>
  then(at(VIEW.w / 2, VIEW.h / 2, c.r, c.z), at(-c.cx, -c.cy));
/** Path data with every point placed by p. The files only use absolute
 *  M, C, L and Z, so the numbers come in x y pairs. */
const placed = (d: string, p: Place) => {
  const c = Math.cos((p.r * Math.PI) / 180);
  const n = Math.sin((p.r * Math.PI) / 180);
  const v = (d.match(NUMBER) ?? []).map(Number);
  let i = 0;
  return d.replace(/(-?\d*\.?\d+(?:e-?\d+)?)[\s,]*(-?\d*\.?\d+(?:e-?\d+)?)/g, () => {
    const [x, y] = [v[i], v[i + 1]];
    i += 2;
    return `${(p.x + p.s * (c * x - n * y)).toFixed(3)} ${(p.y + p.s * (n * x + c * y)).toFixed(3)} `;
  });
};
/** The centre mango as the close-up camera shows it. */
const MANGO_ON_SCREEN = [
  at(MANGOES[0].x, MANGOES[0].y, MANGOES[0].r, MANGOES[0].s),
  at(-PIVOT.mangoCentre[0], -PIVOT.mangoCentre[1]),
].reduce(then, cameraPlace(CAMERA.loop));
/** The seed as step 1 shows it. */
const SEED_ON_SCREEN = [
  at(TRUNK_X - SPROUTING.emerge[0] * SPROUTING_SCALE, GROUND_Y - SPROUTING.emerge[1] * SPROUTING_SCALE, 0, SPROUTING_SCALE),
  at(SPROUTING.seed[0], SPROUTING.seed[1]),
].reduce(then, cameraPlace(CAMERA[1]));
const [mangoOutline, ...mangoDetails] = outlineFirst(MANGO);
const [seedOutline, ...seedDetails] = outlineFirst(SEED);
/** Morph paths in screen units: outlines (from, to) and the details that fade. */
export const MORPH = {
  from: placed(mangoOutline, MANGO_ON_SCREEN),
  highlight: placed(mangoDetails.join(' '), MANGO_ON_SCREEN),
  to: placed(seedOutline, SEED_ON_SCREEN),
  grooves: placed(seedDetails.join(' '), SEED_ON_SCREEN),
};

/**
 * The two outlines as polygons with the same number of points, evenly
 * spaced along each, wound the same way, with matched starting points. The
 * seed outline has many more curve segments than the mango's, so morphing
 * the paths as drawn bunches up into lumps; these polygons morph cleanly.
 * Needs the DOM to measure the paths: call once on mount.
 */
export function morphPolygons(svg: SVGSVGElement, count = 400) {
  type Pt = [number, number];
  const sample = (d: string): Pt[] => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    const len = path.getTotalLength();
    const pts = Array.from({ length: count }, (_, i): Pt => {
      const q = path.getPointAtLength((len * i) / count);
      return [q.x, q.y];
    });
    path.remove();
    return pts;
  };
  const area = (pts: Pt[]) =>
    pts.reduce((sum, [x, y], i) => sum + x * pts[(i + 1) % count][1] - pts[(i + 1) % count][0] * y, 0);
  const from = sample(MORPH.from);
  let to = sample(MORPH.to);
  if (Math.sign(area(from)) !== Math.sign(area(to))) to = to.reverse();
  // Rotate the seed's points so the mango's points travel the least.
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k < count; k += 2) {
    let cost = 0;
    for (let i = 0; i < count; i += 4) {
      const [x, y] = to[(i + k) % count];
      cost += (from[i][0] - x) ** 2 + (from[i][1] - y) ** 2;
    }
    if (cost < bestCost) [best, bestCost] = [k, cost];
  }
  to = to.map((_, i) => to[(i + best) % count]);
  const polygon = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;
  return { from, to, fromD: polygon(from), toD: polygon(to) };
}
