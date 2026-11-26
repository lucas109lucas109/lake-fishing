// =====================================================
//  노을 호수 낚시 — 메인 코드
//  맵을 돌아다니다가 원하는 곳에 낚싯대를 던질 수 있어요.
// =====================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { YOUTUBE_LINK, SHOW_YOUTUBE, MUSIC_FILE, MUSIC_VOLUME } from './settings.js';
import { setupMulti, PLAYER_LOOKS } from './multi.js';
import { startStaticMerge, compactRig } from './optimize.js';
import { buildSeaWorld, HOUSE_STYLES } from './seaworld.js';
import { cloudEnabled, startCloud, signIn, signOutCloud, loadCloud, saveCloud, watchHouses, claimHouse, setHouseStyleCloud, releaseHouse } from './cloud.js';
import { RARITY, FISH, MUTATIONS, rarityOdds, rollFish, updateFishFx, findFish, mutList, mutKey, priceOf, fmtKg, makeFishModel, fishScale, zoneOf as fishZone } from './fish.js';

// 글씨체(주아체)를 먼저 불러와요. 이름표·간판을 그림으로 그릴 때 이 글씨체가 있어야 예뻐요 (최대 2.5초만 기다려요)
try { await Promise.race([Promise.all([document.fonts.load('40px "Jua"'), document.fonts.load('20px "Gowun Dodum"')]), new Promise((r) => setTimeout(r, 2500))]); } catch (_) {}

// 이로치 이름을 각자 색으로 칠한 HTML ("골드 다이아")
const mutHTML = (str) => mutList(str).map((m) => `<span style="color:${m.color}">${m.name}</span>`).join(' ');
// 이로치 색 목록 (테두리 반반 칠하기에 써요)
const mutColors = (str) => mutList(str).map((m) => m.color);

// ---------- 장면, 카메라 ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeca77c);
scene.fog = new THREE.Fog(0xe0a07e, 30, 115);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 220);

// 그래픽 품질: 'auto'(자동) | 'high'(좋음) | 'mid'(보통) | 'low'(빠름) — 설정 창에서 바꿔요
let GFX = 'auto';
try { const o = JSON.parse(localStorage.getItem('lakeFishing_options')); if (o && ['auto', 'high', 'mid', 'low'].includes(o.gfx)) GFX = o.gfx; } catch (_) {}
// '빠름'일 땐 가장자리 매끈하게(안티앨리어싱)도 꺼서 더 빨라요 (이건 새로고침해야 바뀌어요)
const renderer = new THREE.WebGLRenderer({ antialias: GFX !== 'low', powerPreference: 'high-performance' });
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

// ---------- 그래픽 품질 ----------
//  pr = 화면 해상도 배율(낮을수록 빨라요), shadow = 그림자, soft = 부드러운 그림자, far = 얼마나 멀리까지 그릴지
const GFX_LEVELS = {
  high: { pr: Math.min(devicePixelRatio, 2), shadow: true, soft: true, far: 220 },
  mid:  { pr: Math.min(devicePixelRatio, 1), shadow: true, soft: false, far: 160 },
  low:  { pr: Math.min(devicePixelRatio, 1) * 0.7, shadow: false, soft: false, far: 125 }
};
let gfxNow = null;
let shadowFrame = 0;
function applyGfx(level) {
  const g = GFX_LEVELS[level];
  if (!g || gfxNow === level) return;
  const before = gfxNow && GFX_LEVELS[gfxNow];
  gfxNow = level;
  renderer.setPixelRatio(g.pr);
  renderer.setSize(innerWidth, innerHeight, true);
  renderer.shadowMap.enabled = g.shadow;
  renderer.shadowMap.autoUpdate = false; // 언제 다시 그릴지는 매 장면 직접 정해요 (animate 맨 끝)
  renderer.shadowMap.type = g.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  sunsetLight.castShadow = g.shadow;
  camera.far = g.far;
  camera.updateProjectionMatrix();
  // 그림자를 켜고 끄면 물감(재질)을 다시 만들어야 해요
  if (before && (before.shadow !== g.shadow || before.soft !== g.soft)) {
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  }
}
// 자동: '보통'으로 시작해서, 3초 동안 평균이 초당 35장(FPS)도 안 나오면 '빠름'으로 낮춰요
const gfxAuto = { t: 0, frames: 0, skip: 2 };
function gfxAutoTick(dt) {
  if (GFX !== 'auto' || gfxNow === 'low') return;
  if (gfxAuto.skip > 0) { gfxAuto.skip -= dt; return; } // 처음 불러오는 동안은 빼고 재요
  // 다른 탭을 보거나 창을 내려 두면 브라우저가 일부러 느리게 돌려요 → 그땐 재지 않아요
  if (document.hidden || !document.hasFocus() || dt > 0.25) { gfxAuto.t = 0; gfxAuto.frames = 0; return; }
  gfxAuto.t += dt; gfxAuto.frames++;
  if (gfxAuto.t < 3) return;
  const fps = gfxAuto.frames / gfxAuto.t;
  gfxAuto.t = 0; gfxAuto.frames = 0;
  if (fps < 35) { applyGfx('low'); game.notice = '컴퓨터가 버거워해서 그래픽을 "빠름"으로 낮췄어요. (설정에서 바꿀 수 있어요)'; updateUI(); }
}
// 브라우저 그래픽 가속이 꺼져 있으면(그래픽카드 대신 CPU가 그림) 엄청 느려요 → 알아채서 안내해요
const GPU_NAME = (() => {
  try { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : ''; } catch (_) { return ''; }
})();
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i.test(GPU_NAME);
if (SOFTWARE_GPU && GFX === 'auto') GFX = 'low';
applyGfx(GFX === 'auto' ? 'mid' : GFX);
if (SOFTWARE_GPU) {
  // 화면 위에 안내 띠 (눌러서 닫을 수 있어요)
  const bar = document.createElement('div');
  bar.id = 'gpuWarn';
  bar.textContent = '브라우저 그래픽 가속이 꺼져 있어서 게임이 아주 느릴 수 있어요. 크롬 설정 → 시스템 → "가능한 경우 그래픽 가속 사용"을 켜고 크롬을 다시 켜 주세요. (눌러서 닫기)';
  bar.addEventListener('click', () => bar.remove());
  document.body.appendChild(bar);
}
// 초당 화면 수(FPS) 재기 — 설정 창에 보여 줘요
const fpsMeter = { frames: 0, t: 0, value: 0 };
function tickFps(rawMs) {
  fpsMeter.frames++; fpsMeter.t += rawMs;
  if (fpsMeter.t >= 1000) { fpsMeter.value = Math.round(fpsMeter.frames * 1000 / fpsMeter.t); fpsMeter.frames = 0; fpsMeter.t = 0; const el = document.getElementById('perfInfo'); if (el) el.textContent = perfText(); }
}
const perfText = () => `지금 초당 ${fpsMeter.value}장 · 그래픽카드: ${GPU_NAME.replace(/^ANGLE \(|\)$/g, '').split(',').slice(0, 2).join(',') || '알 수 없음'}${SOFTWARE_GPU ? ' (그래픽 가속 꺼짐!)' : ''}`;
// 움직이지 않는 물체 합치기: 첫 화면이 그려지고 2초 뒤부터 4초 동안 지켜본 다음 합쳐요
setTimeout(() => {
  scene.updateMatrixWorld(true);
  startStaticMerge({ THREE, scene, protect: new Set(LANTERN_MATS), waitMs: 4000, onDone: (n) => console.log(`[최적화] 안 움직이는 물체 ${n}개를 합쳤어요`) });
}, 2000);

const mat = (color, roughness = 0.86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

// ---------- 땅 ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(0x607856)); // 바다 끝까지 덮게 넓게
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
// biteMul = 입질까지 기다리는 시간 배율 (귀한 물고기가 많은 곳일수록 크게 = 입질이 늦어요)
const LAKE = { x: 0, z: -14, rx: 26, rz: 15, y: 0.02, biteMul: 1 }; // 엄청 넓은 큰 호수
const PLATEAU_TOP = PLATEAU.h + 0.09; // 풀 덮개 윗면 (여기에 발이 닿아요)
const TOP_Y = PLATEAU_TOP + 0.13;     // 언덕 위 물 높이 (모래 테두리보다 위, 물결이 쳐도 안 숨게)
const WATERS = [
  LAKE,
  { x: 23.5, z: FALL_Z, rx: 1.5, rz: 0.8, y: 0.025, stream: true },               // 폭포 아래 개울 → 큰 호수
  { x: 29.8, z: -7.4, rx: 3.6, rz: 3.4, y: TOP_Y, luck: 0.05, name: '산 위 연못', zone: 'mountain', biteMul: 1.35 }, // 언덕 꼭대기 연못 (신기한 물고기)
  { x: 25.3, z: FALL_Z, rx: 1.5, rz: 0.55, y: TOP_Y + 0.002, stream: true, zone: 'mountain', biteMul: 1.35 }, // 연못 → 폭포로 가는 물길
  // 오로라 강: 큰 호수 서쪽, 언덕 반대편. 빛나는 물에 거대한 물고기가 살아요 (입질은 제일 늦게)
  ...[[-50, 12], [-53, 2], [-57, -8], [-56, -18], [-52, -28], [-55, -38]].map(([x, z], i) => (
    { x, z, rx: 6.6, rz: 6.2, y: 0.03 + i * 0.001, zone: 'aurora', aurora: true, river: true, luck: 0.04, biteMul: 1.75, name: '오로라 강' }))
];
// 풍차 뒤(남쪽)의 엄청 큰 바다. 쭉 헤엄치거나 보트로 가면 섬이 나와요
//  pad = 모래사장 너비, maxSeg = 물결 칸 수 상한 (너무 크면 무거워서)
const SEA = { x: -10, z: 100, rx: 115, rz: 74, y: 0.1, zone: 'sea', sea: true, name: '바다', luck: 0.03, biteMul: 1.15, pad: 7, maxSeg: 56 };
// 정글섬: 바다 저 멀리 동남쪽. 섬 안 정글 연못에는 아주 비싼 정글 물고기가 살아요 (정글 공방 낚싯대로만!)
const JUNGLE = { x: 66, z: 104, r: 27 };
const JUNGLE_POND = { x: JUNGLE.x + 9, z: JUNGLE.z + 2, rx: 11, rz: 8, y: 0.3, zone: 'jungle', jungle: true, name: '정글 연못', luck: 0.06, biteMul: 1.3, pad: 0.3 };
WATERS.push(JUNGLE_POND);
WATERS.push(SEA);
// 바다 위 부두(모래사장에서 바다로 쭉 뻗은 나무 다리)
const SEA_PIER = { x0: -11.1, x1: -8.9, z0: 21.5, z1: 38 };
const RIVER = WATERS.filter((e) => e.aurora);
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
  return !!w && (w.e.stream || w.e.jungle || w.d > SHALLOW); // 정글 연못은 전부 얕아요 (걸어 들어가요)
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
// 오로라 강의 물: 청록빛으로 은은하게 스스로 빛나요 (밤에 특히 예뻐요)
const auroraWaterMat = new THREE.MeshStandardMaterial({ color: 0x2a9aa8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.93, vertexColors: true, emissive: 0x0a4a6a, emissiveIntensity: 0.45 });
const auroraSandMat = mat(0xb8aac8, 0.95); // 보랏빛 모래
WATERS.forEach((e, k) => {
  // 물가 모래 (개울은 모래 테두리를 얇게)
  const pad = e.pad ?? (e.stream ? 0.35 : e.river ? 1.3 : 0.9);
  const shore = new THREE.Mesh(new THREE.CircleGeometry(1, e.sea ? 128 : 64), e.aurora ? auroraSandMat : e.sea ? mat(0xe8d4a4, 0.95) : mat(0x8c7c5a)); // 바다는 밝은 모래사장
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(e.rx + pad, e.rz + pad, 1);
  shore.position.set(e.x, e.y > 1 ? PLATEAU_TOP + 0.02 + k * 0.001 : -0.06 + k * 0.001, e.z);
  shore.receiveShadow = true;
  scene.add(shore);
  // 네모난 판을 타원 모양으로 오므려서 물을 만들어요
  const seg = (r) => Math.min(Math.ceil(r * 4), e.maxSeg ?? 1e9);
  const geo = new THREE.PlaneGeometry(e.rx * 2, e.rz * 2, seg(e.rx), seg(e.rz));
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
  const water = new THREE.Mesh(geo, e.aurora ? auroraWaterMat : waterMat);
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
  if (!e.stream && !e.river) {
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
  waterParts.push({ geo, base: pa.array.slice(), ox: e.x, oz: e.z, amp: e === LAKE ? 1 : e.sea ? 1.3 : 0.45, every: e.sea ? 2 : 1, tick: 0 }); // 바다는 너무 커서 두 번에 한 번만
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
const onDock = (x, z) => (x > DOCK.x0 && x < DOCK.x1 && z > DOCK.z0 && z < DOCK.z1) ||
  (x > SEA_PIER.x0 && x < SEA_PIER.x1 && z > SEA_PIER.z0 && z < SEA_PIER.z1); // 바다 부두도 부두예요

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

// =====================================================
//  오로라 강 꾸미기 — 수정 기둥, 빛나는 버섯, 떠다니는 등불, 무지개 돌다리, 옛 유적, 하늘의 오로라
// =====================================================
const auroraFX = { lanterns: [], ribbons: [], blades: null };
const LATE_TREES = [];
// 강을 건너는 돌다리 (가운데가 볼록한 아치, 위로 걸어서 건널 수 있어요)
const BRIDGE2 = { x0: -66, x1: -48, z: -8, w: 2.4 };
const onBridge2 = (x, z) => x > BRIDGE2.x0 && x < BRIDGE2.x1 && Math.abs(z - BRIDGE2.z) < BRIDGE2.w / 2;
const bridge2Y = (x) => 0.3 + Math.sin(Math.PI * (x - BRIDGE2.x0) / (BRIDGE2.x1 - BRIDGE2.x0)) * 1.2;
function placeTree(x, z, s, y0 = 0, i = 0) {
  addCollider(x, z, 0.8);
  const put = (tree) => {
    tree.position.set(x, y0, z);
    tree.rotation.y = (i * 1.7) % (Math.PI * 2);
    tree.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(tree);
  };
  loader.load(treeURLs[i % 2], (gltf) => { gltf.scene.scale.setScalar(s); put(gltf.scene); }, undefined, () => put(makeBlockTree(s)));
}
{
  let rs = 21;
  const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
  const crystalA = mat(0x9af0ff, 0.2, { emissive: 0x2ab8e0, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
  const crystalB = mat(0xe0b0ff, 0.2, { emissive: 0x8a4aff, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
  const stoneM = mat(0x7a7a8c, 0.9), stoneD = mat(0x55556a, 0.9), mossM = mat(0x5a8a6a, 0.95);
  const stemM = mat(0xf0eee0, 0.8);
  const capMats = [0x6affe0, 0xff7ad8, 0xb48cff].map((c) => mat(c, 0.4, { emissive: c, emissiveIntensity: 0.8 }));
  const crystalCluster = (x, z, big = 1, m = crystalA) => {
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry((0.25 + rnd() * 0.25) * big, 0), k % 2 ? crystalB : m);
      c.scale.y = 2.4 + rnd() * 1.8;
      c.position.set(x + (rnd() - 0.5) * 0.9 * big, c.scale.y * 0.22 * big, z + (rnd() - 0.5) * 0.9 * big);
      c.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5);
      c.castShadow = true;
      scene.add(c);
    }
  };
  // 강둑을 따라 수정 무리와 빛나는 버섯
  for (const e of RIVER) {
    for (let k = 0; k < 9; k++) {
      const a = rnd() * Math.PI * 2, r = 1.2 + rnd() * 0.45;
      const x = e.x + Math.cos(a) * e.rx * r, z = e.z + Math.sin(a) * e.rz * r;
      if (inLake(x, z, 0.4) || onBridge2(x, z) || Math.abs(z - BRIDGE2.z) < 2.4) continue;
      if (k % 3 === 0) { crystalCluster(x, z, 1, k % 2 ? crystalB : crystalA); addCollider(x, z, 0.55); }
      else {
        const h = 0.4 + rnd() * 0.6;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), stemM);
        stem.position.set(x, h / 2 - 0.08, z);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.32 + rnd() * 0.18, 0.18, 8), capMats[k % 3]);
        cap.position.set(x, h - 0.02, z);
        scene.add(stem, cap);
      }
    }
  }
  // 랜드마크: 아주 큰 수정 탑
  for (const [x, z, m] of [[-44, -1, crystalA], [-67, -21, crystalB], [-45, -35, crystalB], [-65, 7, crystalA]]) {
    crystalCluster(x, z, 2.4, m);
    addCollider(x, z, 1.4);
  }
  // 강 위에 둥둥 떠다니는 등불
  const lanternGlow = [0xffc87a, 0xff9ad8, 0x9af0ff].map((c) => { const m = mat(c, 0.3, { emissive: c, emissiveIntensity: 1.3 }); LANTERN_MATS.push(m); return m; });
  for (let i = 0; i < 18; i++) {
    const e = RIVER[i % RIVER.length];
    const a = rnd() * Math.PI * 2, r = rnd() * 0.75;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), lanternGlow[i % 3]);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.14, 4), darkWood);
    top.position.y = 0.24; top.rotation.y = Math.PI / 4;
    g.add(body, top);
    g.position.set(e.x + Math.cos(a) * e.rx * r, 0.55 + rnd() * 0.4, e.z + Math.sin(a) * e.rz * r);
    g.userData = { base: g.position.clone(), ph: rnd() * 6 };
    scene.add(g);
    auroraFX.lanterns.push(g);
  }
  // 은은한 빛 두 개 (청록 · 보라)
  for (const [c, x, z] of [[0x4affe0, -54, -2], [0xb46cff, -54, -30]]) {
    const l = new THREE.PointLight(c, 30, 26, 2);
    l.position.set(x, 3, z);
    scene.add(l);
  }
  // 무지개빛 돌다리 (아치)
  const B = BRIDGE2, n = 16, seg = (B.x1 - B.x0) / n;
  for (let i = 0; i < n; i++) {
    const x = B.x0 + (i + 0.5) * seg, y = bridge2Y(x);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(seg + 0.05, 0.22, B.w), i % 2 ? stoneM : stoneD);
    slab.position.set(x, y - 0.11, B.z);
    slab.rotation.z = Math.atan2(bridge2Y(x + 0.01) - bridge2Y(x - 0.01), 0.02);
    slab.castShadow = slab.receiveShadow = true;
    scene.add(slab);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(seg + 0.05, 0.4, 0.18), stoneD);
      rail.position.set(x, y + 0.2, B.z + s * (B.w / 2 + 0.05));
      rail.rotation.z = slab.rotation.z;
      scene.add(rail);
      if (i % 4 === 0) {
        const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), i % 8 ? crystalB : crystalA);
        glow.position.set(x, y + 0.6, B.z + s * (B.w / 2 + 0.05));
        scene.add(glow);
      }
    }
  }
  // 옛 유적: 이끼 낀 부서진 기둥과 돌문
  const pillar = (x, z, h) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), stoneM);
    p.position.set(x, h / 2 - 0.08, z);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.15, 0.74), mossM);
    moss.position.set(x, h - 0.05, z);
    p.castShadow = true;
    scene.add(p, moss);
    addCollider(x, z, 0.5);
  };
  [[-43, -22, 3.2], [-43.5, -26, 1.6], [-66, -31, 2.6], [-67.5, -27, 3.4], [-62, 17, 1.2]].forEach(([x, z, h]) => pillar(x, z, h));
  // 돌문 (아치)
  for (const s of [-1, 1]) pillar(-40.5, -6 + s * 1.6, 3.6);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 4.2), stoneD);
  lintel.position.set(-40.5, 3.6, -6);
  scene.add(lintel);
  const gateSign = makeSign('오로라 강');
  gateSign.scale.setScalar(0.9);
  gateSign.position.set(-40.05, 3.0, -6);
  gateSign.rotation.y = Math.PI / 2;
  scene.add(gateSign);
  // 오로라 강 쪽으로 가는 흙길
  const pathMat = mat(0x8a7050, 0.95);
  const PATH2 = [[-18.5, 8.5], [-26, 7.5], [-33, 3.5], [-38, -2], [-40.5, -6], [-46, -8], [BRIDGE2.x1 + 0.6, BRIDGE2.z]];
  for (let i = 0; i < PATH2.length - 1; i++) {
    const [ax, az] = PATH2[i], [bx, bz] = PATH2[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const sg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, len + 1.2), pathMat);
    sg.position.set((ax + bx) / 2, -0.065, (az + bz) / 2);
    sg.rotation.y = Math.atan2(bx - ax, bz - az);
    sg.receiveShadow = true;
    scene.add(sg);
  }
  // 하늘의 오로라 리본 (밤에 더 진하게 보여요)
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(130, 16 + i * 4, 64, 1);
    const cols = new Float32Array(geo.attributes.position.count * 3);
    const c1 = new THREE.Color([0x4affc8, 0x7a9aff, 0xd86aff][i]), c2 = new THREE.Color([0xb46cff, 0x4affe0, 0x6affa8][i]);
    for (let v = 0; v < geo.attributes.position.count; v++) {
      const t = (geo.attributes.position.getX(v) + 65) / 130;
      const c = c1.clone().lerp(c2, t);
      const top = geo.attributes.position.getY(v) > 0 ? 0.25 : 1;
      cols[v * 3] = c.r * top; cols[v * 3 + 1] = c.g * top; cols[v * 3 + 2] = c.b * top;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const rib = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    rib.position.set(-58 + i * 4, 46 + i * 5, -12 - i * 10);
    rib.rotation.set(-0.25, Math.PI / 2 + (i - 1) * 0.25, 0);
    rib.userData = { base: geo.attributes.position.array.slice(), ph: i * 2 };
    scene.add(rib);
    auroraFX.ribbons.push(rib);
  }
  // 서쪽 숲
  [[-38, 12], [-42, 18], [-33, -12], [-37, -22], [-34, -32], [-71, 13], [-71, -12], [-69, -42], [-45, -45], [-60, 20], [-48, 20], [-28, 18]]
    .forEach(([x, z], i) => LATE_TREES.push([x, z, 0.75 + (i % 4) * 0.1, 0, i])); // 나무 불러오는 도구가 준비된 뒤에 심어요

  // ---------- 마을 꾸미기: 풍차 · 가로등 · 벤치 ----------
  // 풍차
  const wx = 12, wz = 19;
  const towerM = mat(0xe8dcc8, 0.9), roofM = mat(0x8a3a2a, 0.85);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.6 - i * 0.45, 1.6, 2.6 - i * 0.45), towerM);
    t.position.set(wx, 0.72 + i * 1.6, wz);
    t.castShadow = t.receiveShadow = true;
    scene.add(t);
  }
  const wroof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.2, 4), roofM);
  wroof.position.set(wx, 7.4, wz);
  wroof.rotation.y = Math.PI / 4;
  scene.add(wroof);
  const blades = new THREE.Group();
  blades.position.set(wx, 6.2, wz - 1.05);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 0.1), darkWood);
    bar.position.y = 1.8;
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.6, 0.04), mat(0xf4eee0, 0.9));
    sail.position.set(0.42, 2.1, 0);
    arm.add(bar, sail);
    blades.add(arm);
  }
  scene.add(blades);
  auroraFX.blades = blades;
  addCollider(wx, wz, 1.7);
  // 가로등 (밤에 환해져요)
  const postM = mat(0x2a2430, 0.6);
  [[-3.2, 9.2], [3.2, 9.2], [10.5, 9.6], [18, 7.6], [25, 6.8], [-12, 10.4], [-24, 8.2], [-33, 4.6], [-38.6, -1], [-45, -9.6], [9, 12.5]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), postM);
    p.position.set(x, 1.07, z);
    p.castShadow = true;
    scene.add(p);
    makeLantern(x, 2.4, z);
    addCollider(x, z, 0.25);
  });
  // 벤치
  [[-5, 12.4, 0], [5, 12.4, 0], [-36, 6, 0.6]].forEach(([x, z, ry]) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), woodLight);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.08), woodLight);
    back.position.set(0, 0.75, 0.22);
    g.add(seat, back);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.45), darkWood); leg.position.set(s * 0.8, 0.2, 0); g.add(leg); }
    g.position.set(x, -0.08, z);
    g.rotation.y = ry;
    scene.add(g);
    addCollider(x, z, 0.7);
  });
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
// 보트 상점(15.5, 6.6) 앞뒤를 가리는 나무는 빼요
for (let i = TREES.length - 1; i >= 0; i--) if (Math.hypot(TREES[i][0] - 15.5, TREES[i][1] - 3) < 6.5) TREES.splice(i, 1);
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
LATE_TREES.forEach(([x, z, sc, y0, i]) => placeTree(x, z, sc, y0, i)); // 서쪽 숲

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
  if (o.scarf) {
    // 목도리: 목에 두르고 한쪽 끝이 앞으로 늘어져요
    g.add(box(0.56, 0.11, 0.36, o.scarf, 0, 1.12, 0));
    g.add(box(0.13, 0.32, 0.05, o.scarf, 0.13, 0.94, -0.18));
  }
  if (o.backpack) {
    // 배낭: 등에 메고 어깨끈이 앞으로
    const dark = new THREE.Color(o.backpack).multiplyScalar(0.7).getHex();
    g.add(box(0.42, 0.48, 0.2, o.backpack, 0, 0.86, 0.26));
    g.add(box(0.34, 0.14, 0.07, dark, 0, 0.72, 0.39));
    for (const s of [-1, 1]) g.add(box(0.06, 0.5, 0.04, dark, s * 0.15, 0.86, -0.165));
  }

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
  if (o.flower) {
    // 꽃 장식: 머리(모자) 옆에 콕
    const fy = o.hat ? 0.3 : 0.24;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      head.add(box(0.07, 0.07, 0.03, o.flower, 0.22 + Math.cos(a) * 0.05, fy + Math.sin(a) * 0.05, -0.08));
    }
    head.add(box(0.05, 0.05, 0.04, 0xffe23a, 0.22, fy, -0.085));
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
  g.userData.dynamic = true; // 사람은 움직이니까 최적화(합치기)에서 빼요
  compactRig(THREE, g, new Set(faceParts)); // 같은 색 블록끼리 붙여서 가볍게 (움직임은 그대로)
  return { group: g, head, armL, armR, legs, faceParts };
}

