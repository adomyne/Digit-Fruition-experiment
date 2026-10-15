<script setup lang="ts">
// Process section (docs/briefs/process/brief.md) in Vue 3 + Motion for Vue:
// a four-step stepper that grows a mango tree from a seed. Same art,
// timings and numbers as 02. Motion has no seekable timeline for SVG
// attributes, so the whole scene is a pure function of one "story time"
// motion value (0 = thumbnail, 1.6 s per step); a step change animates that
// value, which gives reverse, skip and interrupt like 02's GSAP playhead.
// See notes.md.
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { animate, useMotionValue, type AnimationPlaybackControls } from 'motion-v';
import {
  ARROW,
  CAMERA,
  cameraAt,
  GROUND_Y,
  LEAF_LEFT,
  LEAF_RIGHT,
  MANGO,
  MANGOES,
  MORPH,
  morphPolygons,
  PIVOT,
  ROOTS,
  ROOTS_TO,
  SEED,
  SPROUT,
  SPROUTING,
  SPROUTING_SCALE,
  TREE,
  TREE_TIP,
  TRUNK_X,
  VIEW,
} from './processArt';
import './Process.css';

const STEPS = [
  {
    n: 1,
    label: 'Step 1: a mango seed',
    title: 'Lorem ipsum dolor',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    n: 2,
    label: 'Step 2: the seed grows roots and a sprout',
    title: 'Sit amet consectetur',
    body: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute.',
  },
  {
    n: 3,
    label: 'Step 3: the sprout grows into a tree',
    title: 'Adipiscing elit sed',
    body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint.',
  },
  {
    n: 4,
    label: 'Step 4: mangoes grow on the tree',
    title: 'Eiusmod tempor',
    body: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum sed ut.',
  },
];
const THUMB_LABEL = 'A mango seed, an arrow, and a mango: the seed becomes the fruit';

/** Seconds per step change; skipping runs the steps in between at double speed. */
const STEP_TIME = 1.6;
/** The tree's scale before step 3. */
const TREE_START = 0.4;
const AUTOPLAY_EVERY = 5;
/** Figma x offsets of the four circles on the 494px timeline (rem). */
const CIRCLE_X = [0, 9.3838, 18.7194, 27.8606];

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// GSAP's eases, written out so the motion matches 02 exactly (Motion takes
// any (p) => number as an ease). powerN is a polynomial of degree N + 1.
type Ease = (p: number) => number;
const power1In: Ease = (p) => p * p;
const power1Out: Ease = (p) => 1 - (1 - p) ** 2;
const power1InOut: Ease = (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2);
const power2In: Ease = (p) => p ** 3;
const power2Out: Ease = (p) => 1 - (1 - p) ** 3;
const power2InOut: Ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - 4 * (1 - p) ** 3);
const backOut = (s: number): Ease => (p) => (p - 1) ** 2 * ((s + 1) * (p - 1) + s) + 1;
const sineInOut: Ease = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
const sineOut: Ease = (p) => Math.sin((Math.PI * p) / 2);
const none: Ease = (p) => p;

// World placement of the seed, roots and sprout (reference coordinates)
// next to the tree: the emerge point lands on the trunk base.
const [EX, EY] = SPROUTING.emerge;
const SPROUTING_AT = `translate(${TRUNK_X - EX * SPROUTING_SCALE} ${GROUND_Y - EY * SPROUTING_SCALE}) scale(${SPROUTING_SCALE})`;
// The sprout lives in the tree's group (scale 0.4 until step 3), so it is
// scaled up to look the same size as in the sprouting reference.
const SPROUT_AT = `translate(${TRUNK_X} ${GROUND_Y}) scale(${SPROUTING_SCALE / TREE_START}) translate(${-PIVOT.sprout[0]} ${-EY})`;
const TRUNK_BASE = [TRUNK_X, GROUND_Y] as const;

/** `m` (scale, rotate) applied around point `p`, in the element's own units. */
const about = (p: readonly number[], m: string) => `translate(${p[0]} ${p[1]}) ${m} translate(${-p[0]} ${-p[1]})`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Eased progress of a part of the story that starts at `start` and lasts `dur`. */
const seg = (t: number, start: number, dur: number, ease: Ease) => ease(clamp01((t - start) / dur));

/*
 * Step 4 -> 1 morph. Motion has no path morph, so the two outlines (in
 * screen units) are sampled once on mount into polygons with matched points
 * (morphPolygons in processArt) and the morph draws the points in between.
 * The exact outlines are used at both ends.
 */
