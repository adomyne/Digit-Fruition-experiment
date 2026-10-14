<script setup lang="ts">
// Hero rebuilt in Vue 3 + Motion for Vue (learning-order step 3). Same
// markup, CSS, assets, chart data and motion spec as the baseline (02); the
// intro is declarative (motion components with initial/animate and a delay
// each), the hover and live mode use Motion's animate(). See notes.md.
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { animate, motion, useMotionValue, type AnimationPlaybackControls } from 'motion-v';
import {
  AXIS_MAX,
  AXIS_TICKS,
  HIGHLIGHT_X,
  acos,
  metrics,
  sales,
  toPath,
  valueAt,
  type Point,
} from './chartData';
import dfLogo from './assets/df-logo.png?url';
import amazonLogo from './assets/amazon-logo.svg?url';
import globe from './assets/globe.svg?url';
import chevronDown from './assets/chevron-down.svg?url';
import download from './assets/download.svg?url';
import infoCircle from './assets/info-circle.svg?url';
import phoneCall from './assets/phone-call.svg?url';
import './Hero.css';

const NAV = ['Home', 'Services', 'About', 'Resources', 'Contact Us'];

// GSAP eases from the motion spec as cubic-beziers. power3.out, power2.inOut
// and sine.inOut match closely; back.out(n) is approximated (see notes.md).
type Bezier = [number, number, number, number];
const EASE = {
  power3Out: [0.25, 1, 0.5, 1] as Bezier,
  power2InOut: [0.65, 0, 0.35, 1] as Bezier,
  sineInOut: [0.37, 0, 0.63, 1] as Bezier,
  back2: [0.34, 1.56, 0.64, 1] as Bezier,
  back3: [0.3, 1.9, 0.55, 1] as Bezier,
};

// Reduced motion skips the intro: everything renders in its end state.
const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Hover and live mode check it at each call instead, so they jump straight to
// their end values (and follow a setting changed after load).
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Props for a motion element that rises (or drops) into place and fades in. */
const enter = (y: number, delay: number, duration: number, extra: Record<string, number> = {}, ease = EASE.power3Out) => ({
  initial: still ? false : { y, opacity: 0, ...extra },
  animate: { y: 0, opacity: 1, ...Object.fromEntries(Object.keys(extra).map((k) => [k, 1])) },
  transition: { delay, duration, ease },
});
const fade = (delay: number) => ({
  initial: still ? false : { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration: 0.4, ease: EASE.power3Out },
});
const pop = (prop: 'scale' | 'scaleY', delay: number, ease: Bezier) => ({
  initial: still ? false : { [prop]: 0 },
  animate: { [prop]: 1 },
  transition: { delay, duration: 0.5, ease },
});
const draw = (delay: number) => ({
  initial: still ? false : { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { delay, duration: 1.6, ease: EASE.power2InOut },
});

/** Axis labels and dates fade in DOM order, 0.02s apart, from 1.0s. */
const labelDelay = (i: number) => 1 + i * 0.02;
const TICK_COUNT = AXIS_TICKS.length;

const plot = ref<HTMLDivElement>();
const salesD = ref(toPath(sales));
const acosD = ref(toPath(acos));
const live = ref(false);

// Current ACOS series (for the dot's height) and the highlight position.
let acosNow: Point[] = [...acos];
let salesNow: Point[] = [...sales];
const highlightX = useMotionValue(HIGHLIGHT_X);

function placeHighlight() {
  const x = highlightX.get();
  const y = valueAt(acosNow, x);
  // The guide and dot are motion components, so they're found through the
  // plot element rather than template refs (which would give the component).
  const guide = plot.value?.querySelector<HTMLElement>('.hero__guide');
  const dot = plot.value?.querySelector<HTMLElement>('.hero__dot');
  if (guide) guide.style.left = `${x * 100}%`;
  if (dot) {
    dot.style.left = `${x * 100}%`;
    dot.style.top = `${(1 - y / AXIS_MAX) * 100}%`;
  }
}

// Hover: the guide and dot follow the pointer along the ACOS line, then
// settle back on Dec 2. A new animate() on the same value stops the last.
let follow: AnimationPlaybackControls | undefined;
const followTo = (x: number, duration: number) => {
  follow = animate(highlightX, x, { duration: reduced() ? 0 : duration, ease: EASE.power3Out });
};
const onMove = (e: PointerEvent) => {
  const r = plot.value!.getBoundingClientRect();
  followTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), 0.35);
};
const onLeave = () => followTo(HIGHLIGHT_X, 0.6);
const unsubscribe = highlightX.on('change', placeHighlight);

