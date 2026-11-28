// =====================================================
//  노을 박물관
//   - 바깥: 마을 동쪽(언덕 너머) 광장 위의 돌 박물관 (기둥 현관 · 돔 · 분수 광장)
//   - 안: 맵 북쪽 아주 먼 곳의 "엄청 큰" 전시관. 모든 물고기마다 실제 크기 어항이 하나씩 있어요
//   - 어항 앞에서 E → 잡은 물고기를 기증(전시)해요. 모든 어항을 채우면 안내 데스크에서 $100,000,000 !
//
//  안쪽 전시관은 집 방처럼 "따로 떨어진 곳"이라 문으로 들어가면 화면이 까매졌다가 옮겨 가요 (main.js enterRoom)
//  블록은 전부 DecoBatch 로 꼭짓점 색을 칠해서 구역마다 한 덩어리로 합쳐요 (가벼워요)
// =====================================================
import { DecoBatch } from './seaworld.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fmtMoney } from './money.js';

export const MUSEUM_REWARD = 100000000;
// 바깥 건물 한가운데 (정면 = 서쪽, 마을을 봐요)
export const MUSEUM_EXT = { x: 76, z: 4 };
// 박물관 동네: 원래 마을 경계(x 44) 밖이지만 걸어갈 수 있는 땅 (main.js walkable)
export const MUSEUM_AREA = { x0: 43, x1: 104, z0: -36, z1: 48 };
const IN_X = 0, IN_ZF = -1040;      // 안쪽 전시관: 가운데 x, 앞벽 z (카메라 쪽)
const FLOOR = 0.3;                  // 전시관 바닥 높이 (main.js groundY 가 방 안이면 0.3 을 줘요)

// 전시관 구역 (왼쪽 → 오른쪽). test = 이 구역에 들어갈 물고기
const HALLS = [
  { key: 'lake', name: '호수관', sub: '큰 호수와 개울의 물고기', test: (f) => !f.zone && !f.season && !f.weather,
    wall: [0xe8dcc0, 0xdccfae, 0xf0e6cc], floor: [0xc8b490, 0xb8a27a, 0xd4c29e], accent: 0x3a7a4a, trim: 0x6a4a2e, cab: 0x5a3a24, plant: [0x3a8a3a, 0x4aa04a, 0x2e6e2e], deco: 'log' },
  { key: 'season', name: '사계절관', sub: '봄 · 여름 · 가을 · 겨울 · 비 오는 날', test: (f) => !!(f.season || f.weather),
    wall: [0xf2dce4, 0xe8ccd6, 0xf8e8ee], floor: [0xd8c0b8, 0xc8aaa2, 0xe4d0c8], accent: 0xd86a9a, trim: 0x8a4a5a, cab: 0x6a3a44, plant: [0xff9ab8, 0x4aa04a, 0xffd84a], deco: 'petal' },
  { key: 'mountain', name: '산 위 연못관', sub: '세상에 없는 신기한 물고기', test: (f) => f.zone === 'mountain',
    wall: [0xe8e0f8, 0xdcd0f0, 0xf2ecff], floor: [0xd8d0e8, 0xc8bcdc, 0xe8e0f4], accent: 0xff8ac8, trim: 0x7a5aa8, cab: 0x5a4a7a, plant: [0xff9ac8, 0x9ad8ff, 0xffe07a], deco: 'candy' },
  { key: 'aurora', name: '오로라 강관', sub: '밤하늘처럼 빛나는 강의 거대한 물고기', test: (f) => f.zone === 'aurora',
    wall: [0x2a3456, 0x232c4a, 0x323e64], floor: [0x3a4a6a, 0x2e3c5a, 0x46587a], accent: 0x7affe0, trim: 0xb48cff, cab: 0x1e2440, plant: [0x7affe0, 0xb48cff, 0x5ac8ff], deco: 'crystal' },
  { key: 'sea', name: '바다관', sub: '넓은 바다의 물고기', test: (f) => f.zone === 'sea',
    wall: [0xd8ecf4, 0xc8e0ec, 0xe4f4fa], floor: [0xe8dcc0, 0xd8c8a8, 0xf0e8d4], accent: 0x2a6ab8, trim: 0x2a4a6a, cab: 0x2a3a5a, plant: [0xff7a8a, 0xffa84a, 0xff6ab8], deco: 'coral' },
  { key: 'jungle', name: '정글관', sub: '정글 연못의 힘센 물고기', test: (f) => f.zone === 'jungle',
    wall: [0xc8d8b0, 0xb8c89e, 0xd4e2be], floor: [0x9aa87a, 0x8a986a, 0xa8b688], accent: 0x3a8a3a, trim: 0x5a4a2a, cab: 0x4a3a1e, plant: [0x2e8a2e, 0x4ab84a, 0x1e6a1e], deco: 'root' },
  { key: 'ruby', name: '루비관', sub: '루비 섬의 붉은 보석 물고기', test: (f) => f.zone === 'ruby',
    wall: [0x5a1a22, 0x4a121a, 0x6a2430], floor: [0x3a1418, 0x2e0e12, 0x4a1c22], accent: 0xff3a5a, trim: 0xd8b040, cab: 0x2a0a10, plant: [0xff2a4a, 0xd8203a, 0xffb03a], deco: 'ruby' }
];

// ---------------- 세이브 검사 (main.js cleanSave 가 불러요) ----------------
//  save.museum = { fish: { 물고기이름: 물고기 }, paid: 보상 받았는지 }
export function cleanMuseum(s, out, FISH, cleanItems) {
  const m = s && s.museum && typeof s.museum === 'object' ? s.museum : {};
  out.museum = { fish: {}, paid: m.paid === true };
  if (m.fish && typeof m.fish === 'object') for (const f of FISH) {
    const it = cleanItems([m.fish[f.name]], 1)[0];
    if (it && it.name === f.name) { delete it.big; out.museum.fish[f.name] = it; }
  }
}