// =====================================================
//  옷 정보 (탈의실에서 바꿔요) — 숫자로 저장하고, 숫자 → 실제 모양으로 바꿔요
// =====================================================
const OUTFIT_COLORS = [0xf4efe4, 0xffffff, 0xd9534f, 0xffa24a, 0xf2c14e, 0xd9a441, 0x6ab48a, 0x7d8f4e, 0x2a9aa8, 0x3a6ea5,
  0x34405e, 0x8a6f9e, 0xff8ab8, 0x2a2a2a, 0x6b4a32, 0x8a8a8a, 0x4a2f22, 0xe8d8a0, 0xb8b8b8, 0xb46cff];
const OUTFIT_OPTS = {
  hat: { label: '모자', names: ['없음', '버킷햇', '야구모자', '밀짚모자'], values: [null, 'bucket', 'cap', 'straw'] },
  hair: { label: '머리 모양', names: ['짧은 머리', '긴 머리', '민머리'], values: ['short', 'long', 'bald'] },
  glasses: { label: '안경', names: ['없음', '검은 선글라스', '파란 선글라스', '금테 안경'], values: [null, 0x1d1d1d, 0x2a5aa8, 0xc8a040] },
  beard: { label: '수염', names: ['없음', '있음'], values: [false, true] }
};
// 색칠하는 부분 (-1 = 없음)
const OUTFIT_COLOR_PARTS = [['hatC', '모자 색'], ['hairC', '머리 색'], ['shirt', '윗옷'], ['pants', '바지'], ['vest', '조끼 (없음 가능)'], ['scarf', '목도리 (없음 가능)'], ['backpack', '배낭 (없음 가능)'], ['flower', '꽃 장식 (없음 가능)']];
const OPTIONAL_PARTS = new Set(['vest', 'scarf', 'backpack', 'flower']);
const DEFAULT_OUTFIT = { hat: 1, hatC: 5, hair: 0, hairC: 16, glasses: 0, beard: 0, shirt: 0, pants: 10, vest: 7, scarf: -1, backpack: -1, flower: -1 };
// 저장된 옷 정보 검사 (숫자만, 범위 안만)
function cleanOutfit(o) {
  const out = { ...DEFAULT_OUTFIT };
  if (!o || typeof o !== 'object') return out;
  const n = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
  for (const k of Object.keys(OUTFIT_OPTS)) out[k] = n(o[k], 0, OUTFIT_OPTS[k].values.length - 1, out[k]);
  for (const [k] of OUTFIT_COLOR_PARTS) out[k] = n(o[k], OPTIONAL_PARTS.has(k) ? -1 : 0, OUTFIT_COLORS.length - 1, out[k]);
  return out;
}
function outfitToLook(raw) {
  const o = cleanOutfit(raw);
  const C = (i) => (i >= 0 ? OUTFIT_COLORS[i] : null);
  const vest = C(o.vest);
  return {
    skin: 0xf6cfa8, shirt: C(o.shirt), sleeve: C(o.shirt), pants: C(o.pants), boots: 0x6b3e2a,
    vest, vestPocket: vest ? new THREE.Color(vest).multiplyScalar(0.78).getHex() : undefined,
    hat: OUTFIT_OPTS.hat.values[o.hat], hatColor: C(o.hatC), hair: OUTFIT_OPTS.hair.values[o.hair], hairColor: C(o.hairC),
    glasses: OUTFIT_OPTS.glasses.values[o.glasses], beard: OUTFIT_OPTS.beard.values[o.beard] ? C(o.hairC) : null,
    scarf: C(o.scarf), backpack: C(o.backpack), flower: C(o.flower)
  };
}

// ---------- 주인공 ----------
let hero = makeBlockPerson({
  skin: 0xf6cfa8, shirt: 0xf4efe4, sleeve: 0xf4efe4, vest: 0x7d8f4e, vestPocket: 0x5f6e37,
  pants: 0x34405e, boots: 0x6b3e2a, hair: 'short', hairColor: 0x4a2f22,
  hat: 'bucket', hatColor: 0xd9a441
});
let person = hero.group; // 탈의실에서 옷을 바꾸면 새로 만들어요
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
  c.font = '86px "Jua", "Malgun Gothic", sans-serif';
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
  { name: '기본 낚싯대',   price: 0,     luck: 0, reel: 1.0, bite: 1.0, zone: 0, perk: '처음 받은 정든 낚싯대',
    color: 0x6e5038, color2: 0x8a6a48, grip: 0xc9a26a, accent: 0x3a2a1e, reelC: 0x30343c, rings: 0 },
  { name: '대나무 낚싯대', price: 150,   luck: 0.04, reel: 1.05, bite: 0.95, zone: 0.1, perk: '특기: 초록 칸이 넓어요 (노을빛·그림자보다 넓어요!)',
    color: 0xb09848, color2: 0xd8c070, grip: 0x6a4a2a, accent: 0x7a6a30, reelC: 0x5a5a5a, rings: 6 },
  { name: '탄소 낚싯대',   price: 600,   luck: 0.07, reel: 1.5, bite: 0.85, zone: 0.03, perk: '특기: 게이지가 빨라요 (그림자 낚싯대보다 빨라요!)',
    color: 0x1e2026, color2: 0x30343e, grip: 0x2a2a2a, accent: 0xd03030, reelC: 0xb8bcc4, rings: 4, metal: 0.5, rough: 0.22 },
  { name: '노을빛 낚싯대', price: 2000,  luck: 0.22, reel: 1.2, bite: 0.8, zone: 0.05, perk: '특기: 운이 좋아요 (그림자 낚싯대만큼!)',
    color: 0xc8401a, color2: 0xffc24a, grip: 0x4a2a1a, accent: 0xffd36b, reelC: 0xd8a84a, rings: 5, metal: 0.55, rough: 0.3, glow: 0xff6a1a, tip: 'gem' },
  { name: '그림자 낚싯대', price: 5000,  luck: 0.2, reel: 1.3, bite: 0.42, zone: 0.06, perk: '특기: 입질이 빨라요 (별빛·솜사탕보다 빨라요!)',
    color: 0x150e20, color2: 0x3a2458, grip: 0x120c1a, accent: 0xb07cff, reelC: 0x2a1f3d, rings: 7, metal: 0.4, rough: 0.3, glow: 0x9a5cff, tip: 'crystal', orbit: 3 },
  { name: '별빛 낚싯대',   price: 12000, luck: 0.36, reel: 1.45, bite: 0.55, zone: 0.14, perk: '특기: 골고루 좋은 만능 낚싯대',
    color: 0xe6ecff, color2: 0xa8d4ff, grip: 0x2a3a5a, accent: 0x9fd8ff, reelC: 0xe8eef8, rings: 6, metal: 0.45, rough: 0.12, glow: 0x7fc4ff, tip: 'star', orbit: 6 },
  // ---- 언덕 위 상점에서만 팔아요 (shop: 'mountain') ----
  { name: '솜사탕 낚싯대', shop: 'mountain', price: 20000, luck: 0.4, reel: 1.5, bite: 0.52, zone: 0.19, perk: '특기: 초록 칸이 아주 넓어요 (은하수보다 넓어요!)',
    color: 0xffb6d5, color2: 0xb8e0ff, grip: 0xfff0f8, accent: 0xff6aa8, reelC: 0xffe0ee, rings: 8, metal: 0.1, rough: 0.4, glow: 0xff8ac8, tip: 'gem', orbit: 4 },
  { name: '용암 낚싯대', shop: 'mountain', price: 45000, luck: 0.45, reel: 2.05, bite: 0.45, zone: 0.1, perk: '특기: 게이지가 엄청 빨라요 (은하수보다 빨라요!)',
    color: 0x1a1210, color2: 0x3a1a10, grip: 0x0c0806, accent: 0xff6a1a, reelC: 0x2a1a14, rings: 9, metal: 0.3, rough: 0.5, glow: 0xff5a10, tip: 'crystal', orbit: 5 },
  { name: '은하수 낚싯대', shop: 'mountain', price: 100000, luck: 0.66, reel: 1.65, bite: 0.38, zone: 0.13, perk: '특기: 운이 아주 좋아요',
    color: 0x0a0a2a, color2: 0x3a2a7a, grip: 0x14143a, accent: 0xc8b8ff, reelC: 0x1a1a4a, rings: 10, metal: 0.5, rough: 0.15, glow: 0x9a8aff, tip: 'star', orbit: 9 },
  // ---- 오로라 강 상점에서만 팔아요 (shop: 'aurora') — 성능은 기존 낚싯대들 사이 ----
  // 산호: 분홍·주황 산호 가지가 자라난 낚싯대, 끝에 빛나는 진주, 조개껍데기 릴
  { name: '산호 낚싯대', shop: 'aurora', price: 9000, luck: 0.3, reel: 1.35, bite: 0.48, zone: 0.21, perk: '특기: 초록 칸이 제일 넓어요 (정글 전까지!)', style: 'coral',
    color: 0xff8a7a, color2: 0xffc8a8, grip: 0x2a5a6a, accent: 0xfff0e0, reelC: 0xffe8d8, rings: 4, metal: 0.15, rough: 0.45, glow: 0xffd8e8, tip: 'pearl', orbit: 0 },
  // 오로라: 청록→보라로 물드는 몸통, 빛의 리본이 감싸 돌고, 끝의 프리즘이 무지개색으로 바뀌어요
  { name: '오로라 낚싯대', shop: 'aurora', price: 30000, luck: 0.56, reel: 1.5, bite: 0.45, zone: 0.1, perk: '특기: 값에 비해 운이 아주 좋아요', style: 'aurora',
    color: 0x2affd0, color2: 0xb46cff, grip: 0x1a1a3a, accent: 0xe0fff8, reelC: 0x2a2a5a, rings: 6, metal: 0.4, rough: 0.15, glow: 0x7affe0, tip: 'prism', orbit: 0 },
  // 심해왕의 삼지창: 깊은 바다색 몸통에 금빛 띠, 끝에 금빛 삼지창과 푸른 보석, 물방울이 보글보글
  { name: '심해왕의 삼지창', shop: 'aurora', price: 70000, luck: 0.5, reel: 1.6, bite: 0.25, zone: 0.12, perk: '특기: 입질이 엄청 빨라요 (+300%)', style: 'trident',
    color: 0x0a1a3a, color2: 0x1a4a7a, grip: 0x3a2410, accent: 0xffd04a, reelC: 0xc8a030, rings: 7, metal: 0.7, rough: 0.2, glow: 0x3ad8ff, tip: 'trident', orbit: 0 },
  // ---- 정글섬 공방에서만 팔아요 (shop: 'jungle') — 정글 연못은 이 낚싯대로만 낚여요 ----
  { name: '덩굴 낚싯대', shop: 'jungle', price: 1200000, luck: 0.7, reel: 1.8, bite: 0.32, zone: 0.27, perk: '특기: 초록 칸이 제일 넓어요 (정글 왕보다!)',
    color: 0x3a5a22, color2: 0x6a8a3a, grip: 0x4a2a14, accent: 0xb8ff6a, reelC: 0x3a4a2a, rings: 0, metal: 0.1, rough: 0.7, glow: 0x6aff3a, tip: 'none', orbit: 4, style: 'vine' },
  { name: '황금 신전 낚싯대', shop: 'jungle', price: 3500000, luck: 0.98, reel: 1.9, bite: 0.3, zone: 0.16, perk: '특기: 운이 제일 좋아요 (정글 왕보다!)',
    color: 0xc89a2a, color2: 0xffd84a, grip: 0x5a3a14, accent: 0x3affb0, reelC: 0xd8b040, rings: 0, metal: 0.85, rough: 0.2, glow: 0xffc83a, tip: 'none', orbit: 6, style: 'temple' },
  { name: '정글 왕의 낚싯대', shop: 'jungle', price: 8000000, luck: 0.86, reel: 2.4, bite: 0.2, zone: 0.2, perk: '특기: 게이지·입질이 제일 빨라요',
    color: 0x3a2a14, color2: 0xc8862a, grip: 0x1a0a04, accent: 0xffe23a, reelC: 0x0a2a1a, rings: 0, metal: 0.3, rough: 0.4, glow: 0xffa83a, tip: 'none', orbit: 10, style: 'king' }
];
RODS.forEach((r) => (r.shop = r.shop || 'base')); // 표시 없는 건 아래 상점 낚싯대

