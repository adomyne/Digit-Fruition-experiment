<script setup lang="ts">
// Ads section in Vue 3 + Motion for Vue: "We Handle All Amazon Ads
// Campaigns", five services on a wheel that turns counter-clockwise, one
// step at a time. Figma: Services Section 142:1216, keywords 301:15, arrows
// 301:24. Scrolling down turns the wheel until the fifth step, then the
// page scrolls on; after that first pass the wheel never holds the scroll
// again until a reload. Autoplay as in the Process section (2 s on each
// step, 1 s to turn) until the disc, an arrow or a keyword is clicked. The
// disc's glow moves to a random spot on every turn. Motion's animate()
// tweens plain numbers (the wheel's angle, the glow); the template derives
// every transform and opacity from them. See notes.md.
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { animate, type AnimationPlaybackControls } from 'motion-v';
import line from './assets/ads/line.svg?url';
import ring from './assets/ads/number-ring.svg?url';
import arrowPrev from './assets/ads/arrow-prev.svg?url';
import arrowNext from './assets/ads/arrow-next.svg?url';
import { ADS_STEPS } from './adsCopy';
import './Ads.css';

/** Autoplay holds each step this long (ms), as in the Process section. */
const HOLD = 2000;
/** One turn of the wheel (s). */
const TRAVEL = 1;
/** Each extra step on a keyword jump adds this much (s). */
const EXTRA_STEP = 0.4;
const COUNT = ADS_STEPS.length;
const LAST = COUNT - 1;
/** Degrees between spokes: five steps make a full turn. */
const SPOKE = 360 / COUNT;
/** Scroll (px) that turns the wheel one step: about one mouse-wheel notch. */
const STEP_DISTANCE = 60;
/** Input is ignored for this much of a turn, so one flick moves one step. */
const SETTLE = 0.6;
/** The glow's random range, in the disc's own units (Figma's scale kept). */
const GLOW = { x: [260, 810], y: [330, 620], r: [-170, -10] } as const;
/** In-out quad (GSAP's power1.inOut) as a cubic-bezier. */
const QUAD_IN_OUT = [0.455, 0.03, 0.515, 0.955] as const;

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const random = (range: readonly number[]) => range[0] + Math.random() * (range[1] - range[0]);

const root = ref<HTMLElement>();
const live = ref<HTMLParagraphElement>();
const step = ref(0);
/** The wheel's angle (deg) and the reduced-motion fade, tweened by Motion. */
const angle = ref(0);
const wheelOpacity = ref(1);
const glow = reactive({ x: 707.784, y: 486.915, r: -124.882 });

const wheelStyle = computed(() => ({ transform: `rotate(${angle.value}deg)`, opacity: wheelOpacity.value }));
// Each spoke is brightest at the top and fades out by the next spoke's place.
const spokeOpacity = (i: number) => {
  const d = ((((i * SPOKE + angle.value) % 360) + 540) % 360) - 180;
  return Math.max(0, Math.cos((d * Math.PI) / (2 * SPOKE)));
};
const glowAt = computed(() => `translate(${glow.x} ${glow.y}) rotate(${glow.r}) scale(642.972 726.586)`);

let target = 0;
let turns: AnimationPlaybackControls[] = [];
let turnStart = 0;
let turnTime = TRAVEL;
let next: number | undefined;
let visible = false;
let autoplay = true;
/** Bumped on every turn, so callbacks of a superseded turn do nothing. */
let run = 0;
// Scroll hold: `held` while the wheel takes the scroll; `done` once the
// reader has scrolled past the fifth step (until a reload).
let held = false;
let done = false;
let heldAt = 0;
let pending = 0;
let lastOffset = Infinity;
let touchY = 0;
let scroller: HTMLElement | undefined;
let io: IntersectionObserver | undefined;

const scheduleNext = () => {
  window.clearTimeout(next);
  // While the wheel holds the scroll, autoplay stops at the last step so
  // the next scroll carries on down the page.
  if (!autoplay || !visible || (held && step.value === LAST)) return;
  next = window.setTimeout(() => turnBy(1), HOLD);
};
const stopAutoplay = () => {
  autoplay = false;
  window.clearTimeout(next);
};

