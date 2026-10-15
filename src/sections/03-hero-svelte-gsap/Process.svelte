<script lang="ts">
  // Process section (docs/briefs/process/brief.md) in Svelte 5 + GSAP: a
  // four-step stepper that grows a mango tree from a seed. Same markup,
  // timeline and timings as 02; only the framework changes. GSAP owns every
  // transform and opacity in the scene, the text box and the bar fill; CSS
  // only sets colours and layout.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
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

  gsap.registerPlugin(MorphSVGPlugin);

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

  // World placement of the seed, roots and sprout (reference coordinates)
  // next to the tree: the emerge point lands on the trunk base.
  const [EX, EY] = SPROUTING.emerge;
  const SPROUTING_AT = `translate(${TRUNK_X - EX * SPROUTING_SCALE} ${GROUND_Y - EY * SPROUTING_SCALE}) scale(${SPROUTING_SCALE})`;
  // The sprout lives in the tree's group (scale 0.4 until step 3), so it is
  // scaled up to look the same size as in the sprouting reference.
  const SPROUT_AT = `translate(${TRUNK_X} ${GROUND_Y}) scale(${SPROUTING_SCALE / TREE_START}) translate(${-PIVOT.sprout[0]} ${-EY})`;
  const pt = (p: readonly number[]) => `${p[0]} ${p[1]}`;
  const sw = (cls: string) => `process__sway process__sway--${cls}`;

  let root: HTMLElement;
  let camera: SVGGElement;
  let copy: HTMLDivElement;
  let fill: HTMLSpanElement;
  let live: HTMLParagraphElement;
  // 0 = the thumbnail (opening state only), 1-4 = steps.
  let step = $state(0);
  let shown = $state(1);
  const text = $derived(STEPS[shown - 1]);
  // goTo and stopAutoplay are created in onMount (they close over the
  // timeline); the buttons call them through this object.
  let api: { goTo: (n: number) => void; stopAutoplay: () => void } | undefined;

  onMount(() => {
    let target = 0;
    let playhead: gsap.core.Tween | undefined;
    let autoplay = true;
    let visible = false;
    let next: gsap.core.Tween | undefined;
    let idle: gsap.core.Animation[] = [];

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const cam = { ...CAMERA[1] };
      const moveCamera = () => camera.setAttribute('transform', cameraAt(cam));

      // Nothing fades: every part is hidden at scale 0 or behind a clip
      // until it grows. The world only takes over from the thumbnail seed,
      // which it covers exactly, at the end of the first change.
      gsap.set(q('.process__world'), { autoAlpha: 0 });
      gsap.set(q('.process__morph'), { autoAlpha: 0 });
      gsap.set(q('.process__morph-grooves'), { opacity: 0 });
      // Step 4 -> 1 morphs between evenly sampled polygons of the two outlines.
      const morphOutline = root.querySelector<SVGPathElement>('.process__morph-outline')!;
      const poly = morphPolygons(morphOutline.ownerSVGElement!);
      morphOutline.setAttribute('d', poly.fromD);
      gsap.set(q('.process__sprout-grow'), { scale: 0, svgOrigin: pt(PIVOT.sprout) });
      gsap.set(q('.process__ground'), { scaleX: 0, svgOrigin: `${TRUNK_X} ${GROUND_Y}` });
      gsap.set(q('.process__roots-clip'), { attr: { height: 0 } });
      gsap.set(q('.process__tree-grow'), { scale: TREE_START, svgOrigin: `${TRUNK_X} ${GROUND_Y}` });
      q('.process__leaf-grow').forEach((leaf, i) =>
        gsap.set(leaf, { scale: 0, svgOrigin: pt(i === 0 ? PIVOT.leafLeft : PIVOT.leafRight) }),
      );
      gsap.set(q('.process__mango-grow'), { scale: 0, rotation: -12, svgOrigin: pt(PIVOT.mangoStem) });
      gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' });
      moveCamera();

      // The trunk grows up behind a clip edge and the sprout rides that
      // edge, so the sprout is the growing tip of the tree. Near the top the
      // sprout folds into the top leaf as it appears. One proxy drives both.
      const ride = q('.process__ride')[0];
      const treeClip = q('.process__tree-clip')[0];
      const grow = { p: 0 };
      const growTree = () => {
        const front = 575 - grow.p * 590;
        const y = Math.min(0, Math.max(front + 40, TREE_TIP) - GROUND_Y);
        const a = gsap.utils.clamp(0, 1, (1 - grow.p) / 0.18);
        treeClip.setAttribute('y', `${front}`);
        treeClip.setAttribute('height', `${575 - front}`);
        ride.setAttribute(
          'transform',
          `translate(0 ${y}) translate(${TRUNK_X} ${GROUND_Y}) scale(${a}) translate(${-TRUNK_X} ${-GROUND_Y})`,
        );
      };

      // After a jump on the timeline, re-apply what onUpdate writes.
      const redraw = () => {
        moveCamera();
        growTree();
      };

      // One master timeline: label sN is the finished scene of step N.
      const T = STEP_TIME;
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
      growTree();
      tl.addLabel('s0', 0)
        // Thumbnail to step 1: the arrow pulls back into the seed, the mango
        // shrinks toward it, and the seed slides to the centre.
        .to(q('.process__thumb-mango'), { scale: 0, svgOrigin: '441 160', duration: T * 0.45, ease: 'power2.in' }, 0)
        .to(q('.process__thumb-arrow'), { scaleX: 0, svgOrigin: '349 160', duration: T * 0.4, ease: 'power2.in' }, T * 0.2)
        .to(q('.process__thumb-seed'), { x: 146, duration: T * 0.75 }, T * 0.25)
        .set(q('.process__thumb'), { autoAlpha: 0 }, T)
        .set(q('.process__world'), { autoAlpha: 1 }, T)
        .addLabel('s1', T)
        // Step 2: pull back, the ground draws out, roots grow down, the sprout up.
        .to(cam, { ...CAMERA[2], duration: T, onUpdate: moveCamera }, 's1')
        .to(q('.process__ground'), { scaleX: 1, duration: T * 0.6, ease: 'power2.out' }, `s1+=${T * 0.1}`)
        .to(q('.process__roots-clip'), { attr: { height: 160 }, duration: T * 0.65, ease: 'power1.out' }, `s1+=${T * 0.35}`)
        .to(q('.process__sprout-grow'), { scale: 1, duration: T * 0.6, ease: 'back.out(1.4)' }, `s1+=${T * 0.4}`)
        .addLabel('s2', T * 2)
        // Step 3: pull back to the Figma framing. The roots outgrow the seed,
        // which shrinks into them, then rise and spread into the tree's base;
        // the trunk grows up out of them with the sprout on its tip, and the
        // leaves unfold from the branches.
        .to(cam, { ...CAMERA[3], duration: T, onUpdate: moveCamera }, 's2')
        .to(q('.process__seed-shrink'), { scale: 0, svgOrigin: pt(ROOTS_TO.seedTip), duration: T * 0.5, ease: 'power1.in' }, 's2')
        .to(q('.process__roots-grow'), { x: ROOTS_TO.x, y: ROOTS_TO.y, scale: ROOTS_TO.outgrow, svgOrigin: pt(PIVOT.roots), duration: T * 0.45, ease: 'power2.inOut' }, 's2')
        .to(q('.process__roots-grow'), { scaleX: ROOTS_TO.sx, scaleY: ROOTS_TO.sy, duration: T * 0.45, ease: 'power2.inOut' }, `s2+=${T * 0.45}`)
        .to(q('.process__tree-grow'), { scale: 1, duration: T * 0.7, ease: 'power2.out' }, `s2+=${T * 0.3}`)
        .to(grow, { p: 1, duration: T * 0.6, ease: 'power1.inOut', onUpdate: growTree }, `s2+=${T * 0.4}`)
        .to(q('.process__leaf-grow'), { scale: 1, duration: T * 0.3, ease: 'back.out(2)', stagger: T * 0.05 }, `s2+=${T * 0.65}`)
        .addLabel('s3', T * 3)
        // Step 4: the mangoes grow from their stems, one after another.
        .to(q('.process__mango-grow'), { scale: 1, rotation: 0, duration: T * 0.55, ease: 'back.out(1.7)', stagger: T * 0.22 }, 's3')
        .addLabel('s4', T * 4)
        // Step 4 -> 1 (forwards only, like the mango cycle on /8): the camera
        // closes in on the centre mango and turns it upright while the rest
        // of the tree fades. Then its outline morphs into the seed's, the
        // highlight fades out and the seed's grooves fade in. The last frame
        // is step 1's, so the playhead then jumps back to s1.
        .to(cam, { ...CAMERA.loop, duration: T, onUpdate: moveCamera }, 's4')
        .to(q('.process__fade'), { opacity: 0, duration: T * 0.6, ease: 'power1.inOut' }, `s4+=${T * 0.2}`)
        .set(q('.process__hero'), { autoAlpha: 0 }, T * 5)
        .set(q('.process__morph'), { autoAlpha: 1 }, T * 5)
        .to(q('.process__morph-highlight'), { opacity: 0, duration: T * 0.3, ease: 'none' }, T * 5)
        .to(q('.process__morph-outline'), { morphSVG: MORPH.to, duration: T }, T * 5)
        .to(q('.process__morph-grooves'), { opacity: 1, duration: T * 0.35, ease: 'none' }, T * 5.65)
        .addLabel('loop', T * 6);

      // Bar fill: one tween per change, from wherever it is.
      const fillTo = (n: number, duration: number) =>
        gsap.to(fill, { scaleX: (Math.max(n, 1) - 1) / 3, duration, ease: 'power2.inOut', overwrite: true });

      // Idle motion once a step has finished: small, slow, out of sync.
      // Each sways a wrapper the timeline never touches, easing out from
      // where it is (no jump when a step lands), then back and forth.
      const sway = (sel: string, deg: number, origins: readonly (readonly number[])[], dur: number) =>
        q(sel).map((t, i) => {
          const d = dur + i * 0.45;
          return gsap
            .timeline({ delay: i * 0.3 })
            .to(t, { rotation: -deg, svgOrigin: pt(origins[i] ?? origins[0]), duration: d / 2, ease: 'sine.out', overwrite: true })
            .to(t, { rotation: deg, duration: d, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        });
      const stopIdle = () => {
        idle.forEach((t) => t.kill());
        idle = [];
        gsap.to(q('.process__sway'), { rotation: 0, duration: 0.3, overwrite: true });
      };
      const startIdle = () => {
        stopIdle();
        if (still() || !visible || target === 0) return;
        if (target === 1) idle = sway('.process__sway--seed', 2, [PIVOT.seedCentre], 3.2);
        if (target === 2) idle = sway('.process__sway--sprout', 3, [PIVOT.sprout], 2.8);
        if (target >= 3) idle = sway('.process__sway--leaf', 4, [PIVOT.leafLeft, PIVOT.leafRight], 3);
        if (target === 4) idle = [...idle, ...sway('.process__sway--mango', 5, [PIVOT.mangoStem], 2.6)];
      };

      const scheduleNext = () => {
        next?.kill();
        if (autoplay && visible) next = gsap.delayedCall(AUTOPLAY_EVERY, () => goTo(target === 4 ? 1 : target + 1));
      };

      const goTo = (n: number) => {
        const from = tl.time();
        // From step 4 (or mid-loop), step 1 is reached forwards through the
        // mango -> seed loop; everything else plays along the timeline.
        const wrap = n === 1 && from >= tl.labels.s4;
        const to = wrap ? tl.labels.loop : tl.labels[`s${n}`];
        target = n;
        step = n;
        stopIdle();
        playhead?.kill();
        scheduleNext();
        live.textContent = STEPS[n - 1].label;

        // Body text: out, swap, in, inside the first half of the change.
        const swap = () => (shown = n);
        if (still()) {
          // Reduced motion: a quick cross-fade between finished scenes.
          fillTo(n, 0);
          gsap.to(q('.process__scene, .process__copy'), {
            autoAlpha: 0,
            duration: 0.15,
            overwrite: true,
            onComplete: () => {
              tl.time(tl.labels[`s${n}`]);
              redraw();
              swap();
              gsap.to(q('.process__scene, .process__copy'), { autoAlpha: 1, duration: 0.2 });
            },
          });
          return;
        }
        const steps = wrap ? 1 : Math.max(1, Math.round(Math.abs(to - from) / STEP_TIME));
        const duration = wrap ? to - from : Math.abs(to - from) / (steps > 1 ? 2 : 1);
        fillTo(n, Math.max(duration, 0.3));
        gsap.to(copy, {
          autoAlpha: 0,
          y: -8,
          duration: 0.25,
          overwrite: true,
          onComplete: () => {
            swap();
            gsap.fromTo(copy, { y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
          },
        });
        playhead = gsap.to(tl, {
          time: to,
          duration,
          ease: steps > 1 || wrap ? 'none' : 'power1.inOut',
          onComplete: () => {
            if (wrap) {
              tl.time(tl.labels.s1);
              redraw();
            }
            startIdle();
          },
        });
      };

      api = {
        goTo,
        stopAutoplay: () => {
          autoplay = false;
          next?.kill();
        },
      };

      // Autoplay starts when the section scrolls into view and pauses
      // (with the idle motion) while it is off screen.
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (!visible) {
            next?.kill();
            stopIdle();
            return;
          }
          if (target === 0 && autoplay) goTo(1);
          else {
            scheduleNext();
            if (!playhead?.isActive()) startIdle();
          }
        },
        { threshold: 0.4 },
      );
      io.observe(root);
      return () => io.disconnect();
    }, root);

    return () => {
      ctx.revert();
      playhead?.kill();
      next?.kill();
      idle.forEach((t) => t.kill());
      api = undefined;
    };
  });

  const pick = (n: number) => {
    api?.stopAutoplay();
    if (n !== step) api?.goTo(n);
  };
  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = Math.min(4, Math.max(1, (step || 1) + dir));
    pick(n);
    root.querySelectorAll<HTMLButtonElement>('.process__step')[n - 1]?.focus();
  };
