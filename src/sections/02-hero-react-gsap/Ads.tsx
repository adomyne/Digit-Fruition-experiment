import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import line from './assets/ads/line.svg?url';
import ring from './assets/ads/number-ring.svg?url';
import arrowPrev from './assets/ads/arrow-prev.svg?url';
import arrowNext from './assets/ads/arrow-next.svg?url';
import { ADS_STEPS } from './adsCopy';
import './Ads.css';

// Ads section in React + GSAP: "We Handle All Amazon Ads Campaigns", five
// services on a wheel that turns counter-clockwise, one step at a time.
// Figma: Services Section 142:1216, keywords 301:15, arrows 301:24.
// Scrolling down turns the wheel until the fifth step, then the page scrolls
// on; after that first pass the wheel never holds the scroll again until a
// reload. Autoplay as in the Process section (2 s on each step, 1 s to
// turn) until the disc, an arrow or a keyword is clicked. The disc's glow
// moves to a random spot on every turn. See notes.md.

/** Autoplay holds each step this long (s), as in the Process section. */
const HOLD = 2;
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
const GLOW_START = { x: 707.784, y: 486.915, r: -124.882 };
const glowAt = (g: { x: number; y: number; r: number }) =>
  `translate(${g.x} ${g.y}) rotate(${g.r}) scale(642.972 726.586)`;

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Ads() {
  const root = useRef<HTMLElement>(null);
  const wheelRef = useRef<HTMLOListElement>(null);
  const glowRef = useRef<SVGRadialGradientElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);
  // turnBy, turnTo and stopAutoplay are created inside the effect; the
  // buttons call them through this ref.
  const api = useRef<{ turnBy: (by: number) => void; turnTo: (n: number) => void; stopAutoplay: () => void } | undefined>(
    undefined,
  );

  useEffect(() => {
    const el = root.current;
    const wheelEl = wheelRef.current;
    const glowEl = glowRef.current;
    if (!el || !wheelEl || !glowEl) return;
    const scroller = el.closest<HTMLElement>('[data-sandbox]')!;
    const stepEls = [...wheelEl.querySelectorAll<HTMLElement>('.ads__step')];

    /** The wheel's angle (deg); GSAP tweens it and render() writes it. */
    const wheel = { angle: 0 };
    const glow = { ...GLOW_START };
    let at = 0;
    let target = 0;
    let turn: gsap.core.Tween | undefined;
    let turnStart = 0;
    let turnTime = TRAVEL;
    let next: gsap.core.Tween | undefined;
    let visible = false;
    let autoplay = true;
    // Scroll hold: `held` while the wheel takes the scroll; `done` once the
    // reader has scrolled past the fifth step (until a reload).
    let held = false;
    let done = false;
    let heldAt = 0;
    let pending = 0;
    let lastOffset = Infinity;
    let touchY = 0;

    // Each spoke is brightest at the top and fades out by the next spoke's place.
    const render = () => {
      wheelEl.style.transform = `rotate(${wheel.angle}deg)`;
      stepEls.forEach((s, i) => {
        const d = ((((i * SPOKE + wheel.angle) % 360) + 540) % 360) - 180;
        s.style.opacity = `${Math.max(0, Math.cos((d * Math.PI) / (2 * SPOKE)))}`;
      });
    };
    const renderGlow = () => glowEl.setAttribute('gradientTransform', glowAt(glow));

    const ctx = gsap.context(() => {
      const scheduleNext = () => {
        next?.kill();
        // While the wheel holds the scroll, autoplay stops at the last step
        // so the next scroll carries on down the page.
        if (!autoplay || !visible || (held && at === LAST)) return;
        next = gsap.delayedCall(HOLD, () => turnBy(1));
      };

      /** Turns the wheel `by` steps: positive is counter-clockwise, to the
       *  next service. */
      function turnBy(by: number, announce = false) {
        next?.kill();
        if (!by) return;
        at = (((at + by) % COUNT) + COUNT) % COUNT;
        target -= by * SPOKE;
        setStep(at);
        if (announce && live.current) live.current.textContent = `${at + 1} of ${COUNT}: ${ADS_STEPS[at].title}`;
        turnStart = performance.now();
        turnTime = TRAVEL + (Math.abs(by) - 1) * EXTRA_STEP;

        if (still()) {
          // Reduced motion: a quick cross-fade instead of the turn; the glow
          // stays where it is.
          turn = gsap.to(wheelEl, {
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
              wheel.angle = target;
              render();
              gsap.to(wheelEl, { opacity: 1, duration: 0.2 });
              scheduleNext();
            },
          });
          return;
        }
        // overwrite: a new turn takes over from wherever the wheel is.
        turn = gsap.to(wheel, {
          angle: target,
          duration: turnTime,
          ease: 'power1.inOut',
          overwrite: true,
          onUpdate: render,
          onComplete: scheduleNext,
        });
        // The glow drifts to a new random spot over the same turn.
        gsap.to(glow, {
          x: gsap.utils.random(GLOW.x[0], GLOW.x[1]),
          y: gsap.utils.random(GLOW.y[0], GLOW.y[1]),
          r: gsap.utils.random(GLOW.r[0], GLOW.r[1]),
          duration: turnTime,
          ease: 'power1.inOut',
          overwrite: true,
          onUpdate: renderGlow,
        });
      }

      api.current = {
        turnBy: (by) => turnBy(by, true),
        // The shorter way round to step `n`.
        turnTo: (n) => {
          let by = (((n - at) % COUNT) + COUNT) % COUNT;
          if (by > COUNT / 2) by -= COUNT;
          turnBy(by, true);
        },
        stopAutoplay: () => {
          autoplay = false;
          next?.kill();
        },
      };

      // ---------- Scroll hold ----------
      /** Distance (px) from the section to its resting place: centred in
       *  the viewport, or at the top if it is taller. */
      const offset = () => {
        const gap = Math.max(0, (scroller.clientHeight - el.offsetHeight) / 2);
        return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - gap;
      };
      // While held, the scroller stops scrolling natively: an in-flight smooth
      // wheel scroll or touch fling would otherwise keep moving the page past
      // the section while the wheel turns. The gutter keeps the width steady.
      const lock = (on: boolean) => {
        scroller.style.overflow = on ? 'hidden' : '';
        scroller.style.scrollbarGutter = on ? 'stable' : '';
      };
      const hold = (o: number) => {
        held = true;
        lock(true);
        pending = 0;
        scroller.scrollTop += o;
        heldAt = scroller.scrollTop;
        lastOffset = 0;
        scheduleNext();
      };
      const release = (finished: boolean) => {
        held = false;
        lock(false);
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
        if (dir > 0 && at === LAST) release(true);
        else if (dir < 0 && at === 0) release(false);
        else turnBy(dir, true);
      };

      const onWheel = (e: WheelEvent) => {
        if (done || e.ctrlKey) return;
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientHeight : 1);
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
      // Keys, scrollbar drags and touch momentum move the scroll without
      // wheel events: crossing the resting place downwards holds there;
      // while held, small moves snap back and a big jump lets go.
      const onScroll = () => {
        if (done) return;
        if (held) {
          const moved = scroller.scrollTop - heldAt;
          if (Math.abs(moved) > scroller.clientHeight / 3) release(moved > 0);
          else if (moved) scroller.scrollTop = heldAt;
          return;
        }
        const o = offset();
        if (lastOffset > 0 && o <= 0 && o > -scroller.clientHeight / 3) hold(o);
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

      scroller.addEventListener('wheel', onWheel, { passive: false });
      scroller.addEventListener('scroll', onScroll, { passive: true });
      scroller.addEventListener('touchstart', onTouchStart, { passive: true });
      scroller.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('keydown', onKey);
      lastOffset = offset();
      render();

      // Autoplay runs while the section is on screen, as the Process
      // section's does.
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) scheduleNext();
          else next?.kill();
        },
        { threshold: 0.4 },
      );
      io.observe(el);

      return () => {
        io.disconnect();
        lock(false);
        scroller.removeEventListener('wheel', onWheel);
        scroller.removeEventListener('scroll', onScroll);
        scroller.removeEventListener('touchstart', onTouchStart);
        scroller.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('keydown', onKey);
      };
    }, root);

    return () => {
      ctx.revert();
      turn?.kill();
      next?.kill();
      gsap.killTweensOf([wheel, glow]);
      api.current = undefined;
    };
  }, []);

  const stopAnd = (fn: () => void) => () => {
    api.current?.stopAutoplay();
    fn();
  };

  return (
    <section className="ads" data-lab-part="Ads" ref={root}>
      <div className="ads__frame">
        <header className="ads__heading">
          <h2 className="ads__title">We Handle All Amazon Ads Campaigns</h2>
          <p className="ads__subtitle">A Clear Plan of Action - Not Just Insights</p>
        </header>

        {/* The disc (Figma Ellipse 9), inline so its glow can move. */}
        <svg className="ads__arc" viewBox="0 0 1069.72 1069.72" aria-hidden="true">
          <defs>
            <radialGradient
              id="ads-glow-02"
              ref={glowRef}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform={glowAt(GLOW_START)}
            >
              <stop className="ads__glow-from" />
              <stop className="ads__glow-to" offset="1" />
            </radialGradient>
          </defs>
          <circle
            className="ads__disc"
            cx="534.862"
            cy="534.862"
            r="534.362"
            fill="url(#ads-glow-02)"
            onClick={() => api.current?.stopAutoplay()}
          />
        </svg>

        <ol className="ads__wheel" aria-label="Amazon Ads campaigns" ref={wheelRef}>
          {ADS_STEPS.map((s, i) => (
            <li
              key={s.title}
              className="ads__step"
              style={{ '--i': i } as CSSProperties}
              aria-current={i === step ? 'step' : undefined}
            >
              <img className="ads__ring" src={ring} width="83.496" height="83.496" alt="" />
              <p className="ads__number" aria-hidden="true">
                {i + 1}
              </p>
              <img className="ads__line" src={line} width="49.333" height="1" alt="" />
              <div className="ads__service">
                <h3 className="ads__service-title">{s.title}</h3>
                <p className="ads__service-body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <ul className="ads__keywords" aria-label="Go to a campaign">
          {ADS_STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className="ads__keyword"
                data-text={s.title}
                aria-current={i === step ? 'true' : undefined}
                onClick={stopAnd(() => api.current?.turnTo(i))}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>

        <div className="ads__arrows">
          <button
            type="button"
            className="ads__arrow ads__arrow--prev"
            aria-label="Previous campaign"
            onClick={stopAnd(() => api.current?.turnBy(-1))}
          >
            <img src={arrowPrev} width="32" height="32" alt="" />
          </button>
          <button
            type="button"
            className="ads__arrow ads__arrow--next"
            aria-label="Next campaign"
            onClick={stopAnd(() => api.current?.turnBy(1))}
          >
            <img src={arrowNext} width="32" height="32" alt="" />
          </button>
        </div>

        <p className="ads__live" aria-live="polite" ref={live}></p>
      </div>
    </section>
  );
}
