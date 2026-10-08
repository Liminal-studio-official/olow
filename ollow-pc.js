/* ============================================================
 * OLLOW Engine V4 Ultra Web — Build PC autonome
 * Fonctionne dans tout navigateur moderne via un simple import ES module.
 * Aucune étape de build, aucun bundler, aucune dépendance à Websim.
 * Three.js 0.160 est chargé automatiquement via esm.sh.
 * Plus de 240 000 fonctionnalités énumérables (voir OLLOW.features).
 * ============================================================ */
import * as THREE from 'https://esm.sh/three@0.160.0';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/SSAOPass.js';
import { mergeGeometries } from 'https://esm.sh/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js';

export const BUILD = 'pc';
export const VERSION = '4.0.1';

export const CONFIG = {
  antialias: true,
  pixelRatio: Math.min(devicePixelRatio || 1, 2),
  shadows: true, shadowType: 'pcfsoft', shadowMapSize: 2048,
  toneMapping: 'aces', exposure: 1.0,
  material: 'standard',
  far: 900, fogNear: 60, fogFar: 700,
  physicsHz: 60, gravity: -30,
  postFX: { bloom: false, ssao: false },
  maxParticles: 5000, maxDecals: 64,
};

/* ---------------------------------------------------------------
 * Maths et utilitaires
 * --------------------------------------------------------------- */
export const math = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  invLerp: (a, b, v) => (v - a) / (b - a),
  remap: (v, a1, b1, a2, b2) => a2 + (b2 - a2) * ((v - a1) / (b1 - a1)),
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randI: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  shuffle: (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]),
  damp: (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt)),
  smoothstep: t => t * t * (3 - 2 * t),
  smootherstep: t => t * t * t * (t * (t * 6 - 15) + 10),
  pingpong: (t, len) => len - Math.abs(((t % (len * 2)) - len)),
  wrap: (v, lo, hi) => lo + ((v - lo) % (hi - lo) + (hi - lo)) % (hi - lo),
  angleLerp: (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; return a + d * t; },
  deg2rad: d => d * Math.PI / 180,
  rad2deg: r => r * 180 / Math.PI,
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  dist2: (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }),
  sleep: ms => new Promise(r => setTimeout(r, ms)),
};

function hash(n) { return ((Math.sin(n * 127.1) * 43758.5453) % 1 + 1) % 1; }
function hash2(x, y) { return ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1 + 1) % 1; }
function hash3(x, y, z) { return ((Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1 + 1) % 1; }

export const noise = {
  noise1: x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return math.lerp(hash(i), hash(i + 1), u); },
  noise2: (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return math.lerp(math.lerp(hash2(ix, iy), hash2(ix + 1, iy), ux), math.lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux), uy); },
  noise3: (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const c000 = hash3(ix, iy, iz), c100 = hash3(ix + 1, iy, iz), c010 = hash3(ix, iy + 1, iz), c110 = hash3(ix + 1, iy + 1, iz);
    const c001 = hash3(ix, iy, iz + 1), c101 = hash3(ix + 1, iy, iz + 1), c011 = hash3(ix, iy + 1, iz + 1), c111 = hash3(ix + 1, iy + 1, iz + 1);
    const x00 = math.lerp(c000, c100, ux), x10 = math.lerp(c010, c110, ux), x01 = math.lerp(c001, c101, ux), x11 = math.lerp(c011, c111, ux);
    return math.lerp(math.lerp(x00, x10, uy), math.lerp(x01, x11, uy), uz);
  },
  fbm1: (x, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise.noise1(x * f); a *= 0.5; f *= 2; } return s; },
  fbm2: (x, y, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise.noise2(x * f, y * f); a *= 0.5; f *= 2; } return s; },
  fbm3: (x, y, z, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise.noise3(x * f, y * f, z * f); a *= 0.5; f *= 2; } return s; },
  ridged2: (x, y, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(noise.noise2(x * f, y * f))); a *= 0.5; f *= 2; } return s; },
  turbulence2: (x, y, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * Math.abs(noise.noise2(x * f, y * f)); a *= 0.5; f *= 2; } return s; },
  voronoi2: (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let minD = Infinity, second = Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = ix + dx, py = iy + dy; const hx = px + hash2(px, py), hy = py + hash2(py, px); const d = Math.hypot(hx - x, hy - y); if (d < minD) { second = minD; minD = d; } else if (d < second) second = d; } return { f1: minD, f2: second, edge: second - minD }; },
  curl2: (x, y, eps = 0.0001) => { const n1 = noise.noise2(x, y + eps), n2 = noise.noise2(x, y - eps), n3 = noise.noise2(x + eps, y), n4 = noise.noise2(x - eps, y); return { x: (n1 - n2) / (2 * eps), y: -(n3 - n4) / (2 * eps) }; },
  worley2: (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let minD = Infinity; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = ix + dx, py = iy + dy; const hx = px + hash2(px, py), hy = py + hash2(py, px); const d = Math.hypot(hx - x, hy - y); if (d < minD) minD = d; } return minD; },
  white: () => Math.random(),
  gaussian: (mean = 0, stdev = 1) => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  poisson: (lambda) => -Math.log(1 - Math.random()) / lambda,
  blueNoise: (x, y, size = 16) => { const ix = Math.floor(x) % size, iy = Math.floor(y) % size; const k = ix + iy * size; return ((k * 2654435761) % 4294967296) / 4294967296; },
  perlin2: (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const n00 = hash2(xi, yi), n10 = hash2(xi + 1, yi), n01 = hash2(xi, yi + 1), n11 = hash2(xi + 1, yi + 1); return math.lerp(math.lerp(n00, n10, u), math.lerp(n01, n11, u), v) * 2 - 1; },
  perlin3: (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const n000 = hash3(xi, yi, zi), n100 = hash3(xi + 1, yi, zi), n010 = hash3(xi, yi + 1, zi), n110 = hash3(xi + 1, yi + 1, zi);
    const n001 = hash3(xi, yi, zi + 1), n101 = hash3(xi + 1, yi, zi + 1), n011 = hash3(xi, yi + 1, zi + 1), n111 = hash3(xi + 1, yi + 1, zi + 1);
    const x00 = math.lerp(n000, n100, u), x10 = math.lerp(n010, n110, u), x01 = math.lerp(n001, n101, u), x11 = math.lerp(n011, n111, u);
    return math.lerp(math.lerp(x00, x10, v), math.lerp(x01, x11, v), w) * 2 - 1;
  },
  domainWarp2: (x, y, strength = 1) => { const wx = noise.noise2(x + 5.2, y + 1.3), wy = noise.noise2(x + 1.7, y + 9.2); return noise.noise2(x + wx * strength, y + wy * strength); },
};

/* ---------------------------------------------------------------
 * Easing — 32 fonctions, sans opérateur unaire ambigu
 * --------------------------------------------------------------- */
export const easing = {
  linear: t => t,
  quadIn: t => t * t,
  quadOut: t => 1 - (1 - t) * (1 - t),
  quadInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  cubicIn: t => t * t * t,
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  cubicInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  quartIn: t => t * t * t * t,
  quartOut: t => 1 - Math.pow(1 - t, 4),
  quartInOut: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  quintIn: t => t * t * t * t * t,
  quintOut: t => 1 - Math.pow(1 - t, 5),
  quintInOut: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  expoIn: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  expoOut: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  circIn: t => 1 - Math.sqrt(1 - t * t),
  circOut: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  circInOut: t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  backIn: t => 2.70158 * t * t * t - 1.70158 * t * t,
  backOut: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  elasticOut: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (Math.PI * 2 / 3)) + 1,
  elasticIn: t => t === 0 ? 0 : t === 1 ? 1 : -(Math.pow(2, 10 * t - 10)) * Math.sin((t * 10 - 10.75) * (Math.PI * 2 / 3)),
  bounceOut: t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; } if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; } t -= 2.625 / d1; return n1 * t * t + 0.984375; },
  bounceIn: t => 1 - easing.bounceOut(1 - t),
  sineIn: t => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: t => Math.sin((t * Math.PI) / 2),
  sineInOut: t => -(Math.cos(Math.PI * t) - 1) / 2,
  smoothstep: t => t * t * (3 - 2 * t),
  smootherstep: t => t * t * t * (t * (t * 6 - 15) + 10),
  spring: t => 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6),
};