// =====================================================
//  보트 (보트 상점에서 사요) — 보트 관리인한테 E 키로 불러서 타고, 스페이스(점프)로 뛰어내려요. 보트 위에서도 낚시돼요
// =====================================================
const BOAT_TYPES = [
  // seat = 앉는 자리 높이
  { name: '나무 조각배', price: 3000, speed: 4.6, seat: 0.38, desc: '삐걱삐걱 노 젓는 소박한 배' },
  { name: '오리배', price: 8000, speed: 5.8, seat: 0.48, desc: '페달을 밟는 귀여운 노란 오리' },
  { name: '모터보트', price: 20000, speed: 8.8, seat: 0.38, desc: '물살을 가르는 빠른 하얀 보트' },
  { name: '카약', price: 5000, speed: 6.4, seat: 0.3, desc: '날렵한 주황 카약, 양쪽 노로 슝슝' },
  { name: '돛단배', price: 15000, speed: 7.4, seat: 0.42, desc: '하얀 돛이 바람을 가득 품는 배' },
  { name: '유람 요트', price: 45000, speed: 9.8, seat: 0.62, desc: '선실과 갑판이 있는 커다란 하얀 요트' },
  { name: '해적선', price: 90000, speed: 9.2, seat: 0.7, desc: '검은 돛에 깃발 펄럭이는 진짜 해적선' }
];
// 보트 모양: 앞이 -z 쪽 (캐릭터와 같은 방향). 물 높이에 바닥이 닿아요
function makeBoatModel(type) {
  const g = new THREE.Group();
  const add = (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0, extra = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, 0.7, extra));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (type === 0) {
    const hull = 0x8a5a3a, rim = 0x6a4228;
    add(1.1, 0.18, 2.5, hull, 0, 0.05, 0);
    for (const s of [-1, 1]) add(0.1, 0.42, 2.5, rim, s * 0.58, 0.26, 0, 0, 0, s * -0.12);
    add(1.1, 0.42, 0.1, rim, 0, 0.26, 1.25);
    add(0.7, 0.4, 0.5, hull, 0, 0.22, -1.42, 0.25);                  // 뱃머리
    add(1.0, 0.07, 0.36, 0xb08a61, 0, 0.36, 0.2);                    // 앉는 판
    for (const s of [-1, 1]) {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), mat(0xb08a61));
      oar.rotation.z = s * 1.2; oar.position.set(s * 0.95, 0.3, 0.1);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.14), mat(0xb08a61));
      blade.position.set(s * 1.7, -0.05, 0.1);
      g.add(oar, blade);
    }
  } else if (type === 1) {
    const yel = 0xffd84a, wht = 0xfff8e8;
    add(1.4, 0.45, 2.3, yel, 0, 0.18, 0);
    add(1.2, 0.08, 1.4, wht, 0, 0.42, 0.25);                          // 바닥
    add(1.1, 0.5, 0.18, yel, 0, 0.6, 0.95);                           // 등받이
    add(0.45, 0.85, 0.45, yel, 0, 0.75, -1.0);                        // 목
    add(0.6, 0.55, 0.6, yel, 0, 1.35, -1.1);                          // 머리
    add(0.36, 0.14, 0.36, 0xff8a2a, 0, 1.25, -1.5);                   // 부리
    for (const s of [-1, 1]) {
      add(0.08, 0.1, 0.02, 0x111111, s * 0.18, 1.45, -1.41);         // 눈
      add(0.15, 0.38, 0.9, 0xf2c030, s * 0.72, 0.4, 0.3, 0, 0, s * -0.2); // 날개
    }
    add(0.7, 0.3, 0.3, yel, 0, 0.42, 1.25, -0.5);                     // 꼬리
  } else if (type === 3) {
    // 카약: 길쭉하고 날렵, 가운데 구멍에 앉아요
    const org = 0xff7a2a, dk = 0x2a2a30;
    add(0.7, 0.22, 3.2, org, 0, 0.1, 0);
    add(0.5, 0.18, 0.7, org, 0, 0.12, -1.8, 0.22);
    add(0.5, 0.18, 0.7, org, 0, 0.12, 1.8, -0.22);
    add(0.5, 0.06, 0.8, dk, 0, 0.22, 0.1);                              // 앉는 구멍
    add(0.62, 0.05, 0.05, 0xffffff, 0, 0.22, -0.9);                     // 하얀 줄
    const paddle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), mat(0x3a3a40));
    paddle.rotation.z = Math.PI / 2; paddle.position.set(0, 0.5, -0.15);
    g.add(paddle);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.16), mat(0xffd84a)); b.position.set(s * 1.1, 0.5, -0.15); g.add(b); }
  } else if (type === 4) {
    // 돛단배: 나무 배 + 큰 하얀 돛 + 파란 줄무늬
    const hull = 0x9a6a42, rim = 0x6a4228;
    add(1.3, 0.3, 3.0, hull, 0, 0.1, 0);
    for (const s of [-1, 1]) add(0.1, 0.4, 3.0, rim, s * 0.68, 0.32, 0, 0, 0, s * -0.1);
    add(0.9, 0.4, 0.7, hull, 0, 0.25, -1.75, 0.3);
    add(1.2, 0.06, 2.6, 0xc8a070, 0, 0.3, 0.1);                         // 갑판
    add(0.1, 3.0, 0.1, 0x5a3a22, 0, 1.75, -0.5);                         // 돛대
    add(0.05, 2.4, 1.5, 0xfaf6ec, 0.06, 1.85, 0.25);                     // 큰 돛
    add(0.06, 0.18, 1.5, 0x4a8ac8, 0.07, 1.1, 0.25);                     // 돛 줄무늬
    add(0.06, 0.18, 1.5, 0x4a8ac8, 0.07, 1.5, 0.25);
    add(0.05, 0.3, 0.5, 0xff5a4a, 0, 3.35, -0.3);                        // 깃발
  } else if (type === 5) {
    // 유람 요트: 길고 하얀 배, 선실, 파란 창문, 난간
    const wht = 0xf6f6f2, nav = 0x1f3a6a;
    add(1.8, 0.5, 4.2, wht, 0, 0.15, 0);
    add(1.2, 0.5, 1.2, wht, 0, 0.2, -2.4, 0.3);
    for (const s of [-1, 1]) add(0.04, 0.12, 4.0, nav, s * 0.91, 0.25, 0);
    add(1.7, 0.06, 4.0, 0xc8a070, 0, 0.42, 0);                            // 나무 갑판
    add(1.3, 0.8, 1.6, wht, 0, 0.85, -0.3);                               // 선실
    for (const s of [-1, 1]) add(0.04, 0.3, 1.2, 0x5ab8e8, s * 0.66, 0.95, -0.3); // 창문
    add(1.4, 0.08, 1.8, nav, 0, 1.28, -0.3);                              // 선실 지붕
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) add(0.04, 0.35, 0.04, 0xd8d8d8, s * 0.85, 0.62, 0.6 + k * 0.32); // 난간
    for (const s of [-1, 1]) add(0.04, 0.04, 1.4, 0xd8d8d8, s * 0.85, 0.8, 1.25);
  } else if (type === 6) {
    // 해적선: 검은 나무 배, 높은 뒷갑판, 검은 돛, 해골 무늬, 대포
    const hull = 0x3a2416, rim = 0x24160c, gold = 0xd8a830;
    add(2.0, 0.6, 4.6, hull, 0, 0.2, 0);
    add(1.4, 0.6, 1.2, hull, 0, 0.25, -2.6, 0.35);
    for (const s of [-1, 1]) add(0.14, 0.6, 4.6, rim, s * 1.04, 0.6, 0);
    for (const s of [-1, 1]) add(0.03, 0.08, 4.4, gold, s * 1.12, 0.75, 0);      // 금빛 줄
    add(1.9, 0.08, 4.4, 0x6a4a2a, 0, 0.5, 0);                                    // 갑판
    add(1.9, 0.7, 1.2, hull, 0, 0.85, 1.8);                                       // 뒷갑판
    add(0.16, 4.0, 0.16, rim, 0, 2.5, -0.4);                                      // 돛대
    add(2.2, 1.8, 0.05, 0x1a1a1e, 0, 2.6, -0.3);                                  // 검은 돛
    add(0.5, 0.45, 0.06, 0xf4f0e6, 0, 2.75, -0.26);                              // 해골
    for (const s of [-1, 1]) add(0.1, 0.12, 0.07, 0x1a1a1e, s * 0.12, 2.8, -0.22); // 눈구멍
    add(0.4, 0.06, 0.06, 0xf4f0e6, 0, 2.4, -0.26);                               // 뼈
    add(0.06, 0.4, 0.6, 0xd03030, 0, 4.6, -0.1);                                  // 깃발
    for (const s of [-1, 1]) for (const z of [-0.8, 0.4]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), mat(0x2a2a2e, 0.4, { metalness: 0.6 }));
      c.rotation.z = Math.PI / 2; c.position.set(s * 1.25, 0.7, z); g.add(c);                 // 대포
    }
  } else {
    const wht = 0xf4f4f4, red = 0xd9534f;
    add(1.3, 0.35, 3.0, wht, 0, 0.12, 0);
    for (const s of [-1, 1]) add(0.12, 0.38, 3.0, wht, s * 0.68, 0.36, 0);
    for (const s of [-1, 1]) add(0.02, 0.1, 2.9, red, s * 0.745, 0.32, 0);   // 빨간 줄
    add(1.0, 0.45, 0.8, wht, 0, 0.3, -1.6, 0.35);                      // 뾰족한 앞
    add(1.2, 0.07, 1.4, 0x3a4a5a, 0, 0.32, 0.4);                       // 바닥
    const glass = add(1.1, 0.45, 0.06, 0x9ad8ff, 0, 0.62, -0.55, -0.4, 0, 0, { transparent: true, opacity: 0.45, metalness: 0.3 });
    glass.castShadow = false;
    add(0.35, 0.5, 0.35, 0x2a2a30, 0, 0.45, 1.6);                      // 엔진
    add(0.08, 0.5, 0.08, 0x3a3a40, 0, 0.05, 1.7);
  }
  g.userData.dynamic = true; // 보트는 움직여요 (최적화에서 빼요)
  g.userData.seat = BOAT_TYPES[type]?.seat ?? 0.38; // 앉는 자리 높이 (다른 플레이어 화면에서도 써요)
  return g;
}
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
  // ---------- 특별한 낚싯대 장식 ----------
  if (r.style === 'coral') {
    // 산호 가지: 몸통 여기저기에서 비스듬히 자라나요
    const coralC = [0xff6a7a, 0xff9a5a, 0xffb8c8];
    for (let k = 0; k < 9; k++) {
      const y = -half + 0.9 + k * 0.2, side = k % 2 ? 1 : -1;
      const br = put(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.22 + (k % 3) * 0.06, 5), mat(coralC[k % 3], 0.6)), side * 0.06, y, (k % 3 - 1) * 0.03);
      br.rotation.z = side * -0.9;
      const bud = put(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), mat(coralC[(k + 1) % 3], 0.5)), side * 0.15, y + 0.07, (k % 3 - 1) * 0.03);
      bud.castShadow = false;
    }
    // 조개껍데기 릴 덮개
    const shell = put(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xfff0e8, 0.35, { metalness: 0.2 })), 0.16, -half + 0.85, 0);
    shell.rotation.z = -Math.PI / 2;
  }
  if (r.tip === 'pearl') {
    const pearl = put(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff6fa, roughness: 0.1, metalness: 0.3, emissive: 0xffd0e8, emissiveIntensity: 0.6 })), 0, half + 0.06, 0);
    const cup = put(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.07, 6), mat(0xff8a7a, 0.5)), 0, half, 0);
    cup.rotation.x = Math.PI;
    spin.push({ mesh: pearl, kind: 'pulse', base: 1 });
  }
  if (r.style === 'aurora') {
    // 빛의 리본 두 줄이 몸통 위쪽을 나선으로 감싸며 천천히 돌아요
    for (let k = 0; k < 2; k++) {
      const g = new THREE.PlaneGeometry(0.07, 1.5, 1, 16);
      const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
      const c1 = new THREE.Color(0x4affd0), c2 = new THREE.Color(0xd06aff);
      for (let v = 0; v < pos.count; v++) {
        const t = (pos.getY(v) + 0.75) / 1.5;
        const ang = t * Math.PI * 3 + k * Math.PI;
        pos.setXYZ(v, Math.cos(ang) * 0.1 + pos.getX(v), pos.getY(v), Math.sin(ang) * 0.1);
        const c = c1.clone().lerp(c2, t);
        cols[v * 3] = c.r; cols[v * 3 + 1] = c.g; cols[v * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const rib = put(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), 0, half - 0.6, 0);
      rib.castShadow = false;
      spin.push({ mesh: rib, kind: 'twirl', sp: k ? -0.8 : 1.1 });
    }
  }
  if (r.tip === 'prism') {
    const pr = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.2, emissive: 0x7affe0, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 })), 0, half + 0.1, 0);
    pr.scale.set(0.8, 1.6, 0.8);
    spin.push({ mesh: pr, kind: 'hue' });
  }
  if (r.tip === 'trident') {
    // 금빛 삼지창 머리 + 가운데 푸른 보석
    const goldM = mat(0xffd04a, 0.25, { metalness: 0.85, emissive: 0x6a4a00, emissiveIntensity: 0.4 });
    put(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.035), goldM), 0, half + 0.02, 0);       // 가로대
    put(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.035), goldM), 0, half + 0.19, 0);       // 가운데 창
    put(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), goldM), 0, half + 0.41, 0);
    for (const s of [-1, 1]) {
      put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), goldM), s * 0.16, half + 0.12, 0);
      const tipC = put(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), goldM), s * 0.16, half + 0.27, 0);
      tipC.castShadow = false;
      const barb = put(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.025), goldM), s * 0.19, half + 0.2, 0);
      barb.rotation.z = s * 0.6;
    }
    const gem = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: 0x8af0ff, roughness: 0.05, emissive: 0x3ad8ff, emissiveIntensity: 1.6 })), 0, half + 0.02, 0.03);
    spin.push({ mesh: gem, kind: 'pulse', base: 1 });
    // 비늘 무늬 띠
    for (let k = 0; k < 6; k++) {
      const y = -half + 1.0 + k * 0.22, rad = 0.058 - ((y + half) / ROD_LEN) * 0.036 + 0.006;
      const sc = put(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.06, 6), mat(0x2a6aa8, 0.3, { metalness: 0.6 })), 0, y, 0);
      sc.rotation.y = k * 0.5;
    }
    // 보글보글 올라가는 물방울
    for (let k = 0; k < 6; k++) {
      const b = put(new THREE.Mesh(new THREE.SphereGeometry(0.018 + (k % 3) * 0.008, 6, 5), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.7 })), 0, 0, 0);
      b.castShadow = false;
      spin.push({ mesh: b, kind: 'bubble', ph: k / 6, rad: 0.05 + (k % 2) * 0.05 });
    }
  }
  // ---------- 정글 공방 낚싯대: 작은 블록 수백 개로 세세하게 ----------
  if (r.style === 'vine' || r.style === 'temple' || r.style === 'king') {
    const radAt = (y) => 0.058 - ((y + half) / ROD_LEN) * 0.036; // 그 높이의 몸통 굵기
    const mats = new Map(); // 같은 색은 같은 재질 → 나중에 한 덩어리로 합쳐져요
    const M = (c, rough = 0.6, extra = {}) => { const k = c + '|' + rough + '|' + JSON.stringify(extra); if (!mats.has(k)) mats.set(k, mat(c, rough, extra)); return mats.get(k); };
    const G = (c, i = 1.2) => M(c, 0.3, { emissive: c, emissiveIntensity: i });
    const cube = (s, c, x, y, z, m) => { const b = put(new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), m || M(c)), x, y, z); b.castShadow = false; return b; };
    // 몸통 둘레에 블록 한 바퀴 (n 개, 높이 y, 바깥으로 out 만큼)
    const ring = (y, n, size, colorOf, out = 0.008, skip = () => false) => {
      const rr = radAt(y) + out;
      for (let k = 0; k < n; k++) {
        if (skip(k)) continue;
        const a = (k / n) * Math.PI * 2;
        const b = cube([size, size * 1.3, size], 0, Math.cos(a) * rr, y, Math.sin(a) * rr, colorOf(k));
        b.rotation.y = -a;
      }
    };
    const skipSet = new Set();
    if (r.style === 'vine') {
      // 몸통을 나선으로 휘감는 덩굴 (블록 54개) + 잎사귀 + 작은 꽃
      const vineA = M(0x2e6a1e), vineB = M(0x3f8a2a), leafA = M(0x5ac83a, 0.5), leafB = M(0x7ae84a, 0.5), rib = M(0x2a5a1a);
      for (let k = 0; k < 54; k++) {
        const t = k / 54, y = -half + 0.72 + t * (ROD_LEN - 0.86), a = t * Math.PI * 9, rr = radAt(y) + 0.012;
        cube([0.024, 0.024, 0.024], 0, Math.cos(a) * rr, y, Math.sin(a) * rr, k % 2 ? vineA : vineB);
        if (k % 5 === 2) { // 잎사귀: 바깥으로 비스듬히 + 가운데 잎맥
          const lx = Math.cos(a) * (rr + 0.045), lz = Math.sin(a) * (rr + 0.045);
          const lf = cube([0.075, 0.008, 0.036], 0, lx, y + 0.012, lz, k % 10 === 2 ? leafA : leafB); lf.rotation.set(0, -a, 0.5);
          const rb = cube([0.07, 0.01, 0.006], 0, lx, y + 0.016, lz, rib); rb.rotation.set(0, -a, 0.5);
        }
        if (k % 13 === 7) { // 분홍·노란 꽃 (꽃잎 5개 + 가운데)
          const fx = Math.cos(a) * (rr + 0.02), fz = Math.sin(a) * (rr + 0.02), pc = k % 26 === 7 ? M(0xff7ab8, 0.4) : M(0xffe066, 0.4);
          for (let p = 0; p < 5; p++) { const pa = p * 1.2566; cube([0.016, 0.016, 0.016], 0, fx + Math.cos(pa) * 0.018, y + Math.sin(pa) * 0.018, fz, pc); }
          cube([0.012, 0.012, 0.012], 0, fx, y, fz + 0.004, M(0xfff6c0, 0.3));
        }
      }
      // 나무껍질 손잡이 (작은 껍질 조각 4줄 x 9개)
      for (let row = 0; row < 4; row++) ring(-half + 0.1 + row * 0.13, 9, 0.032, (k) => M([0x5a3a1e, 0x6a4a28, 0x4a2e16][(k + row) % 3], 0.95), 0.07, (k) => (k + row) % 4 === 3);
      // 잎으로 덮인 릴
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const lf = cube([0.06, 0.008, 0.04], 0, 0.14 + Math.cos(a) * 0.02, -half + 0.85 + Math.sin(a) * 0.08, 0.06, k % 2 ? leafA : leafB); lf.rotation.set(Math.PI / 2, 0, a); }
      // 끝: 돋아나는 새싹 (잎 3장 + 빛나는 씨앗)
      for (let k = 0; k < 3; k++) { const a = k * 2.094; const lf = cube([0.09, 0.01, 0.04], 0, Math.cos(a) * 0.04, half + 0.05, Math.sin(a) * 0.04, leafB); lf.rotation.set(0, -a, 0.7); }
      const seed = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), glowMat(0x9aff5a, 1.6)), 0, half + 0.1, 0);
      spin.push({ mesh: seed, kind: 'pulse', base: 1 }); skipSet.add(seed);
      // 끝 근처에서 늘어진 덩굴손 3가닥 (블록이 동글게 말려요)
      for (let s = 0; s < 3; s++) { const a0 = s * 2.1; for (let k = 0; k < 7; k++) { const a = a0 + k * 0.5, rr = 0.03 + k * 0.006; cube([0.014, 0.014, 0.014], 0, Math.cos(a) * rr, half - 0.12 - k * 0.022, Math.sin(a) * rr, vineB); } }
    }
    if (r.style === 'temple') {
      const gold = M(0xffd04a, 0.25, { metalness: 0.85 }), goldD = M(0xb8902a, 0.3, { metalness: 0.8 }), jade = G(0x3affb0, 0.9), stone = M(0x8a8a6a, 0.8);
      // 옥 상형문자 띠 6줄 (블록 사이사이를 비워서 무늬처럼)
      for (let b = 0; b < 6; b++) {
        const y = -half + 0.95 + b * 0.27;
        ring(y - 0.03, 10, 0.02, () => goldD, 0.004);
        ring(y, 10, 0.018, (k) => (k + b) % 3 ? jade : gold, 0.006, (k) => (k * 7 + b) % 5 === 0);
        ring(y + 0.03, 10, 0.02, () => goldD, 0.004);
      }
      // 손잡이 끝: 3층 계단식 피라미드
      for (let k = 0; k < 3; k++) cube([0.16 - k * 0.045, 0.035, 0.16 - k * 0.045], 0, 0, -half - 0.02 + k * 0.035, 0, k % 2 ? goldD : stone);
      cube([0.03, 0.03, 0.03], 0, 0, -half + 0.09, 0, jade);
      // 손잡이: 금줄 감기 (작은 블록 4줄)
      for (let row = 0; row < 4; row++) ring(-half + 0.12 + row * 0.12, 8, 0.03, (k) => (k + row) % 2 ? gold : goldD, 0.07);
      // 태양 원반 릴: 금 원반 + 햇살 8개 + 옥 가운데
      const disk = put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), gold), 0.17, -half + 0.85, 0); disk.rotation.z = Math.PI / 2; disk.castShadow = false;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const ray = cube([0.012, 0.05, 0.02], 0, 0.19, -half + 0.85 + Math.cos(a) * 0.13, Math.sin(a) * 0.13, gold); ray.rotation.x = a; }
      cube([0.02, 0.04, 0.04], 0, 0.19, -half + 0.85, 0, jade);
      // 끝: 황금 신상 얼굴 + 깃털 머리장식
      const hy = half + 0.11;
      cube([0.11, 0.12, 0.09], 0, 0, hy, 0, gold);                                // 얼굴
      for (const s of [-1, 1]) cube([0.022, 0.016, 0.01], 0, s * 0.025, hy + 0.015, 0.048, jade); // 빛나는 눈
      cube([0.04, 0.01, 0.01], 0, 0, hy - 0.03, 0.048, goldD);                      // 입
      cube([0.016, 0.03, 0.012], 0, 0, hy - 0.005, 0.05, goldD);                    // 코
      for (const s of [-1, 1]) cube([0.02, 0.05, 0.03], 0, s * 0.065, hy - 0.01, 0, goldD); // 귀걸이 판
      cube([0.13, 0.025, 0.1], 0, 0, hy + 0.072, 0, goldD);                         // 머리띠
      const featherC = [0x2ab84a, 0xd83a2a, 0x2a8ad8, 0xffd83a, 0x2ab84a, 0xd83a2a, 0x2a8ad8];
      for (let k = 0; k < 7; k++) { const a = (k - 3) * 0.32; const fe = cube([0.022, 0.13, 0.008], 0, Math.sin(a) * 0.07, hy + 0.14 + Math.cos(a) * 0.02, -0.02, M(featherC[k], 0.5)); fe.rotation.z = -a; }
    }
    if (r.style === 'king') {
      const black = M(0x14100c, 0.6), orange = M(0xe89a2a, 0.5), gold = M(0xffd04a, 0.25, { metalness: 0.85 }), emer = G(0x2aff9a, 1.3), rune = G(0x6affb0, 1.6);
      // 재규어 무늬: 점무늬 꽃송이 (가운데 주황 + 둘레 검정 블록)
      for (let k = 0; k < 16; k++) {
        const y = -half + 0.8 + (k / 16) * (ROD_LEN - 1.0), a = k * 2.4, rr = radAt(y) + 0.006;
        const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
        cube([0.016, 0.016, 0.016], 0, cx, y, cz, orange);
        for (let p = 0; p < 4; p++) { const pa = p * 1.57 + 0.4; cube([0.012, 0.012, 0.012], 0, cx + Math.cos(a + Math.PI / 2) * Math.cos(pa) * 0.018, y + Math.sin(pa) * 0.018, cz + Math.sin(a + Math.PI / 2) * Math.cos(pa) * 0.018, black); }
      }
      // 빛나는 룬 나선
      for (let k = 0; k < 30; k++) { const t = k / 30, y = -half + 0.75 + t * (ROD_LEN - 0.9), a = -t * Math.PI * 6, rr = radAt(y) + 0.014; cube([0.012, 0.03, 0.012], 0, Math.cos(a) * rr, y, Math.sin(a) * rr, rune); }
      // 금 고리 5개
      for (let k = 0; k < 5; k++) ring(-half + 0.9 + k * 0.38, 12, 0.016, () => gold, 0.004);
      // 손잡이 아래: 마코앵무새 깃털 5장 (마디마디 색이 바뀌어요)
      const feather = [[0xd83a2a, 0xffd83a], [0x2a8ad8, 0x2ab84a], [0x2ab84a, 0xffd83a], [0xd83a2a, 0x2a8ad8], [0xffd83a, 0xd83a2a]];
      for (let f = 0; f < 5; f++) { const a = (f - 2) * 0.35; for (let k = 0; k < 6; k++) { const fe = cube([0.03 - k * 0.003, 0.03, 0.01], 0, 0.08 + Math.sin(a) * 0.03 * k, -half + 0.3 - k * 0.028, Math.cos(a) * 0.01 * k - 0.02, M(feather[f][k % 2], 0.5)); fe.rotation.z = -0.5 + a; } }
      // 에메랄드 릴
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const em = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), emer), 0.16, -half + 0.85 + Math.cos(a) * 0.06, Math.sin(a) * 0.06); em.castShadow = false; }
      // 끝: 금 왕관 (뾰족 5개 + 에메랄드) + 위에 떠서 도는 큰 에메랄드
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; cube([0.03, 0.03, 0.03], 0, Math.cos(a) * 0.06, half + 0.02, Math.sin(a) * 0.06, gold); }
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; cube([0.02, 0.07, 0.02], 0, Math.cos(a) * 0.06, half + 0.07, Math.sin(a) * 0.06, gold); const e = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), emer), Math.cos(a) * 0.06, half + 0.115, Math.sin(a) * 0.06); e.castShadow = false; }
      const big = put(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glowMat(0x2aff9a, 1.8)), 0, half + 0.2, 0);
      big.scale.y = 1.5;
      spin.push({ mesh: big, kind: 'self' }); skipSet.add(big);
    }
    // 같은 재질 블록끼리 한 덩어리로 (움직이는 조각은 빼고) → 블록이 많아도 가벼워요
    for (const s of spin) skipSet.add(s.mesh);
    compactRig(THREE, target, skipSet);
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
    if (s.kind === 'pulse') { s.mesh.scale.setScalar(s.base * (1 + Math.sin(t * 3 + i) * 0.12)); s.mesh.rotation.y = t; return; }
    if (s.kind === 'twirl') { s.mesh.rotation.y = t * s.sp; return; }
    if (s.kind === 'hue') { s.mesh.material.emissive.setHSL((t * 0.15) % 1, 0.9, 0.55); s.mesh.rotation.y = t * 1.2; return; }
    if (s.kind === 'bubble') {
      const q = (t * 0.45 + s.ph) % 1;
      s.mesh.position.set(Math.cos(s.ph * 20) * s.rad, half - 0.5 + q * 1.1, Math.sin(s.ph * 20) * s.rad);
      s.mesh.material.opacity = 0.7 * (1 - q);
      return;
    }
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
const tmpV2 = new THREE.Vector3();
const rodTipWorld = (out = new THREE.Vector3()) => rod.localToWorld(out.set(0, ROD_LEN / 2, 0));

