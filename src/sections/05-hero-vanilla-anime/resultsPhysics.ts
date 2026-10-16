/**
 * Results icon pool: a small 2D physics world, written by hand for this
 * sandbox (no physics library, so each stack builds its own).
 *
 * Every icon is a rigid body whose hitbox is a few circles fitted inside
 * its real shape (clover, leaf, scalloped disc, diamond), so icons touch
 * where they look like they touch and a square side rests flat instead of
 * rolling. Gravity, bouncy contacts with friction and spin, walls on three
 * sides and a ceiling once an icon has fallen in. A held icon follows the
 * pointer and pushes the others; letting go keeps its speed, so it can be
 * thrown. Units are CSS pixels and seconds.
 */

/** Icon box (px): every icon is 90 x 90. */
export const ICON = 90;

/** Hitboxes, one list per shape: circles [x, y, r] in the icon's own box
 *  (centre 0, 0; y down), fitted inside the uploaded SVGs. Same order as
 *  the shapes in Results.astro: dollar, euro, percent, plus. */
const HITBOXES: [number, number, number][][] = [
  // Dollar: a four-lobed clover.
  [[0, 0, 33.5], [21, 21, 24], [-21, 21, 24], [21, -21, 24], [-21, -21, 24]],
  // Euro: a leaf, pointed top right and bottom left.
  [[0, 0, 42], [-20, 20, 25.5], [23, -23, 22], [-34, 34, 11], [33, -33, 10]],
  // Percent: a scalloped disc.
  [[0, 0, 43.5]],
  // Plus: a diamond.
  [[0, 0, 33.6], [29, 0, 13.5], [-29, 0, 13.5], [0, 29, 13.5], [0, -29, 13.5],
    [38, 0, 6], [-38, 0, 6], [0, 38, 6], [0, -38, 6]],
];
/** Each shape's reach: the farthest hitbox edge from its centre. */
const REACH = HITBOXES.map((h) => Math.max(...h.map(([x, y, r]) => Math.hypot(x, y) + r)));
const MAX_REACH = Math.max(...REACH);

const GRAVITY = 2600;
/** Bounce: share of the hitting speed kept after a contact. */
const BOUNCE = 0.45;
/** Below this hitting speed (px/s) a contact doesn't bounce, so a resting
 *  pile stays still instead of trembling. */
const REST_SPEED = 60;
const FRICTION = 0.5;
const AIR = 0.25; // velocity lost per second
const SPIN_DRAG = 0.8; // spin lost per second
/** Slower than this (px/s and rad/s), an icon is settling: its spin is
 *  damped hard so a resting icon never keeps turning. */
const SETTLE_SPEED = 25;
const SETTLE_SPIN = 0.6;
const SUBSTEPS = 4;
const ITERATIONS = 4;
/** Overlap (px) left alone so stacked icons don't jitter. */
const SLOP = 0.3;
const MAX_SPEED = 4000;
/** Asleep: an icon slower than this (px/s, rad/s) for SLEEP_AFTER seconds
 *  stops moving and holds still like the floor, so a pile rests exactly
 *  instead of creeping. A moving or held icon that touches it wakes it. */
const SLEEP_SPEED = 45;
const SLEEP_SPIN = 0.3;
const SLEEP_AFTER = 0.25;
const WAKE_SPEED = 60;
/** A contact this fast (px/s) or faster makes the icon glow. */
export const GLOW_SPEED = 90;

// One mass for every icon; the moment of inertia of a 90 x 90 plate.
const IM = 1;
const II = 12 / (ICON * ICON * 2);

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Turn (radians) and spin (radians per second). */
  a: number;
  w: number;
  /** Index into HITBOXES. */
  shape: number;
  /** 0 to 1, set on impact and faded by the caller. */
  glow: number;
  /** Has fallen below the top edge: the ceiling applies from then on. */
  inside: boolean;
  /** Pointer target while held, else null. */
  hold: { x: number; y: number } | null;
  /** Position in the world's list, refreshed every step. */
  i: number;
  /** Seconds spent slow; asleep once past SLEEP_AFTER. */
  still: number;
  asleep: boolean;
  /** Hitbox centres in page space, refreshed every pass. */
  cx: number[];
  cy: number[];
}