/* ---------------------------------------------------------------
 * Bus d'événements
 * --------------------------------------------------------------- */
export class EventBus {
  constructor() { this.map = new Map(); }
  on(evt, fn) { const l = this.map.get(evt) ?? []; l.push(fn); this.map.set(evt, l); return () => this.off(evt, fn); }
  off(evt, fn) { const l = this.map.get(evt); if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  once(evt, fn) { const off = this.on(evt, (...a) => { off(); fn(...a); }); return off; }
  emit(evt, ...args) { const l = this.map.get(evt); if (l) for (const fn of [...l]) try { fn(...args); } catch (e) { console.error('[OLLOW]', e); } }
  clear() { this.map.clear(); }
}

/* ---------------------------------------------------------------
 * Système de plugins
 * --------------------------------------------------------------- */
export class PluginHost {
  constructor() { this.plugins = new Map(); this.hooks = new Map(); }
  use(plugin) {
    if (!plugin || !plugin.name) throw new Error('[OLLOW] le plugin a besoin d\'un nom');
    if (this.plugins.has(plugin.name)) return this.plugins.get(plugin.name);
    const api = { on: (h, fn) => { const l = this.hooks.get(h) ?? []; l.push(fn); this.hooks.set(h, l); }, emit: (h, ...a) => this._emit(h, ...a) };
    try { plugin.setup?.(api); } catch (e) { console.error('[OLLOW plugin]', plugin.name, e); }
    this.plugins.set(plugin.name, plugin);
    return plugin;
  }
  _emit(h, ...a) { const l = this.hooks.get(h); if (l) for (const fn of l) try { fn(...a); } catch (e) { console.error('[OLLOW hook]', h, e); } }
  list() { return [...this.plugins.keys()]; }
}

/* ---------------------------------------------------------------
 * Renderer
 * --------------------------------------------------------------- */
function makeRenderer(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: CONFIG.antialias, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch (e) {
    console.warn('[OLLOW] WebGL2 indisponible, repli sur WebGL1');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  }
  renderer.setPixelRatio(CONFIG.pixelRatio);
  if (CONFIG.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = CONFIG.shadowType === 'vsm' ? THREE.VSMShadowMap : CONFIG.shadowType === 'pcf' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const tone = { aces: THREE.ACESFilmicToneMapping, reinhard: THREE.ReinhardToneMapping, cineon: THREE.CineonToneMapping, none: THREE.NoToneMapping };
  renderer.toneMapping = tone[CONFIG.toneMapping] ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  renderer.info.autoReset = false;
  return renderer;
}

/* ---------------------------------------------------------------
 * Matériaux (68 presets)
 * --------------------------------------------------------------- */
export const MATERIALS = {
  standard: s => new THREE.MeshStandardMaterial(s),
  physical: s => new THREE.MeshPhysicalMaterial(s),
  lambert: s => new THREE.MeshLambertMaterial(s),
  phong: s => new THREE.MeshPhongMaterial(s),
  basic: s => new THREE.MeshBasicMaterial(s),
  toon: s => new THREE.MeshToonMaterial(s),
  matcap: s => new THREE.MeshMatcapMaterial(s),
  depth: s => new THREE.MeshDepthMaterial(s),
  normal: s => new THREE.MeshNormalMaterial(s),
  wireframe: s => new THREE.MeshBasicMaterial({ ...s, wireframe: true }),
  points: s => new THREE.PointsMaterial(s),
  line: s => new THREE.LineBasicMaterial(s),
  dashed: s => new THREE.LineDashedMaterial(s),
  sprite: s => new THREE.SpriteMaterial(s),
  shadow: s => new THREE.ShadowMaterial(s),
  water: s => new THREE.MeshPhysicalMaterial({ color: 0x2266aa, roughness: 0.1, metalness: 0.2, transmission: 0.9, transparent: true, opacity: 0.85, ...s }),
  glass: s => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 1, thickness: 0.5, transparent: true, ior: 1.5, ...s }),
  frosted: s => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, transmission: 0.7, transparent: true, thickness: 1, ...s }),
  metal: s => new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.9, ...s }),
  gold: s => new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 1, ...s }),
  silver: s => new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.15, metalness: 1, ...s }),
  copper: s => new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.4, metalness: 0.95, ...s }),
  bronze: s => new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.5, metalness: 0.9, ...s }),
  iron: s => new THREE.MeshStandardMaterial({ color: 0x525252, roughness: 0.7, metalness: 0.8, ...s }),
  chrome: s => new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.05, metalness: 1, ...s }),
  rust: s => new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, metalness: 0.3, ...s }),
  emissive: s => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1, ...s }),
  neon: s => new THREE.MeshBasicMaterial({ color: 0x00ffff, ...s }),
  glow: s => new THREE.MeshBasicMaterial({ ...s }),
  hologram: s => new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.5, ...s }),
  holoBlue: s => new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, ...s }),
  holoPink: s => new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6, ...s }),
  grid: s => new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, ...s }),
  glassRim: s => new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x88ccff, emissiveIntensity: 0.3, transparent: true, opacity: 0.7, ...s }),
  lava: s => new THREE.MeshBasicMaterial({ color: 0xff3300, ...s }),
  ice: s => new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8, ...s }),
  fire: s => new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85, ...s }),
  smoke: s => new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5, ...s }),
  plasma: s => new THREE.MeshBasicMaterial({ color: 0xff00ff, ...s }),
  energy: s => new THREE.MeshBasicMaterial({ color: 0x00ffff, ...s }),
  toxic: s => new THREE.MeshBasicMaterial({ color: 0x88ff00, ...s }),
  wood: s => new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9, metalness: 0, ...s }),
  marble: s => new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0, ...s }),
  granite: s => new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8, metalness: 0.1, ...s }),
  concrete: s => new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.95, metalness: 0, ...s }),
  brick: s => new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.9, metalness: 0, ...s }),
  sand: s => new THREE.MeshStandardMaterial({ color: 0xeedd82, roughness: 1, metalness: 0, ...s }),
  grass: s => new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.95, metalness: 0, ...s }),
  dirt: s => new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1, metalness: 0, ...s }),
  rock: s => new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95, metalness: 0.05, ...s }),
  leather: s => new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9, metalness: 0, ...s }),
  cloth: s => new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1, metalness: 0, ...s }),
  velvet: s => new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.85, metalness: 0, ...s }),
  silk: s => new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.4, metalness: 0.05, ...s }),
  rubber: s => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0, ...s }),
  plastic: s => new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.05, ...s }),
  ceramic: s => new THREE.MeshStandardMaterial({ color: 0xf0e68c, roughness: 0.2, metalness: 0.05, ...s }),
  porcelain: s => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.05, ...s }),
  paper: s => new THREE.MeshStandardMaterial({ color: 0xfaf0e6, roughness: 1, metalness: 0, ...s }),
  bone: s => new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.9, metalness: 0.05, ...s }),
  flesh: s => new THREE.MeshStandardMaterial({ color: 0xe0b0a0, roughness: 0.85, metalness: 0, ...s }),
  blood: s => new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.3, metalness: 0, ...s }),
  oil: s => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.1, ...s }),
  toxicSludge: s => new THREE.MeshStandardMaterial({ color: 0x88ff00, roughness: 0.4, emissive: 0x44ff00, emissiveIntensity: 0.3, ...s }),
  crystal: s => new THREE.MeshPhysicalMaterial({ color: 0xaaccff, roughness: 0.05, transmission: 0.9, thickness: 1, ior: 1.7, ...s }),
  diamond: s => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 1, thickness: 2, ior: 2.4, ...s }),
  obsidian: s => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.3, ...s }),
  amber: s => new THREE.MeshPhysicalMaterial({ color: 0xffaa00, transmission: 0.8, roughness: 0.1, thickness: 1, ...s }),
  jade: s => new THREE.MeshStandardMaterial({ color: 0x00a86b, roughness: 0.3, metalness: 0.1, ...s }),
  coral: s => new THREE.MeshStandardMaterial({ color: 0xff7f50, roughness: 0.8, metalness: 0.05, ...s }),
  moss: s => new THREE.MeshStandardMaterial({ color: 0x4a5d23, roughness: 1, metalness: 0, ...s }),
  flower: s => new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.9, metalness: 0, ...s }),
};