const cordMat = new THREE.LineBasicMaterial({ color: 0xf1e0c4, transparent: true, opacity: 0.88 });
const fishingLine = new THREE.Line(new THREE.BufferGeometry(), cordMat);
scene.add(fishingLine);

function makeBobber(s = 1) {
  const b = new THREE.Group();
  b.userData.dynamic = true; // 찌는 움직이고 숨었다 나타나요
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
// 오로라 지기: 오로라 강을 지키는 사람. 강가에 서서 낚시해요
addNPC({ skin: 0xe8c4a4, shirt: 0x1a3a4a, sleeve: 0x1a3a4a, pants: 0x18222e, boots: 0x101820, hair: 'long', hairColor: 0x9ae0d8,
  glasses: 0x5ad8c8, hat: 'bucket', hatColor: 0x2a6a7a, vest: 0x3a5a8a, vestPocket: 0x2a4068, rodColor: 0x6ad8e8 },
  new THREE.Vector3(-42.6, -0.08, 7.5), Math.PI / 2 + 0.15, new THREE.Vector3(-47.5, 0.17, 8.2), false);
Object.assign(npcs[4], { name: '오로라 지기', li: 0, count: 3407, lines: [
  '이 강은 밤마다 하늘을 비춰요. 그래서 오로라 강이에요.',
  '여긴 입질이 느려요. 좋은 물고기일수록 오래 생각하거든요.',
  '리바이어던을 본 적 있어요. 화면이… 아니, 눈앞이 전부 그 녀석이었어요.',
  '등불은 떠난 낚시꾼들이 남긴 거래요. 그냥 그렇다고 믿고 있어요.',
  '삼천 마리를 넘게 잡았지만, 고래상어 앞에선 아직도 손이 떨려요.',
  '공방 주인이 만든 삼지창, 진짜 심해왕 거라는 소문이 있어요.'
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
      if (now > n.until) { // 한 마리 잡았어요 → 들어서 보여 줘요
        n.state = 'rest'; n.until = now + 2800; n.count++; n.tag.draw(n.name, n.count);
        if (n.pop) endCatchShow(n.pop);
        n.pop = startCatchShow(glitchify(rollFish(0.08, 'lake', isRaining())), b.position, now, 2800);
      }
    } else if (n.state === 'rest') {
      target = 1.5;
      b.visible = false;
      if (now > n.until) { n.state = 'wait'; n.next = now + 9000 + Math.random() * 18000; b.visible = true; }
    }
    n.arm += (target - n.arm) * Math.min(1, dt * 10);
    n.armL.rotation.x = n.armR.rotation.x = n.arm;
    if (n.pop && !updateCatchShow(n.pop, now, t, n.group.position, n.group.rotation.y, 1.0)) n.pop = null;
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
  x.font = '62px "Jua", "Malgun Gothic", sans-serif';
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
// 탈의실: 거울과 옷걸이가 있어요. 여기서 옷과 액세서리를 바꿔요
{
  const { g, part } = makeShop('dress', '탈의실', -13.5, 16, -6, 9, 0xd8b8c8, 0x7a3a5a);
  const mirror = part(1.0, 1.9, 0.06, new THREE.MeshStandardMaterial({ color: 0xdfeef8, roughness: 0.05, metalness: 0.9 }), -1.0, 1.2, -1.2);
  part(1.12, 2.02, 0.05, darkWood, -1.0, 1.2, -1.24);
  part(1.6, 0.06, 0.06, darkWood, 0.6, 2.0, -0.9);       // 옷걸이 봉
  [0xd9534f, 0x3a6ea5, 0xf2c14e, 0x6ab48a, 0xb46cff].forEach((c, i) => {
    part(0.26, 0.5, 0.06, mat(c, 0.9), 0.0 + i * 0.3, 1.65, -0.9);     // 걸려 있는 옷
  });
  mirror.castShadow = false;
}
// 보트 상점: 호숫가에 있고, 앞 물 위에 보트 3척이 떠 있어요 (구경용)
const shopBoats = [];
{
  const { g, part } = makeShop('boat', '보트 상점', 15.5, 6.6, 15.5, -2, 0x4a7a9a, 0x2a4a6a);
  part(0.9, 0.12, 0.3, mat(0xf4f4f4), -1.0, 1.0, -1.18);   // 구명튜브 걸이
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 16), mat(0xff6a3a));
  ring.position.set(1.0, 1.6, -1.15);
  g.add(ring);
  const keeper = makeBlockPerson({ skin: 0xe8b48a, shirt: 0xf4f4f4, vest: 0xff6a3a, vestPocket: 0xd04a2a, pants: 0x2a3a5a, boots: 0x2a2a30, hair: 'short', hairColor: 0x2a1a12, hat: 'cap', hatColor: 0x2a4a6a });
  keeper.group.position.set(0, 0.2, 0.1);
  keeper.group.rotation.y = Math.PI;
  keeper.group.scale.setScalar(1.15);
  g.add(keeper.group);
  BOAT_TYPES.forEach((b, i) => {
    const m = makeBoatModel(i);
    // 처음 3척은 가게 앞 첫 줄, 새로 생긴 4척은 그 뒤 둘째 줄에 떠 있어요
    if (i < 3) { m.position.set(12.2 + i * 3.3, LAKE.y, -3.4 - (i === 1 ? 0.4 : 0)); m.rotation.y = 0.25 - i * 0.25; }
    else { m.position.set(8.4 + (i - 3) * 4.2, LAKE.y, -9.2 - ((i - 3) % 2) * 0.6); m.rotation.y = 0.3 - (i - 3) * 0.2; }
    scene.add(m);
    shopBoats.push({ m, ph: i * 1.7 });
  });
}
// 보트 관리인: 호숫가에 서 있어요. 가까이 가서 E 키를 누르면 내 보트를 앞 물에 띄워 주고 태워 줘요
//  x, z = 관리인이 서 있는 곳, wx, wz = 보트를 띄워 주는 물 위 자리
const BOAT_CALLERS = [
  { x: 8.0, z: 2.5, wx: 8.0, wz: -2.8 },     // 보트 상점 옆
  { x: 3.2, z: -31.2, wx: 3.2, wz: -26.0 },  // 호수 건너편 (북쪽 물가)
  { x: -13.2, z: 22.6, wx: -10, wz: 41.5 }    // 바다 모래사장 (부두 끝 바다에 띄워 줘요)
];
// 보트 관리인 한 명 세우기 (호숫가·모래사장·섬마다)
function makeBoatCaller(c) {
  const gy = c.y ?? groundY(c.x, c.z); // 섬은 높이를 직접 알려 줘요 (섬 높이 값이 아직 안 정해졌을 때)
  const ry = Math.atan2(c.x - c.wx, c.z - c.wz); // 물 쪽을 바라봐요 (사람 앞은 -z)
  const man = makeBlockPerson({ skin: 0xd8a070, shirt: 0x2a4a6a, vest: 0xf2c14e, vestPocket: 0xc89a2a, pants: 0x3a3a40, boots: 0x2a2a30, hair: 'short', hairColor: 0x5a3a22, hat: 'cap', hatColor: 0xff6a3a });
  man.group.position.set(c.x, gy, c.z);
  man.group.rotation.y = ry;
  scene.add(man.group);
  // 옆에 작은 말뚝 + 구명튜브 (보트 부르는 곳 표시)
  const side = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)); // 관리인 오른쪽
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), darkWood);
  post.position.set(c.x + side.x * 0.9, gy + 0.65, c.z + side.z * 0.9);
  post.castShadow = true;
  scene.add(post);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 16), mat(0xff6a3a));
  ring.position.set(post.position.x, post.position.y + 0.25, post.position.z);
  ring.rotation.y = ry;
  scene.add(ring);
  addCollider(c.x, c.z, 0.5);
  const base = new THREE.Vector3(c.x, gy, c.z);
  shops.push({ kind: 'boatcall', title: '보트 소환 · 보트 관리인', group: man.group, caller: c, pos: base.clone(), promptAt: base.clone().add(new THREE.Vector3(0, 3.1, 0)) });
}
BOAT_CALLERS.forEach(makeBoatCaller);
// 오로라 강 낚싯대 공방: 가게 앞 받침대 위에서 새 낚싯대 3종이 빙글빙글 돌며 전시돼요
const displayRods = [];
{
  const sx = -44.5, sz = -15.5;
  const { g, part } = makeShop('rod3', '낚싯대 공방', sx, sz, -41, -9, 0x3a4a6a, 0x1a2a4a);
  const rods = RODS.filter((r) => r.shop === 'aurora');
  // 가게 안 벽에도 걸어 둬요
  rods.forEach((r, i) => {
    const m = new THREE.Group();
    shopRodSpins.push(buildRod(r, m));
    m.position.set(-0.9 + i * 0.9, 1.25, -1.12);
    m.rotation.z = 0.1;
    m.scale.setScalar(0.75);
    g.add(m);
  });
  const keeper = makeBlockPerson({ skin: 0xd8a882, shirt: 0x2a6a8a, pants: 0x2a2a3a, boots: 0x1a1a22, hair: 'short', hairColor: 0xe8e8f0, beard: 0xe8e8f0, glasses: 0x4affd0, hat: 'cap', hatColor: 0x1a3a5a, apron: 0x6a4a2a });
  keeper.group.position.set(0, 0.2, 0.1);
  keeper.group.rotation.y = Math.PI;
  keeper.group.scale.setScalar(1.15);
  g.add(keeper.group);
  // 가게 앞 전시대 3개: 돌 받침대 + 빛나는 고리 + 이름표, 낚싯대가 세워져서 천천히 돌아요
  const ry = g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  const pedM = mat(0x6a6a82, 0.7), ringM = mat(0x7affe0, 0.3, { emissive: 0x4affd0, emissiveIntensity: 1.2 });
  rods.forEach((r, i) => {
    const off = (i - 1) * 2.2;
    const px = sx + fx * 3.6 + rx * off, pz = sz + fz * 3.6 + rz * off;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.8, 10), pedM);
    ped.position.set(px, 0.32, pz);
    ped.castShadow = ped.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), ringM);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px, 0.74, pz);
    scene.add(ped, ring);
    const holder = new THREE.Group();
    holder.position.set(px, 0.72 + ROD_LEN / 2 * 1.05, pz);
    const rg = new THREE.Group();
    rg.scale.setScalar(1.05);
    holder.add(rg);
    const sp = buildRod(r, rg);
    scene.add(holder);
    displayRods.push({ holder, sp, ph: i * 2 });
    const tag = makeSign(r.name.replace(' 낚싯대', ''));
    tag.scale.setScalar(0.42);
    tag.position.set(px + fx * 0.52, 0.55, pz + fz * 0.52);
    tag.rotation.y = ry;
    scene.add(tag);
    addCollider(px, pz, 0.55);
  });
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
  { skin: 0xd8a882, shirt: 0xe0d0a0, pants: 0x3a4a5a, boots: 0x4a3020, hair: 'short', hairColor: 0x6a4a2a, hat: 'bucket', hatColor: 0x5a7aa0 },
  // 베테랑: 낚시광 민수 (낚시 조끼에 야구모자, 선글라스)
  { skin: 0xe6b894, shirt: 0xf0f0f0, pants: 0x3a4030, boots: 0x2a2a20, hair: 'short', hairColor: 0x1a1210, glasses: 0x1d1d1d, hat: 'cap', hatColor: 0x2a5a3a, vest: 0x6a7a4a, vestPocket: 0x4a5a32, backpack: 0x8a5a2a },
  // 베테랑: 새벽물결 (푸른 옷, 긴 머리, 목도리)
  { skin: 0xf3d2b3, shirt: 0x2a3a6a, pants: 0x1e2440, boots: 0x1a1a22, hair: 'long', hairColor: 0x3a2a4a, hat: 'bucket', hatColor: 0x8ab8d8, scarf: 0x6ad8c8 }
];
const WALKER_NAMES = ['물결소년', '노을헌터', '붕어왕', '밤낚시러', '낚시광 민수', '새벽물결'];
const WALKER_COUNTS = [null, null, null, null, 812, 1254]; // 베테랑은 잡은 수가 정해져 있어요
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
   '말 걸지 마… 아니, 걸어도 돼. 사실 심심했어.'],
  ['팔백 마리 넘게 잡았는데, 아직도 찌가 쏙 들어가면 심장이 쿵 해요.',
   '오로라 강은 입질이 느려요. 대신 한 번 물면 화면이 꽉 차는 놈이 올라오죠.',
   '보트 타고 호수 한가운데 가 봤어요? 거기서 던지면 기분이 달라요.',
   '낚싯대는 비싼 게 다가 아니에요. 그래도… 삼지창은 갖고 싶다.',
   '회사 그만두고 낚시만 한 지 삼 년째예요. 후회는… 가끔만 해요.',
   '탈의실에서 옷 갈아입었어요? 낚시는 장비빨, 아니 옷빨이에요.'],
  ['새벽 다섯 시 물결이 제일 예뻐요. 그래서 이름도 새벽물결이에요.',
   '천 마리째 잡던 날, 그냥 놓아줬어요. 고맙다고 하는 것 같았거든요.',
   '오로라 강에 떠 있는 등불들, 누가 띄우는 건지 아무도 몰라요.',
   '골드에 다이아까지 붙은 놈 본 적 있어요? 저는 딱 한 번요. 스무 배였어요.',
   '빨리 잡으려고 하면 안 잡혀요. 물이 허락해 줄 때까지 기다려요.',
   '밤에 오로라 강에 가 봐요. 하늘이랑 물이 같이 일렁여요.']
];
const WALKER_START = [[-3, 11], [3.5, 12], [-10, 11], [12.5, 9], [-30, 4], [-38, -12]];
// 바다 세계: 모래사장 · 부두 · 등대 · 섬 · 큰 집 · 맵 곳곳 장식 (seaworld.js) — 가게·나무가 다 놓인 다음에 만들어서 겹치지 않게
const seaWorld = buildSeaWorld({ THREE, scene, SEA, SEA_PIER, JUNGLE, JUNGLE_POND, islands, addCollider, colliders, inLake, onPlateau, onDock, shops, makeLantern, LANTERN_MATS, BOUNDS: { x0: -74, x1: 44, z0: -48, z1: 24 } });
// 정글 판매점: 정글섬에서 잡은 비싼 물고기를 바로 팔 수 있어요
{
  const { part } = makeShop('sell', '정글 판매점', JUNGLE.x + 9, JUNGLE.z - 13, JUNGLE.x, JUNGLE.z - 27, 0x7a6a42, 0x2a6a3a, 0.17);
  for (let i = 0; i < 5; i++) part(0.07, 0.8 + (i % 2) * 0.4, 0.07, mat(0x3a8a2a), -1.5 + i * 0.75, 1.95 - (i % 2) * 0.2, 1.36); // 덩굴
  part(0.7, 0.35, 0.5, mat(0xc8a060), -1.1, 1.38, 0.95);  // 계산대 위 물고기 상자
  part(0.4, 0.12, 0.2, mat(0x5ab8e8, 0.4), -1.1, 1.6, 0.95);
}
// 정글 공방: 정글섬 선착장 옆. 정글 연못 전용 낚싯대(최소 $1,000,000)를 팔아요
{
  const { g, part } = makeShop('rod4', '정글 공방', JUNGLE.x - 11, JUNGLE.z - 12, JUNGLE.x, JUNGLE.z - 27, 0x6a5a3a, 0x3a6a2a, 0.17);
  // 가게 벽에 덩굴과 큰 잎사귀
  for (let i = 0; i < 6; i++) part(0.08, 0.9 + (i % 3) * 0.3, 0.08, mat(0x3a8a2a), -1.6 + i * 0.64, 1.9 - (i % 3) * 0.15, 1.36);
  part(1.1, 0.06, 0.5, mat(0x4aa83a), -1.2, 2.55, 1.45);
  part(1.1, 0.06, 0.5, mat(0x3a9a2a), 1.2, 2.55, 1.45);
  // 가게 앞 이끼 낀 돌 받침대 3개 위에서 정글 낚싯대가 빙글빙글 (실물 구경)
  const ry = g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  const pedM = mat(0x7a8a6a, 0.85), mossM = mat(0x4a8a3a, 0.9), ringM = mat(0x8aff6a, 0.3, { emissive: 0x4aff3a, emissiveIntensity: 1.2 });
  const sx = JUNGLE.x - 11, sz = JUNGLE.z - 12, base = 0.25 + 0.72;
  RODS.filter((r) => r.shop === 'jungle').forEach((r, i) => {
    const off = (i - 1) * 2.2;
    const px = sx + fx * 3.6 + rx * off, pz = sz + fz * 3.6 + rz * off;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.8, 8), pedM);
    ped.position.set(px, 0.25 + 0.32, pz);
    ped.castShadow = ped.receiveShadow = true;
    const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 8), mossM);
    moss.position.set(px, 0.25 + 0.74, pz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), ringM);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px, 0.25 + 0.78, pz);
    scene.add(ped, moss, ring);
    const holder = new THREE.Group();
    holder.position.set(px, base + ROD_LEN / 2 * 1.05, pz);
    const rg = new THREE.Group();
    rg.scale.setScalar(1.05);
    holder.add(rg);
    const sp = buildRod(r, rg);
    holder.userData.dynamic = true;
    scene.add(holder);
    displayRods.push({ holder, sp, ph: i * 2, base });
    const tag = makeSign(r.name.replace(' 낚싯대', ''));
    tag.scale.setScalar(0.42);
    tag.position.set(px + fx * 0.52, 0.25 + 0.55, pz + fz * 0.52);
    tag.rotation.y = ry;
    scene.add(tag);
    addCollider(px, pz, 0.55);
  });
}
// 섬·모래사장 물건: 앞에 서서 E
for (const t of seaWorld.things) {
  const d = t.type === 'hammock' ? 1.2 : 1.3, ry = t.ry || 0;
  const px = t.x - Math.sin(ry) * d, pz = t.z - Math.cos(ry) * d, y = t.y ?? -0.08;
  shops.push({ kind: 'thing', thing: t, title: t.title, group: new THREE.Group(), pos: new THREE.Vector3(px, y, pz), promptAt: new THREE.Vector3(t.x, y + 2.6, t.z) });
}
// 섬마다 선착장 옆에 보트 관리인 (섬에서도 배를 불러 다른 섬이나 본토로 갈 수 있어요)
seaWorld.islands.forEach((it) => makeBoatCaller({ x: it.x + 2.4, z: it.z - it.r * 0.84, y: 0.25, wx: it.x, wz: it.z - it.r * 0.95 - 7.5 }));
const walkers = [];