export function buildMuseum(ctx) {
  const { THREE, scene, shops, LANTERN_MATS, FISH, RARITY, findFish, makeFishModel, fishScale, fmtKg, compactRig } = ctx;
  let seed = 9173;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const CYL6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
  const CONE = new THREE.ConeGeometry(0.5, 1, 8);
  const BALL = new THREE.IcosahedronGeometry(0.5, 0);
  const ROCK = new THREE.DodecahedronGeometry(0.5, 0);
  const OCTA = new THREE.OctahedronGeometry(0.5, 0);
  const deco = new DecoBatch(THREE);
  const shiny = new DecoBatch(THREE, { roughness: 0.3, metalness: 0.35 });
  const tiny = new DecoBatch(THREE);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, roughness: 0.4, emissive: 0xffb050, emissiveIntensity: 1.2 });
  LANTERN_MATS.push(glowMat); // 밤에 더 밝게 (창문 · 등불)
  const glow = new DecoBatch(THREE);
  const tankGlowMat = new THREE.MeshStandardMaterial({ color: 0xe8fbff, roughness: 0.3, emissive: 0xbfefff, emissiveIntensity: 1.1 });
  const tankGlow = new DecoBatch(THREE);      // 어항 조명 (늘 켜져 있어요)
  const gemMat = new THREE.MeshStandardMaterial({ color: 0xff3a5a, roughness: 0.15, metalness: 0.3, emissive: 0xd8102a, emissiveIntensity: 0.7 });
  const gems = new DecoBatch(THREE);          // 루비관 보석
  const auroraMat = new THREE.MeshStandardMaterial({ color: 0x9affe8, roughness: 0.2, emissive: 0x3affc8, emissiveIntensity: 0.9 });
  const auroraB = new DecoBatch(THREE);       // 오로라관 빛나는 수정
  const glassB = [], waterB = [];             // 어항 유리 · 물 (투명이라 따로 합쳐요)
  const rects = [];                           // 못 지나가는 네모 (x0, z0, x1, z1)
  const block = (x0, z0, x1, z1) => rects.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  const tone = (c, k) => { const o = new THREE.Color(c); o.offsetHSL(0, 0, k); return o.getHex(); }; // 같은 계열 밝기만 살짝

  // =====================================================
  //  1) 바깥 건물 (마을 동쪽)
  //   지역 좌표: 정면 = -z. RY 로 돌려서 정면이 서쪽(-x, 마을 쪽)을 보게 놓아요
  //   (주의: 회전은 y 와 z 만 써요. x 회전을 섞으면 순서가 틀어져요)
  // =====================================================
  const EX = MUSEUM_EXT.x, EZ = MUSEUM_EXT.z, RY = Math.PI / 2;
  const at = (lx, lz) => [EX + lz, EZ - lx];                   // 지역 → 세상 (RY = 90도)
  const P = (b, geo, col, lx, ly, lz, sc, rz = 0, ry = 0) => { const [wx, wz] = at(lx, lz); b.add(geo, col, [wx, ly, wz], [0, RY + ry, rz], sc); };
  const blockL = (lx0, lz0, lx1, lz1) => { const a = at(lx0, lz0), b2 = at(lx1, lz1); block(a[0], a[1], b2[0], b2[1]); };
  const BW = 24, BD = 16, Y0 = -0.08;            // 건물 가로 · 깊이 · 땅 높이
  const PH = 0.6;                                // 받침(포디움) 높이 → 바닥 0.52
  const FY = Y0 + PH;                            // 건물 바닥 높이
  const WH = 7.2;                                // 벽 높이
  const ST = { a: [0xd8d0c0, 0xccc2b0, 0xe2dbcc, 0xc4b8a4], dark: 0x8a8274, trim: 0xf0ead8, moss: [0x5a7a3a, 0x6a8a44, 0x4a6a30], dirt: [0x8a7a5a, 0x7a6a4a] };
  {
    // ---- 받침(포디움): 큰 돌을 쌓은 무늬 + 위 테두리 ----
    P(deco, BOX, ST.dark, 0, Y0 + PH / 2, 0, [BW + 0.8, PH, BD + 0.8]);
    for (const [len, axis, off] of [[BW + 0.8, 'x', -(BD + 0.8) / 2], [BW + 0.8, 'x', (BD + 0.8) / 2], [BD + 0.8, 'z', -(BW + 0.8) / 2], [BD + 0.8, 'z', (BW + 0.8) / 2]]) {
      for (let row = 0; row < 2; row++) {
        let t = -len / 2 + (row ? 0.35 : 0);
        while (t < len / 2 - 0.05) {
          const L = Math.min(0.7 + rnd() * 0.6, len / 2 - t);
          const c = t + L / 2, y = Y0 + 0.15 + row * 0.3;
          const out = off + Math.sign(off) * 0.015;
          if (axis === 'x') P(deco, BOX, pick(ST.a), c, y, out, [L - 0.04, 0.26, 0.04]);
          else P(deco, BOX, pick(ST.a), out, y, c, [0.04, 0.26, L - 0.04]);
          t += L;
        }
      }
    }
    P(deco, BOX, ST.trim, 0, FY + 0.04, 0, [BW + 1.0, 0.08, BD + 1.0]);                 // 받침 위 테두리
    for (let k = 0; k < 14; k++) P(tiny, BOX, pick(ST.dirt), -BW / 2 + rnd() * BW, Y0 + 0.06, (rnd() < 0.5 ? -1 : 1) * ((BD + 0.8) / 2 + 0.03), [0.6 + rnd(), 0.12 + rnd() * 0.1, 0.02]); // 흙 튄 아랫부분
    for (let k = 0; k < 10; k++) P(tiny, BOX, pick(ST.moss), -BW / 2 + rnd() * BW, Y0 + 0.03 + rnd() * 0.2, (rnd() < 0.5 ? -1 : 1) * ((BD + 0.8) / 2 + 0.035), [0.3 + rnd() * 0.5, 0.08 + rnd() * 0.12, 0.02]); // 이끼

    // ---- 벽: 몸통 + 돌 쌓은 무늬(줄마다 어긋나게) + 창 · 문 자리는 비워요 ----
    P(deco, BOX, ST.a[0], 0, FY + WH / 2, 0, [BW, WH, BD]);
    const DOOR_W = 2.6, DOOR_H = 3.8;
    const winL = [-8.2, -4.6, 4.6, 8.2];          // 정면 창 (문 양옆)
    const sideWin = [-5.2, -1.8, 1.8, 5.2];       // 옆면 창
    const holes = []; // [면, 가운데, 아래y, 위y, 너비]
    holes.push(['front', 0, FY, FY + DOOR_H + 1.0, DOOR_W + 0.6]);
    for (const w of winL) { holes.push(['front', w, FY + 1.2, FY + 3.4, 1.7]); holes.push(['front', w, FY + 4.3, FY + 6.1, 1.5]); }
    for (const w of sideWin) for (const side of ['left', 'right']) { holes.push([side, w, FY + 1.2, FY + 3.4, 1.7]); holes.push([side, w, FY + 4.3, FY + 6.1, 1.5]); }
    const isHole = (face, c, y, half) => holes.some(([f, hc, y0, y1, w]) => f === face && Math.abs(c - hc) < w / 2 + half && y > y0 - 0.15 && y < y1 + 0.15);
    const course = (face, len) => {
      for (let row = 0; row < 12; row++) {
        const y = FY + 0.3 + row * 0.58;
        if (y > FY + WH - 0.5) break;
        let t = -len / 2 + (row % 2 ? 0.45 : 0);
        while (t < len / 2 - 0.05) {
          const L = Math.min(0.9 + rnd() * 0.7, len / 2 - t), c = t + L / 2;
          t += L;
          if (isHole(face, c, y, L / 2 - 0.1)) continue;
          const col = pick(ST.a);
          if (face === 'front') P(deco, BOX, col, c, y, -BD / 2 - 0.012, [L - 0.05, 0.53, 0.03]);
          else if (face === 'back') P(deco, BOX, col, c, y, BD / 2 + 0.012, [L - 0.05, 0.53, 0.03]);
          else if (face === 'left') P(deco, BOX, col, -BW / 2 - 0.012, y, c, [0.03, 0.53, L - 0.05]);
          else P(deco, BOX, col, BW / 2 + 0.012, y, c, [0.03, 0.53, L - 0.05]);
          if (rnd() < 0.05) P(tiny, BOX, 0x6a6458, face === 'left' ? -BW / 2 - 0.03 : face === 'right' ? BW / 2 + 0.03 : c, y + 0.05, face === 'front' ? -BD / 2 - 0.03 : face === 'back' ? BD / 2 + 0.03 : c, face === 'left' || face === 'right' ? [0.01, 0.35, 0.03] : [0.03, 0.35, 0.01], 0.4); // 금
        }
      }
    };
    course('front', BW); course('back', BW); course('left', BD); course('right', BD);
    // 모서리 돌 (큰 돌 · 작은 돌 번갈아 튀어나와요)
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 11; k++) {
      const y = FY + 0.32 + k * 0.62, long = k % 2 === 0;
      P(deco, BOX, k % 3 ? ST.trim : ST.a[3], cx * (BW / 2 + 0.02) - cx * (long ? 0.45 : 0.3), y, cz * (BD / 2 + 0.04), [long ? 0.95 : 0.65, 0.56, 0.12]);
      P(deco, BOX, k % 3 ? ST.trim : ST.a[3], cx * (BW / 2 + 0.04), y, cz * (BD / 2 + 0.02) - cz * (long ? 0.3 : 0.45), [0.12, 0.56, long ? 0.65 : 0.95]);
    }
    // 띠 몰딩 2줄 (아래 굽 · 가운데 층 띠) + 맨 위 처마(3겹 + 이빨 장식)
    for (const [y, h, o] of [[FY + 0.2, 0.4, 0.06], [FY + 3.85, 0.22, 0.08]]) {
      P(deco, BOX, ST.trim, 0, y, -BD / 2 - o / 2, [BW + o * 2, h, o]);
      P(deco, BOX, ST.trim, 0, y, BD / 2 + o / 2, [BW + o * 2, h, o]);
      P(deco, BOX, ST.trim, -BW / 2 - o / 2, y, 0, [o, h, BD]);
      P(deco, BOX, ST.trim, BW / 2 + o / 2, y, 0, [o, h, BD]);
    }
    for (let k = 0; k < 3; k++) {
      const y = FY + WH - 0.25 + k * 0.18, o = 0.1 + k * 0.12;
      P(deco, BOX, k === 1 ? ST.a[2] : ST.trim, 0, y, 0, [BW + o * 2, 0.18, BD + o * 2]);
    }
    for (let t = -BW / 2 + 0.2; t < BW / 2; t += 0.4) { P(tiny, BOX, ST.trim, t, FY + WH - 0.38, -BD / 2 - 0.08, [0.18, 0.14, 0.14]); P(tiny, BOX, ST.trim, t, FY + WH - 0.38, BD / 2 + 0.08, [0.18, 0.14, 0.14]); }
    for (let t = -BD / 2 + 0.2; t < BD / 2; t += 0.4) { P(tiny, BOX, ST.trim, -BW / 2 - 0.08, FY + WH - 0.38, t, [0.14, 0.14, 0.18]); P(tiny, BOX, ST.trim, BW / 2 + 0.08, FY + WH - 0.38, t, [0.14, 0.14, 0.18]); }

    // ---- 창문: 창틀 + 창살 + 창턱(받침 2개) + 머릿돌 + 안쪽 커튼 + 아래 창엔 화분 ----
    const windowAt = (face, c, ybot, w, h, flowers) => {
      // face 기준: 바깥 방향 n, 면 위 좌표 c
      const fx = (u, n) => face === 'front' ? [u, -BD / 2 - n] : face === 'left' ? [-BW / 2 - n, u] : [BW / 2 + n, u];
      const put = (b, geo, col, u, y, n, su, sy, sn) => { const [lx, lz] = fx(u, n); P(b, geo, col, lx, y, lz, face === 'front' ? [su, sy, sn] : [sn, sy, su]); };
      const yc = ybot + h / 2;
      // 벽 몸통 바로 앞에 층층이 (벽 속에 묻히면 안 보여요): 어두운 창 그늘 → 유리(밤에 불빛) → 커튼 → 창살 · 틀
      put(deco, BOX, 0x3a3a44, c, yc, 0.006, w + 0.04, h + 0.04, 0.012);
      put(glow, BOX, 0xffffff, c, yc, 0.016, w - 0.1, h - 0.1, 0.008);
      for (const s of [-1, 1]) put(tiny, BOX, pick([0xb83a3a, 0xa83030]), c + s * (w / 2 - 0.18), yc, 0.026, 0.3, h - 0.15, 0.012); // 커튼
      put(tiny, BOX, 0x8a2a2a, c, ybot + h - 0.12, 0.028, w - 0.1, 0.12, 0.014);     // 커튼 위 주름 덮개
      const fr = 0xf4efe2;
      put(deco, BOX, fr, c, ybot + h + 0.04, 0.02, w + 0.2, 0.12, 0.12);         // 위 틀
      put(deco, BOX, fr, c, ybot - 0.04, 0.02, w + 0.2, 0.1, 0.12);              // 아래 틀
      for (const s of [-1, 1]) put(deco, BOX, fr, c + s * (w / 2 + 0.04), yc, 0.02, 0.1, h + 0.16, 0.12);
      put(tiny, BOX, fr, c, yc, 0.05, 0.06, h - 0.1, 0.03);                      // 세로 창살
      for (const k of [-1, 1]) put(tiny, BOX, fr, c, yc + k * h / 4, 0.052, w - 0.1, 0.05, 0.03); // 가로 창살 2줄
      put(deco, BOX, ST.trim, c, ybot - 0.16, 0.12, w + 0.5, 0.12, 0.3);          // 창턱
      for (const s of [-1, 1]) put(deco, BOX, ST.a[3], c + s * (w / 2 + 0.05), ybot - 0.32, 0.08, 0.14, 0.2, 0.18); // 창턱 받침
      put(deco, BOX, ST.trim, c, ybot + h + 0.24, 0.04, w + 0.5, 0.2, 0.16);      // 머리 장식
      put(deco, BOX, ST.a[3], c, ybot + h + 0.28, 0.1, 0.32, 0.34, 0.12);         // 머릿돌(키스톤)
      if (flowers) {
        put(deco, BOX, 0x7a4a2a, c, ybot - 0.02 + 0.12, 0.38, w + 0.1, 0.24, 0.26); // 화분 상자
        for (let k = 0; k < 4; k++) put(tiny, BOX, 0x6a4a2e, c - w / 2 + 0.1 + k * (w / 3.2), ybot + 0.12, 0.52, 0.02, 0.2, 0.01); // 상자 나뭇결
        for (let k = 0; k < 7; k++) put(tiny, BALL, pick([0x4a8a3a, 0x3a7a2e, 0x5a9a44]), c - w / 2 + 0.15 + k * (w / 6.4), ybot + 0.32, 0.38 + (rnd() - 0.5) * 0.1, 0.22, 0.18, 0.2);
        for (let k = 0; k < 6; k++) put(shiny, BALL, pick([0xff6a8a, 0xffd84a, 0xffffff, 0xff9a4a]), c - w / 2 + 0.2 + k * (w / 5.6), ybot + 0.42, 0.42 + (rnd() - 0.5) * 0.12, 0.1, 0.1, 0.1);
      }
    };
    for (const w of winL) { windowAt('front', w, FY + 1.2, 1.7, 2.2, true); windowAt('front', w, FY + 4.3, 1.5, 1.8, false); }
    for (const w of sideWin) for (const side of ['left', 'right']) { windowAt(side, w, FY + 1.2, 1.7, 2.2, true); windowAt(side, w, FY + 4.3, 1.5, 1.8, false); }

    // ---- 큰 문: 문틀 + 두 짝 (판넬 2칸씩) + 손잡이 + 경첩 3개씩 + 위 부채꼴 창 ----
    const dz = -BD / 2;
    P(deco, BOX, 0x2a2420, 0, FY + DOOR_H / 2, dz - 0.04, [DOOR_W, DOOR_H, 0.06]);              // 문 뒤 어둠
    for (const s of [-1, 1]) {
      const cx = s * DOOR_W / 4;
      P(deco, BOX, 0x6a3a1e, cx, FY + DOOR_H / 2, dz - 0.1, [DOOR_W / 2 - 0.04, DOOR_H - 0.04, 0.1]); // 문짝
      for (let k = 0; k < 6; k++) P(tiny, BOX, k % 2 ? 0x5a3018 : 0x7a4a26, cx - DOOR_W / 4 + 0.15 + k * 0.2, FY + DOOR_H / 2, dz - 0.16, [0.015, DOOR_H - 0.1, 0.01]); // 나뭇결
      for (const [py, ph] of [[FY + 1.0, 1.4], [FY + 2.7, 1.6]]) {                          // 판넬 (테두리 4개 + 가운데 볼록)
        P(deco, BOX, 0x5a2e14, cx, py + ph / 2, dz - 0.175, [DOOR_W / 2 - 0.4, 0.06, 0.04]);
        P(deco, BOX, 0x5a2e14, cx, py - ph / 2, dz - 0.175, [DOOR_W / 2 - 0.4, 0.06, 0.04]);
        for (const q of [-1, 1]) P(deco, BOX, 0x5a2e14, cx + q * (DOOR_W / 4 - 0.23), py, dz - 0.175, [0.06, ph, 0.04]);
        P(deco, BOX, 0x8a5430, cx, py, dz - 0.17, [DOOR_W / 2 - 0.6, ph - 0.25, 0.04]);
      }
      P(shiny, BOX, 0xd8b040, s * 0.12, FY + 1.75, dz - 0.2, [0.05, 0.42, 0.05]);              // 세로 손잡이
      P(shiny, BOX, 0xd8b040, s * 0.12, FY + 1.75, dz - 0.17, [0.12, 0.5, 0.02]);              // 손잡이 판
      for (const hy of [FY + 0.5, FY + 1.9, FY + 3.3]) { P(shiny, BOX, 0x3a3a3a, s * (DOOR_W / 2 - 0.12), hy, dz - 0.17, [0.22, 0.12, 0.03]); P(shiny, CYL6, 0x2a2a2a, s * (DOOR_W / 2 - 0.02), hy, dz - 0.16, [0.06, 0.16, 0.06]); } // 경첩
    }
    P(deco, BOX, ST.trim, 0, FY + DOOR_H + 0.1, dz - 0.08, [DOOR_W + 0.7, 0.2, 0.2]);           // 문틀 위
    for (const s of [-1, 1]) P(deco, BOX, ST.trim, s * (DOOR_W / 2 + 0.18), FY + DOOR_H / 2, dz - 0.08, [0.3, DOOR_H, 0.2]);
    P(glow, BOX, 0xffffff, 0, FY + DOOR_H + 0.55, dz - 0.05, [DOOR_W - 0.1, 0.65, 0.03]);       // 부채꼴 창
    for (let k = 0; k < 5; k++) P(tiny, BOX, ST.trim, -DOOR_W / 2 + 0.25 + k * (DOOR_W - 0.5) / 4, FY + DOOR_H + 0.55, dz - 0.08, [0.05, 0.65, 0.04], (k - 2) * 0.25);
    P(deco, BOX, ST.trim, 0, FY + DOOR_H + 0.95, dz - 0.08, [DOOR_W + 0.7, 0.16, 0.22]);
    P(deco, BOX, ST.a[3], 0, FY + DOOR_H + 1.0, dz - 0.16, [0.4, 0.42, 0.14]);                 // 머릿돌
    P(deco, BOX, 0x6a6458, 0, FY + 0.03, dz - 0.6, [DOOR_W + 0.4, 0.04, 1.0]);                 // 문 앞 발판
    P(tiny, BOX, 0x8a2a2a, 0, FY + 0.055, dz - 0.7, [1.8, 0.02, 0.8]);                         // 매트

    // ---- 기둥 현관: 기둥 6개 (받침 + 홈 파인 몸통 + 머리) + 위 들보 + 세모 지붕(박공) ----
    const PO = { z0: -BD / 2 - 3.4, w: 15.6 };                       // 현관 앞 끝 (지역 z)
    const CH = 6.2;                                                  // 기둥 높이
    P(deco, BOX, ST.a[2], 0, FY - 0.02, (PO.z0 + -BD / 2) / 2, [PO.w, 0.08, -BD / 2 - PO.z0]); // 현관 바닥
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) P(tiny, BOX, ST.a[1], -PO.w / 2 + (i + 0.5) * PO.w / 8, FY + 0.025, PO.z0 + (j + 0.5) * (-BD / 2 - PO.z0) / 3, [PO.w / 8 - 0.04, 0.01, (-BD / 2 - PO.z0) / 3 - 0.04]);
    const colX = [-6.9, -4.15, -1.4, 1.4, 4.15, 6.9].filter((x) => Math.abs(x) > 1.2);
    for (const cx of [-6.9, -4.15, -1.6, 1.6, 4.15, 6.9]) {
      const cz = PO.z0 + 0.6;
      P(deco, BOX, ST.a[3], cx, FY + 0.12, cz, [1.0, 0.24, 1.0]);                         // 받침돌
      P(deco, BOX, ST.trim, cx, FY + 0.32, cz, [0.86, 0.16, 0.86]);
      P(deco, CYL, ST.trim, cx, FY + 0.48, cz, [0.78, 0.14, 0.78]);
      for (let k = 0; k < 8; k++) {                                                       // 몸통 8토막 (위로 갈수록 살짝 가늘게)
        const r = 0.66 - k * 0.015;
        P(deco, CYL, k % 2 ? ST.a[0] : ST.a[2], cx, FY + 0.55 + (k + 0.5) * (CH - 1.0) / 8, cz, [r, (CH - 1.0) / 8 + 0.002, r]);
      }
      for (let k = 0; k < 8; k++) { const r = (0.66 - k * 0.015) / 2, sy = FY + 0.55 + (k + 0.5) * (CH - 1.0) / 8; for (let m = 0; m < 10; m++) { const a = (m / 10) * Math.PI * 2; P(tiny, BOX, ST.a[3], cx + Math.cos(a) * (r + 0.004), sy, cz + Math.sin(a) * (r + 0.004), [0.03, (CH - 1.0) / 8 - 0.04, 0.06], 0, -a); } } // 세로 홈(그림자 줄) — 토막마다 굵기에 맞춰요
      P(deco, CYL, ST.trim, cx, FY + CH - 0.4, cz, [0.78, 0.12, 0.78]);                   // 목 고리
      P(deco, BOX, ST.trim, cx, FY + CH - 0.25, cz, [0.95, 0.18, 0.95]);                  // 머리
      for (const s of [-1, 1]) P(deco, CYL, ST.a[2], cx + s * 0.42, FY + CH - 0.3, cz, [0.22, 0.75, 0.22], Math.PI / 2); // 소용돌이(볼류트)
      P(deco, BOX, ST.trim, cx, FY + CH - 0.08, cz, [1.1, 0.16, 1.1]);                    // 머리 판
      blockL(cx - 0.55, cz - 0.55, cx + 0.55, cz + 0.55);
    }
    void colX;
    // 들보: 아래 띠 2단 + 가운데 글자 띠 + 처마 + 이빨 장식
    const EY = FY + CH;
    P(deco, BOX, ST.trim, 0, EY + 0.12, PO.z0 + 1.6, [PO.w + 0.4, 0.24, 2.8]);
    P(deco, BOX, ST.a[2], 0, EY + 0.32, PO.z0 + 1.6, [PO.w + 0.5, 0.18, 2.9]);
    P(deco, BOX, ST.a[0], 0, EY + 0.75, PO.z0 + 1.6, [PO.w + 0.4, 0.7, 2.8]);
    for (let t = -PO.w / 2 + 0.6; t < PO.w / 2 - 0.4; t += 1.2) if (Math.abs(t) > 3.2) { // 세로 홈 장식 (글자판 자리는 비워요)
      for (const q of [-0.12, 0, 0.12]) P(tiny, BOX, ST.a[3], t + q, EY + 0.75, PO.z0 + 0.18, [0.06, 0.6, 0.02]);
      P(shiny, BOX, 0xd8b040, t + 0.6, EY + 0.75, PO.z0 + 0.18, [0.22, 0.14, 0.02]);       // 금빛 물고기 장식
      P(shiny, BOX, 0xd8b040, t + 0.75, EY + 0.75, PO.z0 + 0.18, [0.08, 0.2, 0.02], 0.5);
    }
    P(deco, BOX, ST.trim, 0, EY + 1.2, PO.z0 + 1.6, [PO.w + 0.8, 0.2, 3.1]);
    for (let t = -PO.w / 2 - 0.2; t < PO.w / 2 + 0.3; t += 0.36) P(tiny, BOX, ST.trim, t, EY + 1.04, PO.z0 + 0.06, [0.16, 0.12, 0.14]);
    // 박공(세모 지붕): 계단처럼 쌓은 돌 + 기울어진 처마 2개 + 가운데 큰 금빛 물고기 부조
    for (let k = 0; k < 9; k++) {
      const w = (PO.w + 0.2) * (1 - k / 9.2), y = EY + 1.4 + k * 0.28;
      P(deco, BOX, k % 2 ? ST.a[0] : ST.a[2], 0, y, PO.z0 + 1.7, [w, 0.29, 2.6]);
    }
    const pedH = 9 * 0.28, pedW = PO.w / 2 + 0.2, pa = Math.atan2(pedH, pedW), pl = Math.hypot(pedH, pedW);
    for (const s of [-1, 1]) {
      P(deco, BOX, ST.trim, s * pedW / 2, EY + 1.35 + pedH / 2, PO.z0 + 0.25, [pl + 0.4, 0.22, 0.36], -s * pa);
      for (let k = 1; k < 16; k++) { const t = k / 16; P(tiny, BOX, ST.trim, s * pedW * (1 - t), EY + 1.24 + pedH * t, PO.z0 + 0.08, [0.14, 0.12, 0.12], -s * pa); }
    }
    { // 부조: 물고기 (몸통 · 꼬리 · 지느러미 · 눈 · 비늘)
      const fz = PO.z0 + 0.38, fy = EY + 2.2;
      P(shiny, BOX, 0xd8b040, 0, fy, fz, [2.4, 0.7, 0.08]);
      P(shiny, BOX, 0xd8b040, 0.1, fy, fz, [1.8, 0.95, 0.08]);
      for (const s of [-1, 1]) P(shiny, BOX, 0xc8a030, -1.5, fy + s * 0.28, fz, [0.7, 0.24, 0.08], s * 0.6);
      P(shiny, BOX, 0xc8a030, 0.2, fy + 0.62, fz, [0.8, 0.22, 0.08], -0.2);
      P(shiny, BOX, 0x2a2a2a, 0.85, fy + 0.1, fz - 0.05, [0.14, 0.14, 0.02]);
      for (let k = 0; k < 6; k++) P(shiny, BOX, 0xe8c858, -0.6 + k * 0.25, fy - 0.05 + (k % 2) * 0.12, fz - 0.05, [0.12, 0.12, 0.02], 0.78);
      for (let k = 0; k < 4; k++) P(tiny, BOX, 0x9affe8, -3.2 + k * 0.5 + (k > 1 ? 4.8 : 0), fy - 0.3 + (k % 2) * 0.3, fz, [0.18, 0.08, 0.04]); // 물결 장식
    }
    // 현관 천장 (네모 칸 장식)
    P(deco, BOX, ST.a[2], 0, EY - 0.06, PO.z0 + 1.6, [PO.w, 0.12, 2.6]);
    for (let i = 0; i < 6; i++) P(tiny, BOX, ST.a[3], -PO.w / 2 + (i + 0.5) * PO.w / 6, EY - 0.14, PO.z0 + 1.6, [PO.w / 6 - 0.5, 0.04, 2.0]);
    // 현관 깃발 2개 (기둥 사이에 길게 늘어진 천 + 물고기 그림 + 술)
    for (const s of [-1, 1]) {
      const bx = s * 5.5, bz = PO.z0 + 0.55;
      P(deco, BOX, 0x2a2420, bx, EY - 0.3, bz, [1.6, 0.06, 0.06]);
      P(deco, BOX, s < 0 ? 0xb83a3a : 0x2a5a9a, bx, EY - 2.2, bz, [1.3, 3.6, 0.03]);
      P(tiny, BOX, 0xd8b040, bx, EY - 0.55, bz - 0.02, [1.3, 0.1, 0.01]);
      P(tiny, BOX, 0xd8b040, bx, EY - 3.9, bz - 0.02, [1.3, 0.1, 0.01]);
      P(tiny, BOX, 0xf4efe2, bx, EY - 2.0, bz - 0.025, [0.8, 0.32, 0.01]);                   // 물고기 그림
      P(tiny, BOX, 0xf4efe2, bx + 0.48, EY - 2.0, bz - 0.025, [0.25, 0.4, 0.01], 0.6);
      for (let k = 0; k < 5; k++) P(tiny, BOX, 0xd8b040, bx - 0.5 + k * 0.25, EY - 4.12, bz, [0.04, 0.3, 0.04]); // 술
    }
    // ---- 계단 (현관 앞, 3칸) + 양옆 낮은 벽 + 큰 화분 ----
    for (let k = 0; k < 3; k++) {
      const z = PO.z0 - 0.4 - (2 - k) * 0.55, y = Y0 + (k + 1) * 0.2;
      P(deco, BOX, k % 2 ? ST.a[1] : ST.a[0], 0, y - 0.1, z, [PO.w - 0.4, 0.2, 0.56]);
      P(deco, BOX, ST.trim, 0, y + 0.012, z - 0.24, [PO.w - 0.4, 0.03, 0.1]);             // 계단 코
    }
    for (const s of [-1, 1]) {
      const x = s * (PO.w / 2 - 0.05);
      P(deco, BOX, ST.a[3], x, Y0 + 0.4, PO.z0 - 0.95, [0.5, 0.8, 1.9]);
      P(deco, BOX, ST.trim, x, Y0 + 0.84, PO.z0 - 0.95, [0.6, 0.1, 2.0]);
      // 항아리 화분 (몸통 · 테 · 받침 · 꽃)
      const ux = x, uz = PO.z0 - 1.6;
      P(deco, CYL, 0xb86a3a, ux, Y0 + 1.12, uz, [0.5, 0.5, 0.5]);
      P(deco, CYL, 0xa85a2a, ux, Y0 + 1.4, uz, [0.6, 0.08, 0.6]);
      P(deco, CYL, 0xa85a2a, ux, Y0 + 0.92, uz, [0.36, 0.1, 0.36]);
      for (let k = 0; k < 6; k++) P(tiny, BALL, pick([0x4a8a3a, 0x5a9a44]), ux + (rnd() - 0.5) * 0.4, Y0 + 1.6, uz + (rnd() - 0.5) * 0.4, [0.25, 0.25, 0.25]);
      for (let k = 0; k < 5; k++) P(shiny, BALL, pick([0xff4a6a, 0xffd84a, 0xffffff]), ux + (rnd() - 0.5) * 0.45, Y0 + 1.75, uz + (rnd() - 0.5) * 0.45, [0.1, 0.1, 0.1]);
      blockL(x - 0.35, PO.z0 - 1.95, x + 0.35, PO.z0);
    }
    // ---- 지붕: 평평한 옥상 + 난간(동자기둥) + 가운데 돔(드럼 · 창 · 갈빗대 · 꼭대기 정자 · 금 물고기 풍향계) ----
    const RYT = FY + WH + 0.3;
    P(deco, BOX, 0x9a948a, 0, RYT - 0.1, 0, [BW + 0.2, 0.2, BD + 0.2]);
    for (const [len, ax, off] of [[BW, 'x', -BD / 2], [BW, 'x', BD / 2], [BD, 'z', -BW / 2], [BD, 'z', BW / 2]]) {
      for (let t = -len / 2 + 0.25; t < len / 2; t += 0.38) {
        if (ax === 'x') P(tiny, CYL6, ST.trim, t, RYT + 0.3, off, [0.13, 0.5, 0.13]); else P(tiny, CYL6, ST.trim, off, RYT + 0.3, t, [0.13, 0.5, 0.13]);
      }
      if (ax === 'x') { P(deco, BOX, ST.trim, 0, RYT + 0.6, off, [len + 0.2, 0.12, 0.3]); P(deco, BOX, ST.trim, 0, RYT + 0.03, off, [len, 0.08, 0.26]); }
      else { P(deco, BOX, ST.trim, off, RYT + 0.6, 0, [0.3, 0.12, len + 0.2]); P(deco, BOX, ST.trim, off, RYT + 0.03, 0, [0.26, 0.08, len]); }
    }
    const DR = 4.2; // 돔 반지름
    P(deco, CYL, ST.a[0], 0, RYT + 1.0, 1.0, [DR * 2 + 0.6, 0.3, DR * 2 + 0.6]);
    P(deco, new THREE.CylinderGeometry(0.5, 0.5, 1, 24), ST.a[2], 0, RYT + 2.1, 1.0, [DR * 2, 2.0, DR * 2]); // 드럼
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, px = Math.cos(a) * (DR + 0.02), pz = 1.0 + Math.sin(a) * (DR + 0.02);
      if (k % 2) { const [wx, wz] = at(px, pz); glow.add(BOX, 0xffffff, [wx, RYT + 2.1, wz], [0, RY - a, 0], [0.08, 1.1, 0.6]); }
      else P(deco, BOX, ST.trim, px, RYT + 2.1, pz, [0.14, 2.0, 0.36], 0, -a);           // 드럼 기둥(필라스터)
    }
    P(deco, CYL, ST.trim, 0, RYT + 3.15, 1.0, [DR * 2 + 0.4, 0.2, DR * 2 + 0.4]);
    const domeC = [0x5a9a8a, 0x4e8a7c, 0x66a896];                                         // 녹슨 구리색 3톤
    for (let k = 0; k < 10; k++) {
      const t0 = k / 10, t1 = (k + 1) / 10;
      const r = DR * Math.cos(t0 * Math.PI / 2), h = DR * (Math.sin(t1 * Math.PI / 2) - Math.sin(t0 * Math.PI / 2));
      P(deco, new THREE.CylinderGeometry(DR * Math.cos(t1 * Math.PI / 2) / DR * 0.5, r / DR * 0.5, 1, 24), domeC[k % 3], 0, RYT + 3.25 + DR * Math.sin(t0 * Math.PI / 2) + h / 2, 1.0, [DR * 2, h, DR * 2]);
    }
    for (let k = 0; k < 12; k++) { // 돔 갈빗대
      const a = (k / 12) * Math.PI * 2;
      for (let m = 0; m < 8; m++) {
        const t = (m + 0.5) / 8, r = DR * Math.cos(t * Math.PI / 2) + 0.03, y = RYT + 3.25 + DR * Math.sin(t * Math.PI / 2);
        P(tiny, BOX, 0x3a6a5e, Math.cos(a) * r, y, 1.0 + Math.sin(a) * r, [0.12, 0.62, 0.12], 0, -a);
      }
    }
    const LY = RYT + 3.25 + DR;                                                          // 꼭대기 정자
    P(deco, CYL, ST.trim, 0, LY + 0.1, 1.0, [1.6, 0.2, 1.6]);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; P(deco, CYL6, ST.trim, Math.cos(a) * 0.62, LY + 0.65, 1.0 + Math.sin(a) * 0.62, [0.12, 0.9, 0.12]); }
    P(glow, CYL, 0xffffff, 0, LY + 0.65, 1.0, [0.8, 0.8, 0.8]);
    P(deco, CONE, domeC[0], 0, LY + 1.45, 1.0, [1.7, 0.7, 1.7]);
    P(shiny, CYL6, 0xd8b040, 0, LY + 2.1, 1.0, [0.06, 0.7, 0.06]);
    P(shiny, BOX, 0xd8b040, 0, LY + 2.45, 1.0, [0.5, 0.18, 0.06]);                       // 금 물고기 풍향계
    P(shiny, BOX, 0xd8b040, -0.32, LY + 2.45, 1.0, [0.18, 0.24, 0.05], 0.7);
    P(shiny, BOX, 0x2a2a2a, 0.17, LY + 2.48, 0.97, [0.05, 0.05, 0.02]);
    // 옥상 환기구 · 굴뚝 · 빗물 홈통 · 담쟁이
    for (const [x, z] of [[-9, 5], [9, 5], [-9, -4]]) { P(deco, BOX, 0x8a8478, x, RYT + 0.4, z, [0.9, 0.8, 0.9]); P(deco, BOX, 0x6a6458, x, RYT + 0.86, z, [1.1, 0.12, 1.1]); for (let k = 0; k < 3; k++) P(tiny, BOX, 0x3a3a3a, x, RYT + 0.25 + k * 0.18, z - 0.46, [0.6, 0.06, 0.02]); }
    for (const [x, z] of [[-BW / 2 - 0.12, BD / 2 - 0.5], [BW / 2 + 0.12, BD / 2 - 0.5], [-BW / 2 - 0.12, -BD / 2 + 0.5], [BW / 2 + 0.12, -BD / 2 + 0.5]]) {
      P(deco, BOX, 0x6a7a7a, x, FY + WH / 2, z, [0.14, WH, 0.14]);
      for (let k = 1; k < 5; k++) P(tiny, BOX, 0x4a5a5a, x, FY + k * WH / 5, z, [0.2, 0.06, 0.2]);   // 홈통 고정쇠
      P(deco, BOX, 0x6a7a7a, x, Y0 + 0.3, z - Math.sign(z) * 0.2, [0.14, 0.14, 0.4]);
    }
    for (let k = 0; k < 40; k++) { // 담쟁이 (뒤 오른쪽 모서리를 타고 올라가요)
      const t = rnd(), y = FY + t * (WH - 1);
      const x = BW / 2 + 0.05 + (k % 4) * 0.012, z = BD / 2 - 0.4 - rnd() * 3.5 * (1 - t * 0.6); // 잎끼리 겹쳐도 깜빡이지 않게 층층이
      P(tiny, BOX, pick([0x3a7a2e, 0x4a8a3a, 0x2e6a24]), x, y, z, [0.06, 0.32 + rnd() * 0.2, 0.3 + rnd() * 0.2]);
    }
    // 간판 (현관 들보 가운데 글자)
    {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
      const g = c.getContext('2d');
      g.fillStyle = '#e2dbcc'; g.fillRect(0, 0, 1024, 160);
      g.fillStyle = '#5a4a2e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '96px "Jua", "Malgun Gothic", sans-serif'; g.fillText('노을 박물관', 512, 86);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 0.62), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      const [wx, wz] = at(0, PO.z0 + 0.18);
      m.position.set(wx - 0.012, EY + 0.75, wz); m.rotation.y = RY + Math.PI;
      scene.add(m);
    }
    blockL(-BW / 2 - 0.5, -BD / 2 - 0.5, BW / 2 + 0.5, BD / 2 + 0.5);                 // 건물 (문 앞은 들어가는 칸이라 막혀 있어도 돼요)
  }

  // ---- 광장: 돌 타일 바닥 + 경계석 + 분수 + 벤치 + 가로등 + 나무 + 생울타리 + 꽃밭 + 마을로 가는 길 ----
  const PLZ = { x0: EX - BD / 2 - 18, x1: EX - BD / 2 - 5.6, z0: EZ - 11, z1: EZ + 11 }; // 세상 좌표 (현관 계단 앞)
  const plazaY = Y0;
  {
    const pave = [0xb8b0a0, 0xa8a090, 0xc4bcac, 0x9a9282];
    // 타일 (네모 1.2칸, 가끔 깨지거나 빠진 타일 + 틈새 풀)
    for (let x = PLZ.x0 + 0.6; x < PLZ.x1; x += 1.2) for (let z = PLZ.z0 + 0.6; z < PLZ.z1; z += 1.2) {
      if (Math.hypot(x - (PLZ.x0 + PLZ.x1) / 2, z - EZ) < 3.4) continue; // 분수 자리
      if (rnd() < 0.04) { tiny.add(BOX, 0x5a8a44, [x, plazaY + 0.012, z], [0, rnd(), 0], [0.5, 0.02, 0.3]); continue; }
      const ry = (rnd() - 0.5) * 0.04;
      deco.add(BOX, pick(pave), [x, plazaY + 0.02, z], [0, ry, 0], [1.14, 0.04, 1.14]);
      if (rnd() < 0.08) tiny.add(BOX, 0x6a6458, [x + (rnd() - 0.5) * 0.4, plazaY + 0.042, z], [0, rnd() * 3, 0], [0.5, 0.005, 0.02]); // 금
      if (rnd() < 0.1) tiny.add(BOX, pick([0x5a8a44, 0x6a9a50]), [x + 0.58, plazaY + 0.03, z + (rnd() - 0.5) * 0.8], [0, 0, 0], [0.04, 0.05, 0.3]); // 틈새 풀
    }
    // 경계석 (광장 둘레)
    for (let x = PLZ.x0; x <= PLZ.x1; x += 0.7) for (const z of [PLZ.z0 - 0.15, PLZ.z1 + 0.15]) deco.add(BOX, pick([0x8a8478, 0x7a7468, 0x9a9488]), [x, plazaY + 0.08, z], [0, (rnd() - 0.5) * 0.06, 0], [0.62, 0.18, 0.28]);
    for (let z = PLZ.z0; z <= PLZ.z1; z += 0.7) if (Math.abs(z - EZ) > 2.4) deco.add(BOX, pick([0x8a8478, 0x7a7468, 0x9a9488]), [PLZ.x0 - 0.15, plazaY + 0.08, z], [0, (rnd() - 0.5) * 0.06, 0], [0.28, 0.18, 0.62]);
    // 분수: 팔각 수반(돌 블록 16개) + 물 + 가운데 받침 + 물고기 조각상 + 물줄기 + 동전
    const fx = (PLZ.x0 + PLZ.x1) / 2, fz = EZ;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      deco.add(BOX, k % 2 ? 0xc4bcac : 0xb0a898, [fx + Math.cos(a) * 2.9, plazaY + 0.35 + (k % 2) * 0.012, fz + Math.sin(a) * 2.9], [0, -a, 0], [0.5, 0.7, 1.2]);
      deco.add(BOX, k % 2 ? 0xd8d0c0 : 0xe2dbcc, [fx + Math.cos(a) * 2.9, plazaY + 0.74 + (k % 2) * 0.012, fz + Math.sin(a) * 2.9], [0, -a, 0], [0.62, 0.1, 1.24]); // 이웃 돌과 윗면 높이를 1.2cm 다르게
      if (k % 4 === 1) tiny.add(BOX, pick(ST.moss), [fx + Math.cos(a) * 3.16, plazaY + 0.12, fz + Math.sin(a) * 3.16], [0, -a, 0], [0.02, 0.18, 0.6]);
    }
    deco.add(new THREE.CylinderGeometry(1, 1, 1, 16), 0x6a7a7a, [fx, plazaY + 0.08, fz], [0, 0, 0], [2.7, 0.16, 2.7]);   // 수반 바닥
    shiny.add(new THREE.CylinderGeometry(1, 1, 1, 16), 0x5ab8d8, [fx, plazaY + 0.5, fz], [0, 0, 0], [2.65, 0.04, 2.65]); // 물
    for (let k = 0; k < 10; k++) shiny.add(CYL, pick([0xd8b040, 0xc8c8c8]), [fx + (rnd() - 0.5) * 3.6, plazaY + 0.18, fz + (rnd() - 0.5) * 3.6], [0, 0, 0], [0.1, 0.02, 0.1]); // 동전
    deco.add(CYL, 0xc4bcac, [fx, plazaY + 0.9, fz], [0, 0, 0], [1.0, 1.2, 1.0]);
    deco.add(CYL, 0xd8d0c0, [fx, plazaY + 1.55, fz], [0, 0, 0], [1.3, 0.12, 1.3]);
    deco.add(CYL, 0xb0a898, [fx, plazaY + 1.85, fz], [0, 0, 0], [0.5, 0.5, 0.5]);
    // 뛰어오르는 물고기 조각 (청동)
    const bz = [0x8a6a3a, 0x9a7a44, 0x7a5a30];
    shiny.add(BOX, bz[0], [fx, plazaY + 2.6, fz], [0, 0, 0.9], [1.3, 0.5, 0.35]);
    shiny.add(BOX, bz[1], [fx - 0.1, plazaY + 2.65, fz], [0, 0, 0.9], [0.9, 0.62, 0.36]);
    shiny.add(BOX, bz[2], [fx - 0.42, plazaY + 2.05, fz], [0, 0, 0.3], [0.5, 0.16, 0.3]);
    shiny.add(BOX, bz[2], [fx - 0.38, plazaY + 2.12, fz], [0, 0, 1.6], [0.5, 0.16, 0.3]);
    shiny.add(BOX, bz[1], [fx + 0.1, plazaY + 2.92, fz], [0, 0, 0.6], [0.35, 0.12, 0.38]);
    for (const s of [-1, 1]) shiny.add(BOX, 0x1a1a1a, [fx + 0.38, plazaY + 3.08, fz + s * 0.18], [0, 0, 0.9], [0.08, 0.08, 0.02]);
    for (let k = 0; k < 7; k++) shiny.add(BOX, 0xc8f0ff, [fx + 0.55 + k * 0.12, plazaY + 3.25 - k * k * 0.06, fz], [0, 0, -0.5 - k * 0.15], [0.12, 0.06, 0.08]); // 물줄기
    for (let k = 0; k < 8; k++) tiny.add(BALL, 0xf4fbff, [fx + 1.3 + (rnd() - 0.5) * 0.5, plazaY + 0.55, fz + (rnd() - 0.5) * 0.5], [0, 0, 0], [0.18, 0.08, 0.18]); // 물보라
    block(fx - 3.2, fz - 3.2, fx + 3.2, fz + 3.2);
    // 벤치: 나무 판 5장(나뭇결) + 주물 다리 + 팔걸이 + 볼트
    const bench = (x, z, ry) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      const A = (b, geo, col, lx, ly, lz, sc) => b.add(geo, col, [x + lx * c + lz * s, plazaY + ly, z - lx * s + lz * c], [0, ry, 0], sc);
      for (let k = 0; k < 3; k++) A(deco, BOX, k % 2 ? 0xb07a4a : 0xa06a3a, 0, 0.47, -0.16 + k * 0.16, [1.8, 0.05, 0.13]);
      for (let k = 0; k < 2; k++) A(deco, BOX, k % 2 ? 0xb07a4a : 0xa06a3a, 0, 0.72 + k * 0.17, 0.25, [1.8, 0.12, 0.04]);
      for (let k = 0; k < 6; k++) A(tiny, BOX, 0x8a5a30, -0.75 + k * 0.3, 0.5, 0, [0.01, 0.006, 0.44]);
      for (const lx of [-0.78, 0.78]) {
        A(deco, BOX, 0x2a2a30, lx, 0.22, -0.12, [0.06, 0.45, 0.06]);
        A(deco, BOX, 0x2a2a30, lx, 0.5, 0.24, [0.06, 1.0, 0.06]);
        A(deco, BOX, 0x2a2a30, lx, 0.44, 0.05, [0.06, 0.05, 0.45]);
        A(deco, BOX, 0x2a2a30, lx, 0.66, -0.02, [0.07, 0.04, 0.4]);      // 팔걸이
        A(deco, BOX, 0x2a2a30, lx, 0.08, 0.05, [0.12, 0.04, 0.55]);      // 발
        for (const lz of [-0.12, 0.12]) A(tiny, BOX, 0x8a8a8a, lx, 0.5, lz, [0.07, 0.03, 0.03]); // 볼트
      }
      block(x - 1.0, z - 1.0, x + 1.0, z + 1.0);
    };
    bench(fx - 1.2, PLZ.z0 + 1.6, Math.PI); bench(fx + 2.6, PLZ.z0 + 1.6, Math.PI);
    bench(fx - 1.2, PLZ.z1 - 1.6, 0); bench(fx + 2.6, PLZ.z1 - 1.6, 0);
    // 가로등: 받침 + 기둥 마디 + 팔 + 등갓 + 유리 등 (밤에 켜져요)
    const lamp = (x, z) => {
      deco.add(BOX, 0x2a2a30, [x, plazaY + 0.15, z], [0, 0, 0], [0.42, 0.3, 0.42]);
      deco.add(CYL, 0x2a2a30, [x, plazaY + 1.8, z], [0, 0, 0], [0.13, 3.3, 0.13]);
      for (const y of [0.45, 1.6, 3.0]) deco.add(CYL, 0x3a3a40, [x, plazaY + y, z], [0, 0, 0], [0.2, 0.08, 0.2]);
      deco.add(BOX, 0x2a2a30, [x, plazaY + 3.5, z], [0, 0, 0], [0.5, 0.06, 0.5]);
      glow.add(BOX, 0xffffff, [x, plazaY + 3.25, z], [0, 0, 0], [0.32, 0.42, 0.32]);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tiny.add(BOX, 0x2a2a30, [x + dx * 0.17, plazaY + 3.25, z + dz * 0.17], [0, 0, 0], [0.03, 0.44, 0.03]);
      deco.add(CONE, 0x2a2a30, [x, plazaY + 3.7, z], [0, Math.PI / 4, 0], [0.55, 0.3, 0.55]);
      shiny.add(BALL, 0xd8b040, [x, plazaY + 3.9, z], [0, 0, 0], [0.1, 0.1, 0.1]);
      block(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
    };
    for (const z of [PLZ.z0 + 0.6, PLZ.z1 - 0.6]) for (const x of [PLZ.x0 + 0.8, PLZ.x1 - 0.4]) lamp(x, z);
    // 생울타리 (각진 블록 + 잎 무늬 3톤 + 아랫부분 흙)
    for (const z of [PLZ.z0 - 1.0, PLZ.z1 + 1.0]) for (let x = PLZ.x0 + 0.5; x < PLZ.x1 + 3; x += 1.0) {
      deco.add(BOX, pick([0x3e7a32, 0x467f38, 0x37702c]), [x, plazaY + 0.5 + (Math.round(x) % 2) * 0.012, z], [0, 0, 0], [0.99, 1.0, 0.9]); // 이웃과 겹치지 않게 살짝 좁게
      for (let k = 0; k < 3; k++) tiny.add(BOX, pick([0x5a9a44, 0x2e6224, 0x4a8a3a]), [x + (rnd() - 0.5) * 0.8, plazaY + 0.3 + rnd() * 0.6, z + (z < EZ ? -0.46 : 0.46)], [0, 0, 0], [0.2, 0.2, 0.02]);
      tiny.add(BOX, 0x5a4a32, [x, plazaY + 0.04, z], [0, 0, 0], [0.99, 0.08, 0.98]);
      block(x - 0.5, z - 0.45, x + 0.5, z + 0.45);
    }
    // 꽃밭 (나무 테두리 + 흙 + 꽃 · 잎)
    const bed = (x, z, w, d) => {
      deco.add(BOX, 0x5a3a22, [x, plazaY + 0.12, z], [0, 0, 0], [w, 0.24, d]);
      deco.add(BOX, 0x4a3420, [x, plazaY + 0.2, z], [0, 0, 0], [w - 0.2, 0.06, d - 0.2]);
      for (let k = 0; k < Math.round(w * d * 5); k++) {
        const px = x + (rnd() - 0.5) * (w - 0.4), pz = z + (rnd() - 0.5) * (d - 0.4), h = 0.18 + rnd() * 0.2;
        tiny.add(BOX, 0x4a8a3a, [px, plazaY + 0.23 + h / 2, pz], [0, 0, 0], [0.03, h, 0.03]);
        shiny.add(BOX, pick([0xff6a8a, 0xffd84a, 0xffffff, 0xb48cff, 0xff9a4a]), [px, plazaY + 0.24 + h, pz], [0, rnd() * 3, 0], [0.13, 0.05, 0.13]);
      }
      block(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    };
    bed(PLZ.x1 + 1.2, EZ - 7.4, 1.6, 3.4); bed(PLZ.x1 + 1.2, EZ + 7.4, 1.6, 3.4);
  }
  // ---- 나무 (줄기가 위로 갈수록 가늘어지고 · 뿌리 4개 · 가지 · 잎 덩어리 3톤 여러 겹 · 떨어진 잎) ----
  const tree = (x, z, s = 1) => {
    const y = Y0, segs = 6, h = 4.2 * s;
    for (let k = 0; k < segs; k++) {
      const r = (0.5 - k * 0.055) * s;
      deco.add(CYL, k % 2 ? 0x6a4a2e : 0x5a3e26, [x, y + (k + 0.5) * h / segs, z], [0, rnd(), 0], [r, h / segs + 0.01, r]);
      if (k < 4) tiny.add(BOX, 0x4a321e, [x + r * 0.48, y + (k + 0.5) * h / segs, z], [0, rnd() * 3, 0], [0.02, h / segs * 0.8, 0.04]); // 껍질 결
    }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd() * 0.5; deco.add(BOX, 0x5a3e26, [x + Math.cos(a) * 0.38 * s, y + 0.12 * s, z + Math.sin(a) * 0.38 * s], [0, -a, 0.35], [0.7 * s, 0.18 * s, 0.16 * s]); }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.8 + rnd() * 0.4, by = y + h * (0.55 + k * 0.08); deco.add(BOX, 0x5a3e26, [x + Math.cos(a) * 0.6 * s, by, z + Math.sin(a) * 0.6 * s], [0, -a, 0.6], [1.2 * s, 0.12 * s, 0.12 * s]); }
    const greens = [0x3e7a32, 0x4f8f3e, 0x2e6224];
    for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 5 - layer; k++) {
      const a = rnd() * 6.28, rr = (1.3 - layer * 0.35) * s;
      deco.add(BALL, greens[(k + layer) % 3], [x + Math.cos(a) * rr, y + h + (layer * 0.8 - 0.2) * s, z + Math.sin(a) * rr], [rnd(), rnd(), 0], [(2.0 - layer * 0.3) * s, (1.4 - layer * 0.15) * s, (2.0 - layer * 0.3) * s]);
    }
    for (let k = 0; k < 10; k++) tiny.add(BOX, pick([0xc8a040, 0xb86a2a, 0x8a9a3a]), [x + (rnd() - 0.5) * 4 * s, y + 0.012, z + (rnd() - 0.5) * 4 * s], [0, rnd() * 3, 0], [0.16, 0.01, 0.1]); // 떨어진 잎
    block(x - 0.6 * s, z - 0.6 * s, x + 0.6 * s, z + 0.6 * s);
  };
  for (const [x, z, s] of [[PLZ.x0 - 2.2, PLZ.z0 - 3.2, 1.1], [PLZ.x0 - 2.2, PLZ.z1 + 3.2, 1.0], [EX - 2, EZ - 16.5, 1.2], [EX + 6, EZ + 16.8, 1.15], [EX + 10, EZ - 16.2, 1.0], [EX - 6, EZ + 16.6, 0.95], [EX + 14, EZ - 4, 1.1], [EX + 14, EZ + 8, 1.05]]) tree(x, z, s);
  // ---- 마을 → 광장 흙길 (경계석 + 풀 다발 + 작은 돌 + 낙엽) ----
  {
    const z = EZ, x0 = 40, x1 = PLZ.x0 - 0.3;
    for (let x = x0; x < x1; x += 0.9) {
      deco.add(BOX, pick([0x9a7a52, 0x8a6a44, 0xa8885e]), [x, Y0 + 0.012, z + (rnd() - 0.5) * 0.15], [0, (rnd() - 0.5) * 0.1, 0], [0.92, 0.02, 3.2]);
      for (const s of [-1, 1]) {
        deco.add(BOX, pick([0x8a8478, 0x7a7468, 0x9a9488]), [x, Y0 + 0.07, z + s * 1.75], [0, (rnd() - 0.5) * 0.2, 0], [0.6, 0.16, 0.3]); // 경계석
        if (rnd() < 0.6) for (let k = 0; k < 4; k++) tiny.add(BOX, pick([0x5a9a44, 0x4a8a3a, 0x6aa850]), [x + (rnd() - 0.5) * 0.6, Y0 + 0.1, z + s * (2.1 + rnd() * 0.5)], [0, rnd(), (rnd() - 0.5) * 0.5], [0.04, 0.22 + rnd() * 0.15, 0.04]); // 풀 다발
      }
      if (rnd() < 0.4) deco.add(ROCK, pick([0x7a7a70, 0x8a8478]), [x + (rnd() - 0.5), Y0 + 0.04, z + (rnd() - 0.5) * 2.4], [rnd(), rnd(), rnd()], [0.14, 0.09, 0.12]);
      if (rnd() < 0.5) tiny.add(BOX, pick([0xc8a040, 0xb86a2a]), [x + (rnd() - 0.5), Y0 + 0.03, z + (rnd() - 0.5) * 2.6], [0, rnd() * 3, 0], [0.15, 0.01, 0.09]);
    }
    // 길 입구 안내판
    const sx = x0 + 2, sz = z - 2.6;
    deco.add(BOX, 0x5a4232, [sx, Y0 + 1.0, sz], [0, 0, 0], [0.16, 2.0, 0.16]);
    deco.add(BOX, 0x7a5a3a, [sx, Y0 + 1.75, sz - 0.0], [0, 0, 0], [0.12, 0.7, 1.9]);
    const c = document.createElement('canvas'); c.width = 512; c.height = 180;
    const g = c.getContext('2d');
    g.fillStyle = '#eee4cc'; g.fillRect(0, 0, 512, 180);
    g.fillStyle = '#4a3a22'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '64px "Jua", "Malgun Gothic", sans-serif'; g.fillText('노을 박물관 가는 길', 256, 70);
    g.font = '30px "Jua", "Malgun Gothic", sans-serif'; g.fillText(`모든 물고기 어항을 채우면 ${fmtMoney(MUSEUM_REWARD)}`, 256, 140);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.63), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      m.position.set(sx + side * 0.07, Y0 + 1.75, sz); m.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(m);
    }
    block(sx - 0.2, sz - 0.2, sx + 0.2, sz + 0.2);
  }
  // ---- 박물관 동네 바닥 꾸미기: 풀 다발 · 작은 돌 · 낙엽 · 덤불 · 언덕 (길 · 광장 · 건물은 비워요) ----
  const busyExt = (x, z) => (x > PLZ.x0 - 3 && x < EX + BD / 2 + 2 && z > EZ - BW / 2 - 2.5 && z < EZ + BW / 2 + 2.5) || (Math.abs(z - EZ) < 3 && x < PLZ.x0) ||
    rects.some((r) => x > r[0] - 0.6 && x < r[2] + 0.6 && z > r[1] - 0.6 && z < r[3] + 0.6) || ctx.colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.6) ** 2);
  for (let k = 0; k < 900; k++) {
    const x = MUSEUM_AREA.x0 + 2 + rnd() * (MUSEUM_AREA.x1 - MUSEUM_AREA.x0 - 4), z = MUSEUM_AREA.z0 + 2 + rnd() * (40 - MUSEUM_AREA.z0);
    if (busyExt(x, z) || ctx.inLake(x, z, 1.0)) continue;
    const roll = rnd();
    if (roll < 0.45) for (let m = 0; m < 5; m++) tiny.add(BOX, pick([0x5a9a44, 0x4a8a3a, 0x6aa850, 0x3e7a32]), [x + (rnd() - 0.5) * 0.4, Y0 + 0.12, z + (rnd() - 0.5) * 0.4], [0, rnd(), (rnd() - 0.5) * 0.6], [0.04, 0.24 + rnd() * 0.2, 0.04]);
    else if (roll < 0.62) deco.add(ROCK, pick([0x7a7a70, 0x8a8478, 0x6a6a62]), [x, Y0 + 0.06, z], [rnd(), rnd() * 3, rnd()], [0.2 + rnd() * 0.3, 0.14 + rnd() * 0.15, 0.2 + rnd() * 0.3]);
    else if (roll < 0.8) for (let m = 0; m < 4; m++) tiny.add(BOX, pick([0xc8a040, 0xb86a2a, 0x8a9a3a, 0xd88a3a]), [x + (rnd() - 0.5) * 1.2, Y0 + 0.012, z + (rnd() - 0.5) * 1.2], [0, rnd() * 3, 0], [0.16, 0.01, 0.1]);
    else if (roll < 0.9) { for (let m = 0; m < 4; m++) tiny.add(BALL, pick([0x4f8a3e, 0x5a9a48, 0x467a36]), [x + (rnd() - 0.5) * 0.7, Y0 + 0.35 + rnd() * 0.2, z + (rnd() - 0.5) * 0.7], [rnd(), rnd(), 0], [0.8, 0.7, 0.8]); }
    else if (roll < 0.97) { const h = 0.22 + rnd() * 0.2; tiny.add(BOX, 0x4a8a3a, [x, Y0 + h / 2, z], [0, 0, 0], [0.03, h, 0.03]); shiny.add(BOX, pick([0xff6a8a, 0xffd84a, 0xffffff, 0xb48cff]), [x, Y0 + h, z], [0, rnd() * 3, 0], [0.18, 0.05, 0.18]); }
    else deco.add(BALL, pick([0x6a9a50, 0x5a8a44]), [x, Y0 - 0.25, z], [0, rnd() * 3, 0], [2.4 + rnd() * 2, 0.6, 2.0 + rnd() * 1.4]); // 낮은 풀 언덕
  }
  for (let k = 0; k < 18; k++) { const x = MUSEUM_AREA.x0 + 6 + rnd() * 50, z = MUSEUM_AREA.z0 + 3 + rnd() * 8; if (!busyExt(x, z)) tree(x, z, 0.9 + rnd() * 0.4); }

  // =====================================================
  //  2) 안쪽 전시관 (엄청 커요) — 물고기마다 실제 크기 어항
  // =====================================================
  // 물고기 실제 크기 재기 (제일 무거울 때)
  const box3 = new THREE.Box3(), v3 = new THREE.Vector3();
  const measure = (f) => {
    const m = makeFishModel(f, null, f.w[1]);
    m.updateMatrixWorld(true);
    box3.setFromObject(m);
    const size = box3.getSize(new THREE.Vector3()), c = box3.getCenter(v3.clone());
    m.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((q) => q.dispose()); } });
    return { sx: size.x, sy: size.y, sz: size.z, cx: c.x, cy: c.y, cz: c.z };
  };
  const LOBBY = 14;                    // 앞쪽 로비(복도) 깊이
  const tanks = [];
  const halls = HALLS.map((H) => {
    const list = FISH.filter(H.test).map((f) => {
      const m = measure(f);
      const len = Math.max(1.5, m.sx + 0.8), dep = Math.max(1.0, m.sz + 0.7), hgt = Math.max(1.1, m.sy + 0.7);
      return { f, m, len, dep, hgt, base: hgt <= 2.4 ? 0.9 : 0.4, H };
    });
    list.sort((a, b) => (a.hgt + a.base) - (b.hgt + b.base) || a.len - b.len); // 작은 어항이 앞, 큰 어항이 뒤 (앞을 안 가리게)
    const W = Math.max(30, Math.max(...list.map((t) => t.len)) + 9);
    // 줄 맞추기: 앞에서부터 한 줄씩 채워요
    const rows = []; let row = [], used = 0;
    for (const t of list) {
      if (row.length && used + t.len + 1.8 > W - 5) { rows.push(row); row = []; used = 0; }
      row.push(t); used += t.len + 1.8;
    }
    if (row.length) rows.push(row);
    let zc = 4.5; // 홀 앞에서 첫 줄까지
    for (const r of rows) {
      const rowW = r.reduce((a, t) => a + t.len, 0) + (r.length - 1) * 1.8, depth = Math.max(...r.map((t) => t.dep + 0.3));
      let x = -rowW / 2;
      for (const t of r) { t.lx = x + t.len / 2; t.lz = zc; x += t.len + 1.8; }
      // 다음 줄까지 통로: 앞줄 어항이 높으면 더 넓게 (카메라가 위에서 비스듬히 봐서, 높은 어항 뒤에 서면 가려져요)
      //  카메라 시선은 앞으로 1m 갈 때마다 약 1.28m 올라가요 → 높이 H 를 넘으려면 (H - 1.5) / 1.28 m 떨어져야 해요
      const tall = Math.max(...r.map((t) => t.hgt + t.base + 0.2));
      zc += depth + Math.max(4.2, (tall - 0.5) / 1.3 + 2.2); // 어항 앞(E 자리)에 서도 앞줄에 안 가려지게
    }
    return { H, list, W, depth: zc + 1.5 };
  });
  const HALL_D = Math.max(...halls.map((h) => h.depth));
  const RD = LOBBY + HALL_D;                                      // 전시관 전체 깊이
  const RW = halls.reduce((a, h) => a + h.W, 0) + (halls.length - 1) * 0.6; // 전체 너비 (칸막이 0.6)
  const rx0 = IN_X - RW / 2, rx1 = IN_X + RW / 2, rz0 = IN_ZF, rz1 = IN_ZF + RD;
  const WALL_H = 6.5, WT = 0.5;
  // 방 둘레는 까맣게 (밖의 하늘·바다가 안 보이게)
  {
    const voidBox = new THREE.Mesh(new THREE.BoxGeometry(RW + 80, 60, RD + 80), new THREE.MeshBasicMaterial({ color: 0x07060c, side: THREE.BackSide, fog: false }));
    voidBox.position.set(IN_X, 10, (rz0 + rz1) / 2 - 10); voidBox.userData.dynamic = true;
    scene.add(voidBox);
  }
  const ib = new DecoBatch(THREE);           // 전시관 블록 (그림자 받기만)
  const ibt = new DecoBatch(THREE);          // 작은 것 (그림자 없음)
  // 바닥 받침
  ib.add(BOX, 0x3a3430, [IN_X, FLOOR - 0.22, (rz0 + rz1) / 2], [0, 0, 0], [RW + 2, 0.4, RD + 2]);
  // 홀 x 위치 정하기
  let hx = rx0;
  for (const h of halls) { h.x0 = hx; h.x1 = hx + h.W; h.cx = hx + h.W / 2; hx += h.W + 0.6; }
  // 바닥: 홀마다 색이 다른 체크 타일 (2칸) + 가끔 다른 톤
  for (const h of halls) {
    const [A, B, C] = h.H.floor;
    ib.add(BOX, A, [h.cx, FLOOR - 0.03, (rz0 + rz1) / 2], [0, 0, 0], [h.W + 0.6, 0.06, RD]);
    for (let x = h.x0 + 1; x < h.x1; x += 2) for (let z = rz0 + LOBBY + 1; z < rz1; z += 2) { // 로비는 대리석이라 빼요
      const i = Math.round((x - h.x0 - 1) / 2) + Math.round((z - rz0 - 1) / 2);
      if (i % 2 === 0 && rnd() > 0.12) continue;
      ibt.add(BOX, i % 2 ? B : C, [x, FLOOR + 0.004, z], [0, 0, 0], [1.96, 0.012, 1.96]);
    }
    // 홀 앞 경계 띠 (금속 띠)
    ibt.add(BOX, h.H.trim, [h.cx, FLOOR + 0.012, rz0 + LOBBY], [0, 0, 0], [h.W, 0.012, 0.16]);
  }
  // 로비 바닥: 대리석 (흰색 3톤 + 가운데 큰 원 무늬)
  for (let x = rx0 + 1; x < rx1; x += 2) for (let z = rz0 + 1; z < rz0 + LOBBY; z += 2) ibt.add(BOX, pick([0xf0ece4, 0xe4ded2, 0xf6f2ea]), [x, FLOOR + 0.006, z], [0, 0, 0], [1.96, 0.014, 1.96]);
  for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; ibt.add(BOX, k % 2 ? 0xd8b040 : 0x8a2a2a, [IN_X + Math.cos(a) * 4.2, FLOOR + 0.018, rz0 + 7 + Math.sin(a) * 4.2], [0, -a, 0], [0.3, 0.012, 0.8]); }
  // 벽: 뒷벽 · 옆벽 (높게, 아래 판벽 · 걸레받이 · 몰딩 · 위 처마) / 앞벽은 낮은 턱 (카메라가 들여다봐요)
  const wallFace = (x0, z0, x1, z1, H, cols, trim, nx, nz) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const S = (len, h, th) => (alongX ? [len, h, th] : [th, h, len]);
    ib.add(BOX, cols[0], [cx, FLOOR + H / 2, cz], [0, 0, 0], S(L, H, WT));
    const o = WT / 2 + 0.012;
    // 벽 판넬 무늬 (2톤 세로 판)
    for (let t = -L / 2 + 1.0; t < L / 2 - 0.5; t += 2.0) ibt.add(BOX, cols[1 + (Math.round(t) & 1)], [cx + (alongX ? t : 0) + nx * o, FLOOR + 1.6 + (H - 1.6) / 2, cz + (alongX ? 0 : t) + nz * o], [0, 0, 0], S(1.7, H - 2.4, 0.02));
    ib.add(BOX, trim, [cx + nx * (o + 0.01), FLOOR + 0.62, cz + nz * (o + 0.01)], [0, 0, 0], S(L - 0.05, 1.2, 0.04));    // 판벽
    for (let t = -L / 2 + 0.6; t < L / 2 - 0.3; t += 1.2) ibt.add(BOX, tone(trim, -0.06), [cx + (alongX ? t : 0) + nx * (o + 0.04), FLOOR + 0.62, cz + (alongX ? 0 : t) + nz * (o + 0.04)], [0, 0, 0], S(0.9, 0.85, 0.02)); // 판벽 판넬
    ib.add(BOX, tone(trim, -0.12), [cx + nx * (o + 0.05), FLOOR + 0.09, cz + nz * (o + 0.05)], [0, 0, 0], S(L - 0.05, 0.18, 0.08)); // 걸레받이
    ib.add(BOX, tone(trim, 0.08), [cx + nx * (o + 0.05), FLOOR + 1.25, cz + nz * (o + 0.05)], [0, 0, 0], S(L - 0.05, 0.08, 0.1)); // 판벽 위 몰딩
    ib.add(BOX, tone(trim, 0.05), [cx + nx * (o + 0.06), FLOOR + H - 0.15, cz + nz * (o + 0.06)], [0, 0, 0], S(L - 0.05, 0.3, 0.14)); // 위 처마
  };
  for (const h of halls) wallFace(h.x0 - 0.3, rz1, h.x1 + 0.3, rz1, WALL_H, h.H.wall, h.H.trim, 0, -1);
  wallFace(rx0, rz0, rx0, rz1, WALL_H, halls[0].H.wall, halls[0].H.trim, 1, 0);
  wallFace(rx1, rz0, rx1, rz1, WALL_H, halls[halls.length - 1].H.wall, halls[halls.length - 1].H.trim, -1, 0);
  block(rx0 - 2, rz1 - 0.4, rx1 + 2, rz1 + 2); block(rx0 - 2, rz0 - 2, rx0 + 0.4, rz1 + 2); block(rx1 - 0.4, rz0 - 2, rx1 + 2, rz1 + 2);
  // 앞 낮은 턱 (가운데 나가는 문 자리는 비워요)
  const EXIT_W = 3.2;
  for (const s of [-1, 1]) {
    const a = s < 0 ? rx0 : IN_X + EXIT_W / 2, b = s < 0 ? IN_X - EXIT_W / 2 : rx1;
    ib.add(BOX, 0x8a6a4a, [(a + b) / 2, FLOOR + 0.3, rz0], [0, 0, 0], [b - a, 0.6, WT]);
    ib.add(BOX, 0xd8b040, [(a + b) / 2, FLOOR + 0.63, rz0], [0, 0, 0], [b - a + 0.04, 0.08, WT + 0.06]);
    block(a, rz0 - 1, b, rz0 + 0.35);
  }
  block(IN_X - EXIT_W / 2, rz0 - 1.4, IN_X + EXIT_W / 2, rz0 - 0.4);                // 문 밖으로는 못 나가요 (매트를 밟으면 나가져요)
  // 나가는 문 매트 + 양옆 기둥 + 위 "출구" 판
  ibt.add(BOX, 0x8a2a2a, [IN_X, FLOOR + 0.02, rz0 + 0.9], [0, 0, 0], [EXIT_W - 0.2, 0.02, 1.3]);
  ibt.add(BOX, 0xd8b040, [IN_X, FLOOR + 0.032, rz0 + 0.9], [0, 0, 0], [EXIT_W - 0.6, 0.008, 0.9]);
  for (const s of [-1, 1]) { ib.add(BOX, 0xd8d0c0, [IN_X + s * (EXIT_W / 2 + 0.25), FLOOR + 1.2, rz0], [0, 0, 0], [0.5, 2.4, 0.6]); ib.add(BOX, 0xd8b040, [IN_X + s * (EXIT_W / 2 + 0.25), FLOOR + 2.45, rz0], [0, 0, 0], [0.6, 0.1, 0.7]); }
  // 홀 칸막이: 홀과 홀 사이 (로비 쪽은 열려 있고, 가운데에 문이 하나 더 있어요) + 홀 입구 아치 · 이름판
  const hallSigns = [];
  halls.forEach((h, i) => {
    if (i > 0) {
      const x = h.x0 - 0.3, z0 = rz0 + LOBBY + 1.5, z1 = rz1, gapC = z0 + (z1 - z0) * 0.45, gapW = 4;
      for (const [a, b] of [[z0, gapC - gapW / 2], [gapC + gapW / 2, z1]]) {
        ib.add(BOX, h.H.wall[0], [x, FLOOR + 2.0, (a + b) / 2], [0, 0, 0], [0.6, 4.0, b - a]);
        ib.add(BOX, h.H.trim, [x, FLOOR + 4.05, (a + b) / 2], [0, 0, 0], [0.7, 0.14, b - a + 0.06]);
        ib.add(BOX, tone(h.H.trim, -0.12), [x, FLOOR + 0.09, (a + b) / 2], [0, 0, 0], [0.72, 0.18, b - a]);
        block(x - 0.45, a, x + 0.45, b);
      }
      // 칸막이 끝 큰 기둥 (로비 쪽)
      ib.add(BOX, 0xe8e2d4, [x, FLOOR + 2.6, z0 - 0.4], [0, 0, 0], [1.0, 5.2, 1.0]);
      ib.add(BOX, 0xd8b040, [x, FLOOR + 5.25, z0 - 0.4], [0, 0, 0], [1.2, 0.14, 1.2]);
      ib.add(BOX, 0xd8d0c0, [x, FLOOR + 0.15, z0 - 0.4], [0, 0, 0], [1.2, 0.3, 1.2]);
      block(x - 0.6, z0 - 1.0, x + 0.6, z0 + 0.2);
    }
    // 홀 이름판 (로비에서 보이게, 홀 앞쪽 위에 떠 있는 간판 · 양 기둥)
    const c = document.createElement('canvas'); c.width = 1024; c.height = 220;
    const g = c.getContext('2d');
    const bg = new THREE.Color(h.H.wall[0]).getStyle(), dark = new THREE.Color(h.H.wall[0]).getHSL({}).l < 0.4;
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 220);
    g.strokeStyle = new THREE.Color(h.H.trim).getStyle(); g.lineWidth = 14; g.strokeRect(10, 10, 1004, 200);
    g.fillStyle = dark ? '#ffe8c0' : '#3a2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '92px "Jua", "Malgun Gothic", sans-serif'; g.fillText(h.H.name, 512, 88);
    g.font = '40px "Jua", "Malgun Gothic", sans-serif'; g.fillText(`${h.H.sub} · ${h.list.length}종`, 512, 168);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    // 홀 입구 왼쪽에 세운 입간판 (머리 위에 띄우면 카메라를 가려서 낮게): 판 + 테두리 + 다리 2개 + 받침
    const sx = h.x0 + 4.2, sz = rz0 + LOBBY + 0.6, sy = FLOOR + 1.25;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    sm.position.set(sx, sy, sz - 0.07); sm.rotation.y = Math.PI; // 카메라(-z) 쪽에서 보여요
    sm.userData.dynamic = true;
    scene.add(sm); hallSigns.push(sm);
    ib.add(BOX, h.H.trim, [sx, sy, sz], [0, 0, 0], [4.4, 1.1, 0.1]);
    for (const s of [-1, 1]) { ib.add(BOX, tone(h.H.trim, -0.1), [sx + s * 1.9, FLOOR + 0.4, sz], [0, 0, 0], [0.12, 0.8, 0.12]); ib.add(BOX, tone(h.H.trim, -0.15), [sx + s * 1.9, FLOOR + 0.04, sz], [0, 0, 0], [0.4, 0.08, 0.5]); }
    shiny.add(BOX, 0xd8b040, [sx, sy + 0.6, sz], [0, 0, 0], [4.5, 0.06, 0.14]);
    block(sx - 2.3, sz - 0.3, sx + 2.3, sz + 0.3);
    // 홀 깃발 (뒷벽에 길게 3개)
    for (let k = -1; k <= 1; k++) {
      const bx = h.cx + k * h.W * 0.32;
      ibt.add(BOX, h.H.accent, [bx, FLOOR + WALL_H - 2.2, rz1 - WT / 2 - 0.12], [0, 0, 0], [1.6, 3.4, 0.04]);
      ibt.add(BOX, h.H.trim, [bx, FLOOR + WALL_H - 0.55, rz1 - WT / 2 - 0.16], [0, 0, 0], [1.9, 0.12, 0.08]);
      ibt.add(BOX, 0xf4efe2, [bx, FLOOR + WALL_H - 2.2, rz1 - WT / 2 - 0.15], [0, 0, 0], [0.9, 0.36, 0.02]);
      ibt.add(BOX, 0xf4efe2, [bx + 0.55, FLOOR + WALL_H - 2.2, rz1 - WT / 2 - 0.15], [0, 0, 0.6], [0.3, 0.42, 0.02]);
      for (let m = 0; m < 6; m++) ibt.add(BOX, h.H.trim, [bx - 0.65 + m * 0.26, FLOOR + WALL_H - 4.05, rz1 - WT / 2 - 0.12], [0, 0, 0], [0.05, 0.3, 0.05]);
    }
  });
  // 로비 꾸미기: 안내 데스크 (E) · 큰 물고기 뼈 화석 · 기둥 · 화분 · 벤치
  const DESK = { x: IN_X + 7.5, z: rz0 + 5.2 };
  {
    const { x, z } = DESK, wood = [0x6a3a1e, 0x7a4a26, 0x5a3018];
    ib.add(BOX, wood[0], [x, FLOOR + 0.55, z], [0, 0, 0], [4.2, 1.1, 1.0]);
    ib.add(BOX, 0xe8e0cc, [x, FLOOR + 1.14, z], [0, 0, 0], [4.4, 0.08, 1.15]);            // 대리석 상판
    for (let k = 0; k < 6; k++) ibt.add(BOX, wood[1 + (k % 2)], [x - 1.75 + k * 0.7, FLOOR + 0.6, z - 0.51], [0, 0, 0], [0.56, 0.8, 0.02]); // 앞 판넬
    for (let k = 0; k < 7; k++) ibt.add(BOX, 0xd8b040, [x - 2.1 + k * 0.7, FLOOR + 0.6, z - 0.52], [0, 0, 0], [0.04, 0.9, 0.02]);
    ibt.add(BOX, 0x2a2420, [x, FLOOR + 0.06, z - 0.5], [0, 0, 0], [4.2, 0.12, 0.04]);     // 발판
    ibt.add(BOX, 0xd8b040, [x + 1.2, FLOOR + 1.24, z], [0, 0, 0], [0.3, 0.12, 0.2]);     // 종
    ibt.add(BOX, 0xf4f0e0, [x - 1.0, FLOOR + 1.2, z], [0, 0.2, 0], [0.5, 0.03, 0.36]);   // 방명록
    ibt.add(BOX, 0x8a2a2a, [x - 1.0, FLOOR + 1.215, z], [0, 0.2, 0], [0.02, 0.01, 0.36]);
    block(x - 2.3, z - 0.65, x + 2.3, z + 0.65);
  }
  {
    // 거대한 물고기 뼈 화석 (등뼈 · 갈비뼈 · 머리뼈 · 꼬리) — 로비 가운데 랜드마크
    const fx = IN_X - 8, fz = rz0 + 6.5, by = FLOOR + 2.2, bone = [0xe8dcc0, 0xdccfae, 0xf2e8d0];
    ib.add(BOX, 0x4a3a30, [fx, FLOOR + 0.25, fz], [0, 0, 0], [9.0, 0.5, 2.6]);            // 받침
    ib.add(BOX, 0xd8b040, [fx, FLOOR + 0.52, fz], [0, 0, 0], [9.1, 0.05, 2.7]);
    for (const s of [-1, 1]) ib.add(BOX, 0x3a3a3a, [fx + s * 2.5, FLOOR + 1.3, fz], [0, 0, 0], [0.08, 1.6, 0.08]); // 받침대 봉
    for (let k = 0; k < 18; k++) {
      const t = k / 17, x = fx - 3.8 + t * 7.4, y = by + Math.sin(t * Math.PI) * 0.4;
      ib.add(BOX, bone[k % 3], [x, y, fz], [0, 0, 0], [0.28, 0.24, 0.24]);                  // 등뼈
      ibt.add(BOX, bone[(k + 1) % 3], [x, y + 0.26, fz], [0, 0, 0], [0.06, 0.32, 0.06]);
      if (k > 3 && k < 14) for (const s of [-1, 1]) { const rl = 0.9 * Math.sin((t - 0.15) * Math.PI / 0.75); ibt.add(BOX, bone[k % 3], [x, y - rl * 0.45, fz + s * 0.3], [s * 0.35, 0, 0], [0.06, rl, 0.06]); } // 갈비뼈
    }
    ib.add(BOX, bone[0], [fx + 4.3, by + 0.1, fz], [0, 0, -0.1], [1.2, 0.8, 0.7]);        // 머리뼈
    ib.add(BOX, bone[1], [fx + 4.9, by - 0.15, fz], [0, 0, 0.25], [0.6, 0.3, 0.5]);        // 턱
    ibt.add(BOX, 0x2a2420, [fx + 4.5, by + 0.25, fz - 0.36], [0, 0, 0], [0.2, 0.2, 0.02]); // 눈구멍
    ibt.add(BOX, 0x2a2420, [fx + 4.5, by + 0.25, fz + 0.36], [0, 0, 0], [0.2, 0.2, 0.02]);
    for (const s of [-1, 1]) ib.add(BOX, bone[2], [fx - 4.3, by + s * 0.4, fz], [0, 0, s * 0.7], [1.0, 0.18, 0.12]); // 꼬리
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { const x = fx - 2.2 + k * 1.5; ibt.add(BOX, 0xc8a878, [x, FLOOR + 0.9, fz + s * 1.6], [0, 0, 0], [0.08, 0.8, 0.08]); } // 줄 기둥
    for (const s of [-1, 1]) ibt.add(BOX, 0x8a2a2a, [fx, FLOOR + 1.2, fz + s * 1.6], [0, 0, 0], [4.6, 0.05, 0.05]); // 빨간 줄
    block(fx - 4.7, fz - 1.8, fx + 5.3, fz + 1.8);
  }
  // 로비 기둥 (줄줄이) · 화분 · 벤치
  for (let x = rx0 + 6; x < rx1 - 4; x += 12) {
    if (Math.abs(x - IN_X) < 14) continue;
    const z = rz0 + 3.0;
    ib.add(BOX, 0xd8d0c0, [x, FLOOR + 0.15, z], [0, 0, 0], [1.1, 0.3, 1.1]);
    for (let k = 0; k < 5; k++) ib.add(CYL, k % 2 ? 0xe8e2d4 : 0xf2ece0, [x, FLOOR + 0.3 + (k + 0.5) * 1.0, z], [0, 0, 0], [0.8, 1.01, 0.8]);
    ib.add(BOX, 0xd8b040, [x, FLOOR + 5.4, z], [0, 0, 0], [1.1, 0.2, 1.1]);
    block(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
    // 화분 (기둥 옆)
    const px = x + 2.0, pz = z;
    ib.add(CYL, 0xb86a3a, [px, FLOOR + 0.35, pz], [0, 0, 0], [0.7, 0.7, 0.7]);
    ib.add(CYL, 0xa85a2a, [px, FLOOR + 0.72, pz], [0, 0, 0], [0.8, 0.08, 0.8]);
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; ibt.add(BOX, pick([0x3a8a3a, 0x4aa04a, 0x2e6e2e]), [px + Math.cos(a) * 0.3, FLOOR + 1.2, pz + Math.sin(a) * 0.3], [0, -a, 0.6], [0.9, 0.04, 0.24]); }
    block(px - 0.45, pz - 0.45, px + 0.45, pz + 0.45);
  }
  // ---- 어항 하나 만들기 ----
  const glassG = [], waterG = [];
  const plaqueGeos = [];
  const ATL_C = 8, ATL_R = 16, CW = 256, CH2 = 128;
  const atlas = document.createElement('canvas'); atlas.width = ATL_C * CW; atlas.height = ATL_R * CH2;
  const atlasTex = new THREE.CanvasTexture(atlas); atlasTex.colorSpace = THREE.SRGBColorSpace;
  const addPlaque = (cell, x, y, z, w, h) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(Math.PI); g.translate(x, y, z);
    const uv = g.attributes.uv, col = cell % ATL_C, row = Math.floor(cell / ATL_C);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / ATL_C, 1 - (row + 1) / ATL_R + uv.getY(i) / ATL_R);
    plaqueGeos.push(g);
  };
  const decoTank = (t, x0, x1, zA, zB, y) => {
    const H = t.H, L = x1 - x0, D = zB - zA;
    const P2 = (b, geo, col, px, py, pz, sc, r = [0, 0, 0]) => b.add(geo, col, [px, py, pz], r, sc);
    // 모래 바닥 (2톤 + 얼룩)
    const sand = H.key === 'ruby' ? [0x8a3a3a, 0x7a2a2e, 0x9a4a48] : H.key === 'aurora' ? [0x5a5a7a, 0x4a4a6a, 0x6a6a8a] : H.key === 'jungle' ? [0x6a5a3a, 0x5a4a2e, 0x7a6a48] : [0xe8d4a4, 0xd8c494, 0xf0e0b8];
    P2(ibt, BOX, sand[0], (x0 + x1) / 2, y + 0.07, (zA + zB) / 2, [L - 0.04, 0.14, D - 0.04]);
    for (let k = 0; k < Math.max(3, Math.round(L)); k++) P2(ibt, BOX, pick(sand), x0 + 0.2 + rnd() * (L - 0.4), y + 0.145, zA + 0.15 + rnd() * (D - 0.3), [0.3 + rnd() * 0.5, 0.012, 0.2 + rnd() * 0.3], [0, rnd() * 3, 0]);
    for (let k = 0; k < Math.max(2, Math.round(L * 0.8)); k++) { const s = 0.08 + rnd() * 0.12; P2(ibt, ROCK, pick([0xb0a898, 0x8a8478, 0x9a9488, 0x6a6a62]), x0 + 0.15 + rnd() * (L - 0.3), y + 0.16, zA + 0.12 + rnd() * (D - 0.24), [s, s * 0.6, s], [rnd(), rnd(), rnd()]); } // 조약돌
    // 뒤 배경판 (구역 색 · 위는 밝고 아래는 진하게 3단) + 바위 그림자 언덕
    const BG = { lake: 0x3a6a5a, season: 0x6a5a7a, mountain: 0x8a7ab8, aurora: 0x141a3a, sea: 0x1a4a7a, jungle: 0x2a4a22, ruby: 0x3a0a14 }[H.key];
    const bh = t.hgt - 0.3;
    for (let k = 0; k < 3; k++) P2(ibt, BOX, tone(BG, 0.08 - k * 0.06), (x0 + x1) / 2, y + 0.15 + bh * (k + 0.5) / 3, zB - 0.03, [L - 0.06, bh / 3 + 0.004, 0.012]);
    for (let k = 0; k < Math.max(2, Math.round(L * 1.4)); k++) { const w2 = 0.3 + rnd() * 0.8, h2 = 0.2 + rnd() * Math.min(0.9, bh * 0.4); P2(ibt, BOX, tone(BG, -0.1 - rnd() * 0.06), x0 + 0.1 + rnd() * (L - 0.2), y + 0.14 + h2 / 2, zB - 0.05, [w2, h2, 0.012]); }
    // 수초 / 테마 장식 (뒤쪽 위주로 · 앞은 물고기가 잘 보이게 비워요)
    const n = Math.max(3, Math.round(L * 2.6));
    for (let k = 0; k < n; k++) {
      const px = x0 + 0.2 + rnd() * (L - 0.4), pz = zB - 0.15 - rnd() * Math.min(0.6, D * 0.4);
      const kh = Math.min(t.hgt * 0.6, 0.4 + rnd() * (0.4 + t.hgt * 0.3));
      if (H.deco === 'crystal' || H.deco === 'ruby') { // 빛나는 수정
        const b = H.deco === 'ruby' ? gems : auroraB;
        b.add(OCTA, 0xffffff, [px, y + 0.14 + kh * 0.35, pz], [0, rnd() * 3, (rnd() - 0.5) * 0.4], [0.14 + rnd() * 0.1, kh * 0.7, 0.14 + rnd() * 0.1]);
      } else if (H.deco === 'coral') { // 산호 가지
        const col = pick(H.plant);
        P2(ibt, CYL6, col, px, y + 0.14 + kh / 2, pz, [0.07, kh, 0.07]);
        for (const s of [-1, 1]) P2(ibt, CYL6, tone(col, 0.05), px + s * 0.08, y + 0.14 + kh * 0.65, pz, [0.05, kh * 0.5, 0.05], [0, 0, s * 0.5]);
      } else if (H.deco === 'candy') { // 사탕 막대 + 솜사탕
        P2(ibt, CYL6, 0xfff4f8, px, y + 0.14 + kh / 2, pz, [0.04, kh, 0.04]);
        P2(ibt, BALL, pick(H.plant), px, y + 0.14 + kh, pz, [0.22, 0.22, 0.22]);
      } else { // 수초 (휘어진 잎 2~3장)
        for (let m = 0; m < 3; m++) P2(ibt, BOX, pick(H.plant), px + (m - 1) * 0.05, y + 0.14 + kh * (0.45 + m * 0.05), pz, [0.05, kh * (0.8 + m * 0.1), 0.12], [0, rnd() * 3, (rnd() - 0.5) * 0.35]);
      }
    }
    // 큰 장식 하나 (어항이 크면)
    if (L > 2.2) {
      const px = x0 + L * (0.2 + rnd() * 0.6), pz = zB - D * 0.3;
      if (H.deco === 'log' || H.deco === 'root') { P2(ibt, CYL, 0x5a3e26, px, y + 0.3, pz, [0.3, Math.min(L * 0.4, 2.4), 0.3], [0, rnd(), Math.PI / 2]); P2(ibt, BOX, 0x3a7a2e, px, y + 0.46, pz, [0.6, 0.04, 0.2]); }
      else if (H.deco === 'coral') P2(ibt, ROCK, 0xff8a9a, px, y + 0.3, pz, [0.7, 0.5, 0.5], [rnd(), rnd(), 0]);
      else if (H.deco === 'petal') for (let m = 0; m < 6; m++) P2(ibt, BOX, 0xffb0c8, x0 + rnd() * L, y + 0.16, zA + rnd() * D, [0.1, 0.01, 0.08], [0, rnd() * 3, 0]);
      else P2(ibt, ROCK, pick([0x8a8478, 0x6a6a62]), px, y + 0.3, pz, [0.6, 0.45, 0.5], [rnd(), rnd(), 0]);
    }
    // 공기돌 + 올라가는 기포 기둥
    const bx = x1 - 0.25, bz = zB - 0.2;
    P2(ibt, CYL, 0x5a5a5a, bx, y + 0.17, bz, [0.12, 0.06, 0.12]);
    for (let k = 0; k < Math.max(3, Math.round(t.hgt * 3)); k++) P2(ibt, BALL, 0xe8fbff, bx + (rnd() - 0.5) * 0.06, y + 0.3 + k * 0.3 + rnd() * 0.1, bz, [0.05 + rnd() * 0.03, 0.05 + rnd() * 0.03, 0.05 + rnd() * 0.03]);
  };
  const makeTank = (t, hall, idx) => {
    const H = hall.H;
    const cx = hall.cx + t.lx, zF = rz0 + LOBBY + t.lz;           // 앞면 z
    const L = t.len, D = t.dep, TH = t.hgt, BH = t.base;
    const x0 = cx - L / 2, x1 = cx + L / 2, zA = zF, zB = zF + D;
    const yb = FLOOR + BH;                                        // 어항 바닥 높이
    // ---- 받침 ----
    if (BH > 0.6) { // 나무 장 (판넬 문 + 손잡이 + 걸레받이 + 옆 판넬)
      ib.add(BOX, H.cab, [cx, FLOOR + BH / 2, (zA + zB) / 2], [0, 0, 0], [L + 0.3, BH, D + 0.3]);
      ib.add(BOX, tone(H.cab, 0.08), [cx, yb - 0.03, (zA + zB) / 2], [0, 0, 0], [L + 0.4, 0.06, D + 0.4]);      // 상판
      ibt.add(BOX, 0x1e1a18, [cx, FLOOR + 0.06, zA - 0.13], [0, 0, 0], [L + 0.2, 0.12, 0.04]);                 // 발판(그늘)
      const np = Math.max(1, Math.round(L / 1.1));
      for (let k = 0; k < np; k++) {
        const px = x0 + (k + 0.5) * L / np, pw = L / np - 0.14;
        for (const [dy, sh] of [[BH - 0.18, [pw, 0.05, 0.03]], [0.22, [pw, 0.05, 0.03]]]) ibt.add(BOX, tone(H.cab, -0.06), [px, FLOOR + dy, zA - 0.165], [0, 0, 0], sh);
        for (const s of [-1, 1]) ibt.add(BOX, tone(H.cab, -0.06), [px + s * (pw / 2 - 0.025), FLOOR + BH / 2 + 0.02, zA - 0.165], [0, 0, 0], [0.05, BH - 0.4, 0.03]);
        ibt.add(BOX, tone(H.cab, 0.05), [px, FLOOR + BH / 2 + 0.02, zA - 0.16], [0, 0, 0], [pw - 0.2, BH - 0.5, 0.02]);
        shiny.add(BOX, 0xd8b040, [px + pw / 2 - 0.12, FLOOR + BH / 2 + 0.05, zA - 0.19], [0, 0, 0], [0.04, 0.14, 0.04]);
      }
      for (const s of [-1, 1]) ibt.add(BOX, tone(H.cab, 0.05), [cx + s * (L / 2 + 0.165), FLOOR + BH / 2, (zA + zB) / 2], [0, 0, 0], [0.02, BH - 0.3, D - 0.1]);
    } else { // 돌 받침 (2톤 + 위 테두리 + 금 띠)
      ib.add(BOX, 0x8a8478, [cx, FLOOR + BH / 2, (zA + zB) / 2], [0, 0, 0], [L + 0.4, BH, D + 0.4]);
      for (let x = x0; x < x1; x += 1.4) ibt.add(BOX, pick([0x9a9488, 0x7a7468]), [Math.min(x + 0.7, x1 - 0.1), FLOOR + BH / 2, zA - 0.215], [0, 0, 0], [1.3, BH - 0.1, 0.02]);
      ib.add(BOX, H.trim, [cx, yb - 0.04, (zA + zB) / 2], [0, 0, 0], [L + 0.5, 0.08, D + 0.5]);
    }
    // ---- 유리 · 물 (투명) ----
    const gg = new THREE.BoxGeometry(L, TH, D); gg.translate(cx, yb + TH / 2, (zA + zB) / 2); glassG.push(gg);
    const wg = new THREE.BoxGeometry(L - 0.06, TH - 0.22, D - 0.06); wg.translate(cx, yb + (TH - 0.22) / 2 + 0.02, (zA + zB) / 2); waterG.push(wg);
    // ---- 틀: 모서리 기둥 4개 + 위아래 테 (금속) ----
    const fr = H.key === 'ruby' ? 0xd8b040 : 0x2a2a30, ft = 0.07;
    for (const px of [x0, x1]) for (const pz of [zA, zB]) ib.add(BOX, fr, [px, yb + TH / 2, pz], [0, 0, 0], [ft, TH + 0.02, ft]);
    for (const py of [yb + 0.02, yb + TH]) {
      for (const pz of [zA, zB]) ib.add(BOX, fr, [cx, py, pz], [0, 0, 0], [L + ft, ft, ft]);
      for (const px of [x0, x1]) ib.add(BOX, fr, [px, py, (zA + zB) / 2], [0, 0, 0], [ft, ft, D + ft]);
    }
    for (const px of [x0, x1]) for (const pz of [zA, zB]) shiny.add(BOX, 0xb8b8c0, [px, yb + TH - 0.1, pz], [0, 0, 0], [ft + 0.03, 0.04, ft + 0.03]); // 볼트 덮개
    // ---- 뚜껑 + 조명 띠 + 경첩 ----
    // 위는 열어 두고(카메라가 위에서 물고기를 봐요) 뒤쪽에만 조명 갓 + 빛 띠 + 받침쇠
    const hd = Math.min(0.32, D * 0.3);
    ib.add(BOX, tone(fr, 0.04), [cx, yb + TH + 0.1, zB - hd / 2], [0, 0, 0], [L + 0.12, 0.12, hd + 0.06]);
    tankGlow.add(BOX, 0xffffff, [cx, yb + TH + 0.03, zB - hd / 2], [0, 0, 0], [L - 0.2, 0.02, hd - 0.06]);
    for (let k = 0; k <= Math.max(1, Math.round(L / 1.5)); k++) shiny.add(BOX, 0x8a8a90, [x0 + 0.1 + k * (L - 0.2) / Math.max(1, Math.round(L / 1.5)), yb + TH + 0.18, zB - hd / 2], [0, 0, 0], [0.04, 0.04, hd]);
    // ---- 안 꾸미기 ----
    decoTank(t, x0 + 0.04, x1 - 0.04, zA + 0.04, zB - 0.04, yb);
    // ---- 이름판 (받침 앞 · 금빛 테두리) ----
    const pw = Math.min(1.6, L - 0.2), ph = pw * 0.5, py = BH > 0.6 ? FLOOR + BH - 0.42 : FLOOR + Math.max(0.2, BH / 2);
    const pz = zA - (BH > 0.6 ? 0.19 : 0.27); // 돌 받침은 판석(앞면 -0.225)보다 앞으로
    shiny.add(BOX, 0xd8b040, [cx, py, pz + 0.012], [0, 0, 0], [pw + 0.08, ph + 0.08, 0.02]);
    addPlaque(idx, cx, py, pz - 0.004, pw, ph);
    block(x0 - 0.3, zA - 0.35, x1 + 0.3, zB + 0.3);
    const tank = { f: t.f, m: t.m, x: cx, x0, x1, zA, zB, yb, len: L, dep: D, hgt: TH, idx, hall: H.key, fish: null };
    tanks.push(tank);
    // E: 어항 앞에서 기증 / 바꾸기 / 꺼내기
    shops.push({ kind: 'mtank', tank, title: '', group: museumGroup, pos: new THREE.Vector3(cx, FLOOR, zA - 1.1), promptAt: new THREE.Vector3(cx, yb + TH + 0.8, zA), r: Math.max(1.3, Math.min(4, L / 2)) });
  };
  const museumGroup = new THREE.Group(); museumGroup.userData.dynamic = true; scene.add(museumGroup);
  // 카메라 막이 (안 보이는 벽): 박물관 안은 평소 시점이라, 카메라가 벽 밖 까만 곳으로 나가지 않게 앞뒤옆 벽 · 칸막이에 걸려요
  //  (main.js 카메라가 상점 그룹을 레이캐스트해요 — 어항 앞 E 자리들이 이 그룹을 써요)
  {
    const inv = new THREE.MeshBasicMaterial({ visible: false });
    const wall = (cx, cz, sx, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 14, sz), inv); m.position.set(cx, FLOOR + 7, cz); museumGroup.add(m); };
    wall(IN_X, rz1, RW + 2, 0.6); wall(IN_X, rz0, RW + 2, 0.6); wall(rx0, (rz0 + rz1) / 2, 0.6, RD + 2); wall(rx1, (rz0 + rz1) / 2, 0.6, RD + 2);
  }
  let idx = 0;
  for (const h of halls) for (const t of h.list) makeTank(t, h, idx++);
  // 통로 벤치 (홀 안 빈자리에 · 앞뒤 어항과 안 겹치게)
  for (const h of halls) {
    for (let k = 0; k < 3; k++) {
      const x = h.x0 + 3 + rnd() * (h.W - 6), z = rz0 + LOBBY + 3 + rnd() * (HALL_D - 6);
      if (rects.some((r) => x > r[0] - 1.6 && x < r[2] + 1.6 && z > r[1] - 1.2 && z < r[3] + 1.2)) continue;
      for (let m = 0; m < 3; m++) ib.add(BOX, m % 2 ? 0x8a5a30 : 0x7a4a26, [x, FLOOR + 0.45, z - 0.15 + m * 0.15], [0, 0, 0], [1.8, 0.06, 0.13]);
      for (const s of [-1, 1]) ib.add(BOX, 0x2a2a30, [x + s * 0.8, FLOOR + 0.22, z], [0, 0, 0], [0.08, 0.44, 0.45]);
      block(x - 1.0, z - 0.35, x + 1.0, z + 0.35);
    }
  }
  // 투명 덩어리 (유리 · 물)
  {
    const g1 = mergeGeometries(glassG, false), g2 = mergeGeometries(waterG, false);
    glassG.forEach((g) => g.dispose()); waterG.forEach((g) => g.dispose());
    const water = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ color: 0x5ac8e8, transparent: true, opacity: 0.26, roughness: 0.1, emissive: 0x1a6a8a, emissiveIntensity: 0.3, depthWrite: false }));
    water.renderOrder = 4; water.userData.dynamic = true;
    const glass = new THREE.Mesh(g1, new THREE.MeshStandardMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.2, depthWrite: false }));
    glass.renderOrder = 5; glass.userData.dynamic = true;
    scene.add(water, glass);
    const pg = mergeGeometries(plaqueGeos, false); plaqueGeos.forEach((g) => g.dispose());
    const plaques = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: atlasTex, emissiveIntensity: 0.2 }));
    plaques.userData.dynamic = true; scene.add(plaques);
  }
  // 전시관 불빛: 나를 따라다니는 큰 등 하나 (안에 있을 때만 켜요)
  const light = new THREE.PointLight(0xfff0d8, 0, 70, 1.0);
  scene.add(light);
  // 로비 진행 현황판 (몇 종 모았는지 · 다 모으면 보상)
  const board = document.createElement('canvas'); board.width = 1024; board.height = 400;
  const boardTex = new THREE.CanvasTexture(board); boardTex.colorSpace = THREE.SRGBColorSpace;
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.5), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.7, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.3 }));
    m.position.set(DESK.x, FLOOR + 3.5, DESK.z + 1.62); m.userData.dynamic = true;
    m.rotation.y = Math.PI;
    scene.add(m);
    ib.add(BOX, 0x6a3a1e, [DESK.x, FLOOR + 3.5, DESK.z + 1.68], [0, 0, 0], [6.7, 2.8, 0.1]);
    for (const s of [-1, 1]) ib.add(BOX, 0x5a3018, [DESK.x + s * 3.2, FLOOR + 1.1, DESK.z + 1.68], [0, 0, 0], [0.16, 2.2, 0.16]);
    block(DESK.x - 3.4, DESK.z + 1.5, DESK.x + 3.4, DESK.z + 1.85);
  }
  shops.push({ kind: 'museumdesk', title: '안내 데스크 · 기증 현황 · 한 번에 기증 (E)', group: museumGroup, pos: new THREE.Vector3(DESK.x, FLOOR, DESK.z - 1.3), promptAt: new THREE.Vector3(DESK.x, FLOOR + 2.0, DESK.z), r: 1.8 });

  // 다 만들었으면 덩어리로
  deco.build(scene); shiny.build(scene); tiny.build(scene, { cast: false });
  glow.build(scene, { cast: false, material: glowMat });
  ib.build(scene, { cast: false }); ibt.build(scene, { cast: false });
  tankGlow.build(scene, { cast: false, material: tankGlowMat });
  gems.build(scene, { cast: false, material: gemMat });
  auroraB.build(scene, { cast: false, material: auroraMat });

  // =====================================================
  //  상태 · 그리기
  // =====================================================
  const total = tanks.length;
  const drawPlaque = (t) => {
    const g = atlas.getContext('2d'), col = t.idx % ATL_C, row = Math.floor(t.idx / ATL_C);
    const x = col * CW, y = row * CH2, f = t.f, R = RARITY[f.rarity], it = ctx.save.museum.fish[f.name], known = it || ctx.save.dex[f.name];
    g.fillStyle = '#2e2420'; g.fillRect(x, y, CW, CH2);
    g.strokeStyle = '#d8b040'; g.lineWidth = 5; g.strokeRect(x + 4, y + 4, CW - 8, CH2 - 8);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe8c0'; g.font = `${f.name.length > 8 ? 26 : 32}px "Jua", "Malgun Gothic", sans-serif`;
    g.fillText(known ? f.name : '???', x + CW / 2, y + 36);
    g.fillStyle = R.color; g.font = '22px "Jua", "Malgun Gothic", sans-serif'; g.fillText(R.label, x + CW / 2, y + 70);
    g.fillStyle = it ? '#9affb0' : '#c8b8a8'; g.font = '20px "Jua", "Malgun Gothic", sans-serif';
    g.fillText(it ? `기증 완료 · ${fmtKg(it.weight)}` : '기증을 기다려요', x + CW / 2, y + 102);
    atlasTex.needsUpdate = true;
  };
  const drawBoard = () => {
    const g = board.getContext('2d'), n = Object.keys(ctx.save.museum.fish).length;
    g.fillStyle = '#2e2420'; g.fillRect(0, 0, 1024, 400);
    g.strokeStyle = '#d8b040'; g.lineWidth = 12; g.strokeRect(8, 8, 1008, 384);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe8c0'; g.font = '72px "Jua", "Malgun Gothic", sans-serif'; g.fillText('기증 현황', 512, 80);
    g.font = '96px "Jua", "Malgun Gothic", sans-serif'; g.fillStyle = n >= total ? '#9affb0' : '#ffd84a'; g.fillText(`${n} / ${total}`, 512, 190);
    g.fillStyle = '#4a3a30'; g.fillRect(112, 262, 800, 40);
    g.fillStyle = '#d8b040'; g.fillRect(112, 262, 800 * n / total, 40);
    g.fillStyle = '#ffe8c0'; g.font = '40px "Jua", "Malgun Gothic", sans-serif';
    g.fillText(ctx.save.museum.paid ? '보상을 받았어요! 고마워요' : `모든 어항을 채우면 ${fmtMoney(MUSEUM_REWARD)}`, 512, 350);
    boardTex.needsUpdate = true;
  };
  // 기증한 물고기 모형 (실제 크기 그대로)
  const swim = [];
  const placeFish = (t) => {
    if (t.fish) { scene.remove(t.fish.model); t.fish = null; }
    const it = ctx.save.museum.fish[t.f.name];
    if (!it) return;
    const model = makeFishModel(t.f, it.mut, it.weight);
    if (!it.mut && compactRig) try { compactRig(THREE, model); } catch (_) {} // 이로치 없는 물고기는 블록을 합쳐서 가볍게
    const k = fishScale(t.f, it.weight) / fishScale(t.f, t.f.w[1]);        // 제일 무거울 때보다 얼마나 작은지
    const len = t.m.sx * k, ht = t.m.sy * k;
    const range = Math.max(0, (t.len - len) / 2 - 0.15);
    const y = t.yb + 0.2 + Math.max(0, (t.hgt - 0.3 - ht)) * 0.5 + ht / 2 - t.m.cy * k;
    t.fish = { model, range, y, cx: t.m.cx * k, cz: t.m.cz * k, ph: rnd() * 10, sp: 0.18 + rnd() * 0.2, flop: t.f.name === '물 만난 광어' };
    scene.add(model);
  };
  const refresh = () => {
    for (const t of tanks) { drawPlaque(t); }
    drawBoard();
    for (const t of tanks) {
      const it = ctx.save.museum.fish[t.f.name];
      const has = t.fish && t.fish.key === (it ? it.id : null);
      if (!has) { placeFish(t); if (t.fish) t.fish.key = it.id; }
    }
    for (const s of shops) if (s.kind === 'mtank') { const it = ctx.save.museum.fish[s.tank.f.name]; s.title = it ? `${s.tank.f.name} 어항 · 기증 완료 (E)` : `${ctx.save.dex[s.tank.f.name] ? s.tank.f.name : '???'} 어항 · 기증하기 (E)`; }
  };

  const room = {
    id: 'museum', name: '노을 박물관', museum: true, freeCam: true, // freeCam = 평소 시점 (마우스로 돌리고 휠로 확대)
    enterMsg: '노을 박물관에 들어왔어요. 어항 앞에서 E 로 물고기를 기증해요. 문 앞 매트를 밟으면 밖으로 나가요.',
    x: IN_X, z: (rz0 + rz1) / 2, x0: rx0, x1: rx1, z0: rz0, z1: rz1, rw: RW, rd: RD, floorY: FLOOR,
    exitAt: { x: IN_X, z: rz0 + 0.55 }, enterAt: { x: IN_X, z: rz0 + 2.4 },
    // 바깥 문 (정면 = 서쪽): 문 앞에서 동쪽(+x)으로 걸어가면 들어가요 / 나오면 계단 앞에 서쪽을 보고 서요
    ext: { doorX: EX - BD / 2 - 0.3, doorZ: EZ, out: { x: EX - BD / 2 - 6.4, z: EZ, ry: Math.PI / 2 } }, // 계단 아래 광장에 서요
    tanks, total
  };
  const inside = (x, z) => x > rx0 - 0.2 && x < rx1 + 0.2 && z > rz0 - 1.4 && z < rz1 + 0.2;
  // 바깥 계단 · 현관 높이 (main.js groundY)
  const groundAt = (x, z) => {
    const lx = EZ - z, lz = x - EX;                         // 세상 → 지역
    if (Math.abs(lx) > 7.6) return null;
    const front = -BD / 2 - 3.4;                            // 현관 앞 끝
    if (lz > front && lz < -BD / 2) return FY;             // 현관 바닥
    for (let k = 2; k >= 0; k--) { const zc = front - 0.4 - (2 - k) * 0.55; if (lz > zc - 0.28 && lz <= zc + 0.28) return Y0 + (k + 1) * 0.2; }
    if (lz > front - 0.12 && lz <= front) return FY;
    return null;
  };
  return {
    room, inside, groundAt, refresh, total, HALLS,
    blocked: (x, z) => rects.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]),
    inArea: (x, z) => x > MUSEUM_AREA.x0 && x < MUSEUM_AREA.x1 && z > MUSEUM_AREA.z0 && z < MUSEUM_AREA.z1,
    update(t, here, camTarget) {
      light.intensity = here ? 9 : 0;
      if (!here) return;
      if (camTarget) light.position.set(camTarget.x, FLOOR + 14, camTarget.z + 2);
      for (const tk of tanks) {
        const f = tk.fish;
        if (!f) continue;
        const s = Math.sin(t * f.sp + f.ph);
        const dir = Math.cos(t * f.sp + f.ph) > 0 ? 1 : -1;
        f.model.position.set(tk.x + s * f.range - f.cx * dir, f.y + Math.sin(t * 1.3 + f.ph) * 0.06, (tk.zA + tk.zB) / 2 - f.cz * dir);
        f.model.rotation.set(0, dir > 0 ? 0 : Math.PI, f.flop ? Math.sin(t * 17) * 0.6 : Math.sin(t * 6 + f.ph) * 0.06);
      }
    },
    swim
  };
}