let morphPts: { from: [number, number][]; to: [number, number][] } | undefined;
/** The morphing outline at progress q: the exact paths at the ends. */
const morphShape = (q: number) => {
  if (q <= 0 || !morphPts) return MORPH.from;
  if (q >= 1) return MORPH.to;
  const { from, to } = morphPts;
  const pts = from.map(([x, y], i) => `${(x + (to[i][0] - x) * q).toFixed(2)} ${(y + (to[i][1] - y) * q).toFixed(2)}`);
  return `M${pts.join('L')}Z`;
};

/**
 * The scene at story time t: every transform, clip and visibility. Label
 * sN (the finished scene of step N) is at t = N x STEP_TIME; after s4 comes
 * the step 4 -> 1 loop, ending at 6 x STEP_TIME on step 1's frame. Nothing
 * fades in the growth: every part is hidden at scale 0 or behind a clip
 * until it grows.
 */
function sceneAt(t: number) {
  const T = STEP_TIME;

  // Camera: seed (step 1) to sprout (step 2) to the Figma tree framing (3, 4),
  // then (step 4 -> 1) close on the centre mango.
  const [a, b, p] =
    t < 2 * T
      ? [CAMERA[1], CAMERA[2], seg(t, T, T, power2InOut)]
      : t < 4 * T
        ? [CAMERA[2], CAMERA[3], seg(t, 2 * T, T, power2InOut)]
        : [CAMERA[3], CAMERA.loop, seg(t, 4 * T, T, power2InOut)];
  const cam = { cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), z: lerp(a.z, b.z, p), r: lerp(a.r, b.r, p) };

  // Step 3: the roots outgrow the seed, then spread into the tree's base.
  const rootsUp = seg(t, 2 * T, 0.45 * T, power2InOut);
  const rootsSpread = seg(t, 2.45 * T, 0.45 * T, power2InOut);
  const rootsScale = lerp(1, ROOTS_TO.outgrow, rootsUp);

  // The trunk grows up behind a clip edge and the sprout rides that edge,
  // so the sprout is the growing tip of the tree; near the top it folds
  // into the top leaf as that appears.
  const grow = seg(t, 2.4 * T, 0.6 * T, power1InOut);
  const front = 575 - grow * 590;
  const rideY = Math.min(0, Math.max(front + 40, TREE_TIP) - GROUND_Y);
  const rideScale = clamp01((1 - grow) / 0.18);

  return {
    // Thumbnail to step 1: the arrow pulls back into the seed, the mango
    // shrinks toward it, and the seed slides to the centre.
    thumbShown: t < T,
    thumbMango: about([441, 160], `scale(${1 - seg(t, 0, 0.45 * T, power2In)})`),
    thumbArrow: about([349, 160], `scale(${1 - seg(t, 0.2 * T, 0.4 * T, power2In)} 1)`),
    thumbSeed: `translate(${146 * seg(t, 0.25 * T, 0.75 * T, power2InOut)} 0)`,
    camera: cameraAt(cam),
    // Step 2: the ground draws out, roots grow down, the sprout up.
    ground: about(TRUNK_BASE, `scale(${seg(t, 1.1 * T, 0.6 * T, power2Out)} 1)`),
    rootsClip: 160 * seg(t, 1.35 * T, 0.65 * T, power1Out),
    sprout: about(PIVOT.sprout, `scale(${seg(t, 1.4 * T, 0.6 * T, backOut(1.4))})`),
    // Step 3.
    seed: about(ROOTS_TO.seedTip, `scale(${1 - seg(t, 2 * T, 0.5 * T, power1In)})`),
    roots:
      `translate(${ROOTS_TO.x * rootsUp} ${ROOTS_TO.y * rootsUp}) ` +
      about(PIVOT.roots, `scale(${lerp(rootsScale, ROOTS_TO.sx, rootsSpread)} ${lerp(rootsScale, ROOTS_TO.sy, rootsSpread)})`),
    tree: about(TRUNK_BASE, `scale(${lerp(TREE_START, 1, seg(t, 2.3 * T, 0.7 * T, power2Out))})`),
    treeClipY: front,
    treeClipH: 575 - front,
    ride: `translate(0 ${rideY}) ` + about(TRUNK_BASE, `scale(${rideScale})`),
    leaves: [PIVOT.leafLeft, PIVOT.leafRight].map((pivot, i) =>
      about(pivot, `scale(${seg(t, (2.65 + i * 0.05) * T, 0.3 * T, backOut(2))})`),
    ),
    // Step 4: the mangoes grow from their stems, one after another.
    mangoes: MANGOES.map((_, i) => {
      const g = seg(t, (3 + i * 0.22) * T, 0.55 * T, backOut(1.7));
      return about(PIVOT.mangoStem, `rotate(${-12 * (1 - g)}) scale(${g})`);
    }),
    // Step 4 -> 1: the camera closes in on the centre mango while the rest
    // fades; then its outline morphs into the seed's, the highlight fades
    // out and the seed's grooves fade in.
    fade: 1 - seg(t, 4.2 * T, 0.6 * T, power1InOut),
    morphing: t >= 5 * T,
    morph: morphShape(seg(t, 5 * T, T, power2InOut)),
    highlight: 1 - seg(t, 5 * T, 0.3 * T, none),
    grooves: seg(t, 5.65 * T, 0.35 * T, none),
  };
}