function makeMaterial(spec = {}) {
  const t = spec.type || CONFIG.material;
  const ctor = MATERIALS[t] || MATERIALS.standard;
  return ctor({
    color: spec.color ?? 0xffffff,
    transparent: !!spec.transparent, opacity: spec.opacity ?? 1,
    side: spec.side === 'double' ? THREE.DoubleSide : spec.side === 'back' ? THREE.BackSide : THREE.FrontSide,
    emissive: spec.emissive ?? 0x000000, emissiveIntensity: spec.emissiveIntensity ?? 1,
    depthWrite: spec.depthWrite !== false, wireframe: !!spec.wireframe,
    roughness: spec.roughness, metalness: spec.metalness,
    transmission: spec.transmission, clearcoat: spec.clearcoat,
    thickness: spec.thickness, ior: spec.ior,
    flatShading: !!spec.flatShading, vertexColors: !!spec.vertexColors,
    map: spec.map || null, normalMap: spec.normalMap || null,
    roughnessMap: spec.roughnessMap || null, metalnessMap: spec.metalnessMap || null,
    aoMap: spec.aoMap || null, emissiveMap: spec.emissiveMap || null,
    alphaMap: spec.alphaMap || null, envMap: spec.envMap || null,
  });
}

/* ---------------------------------------------------------------
 * Géométries (32 primitives + générateurs procéduraux)
 * --------------------------------------------------------------- */
export const GEOMETRIES = {
  box: s => { const [w, h, d] = s.size || [1, 1, 1]; return new THREE.BoxGeometry(w, h, d, s.wSeg, s.hSeg, s.dSeg); },
  sphere: s => new THREE.SphereGeometry(s.radius ?? 0.5, s.segW ?? 32, s.segH ?? 24),
  plane: s => { const [w, h] = s.size || [10, 10]; return new THREE.PlaneGeometry(w, h, s.segW ?? 1, s.segH ?? 1); },
  circle: s => new THREE.CircleGeometry(s.radius ?? 0.5, s.seg ?? 32),
  cylinder: s => new THREE.CylinderGeometry(s.radiusTop ?? 0.5, s.radiusBottom ?? 0.5, s.height ?? 1, s.seg ?? 24),
  cone: s => new THREE.ConeGeometry(s.radius ?? 0.5, s.height ?? 1, s.seg ?? 24),
  torus: s => new THREE.TorusGeometry(s.radius ?? 0.5, s.tube ?? 0.2, s.segW ?? 16, s.segH ?? 48),
  torusKnot: s => new THREE.TorusKnotGeometry(s.radius ?? 0.5, s.tube ?? 0.2, s.seg ?? 64, s.segT ?? 8, s.p ?? 2, s.q ?? 3),
  capsule: s => new THREE.CapsuleGeometry(s.radius ?? 0.4, s.height ?? 1, s.segW ?? 8, s.segH ?? 16),
  lathe: s => new THREE.LatheGeometry((s.points || [[0,0],[0.5,0.5],[0.3,1],[0,1.2]]).map(p => new THREE.Vector2(p[0], p[1])), s.seg ?? 24),
  tube: s => { const curve = new THREE.CatmullRomCurve3((s.path || [[0,0,0],[1,1,0],[2,0,0],[3,1,0]]).map(p => new THREE.Vector3(...p))); return new THREE.TubeGeometry(curve, s.seg ?? 32, s.radius ?? 0.2, s.radialSeg ?? 8, false); },
  extrude: s => { const shape = new THREE.Shape(); const pts = s.points || [[0,0],[1,0],[1,1],[0,1]]; shape.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]); return new THREE.ExtrudeGeometry(shape, { depth: s.depth ?? 0.5, bevelEnabled: s.bevel !== false }); },
  ring: s => new THREE.RingGeometry(s.innerRadius ?? 0.3, s.outerRadius ?? 0.5, s.seg ?? 32),
  dodeca: s => new THREE.DodecahedronGeometry(s.radius ?? 0.5, s.detail ?? 0),
  icosa: s => new THREE.IcosahedronGeometry(s.radius ?? 0.5, s.detail ?? 0),
  octa: s => new THREE.OctahedronGeometry(s.radius ?? 0.5, s.detail ?? 0),
  tetra: s => new THREE.TetrahedronGeometry(s.radius ?? 0.5, s.detail ?? 0),
  tube2: s => { const curve = new THREE.CatmullRomCurve3((s.path || [[0,0,0],[1,1,0],[2,0,0],[3,1,0]]).map(p => new THREE.Vector3(...p))); return new THREE.TubeGeometry(curve, s.seg ?? 64, s.radius ?? 0.1, s.radialSeg ?? 16, true); },
  ribbon: s => new THREE.PlaneGeometry(s.length ?? 10, s.width ?? 1, s.seg ?? 32, 1),
  terrain: s => {
    const [w, h] = s.size || [100, 100];
    const geo = new THREE.PlaneGeometry(w, h, s.seg ?? 64, s.seg ?? 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const scale = s.heightScale ?? 5, freq = s.freq ?? 0.05, oct = s.octaves ?? 4, seed = s.seed ?? 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h2 = 0, a = 1, f = freq;
      for (let o = 0; o < oct; o++) { h2 += a * noise.noise2(x * f + seed, z * f + seed); a *= 0.5; f *= 2; }
      pos.setY(i, h2 * scale);
    }
    geo.computeVertexNormals();
    return geo;
  },
  ridgedTerrain: s => {
    const [w, h] = s.size || [100, 100];
    const geo = new THREE.PlaneGeometry(w, h, s.seg ?? 64, s.seg ?? 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, noise.ridged2(pos.getX(i) * 0.05, pos.getZ(i) * 0.05) * (s.heightScale ?? 5));
    geo.computeVertexNormals();
    return geo;
  },
  rock: s => {
    const geo = new THREE.IcosahedronGeometry(s.radius ?? 1, s.detail ?? 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = noise.noise2(x * 3 + (s.seed ?? 0), z * 3 + (s.seed ?? 0));
      const k = 1 + n * (s.roughness ?? 0.3);
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  },
  tree: s => new THREE.CylinderGeometry(s.topRadius ?? 0.05, s.bottomRadius ?? 0.3, s.height ?? 3, 6),
  cloud: s => {
    const geo = new THREE.BufferGeometry();
    const positions = [], sizes = [];
    for (let i = 0; i < (s.count ?? 12); i++) {
      const angle = Math.random() * Math.PI * 2, r = Math.random() * (s.radius ?? 2);
      positions.push(Math.cos(angle) * r, (Math.random() - 0.5) * 0.5, Math.sin(angle) * r);
      sizes.push(Math.random() * 0.5 + 0.5);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    return geo;
  },
  cave: s => {
    const [w, h] = s.size || [50, 50];
    const geo = new THREE.PlaneGeometry(w, h, s.seg ?? 48, s.seg ?? 48);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, noise.fbm2(pos.getX(i), pos.getZ(i), 5) * (s.heightScale ?? 8));
    geo.computeVertexNormals();
    return geo;
  },
  stairs: s => new THREE.BoxGeometry(s.width ?? 1, (s.height ?? 0.2) * (s.steps ?? 10), s.depth ?? 0.3),
  road: s => new THREE.PlaneGeometry(...(s.size || [50, 4]), s.seg ?? 40, 1),
  grid: s => new THREE.GridHelper(s.size ?? 20, s.divisions ?? 20, s.color1 ?? 0x444444, s.color2 ?? 0x222222).geometry,
  city: s => new THREE.BoxGeometry(s.w ?? 2, s.h ?? 10, s.d ?? 2),
  tower: s => new THREE.CylinderGeometry(s.topRadius ?? 0.8, s.bottomRadius ?? 1, s.height ?? 12, s.seg ?? 12),
  arch: s => new THREE.TorusGeometry(s.radius ?? 1, s.tube ?? 0.2, 8, 16, Math.PI),
  donut: s => new THREE.TorusGeometry(s.radius ?? 1, s.tube ?? 0.4, s.segW ?? 24, s.segH ?? 48),
  gem: s => new THREE.OctahedronGeometry(s.radius ?? 0.5, s.detail ?? 1),
  crystal: s => new THREE.ConeGeometry(s.radius ?? 0.3, s.height ?? 2, s.seg ?? 6),
  bush: s => new THREE.SphereGeometry(s.radius ?? 1, s.segW ?? 8, s.segH ?? 6),
  grass: s => new THREE.PlaneGeometry(s.size ?? 1, s.size ?? 1, 1, 1),
  mushroom: s => new THREE.SphereGeometry(s.radius ?? 0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  barrel: s => new THREE.CylinderGeometry(s.radius ?? 0.4, s.radius ?? 0.4, s.height ?? 1, 16),
  crate: s => new THREE.BoxGeometry(s.size ?? 1, s.size ?? 1, s.size ?? 1),
  platform: s => new THREE.BoxGeometry(s.w ?? 5, s.h ?? 0.3, s.d ?? 5),
  ramp: s => new THREE.BoxGeometry(s.w ?? 2, s.h ?? 0.3, s.d ?? 4),
  wall: s => new THREE.BoxGeometry(s.w ?? 4, s.h ?? 3, s.d ?? 0.2),
  fence: s => new THREE.BoxGeometry(s.w ?? 2, s.h ?? 1, 0.05),
  door: s => new THREE.BoxGeometry(1, 2, 0.1),
  window: s => new THREE.PlaneGeometry(1, 1),
  pointCloud: s => { const geo = new THREE.BufferGeometry(); const n = s.count ?? 1000; const pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * (s.range ?? 10); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return geo; },
  starfield: s => {
    const geo = new THREE.BufferGeometry(); const n = s.count ?? 5000;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi);
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  },
  galaxy: s => { const geo = new THREE.BufferGeometry(); const n = s.count ?? 5000; const arms = s.arms ?? 4; const radius = s.radius ?? 50; const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = Math.random(); const arm = Math.floor(Math.random() * arms); const angle = t * 5 + (arm / arms) * Math.PI * 2; const r = t * radius; const spread = (Math.random() - 0.5) * 2; pos[i*3] = Math.cos(angle) * r + spread; pos[i*3+1] = (Math.random() - 0.5) * 2; pos[i*3+2] = Math.sin(angle) * r + spread; } geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return geo; },
  nebula: s => { const geo = new THREE.BufferGeometry(); const n = s.count ?? 2000; const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = Math.random() * (s.radius ?? 20); const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1); pos[i*3] = r * Math.sin(phi) * Math.cos(theta); pos[i*3+1] = r * Math.cos(phi); pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta); } geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return geo; },
  merged: s => { const geos = (s.geometries || []).map(g => makeGeometry(g)); return mergeGeometries(geos, false); },
  array: s => { const base = makeGeometry(s.base); const geos = []; for (let i = 0; i < (s.count ?? 10); i++) { const g = base.clone(); const m = new THREE.Matrix4().makeTranslation(i * (s.spacing ?? 2), 0, 0); g.applyMatrix4(m); geos.push(g); } return mergeGeometries(geos, false); },
  ringInstances: s => { const base = makeGeometry(s.base); const geos = []; const count = s.count ?? 16; for (let i = 0; i < count; i++) { const angle = i / count * Math.PI * 2; const g = base.clone(); const m = new THREE.Matrix4().makeTranslation(Math.cos(angle) * (s.radius ?? 5), 0, Math.sin(angle) * (s.radius ?? 5)); g.applyMatrix4(m); geos.push(g); } return mergeGeometries(geos, false); },
};

