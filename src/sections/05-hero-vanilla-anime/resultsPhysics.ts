/**
 * Results icon pool: a small 2D physics world, written by hand for this
 * sandbox (no physics library, so each stack builds its own).
 *
 * Every icon is a disc: gravity, bouncy contacts with friction and spin,
 * walls on three sides and a ceiling once an icon has fallen in. A held
 * icon follows the pointer and pushes the others; letting go keeps its
 * speed, so it can be thrown. Units are CSS pixels and seconds.
 */

/** Icon box (px): every icon is 90 x 90. */
export const ICON = 90;
/** Collision radius (px): a little over half the box, so the rounded
 *  corners of a turned icon don't sink into a neighbour. */
export const RADIUS = 46;

const GRAVITY = 2600;
/** Bounce: share of the hitting speed kept after a contact. */
const BOUNCE = 0.5;
/** Below this hitting speed (px/s) a contact doesn't bounce, so a resting
 *  pile stays still instead of trembling. */
const REST_SPEED = 60;
const FRICTION = 0.4;
const AIR = 0.25; // velocity lost per second
const SPIN_DRAG = 0.6; // spin lost per second
const SUBSTEPS = 4;
const ITERATIONS = 3;
/** Overlap (px) left alone so stacked icons don't jitter. */
const SLOP = 0.5;
const MAX_SPEED = 4000;
/** A contact this fast (px/s) or faster makes both icons glow. */
export const GLOW_SPEED = 90;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Turn (radians) and spin (radians per second). */
  a: number;
  w: number;
  /** 0 to 1, set on impact and faded by the caller. */
  glow: number;
  /** Has fallen below the top edge: the ceiling applies from then on. */
  inside: boolean;
  /** Pointer target while held, else null. */
  hold: { x: number; y: number } | null;
  /** Position in the world's list, refreshed every step. */
  i: number;
}

export interface World {
  bodies: Body[];
  width: number;
  height: number;
}

export const createBody = (x: number, y: number, vy = 0, w = 0): Body => ({
  x, y, vx: 0, vy, a: Math.random() * Math.PI * 2, w, glow: 0, inside: false, hold: null, i: 0,
});

// Equal discs: one mass, one moment of inertia (solid disc, I = m r² / 2).
const IM = 1;
const II = 2 / (RADIUS * RADIUS);

const hit = (b: Body, speed: number) => {
  if (speed < GLOW_SPEED) return;
  b.glow = Math.max(b.glow, Math.min(1, 0.35 + speed / 1200));
};

/** Contact with a wall whose normal (nx, ny) points into the world. */
const wall = (b: Body, nx: number, ny: number, depth: number) => {
  b.x += nx * depth;
  b.y += ny * depth;
  if (b.hold) return;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  hit(b, -vn);
  const jn = -(1 + (-vn > REST_SPEED ? BOUNCE : 0)) * vn;
  b.vx += jn * nx;
  b.vy += jn * ny;
  // Friction at the contact point turns sliding into rolling.
  const tx = -ny, ty = nx;
  const vt = b.vx * tx + b.vy * ty - b.w * RADIUS;
  let jt = -vt / (IM + RADIUS * RADIUS * II);
  const max = FRICTION * jn;
  jt = Math.max(-max, Math.min(max, jt));
  b.vx += jt * tx;
  b.vy += jt * ty;
  b.w -= RADIUS * jt * II;
};

const walls = (world: World, b: Body) => {
  const r = RADIUS;
  if (b.x < r) wall(b, 1, 0, r - b.x);
  if (b.x > world.width - r) wall(b, -1, 0, b.x - (world.width - r));
  if (b.y > world.height - r) wall(b, 0, -1, b.y - (world.height - r));
  if (!b.inside && b.y > r) b.inside = true;
  if (b.inside && b.y < r) wall(b, 0, 1, r - b.y);
};

const pair = (a: Body, b: Body) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const min = RADIUS * 2;
  if (d2 >= min * min || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d;
  // A held icon is moved by the pointer only: it pushes, it isn't pushed.
  const ia = a.hold ? 0 : IM;
  const ib = b.hold ? 0 : IM;
  const iia = a.hold ? 0 : II;
  const iib = b.hold ? 0 : II;
  if (ia + ib === 0) return;
  const push = Math.max(0, min - d - SLOP) / (ia + ib);
  a.x -= nx * push * ia;
  a.y -= ny * push * ia;
  b.x += nx * push * ib;
  b.y += ny * push * ib;

  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  hit(a, -vn);
  hit(b, -vn);
  const jn = (-(1 + (-vn > REST_SPEED ? BOUNCE : 0)) * vn) / (ia + ib);
  a.vx -= jn * nx * ia;
  a.vy -= jn * ny * ia;
  b.vx += jn * nx * ib;
  b.vy += jn * ny * ib;

  const tx = -ny, ty = nx;
  const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.w * RADIUS - a.w * RADIUS;
  let jt = -vt / (ia + ib + RADIUS * RADIUS * (iia + iib));
  const max = FRICTION * jn;
  jt = Math.max(-max, Math.min(max, jt));
  a.vx -= jt * tx * ia;
  a.vy -= jt * ty * ia;
  b.vx += jt * tx * ib;
  b.vy += jt * ty * ib;
  a.w -= RADIUS * jt * iia;
  b.w -= RADIUS * jt * iib;
};

// Broad phase: a grid of cells one icon wide, so each icon only checks its
// neighbours instead of every other icon.
const CELL = RADIUS * 2;
const grid = new Map<number, Body[]>();
const key = (cx: number, cy: number) => (cy + 64) * 4096 + (cx + 64);

const collide = (world: World) => {
  grid.clear();
  world.bodies.forEach((b, i) => (b.i = i));
  for (const b of world.bodies) {
    const k = key(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    const cell = grid.get(k);
    if (cell) cell.push(b);
    else grid.set(k, [b]);
  }
  for (const b of world.bodies) {
    const cx = Math.floor(b.x / CELL);
    const cy = Math.floor(b.y / CELL);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cell = grid.get(key(cx + ox, cy + oy));
        if (!cell) continue;
        // Each pair once: only against icons later in the list.
        for (const o of cell) if (o.i > b.i) pair(b, o);
      }
    }
  }
};

/** Advances the world by `dt` seconds. */
export const step = (world: World, dt: number) => {
  const h = dt / SUBSTEPS;
  const air = Math.exp(-AIR * h);
  const spin = Math.exp(-SPIN_DRAG * h);
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const b of world.bodies) {
      if (b.hold) {
        // Close most of the gap to the pointer each frame; that speed is
        // what a throw keeps on release.
        b.vx = ((b.hold.x - b.x) / dt) * 0.6;
        b.vy = ((b.hold.y - b.y) / dt) * 0.6;
        b.w *= 0.9;
      } else {
        b.vy += GRAVITY * h;
        b.vx *= air;
        b.vy *= air;
        b.w *= spin;
      }
      const v = Math.hypot(b.vx, b.vy);
      if (v > MAX_SPEED) {
        b.vx *= MAX_SPEED / v;
        b.vy *= MAX_SPEED / v;
      }
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.a += b.w * h;
    }
    for (let i = 0; i < ITERATIONS; i++) {
      collide(world);
      for (const b of world.bodies) walls(world, b);
    }
  }
};

/** How many icons fill `share` of a `width` x `height` area. A loose pile
 *  of discs covers about 80% of the area it sits in. */
export const countFor = (width: number, height: number, share: number) =>
  Math.round((width * height * share * 0.8) / (Math.PI * RADIUS * RADIUS));