// =====================================================
//  NPC 가 잡은 물고기 보여 주기: 찌에서 튀어 올라 → 머리 위에서 들고 자랑(이름표) → 사라져요
// =====================================================
function startCatchShow(fish, from, now, holdMs) {
  const f = findFish(fish.name);
  if (!f) return null;
  const model = makeFishModel(f, fish.mut, fish.weight);
  const sc = fishScale(f, fish.weight);
  if (sc > 1.8) model.scale.multiplyScalar(1.8 / sc); // 너무 큰 물고기는 줄여서
  scene.add(model);
  // 이름표: 이로치(색깔) + 이름 + 무게
  const c = document.createElement('canvas');
  c.width = 640; c.height = 120;
  const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,0.85)';
  x.font = '52px "Jua", "Malgun Gothic", sans-serif';
  const muts = mutList(fish.mut);
  const parts = [...muts.map((m) => [m.name, m.color]), [`${fish.name} ${fmtKg(fish.weight)}`, RARITY[f.rarity].color]];
  const widths = parts.map(([t]) => x.measureText(t + ' ').width);
  let cx = 320 - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach(([t, col], i) => { const mid = cx + widths[i] / 2; x.strokeText(t, mid, 60); x.fillStyle = col; x.fillText(t, mid, 60); cx += widths[i]; });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  tag.scale.set(2.4, 0.45, 1);
  tag.renderOrder = 11;
  tag.userData.dynamic = true;
  scene.add(tag);
  return { model, tag, start: now, from: from.clone(), until: now + holdMs, flop: f.name === '물 만난 광어' };
}
function endCatchShow(sh) {
  if (!sh) return;
  scene.remove(sh.model); scene.remove(sh.tag);
  sh.tag.material.map.dispose(); sh.tag.material.dispose();
}
// 매 프레임: false 를 돌려주면 끝났어요
function updateCatchShow(sh, now, t, pos, ry, headY) {
  if (!sh) return false;
  if (now > sh.until) { endCatchShow(sh); return false; }
  const q = (now - sh.start) / 700; // 0~1: 날아오는 중
  const hold = tmpV2.set(pos.x - Math.sin(ry) * 0.55, pos.y + headY + 1.1, pos.z - Math.cos(ry) * 0.55);
  if (q < 1) {
    sh.model.position.lerpVectors(sh.from, hold, q);
    sh.model.position.y += Math.sin(q * Math.PI) * 1.4;
    sh.model.rotation.set(0, ry + Math.PI / 2, Math.sin(t * 22) * 0.45);
  } else {
    sh.model.position.copy(hold);
    sh.model.position.y += Math.sin(t * 3) * 0.05;
    sh.model.rotation.set(0, ry + Math.PI / 2, Math.sin(t * 9) * 0.12);
    if (sh.flop) { sh.model.rotation.z = Math.sin(t * 17) * 0.85; sh.model.position.y += Math.max(0, Math.sin(t * 8.5)) * 0.35; }
  }
  const left = sh.until - now;
  if (left < 300) sh.model.scale.multiplyScalar(0.85); // 사라질 땐 쏙
  sh.tag.visible = q >= 1;
  sh.tag.position.set(hold.x, hold.y + 0.9, hold.z);
  return true;
}

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
    x.font = '54px "Jua", "Malgun Gothic", sans-serif';
    x.strokeText(name, 256, 50); x.fillStyle = '#e8f0ff'; x.fillText(name, 256, 50);
    x.font = '80px "Jua", "Malgun Gothic", sans-serif';
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
  const rodIdx = [1, 2, 3, 4, 6, 10][i];
  const spin = buildRod(RODS[rodIdx], rodG);
  const b = makeBobber(0.9);
  b.visible = false;
  scene.add(b);
  const line = new THREE.Line(new THREE.BufferGeometry(), cordMat);
  line.visible = false;
  scene.add(line);
  const tag = makeNameTag();
  p.group.add(tag.sp);
  const count = WALKER_COUNTS[i] ?? 10 + Math.floor(Math.random() * 60);
  tag.draw(WALKER_NAMES[i], count);
  walkers.push({
    ...p, veteran: i >= 4, rodG, spin, rod: RODS[rodIdx], bobber: b, line, tag, name: WALKER_NAMES[i], count, lines: WALKER_LINES[i], li: 0, talkUntil: 0,
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
    const x = P.x + Math.cos(a) * P.rx * 1.25, z = P.z + Math.sin(a) * P.rz * 1.25;
    // 물 안(물길 포함)은 안 돼요 — 물속에서 제자리걸음 하던 버그 고침
    if (onPlateau(x, z) && !waterAt(x, z) && walkable(x, z, undefined, undefined, true)) return { x, z, face: faceTo(x, z, P.x, P.z) };
  }
  return null;
}
// 오로라 강 동쪽 강가 (베테랑만 가요)
function auroraSpot() {
  for (let i = 0; i < 20; i++) {
    const e = RIVER[Math.floor(Math.random() * RIVER.length)];
    const x = e.x + e.rx * (1.12 + Math.random() * 0.15), z = e.z + (Math.random() - 0.5) * e.rz;
    if (!waterAt(x, z) && !onBridge2(x, z) && walkable(x, z, undefined, undefined, true)) return { x, z, face: faceTo(x, z, e.x, z) };
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

// 갇힌 NPC 빼 주기: 가까운 곳부터 빙 둘러보며 "물 밖 + 아무것도 안 걸리는 땅"을 찾아 옮겨요
//  (연못 물속에서 길을 잃었거나, 계단 옆 틈에 끼었을 때). 그래도 계속 안 되면 처음 자리로 돌아가요
function unstickWalker(w) {
  const p = w.group.position;
  w.rescues = (w.rescues || 0) + 1;
  if (w.rescues > 4) { // 너무 자주 끼면 처음 자리로
    const st = WALKER_START[walkers.indexOf(w)] || [0, 10];
    p.set(st[0], -0.08, st[1]);
    w.rescues = 0; w.failCount = 0; w.stuckCount = 0; w.path = [];
    return;
  }
  for (let r = 0.6; r <= 4.2; r += 0.4) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    if (!walkable(x, z, undefined, undefined, true) || inLake(x, z) || onStairs(x, z)) continue;
    if (Math.abs(groundY(x, z) - p.y) > 1.2) continue; // 언덕 위↔아래로 순간이동하지 않게
    p.set(x, groundY(x, z), z);
    w.failCount = 0; w.stuckCount = 0; w.path = [];
    return;
  }
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
    if (w.veteran && r < 0.5) w.job = 'aurora';
    else w.job = r < 0.55 ? 'lake' : r < 0.75 ? 'dock' : 'pond';
    // 다른 사람이 이미 서 있거나 가려는 자리 근처는 피해요 (여러 번 다시 골라 봐요)
    const pick = () => (w.job === 'lake' ? lakeSpot() : w.job === 'dock' ? dockSpot() : w.job === 'aurora' ? auroraSpot() : pondSpot());
    for (let k = 0; k < 8; k++) {
      spot = pick();
      if (spot && !spotTaken(w, spot.x, spot.z)) break;
    }
  }
  const path = spot && planPath(w.group.position, spot);
  if (!path) { // 길이 없으면 잠깐 있다가 다시 골라요. 여러 번 실패하면 끼어 있는 거라 빼 줘요
    w.until = now + 400;
    w.failCount = (w.failCount || 0) + 1;
    if (w.failCount >= 3) unstickWalker(w);
    return;
  }
  w.failCount = 0;
  w.spot = spot;
  w.path = path;
  w.state = 'walk';
  w.stuckAt = now;
  w.stuckPos.copy(w.group.position);
}

// 그 자리 근처(1.6칸)에 다른 사람이 서 있거나 가는 중이면 true
function spotTaken(me, x, z) {
  for (const o of walkers) {
    if (o === me) continue;
    const oz = o.state === 'walk' || o.state === 'arrive' ? o.spot : null;
    if (oz && (oz.x - x) ** 2 + (oz.z - z) ** 2 < 1.6 * 1.6) return true;
    const g = o.group.position;
    if ((g.x - x) ** 2 + (g.z - z) ** 2 < 1.6 * 1.6) return true;
  }
  return false;
}
// 사람끼리 몸이 겹치면 살짝 밀어내요 (계단·길에서 엇갈릴 때도 겹치지 않게)
const WALKER_GAP = 0.95;
function separateWalkers(dt, now) {
  for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
    const a = walkers[i].group.position, b = walkers[j].group.position;
    if (Math.abs(a.y - b.y) > 1.2) continue;
    let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d >= WALKER_GAP) continue;
    if (d < 0.001) { dx = 1; dz = 0; d = 1; } // 완전히 같은 자리면 아무 쪽으로나
    const wa = walkers[i], wb = walkers[j];
    if (now < wa.ghostUntil || now < wb.ghostUntil) continue; // 끼어서 못 가던 사람은 잠깐 그냥 지나가요
    // 미는 힘은 걷는 속도(초당 3.2칸)보다 약하게 → 서로 밀다가 둘 다 갇히는 일이 없어요
    const push = Math.min((WALKER_GAP - d) / 2, 1.6 * dt);
    const ux = dx / d, uz = dz / d;
    // 걷는 사람은 "자기 오른쪽"으로 비켜요 (마주 오면 둘 다 오른쪽으로 → 스쳐 지나가요)
    // 낚시하며 서 있는 사람은 그대로 두고, 걷는 사람만 비켜요
    const aWalk = wa.state === 'walk', bWalk = wb.state === 'walk';
    const side = (w, sx, sz) => {
      const rx = Math.cos(w.ry), rz = -Math.sin(w.ry); // 오른쪽 방향
      return [rx * 0.7 + sx * 0.3, rz * 0.7 + sz * 0.3];
    };
    const [pax, paz] = aWalk ? side(wa, -ux, -uz) : [-ux, -uz];
    const [pbx, pbz] = bWalk ? side(wb, ux, uz) : [ux, uz];
    const ka = aWalk || !bWalk ? 1 : 0, kb = bWalk || !aWalk ? 1 : 0;
    const ax = a.x + pax * push * ka, az = a.z + paz * push * ka;
    const bx = b.x + pbx * push * kb, bz = b.z + pbz * push * kb;
    if (ka && walkable(ax, az, a.x, a.z, true)) { a.x = ax; a.z = az; }
    if (kb && walkable(bx, bz, b.x, b.z, true)) { b.x = bx; b.z = bz; }
  }
}
function updateWalkers(now, dt, t) {
  separateWalkers(dt, now);
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
          let moved = true;
          if (walkable(nx, nz, p.x, p.z, true)) { p.x = nx; p.z = nz; }
          else if (walkable(nx, p.z, p.x, p.z, true)) p.x = nx;
          else if (walkable(p.x, nz, p.x, p.z, true)) p.z = nz;
          else moved = false; // 막혔어요: 다리를 움직이지 않아요
          let diff = Math.atan2(-dx, -dz) - w.ry;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          w.ry += diff * Math.min(1, dt * 10);
          moving = moved;
        }
        // 1초 동안 거의 못 움직였으면 다른 곳으로
        if (now - w.stuckAt > 1000) {
          if (p.distanceTo(w.stuckPos) < 0.3) { // 끼었어요: 잠깐 서로 통과 + 두 번째부터는 걸을 수 있는 땅으로 빼 줘요
            w.state = 'think'; w.until = now + 300; w.ghostUntil = now + 2500;
            w.stuckCount = (w.stuckCount || 0) + 1;
            if (w.stuckCount >= 2) unstickWalker(w);
          } else w.stuckCount = 0;
          w.stuckAt = now;
          w.stuckPos.copy(p);
        }
      }
    } else if (w.state === 'arrive') {
      w.rescues = 0; // 잘 도착했으니 '갇힘 횟수'는 처음부터
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
          w.biteMul = waterAt(tg.x, tg.z)?.biteMul || 1;
          w.bobber.visible = true;
        }
      }
    } else if (w.state === 'cast') {
      armTarget = now - w.castAt < 450 ? 0.85 : 1.2;
      const k = Math.min(1, (now - w.castAt) / 800);
      w.bobber.position.lerpVectors(w.from, w.target, 1 - Math.pow(1 - k, 3));
      w.bobber.position.y += Math.sin(k * Math.PI) * 2;
      if (k >= 1) { w.state = 'wait'; w.until = now + (3000 + Math.random() * 5000) * w.rod.bite * (w.biteMul || 1); }
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
          const fish = glitchify(rollFish(w.rod.luck, w.zone || 'lake', isRaining()));
          if (w.pop) endCatchShow(w.pop);
          w.pop = startCatchShow(fish, w.bobber.position, now, 2600); // 잡은 물고기를 들어서 보여 줘요
          w.count++; w.bag++;
          w.tag.draw(w.name, w.count);
          w.state = 'caught'; w.until = now + 2600;
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

    // 잡은 물고기: 튀어 올라서 → 손에 들고 자랑 → 사라지기
    if (w.pop && !updateCatchShow(w.pop, now, t, p, w.ry, 1.2)) w.pop = null;

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
// 살 수 있는 집 (seaworld.js 의 집 id 와 같아요). slots = 어항 칸 수
const HOUSE_INFO = { sunset: { slots: 8 }, coral: { slots: 12 }, pine: { slots: 14 }, star: { slots: 18 }, whale: { slots: 26 } };
const save = { money: 0, caught: 0, inv: [], dex: {}, rod: 0, owned: [0], nextId: 1, quest: null, questReadyAt: 0, questsDone: 0, outfit: { ...DEFAULT_OUTFIT }, boats: [], boat: -1, homes: [], tanks: {}, houseStyles: {}, chests: {} };

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
  // 인벤토리와 어항: 실제 있는 물고기 이름과 이로치만, 숫자는 숫자만
  const ids = new Set();
  const cleanItems = (arr, max) => {
    const list = [];
    if (!Array.isArray(arr)) return list;
    for (const it of arr.slice(0, max)) {
      if (!it || typeof it !== 'object') continue;
      const f = typeof it.name === 'string' ? findFish(it.name) : null;
      if (!f) continue;
      const weight = Number(it.weight);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 10000) continue;
      const mut = mutKey(it.mut); // 실제 있는 이로치만, 최대 3개
      let id = intIn(it.id, 1, 1e12, 0);
      if (!id || ids.has(id)) id = 0; // 나중에 새 번호를 줘요
      if (id) ids.add(id);
      list.push({ id, name: f.name, weight, mut, price: priceOf(f, weight, mut) }); // 값은 지금 기준으로 다시 계산
    }
    return list;
  };
  out.inv = cleanItems(s.inv, 5000);
  // 집: 실제 있는 집 이름만 / 어항: 산 집만, 집마다 정해진 칸 수까지만
  out.homes = Array.isArray(s.homes) ? [...new Set(s.homes.filter((h) => typeof h === 'string' && HOUSE_INFO[h]))] : [];
  out.tanks = {};
  for (const h of out.homes) out.tanks[h] = cleanItems(s.tanks && s.tanks[h], 40); // 칸 수가 바뀌어도 물고기는 안 사라지게 넉넉히
  // 집 디자인: 산 집만, 실제 있는 디자인 번호만
  out.houseStyles = {};
  for (const h of out.homes) { const v = s.houseStyles && s.houseStyles[h]; if (Number.isInteger(v) && v >= 0 && v < HOUSE_STYLES.length) out.houseStyles[h] = v; }
  let next = Math.max(intIn(s.nextId, 1, 1e12, 1), ...[...ids].map((i) => i + 1), 1);
  for (const it of [...out.inv, ...Object.values(out.tanks).flat()]) if (!it.id) it.id = next++;
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
  out.outfit = cleanOutfit(s.outfit);
  // 보트: 실제 있는 보트 번호만
  out.boats = Array.isArray(s.boats) ? [...new Set(s.boats.filter((b) => Number.isInteger(b) && b >= 0 && b < BOAT_TYPES.length))] : [];
  out.boat = out.boats.includes(s.boat) ? s.boat : (out.boats[0] ?? -1);
  out.savedAt = intIn(s.savedAt, 0, 1e15, 0);
  // 보물 상자 연 시각 (알려진 상자만)
  out.chests = {};
  for (const id of ['chest_beach', 'chest_jungle']) if (s.chests && Number.isFinite(Number(s.chests[id]))) out.chests[id] = intIn(s.chests[id], 0, 1e15, 0);
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
// 저장할 때마다 시각을 적어 둬요 (계정 기록과 비교해서 더 최근 걸 쓰려고). 로그인했으면 계정에도 올려요
const writeSave = () => { save.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} if (typeof scheduleCloudSave === 'function') scheduleCloudSave(); };
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
  else if (s === 'idle') set(game.notice || '호수 쪽을 바라보고 던져 보세요.', '클릭을 꾹 눌렀다 놓으면 던져요. 1번을 다시 누르면 넣어요.', true);
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
    Object.assign(heldFish.userData, { name: f.name, base: heldFish.position.clone() }); // 팔딱이는 기준 위치 (원래 기록은 지우지 않고 더해요 — 이로치 이펙트 정보가 들어 있어요)
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
// =====================================================
//  글리치의 날 — 가끔(20~40분에 한 번, 4분 동안) 세상이 지직거려요
//  이때 낚은 물고기는 무조건 글리치 이로치가 붙어요 (다른 이로치랑 같이 겹칠 수 있어요)
// =====================================================
const glitchDay = { active: false, until: 0, next: performance.now() + (20 + Math.random() * 20) * 60000 };
function glitchify(fish) {
  if (!glitchDay.active || !fish) return fish;
  const names = mutList(fish.mut).map((m) => m.name);
  if (names.includes('글리치')) return fish;
  if (names.length >= 3) names.pop(); // 3개가 꽉 찼으면 마지막 걸 글리치로 바꿔요
  names.unshift('글리치');
  const mut = mutKey(names.join('+'));
  const f = findFish(fish.name);
  return { ...fish, mut, price: priceOf(f, fish.weight, mut) };
}
function setGlitchDay(on) {
  const now = performance.now();
  glitchDay.active = on;
  document.body.classList.toggle('glitchDay', on);
  $('glitchHud').classList.toggle('hidden', !on);
  if (on) {
    glitchDay.until = now + 4 * 60000;
    sayRomance(['세상이 뭔가 이상해요!']);
    tone(220, 0.08, 'square', 0.05); tone(880, 0.05, 'square', 0.04, 0.09); tone(140, 0.12, 'sawtooth', 0.04, 0.16);
  } else {
    glitchDay.next = now + (20 + Math.random() * 20) * 60000;
    sayRomance(['세상이 다시 멀쩡해졌어요.']);
  }
}
function updateGlitchDay(now) {
  if (!glitchDay.active && now > glitchDay.next) setGlitchDay(true);
  else if (glitchDay.active && now > glitchDay.until) setGlitchDay(false);
  if (glitchDay.active) {
    const s = Math.ceil((glitchDay.until - now) / 1000);
    const label = `글리치의 날 · 낚는 물고기마다 글리치! · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const el = $('glitchHud');
    if (el.textContent !== label) el.textContent = label;
  }
}
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
      row.innerHTML = `<div class="sw" style="background:${hex(r.color)}"></div><div class="info"><div class="nm">${owned ? r.name : r.name + ' (미보유)'}</div>${r.perk ? `<div class="perk">${r.perk}</div>` : ''}${statsHTML(r)}</div>`;
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
  $('rodShopTitle').textContent = { base: '낚싯대 상점', mountain: '언덕 위 낚싯대 상점', aurora: '오로라 강 낚싯대 공방', jungle: '정글 공방' }[rodShopKind];
  list.innerHTML = `<div class="count">가진 돈 ${money(save.money)}${{ mountain: ' · 산 위 연못의 기운이 깃든 특별한 낚싯대예요', aurora: ' · 오로라 강의 장인이 하나하나 깎아 만든 낚싯대예요. 가게 앞 전시대에서 실물을 볼 수 있어요', jungle: ' · 정글 연못의 힘센 물고기는 이 낚싯대로만 낚을 수 있어요' }[rodShopKind] || ''}</div>`;
  const grid = document.createElement('div');
  grid.className = 'rodGrid';
  list.appendChild(grid);
  RODS.forEach((r, i) => {
    if (r.shop !== rodShopKind) return;
    const owned = save.owned.includes(i);
    const row = document.createElement('div');
    row.className = 'rodRow';
    row.innerHTML = `<div class="sw" style="background:${hex(r.color)}"></div><div class="info"><div class="nm">${r.name}</div>${r.perk ? `<div class="perk">${r.perk}</div>` : ''}${statsHTML(r)}</div>`;
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
// fish.js 의 rollFish 와 똑같은 계산 (운이 높아도 마이너스가 안 나와요)
const rarityChances = (L) => rarityOdds(L);
function renderChart() {
  const list = $('sellList');
  const L = curRod().luck;
  const base = rarityChances(0), now = rarityChances(L);
  const rows = Object.entries(RARITY).map(([k, R]) => {
    // 사는 곳 표시: (산) = 산 위 연못, (비) = 비 올 때만
    const names = FISH.filter((f) => f.rarity === k).map((f) => (save.dex[f.name] ? f.name : '???') + (f.weather === 'rain' ? '(비)' : ({ mountain: '(산)', aurora: '(오로라)', sea: '(바다)', jungle: '(정글)' })[fishZone(f)] || '')).join(', ');
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
    <div class="count" style="margin-top:8px">이로치가 붙으면 절반 확률로 두 번째, 거기서 또 1/4 확률로 세 번째까지 최대 3개 겹쳐요. 겹치면 색이 칸칸이 나뉘고, 가격은 배율을 전부 곱해요 (예: 골드 + 다이아 = 20배, 글리치 + 다이아 + 방사능 = 840배!).</div>`;
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
const panels = () => [ui.dexPanel, ui.rodShopPanel, ui.sellPanel, $('setPanel'), $('cookPanel'), $('multiPanel'), $('dressPanel'), $('boatPanel'), $('housePanel'), $('tankPanel'), $('cloudPanel')];
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
const opts = { gfx: GFX, shiftLock: true, sens: 1, invert: false, name: '', look: Math.floor(Math.random() * 6), room: 'PLAZA' };
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
  document.querySelectorAll('#optGfx [data-gfx]').forEach((b) => b.classList.toggle('on', b.dataset.gfx === opts.gfx));
  $('perfInfo').textContent = perfText();
  $('optSens').value = String(opts.sens);
  $('sensVal').textContent = opts.sens.toFixed(1);
}
$('setBtn').addEventListener('click', (e) => { e.currentTarget.blur(); renderOpts(); openPanel($('setPanel')); });
$('optShift').addEventListener('click', () => { opts.shiftLock = !opts.shiftLock; if (!opts.shiftLock) setShiftLock(false); writeOpts(); renderOpts(); });
$('optInvert').addEventListener('click', () => { opts.invert = !opts.invert; writeOpts(); renderOpts(); });
// 그래픽 품질 버튼
document.querySelectorAll('#optGfx [data-gfx]').forEach((b) => b.addEventListener('click', () => {
  const was = opts.gfx;
  opts.gfx = GFX = b.dataset.gfx;
  writeOpts(); renderOpts();
  if (GFX === 'auto') { gfxAuto.t = 0; gfxAuto.frames = 0; gfxAuto.skip = 1; applyGfx('mid'); } else applyGfx(GFX);
  // 안티앨리어싱은 새로고침해야 바뀌어요
  if ((was === 'low') !== (GFX === 'low')) $('gfxNote').textContent = '새로고침(F5)하면 완전히 적용돼요.';
}));
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
  if (game.sitting && game.sitting.house) { standUp(); return; }     // 집 소파·의자에서 일어나기
  if (game.sitting) { renderCook(); openPanel($('cookPanel')); return; } // 앉은 채로 다시 굽기 창
  const s = game.nearShop;
  if (!s || game.state === 'charging' || game.state === 'reeling') return;
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  if (s.kind === 'dress') { openDress(); return; }
  if (s.kind === 'boat') { renderBoatShop(); openPanel($('boatPanel')); return; }
  if (s.kind === 'boatcall') { summonBoat(s.caller); return; }
  if (s.kind === 'house') { openHouse(s.house); return; }
  if (s.kind === 'thing') { useThing(s.thing); return; }
  if (s.kind === 'furn') { if (houseOwned(s.house)) useFurniture(s.house, s.furn); return; }
  if (s.kind === 'tank') { if (save.homes.includes(s.house.id)) { tankHouse = s.house; renderTank(); openPanel($('tankPanel')); } return; }
  if (s.kind === 'rod' || s.kind === 'rod2' || s.kind === 'rod3' || s.kind === 'rod4') { rodShopKind = { rod: 'base', rod2: 'mountain', rod3: 'aurora', rod4: 'jungle' }[s.kind]; renderRodShop(); openPanel(ui.rodShopPanel); }
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
  game.inWater = !!wtr && !onDock(tx, tz) && (!onIsland(tx, tz) || !!wtr.jungle);
  game.castWater = game.inWater ? wtr : null;
  // 정글 물고기는 너무 힘이 세서 정글 공방 낚싯대로만 낚을 수 있어요
  if (game.inWater && wtr.jungle && curRod().shop !== 'jungle') {
    game.inWater = false; game.castWater = null;
    game.blockMsg = '정글 물고기는 힘이 너무 세요! 정글 공방 낚싯대로만 낚을 수 있어요.';
  }
  game.waterY = game.inWater ? wtr.y : groundY(tx, tz);
  game.bobberTarget.set(tx, game.waterY + (game.inWater ? 0.16 : 0.13), tz);
  rodTipWorld(game.castStart);
  game.state = 'casting';
  game.castStartedAt = performance.now();
  game.landed = false;
  game.castFlight = 700 + p * 400;
  // 입질 속도: 낚싯대 x 물(귀한 물고기가 많은 곳일수록 늦게 와요)
  game.biteAt = performance.now() + game.castFlight + (2600 + Math.random() * 3800) * curRod().bite * (wtr?.biteMul || 1);
  game.armSwingUntil = performance.now() + 450;
  bobber.position.copy(game.castStart);
  sfx.cast();
  updateUI();
}

