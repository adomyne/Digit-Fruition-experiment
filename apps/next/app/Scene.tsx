'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import * as THREE from 'three';

// Three.js owns the canvas, Motion owns the DOM copy.
const EASE = [0.25, 1, 0.5, 1] as const;

export default function Scene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const css = getComputedStyle(el);
    const token = (name: string) => new THREE.Color(css.getPropertyValue(name).trim());

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const geometry = new THREE.IcosahedronGeometry(1.4, 1);
    const material = new THREE.MeshStandardMaterial({ color: token('--color-accent'), flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    scene.add(new THREE.AmbientLight(token('--color-on-accent'), 0.6));
    const key = new THREE.DirectionalLight(token('--color-on-accent'), 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    if (!reduce) {
      renderer.setAnimationLoop((ms) => {
        const t = ms / 1000;
        mesh.rotation.x = t * 0.2;
        mesh.rotation.y = t * 0.35;
        renderer.render(scene, camera);
      });
    }

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
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
    <main className="stage">
      <canvas ref={canvas} className="canvas" aria-hidden="true" />
      <div className="copy">
        <motion.h1 className="title" {...enter(0.1)}>
          Next.js + Three.js
        </motion.h1>
        <motion.p className="sub" {...enter(0.25)}>
          A Next.js App Router spike with a Three.js scene and Motion text.
        </motion.p>
      </div>
    </main>
  );
}