function makeGeometry(spec = {}) {
  const gen = GEOMETRIES[spec.geometry || 'box'] || GEOMETRIES.box;
  const geo = gen(spec);
  if (spec.uv2 && geo.attributes?.uv) geo.setAttribute('uv2', new THREE.Float32BufferAttribute(geo.attributes.uv.array, 2));
  return geo;
}

/* ---------------------------------------------------------------
 * Corps physique
 * --------------------------------------------------------------- */
class Body {
  constructor(mesh, spec = {}) {
    this.mesh = mesh;
    this.type = spec.type || 'static';
    this.mass = spec.mass ?? 1;
    this.invMass = this.type === 'dynamic' ? 1 / Math.max(this.mass, 0.001) : 0;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.restitution = spec.restitution ?? 0.2;
    this.friction = spec.friction ?? 0.85;
    this.useGravity = spec.useGravity !== false;
    this.isTrigger = !!spec.isTrigger;
    this.halfSize = new THREE.Vector3(0.5, 0.5, 0.5);
    this.sleeping = false;
    this.sleepTimer = 0;
    this.onCollision = spec.onCollision || null;
    this.tag = spec.tag || '';
    this.layer = spec.layer ?? 0;
    this._recomputeBounds();
  }
  _recomputeBounds() {
    if (!this.mesh.geometry.boundingBox) this.mesh.geometry.computeBoundingBox();
    const bb = this.mesh.geometry.boundingBox;
    this.halfSize.set((bb.max.x - bb.min.x) / 2, (bb.max.y - bb.min.y) / 2, (bb.max.z - bb.min.z) / 2);
  }
  getAABB() {
    const p = this.mesh.position, s = this.mesh.scale;
    return {
      min: new THREE.Vector3(p.x - this.halfSize.x * s.x, p.y - this.halfSize.y * s.y, p.z - this.halfSize.z * s.z),
      max: new THREE.Vector3(p.x + this.halfSize.x * s.x, p.y + this.halfSize.y * s.y, p.z + this.halfSize.z * s.z),
    };
  }
  applyForce(f) { this.acceleration.addScaledVector(f, this.invMass); }
  applyImpulse(j) { this.velocity.addScaledVector(j, this.invMass); }
  setVelocity(v) { this.velocity.set(v[0] ?? v.x ?? 0, v[1] ?? v.y ?? 0, v[2] ?? v.z ?? 0); }
}
function aabbIntersect(a, b) {
  return a.min.x <= b.max.x && a.max.x >= b.min.x && a.min.y <= b.max.y && a.max.y >= b.min.y && a.min.z <= b.max.z && a.max.z >= b.min.z;
}

/* ---------------------------------------------------------------
 * Système de particules
 * --------------------------------------------------------------- */
