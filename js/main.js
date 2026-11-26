// =====================================================
//  노을 호수 낚시 — 메인 코드
//  맵을 돌아다니다가 원하는 곳에 낚싯대를 던질 수 있어요.
// =====================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { YOUTUBE_LINK, SHOW_YOUTUBE, MUSIC_FILE, MUSIC_VOLUME } from './settings.js';
import { setupMulti, PLAYER_LOOKS } from './multi.js';
import { RARITY, FISH, MUTATIONS, rollFish, findFish, mutList, mutKey, priceOf, fmtKg, makeFishModel, fishScale, zoneOf as fishZone } from './fish.js';

// 이로치 이름을 각자 색으로 칠한 HTML ("골드 다이아")
const mutHTML = (str) => mutList(str).map((m) => `<span style="color:${m.color}">${m.name}</span>`).join(' ');
// 이로치 색 목록 (테두리 반반 칠하기에 써요)
const mutColors = (str) => mutList(str).map((m) => m.color);

// ---------- 장면, 카메라 ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeca77c);
scene.fog = new THREE.Fog(0xe0a07e, 30, 115);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 220);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, true);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.prepend(renderer.domElement);

// ---------- 빛 (노을 + 살짝 보랏빛 어둠) ----------
const hemi = new THREE.HemisphereLight(0xffdfbd, 0x3d4466, 1.6);
scene.add(hemi);
const sunsetLight = new THREE.DirectionalLight(0xffc18a, 2.2);
sunsetLight.position.set(-9, 15, 7);
sunsetLight.castShadow = true;
sunsetLight.shadow.mapSize.set(1024, 1024);
Object.assign(sunsetLight.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26 });
scene.add(sunsetLight);
scene.add(sunsetLight.target); // 그림자가 주인공을 따라다니게 (맵이 넓어서)
const warmFill = new THREE.PointLight(0xffae72, 90, 60, 2);
warmFill.position.set(0, 9, -20);
scene.add(warmFill);
// 다크 판타지 느낌: 호수 위에 은은한 보랏빛
const violetGlow = new THREE.PointLight(0x9a6bff, 40, 40, 2);
violetGlow.position.set(0, 3, -12);
scene.add(violetGlow);

const mat = (color, roughness = 0.86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

// ---------- 땅 ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat(0x607856));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);

// ---------- 바위 언덕 (계단으로 올라가면 꼭대기에 연못이 있어요) ----------
const PLATEAU = { x0: 24, x1: 40, z0: -17, z1: -1, h: 4.2 }; // 넓혀서 위에 상점도 있어요
// 돌계단: 언덕 앞(+z 쪽)에서 위로 올라가요. 14칸, 한 칸에 0.3 씩
const STAIRS = { x0: 28.4, x1: 30.2, z0: -1, steps: 14, depth: 0.45, rise: 0.3 };
const FALL_Z = -7; // 폭포가 떨어지는 자리
STAIRS.z1 = STAIRS.z0 + STAIRS.steps * STAIRS.depth;
const onPlateau = (x, z) => x > PLATEAU.x0 && x < PLATEAU.x1 && z > PLATEAU.z0 && z < PLATEAU.z1;
const onStairs = (x, z) => x > STAIRS.x0 && x < STAIRS.x1 && z >= STAIRS.z0 && z < STAIRS.z1;
function stairHeight(z) {
  const k = Math.min(STAIRS.steps - 1, Math.max(0, Math.floor((STAIRS.z1 - z) / STAIRS.depth)));
  return (k + 1) * STAIRS.rise;
}

// ---------- 물 ----------
// 물은 타원 여러 개로 만들어요. y = 물 높이, luck = 여기서 낚으면 운 보너스
const LAKE = { x: 0, z: -14, rx: 26, rz: 15, y: 0.02 }; // 엄청 넓은 큰 호수
const PLATEAU_TOP = PLATEAU.h + 0.09; // 풀 덮개 윗면 (여기에 발이 닿아요)
const TOP_Y = PLATEAU_TOP + 0.13;     // 언덕 위 물 높이 (모래 테두리보다 위, 물결이 쳐도 안 숨게)
const WATERS = [
  LAKE,
  { x: 23.5, z: FALL_Z, rx: 1.5, rz: 0.8, y: 0.025, stream: true },               // 폭포 아래 개울 → 큰 호수
  { x: 29.8, z: -7.4, rx: 3.6, rz: 3.4, y: TOP_Y, luck: 0.05, name: '산 위 연못', zone: 'mountain' }, // 언덕 꼭대기 연못 (신기한 물고기)
  { x: 25.3, z: FALL_Z, rx: 1.5, rz: 0.55, y: TOP_Y + 0.002, stream: true, zone: 'mountain' } // 연못 → 폭포로 가는 물길
];
// (x, z) 에 있는 물과, 물 한가운데서 얼마나 떨어졌는지(d: 0=가운데, 1=가장자리)
function waterInfo(x, z, margin = 0) {
  for (const e of WATERS) {
    const dx = (x - e.x) / (e.rx + margin), dz = (z - e.z) / (e.rz + margin);
    const d2 = dx * dx + dz * dz;
    if (d2 < 1) return { e, d: Math.sqrt(d2) };
  }
  return null;
}
const waterAt = (x, z, margin = 0) => waterInfo(x, z, margin)?.e || null;
const inLake = (x, z, margin = 0) => !!waterAt(x, z, margin);
// 얕은 물: 가장자리 띠(바깥쪽 14%)와 개울은 걸어 들어갈 수 있어요
const SHALLOW = 0.86;
function isShallow(x, z) {
  const w = waterInfo(x, z);
  return !!w && (w.e.stream || w.d > SHALLOW);
}

// 언덕 만들기: 큰 바위 덩어리 + 풀 덮개 + 울퉁불퉁 튀어나온 바위들
const terrain = new THREE.Group(); // 카메라가 언덕 속으로 들어가지 않게 따로 묶어요
scene.add(terrain);
{
  const P = PLATEAU, W = P.x1 - P.x0, D = P.z1 - P.z0;
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const rockA = mat(0x6f6a5e, 0.95), rockB = mat(0x5f5a50, 0.95), rockC = mat(0x7d776a, 0.95);
  const block = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    terrain.add(b);
    return b;
  };
  block(W, P.h, D, rockA, cx, P.h / 2 - 0.08, cz);                 // 몸통
  block(W + 0.3, 0.22, D + 0.3, mat(0x6f9a52, 0.9), cx, P.h - 0.02, cz); // 풀 덮개
  block(W + 0.1, 0.25, D + 0.1, mat(0x5a7a44, 0.9), cx, P.h - 0.2, cz);  // 풀 아래 흙 띠
  // 절벽 면에 튀어나온 바위 (계단과 폭포 자리는 비워요)
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const faces = [
    { n: [0, 1], len: W, base: [P.x0, P.z1], dir: [1, 0] },   // 앞(+z)
    { n: [-1, 0], len: D, base: [P.x0, P.z0], dir: [0, 1] },  // 왼쪽(-x, 폭포 쪽)
    { n: [1, 0], len: D, base: [P.x1, P.z0], dir: [0, 1] },   // 오른쪽
    { n: [0, -1], len: W, base: [P.x0, P.z0], dir: [1, 0] }   // 뒤
  ];
  for (const f of faces) {
    for (let t = 0.4; t < f.len - 0.4; t += 0.9 + rnd() * 0.5) {
      const x = f.base[0] + f.dir[0] * t, z = f.base[1] + f.dir[1] * t;
      if (f.n[1] === 1 && x > STAIRS.x0 - 0.6 && x < STAIRS.x1 + 0.6) continue; // 계단 자리
      if (f.n[0] === -1 && z > FALL_Z - 1 && z < FALL_Z + 1) continue;            // 폭포 자리
      const w = 0.7 + rnd() * 0.8, h = 0.6 + rnd() * (P.h - 0.6), d = 0.35 + rnd() * 0.3;
      const along = f.dir[0] ? [w, d] : [d, w];
      block(along[0], h, along[1], [rockA, rockB, rockC][Math.floor(rnd() * 3)],
        x + f.n[0] * d * 0.3, h / 2 - 0.08 + rnd() * 0.15, z + f.n[1] * d * 0.3);
    }
  }
  // 돌계단 (아래부터 한 칸씩 쌓아요)
  const stepA = mat(0x9a9284, 0.9), stepB = mat(0x8a8274, 0.9);
  for (let k = 0; k < STAIRS.steps; k++) {
    const h = (k + 1) * STAIRS.rise;
    const zc = STAIRS.z1 - (k + 0.5) * STAIRS.depth;
    block(STAIRS.x1 - STAIRS.x0, h, STAIRS.depth, k % 2 ? stepA : stepB, (STAIRS.x0 + STAIRS.x1) / 2, h / 2 - 0.08, zc);
  }
  // 계단 옆 돌난간
  for (const sx of [STAIRS.x0 - 0.12, STAIRS.x1 + 0.12]) {
    for (let k = 0; k < STAIRS.steps; k++) {
      const h = (k + 1) * STAIRS.rise + 0.35;
      block(0.24, h, STAIRS.depth, rockB, sx, h / 2 - 0.08, STAIRS.z1 - (k + 0.5) * STAIRS.depth);
    }
  }
}

// vertexColors: 가운데는 깊어 보이게 진하게, 가장자리는 얕은 청록으로 (색칠은 아래에서)
const waterMat = new THREE.MeshStandardMaterial({ color: 0x477f82, roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.96, vertexColors: true });
// 물 위 반짝이는 잔물결: 하얀 물결무늬 그림을 두 장 겹쳐서 서로 다른 방향으로 흘려요
const shimmerTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(255,255,255,0.9)';
  x.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const sx = Math.random() * 256, sy = Math.random() * 256, len = 14 + Math.random() * 34;
    x.lineWidth = 1 + Math.random() * 2;
    x.globalAlpha = 0.25 + Math.random() * 0.6;
    x.beginPath();
    for (let k = 0; k <= 10; k++) {
      const px = sx + (k / 10) * len, py = sy + Math.sin(k * 0.9) * 2.2;
      if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
})();
const shimmerTex2 = shimmerTex.clone();
shimmerTex2.needsUpdate = true;
shimmerTex.repeat.set(9, 6);
shimmerTex2.repeat.set(6.5, 4.2);
const shimmerMats = [shimmerTex, shimmerTex2].map((map) => new THREE.MeshBasicMaterial({
  map, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffeedd
}));
const foamMats = [];
const waterParts = [];
WATERS.forEach((e, k) => {
  // 물가 모래 (개울은 모래 테두리를 얇게)
  const pad = e.stream ? 0.35 : 0.9;
  const shore = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(0x8c7c5a));
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(e.rx + pad, e.rz + pad, 1);
  shore.position.set(e.x, e.y > 1 ? PLATEAU_TOP + 0.02 + k * 0.001 : -0.06 + k * 0.001, e.z);
  shore.receiveShadow = true;
  scene.add(shore);
  // 네모난 판을 타원 모양으로 오므려서 물을 만들어요
  const geo = new THREE.PlaneGeometry(e.rx * 2, e.rz * 2, Math.ceil(e.rx * 4), Math.ceil(e.rz * 4));
  const pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i);
    const d = Math.hypot(x / e.rx, y / e.rz);
    if (d > 1) pa.setXY(i, x / d, y / d);
  }
  // 깊이 색: 가운데(0)는 0.62배로 진하게, 가장자리(1)는 1.1배로 밝게 (개울은 얕아서 밝게)
  const cols = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) {
    const d = Math.min(1, Math.hypot(pa.getX(i) / e.rx, pa.getY(i) / e.rz));
    const v = e.stream ? 1.05 : 0.62 + 0.48 * Math.pow(d, 1.6);
    cols[i * 3] = v * 0.92; cols[i * 3 + 1] = v; cols[i * 3 + 2] = v * (1.02 - d * 0.04);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const water = new THREE.Mesh(geo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(e.x, e.y + k * 0.002, e.z);
  water.receiveShadow = true;
  scene.add(water);
  // 반짝이는 잔물결 두 겹 (물결 모양을 같이 따라 출렁여요)
  shimmerMats.forEach((sm, j) => {
    const sh = new THREE.Mesh(geo, sm);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(e.x, e.y + k * 0.002 + 0.012 + j * 0.004, e.z);
    sh.renderOrder = 2;
    scene.add(sh);
  });
  // 물가의 하얀 거품 테두리 (개울은 빼요)
  if (!e.stream) {
    const fm = new THREE.MeshBasicMaterial({ color: 0xf4fbf6, transparent: true, opacity: 0.35, depthWrite: false });
    const foam = new THREE.Mesh(new THREE.RingGeometry(0.975, 1.004, 128), fm);
    foam.rotation.x = -Math.PI / 2;
    foam.scale.set(e.rx, e.rz, 1);
    foam.position.set(e.x, e.y + 0.05, e.z);
    foam.renderOrder = 3;
    scene.add(foam);
    foamMats.push(fm);
  }
  // 작은 물은 물결을 반만 (출렁이다 테두리 아래로 숨지 않게)
  waterParts.push({ geo, base: pa.array.slice(), ox: e.x, oz: e.z, amp: e === LAKE ? 1 : 0.45 });
});