// Idle sway once a step has finished: small, slow, out of sync. Each sways
// a wrapper group the story never touches. Indexes into `angle`.
const SWAY = {
  seed: [{ k: 0, pivot: PIVOT.seedCentre }],
  sprout: [{ k: 1, pivot: PIVOT.sprout }],
  leaf: [
    { k: 2, pivot: PIVOT.leafLeft },
    { k: 3, pivot: PIVOT.leafRight },
  ],
  mango: [4, 5, 6].map((k) => ({ k, pivot: PIVOT.mangoStem })),
};
const angle = reactive([0, 0, 0, 0, 0, 0, 0]);
const swayAt = (k: number, pivot: readonly number[]) => `rotate(${angle[k]} ${pivot[0]} ${pivot[1]})`;

const root = ref<HTMLElement>();
const scene = ref<SVGSVGElement>();
const copy = ref<HTMLDivElement>();
const fill = ref<HTMLSpanElement>();
const live = ref<HTMLParagraphElement>();
// 0 = the thumbnail (opening state only), 1-4 = steps.
const step = ref(0);
const shown = ref(1);
const text = computed(() => STEPS[shown.value - 1]);

// Story time, as a motion value mirrored into a ref the template reads.
const story = useMotionValue(0);
const time = ref(0);
const pose = computed(() => sceneAt(time.value));
const stopStory = story.on('change', (v) => (time.value = v));

let target = 0;
let autoplay = true;
let visible = false;
/** Bumped on every step change, so callbacks of a superseded change do nothing. */
let run = 0;
let next: number | undefined;
/** The running animation of each sway angle; a new one stops the last. */
const swaying: (AnimationPlaybackControls | undefined)[] = [];
let others: AnimationPlaybackControls[] = [];
let io: IntersectionObserver | undefined;

const animateAngle = (k: number, from: number, to: number, options: Parameters<typeof animate>[2]) => {
  swaying[k]?.stop();
  angle[k] = from;
  swaying[k] = animate(from, to, { ...options, onUpdate: (v: number) => (angle[k] = v) });
};
// Each part eases out from where it is (no jump when a step lands), then
// sways back and forth.
const sway = (parts: { k: number }[], deg: number, dur: number) =>
  parts.forEach(({ k }, i) => {
    const d = dur + i * 0.45;
    animateAngle(k, angle[k], -deg, { duration: d / 2, delay: i * 0.3, ease: sineOut });
    const first = swaying[k];
    first?.then(() => {
      if (swaying[k] === first) animateAngle(k, -deg, deg, { duration: d, ease: sineInOut, repeat: Infinity, repeatType: 'mirror' });
    });
  });
// Every angle eases back to 0; a sway started after this takes over its part.
const stopIdle = () => angle.forEach((v, k) => animateAngle(k, v, 0, { duration: 0.3, ease: power1Out }));
const startIdle = () => {
  stopIdle();
  if (still() || !visible || target === 0) return;
  if (target === 1) sway(SWAY.seed, 2, 3.2);
  if (target === 2) sway(SWAY.sprout, 3, 2.8);
  if (target >= 3) sway(SWAY.leaf, 4, 3);
  if (target === 4) sway(SWAY.mango, 5, 2.6);
};

const scheduleNext = () => {
  window.clearTimeout(next);
  if (autoplay && visible) next = window.setTimeout(() => goTo(target === 4 ? 1 : target + 1), AUTOPLAY_EVERY * 1000);
};