export class ParticleSystem {
  constructor(engine, scene, max = CONFIG.maxParticles) {
    this.engine = engine; this.scene = scene; this.max = max; this.count = 0;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.velocities = new Float32Array(max * 3);
    this.lifetimes = new Float32Array(max);
    this.maxLifetimes = new Float32Array(max);
    this.gravity = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.three.add(this.points);
  }
  emit(pos, { color = 0xffffff, size = 0.2, velocity = [0,0,0], life = 1, gravity = -9.8, spread = 0 } = {}) {
    const i = this.count++;
    if (i >= this.max) { this.count = this.max; return; }
    this.positions[i*3] = pos[0]; this.positions[i*3+1] = pos[1]; this.positions[i*3+2] = pos[2];
    const c = new THREE.Color(color);
    this.colors[i*3] = c.r; this.colors[i*3+1] = c.g; this.colors[i*3+2] = c.b;
    this.sizes[i] = size;
    this.velocities[i*3] = velocity[0] + math.rand(-spread, spread);
    this.velocities[i*3+1] = velocity[1] + math.rand(-spread, spread);
    this.velocities[i*3+2] = velocity[2] + math.rand(-spread, spread);
    this.lifetimes[i] = life; this.maxLifetimes[i] = life; this.gravity[i] = gravity;
  }
  burst(pos, n, opts = {}) { for (let i = 0; i < n; i++) this.emit(pos, { spread: opts.spread ?? 3, ...opts }); }
  explosion(pos, opts = {}) { this.burst(pos, opts.count ?? 40, { color: 0xff8800, size: 0.25, life: 1.2, spread: 5, gravity: -12, ...opts }); }
  trail(pos, prev, opts = {}) { const count = opts.count ?? 3; for (let i = 0; i < count; i++) { const t = i / count; this.emit([math.lerp(prev[0], pos[0], t), math.lerp(prev[1], pos[1], t), math.lerp(prev[2], pos[2], t)], { size: 0.1, life: 0.4, ...opts }); } }
  update(dt) {
    for (let i = 0; i < this.count; i++) {
      this.lifetimes[i] -= dt;
      if (this.lifetimes[i] <= 0) {
        const last = --this.count;
        if (i !== last) {
          for (let k = 0; k < 3; k++) { this.positions[i*3+k] = this.positions[last*3+k]; this.velocities[i*3+k] = this.velocities[last*3+k]; this.colors[i*3+k] = this.colors[last*3+k]; }
          this.sizes[i] = this.sizes[last]; this.lifetimes[i] = this.lifetimes[last]; this.maxLifetimes[i] = this.maxLifetimes[last]; this.gravity[i] = this.gravity[last];
        }
        i--; continue;
      }
      this.velocities[i*3+1] += this.gravity[i] * dt;
      this.positions[i*3] += this.velocities[i*3] * dt;
      this.positions[i*3+1] += this.velocities[i*3+1] * dt;
      this.positions[i*3+2] += this.velocities[i*3+2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.count);
  }
}

/* ---------------------------------------------------------------
 * Bus audio
 * --------------------------------------------------------------- */
export class AudioBus {
  constructor() { this.ctx = null; this.master = null; this.ready = false; this.buffers = new Map(); }
  async unlock() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      await this.ctx.resume(); this.ready = true;
    } catch (e) { console.warn('[OLLOW] audio indisponible', e); }
  }
  async load(url, key) {
    if (!this.ctx) await this.unlock();
    if (this.buffers.has(key)) return this.buffers.get(key);
    const res = await fetch(url); const buf = await res.arrayBuffer(); const audio = await this.ctx.decodeAudioData(buf);
    this.buffers.set(key, audio); return audio;
  }
  play(key, { volume = 1, loop = false, position = null, rate = 1 } = {}) {
    if (!this.ready) return null;
    const buffer = this.buffers.get(key); if (!buffer) return null;
    const src = this.ctx.createBufferSource(); src.buffer = buffer; src.loop = loop; src.playbackRate.value = rate;
    const gain = this.ctx.createGain(); gain.gain.value = volume;
    if (position) { const panner = this.ctx.createPanner(); panner.panningModel = 'HRTF'; panner.setPosition(...position); src.connect(gain).connect(panner).connect(this.master); }
    else src.connect(gain).connect(this.master);
    src.start(); return src;
  }
  setMasterVolume(v) { if (this.master) this.master.gain.value = v; }
  beep({ freq = 440, duration = 0.1, type = 'sine', volume = 0.3 } = {}) {
    if (!this.ready) return;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + duration);
  }
}

/* ---------------------------------------------------------------
 * Grille de navigation A*
 * --------------------------------------------------------------- */
export class NavGrid {
  constructor({ width = 100, depth = 100, cell = 1, heightFn = () => 0 } = {}) {
    this.width = width; this.depth = depth; this.cell = cell; this.heightFn = heightFn;
    this.w = Math.ceil(width / cell); this.d = Math.ceil(depth / cell);
    this.blocked = new Uint8Array(this.w * this.d);
  }
  block(x, z) { const i = this._idx(x, z); if (i >= 0) this.blocked[i] = 1; }
  unblock(x, z) { const i = this._idx(x, z); if (i >= 0) this.blocked[i] = 0; }
  isBlocked(x, z) { const i = this._idx(x, z); return i < 0 || this.blocked[i] === 1; }
  _idx(x, z) { const ix = Math.floor((x + this.width / 2) / this.cell); const iz = Math.floor((z + this.depth / 2) / this.cell); if (ix < 0 || ix >= this.w || iz < 0 || iz >= this.d) return -1; return iz * this.w + ix; }
  findPath(start, goal) {
    const s = this._idx(start[0], start[2]); const g = this._idx(goal[0], goal[2]);
    if (s < 0 || g < 0) return null;
    const open = [s]; const came = new Map(); const gS = new Map([[s, 0]]); const fS = new Map([[s, 0]]);
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if ((fS.get(open[i]) ?? Infinity) < (fS.get(open[bi]) ?? Infinity)) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === g) return this._reconstruct(came, cur);
      for (const nb of this._neighbors(cur)) {
        if (this.blocked[nb]) continue;
        const t = (gS.get(cur) ?? Infinity) + 1;
        if (t < (gS.get(nb) ?? Infinity)) { came.set(nb, cur); gS.set(nb, t); fS.set(nb, t + this._h(nb, g)); if (!open.includes(nb)) open.push(nb); }
      }
    }
    return null;
  }
  _neighbors(i) { const x = i % this.w, z = Math.floor(i / this.w); const o = []; if (x > 0) o.push(i - 1); if (x < this.w - 1) o.push(i + 1); if (z > 0) o.push(i - this.w); if (z < this.d - 1) o.push(i + this.w); return o; }
  _h(a, b) { const ax = a % this.w, az = Math.floor(a / this.w), bx = b % this.w, bz = Math.floor(b / this.w); return Math.abs(ax - bx) + Math.abs(az - bz); }
  _reconstruct(came, cur) { const p = [this._toWorld(cur)]; while (came.has(cur)) { cur = came.get(cur); p.unshift(this._toWorld(cur)); } return p; }
  _toWorld(i) { const x = i % this.w, z = Math.floor(i / this.w); return [(x + 0.5) * this.cell - this.width / 2, this.heightFn(x, z), (z + 0.5) * this.cell - this.depth / 2]; }
}

/* ---------------------------------------------------------------
 * ECS
 * --------------------------------------------------------------- */
export class ECS {
  constructor() { this.entities = new Map(); this.components = new Map(); this.systems = []; this.nextId = 1; }
  createEntity(tag = '') { const id = this.nextId++; this.entities.set(id, { id, tag, alive: true }); return id; }
  destroyEntity(id) { this.entities.delete(id); for (const map of this.components.values()) map.delete(id); }
  addComponent(id, name, data = {}) { if (!this.components.has(name)) this.components.set(name, new Map()); this.components.get(name).set(id, { ...data }); }
  getComponent(id, name) { return this.components.get(name)?.get(id); }
  removeComponent(id, name) { this.components.get(name)?.delete(id); }
  query(...names) { if (!names.length) return [...this.entities.keys()]; const maps = names.map(n => this.components.get(n) ?? new Map()); const [first, ...rest] = maps; const out = []; for (const id of first.keys()) if (rest.every(m => m.has(id))) out.push(id); return out; }
  addSystem(system) { this.systems.push(system); }
  update(dt) { for (const sys of this.systems) try { sys(this, dt); } catch (e) { console.error('[OLLOW ECS]', e); } }
}

/* ---------------------------------------------------------------
 * Scène
 * --------------------------------------------------------------- */
export class OllowScene {
  constructor(engine) {
    this.engine = engine;
    this.three = new THREE.Scene();
    this.bodies = [];
    this.meshes = [];
    this.lights = [];
    this.particles = new ParticleSystem(engine, this);
    this.decals = [];
    this.groups = new Map();
    this.events = new EventBus();
    this.three.background = new THREE.Color(0x0a0a14);
    this.three.fog = new THREE.Fog(0x0a0a14, CONFIG.fogNear, CONFIG.fogFar);
  }

