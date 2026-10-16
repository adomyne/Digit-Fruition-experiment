// Results (React + GSAP), in two phases. Figma: concept 142:1466 (icon
// pool), results card 142:1470. Same behaviour, numbers and physics as the
// vanilla build on page 5 (see notes.md); written the React way:
// 1. Icon pool: when the section's top reaches the middle of the screen,
//    a GSAP tween glides the scroll into place and the scroll is held for
//    3 s while orange icons fall and pile up to 60% of the height. They
//    stay playable: drag, throw, bounce, glow on impact.
// 2. The pool stays fixed (sticky) while the white card scrolls up over
//    it; the sticky title rides on the card once the card reaches it.
//
// Performance: React renders the icons once (one state update when the
// drop starts); after that nothing re-renders. The physics
// (resultsPhysics.ts) runs on GSAP's ticker, which is added only while the
// pool is on screen and something moves, and it writes transforms straight
// to the elements through refs, skipping icons that sleep.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
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

/** One icon as React renders it: its shape and which orange. */
interface Icon {
  shape: number;
  light: boolean;
}

export default function Results() {
  const root = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLHeadingElement>(null);
  const slotRef = useRef<HTMLParagraphElement>(null);
  /** The icon elements, by index; the physics writes to them directly. */
  const els = useRef<HTMLSpanElement[]>([]);
  const [icons, setIcons] = useState<Icon[]>([]);
  // The engine lives in the effect below; the pointer handlers and the
  // "icons are on the page" step reach it through this ref.
  const api = useRef<
    | {
        down: (e: PointerEvent) => void;
        move: (e: PointerEvent) => void;
        up: (e: PointerEvent) => void;
        start: () => void;
      }
    | undefined
  >(undefined);

  // The drop starts once React has put the icons on the page.
  useEffect(() => {
    if (icons.length) api.current?.start();
  }, [icons]);

  useEffect(() => {
    const el = root.current;
    const layer = layerRef.current;
    const titleBar = titleBarRef.current;
    const slot = slotRef.current;
    if (!el || !layer || !titleBar || !slot) return;
    const titleText = titleBar.firstElementChild as HTMLElement;
    const scroller = el.closest<HTMLElement>('[data-sandbox]')!;

    const world: World = { bodies: [], width: layer.clientWidth, height: layer.clientHeight };
    let plan: Icon[] = [];
    let reduced = false;
    /** Spawn times (s after the drop starts), soonest first. */
    let queue: number[] = [];
    let elapsed = 0;
    let resting = 0;
    let running = false;
    let visible = false;
    // What each element shows now, so a frame writes only changes.
    const drawn: boolean[] = [];
    const glowing: boolean[] = [];

    const render = (dt: number) => {
      world.bodies.forEach((b, i) => {
        const icon = els.current[i];
        if (!b.asleep || !drawn[i]) {
          icon.style.transform = `translate3d(${b.x - ICON / 2}px, ${b.y - ICON / 2}px, 0) rotate(${b.a}rad)`;
          drawn[i] = b.asleep;
        }
        if (b.glow > 0) {
          b.glow = Math.max(0, b.glow - dt * GLOW_FADE);
          icon.style.setProperty('--glow', b.glow.toFixed(3));
        }
        const on = b.glow > 0.01;
        if (on !== !!glowing[i]) {
          glowing[i] = on;
          icon.classList.toggle('is-glowing', on);
        }
      });
    };

    const tick = (dt: number) => {
      elapsed += dt;
      while (queue.length && queue[0] <= elapsed) {
        queue.shift();
        const x = ICON / 2 + Math.random() * Math.max(0, world.width - ICON);
        const shape = plan[world.bodies.length].shape;
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
      if (!running && visible && plan.length) {
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
      const n = plan.length;
      queue = Array.from({ length: n }, (_, i) => (i / n) * SPAWN + Math.random() * 0.06).sort((a, b) => a - b);
      elapsed = 0;
      wake();
    };

    /** Reduced motion: the pile is settled off screen and appears at rest. */
    const settle = () => {
      const perRow = Math.max(1, Math.floor(world.width / ICON));
      plan.forEach((icon, i) => {
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
    const down = (e: PointerEvent) => {
      const icon = (e.target as Element).closest<HTMLElement>('.results__icon');
      const b = icon ? world.bodies[els.current.indexOf(icon as HTMLSpanElement)] : undefined;
      if (!icon || !b || grab) return;
      const p = local(e);
      grab = { b, el: icon, id: e.pointerId, dx: b.x - p.x, dy: b.y - p.y };
      b.hold = { x: b.x, y: b.y };
      wakeBody(b);
      b.inside = true;
      icon.classList.add('is-held');
      icon.setPointerCapture(e.pointerId);
      e.preventDefault();
      wake();
    };
    const move = (e: PointerEvent) => {
      if (!grab || e.pointerId !== grab.id) return;
      const p = local(e);
      grab.b.hold = clampToWorld(p.x + grab.dx, p.y + grab.dy);
    };
    const up = (e: PointerEvent) => {
      if (!grab || e.pointerId !== grab.id) return;
      grab.b.hold = null; // keeps its speed: a throw
      grab.el.classList.remove('is-held');
      grab = null;
      wake();
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
    const offset = () => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    // While held the scroller stops scrolling natively, as the Ads hold
    // does; the gutter keeps the width steady.
    const lock = (on: boolean) => {
      locked = on;
      scroller.style.overflow = on ? 'hidden' : '';
      scroller.style.scrollbarGutter = on ? 'stable' : '';
    };

    const ctx = gsap.context(() => {});

    /** Picks the icons and renders them; start() runs once they're on the page. */
    const begin = () => {
      started = true;
      reduced = still();
      plan = Array.from({ length: countFor(world.width, world.height, FILL) }, () => ({
        shape: Math.floor(Math.random() * SHAPES.length),
        light: Math.random() < 0.5,
      }));
      setIcons(plan);
    };
    const start = () => {
      if (reduced) {
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

    api.current = { down, move, up, start };
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
      api.current = undefined;
    };
  }, []);

  const native = (fn: 'down' | 'move' | 'up') => (e: ReactPointerEvent) => api.current?.[fn](e.nativeEvent);

  return (
    <section className="results" ref={root}>
      <h2 className="results__title" ref={titleBarRef}>
        <span>{TITLE}</span>
      </h2>

      <div className="results__pool" data-lab-part="Results">
        <div
          className="results__icons"
          ref={layerRef}
          data-lab-noswipe
          aria-hidden="true"
          onPointerDown={native('down')}
          onPointerMove={native('move')}
          onPointerUp={native('up')}
          onPointerCancel={native('up')}
        >
          {icons.map((icon, i) => (
            <span
              key={i}
              ref={(node) => {
                if (node) els.current[i] = node;
              }}
              className={icon.light ? 'results__icon results__icon--light' : 'results__icon'}
              style={{ '--shape': `url("${SHAPES[icon.shape]}")` } as CSSProperties}
            >
              <span className="results__shape" />
            </span>
          ))}
        </div>
      </div>

      <div className="results__overlay" data-lab-part="Results">
        <div className="results__card">
          {/* Keeps the sticky title's place in the card, as Figma's hidden copy does. */}
          <p className="results__slot" ref={slotRef} aria-hidden="true">
            {TITLE}
          </p>
          <div className="results__content">
            <ul className="results__metrics">
              {METRICS.map((m) => (
                <li className="results__metric" key={m.value}>
                  <strong className="results__value">{m.value}</strong>
                  <span className="results__label">{m.label}</span>
                </li>
              ))}
            </ul>
            <div className="results__foot">
              <p className="results__note">For 5-6 Figure US/EU brands</p>
              <a href="#top" className="results__audit">
                <img src={download} width="17" height="17" alt="" /> Get a Free Audit
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