export interface World {
  bodies: Body[];
  width: number;
  height: number;
}

export const createBody = (x: number, y: number, shape: number, vy = 0, w = 0): Body => ({
  x, y, vx: 0, vy, a: Math.random() * Math.PI * 2, w, shape, glow: 0, inside: false, hold: null, i: 0,
  still: 0, asleep: false, cx: [], cy: [],
});

export const wake = (b: Body) => {
  b.asleep = false;
  b.still = 0;
};
export const wakeAll = (world: World) => world.bodies.forEach(wake);

const place = (b: Body) => {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  HITBOXES[b.shape].forEach(([x, y], k) => {
    b.cx[k] = b.x + x * c - y * s;
    b.cy[k] = b.y + x * s + y * c;
  });
};

const hit = (b: Body | null, speed: number) => {
  if (!b || speed < GLOW_SPEED) return;
  b.glow = Math.max(b.glow, Math.min(1, 0.35 + speed / 1200));
};

/**
 * One contact at (px, py) between `a` and `b` (null = a wall), normal
 * (nx, ny) pointing from a to b, overlap `depth`. Pushes them apart, then
 * applies a bounce and a friction impulse at the contact point, so an
 * off-centre hit turns the icon.
 */
const contact = (a: Body | null, b: Body | null, px: number, py: number, nx: number, ny: number, depth: number) => {
  // A held icon is moved by the pointer only: it pushes, it isn't pushed.
  // A sleeping one holds still like a wall.
  const ima = a && !a.hold && !a.asleep ? IM : 0, iia = ima ? II : 0;
  const imb = b && !b.hold && !b.asleep ? IM : 0, iib = imb ? II : 0;
  if (ima + imb === 0) return;

  const push = Math.max(0, depth - SLOP) / (ima + imb);
  if (a) { a.x -= nx * push * ima; a.y -= ny * push * ima; }
  if (b) { b.x += nx * push * imb; b.y += ny * push * imb; }

  const rax = a ? px - a.x : 0, ray = a ? py - a.y : 0;
  const rbx = b ? px - b.x : 0, rby = b ? py - b.y : 0;
  const rel = () => {
    const vax = a ? a.vx - a.w * ray : 0, vay = a ? a.vy + a.w * rax : 0;
    const vbx = b ? b.vx - b.w * rby : 0, vby = b ? b.vy + b.w * rbx : 0;
    return [vbx - vax, vby - vay];
  };
  const apply = (jx: number, jy: number) => {
    if (a) { a.vx -= jx * ima; a.vy -= jy * ima; a.w -= (rax * jy - ray * jx) * iia; }
    if (b) { b.vx += jx * imb; b.vy += jy * imb; b.w += (rbx * jy - rby * jx) * iib; }
  };

  let [rx, ry] = rel();
  const vn = rx * nx + ry * ny;
  if (vn >= 0) return;
  hit(a, -vn);
  hit(b, -vn);
  const ran = rax * ny - ray * nx, rbn = rbx * ny - rby * nx;
  const jn = (-(1 + (-vn > REST_SPEED ? BOUNCE : 0)) * vn) / (ima + imb + ran * ran * iia + rbn * rbn * iib);
  apply(jn * nx, jn * ny);

  // Friction along the contact, at most FRICTION times the push.
  [rx, ry] = rel();
  const tx = -ny, ty = nx;
  const vt = rx * tx + ry * ty;
  const rat = rax * ty - ray * tx, rbt = rbx * ty - rby * tx;
  let jt = -vt / (ima + imb + rat * rat * iia + rbt * rbt * iib);
  const max = FRICTION * jn;
  jt = Math.max(-max, Math.min(max, jt));
  apply(jt * tx, jt * ty);
};