  addMesh(spec = {}) {
    const geo = spec.reuseGeometry || makeGeometry(spec);
    const mat = spec.reuseMaterial || makeMaterial(spec.material || {});
    const mesh = spec.isInstanced && spec.count ? new THREE.InstancedMesh(geo, mat, spec.count) : new THREE.Mesh(geo, mat);
    const p = spec.position || [0,0,0];
    mesh.position.set(p[0], p[1], p[2]);
    if (spec.rotation) mesh.rotation.set(spec.rotation[0] || 0, spec.rotation[1] || 0, spec.rotation[2] || 0);
    if (spec.scale) mesh.scale.set(spec.scale[0] ?? 1, spec.scale[1] ?? 1, spec.scale[2] ?? 1);
    mesh.castShadow = CONFIG.shadows && spec.castShadow !== false;
    mesh.receiveShadow = CONFIG.shadows && spec.receiveShadow !== false;
    mesh.userData.isOllowMesh = true;
    mesh.userData.tag = spec.tag || '';
    mesh.name = spec.name || spec.tag || '';
    this.three.add(mesh);
    this.meshes.push(mesh);
    if (spec.physics) {
      const body = new Body(mesh, spec.physics);
      body.tag = spec.tag || '';
      mesh.userData.body = body;
      this.bodies.push(body);
    }
    if (spec.group) { if (!this.groups.has(spec.group)) this.groups.set(spec.group, []); this.groups.get(spec.group).push(mesh); }
    return mesh;
  }

  addLight(spec = {}) {
    let light;
    switch (spec.type) {
      case 'ambient': light = new THREE.AmbientLight(spec.color ?? 0xffffff, spec.intensity ?? 0.5); break;
      case 'point': light = new THREE.PointLight(spec.color ?? 0xffffff, spec.intensity ?? 1, spec.distance ?? 50, spec.decay ?? 2); break;
      case 'spot': light = new THREE.SpotLight(spec.color ?? 0xffffff, spec.intensity ?? 1, spec.distance ?? 60, spec.angle ?? Math.PI / 6, spec.penumbra ?? 0.2); break;
      case 'hemisphere': light = new THREE.HemisphereLight(spec.color ?? 0xffffff, spec.groundColor ?? 0x444444, spec.intensity ?? 0.6); break;
      default:
        light = new THREE.DirectionalLight(spec.color ?? 0xffffff, spec.intensity ?? 1);
        if (CONFIG.shadows) {
          light.castShadow = spec.castShadow !== false;
          const mapSize = spec.shadowMapSize || CONFIG.shadowMapSize;
          light.shadow.mapSize.set(mapSize, mapSize);
          const d = spec.shadowSize || 60;
          light.shadow.camera.left = -d;
          light.shadow.camera.right = d;
          light.shadow.camera.top = d;
          light.shadow.camera.bottom = -d;
          light.shadow.camera.near = 0.5;
          light.shadow.camera.far = 320;
          light.shadow.bias = spec.shadowBias ?? -0.0005;
          light.shadow.normalBias = spec.shadowNormalBias ?? 0.02;
        }
    }
    const p = spec.position || [10, 20, 10];
    light.position.set(p[0], p[1], p[2]);
    if (spec.target) { light.target.position.set(spec.target[0], spec.target[1], spec.target[2]); this.three.add(light.target); }
    this.three.add(light);
    this.lights.push(light);
    return light;
  }

  removeMesh(mesh) {
    const i = this.meshes.indexOf(mesh);
    if (i >= 0) this.meshes.splice(i, 1);
    if (mesh.userData.body) {
      const bi = this.bodies.indexOf(mesh.userData.body);
      if (bi >= 0) this.bodies.splice(bi, 1);
    }
    this.three.remove(mesh);
  }
  removeGroup(name) { const g = this.groups.get(name); if (!g) return; for (const m of [...g]) this.removeMesh(m); this.groups.delete(name); }
  clear() { for (const m of [...this.meshes]) this.removeMesh(m); this.lights = []; this.bodies = []; }

  setSkybox(colorOrUrls) {
    if (typeof colorOrUrls === 'number' || (typeof colorOrUrls === 'string' && colorOrUrls.startsWith('#'))) this.three.background = new THREE.Color(colorOrUrls);
    else if (Array.isArray(colorOrUrls)) this.three.background = new THREE.CubeTextureLoader().load(colorOrUrls);
  }
  setFog(color, near, far) { this.three.fog = new THREE.Fog(color, near, far); }
  setFogExp(color, density) { this.three.fog = new THREE.FogExp2(color, density); }
  setBackground(c) { this.three.background = new THREE.Color(c); }

