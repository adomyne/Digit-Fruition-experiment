// Mango cycle: seed -> sprout -> tree -> mango -> back to seed, on one
// paused GSAP master timeline with labels seed, sprout, tree, mango, loop.
// stage.svg and constants.json come from scripts/mango-build.py.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import C from './constants.json';

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);

const PHASES = ['seed', 'sprout', 'tree', 'mango'] as const;
const NAMES: Record<string, string> = { seed: 'Seed', sprout: 'Sprout', tree: 'Tree', mango: 'Mango' };
/** Seconds per transition as authored (the brief's starting values). The
 *  stepper plays them faster: any travel between steps takes TRAVEL. */
const DUR = { sprout: 2.6, tree: 3.6, mango: 2.8, loop: 2.0 };
/** Autoplay holds this long on each step (seconds). */
const HOLD = 2;
/** Every move from step to step takes this long, however many steps it
 *  crosses: the animation in between speeds up to fit (seconds). */
const TRAVEL = 1;
/** Growth speed inside a sub-timeline, shape units per second. */
const SPEED = 100;

type Cam = { fx: number; fy: number; s: number; r: number };
const pt = (p: readonly number[]) => `${p[0]} ${p[1]}`;
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountMangoCycle(root: HTMLElement): () => void {
  const q = <T extends Element = SVGElement>(sel: string) => root.querySelector<T>(sel)!;
  const qa = <T extends Element = SVGElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const half = C.stage / 2;

  // Camera: one hand-written transform, tweened through log(scale) so the
  // zoom speed feels even. Re-applied after every seek (seek skips onUpdate).
  const cameraEl = q('#mc-camera');
  const toCam = (c: Cam) => ({ fx: c.fx, fy: c.fy, ls: Math.log(c.s), r: c.r });
  const cam = toCam(C.cameras.seed);
  const writeCamera = () =>
    cameraEl.setAttribute(
      'transform',
      `translate(${half} ${half}) rotate(${cam.r}) scale(${Math.exp(cam.ls)}) translate(${-cam.fx} ${-cam.fy})`,
    );
  const camTo = (c: Cam, duration: number) => ({ ...toCam(c), duration, ease: 'power2.inOut', onUpdate: writeCamera });

  // Growth: white strokes along each branch's centre line, inside the
  // shape's mask, drawn at constant speed; each starts when the growth
  // front reaches its junction. A last full rect covers any slivers.
  const growth = (maskId: string) => {
    const sub = gsap.timeline({ paused: true });
    let end = 0;
    qa<SVGPathElement>(`#${maskId} .mc-grow`).forEach((p) => {
      const start = Number(p.dataset.start) / SPEED;
      const len = Number(p.dataset.length) / SPEED;
      end = Math.max(end, start + len);
      gsap.set(p, { drawSVG: '0%', opacity: 0 }); // round caps draw a dot at 0%
      sub.set(p, { opacity: 1 }, start).to(p, { drawSVG: '100%', duration: len, ease: 'none' }, start);
    });
    const fill = q(`#${maskId} .mc-grow-fill`);
    gsap.set(fill, { opacity: 0 });
    sub.to(fill, { opacity: 1, duration: end * 0.08, ease: 'none' }, end);
    return sub;
  };
  const roots = growth('mc-m-root');
  const sprout = growth('mc-m-sprout');
  const tree = growth('mc-m-tree');

  // Master time at which an eased sub-timeline drive reaches sub time t.
  const reachAt = (from: number, dur: number, sub: gsap.core.Timeline, t: number, ease: string) => {
    const e = gsap.parseEase(ease);
    const f = t / sub.duration();
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (e(mid) < f) lo = mid;
      else hi = mid;
    }
    return from + dur * lo;
  };

  // Starting poses (label "seed").
  const P = C.pivots;
  qa<SVGGElement>('.mc-tree-leaf').forEach((g) => gsap.set(g, { scale: 0, svgOrigin: g.dataset.pivot }));
  gsap.set(qa('.mc-fruit'), { scale: 0, svgOrigin: pt(P.fruitStem) });
  gsap.set('#mc-fruit-leaf', { scale: 0, rotation: -30, svgOrigin: pt(P.fruitLeafBase) });
  writeCamera();

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const grow = 'power1.inOut';
  let t = 0;

  // 1-2. Seed -> sprout: the seed wobbles, roots grow down from the seed,
  // the stem grows up and its leaves unfold; the camera eases out.
  tl.addLabel('seed', t)
    .to(cam, camTo(C.cameras.sprout, DUR.sprout), t)
    .to('#mc-seed-wobble', {
      keyframes: [{ rotation: -4 }, { rotation: 4 }, { rotation: -2.5 }, { rotation: 0 }],
      svgOrigin: pt(P.seedCentre),
      duration: 1.3,
      ease: 'sine.inOut',
    }, t)
    .to(sprout, { time: sprout.duration(), duration: DUR.sprout - 0.5, ease: grow }, t + 0.35)
    .to(roots, { time: roots.duration(), duration: DUR.sprout - 0.7, ease: grow }, t + 0.6);
  t += DUR.sprout;

  // 3. Sprout -> tree: the camera pulls back while the tree grows from the
  // ground point, trunk first, out along the branches into the leaves. The
  // sprout and seed shrink into the ground point and the roots draw back
  // into it. Loose leaves pop as their branch reaches them, then the fruits
  // swell from their stems, centre fruit last.
  const treeFrom = t + 0.35;
  const treeDur = 2.4;
  tl.addLabel('sprout', t)
    .to(cam, camTo(C.cameras.tree, 3.0), t)
    .to('#mc-sprout', { scale: 0, opacity: 0, svgOrigin: pt(P.groundInSprout), duration: 1.3, ease: 'power2.in' }, t + 0.2)
    .to('#mc-seed', { scale: 0, opacity: 0, svgOrigin: pt(P.groundInSeed), duration: 1.3, ease: 'power2.in' }, t + 0.3)
    .to(roots, { time: 0, duration: 1.4, ease: grow }, t + 0.5)
    .to(tree, { time: tree.duration(), duration: treeDur, ease: grow }, treeFrom);
  qa('.mc-tree-leaf').forEach((leaf, i) => {
    const at = reachAt(treeFrom, treeDur, tree, C.growth.treeLeaves[i] / SPEED, grow);
    tl.to(leaf, { scale: 1, duration: 0.45, ease: 'back.out(2)' }, at);
  });
  const fruits = qa('.mc-fruit');
  const hero = q('#mc-hero');
  [...fruits.filter((f) => f !== hero), hero].forEach((f, i) => {
    tl.to(f, { scale: 1, duration: 0.55, ease: 'back.out(1.7)' }, t + 2.45 + i * 0.22);
  });
  t += DUR.tree;

  // 4. Tree -> mango: the camera zooms and turns onto the centre fruit until
  // it stands upright and fills the frame; the rest of the tree fades; the
  // leaf grows from the stem.
  tl.addLabel('tree', t)
    .to(cam, camTo(C.cameras.mango, 2.4), t)
    .to('#mc-tree-rest', { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, t + 0.3)
    .to('#mc-fruit-leaf', { scale: 1, rotation: 0, duration: 1.1, ease: 'back.out(1.6)' }, t + 1.5);
  t += DUR.mango;

  // 5. Mango -> seed: the leaf falls, the highlight fades, the outline
  // morphs into the seed's (baked into the fruit's units by the build, so
  // it lands exactly where the seed sits under the seed camera), and the
  // grooves fade in. The last frame matches the first.
  tl.addLabel('mango', t)
    .to('#mc-fruit-leaf', { y: 260, rotation: 70, opacity: 0, duration: 1.1, ease: 'power1.in' }, t)
    .to('#mc-highlight', { opacity: 0, duration: 0.5, ease: 'none' }, t)
    .to('#mc-hero-outline', { morphSVG: C.morph.outline, duration: 1.3, ease: 'power2.inOut' }, t + 0.3)
    .to('#mc-grooves', { opacity: 1, duration: 0.6, ease: 'none' }, t + DUR.loop - 0.6);
  t += DUR.loop;
  tl.addLabel('loop', t);

  // ---------------------------------------------------------------- stepper
  // Four steps (seed, sprout, tree, mango). Autoplay moves the focus to the
  // next step every HOLD seconds, mango wrapping back to the seed through the
  // morph. Clicking a step plays the animation there in TRAVEL seconds,
  // through any steps in between. The focus marker follows the playhead.
  const steps = q<HTMLElement>('.mc__steps');
  const stepBtns = qa<HTMLButtonElement>('.mc__step');
  const liveEl = q<HTMLElement>('.mc__live');
  const playBtn = q<HTMLButtonElement>('[data-mc="play"]');
  const L = tl.labels;
  let at = 0; // the step the focus sits on or is travelling to
  let travel: gsap.core.Tween | undefined;
  let hold: gsap.core.Tween | undefined;
  let autoplay = true;

  // The playhead as a step position, 0 (seed) to 3 (mango); during the
  // loop morph it glides from 3 back to 0.
  const writeMarker = () => {
    const time = tl.time();
    let pos = 0;
    if (time >= L.mango) pos = 3 - (3 * (time - L.mango)) / (L.loop - L.mango);
    else
      PHASES.slice(0, 3).forEach((p, i) => {
        const end = L[PHASES[i + 1]];
        if (time >= L[p] && time < end) pos = i + (time - L[p]) / (end - L[p]);
      });
    steps.style.setProperty('--pos', pos.toFixed(4));
  };
  tl.eventCallback('onUpdate', writeMarker);

  const setActive = (i: number) => {
    at = i;
    stepBtns.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    liveEl.textContent = NAMES[PHASES[i]];
  };
  const seek = (label: string) => {
    tl.seek(label);
    writeCamera();
    writeMarker();
  };
  const arrived = () => {
    hold?.kill();
    if (autoplay) hold = gsap.delayedCall(HOLD, () => travelTo((at + 1) % PHASES.length));
  };
  /** Move to step i. From the mango (or mid-morph) the seed is reached
   *  forwards through the morph; anything else plays forwards or backwards
   *  along the timeline. `back` plays seed -> mango as the morph in reverse. */
  function travelTo(i: number, back = false) {
    travel?.kill();
    hold?.kill();
    if (back) seek('loop');
    const wrap = i === 0 && tl.time() >= L.mango;
    const to = wrap ? L.loop : L[PHASES[i]];
    setActive(i);
    if (still()) {
      // Reduced motion: jump between finished steps.
      seek(PHASES[i]);
      arrived();
      return;
    }
    travel = gsap.to(tl, {
      time: to,
      duration: TRAVEL,
      ease: 'sine.inOut',
      onComplete: () => {
        if (wrap) seek('seed');
        arrived();
      },
    });
  }
  const setAutoplay = (on: boolean) => {
    autoplay = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(on));
    hold?.kill();
    if (on && !travel?.isActive()) travelTo((at + 1) % PHASES.length);
  };

  const onStep = (e: Event) => {
    const i = stepBtns.indexOf(e.currentTarget as HTMLButtonElement);
    if (i !== at || travel?.isActive()) travelTo(i);
  };
  const onPlay = () => setAutoplay(!autoplay);
  // Arrow keys and space act while focus is inside the cycle; preventDefault
  // keeps the lab's own arrow navigation from firing too.
  const onKey = (e: KeyboardEvent) => {
    if (!root.contains(document.activeElement) || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = PHASES.length;
    if (e.key === 'ArrowRight') travelTo((at + 1) % n);
    else if (e.key === 'ArrowLeft') travelTo((at + n - 1) % n, at === 0 && !travel?.isActive());
    else if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') onPlay();
    else return;
    e.preventDefault();
    if (stepBtns.includes(document.activeElement as HTMLButtonElement)) stepBtns[at].focus();
  };
  const frame = q<HTMLElement>('.mc__frame');
  const onFrameClick = () => frame.focus();

  stepBtns.forEach((b) => b.addEventListener('click', onStep));
  playBtn.addEventListener('click', onPlay);
  frame.addEventListener('click', onFrameClick);
  document.addEventListener('keydown', onKey, { capture: true });

  seek('seed');
  setActive(0);
  arrived();

  return () => {
    travel?.kill();
    hold?.kill();
    tl.kill();
    [roots, sprout, tree].forEach((s) => s.kill());
    stepBtns.forEach((b) => b.removeEventListener('click', onStep));
    playBtn.removeEventListener('click', onPlay);
    frame.removeEventListener('click', onFrameClick);
    document.removeEventListener('keydown', onKey, { capture: true });
  };
}