// ---------- 폭포: 언덕 위 물길에서 절벽 아래 개울로 떨어져요 ----------
const fallCanvas = document.createElement('canvas');
fallCanvas.width = 64; fallCanvas.height = 256;
{
  const c = fallCanvas.getContext('2d');
  c.fillStyle = '#5aa0a8';
  c.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(235,250,255,${0.25 + Math.random() * 0.5})`;
    c.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 14 + Math.random() * 40);
  }
}
const fallTex = new THREE.CanvasTexture(fallCanvas);
fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
fallTex.repeat.set(1, 1.5);
fallTex.colorSpace = THREE.SRGBColorSpace;
const fallMat = new THREE.MeshStandardMaterial({ map: fallTex, transparent: true, opacity: 0.88, roughness: 0.2, emissive: 0x2a5a66, emissiveIntensity: 0.4, side: THREE.DoubleSide });
const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.1, TOP_Y), fallMat);
fall.rotation.y = -Math.PI / 2;
fall.position.set(PLATEAU.x0 - 0.06, TOP_Y / 2 + 0.01, FALL_Z);
scene.add(fall);
// 폭포 위쪽 둥근 물마루 + 아래쪽 하얀 물보라
const fallLip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 1.1), fallMat);
fallLip.position.set(PLATEAU.x0 + 0.05, TOP_Y - 0.02, FALL_Z);
scene.add(fallLip);
const foams = [];
for (let i = 0; i < 3; i++) {
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
  f.rotation.x = -Math.PI / 2;
  f.position.set(PLATEAU.x0 - 0.45, 0.06 + i * 0.002, FALL_Z);
  scene.add(f);
  foams.push(f);
}

// ---------- 해 (밤에는 달) ----------
// 맵이 넓어져서 멀리 크게 띄워요. 높이는 낮/밤에 따라 바뀌어요 (updateDayNight)
const SUN_POS = new THREE.Vector3(-30, 18, -115);
const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: 0xffd08d, fog: false }));
sun.position.copy(SUN_POS);
scene.add(sun);
const halo = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshBasicMaterial({ color: 0xffba83, transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
halo.position.copy(sun.position).add(new THREE.Vector3(0, 0, -0.5));
scene.add(halo);
// 밤하늘 별
const STAR_N = 600;
const starGeo = new THREE.BufferGeometry();
{
  const a = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45;
    a[i * 3] = Math.cos(th) * Math.sin(ph) * 170;
    a[i * 3 + 1] = Math.cos(ph) * 170 * 0.6 + 8;
    a[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 170 - 20;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(a, 3));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);

// 부딪히는 물건들 (원 모양으로 막아요)
const colliders = [];
const addCollider = (x, z, r) => colliders.push({ x, z, r });

// ---------- 나무 부두 ----------
const wood = mat(0x936d4d), woodLight = mat(0xb08a61), darkWood = mat(0x594839);
const dock = new THREE.Group();
scene.add(dock);
// 호수가 넓어져서 부두도 물 깊숙이 길게 (판자 26장)
const PLANKS = 26;
const plankGeo = new THREE.BoxGeometry(4.3, 0.16, 0.53);
for (let i = 0; i < PLANKS; i++) {
  const plank = new THREE.Mesh(plankGeo, i % 3 === 0 ? woodLight : wood);
  plank.position.set(0, 0.18, 6.0 - i * 0.54);
  plank.castShadow = plank.receiveShadow = true;
  dock.add(plank);
}
const DOCK = { x0: -1.95, x1: 1.95, z0: 6.0 - (PLANKS - 1) * 0.54 - 0.3, z1: 6.2 };
const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.15, 7);
for (const x of [-1.9, 1.9]) for (let z = 5.95; z > DOCK.z0; z -= 3.2) {
  const post = new THREE.Mesh(postGeo, darkWood);
  post.position.set(x, -0.25, z);
  post.castShadow = true;
  dock.add(post);
}
const railLen = DOCK.z1 - DOCK.z0;
for (const x of [-2.12, 2.12]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, railLen), woodLight);
  rail.position.set(x, 0.29, (DOCK.z0 + DOCK.z1) / 2);
  rail.castShadow = true;
  dock.add(rail);
}
const onDock = (x, z) => x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1;

// 등불 (보랏빛 불꽃) — 밤이 되면 더 밝아져요
const LANTERN_MATS = [];
function makeLantern(x, y, z, parent = scene) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const lampMat = mat(0xd9b8ff, 0.35, { emissive: 0x8a4dff, emissiveIntensity: 1.3 });
  LANTERN_MATS.push(lampMat);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.28), lampMat);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 4), darkWood);
  cap.position.y = 0.28;
  cap.rotation.y = Math.PI / 4;
  g.add(lamp, cap);
  parent.add(g);
  return g;
}
makeLantern(-1.55, 0.36, 5.2, dock);
addCollider(-1.55, 5.2, 0.3);
makeLantern(-1.55, 0.36, DOCK.z0 + 0.6, dock); // 부두 끝 등불
addCollider(-1.55, DOCK.z0 + 0.6, 0.3);

// ---------- 호수 위 작은 섬 ----------
const islands = [];
function makeIsland(x, z, r) {
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 0.35, 9), mat(0x8a6a4a));
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.1, 9), mat(0x6f9a52));
  grass.position.y = 0.2;
  dirt.receiveShadow = grass.receiveShadow = true;
  const g = new THREE.Group();
  g.add(dirt, grass);
  g.position.set(x, 0, z);
  scene.add(g);
  islands.push({ x, z, r: r + 0.2 });
}
makeIsland(-10, -8, 1.6);
makeIsland(11, -10, 1.5);
makeIsland(-4, -24, 2.2); // 호수 저 멀리 큰 섬
const onIsland = (x, z) => islands.some((i) => (x - i.x) ** 2 + (z - i.z) ** 2 < i.r * i.r);

// ---------- 바위 + 보랏빛 수정 ----------
const rockMat = mat(0x73776a);
const rockGeo = new THREE.DodecahedronGeometry(0.42, 0);
const crystalMat = mat(0xb48cff, 0.25, { emissive: 0x7a3cff, emissiveIntensity: 0.9, transparent: true, opacity: 0.92 });
// 호숫가 각도: 0 = 동쪽(언덕), π/2 = 앞쪽(부두·상점), π = 서쪽, -π/2 = 저 멀리 뒤쪽
const shoreAngle = (x, z) => Math.atan2((z - LAKE.z) / LAKE.rz, (x - LAKE.x) / LAKE.rx);
const nearHill = (a) => a > -0.45 && a < 0.95;   // 언덕·폭포 쪽 호숫가
const nearDock = (a) => a > 1.3 && a < 1.85;     // 부두 입구 쪽 호숫가
const shorePoint = (a, r) => [LAKE.x + Math.cos(a) * LAKE.rx * r, LAKE.z + Math.sin(a) * LAKE.rz * r];
// [x, z, 수정 있음?, 높이(언덕 위면 PLATEAU_TOP)]
const ROCKS = [];
[1.05, 2.0, 2.5, 3.0, 3.6, 4.1, 4.6, 5.1, 5.6, 6.05].forEach((a, i) => {
  const [x, z] = shorePoint(a, 1.1);
  ROCKS.push([x, z, i % 3 === 0]);
});
ROCKS.push(
  [PLATEAU.x1 - 1.4, PLATEAU.z0 + 1.4, true, PLATEAU_TOP], [PLATEAU.x0 + 1.6, PLATEAU.z0 + 1.3, false, PLATEAU_TOP],
  [PLATEAU.x1 - 0.9, PLATEAU.z1 - 1.8, false, PLATEAU_TOP], [STAIRS.x1 + 2.2, STAIRS.z0 + 4.5, false]
);
ROCKS.forEach(([x, z, crystal, y0 = -0.08], i) => {
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(x, y0 + 0.18, z);
  rock.rotation.set(0.18 * i, i, 0.12);
  rock.scale.set(1.25, 0.72, 1);
  rock.castShadow = rock.receiveShadow = true;
  scene.add(rock);
  addCollider(x, z, 0.6);
  if (crystal) {
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + k * 0.06, 0), crystalMat);
      c.position.set(x + 0.5 + k * 0.18, y0 + 0.28 + k * 0.08, z - 0.35 + k * 0.2);
      c.scale.y = 2.2;
      c.rotation.set(0.2 * k, k, 0.25 - k * 0.2);
      scene.add(c);
    }
  }
});

// ---------- 연잎, 갈대, 덤불 ----------
{
  // 연잎: 호수 가장자리 근처 물 위에 둥둥 (가끔 분홍 꽃)
  const padMat = mat(0x4f8a3e, 0.7), padMat2 = mat(0x5f9a48, 0.7), flower = mat(0xf2a0c0, 0.5, { emissive: 0x6a2040, emissiveIntensity: 0.2 });
  let s = 3;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = 0.6 + rnd() * 0.25;
    const x = LAKE.x + Math.cos(a) * LAKE.rx * r, z = LAKE.z + Math.sin(a) * LAKE.rz * r;
    if (Math.abs(x) < 3.5 && z > DOCK.z0 - 2) continue; // 부두 근처는 비워요
    if (onIsland(x, z)) continue;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32 + rnd() * 0.18, 0.32, 0.03, 10, 1, false, 0, Math.PI * 1.8), i % 2 ? padMat : padMat2);
    pad.position.set(x, 0.05, z);
    pad.rotation.y = rnd() * 6;
    pad.receiveShadow = true;
    scene.add(pad);
    if (i % 4 === 0) {
      const fl = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), flower);
      fl.position.set(x + 0.08, 0.13, z);
      fl.scale.y = 0.7;
      scene.add(fl);
    }
  }
  // 갈대: 호숫가 모래 테두리에 무리 지어 (끝에 갈색 이삭)
  const reedMat = mat(0x6a8a3a, 0.9), tipMat = mat(0x6b4a2a, 0.9);
  const reedSpots = [1.1, 1.25, 2.0, 2.3, 2.75, 3.2, 3.5, 3.9, 4.4, 4.8, 5.3, 5.75, 6.15];
  for (const a of reedSpots) {
    const cx = LAKE.x + Math.cos(a) * (LAKE.rx + 0.45), cz = LAKE.z + Math.sin(a) * (LAKE.rz + 0.45);
    if (nearDock(a) || nearHill(a)) continue;                // 부두 입구, 언덕·개울 자리
    for (let k = 0; k < 6; k++) {
      const h = 0.7 + rnd() * 0.6;
      const x = cx + (rnd() - 0.5) * 0.7, z = cz + (rnd() - 0.5) * 0.5;
      const reed = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.04), reedMat);
      reed.position.set(x, h / 2 - 0.06, z);
      reed.rotation.z = (rnd() - 0.5) * 0.25;
      reed.castShadow = true;
      scene.add(reed);
      if (k % 2 === 0) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.07), tipMat);
        tip.position.set(x, h - 0.02, z);
        scene.add(tip);
      }
    }
  }
  // 덤불: 길가와 언덕 아래에 몽글몽글
  const bushMat = mat(0x4a7a3c, 0.95), bushMat2 = mat(0x5a8a44, 0.95);
  [[-4.5, 9.5], [4, 10.8], [-11.5, 6.5], [12, 5.5], [STAIRS.x0 - 1.6, STAIRS.z1 - 0.4], [STAIRS.x1 + 2, STAIRS.z1 + 0.6],
   [-24, 6], [22, 9], [-15, 11.5], [10.8, 11.5], [-32, -6], [-28, -24], [14, -31], [36, -18]]
    .forEach(([x, z], i) => {
      for (let k = 0; k < 3; k++) {
        const sz = 0.45 + rnd() * 0.35;
        const b = new THREE.Mesh(new THREE.BoxGeometry(sz, sz * 0.8, sz), k % 2 ? bushMat : bushMat2);
        b.position.set(x + (k - 1) * 0.35, sz * 0.4 - 0.05, z + (rnd() - 0.5) * 0.3);
        b.rotation.y = rnd();
        b.castShadow = true;
        scene.add(b);
      }
      addCollider(x, z, 0.55);
    });
}

// =====================================================
//  지형 꾸미기: 흙길, 캠핑장, 나무다리, 꽃밭, 먼 언덕
// =====================================================
// 폭포 아래 개울을 건너는 나무다리 (위로 걸어갈 수 있어요)
const BRIDGE = { x0: 21.9, x1: 23.3, z0: FALL_Z - 1.5, z1: FALL_Z + 1.5, y: 0.32 };
const onBridge = (x, z) => x > BRIDGE.x0 && x < BRIDGE.x1 && z > BRIDGE.z0 && z < BRIDGE.z1;
const campfire = { flames: [], light: null };
{
  const B = BRIDGE, bw = B.x1 - B.x0, bl = B.z1 - B.z0;
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.1, bl / 6 - 0.04), i % 2 ? wood : woodLight);
    p.position.set((B.x0 + B.x1) / 2, B.y - 0.05, B.z0 + (i + 0.5) * bl / 6);
    p.castShadow = p.receiveShadow = true;
    scene.add(p);
  }
  for (const x of [B.x0 - 0.05, B.x1 + 0.05]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, bl), darkWood);
    rail.position.set(x, B.y + 0.45, (B.z0 + B.z1) / 2);
    scene.add(rail);
    for (const z of [B.z0 + 0.1, (B.z0 + B.z1) / 2, B.z1 - 0.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), darkWood);
      post.position.set(x, B.y + 0.18, z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  // 흙길: 상점 ↔ 부두 입구 ↔ 언덕 계단
  const pathMat = mat(0x8a7050, 0.95);
  const PATHS = [
    [[-7.5, 11], [0, 9.6], [7.5, 11]],
    [[0, 9.6], [0, 6.6]],
    [[7.5, 11], [14, 9], [22, 7.2], [(STAIRS.x0 + STAIRS.x1) / 2, STAIRS.z1 + 0.6]],
    [[-7.5, 11], [-14, 9.5], [-18.5, 8.5]]
  ];
  for (const pts of PATHS) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, len + 1.2), pathMat);
      seg.position.set((ax + bx) / 2, -0.065, (az + bz) / 2);
      seg.rotation.y = Math.atan2(bx - ax, bz - az);
      seg.receiveShadow = true;
      scene.add(seg);
    }
  }

  // 캠핑장: 텐트 + 모닥불 + 통나무 의자
  const cx = -18.5, cz = 6.4;
  const stoneMat = mat(0x7a7468);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), stoneMat);
    st.position.set(cx + Math.cos(a) * 0.62, 0.02, cz + Math.sin(a) * 0.62);
    st.rotation.y = a;
    scene.add(st);
  }
  for (const r of [0.5, -0.6]) {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 7), darkWood);
    lg.rotation.z = Math.PI / 2;
    lg.rotation.y = r;
    lg.position.set(cx, 0.06, cz);
    scene.add(lg);
  }
  [[0xff8a2a, 0.34, 0.7], [0xffc23a, 0.24, 0.55], [0xffe8a0, 0.14, 0.4]].forEach(([c, r, h]) => {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, transparent: true, opacity: 0.92 }));
    fl.position.set(cx, h / 2 + 0.05, cz);
    scene.add(fl);
    campfire.flames.push(fl);
  });
  campfire.light = new THREE.PointLight(0xff9a40, 8, 9, 2);
  campfire.light.position.set(cx, 0.9, cz);
  campfire.pos = new THREE.Vector3(cx, 0, cz);
  campfire.seats = [];
  scene.add(campfire.light);
  addCollider(cx, cz, 0.75);
  for (const [lx, lz, ry] of [[cx + 1.5, cz + 0.2, 0.2], [cx - 0.3, cz + 1.5, 1.5]]) {
    // 앉는 자리: 통나무 위, 모닥불을 바라보게
    campfire.seats.push({ x: lx, z: lz, ry: Math.atan2(-(cx - lx), -(cz - lz)) });
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 8), wood);
    seat.rotation.z = Math.PI / 2;
    seat.rotation.y = ry;
    seat.position.set(lx, 0.14, lz);
    seat.castShadow = true;
    scene.add(seat);
    addCollider(lx, lz, 0.45);
  }
  // 텐트 (A자 모양)
  const tentMat = mat(0xc8643a, 0.9), tentIn = mat(0x3a2418, 0.9);
  const tx = -21.6, tz = 8.6;
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 2.4), tentMat);
    side.position.set(tx + s * 0.55, 0.62, tz);
    side.rotation.z = s * -0.85;
    side.castShadow = true;
    scene.add(side);
  }
  const door = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.25, 3), tentIn);
  door.position.set(tx, 0.55, tz + 1.15);
  door.rotation.y = Math.PI;
  door.scale.z = 0.05;
  scene.add(door);
  addCollider(tx, tz, 1.4);

  // 꽃밭: 길가와 캠핑장 근처에 알록달록
  const petals = [0xff8ab8, 0xffe06a, 0xffffff, 0xc89aff, 0xff7a5a].map((c) => mat(c, 0.6));
  const stemMat = mat(0x4a8a3a);
  let fs = 11;
  const frnd = () => ((fs = (fs * 9301 + 49297) % 233280) / 233280);
  let made = 0;
  for (let i = 0; i < 400 && made < 90; i++) {
    const x = -32 + frnd() * 52, z = 2.5 + frnd() * 12;
    if (inLake(x, z, 0.08) || onDock(x, z)) continue;
    if (colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2)) continue;
    if (Math.abs(x + 7.5) < 2.6 && Math.abs(z - 8.2) < 2.6) continue; // 상점 자리
    if (Math.abs(x - 7.5) < 2.6 && Math.abs(z - 8.2) < 2.6) continue;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), stemMat);
    stem.position.set(x, 0.03, z);
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), petals[made % petals.length]);
    petal.position.set(x, 0.16, z);
    petal.rotation.y = frnd() * 3;
    scene.add(stem, petal);
    made++;
  }

  // 먼 풀 언덕 (맵 가장자리)
  const hillA = mat(0x6a8e4e, 0.95), hillB = mat(0x7aa058, 0.95);
  for (const [hx, hz, s] of [[-35, 10, 1.2], [-36, -28, 1.4], [18, -33, 1.3], [42, 12, 1.0], [-20, -33, 1.0]]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(7 * s, 0.9, 5 * s), hillA);
    a.position.set(hx, 0.37, hz);
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.6 * s, 0.8, 3.2 * s), hillB);
    b.position.set(hx + 0.4, 1.2, hz - 0.2);
    const c = new THREE.Mesh(new THREE.BoxGeometry(2.2 * s, 0.6, 1.6 * s), hillA);
    c.position.set(hx - 0.3, 1.9, hz + 0.1);
    for (const m of [a, b, c]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
    addCollider(hx, hz, 3.0 * s);
  }
}

// ---------- 하늘에 떠가는 구름 (낮/밤에 따라 색이 바뀌어요) ----------
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffc8b0, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
const clouds = [];
{
  let cs = 5;
  const crnd = () => ((cs = (cs * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(crnd() * 4);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(4 + crnd() * 6, 1.4 + crnd() * 1.6, 3 + crnd() * 4), cloudMat);
      b.position.set((k - n / 2) * 2.6 + crnd() * 1.5, crnd() * 1.2, (crnd() - 0.5) * 3);
      g.add(b);
    }
    g.position.set(-120 + crnd() * 240, 36 + crnd() * 16, -130 + crnd() * 170);
    g.userData.speed = 0.8 + crnd() * 0.9;
    scene.add(g);
    clouds.push(g);
  }
}

// 호수 위를 떠다니는 보랏빛 반딧불
const WISPS = 140;
const wispGeo = new THREE.BufferGeometry();
const wispBase = new Float32Array(WISPS * 3);
for (let i = 0; i < WISPS; i++) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
  wispBase[i * 3] = LAKE.x + Math.cos(a) * r * (LAKE.rx + 2);
  wispBase[i * 3 + 1] = 0.4 + Math.random() * 2.2;
  wispBase[i * 3 + 2] = LAKE.z + Math.sin(a) * r * (LAKE.rz + 2);
}
wispGeo.setAttribute('position', new THREE.BufferAttribute(wispBase.slice(), 3));
const wisps = new THREE.Points(wispGeo, new THREE.PointsMaterial({ color: 0xcfb0ff, size: 0.11, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(wisps);

// ---------- 나무 (맵 가장자리) ----------
function makeBlockTree(scale) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), mat(0x6b4a32));
  trunk.position.y = 1;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = mat(0x4f8a4a, 0.9);
  for (const [w, y] of [[2.2, 2.4], [1.6, 3.3], [0.9, 4.0]]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, w), leafMat);
    leaf.position.y = y;
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.scale.setScalar(scale * 1.3);
  return g;
}
const loader = new GLTFLoader();
const treeURLs = [
  'https://cdn.cinevva.com/assets/packs/quaternius/cube-world/Tree_1.glb',
  'https://cdn.cinevva.com/assets/packs/quaternius/cube-world/Tree_2.glb'
];
const TREES = [];
// 호수를 빙 둘러서
[1.1, 2.1, 2.6, 3.1, 3.6, 4.2, 4.7, 5.2, 5.75].forEach((a, i) => {
  const [x, z] = shorePoint(a, 1.3);
  TREES.push([x, z, 0.75 + (i % 3) * 0.1]);
});
// 상점 근처, 맵 가장자리, 언덕 위
TREES.push([-16, 10, 0.82], [17, 11.5, 0.9], [-27, 12, 0.85], [31, 10, 0.95], [42.5, -8, 0.9], [41, 5, 0.8], [37, -25, 0.85], [-36, -16, 0.9],
  [PLATEAU.x1 - 1.6, PLATEAU.z1 - 1.0, 0.7, PLATEAU_TOP], [PLATEAU.x0 + 1.6, PLATEAU.z1 - 1.2, 0.6, PLATEAU_TOP]);
TREES.forEach(([x, z, s, y0 = 0], i) => {
    addCollider(x, z, 0.8);
    const place = (tree) => {
      tree.position.set(x, y0, z);
      tree.rotation.y = (i * 1.7) % (Math.PI * 2);
      tree.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(tree);
    };
    loader.load(treeURLs[i % 2], (gltf) => { gltf.scene.scale.setScalar(s); place(gltf.scene); }, undefined, () => place(makeBlockTree(s)));
  });

// =====================================================
//  블록 캐릭터 (이 모양은 그대로 유지!)
// =====================================================
function box(w, h, d, color, x, y, z, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.8, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function makeBlockPerson(o) {
  const g = new THREE.Group();
  const faceParts = [];
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.12, 0.5, 0);
    hip.add(box(0.21, 0.36, 0.23, o.pants, 0, -0.18, 0));
    hip.add(box(0.23, 0.18, 0.25, o.boots, 0, -0.42, 0));
    hip.add(box(0.23, 0.07, 0.32, o.boots, 0, -0.475, -0.04));
    g.add(hip);
    legs.push(hip);
  }
  g.add(box(0.52, 0.12, 0.31, o.belt ?? 0x3a2c22, 0, 0.53, 0));
  g.add(box(0.52, 0.5, 0.3, o.shirt, 0, 0.84, 0));
  if (o.vest) {
    for (const s of [-1, 1]) {
      g.add(box(0.2, 0.48, 0.03, o.vest, s * 0.155, 0.84, -0.16));
      g.add(box(0.12, 0.1, 0.02, o.vestPocket ?? 0x5d6b3a, s * 0.155, 0.76, -0.18));
      g.add(box(0.03, 0.48, 0.3, o.vest, s * 0.265, 0.84, 0));
    }
    g.add(box(0.52, 0.48, 0.03, o.vest, 0, 0.84, 0.16));
  }
  if (o.apron) g.add(box(0.4, 0.6, 0.02, o.apron, 0, 0.72, -0.165));

  const head = new THREE.Group();
  head.position.set(0, 1.33, 0);
  g.add(head);
  head.add(box(0.46, 0.44, 0.42, o.skin, 0, 0, 0));
  for (const s of [-1, 1]) {
    const eye = box(0.09, 0.11, 0.02, 0x22202a, s * 0.1, 0.01, -0.215);
    const shine = box(0.03, 0.03, 0.01, 0xffffff, s * 0.1 + 0.02, 0.04, -0.227, { emissive: 0xffffff, emissiveIntensity: 0.4 });
    const brow = box(0.1, 0.025, 0.02, o.hairColor ?? 0x3b2a20, s * 0.1, 0.1, -0.215);
    const blush = box(0.08, 0.04, 0.01, 0xf28b82, s * 0.16, -0.07, -0.214);
    head.add(eye, shine, brow, blush);
    faceParts.push(eye, shine, brow, blush);
  }
  const mouth = box(0.1, 0.025, 0.02, 0x8a3b3b, 0, -0.12, -0.215);
  head.add(mouth);
  faceParts.push(mouth);
  if (o.glasses) {
    head.add(box(0.42, 0.025, 0.02, 0x1d1d1d, 0, 0.05, -0.225));
    for (const s of [-1, 1]) head.add(box(0.15, 0.1, 0.02, o.glasses, s * 0.1, 0.01, -0.228, { metalness: 0.4, roughness: 0.2 }));
  }
  if (o.beard) {
    head.add(box(0.46, 0.12, 0.04, o.beard, 0, -0.17, -0.205));
    head.add(box(0.18, 0.035, 0.03, o.beard, 0, -0.085, -0.222));
    for (const s of [-1, 1]) head.add(box(0.04, 0.22, 0.3, o.beard, s * 0.235, -0.1, -0.05));
  }
  const hc = o.hairColor ?? 0x3b2a20;
  if (o.hair === 'short' || o.hair === 'long') {
    head.add(box(0.48, 0.1, 0.44, hc, 0, 0.25, 0));
    head.add(box(0.48, 0.32, 0.06, hc, 0, 0.07, 0.2));
    head.add(box(0.48, 0.08, 0.05, hc, 0, 0.19, -0.205));
    head.add(box(0.14, 0.06, 0.05, hc, -0.15, 0.135, -0.205));
    for (const s of [-1, 1]) head.add(box(0.04, 0.22, 0.34, hc, s * 0.24, 0.1, 0.03));
    if (o.hair === 'long') head.add(box(0.48, 0.4, 0.08, hc, 0, -0.18, 0.2));
  }
  if (o.hat === 'bucket') {
    const hm = mat(o.hatColor, 0.9);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.2, 8), hm);
    crown.position.y = 0.32;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8), hm);
    brim.position.y = 0.23;
    crown.castShadow = brim.castShadow = true;
    head.add(crown, brim);
  } else if (o.hat === 'cap') {
    head.add(box(0.5, 0.12, 0.46, o.hatColor, 0, 0.27, 0));
    head.add(box(0.36, 0.03, 0.2, o.hatColor, 0, 0.22, -0.3));
  } else if (o.hat === 'straw') {
    const hm = mat(o.hatColor, 0.9);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12), hm);
    crown.position.y = 0.31;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), hm);
    brim.position.y = 0.23;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.262, 0.262, 0.05, 12), mat(0xb5442e));
    band.position.y = 0.26;
    head.add(crown, brim, band);
  }
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 1.04, 0);
    pivot.add(box(0.15, 0.24, 0.15, o.sleeve ?? o.shirt, 0, -0.12, 0));
    pivot.add(box(0.14, 0.24, 0.14, o.skin, 0, -0.36, 0));
    pivot.add(box(0.15, 0.1, 0.15, o.skin, 0, -0.52, 0));
    g.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  armL.rotation.set(1.2, 0, 0.35);
  armR.rotation.set(1.2, 0, -0.35);
  return { group: g, head, armL, armR, legs, faceParts };
}

// ---------- 주인공 ----------
const hero = makeBlockPerson({
  skin: 0xf6cfa8, shirt: 0xf4efe4, sleeve: 0xf4efe4, vest: 0x7d8f4e, vestPocket: 0x5f6e37,
  pants: 0x34405e, boots: 0x6b3e2a, hair: 'short', hairColor: 0x4a2f22,
  hat: 'bucket', hatColor: 0xd9a441
});
const person = hero.group;
person.scale.setScalar(1.2);
scene.add(person);
const player = { ry: 0, walkT: 0, moving: false };
person.position.set(0, -0.08, 8.2);

// 머리 위 숫자 (잡은 물고기 마리 수)
const tagCanvas = document.createElement('canvas');
tagCanvas.width = 256; tagCanvas.height = 128;
const tagTex = new THREE.CanvasTexture(tagCanvas);
tagTex.colorSpace = THREE.SRGBColorSpace;
const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true, fog: false, depthWrite: false }));
tag.scale.set(0.75, 0.375, 1);
tag.position.set(0, 2.2, 0);
tag.renderOrder = 10; // 물보다 나중에 그려서 안 가려지게
person.add(tag);
function drawTag(n) {
  const c = tagCanvas.getContext('2d');
  c.clearRect(0, 0, 256, 128);
  c.font = '900 86px "Malgun Gothic", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 12;
  c.strokeStyle = 'rgba(0,0,0,0.8)';
  c.strokeText(String(n), 128, 66);
  c.fillStyle = '#ffffff';
  c.fillText(String(n), 128, 66);
  tagTex.needsUpdate = true;
}

// img/주인공_얼굴.png 가 있으면 얼굴에 붙여요
function removeWhite(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i] > 235 && d.data[i + 1] > 235 && d.data[i + 2] > 235) d.data[i + 3] = 0;
  x.putImageData(d, 0, 0);
  return c;
}
{
  const img = new Image();
  img.onload = () => {
    const tex = new THREE.CanvasTexture(removeWhite(img));
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.42), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.1 }));
    face.position.set(0, 0, -0.212);
    face.rotation.y = Math.PI;
    hero.head.add(face);
    hero.faceParts.forEach((p) => (p.visible = false));
  };
  img.onerror = () => {};
  img.src = 'img/' + encodeURIComponent('주인공_얼굴') + '.png';
}

// =====================================================
//  낚싯대 (6가지) — 운, 게이지 속도, 입질 속도, 초록 칸
// =====================================================
// luck: 귀한 물고기 확률, reel: 게이지 차는 속도 배율, bite: 입질 기다리는 시간 배율(작을수록 빨라요), zone: 초록 칸 추가 크기
// 모양: color→color2 (손잡이 쪽에서 끝으로 색이 바뀌어요), grip 손잡이, accent 장식 띠, reel 릴 색
//       rings 장식 띠 개수, tip 끝 장식(gem/crystal/star), orbit 끝에서 빙글빙글 도는 조각 수
const RODS = [
  { name: '기본 낚싯대',   price: 0,     luck: 0,    reel: 1.0,  bite: 1.0,  zone: 0,
    color: 0x6e5038, color2: 0x8a6a48, grip: 0xc9a26a, accent: 0x3a2a1e, reelC: 0x30343c, rings: 0 },
  { name: '대나무 낚싯대', price: 150,   luck: 0.05, reel: 1.1,  bite: 0.9,  zone: 0.03,
    color: 0xb09848, color2: 0xd8c070, grip: 0x6a4a2a, accent: 0x7a6a30, reelC: 0x5a5a5a, rings: 6 },
  { name: '탄소 낚싯대',   price: 600,   luck: 0.1,  reel: 1.2,  bite: 0.8,  zone: 0.05,
    color: 0x1e2026, color2: 0x30343e, grip: 0x2a2a2a, accent: 0xd03030, reelC: 0xb8bcc4, rings: 4, metal: 0.5, rough: 0.22 },
  { name: '노을빛 낚싯대', price: 2000,  luck: 0.18, reel: 1.3,  bite: 0.68, zone: 0.07,
    color: 0xc8401a, color2: 0xffc24a, grip: 0x4a2a1a, accent: 0xffd36b, reelC: 0xd8a84a, rings: 5, metal: 0.55, rough: 0.3, glow: 0xff6a1a, tip: 'gem' },
  { name: '그림자 낚싯대', price: 5000,  luck: 0.28, reel: 1.38, bite: 0.58, zone: 0.08,
    color: 0x150e20, color2: 0x3a2458, grip: 0x120c1a, accent: 0xb07cff, reelC: 0x2a1f3d, rings: 7, metal: 0.4, rough: 0.3, glow: 0x9a5cff, tip: 'crystal', orbit: 3 },
  { name: '별빛 낚싯대',   price: 12000, luck: 0.4,  reel: 1.5,  bite: 0.48, zone: 0.11,
    color: 0xe6ecff, color2: 0xa8d4ff, grip: 0x2a3a5a, accent: 0x9fd8ff, reelC: 0xe8eef8, rings: 6, metal: 0.45, rough: 0.12, glow: 0x7fc4ff, tip: 'star', orbit: 6 },
  // ---- 언덕 위 상점에서만 팔아요 (shop: 'mountain') ----
  { name: '솜사탕 낚싯대', shop: 'mountain', price: 20000, luck: 0.46, reel: 1.56, bite: 0.44, zone: 0.12,
    color: 0xffb6d5, color2: 0xb8e0ff, grip: 0xfff0f8, accent: 0xff6aa8, reelC: 0xffe0ee, rings: 8, metal: 0.1, rough: 0.4, glow: 0xff8ac8, tip: 'gem', orbit: 4 },
  { name: '용암 낚싯대', shop: 'mountain', price: 45000, luck: 0.53, reel: 1.66, bite: 0.4, zone: 0.13,
    color: 0x1a1210, color2: 0x3a1a10, grip: 0x0c0806, accent: 0xff6a1a, reelC: 0x2a1a14, rings: 9, metal: 0.3, rough: 0.5, glow: 0xff5a10, tip: 'crystal', orbit: 5 },
  { name: '은하수 낚싯대', shop: 'mountain', price: 100000, luck: 0.62, reel: 1.8, bite: 0.34, zone: 0.15,
    color: 0x0a0a2a, color2: 0x3a2a7a, grip: 0x14143a, accent: 0xc8b8ff, reelC: 0x1a1a4a, rings: 10, metal: 0.5, rough: 0.15, glow: 0x9a8aff, tip: 'star', orbit: 9 }
];
RODS.forEach((r) => (r.shop = r.shop || 'base')); // 표시 없는 건 아래 상점 낚싯대
const ROD_LEN = 2.6;

// 낚싯대 모양 만들기: target 그룹 안에 부품을 채워요. 빙글빙글 도는 조각들을 돌려줘요.
function buildRod(r, target) {
  while (target.children.length) target.remove(target.children[0]);
  const half = ROD_LEN / 2;
  const spin = [];
  const glowMat = (c, i = 0.9) => mat(c, 0.3, { emissive: c, emissiveIntensity: i });
  const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; target.add(mesh); return mesh; };
  // 몸통: 5토막, 끝으로 갈수록 가늘어지고 색이 바뀌어요
  const SEG = 5, c1 = new THREE.Color(r.color), c2 = new THREE.Color(r.color2 ?? r.color);
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const rad = (t) => 0.058 - t * 0.036;
    const col = c1.clone().lerp(c2, (i + 0.5) / SEG);
    const m = new THREE.MeshStandardMaterial({
      color: col, metalness: r.metal ?? 0.1, roughness: r.rough ?? 0.55,
      emissive: r.glow ? new THREE.Color(r.glow) : new THREE.Color(0), emissiveIntensity: r.glow ? 0.12 + 0.12 * (i / SEG) : 0
    });
    put(new THREE.Mesh(new THREE.CylinderGeometry(rad(t1), rad(t0), ROD_LEN / SEG, 10), m), 0, -half + (t0 + t1) / 2 * ROD_LEN, 0);
  }
  // 손잡이 + 끝 마개
  put(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.62, 10), mat(r.grip, 0.9)), 0, -half + 0.33, 0);
  put(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.07, 10), mat(r.accent, 0.4, { metalness: 0.6 })), 0, -half + 0.02, 0);
  put(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.05, 10), mat(r.accent, 0.4, { metalness: 0.6 })), 0, -half + 0.66, 0);
  // 릴
  const reel = put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), mat(r.reelC, 0.3, { metalness: 0.7 })), 0.11, -half + 0.85, 0);
  reel.rotation.z = Math.PI / 2;
  put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.12), mat(r.accent, 0.4, { metalness: 0.6 })), 0.17, -half + 0.85, 0.06);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), mat(r.reelC, 0.3, { metalness: 0.7 })), 0.06, -half + 0.85, 0);
  // 줄 고리 (가이드)
  for (let k = 0; k < 5; k++) {
    const y = -half + 1.05 + k * 0.32;
    const ring = put(new THREE.Mesh(new THREE.TorusGeometry(0.04 - k * 0.005, 0.008, 6, 12), mat(r.glow ? r.accent : 0xc8ccd4, 0.3, { metalness: 0.8 })), 0.06, y, 0);
    ring.rotation.x = Math.PI / 2;
  }
  // 장식 띠 (대나무 마디 / 빛나는 룬)
  for (let k = 0; k < (r.rings || 0); k++) {
    const t = (k + 1) / ((r.rings || 0) + 1);
    const y = -half + 0.7 + t * (ROD_LEN - 0.8);
    const rad = 0.058 - ((y + half) / ROD_LEN) * 0.036 + 0.008;
    put(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.035, 10), r.glow ? glowMat(r.accent, 1.1) : mat(r.accent, 0.5, { metalness: (r.metal ?? 0) })), 0, y, 0);
  }
  // 끝 장식
  if (r.tip === 'gem') {
    put(new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), glowMat(r.glow, 1.4)), 0, half + 0.04, 0);
  } else if (r.tip === 'crystal') {
    const c = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), glowMat(r.glow, 1.5)), 0, half + 0.08, 0);
    c.scale.y = 2.2;
  } else if (r.tip === 'star') {
    const a = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMat(0xffffff, 1.6)), 0, half + 0.08, 0);
    a.scale.set(0.35, 1.2, 0.35);
    const b = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMat(r.glow, 1.4)), 0, half + 0.08, 0);
    b.scale.set(1.2, 0.35, 0.35);
    spin.push({ mesh: a, kind: 'self' }, { mesh: b, kind: 'self' });
  }
  // 끝 주변을 빙글빙글 도는 작은 조각들
  for (let k = 0; k < (r.orbit || 0); k++) {
    const s = put(new THREE.Mesh(new THREE.OctahedronGeometry(r.tip === 'star' ? 0.025 : 0.035, 0), glowMat(k % 2 ? r.accent : r.glow, 1.5)), 0, half, 0);
    spin.push({ mesh: s, kind: 'orbit', ph: (k / r.orbit) * Math.PI * 2, rad: 0.16 + (k % 2) * 0.05, sp: r.tip === 'star' ? 2.4 : 1.6 });
  }
  placeSpin(spin, 0);
  return spin;
}
function placeSpin(spin, t) {
  const half = ROD_LEN / 2;
  spin.forEach((s, i) => {
    if (s.kind === 'self') { s.mesh.rotation.y = t * 1.5; return; }
    const a = t * s.sp + s.ph;
    s.mesh.position.set(Math.cos(a) * s.rad, half - 0.05 + Math.sin(t * 2 + i) * 0.06, Math.sin(a) * s.rad);
    s.mesh.rotation.set(t * 2, t * 3, 0);
  });
}

// 낚싯대는 오른팔에 붙어 있어서 팔을 휘두르면 같이 움직여요
const rod = new THREE.Group();
rod.position.set(0, -1.048, -0.907);
rod.rotation.x = -2.1;
rod.visible = false; // 처음엔 빈손 (1번 키로 꺼내요)
hero.armR.add(rod);
let rodSpin = [];
const tmpV = new THREE.Vector3();
const rodTipWorld = (out = new THREE.Vector3()) => rod.localToWorld(out.set(0, ROD_LEN / 2, 0));

const cordMat = new THREE.LineBasicMaterial({ color: 0xf1e0c4, transparent: true, opacity: 0.88 });
const fishingLine = new THREE.Line(new THREE.BufferGeometry(), cordMat);
scene.add(fishingLine);

function makeBobber(s = 1) {
  const b = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 16, 12), mat(0xf3eee0, 0.4));
  top.position.y = 0.03 * s;
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 16, 12), mat(0xe67557, 0.42, { emissive: 0xa33d27, emissiveIntensity: 0.18 }));
  red.position.y = 0.17 * s;
  b.add(top, red);
  return b;
}
const bobber = makeBobber();
bobber.visible = false;
scene.add(bobber);

const rippleMat = new THREE.MeshBasicMaterial({ color: 0xd6dfc3, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
const ripples = [];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.28, 32), rippleMat.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.055 + i * 0.002;
  ring.visible = false;
  scene.add(ring);
  ripples.push(ring);
}

// =====================================================
//  같이 낚시하는 사람들 (NPC)
// =====================================================
const npcs = [];
function addNPC(look, pos, rotY, bobberPos, sitting) {
  const p = makeBlockPerson(look);
  p.group.position.copy(pos);
  p.group.scale.setScalar(1.2);
  p.group.rotation.y = rotY;
  if (sitting) p.legs.forEach((l) => (l.rotation.x = Math.PI / 2));
  scene.add(p.group);
  const nRod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 2.4, 6), mat(look.rodColor ?? 0x7a5a3c));
  nRod.position.set(0.2, 1.6, -1.44);
  nRod.rotation.x = -0.9;
  nRod.castShadow = true;
  p.group.add(nRod);
  const b = makeBobber(0.8);
  b.position.copy(bobberPos);
  scene.add(b);
  const line = new THREE.Line(new THREE.BufferGeometry(), cordMat);
  scene.add(line);
  // 머리 위 이름표 (이름 + 잡은 수). 앉아 있으면 몸이 낮아서 이름표도 조금 내려요
  const tag = makeNameTag();
  if (sitting) tag.sp.position.y = 2.15;
  p.group.add(tag.sp);
  addCollider(pos.x, pos.z, 0.45); // 사람끼리 겹치지 않게
  npcs.push({ ...p, rod: nRod, bobber: b, line, tag, count: 5 + Math.floor(Math.random() * 40), home: bobberPos.clone(), state: 'wait', next: 6000 + Math.random() * 14000, arm: 1.2, seed: Math.random() * 10 });
}
addNPC({ skin: 0xe8b48a, shirt: 0xd9534f, pants: 0x2f3b52, boots: 0x2a2a30, hair: 'short', hairColor: 0x1f1a17, hat: 'cap', hatColor: 0x2b6cb0 },
  new THREE.Vector3(1.45, -0.22, DOCK.z0 + 0.4), 0, new THREE.Vector3(2.6, 0.15, DOCK.z0 - 4.4), true);
addNPC({ skin: 0xf3d2b3, shirt: 0xf2c14e, pants: 0x5a4a3a, boots: 0x3d2b20, hair: 'long', hairColor: 0x2d1d16, vest: 0x4a7a8c, vestPocket: 0x3a6070 },
  new THREE.Vector3(-10, 0.25, -7.6), 0.2, new THREE.Vector3(-11.2, 0.15, -12.4), false);
addNPC({ skin: 0xdcae8a, shirt: 0x8a6f9e, pants: 0x4b4b4b, boots: 0x3a2c22, hair: 'short', hairColor: 0xb8b8b8, beard: 0xd5d5d5, glasses: 0x2d3440, hat: 'straw', hatColor: 0xe6cf8f },
  new THREE.Vector3(11, 0.25, -9.6), -0.25, new THREE.Vector3(12.3, 0.15, -14.4), false);

// 이 사람이 나를 보려면 고개(또는 몸)를 얼마나 돌려야 하는지 (limit 로 최대 각도 제한)
function headToward(group, limit) {
  const want = Math.atan2(-(person.position.x - group.position.x), -(person.position.z - group.position.z));
  let rel = want - group.rotation.y;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return Math.max(-limit, Math.min(limit, rel));
}

// 말 걸 수 있는 사람들의 이름과 할 말 (말은 NPC 혼자서만 해요)
Object.assign(npcs[0], { name: '부두 소년', li: 0, lines: [
  '쉿, 지금 입질 오려고 해요.',
  '여기 앉아 있으면 시간 가는 줄 몰라요.',
  '부두 끝에서 보면 호수가 바다 같아요.',
  '발 담그고 싶은데 물이 너무 깊어요. 저기 가장자리는 얕대요.'
] });
Object.assign(npcs[1], { name: '섬 친구', li: 0, lines: [
  '어떻게 여기까지 왔냐고요? 비밀이에요.',
  '섬에서는 물소리만 들려서 좋아요.'
] });
Object.assign(npcs[2], { name: '섬 할아버지', li: 0, lines: [
  '젊었을 땐 이 호수가 지금의 반만 했단다.',
  '인생도 낚시도 결국 기다림이란다.'
] });
// 고수 할배: 산 위 연못가에서 평생 낚시한 전설. 잡은 물고기가 약 10만 마리!
addNPC({ skin: 0xe0b896, shirt: 0x1e2a4a, sleeve: 0x1e2a4a, pants: 0x2a2a3a, boots: 0x3a2a1a, hair: 'long', hairColor: 0xf2f2f2,
  beard: 0xf8f8f8, glasses: 0xc8a040, hat: 'straw', hatColor: 0xb89050, vest: 0x6a3a2a, vestPocket: 0x4a2a1a, rodColor: 0x2a2a6a },
  new THREE.Vector3(32.8, PLATEAU_TOP, -3.6), 0.64, new THREE.Vector3(30.6, TOP_Y + 0.13, -6.6), false);
Object.assign(npcs[3], { name: '고수 할배', li: 0, count: 99812, lines: [
  '자네, 초록 칸만 보지 말고 물고기 마음을 봐야 해.',
  '십만 마리쯤 잡으니 이제 물고기가 먼저 인사를 하더군. 허허.',
  '이 연못엔 이 세상에 없는 녀석들이 산다네. 왕관 쓴 놈은 나도 세 번밖에 못 봤어.',
  '서두르면 놓치고, 기다리면 온다. 그게 낚시고, 인생이지.',
  '밤에 오게. 연못이 별을 삼키면 귀한 놈들이 올라온다네.',
  '젊었을 땐 나도 기본 낚싯대 하나로 시작했지. 지금은… 비밀일세.',
  '저 아래 큰 호수 대왕 참치? 내가 놓아준 놈일걸.'
] });
npcs.forEach((n) => n.tag.draw(n.name, n.count)); // 이름표 그리기
// 시간대마다 가끔 하는 말
const TIME_LINES = {
  낮: ['햇볕이 따갑네요. 모자 꼭 써요.', '낮에는 물고기들도 졸린가 봐요.'],
  노을: ['와, 하늘 좀 봐요. 오늘 노을 진짜 예쁘다.', '해 지기 전에 한 마리만 더.'],
  밤: ['별 많이 떴다. 소원 하나 빌어요.', '밤엔 귀한 녀석들이 올라온대요.'],
  새벽: ['새벽 공기가 차갑네요. 그래도 이 시간이 좋아요.', '밤새 낚시한 사람들은 지금 다 졸고 있겠죠.']
};

function updateNPCs(now, dt, t) {
  for (const n of npcs) {
    let target = 1.2;
    const b = n.bobber;
    if (n.state === 'wait') {
      b.position.copy(n.home);
      b.position.y = n.home.y + Math.sin(t * 2.2 + n.seed) * 0.04;
      if (now > n.next) { n.state = 'bite'; n.until = now + 1500; }
    } else if (n.state === 'bite') {
      b.position.y = n.home.y - 0.05 + Math.sin(t * 20) * 0.08;
      target = 1.0;
      if (now > n.until) { n.state = 'pull'; n.until = now + 700; }
    } else if (n.state === 'pull') {
      target = 2.1;
      const k = 1 - (n.until - now) / 700;
      n.rod.localToWorld(tmpV.set(0, 1.2, 0));
      b.position.lerpVectors(n.home, tmpV, Math.min(1, k * 1.3));
      b.position.y += Math.sin(k * Math.PI) * 1.2;
      if (now > n.until) { n.state = 'rest'; n.until = now + 2500; n.count++; n.tag.draw(n.name, n.count); } // 한 마리 잡았어요
    } else if (n.state === 'rest') {
      target = 1.5;
      b.visible = false;
      if (now > n.until) { n.state = 'wait'; n.next = now + 9000 + Math.random() * 18000; b.visible = true; }
    }
    n.arm += (target - n.arm) * Math.min(1, dt * 10);
    n.armL.rotation.x = n.armR.rotation.x = n.arm;
    // 말을 걸면 낚시하면서 고개만 살짝 돌려서 나를 봐요
    const look = n.talkUntil > now ? headToward(n.group, 0.7) : Math.sin(t * 0.5 + n.seed) * 0.15;
    n.head.rotation.y += (look - n.head.rotation.y) * Math.min(1, dt * 8);
    n.rod.localToWorld(tmpV.set(0, 1.2, 0));
    const end = b.position;
    n.line.geometry.setFromPoints([
      tmpV.clone(),
      new THREE.Vector3((tmpV.x + end.x) / 2, Math.max(0.3, (tmpV.y + end.y) / 2 - 0.4), (tmpV.z + end.z) / 2),
      end.clone()
    ]);
    n.line.visible = b.visible;
  }
}

// =====================================================
//  상점 건물 (낚싯대 상점 / 물고기 판매점)
// =====================================================
function makeSign(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#2e2236';
  x.fillRect(0, 0, 512, 128);
  x.strokeStyle = '#c9a25a';
  x.lineWidth = 8;
  x.strokeRect(6, 6, 500, 116);
  x.font = '900 62px "Malgun Gothic", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = '#ffd98a';
  x.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
}

const shops = [];
const shopRodSpins = [];
function makeShop(kind, title, x, z, faceX, faceZ, wallColor, roofColor, y = -0.08) {
  const g = new THREE.Group();
  const ry = Math.atan2(faceX - x, faceZ - z); // 가게 앞이 (faceX, faceZ) 쪽을 보게
  g.position.set(x, y, z);
  g.rotation.y = ry;
  scene.add(g);
  const wm = mat(wallColor), dm = darkWood;
  const part = (w, h, d, m, px, py, pz) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(px, py, pz);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  part(3.6, 0.2, 2.8, woodLight, 0, 0.1, 0);              // 바닥
  part(3.6, 2.3, 0.15, wm, 0, 1.3, -1.32);               // 뒷벽
  part(0.15, 2.3, 2.8, wm, -1.73, 1.3, 0);               // 옆벽
  part(0.15, 2.3, 2.8, wm, 1.73, 1.3, 0);
  part(3.1, 0.95, 0.5, wood, 0, 0.67, 0.95);             // 계산대
  part(3.2, 0.08, 0.6, woodLight, 0, 1.18, 0.95);
  for (const s of [-1, 1]) part(0.16, 2.4, 0.16, dm, s * 1.7, 1.3, 1.3); // 앞 기둥
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.3, 4), mat(roofColor, 0.8));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.85);
  roof.position.set(0, 3.1, 0);
  roof.castShadow = true;
  g.add(roof);
  part(2.6, 0.72, 0.08, dm, 0, 2.15, 1.36);             // 간판 판
  const sign = makeSign(title);
  sign.position.set(0, 2.15, 1.41);
  g.add(sign);
  makeLantern(-1.7, 2.1, 1.55, g);
  makeLantern(1.7, 2.1, 1.55, g);

  addCollider(x, z, 2.0);
  const front = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  const shop = { kind, title, group: g, pos: new THREE.Vector3(x, y, z).addScaledVector(front, 2.6), promptAt: new THREE.Vector3(x, y + 3.9, z).addScaledVector(front, 1.2) };
  shops.push(shop);
  return { g, part };
}

// 낚싯대 상점: 벽에 낚싯대들이 걸려 있어요
{
  const { g } = makeShop('rod', '낚싯대 상점', -7.5, 8.2, 0, 12, 0x7a5a44, 0x3e2d5a);
  // 벽에 진짜 낚싯대 모양 그대로 걸어 둬요 (끝 조각도 빙글빙글)
  RODS.filter((r) => r.shop === 'base').forEach((r, i) => {
    const m = new THREE.Group();
    shopRodSpins.push(buildRod(r, m));
    m.position.set(-1.3 + i * 0.52, 1.25, -1.12);
    m.rotation.z = 0.12;
    m.scale.setScalar(0.72);
    g.add(m);
  });
  const keeper = makeBlockPerson({ skin: 0xe2b896, shirt: 0x4a5a7a, pants: 0x3a3a3a, boots: 0x2a2220, hair: 'short', hairColor: 0x6a6a6a, beard: 0x8a8a8a, hat: 'cap', hatColor: 0x7a3a3a });
  keeper.group.position.set(0, 0.2, 0.1);
  keeper.group.rotation.y = Math.PI;
  keeper.group.scale.setScalar(1.15);
  g.add(keeper.group);
}
// 물고기 판매점: 얼음 상자와 물고기가 있어요
{
  const { g, part } = makeShop('sell', '물고기 판매점', 7.5, 8.2, 0, 12, 0x5a6e7a, 0x2e3a5e);
  part(0.9, 0.5, 0.7, mat(0xdfeef5, 0.3), -1.0, 0.45, -0.7);
  part(0.9, 0.5, 0.7, mat(0xdfeef5, 0.3), 0.1, 0.45, -0.85);
  ['붕어', '잉어', '송어'].forEach((n, i) => {
    const f = makeFishModel(findFish(n));
    f.position.set(-0.9 + i * 0.9, 1.32, 0.95);
    f.rotation.y = 0.3 - i * 0.3;
    f.scale.multiplyScalar(0.7);
    g.add(f);
  });
  const keeper = makeBlockPerson({ skin: 0xf3d2b3, shirt: 0x7a9ec2, pants: 0x3a3e55, boots: 0x2a2220, hair: 'long', hairColor: 0x3a2418, apron: 0xf0ece0 });
  keeper.group.position.set(0, 0.2, 0.1);
  keeper.group.rotation.y = Math.PI;
  keeper.group.scale.setScalar(1.15);
  g.add(keeper.group);
}
// 언덕 위 낚싯대 상점: 산 위 연못을 바라봐요. 특별한 낚싯대 3종
{
  const { g, part } = makeShop('rod2', '언덕 위 상점', 36.6, -6.5, 30, -6.5, 0x4a3a6a, 0x2a1a4a, PLATEAU_TOP);
  RODS.filter((r) => r.shop === 'mountain').forEach((r, i) => {
    const m = new THREE.Group();
    shopRodSpins.push(buildRod(r, m));
    m.position.set(-0.9 + i * 0.9, 1.25, -1.12);
    m.rotation.z = 0.1;
    m.scale.setScalar(0.75);
    g.add(m);
  });
  // 계산대 위 신기한 물고기 표본
  ['솜사탕 붕어', '별사탕 복어'].forEach((n, i) => {
    const f = makeFishModel(findFish(n));
    f.position.set(-0.7 + i * 1.4, 1.38, 0.95);
    f.rotation.y = 0.4 - i * 0.8;
    f.scale.multiplyScalar(0.55);
    g.add(f);
  });
  part(0.5, 0.5, 0.5, mat(0xb48cff, 0.25, { emissive: 0x7a3cff, emissiveIntensity: 0.8 }), 1.3, 0.45, -0.8); // 보랏빛 수정 상자
  const keeper = makeBlockPerson({ skin: 0xe8c0a0, shirt: 0x3a2a5a, pants: 0x22223a, boots: 0x1a1a22, hair: 'long', hairColor: 0xd8d8f0, glasses: 0x6a5aff, hat: 'bucket', hatColor: 0x6a4aaa });
  keeper.group.position.set(0, 0.2, 0.1);
  keeper.group.rotation.y = Math.PI;
  keeper.group.scale.setScalar(1.15);
  g.add(keeper.group);
}
scene.updateMatrixWorld(true);

// =====================================================
//  돌아다니는 낚시꾼들 — 진짜 플레이어처럼 움직여요
//  호숫가 · 부두 · 산 위 연못으로 걸어가서 낚시하고,
//  물고기가 쌓이면 판매점에 팔러 가요. 머리 위에 이름과 잡은 수가 떠요.
// =====================================================
const WALKER_LOOKS = [
  { skin: 0xf0c8a0, shirt: 0x3a6ea5, pants: 0x2a2f3a, boots: 0x222222, hair: 'short', hairColor: 0x2a1a12, hat: 'cap', hatColor: 0xd04040 },
  { skin: 0xe2b08a, shirt: 0x8ac06a, pants: 0x4a3a2a, boots: 0x3a2a1a, hair: 'long', hairColor: 0xc08040 },
  { skin: 0xf6d4b4, shirt: 0x2a2a2a, pants: 0x5a5a7a, boots: 0x1a1a1a, hair: 'short', hairColor: 0x111111, glasses: 0x223344, vest: 0xb05a2a, vestPocket: 0x8a4420 },
  { skin: 0xd8a882, shirt: 0xe0d0a0, pants: 0x3a4a5a, boots: 0x4a3020, hair: 'short', hairColor: 0x6a4a2a, hat: 'bucket', hatColor: 0x5a7aa0 }
];
const WALKER_NAMES = ['물결소년', '노을헌터', '붕어왕', '밤낚시러'];
const WALKER_LINES = [
  ['형, 밤에는 귀한 물고기가 더 잘 나온대요! 진짜예요.',
   '엄마가 저녁 먹으러 오랬는데… 한 마리만 더 잡고 갈래요.',
   '어제 누가 여기서 대왕 참치 봤대요. 저도 보고 싶다!',
   '부두 끝이 제일 잘 잡혀요. 이건 우리끼리 비밀이에요.',
   '숙제는 낚시 끝나고 할 거예요. 아마도요.'],
  ['노을 질 때 던진 찌는 이상하게 더 예뻐 보여요.',
   '산 위 연못에서 보는 노을이 제일이에요. 꼭 한번 올라가 봐요.',
   '잡는 것보다 기다리는 시간이 더 좋을 때가 있어요.',
   '오늘 하늘은 어제랑 또 달라요. 그래서 매일 와요.',
   '물결이 잔잔한 날엔 마음도 같이 잔잔해져요.'],
  ['이 동네 붕어는 내가 제일 많이 잡았지. 허허.',
   '초록 칸 밖으로 나가면 줄이 끊겨. 천천히, 천천히.',
   '요즘 낚싯대 값이 너무 올랐어. 별빛 낚싯대가 12,000이라니.',
   '허리가 아파서 오래는 못 서 있겠구먼.',
   '물고기는 큰 거 팔아야 돈이 돼. 이로치 붙으면 더 좋고.'],
  ['난 밤이 좋아. 조용하고, 별도 보이고.',
   '그림자 낚싯대 끝에서 빛나는 게 뭔지 알아? 나도 몰라.',
   '피곤해… 어제 새벽 네 시까지 여기 있었거든.',
   '다크 이로치는 밤에 보면 진짜 멋있어.',
   '말 걸지 마… 아니, 걸어도 돼. 사실 심심했어.']
];
const WALKER_START = [[-3, 11], [3.5, 12], [-10, 11], [12.5, 9]];
const walkers = [];

// 이름표: 위에 이름, 아래에 잡은 수
function makeNameTag() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
  sp.scale.set(1.5, 0.56, 1);
  sp.position.set(0, 2.35, 0);
  sp.renderOrder = 10; // 물보다 나중에 그려서 안 가려지게
  const draw = (name, n) => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 512, 192);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 10;
    x.strokeStyle = 'rgba(0,0,0,0.8)';
    x.font = '800 54px "Malgun Gothic", sans-serif';
    x.strokeText(name, 256, 50); x.fillStyle = '#e8f0ff'; x.fillText(name, 256, 50);
    x.font = '900 80px "Malgun Gothic", sans-serif';
    const num = Number(n).toLocaleString('en-US'); // 99,812 처럼 쉼표
    x.strokeText(num, 256, 135); x.fillStyle = '#ffffff'; x.fillText(num, 256, 135);
    tex.needsUpdate = true;
  };
  return { sp, draw };
}

WALKER_LOOKS.forEach((look, i) => {
  const p = makeBlockPerson(look);
  p.group.scale.setScalar(1.2);
  p.group.position.set(WALKER_START[i][0], -0.08, WALKER_START[i][1]);
  scene.add(p.group);
  const rodG = new THREE.Group();
  rodG.position.set(0, -1.048, -0.907);
  rodG.rotation.x = -2.1;
  rodG.visible = false;
  p.armR.add(rodG);
  const rodIdx = [1, 2, 3, 4][i];
  const spin = buildRod(RODS[rodIdx], rodG);
  const b = makeBobber(0.9);
  b.visible = false;
  scene.add(b);
  const line = new THREE.Line(new THREE.BufferGeometry(), cordMat);
  line.visible = false;
  scene.add(line);
  const tag = makeNameTag();
  p.group.add(tag.sp);
  const count = 10 + Math.floor(Math.random() * 60);
  tag.draw(WALKER_NAMES[i], count);
  walkers.push({
    ...p, rodG, spin, rod: RODS[rodIdx], bobber: b, line, tag, name: WALKER_NAMES[i], count, lines: WALKER_LINES[i], li: 0, talkUntil: 0,
    state: 'think', until: performance.now() + 500 + i * 900, path: [], job: null, spot: null,
    ry: Math.PI, walkT: 0, arm: 0, bag: 0, sellAt: 3 + Math.floor(Math.random() * 4), fishLeft: 0,
    speed: 3.2 + Math.random() * 0.8, stuckAt: 0, stuckPos: new THREE.Vector3(), pop: null, target: new THREE.Vector3(), from: new THREE.Vector3()
  });
});

// ---------- 길 찾기 ----------
const faceTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
const STAIR_X = (STAIRS.x0 + STAIRS.x1) / 2;
const STAIR_BOTTOM = { x: STAIR_X, z: STAIRS.z1 + 0.8 };
const STAIR_TOP = { x: STAIR_X, z: STAIRS.z0 - 0.8 };
// 직선으로 걸어갈 수 있는지 (0.4 간격으로 확인 — 계단 한 칸보다 촘촘하게)
function clearLine(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.4));
  let px = a.x, pz = a.z;
  for (let i = 1; i <= n; i++) {
    const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n;
    if (!walkable(x, z, px, pz, true)) return false;
    px = x; pz = z;
  }
  return true;
}
// 호수를 빙 둘러 가는 길 (언덕 쪽은 막혀 있어서 그쪽은 빼고 한 바퀴)
const ARC_T0 = 0.95, ARC_TMAX = Math.PI * 2 - 1.4;
let ARC = null;
function arcPoints() {
  if (ARC) return ARC;
  ARC = [];
  for (let t = 0; t <= ARC_TMAX; t += 0.2) {
    const [x, z] = shorePoint(t + ARC_T0, 1.2);
    if (walkable(x, z, undefined, undefined, true)) ARC.push({ x, z, t });
  }
  return ARC;
}
function nearestArc(p) {
  let best = null, bd = Infinity;
  for (const q of arcPoints()) {
    const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
    if (d < bd && clearLine(p, q)) { bd = d; best = q; }
  }
  return best;
}
function route(a, b) {
  if (clearLine(a, b)) return [b];
  const ea = nearestArc(a), eb = nearestArc(b);
  if (!ea || !eb) return null;
  const pts = [ea];
  const list = eb.t > ea.t ? arcPoints() : [...arcPoints()].reverse();
  for (const q of list) if ((eb.t > ea.t) ? (q.t > ea.t && q.t < eb.t) : (q.t < ea.t && q.t > eb.t)) pts.push(q);
  pts.push(eb, b);
  return pts;
}
function planPath(from, to) {
  const aTop = onPlateau(from.x, from.z) || onStairs(from.x, from.z);
  const bTop = onPlateau(to.x, to.z);
  if (!aTop && bTop) { const r = route(from, STAIR_BOTTOM); return r && [...r, STAIR_TOP, to]; }
  if (aTop && !bTop) { const r = route(STAIR_BOTTOM, to); return r && [STAIR_TOP, STAIR_BOTTOM, ...r]; }
  if (aTop && bTop) return [to];
  return route(from, to);
}

// ---------- 낚시할 자리 고르기 ----------
function lakeSpot() {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    if (nearHill(a) || nearDock(a)) continue;
    const [x, z] = shorePoint(a, 0.9 + Math.random() * 0.12); // 얕은 물 가장자리 ~ 물가
    if (walkable(x, z, undefined, undefined, true)) return { x, z, face: faceTo(x, z, LAKE.x, LAKE.z) };
  }
  return null;
}
function dockSpot() {
  const x = -1.2 + Math.random() * 2.4, z = DOCK.z0 + 1.2 + Math.random() * 4;
  return walkable(x, z, undefined, undefined, true) ? { x, z, face: 0 } : null;
}
function pondSpot() {
  const P = WATERS[2];
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const x = P.x + Math.cos(a) * P.rx * 1.2, z = P.z + Math.sin(a) * P.rz * 1.2;
    if (onPlateau(x, z) && walkable(x, z, undefined, undefined, true)) return { x, z, face: faceTo(x, z, P.x, P.z) };
  }
  return null;
}
// 바라보는 쪽으로 던질 물 찾기
function castTargetFrom(x, z, ry) {
  const fx = -Math.sin(ry), fz = -Math.cos(ry);
  for (let d = 3 + Math.random() * 4; d >= 2; d -= 0.5) {
    const tx = x + fx * d, tz = z + fz * d;
    const w = waterAt(tx, tz);
    if (w && !onDock(tx, tz) && !onIsland(tx, tz)) return { x: tx, z: tz, y: w.y };
  }
  return null;
}

function walkerThink(w, now) {
  w.rodG.visible = false;
  let spot = null;
  if (w.bag >= w.sellAt) {
    const sell = shops.find((s) => s.kind === 'sell');
    w.job = 'sell';
    spot = { x: sell.pos.x + (Math.random() - 0.5), z: sell.pos.z + (Math.random() - 0.5), face: faceTo(sell.pos.x, sell.pos.z, sell.group.position.x, sell.group.position.z) };
  } else {
    const r = Math.random();
    w.job = r < 0.55 ? 'lake' : r < 0.75 ? 'dock' : 'pond';
    spot = w.job === 'lake' ? lakeSpot() : w.job === 'dock' ? dockSpot() : pondSpot();
  }
  const path = spot && planPath(w.group.position, spot);
  if (!path) { w.until = now + 400; return; } // 길이 없으면 잠깐 있다가 다시 골라요
  w.spot = spot;
  w.path = path;
  w.state = 'walk';
  w.stuckAt = now;
  w.stuckPos.copy(w.group.position);
}

function updateWalkers(now, dt, t) {
  for (const w of walkers) {
    const p = w.group.position;
    let moving = false;
    let armTarget = 1.2;
    // 말 거는 중: 서 있던 사람은 하던 걸 멈추고 몸을 돌려 나를 봐요 (낚시 중이면 고개만)
    const talking = w.talkUntil > now;
    const fishingNow = ['ready', 'charge', 'cast', 'wait', 'bite', 'reel', 'caught', 'pause'].includes(w.state);
    const freeze = talking && !fishingNow;

    if (freeze) {
      const want = Math.atan2(-(person.position.x - p.x), -(person.position.z - p.z));
      let diff = want - w.ry;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      w.ry += diff * Math.min(1, dt * 8);
      w.until += dt * 1000;      // 기다리던 시간은 멈춰 둬요
      w.stuckAt += dt * 1000;
      armTarget = w.state === 'sell' ? 0.6 : 0.15;
    } else if (w.state === 'think') {
      if (now > w.until) walkerThink(w, now);
      armTarget = 0;
    } else if (w.state === 'walk') {
      armTarget = 0;
      const wp = w.path[0];
      if (!wp) { w.state = 'arrive'; }
      else {
        const dx = wp.x - p.x, dz = wp.z - p.z, dist = Math.hypot(dx, dz);
        if (dist < 0.3) w.path.shift();
        else {
          const step = Math.min(dist, w.speed * dt);
          const nx = p.x + dx / dist * step, nz = p.z + dz / dist * step;
          if (walkable(nx, nz, p.x, p.z, true)) { p.x = nx; p.z = nz; }
          else if (walkable(nx, p.z, p.x, p.z, true)) p.x = nx;
          else if (walkable(p.x, nz, p.x, p.z, true)) p.z = nz;
          let diff = Math.atan2(-dx, -dz) - w.ry;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          w.ry += diff * Math.min(1, dt * 10);
          moving = true;
        }
        // 1.5초 동안 거의 못 움직였으면 다른 곳으로
        if (now - w.stuckAt > 1500) {
          if (p.distanceTo(w.stuckPos) < 0.3) { w.state = 'think'; w.until = now + 300; }
          w.stuckAt = now;
          w.stuckPos.copy(p);
        }
      }
    } else if (w.state === 'arrive') {
      let diff = w.spot.face - w.ry;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      w.ry += diff * Math.min(1, dt * 8);
      armTarget = 0;
      if (Math.abs(diff) < 0.05) {
        if (w.job === 'sell') { w.state = 'sell'; w.until = now + 2500; }
        else { w.state = 'ready'; w.until = now + 600; w.rodG.visible = true; w.fishLeft = 2 + Math.floor(Math.random() * 3); }
      }
    } else if (w.state === 'sell') {
      armTarget = 0.6 + Math.sin(t * 6) * 0.2; // 물고기 건네는 시늉
      if (now > w.until) { w.bag = 0; w.sellAt = 3 + Math.floor(Math.random() * 4); w.state = 'think'; w.until = now + 300; }
    } else if (w.state === 'ready') {
      if (now > w.until) { w.state = 'charge'; w.until = now + 700 + Math.random() * 700; }
    } else if (w.state === 'charge') {
      armTarget = 2.6;
      if (now > w.until) {
        const tg = castTargetFrom(p.x, p.z, w.ry);
        if (!tg) { w.state = 'think'; w.until = now + 300; }
        else {
          w.target.set(tg.x, tg.y + 0.14, tg.z);
          w.zone = waterAt(tg.x, tg.z)?.zone || 'lake';
          w.rodG.localToWorld(w.from.set(0, ROD_LEN / 2, 0));
          w.state = 'cast'; w.castAt = now; w.until = now + 800;
          w.bobber.visible = true;
        }
      }
    } else if (w.state === 'cast') {
      armTarget = now - w.castAt < 450 ? 0.85 : 1.2;
      const k = Math.min(1, (now - w.castAt) / 800);
      w.bobber.position.lerpVectors(w.from, w.target, 1 - Math.pow(1 - k, 3));
      w.bobber.position.y += Math.sin(k * Math.PI) * 2;
      if (k >= 1) { w.state = 'wait'; w.until = now + (3000 + Math.random() * 5000) * w.rod.bite; }
    } else if (w.state === 'wait') {
      w.bobber.position.y = w.target.y + Math.sin(t * 2.2 + w.ry) * 0.04;
      if (now > w.until) { w.state = 'bite'; w.until = now + 800; }
    } else if (w.state === 'bite') {
      armTarget = 1.05;
      w.bobber.position.y = w.target.y - 0.06 + Math.sin(t * 18) * 0.08;
      if (now > w.until) { w.state = 'reel'; w.until = now + 2000 + Math.random() * 2500; w.reelFrom = w.bobber.position.clone(); w.reelAt = now; }
    } else if (w.state === 'reel') {
      armTarget = 1.3 + Math.sin(t * 18) * 0.12;
      const k = Math.min(1, (now - w.reelAt) / (w.until - w.reelAt));
      w.bobber.position.lerpVectors(w.reelFrom, tmpV.set(p.x, w.target.y, p.z), k * 0.45);
      w.bobber.position.y = w.target.y + Math.sin(t * 22) * 0.06;
      if (now > w.until) {
        w.bobber.visible = false;
        if (Math.random() < 0.8) {
          // 잡았다! 물고기가 머리 위로 튀어 올라요
          const fish = rollFish(w.rod.luck, w.zone || 'lake', isRaining());
          const f = findFish(fish.name);
          const model = makeFishModel(f, fish.mut, fish.weight);
          const sc = fishScale(f, fish.weight);
          if (sc > 2.2) model.scale.multiplyScalar(2.2 / sc);
          scene.add(model);
          if (w.pop) scene.remove(w.pop.model);
          w.pop = { model, start: now, from: w.bobber.position.clone() };
          w.count++; w.bag++;
          w.tag.draw(w.name, w.count);
          w.state = 'caught'; w.until = now + 1500;
        } else { w.state = 'pause'; w.until = now + 1200; }
      }
    } else if (w.state === 'caught') {
      armTarget = 2.0;
      if (now > w.until) { w.state = 'pause'; w.until = now + 600; }
    } else if (w.state === 'pause') {
      if (now > w.until) {
        w.fishLeft--;
        if (w.fishLeft > 0) { w.state = 'charge'; w.until = now + 700 + Math.random() * 700; }
        else { w.state = 'think'; w.until = now + 500; }
      }
    }

    // 잡은 물고기 튀어 오르기 → 사라지기
    if (w.pop) {
      const q = (now - w.pop.start) / 1000;
      if (q > 1.5) { scene.remove(w.pop.model); w.pop = null; }
      else {
        tmpV.set(p.x, p.y + 3.2, p.z);
        w.pop.model.position.lerpVectors(w.pop.from, tmpV, Math.min(1, q));
        w.pop.model.position.y += Math.sin(Math.min(1, q) * Math.PI) * 1.2;
        w.pop.model.rotation.y = w.ry + Math.PI / 2;
        w.pop.model.rotation.z = Math.sin(t * 20) * 0.3;
      }
    }

    // 몸 움직임 (주인공과 같은 방식)
    w.group.rotation.y = w.ry;
    p.y += (groundY(p.x, p.z) - p.y) * Math.min(1, dt * 14);
    if (moving) w.walkT += dt * 9;
    const swing = moving ? Math.sin(w.walkT) * 0.6 : 0;
    w.legs[0].rotation.x += (swing - w.legs[0].rotation.x) * Math.min(1, dt * 15);
    w.legs[1].rotation.x += (-swing - w.legs[1].rotation.x) * Math.min(1, dt * 15);
    const empty = !w.rodG.visible;
    w.arm += (armTarget - w.arm) * Math.min(1, dt * 12);
    const aSwing = empty && moving ? Math.sin(w.walkT) * 0.6 : 0;
    w.armL.rotation.x = w.arm - aSwing;
    w.armR.rotation.x = w.arm + aSwing;
    const splay = empty ? 0.08 : 0.35;
    w.armL.rotation.z += (splay - w.armL.rotation.z) * Math.min(1, dt * 12);
    w.armR.rotation.z += (-splay - w.armR.rotation.z) * Math.min(1, dt * 12);
    const look = talking ? (fishingNow ? headToward(w.group, 0.6) : 0) : moving ? 0 : Math.sin(t * 0.5 + w.walkT) * 0.12;
    w.head.rotation.y += (look - w.head.rotation.y) * Math.min(1, dt * 8);
    placeSpin(w.spin, t);

    // 낚싯줄
    const lineOn = w.bobber.visible && w.rodG.visible;
    w.line.visible = lineOn;
    if (lineOn) {
      w.rodG.localToWorld(tmpV.set(0, ROD_LEN / 2, 0));
      const e = w.bobber.position;
      w.line.geometry.setFromPoints([
        tmpV.clone(),
        new THREE.Vector3((tmpV.x + e.x) / 2, Math.max(e.y + 0.3, (tmpV.y + e.y) / 2 - 0.3), (tmpV.z + e.z) / 2),
        e.clone()
      ]);
    }
  }
}

// =====================================================
//  저장 (브라우저에 기록)
// =====================================================
const SAVE_KEY = 'lakeFishing_v2';
const save = { money: 0, caught: 0, inv: [], dex: {}, rod: 0, owned: [0], nextId: 1, quest: null, questReadyAt: 0, questsDone: 0 };

// 저장된 기록은 누구나 개발자 도구로 고칠 수 있어서 그대로 믿으면 안 돼요.
// 불러올 때 하나하나 검사해서, 이상한 값은 버리거나 안전한 값으로 바꿔요.
// (이상한 글자가 화면에 HTML 로 끼어드는 것도 막고, 기록이 깨져도 게임이 켜지게 해요)
const MAX_MONEY = 1e12;
const intIn = (v, lo, hi, def) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.floor(Number(v)))) : def);
function cleanSave(s) {
  const out = { money: 0, caught: 0, inv: [], dex: {}, rod: 0, owned: [0], nextId: 1 };
  if (!s || typeof s !== 'object') return out;
  out.money = intIn(s.money, 0, MAX_MONEY, 0);
  out.caught = intIn(s.caught, 0, 1e9, 0);
  // 가진 낚싯대: 실제 있는 번호만, 중복 없이, 기본 낚싯대는 항상
  const owned = new Set([0]);
  if (Array.isArray(s.owned)) for (const i of s.owned) { const n = intIn(i, -1, RODS.length - 1, -1); if (n >= 0) owned.add(n); }
  out.owned = [...owned].sort((a, b) => a - b);
  const rod = intIn(s.rod, 0, RODS.length - 1, 0);
  out.rod = owned.has(rod) ? rod : 0;
  // 인벤토리: 실제 있는 물고기 이름과 이로치만, 숫자는 숫자만
  const ids = new Set();
  if (Array.isArray(s.inv)) {
    for (const it of s.inv.slice(0, 5000)) {
      if (!it || typeof it !== 'object') continue;
      const f = typeof it.name === 'string' ? findFish(it.name) : null;
      if (!f) continue;
      const weight = Number(it.weight);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 10000) continue;
      const mut = mutKey(it.mut); // 실제 있는 이로치만, 최대 2개
      let id = intIn(it.id, 1, 1e12, 0);
      if (!id || ids.has(id)) id = 0; // 나중에 새 번호를 줘요
      if (id) ids.add(id);
      out.inv.push({ id, name: f.name, weight, mut, price: priceOf(f, weight, mut) }); // 값은 지금 기준으로 다시 계산
    }
  }
  let next = Math.max(intIn(s.nextId, 1, 1e12, 1), ...[...ids].map((i) => i + 1), 1);
  for (const it of out.inv) if (!it.id) it.id = next++;
  out.nextId = next;
  // 도감: 실제 있는 물고기만
  if (s.dex && typeof s.dex === 'object') {
    for (const f of FISH) {
      const d = s.dex[f.name];
      if (!d || typeof d !== 'object') continue;
      const best = Number(d.best);
      out.dex[f.name] = { count: intIn(d.count, 1, 1e9, 1), best: Number.isFinite(best) && best > 0 ? best : f.w[0] };
    }
  }
  // 고수 할배의 부탁: 실제 있는 물고기만, 보상은 숫자만
  if (s.quest && typeof s.quest === 'object' && typeof s.quest.name === 'string' && findFish(s.quest.name)) {
    out.quest = { name: s.quest.name, reward: intIn(s.quest.reward, 1, 1e8, 500) };
  } else out.quest = null;
  out.questReadyAt = intIn(s.questReadyAt, 0, 1e15, 0);
  out.questsDone = intIn(s.questsDone, 0, 1e9, 0);
  return out;
}
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s) Object.assign(save, cleanSave(s));
  else {
    const old = JSON.parse(localStorage.getItem('lakeFishing_v1')); // 예전 기록이 있으면 돈과 낚싯대는 가져와요
    if (old) Object.assign(save, cleanSave({ money: old.coins, caught: old.caught, rod: old.rod, owned: old.owned }));
  }
} catch (_) {}

// 화면에 HTML 로 넣는 글자는 꼭 이걸로 감싸요 (< > & " ' 를 그냥 글자로 바꿔요)
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };
const curRod = () => RODS[save.rod];
const money = (n) => '$' + n.toLocaleString('en-US');

// =====================================================
//  화면(UI)
// =====================================================
const $ = (id) => document.getElementById(id);
const ui = {
  status: $('status'), hint: $('hint'), money: $('money'), rodName: $('rodName'),
  power: $('power'), powerFill: $('powerFill'), reelBox: $('reelBox'), zone: $('zone'),
  fishIcon: $('fishIcon'), prog: $('prog'), mute: $('mute'), hotbar: $('hotbar'),
  prompt: $('prompt'), promptText: $('promptText'), catchCard: $('catchCard'),
  dexPanel: $('dexPanel'), rodShopPanel: $('rodShopPanel'), sellPanel: $('sellPanel')
};

const game = {
  state: 'idle', biteAt: 0, deadline: 0, power: 0, chargeStart: 0, holding: false,
  castStart: new THREE.Vector3(), bobberTarget: new THREE.Vector3(), inWater: false,
  notice: '', armSwingUntil: 0, reel: null, selected: null, rodOut: false, nearShop: null, sitting: null, buff: null, nearFire: false
};

function updateUI() {
  ui.money.textContent = money(save.money);
  ui.rodName.textContent = curRod().name;
  drawTag(save.caught);
  const s = game.state;
  ui.power.classList.toggle('hidden', s !== 'charging');
  ui.reelBox.classList.toggle('hidden', s !== 'reeling');
  const set = (a, b, html = false) => { if (html) ui.status.innerHTML = a; else ui.status.textContent = a; ui.hint.textContent = b; };
  if (s === 'idle' && !game.rodOut) set(game.notice || '', '1번 키(또는 인벤토리 첫 칸)로 낚싯대를 꺼내요.', true);
  else if (s === 'idle') set(game.notice || '호수 쪽을 바라보고 던져 보세요.', '클릭(또는 스페이스바)을 꾹 눌렀다 놓으면 던져요. 1번을 다시 누르면 넣어요.', true);
  if (s === 'charging') set('힘을 모으는 중', '원하는 힘에서 손을 떼요.');
  if (s === 'casting') set(game.inWater ? '입질을 기다리는 중' : '날아가는 중', game.inWater ? '움직이면 줄을 거둬요.' : '');
  if (s === 'bite') set('입질이다! 지금 눌러요!', '빨리요, 도망가기 전에!');
  if (s === 'reeling') set(game.reel?.heavy ? '엄청 무거운 게 걸렸어요!!' : '물고기가 버티고 있어요!', '누르고 있으면 초록 칸이 오른쪽으로, 떼면 왼쪽으로 가요.');
  if (s === 'retracting') set('줄을 감는 중', '');
  if (s === 'casting' && game.inWater) ui.hint.textContent = '한 번 더 누르면 줄을 거둬요. 움직여도 거둬져요.';
  if (s === 'caught') set(game.notice, '물고기는 아래 인벤토리에 들어갔어요. 판매점에서 팔 수 있어요.', true);
  if (s === 'missed') set(game.notice || '물고기가 도망갔어요.', '천천히 해요. 준비되면 다시 던져요.');
}

// ---------- 인벤토리 줄 ----------
function slotHTML(it) {
  const mh = mutHTML(it.mut);
  return `${mh ? `<div class="mut">${mh}</div>` : ''}<div class="nm">${esc(it.name)}</div><div class="wt">${esc(fmtKg(it.weight))}</div>`;
}
// 인벤토리 칸 순서: [1] 낚싯대, [2~] 잡은 물고기 (최근 것부터)
const hotbarOrder = () => ['rod', ...save.inv.slice().reverse().map((it) => it.id)];
function renderHotbar() {
  updateQuestHud(); // 부탁받은 물고기를 잡았는지 같이 보여 줘요
  ui.hotbar.innerHTML = '';
  // 첫 칸: 지금 낀 낚싯대
  const r = curRod();
  const rs = document.createElement('div');
  rs.className = 'slot rodSlot' + (game.rodOut ? ' selected' : '');
  rs.style.setProperty('--rc', r.glow ? hex(r.glow) : hex(r.color));
  rs.innerHTML = `<span class="num">1</span><div class="tag">낚싯대</div><div class="nm">${r.name.replace(' 낚싯대', '')}</div>`;
  rs.title = r.name;
  rs.addEventListener('click', () => toggleEquip('rod'));
  ui.hotbar.appendChild(rs);
  const sep = document.createElement('div');
  sep.className = 'hotSep';
  ui.hotbar.appendChild(sep);

  if (!save.inv.length) {
    const e = document.createElement('div');
    e.className = 'slot empty';
    e.textContent = '아직 잡은 물고기가 없어요';
    ui.hotbar.appendChild(e);
    $('bagGrid').innerHTML = ''; $('bagCount').textContent = '0'; // 가방은 비어도 항상 보여요
    return;
  }
  // 아래 줄에는 9칸(낚싯대 + 물고기 8마리)까지, 10번째부터는 오른쪽 위 가방으로
  const list = save.inv.slice().reverse();
  const bagGrid = $('bagGrid');
  bagGrid.innerHTML = '';
  list.forEach((it, k) => {
    const el = document.createElement('div');
    el.className = 'slot' + (game.selected === it.id ? ' selected' : '');
    el.style.setProperty('--rc', RARITY[findFish(it.name)?.rarity ?? 'common'].color);
    // 이로치 테두리: 1개면 그 색, 2개면 왼쪽/오른쪽 반반
    const mc = mutColors(it.mut);
    if (mc.length === 1) el.style.borderColor = mc[0];
    if (mc.length === 2) { el.style.borderColor = 'transparent'; el.style.background = `linear-gradient(rgba(18,16,26,.85), rgba(18,16,26,.85)) padding-box, linear-gradient(90deg, ${mc[0]} 50%, ${mc[1]} 50%) border-box`; }
    el.innerHTML = (k < 8 ? `<span class="num">${k + 2}</span>` : '') + slotHTML(it);
    el.title = `${it.name} ${fmtKg(it.weight)} · ${money(it.price)}`;
    el.addEventListener('click', () => toggleEquip(it.id));
    (k < 8 ? ui.hotbar : bagGrid).appendChild(el);
  });
  const extra = Math.max(0, list.length - 8);
  // 가방 버튼은 항상 보여요 (9번째 칸 옆)
  $('bagCount').textContent = String(extra);
}
// 가방은 평소엔 접혀 있어요. 제목을 누르거나 B 키로 열고 닫아요
function toggleBag() {
  const open = $('bag').classList.toggle('closed') === false;
  $('bagToggle').textContent = open ? '닫기' : '열기 (B)';
}
$('bagHead').addEventListener('click', (e) => { e.currentTarget.blur(); toggleBag(); });

// 손에 드는 것 바꾸기
//   'rod' = 낚싯대 꺼내기, 물고기 id = 그 물고기 들기, null = 빈손
// 평소엔 빈손이라 클릭해도 낚싯대가 던져지지 않아요.
let heldFish = null;
function equip(id) {
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  if (game.state === 'charging' || game.state === 'reeling') return;
  if (heldFish) { person.remove(heldFish); heldFish = null; }
  game.rodOut = id === 'rod';
  game.selected = null;
  game.heldBig = false;
  const it = typeof id === 'number' ? save.inv.find((x) => x.id === id) : null;
  if (it) {
    const f = findFish(it.name);
    heldFish = makeFishModel(f, it.mut, it.weight);
    const sc = fishScale(f, it.weight);
    if ((f.look.size ?? 1) >= 2) {
      // 큰 물고기는 두 팔로 머리 위에 번쩍 들어 올려요
      heldFish.scale.multiplyScalar(0.5);
      heldFish.position.set(0, 2.05 + f.look.h * sc * 0.5 * 0.5, 0);
      game.heldBig = true;
    } else {
      heldFish.scale.multiplyScalar(0.55);
      heldFish.position.set(0, 0.95, -0.5);
    }
    heldFish.userData = { name: f.name, base: heldFish.position.clone() }; // 팔딱이는 기준 위치
    person.add(heldFish);
    game.selected = it.id;
  }
  rod.visible = game.rodOut;
  if (game.state === 'caught' || game.state === 'missed') game.state = 'idle';
  game.notice = '';
  renderHotbar();
  updateUI();
}
const isEquipped = (id) => (id === 'rod' ? game.rodOut : game.selected === id);
const toggleEquip = (id) => equip(isEquipped(id) ? null : id);

// ---------- 가끔 떠오르는 낭만 있는 말 ----------
const ROMANCE_LINES = [
  '노을이 물 위에 길을 깔아 두었어요.',
  '오늘 못 잡아도 괜찮아요. 호수는 내일도 여기 있으니까.',
  '바람이 낚싯줄을 살짝 흔들고 지나가요.',
  '기다림도 낚시의 일부예요.',
  '해가 지기 전에, 한 마리만 더.',
  '저 멀리서 누군가도 같은 노을을 보고 있겠죠.',
  '찌가 흔들릴 때마다 마음도 같이 흔들려요.',
  '조용한 호수는 말이 없어도 다 알아들어요.',
  '가장 큰 물고기는 늘 마지막에 오는 법이죠.',
  '보랏빛 반딧불이 길 잃은 소원을 찾고 있어요.',
  '낚싯대 끝에 오늘 하루가 걸려 있어요.',
  '물 아래에도 노을이 지고 있을까요?',
  '서두르지 않아도 돼요. 노을은 천천히 저물어요.',
  '잡은 물고기보다, 같이 본 노을이 더 오래 남아요.',
  '호수가 숨을 고르는 소리가 들려요.',
  '물결이 오늘 있었던 일을 하나씩 데려가요.',
  '이 순간이 오래 기억되면 좋겠어요.',
  '저 연못 깊은 곳엔 아직 아무도 못 본 녀석이 산대요.'
];
const BIG_LINES = [
  '오늘 밤 이야기가 하나 생겼어요.',
  '호수가 오랫동안 숨겨 둔 보물을 꺼내 줬어요.',
  '손이 아직도 떨려요. 이건 꿈이 아니에요.',
  '이런 날을 위해 그 많은 노을을 기다렸나 봐요.'
];
let romanceTimer = 0;
function sayRomance(lines = ROMANCE_LINES) {
  const el = $('romance');
  el.textContent = lines[Math.floor(Math.random() * lines.length)];
  el.classList.add('show');
  clearTimeout(romanceTimer);
  romanceTimer = setTimeout(() => el.classList.remove('show'), 6500);
}
// 40~80초마다 한 번씩
(function romanceLoop() {
  setTimeout(() => { if (!modalOpen()) sayRomance(); romanceLoop(); }, 40000 + Math.random() * 40000);
})();
setTimeout(() => sayRomance(), 4000);

// ---------- 잡았을 때 카드 ----------
let cardTimer = 0;
function showCatchCard(it, isNew) {
  const f = findFish(it.name), R = RARITY[f.rarity];
  const ms = mutList(it.mut);
  const m = ms[0] || null;
  const big = f.huge || fishScale(f, it.weight) >= 2.5;
  $('ccNew').classList.toggle('hidden', !isNew && !f.huge && ms.length < 2);
  $('ccNew').textContent = f.huge ? '말도 안 돼!!' : ms.length === 2 ? '이로치 2개 겹침!' : big && !isNew ? '엄청 크다!' : '새로운 물고기';
  if (big && !isNew) $('ccNew').classList.remove('hidden');
  $('ccMut').innerHTML = mutHTML(it.mut);
  $('ccName').textContent = f.huge ? it.name + '!!!' : it.name;
  $('ccName').style.color = R.color;
  $('ccInfo').textContent = `${R.label} · ${fmtKg(it.weight)} · ${money(it.price)}`;
  ui.catchCard.style.borderColor = m ? m.color : R.color;
  ui.catchCard.classList.toggle('big', big);
  ui.catchCard.style.setProperty('--glowc', m ? m.color : R.color);
  ui.catchCard.classList.remove('hidden');
  ui.catchCard.style.animation = 'none';
  void ui.catchCard.offsetWidth;
  ui.catchCard.style.animation = '';
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => ui.catchCard.classList.add('hidden'), big ? 4500 : 3000);
}

// ---------- 낚싯대 능력치 막대 ----------
// 능력치 막대의 최대치는 제일 좋은 낚싯대 기준이에요
// 능력치 막대의 끝(100%)은 앞으로 나올 더 좋은 낚싯대까지 생각해서 넉넉하게 잡아 뒀어요.
// 그래서 지금 제일 좋은 낚싯대도 막대가 꽉 차지 않아요. (능력치 자체는 그대로예요)
const STAT_MAX = {
  luck: 1.2,   // 운 +120% 까지
  reel: 1.6,   // 게이지 속도 x2.6 까지
  bite: 4.0,   // 입질 속도 +400% 까지
  zone: 0.3    // 초록 칸 +30% 까지
};
// 초록 칸 기본 크기 (막대의 25%) + 낚싯대 보너스
const BASE_ZONE = 0.25;
const zoneOf = (r) => BASE_ZONE + r.zone;
function statsHTML(r) {
  const biteFast = Math.round((1 / r.bite - 1) * 100);
  const rows = [
    ['운', r.luck / STAT_MAX.luck, `+${Math.round(r.luck * 100)}%`],
    ['게이지 속도', (r.reel - 1) / STAT_MAX.reel, `x${r.reel.toFixed(2)}`],
    ['입질 속도', biteFast / (STAT_MAX.bite * 100), `+${biteFast}%`],
    ['초록 칸', r.zone / STAT_MAX.zone, `${Math.round(zoneOf(r) * 100)}%`]
  ];
  return rows.map(([n, p, v]) => `<div class="stat"><span>${n}</span><div class="bar"><i style="width:${Math.max(3, Math.min(100, p * 100))}%"></i></div><span class="v">${v}</span></div>`).join('');
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function applyRod() {
  rodSpin = buildRod(curRod(), rod);
  renderHotbar();
}

// ---------- 도감 ----------
let dexTab = 'fish';
function renderDex() {
  document.querySelectorAll('.tab[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === dexTab));
  const list = $('dexList');
  if (dexTab === 'fish') {
    const got = FISH.filter((f) => save.dex[f.name]).length;
    list.innerHTML = `<div class="count">모은 물고기 ${got} / ${FISH.length}</div><div class="grid">` + FISH.map((f) => {
      const d = save.dex[f.name], R = RARITY[f.rarity];
      return d
        ? `<div class="card" style="--rc:${R.color}"><div class="nm">${f.name}</div><div style="color:${R.color}">${R.label}</div><div>${d.count}마리 · 최고 ${fmtKg(d.best)}</div></div>`
        : `<div class="card unknown" style="--rc:${R.color}"><div class="nm">???</div><div style="color:${R.color}">${R.label}</div><div>아직 못 잡았어요</div></div>`;
    }).join('') + '</div>';
  } else {
    list.innerHTML = `<div class="count">가진 낚싯대 ${save.owned.length} / ${RODS.length} · 가진 낚싯대는 여기서 바꿔 낄 수 있어요</div>`;
    const grid = document.createElement('div');
    grid.className = 'rodGrid';
    list.appendChild(grid);
    RODS.forEach((r, i) => {
      const owned = save.owned.includes(i);
      const row = document.createElement('div');
      row.className = 'rodRow' + (owned ? '' : ' locked');
      row.innerHTML = `<div class="sw" style="background:${hex(r.color)}"></div><div class="info"><div class="nm">${owned ? r.name : r.name + ' (미보유)'}</div>${statsHTML(r)}</div>`;
      const btn = document.createElement('button');
      btn.className = 'actBtn';
      if (!owned) { btn.textContent = '상점에서 구매'; btn.disabled = true; }
      else if (save.rod === i) { btn.textContent = '사용 중'; btn.disabled = true; }
      else { btn.textContent = '장착'; btn.onclick = () => { save.rod = i; writeSave(); applyRod(); renderDex(); updateUI(); }; }
      row.appendChild(btn);
      grid.appendChild(row);
    });
  }
}

// ---------- 낚싯대 상점 ----------
// 어느 상점인지에 따라 파는 낚싯대가 달라요 ('base' = 아래 상점, 'mountain' = 언덕 위 상점)
let rodShopKind = 'base';
function renderRodShop() {
  const list = $('rodShopList');
  $('rodShopTitle').textContent = rodShopKind === 'mountain' ? '언덕 위 낚싯대 상점' : '낚싯대 상점';
  list.innerHTML = `<div class="count">가진 돈 ${money(save.money)}${rodShopKind === 'mountain' ? ' · 산 위 연못의 기운이 깃든 특별한 낚싯대예요' : ''}</div>`;
  const grid = document.createElement('div');
  grid.className = 'rodGrid';
  list.appendChild(grid);
  RODS.forEach((r, i) => {
    if (r.shop !== rodShopKind) return;
    const owned = save.owned.includes(i);
    const row = document.createElement('div');
    row.className = 'rodRow';
    row.innerHTML = `<div class="sw" style="background:${hex(r.color)}"></div><div class="info"><div class="nm">${r.name}</div>${statsHTML(r)}</div>`;
    const btn = document.createElement('button');
    btn.className = 'actBtn';
    if (owned) { btn.textContent = '보유 중'; btn.disabled = true; }
    else {
      btn.textContent = money(r.price);
      btn.disabled = save.money < r.price;
      btn.onclick = () => {
        if (save.money < r.price) return;
        save.money -= r.price;
        save.owned.push(i);
        save.rod = i;
        writeSave(); applyRod(); renderRodShop(); updateUI();
      };
    }
    row.appendChild(btn);
    grid.appendChild(row);
  });
}

// ---------- 물고기 판매점 ----------
function sellItems(ids) {
  let gained = 0;
  save.inv = save.inv.filter((it) => { if (ids.includes(it.id)) { gained += it.price; return false; } return true; });
  if (ids.includes(game.selected)) equip(null);
  save.money += gained;
  writeSave();
  renderSell(); renderHotbar(); updateUI();
}
// 판매점 탭: 팔기 / 희귀도·이로치 표
let sellTab = 'sell';
document.querySelectorAll('.sellTab').forEach((b) => b.addEventListener('click', () => { sellTab = b.dataset.sell; renderSell(); }));
const pct = (v) => (v * 100 >= 10 ? Math.round(v * 100) : (v * 100).toFixed(1).replace(/\.0$/, '')) + '%';
function rarityChances(L) {
  // fish.js 의 rollFish 와 같은 계산이에요
  const c = 0.55 - L, u = 0.8 - L * 0.7, r = 0.94 - L * 0.3, l = 0.99 - L * 0.05;
  return { common: c, uncommon: u - c, rare: r - u, legendary: l - r, mythic: 1 - l };
}
function renderChart() {
  const list = $('sellList');
  const L = curRod().luck;
  const base = rarityChances(0), now = rarityChances(L);
  const rows = Object.entries(RARITY).map(([k, R]) => {
    // 사는 곳 표시: (산) = 산 위 연못, (비) = 비 올 때만
    const names = FISH.filter((f) => f.rarity === k).map((f) => (save.dex[f.name] ? f.name : '???') + (f.weather === 'rain' ? '(비)' : fishZone(f) === 'mountain' ? '(산)' : '')).join(', ');
    return `<tr><td style="color:${R.color};font-weight:900">${R.label}</td><td>${pct(base[k])}</td><td>${pct(now[k])}</td><td class="fishNames">${names}</td></tr>`;
  }).join('');
  const boost = 1 + L * 1.5;
  const muts = [...MUTATIONS].sort((a, b) => b.chance - a.chance).map((m) =>
    `<tr><td style="color:${m.color};font-weight:900">${m.name}</td><td>${pct(m.chance)}</td><td>${pct(m.chance * boost)}</td><td>${m.mult}배</td></tr>`).join('');
  list.innerHTML = `
    <div class="count">"지금" 은 쓰고 있는 <b>${curRod().name}</b>의 운(+${Math.round(L * 100)}%)을 넣은 확률이에요. 산 위 연못과 밤에는 운이 +5%씩 더 붙어요.</div>
    <h3 class="chartH">희귀도</h3>
    <table class="chart"><tr><th>희귀도</th><th>기본</th><th>지금</th><th>물고기 (못 잡은 건 ???)</th></tr>${rows}</table>
    <h3 class="chartH">이로치 (확률 높은 순)</h3>
    <table class="chart"><tr><th>이로치</th><th>기본</th><th>지금</th><th>가격</th></tr>${muts}</table>
    <div class="count" style="margin-top:8px">이로치가 붙으면 절반 확률로 하나 더 굴려서 최대 2개까지 겹쳐요. 겹치면 색이 반반, 가격은 두 배율을 곱해요 (예: 골드 + 다이아 = 7.5배).</div>`;
}
function renderSell() {
  document.querySelectorAll('.sellTab').forEach((b) => b.classList.toggle('active', b.dataset.sell === sellTab));
  if (sellTab === 'chart') { renderChart(); return; }
  const list = $('sellList');
  const total = save.inv.reduce((s, it) => s + it.price, 0);
  list.innerHTML = '';
  const top = document.createElement('div');
  top.className = 'sellTop';
  top.innerHTML = `<span>물고기 ${save.inv.length}마리 · 전부 ${money(total)}</span>`;
  const all = document.createElement('button');
  all.className = 'actBtn';
  all.textContent = '전부 팔기';
  all.disabled = !save.inv.length;
  all.onclick = () => sellItems(save.inv.map((x) => x.id));
  top.appendChild(all);
  list.appendChild(top);
  if (!save.inv.length) { list.insertAdjacentHTML('beforeend', '<div class="count">팔 물고기가 없어요. 호수에서 낚아 오세요.</div>'); return; }
  for (let i = save.inv.length - 1; i >= 0; i--) {
    const it = save.inv[i];
    const mh = mutHTML(it.mut);
    const row = document.createElement('div');
    row.className = 'sellRow';
    row.innerHTML = `<span class="nm">${mh ? mh + ' ' : ''}${esc(it.name)} <span style="color:#aaa;font-weight:400">${esc(fmtKg(it.weight))}</span></span><span class="pr">${esc(money(it.price))}</span>`;
    const b = document.createElement('button');
    b.className = 'actBtn';
    b.textContent = '팔기';
    b.onclick = () => sellItems([it.id]);
    row.appendChild(b);
    list.appendChild(row);
  }
}

// ---------- 창 열고 닫기 ----------
const panels = () => [ui.dexPanel, ui.rodShopPanel, ui.sellPanel, $('setPanel'), $('cookPanel'), $('multiPanel')];
const modalOpen = () => panels().some((p) => !p.classList.contains('hidden'));
function openPanel(p) {
  panels().forEach((x) => x.classList.add('hidden'));
  for (const k in keys) keys[k] = false;
  setShiftLock(false); // 창을 열면 마우스를 풀어 줘요
  if (game.state === 'charging') { game.state = 'idle'; game.notice = ''; updateUI(); } // 힘 모으던 건 취소
  game.holding = false;
  p.classList.remove('hidden');
}

// ---------- 설정 (시프트 락, 감도) ----------
const OPT_KEY = 'lakeFishing_options';
const opts = { shiftLock: true, sens: 1, invert: false, name: '', look: Math.floor(Math.random() * 6), room: 'PLAZA' };
try {
  // 설정도 검사해서 불러와요
  const o = JSON.parse(localStorage.getItem(OPT_KEY)) || {};
  if (typeof o.shiftLock === 'boolean') opts.shiftLock = o.shiftLock;
  if (typeof o.invert === 'boolean') opts.invert = o.invert;
  const sens = Number(o.sens);
  if (Number.isFinite(sens)) opts.sens = Math.min(3, Math.max(0.2, sens));
  if (typeof o.name === 'string') opts.name = o.name.replace(/[<>&"'`\\]/g, '').slice(0, 12);
  if (Number.isInteger(o.look) && o.look >= 0 && o.look < 6) opts.look = o.look;
  if (typeof o.room === 'string' && /^[A-Z0-9]{3,8}$/.test(o.room)) opts.room = o.room;
} catch (_) {}
const writeOpts = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (_) {} };
function renderOpts() {
  $('optShift').classList.toggle('on', opts.shiftLock);
  $('optInvert').classList.toggle('on', opts.invert);
  $('optSens').value = String(opts.sens);
  $('sensVal').textContent = opts.sens.toFixed(1);
}
$('setBtn').addEventListener('click', (e) => { e.currentTarget.blur(); renderOpts(); openPanel($('setPanel')); });
$('optShift').addEventListener('click', () => { opts.shiftLock = !opts.shiftLock; if (!opts.shiftLock) setShiftLock(false); writeOpts(); renderOpts(); });
$('optInvert').addEventListener('click', () => { opts.invert = !opts.invert; writeOpts(); renderOpts(); });
$('optSens').addEventListener('input', (e) => { opts.sens = Number(e.target.value); writeOpts(); renderOpts(); });