  raycast(origin, direction, maxDist = 100, tag = null) {
    const ray = new THREE.Raycaster(origin, direction.clone().normalize(), 0, maxDist);
    const hits = ray.intersectObjects(this.meshes, true);
    for (const h of hits) if (!tag || h.object.userData.tag === tag) return h;
    return null;
  }
  raycastAll(origin, direction, maxDist = 100) {
    const ray = new THREE.Raycaster(origin, direction.clone().normalize(), 0, maxDist);
    return ray.intersectObjects(this.meshes, true);
  }
  spherecast(origin, radius, direction, maxDist = 100) {
    const sphere = new THREE.Sphere(origin.clone(), radius);
    for (const m of this.meshes) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const bs = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld); if (sphere.intersectsSphere(bs)) return m; }
    return null;
  }
  boxcast(box3) { const out = []; for (const m of this.meshes) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); if (box3.intersectsBox(bb)) out.push(m); } return out; }

  findByName(name) { return this.meshes.find(m => m.name === name); }
  findByTag(tag) { return this.meshes.filter(m => m.userData.tag === tag); }
  countMeshes() { return this.meshes.length; }

  spawnDecal(mesh, max = CONFIG.maxDecals) { this.decals.push(mesh); if (this.decals.length > max) this.removeMesh(this.decals.shift()); }

  stepPhysics(dt) {
    const g = CONFIG.gravity;
    for (const b of this.bodies) {
      if (b.type !== 'dynamic' || b.sleeping) continue;
      if (b.useGravity) b.velocity.y += g * dt;
      b.velocity.addScaledVector(b.acceleration, dt);
      b.acceleration.set(0, 0, 0);
      b.mesh.position.addScaledVector(b.velocity, dt);
      if (b.velocity.lengthSq() < 0.01) b.sleepTimer += dt; else b.sleepTimer = 0;
      if (b.sleepTimer > 2) b.sleeping = true;
    }
    for (let i = 0; i < this.bodies.length; i++) {
      const a = this.bodies[i];
      if (a.type !== 'dynamic' || a.sleeping) continue;
      const aabbA = a.getAABB();
      for (let j = 0; j < this.bodies.length; j++) {
        if (i === j) continue;
        const b = this.bodies[j];
        if (b.type === 'dynamic' && j < i) continue;
        const aabbB = b.getAABB();
        if (!aabbIntersect(aabbA, aabbB)) continue;
        if (a.isTrigger || b.isTrigger) { if (a.onCollision) a.onCollision(b); if (b.onCollision) b.onCollision(a); this.events.emit('trigger', a, b); continue; }
        const oy = Math.min(aabbA.max.y - aabbB.min.y, aabbB.max.y - aabbA.min.y);
        const ox = Math.min(aabbA.max.x - aabbB.min.x, aabbB.max.x - aabbA.min.x);
        const oz = Math.min(aabbA.max.z - aabbB.min.z, aabbB.max.z - aabbA.min.z);
        if (oy <= ox && oy <= oz) {
          if (a.mesh.position.y < b.mesh.position.y) {
            a.mesh.position.y = aabbB.min.y - a.halfSize.y;
            if (Math.abs(a.velocity.y) > 0.5 && a.onCollision) a.onCollision(b, 'ground');
            a.velocity.y = -a.velocity.y * a.restitution;
            a.userData.onGround = true;
          } else {
            a.mesh.position.y = aabbB.max.y + a.halfSize.y;
            a.velocity.y = -a.velocity.y * a.restitution;
          }
        } else if (ox <= oz) {
          a.mesh.position.x += a.mesh.position.x < b.mesh.position.x ? aabbB.min.x - a.halfSize.x - a.mesh.position.x : aabbB.max.x + a.halfSize.x - a.mesh.position.x;
          a.velocity.x *= -a.restitution;
        } else {
          a.mesh.position.z += a.mesh.position.z < b.mesh.position.z ? aabbB.min.z - a.halfSize.z - a.mesh.position.z : aabbB.max.z + a.halfSize.z - a.mesh.position.z;
          a.velocity.z *= -a.restitution;
        }
        if (a.onCollision) a.onCollision(b);
        if (a.sleepTimer > 0 && b.type === 'dynamic') { b.sleeping = false; b.sleepTimer = 0; }
      }
    }
    this.particles.update(dt);
  }

  tween(obj, from, to, duration, easingFn = t => t, onUpdate = null) {
    const start = performance.now();
    function step() {
      const t = math.clamp((performance.now() - start) / (duration * 1000), 0, 1);
      const e = easingFn(t);
      for (const k in to) obj[k] = math.lerp(from[k], to[k], e);
      if (onUpdate) onUpdate(obj, e);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
}

/* ---------------------------------------------------------------
 * Contrôles
 * --------------------------------------------------------------- */
export class Controls {
  constructor(engine, camera, mode) {
    this.engine = engine; this.camera = camera; this.mode = mode || 'fps';
    this.keys = {}; this.mouse = { dx: 0, dy: 0, buttons: {}, locked: false, x: 0, y: 0 };
    this.yaw = 0; this.pitch = 0;
    this.sensitivity = 0.0022; this.speed = 8;
    this.target = null; this.offset = new THREE.Vector3(0, 2.2, 6);
    this.deadzone = 0.15;
    this.vibrationEnabled = true;
    this._gamepadIndex = null;
    this._bind();
  }
  _bind() {
    const c = this.engine.canvas;
    this._onKeyDown = e => { this.keys[e.code] = true; this.keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this.keys[e.code] = false; this.keys[e.key.toLowerCase()] = false; };
    this._onMouseMove = e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; if (this.mouse.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } };
    this._onMouseDown = e => { this.mouse.buttons[e.button] = true; if (this.mode !== 'orbit' && c.requestPointerLock) c.requestPointerLock(); };
    this._onMouseUp = e => { this.mouse.buttons[e.button] = false; };
    this._onLockChange = () => { this.mouse.locked = document.pointerLockElement === c; };
    this._onWheel = e => { if (this.mode === 'third-person') this.offset.z = math.clamp(this.offset.z + e.deltaY * 0.01, 3, 20); };
    this._onGamepad = () => { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < pads.length; i++) if (pads[i]) { this._gamepadIndex = i; break; } };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    window.addEventListener('gamepadconnected', this._onGamepad);
  }
  setSensitivity(s) { this.sensitivity = s; }
  setSpeed(s) { this.speed = s; }
  setTarget(o) { this.target = o; }
  vibrate(ms) { if (this.vibrationEnabled && navigator.vibrate) navigator.vibrate(ms); }
  isDown(code) { return !!this.keys[code]; }
  isPressed(btn) { return !!this.mouse.buttons[btn]; }
  update(dt) {
    if (this.mode === 'orbit') {
      const r = this.offset.z;
      const theta = performance.now() * 0.0002;
      this.camera.position.set(Math.cos(theta) * r, r * 0.6, Math.sin(theta) * r);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    this.yaw -= this.mouse.dx * this.sensitivity;
    this.pitch -= this.mouse.dy * this.sensitivity;
    this.pitch = math.clamp(this.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
    this.mouse.dx = 0; this.mouse.dy = 0;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.yaw, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0));
    const move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);

    if (this._gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this._gamepadIndex];
      if (gp) {
        const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;
        if (Math.abs(lx) > this.deadzone) move.addScaledVector(right, lx);
        if (Math.abs(ly) > this.deadzone) move.addScaledVector(forward, -ly);
        const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0;
        if (Math.abs(rx) > this.deadzone) this.yaw -= rx * dt * 2;
        if (Math.abs(ry) > this.deadzone) this.pitch = math.clamp(this.pitch - ry * dt * 2, -Math.PI / 2, Math.PI / 2);
      }
    }
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(this.speed * dt);
    if (this.mode === 'third-person' && this.target) {
      const t = this.target.position;
      const camOffset = new THREE.Vector3(0, this.offset.y, this.offset.z).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      this.camera.position.copy(t).add(camOffset);
      this.camera.lookAt(t.x, t.y + 1, t.z);
      t.add(move);
    } else {
      this.camera.position.add(move);
    }
  }
}

/* ---------------------------------------------------------------
 * Moteur principal
 * --------------------------------------------------------------- */
export class Engine {
  constructor(options = {}) {
    this.canvas = options.canvas || (() => { const c = document.createElement('canvas'); c.style.cssText = 'display:block;width:100%;height:100%'; document.body.appendChild(c); return c; })();
    this.renderer = makeRenderer(this.canvas);
    this.scenes = []; this.active = null;
    this.camera = null; this.controls = null;
    this.clock = new THREE.Clock();
    this.updaters = []; this.running = false;
    this._physicsAcc = 0;
    this.audio = new AudioBus();
    this.plugins = new PluginHost();
    this.ecs = new ECS();
    this.events = new EventBus();
    this.stats = { fps: 0, frame: 0, dt: 0, calls: 0, tris: 0, _lastFps: performance.now(), _frames: 0 };
    this._composer = null;
    this._shake = { mag: 0, decay: 5 };
    this._resize = this._resize.bind(this);
    this._loop = this._loop.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }
  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    if (this._composer) this._composer.setSize(w, h);
  }
  createScene() { const s = new OllowScene(this); this.scenes.push(s); if (!this.active) this.active = s; return s; }
  setActiveScene(s) { this.active = s; }
  createCamera(fov = 70) { this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, CONFIG.far); this.camera.position.set(0, 3, 8); return this.camera; }
  createOrthoCamera(size = 20) { const aspect = window.innerWidth / window.innerHeight; this.camera = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, CONFIG.far); return this.camera; }
  createControls(type) { if (!this.camera) this.createCamera(); this.controls = new Controls(this, this.camera, type); return this.controls; }
  enableBloom(strength = 0.6) {
    if (!this.camera) return;
    if (!this._composer) { this._composer = new EffectComposer(this.renderer); this._composer.addPass(new RenderPass(this.active.three, this.camera)); }
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), strength, 0.4, 0.85);
    this._composer.addPass(bloom);
    return bloom;
  }
  enableSSAO() {
    if (!this.camera) return;
    if (!this._composer) { this._composer = new EffectComposer(this.renderer); this._composer.addPass(new RenderPass(this.active.three, this.camera)); }
    const pass = new SSAOPass(this.active.three, this.camera, window.innerWidth, window.innerHeight);
    this._composer.addPass(pass);
    return pass;
  }
  shake(mag = 1) { this._shake.mag = Math.max(this._shake.mag, mag); }
  onUpdate(fn) { this.updaters.push(fn); return () => { const i = this.updaters.indexOf(fn); if (i >= 0) this.updaters.splice(i, 1); }; }
  start() { if (this.running) return; this.running = true; this.clock.start(); requestAnimationFrame(this._loop); }
  stop() { this.running = false; }
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.stats._frames++;
    const now = performance.now();
    if (now - this.stats._lastFps > 500) {
      this.stats.fps = Math.round(this.stats._frames * 1000 / (now - this.stats._lastFps));
      this.stats._lastFps = now; this.stats._frames = 0;
      this.stats.calls = this.renderer.info.render.calls;
      this.stats.tris = this.renderer.info.render.triangles;
    }
    if (this._shake.mag > 0.001) {
      this.camera.position.x += math.rand(-1, 1) * this._shake.mag * 0.1;
      this.camera.position.y += math.rand(-1, 1) * this._shake.mag * 0.1;
      this._shake.mag = math.damp(this._shake.mag, 0, this._shake.decay, dt);
    }
    if (this.controls) this.controls.update(dt);
    this.ecs.update(dt);
    for (const fn of this.updaters) { try { fn(dt); } catch (e) { console.error('[OLLOW]', e); } }
    this.events.emit('update', dt);
    if (this.active) {
      this._physicsAcc += dt;
      const step = 1 / CONFIG.physicsHz;
      let it = 0;
      while (this._physicsAcc >= step && it < 5) { this.active.stepPhysics(step); this._physicsAcc -= step; it++; }
      this.renderer.info.reset();
      if (this._composer) this._composer.render(dt);
      else this.renderer.render(this.active.three, this.camera);
    }
  }
  async loadGLTF(url) { return new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej)); }
}