/** Turns the wheel `by` steps: positive is counter-clockwise, to the next service. */
function turnBy(by: number, announce = false) {
  window.clearTimeout(next);
  if (!by) return;
  const id = ++run;
  step.value = (((step.value + by) % COUNT) + COUNT) % COUNT;
  target -= by * SPOKE;
  if (announce && live.value) live.value.textContent = `${step.value + 1} of ${COUNT}: ${ADS_STEPS[step.value].title}`;
  turnStart = performance.now();
  turnTime = TRAVEL + (Math.abs(by) - 1) * EXTRA_STEP;
  // A new turn stops the last one and starts from wherever the wheel is.
  turns.forEach((t) => t.stop());

  if (still()) {
    // Reduced motion: a quick cross-fade instead of the turn; the glow stays.
    turns = [
      animate(wheelOpacity.value, 0, { duration: 0.15, onUpdate: (v: number) => (wheelOpacity.value = v) }),
    ];
    turns[0].then(() => {
      if (id !== run) return;
      angle.value = target;
      turns = [animate(0, 1, { duration: 0.2, onUpdate: (v: number) => (wheelOpacity.value = v) })];
      scheduleNext();
    });
    return;
  }
  const options = { duration: turnTime, ease: QUAD_IN_OUT };
  turns = [
    animate(angle.value, target, { ...options, onUpdate: (v: number) => (angle.value = v) }),
    // The glow drifts to a new random spot over the same turn.
    animate(glow.x, random(GLOW.x), { ...options, onUpdate: (v: number) => (glow.x = v) }),
    animate(glow.y, random(GLOW.y), { ...options, onUpdate: (v: number) => (glow.y = v) }),
    animate(glow.r, random(GLOW.r), { ...options, onUpdate: (v: number) => (glow.r = v) }),
  ];
  turns[0].then(() => {
    if (id === run) scheduleNext();
  });
}
/** The shorter way round to step `n`. */
const turnTo = (n: number) => {
  let by = (((n - step.value) % COUNT) + COUNT) % COUNT;
  if (by > COUNT / 2) by -= COUNT;
  turnBy(by, true);
};

const onDisc = () => stopAutoplay();
const onPrev = () => {
  stopAutoplay();
  turnBy(-1, true);
};
const onNext = () => {
  stopAutoplay();
  turnBy(1, true);
};
const onKeyword = (i: number) => {
  stopAutoplay();
  turnTo(i);
};

// ---------- Scroll hold ----------
/** Distance (px) from the section to its resting place: centred in the
 *  viewport, or at the top if it is taller. */
const offset = () => {
  const el = root.value!;
  const s = scroller!;
  const gap = Math.max(0, (s.clientHeight - el.offsetHeight) / 2);
  return el.getBoundingClientRect().top - s.getBoundingClientRect().top - gap;
};
const hold = (o: number) => {
  held = true;
  pending = 0;
  scroller!.scrollTop += o;
  heldAt = scroller!.scrollTop;
  lastOffset = 0;
  scheduleNext();
};
const release = (finished: boolean) => {
  held = false;
  done = finished;
  pending = 0;
  scheduleNext();
};
/** Scroll input while held: `dy` > 0 is down. */
const input = (dy: number) => {
  if (performance.now() - turnStart < turnTime * 1000 * SETTLE) return;
  if (Math.sign(dy) !== Math.sign(pending)) pending = 0;
  pending += dy;
  if (Math.abs(pending) < STEP_DISTANCE) return;
  const dir = pending > 0 ? 1 : -1;
  pending = 0;
  if (dir > 0 && step.value === LAST) release(true);
  else if (dir < 0 && step.value === 0) release(false);
  else turnBy(dir, true);
};

const onWheel = (e: WheelEvent) => {
  if (done || e.ctrlKey) return;
  const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller!.clientHeight : 1);
  if (!held) {
    // Coming down: stop the scroll on the section's resting place.
    const o = offset();
    if (dy <= 0 || o < -1 || o - dy > 0) return;
    e.preventDefault();
    hold(o);
    return;
  }
  e.preventDefault();
  input(dy);
};
// Keys, scrollbar drags and touch momentum move the scroll without wheel
// events: crossing the resting place downwards holds there; while held,
// small moves snap back and a big jump lets go.
const onScroll = () => {
  if (done) return;
  const s = scroller!;
  if (held) {
    const moved = s.scrollTop - heldAt;
    if (Math.abs(moved) > s.clientHeight / 3) release(moved > 0);
    else if (moved) s.scrollTop = heldAt;
    return;
  }
  const o = offset();
  if (lastOffset > 0 && o <= 0 && o > -s.clientHeight / 3) hold(o);
  else lastOffset = o;
};
const onTouchStart = (e: TouchEvent) => {
  touchY = e.touches[0].clientY;
};
const onTouchMove = (e: TouchEvent) => {
  if (!held || done) return;
  const y = e.touches[0].clientY;
  e.preventDefault();
  input(touchY - y);
  touchY = y;
};
const isTyping = (t: Element | null) =>
  !!t && (t.matches('input, textarea, select, [contenteditable]') || t.closest('[contenteditable]') !== null);