// Bar fill: one animation per change, from wherever it is.
const fillTo = (n: number, duration: number) =>
  animate(fill.value!, { scaleX: (Math.max(n, 1) - 1) / 3 }, { duration, ease: power2InOut });

function goTo(n: number) {
  const from = story.get();
  // From step 4 (or mid-loop), step 1 is reached forwards through the
  // mango -> seed loop; everything else plays along the story.
  const wrap = n === 1 && from >= 4 * STEP_TIME;
  const label = n * STEP_TIME;
  const to = wrap ? 6 * STEP_TIME : label;
  const id = ++run;
  target = n;
  step.value = n;
  stopIdle();
  scheduleNext();
  if (live.value) live.value.textContent = STEPS[n - 1].label;

  if (still()) {
    // Reduced motion: a quick cross-fade between finished scenes.
    story.stop();
    fillTo(n, 0);
    const parts = [scene.value!, copy.value!];
    animate(parts, { opacity: 0 }, { duration: 0.15 }).then(() => {
      if (id !== run) return;
      story.jump(label);
      shown.value = n;
      animate(parts, { opacity: 1 }, { duration: 0.2 });
    });
    return;
  }

  const steps = wrap ? 1 : Math.max(1, Math.round(Math.abs(to - from) / STEP_TIME));
  const duration = wrap ? to - from : Math.abs(to - from) / (steps > 1 ? 2 : 1);
  // Body text: out, swap, in, inside the first half of the change.
  others = [
    fillTo(n, Math.max(duration, 0.3)),
    animate(copy.value!, { opacity: 0, y: -8 }, { duration: 0.25, ease: power1Out }),
  ];
  others[1].then(() => {
    if (id !== run) return;
    shown.value = n;
    others.push(animate(copy.value!, { opacity: 1, y: [8, 0] }, { duration: 0.35, ease: power2Out }));
  });
  // A new animation on the story value stops the one still running.
  animate(story, to, {
    duration,
    ease: steps > 1 || wrap ? none : power1InOut,
    onComplete: () => {
      if (id !== run) return;
      if (wrap) story.jump(label);
      startIdle();
    },
  });
}

const pick = (n: number) => {
  autoplay = false;
  window.clearTimeout(next);
  if (n !== step.value) goTo(n);
};
const onKey = (e: KeyboardEvent) => {
  const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  const n = Math.min(4, Math.max(1, (step.value || 1) + dir));
  pick(n);
  root.value?.querySelectorAll<HTMLButtonElement>('.process__step')[n - 1]?.focus();
};

onMounted(() => {
  morphPts = morphPolygons(scene.value!);
  // Autoplay starts when the section scrolls into view and pauses (with the
  // idle motion) while it is off screen.
  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        window.clearTimeout(next);
        stopIdle();
        return;
      }
      if (target === 0 && autoplay) goTo(1);
      else {
        scheduleNext();
        if (!story.isAnimating()) startIdle();
      }
    },
    { threshold: 0.4 },
  );
  io.observe(root.value!);
});

onUnmounted(() => {
  io?.disconnect();
  window.clearTimeout(next);
  run++;
  story.stop();
  stopStory();
  [...swaying, ...others].forEach((a) => a?.stop());
});
</script>