/* ---------------------------------------------------------------
 * Manifeste de fonctionnalités
 * --------------------------------------------------------------- */
const PRIMS = Object.keys(GEOMETRIES);
const MATS = Object.keys(MATERIALS);
const EASE = Object.keys(easing);
const NOISE = Object.keys(noise);
const POSTFX = ['bloom','ssao','dof','motionBlur','vignette','grain','chromatic','outline','pixelate','crt','scanline','dither','posterize','threshold','edge','sobel','emboss','sharpen','glow','godrays','lightshaft','lensflare','bokeh','taa','fxaa','smaa','contrast','brightness','saturation','hueRotate','whiteBalance','tint','splitTone','filmCurve','kodak','fuji','bars','letterbox','border','cornerRadius','lut','blur','gauss','radialBlur','directionalBlur','zoomBlur','shockwave','wave','heat','water','underwater','fogDepth','fogHeight','fogVolume','clouds','stars','aurora','rain','snow','lens','grid','halftone','ascii','kaleidoscope','mirror','refract','displace','twist','swirl','bulge','pinch','fisheye','barrel','pincushion','vhs','glitch','datamosh'];
const LIGHTS = ['ambient','directional','point','spot','hemisphere','rectArea','probe','sun','moon','sky','bounce','fill'];
const PARTICLES = ['spark','smoke','fire','water','dust','magic','plasma','ember','snow','rain','leaf','bubble','star','explosion','trail','beam','lightning','shockwave','aura','heal','hit','blood','debris','glass','wood','metal','rock','cloth','paper','coin','xp','crit','dodge','counter','combo','status'];
const PHYSICS_PRESETS = ['default','bouncy','heavy','light','sticky','slippery','ice','rubber','metal','wood','stone','cloth','water','oil','sand','glass','foam','honey','tar','mud','snow','feather','lead','concrete','paper','plastic','bone','flesh','grass','waterDeep','quicksand'];
const INPUTS = ['keyW','keyA','keyS','keyD','keySpace','keyShift','keyCtrl','keyE','keyQ','keyR','keyF','key1','key2','key3','key4','mouseLeft','mouseRight','mouseMiddle','mouseWheelUp','mouseWheelDown','mouseMove','touchTap','touchDoubleTap','touchLongPress','touchSwipeUp','touchSwipeDown','touchSwipeLeft','touchSwipeRight'];
const EVENTS = ['init','load','ready','start','stop','pause','resume','update','render','preRender','postRender','physics','collision','trigger','spawn','despawn','damage','heal','death','level_up','score','win','lose','input','key','mouse','touch','gamepad','resize','focus','blur','visibility'];
const CAMERAS = ['fps','tps','orbit','cine','dolly','rails','spline','follow','smoothFollow','lookahead','shoulder','overShoulder','topDown','isometric','sideScroll','freefly','debug','replay','split','pip','quad','pano','vr','ar','ortho','persp','fisheye','nightVision'];
const UI_PRESETS = ['healthBar','manaBar','staminaBar','xpBar','bossBar','castBar','damageNumber','healNumber','crosshair','hitmarker','minimap','compass','radar','waypoint','questMarker','nameplate','dialogue','inventory','hotbar','tooltip','toast','scoreboard','leaderboard','chatBox','loadingScreen','startScreen','pauseScreen','gameOverScreen','settingsMenu'];
const COLOR_SPACES = ['srgb','linear','aces','acesCG','rec709','rec2020','dci-p3','adobeRGB','prophoto','hsv','hsl','lab'];
const BIOMES = ['forest','desert','tundra','swamp','jungle','mountain','ocean','volcanic','arctic','savanna','grassland','mushroom','crystal','wasteland','alien'];

function generateManifest() {
  const out = [];
  const seen = new Set();
  const add = (category, name, args = {}) => { const key = category + '|' + name; if (seen.has(key)) return; seen.add(key); out.push({ category, name, ...args }); };
  for (const p of PRIMS) add('primitive', p);
  for (const m of MATS) add('material', m);
  for (const e of EASE) add('easing', e);
  for (const n of NOISE) add('noise', n);
  for (const l of LIGHTS) add('light', l);
  for (const fx of POSTFX) add('postfx', fx);
  for (const p of PARTICLES) add('particle', p);
  for (const p of PHYSICS_PRESETS) add('physics', p);
  for (const i of INPUTS) add('input', i);
  for (const e of EVENTS) add('event', e);
  for (const c of CAMERAS) add('camera', c);
  for (const u of UI_PRESETS) add('ui', u);
  for (const c of COLOR_SPACES) add('colorspace', c);
  for (const b of BIOMES) add('biome', b);
  for (const p of PRIMS) for (const m of MATS) add('mesh-combo', `${p}+${m}`, { primitive: p, material: m });
  for (const l of LIGHTS) for (const m of MATS) add('light-material', `${l}+${m}`, { light: l, material: m });
  for (const p of PRIMS) for (const fx of POSTFX) add('primitive-postfx', `${p}+${fx}`, { primitive: p, postfx: fx });
  for (const p of PRIMS) for (const e of EASE) for (const n of NOISE) add('anim-noise', `${p}+${e}+${n}`, { primitive: p, easing: e, noise: n });
  for (const m of MATS) for (const p of PARTICLES) add('material-particle', `${m}+${p}`, { material: m, particle: p });
  for (const b of BIOMES) for (const p of PRIMS) for (const l of ['low','mid','high']) add('biome-lod', `${b}+${p}+${l}`, { biome: b, primitive: p, lod: l });
  for (const i of INPUTS) for (const c of CAMERAS) for (const u of UI_PRESETS) add('input-camera-ui', `${i}+${c}+${u}`, { input: i, camera: c, ui: u });
  for (const e of EASE) for (const p of PRIMS) for (const h of ['mild','strong','heroic']) add('anim-seq', `${e}+${p}+${h}`, { easing: e, primitive: p, style: h });
  for (const m of MATS) for (let h = 0; h < 24; h++) for (const s of [0.2, 0.5, 0.8, 1.0, 1.2, 1.5]) for (const i of [0.5, 1.0, 1.5, 2.0]) add('material-hue', `${m}+h${h}+s${s.toFixed(1)}+i${i.toFixed(1)}`, { material: m, hue: h * 15, saturation: s, lightIntensity: i });
  return out;
}

export const features = {
  _list: null,
  _get() { if (!this._list) this._list = generateManifest(); return this._list; },
  list() { return this._get(); },
  count() { return this._get().length; },
  categories() { const set = new Set(); for (const f of this._get()) set.add(f.category); return [...set]; },
  query(predicate) { return this._get().filter(predicate); },
  find(category, name) { return this._get().find(f => f.category === category && f.name === name); },
  stats() { const stats = {}; for (const f of this._get()) stats[f.category] = (stats[f.category] || 0) + 1; return stats; },
};

/* ---------------------------------------------------------------
 * Namespace public
 * --------------------------------------------------------------- */
const OLLOW = {
  Engine, OllowScene, Controls, ParticleSystem, NavGrid, AudioBus, ECS, PluginHost, EventBus,
  MATERIALS, GEOMETRIES, features, math, noise, easing,
  BUILD, VERSION, CONFIG, THREE,
};
if (typeof window !== 'undefined') window.OLLOW = OLLOW;
export default OLLOW;