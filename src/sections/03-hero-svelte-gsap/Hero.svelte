<script lang="ts">
  // Hero rebuilt in Svelte 5 + GSAP (learning-order step 3). Same markup,
  // CSS, assets, chart data and motion spec as the baseline (02); only the
  // framework changes. See notes.md.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import {
    AXIS_TICKS,
    AXIS_MAX,
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

  // Reduced motion: hover and live mode jump straight to their end values
  // instead of tweening. Checked at each call, so a changed setting applies at once.
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let root: HTMLDivElement;
  let plot: HTMLDivElement;
  let salesPath: SVGPathElement;
  let acosPath: SVGPathElement;
  let guide: HTMLDivElement;
  let dot: HTMLDivElement;
  let live = $state(false);

  // Current series (live mode mutates these) and the highlight position.
  // Plain objects, not $state: GSAP writes them every frame and the DOM is
  // updated directly, so Svelte never needs to re-render for them.
  let series: { sales: Point[]; acos: Point[] } = { sales: [...sales], acos: [...acos] };
  const highlight = { x: HIGHLIGHT_X };

  function placeHighlight() {
    const x = highlight.x;
    const y = valueAt(series.acos, x);
    guide.style.left = `${x * 100}%`;
    dot.style.left = `${x * 100}%`;
    dot.style.top = `${(1 - y / AXIS_MAX) * 100}%`;
  }

  // Intro timeline and chart hover, all inside one gsap.context so a single
  // revert() kills it on destroy.
  onMount(() => {
    const ctx = gsap.context(() => {
      placeHighlight();
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const lines = [salesPath, acosPath];
        lines.forEach((p) => {
          const len = p.getTotalLength();
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });

        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero__logo, .hero__nav, .hero__tools > *', { y: -16, autoAlpha: 0, duration: 0.6, stagger: 0.08 })
          .from('.hero__amazon', { y: 28, autoAlpha: 0, duration: 0.8 }, 0.15)
          .from('.hero__title-word', { y: 28, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.3)
          .from('.hero__sub', { y: 16, autoAlpha: 0, duration: 0.7 }, 0.6)
          .from('.hero__cta', { y: 12, scale: 0.96, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, 0.75)
          .from('.hero__metric', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.9)
          .from('.hero__axis span, .hero__dates span', { autoAlpha: 0, duration: 0.4, stagger: 0.02 }, 1)
          .to(lines, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.15 }, 1.05)
          .from(guide, { scaleY: 0, transformOrigin: 'bottom', duration: 0.5 }, 2.3)
          .from(dot, { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 2.5)
          .from('.hero__live, .hero__foot', { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 2.2)
          .add(() => lines.forEach((p) => gsap.set(p, { clearProps: 'strokeDasharray,strokeDashoffset' })));
      });

      // Hover: the guide and dot follow the pointer along the ACOS line,
      // then settle back on Dec 2.
      const follow = (x: number, duration: number) =>
        gsap.to(highlight, { x, duration: still() ? 0 : duration, ease: 'power3.out', overwrite: true, onUpdate: placeHighlight });
      const onMove = (e: PointerEvent) => {
        const r = plot.getBoundingClientRect();
        follow(gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width), 0.35);
      };
      const onLeave = () => follow(HIGHLIGHT_X, 0.6);
      plot.addEventListener('pointermove', onMove);
      plot.addEventListener('pointerleave', onLeave);
      return () => {
        plot.removeEventListener('pointermove', onMove);
        plot.removeEventListener('pointerleave', onLeave);
      };
    }, root);
    return () => ctx.revert();
  });

  // Live mode: every tick the lines drift toward a new noisy version of the
  // traced data. The interval and tween die on toggle-off and on destroy.
  $effect(() => {
    if (!live) return;
    let tween: gsap.core.Tween | undefined;
    const jitter = (base: Point[], amount: number): Point[] =>
      base.map(([x, y]) => [x, Math.max(0, y + gsap.utils.random(-amount, amount))]);

    const tick = () => {
      const from = series;
      const to = { sales: jitter(sales, 2.5), acos: jitter(acos, 1.5) };
      const mix = { t: 0 };
      const lerp = (a: Point[], b: Point[]) => a.map(([x, y], i): Point => [x, y + (b[i][1] - y) * mix.t]);
      tween = gsap.to(mix, {
        t: 1,
        duration: still() ? 0 : 1.1,
        ease: 'sine.inOut',
        onUpdate: () => {
          series = { sales: lerp(from.sales, to.sales), acos: lerp(from.acos, to.acos) };
          salesPath.setAttribute('d', toPath(series.sales));
          acosPath.setAttribute('d', toPath(series.acos));
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
  });
</script>

{#snippet chevron()}<img src={chevronDown} width="14" height="14" alt="" />{/snippet}

<div class="hero" data-sandbox="03-hero-svelte-gsap" bind:this={root}>
  <header class="hero__header">
    <div class="hero__brand">
      <a class="hero__logo" href="#top" aria-label="Digit Fruition home">
        <img src={dfLogo} width="108" height="37" alt="Digit Fruition" />
      </a>
      <nav class="hero__nav" aria-label="Main">
        {#each NAV as item, i (item)}
          <a href="#top" class="hero__nav-item" aria-current={i === 0 ? 'page' : undefined}>{item}</a>
        {/each}
      </nav>
    </div>
    <div class="hero__tools">
      <button type="button" class="hero__lang">
        <img src={globe} width="17" height="17" alt="" /> EN {@render chevron()}
      </button>
      <a href="#top" class="hero__audit">
        <img src={download} width="17" height="17" alt="" /> Get a Free Audit
      </a>
    </div>
  </header>

  <section class="hero__main">
    <h1 class="hero__title">
      <img class="hero__amazon" src={amazonLogo} width="246.19" height="83.28" alt="amazon" />
      <span class="hero__title-words">
        <span class="hero__title-word">PPC</span>
        <span class="hero__title-word">Agency</span>
      </span>
    </h1>

    <p class="hero__sub">
      We help Amazon brands scale to $1M in monthly revenue with a custom ad strategy at a sustainable TACOS.
    </p>

    <a href="#top" class="hero__cta">
      <!-- Figma clips the 33.6px glyph to a 28px box, offset by -2.8px. -->
      <span class="hero__phone"><img src={phoneCall} width="33.6" height="33.6" alt="" /></span>
      Book a Discovery Call
    </a>

    <div class="hero__chart">
      <div class="hero__metrics">
        {#each metrics as m (m.label)}
          <div class="hero__metric" class:hero__metric--accent={m.bar === 'accent'} class:hero__metric--accent-light={m.bar === 'accent-light'}>
            <span class="hero__metric-label">
              {m.label} {@render chevron()} <img src={infoCircle} width="18" height="18" alt="" />
            </span>
            <strong class="hero__metric-value">{m.value}</strong>
          </div>
        {/each}
      </div>

      <div class="hero__graph">
        <div class="hero__axis-col" aria-hidden="true">
          <div class="hero__axis hero__axis--left">
            {#each AXIS_TICKS as t (t)}<span style:--t={t}>€{t ? `${t}K` : 0}</span>{/each}
          </div>
        </div>
        <div class="hero__plot" bind:this={plot}>
          <div class="hero__guide" bind:this={guide} aria-hidden="true"></div>
          <div class="hero__plot-area">
            <div class="hero__grid" aria-hidden="true">
              {#each AXIS_TICKS as t (t)}<i style:--t={t}></i>{/each}
            </div>
            <svg class="hero__lines" viewBox="0 0 1000 250" preserveAspectRatio="none" role="img" aria-label="Sales and ACOS from Oct 15 to Dec 29">
              <path bind:this={salesPath} class="hero__line--sales" d={toPath(sales)} vector-effect="non-scaling-stroke" />
              <path bind:this={acosPath} class="hero__line--acos" d={toPath(acos)} vector-effect="non-scaling-stroke" />
            </svg>
            <div class="hero__dot" bind:this={dot} aria-hidden="true"></div>
          </div>
        </div>
        <div class="hero__axis-col" aria-hidden="true">
          <div class="hero__axis hero__axis--right">
            {#each AXIS_TICKS as t (t)}<span style:--t={t}>{t}%</span>{/each}
          </div>
        </div>
      </div>

      <div class="hero__dates" aria-hidden="true">
        <span>Oct 15</span>
        <span style:--at={HIGHLIGHT_X}>Dec 2</span>
        <span>Dec 29</span>
      </div>
    </div>

    <button type="button" class="hero__live" aria-pressed={live} onclick={() => (live = !live)}>
      {live ? 'Stop live mode' : 'Live mode'}
    </button>

    <p class="hero__foot">
      Unlike the big guys, we only work with a select few brands, giving you the VIP treatment with laser-focused
      attention to detail.
    </p>
  </section>
</div>