// 시프트 락: 마우스를 화면에 고정하고, 캐릭터가 카메라 방향을 바라봐요
// 브라우저가 마우스 고정(포인터 락)을 막아도 동작하게:
//  - 고정이 되면: 마우스를 화면에 가두고 움직임만 읽어요
//  - 고정이 안 되면: 마우스를 숨기고, 움직인 만큼 돌리고, 화면 끝에 닿으면 계속 돌려요
let shiftLocked = false;   // 시프트 락 켜짐
let hardLock = false;      // 진짜 마우스 고정이 됐는지
let lockBlocked = false;   // 이 창에서는 마우스 고정이 아예 막혀 있는지
let needClick = false;     // 브라우저가 "클릭해야 고정해 줄게" 하는 상태
function lockHint(text) {
  const el = $('lockHint');
  el.textContent = text || '';
  el.classList.toggle('hidden', !text);
}
function tryPointerLock() {
  const cv = renderer.domElement;
  const fail = (err) => {
    if (!shiftLocked || hardLock) return;
    const msg = String(err && err.message || '');
    if (/root document|not valid|sandbox/i.test(msg) || !cv.requestPointerLock) {
      lockBlocked = true;
      needClick = false;
      lockHint('이 창에서는 마우스 고정이 막혀 있어요. 게임시작.bat 으로 크롬/엣지에서 켜면 고정돼요.');
    } else {
      needClick = true;
      lockHint('화면을 한 번 클릭하면 마우스가 고정돼요');
    }
  };
  if (!cv.requestPointerLock) { fail(); return; }
  try {
    const p = cv.requestPointerLock();
    if (p && p.catch) p.catch(fail);
  } catch (err) { fail(err); }
}
function setShiftLock(on) {
  shiftLocked = on;
  document.body.classList.toggle('locked', on);
  $('lockDot').classList.toggle('hidden', !on);
  needClick = false;
  if (on) {
    if (lockBlocked) lockHint('이 창에서는 마우스 고정이 막혀 있어요. 게임시작.bat 으로 크롬/엣지에서 켜면 고정돼요.');
    else tryPointerLock();
    if (lockBlocked) setTimeout(() => { if (shiftLocked && !hardLock) lockHint(''); }, 3500);
  } else {
    lockHint('');
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
document.addEventListener('pointerlockchange', () => {
  const was = hardLock;
  hardLock = document.pointerLockElement === renderer.domElement;
  if (hardLock) { needClick = false; lockHint(''); }
  if (was && !hardLock && shiftLocked) setShiftLock(false); // Esc 로 풀었을 때
});
document.addEventListener('pointerlockerror', () => {
  if (shiftLocked && !hardLock && !lockBlocked) { needClick = true; lockHint('화면을 한 번 클릭하면 마우스가 고정돼요'); }
});
// 마우스 위치 (창 밖으로 나가면 out = true)
const mouse = { x: innerWidth / 2, y: innerHeight / 2, out: false };
// relatedTarget 이 없으면 = 마우스가 창 밖으로 나간 거예요
window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) mouse.out = true; });
window.addEventListener('blur', () => { mouse.out = true; });
const closePanels = () => panels().forEach((x) => x.classList.add('hidden'));
$('dexBtn').addEventListener('click', (e) => { e.currentTarget.blur(); renderDex(); openPanel(ui.dexPanel); });
document.querySelectorAll('.tab[data-tab]').forEach((t) => t.addEventListener('click', () => { dexTab = t.dataset.tab; renderDex(); }));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); }));

