// =====================================================
//  루비 섬 (최후반 콘텐츠)
//   - 큰 바다 남쪽으로 새로 넓힌 "루비 바다" 한가운데. 해협으로 이어져서 보트로 가거나, 부두 끝 정기선으로 가요
//   - 정글섬의 약 3배 넓이 (반지름 47). 땅 · 풀 · 바위 · 나무가 전부 붉은빛이고, 곳곳에 루비 수정이 솟아 있어요
//   - 루비 신전: 봉인 2개. 정해진 물고기를 2마리씩 바쳐야 가장 비싼 루비 낚싯대 2개를 살 수 있어요
//   - 루비 바다 · 루비 호수의 물고기는 루비 공방 낚싯대로만 낚여요 (main.js cast)
//  땅 높이는 rubyHeight() 로 계산해서 main.js groundY 가 그대로 써요 (평평하지 않아요)
// =====================================================
import { DecoBatch } from './seaworld.js';

export const RUBY = { x: 0, z: 340, r: 47 };                         // 섬 한가운데 · 반지름
export const RUBY_SEA = { x: 0, z: 335, rx: 170, rz: 150 };            // 루비 바다
export const RUBY_STRAIT = { x: 0, z: 176, rx: 26, rz: 12 };           // 큰 바다 ↔ 루비 바다 해협
export const RUBY_LAGOON = { x: RUBY.x + 24, z: RUBY.z + 4, rx: 9.5, rz: 7, y: 0.62 }; // 섬 안 루비 호수
export const TEMPLE = { x: RUBY.x - 4, z: RUBY.z + 22 };              // 루비 신전 (섬 남쪽 언덕)
export const DOCK = { x: RUBY.x, z: RUBY.z - RUBY.r - 0.5 };           // 북쪽 선착장 (큰 바다 쪽)
// 봉인: 어떤 물고기를 어떤 이로치로 몇 마리 바쳐야 하는지
//  봉인 2개를 모두 풀면 신전 문이 열리고, 성소 연못에서 보스(한 마리)를 낚으면 성소 안에서 신전 낚싯대 2개를 팔아요
export const RUBY_BOSS = '성소의 홍염 수호룡';
export const SEALS = [
  { id: 's1', name: '홍염의 봉인', fish: '홍염 날개어', mut: '다크', need: 1, rod: '루비 신전의 홍염 낚싯대', boss: RUBY_BOSS },
  { id: 's2', name: '왕관의 봉인', fish: '홍옥 바다용', mut: '핏빛', need: 1, rod: '루비 왕관 낚싯대', boss: RUBY_BOSS }
];

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// 신전 받침 (3단): 단마다 [반쪽 크기, 윗면 높이(언덕 위에서)]
const TIERS = [[14, 1.0], [10.5, 2.0], [7.2, 3.0]];
const TEMPLE_BASE = 2.35;   // 신전이 서 있는 언덕 높이
// 섬 땅 높이 (자연 지형: 바닷가 → 안쪽으로 올라가고, 둥근 언덕들, 신전 언덕, 호수 웅덩이)
export function rubyHeight(x, z) {
  const u = x - RUBY.x, v = z - RUBY.z, d = Math.hypot(u, v) / RUBY.r;
  let h = 0.25 + 0.75 * smooth(0.97, 0.62, d);                                         // 바닷가에서 안쪽으로
  const inland = smooth(0.95, 0.6, d);
  h += inland * (0.32 * Math.sin(u * 0.13 + 1.0) * Math.cos(v * 0.11) + 0.22 * Math.sin(u * 0.07 - v * 0.09 + 2.0)); // 낮은 언덕들
  const td = Math.hypot(x - TEMPLE.x, z - TEMPLE.z);
  h = h + (TEMPLE_BASE - h) * smooth(24, 15, td);                                     // 신전 언덕 (꼭대기는 평평)
  const ld = Math.hypot((x - RUBY_LAGOON.x) / RUBY_LAGOON.rx, (z - RUBY_LAGOON.z) / RUBY_LAGOON.rz);
  h -= 1.1 * smooth(1.35, 0.85, ld);                                                  // 호수 웅덩이
  const pd = Math.abs(x - DOCK.x);                                                    // 선착장 → 신전 큰길은 조금 평평하게
  if (z < TEMPLE.z - 14 && pd < 3) h = h * 0.6 + (0.25 + 0.75 * smooth(0.97, 0.62, d)) * 0.4;
  return h;
}
// 신전 받침 · 계단 높이 (밖이면 null)
export function templeGround(x, z) {
  const lx = x - TEMPLE.x, lz = z - TEMPLE.z;
  // 북쪽 큰 계단 (폭 4.4): 땅에서 3단 꼭대기까지 12칸
  if (Math.abs(lx) < 2.2 && lz < -TIERS[2][0] + 0.01 && lz > -TIERS[0][0] - 3.6) {
    const run = -TIERS[0][0] - 3.6, k = Math.floor((lz - run) / ((-TIERS[2][0] - run) / 12));
    return TEMPLE_BASE + Math.min(12, Math.max(0, k + 1)) * 0.25;
  }
  for (let i = TIERS.length - 1; i >= 0; i--) if (Math.abs(lx) < TIERS[i][0] && Math.abs(lz) < TIERS[i][0]) return TEMPLE_BASE + TIERS[i][1];
  return null;
}

