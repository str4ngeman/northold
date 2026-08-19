"use client";

import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from "three";

import { SEAMS } from "@/lib/seams";

/**
 * One drill core, turning slowly under a lamp. The only 3D on the site — it
 * earns its place because the product is literally a sample of ground you
 * decided to commit to.
 */

const BANDS: { at: number; height: number; color: string }[] = [
  { at: 0.02, height: 0.06, color: SEAMS[0].color },
  { at: 0.34, height: 0.1, color: SEAMS[1].color },
  { at: 0.78, height: 0.14, color: SEAMS[2].color },
];

function coreTexture() {
  const w = 256;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);

  ctx.fillStyle = "#211f1c";
  ctx.fillRect(0, 0, w, h);

  // rock: stacked strata of slightly different greys, thickness varying
  let y = 0;
  let seed = 8;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  while (y < h) {
    const band = 6 + rand() * 34;
    const v = 26 + rand() * 42;
    ctx.fillStyle = `rgb(${v + 6},${v + 2},${Math.max(0, v - 4)})`;
    ctx.fillRect(0, y, w, band);
    y += band;
  }

  // speckle — mineral grains catching the light
  for (let i = 0; i < 5200; i++) {
    const gx = rand() * w;
    const gy = rand() * h;
    const s = rand();
    ctx.fillStyle = s > 0.92 ? "rgba(237,231,220,0.5)" : `rgba(${120 + s * 70},${110 + s * 60},${90 + s * 50},0.35)`;
    ctx.fillRect(gx, gy, 1 + s * 1.6, 1 + s * 1.2);
  }

  // seam bands
  for (const band of BANDS) {
    const by = band.at * h;
    const bh = band.height * h;
    ctx.fillStyle = band.color;
    ctx.globalAlpha = 0.62;
    ctx.fillRect(0, by, w, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(11,11,12,0.55)";
    ctx.fillRect(0, by, w, 2);
    ctx.fillRect(0, by + bh - 2, w, 2);
    for (let i = 0; i < 900; i++) {
      const gx = rand() * w;
      const gy = by + rand() * bh;
      ctx.fillStyle = "rgba(11,11,12,0.35)";
      ctx.fillRect(gx, gy, 1.4, 1.4);
    }
  }

  // depth ticks scored down one side
  ctx.fillStyle = "rgba(237,231,220,0.28)";
  for (let i = 1; i < 24; i++) {
    const ty = (i / 24) * h;
    ctx.fillRect(0, ty, i % 4 === 0 ? 26 : 13, 1.4);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

export function CoreSample({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = () => ({ w: host.clientWidth || 320, h: host.clientHeight || 420 });
    const first = size();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(first.w, first.h, false);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(26, first.w / first.h, 0.1, 40);
    camera.position.set(0, 0.2, 10.6);
    camera.lookAt(0, 0, 0);

    const rig = new Group();
    rig.rotation.z = 0.075;
    scene.add(rig);

    const texture = coreTexture();
    const core = new Mesh(
      new CylinderGeometry(0.55, 0.55, 4.6, 48, 1, false),
      new MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.12 }),
    );
    rig.add(core);

    const caps = new Mesh(
      new CylinderGeometry(0.575, 0.575, 0.06, 48),
      new MeshStandardMaterial({ color: 0x2a2823, roughness: 0.5, metalness: 0.6 }),
    );
    caps.position.y = 2.33;
    rig.add(caps);
    const capB = caps.clone();
    capB.position.y = -2.33;
    rig.add(capB);

    // three collar rings marking the seam boundaries on the outside of the tube
    BANDS.forEach((band) => {
      const ring = new Mesh(
        new TorusGeometry(0.6, 0.008, 6, 64),
        new MeshBasicMaterial({ color: band.color }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.3 - (band.at + band.height / 2) * 4.6;
      rig.add(ring);
    });

    scene.add(new HemisphereLight(0x8a94a8, 0x0b0b0c, 0.85));
    const key = new DirectionalLight(0xfff2dd, 2.4);
    key.position.set(3, 4, 4);
    scene.add(key);
    const rim = new PointLight(0xc9f227, 14, 12, 2);
    rim.position.set(-2.6, -1, -2);
    scene.add(rim);

    const pointer = { x: 0, tx: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    };
    host.addEventListener("pointermove", onMove);

    const ro = new ResizeObserver(() => {
      const { w, h } = size();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    let t = 0;
    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      if (!still) {
        rig.rotation.y += dt * 0.34;
        rig.position.y = Math.sin(t * 0.6) * 0.045;
      }
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      rig.rotation.x = pointer.x * 0.12;
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      host.removeEventListener("pointermove", onMove);
      ro.disconnect();
      texture.dispose();
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}

export default CoreSample;