function interact() {
  if (game.nearTalk) { talkTo(game.nearTalk); return; } // 사람한테 말 걸기 (낚시 중이어도 돼요)
  if (game.nearFire) { sitAtFire(); return; }          // 모닥불에 앉아서 굽기
  if (game.sitting) { renderCook(); openPanel($('cookPanel')); return; } // 앉은 채로 다시 굽기 창
  const s = game.nearShop;
  if (!s || game.state === 'charging' || game.state === 'reeling') return;
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  if (s.kind === 'rod' || s.kind === 'rod2') { rodShopKind = s.kind === 'rod2' ? 'mountain' : 'base'; renderRodShop(); openPanel(ui.rodShopPanel); }
  else { renderSell(); openPanel(ui.sellPanel); }
}

// =====================================================
//  소리: 효과음 + 배경음악 (유튜브 또는 직접 만든 음악)
// =====================================================
const audio = { ctx: null, sfx: null, music: null, started: false, on: true, yt: null, synthOn: false };
function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, out = audio.sfx) {
  if (!audio.ctx || !out) return;
  const ctx = audio.ctx, t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
// ---- 물소리 만들기: 하얀 잡음(쏴아)을 걸러서 물보라·바람 소리를 내요 ----
let noiseBuffer = null;
function getNoise() {
  if (noiseBuffer || !audio.ctx) return noiseBuffer;
  const ctx = audio.ctx;
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}
// 쏴아/촤악: 걸러진 잡음. type = bandpass(물보라) / highpass(바람)
function noise(vol, when, dur, f0, f1, type = 'bandpass', q = 0.9) {
  if (!audio.ctx) return;
  const ctx = audio.ctx, t0 = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(audio.sfx);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}
// 퐁!: 높은 음이 순식간에 뚝 떨어지는 물방울 소리
function plop(vol = 0.3, when = 0, hi = 700, lo = 160, dur = 0.14) {
  if (!audio.ctx) return;
  const ctx = audio.ctx, t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(hi, t0);
  o.frequency.exponentialRampToValueAtTime(lo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
  o.connect(g).connect(audio.sfx);
  o.start(t0);
  o.stop(t0 + dur + 0.1);
}
const sfx = {
  // 휙~ (바람 가르는 소리)
  cast() { noise(0.12, 0, 0.32, 600, 3200, 'highpass', 0.6); tone(420, 0.18, 'sine', 0.05, 0.02); },
  // 찌가 물에 톡 떨어질 때
  land() { plop(0.16, 0, 900, 260, 0.1); noise(0.06, 0, 0.18, 1800, 700); },
  // 입질! 퐁(빨려 들어감) + 둥(묵직) + 쏴(물보라) + 띠링(종소리)
  bite() {
    plop(0.42, 0, 820, 120, 0.16);
    tone(110, 0.22, 'sine', 0.28, 0);                 // 둥
    noise(0.16, 0.01, 0.32, 2400, 600);              // 쏴
    tone(1568, 0.22, 'triangle', 0.13, 0.09);        // 띠
    tone(2093, 0.35, 'sine', 0.11, 0.16);            // 링
    tone(2637, 0.45, 'sine', 0.06, 0.22);
  },
  // 낚아 올림: 촤악! + 반짝 반짝 올라가는 소리
  win(rare) {
    noise(0.22, 0, 0.5, 1600, 400);
    plop(0.25, 0.02, 600, 140, 0.18);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.13, 0.08 + i * 0.09));
    tone(2093, 0.3, 'sine', 0.07, 0.45);
    if (rare) { tone(1568, 0.7, 'sine', 0.12, 0.5); tone(2637, 0.8, 'sine', 0.06, 0.62); }
  },
  lose() { tone(220, 0.5, 'sine', 0.1); tone(165, 0.6, 'sine', 0.1, 0.2); },
  coin() { tone(1046, 0.12, 'square', 0.05); tone(1568, 0.18, 'square', 0.05, 0.08); }
};
function startAudio() {
  if (audio.started) return;
  audio.started = true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    audio.ctx = new AC();
    audio.sfx = audio.ctx.createGain();
    audio.sfx.gain.value = 0.22;
    audio.sfx.connect(audio.ctx.destination);
  }
  // 1순위: music/배경음악.mp3 (화면 없이 소리만)  2순위: 유튜브(켰을 때만)  3순위: 직접 만든 음악
  const el = new Audio();
  el.loop = true;
  el.volume = MUSIC_VOLUME / 100;
  el.addEventListener('canplaythrough', () => {
    if (audio.file) return;
    audio.file = el;
    if (audio.on) el.play().catch(() => {});
  }, { once: true });
  el.addEventListener('error', () => {
    const id = parseYouTubeId(YOUTUBE_LINK);
    if (SHOW_YOUTUBE && id) startYouTube(id); else startSynthMusic();
  }, { once: true });
  el.src = MUSIC_FILE.split('/').map(encodeURIComponent).join('/');
}
function parseYouTubeId(link) {
  if (!link) return '';
  const s = String(link).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}