export function buildRuby(ctx) {
  const { THREE, scene, shops, addCollider, LANTERN_MATS } = ctx;
  let seed = 3131;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), CYL6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
  const CONE = new THREE.ConeGeometry(0.5, 1, 6), BALL = new THREE.IcosahedronGeometry(0.5, 0), ROCK = new THREE.DodecahedronGeometry(0.5, 0), OCTA = new THREE.OctahedronGeometry(0.5, 0);
  const deco = new DecoBatch(THREE), tiny = new DecoBatch(THREE), shiny = new DecoBatch(THREE, { roughness: 0.3, metalness: 0.4 });
  const gemMat = new THREE.MeshStandardMaterial({ color: 0xff2a4a, roughness: 0.12, metalness: 0.25, emissive: 0xc8102a, emissiveIntensity: 0.55, vertexColors: true });
  LANTERN_MATS.push(gemMat); // 밤엔 루비가 더 붉게 빛나요
  const gems = new DecoBatch(THREE);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, roughness: 0.4, emissive: 0xff8a50, emissiveIntensity: 1.2 });
  LANTERN_MATS.push(glowMat);
  const glow = new DecoBatch(THREE);
  const rects = [];
  const block = (x0, z0, x1, z1) => rects.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  const H = (x, z) => templeGround(x, z) ?? rubyHeight(x, z);   // 그 자리 땅 높이 (물건은 늘 이걸로 놓아요)
  const lowY = (x, z, r) => Math.min(H(x, z), H(x + r, z), H(x - r, z), H(x, z + r), H(x, z - r)); // 경사면은 가장 낮은 쪽 기준
  const tone = (c, k) => { const o = new THREE.Color(c); o.offsetHSL(0, 0, k); return o.getHex(); };
  const RX = RUBY.x, RZ = RUBY.z, R = RUBY.r;
  const SOIL = [0x8a3a3a, 0x7a2e32, 0x9a4a44, 0x6a262a], GRASS = [0xb8343e, 0xa82a36, 0xc84a4a, 0x962432], SAND = [0xd8a098, 0xc8908a, 0xe4b0a6];
  const RUBYC = [0xff2a4a, 0xe8183a, 0xff5a6a, 0xd8102a];

  // ---------------- 땅 (높낮이 있는 지형, 꼭짓점 색 3~4톤, 각진 면) ----------------
  {
    const N = 96, size = R * 2.24, geo = new THREE.PlaneGeometry(size, size, N, N);
    geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position, col = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      const lx = pa.getX(i), lz = pa.getZ(i), x = RX + lx, z = RZ + lz, d = Math.hypot(lx, lz) / R;
      let y = rubyHeight(x, z);
      if (d > 1.0) y = 0.25 - (d - 1.0) * 6;                                     // 물속으로 비탈
      pa.setY(i, Math.max(-0.8, y));
      const n = (Math.sin(x * 0.9) * Math.cos(z * 0.7) + Math.sin(x * 0.31 + z * 0.43)) * 0.5;
      const ld = Math.hypot((x - RUBY_LAGOON.x) / RUBY_LAGOON.rx, (z - RUBY_LAGOON.z) / RUBY_LAGOON.rz);
      if (d > 0.9 || (ld < 1.3 && ld > 0.95)) c.setHex(SAND[(i * 7 + (n > 0 ? 1 : 0)) % 3]);  // 바닷가 · 호숫가 붉은 모래
      else if (ld <= 0.95) c.setHex(0x5a1e22);                                       // 호수 바닥
      else c.setHex(n > 0.35 ? GRASS[2] : n > 0 ? GRASS[0] : n > -0.4 ? GRASS[1] : SOIL[i % 4]); // 붉은 풀 + 흙 얼룩
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    pa.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const g2 = geo.toNonIndexed(); g2.computeVertexNormals(); geo.dispose();
    const land = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }));
    land.position.set(RX, 0, RZ); land.receiveShadow = true;
    scene.add(land);
  }
  // 루비 호수 테두리 돌 + 붉은 갈대 + 연잎 + 반짝이
  {
    const L = RUBY_LAGOON;
    for (let k = 0; k < 52; k++) {
      const a = (k / 52) * Math.PI * 2, x = L.x + Math.cos(a) * (L.rx + 0.5), z = L.z + Math.sin(a) * (L.rz + 0.5), s = 0.35 + rnd() * 0.4;
      deco.add(ROCK, pick([0x6a3a3a, 0x7a4a48, 0x5a2e30]), [x, lowY(x, z, s / 2) + s * 0.2, z], [rnd(), rnd() * 3, rnd()], [s, s * 0.7, s]);
      if (k % 3 === 0) for (let m = 0; m < 5; m++) { const rx = x + (rnd() - 0.5) * 0.8, rz = z + (rnd() - 0.5) * 0.8, h = 0.6 + rnd() * 0.6; tiny.add(BOX, pick([0xa83a3a, 0x8a2a2a, 0xc84a3a]), [rx, H(rx, rz) + h / 2, rz], [0, rnd(), (rnd() - 0.5) * 0.3], [0.04, h, 0.04]); if (rnd() < 0.5) tiny.add(BOX, 0x5a1a1a, [rx, H(rx, rz) + h, rz], [0, 0, 0], [0.07, 0.2, 0.07]); } // 갈대 + 이삭
    }
    for (let k = 0; k < 18; k++) { const a = rnd() * 6.28, rr = rnd() * 0.75, x = L.x + Math.cos(a) * L.rx * rr, z = L.z + Math.sin(a) * L.rz * rr; tiny.add(CYL, 0x8a3a3a, [x, L.y + 0.06, z], [0, rnd(), 0], [0.6, 0.02, 0.6]); if (rnd() < 0.4) gems.add(OCTA, 0xffffff, [x + 0.1, L.y + 0.2, z], [0, rnd(), 0], [0.16, 0.24, 0.16]); }
  }

  // ---------------- 루비 수정 무리 (크기 다른 수정 3~9개, 받침 바위, 바닥 부스러기) ----------------
  const crystal = (x, z, s = 1) => {
    const y = lowY(x, z, 0.6 * s);
    deco.add(ROCK, pick([0x5a2e30, 0x6a3a3a, 0x4a2428]), [x, y + 0.1 * s, z], [rnd(), rnd() * 3, rnd()], [1.2 * s, 0.5 * s, 1.1 * s]);
    const n = 3 + Math.floor(rnd() * 6);
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.28, rr = rnd() * 0.45 * s, h = (0.5 + rnd() * 1.4) * s * (k === 0 ? 1.6 : 1), w = (0.18 + rnd() * 0.16) * s * (k === 0 ? 1.4 : 1);
      gems.add(OCTA, pick([0xffffff, 0xffd0d8, 0xffb0b8]), [x + Math.cos(a) * rr, y + h * 0.45, z + Math.sin(a) * rr], [0, rnd() * 3, (rnd() - 0.5) * 0.5], [w, h, w]);
    }
    for (let k = 0; k < 5; k++) gems.add(OCTA, 0xffc0c8, [x + (rnd() - 0.5) * 1.6 * s, y + 0.05, z + (rnd() - 0.5) * 1.6 * s], [rnd(), rnd(), rnd()], [0.08, 0.1, 0.08]);
    addCollider(x, z, 0.5 * s);
  };
  // ---------------- 붉은 나무 (위로 갈수록 가는 줄기 · 뿌리 4개 · 가지 · 잎 3톤 여러 겹 · 떨어진 잎 · 가끔 루비 열매) ----------------
  const tree = (x, z, s = 1) => {
    const y = lowY(x, z, 0.5 * s), h = (3.8 + rnd() * 1.6) * s, segs = 6;
    for (let k = 0; k < segs; k++) {
      const r = (0.46 - k * 0.05) * s;
      deco.add(CYL, k % 2 ? 0x4a2a24 : 0x3a201c, [x, y + (k + 0.5) * h / segs, z], [0, rnd(), 0], [r, h / segs + 0.01, r]);
      if (k < 4) tiny.add(BOX, 0x2a1612, [x + r * 0.48, y + (k + 0.5) * h / segs, z], [0, rnd() * 3, 0], [0.02, h / segs * 0.8, 0.04]);
    }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd() * 0.5; deco.add(BOX, 0x3a201c, [x + Math.cos(a) * 0.36 * s, y + 0.1 * s, z + Math.sin(a) * 0.36 * s], [0, -a, 0.35], [0.7 * s, 0.17 * s, 0.15 * s]); }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.8, by = y + h * (0.55 + k * 0.08); deco.add(BOX, 0x3a201c, [x + Math.cos(a) * 0.6 * s, by, z + Math.sin(a) * 0.6 * s], [0, -a, 0.6], [1.2 * s, 0.11 * s, 0.11 * s]); }
    const leaves = [0xc8283a, 0xe8485a, 0x9a1a2a];
    for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 5 - layer; k++) {
      const a = rnd() * 6.28, rr = (1.3 - layer * 0.35) * s;
      deco.add(BALL, leaves[(k + layer) % 3], [x + Math.cos(a) * rr, y + h + (layer * 0.75 - 0.2) * s, z + Math.sin(a) * rr], [rnd(), rnd(), 0], [(2.0 - layer * 0.3) * s, (1.35 - layer * 0.15) * s, (2.0 - layer * 0.3) * s]);
    }
    if (rnd() < 0.5) for (let k = 0; k < 4; k++) { const a = rnd() * 6.28; gems.add(OCTA, 0xffffff, [x + Math.cos(a) * 1.4 * s, y + h - 0.5 * s, z + Math.sin(a) * 1.4 * s], [0, 0, 0], [0.12, 0.18, 0.12]); }
    for (let k = 0; k < 10; k++) { const lx = x + (rnd() - 0.5) * 4 * s, lz = z + (rnd() - 0.5) * 4 * s; tiny.add(BOX, pick([0xc8283a, 0xe8485a, 0xffa040]), [lx, H(lx, lz) + 0.015, lz], [0, rnd() * 3, 0], [0.16, 0.01, 0.1]); }
    addCollider(x, z, 0.55 * s);
  };
  // 붉은 풀 다발 · 흰 꽃 · 금빛 꽃 · 작은 돌
  const tuft = (x, z) => { const y = H(x, z); for (let m = 0; m < 5; m++) tiny.add(BOX, pick([0xd8404a, 0xc8303a, 0xe8606a, 0xa82432]), [x + (rnd() - 0.5) * 0.35, y + 0.13, z + (rnd() - 0.5) * 0.35], [0, rnd(), (rnd() - 0.5) * 0.6], [0.04, 0.24 + rnd() * 0.2, 0.04]); };
  const flower = (x, z) => { const y = H(x, z), hh = 0.2 + rnd() * 0.2, col = pick([0xffffff, 0xffd84a, 0xffe0e8]); tiny.add(BOX, 0x6a2a2a, [x, y + hh / 2, z], [0, 0, 0], [0.03, hh, 0.03]); const ry = rnd() * 3; shiny.add(BOX, col, [x, y + hh, z], [0, ry, 0], [0.18, 0.05, 0.07]); shiny.add(BOX, col, [x, y + hh, z], [0, ry + 1.57, 0], [0.18, 0.05, 0.07]); shiny.add(BOX, 0xff4a5a, [x, y + hh + 0.03, z], [0, 0, 0], [0.06, 0.04, 0.06]); };
  const pebble = (x, z) => { const s = 0.12 + rnd() * 0.25; deco.add(ROCK, pick([0x6a3a3a, 0x7a4a48, 0x8a5a54]), [x, H(x, z) + s * 0.25, z], [rnd(), rnd(), rnd()], [s, s * 0.6, s]); };

  // ---------------- 길: 붉은 돌 판석 + 경계석 + 풀 (선착장 → 광장 → 신전 · 공방 · 판매점 · 호수) ----------------
  const pathPts = [];
  const path = (ax, az, bx, bz, w = 2.6) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.9), nx = -(bz - az) / L, nz = (bx - ax) / L, ry = Math.atan2(-(bz - az), bx - ax);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      pathPts.push([x, z, w]);
      for (let k = -1; k <= 1; k++) { const px = x + nx * k * w / 3, pz = z + nz * k * w / 3; if (rnd() < 0.08) continue; deco.add(BOX, pick([0xb07070, 0xa06060, 0xc08078, 0x905050]), [px, H(px, pz) + 0.035, pz], [0, ry + (rnd() - 0.5) * 0.15, 0], [0.84, 0.07, w / 3 - 0.08]); }
      if (i % 1 === 0) for (const s of [-1, 1]) { const px = x + nx * s * (w / 2 + 0.2), pz = z + nz * s * (w / 2 + 0.2); deco.add(BOX, pick([0x6a4a48, 0x5a3a38, 0x7a5a54]), [px, H(px, pz) + 0.07, pz], [0, ry + (rnd() - 0.5) * 0.2, 0], [0.55, 0.16, 0.25]); if (rnd() < 0.5) tuft(px + nx * s * 0.4, pz + nz * s * 0.4); }
    }
  };
  const PLAZA = { x: RX, z: RZ - 6 };
  path(DOCK.x, DOCK.z + 1.5, PLAZA.x, PLAZA.z - 5, 3.2);
  path(PLAZA.x, PLAZA.z + 5, TEMPLE.x + 0.5, TEMPLE.z - TIERS[0][0] - 3.8, 3.2);
  path(PLAZA.x + 5, PLAZA.z, RUBY_LAGOON.x - RUBY_LAGOON.rx - 1.2, RUBY_LAGOON.z, 2.2);
  const SHOP_W = { x: RX - 15, z: RZ - 28 }, SHOP_S = { x: RX + 14, z: RZ - 28 };
  path(DOCK.x - 1.5, DOCK.z + 6, SHOP_W.x, SHOP_W.z - 2.8 - 1.0, 2.2);   // 공방 문 앞까지
  path(DOCK.x + 1.5, DOCK.z + 6, SHOP_S.x, SHOP_S.z - 2.8 - 1.0, 2.2);   // 판매점 문 앞까지
  const onPath = (x, z, m = 0) => pathPts.some(([px, pz, w]) => (x - px) ** 2 + (z - pz) ** 2 < (w / 2 + 0.7 + m) ** 2);
  // 광장: 둥근 판석 + 가운데 루비 분수 (수반 · 물 · 떠 있는 루비)
  {
    const { x, z } = PLAZA, y0 = H(x, z);
    for (let ring = 0; ring < 5; ring++) { const n = 8 + ring * 7; for (let k = 0; k < n; k++) { const a = (k + ring * 0.5) / n * 6.28, rr = 1.2 + ring * 1.0, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; deco.add(BOX, pick([0xc08078, 0xb07070, 0xd09088]), [px, H(px, pz) + 0.04, pz], [0, -a, 0], [0.9, 0.08, 0.8]); } }
    for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.28, up = (k % 2) * 0.012; deco.add(BOX, k % 2 ? 0xe8d0c8 : 0xd8c0b8, [x + Math.cos(a) * 2.2, y0 + 0.35 + up, z + Math.sin(a) * 2.2], [0, -a, 0], [0.4, 0.62, 1.05]); deco.add(BOX, k % 2 ? 0xd8b040 : 0xc8a030, [x + Math.cos(a) * 2.2, y0 + 0.68 + up, z + Math.sin(a) * 2.2], [0, -a, 0], [0.48, 0.06, 1.08]); } // 이웃 돌과 윗면 높이를 다르게
    shiny.add(new THREE.CylinderGeometry(1, 1, 1, 14), 0xe86a7a, [x, y0 + 0.45, z], [0, 0, 0], [2.0, 0.04, 2.0]);
    deco.add(CYL, 0xe8d0c8, [x, y0 + 0.75, z], [0, 0, 0], [0.7, 1.1, 0.7]);
    deco.add(CYL, 0xd8b040, [x, y0 + 1.32, z], [0, 0, 0], [0.95, 0.08, 0.95]);
    block(x - 2.6, z - 2.6, x + 2.6, z + 2.6);
  }

  // ---------------- 선착장 (나무 판 · 못 · 기둥 · 밧줄 난간 · 등불 · 말뚝 · 상자) + 환영 아치 ----------------
  {
    const x = DOCK.x, z0 = DOCK.z - 9, z1 = DOCK.z + 2.5, w = 3.2;
    for (let z = z0; z < z1; z += 0.5) {
      deco.add(BOX, Math.floor(z / 0.5) % 2 ? 0x9a6a52 : 0x8a5a44, [x, 0.2, z + 0.25], [0, 0, 0], [w, 0.12, 0.46]); // 윗면 0.26 = 부두 높이 (main.js onDock)
      for (const s of [-1, 1]) tiny.add(BOX, 0x3a3a3a, [x + s * (w / 2 - 0.15), 0.265, z + 0.25], [0, 0, 0], [0.04, 0.012, 0.04]); // 못
      tiny.add(BOX, 0x6a4232, [x + (rnd() - 0.5) * 2, 0.263, z + 0.25], [0, 0, 0], [0.5, 0.006, 0.02]); // 나뭇결
    }
    for (let z = z0 + 0.5; z < z1; z += 2.2) for (const s of [-1, 1]) { deco.add(CYL, 0x4a2e24, [x + s * (w / 2 + 0.05), -0.2, z], [0, 0, 0], [0.24, 1.4, 0.24]); tiny.add(CYL, 0x5a8a5a, [x + s * (w / 2 + 0.05), -0.25, z], [0, 0, 0], [0.26, 0.2, 0.26]); deco.add(CYL, 0x4a2e24, [x + s * (w / 2 + 0.05), 0.65, z], [0, 0, 0], [0.12, 0.7, 0.12]); }
    for (const s of [-1, 1]) for (let h of [0.62, 0.9]) tiny.add(BOX, 0xd8c8a0, [x + s * (w / 2 + 0.05), h, (z0 + z1) / 2], [0, 0, 0], [0.03, 0.03, z1 - z0 - 0.4]); // 밧줄 난간
    for (const s of [-1, 1]) { const lz = z0 + 0.4; deco.add(CYL, 0x2a2a30, [x + s * 1.2, 0.6, lz], [0, 0, 0], [0.08, 0.6, 0.08]); glow.add(BOX, 0xffffff, [x + s * 1.2, 1.05, lz], [0, 0, 0], [0.24, 0.3, 0.24]); deco.add(CONE, 0x2a2a30, [x + s * 1.2, 1.3, lz], [0, 0.78, 0], [0.4, 0.2, 0.4]); }
    for (const s of [-1, 1]) { deco.add(CYL, 0x3a3a3a, [x + s * 1.1, 0.5, z0 + 2], [0, 0, 0], [0.26, 0.32, 0.26]); deco.add(CYL, 0x2a2a2a, [x + s * 1.1, 0.68, z0 + 2], [0, 0, 0], [0.34, 0.06, 0.34]); } // 계류 말뚝
    deco.add(BOX, 0x8a5a2a, [x + 1.0, 0.6, z1 - 1.0], [0, 0.3, 0], [0.6, 0.6, 0.6]); deco.add(BOX, 0x7a4a24, [x + 1.1, 1.1, z1 - 1.05], [0, 0.6, 0], [0.42, 0.42, 0.42]); // 나무 상자
    for (let k = 0; k < 4; k++) tiny.add(BOX, 0x5a3418, [x + 1.0, 0.6, z1 - 1.0], [0, 0.3 + k * 0, 0], [0.62, 0.04, 0.62]);
    // 환영 아치: 붉은 돌 기둥 2개 + 위 들보 + 루비 장식 + 글자판
    const az = DOCK.z + 3.5, ay = H(x, az);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) deco.add(BOX, k % 2 ? 0xc08078 : 0xa86460, [x + s * 2.6, ay + 0.35 + k * 0.62, az], [0, 0, 0], [0.8, 0.62, 0.8]);
      deco.add(BOX, 0xd8b040, [x + s * 2.6, ay + 4.05, az], [0, 0, 0], [1.0, 0.12, 1.0]);
      gems.add(OCTA, 0xffffff, [x + s * 2.6, ay + 4.5, az], [0, 0, 0], [0.4, 0.7, 0.4]);
      block(x + s * 2.6 - 0.45, az - 0.45, x + s * 2.6 + 0.45, az + 0.45);
    }
    deco.add(BOX, 0x8a3a3a, [x, ay + 3.6, az], [0, 0, 0], [6.2, 0.55, 0.6]);
    deco.add(BOX, 0xd8b040, [x, ay + 3.3, az], [0, 0, 0], [6.3, 0.06, 0.66]);
    deco.add(BOX, 0xd8b040, [x, ay + 3.9, az], [0, 0, 0], [6.3, 0.06, 0.66]);
    const c = document.createElement('canvas'); c.width = 768; c.height = 96;
    const g = c.getContext('2d'); g.fillStyle = '#8a3a3a'; g.fillRect(0, 0, 768, 96); g.fillStyle = '#ffe0a0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '64px "Jua", "Malgun Gothic", sans-serif'; g.fillText('루비 섬', 384, 52);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    m.position.set(x, ay + 3.6, az - 0.31); m.rotation.y = Math.PI;
    scene.add(m);
  }

  // ---------------- 루비 신전 (랜드마크): 3단 받침 · 큰 계단 · 기둥 회랑 · 본전 · 루비 지붕 · 첨탑 · 떠 있는 거대 루비 · 봉인 제단 2개 ----------------
  const fx = { spin: [], rings: [], flames: [] };
  const sealSpots = [];
  {
    const { x, z } = TEMPLE, B = TEMPLE_BASE;
    const ST = [0xe8d0c8, 0xdcc0b8, 0xf0dcd4, 0xd0b0a8], DK = 0x8a5a54, GOLD = 0xd8b040;
    // 받침 3단: 몸통 + 돌 쌓은 무늬 + 위 테두리 + 아래 이끼 · 흙
    TIERS.forEach(([hs, top], i) => {
      const bot = i ? TIERS[i - 1][1] : -0.4, hh = top - bot;
      deco.add(BOX, ST[i % 4], [x, B + bot + hh / 2, z], [0, 0, 0], [hs * 2, hh, hs * 2]);
      for (let side = 0; side < 4; side++) for (let row = 0; row < Math.max(1, Math.round(hh / 0.5)); row++) {
        let t = -hs + (row % 2) * 0.5;
        while (t < hs - 0.1) {
          const Lb = Math.min(0.8 + rnd() * 0.8, hs - t), c = t + Lb / 2, yy = B + bot + 0.25 + row * 0.5;
          t += Lb;
          if (side === 0 && Math.abs(c) < 2.5) continue; // 계단 자리
          const n = hs + 0.012, sc = side < 2 ? [Lb - 0.05, 0.45, 0.03] : [0.03, 0.45, Lb - 0.05];
          const [px, pz] = side === 0 ? [c, -n] : side === 1 ? [c, n] : side === 2 ? [-n, c] : [n, c];
          deco.add(BOX, pick(ST), [x + px, yy, z + pz], [0, 0, 0], sc);
        }
      }
      // 윗면: 돌 판석 (3톤, 가끔 금 간 판) + 가장자리 금 테두리 4줄
      const inner = i < TIERS.length - 1 ? TIERS[i + 1][0] : 0;
      for (let px = -hs + 0.6; px < hs; px += 1.2) for (let pz = -hs + 0.6; pz < hs; pz += 1.2) {
        if (Math.abs(px) < inner - 0.3 && Math.abs(pz) < inner - 0.3) continue;   // 위 단에 덮이는 곳은 빼요
        if (Math.abs(px) < 2.2 && pz < 0) continue;                                // 계단 자리
        tiny.add(BOX, pick([0xe8d0c8, 0xd8bcb4, 0xf0dcd4, 0xc8a8a0]), [x + px, B + top + 0.012, z + pz], [0, (rnd() - 0.5) * 0.04, 0], [1.14, 0.02, 1.14]);
        if (rnd() < 0.06) tiny.add(BOX, 0x6a4a44, [x + px, B + top + 0.024, z + pz], [0, rnd() * 3, 0], [0.7, 0.006, 0.02]);
      }
      for (const [w2, d2, ox, oz] of [[hs * 2 + 0.2, 0.2, 0, -hs], [hs * 2 + 0.2, 0.2, 0, hs], [0.2, hs * 2 + 0.2, -hs, 0], [0.2, hs * 2 + 0.2, hs, 0]]) {
        if (oz < 0) { for (const sx of [-1, 1]) deco.add(BOX, GOLD, [x + sx * (hs + 2.2) / 2 + sx * 0.05, B + top + 0.03, z + oz], [0, 0, 0], [hs - 2.2 + 0.1, 0.06, d2]); continue; } // 계단 자리는 끊어요
        deco.add(BOX, GOLD, [x + ox, B + top + 0.03, z + oz], [0, 0, 0], [w2, 0.06, d2]);
      }
      for (let k = 0; k < 10; k++) { const a = rnd() * 4 | 0, t = (rnd() - 0.5) * hs * 1.8; const [px, pz] = a === 0 ? [t, -hs - 0.03] : a === 1 ? [t, hs + 0.03] : a === 2 ? [-hs - 0.03, t] : [hs + 0.03, t]; if (a === 0 && Math.abs(t) < 2.6) continue; tiny.add(BOX, pick([0x6a3a2a, 0x5a2a24]), [x + px, B + bot + 0.12, z + pz], [0, 0, 0], a < 2 ? [0.6 + rnd(), 0.2, 0.02] : [0.02, 0.2, 0.6 + rnd()]); } // 흙 · 이끼
      for (let k = 0; k < 6; k++) { const t = (rnd() - 0.5) * hs * 1.8; tiny.add(BOX, 0x7a1a2a, [x + t, B + top - 0.3 - rnd() * 0.4, z - hs - 0.025], [0, 0, 0], [0.06, 0.6 + rnd() * 0.5, 0.02]); } // 늘어진 붉은 덩굴
    });
    // 1 · 2단 위 꾸미기: 모서리 수정 무리 · 돌 등롱(받침 · 기둥 · 불빛 · 지붕) · 이끼 · 낙엽 (계단 자리는 비워요)
    for (let i = 0; i < 2; i++) {
      const hs = TIERS[i][0], inner = TIERS[i + 1][0], m = (hs + inner) / 2, ty = B + TIERS[i][1];
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) crystal(x + sx * m, z + sz * m, 0.9 + i * 0.2);
      for (let t = -m + 3.2; t < m - 2.5; t += 3.6) for (const [ux, uz] of [[t, -m], [t, m], [-m, t], [m, t]]) {
        if (uz === -m && Math.abs(ux) < 3.4) continue;
        const lx2 = x + ux, lz2 = z + uz;
        deco.add(BOX, DK, [lx2, ty + 0.12, lz2], [0, 0, 0], [0.5, 0.24, 0.5]);
        deco.add(BOX, ST[0], [lx2, ty + 0.55, lz2], [0, 0, 0], [0.22, 0.62, 0.22]);
        deco.add(BOX, ST[2], [lx2, ty + 0.9, lz2], [0, 0, 0], [0.44, 0.08, 0.44]);
        glow.add(BOX, 0xffffff, [lx2, ty + 1.08, lz2], [0, 0, 0], [0.26, 0.28, 0.26]);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tiny.add(BOX, DK, [lx2 + dx * 0.15, ty + 1.08, lz2 + dz * 0.15], [0, 0, 0], [0.04, 0.3, 0.04]);
        deco.add(CONE, 0xa8182a, [lx2, ty + 1.38, lz2], [0, 0.78, 0], [0.66, 0.32, 0.66]);
        shiny.add(BOX, GOLD, [lx2, ty + 1.58, lz2], [0, 0, 0], [0.06, 0.12, 0.06]);
        addCollider(lx2, lz2, 0.32);
      }
      for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, rr = inner + 0.4 + rnd() * (hs - inner - 0.8), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; if (Math.abs(px - x) > hs - 0.3 || Math.abs(pz - z) > hs - 0.3 || (Math.abs(px - x) < 2.4 && pz < z)) continue; tiny.add(BOX, pick([0x6a2a2a, 0x7a3a2a, 0xc8283a, 0xffa040]), [px, ty + 0.03, pz], [0, rnd() * 3, 0], [0.2 + rnd() * 0.5, 0.012, 0.15 + rnd() * 0.3]); }
    }
    block(x - TIERS[0][0], z - TIERS[0][0], x + TIERS[0][0], z + TIERS[0][0]);
    rects.pop(); // 신전은 걸어 올라가요 (높이는 templeGround) — 대신 계단 아닌 앞면 벽은 높이 차이로 막혀요
    // 큰 계단 (12칸) + 양옆 난간 + 사자(?) 대신 루비 화로
    const run = -TIERS[0][0] - 3.6, stepD = (-TIERS[2][0] - run) / 12;
    for (let k = 0; k < 12; k++) {
      const zc = z + run + (k + 0.5) * stepD, top = B + (k + 1) * 0.25;
      deco.add(BOX, k % 2 ? ST[1] : ST[0], [x, top - 0.6 - (k % 2) * 0.012, zc], [0, 0, 0], [4.36, 1.2, stepD + 0.02]); // 옆 난간 안쪽 면과 안 겹치게
      tiny.add(BOX, GOLD, [x, top + 0.006, zc - stepD / 2 + 0.05], [0, 0, 0], [4.4, 0.012, 0.08]);          // 계단 코 (금)
    }
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) {
      const zc = z + run + (k + 0.5) * stepD, top = B + (k + 1) * 0.25;
      deco.add(BOX, DK, [x + s * (2.45 + (k % 2) * 0.03), top - 0.2, zc], [0, 0, 0], [0.5 - (k % 2) * 0.06, 1.0, stepD + 0.02]); // 이웃 칸과 안쪽 면이 겹치지 않게 번갈아 3cm (자동 보정 8mm 로는 다시 안 겹쳐요)
      if (k % 3 === 0) { deco.add(BOX, GOLD, [x + s * 2.45, top + 0.32, zc], [0, 0, 0], [0.56, 0.06, 0.56]); gems.add(OCTA, 0xffffff, [x + s * 2.45, top + 0.55, zc], [0, 0, 0], [0.22, 0.36, 0.22]); }
    }
    // 화로 (계단 아래 양옆) — 불꽃이 일렁여요
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8a4a, emissive: 0xff3a1a, emissiveIntensity: 1.8, roughness: 0.6 });
    for (const s of [-1, 1]) {
      const bx = x + s * 4.2, bz = z + run - 0.6, by = H(bx, bz);
      deco.add(BOX, DK, [bx, by + 0.4, bz], [0, 0, 0], [0.8, 0.8, 0.8]);
      deco.add(CYL, 0x2a2a2a, [bx, by + 0.95, bz], [0, 0, 0], [0.9, 0.3, 0.9]);
      for (let k = 0; k < 6; k++) { const a = k * 1.05; shiny.add(BOX, GOLD, [bx + Math.cos(a) * 0.45, by + 1.1, bz + Math.sin(a) * 0.45], [0, -a, 0], [0.1, 0.08, 0.2]); }
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), flameMat); f.position.set(bx, by + 1.5, bz); f.userData.dynamic = true; scene.add(f); fx.flames.push(f);
      addCollider(bx, bz, 0.6);
    }
    // 꼭대기 (3단 위): 본전 — 기둥 회랑 12개 + 벽 + 큰 문(사슬로 잠김) + 지붕 3겹 + 첨탑
    const T3 = B + TIERS[2][1], hw = 5.0;
    deco.add(BOX, ST[2], [x, T3 + 2.2, z + 1.5], [0, 0, 0], [hw * 2 - 2.4, 4.4, 6.0]);                    // 본전 벽
    for (let row = 0; row < 8; row++) for (let k = -4; k <= 4; k++) { if (row < 6 && Math.abs(k) <= 1) continue; deco.add(BOX, pick(ST), [x + k * 0.86 + (row % 2) * 0.43, T3 + 0.3 + row * 0.55, z + 1.5 - 3.012], [0, 0, 0], [0.8, 0.5, 0.03]); }
    // 큰 문 (금 테두리 + 붉은 문짝 + 사슬)
    deco.add(BOX, 0x5a1a1e, [x, T3 + 1.6, z - 1.53], [0, 0, 0], [2.2, 3.2, 0.06]);
    for (const s of [-1, 1]) { for (let k = 0; k < 5; k++) tiny.add(BOX, 0x7a2a2e, [x + s * 0.55, T3 + 0.4 + k * 0.6, z - 1.57], [0, 0, 0], [0.9, 0.5, 0.02]); shiny.add(BOX, GOLD, [x + s * 0.18, T3 + 1.5, z - 1.6], [0, 0, 0], [0.08, 0.5, 0.05]); }
    shiny.add(BOX, GOLD, [x, T3 + 3.3, z - 1.55], [0, 0, 0], [2.6, 0.2, 0.12]);
    for (const s of [-1, 1]) shiny.add(BOX, GOLD, [x + s * 1.2, T3 + 1.6, z - 1.55], [0, 0, 0], [0.2, 3.3, 0.12]);
    // 사슬 · 자물쇠: 봉인이 풀리면 사라져요 (따로 움직이는 덩어리) / 열리면 문 안쪽이 붉게 빛나요
    const lockG = new THREE.Group(); lockG.userData.dynamic = true;
    const chainM = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.35, metalness: 0.5 });
    for (let k = 0; k < 11; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.04), chainM); c.position.set(x - 1.0 + k * 0.2, T3 + 1.5 + Math.sin(k / 10 * Math.PI) * -0.25, z - 1.63); c.rotation.z = k % 2 ? 0 : 1.57; lockG.add(c); }
    const lockM = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.08), new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.4, metalness: 0.5 }));
    lockM.position.set(x, T3 + 1.25, z - 1.66); lockG.add(lockM);
    scene.add(lockG); fx.lock = lockG;
    const openGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.0), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85 }));
    openGlow.position.set(x, T3 + 1.6, z - 1.66); openGlow.rotation.y = Math.PI; openGlow.visible = false; openGlow.userData.dynamic = true;
    scene.add(openGlow); fx.openGlow = openGlow;
    // 보스가 기다리는 동안 하늘로 솟는 붉은 빛기둥 (멀리서도 "저기로 가야 해!" 가 보여요)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(x, T3 + 30, z - 4); beam.visible = false; beam.userData.dynamic = true;
    scene.add(beam); fx.beam = beam;
    fx.door = { x, z: z - 1.53, y: T3 };
    // 회랑 기둥 (앞 6 · 옆 3씩)
    const colAt = (cx, cz) => {
      deco.add(BOX, DK, [cx, T3 + 0.12, cz], [0, 0, 0], [0.7, 0.24, 0.7]);
      for (let k = 0; k < 6; k++) deco.add(CYL, k % 2 ? ST[0] : ST[2], [cx, T3 + 0.24 + (k + 0.5) * 0.66, cz], [0, 0, 0], [0.5 - k * 0.012, 0.66, 0.5 - k * 0.012]);
      deco.add(CYL, GOLD, [cx, T3 + 1.6, cz], [0, 0, 0], [0.52, 0.06, 0.52]);
      deco.add(BOX, ST[3], [cx, T3 + 4.3, cz], [0, 0, 0], [0.75, 0.2, 0.75]);
      shiny.add(BOX, GOLD, [cx, T3 + 4.15, cz], [0, 0, 0], [0.62, 0.08, 0.62]);
      addCollider(cx, cz, 0.35);
    };
    for (let k = 0; k < 6; k++) colAt(x - hw + 0.6 + k * (hw * 2 - 1.2) / 5, z - 3.2);
    for (const s of [-1, 1]) for (let k = 1; k < 4; k++) colAt(x + s * (hw - 0.6), z - 3.2 + k * 2.1);
    // 지붕: 들보 + 루비 기와 3겹 (아래가 넓고 위로 좁게, 기와 줄무늬) + 처마 끝 금 장식
    deco.add(BOX, ST[3], [x, T3 + 4.55, z + 0.6], [0, 0, 0], [hw * 2 + 0.4, 0.3, 8.6]);
    const tileC = [0xb8182a, 0xa8102a, 0xc82a3a];
    for (let l = 0; l < 3; l++) {
      const w = hw * 2 + 1.2 - l * 2.6, d = 9.4 - l * 2.4, y = T3 + 4.9 + l * 0.75;
      deco.add(BOX, tileC[l % 3], [x, y, z + 0.6], [0, 0, 0], [w, 0.5, d]);
      for (let t = -w / 2 + 0.25; t < w / 2; t += 0.5) { tiny.add(BOX, tone(tileC[l % 3], 0.06), [x + t, y + 0.26, z + 0.6 - d / 2 + 0.02], [0, 0, 0], [0.2, 0.04, 0.06]); tiny.add(BOX, tone(tileC[l % 3], -0.05), [x + t, y, z + 0.6 - d / 2 - 0.012], [0, 0, 0], [0.4, 0.46, 0.02]); }
      for (const s of [-1, 1]) for (const q of [-1, 1]) shiny.add(BOX, GOLD, [x + s * w / 2, y + 0.3, z + 0.6 + q * d / 2], [0, 0.78, 0], [0.3, 0.3, 0.3]);
    }
    // 첨탑 + 떠서 도는 거대 루비 (멀리서도 보이는 랜드마크)
    const SY = T3 + 7.2;
    for (let k = 0; k < 5; k++) deco.add(BOX, k % 2 ? GOLD : ST[2], [x, SY + k * 0.7, z + 0.6], [0, k * 0.4, 0], [2.0 - k * 0.32, 0.7, 2.0 - k * 0.32]);
    const big = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: 0xff2a4a, roughness: 0.08, metalness: 0.3, emissive: 0xe8102a, emissiveIntensity: 1.0 }));
    big.position.set(x, SY + 5.6, z + 0.6); big.scale.y = 1.6; big.userData.dynamic = true; big.castShadow = true;
    LANTERN_MATS.push(big.material);
    scene.add(big); fx.spin.push(big);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 6, 32), new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffb02a, emissiveIntensity: 1.2 }));
    halo.position.copy(big.position); halo.rotation.x = Math.PI / 2; halo.userData.dynamic = true; scene.add(halo); fx.rings.push(halo);
    // (불빛은 따로 안 켜요 — 빛 하나가 늘면 게임 전체의 모든 재질이 무거워져요. 루비가 스스로 빛나요)
    block(x - hw + 0.8, z - 1.6, x + hw - 0.8, z + 4.6);  // 본전 (문 앞까지만)
    // ---- 봉인 제단 2개 (본전 앞 3단 위, 계단 양옆): 받침 3층 + 금 테 + 빛나는 봉인 고리 2겹 + 떠 있는 물고기 문양 ----
    SEALS.forEach((S, i) => {
      const sx = x + (i ? 1 : -1) * 3.6, sz = z - 5.6, sy = T3;
      for (let k = 0; k < 3; k++) deco.add(BOX, k % 2 ? ST[1] : DK, [sx, sy + 0.15 + k * 0.3, sz], [0, 0, 0], [1.6 - k * 0.3, 0.3, 1.6 - k * 0.3]);
      shiny.add(BOX, GOLD, [sx, sy + 0.92, sz], [0, 0, 0], [1.1, 0.06, 1.1]);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; tiny.add(BOX, 0x3a1a1a, [sx + Math.cos(a) * 0.82, sy + 0.45, sz + Math.sin(a) * 0.82], [0, -a, 0], [0.02, 0.3, 0.2]); } // 새김 무늬
      const ringM = new THREE.MeshStandardMaterial({ color: i ? 0xffd84a : 0xff4a5a, emissive: i ? 0xffb02a : 0xff1a3a, emissiveIntensity: 1.3, roughness: 0.3 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 28), ringM), r2 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 24), ringM);
      r1.position.set(sx, sy + 1.6, sz); r2.position.set(sx, sy + 1.6, sz);
      r1.userData.dynamic = r2.userData.dynamic = true;
      scene.add(r1, r2);
      const emblem = new THREE.Group(); emblem.position.set(sx, sy + 1.6, sz); emblem.userData.dynamic = true;
      const em = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: i ? 0xffc83a : 0xff3a5a, emissiveIntensity: 1.4 });
      for (const [w2, h2, ox, oy, rz] of [[0.42, 0.16, 0, 0, 0], [0.16, 0.2, -0.26, 0, 0.6], [0.16, 0.2, -0.26, 0, -0.6], [0.12, 0.08, 0.06, 0.12, 0]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.05), em); p.position.set(ox, oy, 0); p.rotation.z = rz; emblem.add(p); }
      scene.add(emblem);
      fx.rings.push(r1, r2);
      sealSpots.push({ seal: S, idx: i, x: sx, z: sz, y: sy, r1, r2, emblem, ringM });
      addCollider(sx, sz, 0.9);
      shops.push({ kind: 'rubyseal', seal: S, sealIdx: i, title: `${S.name} · 물고기 바치기 (E)`, group: new THREE.Group(), pos: new THREE.Vector3(sx, sy, sz - 1.5), promptAt: new THREE.Vector3(sx, sy + 2.6, sz), r: 1.5 });
    });
  }

  // ---------------- 루비 공방 (낚싯대 상점) · 루비 판매점 — 붉은 돌 + 흰 회벽 + 기와 지붕 + 창 + 문 + 간판 ----------------
  const shopBuilding = (S, title, kind, wallC, faceZ) => {
    const { x, z } = S, y = lowY(x, z, 4), W = 7, D = 5.6, WH = 3.4;
    const ST = [0xe8d8d0, 0xdccac2, 0xf2e6de], BR = [0x9a4a44, 0x8a3a36, 0xaa5a52];
    deco.add(BOX, 0x6a3a36, [x, y + 0.15, z], [0, 0, 0], [W + 0.6, 0.5, D + 0.6]);                     // 기초
    for (let k = 0; k < 14; k++) deco.add(BOX, pick(BR), [x - W / 2 + 0.25 + k * 0.5, y + 0.15, z - D / 2 - 0.31], [0, 0, 0], [0.46, 0.4, 0.03]);
    deco.add(BOX, wallC, [x, y + 0.4 + WH / 2, z], [0, 0, 0], [W, WH, D]);
    // 앞벽: 아래 벽돌 띠 + 회벽 + 나무 기둥 · 보 (반목조)
    for (let row = 0; row < 3; row++) for (let k = 0; k < 14; k++) { if (Math.abs(-W / 2 + 0.25 + k * 0.5 - x + x) < 0.9) continue; deco.add(BOX, pick(BR), [x - W / 2 + 0.25 + k * 0.5 + (row % 2) * 0.12, y + 0.6 + row * 0.3, z - D / 2 - 0.012], [0, 0, 0], [0.44, 0.26, 0.03]); }
    for (const t of [-W / 2 + 0.1, -1.0, 1.0, W / 2 - 0.1]) deco.add(BOX, 0x4a2a1e, [x + t, y + 0.4 + WH / 2, z - D / 2 - 0.04], [0, 0, 0], [0.16, WH, 0.06]);
    for (const hy of [1.4, WH + 0.3]) deco.add(BOX, 0x4a2a1e, [x, y + hy, z - D / 2 - 0.04], [0, 0, 0], [W, 0.14, 0.06]);
    for (const s of [-1, 1]) deco.add(BOX, 0x4a2a1e, [x + s * 2.2, y + 2.6, z - D / 2 - 0.045], [0, 0, s * 0.6], [0.1, 1.6, 0.05]); // 대각 보
    // 창 2개 (창틀 · 창살 · 창턱 · 커튼 · 화분)
    for (const s of [-1, 1]) {
      const wx = x + s * 2.2, wy = y + 2.3;
      glow.add(BOX, 0xffffff, [wx, wy, z - D / 2 - 0.02], [0, 0, 0], [1.0, 0.9, 0.02]);
      for (const q of [-1, 1]) tiny.add(BOX, 0xd83a4a, [wx + q * 0.36, wy, z - D / 2 - 0.035], [0, 0, 0], [0.24, 0.86, 0.02]);
      deco.add(BOX, 0xf4efe2, [wx, wy + 0.5, z - D / 2 - 0.06], [0, 0, 0], [1.16, 0.1, 0.08]); deco.add(BOX, 0xf4efe2, [wx, wy - 0.5, z - D / 2 - 0.08], [0, 0, 0], [1.3, 0.08, 0.2]);
      for (const q of [-1, 1]) deco.add(BOX, 0xf4efe2, [wx + q * 0.54, wy, z - D / 2 - 0.06], [0, 0, 0], [0.08, 1.0, 0.08]);
      tiny.add(BOX, 0xf4efe2, [wx, wy, z - D / 2 - 0.05], [0, 0, 0], [0.04, 0.9, 0.03]); tiny.add(BOX, 0xf4efe2, [wx, wy, z - D / 2 - 0.05], [0, 0, 0], [1.0, 0.04, 0.03]);
      deco.add(BOX, 0x6a3a22, [wx, wy - 0.66, z - D / 2 - 0.22], [0, 0, 0], [1.1, 0.2, 0.24]);
      for (let k = 0; k < 5; k++) shiny.add(BALL, pick([0xffffff, 0xffd84a, 0xff6a8a]), [wx - 0.4 + k * 0.2, wy - 0.5, z - D / 2 - 0.24], [0, 0, 0], [0.12, 0.12, 0.12]);
    }
    // 문: 문틀 + 문짝(나뭇결) + 손잡이 + 경첩
    deco.add(BOX, 0x5a2e1a, [x, y + 0.4 + 1.15, z - D / 2 - 0.05], [0, 0, 0], [1.4, 2.3, 0.06]);
    for (let k = 0; k < 5; k++) tiny.add(BOX, k % 2 ? 0x4a2414 : 0x6a3a22, [x - 0.56 + k * 0.28, y + 0.4 + 1.15, z - D / 2 - 0.085], [0, 0, 0], [0.02, 2.2, 0.01]);
    shiny.add(BALL, 0xd8b040, [x + 0.5, y + 1.5, z - D / 2 - 0.12], [0, 0, 0], [0.1, 0.1, 0.1]);
    for (const hy of [0.8, 2.2]) shiny.add(BOX, 0x2a2a2a, [x - 0.62, y + hy, z - D / 2 - 0.09], [0, 0, 0], [0.18, 0.08, 0.02]);
    deco.add(BOX, 0x4a2a1e, [x, y + 2.75, z - D / 2 - 0.07], [0, 0, 0], [1.7, 0.16, 0.12]);
    // 지붕 (붉은 기와 3단 + 용마루 + 처마 금 장식 + 굴뚝)
    for (let l = 0; l < 4; l++) { const w = W + 1.0 - l * 1.4, d = D + 1.2 - l * 1.4; deco.add(BOX, [0xa8182a, 0xb8202e, 0x981428, 0xc82a3a][l], [x, y + 0.4 + WH + 0.25 + l * 0.42, z], [0, 0, 0], [w, 0.42, d]); for (let t = -w / 2 + 0.2; t < w / 2; t += 0.4) tiny.add(BOX, 0x7a1020, [x + t, y + 0.4 + WH + 0.25 + l * 0.42, z - d / 2 - 0.012], [0, 0, 0], [0.04, 0.4, 0.02]); }
    deco.add(BOX, 0xd8b040, [x, y + 0.4 + WH + 1.95, z], [0, 0, 0], [W - 3.6, 0.12, 0.3]);
    deco.add(BOX, 0x6a3a36, [x + W / 2 - 1.2, y + WH + 2.2, z + 1.0], [0, 0, 0], [0.6, 1.4, 0.6]); deco.add(BOX, 0x4a2a28, [x + W / 2 - 1.2, y + WH + 2.95, z + 1.0], [0, 0, 0], [0.75, 0.12, 0.75]);
    // 간판 (문 위)
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#4a1a1e'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#d8b040'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = '#ffe0a0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '60px "Jua", "Malgun Gothic", sans-serif'; g.fillText(title, 256, 68);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }));
    sign.position.set(x, y + 3.25, z - D / 2 - 0.1); sign.rotation.y = Math.PI; scene.add(sign);
    // 문 앞 등불 2개
    for (const s of [-1, 1]) { deco.add(BOX, 0x2a2a30, [x + s * 1.0, y + 2.5, z - D / 2 - 0.25], [0, 0, 0], [0.06, 0.06, 0.4]); glow.add(BOX, 0xffffff, [x + s * 1.0, y + 2.3, z - D / 2 - 0.42], [0, 0, 0], [0.22, 0.28, 0.22]); }
    block(x - W / 2 - 0.3, z - D / 2 - 0.3, x + W / 2 + 0.3, z + D / 2 + 0.3);
    shops.push({ kind, title: title + ' (E)', group: new THREE.Group(), pos: new THREE.Vector3(x, y, z - D / 2 - 1.3), promptAt: new THREE.Vector3(x, y + 4.4, z - D / 2), r: 2.0 });
    return { x, y, z, front: z - D / 2 };
  };
  const workshop = shopBuilding(SHOP_W, '루비 공방', 'rod5', 0xf2e6de);
  const sellShop = shopBuilding(SHOP_S, '루비 판매점', 'sell', 0xf2e6de);
  // 공방 앞 전시대 5개 자리 (main.js 가 낚싯대를 세워서 돌려요)
  const stands = [];
  for (let i = 0; i < 3; i++) { // 공방 낚싯대 3개 (신전 낚싯대 2개는 성소에서 팔아요)
    const sx = workshop.x + [-4.4, -2.2, 2.6][i], sz = workshop.front - 4.2, sy = H(sx, sz); // 가운데는 문으로 가는 길이라 비워요
    deco.add(BOX, 0x6a3a36, [sx, sy + 0.1, sz], [0, 0, 0], [1.0, 0.2, 1.0]);
    deco.add(CYL, 0xe8d8d0, [sx, sy + 0.5, sz], [0, 0, 0], [0.7, 0.6, 0.7]);
    shiny.add(CYL, 0xd8b040, [sx, sy + 0.82, sz], [0, 0, 0], [0.82, 0.06, 0.82]);
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.78; gems.add(OCTA, 0xffffff, [sx + Math.cos(a) * 0.36, sy + 0.92, sz + Math.sin(a) * 0.36], [0, 0, 0], [0.1, 0.16, 0.1]); }
    stands.push({ x: sx, y: sy + 0.85, z: sz, i });
    addCollider(sx, sz, 0.5);
  }

  // ---------------- 섬 곳곳: 나무 · 수정 · 바위 · 풀 · 꽃 · 낙엽 (길 · 건물 · 신전 · 호수는 비워요) ----------------
  const busy = (x, z, m = 0) => onPath(x, z, m) || Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < TIERS[0][0] * 1.42 + 2 + m ||
    Math.hypot((x - RUBY_LAGOON.x) / (RUBY_LAGOON.rx + 1.5 + m), (z - RUBY_LAGOON.z) / (RUBY_LAGOON.rz + 1.5 + m)) < 1 ||
    rects.some((r) => x > r[0] - 1 - m && x < r[2] + 1 + m && z > r[1] - 1 - m && z < r[3] + 1 + m) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 6.5 + m ||
    Math.hypot(x - workshop.x, z - (workshop.front - 4.2)) < 8 + m || Math.hypot(x - DOCK.x, z - DOCK.z) < 5 + m ||
    ctx.colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.8 + m) ** 2);
  let trees = 0, crystals = 0;
  for (let k = 0; k < 900 && (trees < 70 || crystals < 60); k++) {
    const a = rnd() * 6.28, rr = R * (0.12 + rnd() * 0.76), x = RX + Math.cos(a) * rr, z = RZ + Math.sin(a) * rr;
    if (busy(x, z, 1.2)) continue;
    if (rnd() < 0.55 && trees < 70) { tree(x, z, 0.85 + rnd() * 0.5); trees++; } else if (crystals < 60) { crystal(x, z, 0.7 + rnd() * 1.1); crystals++; }
  }
  for (let k = 0; k < 2000; k++) {
    const a = rnd() * 6.28, rr = R * Math.sqrt(rnd()) * 0.95, x = RX + Math.cos(a) * rr, z = RZ + Math.sin(a) * rr;
    if (busy(x, z, -0.6)) continue;
    const roll = rnd();
    if (roll < 0.5) tuft(x, z); else if (roll < 0.66) flower(x, z); else if (roll < 0.8) pebble(x, z);
    else if (roll < 0.92) { for (let m = 0; m < 4; m++) { const lx = x + (rnd() - 0.5), lz = z + (rnd() - 0.5); tiny.add(BOX, pick([0xc8283a, 0xe8485a, 0xffa040]), [lx, H(lx, lz) + 0.015, lz], [0, rnd() * 3, 0], [0.16, 0.01, 0.1]); } }
    else gems.add(OCTA, 0xffc0c8, [x, H(x, z) + 0.1, z], [rnd(), rnd(), rnd()], [0.12, 0.2, 0.12]); // 땅에 박힌 작은 루비
  }
  // 바닷가: 붉은 조개 · 루비 조각 · 큰 바위 + 큰 수정 몇 개 (바다 쪽으로)
  for (let k = 0; k < 60; k++) { const a = rnd() * 6.28, rr = R * (0.93 + rnd() * 0.06), x = RX + Math.cos(a) * rr, z = RZ + Math.sin(a) * rr; if (Math.hypot(x - DOCK.x, z - DOCK.z) < 5) continue; if (rnd() < 0.5) tiny.add(CONE, pick([0xffd0d0, 0xffb0b8, 0xf4e0d8]), [x, H(x, z) + 0.04, z], [1.57, rnd() * 3, 0], [0.18, 0.12, 0.1]); else gems.add(OCTA, 0xffffff, [x, H(x, z) + 0.06, z], [rnd(), rnd(), rnd()], [0.1, 0.14, 0.1]); }
  for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, rr = R * (0.98 + rnd() * 0.08), x = RX + Math.cos(a) * rr, z = RZ + Math.sin(a) * rr; if (Math.hypot(x - DOCK.x, z - DOCK.z) < 8) continue; const s = 0.8 + rnd() * 1.3; deco.add(ROCK, pick([0x6a3a3a, 0x5a2e30]), [x, 0.0 + s * 0.15, z], [rnd(), rnd() * 3, rnd()], [s, s * 0.7, s]); }
  for (const [ax, az, s] of [[-30, -20, 2.2], [33, 24, 2.6], [-36, 18, 2.4], [20, -36, 1.8], [-10, 38, 2.0]]) { const x = RX + ax, z = RZ + az; if (!busy(x, z)) crystal(x, z, s); } // 큰 수정 (멀리서도 보여요)

  // 다 만들었으면 덩어리로
  deco.build(scene); tiny.build(scene, { cast: false }); shiny.build(scene);
  gems.build(scene, { cast: false, material: gemMat }); glow.build(scene, { cast: false, material: glowMat });

  const inIsland = (x, z) => (x - RX) ** 2 + (z - RZ) ** 2 < R * R;
  return {
    stands, sealSpots, door: fx.door, dockAt: { x: DOCK.x, z: DOCK.z - 7.5 }, arriveAt: { x: DOCK.x, z: DOCK.z + 1.5 },
    inIsland, blocked: (x, z) => rects.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]),
    // 봉인 상태에 맞게 고리 · 문양 보여 주기 (풀린 봉인은 꺼져요)
    //  봉인 2개가 모두 풀리면 신전 문이 열려요 (사슬이 사라지고 문 안이 붉게) · 보스가 남아 있으면 빛기둥
    setSeals(save) {
      let openN = 0, pending = false;
      for (const s of sealSpots) {
        const open = (save.ruby[s.seal.id] || 0) >= s.seal.need;
        s.r1.visible = s.r2.visible = !open;
        s.emblem.visible = true;
        s.ringM.emissiveIntensity = open ? 0.2 : 1.3;
        s.open = open;
        if (open) openN++;
        if (!save.ruby.bossDone) pending = true;
      }
      const allOpen = openN === sealSpots.length; // 봉인 2개가 모두 풀려야 문이 열려요
      fx.lock.visible = !allOpen; fx.openGlow.visible = allOpen; fx.beam.visible = allOpen && pending;
    },
    update(t) {
      for (const b of fx.spin) { b.rotation.y = t * 0.5; b.position.y += Math.sin(t * 1.3) * 0.003; }
      fx.rings.forEach((r, i) => { r.rotation.x = Math.PI / 2 + Math.sin(t * 0.7 + i) * 0.3; r.rotation.y = t * (0.6 + i * 0.13); });
      for (const s of sealSpots) { s.emblem.rotation.y = t * 1.2; s.emblem.position.y = s.y + 1.6 + Math.sin(t * 2 + s.idx) * 0.08; }
      fx.flames.forEach((f, i) => f.scale.set(1, 0.85 + Math.sin(t * 9 + i * 2) * 0.2, 1));
      if (fx.beam.visible) { fx.beam.material.opacity = 0.16 + Math.sin(t * 2.2) * 0.07; fx.beam.rotation.y = t * 0.3; }
      if (fx.openGlow.visible) fx.openGlow.material.opacity = 0.7 + Math.sin(t * 3) * 0.15;
    }
  };
}
