// =====================================================
//  계절 — 봄 · 여름 · 가을 · 겨울이 돌아가요 (계절 하나 = 진짜 시간 8분)
//
//  계절은 진짜 시계로 정해서, 멀티에서 같이 노는 친구들도 모두 같은 계절이에요.
//   봄  : 벚꽃 잎이 흩날리고 벚나무가 피어요. 봄에만 나오는 물고기 · 꽃
//   여름: 해바라기 · 파라솔 · 밤에는 반딧불이가 반짝반짝
//   가을: 단풍잎이 떨어지고 나무가 알록달록. 허수아비 · 호박 · 낙엽 더미
//   겨울: 눈이 펑펑, 나무와 풀 위에 눈이 쌓여요. 눈사람 · 얼음낚시 텐트 · 크리스마스 트리
//
//  나무 색을 바꾸는 방법: 블록에 칠해진 색 중에서 "초록색"만 골라 계절 색으로 살짝 바꿔요.
//  (사람 · 물고기 · 동물처럼 움직이는 건 안 건드려요)
// =====================================================
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const SEASON_MS = 8 * 60 * 1000; // 계절 하나 = 8분
// 지금 계절 (진짜 시계 기준이라 누구나 같아요)
export function getSeason(now = Date.now()) { return (typeof window !== 'undefined' && window.__seasonTest) || SEASONS[Math.floor(now / SEASON_MS) % 4]; } // __seasonTest: 테스트할 때만 써요
export function seasonLeftMs(now = Date.now()) { return SEASON_MS - (now % SEASON_MS); }