function startYouTube(id) {
  $('ytBox').classList.remove('hidden');
  const fallback = () => { $('ytBox').classList.add('hidden'); audio.yt = null; startSynthMusic(); };
  const make = () => {
    audio.yt = new YT.Player('ytPlayer', {
      width: 200, height: 200, videoId: id,
      playerVars: { autoplay: 1, loop: 1, playlist: id, playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => { e.target.setVolume(MUSIC_VOLUME); if (audio.on) e.target.playVideo(); },
        onError: fallback
      }
    });
  };
  if (window.YT && window.YT.Player) { make(); return; }
  window.onYouTubeIframeAPIReady = make;
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = fallback;
  document.head.appendChild(s);
}
function startSynthMusic() {
  if (!audio.ctx || audio.synthOn) return;
  audio.synthOn = true;
  const ctx = audio.ctx;
  audio.music = ctx.createGain();
  audio.music.gain.value = audio.on ? 0.22 : 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain(); fb.gain.value = 0.42;
  const wet = ctx.createGain(); wet.gain.value = 0.38;
  audio.music.connect(lp);
  lp.connect(ctx.destination);
  lp.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(ctx.destination);
  const chords = [[130.81, 164.81, 196.0, 246.94], [110.0, 130.81, 164.81, 196.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 329.63]];
  const penta = [523.25, 587.33, 659.25, 783.99, 880.0];
  let ci = 0;
  const playChord = () => {
    const t0 = ctx.currentTime;
    for (const f of chords[ci % chords.length]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 2.2);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 7.5);
      o.connect(g).connect(audio.music);
      o.start(t0);
      o.stop(t0 + 7.6);
    }
    ci++;
    for (let k = 0; k < 3; k++) tone(penta[Math.floor(Math.random() * penta.length)], 1.6, 'sine', 0.07, 0.8 + k * 1.7 + Math.random() * 0.6, audio.music);
  };
  playChord();
  setInterval(playChord, 6000);
}
ui.mute.addEventListener('click', (e) => {
  e.currentTarget.blur();
  startAudio();
  audio.on = !audio.on;
  if (audio.music) audio.music.gain.setTargetAtTime(audio.on ? 0.22 : 0, audio.ctx.currentTime, 0.1);
  if (audio.yt && audio.yt.playVideo) { if (audio.on) audio.yt.playVideo(); else audio.yt.pauseVideo(); }
  if (audio.file) { if (audio.on) audio.file.play().catch(() => {}); else audio.file.pause(); }
  ui.mute.textContent = audio.on ? '음악 끄기' : '음악 켜기';
});

