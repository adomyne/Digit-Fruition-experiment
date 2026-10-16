<script setup lang="ts">
// Results (Vue 3 + Motion for Vue), in two phases. Figma: concept 142:1466
// (icon pool), results card 142:1470. Same behaviour, numbers and physics
// as the vanilla build on page 5 (see notes.md); written the Vue way:
// 1. Icon pool: when the section's top reaches the middle of the screen,
//    a Motion animate() glides the scroll into place and the scroll is held
//    for 3 s while orange icons fall and pile up to 60% of the height. They
//    stay playable: drag, throw, bounce, glow on impact.
// 2. The pool stays fixed (sticky) while the white card scrolls up over
//    it; the sticky title rides on the card once the card reaches it.
//
// Performance: one shallowRef (the icon list) is set once when the drop
// starts, so Vue renders the icons once. Everything the physics touches
// per frame is a plain object, never reactive; it runs on Motion's frame
// loop (only while the pool is on screen and something moves) and writes
// transforms through template refs, skipping icons that sleep.
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { animate, cancelFrame, frame, type AnimationPlaybackControls } from 'motion-v';
import { ICON, countFor, createBody, step, wake as wakeBody, wakeAll, type Body, type World } from './resultsPhysics';
import dollar from './assets/results-icons/dollar.svg?url';
import euro from './assets/results-icons/euro.svg?url';
import percent from './assets/results-icons/percent.svg?url';
import plus from './assets/results-icons/plus.svg?url';
import download from './assets/download.svg?url';
import './Results.css';

const SHAPES = [dollar, euro, percent, plus];
const METRICS = [
  { value: '56%', label: 'Growth in Monthly Sales' },
  { value: '$30K', label: 'New Monthly Revenue' },
  { value: '2X', label: 'Growth in Monthly Revenue' },
  { value: '43%', label: 'Improvement in CTR' },
];
const TITLE = 'Results That Speak For Themselves';

/** Share of the section's height the pile fills. */
const FILL = 0.6;
/** The scroll is held this long (s) while the icons fall. */
const DROP = 3;
/** Icons start falling over this long (s), so the last lands by DROP. */
const SPAWN = 2.2;
/** The glide that brings the section into place (s). */
const SNAP = 0.7;
/** Glow lost per second after an impact. */
const GLOW_FADE = 2.5;
/** Frames with everything at rest before the clock stops. */
const REST_FRAMES = 45;
/** outQuart, as the glide on page 5. */
const EASE = [0.25, 1, 0.5, 1] as const;

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One icon as Vue renders it: its shape and which orange. */
interface Icon {
  shape: number;
  light: boolean;
}

const root = useTemplateRef<HTMLElement>('root');
const layer = useTemplateRef<HTMLDivElement>('layer');
const titleBar = useTemplateRef<HTMLHeadingElement>('titleBar');
const titleText = useTemplateRef<HTMLSpanElement>('titleText');
const slot = useTemplateRef<HTMLParagraphElement>('slot');
/** The icon elements, by index (function refs); not reactive. */
const els: HTMLSpanElement[] = [];
const icons = shallowRef<Icon[]>([]);
const shapeStyle = (icon: Icon) => ({ '--shape': `url("${SHAPES[icon.shape]}")` });

// The pointer handlers are created in onMounted; the template calls them
// through this object.
let api: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | undefined;
let cleanup: (() => void) | undefined;