</script>

<section class="process" data-lab-part="Process" bind:this={root}>
  <div class="process__card">
    <h2 class="process__title">The Process</h2>
    <div class="process__steps">
      <div class="process__illustration">
        <button
          type="button"
          class="process__picture"
          aria-label={`${step === 0 ? THUMB_LABEL : STEPS[step - 1].label}. Show the next step.`}
          onclick={() => pick(step >= 4 ? 1 : step + 1)}
        >
          <svg class="process__scene" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden="true">
            <defs>
              <clipPath id="process03-roots-clip" clipPathUnits="userSpaceOnUse">
                <rect class="process__roots-clip" x={-10} y={-10} width={200} height={160} />
              </clipPath>
              <clipPath id="process03-tree-clip" clipPathUnits="userSpaceOnUse">
                <rect class="process__tree-clip" x={-20} y={-15} width={530} height={590} />
              </clipPath>
            </defs>

            <!-- Thumbnail: seed, arrow, mango (screen units). -->
            <g class="process__thumb">
              <g class="process__thumb-seed">
                <g transform="translate(81 45) scale(0.9625)">
                  <path d={SEED} />
                </g>
              </g>
              <g class="process__thumb-arrow" transform="translate(349 132) scale(3.3)">
                <path d={ARROW} />
              </g>
              <g class="process__thumb-mango" transform="translate(441 50) scale(0.767)">
                <path d={MANGO} />
              </g>
            </g>

            <!-- The world, in tree units, seen through the camera. -->
            <g class="process__world">
              <g bind:this={camera}>
                <line
                  class="process__ground process__fade"
                  x1={TRUNK_X - 1400}
                  x2={TRUNK_X + 1400}
                  y1={GROUND_Y}
                  y2={GROUND_Y}
                  vector-effect="non-scaling-stroke"
                />
                <g class="process__fade" transform={SPROUTING_AT}>
                  <g transform={`translate(${SPROUTING.seed[0]} ${SPROUTING.seed[1]})`}>
                    <g class={sw('seed')}>
                      <g class="process__seed-shrink">
                        <path d={SEED} />
                      </g>
                    </g>
                  </g>
                  <!-- Drawn over the seed: in step 3 the roots outgrow it. -->
                  <g transform={`translate(${SPROUTING.roots[0]} ${SPROUTING.roots[1]})`}>
                    <g class="process__roots-grow">
                      <path d={ROOTS} clip-path="url(#process03-roots-clip)" />
                    </g>
                  </g>
                </g>
                <g class="process__tree-grow">
                  <g class="process__tree-body process__fade">
                    <path d={TREE} clip-path="url(#process03-tree-clip)" />
                  </g>
                  {#each [LEAF_LEFT, LEAF_RIGHT] as d (d.slice(0, 12))}
                    <g class="process__fade">
                      <g class={sw('leaf')}>
                        <g class="process__leaf-grow">
                          <path {d} />
                        </g>
                      </g>
                    </g>
                  {/each}
                  <!-- The sprout, drawn inside the tree's group so it grows with it. -->
                  <g class="process__ride">
                    <g transform={SPROUT_AT}>
                      <g class={sw('sprout')}>
                        <g class="process__sprout-grow">
                          <path d={SPROUT} />
                        </g>
                      </g>
                    </g>
                  </g>
                  {#each MANGOES as m, i (m.x)}
                    <g class={i === 0 ? 'process__hero' : 'process__fade'} transform={`translate(${m.x} ${m.y}) rotate(${m.r}) scale(${m.s}) translate(-${PIVOT.mangoCentre[0]} -${PIVOT.mangoCentre[1]})`}>
                      <g class={sw('mango')}>
                        <g class="process__mango-grow">
                          <path class="process__mango" d={MANGO} />
                        </g>
                      </g>
                    </g>
                  {/each}
                </g>
              </g>
            </g>

            <!-- Step 4 -> 1 morph, in screen units. -->
            <g class="process__morph">
              <path class="process__morph-outline" d={MORPH.from} />
              <path class="process__morph-highlight" d={MORPH.highlight} />
              <path class="process__morph-grooves" d={MORPH.grooves} />
            </g>
          </svg>
        </button>

        <!-- Arrow keys move between steps; the buttons inside take the focus. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="process__timeline" data-lab-noswipe onkeydown={onKey}>
          <span class="process__bar" aria-hidden="true">
            <span class="process__bar-fill" bind:this={fill}></span>
          </span>
          {#each STEPS as s, i (s.n)}
            <button
              type="button"
              class="process__step"
              class:process__step--active={step === s.n}
              style:left={`${CIRCLE_X[i]}rem`}
              aria-current={step === s.n ? 'step' : undefined}
              aria-label={`Step ${s.n}`}
              onclick={() => pick(s.n)}
            >
              {s.n}
            </button>
          {/each}
        </div>
      </div>

      <div class="process__copy" bind:this={copy}>
        <h3 class="process__copy-title">{text.title}</h3>
        <p class="process__copy-body">{text.body}</p>
        <a class="process__more" href="#top">Read more</a>
      </div>
      <p class="process__live" bind:this={live} aria-live="polite"></p>
    </div>
  </div>
</section>
