// =====================================================
//  바다 세계: 모래사장 · 부두 · 등대 · 섬 2개 · 큰 집(어항) · 맵 곳곳 장식
//
//  장식은 수천 개라서 하나씩 그리면 느려져요. 그래서 DecoBatch 로
//  "같은 재질끼리 처음부터 한 덩어리"로 만들어요 (색은 꼭짓점에 칠해요).
// =====================================================
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 한 덩어리 장식 묶음. add() 로 모양을 쌓고, build() 로 메시 하나를 만들어요
export class DecoBatch {
  constructor(THREE, matOpts = {}) {
    this.THREE = THREE;
    this.cells = new Map(); // 구역(24칸)별로 따로 모아요 → 안 보이는 구역은 통째로 안 그려요
    this.matOpts = matOpts;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
  }
  // geo: 모양, color: 색, p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz]
  add(geo, color, p, r = [0, 0, 0], s = [1, 1, 1]) {
    const T = this.THREE;
    if (this.built) { console.warn('[장식] 이미 덩어리로 만든 뒤에 블록을 넣었어요 (안 보여요!)', p); return this; }
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    this.e.set(r[0], r[1], r[2]);
    this.q.setFromEuler(this.e);
    this.m.compose(new T.Vector3(p[0], p[1], p[2]), this.q, new T.Vector3(s[0], s[1], s[2]));
    g.applyMatrix4(this.m);
    const c = new T.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const key = Math.floor(p[0] / 24) + ',' + Math.floor(p[2] / 24);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(g);
    return this;
  }
  // 구역마다 메시 하나씩 만들어요. material 을 주면 그 재질을 써요. 첫 메시를 돌려줘요
  build(parent, { cast = true, recv = true, dynamic = false, material = null } = {}) {
    const T = this.THREE;
    this.built = true;
    const mat = material || new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...this.matOpts });
    let first = null;
    for (const geos of this.cells.values()) {
      const geo = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!geo) continue;
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = cast; mesh.receiveShadow = recv;
      mesh.matrixAutoUpdate = false;
      if (dynamic) mesh.userData.dynamic = true;
      parent.add(mesh);
      first = first || mesh;
    }
    this.cells.clear();
    return first;
  }
}

// =====================================================
//  집 디자인 후보 — 산 집은 집 창에서 언제든 바꿀 수 있어요
//  wall 벽 · trim 기둥/창틀 · roof 지붕 · chimney 굴뚝 · door 문 · box 화분 · column 현관 기둥
//  rug/rug2 러그(바깥/안쪽, rug2 는 베개 색도) · sofa 소파 · blanket 이불
// =====================================================
export const HOUSE_STYLES = [
  { name: '노을 별장', wall: 0xf8efe0, trim: 0x8a5a3a, roof: 0xd85a3a, chimney: 0x8a3a2a, door: 0x6a3a22, box: 0x9a5a3a, column: 0xf4f0e8, rug: 0xc84a5a, rug2: 0xf4d8a0, sofa: 0x4a6a9a, blanket: 0x7ac8a0 },
  { name: '바다 대저택', wall: 0xeef4fa, trim: 0x2a4a6a, roof: 0x3a6ab8, chimney: 0x5a6a7a, door: 0x2a4a6a, box: 0x2a4a6a, column: 0xffffff, rug: 0x3a6ab8, rug2: 0xeef4fa, sofa: 0xe8d8b8, blanket: 0x6ab0e8 },
  { name: '벚꽃 코티지', wall: 0xffe4ec, trim: 0xffffff, roof: 0xe87a9a, chimney: 0xc86a7a, door: 0xd84a7a, box: 0xffffff, column: 0xffffff, rug: 0xff9ab8, rug2: 0xfff0f4, sofa: 0xffb0c8, blanket: 0xffd0e0 },
  { name: '숲속 통나무집', wall: 0xa87a4a, trim: 0x5a3a22, roof: 0x4a7a3a, chimney: 0x8a8478, door: 0x4a2a14, box: 0x5a3a22, column: 0x7a5232, rug: 0x8a3a2a, rug2: 0xe8c890, sofa: 0x6a8a4a, blanket: 0xc84a3a },
  { name: '민트 해변집', wall: 0xc8f0e0, trim: 0xffffff, roof: 0xff7a5a, chimney: 0xe8e0d0, door: 0xff9a6a, box: 0xffffff, column: 0xffffff, rug: 0x4ac8b0, rug2: 0xfff8e8, sofa: 0xffd84a, blanket: 0xff9a8a },
  { name: '라벤더 꿈집', wall: 0xe4d8ff, trim: 0x7a5aa8, roof: 0x5a3a8a, chimney: 0x9a8ab8, door: 0x7a5aa8, box: 0x7a5aa8, column: 0xf4f0ff, rug: 0xb48cff, rug2: 0xf4f0ff, sofa: 0x9a7ad8, blanket: 0xe8c8ff },
  { name: '쿠키 하우스', wall: 0xc8925a, trim: 0xfff4e0, roof: 0xff8ab0, chimney: 0xd8402a, door: 0x7a3a1a, box: 0xff8ab0, column: 0xfff4e0, rug: 0xff6a8a, rug2: 0xfff4e0, sofa: 0x7ac8ff, blanket: 0xffe066 },
  { name: '밤하늘 저택', wall: 0x2a3456, trim: 0xd8b040, roof: 0x1a1a2a, chimney: 0x3a3a4a, door: 0x1a1a2a, box: 0xd8b040, column: 0xd8b040, rug: 0x3a4a8a, rug2: 0xd8b040, sofa: 0x6a3a8a, blanket: 0x2a3a7a }
];

