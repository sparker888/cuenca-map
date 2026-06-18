// Subtle, reactive Andes topography backdrop (Three.js).
// A slowly-drifting wireframe mountain mesh that fades into the dark background
// and tilts gently toward the cursor. Sits BEHIND text — low contrast — and
// honors prefers-reduced-motion.
import * as THREE from "three";

interface AndesOpts { color?: number; bg?: number; amp?: number; }

export function initAndes(canvas: HTMLCanvasElement, opts: AndesOpts = {}) {
  const color = opts.color ?? 0x3f72b5;
  const bg = opts.bg ?? 0x0e1a2e;
  const AMP = opts.amp ?? 7;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(bg, 60, 165);

  const camera = new THREE.PerspectiveCamera(58, 1, 1, 400);
  camera.position.set(0, 26, 64);
  camera.lookAt(0, -4, -30);

  const SX = 120, SY = 90, W = 280, H = 220;
  const geo = new THREE.PlaneGeometry(W, H, SX, SY);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = (pos.array as Float32Array).slice();

  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.26 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  function elevation(x: number, z: number, t: number) {
    let n = Math.sin(x * 0.045 + t * 0.18) * Math.cos(z * 0.05 - t * 0.12);
    n += 0.55 * Math.sin(x * 0.11 - z * 0.07 + t * 0.22);
    n += 0.25 * Math.cos(x * 0.21 + z * 0.17 - t * 0.15);
    const ridge = 1 - Math.abs(n) * 0.55;
    const depth = (z + H / 2) / H;
    return ridge * AMP * (0.35 + depth * 1.1);
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX / window.innerWidth - 0.5;
    pointer.ty = e.clientY / window.innerHeight - 0.5;
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let t = 0;
  function frame() {
    t += reduce ? 0 : 0.016;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      arr[i * 3 + 1] = elevation(base[i * 3], base[i * 3 + 2], t);
    }
    pos.needsUpdate = true;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.x = pointer.x * 14;
    camera.position.y = 26 - pointer.y * 6;
    camera.lookAt(0, -4, -30);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
