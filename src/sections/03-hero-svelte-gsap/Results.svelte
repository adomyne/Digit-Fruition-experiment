<script lang="ts">
  // Results (Svelte 5 + GSAP), in two phases. Figma: concept 142:1466 (icon
  // pool), results card 142:1470. Same behaviour, numbers and physics as
  // the vanilla build on page 5 (see notes.md); written the Svelte way:
  // 1. Icon pool: when the section's top reaches the middle of the screen,
  //    a GSAP tween glides the scroll into place and the scroll is held for
  //    3 s while orange icons fall and pile up to 60% of the height. They
  //    stay playable: drag, throw, bounce, glow on impact.
  // 2. The pool stays fixed (sticky) while the white card scrolls up over
  //    it; the sticky title rides on the card once the card reaches it.
  //
  // Performance: one $state (the icon list) is set once when the drop
  // starts, so Svelte renders the icons once. Everything the physics
  // touches per frame is a plain object, never $state; it runs on GSAP's
  // ticker (only while the pool is on screen and something moves) and
  // writes transforms through bind:this elements, skipping icons that sleep.
  import { onMount, tick as rendered } from 'svelte';
  import { gsap } from 'gsap';
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

  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** One icon as Svelte renders it: its shape and which orange. */
  interface Icon {
    shape: number;
    light: boolean;
  }

  let root: HTMLElement;
  let layer: HTMLDivElement;
  let titleBar: HTMLHeadingElement;
  let titleText: HTMLSpanElement;
  let slot: HTMLParagraphElement;
  /** The icon elements, by index (bind:this); not $state. */
  const els: HTMLSpanElement[] = [];
  let icons = $state<Icon[]>([]);
  // The pointer handlers are created in onMount; the markup calls them
  // through this object.
  let api: { down: (e: PointerEvent) => void; move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | undefined;

  onMount(() => {
    const scroller = root.closest<HTMLElement>('[data-sandbox]')!;
    const world: World = { bodies: [], width: layer.clientWidth, height: layer.clientHeight };
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
        const shape = icons[world.bodies.length].shape;
        world.bodies.push(createBody(x, -ICON / 2 - Math.random() * ICON, shape, 300 + Math.random() * 400, (Math.random() - 0.5) * 6));
      }
      step(world, dt);
      render(dt);
      // Nothing moving: stop the clock until a pointer or a resize wakes it.
      const rest = queue.length === 0 && world.bodies.every((b) => b.asleep && b.glow === 0);
      resting = rest ? resting + 1 : 0;
      if (resting > REST_FRAMES) sleep();
    };

    // GSAP's ticker is the physics clock (deltaTime in ms).
    const onTick = (_time: number, deltaTime: number) => tick(Math.min(deltaTime, 50) / 1000);
    const wake = () => {
      resting = 0;
      if (!running && visible && icons.length) {
        running = true;
        gsap.ticker.add(onTick);
      }
    };
    const sleep = () => {
      if (!running) return;
      running = false;
      gsap.ticker.remove(onTick);
    };

    const drop = () => {
      const n = icons.length;
      queue = Array.from({ length: n }, (_, i) => (i / n) * SPAWN + Math.random() * 0.06).sort((a, b) => a - b);
      elapsed = 0;
      wake();
    };

    /** Reduced motion: the pile is settled off screen and appears at rest. */
    const settle = () => {
      const perRow = Math.max(1, Math.floor(world.width / ICON));
      icons.forEach((icon, i) => {
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
      const r = layer.getBoundingClientRect();
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
    let titlePad = parseFloat(getComputedStyle(titleText).paddingTop);
    const followCard = () => {
      const pinned = titleBar.getBoundingClientRect().top + titlePad;
      const shift = Math.min(0, slot.getBoundingClientRect().top - pinned);
      titleText.style.transform = shift ? `translateY(${shift}px)` : '';
    };

    // ---------- Scroll hijack ----------
    let started = false;
    let locked = false;
    let snapping = false;
    let lockAt = 0;
    let lastTop = scroller.scrollTop;
    let unlockCall: gsap.core.Tween | undefined;
    const offset = () => root.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    // While held the scroller stops scrolling natively, as the Ads hold
    // does; the gutter keeps the width steady.
    const lock = (on: boolean) => {
      locked = on;
      scroller.style.overflow = on ? 'hidden' : '';
      scroller.style.scrollbarGutter = on ? 'stable' : '';
    };

    const ctx = gsap.context(() => {});

    /** Picks the icons, waits for Svelte to render them, then drops. */
    const begin = async () => {
      started = true;
      icons = Array.from({ length: countFor(world.width, world.height, FILL) }, () => ({
        shape: Math.floor(Math.random() * SHAPES.length),
        light: Math.random() < 0.5,
      }));
      await rendered();
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
      const pos = { y: scroller.scrollTop };
      ctx.add(() => {
        gsap.to(pos, {
          y: scroller.scrollTop + o,
          duration: SNAP,
          ease: 'power3.out',
          onUpdate: () => {
            scroller.scrollTop = pos.y;
          },
          onComplete: () => {
            snapping = false;
            lockAt = scroller.scrollTop;
            drop();
            unlockCall = gsap.delayedCall(DROP, () => lock(false));
          },
        });
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
    io.observe(layer);
    const ro = new ResizeObserver(() => {
      world.width = layer.clientWidth;
      world.height = layer.clientHeight;
      wakeAll(world);
      titlePad = parseFloat(getComputedStyle(titleText).paddingTop);
      followCard();
      wake();
    });
    ro.observe(layer);

    return () => {
      destroyed = true;
      ctx.revert();
      unlockCall?.kill();
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
</script>

<section class="results" bind:this={root}>
  <h2 class="results__title" bind:this={titleBar}><span bind:this={titleText}>{TITLE}</span></h2>

  <div class="results__pool" data-lab-part="Results">
    <div
      class="results__icons"
      bind:this={layer}
      data-lab-noswipe
      aria-hidden="true"
      onpointerdown={(e) => api?.down(e)}
      onpointermove={(e) => api?.move(e)}
      onpointerup={(e) => api?.up(e)}
      onpointercancel={(e) => api?.up(e)}
    >
      {#each icons as icon, i (i)}
        <span
          bind:this={els[i]}
          class="results__icon"
          class:results__icon--light={icon.light}
          style:--shape={`url("${SHAPES[icon.shape]}")`}
        >
          <span class="results__shape"></span>
        </span>
      {/each}
    </div>
  </div>

  <div class="results__overlay" data-lab-part="Results">
    <div class="results__card">
      <!-- Keeps the sticky title's place in the card, as Figma's hidden copy does. -->
      <p class="results__slot" bind:this={slot} aria-hidden="true">{TITLE}</p>
      <div class="results__content">
        <ul class="results__metrics">
          {#each METRICS as m (m.value)}
            <li class="results__metric">
              <strong class="results__value">{m.value}</strong>
              <span class="results__label">{m.label}</span>
            </li>
          {/each}
        </ul>
        <div class="results__foot">
          <p class="results__note">For 5-6 Figure US/EU brands</p>
          <a href="#top" class="results__audit">
            <img src={download} width="17" height="17" alt="" /> Get a Free Audit
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