// =====================================================
//  낚시 흐름
// =====================================================
// 줄 거두기: 찌가 낚싯대 끝으로 쓱 돌아와요 (instant = 바로 없애기)
function retract(instant = false) {
  if (instant || !game.rodOut) {
    game.state = 'idle';
    game.notice = '';
    updateUI();
    return;
  }
  game.state = 'retracting';
  game.retractFrom = bobber.position.clone();
  game.retractStart = performance.now();
  tone(420, 0.18, 'sine', 0.06);
  updateUI();
}

function beginCharge() {
  game.state = 'charging';
  game.chargeStart = performance.now();
  game.power = 0;
  game.notice = '';
  ui.catchCard.classList.add('hidden');
  updateUI();
}

function cast() {
  const p = game.power;
  const fwdX = -Math.sin(player.ry), fwdZ = -Math.cos(player.ry);
  const dist = 2.5 + p * 8;
  const tx = person.position.x + fwdX * dist, tz = person.position.z + fwdZ * dist;
  // 떨어진 곳의 물을 찾아요 (언덕 위 연못이면 물 높이도 높아요)
  const wtr = waterAt(tx, tz);
  game.inWater = !!wtr && !onDock(tx, tz) && !onIsland(tx, tz);
  game.castWater = game.inWater ? wtr : null;
  game.waterY = game.inWater ? wtr.y : groundY(tx, tz);
  game.bobberTarget.set(tx, game.waterY + (game.inWater ? 0.16 : 0.13), tz);
  rodTipWorld(game.castStart);
  game.state = 'casting';
  game.castStartedAt = performance.now();
  game.landed = false;
  game.castFlight = 700 + p * 400;
  game.biteAt = performance.now() + game.castFlight + (2600 + Math.random() * 3800) * curRod().bite;
  game.armSwingUntil = performance.now() + 450;
  bobber.position.copy(game.castStart);
  sfx.cast();
  updateUI();
}

function startReel() {
  // 산 위 연못처럼 운 보너스가 있는 물이면 더해 줘요
  // 산 위 연못이면 그곳에만 사는 신기한 물고기가 나와요
  const fish = rollFish(curRod().luck + (game.castWater?.luck || 0) + (isNight() ? 0.05 : 0) + buffLuck(), game.castWater?.zone || 'lake', isRaining()); // 밤에는 운 +5%
  const f = findFish(fish.name);
  const R = RARITY[f.rarity];
  // 초록 칸 크기는 낚싯대가 정해요 (어떤 물고기든 같아요). 물고기 희귀도는 날뛰는 속도만 바꿔요.
  const zoneW = zoneOf(curRod());
  game.reel = { fish, zoneW, zone: 0.5 - zoneW / 2, vel: 0, fishPos: 0.5, target: 0.5, nextJump: 0, progress: 0.3, speed: R.speed, jump: R.jump, heavy: fishScale(f, fish.weight) >= 2 };
  game.state = 'reeling';
  if (f.huge) game.shake = { until: performance.now() + 900, mag: 0.12 }; // 걸리는 순간 화면이 흔들려요
  updateUI();
}

let fishAnim = null;
function finishCatch() {
  const fish = game.reel.fish;
  const f = findFish(fish.name);
  const R = RARITY[f.rarity];
  const m = mutList(fish.mut)[0] || null;
  const isNew = !save.dex[fish.name];
  const d = save.dex[fish.name] || { count: 0, best: 0 };
  d.count++;
  d.best = Math.max(d.best, fish.weight);
  save.dex[fish.name] = d;
  save.caught++;
  const item = { id: save.nextId++, ...fish };
  save.inv.push(item);
  writeSave();

  game.notice = `${m ? mutHTML(fish.mut) + ' ' : ''}<span style="color:${R.color}">${esc(fish.name)}</span> ${esc(fmtKg(fish.weight))}를 낚았어요!`;
  game.state = 'caught';
  // 종류마다 다른 모양의 물고기가 튀어 올라요 (무거울수록 커요)
  if (fishAnim) scene.remove(fishAnim.model);
  const model = makeFishModel(f, fish.mut, fish.weight);
  scene.add(model);
  const sc = fishScale(f, fish.weight);
  fishAnim = {
    start: performance.now(), from: bobber.position.clone(), model, scale: sc, name: f.name,
    lift: 2.6 + sc * 0.55,                         // 큰 물고기일수록 더 높이 들어 올려요
    hold: f.huge ? 3.4 : sc >= 2 ? 2.6 : 1.8       // 큰 물고기는 더 오래 보여 줘요
  };
  if (sc >= 2) game.shake = { until: performance.now() + (f.huge ? 1600 : 700), mag: f.huge ? 0.22 : 0.08 };
  sfx.win(f.rarity === 'rare' || f.rarity === 'legendary' || f.rarity === 'mythic' || !!m || sc >= 2);
  multi.sendCatch(item); // 같은 방 사람들에게 "낚았어요!" 소식
  if (f.huge) { tone(196, 1.2, 'triangle', 0.14, 0.5); tone(262, 1.2, 'triangle', 0.12, 0.7); tone(392, 1.4, 'triangle', 0.12, 0.9); }
  showCatchCard(item, isNew);
  if (f.rarity === 'legendary' || f.rarity === 'mythic' || sc >= 2.5) sayRomance(BIG_LINES);
  renderHotbar();
  updateUI();
}

function pressStart() {
  if (modalOpen()) return;
  startAudio();
  game.holding = true;
  if (game.sitting) return; // 모닥불에 앉아 있을 땐 낚시 안 해요
  // 헤엄치는 중에는 낚시를 못 해요
  if (game.swimming) {
    if (game.state === 'idle' || game.state === 'caught' || game.state === 'missed') { game.state = 'idle'; game.notice = '헤엄치는 중에는 낚시를 못 해요. 섬이나 물가로 올라가요.'; updateUI(); }
    return;
  }
  // 낚싯대를 안 꺼냈으면 아무것도 안 던져요
  if (!game.rodOut) {
    if (game.state === 'idle') { game.notice = '낚싯대를 꺼내려면 1번 키를 눌러요.'; updateUI(); }
    return;
  }
  if (game.state === 'idle' || game.state === 'caught' || game.state === 'missed') beginCharge();
  else if (game.state === 'bite') startReel();
  // 던져 둔 상태에서 다시 누르면 줄을 거둬요
  else if (game.state === 'casting' && performance.now() > game.castStartedAt + game.castFlight) { game.holding = false; retract(); }
}
function pressEnd() {
  game.holding = false;
  if (game.state === 'charging') cast();
}

// =====================================================
//  조작: 키보드, 마우스
// =====================================================
const keys = {};
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
// 한글 입력 상태여도 같은 키로 알아보게 (ㅈ=W, ㅁ=A, ㄴ=S, ㅇ=D)
const KEY_BY_CHAR = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', 'ㅈ': 'KeyW', 'ㅉ': 'KeyW', 'ㅁ': 'KeyA', 'ㄴ': 'KeyS', 'ㅇ': 'KeyD' };
const KEY_BY_NUM = { 87: 'KeyW', 65: 'KeyA', 83: 'KeyS', 68: 'KeyD', 38: 'ArrowUp', 40: 'ArrowDown', 37: 'ArrowLeft', 39: 'ArrowRight' };
function moveKeyOf(e) {
  if (MOVE_KEYS.includes(e.code)) return e.code;
  return KEY_BY_CHAR[(e.key || '').toLowerCase()] || KEY_BY_NUM[e.keyCode] || null;
}
// 눌린 키를 전부 "뗌"으로 (키 뗀 신호를 놓쳤을 때를 대비)
function releaseAllKeys() {
  for (const k in keys) keys[k] = false;
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') { closePanels(); if (shiftLocked) setShiftLock(false); return; }
  if (e.code === 'KeyQ') { if (modalOpen()) closePanels(); else { renderDex(); openPanel(ui.dexPanel); } return; }
  if (modalOpen()) return;
  const mk = moveKeyOf(e);
  if (mk) { keys[mk] = true; e.preventDefault(); }
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyB') toggleBag(); // 가방 열고 닫기
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') && !e.repeat && opts.shiftLock) setShiftLock(!shiftLocked);
  // 숫자 키: 1 = 낚싯대, 2~9 = 물고기
  const dm = e.code.match(/^Digit([1-9])$/);
  if (dm) {
    const id = hotbarOrder()[Number(dm[1]) - 1];
    if (id !== undefined) toggleEquip(id);
  }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressStart(); }
});
window.addEventListener('keyup', (e) => {
  const mk = moveKeyOf(e);
  if (mk) keys[mk] = false;
  // 한글 입력 중이라 어떤 키를 뗐는지 모르면, 안전하게 전부 떼요
  else if (e.keyCode === 229 || e.key === 'Process' || e.key === 'Unidentified' || e.key === 'HangulMode') releaseAllKeys();
  if (e.code === 'Space') pressEnd();
});
// 창이 포커스를 잃거나, 다시 얻거나, 안 보이게 되면 키 뗀 신호를 놓쳤을 수 있어서 전부 떼요
window.addEventListener('blur', releaseAllKeys);
window.addEventListener('focus', releaseAllKeys);
document.addEventListener('visibilitychange', releaseAllKeys);

// 마우스: 왼쪽 = 낚시, 오른쪽 드래그 = 화면 돌리기, 휠 = 확대
const cam = { yaw: 0.62, pitch: 0.46, dist: 11 };
const canvas = renderer.domElement;
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  // 시프트 락이 켜졌는데 아직 고정이 안 됐으면, 이 클릭은 "마우스 고정"에만 써요 (낚싯대 안 던짐)
  if (e.button === 0 && shiftLocked && !hardLock && needClick) { swallowUp = true; tryPointerLock(); return; }
  if (e.button === 0) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} pressStart(); }
  if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
});
let swallowUp = false;
window.addEventListener('pointerup', (e) => {
  if (e.button === 0 && swallowUp) { swallowUp = false; return; }
  if (e.button === 0) pressEnd();
  if (e.button === 2) dragging = false;
});
function turnCamera(dx, dy, k) {
  const s = opts.sens * k;
  cam.yaw -= dx * s;
  cam.pitch = Math.min(1.25, Math.max(0.05, cam.pitch + dy * s * 0.7 * (opts.invert ? -1 : 1)));
}
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.out = false;
  if (shiftLocked) { turnCamera(e.movementX || 0, e.movementY || 0, 0.0028); return; }
  if (!dragging) return;
  turnCamera(e.clientX - lastX, e.clientY - lastY, 0.006);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => { cam.dist = Math.min(18, Math.max(5, cam.dist + e.deltaY * 0.01)); }, { passive: true });

// 걸어갈 수 있는 곳인지 확인
const BOUNDS = { x0: -40, x1: 44, z0: -36, z1: 16 };
const WADE = 0.32;  // 얕은 물에 들어가면 이만큼 잠겨요
const SWIM = 1.05;  // 깊은 물에서 헤엄칠 때는 이만큼 잠겨요 (머리만 물 위로)
const ISLAND_TOP = 0.25;
const isSwimSpot = (x, z) => !onDock(x, z) && !onStairs(x, z) && !onIsland(x, z) && !onBridge(x, z) && inLake(x, z) && !isShallow(x, z);
// 발이 닿는 높이: 부두 / 계단 / 섬 / 깊은 물(수영) / 얕은 물 / 언덕 위 / 땅
function groundY(x, z) {
  if (onDock(x, z)) return 0.26;
  if (onStairs(x, z)) return stairHeight(z) - 0.08;
  if (onIsland(x, z)) return ISLAND_TOP;
  if (onBridge(x, z)) return BRIDGE.y;
  const w = waterAt(x, z);
  if (w) return w.y - (isShallow(x, z) ? WADE : SWIM);
  if (onPlateau(x, z)) return PLATEAU_TOP;
  return -0.08;
}
// noSwim = true 면 깊은 물에는 못 들어가요 (돌아다니는 NPC 들은 헤엄치지 않아요)
function walkable(x, z, fromX, fromZ, noSwim = false) {
  if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return false;
  for (const c of colliders) if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return false;
  if (noSwim && (onIsland(x, z) || isSwimSpot(x, z))) return false;
  // 높이 차이가 크면(절벽) 못 올라가고 못 뛰어내려요. 계단은 한 칸씩이라 괜찮아요.
  // 물에서 섬·부두·물가로 기어오를 때는 조금 더 높아도 돼요
  if (fromX !== undefined) {
    const watery = inLake(x, z) || inLake(fromX, fromZ);
    if (Math.abs(groundY(x, z) - groundY(fromX, fromZ)) > (watery ? 1.45 : 0.5)) return false;
  }
  return true;
}
const isWading = (x, z) => !onDock(x, z) && !onStairs(x, z) && !onIsland(x, z) && !onBridge(x, z) && inLake(x, z);

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  // 모닥불에 앉아 있다가 방향키를 누르면 일어나요
  if (game.sitting && !modalOpen() && (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight)) {
    // 일어날 땐 통나무 밖으로 한 걸음 (모닥불 반대쪽) — 통나무 안에 끼지 않게
    const st = game.sitting;
    const ax = st.x - campfire.pos.x, az = st.z - campfire.pos.z, l = Math.hypot(ax, az) || 1;
    person.position.x = st.x + (ax / l) * 0.95;
    person.position.z = st.z + (az / l) * 0.95;
    person.position.y = -0.08;
    game.sitting = null;
  }
  const canMove = !game.sitting && game.state !== 'charging' && game.state !== 'reeling' && !modalOpen() && !(fishAnim && fishAnim.hold > 3);
  player.moving = canMove && (ix !== 0 || iz !== 0);
  if (player.moving) {
    if (game.state === 'casting' || game.state === 'bite') retract();
    // 카메라가 보는 방향 기준으로 움직여요
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let dx = fx * -iz + rx * ix, dz = fz * -iz + rz * ix;
    const len = Math.hypot(dx, dz);
    dx /= len; dz /= len;
    const step = (game.swimming ? 3.0 : 4.6) * dt; // 헤엄칠 땐 조금 느려요
    const p = person.position;
    if (walkable(p.x + dx * step, p.z, p.x, p.z)) p.x += dx * step;
    if (walkable(p.x, p.z + dz * step, p.x, p.z)) p.z += dz * step;
    if (!shiftLocked) {
      const want = Math.atan2(-dx, -dz);
      let diff = want - player.ry;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.ry += diff * Math.min(1, dt * 12);
    }
    player.walkT += dt * 9;
  }
  // 시프트 락 중에는 항상 카메라가 보는 쪽을 바라봐요 (게 걸음 가능)
  if (shiftLocked && game.state !== 'reeling') player.ry = cam.yaw;
  person.rotation.y = player.ry;
  const gy = groundY(person.position.x, person.position.z);
  const wasSwimming = game.swimming;
  game.swimming = isSwimSpot(person.position.x, person.position.z);
  if (game.swimming && !wasSwimming) {
    // 물에 뛰어들면 낚싯줄은 거두고, 낚시는 못 해요
    if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
    tone(300, 0.25, 'sine', 0.08); tone(200, 0.3, 'sine', 0.06, 0.05);
  }
  // 헤엄칠 땐 물결 따라 살짝 둥실둥실
  const bob = game.swimming ? Math.sin(performance.now() * 0.004) * 0.05 : 0;
  person.position.y += (gy + bob - person.position.y) * Math.min(1, dt * 10);
  // 헤엄칠 땐 몸을 앞으로 눕혀요
  person.rotation.order = 'YXZ';
  const tilt = game.swimming ? (player.moving ? -0.55 : -0.15) : 0;
  person.rotation.x += (tilt - person.rotation.x) * Math.min(1, dt * 8);
  // 다리: 걸을 땐 성큼성큼, 헤엄칠 땐 빠르게 발장구
  const swing = game.swimming ? Math.sin(performance.now() * 0.018) * 0.35 : player.moving ? Math.sin(player.walkT) * 0.6 : 0;
  hero.legs[0].rotation.x += (swing - hero.legs[0].rotation.x) * Math.min(1, dt * 15);
  hero.legs[1].rotation.x += (-swing - hero.legs[1].rotation.x) * Math.min(1, dt * 15);
  if (game.sitting) {
    // 통나무에 앉은 자세: 다리를 앞으로, 몸을 통나무 높이에
    const st = game.sitting;
    person.position.set(st.x, -0.24, st.z);
    player.ry = st.ry;
    person.rotation.y = st.ry;
    hero.legs.forEach((l) => (l.rotation.x = Math.PI / 2));
  }

  // 가까운 상점 찾기
  game.nearShop = null;
  let shopD = Infinity;
  for (const s of shops) {
    const d = (person.position.x - s.pos.x) ** 2 + (person.position.z - s.pos.z) ** 2;
    if (d < 2.4 * 2.4) { game.nearShop = s; shopD = d; }
  }
  // 가까운 사람 찾기 (말 걸기). 상점보다 더 가까우면 사람이 먼저예요
  game.nearTalk = null;
  let best = 3.0 * 3.0;
  for (const n of [...walkers, ...npcs]) {
    const g = n.group.position;
    if (Math.abs(g.y - person.position.y) > 1.6) continue; // 언덕 위·아래는 안 돼요
    const d = (person.position.x - g.x) ** 2 + (person.position.z - g.z) ** 2;
    if (d < best) { best = d; game.nearTalk = n; }
  }
  // 방금까지 안내하던 사람이 아직 가까이 있으면 그대로 (두 사람 사이에서 왔다 갔다 깜빡이지 않게)
  const prev = game.lastTalk;
  if (prev && prev !== game.nearTalk) {
    const g = prev.group.position;
    const dPrev = (person.position.x - g.x) ** 2 + (person.position.z - g.z) ** 2;
    if (dPrev < 3.2 * 3.2 && Math.abs(g.y - person.position.y) <= 1.6 && Math.sqrt(dPrev) - Math.sqrt(best) < 0.6) { game.nearTalk = prev; best = dPrev; }
  }
  if (game.nearTalk && game.nearShop && shopD < best) game.nearTalk = null;
  if (game.nearTalk) game.nearShop = null;
  game.lastTalk = game.nearTalk;
  // 모닥불 근처 (사람·상점이 더 가까우면 그쪽이 먼저)
  game.nearFire = !game.nearTalk && !game.nearShop && !game.sitting && campfire.pos && person.position.distanceTo(campfire.pos) < 2.8;
}