const onKey = (e: KeyboardEvent) => {
  if (!held || done || e.altKey || e.ctrlKey || e.metaKey || isTyping(document.activeElement)) return;
  // Space on a focused button presses it.
  if (e.key === ' ' && document.activeElement?.matches('button')) return;
  const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !(e.key === ' ' && e.shiftKey);
  const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
  if (!down && !up) return;
  e.preventDefault();
  pending = 0;
  input(down ? STEP_DISTANCE : -STEP_DISTANCE);
};

onMounted(() => {
  scroller = root.value!.closest<HTMLElement>('[data-sandbox]')!;
  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('scroll', onScroll, { passive: true });
  scroller.addEventListener('touchstart', onTouchStart, { passive: true });
  scroller.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('keydown', onKey);
  lastOffset = offset();
  // Autoplay runs while the section is on screen, as the Process section's does.
  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) scheduleNext();
      else window.clearTimeout(next);
    },
    { threshold: 0.4 },
  );
  io.observe(root.value!);
});

onUnmounted(() => {
  run++;
  io?.disconnect();
  window.clearTimeout(next);
  turns.forEach((t) => t.stop());
  scroller?.removeEventListener('wheel', onWheel);
  scroller?.removeEventListener('scroll', onScroll);
  scroller?.removeEventListener('touchstart', onTouchStart);
  scroller?.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <section ref="root" class="ads" data-lab-part="Ads">
    <div class="ads__frame">
      <header class="ads__heading">
        <h2 class="ads__title">We Handle All Amazon Ads Campaigns</h2>
        <p class="ads__subtitle">A Clear Plan of Action - Not Just Insights</p>
      </header>

      <!-- The disc (Figma Ellipse 9), inline so its glow can move. -->
      <svg class="ads__arc" viewBox="0 0 1069.72 1069.72" aria-hidden="true">
        <defs>
          <radialGradient id="ads-glow-04" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" :gradientTransform="glowAt">
            <stop class="ads__glow-from" />
            <stop class="ads__glow-to" offset="1" />
          </radialGradient>
        </defs>
        <circle class="ads__disc" cx="534.862" cy="534.862" r="534.362" fill="url(#ads-glow-04)" @click="onDisc" />
      </svg>

      <ol class="ads__wheel" aria-label="Amazon Ads campaigns" :style="wheelStyle">
        <li
          v-for="(s, i) in ADS_STEPS"
          :key="s.title"
          class="ads__step"
          :style="{ '--i': i, opacity: spokeOpacity(i) }"
          :aria-current="i === step ? 'step' : undefined"
        >
          <img class="ads__ring" :src="ring" width="83.496" height="83.496" alt="" />
          <p class="ads__number" aria-hidden="true">{{ i + 1 }}</p>
          <img class="ads__line" :src="line" width="49.333" height="1" alt="" />
          <div class="ads__service">
            <h3 class="ads__service-title">{{ s.title }}</h3>
            <p class="ads__service-body">{{ s.body }}</p>
          </div>
        </li>
      </ol>

      <ul class="ads__keywords" aria-label="Go to a campaign">
        <li v-for="(s, i) in ADS_STEPS" :key="s.title">
          <button
            type="button"
            class="ads__keyword"
            :data-text="s.title"
            :aria-current="i === step ? 'true' : undefined"
            @click="onKeyword(i)"
          >
            {{ s.title }}
          </button>
        </li>
      </ul>

      <div class="ads__arrows">
        <button type="button" class="ads__arrow ads__arrow--prev" aria-label="Previous campaign" @click="onPrev">
          <img :src="arrowPrev" width="32" height="32" alt="" />
        </button>
        <button type="button" class="ads__arrow ads__arrow--next" aria-label="Next campaign" @click="onNext">
          <img :src="arrowNext" width="32" height="32" alt="" />
        </button>
      </div>

      <p ref="live" class="ads__live" aria-live="polite"></p>
    </div>
  </section>
</template>