const walls = (world: World, b: Body) => {
  if (b.asleep) return;
  place(b);
  if (!b.inside && b.y > REACH[b.shape]) b.inside = true;
  HITBOXES[b.shape].forEach(([, , r], k) => {
    const x = b.cx[k], y = b.cy[k];
    // Normals point from the wall into the world (from a to b).
    if (x < r) contact(null, b, x - r, y, 1, 0, r - x);
    if (x > world.width - r) contact(null, b, x + r, y, -1, 0, x + r - world.width);
    if (y > world.height - r) contact(null, b, x, y + r, 0, -1, y + r - world.height);
    if (b.inside && y < r) contact(null, b, x, y - r, 0, 1, r - y);
  });
};

/** Speed of an icon's fastest edge: what a sleeper it touches feels. */
const pace = (b: Body) => Math.hypot(b.vx, b.vy) + Math.abs(b.w) * REACH[b.shape];

const pair = (a: Body, b: Body) => {
  if (a.asleep && b.asleep) return;
  const reach = REACH[a.shape] + REACH[b.shape];
  if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 >= reach * reach) return;
  place(a);
  place(b);
  const ha = HITBOXES[a.shape], hb = HITBOXES[b.shape];
  // The deepest overlapping pair of hitbox circles is the contact.
  let best = 0, bi = -1, bj = -1, bd = 0;
  for (let i = 0; i < ha.length; i++) {
    for (let j = 0; j < hb.length; j++) {
      const dx = b.cx[j] - a.cx[i], dy = b.cy[j] - a.cy[i];
      const min = ha[i][2] + hb[j][2];
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      if (min - d > best) { best = min - d; bi = i; bj = j; bd = d; }
    }
  }
  if (bi < 0 || bd === 0) return;
  if (a.asleep && (b.hold || pace(b) > WAKE_SPEED)) wake(a);
  if (b.asleep && (a.hold || pace(a) > WAKE_SPEED)) wake(b);
  const nx = (b.cx[bj] - a.cx[bi]) / bd, ny = (b.cy[bj] - a.cy[bi]) / bd;
  const ra = ha[bi][2];
  contact(a, b, a.cx[bi] + nx * (ra - best / 2), a.cy[bi] + ny * (ra - best / 2), nx, ny, best);
};

// Broad phase: a grid of cells two reaches wide, so each icon only checks
// its neighbours instead of every other icon.
const CELL = MAX_REACH * 2;
const grid = new Map<number, Body[]>();
const key = (cx: number, cy: number) => (cy + 64) * 4096 + (cx + 64);

const collide = (world: World) => {
  grid.clear();
  world.bodies.forEach((b, i) => {
    b.i = i;
    const k = key(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    const cell = grid.get(k);
    if (cell) cell.push(b);
    else grid.set(k, [b]);
  });
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
      if (b.asleep) continue;
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
        // Settling: no slow drift of the turn once it has nearly stopped.
        if (Math.hypot(b.vx, b.vy) < SETTLE_SPEED && Math.abs(b.w) < SETTLE_SPIN) {
          b.w *= 0.8;
          if (Math.abs(b.w) < 0.02) b.w = 0;
        }
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
  for (const b of world.bodies) {
    if (b.asleep) continue;
    const slow = !b.hold && Math.hypot(b.vx, b.vy) < SLEEP_SPEED && Math.abs(b.w) < SLEEP_SPIN;
    b.still = slow ? b.still + dt : 0;
    if (b.still > SLEEP_AFTER) {
      b.asleep = true;
      b.vx = b.vy = b.w = 0;
    }
  }
};

/** How many icons fill `share` of a `width` x `height` area. A loose pile
 *  of these shapes covers about 78% of the area it sits in. */
export const countFor = (width: number, height: number, share: number) =>
  Math.round((width * height * share * 0.78) / (ICON * ICON * 0.8));
