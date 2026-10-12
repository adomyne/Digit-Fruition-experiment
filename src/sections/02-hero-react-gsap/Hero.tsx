import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
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
import './Hero.css';

const NAV = ['Home', 'Services', 'About', 'Resources', 'Contact Us'];

/** Places an axis label or gridline at its tick value (see .hero__axis span). */
const tick = (t: number) => ({ '--t': t }) as CSSProperties;

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const salesPath = useRef<SVGPathElement>(null);
  const acosPath = useRef<SVGPathElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  // Current series (live mode mutates these) and the highlight position.
  const series = useRef<{ sales: Point[]; acos: Point[] }>({ sales: [...sales], acos: [...acos] });
  const highlight = useRef({ x: HIGHLIGHT_X });

  const placeHighlight = () => {
    const x = highlight.current.x;
    const y = valueAt(series.current.acos, x);
    if (guide.current) guide.current.style.left = `${x * 100}%`;
    if (dot.current) {
      dot.current.style.left = `${x * 100}%`;
      dot.current.style.top = `${(1 - y / AXIS_MAX) * 100}%`;
    }
  };

  // Intro timeline and chart hover. Everything is created inside one
  // gsap.context so a single revert() kills it all on unmount.
  useEffect(() => {
    const ctx = gsap.context(() => {
      placeHighlight();
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const lines = [salesPath.current, acosPath.current].filter(Boolean) as SVGPathElement[];
        lines.forEach((p) => {
          const len = p.getTotalLength();
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });

        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero__logo, .hero__nav, .hero__tools > *', { y: -16, autoAlpha: 0, duration: 0.6, stagger: 0.08 })
          .from('.hero__amazon-word', { y: 28, autoAlpha: 0, duration: 0.8 }, 0.15)
          .fromTo(
            '.hero__smile path',
            { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' },
            0.55,
          )
          .from('.hero__title-word', { y: 28, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.3)
          .from('.hero__sub', { y: 16, autoAlpha: 0, duration: 0.7 }, 0.6)
          .from('.hero__cta', { y: 12, scale: 0.96, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, 0.75)
          .from('.hero__metric', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.9)
          .from('.hero__axis span, .hero__dates span', { autoAlpha: 0, duration: 0.4, stagger: 0.02 }, 1)
          .to(lines, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.15 }, 1.05)
          .from(guide.current, { scaleY: 0, transformOrigin: 'bottom', duration: 0.5 }, 2.3)
          .from(dot.current, { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 2.5)
          .from('.hero__live, .hero__foot', { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 2.2)
          .add(() => lines.forEach((p) => gsap.set(p, { clearProps: 'strokeDasharray,strokeDashoffset' })));
      });

      // Hover: the guide and dot follow the pointer along the ACOS line,
      // then settle back on Dec 2.
      const el = plot.current;
      if (!el) return;
      const follow = (x: number, duration: number) =>
        gsap.to(highlight.current, { x, duration, ease: 'power3.out', overwrite: true, onUpdate: placeHighlight });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        follow(gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width), 0.35);
      };
      const onLeave = () => follow(HIGHLIGHT_X, 0.6);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    }, root);
    return () => ctx.revert();
  }, []);

  // Live mode: every tick the lines drift toward a new noisy version of the
  // traced data. One tween at a time; the interval and tween die on toggle-off
  // and on unmount.
  useEffect(() => {
    if (!live) return;
    let tween: gsap.core.Tween | undefined;
    const jitter = (base: Point[], amount: number): Point[] =>
      base.map(([x, y]) => [x, Math.max(0, y + gsap.utils.random(-amount, amount))]);

    const tick = () => {
      const from = series.current;
      const to = { sales: jitter(sales, 2.5), acos: jitter(acos, 1.5) };
      const mix = { t: 0 };
      const lerp = (a: Point[], b: Point[]) =>
        a.map(([x, y], i): Point => [x, y + (b[i][1] - y) * mix.t]);
      tween = gsap.to(mix, {
        t: 1,
        duration: 1.1,
        ease: 'sine.inOut',
        onUpdate: () => {
          series.current = { sales: lerp(from.sales, to.sales), acos: lerp(from.acos, to.acos) };
          salesPath.current?.setAttribute('d', toPath(series.current.sales));
          acosPath.current?.setAttribute('d', toPath(series.current.acos));
          placeHighlight();
        },
      });
    };
    tick();
    const id = window.setInterval(tick, 1400);
    return () => {
      window.clearInterval(id);
      tween?.kill();
    };
  }, [live]);

  return (
    <div className="hero" ref={root}>
      <header className="hero__header">
        <div className="hero__brand">
          <a className="hero__logo" href="#" aria-label="Digit Fruition home">
            <span className="hero__logo-digit">DIGIT</span>
            <span className="hero__logo-fruition">Fruition</span>
          </a>
          <nav className="hero__nav" aria-label="Main">
            {NAV.map((item, i) => (
              <a key={item} href="#" className="hero__nav-item" aria-current={i === 0 ? 'page' : undefined}>
                {item}
              </a>
            ))}
          </nav>
        </div>
        <div className="hero__tools">
          <button type="button" className="hero__lang">
            <GlobeIcon /> EN <ChevronIcon />
          </button>
          <a href="#" className="hero__audit">
            <DownloadIcon /> Get a Free Audit
          </a>
        </div>
      </header>

      <section className="hero__main">
        <h1 className="hero__title">
          <span className="hero__amazon">
            <span className="hero__amazon-word">amazon</span>
            <svg className="hero__smile" viewBox="0 0 120 26" aria-hidden="true">
              <path d="M4 6 Q58 34 110 8" pathLength={1} />
              <path d="M100 4 L111 7.5 L106 18" pathLength={1} />
            </svg>
          </span>
          <span className="hero__title-words">
            <span className="hero__title-word">PPC</span>
            <span className="hero__title-word">Agency</span>
          </span>
        </h1>

        <p className="hero__sub">
          We help Amazon brands scale to $1M in monthly revenue with a custom ad strategy at a sustainable
          TACOS.
        </p>

        <a href="#" className="hero__cta">
          <PhoneIcon /> Book a Discovery Call
        </a>

        <div className="hero__chart">
          <div className="hero__metrics">
            {metrics.map((m) => (
              <div key={m.label} className={`hero__metric${m.bar ? ` hero__metric--${m.bar}` : ''}`}>
                <span className="hero__metric-label">
                  {m.label} <ChevronIcon /> <InfoIcon />
                </span>
                <strong className="hero__metric-value">{m.value}</strong>
              </div>
            ))}
          </div>

          <div className="hero__graph">
            <div className="hero__axis-col" aria-hidden="true">
              <div className="hero__axis hero__axis--left">
                {AXIS_TICKS.map((t) => (
                  <span key={t} style={tick(t)}>€{t ? `${t}K` : 0}</span>
                ))}
              </div>
            </div>
            <div className="hero__plot" ref={plot}>
              <div className="hero__guide" ref={guide} aria-hidden="true" />
              <div className="hero__plot-area">
                <div className="hero__grid" aria-hidden="true">
                  {AXIS_TICKS.map((t) => (
                    <i key={t} style={tick(t)} />
                  ))}
                </div>
                <svg className="hero__lines" viewBox="0 0 1000 250" preserveAspectRatio="none" role="img" aria-label="Sales and ACOS from Oct 15 to Dec 29">
                  <path ref={salesPath} className="hero__line--sales" d={toPath(sales)} vectorEffect="non-scaling-stroke" />
                  <path ref={acosPath} className="hero__line--acos" d={toPath(acos)} vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="hero__dot" ref={dot} aria-hidden="true" />
              </div>
            </div>
            <div className="hero__axis-col" aria-hidden="true">
              <div className="hero__axis hero__axis--right">
                {AXIS_TICKS.map((t) => (
                  <span key={t} style={tick(t)}>{t}%</span>
                ))}
              </div>
            </div>
          </div>

          <div className="hero__dates" aria-hidden="true">
            <span>Oct 15</span>
            <span style={{ '--at': HIGHLIGHT_X } as CSSProperties}>Dec 2</span>
            <span>Dec 29</span>
          </div>
        </div>

        <button type="button" className="hero__live" aria-pressed={live} onClick={() => setLive((v) => !v)}>
          {live ? 'Stop live mode' : 'Live mode'}
        </button>

        <p className="hero__foot">
          Unlike the big guys, we only work with a select few brands, giving you the VIP treatment with
          laser-focused attention to detail.
        </p>
      </section>
    </div>
  );
}

/* Icons: stand-ins drawn here until the Figma SVGs can be downloaded
   (globe-2, chevron-down, download, bxs:info-circle, bxs:phone-call). */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="hero__icon-sm" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.3" />
      <path d="M2 8h12M8 1.7c2 2 2 10.6 0 12.6M8 1.7c-2 2-2 10.6 0 12.6" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 10 10" className="hero__icon-xs" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 3.5 5 6.5 8 3.5" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="hero__icon-sm" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5M2.5 11v2.5h11V11" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="hero__info">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 7v4.5M8 4.6v.2" stroke="var(--color-on-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="hero__phone">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
      <path d="M15 3.5a6 6 0 0 1 5.5 5.5M15 7a2.5 2.5 0 0 1 2 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