// ---------- 말 걸기 ----------
// NPC 혼자서만 말해요. 가끔은 시간대에 맞는 말을 해요.
function talkTo(n) {
  if (n.name === '고수 할배' && grandpaTalk(n)) return; // 할배는 부탁을 주고받아요
  const now = performance.now();
  let text;
  const tl = TIME_LINES[phaseName()];
  if (tl && Math.random() < 0.25) text = tl[Math.floor(Math.random() * tl.length)];
  else text = n.lines[n.li++ % n.lines.length];
  n.talkUntil = now + 5200;
  game.talk = { npc: n, text, until: now + 5200 };
  // 화면 아래 안내 글 바로 위에 "이름: 멘트" 한 줄로 보여요
  const el = $('talkLine');
  $('talkName').textContent = n.name;
  $('talkText').textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  tone(660, 0.08, 'triangle', 0.06); tone(880, 0.1, 'triangle', 0.05, 0.07);
}
function updateBubble() {
  const tk = game.talk;
  if (!tk) return;
  // 시간이 지나거나, 멀리 걸어가거나, 창을 열면 대사가 사라져요
  if (performance.now() > tk.until || modalOpen() || tk.npc.group.position.distanceTo(person.position) > 9) {
    $('talkLine').classList.add('hidden');
    game.talk = null;
  }
}
// 누가 말하는지 정해서 대사 한 줄 띄우기 (talkTo 와 같은 자리)
function sayLine(n, text, ms = 6000) {
  const now = performance.now();
  n.talkUntil = now + ms;
  game.talk = { npc: n, text, until: now + ms };
  $('talkName').textContent = n.name;
  $('talkText').textContent = text;
  const el = $('talkLine');
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}
// 받침이 있으면 a, 없으면 b ("붕어를", "잉어를", "메기를" ...)
const josa = (word, a, b) => {
  const c = word.charCodeAt(word.length - 1);
  return word + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b);
};
const whereOf = (f) => (f.weather === 'rain' ? '비 오는 날 큰 호수' : fishZone(f) === 'mountain' ? '산 위 연못' : '큰 호수');

// =====================================================
//  고수 할배의 부탁 — 물고기를 잡아다 주면 보상을 줘요
// =====================================================
function newQuest() {
  // 신화·거대 물고기는 빼고, 흔한 것부터 전설까지 골고루
  const W = { common: 3, uncommon: 3, rare: 2.4, legendary: 1.1 };
  const pool = FISH.filter((f) => W[f.rarity] && !f.huge);
  let total = pool.reduce((s, f) => s + W[f.rarity] * (f.weather ? 0.6 : 1), 0);
  let r = Math.random() * total, pick = pool[0];
  for (const f of pool) { r -= W[f.rarity] * (f.weather ? 0.6 : 1); if (r <= 0) { pick = f; break; } }
  const mid = priceOf(pick, (pick.w[0] + pick.w[1]) / 2, null);
  const reward = Math.max(300, Math.round((mid * 4 + 200) / 100) * 100);
  save.quest = { name: pick.name, reward };
  writeSave();
  return save.quest;
}
function grandpaTalk(n) {
  const q = save.quest;
  if (q) {
    // 가방에 그 물고기가 있으면 건네줘요 (가장 가벼운 걸로)
    const have = save.inv.filter((it) => it.name === q.name).sort((a, b) => a.weight - b.weight)[0];
    if (have) {
      save.inv = save.inv.filter((it) => it !== have);
      if (game.selected === have.id) equip(null);
      save.money += q.reward;
      save.questsDone++;
      save.quest = null;
      save.questReadyAt = Date.now() + 90 * 1000; // 1분 30초 쉬었다가 다음 부탁
      writeSave();
      renderHotbar(); updateUI(); updateQuestHud();
      sfx.win(true); sfx.coin();
      sayLine(n, `오오, ${josa(q.name, '이로군', '로군')}! 정말 고맙네. 약속한 ${money(q.reward)} 받게나. (부탁 ${save.questsDone}개 해결)`);
      return true;
    }
    sayLine(n, `아직인가? ${q.name} 한 마리면 되네. ${whereOf(findFish(q.name))}에서 찾아보게.`);
    return true;
  }
  if (Date.now() >= save.questReadyAt) {
    const nq = newQuest();
    updateQuestHud();
    sayLine(n, `부탁 하나 들어주겠나? ${josa(nq.name, '을', '를')} 한 마리 잡아다 주게. ${whereOf(findFish(nq.name))}에 산다네. 보상은 ${money(nq.reward)}일세.`, 8000);
    return true;
  }
  return false; // 쉬는 중이면 평소 말
}
function updateQuestHud() {
  const q = save.quest, el = $('questLine');
  if (!q) { el.classList.add('hidden'); return; }
  const f = findFish(q.name);
  el.innerHTML = `<b>할배의 부탁</b> ${esc(q.name)} 1마리 · ${esc(whereOf(f))} · 보상 ${esc(money(q.reward))}${save.inv.some((it) => it.name === q.name) ? ' <span class="qdone">잡았다! 할배에게 가져가요</span>' : ''}`;
  el.classList.remove('hidden');
}