onMounted(placeHighlight);

// Live mode: every tick the lines drift toward a new noisy version of the
// traced data. The interval and animation die on toggle-off and on unmount.
let liveTimer: number | undefined;
let liveAnim: AnimationPlaybackControls | undefined;
const stopLive = () => {
  window.clearInterval(liveTimer);
  liveAnim?.stop();
};
const jitter = (base: Point[], amount: number): Point[] =>
  base.map(([x, y]) => [x, Math.max(0, y + (Math.random() * 2 - 1) * amount)]);

watch(live, (on) => {
  stopLive();
  if (!on) return;
  const tick = () => {
    const from = { sales: salesNow, acos: acosNow };
    const to = { sales: jitter(sales, 2.5), acos: jitter(acos, 1.5) };
    const lerp = (a: Point[], b: Point[], t: number) => a.map(([x, y], i): Point => [x, y + (b[i][1] - y) * t]);
    liveAnim = animate(0, 1, {
      duration: reduced() ? 0 : 1.1,
      ease: EASE.sineInOut,
      onUpdate: (t) => {
        salesNow = lerp(from.sales, to.sales, t);
        acosNow = lerp(from.acos, to.acos, t);
        salesD.value = toPath(salesNow);
        acosD.value = toPath(acosNow);
        placeHighlight();
      },
    });
  };
  tick();
  liveTimer = window.setInterval(tick, 1400);
});

onUnmounted(() => {
  stopLive();
  follow?.stop();
  unsubscribe();
});
</script>