function startReel() {
  // 산 위 연못처럼 운 보너스가 있는 물이면 더해 줘요
  // 산 위 연못이면 그곳에만 사는 신기한 물고기가 나와요
  const fish = glitchify(rollFish(curRod().luck + (game.castWater?.luck || 0) + (isNight() ? 0.05 : 0) + buffLuck(), game.castWater?.zone || 'lake', isRaining())); // 밤에는 운 +5%, 글리치의 날엔 글리치
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
// =====================================================
//  점프 (스페이스) — 땅에서 폴짝, 보트 위에서는 물가로 뛰어내려요
// =====================================================
const JUMP_GRAVITY = 24, JUMP_SPEED = 7.5;
function jump() {
  if (modalOpen() || game.jumping) return;
  startAudio();
  if (game.inBoat) { toggleBoat(); return; }  // 보트에서 뛰어내리기
  if (game.sitting) return;                    // 앉아 있을 땐 먼저 일어나요 (WASD)
  // 내 보트가 가까이 떠 있으면 폴짝 뛰어서 다시 올라타요 (물속에서도 돼요)
  if (boat.group && boat.type === save.boat && Math.hypot(boat.x - person.position.x, boat.z - person.position.z) < 4.2 &&
      game.state !== 'charging' && game.state !== 'reeling') {
    if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
    const p = person.position, ty = boat.group.position.y + BOAT_TYPES[boat.type].seat - 0.6;
    const v = JUMP_SPEED * 1.1;
    const tFly = (v + Math.sqrt(v * v + 2 * JUMP_GRAVITY * Math.max(0, p.y - ty))) / JUMP_GRAVITY;
    game.jumping = true; game.jumpToBoat = true;
    game.jumpV = v;
    game.jumpVX = (boat.x - p.x) / tFly;
    game.jumpVZ = (boat.z - p.z) / tFly;
    player.ry = Math.atan2(p.x - boat.x, p.z - boat.z);
    tone(520, 0.08, 'square', 0.04); tone(780, 0.1, 'square', 0.03, 0.04);
    return;
  }
  if (game.swimming) return;                   // 물속에서는 못 뛰어요
  if (fishAnim && fishAnim.hold > 3) return;   // 큰 물고기 자랑하는 중
  game.jumping = true;
  game.jumpV = JUMP_SPEED;
  game.jumpVX = game.jumpVZ = 0;
  tone(520, 0.08, 'square', 0.04); tone(780, 0.1, 'square', 0.03, 0.04);
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
  if (e.code === 'KeyF' && !e.repeat) setFirstPerson(!cam.fp); // 1인칭 켜고 끄기
  if (e.code === 'KeyV' && !e.repeat) toggleBoat(); // 보트 타기/내리기
  // 달리기 켜기/끄기: Ctrl 을 한 번 눌렀다 떼요 (꾹 누른 채 W 를 누르면 브라우저 탭이 닫히니 조심!)
  if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) { e.preventDefault(); game.running = !game.running; $('runHud').classList.toggle('hidden', !game.running); }
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') && !e.repeat && opts.shiftLock) setShiftLock(!shiftLocked);
  // 숫자 키: 1 = 낚싯대, 2~9 = 물고기
  const dm = e.code.match(/^Digit([1-9])$/);
  if (dm) {
    const id = hotbarOrder()[Number(dm[1]) - 1];
    if (id !== undefined) toggleEquip(id);
  }
  // 스페이스: 낚시하는 중(던지는 중·찌 띄운 중·입질·당기기)이면 낚시, 아니면 점프!
  if (e.code === 'Space') {
    e.preventDefault();
    if (e.repeat) return;
    if (['charging', 'casting', 'bite', 'reeling', 'retracting'].includes(game.state)) pressStart();
    else jump();
  }
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
const cam = { yaw: 0.62, pitch: 0.46, dist: 11, fp: false }; // fp = 1인칭 (휠로 끝까지 당기거나 F 키)
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
// 휠: 멀리/가까이. 가장 가까운 데서 한 번 더 당기면 1인칭, 1인칭에서 밀면 다시 3인칭
canvas.addEventListener('wheel', (e) => {
  if (cam.fp) { if (e.deltaY > 0) setFirstPerson(false); return; }
  if (cam.dist <= 5.01 && e.deltaY < 0) { setFirstPerson(true); return; }
  cam.dist = Math.min(18, Math.max(5, cam.dist + e.deltaY * 0.01));
}, { passive: true });
function setFirstPerson(on) {
  cam.fp = on;
  hero.head.visible = !on; // 내 머리가 화면을 가리지 않게
  game.notice = on ? '1인칭이에요! 휠을 밀거나 F 키로 돌아가요.' : '';
  if (!on) cam.dist = 5;
  updateUI();
}

// 걸어갈 수 있는 곳인지 확인
const BOUNDS = { x0: -74, x1: 44, z0: -48, z1: 24 };
// 바다 쪽: 모래사장 + 바다 + 섬은 원래 경계 밖이어도 갈 수 있어요
const inSeaArea = (x, z) => ((x - SEA.x) / (SEA.rx + SEA.pad - 1)) ** 2 + ((z - SEA.z) / (SEA.rz + SEA.pad - 1)) ** 2 < 1;
const WADE = 0.32;  // 얕은 물에 들어가면 이만큼 잠겨요
const SWIM = 1.05;  // 깊은 물에서 헤엄칠 때는 이만큼 잠겨요 (머리만 물 위로)
const ISLAND_TOP = 0.25;
// function 으로 만들어서 게임이 켜지는 도중(이 줄보다 먼저)에 불러도 돼요
function inJunglePond(x, z) { return ((x - JUNGLE_POND.x) / JUNGLE_POND.rx) ** 2 + ((z - JUNGLE_POND.z) / JUNGLE_POND.rz) ** 2 < 1; }
const isSwimSpot = (x, z) => !onDock(x, z) && !onStairs(x, z) && !onIsland(x, z) && !onBridge(x, z) && !onBridge2(x, z) && inLake(x, z) && !isShallow(x, z);
// 발이 닿는 높이: 부두 / 계단 / 섬 / 깊은 물(수영) / 얕은 물 / 언덕 위 / 땅
function groundY(x, z) {
  if (onDock(x, z)) return 0.26;
  if (inJunglePond(x, z)) return JUNGLE_POND.y - WADE; // 섬 안 연못은 섬보다 먼저 봐요
  if (onStairs(x, z)) return stairHeight(z) - 0.08;
  if (onIsland(x, z)) return ISLAND_TOP;
  if (onBridge(x, z)) return BRIDGE.y;
  if (onBridge2(x, z)) return bridge2Y(x); // 오로라 강 돌다리
  const w = waterAt(x, z);
  if (w) return w.y - (isShallow(x, z) ? WADE : SWIM);
  if (onPlateau(x, z)) return PLATEAU_TOP;
  return -0.08;
}
// noSwim = true 면 깊은 물에는 못 들어가요 (돌아다니는 NPC 들은 헤엄치지 않아요)
function walkable(x, z, fromX, fromZ, noSwim = false) {
  if ((x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) && !inSeaArea(x, z)) return false;
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
const isWading = (x, z) => !onDock(x, z) && !onStairs(x, z) && !onIsland(x, z) && !onBridge(x, z) && !onBridge2(x, z) && inLake(x, z);

function updatePlayer(dt) {
  if (game.inBoat && boat.group) { updateBoat(dt); return; } // 보트 타는 중
  let ix = 0, iz = 0;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  // 모닥불에 앉아 있다가 방향키를 누르면 일어나요
  if (game.sitting && !modalOpen() && (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight)) {
    // 일어날 땐 통나무 밖으로 한 걸음 (모닥불 반대쪽) — 통나무 안에 끼지 않게
    standUp();
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
    // 헤엄칠 땐 조금 느리고, 달리기(Ctrl)를 켜면 빨라요
    const step = (game.swimming ? 3.0 : game.running ? 7.8 : 4.6) * dt;
    const p = person.position;
    if (walkable(p.x + dx * step, p.z, p.x, p.z)) p.x += dx * step;
    if (walkable(p.x, p.z + dz * step, p.x, p.z)) p.z += dz * step;
    if (!shiftLocked) {
      const want = Math.atan2(-dx, -dz);
      let diff = want - player.ry;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.ry += diff * Math.min(1, dt * 12);
    }
    player.walkT += dt * (game.running && !game.swimming ? 14 : 9);
  }
  // 시프트 락 중에는 항상 카메라가 보는 쪽을 바라봐요 (게 걸음 가능)
  if ((shiftLocked || cam.fp) && game.state !== 'reeling') player.ry = cam.yaw; // 1인칭도 보는 쪽을 바라봐요
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
  if (game.jumping) {
    // 점프 중: 위로 솟았다가 중력에 끌려 내려와요. 보트에서 뛰어내릴 땐 옆으로도 날아가요
    const p = person.position;
    if (game.jumpVX || game.jumpVZ) { p.x += game.jumpVX * dt; p.z += game.jumpVZ * dt; }
    game.jumpV -= JUMP_GRAVITY * dt;
    p.y += game.jumpV * dt;
    // 보트로 뛰는 중: 보트 자리 높이까지 내려오면 올라타요
    if (game.jumpToBoat && game.jumpV < 0 && boat.group && p.y <= boat.group.position.y + BOAT_TYPES[boat.type].seat - 0.6) {
      game.jumping = false; game.jumpToBoat = false; game.jumpVX = game.jumpVZ = 0;
      boardBoat();
      return;
    }
    if (game.jumpV < 0 && p.y <= gy + bob) { // 땅(또는 물)에 닿았어요
      if (game.jumpToBoat && boat.group) { game.jumpToBoat = false; boardBoat(); }
      p.y = gy + bob; game.jumping = false; game.jumpVX = game.jumpVZ = 0;
      if (game.swimming) plop(0.2, 0, 500, 200, 0.12);
    }
  } else person.position.y += (gy + bob - person.position.y) * Math.min(1, dt * 10);
  // 헤엄칠 땐 몸을 앞으로 눕혀요
  person.rotation.order = 'YXZ';
  const tilt = game.swimming ? (player.moving ? -0.55 : -0.15) : 0;
  person.rotation.x += (tilt - person.rotation.x) * Math.min(1, dt * 8);
  // 다리: 걸을 땐 성큼성큼, 헤엄칠 땐 빠르게 발장구
  const swing = game.jumping ? 0.5 : game.swimming ? Math.sin(performance.now() * 0.018) * 0.35 : player.moving ? Math.sin(player.walkT) * 0.6 : 0; // 점프 땐 다리를 앞뒤로 벌려요
  hero.legs[0].rotation.x += (swing - hero.legs[0].rotation.x) * Math.min(1, dt * 15);
  hero.legs[1].rotation.x += (-swing - hero.legs[1].rotation.x) * Math.min(1, dt * 15);
  if (game.sitting) {
    // 통나무에 앉은 자세: 다리를 앞으로, 몸을 통나무 높이에
    const st = game.sitting;
    person.position.set(st.x, st.y ?? -0.24, st.z);
    player.ry = st.ry;
    person.rotation.y = st.ry;
    person.rotation.x = st.lie ? -1.3 : 0; // 해먹은 뒤로 누워요
    if (st.swing) { // 그네: 줄에 매달린 의자와 같이 앞뒤로
      const a = Math.sin(performance.now() * 0.0024) * 0.55, g = st.swing, L = 1.86;
      g.rotation.x = a;
      const oz = -L * Math.sin(a), oy = -L * Math.cos(a);
      const c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
      person.position.set(g.position.x + oz * sn, g.position.y + oy - 0.5, g.position.z + oz * c);
    }
    hero.legs.forEach((l) => (l.rotation.x = Math.PI / 2));
  }

  // 가까운 상점 찾기
  game.nearShop = null;
  let shopD = Infinity;
  for (const s of shops) {
    const d = (person.position.x - s.pos.x) ** 2 + (person.position.z - s.pos.z) ** 2;
    if (d < 2.4 * 2.4 && d < shopD) { game.nearShop = s; shopD = d; } // 제일 가까운 곳으로
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
  // 한 글자씩 타닥타닥 나와요
  const tt = $('talkText');
  clearInterval(sayLine.timer);
  let i = 0;
  tt.textContent = '';
  sayLine.timer = setInterval(() => {
    i++;
    tt.textContent = text.slice(0, i);
    if (i % 3 === 1) tone(900 + Math.random() * 200, 0.03, 'square', 0.012); // 톡톡 소리
    if (i >= text.length) clearInterval(sayLine.timer);
  }, 32);
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
const whereOf = (f) => (f.weather === 'rain' ? '비 오는 날 큰 호수' : fishZone(f) === 'mountain' ? '산 위 연못' : fishZone(f) === 'aurora' ? '오로라 강' : '큰 호수');

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
// 모닥불 버프: 비싼 물고기(이로치면 값이 몇 배라 더 좋아요)일수록 운이 더 오르고 오래가요
//  $30 → 운 +4% · 1분 36초 / $3,000 → +12% · 3분 30초 / $300,000 → +20% · 5분 30초
function cookBuff(it) {
  const k = Math.log10(1 + Math.max(0, it.price) / 10);
  const luck = Math.round(Math.min(0.3, 0.02 + 0.04 * k) * 100) / 100;
  const secs = Math.round(Math.min(900, 60 + 60 * k) / 5) * 5;
  return { luck, secs };
}
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
  list.innerHTML = `<div class="count">${b ? `지금 버프: <b style="color:#ffd36b">운 +${Math.round(b.luck * 100)}%</b> (${Math.ceil((b.until - performance.now()) / 1000)}초 남음) · 더 좋은 걸 구우면 바뀌어요` : '물고기를 구워 먹으면 잠깐 운이 올라요. 비싼 물고기일수록 운이 더 오르고 더 오래가요.'}</div>`;
  if (!save.inv.length) { list.insertAdjacentHTML('beforeend', '<div class="count">구울 물고기가 없어요. 호수에서 낚아 오세요.</div>'); return; }
  for (let i = save.inv.length - 1; i >= 0; i--) {
    const it = save.inv[i];
    const f = findFish(it.name);
    const { luck, secs } = cookBuff(it);
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
  // 망원경으로 보는 중: 멀리 확대해서 봐요
  if (teleView && performance.now() < teleView.until) {
    camera.position.copy(teleView.from);
    if (camera.fov !== 14) { camera.fov = 14; camera.updateProjectionMatrix(); }
    camera.lookAt(teleView.target);
    sun.lookAt(camera.position); halo.lookAt(camera.position);
    return;
  }
  if (teleView) { teleView = null; camera.fov = 43; camera.updateProjectionMatrix(); }
  // 1인칭: 눈 높이에서 보는 쪽으로 (마우스 위아래 = 고개 들기/숙이기)
  if (cam.fp) {
    const look = (0.65 - cam.pitch) * 1.4;
    const fx = -Math.sin(cam.yaw) * Math.cos(look), fy = Math.sin(look), fz = -Math.cos(cam.yaw) * Math.cos(look);
    const eye = tmpV.set(p.x - Math.sin(cam.yaw) * 0.18, p.y + (game.sitting ? 1.25 : 1.62), p.z - Math.cos(cam.yaw) * 0.18);
    camera.position.copy(eye);
    camera.lookAt(eye.x + fx, eye.y + fy, eye.z + fz);
    sun.lookAt(camera.position); halo.lookAt(camera.position);
    return;
  }
  camDir.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
  let dist = cam.dist;
  camRay.set(tmpV.set(p.x, ty, p.z), camDir);
  camRay.far = cam.dist;
  const hit = camRay.intersectObjects([...shops.map((s) => s.group), terrain], true)[0];
  if (hit) dist = Math.max(1.5, hit.distance - 0.3);
  // 정글섬: 나무 줄기가 카메라와 나 사이에 끼면 카메라를 줄기 앞으로 당겨요 (줄기에 화면이 가려지지 않게)
  if (Math.hypot(p.x - JUNGLE.x, p.z - JUNGLE.z) < JUNGLE.r + 6) {
    dist = Math.min(dist, 10); // 너무 멀리 빼면 높은 나무 잎 속에 카메라가 들어가요
    const hl = Math.hypot(camDir.x, camDir.z) || 1, hx = camDir.x / hl, hz = camDir.z / hl, hd = dist * hl;
    for (const tr of seaWorld.trunks) {
      const cx = tr.x - p.x, cz = tr.z - p.z, t = cx * hx + cz * hz;
      if (t <= 0 || t >= hd) continue;
      if (Math.hypot(cx - t * hx, cz - t * hz) < tr.r + 0.35) dist = Math.min(dist, Math.max(1.5, t / hl - 0.5));
    }
  }
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

let waterAcc = 1; // 물결 다시 계산할 때까지 남은 시간
function animate(now) {
  requestAnimationFrame(animate);
  if (previous) tickFps(now - previous);
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
  // 물결은 1초에 30번만 다시 계산해요 (144Hz 모니터에서 매번 하면 너무 무거워요. 눈으로는 똑같아요)
  waterAcc += dt;
  if (waterAcc >= 1 / 30) for (const w of waterParts) {
    if (++w.tick % w.every) continue;
    const arr = w.geo.attributes.position.array, b = w.base;
    for (let i = 0; i < arr.length; i += 3) {
      // 월드 좌표 기준으로 물결을 만들어서 호수와 연못이 이어져 보여요
      arr[i + 2] = (Math.sin((b[i] + w.ox) * 0.36 + t * 0.8) * 0.055 + Math.cos((b[i + 1] - w.oz) * 0.42 + t * 0.65) * 0.035) * w.amp;
    }
    w.geo.attributes.position.needsUpdate = true;
    w.geo.computeVertexNormals();
  }
  if (waterAcc >= 1 / 30) waterAcc = 0;

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
    game.notice = game.blockMsg || '물이 아닌 곳에 떨어졌어요. 호수 쪽을 보고 던져 보세요.';
    game.blockMsg = null;
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
  // 오로라 강: 등불이 둥실둥실, 하늘 오로라가 물결치고, 풍차가 돌아요
  for (const l of auroraFX.lanterns) {
    const u = l.userData;
    l.position.y = u.base.y + Math.sin(t * 1.1 + u.ph) * 0.15;
    l.position.x = u.base.x + Math.sin(t * 0.3 + u.ph) * 0.4;
    l.rotation.y = t * 0.4 + u.ph;
  }
  for (const r of auroraFX.ribbons) {
    const arr = r.geometry.attributes.position.array, b = r.userData.base;
    for (let i = 0; i < arr.length; i += 3) arr[i + 2] = Math.sin(b[i] * 0.06 + t * 0.5 + r.userData.ph) * 6 + Math.sin(b[i] * 0.15 + t * 0.9) * 1.5;
    r.geometry.attributes.position.needsUpdate = true;
    r.material.opacity = 0.12 + stars.material.opacity * 0.45; // 밤에 더 진하게
  }
  if (auroraFX.blades) auroraFX.blades.rotation.z += dt * 0.6;
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
  // 공방 앞 전시대: 낚싯대가 천천히 돌고 살짝 떠올라요
  for (const d of displayRods) { d.holder.rotation.y = t * 0.6 + d.ph; d.holder.position.y = (d.base ?? 0.72) + ROD_LEN / 2 * 1.05 + Math.sin(t * 1.2 + d.ph) * 0.06; placeSpin(d.sp, t); }

  updateNPCs(now, dt, t);
  updateWalkers(now, dt, t);
  multi.update(now, dt, t);
  updateWade(t);
  updateShopBoats(t);
  updateHouses(t);
  updateIslandHud(now);
  // 꾸밈 효과들: 혹시 여기서 문제가 생겨도 게임 전체가 멈추지 않게 따로 감싸요
  try { updateFishFx(t); } catch (e) { console.warn('[이로치 이펙트]', e); } // 이로치 반짝이·지직
  try { updateGlitchDay(now); } catch (e) { console.warn('[글리치의 날]', e); }
  try { updateThings(t); } catch (e) { console.warn('[섬 물건]', e); }

  updateDressCam();
  updateCamera();
  updatePrompt();
  updateBubble();
  gfxAutoTick(dt);
  // '좋음'이 아니면 그림자는 두 장면에 한 번만 다시 그려요 (눈으로는 거의 똑같고 훨씬 가벼워요)
  shadowFrame++;
  renderer.shadowMap.needsUpdate = gfxNow === 'high' || shadowFrame % 2 === 0;
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
  if (patch.glitch !== undefined) setGlitchDay(!!patch.glitch); // 시험용: 글리치의 날 켜고 끄기
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
  if (game.inBoat && !['charging', 'casting', 'bite', 'reeling'].includes(game.state)) return 'sit';
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
    rod: game.rodOut ? save.rod : -1, f: held ? held.name : null, m: held ? held.mut : null, n: save.caught, bt: game.inBoat ? save.boat : -1,
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
  makeFishModel, findFish, fishScale, getMyState, onFeed: pushFeed, outfitToLook, makeBoatModel, getOutfit: () => save.outfit,
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

// =====================================================
//  계정(구글 로그인) — 로그인하면 기록이 계정에 저장돼서, 어느 컴퓨터에서든 이어서 해요
//  (설정값이 없으면 이 부분은 아무것도 안 해요)
// =====================================================
const CLOUD_UID_KEY = 'lakeFishing_cloudUid'; // 이 컴퓨터 기록이 어느 계정 거였는지
// var: 게임이 켜지는 도중(이 줄보다 먼저) 저장해도 오류가 안 나게
var cloud = { user: null, ready: false, pending: true, timer: 0, busy: false };
const cloudMsg = (t) => { const el = $('accountMsg'); if (el) el.textContent = t; };
function renderAccount() {
  $('accountRow').classList.toggle('hidden', !cloudEnabled);
  $('accountBtn').classList.toggle('hidden', !cloudEnabled);
  if (!cloudEnabled) return;
  const u = cloud.user;
  $('accountName').textContent = u ? `${u.name} 님으로 로그인했어요. 기록이 계정에 자동으로 저장돼요.` : '로그인하면 기록이 계정에 저장돼서 피씨방·다른 컴퓨터에서도 이어서 할 수 있어요.';
  $('accountLogin').classList.toggle('hidden', !!u);
  $('accountLogout').classList.toggle('hidden', !u);
  $('accountBtn').textContent = u ? `${u.name} 님` : '로그인';
}
// 기록을 바꾸면 조금 있다가(8초) 한 번에 올려요 (너무 자주 올리면 무료 한도를 넘어요)
function scheduleCloudSave() {
  if (!cloud || !cloud.user || cloud.pending || cloud.timer) return;
  cloud.timer = setTimeout(flushCloudSave, 8000);
}
async function flushCloudSave() {
  clearTimeout(cloud.timer); cloud.timer = 0;
  if (!cloud.user || cloud.pending || cloud.busy) return;
  cloud.busy = true;
  try { await saveCloud(cloud.user.uid, JSON.stringify(save), save.savedAt || Date.now()); cloudMsg('계정에 저장했어요.'); }
  catch (e) { cloudMsg('계정에 저장하지 못했어요. 인터넷 연결을 확인해 주세요. (이 컴퓨터에는 저장돼 있어요)'); console.warn('[로그인] 저장 실패', e); }
  cloud.busy = false;
}
// 계정 기록으로 바꾸기: 이 컴퓨터 기록을 덮어쓰고 새로고침
function useCloudSave(c, uid) {
  try { localStorage.setItem(SAVE_KEY, c.data); localStorage.setItem(CLOUD_UID_KEY, uid); } catch (_) {}
  location.reload();
}
// 지금 기록을 계정에 올리고 이 계정과 연결
async function useLocalSave(uid) {
  try { localStorage.setItem(CLOUD_UID_KEY, uid); } catch (_) {}
  cloud.pending = false;
  await flushCloudSave();
  reconcileHouses(); // 이 컴퓨터에서 산 집을 계정에 등록 (또는 이미 남의 집이면 돌려받기)
}
const summary = (s) => `돈 ${money(s.money)} · 잡은 수 ${s.caught.toLocaleString('en-US')}마리 · 낚싯대 ${RODS[s.rod].name}`;
async function onCloudUser(u) {
  cloud.user = u;
  cloud.pending = true;
  renderAccount();
  if (!u) { cloudMsg(''); if (seaWorld) seaWorld.houses.forEach(syncHouse); return; }
  cloudMsg('계정 기록을 확인하는 중…');
  let c;
  try { c = await loadCloud(u.uid); }
  catch (e) { cloudMsg('계정 기록을 불러오지 못했어요. 인터넷 연결이나 Firebase 설정을 확인해 주세요.'); console.warn('[로그인] 불러오기 실패', e); return; }
  let linked = null;
  try { linked = localStorage.getItem(CLOUD_UID_KEY); } catch (_) {}
  if (!c) { await useLocalSave(u.uid); game.notice = `로그인했어요! 이제 기록이 ${u.name} 님 계정에 저장돼요.`; updateUI(); return; }
  let cs;
  try { cs = cleanSave(JSON.parse(c.data)); } catch (_) { await useLocalSave(u.uid); return; } // 계정 기록이 깨졌으면 지금 걸로
  const localEmpty = save.money === 0 && save.caught === 0 && save.inv.length === 0;
  if (linked === u.uid || localEmpty) {
    // 같은 계정 기록이면(또는 이 컴퓨터가 새것이면) 더 최근 것을 써요
    if (localEmpty || (c.savedAt || 0) > (save.savedAt || 0)) { if (c.data !== JSON.stringify(save)) return useCloudSave(c, u.uid); }
    await useLocalSave(u.uid);
    cloudMsg(`${u.name} 님 계정과 연결됐어요.`);
    return;
  }
  // 다른 기록끼리 만났어요 → 어느 걸 쓸지 물어봐요
  $('cloudChoice').innerHTML = `<div class="count">계정에 저장된 기록과 이 컴퓨터의 기록이 달라요. 어느 걸로 할까요?<br>고르지 않은 기록은 사라져요.</div>
    <div class="setRow col"><div><div class="nm">계정 기록</div><div class="ds">${esc(summary(cs))}</div></div><button id="pickCloud" class="actBtn">계정 기록으로 하기</button></div>
    <div class="setRow col"><div><div class="nm">이 컴퓨터 기록</div><div class="ds">${esc(summary(save))}</div></div><button id="pickLocal" class="actBtn">이 컴퓨터 기록을 계정에 올리기</button></div>`;
  $('pickCloud').onclick = () => useCloudSave(c, u.uid);
  $('pickLocal').onclick = async () => { closePanels(); await useLocalSave(u.uid); game.notice = '이 컴퓨터 기록을 계정에 올렸어요.'; updateUI(); };
  openPanel($('cloudPanel'));
}
$('accountLogin').addEventListener('click', async () => {
  cloudMsg('구글 로그인 창을 여는 중… (팝업이 막히면 주소창 옆에서 허용해 주세요)');
  try { await signIn(); }
  catch (e) { cloudMsg(e && e.code === 'auth/popup-closed-by-user' ? '로그인을 취소했어요.' : '로그인하지 못했어요. 팝업 차단이나 Firebase 설정(허용 도메인)을 확인해 주세요.'); console.warn('[로그인]', e); }
});
$('accountLogout').addEventListener('click', async () => {
  await flushCloudSave();
  try { await signOutCloud(); } catch (_) {}
  game.notice = '로그아웃했어요. 기록은 이 컴퓨터에도 남아 있어요.'; updateUI();
});
$('accountBtn').addEventListener('click', (e) => { e.currentTarget.blur(); renderOpts(); openPanel($('setPanel')); });
// 창을 닫거나 다른 탭으로 가면 바로 올려요
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloud.timer) flushCloudSave(); });
window.addEventListener('pagehide', () => { if (cloud.timer) flushCloudSave(); });
renderAccount();
startCloud(onCloudUser);


// =====================================================
//  탈의실 — 옷과 액세서리를 바꾸면 주인공을 새로 만들어요
// =====================================================
function rebuildHero(outfit) {
  const nh = makeBlockPerson(outfitToLook(outfit));
  nh.group.scale.setScalar(1.2);
  nh.group.position.copy(person.position);
  nh.group.rotation.copy(person.rotation);
  // 낚싯대 · 머리 위 숫자 · 손에 든 물고기를 새 몸으로 옮겨요
  hero.armR.remove(rod); nh.armR.add(rod);
  person.remove(tag); nh.group.add(tag);
  if (heldFish) { person.remove(heldFish); nh.group.add(heldFish); }
  nh.armL.rotation.copy(hero.armL.rotation);
  nh.armR.rotation.copy(hero.armR.rotation);
  scene.remove(person);
  scene.add(nh.group);
  hero = nh;
  person = nh.group;
  if (window.__game) window.__game.player = person;
}
let dressCam = null;
function openDress() {
  renderDress();
  openPanel($('dressPanel'));
  // 카메라를 내 얼굴 쪽으로 돌려서 옷을 잘 보게 해요
  dressCam = { yaw: cam.yaw, dist: cam.dist, pitch: cam.pitch };
  cam.yaw = player.ry + Math.PI * 0.85; cam.dist = 6; cam.pitch = 0.25;
}
function setOutfit(key, val) {
  save.outfit = cleanOutfit({ ...save.outfit, [key]: val });
  writeSave();
  rebuildHero(save.outfit);
  multi.sendOutfit(save.outfit);
  renderDress();
}
function renderDress() {
  const o = save.outfit;
  const box = $('dressList');
  let html = '';
  for (const [k, spec] of Object.entries(OUTFIT_OPTS)) {
    html += `<div class="dressRow"><div class="nm">${spec.label}</div><div class="dressOpts">${spec.names.map((n, i) =>
      `<button class="optBtn${o[k] === i ? ' on' : ''}" data-k="${k}" data-v="${i}">${n}</button>`).join('')}</div></div>`;
  }
  for (const [k, label] of OUTFIT_COLOR_PARTS) {
    const none = OPTIONAL_PARTS.has(k) ? `<button class="sw none${o[k] === -1 ? ' on' : ''}" data-k="${k}" data-v="-1" title="없음">✕</button>` : '';
    html += `<div class="dressRow"><div class="nm">${label}</div><div class="dressOpts">${none}${OUTFIT_COLORS.map((c, i) =>
      `<button class="sw${o[k] === i ? ' on' : ''}" data-k="${k}" data-v="${i}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('')}</div></div>`;
  }
  html += `<div class="saveBtns" style="margin-top:6px"><button class="actBtn" id="dressReset">처음 옷으로</button></div>`;
  box.innerHTML = html;
  box.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => setOutfit(b.dataset.k, Number(b.dataset.v))));
  $('dressReset').addEventListener('click', () => { save.outfit = { ...DEFAULT_OUTFIT }; writeSave(); rebuildHero(save.outfit); multi.sendOutfit(save.outfit); renderDress(); });
}
// 탈의실 창이 닫히면 카메라를 원래대로
let dressShift = 0; // 탈의실 창만큼 화면을 옆(또는 위)으로 밀어 둔 정도
function updateDressCam() {
  const panel = $('dressPanel');
  if (dressCam && panel.classList.contains('hidden')) {
    cam.yaw = dressCam.yaw; cam.dist = dressCam.dist; cam.pitch = dressCam.pitch;
    dressCam = null;
  }
  // 옷 갈아입는 동안: 창이 캐릭터를 가리지 않게, 창이 없는 쪽 한가운데에 캐릭터가 오도록 화면을 밀어요
  //  넓은 화면 = 창이 오른쪽 → 캐릭터를 왼쪽으로 / 좁은 화면 = 창이 아래 → 캐릭터를 위로
  let want = 0, vertical = false;
  if (dressCam) {
    const r = panel.querySelector('.modalBox').getBoundingClientRect();
    vertical = innerWidth < 700;
    want = vertical ? (innerHeight - r.top) / 2 : (innerWidth - r.left) / 2;
  }
  dressShift += (want - dressShift) * 0.2; // 부드럽게 미끄러지듯
  if (Math.abs(dressShift) < 0.5 && !dressCam) {
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
    dressShift = 0;
    return;
  }
  camera.setViewOffset(innerWidth, innerHeight, vertical ? 0 : dressShift, vertical ? dressShift : 0, innerWidth, innerHeight);
}

// =====================================================
//  보트 — 보트 상점에서 사고, 보트 관리인한테 E 키로 불러 타고, 스페이스(점프)로 뛰어내려요
// =====================================================
const boat = { group: null, type: -1, x: 0, z: 0, ry: 0, speed: 0 };
function renderBoatShop() {
  const list = $('boatList');
  list.innerHTML = `<div class="count">가진 돈 ${money(save.money)} · 옆에 있는 보트 관리인한테 <b>E</b> 키를 누르면 보트를 불러 줘요. 내릴 땐 <b>스페이스</b>로 폴짝! 보트 위에서도 낚시할 수 있어요!</div>`;
  BOAT_TYPES.forEach((b, i) => {
    const owned = save.boats.includes(i);
    const row = document.createElement('div');
    row.className = 'rodRow';
    row.innerHTML = `<div class="info"><div class="nm">${b.name}</div><div class="ds">${b.desc}</div><div class="stat"><span>속도</span><div class="bar"><i style="width:${Math.round(b.speed / 10 * 100)}%"></i></div><span class="v">${b.speed}</span></div></div>`;
    const btn = document.createElement('button');
    btn.className = 'actBtn';
    if (!owned) {
      btn.textContent = money(b.price);
      btn.disabled = save.money < b.price;
      btn.onclick = () => {
        if (save.money < b.price) return;
        save.money -= b.price; save.boats.push(i); save.boat = i;
        writeSave(); updateUI(); renderBoatShop(); sfx.coin();
      };
    } else if (save.boat === i) { btn.textContent = '타는 중'; btn.disabled = true; }
    else { btn.textContent = '이걸로 타기'; btn.onclick = () => { save.boat = i; writeSave(); if (boat.group) removeBoat(); renderBoatShop(); }; }
    row.appendChild(btn);
    list.appendChild(row);
  });
}
const boatWaterOK = (x, z) => inLake(x, z) && !onIsland(x, z) && !onDock(x, z) && !onBridge(x, z) && !onBridge2(x, z) &&
  !colliders.some((c) => c.r > 0.9 && (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.6) ** 2); // 바다 바위 기둥 같은 큰 것에 부딪혀요
function removeBoat() { if (boat.group) scene.remove(boat.group); boat.group = null; game.inBoat = false; }
function spawnBoat(x, z, ry) {
  removeBoat();
  boat.type = save.boat;
  boat.group = makeBoatModel(save.boat);
  boat.x = x; boat.z = z; boat.ry = ry; boat.speed = 0;
  scene.add(boat.group);
  placeBoat(0);
}
function placeBoat(t) {
  const w = waterAt(boat.x, boat.z);
  const y = (w ? w.y : 0.02) + Math.sin(t * 1.6) * 0.03;
  boat.group.position.set(boat.x, y, boat.z);
  boat.group.rotation.set(Math.sin(t * 1.3) * 0.02, boat.ry, Math.sin(t * 1.1) * 0.03);
}
function toggleBoat() {
  if (game.inBoat) {
    // 내리기: 근처 땅(또는 얕은 물)을 찾아서 내려요. 없으면 옆 물속으로 풍덩
    let spot = null;
    for (let r = 1.6; r <= 3.2 && !spot; r += 0.4) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = boat.x + Math.cos(a) * r, z = boat.z + Math.sin(a) * r;
      if (walkable(x, z) && !isSwimSpot(x, z)) { spot = { x, z }; break; }
    }
    if (!spot) spot = { x: boat.x + Math.cos(boat.ry) * 1.4, z: boat.z - Math.sin(boat.ry) * 1.4 };
    if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
    game.inBoat = false;
    // 폴짝 뛰어내려요: 보트 자리에서 출발해서, 땅에 닿는 시간에 맞춰 옆으로 날아가요
    const p = person.position, ty = groundY(spot.x, spot.z);
    const tFly = (JUMP_SPEED + Math.sqrt(JUMP_SPEED ** 2 + 2 * JUMP_GRAVITY * Math.max(0, p.y - ty))) / JUMP_GRAVITY;
    game.jumping = true;
    game.jumpV = JUMP_SPEED;
    game.jumpVX = (spot.x - p.x) / tFly;
    game.jumpVZ = (spot.z - p.z) / tFly;
    player.ry = Math.atan2(p.x - spot.x, p.z - spot.z); // 뛰는 쪽을 바라봐요
    hero.legs.forEach((l) => (l.rotation.x = 0));
    tone(520, 0.08, 'square', 0.04); tone(780, 0.1, 'square', 0.03, 0.04);
    return;
  }
  if (save.boat < 0) { game.notice = '보트 상점(호숫가)에서 보트를 먼저 사요.'; updateUI(); return; }
  if (game.state === 'charging' || game.state === 'reeling') return;
  const p = person.position;
  // 띄워 둔 내 보트가 가까이 있을 때만 V 로 다시 탈 수 있어요. 새로 띄우는 건 보트 관리인이 해 줘요
  if (!(boat.group && boat.type === save.boat && Math.hypot(boat.x - p.x, boat.z - p.z) < 3.2)) {
    game.notice = '가까운 보트 관리인(호숫가·모래사장·섬 선착장)한테 가서 E 키를 누르면 보트를 불러 줘요.'; updateUI(); return;
  }
  boardBoat();
}
// 보트 관리인한테 E: 앞 물에 내 보트를 띄우고 바로 태워 줘요 (전에 띄운 보트는 사라져요)
function summonBoat(c) {
  if (game.inBoat) return;
  if (save.boat < 0) { game.notice = '보트가 없어요. 옆 보트 상점에서 먼저 사 와요!'; updateUI(); return; }
  if (game.state === 'charging' || game.state === 'reeling') return;
  spawnBoat(c.wx, c.wz, Math.atan2(c.x - c.wx, c.z - c.wz)); // 뱃머리가 호수 쪽 (보트 앞은 -z)
  boardBoat();
  sfx.coin();
}
// 보트에 올라타기
function boardBoat() {
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  game.inBoat = true;
  game.swimming = false;
  game.sitting = null;
  game.notice = `${BOAT_TYPES[save.boat].name}에 탔어요! WASD 로 움직이고, 스페이스로 뛰어내려요.`;
  updateUI();
  plop(0.18, 0, 700, 300, 0.1);
}
// 보트 타는 중: 방향키로 움직이고 주인공은 보트에 앉아요
function updateBoat(dt) {
  let ix = 0, iz = 0;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  const canMove = !modalOpen() && game.state !== 'charging' && game.state !== 'reeling';
  player.moving = canMove && (ix !== 0 || iz !== 0);
  const bt = BOAT_TYPES[boat.type];
  let target = 0;
  if (player.moving) {
    if (game.state === 'casting' || game.state === 'bite') retract();
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let dx = fx * -iz + rx * ix, dz = fz * -iz + rz * ix;
    const len = Math.hypot(dx, dz); dx /= len; dz /= len;
    let diff = Math.atan2(-dx, -dz) - boat.ry;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    boat.ry += diff * Math.min(1, dt * 2.6);             // 배는 천천히 돌아요
    target = bt.speed * (game.running ? 1.25 : 1) * Math.max(0.2, Math.cos(diff));
  }
  boat.speed += (target - boat.speed) * Math.min(1, dt * 1.8); // 천천히 출발하고 미끄러지듯 멈춰요
  const nx = boat.x - Math.sin(boat.ry) * boat.speed * dt, nz = boat.z - Math.cos(boat.ry) * boat.speed * dt;
  if (boatWaterOK(nx, nz)) { boat.x = nx; boat.z = nz; } else boat.speed *= 0.3; // 물가에 닿으면 멈칫
  const t = performance.now() * 0.001;
  placeBoat(t);
  // 주인공: 보트 자리에 앉기
  const seatY = boat.group.position.y + BOAT_TYPES[boat.type].seat - 0.6;
  person.position.set(boat.x + Math.sin(boat.ry) * 0.25, seatY, boat.z + Math.cos(boat.ry) * 0.25);
  player.ry = shiftLocked ? cam.yaw : boat.ry;
  person.rotation.set(0, player.ry, 0);
  hero.legs.forEach((l) => (l.rotation.x = Math.PI / 2));
  if (player.moving) player.walkT += dt * 6;
  game.nearShop = null; game.nearTalk = null; game.nearFire = false;
}
// =====================================================
//  집 — 바다 섬의 큰 집을 사면 문이 열리고, 안의 어항에 물고기를 전시할 수 있어요
// =====================================================
let tankHouse = null;
// 집 주인 목록 (Firebase): { 집id: { owner: 계정 번호, name, style } }. null = 아직 모름(로그인 설정 전·못 읽음)
let houseOwners = null;
const myUid = () => (typeof cloud !== 'undefined' && cloud && cloud.user ? cloud.user.uid : null);
function houseOwned(h) { return save.homes.includes(h.id); }
// 다른 사람이 주인인 집이면 그 사람 정보
function houseOther(h) {
  if (houseOwned(h) || !houseOwners) return null;
  const o = houseOwners[h.id];
  return o && o.owner !== myUid() ? o : null;
}
// 문 열기/닫기 + 디자인 + 이름표 (내 집만 문이 열려 있어요)
function syncHouse(h) {
  const own = houseOwned(h);
  if (own && !h.open) {
    h.open = true;
    for (const c of h.doorCol) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    h.door.rotation.y = -Math.PI / 2;            // 문이 안쪽으로 활짝
    h.door.position.x = h.x - 0.85; h.door.position.z = h.z0 + 0.9;
  } else if (!own && h.open) {
    h.open = false;                               // 다시 잠가요 (집을 내놓았거나 다른 사람 집이 됐을 때)
    for (const c of h.doorCol) if (!colliders.includes(c)) colliders.push(c);
    h.door.rotation.y = 0;
    h.door.position.x = h.x; h.door.position.z = h.z0;
    for (const f of h.fish) scene.remove(f.model);
    h.fish = [];
  }
  const other = houseOther(h);
  // 디자인: 내 집이면 내가 고른 것, 남의 집이면 주인이 고른 것, 아니면 처음 디자인
  h.setStyle(own && save.houseStyles[h.id] !== undefined ? save.houseStyles[h.id] : other && other.style !== null ? other.style : h.defaultStyle);
  const entry = shops.find((s) => s.kind === 'house' && s.house === h);
  if (entry) entry.title = own ? `${h.name} · 내 집 (E 로 디자인 바꾸기)` : other ? `${h.name} · ${other.name} 님의 집` : `${h.name} · ${money(h.price)} (E 로 구경·구매)`;
  if (own) rebuildTankFish(h);
}
// 내 집 하나를 잃을 때 (다른 사람이 먼저 샀거나, 내가 내놓을 때): 어항 물고기는 가방으로, 돈은 refund 만큼 돌려받아요
function loseHouse(h, refund) {
  const fish = save.tanks[h.id] || [];
  save.inv.push(...fish);
  delete save.tanks[h.id];
  delete save.houseStyles[h.id];
  save.homes = save.homes.filter((x) => x !== h.id);
  save.money = Math.min(MAX_MONEY, save.money + refund);
  writeSave();
  syncHouse(h); renderHotbar(); updateUI();
}
// 로그인했고 주인 목록을 알면: 이 컴퓨터에서 산 집을 계정에 등록하거나, 이미 남의 집이면 돌려받아요
let reconciling = false;
async function reconcileHouses() {
  if (reconciling || !houseOwners || !myUid() || cloud.pending) return;
  reconciling = true;
  for (const h of seaWorld.houses) {
    if (!houseOwned(h)) continue;
    const o = houseOwners[h.id];
    if (o && o.owner === myUid()) continue;
    if (o) { // 다른 사람이 먼저 샀어요 → 돈과 물고기를 돌려받아요
      loseHouse(h, h.price);
      game.notice = `${h.name}은(는) ${o.name} 님이 먼저 샀어요. 낸 돈 ${money(h.price)}과 어항 물고기를 돌려받았어요.`; updateUI();
      continue;
    }
    try { await claimHouse(h.id, myUid(), cloud.user.name, save.houseStyles[h.id] ?? h.defaultStyle); } // 아직 주인이 없으면 내 걸로 등록
    catch (e) { if (e.code !== 'taken') console.warn('[집] 등록 실패', e); }
  }
  reconciling = false;
}
function onHouseOwners(map) {
  houseOwners = map;
  seaWorld.houses.forEach(syncHouse);
  reconcileHouses();
}