onMounted(() => {
  const rootEl = root.value!;
  const layerEl = layer.value!;
  const titleBarEl = titleBar.value!;
  const titleTextEl = titleText.value!;
  const slotEl = slot.value!;
  const scroller = rootEl.closest<HTMLElement>('[data-sandbox]')!;
  const world: World = { bodies: [], width: layerEl.clientWidth, height: layerEl.clientHeight };
  /** Spawn times (s after the drop starts), soonest first. */
  let queue: number[] = [];
  let elapsed = 0;
  let resting = 0;
  let running = false;
  let visible = false;
  let destroyed = false;
  // What each element shows now, so a frame writes only changes.
  const drawn: boolean[] = [];
  const glowing: boolean[] = [];

  const render = (dt: number) => {
    world.bodies.forEach((b, i) => {
      const el = els[i];
      if (!b.asleep || !drawn[i]) {
        el.style.transform = `translate3d(${b.x - ICON / 2}px, ${b.y - ICON / 2}px, 0) rotate(${b.a}rad)`;
        drawn[i] = b.asleep;
      }
      if (b.glow > 0) {
        b.glow = Math.max(0, b.glow - dt * GLOW_FADE);
        el.style.setProperty('--glow', b.glow.toFixed(3));
      }
      const on = b.glow > 0.01;
      if (on !== !!glowing[i]) {
        glowing[i] = on;
        el.classList.toggle('is-glowing', on);
      }
    });
  };

  const tick = (dt: number) => {
    elapsed += dt;
    while (queue.length && queue[0] <= elapsed) {
      queue.shift();
      const x = ICON / 2 + Math.random() * Math.max(0, world.width - ICON);
      const shape = icons.value[world.bodies.length].shape;
      world.bodies.push(createBody(x, -ICON / 2 - Math.random() * ICON, shape, 300 + Math.random() * 400, (Math.random() - 0.5) * 6));
    }
    step(world, dt);
    render(dt);
    // Nothing moving: stop the clock until a pointer or a resize wakes it.
    const rest = queue.length === 0 && world.bodies.every((b) => b.asleep && b.glow === 0);
    resting = rest ? resting + 1 : 0;
    if (resting > REST_FRAMES) sleep();
  };

  // Motion's frame loop is the physics clock (delta in ms); `true` keeps
  // the callback on every frame until cancelFrame.
  const onFrame = ({ delta }: { delta: number }) => tick(Math.min(delta, 50) / 1000);
  const wake = () => {
    resting = 0;
    if (!running && visible && icons.value.length) {
      running = true;
      frame.update(onFrame, true);
    }
  };
  const sleep = () => {
    if (!running) return;
    running = false;
    cancelFrame(onFrame);
  };

  const drop = () => {
    const n = icons.value.length;
    queue = Array.from({ length: n }, (_, i) => (i / n) * SPAWN + Math.random() * 0.06).sort((a, b) => a - b);
    elapsed = 0;
    wake();
  };

  /** Reduced motion: the pile is settled off screen and appears at rest. */
  const settle = () => {
    const perRow = Math.max(1, Math.floor(world.width / ICON));
    icons.value.forEach((icon, i) => {
      const row = Math.floor(i / perRow);
      const x = ICON / 2 + (i % perRow) * ICON + (row % 2) * (ICON / 2);
      const b = createBody(Math.min(x, world.width - ICON / 2), world.height - ICON / 2 - row * ICON, icon.shape);
      b.inside = true;
      world.bodies.push(b);
    });
    for (let i = 0; i < 180; i++) step(world, 1 / 60);
    world.bodies.forEach((b) => (b.glow = 0));
    render(0);
  };

  // ---------- Drag and throw ----------
  let grab: { b: Body; el: HTMLElement; id: number; dx: number; dy: number } | null = null;
  const local = (e: PointerEvent) => {
    const r = layerEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const clampToWorld = (x: number, y: number) => ({
    x: Math.min(Math.max(x, ICON / 2), world.width - ICON / 2),
    y: Math.min(Math.max(y, ICON / 2), world.height - ICON / 2),
  });
  api = {
    down(e) {
      const el = (e.target as Element).closest<HTMLSpanElement>('.results__icon');
      const b = el ? world.bodies[els.indexOf(el)] : undefined;
      if (!el || !b || grab) return;
      const p = local(e);
      grab = { b, el, id: e.pointerId, dx: b.x - p.x, dy: b.y - p.y };
      b.hold = { x: b.x, y: b.y };
      wakeBody(b);
      b.inside = true;
      el.classList.add('is-held');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
      wake();
    },
    move(e) {
      if (!grab || e.pointerId !== grab.id) return;
      const p = local(e);
      grab.b.hold = clampToWorld(p.x + grab.dx, p.y + grab.dy);
    },
    up(e) {
      if (!grab || e.pointerId !== grab.id) return;
      grab.b.hold = null; // keeps its speed: a throw
      grab.el.classList.remove('is-held');
      grab = null;
      wake();
    },
  };

  // ---------- Title ----------
  // Sticky; once the card's hidden copy (the slot) has risen to it, the
  // title moves with the slot, so it rides on the card.
  let titlePad = parseFloat(getComputedStyle(titleTextEl).paddingTop);
  const followCard = () => {
    const pinned = titleBarEl.getBoundingClientRect().top + titlePad;
    const shift = Math.min(0, slotEl.getBoundingClientRect().top - pinned);
    titleTextEl.style.transform = shift ? `translateY(${shift}px)` : '';
  };

  // ---------- Scroll hijack ----------
  let started = false;
  let locked = false;
  let snapping = false;
  let lockAt = 0;
  let lastTop = scroller.scrollTop;
  let glide: AnimationPlaybackControls | undefined;
  let unlockTimer = 0;
  const offset = () => rootEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  // While held the scroller stops scrolling natively, as the Ads hold
  // does; the gutter keeps the width steady.
  const lock = (on: boolean) => {
    locked = on;
    scroller.style.overflow = on ? 'hidden' : '';
    scroller.style.scrollbarGutter = on ? 'stable' : '';
  };

  /** Picks the icons, waits for Vue to render them, then drops. */
  const begin = async () => {
    started = true;
    icons.value = Array.from({ length: countFor(world.width, world.height, FILL) }, () => ({
      shape: Math.floor(Math.random() * SHAPES.length),
      light: Math.random() < 0.5,
    }));
    await nextTick();
    if (destroyed) return;
    if (still()) {
      settle();
      return;
    }
    const o = offset();
    if (o < -1) {
      // Already past the section's top (a reload lower down): no glide.
      drop();
      return;
    }
    lock(true);
    snapping = true;
    const from = scroller.scrollTop;
    glide = animate(from, from + o, {
      duration: SNAP,
      ease: EASE,
      onUpdate: (y) => {
        scroller.scrollTop = y;
      },
      onComplete: () => {
        snapping = false;
        lockAt = scroller.scrollTop;
        drop();
        unlockTimer = window.setTimeout(() => lock(false), DROP * 1000);
      },
    });
  };

  const onScroll = () => {
    followCard();
    const top = scroller.scrollTop;
    if (locked) {
      if (!snapping && top !== lockAt) scroller.scrollTop = lockAt;
      return;
    }
    const isDown = top > lastTop;
    lastTop = top;
    if (started || !isDown) return;
    if (offset() <= scroller.clientHeight / 2) begin();
  };
  const onWheel = (e: WheelEvent) => {
    if (locked) e.preventDefault();
  };
  const onTouchMove = (e: TouchEvent) => {
    // Dragging an icon never scrolls; while held, nothing does.
    if (locked || grab) e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    if (locked && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) e.preventDefault();
  };

  scroller.addEventListener('scroll', onScroll, { passive: true });
  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('keydown', onKey);

  // The clock runs only while the pool is on screen.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else sleep();
  });
  io.observe(layerEl);
  const ro = new ResizeObserver(() => {
    world.width = layerEl.clientWidth;
    world.height = layerEl.clientHeight;
    wakeAll(world);
    titlePad = parseFloat(getComputedStyle(titleTextEl).paddingTop);
    followCard();
    wake();
  });
  ro.observe(layerEl);

  cleanup = () => {
    destroyed = true;
    glide?.stop();
    clearTimeout(unlockTimer);
    sleep();
    lock(false);
    io.disconnect();
    ro.disconnect();
    scroller.removeEventListener('scroll', onScroll);
    scroller.removeEventListener('wheel', onWheel);
    scroller.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('keydown', onKey);
    api = undefined;
  };
});