<template>
  <section ref="root" class="process" data-lab-part="Process">
    <div class="process__card">
      <h2 class="process__title">The Process</h2>
      <div class="process__steps">
        <div class="process__illustration">
          <button
            type="button"
            class="process__picture"
            :aria-label="`${step === 0 ? THUMB_LABEL : STEPS[step - 1].label}. Show the next step.`"
            @click="pick(step >= 4 ? 1 : step + 1)"
          >
            <svg ref="scene" class="process__scene" :viewBox="`0 0 ${VIEW.w} ${VIEW.h}`" aria-hidden="true">
              <defs>
                <clipPath id="process04-roots-clip" clipPathUnits="userSpaceOnUse">
                  <rect x="-10" y="-10" width="200" :height="pose.rootsClip" />
                </clipPath>
                <clipPath id="process04-tree-clip" clipPathUnits="userSpaceOnUse">
                  <rect x="-20" :y="pose.treeClipY" width="530" :height="pose.treeClipH" />
                </clipPath>
              </defs>

              <!-- Thumbnail: seed, arrow, mango (screen units). -->
              <g :visibility="pose.thumbShown ? 'visible' : 'hidden'">
                <g :transform="pose.thumbSeed">
                  <g transform="translate(81 45) scale(0.9625)">
                    <path :d="SEED" />
                  </g>
                </g>
                <g :transform="pose.thumbArrow">
                  <g transform="translate(349 132) scale(3.3)">
                    <path :d="ARROW" />
                  </g>
                </g>
                <g :transform="pose.thumbMango">
                  <g transform="translate(441 50) scale(0.767)">
                    <path :d="MANGO" />
                  </g>
                </g>
              </g>

              <!-- The world, in tree units, seen through the camera. -->
              <g :visibility="pose.thumbShown ? 'hidden' : 'visible'">
                <g :transform="pose.camera">
                  <line
                    class="process__ground"
                    :opacity="pose.fade"
                    :transform="pose.ground"
                    :x1="TRUNK_X - 1400"
                    :x2="TRUNK_X + 1400"
                    :y1="GROUND_Y"
                    :y2="GROUND_Y"
                    vector-effect="non-scaling-stroke"
                  />
                  <g :transform="SPROUTING_AT" :opacity="pose.fade">
                    <g :transform="`translate(${SPROUTING.seed[0]} ${SPROUTING.seed[1]})`">
                      <g :transform="swayAt(0, PIVOT.seedCentre)">
                        <g :transform="pose.seed">
                          <path :d="SEED" />
                        </g>
                      </g>
                    </g>
                    <!-- Drawn over the seed: in step 3 the roots outgrow it. -->
                    <g :transform="`translate(${SPROUTING.roots[0]} ${SPROUTING.roots[1]})`">
                      <g :transform="pose.roots">
                        <path :d="ROOTS" clip-path="url(#process04-roots-clip)" />
                      </g>
                    </g>
                  </g>
                  <g :transform="pose.tree">
                    <path :d="TREE" clip-path="url(#process04-tree-clip)" :opacity="pose.fade" />
                    <g
                      v-for="(d, i) in [LEAF_LEFT, LEAF_RIGHT]"
                      :key="i"
                      :opacity="pose.fade"
                      :transform="swayAt(2 + i, SWAY.leaf[i].pivot)"
                    >
                      <g :transform="pose.leaves[i]">
                        <path :d="d" />
                      </g>
                    </g>
                    <!-- The sprout, drawn inside the tree's group so it grows with it. -->
                    <g :transform="pose.ride">
                      <g :transform="SPROUT_AT">
                        <g :transform="swayAt(1, PIVOT.sprout)">
                          <g :transform="pose.sprout">
                            <path :d="SPROUT" />
                          </g>
                        </g>
                      </g>
                    </g>
                    <g
                      v-for="(m, i) in MANGOES"
                      :key="m.x"
                      :opacity="i === 0 ? undefined : pose.fade"
                      :visibility="i === 0 && pose.morphing ? 'hidden' : undefined"
                      :transform="`translate(${m.x} ${m.y}) rotate(${m.r}) scale(${m.s}) translate(-${PIVOT.mangoCentre[0]} -${PIVOT.mangoCentre[1]})`"
                    >
                      <g :transform="swayAt(4 + i, PIVOT.mangoStem)">
                        <g :transform="pose.mangoes[i]">
                          <path class="process__mango" :d="MANGO" />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>

              <!-- Step 4 -> 1 morph, in screen units. -->
              <g :visibility="pose.morphing ? 'visible' : 'hidden'">
                <path :d="pose.morph" />
                <path class="process__morph-highlight" :d="MORPH.highlight" :opacity="pose.highlight" />
                <path class="process__morph-grooves" :d="MORPH.grooves" :opacity="pose.grooves" />
              </g>
            </svg>
          </button>

          <div class="process__timeline" data-lab-noswipe @keydown="onKey">
            <span class="process__bar" aria-hidden="true">
              <span ref="fill" class="process__bar-fill" />
            </span>
            <button
              v-for="(s, i) in STEPS"
              :key="s.n"
              type="button"
              class="process__step"
              :class="{ 'process__step--active': step === s.n }"
              :style="{ left: `${CIRCLE_X[i]}rem` }"
              :aria-current="step === s.n ? 'step' : undefined"
              :aria-label="`Step ${s.n}`"
              @click="pick(s.n)"
            >
              {{ s.n }}
            </button>
          </div>
        </div>

        <div ref="copy" class="process__copy">
          <h3 class="process__copy-title">{{ text.title }}</h3>
          <p class="process__copy-body">{{ text.body }}</p>
          <a class="process__more" href="#top">Read more</a>
        </div>
        <p ref="live" class="process__live" aria-live="polite" />
      </div>
    </div>
  </section>
</template>