// 앉아 있다가 일어나기 (모닥불 통나무면 불 반대쪽으로 한 걸음, 집 가구면 정해 둔 자리로)
function standUp() {
  const st = game.sitting;
  if (!st) return;
  if (st.stand) { person.position.set(st.stand[0], groundY(st.stand[0], st.stand[1]), st.stand[1]); }
  else {
    const ax = st.x - campfire.pos.x, az = st.z - campfire.pos.z, l = Math.hypot(ax, az) || 1;
    person.position.x = st.x + (ax / l) * 0.95;
    person.position.z = st.z + (az / l) * 0.95;
    person.position.y = -0.08;
  }
  game.sitting = null;
}
// =====================================================
//  집 가구 쓰기: 소파(앉기) · 침대(자고 나면 아침 + 상쾌함) · 벽난로(불 켜기/끄기) · 책장(낚시 꿀팁)
//               식탁(차 마시기 + 따뜻함) · 피아노(연주)
// =====================================================
const BOOK_TIPS = [
  '「낚시 꿀팁」 밤에는 운이 조금 더 좋아요. 노을이 지면 낚싯대를 꺼내 보세요.',
  '「바다 이야기」 바다 저 멀리엔 범고래가 산대요. 신화 등급이라 아주 드물어요.',
  '「이로치 도감」 이로치는 최대 3개까지 겹쳐요. 글리치는 혼자서도 12배!',
  '「오로라 강의 비밀」 오로라 강엔 거대한 물고기가 살지만, 싸고 예쁜 작은 물고기도 많아요.',
  '「모닥불 요리책」 비싼 물고기를 구울수록 운이 더 오르고 더 오래가요.',
  '「비 오는 날」 비가 오면 큰 호수에 무지개 붕어가 나타난대요.',
  '「섬 지도」 모래사장 부두 앞 표지판에 섬들의 방향이 적혀 있어요.'
];
// 약한 버프만 주는 가구 (지금 더 센 버프가 있으면 그대로 둬요)
function softBuff(luck, secs) {
  const now = performance.now();
  if (!game.buff || now > game.buff.until || game.buff.luck < luck) game.buff = { luck, until: now + secs * 1000 };
}
function useFurniture(h, f) {
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  if (game.rodOut || game.selected) equip(null);
  if (f.seat) {
    // 앉기 (소파·식탁 의자·피아노 의자)
    game.sitting = { ...f.seat, stand: f.stand, house: true };
  }
  if (f.type === 'sofa') { game.notice = '푹신한 소파에 앉았어요. E 또는 방향키로 일어나요.'; }
  else if (f.type === 'bed') {
    // 잠깐 화면이 깜깜해졌다가 아침이 돼요
    const fade = $('sleepFade');
    fade.classList.add('on');
    tone(392, 0.4, 'sine', 0.05); tone(330, 0.5, 'sine', 0.05, 0.4); tone(262, 0.7, 'sine', 0.05, 0.9);
    setTimeout(() => {
      tod = 0.8; // 아침 7시쯤
      softBuff(0.06, 240);
      game.notice = '푹 잤어요! 상쾌한 아침이에요. (상쾌함: 운 +6% · 4분)';
      updateUI();
      fade.classList.remove('on');
    }, 1300);
    game.notice = '쿨쿨…';
  } else if (f.type === 'fire') {
    h.fireOn = !h.fireOn;
    game.notice = h.fireOn ? '벽난로에 불을 붙였어요. 따뜻해요.' : '벽난로 불을 껐어요.';
    noise(0.05, 0, 0.6, 3000, 1500, 'highpass', 0.3);
  } else if (f.type === 'book') {
    game.notice = BOOK_TIPS[Math.floor(Math.random() * BOOK_TIPS.length)];
    tone(880, 0.06, 'triangle', 0.03);
  } else if (f.type === 'tea') {
    softBuff(0.03, 150);
    game.notice = '따뜻한 차를 한 잔 마셨어요. (따뜻함: 운 +3% · 2분 30초) E 로 일어나요.';
    tone(523, 0.1, 'triangle', 0.05); tone(659, 0.12, 'triangle', 0.05, 0.12);
  } else if (f.type === 'piano') {
    // 짧은 노래 한 소절 (도레미…)
    const notes = [523, 587, 659, 523, 659, 698, 784, 0, 784, 880, 784, 698, 659, 523];
    notes.forEach((n, i) => { if (n) tone(n, 0.28, 'triangle', 0.06, i * 0.22); });
    game.notice = '피아노를 띵동띵동 쳤어요. E 로 일어나요.';
  }
  updateUI();
}
// =====================================================
//  섬·모래사장 물건 쓰기: 해먹(눕기) · 그네(타기) · 망원경(정글섬 보기) · 보물 상자(가끔 돈) · 징(정글의 기운)
// =====================================================
let teleView = null;
const CHEST_COOLDOWN = 15 * 60 * 1000; // 보물 상자는 15분마다 다시 차요
function useThing(t) {
  if (game.state === 'casting' || game.state === 'bite' || game.state === 'retracting') retract(true);
  const front = (d) => [t.x - Math.sin(t.ry || 0) * d, t.z - Math.cos(t.ry || 0) * d];
  if (t.type === 'hammock') {
    if (game.rodOut || game.selected) equip(null);
    game.sitting = { x: t.x, y: (t.y ?? -0.08) + 0.35, z: t.z, ry: (t.ry || 0) + Math.PI / 2, lie: true, house: true, stand: front(1.4) };
    game.notice = '해먹에 누웠어요. 살랑살랑… (E 또는 방향키로 일어나요)';
  } else if (t.type === 'swing') {
    if (game.rodOut || game.selected) equip(null);
    game.sitting = { x: t.x, y: (t.y ?? -0.08) + 0.04, z: t.z, ry: (t.ry || 0) + Math.PI, swing: t.swingGroup, house: true, stand: front(1.6) };
    game.notice = '그네를 타요! 바다가 보여요. (E 또는 방향키로 내려요)';
  } else if (t.type === 'telescope') {
    const J = seaWorld.islands.find((i) => i.id === 'jungle');
    teleView = { until: performance.now() + 4500, from: new THREE.Vector3(t.x, 1.9, t.z), target: new THREE.Vector3(J.x, 4, J.z) };
    game.notice = '망원경으로 보니 저 멀리 정글섬이 보여요! (동남쪽)';
    tone(660, 0.1, 'triangle', 0.04);
  } else if (t.type === 'chest') {
    const last = save.chests[t.id] || 0, nowMs = Date.now();
    if (nowMs - last < CHEST_COOLDOWN) {
      const m = Math.ceil((CHEST_COOLDOWN - (nowMs - last)) / 60000);
      game.notice = `상자가 비어 있어요. ${m}분쯤 뒤에 다시 와 봐요.`;
    } else {
      const jungle = t.id === 'chest_jungle';
      const gold = jungle ? 20000 + Math.floor(Math.random() * 60000) : 500 + Math.floor(Math.random() * 2500);
      save.chests[t.id] = nowMs;
      save.money = Math.min(MAX_MONEY, save.money + gold);
      writeSave(); sfx.coin();
      tone(784, 0.1, 'triangle', 0.06); tone(988, 0.12, 'triangle', 0.06, 0.1); tone(1318, 0.18, 'triangle', 0.06, 0.2);
      game.notice = `보물 상자를 열었어요! ${money(gold)}을 찾았어요.`;
    }
  } else if (t.type === 'gong') {
    tone(110, 1.6, 'sine', 0.12); tone(165, 1.4, 'sine', 0.06, 0.02); tone(220, 1.0, 'triangle', 0.03, 0.04);
    softBuff(0.05, 180);
    game.notice = '데에엥~ 정글의 기운이 느껴져요. (운 +5% · 3분)';
  }
  updateUI();
}
function updateThings(t) {
  for (const th of seaWorld.things) if (th.swingGroup && !(game.sitting && game.sitting.swing === th.swingGroup)) th.swingGroup.rotation.x *= 0.95; // 아무도 안 타면 멈춰요
  const fx = seaWorld.jungleFx;
  if (fx.gem) { fx.gem.rotation.y = t * 0.8; fx.gem.position.y += (Math.sin(t * 1.5) * 0.002); }
  fx.flames.forEach((f, i) => f.scale.set(1 + Math.sin(t * 11 + i) * 0.12, 0.85 + Math.sin(t * 8 + i * 2) * 0.25, 1 + Math.cos(t * 9 + i) * 0.12));
}
// 디자인 후보 목록: 색 견본(벽·창틀·지붕·소파) + 이름 + 고르기 버튼
function designList(h) {
  const wrap = document.createElement('div');
  wrap.innerHTML = '<h3 class="chartH">집 디자인 고르기 (공짜로 언제든 바꿀 수 있어요)</h3>';
  const grid = document.createElement('div');
  grid.className = 'designGrid';
  HOUSE_STYLES.forEach((st, i) => {
    const card = document.createElement('button');
    card.className = 'designCard' + (h.style === i ? ' on' : '');
    const sw = (c) => `<i style="background:#${c.toString(16).padStart(6, '0')}"></i>`;
    card.innerHTML = `<div class="dsw">${sw(st.wall)}${sw(st.trim)}${sw(st.roof)}${sw(st.sofa)}</div><div class="dnm">${esc(st.name)}</div><div class="dst">${h.style === i ? '지금 디자인' : '이걸로 꾸미기'}</div>`;
    card.onclick = () => {
      save.houseStyles[h.id] = i;
      writeSave();
      h.setStyle(i);
      if (myUid() && houseOwners) setHouseStyleCloud(h.id, myUid(), i).catch(() => {}); // 다른 사람 화면에도
      sfx.coin();
      game.notice = `${h.name}을(를) '${st.name}' 디자인으로 바꿨어요!`;
      updateUI();
      openHouse(h);
    };
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}
function openHouse(h) {
  const box = $('houseInfo');
  const own = houseOwned(h);
  const other = houseOther(h);
  const slots = HOUSE_INFO[h.id].slots;
  box.innerHTML = `<div class="count"><b>${esc(h.name)}</b> — 섬 위의 커다란 집이에요. 안에는 소파·침대·벽난로·책장, 그리고 물고기 <b>${slots}마리</b>를 전시할 수 있는 커다란 어항이 있어요.${own ? '' : ` 사면 디자인 ${HOUSE_STYLES.length}가지 중에서 골라 꾸밀 수 있어요.`}<br>집은 섬마다 한 채, <b>먼저 산 사람이 주인</b>이고 한 사람당 한 채만 살 수 있어요.</div>`;
  const btn = document.createElement('button');
  btn.className = 'actBtn';
  if (own) {
    box.appendChild(designList(h));
    // 집 내놓기: 반값을 돌려받고, 다른 사람이 살 수 있게 비워요
    const sell = document.createElement('button');
    sell.className = 'actBtn';
    sell.style.marginTop = '10px';
    sell.textContent = `집 내놓기 (${money(Math.floor(h.price / 2))} 돌려받기)`;
    sell.onclick = async () => {
      if (!confirm(`${h.name}을(를) 내놓을까요?\n\n${money(Math.floor(h.price / 2))}을 돌려받고, 어항 물고기는 가방으로 돌아와요. 다른 사람이 살 수 있게 돼요.`)) return;
      if (myUid() && houseOwners && houseOwners[h.id] && houseOwners[h.id].owner === myUid()) {
        try { await releaseHouse(h.id); } catch (e) { game.notice = '집을 내놓지 못했어요. 인터넷 연결을 확인해 주세요.'; updateUI(); return; }
      }
      loseHouse(h, Math.floor(h.price / 2));
      closePanels();
      game.notice = `${h.name}을(를) 내놓았어요.`; updateUI();
    };
    box.appendChild(sell);
    return openPanel($('housePanel'));
  }
  if (other) {
    btn.textContent = `${other.name} 님의 집이에요`;
    btn.disabled = true;
  } else if (cloudEnabled && !myUid()) {
    btn.textContent = '로그인해야 살 수 있어요 (설정 → 계정)';
    btn.onclick = () => { closePanels(); renderOpts(); openPanel($('setPanel')); };
  } else if (save.homes.length) {
    btn.textContent = '집은 한 사람당 한 채만 살 수 있어요';
    btn.disabled = true;
  } else {
    btn.textContent = `${money(h.price)}에 사기 (가진 돈 ${money(save.money)})`;
    btn.disabled = save.money < h.price;
    btn.onclick = async () => {
      if (save.money < h.price || houseOwned(h) || save.homes.length) return;
      btn.disabled = true; btn.textContent = '사는 중…';
      if (cloudEnabled) {
        // 먼저 산 사람이 주인: Firebase 에 "내가 주인"이라고 적는 데 성공해야 살 수 있어요
        try { await claimHouse(h.id, myUid(), cloud.user.name, h.defaultStyle); }
        catch (e) {
          game.notice = e.code === 'taken' ? '아쉬워요! 방금 다른 사람이 먼저 샀어요.' : '집을 사지 못했어요. 인터넷 연결이나 Firebase 보안 규칙을 확인해 주세요.';
          if (e.code !== 'taken') console.warn('[집] 사기 실패', e);
          closePanels(); updateUI(); return;
        }
      }
      save.money -= h.price;
      save.homes.push(h.id);
      save.tanks[h.id] = [];
      writeSave(); syncHouse(h); sfx.coin();
      if (typeof flushCloudSave === 'function') flushCloudSave(); // 계정에도 바로 저장
      closePanels();
      game.notice = `${h.name}을(를) 샀어요! 이제 ${h.name}의 주인이에요. 문이 열렸어요.`;
      updateUI();
    };
  }
  box.appendChild(btn);
  openPanel($('housePanel'));
}
// 어항 창: 위는 전시 중인 물고기(꺼내기), 아래는 가방 물고기(넣기)
function renderTank() {
  const h = tankHouse;
  if (!h) return;
  const list = $('tankList');
  const tank = save.tanks[h.id] || (save.tanks[h.id] = []);
  const slots = HOUSE_INFO[h.id].slots;
  const row = (it, label, fn) => {
    const r = document.createElement('div');
    r.className = 'sellRow';
    r.innerHTML = `<span class="nm">${mutHTML(it.mut) ? mutHTML(it.mut) + ' ' : ''}${esc(it.name)} <span style="color:#aaa;font-weight:400">${esc(fmtKg(it.weight))}</span></span><span class="pr">${money(it.price)}</span>`;
    const b = document.createElement('button');
    b.className = 'actBtn'; b.textContent = label; b.onclick = fn;
    r.appendChild(b);
    return r;
  };
  list.innerHTML = `<h3 class="chartH">어항 (${tank.length} / ${slots})</h3>`;
  if (!tank.length) list.insertAdjacentHTML('beforeend', '<div class="count">아직 비어 있어요. 아래 가방에서 물고기를 넣어 보세요.</div>');
  tank.forEach((it) => list.appendChild(row(it, '꺼내기', () => {
    save.tanks[h.id] = save.tanks[h.id].filter((x) => x !== it);
    save.inv.push(it);
    writeSave(); rebuildTankFish(h); renderHotbar(); renderTank(); updateUI();
  })));
  list.insertAdjacentHTML('beforeend', `<h3 class="chartH">가방 (${save.inv.length}마리)</h3>`);
  if (!save.inv.length) list.insertAdjacentHTML('beforeend', '<div class="count">가방에 물고기가 없어요.</div>');
  for (let i = save.inv.length - 1; i >= 0; i--) {
    const it = save.inv[i];
    const r = row(it, '넣기', () => {
      if ((save.tanks[h.id] || []).length >= slots) { game.notice = '어항이 꽉 찼어요. 하나 꺼내고 넣어요.'; updateUI(); return; }
      if (game.selected === it.id) equip(null);
      save.inv = save.inv.filter((x) => x !== it);
      save.tanks[h.id].push(it);
      writeSave(); rebuildTankFish(h); renderHotbar(); renderTank(); updateUI();
    });
    if (tank.length >= slots) r.querySelector('button').disabled = true;
    list.appendChild(r);
  }
}
// 어항 속 물고기 모형 다시 만들기 (어항 크기에 맞게 줄여요)
function rebuildTankFish(h) {
  for (const f of h.fish) scene.remove(f.model);
  h.fish = [];
  const T = h.tank;
  for (const it of save.tanks[h.id] || []) {
    const f = findFish(it.name);
    if (!f) continue;
    const model = makeFishModel(f, it.mut, it.weight);
    const len = f.look.L * fishScale(f, it.weight);
    model.scale.multiplyScalar(Math.min(1, 0.75 / Math.max(0.1, len))); // 어항에 쏙 들어가게
    scene.add(model);
    h.fish.push({ model, ph: Math.random() * 10, sp: 0.25 + Math.random() * 0.25, y: T.y + Math.random() * T.h, z: T.z + (Math.random() - 0.5) * T.d, flop: f.name === '물 만난 광어' });
  }
}
// 섬 안내: 모래사장이나 바다에 있으면 화면 위에 가까운 섬 2곳의 방향(화살표)과 거리를 보여 줘요
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
let islandHudAt = 0;
function updateIslandHud(now) {
  if (now - islandHudAt < 400) return;
  islandHudAt = now;
  const el = $('islandHud');
  const p = person.position;
  const show = p.z > 14 && !modalOpen();
  if (!show) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
  const near = seaWorld.islands.map((it) => ({ it, d: Math.hypot(it.x - p.x, it.z - p.z) })).sort((a, b) => a.d - b.d);
  const on = near[0].d < near[0].it.r;
  // 안내는 정글섬만 (집 섬들은 안내에서 빼요)
  const parts = near.filter((n) => n.it.id === 'jungle' && n.d >= n.it.r).map(({ it, d }) => {
    // 카메라가 보는 쪽 기준으로 화살표 (↑ = 화면 앞쪽)
    let a = Math.atan2(-(it.x - p.x), -(it.z - p.z)) - cam.yaw;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const k = ((Math.round(-a / (Math.PI / 4)) % 8) + 8) % 8;
    return `${it.name} ${ARROWS[k]} ${Math.round(d)}m`;
  });
  const text = on ? `여기는 ${near[0].it.name}${parts.length ? ' · ' + parts.join(' · ') : ''}` : '섬 안내 · ' + parts.join(' · ');
  if (el.textContent !== text) el.textContent = text;
  el.classList.remove('hidden');
}
function updateHouses(t) {
  for (const h of seaWorld.houses) {
    // 집 안에 들어가면 지붕을 숨겨서 안이 보여요
    const inside = h.inside(person.position.x, person.position.z);
    if (h.roofGroup.visible === inside) h.roofGroup.visible = !inside;
    if (inside) rainLines.visible = false; // 집 안에는 비가 안 와요
    // 벽난로: 켜져 있으면 불꽃이 일렁이고, 집 안에 있을 땐 주황 불빛도 비춰요
    h.fire.visible = h.fireOn;
    if (h.fireOn) h.fire.children.forEach((f, i) => { f.scale.set(1, 0.8 + Math.sin(t * 9 + i * 2) * 0.25, 1); });
    const want = h.fireOn && inside ? 3.5 + Math.sin(t * 7) * 0.6 : 0;
    if (h.fireLight.intensity !== want) h.fireLight.intensity = want;
    // 어항 물고기: 좌우로 왔다 갔다 헤엄쳐요
    const T = h.tank;
    for (const f of h.fish) {
      const s = Math.sin(t * f.sp + f.ph);
      f.model.position.set(T.x + s * T.w / 2, f.y + Math.sin(t * 1.3 + f.ph) * 0.08, f.z + Math.sin(t * 0.7 + f.ph) * 0.1);
      f.model.rotation.set(0, Math.cos(t * f.sp + f.ph) > 0 ? 0 : Math.PI, f.flop ? Math.sin(t * 17) * 0.6 : Math.sin(t * 6 + f.ph) * 0.08);
    }
  }
}
seaWorld.houses.forEach(syncHouse);
watchHouses(onHouseOwners); // 집 주인 목록 지켜보기 (누가 어느 집 주인인지)

function updateShopBoats(t) {
  for (const b of shopBoats) { b.m.position.y = LAKE.y + Math.sin(t * 1.4 + b.ph) * 0.03; b.m.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.03; }
  if (boat.group && !game.inBoat) placeBoat(t); // 세워 둔 보트도 살랑살랑
}

applyRod();
rebuildHero(save.outfit); // 저장해 둔 옷 입기
renderHotbar();
updateQuestHud();
updateUI();
requestAnimationFrame(animate);