export function setupSeasons(ctx) {
  const { THREE, scene, game, groundY, inLake, onPlateau, colliders, seaWorld, waterMat, isNight, notice, tone } = ctx;
  let season = getSeason();

  // ---------- 왼쪽 위 계절 표시 ----------
  const clock = document.getElementById('clock');
  const line = document.createElement('div');
  line.id = 'seasonLine'; line.className = 'rodName';
  if (clock) clock.after(line);
  let lineShown = '';
  function updateLine() {
    const left = Math.ceil(seasonLeftMs() / 60000);
    const s = `${SEASON_NAME[season]} · 다음 계절까지 ${left}분`;
    if (s !== lineShown) { lineShown = s; line.textContent = s; line.dataset.s = season; }
  }

  // ---------- 블록 덩어리 만들기 (계절 장식용) ----------
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function batch() {
    const solid = [], glow = [];
    const push = (list) => (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const g = box.clone();
      eu.set(rx, ry, rz); q.setFromEuler(eu);
      m4.compose(v3.set(x, y, z), q, s3.set(w, h, d));
      g.applyMatrix4(m4);
      const col = new THREE.Color(c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.deleteAttribute('uv');
      list.push(g);
    };
    const b = push(solid); b.glow = push(glow);
    b.build = () => {
      const grp = new THREE.Group();
      if (solid.length) { const m = new THREE.Mesh(mergeGeometries(solid, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); m.castShadow = m.receiveShadow = true; grp.add(m); }
      if (glow.length) grp.add(new THREE.Mesh(mergeGeometries(glow, false), new THREE.MeshBasicMaterial({ vertexColors: true })));
      solid.forEach((g) => g.dispose()); glow.forEach((g) => g.dispose());
      grp.userData.dynamic = true; // 합치기 최적화에서 빼요 (계절마다 켜고 꺼요)
      return grp;
    };
    return b;
  }

  // ---------- 장식 놓을 자리 고르기 (나무 · 가게 · 물을 피해서) ----------
  let seed = 4242;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const used = ctx.used || []; // 맵 꾸미기 소품과 같은 목록 (겹치지 않게)
  function spot(boxes, r = 1.2, tries = 80) {
    for (let i = 0; i < tries; i++) {
      const B = boxes[Math.floor(rnd() * boxes.length)];
      const x = B[0] + rnd() * (B[1] - B[0]), z = B[2] + rnd() * (B[3] - B[2]);
      if (inLake(x, z, 1.5) || onPlateau(x, z)) continue;
      if (groundY(x, z) > 0.15 || groundY(x + 1.5, z) > 0.15 || groundY(x - 1.5, z) > 0.15 || groundY(x, z + 1.5) > 0.15 || groundY(x, z - 1.5) > 0.15) continue; // 부두 · 다리 · 계단 근처는 피해요
      if (colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2)) continue;
      if (used.some((u) => (x - u.x) ** 2 + (z - u.z) ** 2 < (u.r + r) ** 2)) continue;
      used.push({ x, z, r });
      return { x, z, y: groundY(x, z) };
    }
    return null;
  }
  const VILLAGE = [[-28, 26, 2, 24]], FOREST = [[-70, -30, -44, 20]], SHORE = [[-30, 24, -32, 6]];

  // ---------- 나무 (벚나무 · 단풍나무 · 크리스마스 트리) ----------
  function tree(b, x, y, z, leaves, opts = {}) {
    const trunk = opts.trunk ?? 0x6a4a3a, trunk2 = opts.trunk2 ?? 0x5a3a2a;
    const H = opts.h ?? 2.2;
    for (let k = 0; k < 6; k++) b(0.32 - k * 0.025, H / 6 + 0.02, 0.32 - k * 0.025, k % 2 ? trunk : trunk2, x + Math.sin(k * 0.9) * 0.05, y + (k + 0.5) * (H / 6), z, 0, k * 0.3, 0);
    for (const s of [-1, 1]) { b(0.12, 0.7, 0.12, trunk, x + s * 0.32, y + H * 0.82, z + s * 0.1, 0, 0, -s * 0.7); b(0.1, 0.5, 0.1, trunk, x - s * 0.1, y + H * 0.88, z + s * 0.34, s * 0.7, 0, 0); }
    for (const [rx, rz] of [[0.2, 0], [-0.2, 0.1], [0, -0.2]]) b(0.14, 0.1, 0.3, trunk2, x + rx * 1.4, y + 0.05, z + rz * 1.4, 0, Math.atan2(rx, rz), 0); // 뿌리
    // 잎 덩어리: 크고 작은 블록을 둥글게 쌓아요
    const cy = y + H + 0.55;
    const R = opts.r ?? 1.25;
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2, e = rnd() * 0.9 - 0.25, rr = R * (0.45 + rnd() * 0.6);
      const s = 0.38 + rnd() * 0.42;
      b(s, s * 0.85, s, leaves[Math.floor(rnd() * leaves.length)], x + Math.cos(a) * rr * Math.cos(e), cy + Math.sin(e) * rr * 0.8, z + Math.sin(a) * rr * Math.cos(e), 0, rnd() * 1.5, 0);
    }
    b(R * 1.1, R * 0.8, R * 1.1, leaves[0], x, cy, z);
    if (opts.fall) for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, rr = 0.5 + rnd() * R * 1.4; b(0.12, 0.02, 0.1, leaves[Math.floor(rnd() * leaves.length)], x + Math.cos(a) * rr, y + 0.02, z + Math.sin(a) * rr, 0, rnd() * 3, 0); } // 바닥에 떨어진 잎
  }
  function xmasTree(b, x, y, z) {
    b(0.3, 0.5, 0.3, 0x5a3a2a, x, y + 0.25, z);
    const greens = [0x2a6a3a, 0x347a44, 0x2a5a32];
    for (let t = 0; t < 5; t++) {
      const w = 2.0 - t * 0.36, yy = y + 0.6 + t * 0.62;
      b(w, 0.5, w, greens[t % 3], x, yy, z, 0, t * 0.4, 0);
      b(w * 0.9, 0.12, w * 0.9, 0xf4f8ff, x, yy + 0.28, z, 0, t * 0.4, 0); // 눈 덮인 가지
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28 + t; b.glow(0.09, 0.09, 0.09, [0xff4a4a, 0xffd84a, 0x4ac8ff, 0xff8ad8, 0x8aff8a][(k + t) % 5], x + Math.cos(a) * w * 0.52, yy - 0.1, z + Math.sin(a) * w * 0.52); }
    }
    b.glow(0.3, 0.3, 0.08, 0xffe04a, x, y + 3.95, z); b.glow(0.08, 0.3, 0.3, 0xffe04a, x, y + 3.95, z); b.glow(0.42, 0.1, 0.1, 0xffe04a, x, y + 3.95, z, 0, 0, 0.78); // 꼭대기 별
    // 선물 상자
    [[0.7, 0.3, 0xe84a5a], [-0.6, 0.6, 0x4a8ae8], [0.2, -0.75, 0x5ac86a], [-0.7, -0.4, 0xf0c040]].forEach(([dx, dz, c], i) => {
      const s = 0.3 + (i % 2) * 0.1;
      b(s, s, s, c, x + dx, y + s / 2, z + dz, 0, i, 0); b(s + 0.01, s + 0.01, 0.06, 0xfff4dc, x + dx, y + s / 2, z + dz, 0, i, 0); b(0.06, s + 0.01, s + 0.01, 0xfff4dc, x + dx, y + s / 2, z + dz, 0, i, 0);
      b(0.14, 0.08, 0.14, 0xfff4dc, x + dx, y + s + 0.04, z + dz, 0, i + 0.78, 0);
    });
  }
  function snowman(b, x, y, z, ry, scarf) {
    const W = 0xf6f9ff, Wd = 0xe0e8f4;
    const rot = (dx, dz) => [x + dx * Math.cos(ry) + dz * Math.sin(ry), z - dx * Math.sin(ry) + dz * Math.cos(ry)];
    const put = (w, h, d, c, dx, yy, dz, rx = 0, rz = 0) => { const [px, pz] = rot(dx, dz); b(w, h, d, c, px, y + yy, pz, rx, ry, rz); };
    put(0.9, 0.75, 0.9, W, 0, 0.38, 0); put(0.8, 0.12, 0.8, Wd, 0, 0.06, 0);
    put(0.66, 0.56, 0.66, W, 0, 1.0, 0);
    put(0.5, 0.46, 0.5, W, 0, 1.5, 0);
    for (const yy of [0.82, 1.0, 1.18]) put(0.07, 0.07, 0.03, 0x22222a, 0, yy, 0.34);              // 단추
    for (const s of [-1, 1]) put(0.07, 0.07, 0.03, 0x22222a, s * 0.1, 1.56, 0.26);               // 눈
    put(0.07, 0.07, 0.26, 0xff8a2a, 0, 1.48, 0.36); put(0.05, 0.05, 0.08, 0xff7a1a, 0, 1.48, 0.5); // 당근 코
    for (let k = 0; k < 5; k++) put(0.04, 0.04, 0.02, 0x22222a, -0.12 + k * 0.06, 1.37 - Math.abs(k - 2) * -0.015, 0.255); // 웃는 입
    put(0.56, 0.1, 0.56, scarf, 0, 1.26, 0); put(0.12, 0.34, 0.06, scarf, 0.16, 1.1, 0.3, 0, 0.15);
    put(0.36, 0.06, 0.36, 0x22222a, 0, 1.75, 0); put(0.26, 0.26, 0.26, 0x22222a, 0, 1.9, 0); put(0.27, 0.05, 0.27, 0xd84a4a, 0, 1.82, 0); // 모자
    for (const s of [-1, 1]) { put(0.05, 0.05, 0.6, 0x6a4a2a, s * 0.48, 1.08, 0, 0, s * 0.5); put(0.04, 0.04, 0.16, 0x6a4a2a, s * 0.7, 1.22, 0.08, 0, s * 0.3); }  // 나뭇가지 팔
  }
  function sunflowers(b, x, y, z) {
    for (let i = 0; i < 6; i++) {
      const dx = (rnd() - 0.5) * 1.6, dz = (rnd() - 0.5) * 1.2, h = 1.0 + rnd() * 0.7;
      b(0.06, h, 0.06, 0x4a8a2a, x + dx, y + h / 2, z + dz);
      for (const s of [-1, 1]) b(0.22, 0.03, 0.12, 0x5aa03a, x + dx + s * 0.12, y + h * 0.5, z + dz, 0, 0, s * 0.4);
      b(0.42, 0.42, 0.06, 0xffd02a, x + dx, y + h + 0.1, z + dz + 0.03, -0.25, 0, 0);
      b(0.3, 0.52, 0.065, 0xffc01a, x + dx, y + h + 0.1, z + dz + 0.03, -0.25, 0, 0);
      b(0.52, 0.3, 0.065, 0xffc01a, x + dx, y + h + 0.1, z + dz + 0.03, -0.25, 0, 0);
      b(0.22, 0.22, 0.08, 0x6a3a1a, x + dx, y + h + 0.1, z + dz + 0.05, -0.25, 0, 0);
    }
  }
  function parasol(b, x, y, z, c) {
    b(0.06, 2.0, 0.06, 0xf4f0e8, x, y + 1.0, z, 0.08, 0, 0.05);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; b(0.9, 0.06, 0.5, k % 2 ? c : 0xffffff, x + Math.cos(a) * 0.45, y + 1.95 - 0.12, z + Math.sin(a) * 0.45, 0, -a, 0.25); }
    b(0.2, 0.15, 0.2, c, x, y + 2.05, z);
    b(0.8, 0.03, 1.6, k2(c), x + 0.9, y + 0.03, z + 0.2); b(0.8, 0.032, 0.25, 0xffffff, x + 0.9, y + 0.035, z - 0.3); // 비치 타월
    b(0.3, 0.12, 0.4, 0xffd84a, x + 0.9, y + 0.08, z + 0.85);
  }
  const k2 = (c) => (c === 0xe84a5a ? 0x4ab8e8 : 0xe84a5a);
  function picnic(b, x, y, z, ry) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) b(0.4, 0.02, 0.4, (i + j) % 2 ? 0xe84a5a : 0xfff4ec, x + (i - 1.5) * 0.4, y + 0.02, z + (j - 1.5) * 0.4);
    b(0.4, 0.3, 0.3, 0xb8864a, x + 0.3, y + 0.17, z - 0.3); b(0.42, 0.04, 0.32, 0x8a5a2a, x + 0.3, y + 0.33, z - 0.3); b(0.05, 0.2, 0.32, 0x8a5a2a, x + 0.3, y + 0.42, z - 0.3); // 바구니
    b(0.3, 0.06, 0.18, 0xe8303a, x - 0.4, y + 0.05, z + 0.3); b(0.3, 0.02, 0.18, 0x5ad86a, x - 0.4, y + 0.085, z + 0.3); // 수박 조각
    b(0.18, 0.18, 0.18, 0xd8302a, x - 0.1, y + 0.1, z - 0.4); b(0.12, 0.2, 0.12, 0xf4f0e8, x + 0.5, y + 0.12, z + 0.4); // 사과 · 컵
  }
  function scarecrow(b, x, y, z) {
    b(0.1, 1.9, 0.1, 0x7a5a3a, x, y + 0.95, z); b(1.4, 0.08, 0.08, 0x7a5a3a, x, y + 1.45, z);
    b(0.55, 0.6, 0.3, 0x4a6aa8, x, y + 1.3, z); b(0.56, 0.12, 0.31, 0x8a5a2a, x, y + 1.05, z);
    for (const s of [-1, 1]) { b(0.4, 0.2, 0.22, 0x4a6aa8, x + s * 0.45, y + 1.45, z); b(0.08, 0.14, 0.14, 0xe8c84a, x + s * 0.7, y + 1.42, z); }
    b(0.38, 0.38, 0.36, 0xe8d8a8, x, y + 1.82, z);
    for (const s of [-1, 1]) b(0.06, 0.06, 0.02, 0x2a2a2a, x + s * 0.08, y + 1.86, z + 0.18);
    b(0.16, 0.03, 0.02, 0x2a2a2a, x, y + 1.74, z + 0.18);
    b(0.7, 0.05, 0.7, 0xc8a84a, x, y + 2.02, z); b(0.36, 0.2, 0.36, 0xc8a84a, x, y + 2.13, z); b(0.37, 0.05, 0.37, 0xd84a3a, x, y + 2.06, z); // 밀짚모자
    b(0.12, 0.08, 0.12, 0x2a2a30, x + 0.66, y + 1.58, z, 0, 0.5, 0); b(0.18, 0.02, 0.06, 0x2a2a30, x + 0.66, y + 1.6, z + 0.08); // 어깨 위 까마귀
  }
  function pumpkins(b, x, y, z) {
    for (let i = 0; i < 4; i++) {
      const dx = (rnd() - 0.5) * 1.4, dz = (rnd() - 0.5) * 1.0, s = 0.3 + rnd() * 0.3;
      b(s, s * 0.75, s, 0xf07a1a, x + dx, y + s * 0.37, z + dz);
      for (const r of [0, 0.78]) b(s * 1.04, s * 0.7, s * 0.25, 0xe06a10, x + dx, y + s * 0.37, z + dz, 0, r, 0);
      b(0.05, 0.1, 0.05, 0x4a6a2a, x + dx, y + s * 0.8, z + dz, 0.2, 0, 0.2);
    }
    b(0.9, 0.5, 0.5, 0xd8b860, x + 1.0, y + 0.25, z - 0.4); for (const yy of [0.12, 0.36]) b(0.92, 0.04, 0.52, 0xc8a040, x + 1.0, y + yy, z - 0.4); // 건초 더미
  }
  function leafPile(b, x, y, z) {
    const cs = [0xe8742a, 0xd8402a, 0xf0b030, 0xc8602a, 0xa83a2a];
    for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, rr = rnd() * 0.6, h = (0.6 - rr) * 0.5; b(0.18, 0.06, 0.14, cs[i % 5], x + Math.cos(a) * rr, y + 0.03 + rnd() * h, z + Math.sin(a) * rr, rnd() * 0.5, rnd() * 3, rnd() * 0.5); }
  }
  function iceFishing(b, x, y, z) {
    // 얼음판 · 구멍 · 텐트 · 의자 · 양동이
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { if (Math.abs(i) + Math.abs(j) > 4) continue; b(0.98, 0.06, 0.98, (i + j) % 2 ? 0xd8eef8 : 0xe8f6fc, x + i, y + 0.03, z + j); }
    for (const [hx, hz] of [[1.2, 0.6], [-1.5, -0.4]]) { b(0.5, 0.065, 0.5, 0x1a3a5a, hx + x, y + 0.035, hz + z); b(0.62, 0.08, 0.1, 0xf4fbff, hx + x, y + 0.04, hz + z + 0.3); b(0.62, 0.08, 0.1, 0xf4fbff, hx + x, y + 0.04, hz + z - 0.3); }
    // 텐트 (빨간 삼각 지붕)
    for (const s of [-1, 1]) b(0.08, 1.6, 1.4, 0xd84a3a, x - 0.4 + s * 0.42, y + 0.75, z - 0.6, 0, 0, s * 0.5);
    b(0.9, 0.1, 1.42, 0xb83a2a, x - 0.4, y + 1.45, z - 0.6);
    b(1.0, 1.1, 0.06, 0xd84a3a, x - 0.4, y + 0.6, z - 1.3);
    b(0.4, 0.04, 0.4, 0xfff4dc, x - 0.4, y + 1.2, z - 0.1);
    // 작은 의자 · 양동이 · 낚싯대
    b(0.3, 0.05, 0.3, 0x5a8ad8, x + 0.75, y + 0.35, z + 0.6); for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b(0.03, 0.32, 0.03, 0x3a3a40, x + 0.75 + a * 0.12, y + 0.18, z + 0.6 + c * 0.12);
    b(0.24, 0.26, 0.24, 0x8a9aa8, x + 0.4, y + 0.16, z + 1.0); b(0.2, 0.02, 0.2, 0x2a5a7a, x + 0.4, y + 0.28, z + 1.0);
    b(0.03, 0.03, 1.1, 0x8a5a3a, x + 1.0, y + 0.45, z + 0.65, 0.5, -0.4, 0);
    // 눈 더미
    for (let i = 0; i < 6; i++) b(0.5 + rnd() * 0.4, 0.2 + rnd() * 0.2, 0.5, 0xf6f9ff, x + 2.8 * Math.cos(i), y + 0.12, z + 1.9 * Math.sin(i));
  }
  function snowDrift(b, x, y, z) { for (let i = 0; i < 5; i++) b(0.6 + rnd() * 0.6, 0.18 + rnd() * 0.18, 0.5 + rnd() * 0.5, i % 2 ? 0xf6f9ff : 0xe8f0fa, x + (rnd() - 0.5) * 1.2, y + 0.08, z + (rnd() - 0.5) * 1.0, 0, rnd() * 3, 0); }
  function tulips(b, x, y, z) {
    const cs = [0xff5a7a, 0xffd84a, 0xff8ac8, 0xffffff, 0xff7a3a, 0xb88aff];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
      const c = cs[(r * 2 + i) % cs.length], px = x + (i - 2.5) * 0.28, pz = z + (r - 1) * 0.4;
      b(0.03, 0.34, 0.03, 0x4a9a3a, px, y + 0.17, pz); b(0.12, 0.03, 0.05, 0x5aaa3a, px + 0.05, y + 0.12, pz, 0, 0, -0.5);
      b(0.1, 0.12, 0.1, c, px, y + 0.38, pz); b(0.04, 0.05, 0.11, c, px, y + 0.45, pz); b(0.11, 0.05, 0.04, c, px, y + 0.45, pz);
    }
  }

  // ---------- 계절마다 장식 한 덩어리씩 ----------
  const props = {};
  {
    const b = batch();
    const pink = [0xffb8d0, 0xffa0c0, 0xffd0e0, 0xff90b8, 0xfff0f4];
    for (let i = 0; i < 7; i++) { const p = spot(VILLAGE, 2.0); if (p) tree(b, p.x, p.y, p.z, pink, { fall: true, trunk: 0x5a3a3a, trunk2: 0x4a2e2e }); }
    for (let i = 0; i < 4; i++) { const p = spot(FOREST, 2.0); if (p) tree(b, p.x, p.y, p.z, pink, { fall: true, trunk: 0x5a3a3a, trunk2: 0x4a2e2e, h: 2.6, r: 1.5 }); }
    for (let i = 0; i < 6; i++) { const p = spot(VILLAGE, 1.2); if (p) tulips(b, p.x, p.y, p.z); }
    for (let i = 0; i < 2; i++) { const p = spot(SHORE, 1.3); if (p) picnic(b, p.x, p.y, p.z); }
    props.spring = b.build();
  }
  {
    const b = batch();
    for (let i = 0; i < 6; i++) { const p = spot(VILLAGE, 1.2); if (p) sunflowers(b, p.x, p.y, p.z); }
    // 모래사장 파라솔
    for (let i = 0; i < 6; i++) { const x = -50 + i * 16 + rnd() * 4, ze = seaWorld.zEdge(x) - 3 - rnd() * 3; parasol(b, x, groundY(x, ze), ze, i % 2 ? 0xe84a5a : 0x4ab8e8); }
    for (let i = 0; i < 2; i++) { const p = spot(SHORE, 1.3); if (p) picnic(b, p.x, p.y, p.z); }
    props.summer = b.build();
  }
  {
    const b = batch();
    const maple = [0xe8642a, 0xd8402a, 0xf0a030, 0xc8302a, 0xf0c040];
    for (let i = 0; i < 7; i++) { const p = spot(VILLAGE, 2.0); if (p) tree(b, p.x, p.y, p.z, maple, { fall: true }); }
    for (let i = 0; i < 4; i++) { const p = spot(FOREST, 2.0); if (p) tree(b, p.x, p.y, p.z, maple, { fall: true, h: 2.6, r: 1.5 }); }
    for (let i = 0; i < 2; i++) { const p = spot(VILLAGE, 1.6); if (p) scarecrow(b, p.x, p.y, p.z); }
    for (let i = 0; i < 4; i++) { const p = spot(VILLAGE, 1.5); if (p) pumpkins(b, p.x, p.y, p.z); }
    for (let i = 0; i < 12; i++) { const p = spot([...VILLAGE, ...FOREST], 0.8); if (p) leafPile(b, p.x, p.y, p.z); }
    props.autumn = b.build();
  }
  {
    const b = batch();
    const scarves = [0xe84a5a, 0x4a8ae8, 0x5ac86a, 0xf0b030];
    for (let i = 0; i < 6; i++) { const p = spot(VILLAGE, 1.0); if (p) snowman(b, p.x, p.y, p.z, rnd() * 6.28, scarves[i % 4]); }
    { const p = spot([[-6, 6, 10, 18]], 1.8, 200) || spot(VILLAGE, 1.8); if (p) xmasTree(b, p.x, p.y, p.z); }
    iceFishing(b, -12, 0.02, -6);
    iceFishing(b, 12, 0.02, -22);
    for (let i = 0; i < 16; i++) { const p = spot([...VILLAGE, ...FOREST], 0.9); if (p) snowDrift(b, p.x, p.y, p.z); }
    props.winter = b.build();
  }
  for (const k of SEASONS) { props[k].visible = false; scene.add(props[k]); }

  // ---------- 떨어지는 것들 (꽃잎 · 낙엽 · 눈) + 반딧불이 ----------
  const N = 520;
  const fallGeo = new THREE.PlaneGeometry(1, 1);
  // 계절마다 떨어지는 모양 그림 (하얗게 그려 두고 색은 하나하나 따로 칠해요)
  function shapeTex(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; draw(g); const t = new THREE.CanvasTexture(c); return t; }
  const TEX = {
    winter: shapeTex((g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
    spring: shapeTex((g) => { g.beginPath(); g.moveTo(32, 60); g.bezierCurveTo(6, 44, 8, 10, 24, 6); g.lineTo(32, 16); g.lineTo(40, 6); g.bezierCurveTo(56, 10, 58, 44, 32, 60); g.fill(); }), // 벚꽃 잎 (끝이 살짝 파인 모양)
    autumn: shapeTex((g) => { // 단풍잎 (뾰족뾰족 다섯 갈래)
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 11 : 28; g.lineTo(32 + Math.cos(a) * r, 30 + Math.sin(a) * r); }
      g.closePath(); g.fill(); g.fillRect(30, 36, 4, 26);
    }),
    summer: shapeTex((g) => { g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); g.stroke(); } g.beginPath(); g.arc(32, 32, 6, 0, 6.28); g.fill(); }) // 민들레 홀씨
  };
  const fallMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, alphaTest: 0.05 });
  const fall = new THREE.InstancedMesh(fallGeo, fallMat, N);
  fall.frustumCulled = false; fall.userData.dynamic = true;
  fall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  scene.add(fall);
  const P = Array.from({ length: N }, () => ({ x: 0, y: -99, z: 0, vy: 1, sx: 0, ph: Math.random() * 6, spin: 0.5 + Math.random() * 2, s: 1, rx: 0, ry: 0 }));
  const FF = 140;
  const ffMat = new THREE.MeshBasicMaterial({ color: 0xc8ff4a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flies = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05, 0), ffMat, FF);
  flies.frustumCulled = false; flies.userData.dynamic = true; flies.visible = false;
  scene.add(flies);
  const ffGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,255,70,0.95)'); gr.addColorStop(0.35, 'rgba(170,240,40,0.45)'); gr.addColorStop(1, 'rgba(150,230,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), FF);
  ffGlow.frustumCulled = false; ffGlow.userData.dynamic = true; ffGlow.visible = false;
  scene.add(ffGlow);
  const F = Array.from({ length: FF }, () => ({ x: 0, y: 0, z: 0, ph: Math.random() * 6, sp: 0.3 + Math.random() * 0.6, blink: Math.random() * 6, ox: 0, oz: 0 }));
  const SPEC = {
    spring: { n: 280, colors: [0xffb8d0, 0xffc8dc, 0xffe0ea, 0xff9ab8], vy: [0.5, 0.9], size: [0.1, 0.15], sway: 0.9 },
    summer: { n: 50, colors: [0xffffff, 0xfff8e0], vy: [0.15, 0.3], size: [0.1, 0.14], sway: 0.6 }, // 민들레 홀씨
    autumn: { n: 200, colors: [0xe8642a, 0xd8402a, 0xf0a030, 0xc8302a, 0xf0c040], vy: [0.7, 1.2], size: [0.16, 0.24], sway: 1.2 },
    winter: { n: 520, colors: [0xffffff, 0xf0f6ff, 0xe8f0ff], vy: [0.9, 1.6], size: [0.07, 0.13], sway: 0.5 }
  };
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  function resetFlake(p, sp, cx, cz, top, base) {
    p.x = cx + (Math.random() - 0.5) * 40; p.z = cz + (Math.random() - 0.5) * 40;
    p.y = base + (top ? 6 + Math.random() * 10 : -1 + Math.random() * 15);
    p.vy = sp.vy[0] + Math.random() * (sp.vy[1] - sp.vy[0]);
    p.s = sp.size[0] + Math.random() * (sp.size[1] - sp.size[0]);
    p.c = sp.colors[Math.floor(Math.random() * sp.colors.length)];
  }
  function resetAllFlakes() {
    const sp = SPEC[season], c = ctx.person.position;
    P.forEach((p, i) => { resetFlake(p, sp, c.x, c.z, false, c.y); fall.setColorAt(i, col.setHex(p.c)); });
    fall.instanceColor.needsUpdate = true;
    fall.count = sp.n;
    fallMat.map = TEX[season]; fallMat.needsUpdate = true;
  }
  function updateFall(dt, t) {
    const sp = SPEC[season], c = ctx.person.position, base = c.y;
    let colorDirty = false;
    for (let i = 0; i < sp.n; i++) {
      const p = P[i];
      p.y -= p.vy * dt;
      p.x += Math.sin(t * 0.8 + p.ph) * sp.sway * dt + 0.25 * dt; // 바람에 살랑
      p.z += Math.cos(t * 0.6 + p.ph) * sp.sway * 0.5 * dt;
      if (p.y < base - 1 || Math.abs(p.x - c.x) > 21 || Math.abs(p.z - c.z) > 21) { resetFlake(p, sp, c.x, c.z, true, base); fall.setColorAt(i, col.setHex(p.c)); colorDirty = true; }
      dummy.position.set(p.x, p.y, p.z);
      if (season === 'winter' && ctx.camera) dummy.quaternion.copy(ctx.camera.quaternion); else dummy.rotation.set(t * p.spin + p.ph, t * p.spin * 0.7, Math.sin(t * 2 + p.ph));
      dummy.scale.set(p.s, p.s, 1);
      dummy.updateMatrix();
      fall.setMatrixAt(i, dummy.matrix);
    }
    fall.instanceMatrix.needsUpdate = true;
    if (colorDirty) fall.instanceColor.needsUpdate = true;
  }
  function updateFlies(dt, t) {
    const show = season === 'summer' && isNight();
    flies.visible = ffGlow.visible = show;
    if (!show) return;
    const c = ctx.person.position, cam = ctx.camera;
    for (let i = 0; i < FF; i++) {
      const f = F[i];
      if (!f.init || Math.abs(f.ox - c.x) > 18 || Math.abs(f.oz - c.z) > 18) { f.ox = c.x + (Math.random() - 0.5) * 34; f.oz = c.z + (Math.random() - 0.5) * 34; f.oy = groundY(f.ox, f.oz) + 0.3 + Math.random() * 1.6; f.init = true; }
      f.x = f.ox + Math.sin(t * f.sp + f.ph) * 0.8; f.z = f.oz + Math.cos(t * f.sp * 0.8 + f.ph) * 0.8; f.y = f.oy + Math.sin(t * f.sp * 1.6 + f.ph) * 0.3;
      const b = Math.max(0, Math.sin(t * 1.8 + f.blink)) ** 2;
      dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.4 + b * 0.8); dummy.updateMatrix(); flies.setMatrixAt(i, dummy.matrix);
      if (cam) dummy.quaternion.copy(cam.quaternion);
      dummy.scale.setScalar(0.15 + b * 0.8); dummy.updateMatrix(); ffGlow.setMatrixAt(i, dummy.matrix);
    }
    flies.instanceMatrix.needsUpdate = true; ffGlow.instanceMatrix.needsUpdate = true;
  }

  // ---------- 나무 · 풀 색 바꾸기 ----------
  const greens = []; // { attr, idx, orig, ny, hash }
  const greenMats = []; // { mat, orig }
  const texMats = [];   // { mat, orig(원래 그림), v(가을 색 고르기용 번호) }
  const texCache = new Map();
  function tintedTex(orig, s, v) {
    if (s === 'summer') return orig;
    const key = orig.uuid + s + (s === 'autumn' ? v : '');
    if (texCache.has(key)) return texCache.get(key);
    const img = orig.image, W = img.width, H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H), px = d.data, c = new THREE.Color(), hsl = {}, rgb = {};
    let changed = 0;
    for (let i = 0; i < px.length; i += 4) {
      c.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, THREE.SRGBColorSpace);
      c.getHSL(hsl);
      if (!isLeaf(hsl)) continue;
      tintColor(c, s, 0.8, (v + 0.5) / 4, true);
      c.getRGB(rgb, THREE.SRGBColorSpace);
      px[i] = rgb.r * 255; px[i + 1] = rgb.g * 255; px[i + 2] = rgb.b * 255;
      changed++;
    }
    let t = orig;
    if (changed) {
      g.putImageData(d, 0, 0);
      t = new THREE.CanvasTexture(cv);
      t.colorSpace = orig.colorSpace; t.flipY = orig.flipY; t.magFilter = orig.magFilter; t.minFilter = orig.minFilter; t.wrapS = orig.wrapS; t.wrapT = orig.wrapT; t.generateMipmaps = orig.generateMipmaps;
    }
    texCache.set(key, t);
    return t;
  }
  let scanned = false;
  const seenMat = new Set(), seenAttr = new Set(); // 이미 본 것 (두 번 살펴봐도 겹치지 않게)
  // 나뭇잎 · 풀 색인지 (초록 ~ 올리브색, 너무 쨍한 형광색과 밝은 모래색은 빼요)
  const isLeaf = (h) => h.h > 0.115 && h.h < 0.4 && h.s > 0.18 && h.s < 0.9 && h.l > 0.1 && h.l < 0.72;
  function scan() {
    scanned = true;
    const hsl = {}, c = new THREE.Color();
    const walk = (o) => {
      if (o.userData.dynamic || o.isLight || o.isCamera || o.isSprite || o.isPoints || o.isLine) return;
      if (o.isMesh && !o.isInstancedMesh && o.visible) {
        const g = o.geometry, ca = g.attributes.color, na = g.attributes.normal, pa = g.attributes.position;
        if (ca && o.material && o.material.vertexColors && !o.material.transparent && pa.count > 60 && !seenAttr.has(ca)) {
          seenAttr.add(ca);
          const idx = [];
          for (let i = 0; i < ca.count; i++) {
            c.setRGB(ca.getX(i), ca.getY(i), ca.getZ(i));
            c.getHSL(hsl);
            if (isLeaf(hsl)) idx.push(i);
          }
          if (idx.length) {
            const I = Int32Array.from(idx), orig = new Float32Array(I.length * 3), ny = new Float32Array(I.length), hash = new Float32Array(I.length);
            o.updateMatrixWorld();
            const e = o.matrixWorld.elements;
            I.forEach((vi, k) => {
              orig[k * 3] = ca.getX(vi); orig[k * 3 + 1] = ca.getY(vi); orig[k * 3 + 2] = ca.getZ(vi);
              ny[k] = na ? na.getY(vi) : 1;
              const wx = pa.getX(vi) * e[0] + pa.getZ(vi) * e[8] + e[12], wz = pa.getX(vi) * e[2] + pa.getZ(vi) * e[10] + e[14];
              const hx = Math.floor(wx / 1.6), hz = Math.floor(wz / 1.6);
              hash[k] = (Math.abs(Math.sin(hx * 12.9898 + hz * 78.233) * 43758.5453)) % 1;
            });
            greens.push({ attr: ca, idx: I, orig, ny, hash });
          }
        } else if (o.material && o.material.map && o.material.map.image && o.material.map.image.width <= 256 && !seenMat.has(o.material)) {
          // 그림(텍스처)으로 색을 칠한 나무 모델: 그림 속 초록 칸만 계절 색으로 바꾼 그림으로 갈아 끼워요
          seenMat.add(o.material);
          texMats.push({ mat: o.material, orig: o.material.map, v: texMats.length % 4 });
        } else if (o.material && !o.material.vertexColors && o.material.color && !seenMat.has(o.material) && !o.material.transparent && o.material !== waterMat) {
          seenMat.add(o.material);
          o.material.color.getHSL(hsl);
          if (isLeaf(hsl) && !o.material.isMeshBasicMaterial && !(o.material.emissiveIntensity > 0 && o.material.emissive && o.material.emissive.getHex())) greenMats.push({ mat: o.material, orig: o.material.color.clone() });
        }
      }
      for (const ch of o.children) walk(ch);
    };
    for (const top of scene.children) walk(top);
  }
  const T = {
    autumn: [new THREE.Color(0xe0702a), new THREE.Color(0xc8402a), new THREE.Color(0xe8b830), new THREE.Color(0xa8682a)],
    dry: new THREE.Color(0xb8a050),
    snow: new THREE.Color(0xf2f6fc),
    spring: new THREE.Color(0x9ae070),
    blossom: new THREE.Color(0xffb8d4)
  };
  const tc = new THREE.Color(), oc = new THREE.Color();
  function tintColor(out, s, ny, hash, strong) {
    if (s === 'autumn') {
      if (strong) out.lerp(T.autumn[Math.floor(hash * 4)], 0.62);            // 나무 모델: 진한 단풍
      else if (hash > 0.72) out.lerp(T.autumn[Math.floor(hash * 13) % 4], 0.5); // 블록 잎 · 풀: 군데군데만 단풍
      else out.lerp(T.dry, 0.22);                                              // 나머지는 살짝 누렇게
    }
    else if (s === 'winter') out.lerp(T.snow, ny > 0.5 ? 0.86 : 0.3);
    else if (s === 'spring') out.lerp(strong && hash < 0.5 ? T.blossom : T.spring, strong && hash < 0.5 ? 0.6 : 0.12); // 봄: 나무 절반은 벚꽃 분홍
  }
  function applyTint() {
    if (!scanned) return;
    for (const G of greens) {
      const a = G.attr.array;
      for (let k = 0; k < G.idx.length; k++) {
        oc.setRGB(G.orig[k * 3], G.orig[k * 3 + 1], G.orig[k * 3 + 2]);
        tintColor(oc, season, G.ny[k], G.hash[k]);
        const vi = G.idx[k] * 3;
        a[vi] = oc.r; a[vi + 1] = oc.g; a[vi + 2] = oc.b;
      }
      G.attr.needsUpdate = true;
    }
    for (const M of greenMats) { oc.copy(M.orig); tintColor(oc, season, 1, 0.6); M.mat.color.copy(oc); }
    for (const M of texMats) { try { M.mat.map = tintedTex(M.orig, season, M.v); } catch (e) { /* 그림을 못 읽으면 그대로 둬요 */ } }
  }

  // ---------- 계절 바꾸기 ----------
  const ANNOUNCE = {
    spring: '봄이 왔어요! 벚꽃이 흩날려요. 벚꽃 송어 · 꽃잎 잉어가 나타나요.',
    summer: '여름이에요! 밤에는 반딧불이가 반짝여요. 반딧불 메기를 찾아봐요.',
    autumn: '가을이 왔어요. 단풍이 물들었어요. 단풍 붕어 · 보름달 잉어가 올라와요.',
    winter: '겨울이에요! 눈이 와요. 호수 위 얼음낚시 텐트에 가 봐요. 눈꽃 빙어 · 얼음 송어가 나와요.'
  };
  function applySeason(first) {
    for (const k of SEASONS) props[k].visible = k === season;
    resetAllFlakes();
    applyTint();
    updateLine();
    document.body.dataset.season = season;
    if (!first) {
      notice(ANNOUNCE[season]);
      tone(660, 0.15, 'triangle', 0.05); tone(880, 0.2, 'triangle', 0.05, 0.15); tone(1320, 0.3, 'sine', 0.04, 0.3);
      if (ctx.onSeason) ctx.onSeason(season);
    }
  }
  applySeason(true);
  for (const ms of [7000, 25000]) setTimeout(() => { try { scan(); applyTint(); } catch (e) { console.warn('[계절] 색 바꾸기', e); } }, ms); // 합치기 최적화(4초)가 끝난 뒤에 · 늦게 불러온 나무 모델도 한 번 더

  const waterIce = new THREE.Color(0xbcd8e4);
  return {
    get season() { return season; }, greens, greenMats, texMats,
    update(dt, t) {
      const s = getSeason();
      if (s !== season) { season = s; applySeason(false); }
      updateLine();
      // 집 안(방)에서는 눈·꽃잎·반딧불이가 안 보여요
      const indoor = !!(ctx.game && ctx.game.indoors);
      fall.visible = !indoor;
      if (!indoor) updateFall(dt, t);
      if (indoor) flies.visible = ffGlow.visible = false; else updateFlies(dt, t);
      if (season === 'winter' && waterMat) waterMat.color.lerp(waterIce, 0.45); // 겨울 호수는 얼음빛
    }
  };
}