export function buildSeaWorld(ctx) {
  const { THREE, scene, SEA, SEA_PIER, JUNGLE, JUNGLE_POND, islands, addCollider, colliders, inLake, onPlateau, onDock, shops, makeLantern, LANTERN_MATS, BOUNDS } = ctx;
  // 같은 결과가 나오는 주사위 (매번 똑같은 자리에 장식이 놓여요)
  let seed = 4242;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const things = [];        // E 로 쓸 수 있는 물건들 (해먹·그네·망원경·보물 상자·징)
  const jungleFx = { gem: null, flames: [] };
  const trunks = [];        // 정글 나무 줄기 (카메라가 줄기 뒤로 숨지 않게 써요)

  // 자주 쓰는 모양들 (한 번만 만들어서 계속 복사해요)
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  const CONE = new THREE.ConeGeometry(0.5, 1, 8);
  const BALL = new THREE.IcosahedronGeometry(0.5, 0); // 각진 공 (블록 느낌 + 가벼워요)
  const ROCK = new THREE.DodecahedronGeometry(0.5, 0);
  const PRISM = new THREE.CylinderGeometry(0.5, 0.5, 1, 3); // 세모 지붕용

  const deco = new DecoBatch(THREE);                  // 보통 장식 (거친 재질)
  const shiny = new DecoBatch(THREE, { roughness: 0.35 }); // 반들반들한 것 (조개, 공, 페인트)
  // 꽃·조개·버섯처럼 아주 작은 것: 그림자를 안 만들어서 가벼워요
  const tiny = new DecoBatch(THREE);
  const tinyShiny = new DecoBatch(THREE, { roughness: 0.35 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, roughness: 0.4, emissive: 0xffb050, emissiveIntensity: 1.2 });
  LANTERN_MATS.push(glowMat); // 밤에 더 밝게 (낮밤에 따라 밝기가 바뀌어요)
  const glow = new DecoBatch(THREE);                  // 창문 불빛 (아래에서 재질을 바꿔요)

  // 바다 해안선: x 위치에서 바다가 시작되는 z
  const zEdge = (x) => SEA.z - SEA.rz * Math.sqrt(Math.max(0, 1 - ((x - SEA.x) / SEA.rx) ** 2));
  const collides = (x, z, m) => colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + m) ** 2);
  const nearShop = (x, z, d) => shops.some((s) => (x - s.pos.x) ** 2 + (z - s.pos.z) ** 2 < d * d || (x - s.group.position.x) ** 2 + (z - s.group.position.z) ** 2 < (d + 1.5) ** 2);
  // 장식을 놓아도 되는 땅인지 (물·언덕·부두·건물·다른 물체와 겹치지 않게)
  const freeLand = (x, z, m = 0.6) => x > BOUNDS.x0 + 1 && x < BOUNDS.x1 - 1 && z > BOUNDS.z0 + 1 && z < BOUNDS.z1 + 6 &&
    !inLake(x, z, 1.0) && !onPlateau(x, z) && !onDock(x, z) && !collides(x, z, m) && !nearShop(x, z, 2.2);

  // ---------------- 작은 장식 만들기 ----------------
  const FLOWER_COLORS = [0xff6a8a, 0xffd84a, 0xffffff, 0xb48cff, 0xff9a4a, 0x7ac8ff, 0xff4a6a, 0xffb0e0];
  const flower = (x, z, y = -0.08, col = pick(FLOWER_COLORS)) => {
    const h = 0.22 + rnd() * 0.2;
    tiny.add(BOX, 0x4a8a3a, [x, y + h / 2, z], [0, 0, 0], [0.03, h, 0.03]);
    const ry = rnd() * 3;
    tinyShiny.add(BOX, col, [x, y + h, z], [0, ry, 0], [0.2, 0.05, 0.08]);
    tinyShiny.add(BOX, col, [x, y + h, z], [0, ry + Math.PI / 2, 0], [0.2, 0.05, 0.08]);
    tinyShiny.add(BOX, 0xffe066, [x, y + h + 0.03, z], [0, 0, 0], [0.07, 0.04, 0.07]);
  };
  const flowerPatch = (x, z, n = 5, y = -0.08) => {
    const col = pick(FLOWER_COLORS);
    for (let i = 0; i < n; i++) flower(x + (rnd() - 0.5) * 1.4, z + (rnd() - 0.5) * 1.4, y, rnd() < 0.7 ? col : pick(FLOWER_COLORS));
    for (let i = 0; i < 3; i++) tiny.add(BOX, 0x5a9a44, [x + (rnd() - 0.5) * 1.2, y + 0.06, z + (rnd() - 0.5) * 1.2], [0, rnd() * 3, 0], [0.4, 0.12, 0.25]); // 풀잎
  };
  const bush = (x, z, s = 1, y = -0.08) => {
    const greens = [0x4f8a3e, 0x5a9a48, 0x467a36];
    for (let i = 0; i < 4; i++) tiny.add(BALL, pick(greens), [x + (rnd() - 0.5) * 0.7 * s, y + (0.35 + rnd() * 0.2) * s, z + (rnd() - 0.5) * 0.7 * s], [rnd(), rnd(), 0], [0.8 * s, 0.7 * s, 0.8 * s]);
    if (rnd() < 0.6) for (let i = 0; i < 5; i++) tinyShiny.add(BALL, pick([0xd8203a, 0xff7ab0, 0xffe066]), [x + (rnd() - 0.5) * 0.9 * s, y + (0.4 + rnd() * 0.35) * s, z + (rnd() - 0.5) * 0.9 * s], [0, 0, 0], [0.09, 0.09, 0.09]); // 열매·꽃
  };
  const mushroom = (x, z, y = -0.08) => {
    const h = 0.18 + rnd() * 0.2, r = 0.16 + rnd() * 0.14;
    tiny.add(CYL, 0xf4ecd8, [x, y + h / 2, z], [0, 0, 0], [0.1, h, 0.1]);
    tinyShiny.add(BALL, pick([0xd83a3a, 0xe88a2a, 0xb05ad8]), [x, y + h, z], [0, 0, 0], [r * 2, r, r * 2]);
    for (let i = 0; i < 3; i++) tinyShiny.add(BOX, 0xffffff, [x + (rnd() - 0.5) * r, y + h + r * 0.42, z + (rnd() - 0.5) * r], [0, 0, 0], [0.05, 0.03, 0.05]);
  };
  const rock = (x, z, s = 1, y = -0.08, col = pick([0x7a7a70, 0x8a8478, 0x6a6a62])) => deco.add(ROCK, col, [x, y + 0.2 * s, z], [rnd(), rnd() * 3, rnd()], [s, s * 0.7, s]);
  // 야자수: 살짝 휜 줄기 + 늘어진 잎 + 코코넛
  const palm = (x, z, s = 1, y = -0.08, collide = true) => {
    const lean = (rnd() - 0.5) * 0.6, dir = rnd() * Math.PI * 2;
    let px = x, pz = z, py = y;
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const h = 0.6 * s;
      deco.add(CYL, i % 2 ? 0x9a7a52 : 0x8a6a44, [px, py + h / 2, pz], [0, 0, 0], [0.32 * s * (1 - i * 0.05), h, 0.32 * s * (1 - i * 0.05)]);
      py += h * 0.95; px += Math.cos(dir) * lean * 0.18 * s; pz += Math.sin(dir) * lean * 0.18 * s;
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rnd() * 0.3, L = 1.6 * s;
      const cx = px + Math.cos(a) * L * 0.45, cz = pz + Math.sin(a) * L * 0.45;
      deco.add(BOX, k % 2 ? 0x3e8a3a : 0x4f9e42, [cx, py - 0.15 * s, cz], [0, -a, 0.45], [L, 0.06 * s, 0.42 * s]);
    }
    for (let k = 0; k < 3; k++) shiny.add(BALL, 0x5a3e22, [px + (rnd() - 0.5) * 0.3 * s, py - 0.25 * s, pz + (rnd() - 0.5) * 0.3 * s], [0, 0, 0], [0.22 * s, 0.22 * s, 0.22 * s]);
    if (collide) addCollider(x, z, 0.45 * s);
  };
  const shell = (x, z, y = -0.05) => tinyShiny.add(CONE, pick([0xffe0d0, 0xffc0c8, 0xf4f0e0, 0xffd0a0]), [x, y + 0.04, z], [Math.PI / 2, rnd() * 3, 0], [0.18, 0.12, 0.1]);
  const starfish = (x, z, y = -0.05) => {
    const col = pick([0xff7a4a, 0xff5a8a, 0xffb84a]), ry = rnd() * 3;
    for (let k = 0; k < 5; k++) tinyShiny.add(BOX, col, [x + Math.cos(ry + k * 1.2566) * 0.1, y + 0.03, z + Math.sin(ry + k * 1.2566) * 0.1], [0, -(ry + k * 1.2566), 0], [0.22, 0.04, 0.07]);
  };
  const lampPost = (x, z, y = -0.08) => {
    deco.add(CYL, 0x2a2a30, [x, y + 1.2, z], [0, 0, 0], [0.12, 2.4, 0.12]);
    deco.add(BOX, 0x2a2a30, [x, y + 2.45, z], [0, 0, 0], [0.4, 0.08, 0.4]);
    glow.add(BOX, 0xffffff, [x, y + 2.25, z], [0, 0, 0], [0.28, 0.32, 0.28]);
    addCollider(x, z, 0.25);
  };
  const bench = (x, z, ry, y = -0.08) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    let [a, b] = at(0, 0);
    deco.add(BOX, 0xb07a4a, [a, y + 0.45, b], [0, ry, 0], [1.6, 0.08, 0.45]);
    [a, b] = at(0, -0.22);
    deco.add(BOX, 0xb07a4a, [a, y + 0.75, b], [0, ry, 0], [1.6, 0.4, 0.06]);
    for (const lx of [-0.7, 0.7]) { [a, b] = at(lx, 0); deco.add(BOX, 0x3a3a40, [a, y + 0.22, b], [0, ry, 0], [0.08, 0.44, 0.4]); }
  };
  const fence = (x0, z0, x1, z1, y = -0.08, col = 0xf4efe6) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.8)), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i <= n; i++) { const t = i / n; deco.add(BOX, col, [x0 + (x1 - x0) * t, y + 0.4, z0 + (z1 - z0) * t], [0, ry, 0], [0.1, 0.8, 0.1]); }
    for (const h of [0.3, 0.6]) deco.add(BOX, col, [(x0 + x1) / 2, y + h, (z0 + z1) / 2], [0, ry, 0], [L, 0.07, 0.05]);
  };

  // =====================================================
  //  1) 모래사장 + 부두 + 등대 + 파라솔
  // =====================================================
  // 부두: 모래사장에서 바다로 쭉
  {
    const P = SEA_PIER, w = P.x1 - P.x0;
    for (let z = P.z0 + 0.27; z < P.z1; z += 0.54) deco.add(BOX, Math.floor(z / 0.54) % 2 ? 0xb08a61 : 0x9a7a52, [(P.x0 + P.x1) / 2, 0.2, z], [0, 0, 0], [w, 0.12, 0.5]);
    for (let z = P.z0 + 1; z < P.z1; z += 2.5) for (const x of [P.x0 + 0.1, P.x1 - 0.1]) deco.add(CYL, 0x5a4232, [x, -0.3, z], [0, 0, 0], [0.22, 1.4, 0.22]);
    for (const x of [P.x0, P.x1]) deco.add(BOX, 0x7a5a3a, [x, 0.55, (P.z0 + P.z1) / 2 + 2], [0, 0, 0], [0.08, 0.08, P.z1 - P.z0 - 4]); // 난간
    for (let z = P.z0 + 2; z < P.z1 - 1; z += 4) for (const x of [P.x0 + 0.05, P.x1 - 0.05]) deco.add(BOX, 0x7a5a3a, [x, 0.38, z], [0, 0, 0], [0.08, 0.36, 0.08]);
    makeLantern(P.x0 + 0.15, 0.62, P.z1 - 0.4);
    makeLantern(P.x1 - 0.15, 0.62, P.z1 - 0.4);
    // 부두 옆 빨강·하양 부표
    for (const [bx, bz] of [[-14, 40], [-5.5, 43], [-16, 31], [-3, 33]]) {
      shiny.add(CYL, 0xd83a3a, [bx, 0.1, bz], [0, 0, 0], [0.5, 0.4, 0.5]);
      shiny.add(CYL, 0xffffff, [bx, 0.38, bz], [0, 0, 0], [0.4, 0.18, 0.4]);
      shiny.add(CONE, 0xd83a3a, [bx, 0.6, bz], [0, 0, 0], [0.3, 0.3, 0.3]);
    }
  }
  // 등대: 빨강·하양 줄무늬 탑 + 빛나는 등불 방
  {
    const lx = 26, lz = zEdge(26) - 2.2;
    for (let i = 0; i < 6; i++) deco.add(CYL, i % 2 ? 0xf4f0e8 : 0xd8402a, [lx, 0.6 + i * 1.1, lz], [0, 0, 0], [2.4 - i * 0.16, 1.1, 2.4 - i * 0.16]);
    deco.add(CYL, 0x2a2a30, [lx, 7.3, lz], [0, 0, 0], [2.1, 0.15, 2.1]);             // 난간 바닥
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; deco.add(BOX, 0x2a2a30, [lx + Math.cos(a) * 1.0, 7.65, lz + Math.sin(a) * 1.0], [0, 0, 0], [0.05, 0.6, 0.05]); }
    glow.add(CYL, 0xffffff, [lx, 7.9, lz], [0, 0, 0], [1.1, 1.0, 1.1]);              // 등불 방
    deco.add(CONE, 0xd8402a, [lx, 8.85, lz], [0, 0, 0], [1.5, 0.9, 1.5]);
    deco.add(BOX, 0x5a3a2a, [lx, 0.9, lz - 1.15], [0, 0, 0], [0.6, 1.4, 0.1]);        // 문
    addCollider(lx, lz, 1.5);
  }
  // 모래사장 장식: 파라솔·수건·모래성·야자수·조개·불가사리
  for (const [ux, ry, col] of [[-22, 0.3, 0xff5a6a], [-30, -0.2, 0x3aa8e8], [-1, 0.1, 0xffc83a], [6, -0.4, 0x8ad84a]]) {
    const uz = zEdge(ux) - 3.2;
    deco.add(CYL, 0xf4f4f4, [ux, 0.95, uz], [0, 0, 0.12], [0.07, 2.1, 0.07]);
    shiny.add(CONE, col, [ux + 0.12, 2.1, uz], [0, ry, 0], [3.0, 0.6, 3.0]);
    shiny.add(CONE, 0xffffff, [ux + 0.12, 2.32, uz], [0, ry, 0], [1.2, 0.3, 1.2]);
    deco.add(BOX, pick([0x3a8ad8, 0xff8a4a, 0xffffff, 0xd84a8a]), [ux + 1.4, -0.04, uz + 0.4], [0, ry, 0], [0.9, 0.03, 1.8]); // 수건
    if (rnd() < 0.7) shiny.add(BALL, 0xffffff, [ux - 1.2, 0.12, uz + 1.0], [0, 0, 0], [0.4, 0.4, 0.4]); // 비치볼
  }
  // 모래사장 물건: 그네 · 등대 옆 망원경 · 바위 옆 보물 상자 (E)
  {
    const sw = { id: 'swing_beach', type: 'swing', title: '그네 · 타기', x: 14, z: zEdge(14) - 5.2, y: -0.08, ry: 0 };
    const tl = { id: 'telescope', type: 'telescope', title: '망원경 · 정글섬 보기', x: 21.6, z: zEdge(21.6) - 3.4, y: -0.08, ry: 0 };
    const ch = { id: 'chest_beach', type: 'chest', title: '떠밀려 온 보물 상자 · 열기', x: -44, z: zEdge(-44) - 2.6, y: -0.08, ry: 0.4 };
    for (const t of [sw, tl, ch]) { things.push(t); addCollider(t.x, t.z, 1.2); }
    // 서핑보드 3개 (모래에 꽂혀 있어요)
    for (const [ox, col] of [[-0.6, 0xff6a5a], [0, 0x3ad8e8], [0.6, 0xffd83a]]) { shiny.add(BOX, col, [-34 + ox, 0.75, zEdge(-34) - 4.5], [0.12, 0, ox * 0.2], [0.42, 1.7, 0.08]); tinyShiny.add(BOX, 0xffffff, [-34 + ox, 0.75, zEdge(-34) - 4.46], [0.12, 0, ox * 0.2], [0.06, 1.5, 0.02]); }
    addCollider(-34, zEdge(-34) - 4.5, 1.0);
    // 소풍 돗자리 + 바구니 + 수박
    const px = 4, pz = zEdge(4) - 5.5;
    deco.add(BOX, 0xff8a9a, [px, -0.05, pz], [0, 0.2, 0], [2.0, 0.02, 1.6]);
    for (let k = 0; k < 4; k++) tiny.add(BOX, 0xffffff, [px - 0.75 + k * 0.5, -0.035, pz], [0, 0.2, 0], [0.18, 0.02, 1.6]);
    deco.add(BOX, 0xb08a4a, [px + 0.5, 0.12, pz - 0.3], [0, 0.2, 0], [0.5, 0.3, 0.35]);
    deco.add(BOX, 0x8a6a3a, [px + 0.5, 0.38, pz - 0.3], [0, 0.2, Math.PI / 2], [0.25, 0.04, 0.04]);
    shiny.add(BALL, 0x3a9a3a, [px - 0.5, 0.12, pz + 0.2], [0, 0, 0], [0.45, 0.32, 0.32]);
    shiny.add(BOX, 0xff4a5a, [px - 0.4, 0.06, pz - 0.3], [0, 0.4, 0], [0.3, 0.1, 0.08]);
  }
  { // 모래성
    const sx = -26, sz = zEdge(-26) - 1.6;
    deco.add(BOX, 0xd8c08a, [sx, 0.1, sz], [0, 0, 0], [1.4, 0.3, 1.4]);
    for (const [dx, dz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) { deco.add(CYL, 0xd8c08a, [sx + dx, 0.45, sz + dz], [0, 0, 0], [0.4, 0.7, 0.4]); deco.add(CONE, 0xc8b07a, [sx + dx, 0.95, sz + dz], [0, 0, 0], [0.45, 0.35, 0.45]); }
    deco.add(BOX, 0xd8c08a, [sx, 0.55, sz], [0, 0, 0], [0.7, 0.6, 0.7]);
    shiny.add(BOX, 0xff4a4a, [sx, 1.05, sz], [0, 0, 0], [0.02, 0.4, 0.02]);
    shiny.add(BOX, 0xff4a4a, [sx + 0.1, 1.15, sz], [0, 0, 0], [0.2, 0.12, 0.02]);
  }
  for (let x = -55; x <= 40; x += 5 + rnd() * 4) {
    const ze = zEdge(x);
    if (Math.abs(x - (SEA_PIER.x0 + SEA_PIER.x1) / 2) < 3 || Math.abs(x - 26) < 3) continue;
    const z = ze - 3.5 - rnd() * 2.5;
    if (z > 18.5 && !collides(x, z, 1)) palm(x, z, 0.85 + rnd() * 0.4);
  }
  for (let i = 0; i < 70; i++) {
    const x = -60 + rnd() * 105, z = zEdge(x) - 0.6 - rnd() * 5.5;
    if (z < 17 || inLake(x, z, 0.1) || collides(x, z, 0.3)) continue;
    if (rnd() < 0.55) shell(x, z); else starfish(x, z);
  }
  for (let i = 0; i < 14; i++) { const x = -60 + rnd() * 105, z = zEdge(x) + 0.3 + rnd() * 1.5; rock(x, z, 0.6 + rnd() * 0.9, -0.2); } // 물가 바위
  // 바다 위 우뚝 솟은 바위섬(바위 기둥)과 바위 아치
  for (const [sx, sz, h] of [[-60, 52, 5], [40, 70, 4], [-20, 115, 6], [98, 92, 5]]) {
    for (let k = 0; k < 4; k++) deco.add(BOX, pick([0x6a6a62, 0x7a766a, 0x5a5a54]), [sx + (rnd() - 0.5) * 1.2, h * (k + 0.5) / 4 - 0.5, sz + (rnd() - 0.5) * 1.2], [0, rnd() * 3, 0], [3 - k * 0.5, h / 4 + 0.2, 2.6 - k * 0.4]);
    deco.add(BOX, 0x5a8a44, [sx, h - 0.3, sz], [0, rnd(), 0], [1.6, 0.25, 1.4]); // 꼭대기 풀
    addCollider(sx, sz, 2.0);
  }
  { // 바위 아치
    const ax = 8, az = 88;
    for (const dx of [-2.6, 2.6]) for (let k = 0; k < 4; k++) deco.add(BOX, pick([0x6a6a62, 0x7a766a]), [ax + dx, k * 1.1 - 0.3, az], [0, 0, 0], [1.6, 1.15, 1.8]);
    deco.add(BOX, 0x6a665e, [ax, 4.2, az], [0, 0, 0], [7.0, 1.0, 1.8]);
    deco.add(BOX, 0x5a8a44, [ax, 4.75, az], [0, 0, 0], [5.0, 0.15, 1.4]);
    addCollider(ax - 2.6, az, 1.1); addCollider(ax + 2.6, az, 1.1);
  }

  // =====================================================
  //  2) 섬 두 개 + 큰 집 (사야 들어갈 수 있어요)
  // =====================================================
  const ISLAND_TOP = 0.25;
  // 집 안 방들이 있는 곳: 맵 북쪽 아주 멀리 (카메라는 220칸까지만 보여서 밖에서는 절대 안 보여요)
  const ROOM_X0 = -160, ROOM_GAP = 60, ROOM_Z = -420;
  const houses = [];
  const houseBlockers = []; // 카메라가 벽을 뚫지 않게

  function makeSeaIsland(x, z, r) {
    deco.add(new THREE.CylinderGeometry(1, 1.12, 1, 28), 0xe8d4a4, [x, -0.38, z], [0, 0, 0], [r * 1.12, 1.0, r * 1.12]);   // 모래
    deco.add(new THREE.CylinderGeometry(1, 1, 1, 28), 0x6f9a52, [x, ISLAND_TOP - 0.1, z], [0, 0, 0], [r * 0.9, 0.2, r * 0.9]); // 풀
    islands.push({ x, z, r: r * 1.1 });
  }
  // 큰 집: (x, z) = 집 한가운데, 앞문은 -z(본토) 쪽
  //  o.kind 에 따라 생김새가 달라요:
  //   cottage 아담한 별장(세모 지붕) · beach 해변집(평평한 옥상 테라스 + 앞 데크) · cabin 통나무집(뾰족한 지붕 + 통나무 줄)
  //   tower 탑 저택(네모 뿔 지붕 + 둥근 탑) · grand 대저택(엄청 넓고 높음 + 기둥 4개 + 2층 발코니)
  //  디자인(HOUSE_STYLES)을 바꾸면 색만 새로 칠해서 다시 지어요 (모양·가구 자리는 그대로)
  const HIP = new THREE.ConeGeometry(0.5, 1, 4); HIP.rotateY(Math.PI / 4); // 네모 뿔 지붕
  function makeHouse(o) {
    const { id, name, price, x, z, w, d, H, kind, tankW, style: defStyle } = o;
    const T = 0.26, y0 = ISLAND_TOP - 0.02;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const inside = new DecoBatch(THREE);     // 색이 안 바뀌는 집 안 물건 (한 번만 만들어요)
    const DOOR = kind === 'grand' ? 2.4 : 1.8, DH = kind === 'grand' ? 3.4 : 2.9;
    const big = w >= 10, huge = w >= 14;
    // 디자인 따라 다시 지을 덩어리들 (합치기 최적화에서 빼요 → 바꿀 때 지울 수 있게)
    const wallMesh = new THREE.Group(); wallMesh.userData.dynamic = true; scene.add(wallMesh);
    const roofGroup = new THREE.Group(); roofGroup.userData.dynamic = true; scene.add(roofGroup);
    const styledIn = new THREE.Group(); styledIn.userData.dynamic = true; scene.add(styledIn);
    houseBlockers.push(wallMesh);
    // 창문 자리: [x, z, 바깥 방향 nx, nz, 높이]
    const WINDOWS = [];
    const upper = H >= 4.4; // 벽이 높으면 위쪽에 작은 창(2층처럼)
    const winY = Math.min(1.9, H * 0.45);
    for (let t = -w / 2 + 1.5; t <= w / 2 - 1.4; t += 2.8) if (Math.abs(t) > DOOR / 2 + 1.0) WINDOWS.push([x + t, z0 - 0.02, 0, -1, winY]);
    for (let t = -d / 2 + 1.5; t <= d / 2 - 1.4; t += 2.6) { WINDOWS.push([x0 - 0.02, z + t, -1, 0, winY]); WINDOWS.push([x1 + 0.02, z + t, 1, 0, winY]); }
    for (let t = -w / 2 + 1.5; t <= w / 2 - 1.4; t += 3) WINDOWS.push([x + t, z1 + 0.02, 0, 1, H - 1.2]);
    for (const [wx, wz, nx, nz, wy] of WINDOWS) {
      glow.add(BOX, 0xffffff, [wx, y0 + wy, wz], [0, 0, 0], nx ? [T + 0.06, 1.3, 1.4] : [1.4, 1.3, T + 0.06]);
      if (upper && wy < 2.5) glow.add(BOX, 0xffffff, [wx, y0 + H - 0.85, wz], [0, 0, 0], nx ? [T + 0.06, 0.6, 0.9] : [0.9, 0.6, T + 0.06]);
      const bx = wx + nx * 0.3, bz = wz + nz * 0.3;
      if (wy < 2.5) for (let k = -0.55; k <= 0.56; k += 0.22) { const fx = nx ? bx : bx + k, fz = nx ? bz + k : bz; shiny.add(BALL, pick(FLOWER_COLORS), [fx, y0 + wy - 0.66, fz], [0, 0, 0], [0.18, 0.18, 0.18]); }
    }
    // 탑 (tower): 앞 왼쪽 모서리에 둥근 탑, 창문이 빙 둘러 빛나요
    const TR = 1.9, tX = x0, tZ = z0;
    if (kind === 'tower') for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; glow.add(BOX, 0xffffff, [tX + Math.cos(a) * (TR + 0.02), y0 + H + 1.6, tZ + Math.sin(a) * (TR + 0.02)], [0, -a, 0], [0.1, 0.9, 0.6]); }
    makeLantern(x - DOOR / 2 - 0.4, y0 + 2.3, z0 - 0.3);
    makeLantern(x + DOOR / 2 + 0.4, y0 + 2.3, z0 - 0.3);
    // 문 (안 산 집은 닫혀 있어요)
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR, DH, 0.12), new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.7 }));
    door.position.set(x, y0 + DH / 2, z0);
    door.userData.dynamic = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd8b040, metalness: 0.7, roughness: 0.3 }));
    knob.position.set(DOOR * 0.35, 0, -0.08);
    door.add(knob);
    scene.add(door);
    // ----- 집 안 = 따로 떨어진 넓은 방 (모동숲처럼 문으로 들어가면 화면이 까매졌다가 방으로 와요) -----
    //  방은 맵 북쪽 아주 먼 곳(카메라가 닿지 않는 곳)에 집마다 하나씩 있어요. 바깥 집보다 훨씬 넓어요.
    const ri = houses.length;
    const rw = Math.round(w * 1.55 * 2) / 2, rd = Math.round(d * 1.45 * 2) / 2;   // 방 크기 (바깥의 약 2.2배 넓이)
    const rx = ROOM_X0 + ri * ROOM_GAP, rz = ROOM_Z;
    const rx0 = rx - rw / 2, rx1 = rx + rw / 2, rz0 = rz - rd / 2, rz1 = rz + rd / 2;
    const RH = Math.max(3.4, H * 0.85);                                          // 방 벽 높이
    const RDOOR = 1.6;                                                           // 방 앞쪽 나가는 문 너비

    // ----- 디자인 색으로 짓기 -----
    const clear = (g) => { while (g.children.length) { const m = g.children[0]; g.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose(); } };
    function paint(S) {
      clear(wallMesh); clear(roofGroup); clear(styledIn);
      const walls = new DecoBatch(THREE), roofB = new DecoBatch(THREE, { roughness: 0.7 }), soft = new DecoBatch(THREE);
      const { wall, trim, roof } = S;
      // 돌 기초
      walls.add(BOX, 0x8a8478, [x, y0 - 0.15, z], [0, 0, 0], [w + 0.6, 0.4, d + 0.6]);
      // 벽: 뒤·옆은 통째로, 앞은 문 자리를 비워요
      walls.add(BOX, wall, [x, y0 + H / 2, z1], [0, 0, 0], [w, H, T]);
      walls.add(BOX, wall, [x0, y0 + H / 2, z], [0, 0, 0], [T, H, d]);
      walls.add(BOX, wall, [x1, y0 + H / 2, z], [0, 0, 0], [T, H, d]);
      const side = (w - DOOR) / 2;
      walls.add(BOX, wall, [x0 + side / 2, y0 + H / 2, z0], [0, 0, 0], [side, H, T]);
      walls.add(BOX, wall, [x1 - side / 2, y0 + H / 2, z0], [0, 0, 0], [side, H, T]);
      walls.add(BOX, wall, [x, y0 + DH + (H - DH) / 2, z0], [0, 0, 0], [DOOR, H - DH, T]); // 문 위
      // 통나무집: 벽 바깥에 가로 통나무 줄
      if (kind === 'cabin') for (let ly = 0.45; ly < H - 0.2; ly += 0.42) {
        walls.add(CYL, trim, [x, y0 + ly, z1 + 0.15], [0, 0, Math.PI / 2], [0.16, w + 0.5, 0.16]);
        walls.add(CYL, trim, [x0 - 0.15, y0 + ly, z], [Math.PI / 2, 0, 0], [0.16, d + 0.5, 0.16]);
        walls.add(CYL, trim, [x1 + 0.15, y0 + ly, z], [Math.PI / 2, 0, 0], [0.16, d + 0.5, 0.16]);
        if (ly < DH) { walls.add(CYL, trim, [x0 + side / 2, y0 + ly, z0 - 0.15], [0, 0, Math.PI / 2], [0.16, side + 0.25, 0.16]); walls.add(CYL, trim, [x1 - side / 2, y0 + ly, z0 - 0.15], [0, 0, Math.PI / 2], [0.16, side + 0.25, 0.16]); }
        else walls.add(CYL, trim, [x, y0 + ly, z0 - 0.15], [0, 0, Math.PI / 2], [0.16, w + 0.5, 0.16]);
      }
      // 모서리 기둥·띠
      for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) walls.add(BOX, trim, [cx, y0 + H / 2, cz], [0, 0, 0], [0.4, H + 0.05, 0.4]);
      for (const hy of [0.25, H - 0.1]) {
        walls.add(BOX, trim, [x, y0 + hy, z0 - 0.02], [0, 0, 0], [w + 0.1, 0.2, T + 0.08]);
        walls.add(BOX, trim, [x, y0 + hy, z1 + 0.02], [0, 0, 0], [w + 0.1, 0.2, T + 0.08]);
        walls.add(BOX, trim, [x0 - 0.02, y0 + hy, z], [0, 0, 0], [T + 0.08, 0.2, d + 0.1]);
        walls.add(BOX, trim, [x1 + 0.02, y0 + hy, z], [0, 0, 0], [T + 0.08, 0.2, d + 0.1]);
      }
      walls.add(BOX, trim, [x, y0 + DH + 0.1, z0 - 0.05], [0, 0, 0], [DOOR + 0.4, 0.2, T + 0.1]); // 문틀
      for (const s of [-1, 1]) walls.add(BOX, trim, [x + s * (DOOR / 2 + 0.1), y0 + DH / 2, z0 - 0.05], [0, 0, 0], [0.2, DH, T + 0.1]);
      // 창문 틀 + 화분
      for (const [wx, wz, nx, nz, wy] of WINDOWS) {
        const fr = nx ? [T + 0.12, 0.12, 1.6] : [1.6, 0.12, T + 0.12];
        walls.add(BOX, trim, [wx, y0 + wy + 0.7, wz], [0, 0, 0], fr);
        walls.add(BOX, trim, [wx, y0 + wy - 0.7, wz], [0, 0, 0], fr);
        walls.add(BOX, trim, [wx, y0 + wy, wz], [0, 0, 0], nx ? [T + 0.1, 1.3, 0.08] : [0.08, 1.3, T + 0.1]); // 십자 창살
        if (upper && wy < 2.5) walls.add(BOX, trim, [wx, y0 + H - 0.85 + 0.36, wz], [0, 0, 0], nx ? [T + 0.1, 0.1, 1.1] : [1.1, 0.1, T + 0.1]);
        if (wy < 2.5) walls.add(BOX, S.box, [wx + nx * 0.3, y0 + wy - 0.88, wz + nz * 0.3], [0, 0, 0], nx ? [0.35, 0.28, 1.4] : [1.4, 0.28, 0.35]);
      }
      // 현관 / 데크
      walls.add(BOX, 0x8a8478, [x, y0 - 0.05, z0 - 1.2], [0, 0, 0], [DOOR + 2.4, 0.2, 2.0]);
      walls.add(BOX, 0x9a948a, [x, y0 - 0.2, z0 - 2.45], [0, 0, 0], [DOOR + 1.2, 0.2, 0.6]);
      if (kind === 'beach') {
        // 앞 나무 데크 + 난간 (가운데는 계단 자리)
        walls.add(BOX, 0xc8a070, [x, y0 + 0.02, z0 - 1.6], [0, 0, 0], [w + 1.0, 0.12, 3.0]);
        for (const s of [-1, 1]) {
          for (let k = 0; k <= 4; k++) walls.add(BOX, trim, [x + s * (DOOR / 2 + 0.9 + k * (w / 2 - DOOR / 2 - 0.4) / 4), y0 + 0.5, z0 - 3.05], [0, 0, 0], [0.1, 0.9, 0.1]);
          walls.add(BOX, trim, [x + s * (w / 4 + DOOR / 4 + 0.45), y0 + 0.95, z0 - 3.05], [0, 0, 0], [w / 2 - DOOR / 2 - 0.4, 0.08, 0.1]);
          walls.add(BOX, trim, [x + s * (w / 2 + 0.45), y0 + 0.95, z0 - 1.6], [0, 0, 0], [0.1, 0.08, 3.0]);
        }
        // 데크 위 해먹 의자 2개
        for (const s of [-1, 1]) { walls.add(BOX, S.sofa, [x + s * (w / 2 - 1.2), y0 + 0.35, z0 - 1.8], [0, 0, 0], [0.8, 0.12, 1.4]); walls.add(BOX, S.sofa, [x + s * (w / 2 - 1.2), y0 + 0.6, z0 - 1.15], [0.5, 0, 0], [0.8, 0.12, 0.7]); }
      } else {
        const cols = kind === 'grand' ? [-1.5, -0.5, 0.5, 1.5].map((k) => k * (DOOR / 2 + 1.0)) : [-(DOOR / 2 + 0.9), DOOR / 2 + 0.9];
        for (const cx of cols) walls.add(CYL, S.column, [x + cx, y0 + (kind === 'grand' ? 2.1 : 1.5), z0 - 1.9], [0, 0, 0], [0.34, kind === 'grand' ? 4.2 : 3.0, 0.34]);
      }
      // 탑 몸통 + 창틀 띠
      if (kind === 'tower') {
        walls.add(new THREE.CylinderGeometry(1, 1, 1, 16), wall, [tX, y0 + (H + 2.6) / 2, tZ], [0, 0, 0], [TR, H + 2.6, TR]);
        for (const hy of [H, H + 2.5]) walls.add(new THREE.CylinderGeometry(1, 1, 1, 16), trim, [tX, y0 + hy, tZ], [0, 0, 0], [TR + 0.12, 0.2, TR + 0.12]);
      }
      // ----- 지붕 (안에 들어가면 숨겨요) -----
      const rH = kind === 'cabin' ? 5.4 : kind === 'grand' ? 4.0 : 3.0;
      if (kind === 'beach') {
        // 평평한 옥상 + 난간 + 파라솔·선베드 (옥상 테라스)
        roofB.add(BOX, roof, [x, y0 + H + 0.17, z], [0, 0, 0], [w + 0.8, 0.35, d + 0.8]);
        for (const [ax, az, lw, ld] of [[x, z0 - 0.35, w + 0.8, 0.1], [x, z1 + 0.35, w + 0.8, 0.1], [x0 - 0.35, z, 0.1, d + 0.8], [x1 + 0.35, z, 0.1, d + 0.8]]) {
          roofB.add(BOX, trim, [ax, y0 + H + 0.85, az], [0, 0, 0], [lw, 0.08, ld]);
          const n = Math.round(Math.max(lw, ld) / 1.0);
          for (let k = 0; k <= n; k++) { const t = k / n - 0.5; roofB.add(BOX, trim, [ax + (lw > 1 ? t * lw : 0), y0 + H + 0.6, az + (ld > 1 ? t * ld : 0)], [0, 0, 0], [0.08, 0.5, 0.08]); }
        }
        roofB.add(CYL, 0xf4f4f4, [x + 1.5, y0 + H + 1.3, z + 0.5], [0, 0, 0], [0.07, 2.2, 0.07]);
        roofB.add(CONE, roof === 0xff7a5a ? 0x3aa8e8 : 0xff7a5a, [x + 1.5, y0 + H + 2.4, z + 0.5], [0, 0, 0], [2.6, 0.5, 2.6]);
        for (const s of [-1, 1]) roofB.add(BOX, 0xffffff, [x - 1.5 + s * 0.9, y0 + H + 0.45, z + 0.5], [0, 0, 0], [0.7, 0.1, 1.8]);
      } else if (kind === 'tower') {
        roofB.add(HIP, roof, [x, y0 + H + rH / 2, z], [0, 0, 0], [(w + 1.0) * 1.414, rH, (d + 1.0) * 1.414]);
        roofB.add(new THREE.ConeGeometry(1, 1, 16), roof, [tX, y0 + H + 2.6 + 1.6, tZ], [0, 0, 0], [TR + 0.4, 3.2, TR + 0.4]);
        roofB.add(BOX, 0xd8b040, [tX, y0 + H + 2.6 + 3.5, tZ], [0, 0, 0], [0.06, 0.8, 0.06]);
        roofB.add(BOX, 0xd83a3a, [tX + 0.25, y0 + H + 2.6 + 3.7, tZ], [0, 0, 0], [0.45, 0.3, 0.03]); // 깃발
      } else {
        // 세모 지붕 (통나무집은 뾰족하게, 대저택은 크게)
        roofB.add(PRISM, roof, [x, y0 + H + rH * 0.383, z], [0, 0, Math.PI / 2], [rH, w + 1.0, d * 0.86 + 0.4]);
        roofB.add(BOX, trim, [x, y0 + H + 0.42, z], [0, 0, 0], [w + 1.0, 0.12, d * 0.74 + 0.5]);
        if (kind === 'grand') for (const s of [-1, 1]) roofB.add(PRISM, roof, [x + s * w * 0.28, y0 + H + 0.9, z0 - 0.2], [Math.PI / 2, 0, 0], [1.6, 1.2, 1.4]); // 지붕 창(도머)
      }
      if (kind !== 'beach') {
        roofB.add(BOX, S.chimney, [x1 - 1.2, y0 + H + rH * 0.6, z + d * 0.18], [0, 0, 0], [0.7, rH * 0.7, 0.7]);
        roofB.add(BOX, trim, [x1 - 1.2, y0 + H + rH * 0.95, z + d * 0.18], [0, 0, 0], [0.85, 0.15, 0.85]);
      }
      // 현관 지붕 / 대저택 2층 발코니
      if (kind === 'grand') {
        roofB.add(BOX, roof, [x, y0 + 4.3, z0 - 1.6], [0, 0, 0], [DOOR * 2 + 4.4, 0.2, 3.0]);
        for (let k = 0; k <= 10; k++) roofB.add(BOX, S.column, [x - (DOOR + 2.2) + k * (DOOR * 2 + 4.4) / 10, y0 + 4.75, z0 - 3.05], [0, 0, 0], [0.1, 0.7, 0.1]);
        roofB.add(BOX, S.column, [x, y0 + 5.1, z0 - 3.05], [0, 0, 0], [DOOR * 2 + 4.4, 0.1, 0.12]);
      } else if (kind !== 'beach') roofB.add(BOX, roof, [x, y0 + 3.1, z0 - 1.2], [-0.25, 0, 0], [DOOR + 2.8, 0.15, 2.4]);
      else roofB.add(BOX, roof, [x, y0 + 2.9, z0 - 1.4], [-0.12, 0, 0], [w + 1.0, 0.12, 2.8]); // 데크 차양
      // 방(집 안): 디자인 색으로 벽지 · 아래 나무 판벽 · 걸레받이 · 천장 띠 · 러그
      const paper = new THREE.Color(wall).lerp(new THREE.Color(0xffffff), 0.45).getHex();
      const paper2 = new THREE.Color(wall).lerp(new THREE.Color(0xffffff), 0.25).getHex();
      const RW = (ax, az, lw, ld) => { // 방 벽 한 면 (lw/ld 중 하나가 두께)
        soft.add(BOX, paper, [ax, y0 + RH / 2, az], [0, 0, 0], [lw, RH, ld]);
        const nx = lw < ld, ins = 0.02;
        soft.add(BOX, trim, [ax + (nx ? (ax < rx ? ins : -ins) : 0), y0 + 0.55, az + (nx ? 0 : (az < rz ? ins : -ins))], [0, 0, 0], [nx ? T + 0.06 : lw - 0.1, 1.1, nx ? ld - 0.1 : T + 0.06]); // 판벽
        soft.add(BOX, S.chimney, [ax + (nx ? (ax < rx ? 0.05 : -0.05) : 0), y0 + 0.13, az + (nx ? 0 : (az < rz ? 0.05 : -0.05))], [0, 0, 0], [nx ? T + 0.12 : lw - 0.1, 0.16, nx ? ld - 0.1 : T + 0.12]); // 걸레받이
        soft.add(BOX, trim, [ax + (nx ? (ax < rx ? 0.05 : -0.05) : 0), y0 + RH - 0.08, az + (nx ? 0 : (az < rz ? 0.05 : -0.05))], [0, 0, 0], [nx ? T + 0.14 : lw, 0.16, nx ? ld : T + 0.14]); // 천장 띠
        soft.add(BOX, trim, [ax + (nx ? (ax < rx ? 0.04 : -0.04) : 0), y0 + 1.13, az + (nx ? 0 : (az < rz ? 0.04 : -0.04))], [0, 0, 0], [nx ? T + 0.1 : lw - 0.1, 0.06, nx ? ld - 0.1 : T + 0.1]); // 판벽 위 몰딩
      };
      RW(rx, rz1, rw + T, T);           // 뒷벽
      RW(rx0, rz, T, rd + T);           // 왼쪽 벽
      RW(rx1, rz, T, rd + T);           // 오른쪽 벽
      // 벽지 세로 줄무늬 (뒷벽 · 옆벽)
      for (let k = -rw / 2 + 0.5; k < rw / 2; k += 0.5) soft.add(BOX, paper2, [rx + k, y0 + 2.2 + (RH - 3.4) / 2, rz1 - T / 2 - 0.012], [0, 0, 0], [0.12, RH - 1.35, 0.01]);
      for (const sxw of [-1, 1]) for (let k = -rd / 2 + 0.5; k < rd / 2; k += 0.5) soft.add(BOX, paper2, [rx + sxw * (rw / 2 - T / 2 - 0.012), y0 + 2.2 + (RH - 3.4) / 2, rz + k], [0, 0, 0], [0.01, RH - 1.35, 0.12]);
      // 앞쪽은 낮은 턱만 (카메라가 앞에서 방을 들여다봐요), 가운데는 나가는 문
      const fside = (rw - RDOOR) / 2;
      for (const sgn of [-1, 1]) {
        soft.add(BOX, trim, [rx + sgn * (RDOOR / 2 + fside / 2), y0 + 0.3, rz0], [0, 0, 0], [fside + T, 0.6, T]);
        soft.add(BOX, S.chimney, [rx + sgn * (RDOOR / 2 + fside / 2), y0 + 0.63, rz0], [0, 0, 0], [fside + T + 0.04, 0.08, T + 0.06]);
      }
      // 러그 (방 가운데)
      soft.add(BOX, S.rug, [rx, y0 + 0.105, rz - rd * 0.08], [0, 0, 0], [rw * 0.36, 0.02, rd * 0.3]);
      soft.add(BOX, S.rug2, [rx, y0 + 0.118, rz - rd * 0.08], [0, 0, 0], [rw * 0.3, 0.02, rd * 0.24]);
      soft.add(BOX, S.rug, [rx, y0 + 0.13, rz - rd * 0.08], [0, 0, 0], [rw * 0.2, 0.02, rd * 0.14]);
      // 문 앞 매트 (밟으면 밖으로 나가요)
      soft.add(BOX, S.door, [rx, y0 + 0.11, rz0 + 0.55], [0, 0, 0], [RDOOR, 0.03, 0.8]);
      soft.add(BOX, S.rug2, [rx, y0 + 0.125, rz0 + 0.55], [0, 0, 0], [RDOOR - 0.3, 0.02, 0.55]);
      walls.build(wallMesh);
      roofB.build(roofGroup);
      soft.build(styledIn);
      door.material.color.set(S.door);
    }

    // ----- 방 안 (색이 안 바뀌는 것): 마루 · 창문 · 천장 조명 · 어항 -----
    // 방 둘레는 까맣게 (방 밖의 하늘·바다가 안 보이게) — 그림자는 안 만들어요
    const voidBox = new THREE.Mesh(new THREE.BoxGeometry(rw + 60, 40, rd + 60), new THREE.MeshBasicMaterial({ color: 0x07060c, side: THREE.BackSide, fog: false }));
    voidBox.position.set(rx, y0 + 6, rz - 6);
    voidBox.userData.dynamic = true;
    scene.add(voidBox);
    inside.add(BOX, 0x6a5a4a, [rx, y0 - 0.1, rz], [0, 0, 0], [rw + 1.2, 0.3, rd + 1.2]);                   // 바닥 받침
    inside.add(BOX, 0xb88a5a, [rx, y0 + 0.06, rz], [0, 0, 0], [rw - 0.05, 0.06, rd - 0.05]);               // 마루
    for (let k = -rw / 2 + 0.6; k < rw / 2; k += 0.6) inside.add(BOX, 0xa87a4a, [rx + k, y0 + 0.095, rz], [0, 0, 0], [0.03, 0.01, rd - 0.3]); // 마루 줄
    for (let k = -rd / 2 + 1.2; k < rd / 2; k += 2.4) for (let m = -rw / 2 + 0.3 + ((k * 7) % 1.2 + 1.2) % 1.2; m < rw / 2 - 0.3; m += 2.4) inside.add(BOX, 0xa87a4a, [rx + m, y0 + 0.095, rz + k], [0, 0, 0], [0.57, 0.01, 0.03]); // 마루 이음매
    // 뒷벽 창문 (밖이 노을빛으로 보여요) + 커튼
    const RWIN = [];
    for (let t = -rw / 2 + 2.2; t <= rw / 2 - 2.0; t += 4.2) RWIN.push(t);
    for (const t of RWIN) {
      glow.add(BOX, 0xffd8a8, [rx + t, y0 + 2.0, rz1 - T / 2 - 0.02], [0, 0, 0], [1.3, 1.2, 0.02]);
      inside.add(BOX, 0xf4f0e8, [rx + t, y0 + 2.0, rz1 - T / 2 - 0.04], [0, 0, 0], [0.06, 1.2, 0.02]);
      inside.add(BOX, 0xf4f0e8, [rx + t, y0 + 2.0, rz1 - T / 2 - 0.04], [0, 0, 0], [1.3, 0.06, 0.02]);
      for (const sg of [-1, 1]) inside.add(BOX, 0xf4f0e8, [rx + t + sg * 0.68, y0 + 2.0, rz1 - T / 2 - 0.05], [0, 0, 0], [0.08, 1.36, 0.06]);
      for (const sg of [-1, 1]) inside.add(BOX, 0xf4f0e8, [rx + t, y0 + 2.0 + sg * 0.64, rz1 - T / 2 - 0.05], [0, 0, 0], [1.44, 0.08, 0.06]);
      inside.add(BOX, 0xd8c8a8, [rx + t, y0 + 1.36, rz1 - T / 2 - 0.12], [0, 0, 0], [1.5, 0.06, 0.2]);       // 창턱
      for (const sg of [-1, 1]) inside.add(BOX, 0xe8a0a0, [rx + t + sg * 0.88, y0 + 1.95, rz1 - T / 2 - 0.1], [0, 0, 0], [0.32, 1.6, 0.06]); // 커튼
      inside.add(BOX, 0x8a6a4a, [rx + t, y0 + 2.8, rz1 - T / 2 - 0.12], [0, 0, 0], [2.3, 0.05, 0.05]);         // 커튼봉
      shiny.add(CYL, 0xc86a4a, [rx + t + 0.45, y0 + 1.47, rz1 - T / 2 - 0.13], [0, 0, 0], [0.13, 0.16, 0.13]); // 창턱 화분
      shiny.add(BALL, pick(FLOWER_COLORS), [rx + t + 0.45, y0 + 1.62, rz1 - T / 2 - 0.13], [0, 0, 0], [0.16, 0.16, 0.16]);
    }
    // 옆벽 작은 창
    for (const sg of [-1, 1]) for (let t = -rd / 2 + 2.4; t <= rd / 2 - 2.4; t += 4.6) {
      const wx = rx + sg * (rw / 2 - T / 2 - 0.02);
      glow.add(BOX, 0xffd8a8, [wx, y0 + 2.0, rz + t], [0, 0, 0], [0.02, 1.0, 1.0]);
      for (const k of [-1, 1]) inside.add(BOX, 0xf4f0e8, [wx - sg * 0.03, y0 + 2.0 + k * 0.53, rz + t], [0, 0, 0], [0.06, 0.07, 1.12]);
      for (const k of [-1, 1]) inside.add(BOX, 0xf4f0e8, [wx - sg * 0.03, y0 + 2.0, rz + t + k * 0.53], [0, 0, 0], [0.06, 1.12, 0.07]);
      inside.add(BOX, 0xf4f0e8, [wx - sg * 0.03, y0 + 2.0, rz + t], [0, 0, 0], [0.04, 1.0, 0.05]);
    }
    // 방 불빛: 따뜻한 등 두 개 (방 안에 있을 때만 켜요 — main.js updateHouses)
    const roomLights = [];
    for (const lx of rw > 16 ? [-rw / 4, rw / 4] : [0]) {
      const L = new THREE.PointLight(0xffe2b8, 0, Math.max(rw, rd) * 1.3, 1.2);
      L.position.set(rx + lx, y0 + RH + 0.6, rz - 0.5);
      scene.add(L); roomLights.push(L);
    }
    // 벽난로 불 (벽난로 가구를 놓은 자리로 옮겨 가요 — life.js)
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xffb04a, emissive: 0xff7a1a, emissiveIntensity: 1.6, roughness: 0.6 });
    const fire = new THREE.Group(); fire.userData.dynamic = true; fire.visible = false;
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), fireMat); f.position.set(-0.2 + k * 0.2, 0.32, -0.05); fire.add(f); }
    scene.add(fire);
    const fireLight = new THREE.PointLight(0xff8a3a, 0, 6, 2);
    fireLight.position.set(0, 0.6, -0.6); fire.add(fireLight);
    // ----- 어항: 뒷벽에 커다랗게 (방 안) -----
    const tw = tankW, th = 1.7, td = 1.2;
    const tx = rx - 0.5, tz = rz1 - 0.95, ty = y0 + 0.95; // 어항 바닥 높이
    inside.add(BOX, 0x5a3a24, [tx, y0 + 0.47, tz], [0, 0, 0], [tw + 0.3, 0.9, td + 0.2]);   // 받침장
    inside.add(BOX, 0xd8b040, [tx, y0 + 0.92, tz - td / 2 - 0.13], [0, 0, 0], [tw + 0.3, 0.06, 0.04]);
    for (let k = 0; k < Math.max(2, Math.round(tw / 1.4)); k++) { const n = Math.max(2, Math.round(tw / 1.4)), dx2 = tx - tw / 2 + (k + 0.5) * tw / n; inside.add(BOX, 0x6a4a30, [dx2, y0 + 0.47, tz - td / 2 - 0.11], [0, 0, 0], [tw / n - 0.12, 0.7, 0.02]); shiny.add(BOX, 0xd8b040, [dx2, y0 + 0.5, tz - td / 2 - 0.13], [0, 0, 0], [0.12, 0.04, 0.03]); } // 받침장 문 + 손잡이
    inside.add(BOX, 0xe8d4a4, [tx, ty + 0.08, tz], [0, 0, 0], [tw - 0.04, 0.16, td - 0.04]);               // 모래 바닥
    for (let k = 0; k < Math.round(tw * 2); k++) { // 수초
      const kx = tx - tw / 2 + 0.2 + rnd() * (tw - 0.4), kz = tz - td / 2 + 0.2 + rnd() * (td - 0.3), kh = 0.4 + rnd() * 0.8;
      shiny.add(BOX, pick([0x3aa85a, 0x4ac86a, 0x2a8a4a]), [kx, ty + 0.16 + kh / 2, kz], [0, rnd() * 3, (rnd() - 0.5) * 0.3], [0.06, kh, 0.14]);
    }
    for (let k = 0; k < Math.round(tw); k++) { const sc = 0.25 + rnd() * 0.25; shiny.add(ROCK, pick([0xb0a898, 0x8a8478, 0xff9a8a]), [tx - tw / 2 + 0.3 + rnd() * (tw - 0.6), ty + 0.2, tz - td / 2 + 0.3 + rnd() * (td - 0.5)], [rnd(), rnd(), rnd()], [sc, sc * 0.7, sc]); }
    shiny.add(CONE, 0xff7ab0, [tx + tw / 2 - 0.5, ty + 0.4, tz], [0, 0, 0], [0.3, 0.5, 0.3]); // 분홍 산호
    const waterBox = new THREE.Mesh(new THREE.BoxGeometry(tw - 0.06, th - 0.18, td - 0.06),
      new THREE.MeshStandardMaterial({ color: 0x5ac8e8, transparent: true, opacity: 0.22, roughness: 0.1, emissive: 0x1a6a8a, emissiveIntensity: 0.25, depthWrite: false }));
    waterBox.position.set(tx, ty + (th - 0.18) / 2 + 0.02, tz);
    waterBox.renderOrder = 4;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td),
      new THREE.MeshStandardMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, depthWrite: false }));
    glass.position.set(tx, ty + th / 2, tz);
    glass.renderOrder = 5;
    scene.add(waterBox, glass);
    inside.add(BOX, 0x2a2a30, [tx, ty + th + 0.05, tz], [0, 0, 0], [tw + 0.1, 0.1, td + 0.1]);      // 뚜껑
    glow.add(BOX, 0xffffff, [tx, ty + th - 0.04, tz], [0, 0, 0], [tw - 0.3, 0.04, 0.2]);            // 어항 조명
    inside.build(scene);

    // 벽 충돌: 작은 동그라미를 벽 따라 줄줄이
    const line = (ax, az, bx2, bz2, out) => {
      const L = Math.hypot(bx2 - ax, bz2 - az), n = Math.ceil(L / 0.45);
      for (let i = 0; i <= n; i++) { const c = { x: ax + (bx2 - ax) * i / n, z: az + (bz2 - az) * i / n, r: 0.32 }; colliders.push(c); if (out) out.push(c); }
    };
    // 바깥 집: 벽 + 문 (문은 늘 닫혀 있어요. 내 집이면 문에 다가가면 방으로 들어가요)
    line(x0, z1, x1, z1); line(x0, z0, x0, z1); line(x1, z0, x1, z1);
    line(x0, z0, x - DOOR / 2 - 0.05, z0); line(x + DOOR / 2 + 0.05, z0, x1, z0);
    const doorCol = [];
    line(x - DOOR / 2, z0, x + DOOR / 2, z0, doorCol);
    if (kind === 'tower') addCollider(tX, tZ, TR + 0.1);
    // 방: 벽 + 앞 턱 (가운데 문 자리는 비워서 매트까지 걸어갈 수 있어요) + 어항 앞
    line(rx0, rz1, rx1, rz1); line(rx0, rz0, rx0, rz1); line(rx1, rz0, rx1, rz1);
    line(rx0, rz0, rx - RDOOR / 2 - 0.1, rz0); line(rx + RDOOR / 2 + 0.1, rz0, rx1, rz0);
    line(rx - RDOOR / 2, rz0 - 0.35, rx + RDOOR / 2, rz0 - 0.35);
    line(tx - tw / 2, tz - td / 2 + 0.1, tx + tw / 2, tz - td / 2 + 0.1);

    const h = {
      id, name, price, door, doorCol, roofGroup, open: false, kind, w, d,
      // x·z·x0…z1 = 방(집 안) 기준. 가구 자리(save.decor)는 방 한가운데에서 얼마나 떨어졌는지로 저장해요
      x: rx, z: rz, x0: rx0, x1: rx1, z0: rz0, z1: rz1, rw, rd, floorY: y0 + 0.09,
      // 바깥 집 (섬 위)
      ext: { x, z, x0, x1, z0, z1, doorX: x, doorZ: z0 },
      defaultStyle: defStyle, style: -1, fire, fireLight, fireOn: true, roomLights,
      // 디자인 바꾸기 (같은 디자인이면 그대로)
      setStyle(i) { const k = HOUSE_STYLES[i] ? i : defStyle; if (k === this.style) return; this.style = k; paint(HOUSE_STYLES[k]); },
      tank: { x: tx, y: ty + 0.2, z: tz, w: tw - 0.5, h: th - 0.6, d: td - 0.45 }, fish: [],
      inside: (qx, qz) => qx > rx0 && qx < rx1 && qz > rz0 - 0.6 && qz < rz1,
      // 방 안 매트 = 나가는 곳 · 방에 들어오면 서는 곳
      exitAt: { x: rx, z: rz0 + 0.35 }, enterAt: { x: rx, z: rz0 + 1.7 },
      bigKinds: { dining: big, piano: kind === 'tower' || kind === 'grand', bed2: huge }
    };
    h.setStyle(defStyle);
    houses.push(h);
    // 문 앞 (사기 / 들어가기 / 디자인) · 어항 앞 (물고기 넣고 빼기)
    shops.push({ kind: 'house', house: h, title: `${name} · ${'$' + price.toLocaleString('en-US')}`, group: wallMesh, pos: new THREE.Vector3(x, y0, z0 - 1.6), promptAt: new THREE.Vector3(x, y0 + 3.6, z0 - 1.2) });
    // 방 안 문 옆: 집 관리 (가구 배치 · 디자인)
    shops.push({ kind: 'house', house: h, roomEntry: true, title: '집 관리 · 가구 배치 · 디자인 (E)', group: wallMesh, pos: new THREE.Vector3(rx + RDOOR / 2 + 1.0, y0, rz0 + 1.0), promptAt: new THREE.Vector3(rx + RDOOR / 2 + 1.0, y0 + 2.2, rz0 + 0.8), r: 1.1 });
    shops.push({ kind: 'tank', house: h, title: '어항 · 물고기 전시하기', group: wallMesh, pos: new THREE.Vector3(tx, y0, tz - td / 2 - 1.0), promptAt: new THREE.Vector3(tx, ty + th + 0.6, tz - td / 2) });
    // 정원: 하얀 울타리 + 꽃밭 + 우체통 + 돌길
    const front = kind === 'beach' ? 4.4 : 3.4;
    const gx0 = x0 - 2.2, gx1 = x1 + 2.2, gz0 = z0 - front, gz1 = z1 + 1.8;
    fence(gx0, gz0, x - 1.4, gz0, y0); fence(x + 1.4, gz0, gx1, gz0, y0);
    fence(gx0, gz0, gx0, gz1, y0); fence(gx1, gz0, gx1, gz1, y0); fence(gx0, gz1, gx1, gz1, y0);
    for (const s of [-1, 1]) for (let k = 0; k < Math.floor(w / 3); k++) flowerPatch(x + s * (w / 2 - 0.4 - k * 1.3), gz0 + 1.0, 5, y0);
    deco.add(BOX, 0x5a4232, [x + 2.0, y0 + 0.6, gz0 - 0.3], [0, 0, 0], [0.1, 1.2, 0.1]);       // 우체통
    shiny.add(BOX, 0xd83a3a, [x + 2.0, y0 + 1.25, gz0 - 0.3], [0, 0, 0], [0.32, 0.3, 0.5]);
    for (let k = 0; k < 6; k++) deco.add(CYL, 0xb8b0a0, [x + (rnd() - 0.5) * 0.4, y0 + 0.02, gz0 - 1 - k * 1.1], [0, 0, 0], [0.9, 0.06, 0.8]); // 돌길
    return h;
  }

  // =====================================================
  //  E 로 쓸 수 있는 물건 모양 (seaworld 안에서만 써요)
  //   gong 징 · chest 보물 상자 · hammock 해먹 · swing 그네 · telescope 망원경
  //   t.ry = 물건이 바라보는 쪽 (앞 = 플레이어가 서는 쪽)
  // =====================================================
  function makeThingModel(t) {
    const y = t.y ?? -0.08, ry = t.ry ?? 0;
    const c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [t.x + lx * c + lz * s, t.z - lx * s + lz * c]; // 물건 기준 → 세상 좌표
    const P = (geo, col, lx, ly, lz, rot = [0, 0, 0], sc = [1, 1, 1], batch = deco) => { const [wx, wz] = at(lx, lz); batch.add(geo, col, [wx, y + ly, wz], [rot[0], rot[1] + ry, rot[2]], sc); };
    if (t.type === 'gong') {
      for (const sx of [-0.9, 0.9]) P(BOX, 0x5a3a22, sx, 1.1, 0, [0, 0, 0], [0.16, 2.2, 0.16]);
      P(BOX, 0x7a4a24, 0, 2.2, 0, [0, 0, 0], [2.2, 0.18, 0.22]);
      for (const sx of [-1.1, 1.1]) P(BOX, 0xd8402a, sx, 2.2, 0, [0, 0, 0], [0.18, 0.3, 0.3]);       // 붉은 끝장식
      for (const sx of [-0.35, 0.35]) P(BOX, 0x2a2a2a, sx, 1.95, 0, [0, 0, 0], [0.02, 0.5, 0.02]); // 줄
      P(CYL, 0xc8962a, 0, 1.25, 0, [Math.PI / 2, 0, 0], [1.1, 0.06, 1.1], shiny);                     // 징 (청동)
      P(CYL, 0xe8b84a, 0, 1.25, -0.04, [Math.PI / 2, 0, 0], [0.4, 0.04, 0.4], shiny);
      P(BOX, 0x8a6a42, 0.7, 0.5, -0.4, [0, 0, 0.6], [0.06, 0.8, 0.06]);                              // 채
      P(BALL, 0xf4f0e0, 0.92, 0.82, -0.4, [0, 0, 0], [0.2, 0.2, 0.2]);
      addCollider(t.x, t.z, 0.6);
    } else if (t.type === 'chest') {
      P(BOX, 0x7a4a24, 0, 0.3, 0, [0, 0, 0], [1.0, 0.6, 0.65]);
      P(BOX, 0x8a5a2a, 0, 0.7, 0.04, [-0.15, 0, 0], [1.02, 0.22, 0.66]);                             // 뚜껑
      for (const sx of [-0.38, 0.38]) P(BOX, 0xd8b040, sx, 0.45, 0, [0, 0, 0], [0.08, 0.92, 0.68], shiny); // 금띠
      P(BOX, 0xd8b040, 0, 0.5, -0.34, [0, 0, 0], [0.16, 0.2, 0.04], shiny);                          // 자물쇠
      P(BOX, 0xffe066, 0.1, 0.84, -0.1, [0, 0.4, 0], [0.12, 0.03, 0.12], tinyShiny);                  // 삐져나온 금화
      addCollider(t.x, t.z, 0.6);
    } else if (t.type === 'hammock') {
      for (const lx of [-1.6, 1.6]) { P(CYL, 0x6a4a2a, lx, 0.8, 0, [0, 0, 0], [0.22, 1.7, 0.22]); P(BOX, 0x5a3a22, lx, 1.62, 0, [0, 0, 0], [0.3, 0.06, 0.3]); }
      const cols = [0xff6a5a, 0xffffff, 0x3aa8e8, 0xffffff, 0xffc83a, 0xffffff];
      for (let k = 0; k < 9; k++) { const lx = -1.2 + k * 0.3, sag = 0.55 - Math.cos((k / 8 - 0.5) * Math.PI) * 0.35; P(BOX, cols[k % cols.length], lx, sag + 0.3, 0, [0, 0, 0], [0.3, 0.05, 0.8]); }
      for (const sx of [-1, 1]) P(BOX, 0xe8d8b8, sx * 1.42, 1.15, 0, [0, 0, sx * 0.5], [0.4, 0.03, 0.03]);
      for (const lx of [-1.6, 1.6]) addCollider(...at(lx, 0), 0.25);
    } else if (t.type === 'swing') {
      for (const lx of [-1.0, 1.0]) for (const lz of [-0.5, 0.5]) P(BOX, 0x7a5232, lx, 1.2, lz * 0.6, [lz > 0 ? 0.35 : -0.35, 0, 0], [0.14, 2.5, 0.14]);
      P(CYL, 0x5a3a22, 0, 2.4, 0, [0, 0, Math.PI / 2], [0.16, 2.3, 0.16]);
      // 흔들리는 의자 (줄 + 판): 따로 만들어서 움직여요
      const g = new THREE.Group();
      const [wx, wz] = at(0, 0);
      g.position.set(wx, y + 2.4, wz); g.rotation.y = ry; g.userData.dynamic = true;
      const ropeM = new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.9 });
      for (const sx of [-0.35, 0.35]) { const rope = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.85, 0.03), ropeM); rope.position.set(sx, -0.93, 0); g.add(rope); }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.38), new THREE.MeshStandardMaterial({ color: 0xff7a5a, roughness: 0.6 }));
      seat.position.set(0, -1.86, 0); seat.castShadow = true; g.add(seat);
      scene.add(g);
      t.swingGroup = g;
      for (const lx of [-1.0, 1.0]) addCollider(...at(lx, 0), 0.3);
    } else if (t.type === 'telescope') {
      for (let k = 0; k < 3; k++) { const a = k * 2.094; P(BOX, 0x5a4a3a, Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3, [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], [0.06, 1.15, 0.06]); }
      P(CYL, 0xc8962a, 0, 1.25, 0.1, [Math.PI / 2 - 0.35, 0, 0], [0.16, 1.1, 0.16], shiny);
      P(CYL, 0x2a2a30, 0, 1.43, -0.42, [Math.PI / 2 - 0.35, 0, 0], [0.22, 0.12, 0.22], shiny);
      P(CYL, 0x8ad8ff, 0, 1.46, -0.49, [Math.PI / 2 - 0.35, 0, 0], [0.16, 0.02, 0.16], shiny);
      addCollider(t.x, t.z, 0.4);
    }
  }
  // 집 섬 소품: 선착장 옆 나무 상자·통, 그물 말리는 대, 비치 의자 + 파라솔, 모닥불 자리, 해먹(E)
  function islandProps(id, ix, iz, r, hw, hd) {
    const top = ISLAND_TOP - 0.05;
    const dx = ix + 2.6, dz = iz - r * 0.82;
    deco.add(BOX, 0x9a6a3a, [dx + 0.9, top + 0.3, dz + 0.6], [0, 0.3, 0], [0.6, 0.6, 0.6]);           // 나무 상자
    deco.add(BOX, 0x8a5a2a, [dx + 1.0, top + 0.82, dz + 0.55], [0, 0.6, 0], [0.45, 0.45, 0.45]);
    deco.add(CYL, 0x6a4a2a, [dx + 1.7, top + 0.38, dz + 0.1], [0, 0, 0], [0.5, 0.76, 0.5]);            // 통
    for (const hy of [0.15, 0.6]) deco.add(CYL, 0x3a3a3a, [dx + 1.7, top + hy, dz + 0.1], [0, 0, 0], [0.53, 0.05, 0.53]);
    addCollider(dx + 1.2, dz + 0.4, 0.8);
    // 그물 말리는 대
    const nx = ix - hw / 2 - 4.2, nz = iz - hd / 2 - 1.5;
    for (const o of [-1.1, 1.1]) deco.add(BOX, 0x6a4a2a, [nx + o, top + 0.9, nz], [0, 0, 0], [0.12, 1.8, 0.12]);
    deco.add(BOX, 0x6a4a2a, [nx, top + 1.75, nz], [0, 0, 0], [2.4, 0.08, 0.08]);
    for (let k = 0; k < 10; k++) tiny.add(BOX, 0xd8c8a0, [nx - 1.0 + k * 0.22, top + 1.25, nz], [0, 0, 0], [0.02, 0.95, 0.02]);
    for (let k = 0; k < 5; k++) tiny.add(BOX, 0xd8c8a0, [nx, top + 0.85 + k * 0.2, nz], [0, 0, 0], [2.1, 0.02, 0.02]);
    for (let k = 0; k < 3; k++) tinyShiny.add(BALL, 0xff7a3a, [nx - 0.7 + k * 0.7, top + 0.9, nz - 0.03], [0, 0, 0], [0.16, 0.16, 0.16]); // 찌 장식
    addCollider(nx - 1.1, nz, 0.2); addCollider(nx + 1.1, nz, 0.2);
    // 비치 의자 2개 + 파라솔
    const bx = ix + hw / 2 + 3.5, bz = iz - hd / 2 - 2.6;
    for (const o of [-0.8, 0.8]) { deco.add(BOX, 0xffffff, [bx + o, top + 0.28, bz], [0, 0, 0], [0.6, 0.08, 1.5]); deco.add(BOX, 0x3aa8e8, [bx + o, top + 0.55, bz + 0.65], [0.6, 0, 0], [0.6, 0.06, 0.6]); for (const lz of [-0.6, 0.6]) deco.add(BOX, 0xd8d8d8, [bx + o, top + 0.13, bz + lz], [0, 0, 0], [0.55, 0.26, 0.06]); }
    deco.add(CYL, 0xf4f4f4, [bx, top + 1.0, bz - 0.9], [0, 0, 0], [0.07, 2.0, 0.07]);
    shiny.add(CONE, pick([0xff5a6a, 0xffc83a, 0x3ad8a8]), [bx, top + 2.05, bz - 0.9], [0, 0.3, 0], [2.6, 0.55, 2.6]);
    // 모닥불 자리 (돌 + 장작)
    const fx = ix - hw / 2 - 3.2, fz = iz + hd / 2 + 2.6;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; rock(fx + Math.cos(a) * 0.6, fz + Math.sin(a) * 0.6, 0.3, top - 0.1, 0x6a6a62); }
    for (let k = 0; k < 3; k++) deco.add(CYL, 0x5a3a22, [fx, top + 0.12, fz], [Math.PI / 2, k * 1.05, 0], [0.1, 0.8, 0.1]);
    addCollider(fx, fz, 0.8);
    // 해먹 (E 로 눕기)
    things.push({ id: 'hammock_' + id, type: 'hammock', title: '해먹 · 눕기', x: ix + hw / 2 + 4.6, z: iz + 1.5, y: top, ry: Math.PI / 2 });
  }

  // 섬 5개, 집 5채 (멀티 방 하나에 최대 5명이라 한 사람에 한 채씩!)
  //  비쌀수록 더 넓고, 생김새와 가구가 달라요
  //  [id, 집 이름, 섬 이름, 가격, 섬 x, 섬 z, 섬 크기, 집 가로, 집 세로, 벽 높이, 생김새, 어항 너비, 처음 디자인]
  const ISLANDS = [
    ['sunset', '노을섬 별장', '노을섬', 120000, -42, 80, 14, 8.5, 7, 3.8, 'cottage', 3.8, 0],
    ['coral', '산호섬 해변집', '산호섬', 200000, -75, 75, 15, 11, 8.5, 4.0, 'beach', 4.8, 4],
    ['pine', '솔숲섬 통나무집', '솔숲섬', 260000, -80, 115, 15, 10, 9, 3.6, 'cabin', 4.8, 3],
    ['star', '별빛섬 탑 저택', '별빛섬', 380000, -20, 150, 16, 12, 10, 4.6, 'tower', 6.0, 7],
    ['whale', '고래섬 대저택', '고래섬', 600000, 24, 140, 21, 16, 12, 5.2, 'grand', 8.0, 1]
  ];
  const islandInfo = [];
  for (const [id, name, iname, price, ix, iz, r, hw, hd, hh, kind, tankW, style] of ISLANDS) {
    makeSeaIsland(ix, iz, r);
    makeHouse({ id, name, price, x: ix, z: iz - (r > 18 ? 2 : 0), w: hw, d: hd, H: hh, kind, tankW, style });
    islandInfo.push({ id, name: iname, x: ix, z: iz, r });
  }
  // 섬 꾸미기: 야자수·꽃·바위·벤치·가로등·작은 선착장
  for (const [id, , , , ix, iz, r, hw, hd] of ISLANDS) {
    islandProps(id, ix, iz, r, hw, hd);
    addCollider(ix + hw / 2 + 4.6, iz + 1.5 - 1.6, 0.3); addCollider(ix + hw / 2 + 4.6, iz + 1.5 + 1.6, 0.3); // 해먹 기둥 자리 미리
    for (let k = 0; k < Math.round(r * 0.9); k++) {
      const a = rnd() * Math.PI * 2, rr = r * (0.62 + rnd() * 0.36);
      const px = ix + Math.cos(a) * rr, pz = iz + Math.sin(a) * rr;
      if (Math.abs(px - ix) < hw / 2 + 3 && Math.abs(pz - iz) < hd / 2 + 4.5) continue; // 집·정원 자리는 비워요
      if (collides(px, pz, 0.8)) continue;
      const roll = rnd();
      if (roll < 0.35) palm(px, pz, 0.9 + rnd() * 0.5, ISLAND_TOP - 0.05);
      else if (roll < 0.7) flowerPatch(px, pz, 6, ISLAND_TOP - 0.05);
      else if (roll < 0.85) bush(px, pz, 1 + rnd() * 0.4, ISLAND_TOP - 0.05);
      else rock(px, pz, 0.7 + rnd() * 0.6, ISLAND_TOP - 0.05);
    }
    for (let k = 0; k < 18; k++) { const a = rnd() * Math.PI * 2, rr = r * (0.92 + rnd() * 0.12); if (rnd() < 0.5) shell(ix + Math.cos(a) * rr, iz + Math.sin(a) * rr, ISLAND_TOP - 0.28); else starfish(ix + Math.cos(a) * rr, iz + Math.sin(a) * rr, ISLAND_TOP - 0.28); }
    lampPost(ix - hw / 2 - 3.2, iz - hd / 2 - 4.2, ISLAND_TOP - 0.05);
    lampPost(ix + hw / 2 + 3.2, iz - hd / 2 - 4.2, ISLAND_TOP - 0.05);
    bench(ix - hw / 2 - 4.5, iz, Math.PI / 2, ISLAND_TOP - 0.05);
    // 섬 앞(본토 쪽) 작은 나무 선착장
    for (let k = 0; k < 8; k++) deco.add(BOX, k % 2 ? 0xb08a61 : 0x9a7a52, [ix, 0.2, iz - r * 0.95 - k * 0.54], [0, 0, 0], [2.0, 0.12, 0.5]);
    for (const s of [-1, 1]) deco.add(CYL, 0x5a4232, [ix + s * 0.9, -0.3, iz - r * 0.95 - 3.6], [0, 0, 0], [0.2, 1.4, 0.2]);
  }

  // =====================================================
  //  3) 원래 맵 곳곳 꾸미기: 꽃밭 · 덤불 · 버섯 · 가로등 · 벤치 · 작은 언덕
  // =====================================================
  for (let i = 0; i < 260; i++) {
    const x = BOUNDS.x0 + 2 + rnd() * (BOUNDS.x1 - BOUNDS.x0 - 4), z = BOUNDS.z0 + 2 + rnd() * (BOUNDS.z1 - BOUNDS.z0 + 2);
    if (!freeLand(x, z, 0.8)) continue;
    const roll = rnd();
    if (roll < 0.5) flowerPatch(x, z, 4 + Math.floor(rnd() * 4));
    else if (roll < 0.72) bush(x, z, 0.8 + rnd() * 0.6);
    else if (roll < 0.86) { mushroom(x, z); mushroom(x + 0.35, z + 0.2); if (rnd() < 0.5) mushroom(x - 0.3, z + 0.3); }
    else if (roll < 0.94) rock(x, z, 0.5 + rnd() * 0.7);
    else { // 작은 풀 언덕 (발로 지나갈 수 있는 낮은 둔덕)
      deco.add(BALL, 0x6a9a50, [x, -0.25, z], [0, rnd() * 3, 0], [2.6 + rnd() * 2, 0.7, 2.2 + rnd() * 1.6]);
      flower(x + 0.3, z, 0.05); flower(x - 0.4, z + 0.3, 0.02);
    }
  }
  // 마을 길가 가로등과 벤치 (부두 앞 광장 · 바다 가는 길)
  for (const [lx, lz] of [[-5, 10.5], [5, 10.5], [-11, 18], [-6, 21], [4, 21.5], [16, 15]]) if (freeLand(lx, lz, 0.4)) lampPost(lx, lz);
  for (const [bx, bz, ry] of [[-16, 21.5, 0], [0, 22, 0], [-4, 12.5, Math.PI]]) if (freeLand(bx, bz, 0.6)) bench(bx, bz, ry);

  // =====================================================
  //  정글섬 (후반 콘텐츠): 빽빽한 정글 나무 · 덩굴 · 고사리 · 대나무 · 앵무새 · 이끼 낀 신전 · 폭포 연못
  //  정글 연못(JUNGLE_POND)에는 아주 비싼 정글 물고기가 살아요 (정글 공방 낚싯대로만!)
  // =====================================================
  {
    const J = JUNGLE, P = JUNGLE_POND, jx = J.x, jz = J.z, r = J.r;
    const top = ISLAND_TOP - 0.05;
    // 섬 바닥: 모래 + 짙은 정글 풀 + 흙 얼룩
    deco.add(new THREE.CylinderGeometry(1, 1.12, 1, 32), 0xd8c494, [jx, -0.38, jz], [0, 0, 0], [r * 1.12, 1.0, r * 1.12]);
    deco.add(new THREE.CylinderGeometry(1, 1, 1, 32), 0x3f7a34, [jx, ISLAND_TOP - 0.1, jz], [0, 0, 0], [r * 0.92, 0.2, r * 0.92]);
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, rr = rnd() * r * 0.8; tiny.add(BOX, pick([0x355f2a, 0x4a8a3a, 0x5a4a2a]), [jx + Math.cos(a) * rr, ISLAND_TOP + 0.005, jz + Math.sin(a) * rr], [0, rnd() * 3, 0], [2 + rnd() * 3, 0.02, 1.5 + rnd() * 2]); }
    islands.push({ x: jx, z: jz, r: r * 1.1 });
    const temple = { x: jx - 9, z: jz + 10 };
    const shopAt = { x: jx - 11, z: jz - 12 };   // 정글 공방
    const sellAt = { x: jx + 9, z: jz - 13 };    // 정글 판매점
    const cliff = { x: P.x + P.rx + 1.8, z: P.z };
    const busy = (x, z, m = 0) => // 나무를 심으면 안 되는 곳
      ((x - P.x) / (P.rx + 1.6 + m)) ** 2 + ((z - P.z) / (P.rz + 1.6 + m)) ** 2 < 1 ||
      Math.hypot(x - temple.x, z - temple.z) < 10 + m || Math.hypot(x - shopAt.x, z - shopAt.z) < 5.5 + m || Math.hypot(x - sellAt.x, z - sellAt.z) < 5.5 + m ||
      Math.hypot(x - cliff.x, z - cliff.z) < 3.5 + m || (Math.abs(x - jx) < 3.2 && z < jz - 6) || (Math.abs(z - (jz - 15)) < 2 && Math.abs(x - jx) < 4) ||
      Math.hypot(x - (jx - 17), z - (jz - 4)) < 3.5 + m || Math.hypot(x - (jx + 14), z - (jz - 18)) < 3.5 + m ||
      (Math.abs(x - temple.x) < 6.5 + m && z > temple.z - 19 && z < temple.z) ||   // 신전 앞 광장
      (x > temple.x - 2 && x < jx + 3 && Math.abs(z - (jz - 6)) < 2.6 + m) ||        // 길에서 신전 광장으로
      (x > jx - 2 && x < P.x - P.rx + 1 && Math.abs(z - P.z) < 3 + m) ||           // 길에서 연못으로
      collides(x, z, 0.6 + m);
    // 연못 테두리 돌 + 수련잎 + 연꽃
    for (let k = 0; k < 44; k++) { const a = (k / 44) * 6.28; rock(P.x + Math.cos(a) * (P.rx + 0.4), P.z + Math.sin(a) * (P.rz + 0.4), 0.5 + rnd() * 0.4, top - 0.1, pick([0x6a7a5a, 0x5a6a4a, 0x7a8a6a])); }
    for (let k = 0; k < 26; k++) {
      const a = rnd() * 6.28, rr = rnd() * 0.8;
      const lx = P.x + Math.cos(a) * P.rx * rr, lz = P.z + Math.sin(a) * P.rz * rr;
      tiny.add(CYL, 0x3a9a3a, [lx, P.y + 0.07, lz], [0, 0, 0], [0.7, 0.03, 0.7]);
      if (rnd() < 0.5) { tinyShiny.add(CONE, 0xff9ac8, [lx + 0.1, P.y + 0.18, lz], [0, 0, 0], [0.2, 0.2, 0.2]); tinyShiny.add(BALL, 0xffe066, [lx + 0.1, P.y + 0.25, lz], [0, 0, 0], [0.07, 0.07, 0.07]); }
    }
    // 폭포: 연못 뒤 이끼 낀 바위 절벽에서 물이 쏟아져요
    for (let k = 0; k < 6; k++) deco.add(BOX, pick([0x5a6a4a, 0x6a7a5a, 0x4a5a3a]), [cliff.x + (rnd() - 0.5) * 0.8, ISLAND_TOP + k * 1.1 + 0.5, cliff.z + (rnd() - 0.5) * 1.5], [0, rnd(), 0], [3.0 - k * 0.2, 1.15, 7 - k * 0.5]);
    deco.add(BOX, 0x4a8a3a, [cliff.x, ISLAND_TOP + 5.6, cliff.z], [0, 0.2, 0], [2.4, 0.3, 4.2]);
    shiny.add(BOX, 0x9ad8ff, [cliff.x - 1.35, ISLAND_TOP + 2.6, cliff.z], [0, 0, 0], [0.12, 5.2, 1.4]);
    for (let k = 0; k < 6; k++) tinyShiny.add(BALL, 0xf4fbff, [cliff.x - 1.8 + (rnd() - 0.5) * 0.6, P.y + 0.15, cliff.z + (rnd() - 0.5) * 1.4], [0, 0, 0], [0.5, 0.3, 0.5]);
    addCollider(cliff.x, cliff.z, 2.2);
    // ===== 고대 신전 (크고 세세하게) =====
    //  5층 계단식 피라미드 + 층마다 조각 띠 + 빛나는 룬 + 앞 계단과 뱀 머리 난간 + 꼭대기 사당(아치 문) + 횃불
    const stone = [0x7a8a6a, 0x6e7e60, 0x86967a], stoneD = 0x5a6a4e, carve = 0x9aaa8a;
    const runeMat = new THREE.MeshStandardMaterial({ color: 0x6affd0, emissive: 0x2affb0, emissiveIntensity: 1.2, roughness: 0.3 });
    LANTERN_MATS.push(runeMat);
    const runes = new DecoBatch(THREE);
    const TIERS = 5, TH = 1.15;
    for (let k = 0; k < TIERS; k++) {
      const s = 12 - k * 2.1, y = top + TH * (k + 0.5);
      deco.add(BOX, stone[k % 3], [temple.x, y, temple.z], [0, 0, 0], [s, TH, s]);
      // 층 윗면 가장자리 조각 띠 (작은 블록이 이빨처럼 튀어나와요)
      for (let side = 0; side < 4; side++) {
        const n = Math.round(s / 0.7);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n - 0.5, along = t * s;
          const [px, pz] = side === 0 ? [along, -s / 2] : side === 1 ? [along, s / 2] : side === 2 ? [-s / 2, along] : [s / 2, along];
          if (side === 0 && Math.abs(along) < 1.4) continue; // 계단 자리
          deco.add(BOX, i % 2 ? carve : stoneD, [temple.x + px * 1.0, y + TH * 0.38, temple.z + pz * 1.0], [0, 0, 0], [0.32, 0.22, 0.32]);
          if (i % 3 === 1 && k < 4) runes.add(BOX, 0xffffff, [temple.x + px * 1.005, y - 0.05, temple.z + pz * 1.005], [0, 0, 0], side < 2 ? [0.22, 0.32, 0.04] : [0.04, 0.32, 0.22]); // 빛나는 룬
        }
      }
      for (let m = 0; m < 8; m++) tiny.add(BOX, pick([0x4a8a3a, 0x3a7a2e]), [temple.x + (rnd() - 0.5) * s, y + TH * 0.52, temple.z + (rnd() - 0.5) * s], [0, rnd() * 3, 0], [0.8 + rnd(), 0.06, 0.5 + rnd()]); // 이끼
      for (let m = 0; m < 3; m++) { const vx = temple.x + (rnd() - 0.5) * s, vl = 0.6 + rnd() * TH; tiny.add(BOX, 0x3a8a2a, [vx, y + TH / 2 - vl / 2, temple.z - s / 2 - 0.02], [0, 0, 0], [0.06, vl, 0.06]); } // 늘어진 덩굴
    }
    // 앞 계단 (북쪽) + 양옆 뱀 머리 난간
    const stairN = 11;
    for (let k = 0; k < stairN; k++) deco.add(BOX, k % 2 ? carve : 0x8a9a7a, [temple.x, top + 0.26 + k * 0.5, temple.z - 6.2 + k * 0.45], [0, 0, 0], [2.4, 0.52, 0.5]);
    for (const s of [-1, 1]) {
      for (let k = 0; k < stairN; k++) deco.add(BOX, stoneD, [temple.x + s * 1.4, top + 0.45 + k * 0.5, temple.z - 6.2 + k * 0.45], [0, 0, 0], [0.4, 0.7, 0.5]);
      // 뱀 머리: 머리 + 위턱 + 아래턱 + 이빨 + 빛나는 눈
      const hx = temple.x + s * 1.4, hz = temple.z - 7.0, hy = top + 0.5;
      deco.add(BOX, carve, [hx, hy, hz], [0, 0, 0], [0.8, 0.7, 1.0]);
      deco.add(BOX, stoneD, [hx, hy + 0.25, hz - 0.65], [0.15, 0, 0], [0.75, 0.25, 0.5]);
      deco.add(BOX, stoneD, [hx, hy - 0.25, hz - 0.6], [-0.1, 0, 0], [0.7, 0.18, 0.45]);
      for (const t of [-0.22, 0, 0.22]) tinyShiny.add(BOX, 0xf4f0e0, [hx + t, hy + 0.08, hz - 0.85], [0, 0, 0], [0.08, 0.14, 0.06]);
      for (const t of [-0.25, 0.25]) runes.add(BOX, 0xffffff, [hx + t, hy + 0.32, hz - 0.4], [0, 0, 0], [0.12, 0.08, 0.06]);
    }
    // 꼭대기 사당: 기둥 4개 + 아치 지붕 + 안쪽 제단
    const ty = top + TH * TIERS;
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      deco.add(BOX, carve, [temple.x + ax * 0.85, ty + 0.9, temple.z + az * 0.85], [0, 0, 0], [0.34, 1.8, 0.34]);
      for (let m = 0; m < 3; m++) deco.add(BOX, stoneD, [temple.x + ax * 0.85, ty + 0.35 + m * 0.6, temple.z + az * 0.85], [0, 0, 0], [0.42, 0.08, 0.42]); // 기둥 마디
    }
    deco.add(BOX, stoneD, [temple.x, ty + 1.95, temple.z], [0, 0, 0], [2.4, 0.3, 2.4]);
    deco.add(PRISM, 0x5a6a4a, [temple.x, ty + 2.5, temple.z], [0, 0, Math.PI / 2], [1.4, 2.6, 2.2]);
    deco.add(BOX, carve, [temple.x, ty + 0.25, temple.z], [0, 0, 0], [0.9, 0.5, 0.9]); // 제단
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x3affa0, emissive: 0x1aff7a, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.3 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), emeraldMat);
    gem.position.set(temple.x, ty + 1.0, temple.z);
    gem.scale.y = 1.5;
    gem.userData.dynamic = true;
    scene.add(gem);
    LANTERN_MATS.push(emeraldMat);
    jungleFx.gem = gem;
    // 횃불: 계단 옆과 사당 앞 (불꽃이 일렁여요)
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb04a, emissive: 0xff7a1a, emissiveIntensity: 1.8, roughness: 0.6 });
    const torch = (x, y, z) => {
      deco.add(CYL, 0x4a3422, [x, y + 0.6, z], [0, 0, 0], [0.12, 1.2, 0.12]);
      deco.add(CYL, 0x2a2a2a, [x, y + 1.25, z], [0, 0, 0], [0.26, 0.14, 0.26]);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 5), flameMat);
      f.position.set(x, y + 1.5, z);
      f.userData.dynamic = true;
      scene.add(f);
      jungleFx.flames.push(f);
      addCollider(x, z, 0.2);
    };
    for (const s of [-1, 1]) { torch(temple.x + s * 2.4, top, temple.z - 6.9); torch(temple.x + s * 1.2, ty, temple.z - 1.3); }
    addCollider(temple.x, temple.z, 6.0);
    for (const s of [-1, 1]) addCollider(temple.x + s * 1.4, temple.z - 7.0, 0.6);
    // ===== 흩어진 유적 =====
    // 부서진 기둥들 (서 있는 것 + 쓰러진 것)
    const column = (x, z, h, fallen) => {
      if (!fallen) {
        deco.add(BOX, stoneD, [x, top + 0.15, z], [0, 0, 0], [0.9, 0.3, 0.9]);
        for (let m = 0; m < h; m++) deco.add(CYL, m % 2 ? carve : stone[m % 3], [x + (rnd() - 0.5) * 0.06, top + 0.6 + m * 0.62, z], [0, rnd(), 0], [0.62, 0.6, 0.62]);
        for (let m = 0; m < 2; m++) tiny.add(BOX, 0x3a8a2a, [x + 0.32, top + 0.6 + rnd() * h * 0.6, z], [0, 0, 0], [0.05, 0.8, 0.05]);
        addCollider(x, z, 0.5);
      } else {
        const a = rnd() * 3;
        for (let m = 0; m < h; m++) deco.add(CYL, stone[m % 3], [x + Math.cos(a) * m * 0.66, top + 0.3, z + Math.sin(a) * m * 0.66], [0, -a, Math.PI / 2], [0.6, 0.6, 0.6]);
        tiny.add(BOX, 0x4a8a3a, [x + Math.cos(a) * h * 0.3, top + 0.62, z + Math.sin(a) * h * 0.3], [0, -a, 0], [h * 0.5, 0.05, 0.4]);
      }
    };
    for (const [ox, oz, h, fl] of [[-2, 2, 4, false], [-14, 0, 3, false], [-4, -4, 2, false], [-16, 8, 3, true], [6, 15, 3, true], [-1, 18, 4, false], [-18, 14, 2, false]]) column(jx + ox, jz + oz, h, fl);
    // 돌 아치 문 (선착장에서 오는 길 위)
    {
      const gx = jx, gz = jz - 15;
      for (const s of [-1, 1]) { for (let m = 0; m < 5; m++) deco.add(BOX, m % 2 ? carve : stoneD, [gx + s * 1.7, top + 0.4 + m * 0.72, gz], [0, 0, 0], [0.75, 0.72, 0.75]); addCollider(gx + s * 1.7, gz, 0.5); }
      deco.add(BOX, stoneD, [gx, top + 3.95, gz], [0, 0, 0], [4.4, 0.6, 0.85]);
      for (let m = -3; m <= 3; m++) runes.add(BOX, 0xffffff, [gx + m * 0.5, top + 3.95, gz - 0.44], [0, 0, 0], [0.16, 0.26, 0.04]);
      for (let m = 0; m < 6; m++) tiny.add(BOX, 0x3a8a2a, [gx + (rnd() - 0.5) * 4, top + 3.2, gz - 0.45], [0, 0, 0], [0.06, 1.2 + rnd(), 0.06]);
    }
    // 거대한 돌 얼굴 석상 (이끼 + 빛나는 눈)
    {
      const fx = jx - 17, fz = jz - 4;
      deco.add(BOX, 0x7a8a6a, [fx, top + 1.5, fz], [0, 0.5, 0], [2.6, 3.0, 2.4]);
      deco.add(BOX, stoneD, [fx + Math.sin(0.5) * -1.25, top + 2.0, fz + Math.cos(0.5) * -1.25], [0, 0.5, 0], [2.2, 0.35, 0.2]); // 눈썹
      for (const s of [-1, 1]) runes.add(BOX, 0xffffff, [fx + Math.cos(0.5) * s * 0.55 - Math.sin(0.5) * 1.25, top + 1.7, fz - Math.sin(0.5) * s * 0.55 - Math.cos(0.5) * 1.25], [0, 0.5, 0], [0.4, 0.22, 0.1]);
      deco.add(BOX, carve, [fx - Math.sin(0.5) * 1.35, top + 1.2, fz - Math.cos(0.5) * 1.35], [0, 0.5, 0], [0.5, 0.8, 0.4]); // 코
      deco.add(BOX, stoneD, [fx - Math.sin(0.5) * 1.25, top + 0.55, fz - Math.cos(0.5) * 1.25], [0, 0.5, 0], [1.3, 0.25, 0.2]); // 입
      for (let m = 0; m < 6; m++) tiny.add(BOX, 0x4a8a3a, [fx + (rnd() - 0.5) * 2.4, top + 3.02, fz + (rnd() - 0.5) * 2.2], [0, rnd(), 0], [0.9, 0.08, 0.6]);
      addCollider(fx, fz, 1.8);
    }
    // 제단 + 돌 그릇 (신전 앞)
    deco.add(BOX, carve, [temple.x, top + 0.45, temple.z - 9.2], [0, 0, 0], [1.6, 0.9, 1.0]);
    deco.add(CYL, stoneD, [temple.x, top + 1.0, temple.z - 9.2], [0, 0, 0], [0.8, 0.22, 0.8]);
    runes.add(BALL, 0xffffff, [temple.x, top + 1.15, temple.z - 9.2], [0, 0, 0], [0.3, 0.2, 0.3]);
    addCollider(temple.x, temple.z - 9.2, 0.8);
    // 토템 기둥 2개 (얼굴 블록을 쌓고 색칠)
    for (const [ox, oz] of [[10, -9], [-7, -14]]) {
      const tx = jx + ox, tz = jz + oz;
      const cols = [0xd8402a, 0x2a8ad8, 0xffd83a, 0x2ab84a];
      for (let m = 0; m < 4; m++) {
        deco.add(BOX, 0x8a6a42, [tx, top + 0.45 + m * 0.9, tz], [0, 0, 0], [0.8, 0.88, 0.8]);
        tinyShiny.add(BOX, cols[m], [tx, top + 0.6 + m * 0.9, tz - 0.42], [0, 0, 0], [0.5, 0.12, 0.04]);
        for (const s of [-1, 1]) tinyShiny.add(BOX, 0xf4f0e0, [tx + s * 0.18, top + 0.4 + m * 0.9, tz - 0.42], [0, 0, 0], [0.12, 0.12, 0.04]);
      }
      for (const s of [-1, 1]) deco.add(BOX, 0xd8402a, [tx + s * 0.75, top + 3.3, tz], [0, 0, s * 0.3], [0.7, 0.14, 0.4]); // 날개
      addCollider(tx, tz, 0.55);
    }
    // 정글 해변 캠프: 모닥불 + 통나무 의자
    {
      const cx = jx + 14, cz = jz - 18;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; rock(cx + Math.cos(a) * 0.7, cz + Math.sin(a) * 0.7, 0.35, top - 0.1, 0x6a6a62); }
      for (let k = 0; k < 3; k++) deco.add(CYL, 0x5a3a22, [cx, top + 0.15, cz], [Math.PI / 2, k * 1.05, 0], [0.12, 0.9, 0.12]);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), flameMat);
      f.position.set(cx, top + 0.45, cz); f.userData.dynamic = true; scene.add(f); jungleFx.flames.push(f);
      for (const a of [0.4, 2.4, 4.4]) deco.add(CYL, 0x6a4a2a, [cx + Math.cos(a) * 1.8, top + 0.25, cz + Math.sin(a) * 1.8], [Math.PI / 2, a, 0], [0.4, 1.4, 0.4]);
      addCollider(cx, cz, 0.9);
    }
    runes.build(scene, { cast: false, material: runeMat });
    // 상호작용: 신전 징 · 석상 옆 보물 상자
    things.push({ id: 'gong', type: 'gong', title: '신전의 징 · 울리기', x: temple.x - 3.6, z: temple.z - 8.4, y: top });
    things.push({ id: 'chest_jungle', type: 'chest', title: '고대 보물 상자 · 열기', x: jx - 15.2, z: jz - 1.0, y: top });
    // 신전 앞 광장: 이끼 낀 돌 타일 바닥
    for (let ix2 = -5; ix2 <= 5; ix2++) for (let iz2 = 0; iz2 < 8; iz2++) {
      if (rnd() < 0.15) continue; // 군데군데 빠진 타일
      tiny.add(BOX, pick([0x8a9a7a, 0x7a8a6a, 0x9aaa8a, 0x6a7a5a]), [temple.x + ix2 * 1.1, top + 0.04, temple.z - 9.8 - iz2 * 1.1], [0, (rnd() - 0.5) * 0.1, 0], [1.0, 0.08, 1.0]);
      if (rnd() < 0.2) tiny.add(BOX, 0x4a8a3a, [temple.x + ix2 * 1.1, top + 0.09, temple.z - 9.8 - iz2 * 1.1], [0, rnd(), 0], [0.6, 0.02, 0.4]);
    }
    for (let k = 0; k < 12; k++) tiny.add(CYL, 0x9a9a8a, [jx - 1 - k * 0.9, top + 0.06, jz - 6 + (rnd() - 0.5) * 0.4], [0, 0, 0], [0.85, 0.06, 0.75]);   // 신전 광장 가는 길
    for (let k = 0; k < 7; k++) tiny.add(CYL, 0x9a9a8a, [jx + 1 + k * 0.9, top + 0.06, P.z + (rnd() - 0.5) * 0.4], [0, 0, 0], [0.85, 0.06, 0.75]);   // 연못 가는 길
    // 선착장 → 신전·연못 돌길
    for (let k = 0; k < 10; k++) tiny.add(CYL, 0x9a9a8a, [jx + (rnd() - 0.5) * 0.6, top + 0.06, jz - r * 0.75 + k * 1.2], [0, 0, 0], [0.9, 0.06, 0.8]);
    // 정글 나무: 굵은 줄기 + 판자 뿌리 + 높은 잎 덩어리 + 늘어진 덩굴 (+ 가끔 앵무새)
    const jungleTree = (x, z, s) => {
      const h = (9 + rnd() * 5) * s, rad = (0.38 + rnd() * 0.22) * s; // 키가 커서 잎이 카메라보다 위에 있어요
      deco.add(CYL, pick([0x6a5236, 0x7a6a4a, 0x5a4a32]), [x, top + h / 2, z], [0, 0, 0], [rad * 2, h, rad * 2]);
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + rnd() * 0.5; deco.add(BOX, 0x5a4a32, [x + Math.cos(a) * rad * 1.3, top + 0.5 * s, z + Math.sin(a) * rad * 1.3], [0, -a, 0.6], [1.2 * s, 0.9 * s, 0.14]); }
      const greens = [0x2e6a28, 0x3a7a2e, 0x24581e, 0x4a8a34];
      for (let k = 0; k < 5; k++) deco.add(BALL, pick(greens), [x + (rnd() - 0.5) * 3 * s, top + h + (rnd() - 0.3) * 1.2 * s, z + (rnd() - 0.5) * 3 * s], [rnd(), rnd(), 0], [(2.4 + rnd() * 1.6) * s, (1.4 + rnd() * 0.8) * s, (2.4 + rnd() * 1.6) * s]);
      for (let k = 0; k < 3; k++) { const vx = x + (rnd() - 0.5) * 2.6 * s, vz = z + (rnd() - 0.5) * 2.6 * s, vl = (2 + rnd() * 3) * s; tiny.add(BOX, pick([0x3a8a2a, 0x4a9a3a]), [vx, top + h - vl / 2, vz], [0, 0, 0], [0.07, vl, 0.07]); tiny.add(BOX, 0x5ab84a, [vx, top + h - vl, vz], [0, rnd() * 3, 0], [0.3, 0.05, 0.18]); }
      if (rnd() < 0.3) { // 앵무새
        const bx = x + rad + 0.25, by = top + h * 0.7, bz = z, col = pick([0xd8302a, 0x2a8ad8, 0x2ab84a]);
        tinyShiny.add(BOX, col, [bx, by, bz], [0, 0, 0.3], [0.22, 0.35, 0.2]);
        tinyShiny.add(BOX, 0xffd83a, [bx + 0.06, by + 0.25, bz], [0, 0, 0], [0.18, 0.18, 0.18]);
        tinyShiny.add(BOX, 0x2a2a2a, [bx + 0.17, by + 0.24, bz], [0, 0, 0], [0.08, 0.06, 0.06]);
        tinyShiny.add(BOX, pick([0x2a5ad8, 0xffd83a]), [bx - 0.05, by - 0.25, bz], [0, 0, 0.2], [0.1, 0.35, 0.12]);
      }
      addCollider(x, z, rad + 0.35);
      trunks.push({ x, z, r: rad });
    };
    let planted = 0;
    for (let k = 0; k < 300 && planted < 62; k++) {
      const a = rnd() * 6.28, rr = r * (0.15 + rnd() * 0.75), x = jx + Math.cos(a) * rr, z = jz + Math.sin(a) * rr;
      if (busy(x, z, 0.5)) continue;
      jungleTree(x, z, 0.85 + rnd() * 0.45); planted++;
    }
    // 고사리 · 큰 잎(몬스테라) · 열대 꽃 · 대나무 숲 · 버섯
    const fern = (x, z) => { const n = 6, s = 0.7 + rnd() * 0.6; for (let k = 0; k < n; k++) { const a = (k / n) * 6.28 + rnd() * 0.4; tiny.add(BOX, pick([0x3a8a2e, 0x4a9a3a, 0x2e7a26]), [x + Math.cos(a) * 0.45 * s, top + 0.3 * s, z + Math.sin(a) * 0.45 * s], [0, -a, 0.55], [1.0 * s, 0.04, 0.26 * s]); } };
    const monstera = (x, z) => { for (let k = 0; k < 3; k++) { const a = rnd() * 6.28, s = 0.9 + rnd() * 0.6; tiny.add(BOX, 0x2a7a2a, [x, top + 0.35 * s, z], [0, a, 0], [0.05, 0.7 * s, 0.05]); tiny.add(BOX, pick([0x2e8a2e, 0x3a9a3a]), [x + Math.cos(a) * 0.4 * s, top + 0.75 * s, z + Math.sin(a) * 0.4 * s], [0.4, -a, 0], [1.0 * s, 0.04, 0.8 * s]); } };
    const hibiscus = (x, z) => { const col = pick([0xff3a5a, 0xff7a2a, 0xff5ab8, 0xffd83a]); for (let k = 0; k < 5; k++) { const a = k * 1.256; tinyShiny.add(BOX, col, [x + Math.cos(a) * 0.12, top + 0.55, z + Math.sin(a) * 0.12], [0, -a, 0.3], [0.22, 0.03, 0.14]); } tinyShiny.add(BOX, 0xffe066, [x, top + 0.6, z], [0, 0, 0], [0.04, 0.12, 0.04]); tiny.add(BOX, 0x3a8a2a, [x, top + 0.27, z], [0, 0, 0], [0.04, 0.55, 0.04]); };
    for (let k = 0; k < 520; k++) {
      const a = rnd() * 6.28, rr = r * (0.1 + rnd() * 0.8), x = jx + Math.cos(a) * rr, z = jz + Math.sin(a) * rr;
      if (busy(x, z, -0.2)) continue;
      const roll = rnd();
      if (roll < 0.4) fern(x, z); else if (roll < 0.6) monstera(x, z); else if (roll < 0.85) hibiscus(x, z); else mushroom(x, z, top);
    }
    for (let c = 0; c < 10; c++) { // 대나무 숲
      const a = rnd() * 6.28, rr = r * (0.4 + rnd() * 0.45), x = jx + Math.cos(a) * rr, z = jz + Math.sin(a) * rr;
      if (busy(x, z, 0.5)) continue;
      for (let k = 0; k < 6; k++) { const bx = x + (rnd() - 0.5) * 1.6, bz = z + (rnd() - 0.5) * 1.6, bh = 4 + rnd() * 3; deco.add(CYL, pick([0x7aa83a, 0x8ab84a]), [bx, top + bh / 2, bz], [0, 0, 0], [0.16, bh, 0.16]); for (let m = 1; m < bh; m += 0.9) tiny.add(CYL, 0x5a8a2a, [bx, top + m, bz], [0, 0, 0], [0.19, 0.06, 0.19]); tiny.add(BOX, 0x6ab83a, [bx + 0.3, top + bh - 0.3, bz], [0, rnd() * 3, 0.5], [0.7, 0.03, 0.15]); }
      addCollider(x, z, 1.0);
    }
    // 바닷가 야자수 + 조개
    for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, rr = r * (0.82 + rnd() * 0.1), x = jx + Math.cos(a) * rr, z = jz + Math.sin(a) * rr; if (!busy(x, z, 0.3)) palm(x, z, 0.9 + rnd() * 0.4, top); }
    for (let k = 0; k < 20; k++) { const a = rnd() * 6.28, rr = r * (0.93 + rnd() * 0.12); if (rnd() < 0.5) shell(jx + Math.cos(a) * rr, jz + Math.sin(a) * rr, ISLAND_TOP - 0.28); else starfish(jx + Math.cos(a) * rr, jz + Math.sin(a) * rr, ISLAND_TOP - 0.28); }
    // 앞 선착장
    for (let k = 0; k < 8; k++) deco.add(BOX, k % 2 ? 0xb08a61 : 0x9a7a52, [jx, 0.2, jz - r * 0.95 - k * 0.54], [0, 0, 0], [2.0, 0.12, 0.5]);
    for (const s of [-1, 1]) deco.add(CYL, 0x5a4232, [jx + s * 0.9, -0.3, jz - r * 0.95 - 3.6], [0, 0, 0], [0.2, 1.4, 0.2]);
    // 정글섬 안내판
    {
      const sx = jx - 2.6, sz = jz - r * 0.78;
      deco.add(BOX, 0x5a4232, [sx, top + 1.0, sz + 0.14], [0, 0, 0], [0.16, 2.0, 0.16]); // 기둥은 판 뒤에 (글자 안 가리게)
      deco.add(BOX, 0x6a5a3a, [sx, top + 1.7, sz], [0, 0, 0], [2.4, 1.1, 0.1]);
      const c = document.createElement('canvas'); c.width = 512; c.height = 240;
      const g = c.getContext('2d');
      g.fillStyle = '#e8f0c8'; g.fillRect(0, 0, 512, 240);
      g.fillStyle = '#2a4a1a'; g.textAlign = 'center';
      g.font = '46px "Jua", "Malgun Gothic", sans-serif'; g.fillText('정글섬', 256, 62);
      g.font = '26px "Jua", "Malgun Gothic", sans-serif';
      g.fillText('정글 연못의 물고기는 아주 힘이 세요!', 256, 118);
      g.fillText('정글 공방 낚싯대로만 낚을 수 있어요', 256, 158);
      g.fillText('(신전 옆 폭포 연못)', 256, 198);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      board.position.set(sx, top + 1.7, sz - 0.07); board.rotation.y = Math.PI;
      scene.add(board);
      addCollider(sx, sz, 0.3);
    }
    islandInfo.push({ id: 'jungle', name: '정글섬', x: jx, z: jz, r });
  }

  // 모래사장 부두 앞 섬 안내 표지판 (어느 쪽에 어떤 섬이 있는지)
  {
    // 마을에서 바다로 내려오는 길 한가운데, 머리보다 높게 세워서 안 가려지게 (정글섬만 안내해요)
    const sx = -2.6, sz = 19.2;
    for (const ox of [-1.5, 1.5]) deco.add(BOX, 0x5a4232, [sx + ox, 1.6, sz + 0.14], [0, 0, 0], [0.16, 3.4, 0.16]); // 기둥은 판 뒤에
    deco.add(BOX, 0x7a5a3a, [sx, 2.85, sz], [0, 0, 0], [3.4, 1.7, 0.1]);
    deco.add(BOX, 0x3a6a2a, [sx, 3.78, sz], [0, 0, 0], [3.6, 0.16, 0.2]); // 위 지붕띠
    const c = document.createElement('canvas');
    c.width = 640; c.height = 320;
    const g = c.getContext('2d');
    g.fillStyle = '#eef4d4'; g.fillRect(0, 0, 640, 320);
    g.fillStyle = '#2a4a1a'; g.textAlign = 'center';
    const J = islandInfo.find((it) => it.id === 'jungle');
    const dirName = (dx, dz) => { const a = Math.atan2(dx, dz) * 180 / Math.PI; return a > 22.5 && a < 67.5 ? '남동쪽' : a >= 67.5 ? '동쪽' : a < -22.5 && a > -67.5 ? '남서쪽' : a <= -67.5 ? '서쪽' : '남쪽'; };
    g.font = '54px "Jua", "Malgun Gothic", sans-serif'; g.fillText('정글섬 가는 길', 320, 68);
    g.font = '36px "Jua", "Malgun Gothic", sans-serif';
    g.fillText(`바다 건너 ${dirName(J.x - sx, J.z - sz)} ${Math.round(Math.hypot(J.x - sx, J.z - sz))}m`, 320, 136);
    g.font = '28px "Jua", "Malgun Gothic", sans-serif';
    g.fillText('부두 옆 보트 관리인한테 배를 불러서 가요', 320, 196);
    g.fillText('후반 콘텐츠! 정글 공방 낚싯대가 있어야 해요', 320, 246);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    board.position.set(sx, 2.85, sz - 0.07);
    board.rotation.y = Math.PI; // 마을 쪽(북쪽)에서 걸어오면 보이게
    scene.add(board);
    addCollider(sx - 1.5, sz, 0.25); addCollider(sx + 1.5, sz, 0.25);
  }

  // 상호작용 물건 모양 만들기 — 꼭 덩어리로 만들기(build) "전에" 해야 기둥·몸체가 들어가요
  // (예전엔 뒤에 해서 그네·해먹·망원경·상자·징의 몸체가 빠지고 줄·의자만 떠 있었어요)
  for (const t of things) makeThingModel(t);

  // 다 만들었으면 덩어리로 만들어요
  deco.build(scene);
  shiny.build(scene);
  tiny.build(scene, { cast: false });
  tinyShiny.build(scene, { cast: false });
  glow.build(scene, { cast: false, material: glowMat }); // 창문·등불은 빛나는 재질로

  // 방 안인지 (main.js 가 걷기·바닥 높이에 써요)
  const inRoom = (qx, qz) => qz < -300 && houses.some((h) => qx > h.x0 - 0.2 && qx < h.x1 + 0.2 && qz > h.z0 - 1.2 && qz < h.z1 + 0.2);
  return { houses, houseBlockers, zEdge, islands: islandInfo, things, jungleFx, trunks, inRoom };
}