// =====================================================
//  모닥불 — 통나무에 앉아서 불멍하고, 물고기를 구워 먹으면 잠깐 운이 올라요
// =====================================================
const BUFF_BY_RARITY = { common: 0.03, uncommon: 0.06, rare: 0.1, legendary: 0.15, mythic: 0.22 };
function sitAtFire() {
  // 가까운 통나무에 앉아요
  const p = person.position;
  const seat = campfire.seats.slice().sort((a, b) => ((a.x - p.x) ** 2 + (a.z - p.z) ** 2) - ((b.x - p.x) ** 2 + (b.z - p.z) ** 2))[0];
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  if (game.rodOut || game.selected) equip(null);
  game.sitting = seat;
  renderCook();
  openPanel($('cookPanel'));
  game.sitting = seat; // openPanel 이 앉은 상태를 지우지 않게 한 번 더
}
function renderCook() {
  const list = $('cookList');
  const b = game.buff && performance.now() < game.buff.until ? game.buff : null;
  list.innerHTML = `<div class="count">${b ? `지금 버프: <b style="color:#ffd36b">운 +${Math.round(b.luck * 100)}%</b> (${Math.ceil((b.until - performance.now()) / 1000)}초 남음) · 더 좋은 걸 구우면 바뀌어요` : '물고기를 구워 먹으면 잠깐 운이 올라요. 귀한 물고기일수록, 이로치면 더 좋아요.'}</div>`;
  if (!save.inv.length) { list.insertAdjacentHTML('beforeend', '<div class="count">구울 물고기가 없어요. 호수에서 낚아 오세요.</div>'); return; }
  for (let i = save.inv.length - 1; i >= 0; i--) {
    const it = save.inv[i];
    const f = findFish(it.name);
    const luck = (BUFF_BY_RARITY[f.rarity] || 0.03) + (it.mut ? 0.03 : 0);
    const secs = Math.round(Math.min(300, 120 + it.weight * 4));
    const row = document.createElement('div');
    row.className = 'sellRow';
    row.innerHTML = `<span class="nm">${mutHTML(it.mut) ? mutHTML(it.mut) + ' ' : ''}${esc(it.name)} <span style="color:#aaa;font-weight:400">${esc(fmtKg(it.weight))}</span></span><span class="pr" style="color:#ffd36b">운 +${Math.round(luck * 100)}% · ${Math.floor(secs / 60)}분 ${secs % 60 ? (secs % 60) + '초' : ''}</span>`;
    const btn = document.createElement('button');
    btn.className = 'actBtn';
    btn.textContent = '굽기';
    btn.onclick = () => cookFish(it.id, luck, secs);
    row.appendChild(btn);
    list.appendChild(row);
  }
}
function cookFish(id, luck, secs) {
  const it = save.inv.find((x) => x.id === id);
  if (!it) return;
  save.inv = save.inv.filter((x) => x !== it);
  if (game.selected === id) equip(null);
  writeSave();
  const now = performance.now();
  const cur = game.buff && now < game.buff.until ? game.buff : null;
  // 더 센 버프면 바꾸고, 같은 세기면 시간만 늘려요
  if (!cur || luck > cur.luck) game.buff = { luck, until: now + secs * 1000 };
  else if (luck === cur.luck) cur.until = Math.max(cur.until, now) + secs * 1000 * 0.6;
  // 지글지글 + 냠
  noise(0.08, 0, 1.6, 4000, 2500, 'highpass', 0.5);
  tone(523, 0.12, 'triangle', 0.08, 1.2); tone(784, 0.16, 'triangle', 0.08, 1.32);
  game.notice = `노릇노릇 구운 ${josa(it.name, '을', '를')} 먹었어요. 따뜻하다…`;
  renderHotbar(); updateUI(); renderCook(); updateQuestHud();
  if (Math.random() < 0.5) sayRomance(['모닥불 소리가 마음을 녹여요.', '불멍… 아무 생각 안 해도 괜찮아요.', '따뜻한 한 끼는 최고의 미끼예요.']);
}
function updateBuffHud() {
  const el = $('buffLine');
  const b = game.buff;
  if (!b || performance.now() > b.until) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); if (b) game.buff = null; return; }
  const s = Math.ceil((b.until - performance.now()) / 1000);
  const label = `모닥불 버프 · 운 +${Math.round(b.luck * 100)}% · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (el.textContent !== label) el.textContent = label;
  el.classList.remove('hidden');
}
const buffLuck = () => (game.buff && performance.now() < game.buff.until ? game.buff.luck : 0);

// =====================================================
//  날씨 — 가끔 비가 와요. 빗방울, 물 위 동그라미, 빗소리. 비 올 때만 나오는 물고기도 있어요
// =====================================================
const weather = { rain: 0, target: 0, next: performance.now() + 90000 };
const isRaining = () => weather.rain > 0.5;
const RAIN_N = 900;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 6);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xcfdcf0, transparent: true, opacity: 0, depthWrite: false }));
rainLines.frustumCulled = false;
scene.add(rainLines);
const rainDrops = Array.from({ length: RAIN_N }, () => ({ x: 0, y: -99, z: 0, v: 18 + Math.random() * 8 }));
const rainRings = Array.from({ length: 30 }, () => {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 20), new THREE.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  r.rotation.x = -Math.PI / 2;
  r.visible = false;
  scene.add(r);
  return { mesh: r, life: 1 };
});
let rainSound = null;
function startRainSound() {
  if (rainSound || !audio.ctx) return;
  const ctx = audio.ctx;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(hp).connect(lp).connect(g).connect(ctx.destination);
  src.start();
  rainSound = g;
}
function updateWeather(now, dt) {
  // 날씨 바꾸기: 비가 그치거나, 가끔(40%) 비가 시작돼요
  if (now > weather.next) {
    if (weather.target > 0) { weather.target = 0; weather.next = now + (120 + Math.random() * 120) * 1000; sayRomance(['비가 그쳤어요. 공기가 깨끗해졌네요.', '비 갠 호수는 거울 같아요.']); }
    else if (Math.random() < 0.4) { weather.target = 1; weather.next = now + (90 + Math.random() * 90) * 1000; sayRomance(['비가 오기 시작했어요. 빗소리가 참 좋네요.', '비 오는 날엔 신기한 물고기가 올라온대요.']); }
    else weather.next = now + (60 + Math.random() * 60) * 1000;
  }
  weather.rain += (weather.target - weather.rain) * Math.min(1, dt * 0.35);
  const r = weather.rain;
  // 빗줄기: 주인공 주변에서 떨어져요
  rainLines.visible = r > 0.02;
  if (rainLines.visible) {
    rainLines.material.opacity = 0.55 * r;
    const p = person.position;
    const active = Math.floor(RAIN_N * r);
    for (let i = 0; i < RAIN_N; i++) {
      const d = rainDrops[i];
      if (i >= active) { rainPos.fill(0, i * 6, i * 6 + 6); continue; }
      d.y -= d.v * dt;
      if (d.y < p.y - 2 || Math.abs(d.x - p.x) > 18 || Math.abs(d.z - p.z) > 18) {
        d.x = p.x + (Math.random() - 0.5) * 34; d.z = p.z + (Math.random() - 0.5) * 34; d.y = p.y + 4 + Math.random() * 14;
      }
      rainPos[i * 6] = d.x; rainPos[i * 6 + 1] = d.y; rainPos[i * 6 + 2] = d.z;
      rainPos[i * 6 + 3] = d.x + 0.06; rainPos[i * 6 + 4] = d.y + 0.55; rainPos[i * 6 + 5] = d.z + 0.03;
    }
    rainGeo.attributes.position.needsUpdate = true;
    // 물 위 빗방울 동그라미
    for (const rr of rainRings) {
      if (rr.life >= 1) {
        if (Math.random() < 9 * r * dt) {
          const x = p.x + (Math.random() - 0.5) * 22, z = p.z + (Math.random() - 0.5) * 22;
          const w = waterAt(x, z);
          if (w) { rr.mesh.position.set(x, w.y + 0.045, z); rr.life = 0; rr.mesh.visible = true; }
        }
        continue;
      }
      rr.life += dt * 1.4;
      rr.mesh.scale.setScalar(0.5 + rr.life * 3);
      rr.mesh.material.opacity = (1 - rr.life) * 0.6 * r;
      if (rr.life >= 1) rr.mesh.visible = false;
    }
  }
  if (audio.ctx) { startRainSound(); rainSound.gain.value = 0.11 * r * (audio.on ? 1 : 0.4); }
}
// 비 오면 하늘이 흐려져요 (updateDayNight 가 정한 색 위에 덧칠)
const RAIN_GRAY = new THREE.Color(0x707884);
function applyRainTint() {
  const r = weather.rain;
  if (r < 0.01) return;
  scene.background.lerp(RAIN_GRAY, r * 0.55);
  scene.fog.color.lerp(RAIN_GRAY, r * 0.55);
  scene.fog.far = 115 - 45 * r;
  sunsetLight.intensity *= 1 - 0.5 * r;
  hemi.intensity *= 1 - 0.2 * r;
  cloudMat.color.lerp(new THREE.Color(0x8a909c), r * 0.7);
  stars.material.opacity *= 1 - r;
  sun.visible = halo.visible = r < 0.6;
}

// 카메라와 주인공 사이에 건물이 끼면 카메라를 앞으로 당겨요
const camRay = new THREE.Raycaster();
const camDir = new THREE.Vector3();
// 얕은 물에 들어가면 발밑에 동그란 물결이 생겨요
const wadeRings = [0, 1].map(() => {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 28), new THREE.MeshBasicMaterial({ color: 0xe6f2ea, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  r.rotation.x = -Math.PI / 2;
  r.visible = false;
  scene.add(r);
  return r;
});
// =====================================================
//  낮과 밤 — 10분에 한 바퀴: 낮 → 노을 → 밤 → 새벽 → 낮
//  tod(하루 시각)는 0~1. 0 = 낮 12시, 0.25 = 저녁 6시, 0.5 = 밤 12시, 0.75 = 새벽 6시
// =====================================================
const DAY_LENGTH = 600;   // 하루 길이(초)
let tod = 0.27;           // 처음엔 노을부터
const PAL = {
  day:    { bg: 0x9ccbea, fog: 0xb9d6e6, sun: 0xfff2d8, sunI: 2.6, sky: 0xeaf4ff, gnd: 0x5d6b52, hemiI: 1.5, exp: 1.0, disc: 0xfff6d8, halo: 0xfff0c0, haloO: 0.15, discY: 70, lamp: 0.3, star: 0, wisp: 0.25, water: 0x3f8a96, warm: 30, violet: 10, cloud: 0xffffff, fire: 4 },
  sunset: { bg: 0xeca77c, fog: 0xe0a07e, sun: 0xffc18a, sunI: 2.2, sky: 0xffdfbd, gnd: 0x3d4466, hemiI: 1.6, exp: 1.08, disc: 0xffd08d, halo: 0xffba83, haloO: 0.18, discY: 18, lamp: 1.3, star: 0, wisp: 0.8, water: 0x477f82, warm: 90, violet: 40, cloud: 0xffc8b0, fire: 8 },
  night:  { bg: 0x141634, fog: 0x1a1c40, sun: 0x8fa0ff, sunI: 0.55, sky: 0x6a78b8, gnd: 0x161624, hemiI: 0.75, exp: 1.15, disc: 0xe8ecff, halo: 0xb0c0ff, haloO: 0.12, discY: 45, lamp: 2.6, star: 1, wisp: 1, water: 0x23405a, warm: 20, violet: 75, cloud: 0x3a3e66, fire: 16 },
  dawn:   { bg: 0xe0aac0, fog: 0xd8b0c0, sun: 0xffc8c8, sunI: 1.7, sky: 0xffe0ea, gnd: 0x4a4a6a, hemiI: 1.3, exp: 1.05, disc: 0xffd8d0, halo: 0xffc0c8, haloO: 0.16, discY: 14, lamp: 0.9, star: 0.25, wisp: 0.6, water: 0x4a7a8a, warm: 50, violet: 30, cloud: 0xffd8e4, fire: 9 }
};
// 시각별 하늘: 같은 이름이 두 번 나오는 구간은 그대로 머무는 시간이에요
const DAY_KEYS = [[0, 'day'], [0.12, 'day'], [0.22, 'sunset'], [0.34, 'sunset'], [0.44, 'night'], [0.64, 'night'], [0.72, 'dawn'], [0.8, 'dawn'], [0.9, 'day'], [1, 'day']];
const cA = new THREE.Color(), cB = new THREE.Color();
const lerpHex = (a, b, k, out) => out.copy(cA.setHex(a)).lerp(cB.setHex(b), k);
function phaseName() {
  if (tod < 0.17 || tod >= 0.9) return '낮';
  if (tod < 0.39) return '노을';
  if (tod < 0.68) return '밤';
  return '새벽';
}
const isNight = () => phaseName() === '밤';
let clockShown = '';
function updateDayNight(dt) {
  tod = (tod + dt / DAY_LENGTH) % 1;
  let i = 0;
  while (i < DAY_KEYS.length - 2 && tod >= DAY_KEYS[i + 1][0]) i++;
  const [t0, n0] = DAY_KEYS[i], [t1, n1] = DAY_KEYS[i + 1];
  const k = t1 > t0 ? (tod - t0) / (t1 - t0) : 0;
  const A = PAL[n0], B = PAL[n1];
  const num = (key) => A[key] + (B[key] - A[key]) * k;
  lerpHex(A.bg, B.bg, k, scene.background);
  lerpHex(A.fog, B.fog, k, scene.fog.color);
  lerpHex(A.sun, B.sun, k, sunsetLight.color);
  sunsetLight.intensity = num('sunI');
  lerpHex(A.sky, B.sky, k, hemi.color);
  lerpHex(A.gnd, B.gnd, k, hemi.groundColor);
  hemi.intensity = num('hemiI');
  renderer.toneMappingExposure = num('exp');
  lerpHex(A.disc, B.disc, k, sun.material.color);
  lerpHex(A.halo, B.halo, k, halo.material.color);
  halo.material.opacity = num('haloO');
  sun.position.y = num('discY');
  halo.position.y = sun.position.y;
  lerpHex(A.water, B.water, k, waterMat.color);
  const lamp = num('lamp');
  LANTERN_MATS.forEach((m) => (m.emissiveIntensity = lamp));
  stars.material.opacity = num('star');
  wisps.userData.base = num('wisp');
  warmFill.intensity = num('warm');
  violetGlow.intensity = num('violet');
  lerpHex(A.cloud, B.cloud, k, cloudMat.color);
  campfire.base = num('fire'); // 밤에는 모닥불이 더 환해 보여요
  // 왼쪽 위 시계 (바뀔 때만 다시 그려요)
  const h = Math.floor((12 + tod * 24) % 24), m = Math.floor(((12 + tod * 24) % 1) * 6) * 10;
  applyRainTint();
  const label = `${phaseName()} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${weather.rain > 0.5 ? ' · 비' : ''}`;
  if (label !== clockShown) { clockShown = label; $('clock').textContent = label; }
}

function updateWade(t) {
  const p = person.position;
  const w = isWading(p.x, p.z) ? waterAt(p.x, p.z) : null;
  wadeRings.forEach((r, i) => {
    r.visible = !!w;
    if (!w) return;
    const q = (t * (player.moving ? 1.2 : 0.5) + i / 2) % 1;
    r.position.set(p.x, w.y + 0.04, p.z);
    r.scale.setScalar(0.8 + q * 1.4);
    r.material.opacity = (1 - q) * 0.45;
  });
}

function updateCamera() {
  const p = person.position;
  const ty = p.y + 1.5;
  // 그림자가 주인공 주변에 생기도록 해를 같이 옮겨요
  sunsetLight.position.set(p.x - 9, 15, p.z + 7);
  sunsetLight.target.position.set(p.x, 0, p.z);
  camDir.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
  let dist = cam.dist;
  camRay.set(tmpV.set(p.x, ty, p.z), camDir);
  camRay.far = cam.dist;
  const hit = camRay.intersectObjects([...shops.map((s) => s.group), terrain], true)[0];
  if (hit) dist = Math.max(1.5, hit.distance - 0.3);
  // 시프트 락이면 카메라를 오른쪽 어깨 쪽으로 살짝 옮겨요
  const sh = shiftLocked ? 1.1 : 0;
  const rx = Math.cos(cam.yaw) * sh, rz = -Math.sin(cam.yaw) * sh;
  camera.position.set(p.x + camDir.x * dist + rx, ty + camDir.y * dist, p.z + camDir.z * dist + rz);
  // 큰 물고기가 걸리면 화면이 흔들려요
  if (game.shake && performance.now() < game.shake.until) {
    const m = game.shake.mag * ((game.shake.until - performance.now()) / 900 > 1 ? 1 : (game.shake.until - performance.now()) / 900);
    camera.position.x += (Math.random() - 0.5) * m;
    camera.position.y += (Math.random() - 0.5) * m;
  } else if (game.reel?.heavy && game.state === 'reeling') {
    camera.position.y += Math.sin(performance.now() * 0.05) * 0.025; // 무거운 녀석이 끌어당기는 느낌
  }
  camera.lookAt(p.x - Math.sin(cam.yaw) * 2.2 + rx, ty - 0.4, p.z - Math.cos(cam.yaw) * 2.2 + rz);
  sun.lookAt(camera.position);
  halo.lookAt(camera.position);
}

function updatePrompt() {
  const s = game.nearShop, n = game.nearTalk, fire = game.nearFire;
  // 지금 말하고 있는 사람 위에는 안내 대신 말풍선만 보여요
  const talkingNow = n && game.talk && game.talk.npc === n && performance.now() < game.talk.until;
  if ((!s && !n && !fire) || talkingNow || modalOpen()) { ui.prompt.classList.add('hidden'); return; }
  const at = n ? n.group.position.clone().add(new THREE.Vector3(0, 3.1, 0)) : s ? s.promptAt.clone() : campfire.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
  const v = at.project(camera);
  if (v.z > 1) { ui.prompt.classList.add('hidden'); return; }
  ui.prompt.classList.remove('hidden');
  const label = n ? `말 걸기 · ${n.name}` : s ? s.title : '모닥불 · 앉아서 굽기';
  if (ui.promptText.textContent !== label) ui.promptText.textContent = label;
  // 화면 밖으로 삐져나가지 않게 가장자리에서 멈추고, 부드럽게 따라가요
  const half = ui.prompt.offsetWidth / 2 + 8;
  const tx = Math.min(innerWidth - half, Math.max(half, (v.x * 0.5 + 0.5) * innerWidth));
  const ty = Math.min(innerHeight - 120, Math.max(ui.prompt.offsetHeight + 8, (-v.y * 0.5 + 0.5) * innerHeight));
  const pp = game.promptPos || (game.promptPos = { x: tx, y: ty });
  if (ui.prompt.dataset.for !== label) { pp.x = tx; pp.y = ty; ui.prompt.dataset.for = label; }
  pp.x += (tx - pp.x) * 0.35;
  pp.y += (ty - pp.y) * 0.35;
  ui.prompt.style.left = `${Math.round(pp.x)}px`;
  ui.prompt.style.top = `${Math.round(pp.y)}px`;
}

// =====================================================
//  매 프레임마다 그리기
// =====================================================
let previous = 0;
const arm = { r: 1.2 };

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, Math.max(0, (now - previous) / 1000));
  previous = now;
  const t = now * 0.001;

  // 호수 물결
  // 폭포 물줄기가 아래로 흘러내려요 + 물보라가 퍼져요
  fallTex.offset.y += dt * 1.4;
  // 잔물결 반짝이가 천천히 엇갈려 흐르고, 물가 거품이 숨 쉬듯 일렁여요
  shimmerTex.offset.x += dt * 0.006; shimmerTex.offset.y += dt * 0.002;
  shimmerTex2.offset.x -= dt * 0.004; shimmerTex2.offset.y += dt * 0.005;
  const shine = 0.07 + hemi.intensity * 0.06; // 밤엔 은은하게, 낮엔 반짝반짝
  shimmerMats[0].opacity = shine * (0.85 + Math.sin(t * 0.9) * 0.15);
  shimmerMats[1].opacity = shine * (0.85 + Math.cos(t * 0.7) * 0.15);
  foamMats.forEach((m, i) => (m.opacity = 0.22 + Math.sin(t * 1.1 + i) * 0.1));
  foams.forEach((f, i) => {
    const q = (t * 0.8 + i / 3) % 1;
    f.scale.setScalar(0.6 + q * 1.4);
    f.material.opacity = (1 - q) * 0.6;
  });
  for (const w of waterParts) {
    const arr = w.geo.attributes.position.array, b = w.base;
    for (let i = 0; i < arr.length; i += 3) {
      // 월드 좌표 기준으로 물결을 만들어서 호수와 연못이 이어져 보여요
      arr[i + 2] = (Math.sin((b[i] + w.ox) * 0.36 + t * 0.8) * 0.055 + Math.cos((b[i + 1] - w.oz) * 0.42 + t * 0.65) * 0.035) * w.amp;
    }
    w.geo.attributes.position.needsUpdate = true;
    w.geo.computeVertexNormals();
  }

  // 반딧불 둥실둥실
  const wp = wispGeo.attributes.position.array;
  for (let i = 0; i < WISPS; i++) {
    wp[i * 3] = wispBase[i * 3] + Math.sin(t * 0.3 + i) * 0.4;
    wp[i * 3 + 1] = wispBase[i * 3 + 1] + Math.sin(t * 0.7 + i * 1.3) * 0.25;
    wp[i * 3 + 2] = wispBase[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.7) * 0.4;
  }
  wispGeo.attributes.position.needsUpdate = true;
  updateDayNight(dt);
  updateWeather(now, dt);
  updateBuffHud();
  wisps.material.opacity = (wisps.userData.base ?? 0.8) * (0.75 + Math.sin(t * 1.3) * 0.25);

  updatePlayer(dt);

  // 힘 모으기
  if (game.state === 'charging') {
    game.power = 0.5 - 0.5 * Math.cos((now - game.chargeStart) * 0.0035);
    ui.powerFill.style.width = `${Math.round(game.power * 100)}%`;
  }

  // 찌가 땅에 떨어졌으면
  if (game.state === 'casting' && !game.inWater && now - game.castStartedAt > game.castFlight + 500) {
    game.state = 'missed';
    game.notice = '물이 아닌 곳에 떨어졌어요. 호수 쪽을 보고 던져 보세요.';
    updateUI();
  }
  if (game.state === 'casting' && game.inWater && now >= game.biteAt) {
    game.state = 'bite';
    game.deadline = now + 2300;
    sfx.bite();
    updateUI();
  }
  if (game.state === 'bite' && now > game.deadline) {
    game.state = 'missed';
    game.notice = '너무 늦었어요. 물고기가 슬쩍 도망갔어요.';
    sfx.lose();
    updateUI();
  }

  // 당기기 미니게임
  if (game.state === 'reeling' && game.reel) {
    const r = game.reel;
    r.vel += (game.holding ? 3.0 : -2.6) * dt;
    r.vel *= Math.pow(0.12, dt);
    r.zone += r.vel * dt;
    if (r.zone < 0) { r.zone = 0; r.vel = 0; }
    if (r.zone > 1 - r.zoneW) { r.zone = 1 - r.zoneW; r.vel = 0; }
    if (now >= r.nextJump) {
      r.target = 0.06 + Math.random() * 0.88;
      r.nextJump = now + (500 + Math.random() * 900) * r.jump;
    }
    r.fishPos += (r.target - r.fishPos) * Math.min(1, r.speed * dt);
    const inZone = r.fishPos >= r.zone && r.fishPos <= r.zone + r.zoneW;
    r.progress = Math.min(1, r.progress + (inZone ? 0.32 * curRod().reel : -0.24) * dt);
    ui.zone.style.borderColor = inZone ? '#6ee07a' : '#ff8a6b';
    ui.zone.style.left = `${r.zone * 100}%`;
    ui.zone.style.width = `${r.zoneW * 100}%`;
    ui.fishIcon.style.left = `${r.fishPos * 100}%`;
    ui.prog.style.width = `${Math.max(0, r.progress) * 100}%`;
    if (r.progress >= 1) finishCatch();
    else if (r.progress <= 0) {
      game.state = 'missed';
      const last = r.fish.name.charCodeAt(r.fish.name.length - 1);
      const ga = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 ? '이' : '가'; // 받침 있으면 '이'
      game.notice = `${esc(r.fish.name)}${ga} 줄을 끊고 도망갔어요.`;
      sfx.lose();
      updateUI();
    }
  }

  // 주인공 팔 동작 (낚싯대가 팔에 붙어 있어요)
  const emptyHands = !game.rodOut && !game.selected;
  let target = 1.2;
  if (emptyHands) target = 0;                                  // 빈손: 팔을 내려요
  else if (game.selected) target = game.heldBig ? 2.95 : 1.3;  // 큰 물고기는 만세 자세로
  else if (game.state === 'charging') target = 2.6;            // 머리 위로 들어 올리기
  else if (now < game.armSwingUntil) target = 0.85;            // 휙 던지기
  else if (game.state === 'reeling') target = 1.3 + Math.sin(t * 18) * 0.1;
  else if (game.state === 'bite') target = 1.05;
  else if (game.state === 'caught' && fishAnim) target = 2.0;
  if (player.moving && game.rodOut) target += Math.sin(player.walkT) * 0.08;
  arm.r += (target - arm.r) * Math.min(1, dt * 12);
  // 빈손으로 걸을 땐 팔을 앞뒤로 흔들어요
  const armSwing = emptyHands && player.moving ? Math.sin(player.walkT) * 0.6 : 0;
  hero.armL.rotation.x = arm.r - armSwing;
  hero.armR.rotation.x = arm.r + armSwing;
  if (game.swimming) {
    // 자유형: 두 팔을 번갈아 크게 돌려요 (가만히 있으면 물장구만)
    const sp = player.moving ? t * 7 : t * 3;
    const amp = player.moving ? 1 : 0.35;
    hero.armL.rotation.x = player.moving ? sp : 1.4 + Math.sin(sp) * amp;
    hero.armR.rotation.x = player.moving ? sp + Math.PI : 1.4 - Math.sin(sp) * amp;
    arm.r = 1.2;
  }
  // 헤엄칠 땐 낚싯대·물고기는 잠깐 집어넣어요 (물 밖으로 나오면 다시 들어요)
  rod.visible = game.rodOut && !game.swimming;
  if (heldFish) heldFish.visible = !game.swimming;
  const splay = emptyHands || game.swimming ? 0.08 : 0.35;
  hero.armL.rotation.z += (splay - hero.armL.rotation.z) * Math.min(1, dt * 12);
  hero.armR.rotation.z += (-splay - hero.armR.rotation.z) * Math.min(1, dt * 12);
  hero.head.rotation.y = player.moving ? 0 : Math.sin(t * 0.6) * 0.12;
  person.updateMatrixWorld(true);

  // 찌 움직임
  const tip = rodTipWorld();
  if (game.state === 'casting') {
    const p = Math.min(1, (now - game.castStartedAt) / game.castFlight);
    const eased = 1 - Math.pow(1 - p, 3);
    bobber.position.lerpVectors(game.castStart, game.bobberTarget, eased);
    bobber.position.y += Math.sin(p * Math.PI) * 2.2;
    if (p >= 1) {
      bobber.position.y = game.bobberTarget.y + (game.inWater ? Math.sin(t * 2.2) * 0.045 : 0);
      if (!game.landed) { game.landed = true; if (game.inWater) sfx.land(); } // 퐁당
    }
  } else if (game.state === 'reeling' && game.reel) {
    const k = Math.max(0, game.reel.progress);
    tmpV.set(person.position.x, 0, person.position.z);
    bobber.position.lerpVectors(game.bobberTarget, tmpV, k * 0.55);
    if (!inLake(bobber.position.x, bobber.position.z)) bobber.position.copy(game.bobberTarget);
    bobber.position.y = (game.waterY ?? 0.02) + 0.1 + Math.sin(t * 22) * 0.07;
  } else if (game.state === 'bite') {
    bobber.position.y = (game.waterY ?? 0.02) + 0.08 + Math.sin(t * 18) * 0.1;
  }
  const showBobber = game.state === 'casting' || game.state === 'bite' || game.state === 'reeling' || game.state === 'retracting';
  bobber.visible = showBobber;
  const lineEnd = bobber.position.clone();
  lineEnd.y = Math.max(0.04, lineEnd.y + 0.05);
  fishingLine.geometry.setFromPoints([
    tip,
    new THREE.Vector3((tip.x + lineEnd.x) * 0.5, Math.max(0.4, (tip.y + lineEnd.y) * 0.5 - 0.25), (tip.z + lineEnd.z) * 0.5),
    lineEnd
  ]);
  fishingLine.visible = showBobber;

  const ripplesOn = showBobber && game.state !== 'retracting' && game.inWater && !(game.state === 'casting' && now - game.castStartedAt < game.castFlight);
  ripples.forEach((ring, i) => {
    ring.visible = ripplesOn;
    ring.position.x = bobber.position.x;
    ring.position.y = (game.waterY ?? 0.02) + 0.035 + i * 0.002;
    ring.position.z = bobber.position.z;
    const pulse = (t * 0.4 + i / 3) % 1;
    ring.scale.setScalar(0.8 + pulse * 1.9);
    ring.material.opacity = (1 - pulse) * (game.state === 'bite' || game.state === 'reeling' ? 0.48 : 0.22);
  });

  // 잡은 물고기가 머리 위로 튀어 올랐다가 쏙 (인벤토리로)
  if (fishAnim) {
    const p = (now - fishAnim.start) / 1000;
    const model = fishAnim.model;
    const end = fishAnim.hold;
    if (p >= end) { scene.remove(model); fishAnim = null; }
    else {
      const q = Math.min(1, p);
      // 큰 물고기는 플레이어 앞쪽 하늘에 띄워서 몸 전체가 보이게 해요
      const fwd = fishAnim.scale >= 2 ? fishAnim.scale * 1.1 : 0;
      tmpV.set(person.position.x - Math.sin(player.ry) * fwd, person.position.y + fishAnim.lift, person.position.z - Math.cos(player.ry) * fwd);
      model.position.lerpVectors(fishAnim.from, tmpV, q);
      model.position.y += Math.sin(q * Math.PI) * 1.5;
      model.rotation.y = player.ry + Math.PI / 2 + (p > 1 ? (p - 1) * 2.2 : 0);
      model.rotation.z = p < 1 ? Math.sin(t * 25) * 0.4 : Math.sin(t * 8) * 0.08;
      if (fishAnim.name === '물 만난 광어') {
        // 물 만난 광어는 올라오는 내내 펄떡펄떡!
        model.rotation.z = Math.sin(t * 18) * 0.95;
        model.rotation.x = Math.sin(t * 11) * 0.55;
        model.position.y += Math.max(0, Math.sin(t * 9)) * 0.5;
      }
      if (p > end - 0.4) model.scale.setScalar(Math.max(0.01, fishAnim.scale * (end - p) / 0.4));
    }
  }
  // 줄 거두는 중: 찌가 낚싯대 끝으로 돌아와요
  if (game.state === 'retracting') {
    const k = Math.min(1, (now - game.retractStart) / 380);
    bobber.position.lerpVectors(game.retractFrom, rodTipWorld(tmpV), k * k);
    bobber.position.y += Math.sin(k * Math.PI) * 0.6;
    if (k >= 1) { game.state = 'idle'; game.notice = ''; updateUI(); }
  }
  if (heldFish) {
    const u = heldFish.userData;
    if (u.name === '물 만난 광어') {
      // 물 만난 광어는 손에서 팔딱팔딱! 몸을 크게 휘고, 튀어 오르고, 비틀어요
      const flop = Math.sin(t * 17);
      const kick = Math.max(0, Math.sin(t * 8.5));
      heldFish.rotation.set(Math.sin(t * 11) * 0.5, Math.sin(t * 5) * 0.4, flop * 0.85);
      heldFish.position.set(u.base.x + Math.sin(t * 7) * 0.08, u.base.y + kick * 0.45, u.base.z + Math.cos(t * 9) * 0.06);
    } else {
      heldFish.rotation.z = Math.sin(t * 6) * 0.05;
    }
  }
  placeSpin(rodSpin, t);
  // 모닥불 일렁일렁
  campfire.flames.forEach((f, i) => {
    const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 23 + i * 2) * 0.06;
    f.scale.set(1 + Math.sin(t * 7 + i) * 0.06, k, 1 + Math.cos(t * 6 + i) * 0.06);
  });
  if (campfire.light) campfire.light.intensity = (campfire.base ?? 8) * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 31) * 0.05);
  // 구름이 천천히 흘러가요 (끝까지 가면 반대편에서 다시)
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 130) c.position.x = -130;
  }
  shopRodSpins.forEach((s) => placeSpin(s, t));

  updateNPCs(now, dt, t);
  updateWalkers(now, dt, t);
  multi.update(now, dt, t);
  updateWade(t);
  updateCamera();
  updatePrompt();
  updateBubble();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, true);
});

// 테스트용 도구 (개발자 콘솔에서 쓸 수 있어요)
window.getGameState = () => ({
  state: game.state, caught: save.caught, money: save.money, inv: save.inv.length, rod: curRod().name,
  player: { x: person.position.x, z: person.position.z, ry: player.ry }, nearShop: game.nearShop?.kind ?? null, nearTalk: game.nearTalk?.name ?? null,
  bobber: { x: bobber.position.x, y: bobber.position.y, z: bobber.position.z }, inWater: game.inWater
});
window.setGameState = (patch = {}) => {
  if (patch.money !== undefined) save.money = patch.money;
  if (patch.tod !== undefined) tod = patch.tod;
  if (patch.rain !== undefined) { weather.target = weather.rain = patch.rain ? 1 : 0; weather.next = performance.now() + 120000; }
  if (patch.x !== undefined || patch.z !== undefined) game.sitting = null; // 순간이동하면 일어나요
  if (patch.x !== undefined) person.position.x = patch.x;
  if (patch.z !== undefined) person.position.z = patch.z;
  if (patch.ry !== undefined) player.ry = patch.ry;
  if (patch.yaw !== undefined) cam.yaw = patch.yaw;
  if (patch.state === 'reeling') { game.bobberTarget.set(person.position.x, 0.18, person.position.z - 4); startReel(); }
  else if (patch.state) game.state = patch.state;
  updateUI();
};
window.__game = { scene, camera, renderer, player: person, fishingLine, bobber, walkers };

// =====================================================
//  멀티플레이 연결 (같은 방 최대 5명)
// =====================================================
// 지금 내 모습: 위치, 방향, 동작, 낚싯대, 손에 든 물고기, 찌 위치, 잡은 수
function myAnim() {
  if (game.sitting) return 'sit';
  if (game.swimming) return 'swim';
  const s = game.state;
  if (s === 'charging') return 'charge';
  if (s === 'casting') return performance.now() < game.armSwingUntil ? 'cast' : 'wait';
  if (s === 'bite') return 'bite';
  if (s === 'reeling') return 'reel';
  if (s === 'caught' && fishAnim) return 'caught';
  if (game.selected) return 'hold';
  return player.moving ? 'walk' : 'idle';
}
function getMyState() {
  const p = person.position;
  const held = game.selected ? save.inv.find((x) => x.id === game.selected) : null;
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    x: r2(p.x), y: r2(p.y), z: r2(p.z), r: r2(player.ry), a: myAnim(),
    rod: game.rodOut ? save.rod : -1, f: held ? held.name : null, m: held ? held.mut : null, n: save.caught,
    b: bobber.visible ? [r2(bobber.position.x), r2(bobber.position.y), r2(bobber.position.z)] : null
  };
}
// 왼쪽 아래 소식 (들어옴·나감·낚았어요)
function pushFeed(text) {
  const box = $('feed');
  const el = document.createElement('div');
  el.className = 'feedItem';
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.classList.add('fade'), 6000);
  setTimeout(() => el.remove(), 7000);
}
const multi = setupMulti({
  THREE, scene, makeBlockPerson, buildRod, placeSpin, RODS, ROD_LEN, makeBobber, cordMat, makeNameTag,
  makeFishModel, findFish, fishScale, getMyState, onFeed: pushFeed,
  onStatus: (text, ok, info) => {
    $('multiStatus').textContent = text;
    $('multiStatus').className = 'multiStatus' + (ok ? ' ok' : '');
    $('multiJoin').classList.toggle('hidden', info.connected);
    $('multiLeave').classList.toggle('hidden', !info.connected);
    const hud = $('multiHud');
    hud.classList.toggle('hidden', !info.connected);
    if (info.connected) hud.textContent = `멀티 · 방 ${info.room} · ${info.count}/${info.max}명`;
  }
});
function renderMulti() {
  $('multiName').value = opts.name || '';
  $('multiRoom').value = opts.room;
  $('multiLooks').innerHTML = PLAYER_LOOKS.map((l, i) =>
    `<button class="lookBtn${i === opts.look ? ' on' : ''}" data-look="${i}" style="--c1:#${l.shirt.toString(16).padStart(6, '0')};--c2:#${(l.hatColor ?? l.hairColor).toString(16).padStart(6, '0')}"></button>`).join('');
  $('multiLooks').querySelectorAll('.lookBtn').forEach((b) => b.addEventListener('click', () => { opts.look = Number(b.dataset.look); writeOpts(); renderMulti(); }));
}
$('multiBtn').addEventListener('click', (e) => { e.currentTarget.blur(); renderMulti(); openPanel($('multiPanel')); });
$('multiJoin').addEventListener('click', () => {
  const name = $('multiName').value.replace(/[<>&"'`\\]/g, '').trim().slice(0, 12) ||('낚시꾼' + Math.floor(Math.random() * 900 + 100));
  const room = $('multiRoom').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PLAZA';
  if (room.length < 3) { $('multiStatus').textContent = '방 코드는 영어·숫자 3~8글자예요.'; return; }
  opts.name = name; opts.room = room; writeOpts();
  $('multiName').value = name; $('multiRoom').value = room;
  multi.connect(name, room, opts.look);
});
$('multiLeave').addEventListener('click', () => multi.disconnect());

// =====================================================
//  저장 / 불러오기 — 세이브 코드(글자) 또는 세이브 파일(.json)
//  불러온 기록도 cleanSave 로 꼼꼼히 검사해요 (이상한 값은 버려요)
// =====================================================
const SAVE_PREFIX = 'LAKE1:';
const saveMsg = (t) => { $('saveMsg').textContent = t; };
const toSaveCode = () => SAVE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
function fromSaveCode(code) {
  const c = String(code).trim().replace(/\s+/g, '');
  if (!c.startsWith(SAVE_PREFIX) || c.length > 2_000_000) throw new Error('bad');
  return JSON.parse(decodeURIComponent(escape(atob(c.slice(SAVE_PREFIX.length)))));
}
function applyLoaded(obj, how) {
  const c = cleanSave(obj);
  const ok = confirm(`${how}\n\n돈 ${money(c.money)} · 잡은 수 ${c.caught.toLocaleString('en-US')}마리 · 가방 ${c.inv.length}마리 · 낚싯대 ${RODS[c.rod].name}\n\n지금 기록을 이걸로 바꿀까요? (지금 기록은 사라져요)`);
  if (!ok) { saveMsg('불러오기를 취소했어요.'); return; }
  Object.assign(save, c);
  writeSave();
  location.reload();
}
$('saveCopy').addEventListener('click', async () => {
  const code = toSaveCode();
  try { await navigator.clipboard.writeText(code); saveMsg('세이브 코드를 복사했어요! 메모장 같은 곳에 붙여 넣어 보관하세요.'); }
  catch (_) { $('saveCodeBox').value = code; $('saveCodeBox').select(); saveMsg('복사가 막혀 있어서 아래 칸에 넣어 뒀어요. Ctrl+C 로 복사하세요.'); }
});
$('saveFile').addEventListener('click', () => {
  const d = new Date();
  const name = `노을호수낚시_세이브_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  saveMsg(`'${name}' 파일로 저장했어요. (다운로드 폴더)`);
});
$('loadFileBtn').addEventListener('click', () => $('loadFile').click());
$('loadFile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > 2_000_000) { saveMsg('파일이 너무 커요. 이 게임의 세이브 파일이 맞나요?'); return; }
  try { applyLoaded(JSON.parse(await file.text()), `'${file.name}' 파일을 불러왔어요.`); }
  catch (_) { saveMsg('이 파일은 읽을 수 없어요. 이 게임에서 저장한 파일인지 확인해 주세요.'); }
});
$('saveLoadCode').addEventListener('click', () => {
  try { applyLoaded(fromSaveCode($('saveCodeBox').value), '세이브 코드를 읽었어요.'); }
  catch (_) { saveMsg('세이브 코드가 올바르지 않아요. LAKE1: 로 시작하는 코드 전체를 붙여 넣어 주세요.'); }
});
// 이름·방 코드 칸에 글자를 칠 땐 게임 조작(WASD 등)이 안 되게
['multiName', 'multiRoom', 'saveCodeBox'].forEach((id) => { const el = $(id); if (el) el.addEventListener('keydown', (e) => e.stopPropagation()); });

applyRod();
renderHotbar();
updateQuestHud();
updateUI();
requestAnimationFrame(animate);