onUnmounted(() => cleanup?.());
</script>

<template>
  <section ref="root" class="results">
    <h2 ref="titleBar" class="results__title"><span ref="titleText">{{ TITLE }}</span></h2>

    <div class="results__pool" data-lab-part="Results">
      <div
        ref="layer"
        class="results__icons"
        data-lab-noswipe
        aria-hidden="true"
        @pointerdown="api?.down($event)"
        @pointermove="api?.move($event)"
        @pointerup="api?.up($event)"
        @pointercancel="api?.up($event)"
      >
        <span
          v-for="(icon, i) in icons"
          :key="i"
          :ref="(el) => (els[i] = el as HTMLSpanElement)"
          :class="['results__icon', { 'results__icon--light': icon.light }]"
          :style="shapeStyle(icon)"
        >
          <span class="results__shape"></span>
        </span>
      </div>
    </div>

    <div class="results__overlay" data-lab-part="Results">
      <div class="results__card">
        <!-- Keeps the sticky title's place in the card, as Figma's hidden copy does. -->
        <p ref="slot" class="results__slot" aria-hidden="true">{{ TITLE }}</p>
        <div class="results__content">
          <ul class="results__metrics">
            <li v-for="m in METRICS" :key="m.value" class="results__metric">
              <strong class="results__value">{{ m.value }}</strong>
              <span class="results__label">{{ m.label }}</span>
            </li>
          </ul>
          <div class="results__foot">
            <p class="results__note">For 5-6 Figure US/EU brands</p>
            <a href="#top" class="results__audit">
              <img :src="download" width="17" height="17" alt="" /> Get a Free Audit
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
