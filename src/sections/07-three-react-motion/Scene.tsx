import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './Scene.css';

// Motion owns the copy's transform/opacity; Three.js owns everything inside
// the canvas. Nothing is animated by both.
const EASE = [0.25, 1, 0.5, 1] as const; // power3.out, as in the hero

export default function Scene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // Three.js is about 150 KB gzipped, so it loads after the copy is on
  // screen instead of in the island's first bundle.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    import('three').then((THREE) => {
      if (cancelled) return;
      const css = getComputedStyle(el);
      const token = (name: string) => new THREE.Color(css.getPropertyValue(name).trim());

      const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 6);

      const geometry = new THREE.TorusKnotGeometry(1, 0.32, 200, 24);
      const material = new THREE.MeshStandardMaterial({
        color: token('--color-accent'),
        roughness: 0.35,
        metalness: 0.1,
      });
      const knot = new THREE.Mesh(geometry, material);
      scene.add(knot);
      scene.add(new THREE.AmbientLight(token('--color-on-accent'), 0.6));
      const key = new THREE.DirectionalLight(token('--color-on-accent'), 2.2);
      key.position.set(3, 4, 5);
      scene.add(key);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = el;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();

      if (!reduce) {
        renderer.setAnimationLoop((ms) => {
          const t = ms / 1000;
          knot.rotation.x = t * 0.25;
          knot.rotation.y = t * 0.4;
          renderer.render(scene, camera);
        });
      }

      cleanup = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduce]);

  const enter = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  return (
    <div className="three-stage" data-sandbox="07-three-react-motion">
      <canvas ref={canvas} className="three-canvas" aria-hidden="true" />
      <div className="three-copy">
        <motion.h1 className="three-title" {...enter(0.1)}>
          Three.js + Motion
        </motion.h1>
        <motion.p className="three-sub" {...enter(0.25)}>
          A WebGL scene from Three.js, with the text animated by Motion.
        </motion.p>
      </div>
    </div>
  );
}