<template>
  <div class="hero" data-sandbox="04-hero-vue-motion">
    <header class="hero__header">
      <div class="hero__brand">
        <motion.a class="hero__logo" href="#top" aria-label="Digit Fruition home" v-bind="enter(-16, 0, 0.6)">
          <img :src="dfLogo" width="108" height="37" alt="Digit Fruition" />
        </motion.a>
        <motion.nav class="hero__nav" aria-label="Main" v-bind="enter(-16, 0.08, 0.6)">
          <a
            v-for="(item, i) in NAV"
            :key="item"
            href="#top"
            class="hero__nav-item"
            :aria-current="i === 0 ? 'page' : undefined"
          >{{ item }}</a>
        </motion.nav>
      </div>
      <div class="hero__tools">
        <motion.button type="button" class="hero__lang" v-bind="enter(-16, 0.16, 0.6)">
          <img :src="globe" width="17" height="17" alt="" /> EN <img :src="chevronDown" width="14" height="14" alt="" />
        </motion.button>
        <motion.a href="#top" class="hero__audit" v-bind="enter(-16, 0.24, 0.6)">
          <img :src="download" width="17" height="17" alt="" /> Get a Free Audit
        </motion.a>
      </div>
    </header>

    <section class="hero__main">
      <h1 class="hero__title">
        <motion.img
          class="hero__amazon"
          :src="amazonLogo"
          width="246.19"
          height="83.28"
          alt="amazon"
          v-bind="enter(28, 0.15, 0.8)"
        />
        <span class="hero__title-words">
          <motion.span class="hero__title-word" v-bind="enter(28, 0.3, 0.8)">PPC</motion.span>
          <motion.span class="hero__title-word" v-bind="enter(28, 0.38, 0.8)">Agency</motion.span>
        </span>
      </h1>

      <motion.p class="hero__sub" v-bind="enter(16, 0.6, 0.7)">
        We help Amazon brands scale to $1M in monthly revenue with a custom ad strategy at a sustainable TACOS.
      </motion.p>

      <motion.a href="#top" class="hero__cta" v-bind="enter(12, 0.75, 0.6, { scale: 0.96 }, EASE.back2)">
        <!-- Figma clips the 33.6px glyph to a 28px box, offset by -2.8px. -->
        <span class="hero__phone"><img :src="phoneCall" width="33.6" height="33.6" alt="" /></span>
        Book a Discovery Call
      </motion.a>

      <div class="hero__chart">
        <div class="hero__metrics">
          <motion.div
            v-for="(m, i) in metrics"
            :key="m.label"
            :class="['hero__metric', m.bar && `hero__metric--${m.bar}`]"
            v-bind="enter(16, 0.9 + i * 0.06, 0.5)"
          >
            <span class="hero__metric-label">
              {{ m.label }} <img :src="chevronDown" width="14" height="14" alt="" />
              <img :src="infoCircle" width="18" height="18" alt="" />
            </span>
            <strong class="hero__metric-value">{{ m.value }}</strong>
          </motion.div>
        </div>

        <div class="hero__graph">
          <div class="hero__axis-col" aria-hidden="true">
            <div class="hero__axis hero__axis--left">
              <motion.span v-for="(t, i) in AXIS_TICKS" :key="t" :style="{ '--t': t }" v-bind="fade(labelDelay(i))">
                €{{ t ? `${t}K` : 0 }}
              </motion.span>
            </div>
          </div>
          <div ref="plot" class="hero__plot" @pointermove="onMove" @pointerleave="onLeave">
            <motion.div
              class="hero__guide"
              aria-hidden="true"
              :style="{ transformOrigin: 'bottom' }"
              v-bind="pop('scaleY', 2.3, EASE.power3Out)"
            />
            <div class="hero__plot-area">
              <div class="hero__grid" aria-hidden="true">
                <i v-for="t in AXIS_TICKS" :key="t" :style="{ '--t': t }" />
              </div>
              <svg
                class="hero__lines"
                viewBox="0 0 1000 250"
                preserveAspectRatio="none"
                role="img"
                aria-label="Sales and ACOS from Oct 15 to Dec 29"
              >
                <motion.path class="hero__line--sales" :d="salesD" vector-effect="non-scaling-stroke" v-bind="draw(1.05)" />
                <motion.path class="hero__line--acos" :d="acosD" vector-effect="non-scaling-stroke" v-bind="draw(1.2)" />
              </svg>
              <motion.div class="hero__dot" aria-hidden="true" v-bind="pop('scale', 2.5, EASE.back3)" />
            </div>
          </div>
          <div class="hero__axis-col" aria-hidden="true">
            <div class="hero__axis hero__axis--right">
              <motion.span
                v-for="(t, i) in AXIS_TICKS"
                :key="t"
                :style="{ '--t': t }"
                v-bind="fade(labelDelay(TICK_COUNT + i))"
              >{{ t }}%</motion.span>
            </div>
          </div>
        </div>

        <div class="hero__dates" aria-hidden="true">
          <motion.span v-bind="fade(labelDelay(2 * TICK_COUNT))">Oct 15</motion.span>
          <motion.span :style="{ '--at': HIGHLIGHT_X }" v-bind="fade(labelDelay(2 * TICK_COUNT + 1))">Dec 2</motion.span>
          <motion.span v-bind="fade(labelDelay(2 * TICK_COUNT + 2))">Dec 29</motion.span>
        </div>
      </div>

      <motion.button
        type="button"
        class="hero__live"
        :aria-pressed="live"
        v-bind="enter(12, 2.2, 0.6)"
        @click="live = !live"
      >
        {{ live ? 'Stop live mode' : 'Live mode' }}
      </motion.button>

      <motion.p class="hero__foot" v-bind="enter(12, 2.3, 0.6)">
        Unlike the big guys, we only work with a select few brands, giving you the VIP treatment with laser-focused
        attention to detail.
      </motion.p>
    </section>
  </div>
</template>
