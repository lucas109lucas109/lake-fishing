// =====================================================
//  맵 꾸미기 — 마을 · 호숫가 · 숲 · 모래사장을 작은 블록 소품으로 가득 채워요
//
//  소품은 구역마다 한 덩어리로 합쳐서 그려요 (수천 개라도 가볍게).
//  자리는 나무 · 가게 · 물 · 부두를 피해서 골라요.
//  단단한 소품(우물 · 분수 · 수레 · 상자)은 부딪히게 해 둬요.
//  나비는 낮에 꽃 근처를 팔랑팔랑 날아다녀요.
// =====================================================
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function setupDecor(ctx) {
  const { THREE, scene, groundY, inLake, onPlateau, colliders, shops, seaWorld, isNight, used } = ctx;
  const WY = ctx.waterY ?? 0.02;

  // ---------- 블록 덩어리 ----------
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function batch() {
    const solid = [], glow = [];
    let built = false;
    const push = (list) => (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
      if (built) { console.warn('[꾸미기] 이미 덩어리로 만든 뒤에 블록을 넣었어요', x, y, z); return; }
      const g = box.clone();
      eu.set(rx, ry, rz, 'YXZ'); q.setFromEuler(eu);
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
      built = true;
      const grp = new THREE.Group();
      if (solid.length) { const m = new THREE.Mesh(mergeGeometries(solid, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); m.castShadow = m.receiveShadow = true; grp.add(m); }
      if (glow.length) { const m = new THREE.Mesh(mergeGeometries(glow, false), new THREE.MeshBasicMaterial({ vertexColors: true })); grp.add(m); }
      solid.forEach((g) => g.dispose()); glow.forEach((g) => g.dispose());
      scene.add(grp);
      return grp;
    };
    return b;
  }
  // 소품 하나를 (x, y, z) 에 ry 만큼 돌려서 놓는 도우미: p(가로, 높이, 세로, 색, 앞뒤x, 높이y, z, 돌림...)
  function at(b, x, y, z, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const put = (fn) => (w, h, d, col, dx, dy, dz, rx = 0, rry = 0, rz = 0) => fn(w, h, d, col, x + dx * c + dz * s, y + dy, z - dx * s + dz * c, rx, ry + rry, rz);
    const p = put(b); p.glow = put(b.glow);
    return p;
  }

  // ---------- 자리 고르기 ----------
  let seed = 9173;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const KEEP_CLEAR = [[0, 8, 4.5], [2, 3, 3.5], [-2, 13, 2.5]];
  const nearShop = (x, z, d) => shops.some((s) => s.group && ((x - s.pos.x) ** 2 + (z - s.pos.z) ** 2 < d * d));
  function spot(boxes, r = 1, opt = {}) {
    for (let i = 0; i < 120; i++) {
      const B = boxes[Math.floor(rnd() * boxes.length)];
      let x, z;
      if (typeof B === 'function') [x, z] = B(); else { x = B[0] + rnd() * (B[1] - B[0]); z = B[2] + rnd() * (B[3] - B[2]); }
      if (opt.water) { if (!inLake(x, z, -1.5)) continue; }
      else {
        if (inLake(x, z, opt.shore ? 0.3 : 1.2) || onPlateau(x, z)) continue;
        if (opt.shore && !inLake(x, z, 3.5)) continue;
        const gy = groundY(x, z);
        if (gy > 0.15 && !opt.anyY) continue;
        if (groundY(x + r, z) > 0.15 || groundY(x - r, z) > 0.15 || groundY(x, z + r) > 0.15 || groundY(x, z - r) > 0.15) continue; // 부두 · 다리 피하기
      }
      if (colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2)) continue;
      if (used.some((u) => (x - u.x) ** 2 + (z - u.z) ** 2 < (u.r + r) ** 2)) continue;
      if (nearShop(x, z, 3.2)) continue;
      if (KEEP_CLEAR.some(([cx, cz, cr]) => (x - cx) ** 2 + (z - cz) ** 2 < (cr + r) ** 2)) continue; // 처음 서는 자리 · 부두 입구는 비워 둬요
      used.push({ x, z, r });
      if (opt.solid) colliders.push({ x, z, r: opt.solid });
      return { x, z, y: opt.water ? WY : groundY(x, z), ry: rnd() * Math.PI * 2 };
    }
    return null;
  }
  const VILLAGE = [[-28, 26, 2, 24]], FOREST = [[-72, -30, -44, 20]];
  const SHORE = [[-30, 28, -32, 4]];
  const LAKE_W = [[-24, 24, -28, 0]];
  const BEACH = [() => { const x = -58 + rnd() * 96; return [x, seaWorld.zEdge(x) - 1.5 - rnd() * 6]; }];

  // ---------- 색 ----------
  const WOOD = 0xa8784a, WOOD_D = 0x7a5432, WOOD_L = 0xc89a64, STONE = 0xa8a49c, STONE_D = 0x86827a, IRON = 0x3a3a42, MOSS = 0x5a8a3a;
  const FLOWERS = [0xff5a7a, 0xffd84a, 0xff8ac8, 0xffffff, 0xff7a3a, 0xb88aff, 0x6ab8ff];

  // =====================================================
  //  소품 모양들
  // =====================================================
  function bench(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const x of [-0.6, 0.6]) { p(0.08, 0.42, 0.08, IRON, x, 0.21, -0.18); p(0.08, 0.42, 0.08, IRON, x, 0.21, 0.18); p(0.08, 0.05, 0.44, IRON, x, 0.42, 0); p(0.08, 0.5, 0.06, IRON, x, 0.7, 0.24, -0.15); p(0.08, 0.06, 0.4, IRON, x, 0.58, 0, 0, 0, 0); }
    for (let k = 0; k < 4; k++) p(1.4, 0.05, 0.1, k % 2 ? WOOD : WOOD_L, 0, 0.46, -0.16 + k * 0.11);
    for (let k = 0; k < 3; k++) p(1.4, 0.1, 0.04, k % 2 ? WOOD : WOOD_L, 0, 0.62 + k * 0.13, 0.26 + k * 0.02, -0.15);
    if (rnd() < 0.4) { p(0.18, 0.06, 0.24, 0xf4f0e8, 0.3, 0.52, 0); p(0.17, 0.01, 0.23, 0xd84a4a, 0.3, 0.555, 0); } // 책 한 권
  }
  function lamp(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(0.34, 0.12, 0.34, IRON, 0, 0.06, 0); p(0.22, 0.2, 0.22, IRON, 0, 0.2, 0);
    p(0.1, 2.3, 0.1, IRON, 0, 1.4, 0);
    for (let k = 0; k < 3; k++) p(0.14, 0.04, 0.14, 0x55555e, 0, 0.6 + k * 0.8, 0);
    p(0.5, 0.06, 0.06, IRON, 0.2, 2.45, 0); p(0.04, 0.2, 0.04, IRON, 0.42, 2.35, 0);
    p(0.3, 0.06, 0.3, IRON, 0.42, 2.25, 0); p.glow(0.22, 0.3, 0.22, 0xffe0a0, 0.42, 2.05, 0); p(0.28, 0.05, 0.28, IRON, 0.42, 1.88, 0);
    p(0.32, 0.08, 0.32, IRON, 0, 2.6, 0); p(0.16, 0.12, 0.16, IRON, 0, 2.7, 0);
    // 걸어 둔 꽃바구니
    p(0.04, 0.3, 0.04, IRON, -0.24, 1.75, 0); p(0.3, 0.16, 0.3, WOOD_D, -0.24, 1.55, 0);
    for (let k = 0; k < 6; k++) p(0.1, 0.1, 0.1, k < 2 ? 0x5aa03a : FLOWERS[Math.floor(rnd() * 7)], -0.24 + (rnd() - 0.5) * 0.24, 1.66 + rnd() * 0.06, (rnd() - 0.5) * 0.24);
    for (let k = 0; k < 3; k++) p(0.05, 0.22, 0.05, 0x4a9a3a, -0.24 + (rnd() - 0.5) * 0.24, 1.42, (rnd() - 0.5) * 0.24); // 늘어진 덩굴
  }
  function planter(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(1.2, 0.36, 0.5, WOOD, 0, 0.18, 0); p(1.26, 0.06, 0.56, WOOD_D, 0, 0.36, 0); p(1.1, 0.04, 0.4, 0x5a3a20, 0, 0.37, 0);
    for (let k = 0; k < 4; k++) p(0.02, 0.3, 0.52, WOOD_D, -0.45 + k * 0.3, 0.18, 0);
    for (let k = 0; k < 12; k++) {
      const x = -0.5 + (k % 6) * 0.2, z = k < 6 ? -0.1 : 0.1, h = 0.18 + rnd() * 0.14, c = FLOWERS[Math.floor(rnd() * 7)];
      p(0.03, h, 0.03, 0x4a9a3a, x, 0.38 + h / 2, z); p(0.1, 0.03, 0.05, 0x5aaa3a, x + 0.04, 0.42, z, 0, 0, -0.5);
      p(0.09, 0.08, 0.09, c, x, 0.4 + h, z); p(0.04, 0.04, 0.04, 0xffe04a, x, 0.45 + h, z);
    }
  }
  function well(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; p(0.44, 0.7, 0.3, k % 2 ? STONE : STONE_D, Math.cos(a) * 0.72, 0.35, Math.sin(a) * 0.72, 0, -a, 0); p(0.46, 0.08, 0.32, 0xc0bcb4, Math.cos(a) * 0.72, 0.74, Math.sin(a) * 0.72, 0, -a, 0); }
    p(1.2, 0.04, 1.2, 0x2a4a6a, 0, 0.5, 0); // 물
    for (const s of [-1, 1]) p(0.12, 1.6, 0.12, WOOD_D, s * 0.8, 1.1, 0);
    p(1.8, 0.1, 0.12, WOOD_D, 0, 1.85, 0); p(0.1, 0.1, 0.9, WOOD, 0, 1.4, 0, 0, Math.PI / 2, 0);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) p(0.5, 0.06, 1.3, k % 2 ? 0xa8483a : 0xc0584a, s * (0.22 + k * 0.12), 2.0 - k * 0.11, 0, 0, 0, s * -0.6); // 지붕
    p(0.02, 0.6, 0.02, 0xd8c8a0, 0, 1.08, 0); p(0.2, 0.2, 0.2, WOOD, 0, 0.78, 0); p(0.22, 0.03, 0.22, IRON, 0, 0.86, 0); // 밧줄 · 양동이
    p(0.06, 0.06, 0.3, IRON, 0.85, 1.4, 0.2); p(0.06, 0.2, 0.06, IRON, 0.85, 1.3, 0.35); // 손잡이
  }
  function fountain(b, P) {
    const p = at(b, P.x, P.y, P.z, 0);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; p(0.62, 0.42, 0.3, k % 2 ? 0xd8d4cc : 0xc8c4bc, Math.cos(a) * 1.55, 0.21, Math.sin(a) * 1.55, 0, -a, 0); p(0.64, 0.06, 0.34, 0xe8e4dc, Math.cos(a) * 1.55, 0.44, Math.sin(a) * 1.55, 0, -a, 0); }
    p.glow(2.8, 0.04, 2.8, 0x6ab8d8, 0, 0.34, 0); p.glow(2.0, 0.045, 2.0, 0x8ad0e8, 0, 0.345, 0);
    p(0.5, 0.8, 0.5, 0xd8d4cc, 0, 0.6, 0); p(1.3, 0.12, 1.3, 0xe0dcd4, 0, 1.0, 0); p(1.1, 0.06, 1.1, 0x8ad0e8, 0, 1.07, 0);
    p(0.3, 0.6, 0.3, 0xd8d4cc, 0, 1.35, 0); p(0.6, 0.1, 0.6, 0xe0dcd4, 0, 1.68, 0);
    p.glow(0.12, 0.5, 0.12, 0xcfeeff, 0, 1.95, 0); p.glow(0.24, 0.08, 0.24, 0xe8f8ff, 0, 2.2, 0); // 솟는 물
    for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.78; p.glow(0.06, 0.5, 0.06, 0xcfeeff, Math.cos(a) * 0.5, 1.3, Math.sin(a) * 0.5, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
    for (let k = 0; k < 10; k++) p(0.06, 0.012, 0.06, k % 3 ? 0xe8c040 : 0xc0c0c8, (rnd() - 0.5) * 2.2, 0.37, (rnd() - 0.5) * 2.2); // 동전
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; p(0.3, 0.28, 0.3, 0x4a9a3a, Math.cos(a) * 2.1, 0.14, Math.sin(a) * 2.1); p(0.1, 0.1, 0.1, FLOWERS[k % 7], Math.cos(a) * 2.1, 0.32, Math.sin(a) * 2.1); }
  }
  function mailbox(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(0.1, 1.0, 0.1, WOOD_D, 0, 0.5, 0); p(0.32, 0.26, 0.46, 0x3a7ad8, 0, 1.1, 0); p(0.34, 0.08, 0.48, 0x2a5aa8, 0, 1.26, 0);
    p(0.02, 0.2, 0.04, 0xd84a4a, 0.18, 1.2, 0.1); p(0.06, 0.06, 0.02, 0xd84a4a, 0.18, 1.3, 0.14); // 깃발
    p(0.2, 0.14, 0.01, 0x1a3a6a, 0, 1.1, -0.235);
    if (rnd() < 0.6) p(0.18, 0.02, 0.12, 0xf4f0e8, 0, 1.25, -0.25, 0.4); // 삐죽 나온 편지
    // 이정표
    p(0.08, 1.6, 0.08, WOOD_D, 0.6, 0.8, 0);
    for (const [y, r, t] of [[1.45, 0.3, 0xd8b884], [1.22, -0.5, 0xc8a874], [0.99, 1.2, 0xd8b884]]) { p(0.7, 0.16, 0.04, t, 0.6 + Math.cos(r) * 0.25, y, Math.sin(r) * 0.25, 0, -r, 0); }
  }
  function crates(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const crate = (x, y, z, s, r) => { p(s, s, s, WOOD_L, x, y + s / 2, z, 0, r, 0); for (const yy of [0.08, 0.92]) p(s + 0.02, s * 0.1, s + 0.02, WOOD_D, x, y + s * yy, z, 0, r, 0); p(s * 1.02, s * 0.1, s * 1.02, WOOD_D, x, y + s / 2, z, 0, r + 0.78, 0.0); };
    crate(0, 0, 0, 0.6, 0); crate(0.65, 0, 0.1, 0.5, 0.3); crate(0.15, 0.6, 0.05, 0.45, -0.2);
    const barrel = (x, z) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; p(0.2, 0.8, 0.12, k % 2 ? 0x9a6a3a : 0x8a5a2a, x + Math.cos(a) * 0.24, 0.4, z + Math.sin(a) * 0.24, 0, -a + 1.57, 0); } for (const y of [0.15, 0.65]) p(0.56, 0.06, 0.56, IRON, x, y, z); p(0.46, 0.04, 0.46, 0x7a4a22, x, 0.79, z); };
    barrel(-0.7, 0.3); if (rnd() < 0.6) barrel(-0.6, -0.45);
    if (rnd() < 0.5) for (let k = 0; k < 5; k++) p(0.12, 0.12, 0.12, [0xe8303a, 0xffa020, 0x7ac83a][k % 3], 0.65 + (rnd() - 0.5) * 0.3, 0.55, 0.1 + (rnd() - 0.5) * 0.3); // 상자 위 과일
  }
  function fruitCart(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(1.6, 0.12, 0.9, WOOD, 0, 0.6, 0); p(1.6, 0.3, 0.06, WOOD_D, 0, 0.78, -0.45); p(1.6, 0.3, 0.06, WOOD_D, 0, 0.78, 0.45); p(0.06, 0.3, 0.9, WOOD_D, 0.8, 0.78, 0); p(0.06, 0.3, 0.9, WOOD_D, -0.8, 0.78, 0);
    for (const s of [-1, 1]) { for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; p(0.06, 0.18, 0.06, WOOD_D, -0.4 + Math.cos(a) * 0.22, 0.32 + Math.sin(a) * 0.22, s * 0.5, 0, 0, -a); } p(0.1, 0.1, 0.12, IRON, -0.4, 0.32, s * 0.5); }
    p(0.1, 0.5, 0.1, WOOD_D, 0.7, 0.3, 0); // 받침
    for (const s of [-1, 1]) p(0.06, 1.3, 0.06, WOOD_D, s * 0.75, 1.4, 0.4);
    for (let k = 0; k < 6; k++) p(0.28, 0.04, 1.1, k % 2 ? 0xffffff : 0xe84a5a, -0.7 + k * 0.28, 2.1, 0.1, 0.3, 0, 0); // 줄무늬 차양
    const fruits = [[0xe8303a, 0.13], [0xffa020, 0.14], [0x7ac83a, 0.12], [0xffe04a, 0.1], [0x8a3ab8, 0.08]];
    for (let k = 0; k < 40; k++) { const [c, s] = fruits[k % 5]; p(s, s, s, c, -0.7 + rnd() * 1.4, 0.72 + rnd() * 0.18, -0.36 + rnd() * 0.72); }
    p(0.5, 0.2, 0.04, 0xf4ecd8, 0, 1.1, 0.48); // 가격표
  }
  function birdhouse(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(0.08, 1.7, 0.08, WOOD_D, 0, 0.85, 0);
    const c = [0xf4c84a, 0x6ab8e8, 0xe87a8a, 0x8ad87a][Math.floor(rnd() * 4)];
    p(0.36, 0.36, 0.36, c, 0, 1.88, 0); p(0.12, 0.12, 0.02, 0x2a1a10, 0, 1.92, -0.185); p(0.03, 0.03, 0.1, WOOD_D, 0, 1.8, -0.22);
    for (const s of [-1, 1]) p(0.3, 0.04, 0.44, 0xa8483a, s * 0.13, 2.13, 0, 0, 0, s * -0.7);
    if (rnd() < 0.6) { p(0.1, 0.08, 0.14, 0x8a6a4a, 0, 2.3, 0.05); p(0.06, 0.06, 0.06, 0x8a6a4a, 0, 2.36, -0.04); p(0.03, 0.02, 0.04, 0xffa020, 0, 2.36, -0.08); } // 지붕 위 참새
  }
  function veggieGarden(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(2.4, 0.08, 1.6, 0x6a4a2a, 0, 0.04, 0);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
      const x = -1.0 + k * 0.4, z = -0.5 + r * 0.5;
      if (r === 0) { p(0.14, 0.12, 0.14, 0x4aaa3a, x, 0.14, z); p(0.04, 0.14, 0.04, 0xff8a2a, x, 0.06, z); } // 당근
      else if (r === 1) { p(0.24, 0.18, 0.24, 0x8ad86a, x, 0.17, z); p(0.18, 0.12, 0.18, 0xb8f08a, x, 0.26, z); } // 양배추
      else { p(0.03, 0.4, 0.03, 0x8a6a4a, x, 0.28, z); p(0.14, 0.14, 0.14, 0x4a9a3a, x, 0.3, z); p(0.08, 0.08, 0.08, 0xe8303a, x + 0.05, 0.25, z - 0.05); } // 토마토
    }
    for (let k = 0; k <= 6; k++) { p(0.06, 0.4, 0.06, 0xf4ecdc, -1.25 + k * 0.42, 0.2, -0.85); p(0.06, 0.4, 0.06, 0xf4ecdc, -1.25 + k * 0.42, 0.2, 0.85); }
    for (const z of [-0.85, 0.85]) for (const y of [0.15, 0.32]) p(2.6, 0.04, 0.03, 0xf4ecdc, 0, y, z);
    p(0.4, 0.06, 0.25, 0x8a8a92, 1.5, 0.2, 0.4); p(0.05, 0.4, 0.05, WOOD, 1.5, 0.4, 0.55, 0.3); // 물뿌리개 대신 삽
    p(0.24, 0.2, 0.18, 0x5ab8a8, 1.5, 0.1, -0.4); p(0.18, 0.04, 0.04, 0x5ab8a8, 1.66, 0.18, -0.4, 0, 0, 0.6); // 물뿌리개
  }
  function bicycle(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const z of [-0.5, 0.5]) for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.28; p(0.04, 0.1, 0.04, 0x2a2a2e, 0.15, 0.32 + Math.sin(a) * 0.3, z + Math.cos(a) * 0.3, a, 0, 0); }
    const fc = [0xe84a5a, 0x4ab8e8, 0x8ad87a][Math.floor(rnd() * 3)];
    p(0.04, 0.04, 0.8, fc, 0.15, 0.62, 0, -0.3); p(0.04, 0.5, 0.04, fc, 0.15, 0.55, -0.1, 0.2); p(0.04, 0.5, 0.04, fc, 0.15, 0.55, 0.45, -0.3);
    p(0.1, 0.04, 0.2, 0x2a2a2e, 0.15, 0.82, -0.15); p(0.4, 0.04, 0.04, 0x8a8a92, 0.15, 0.9, 0.48); // 안장 · 손잡이
    p(0.28, 0.2, 0.24, WOOD_L, 0.15, 0.85, 0.65); for (let k = 0; k < 5; k++) p(0.08, 0.08, 0.08, FLOWERS[k], 0.08 + (k % 3) * 0.07, 0.98, 0.6 + Math.floor(k / 3) * 0.1); // 꽃바구니
    p(0.04, 0.32, 0.04, 0x2a2a2e, 0.25, 0.16, -0.1, 0, 0, 0.3); // 받침대
  }
  // ---------- 호숫가 ----------
  function reeds(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 9; k++) {
      const x = (rnd() - 0.5) * 0.9, z = (rnd() - 0.5) * 0.9, h = 0.7 + rnd() * 0.8, lean = (rnd() - 0.5) * 0.3;
      p(0.04, h, 0.04, 0x6a9a3a, x, h / 2, z, lean, 0, lean * 0.5);
      if (k % 2 === 0) { p(0.08, 0.24, 0.08, 0x6a4022, x + lean * h * 0.5, h + 0.05, z); p(0.02, 0.1, 0.02, 0x6a9a3a, x + lean * h * 0.5, h + 0.22, z); } // 부들 이삭
      else p(0.12, 0.5, 0.02, 0x7aaa4a, x + 0.04, h * 0.5, z, 0, rnd() * 3, 0.3);
    }
  }
  function steppingStones(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 5; k++) { const s = 0.4 + rnd() * 0.2; p(s, 0.1, s * 0.85, k % 2 ? STONE : 0xb8b4ac, (k - 2) * 0.6, 0.05, Math.sin(k * 1.3) * 0.3, 0, rnd() * 3, 0); p(s * 0.3, 0.02, s * 0.3, MOSS, (k - 2) * 0.6 + 0.08, 0.105, Math.sin(k * 1.3) * 0.3); }
  }
  function gearRack(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const s of [-1, 1]) p(0.1, 1.5, 0.1, WOOD_D, s * 0.7, 0.75, 0);
    p(1.6, 0.1, 0.1, WOOD_D, 0, 1.4, 0); p(1.6, 0.08, 0.08, WOOD_D, 0, 0.5, 0);
    for (let k = 0; k < 4; k++) { const c = [0xd84a4a, 0x4a8ad8, 0xf0c040, 0x5ab85a][k]; p(0.04, 1.8, 0.04, 0x8a6a4a, -0.5 + k * 0.33, 1.0, 0.1, 0.12); p(0.07, 0.25, 0.07, c, -0.5 + k * 0.33, 0.35, 0.03, 0.12); p(0.06, 0.06, 0.06, 0xc0c0c8, -0.5 + k * 0.33 + 0.05, 0.55, 0.05); }
    for (let k = 0; k < 6; k++) p(0.02, 0.6, 0.02, 0xd8c8a0, -0.6 + k * 0.08, 1.1, -0.06, 0, 0, (k - 3) * 0.1); // 걸어 둔 그물
    p(0.5, 0.02, 0.4, 0xd8c8a0, -0.4, 0.82, -0.08, 0.3);
    p(0.5, 0.3, 0.35, 0x4a7aa8, 0.6, 0.15, -0.5); p(0.52, 0.06, 0.37, 0xf4f0e8, 0.6, 0.33, -0.5); // 아이스박스
  }
  function rowboat(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const c = [0x4a8ad8, 0xe86a4a, 0x5ab88a][Math.floor(rnd() * 3)];
    p(0.9, 0.08, 2.0, WOOD_D, 0, 0.08, 0, 0, 0, 0.15);
    for (const s of [-1, 1]) { p(0.08, 0.36, 2.0, c, s * 0.46, 0.25, 0, 0, 0, s * -0.2 + 0.15); p(0.1, 0.05, 2.04, 0xf4f0e8, s * 0.5, 0.44, 0, 0, 0, 0.15); }
    p(0.9, 0.36, 0.08, c, 0, 0.25, -1.0, 0, 0, 0.15); p(0.5, 0.3, 0.08, c, 0, 0.28, 1.02, 0, 0, 0.15);
    p(0.86, 0.05, 0.25, WOOD, 0, 0.35, 0.2, 0, 0, 0.15); p(0.86, 0.05, 0.25, WOOD, 0, 0.35, -0.5, 0, 0, 0.15);
    p(0.06, 0.06, 1.6, WOOD_L, 0.25, 0.42, 0, 0, 0.3, 0.15); p(0.16, 0.04, 0.4, WOOD_L, 0.37, 0.42, 0.75, 0, 0.3, 0.15); // 노
    p(0.04, 0.04, 0.8, 0xd8c8a0, -0.3, 0.06, -1.4, 0, 0.4, 0); // 밧줄
  }
  function lilyPads(b, P) {
    const p = at(b, P.x, P.y + 0.015, P.z, P.ry);
    for (let k = 0; k < 6; k++) {
      const x = (rnd() - 0.5) * 2.2, z = (rnd() - 0.5) * 2.2, s = 0.35 + rnd() * 0.3;
      p(s, 0.02, s, k % 2 ? 0x3a8a3a : 0x4a9a42, x, 0, z, 0, rnd() * 3, 0);
      p(s * 0.5, 0.025, s * 0.08, 0x2a6a2a, x + s * 0.22, 0.001, z, 0, rnd() * 3, 0);
      if (k % 3 === 0) { // 연꽃
        const c = rnd() < 0.5 ? 0xffb8d0 : 0xffffff;
        for (let j = 0; j < 6; j++) { const a = (j / 6) * 6.28; p(0.08, 0.06, 0.04, c, x + Math.cos(a) * 0.06, 0.06, z + Math.sin(a) * 0.06, 0.5, -a, 0); }
        p(0.06, 0.05, 0.06, 0xffe04a, x, 0.08, z);
      }
    }
  }
  function duckFamily(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const duck = (x, z, s, c) => { p(0.3 * s, 0.18 * s, 0.4 * s, c, x, 0.07 * s, z); p(0.18 * s, 0.18 * s, 0.18 * s, c === 0xf4f0e8 ? 0x2a7a4a : c, x, 0.24 * s, z + 0.16 * s); p(0.1 * s, 0.04 * s, 0.1 * s, 0xffa020, x, 0.22 * s, z + 0.28 * s); p(0.04 * s, 0.04 * s, 0.02 * s, 0x111111, x + 0.07 * s, 0.27 * s, z + 0.24 * s); p(0.04 * s, 0.04 * s, 0.02 * s, 0x111111, x - 0.07 * s, 0.27 * s, z + 0.24 * s); p(0.1 * s, 0.1 * s, 0.08 * s, c, x, 0.14 * s, z - 0.22 * s, -0.5); };
    duck(0, 0, 1.4, 0xf4f0e8);
    for (let k = 1; k <= 4; k++) duck(Math.sin(k) * 0.15, -k * 0.45, 0.7, 0xffe04a);
  }
  // ---------- 숲 ----------
  function fairyRing(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * 6.28, r = 1.1 + (rnd() - 0.5) * 0.2, h = 0.12 + rnd() * 0.14, c = k % 3 ? 0xd84a3a : 0xf0c8a0;
      p(0.05, h, 0.05, 0xf4ecdc, Math.cos(a) * r, h / 2, Math.sin(a) * r);
      p(0.2, 0.08, 0.2, c, Math.cos(a) * r, h + 0.04, Math.sin(a) * r); p(0.12, 0.05, 0.12, c, Math.cos(a) * r, h + 0.1, Math.sin(a) * r);
      if (c === 0xd84a3a) p(0.04, 0.02, 0.04, 0xffffff, Math.cos(a) * r + 0.05, h + 0.13, Math.sin(a) * r);
    }
    for (let k = 0; k < 6; k++) p.glow(0.03, 0.03, 0.03, 0xfff0a0, (rnd() - 0.5) * 1.4, 0.4 + rnd() * 0.6, (rnd() - 0.5) * 1.4); // 요정 불빛
  }
  function mossLog(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; p(2.4, 0.18, 0.14, k % 2 ? 0x7a5432 : 0x6a4428, 0, 0.3 + Math.sin(a) * 0.26, Math.cos(a) * 0.26, a); }
    for (const x of [-1.2, 1.2]) { p(0.04, 0.5, 0.5, 0xc8a070, x, 0.3, 0); for (let r = 1; r < 3; r++) p(0.042, 0.5 - r * 0.15, 0.04, 0x9a7048, x, 0.3, 0); }
    for (let k = 0; k < 10; k++) p(0.3 + rnd() * 0.3, 0.06, 0.25, k % 2 ? MOSS : 0x6a9a4a, -1 + rnd() * 2, 0.56, (rnd() - 0.5) * 0.3);
    for (let k = 0; k < 3; k++) { const x = -0.8 + k * 0.7; p(0.03, 0.12, 0.03, 0xf4ecdc, x, 0.62, 0.16); p(0.12, 0.04, 0.12, 0xc89a5a, x, 0.69, 0.16); } // 작은 버섯
    p(0.4, 0.3, 0.05, 0x5aa03a, -1.0, 0.15, 0.32, 0, 0, 0.4); p(0.4, 0.3, 0.05, 0x5aa03a, 0.6, 0.15, -0.32, 0, 0, -0.4); // 고사리
  }
  function stump(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; p(0.24, 0.5, 0.2, k % 2 ? 0x7a5432 : 0x6a4428, Math.cos(a) * 0.28, 0.25, Math.sin(a) * 0.28, 0, -a, 0); }
    p(0.62, 0.04, 0.62, 0xc8a070, 0, 0.5, 0); p(0.4, 0.045, 0.4, 0xb08a5a, 0, 0.5, 0); p(0.2, 0.05, 0.2, 0xc8a070, 0, 0.5, 0);
    for (const a of [0.3, 2.4, 4.4]) p(0.5, 0.14, 0.14, 0x6a4428, Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45, 0, -a, 0); // 뿌리
    if (rnd() < 0.6) { p(0.05, 0.5, 0.05, WOOD_L, 0.1, 0.72, 0, 0, 0, 0.3); p(0.18, 0.14, 0.03, 0xb8bcc4, 0.0, 0.52, 0, 0, 0, 0.3); } // 꽂아 둔 도끼
    else { p(0.12, 0.12, 0.16, 0x8a6a4a, 0, 0.6, 0); p(0.06, 0.08, 0.06, 0x8a6a4a, 0, 0.68, 0.08); p(0.12, 0.04, 0.06, 0x6a4a2a, 0, 0.63, -0.12); } // 다람쥐
  }
  function campsite(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const s of [-1, 1]) p(0.06, 1.5, 2.0, 0x4a8a5a, s * 0.48, 0.62, 0, 0, 0, s * 0.62);
    p(0.06, 0.06, 2.1, WOOD_D, 0, 1.3, 0); p(0.9, 1.1, 0.04, 0x3a7a4a, 0, 0.5, 0.98); p(0.36, 0.8, 0.05, 0x2a2a2a, 0, 0.4, -0.99); // 텐트
    p(0.8, 0.06, 1.6, 0xd84a5a, 0, 0.04, 0); // 침낭
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; p(0.18, 0.12, 0.18, STONE_D, Math.cos(a) * 0.4, 0.06, -2.2 + Math.sin(a) * 0.4); } // 모닥불 돌
    for (let k = 0; k < 3; k++) p(0.07, 0.07, 0.6, WOOD_D, 0, 0.1, -2.2, 0, k * 1.05, 0.3);
    p.glow(0.18, 0.3, 0.18, 0xffa030, 0, 0.25, -2.2); p.glow(0.1, 0.2, 0.1, 0xffe080, 0, 0.35, -2.2);
    for (const [x, z, r] of [[-1.2, -2.2, 0], [1.2, -2.2, 0], [0, -3.4, 1.57]]) { p(1.0, 0.3, 0.3, 0x7a5432, x, 0.15, z, 0, r, 0); p(1.02, 0.02, 0.2, 0xc8a070, x, 0.31, z, 0, r, 0); } // 통나무 의자
    p(0.3, 0.3, 0.25, 0x6a8ad8, 1.0, 0.15, 0.6); p(0.08, 0.08, 0.3, 0xa8a8b0, 0.9, 0.25, -2.6, 0.2); // 배낭 · 주전자
  }
  function mossRock(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const s = 0.6 + rnd() * 0.7;
    p(s, s * 0.6, s * 0.8, STONE_D, 0, s * 0.3, 0, 0.1, 0, 0.1); p(s * 0.7, s * 0.4, s * 0.6, STONE, s * 0.25, s * 0.5, 0.05, 0, 0.4, 0);
    p(s * 0.8, 0.06, s * 0.6, MOSS, 0, s * 0.62, 0); p(s * 0.4, 0.05, s * 0.4, 0x6aaa4a, s * 0.2, s * 0.72, 0);
    for (let k = 0; k < 4; k++) { const a = rnd() * 6.28; p(0.35, 0.28, 0.04, 0x4a9a3a, Math.cos(a) * s * 0.6, 0.14, Math.sin(a) * s * 0.6, 0, -a, 0.5); } // 고사리
  }
  function berryBush(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 7; k++) { const s = 0.4 + rnd() * 0.3; p(s, s * 0.8, s, k % 2 ? 0x3a7a3a : 0x4a8a3a, (rnd() - 0.5) * 0.6, 0.3 + rnd() * 0.25, (rnd() - 0.5) * 0.6, 0, rnd() * 3, 0); }
    const c = rnd() < 0.5 ? 0xd8203a : 0x4a5ad8;
    for (let k = 0; k < 14; k++) p(0.07, 0.07, 0.07, c, (rnd() - 0.5) * 0.8, 0.25 + rnd() * 0.5, (rnd() - 0.5) * 0.8);
  }
  function owlPost(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(0.16, 1.4, 0.16, WOOD_D, 0, 0.7, 0); p(0.5, 0.06, 0.6, WOOD_D, 0, 1.4, 0.1); p(0.7, 0.04, 0.04, WOOD_D, 0, 1.25, 0.2, 0, 0, 0.3);
    p(0.3, 0.36, 0.28, 0x8a6a4a, 0, 1.62, 0); p(0.26, 0.24, 0.26, 0x9a7a5a, 0, 1.9, 0);
    for (const s of [-1, 1]) { p(0.1, 0.1, 0.02, 0xf4e8c8, s * 0.06, 1.92, -0.135); p.glow(0.05, 0.05, 0.02, 0xffc020, s * 0.06, 1.92, -0.145); p(0.06, 0.08, 0.06, 0x8a6a4a, s * 0.1, 2.04, 0); }
    p(0.04, 0.05, 0.04, 0xe8a030, 0, 1.86, -0.15); p(0.2, 0.2, 0.02, 0xc8a882, 0, 1.6, -0.145);
  }
  function forestSign(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const s of [-1, 1]) p(0.1, 1.2, 0.1, WOOD_D, s * 0.5, 0.6, 0);
    p(1.3, 0.5, 0.08, WOOD_L, 0, 1.0, 0); p(1.36, 0.06, 0.1, WOOD_D, 0, 1.27, 0); p(1.36, 0.06, 0.1, WOOD_D, 0, 0.74, 0);
    for (let k = 0; k < 3; k++) p(0.2 + k * 0.05, 0.05, 0.01, 0x3a2a1a, -0.3 + k * 0.28, 1.0, -0.045); // 글씨 (선 모양)
    p(0.14, 0.14, 0.01, 0x4a8a3a, 0.48, 1.05, -0.045); p(0.14, 0.14, 0.01, 0x4a8a3a, -0.5, 0.95, -0.045, 0, 0, 0.78);
    for (let k = 0; k < 5; k++) p(0.08, 0.08, 0.08, FLOWERS[k], (rnd() - 0.5) * 1.2, 0.05, (rnd() - 0.5) * 0.5);
  }
  // ---------- 모래사장 ----------
  function sandcastle(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const S = 0xe8d4a0, S2 = 0xd8c490;
    p(1.0, 0.3, 1.0, S, 0, 0.15, 0); p(0.7, 0.3, 0.7, S2, 0, 0.45, 0); p(0.4, 0.3, 0.4, S, 0, 0.75, 0);
    for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) { p(0.22, 0.6, 0.22, S2, x, 0.3, z); for (const s of [-1, 1]) p(0.06, 0.08, 0.06, S, x + s * 0.07, 0.64, z); }
    p(0.02, 0.4, 0.02, 0x8a6a4a, 0, 1.1, 0); p(0.2, 0.12, 0.01, 0xe84a5a, 0.1, 1.24, 0); // 깃발
    p(0.2, 0.25, 0.04, 0x8a6a4a, 0, 0.12, -0.5); // 문
    p(0.3, 0.2, 0.3, 0x4ab8e8, 1.0, 0.1, 0.3); p(0.06, 0.3, 0.06, 0xf0c040, 1.0, 0.3, 0.5, 0.4); // 양동이 · 삽
    for (let k = 0; k < 4; k++) p(0.08, 0.03, 0.06, [0xffe0d0, 0xffc0a0, 0xf4f0e8][k % 3], (rnd() - 0.5) * 1.6, 0.02, (rnd() - 0.5) * 1.6);
  }
  function deckChair(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    const c = [0x4ab8e8, 0xe84a5a, 0xf0c040, 0x5ac88a][Math.floor(rnd() * 4)];
    for (const s of [-1, 1]) { p(0.05, 0.05, 1.2, WOOD, s * 0.28, 0.25, 0, -0.2); p(0.05, 0.5, 0.05, WOOD, s * 0.28, 0.25, 0.45); p(0.05, 0.3, 0.05, WOOD, s * 0.28, 0.15, -0.4); }
    for (let k = 0; k < 5; k++) p(0.55, 0.02, 0.24, k % 2 ? c : 0xffffff, 0, 0.3 + k * 0.1, -0.35 + k * 0.22, -0.45);
    p(0.4, 0.04, 0.6, k2(c), 0.8, 0.02, 0); p(0.2, 0.1, 0.2, 0xf4f0e8, 0.8, 0.07, -0.2); p(0.08, 0.2, 0.08, 0x8ad8f0, 0.5, 0.1, 0.4); // 수건 · 모자 · 음료
  }
  const k2 = (c) => (c === 0xe84a5a ? 0x4ab8e8 : 0xe84a5a);
  function lifeguard(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) p(0.12, 2.2, 0.12, 0xf4f0e8, x, 1.1, z);
    for (const y of [0.7, 1.5]) { p(1.3, 0.06, 0.06, 0xf4f0e8, 0, y, -0.6, 0, 0, 0.6); p(1.3, 0.06, 0.06, 0xf4f0e8, 0, y, 0.6, 0, 0, -0.6); }
    p(1.6, 0.1, 1.6, WOOD, 0, 2.25, 0);
    for (const [x, z, w, d] of [[0, 0.8, 1.6, 0.06], [0.8, 0, 0.06, 1.6], [-0.8, 0, 0.06, 1.6]]) p(w, 0.5, d, 0xe84a3a, x, 2.55, z);
    p(1.3, 0.04, 0.04, 0xffffff, 0, 2.6, 0.82);
    for (const s of [-1, 1]) p(0.08, 1.2, 0.08, WOOD_D, s * 0.7, 2.9, -0.7);
    for (let k = 0; k < 4; k++) p(0.5, 0.06, 1.8, k % 2 ? 0xffffff : 0xe84a3a, -0.6 + k * 0.4, 3.5, 0, 0, 0, 0.0);
    // 사다리: 땅(z -1.6)에서 탑 앞(z -0.7)으로 비스듬히 올라가요 · 양옆 기둥 + 디딤판
    for (const s of [-1, 1]) p(0.08, 2.4, 0.08, WOOD_D, s * 0.32, 1.1, -1.15, 0.388);
    for (let k = 0; k < 7; k++) { const y = 0.25 + k * 0.32; p(0.6, 0.05, 0.16, WOOD_D, 0, y, -1.6 + y * 0.409); }
    p(0.4, 0.4, 0.06, 0xff6a2a, 0.82, 1.9, 0, 0, 1.57, 0); p(0.2, 0.2, 0.07, 0xffffff, 0.82, 1.9, 0, 0, 1.57, 0); // 구명튜브
    p(0.02, 0.6, 0.02, 0x8a8a92, 0.6, 3.9, 0.6); p(0.3, 0.2, 0.01, 0xe84a3a, 0.75, 4.1, 0.6);
  }
  function surfboards(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 3; k++) {
      const c = [0x4ab8e8, 0xf0c040, 0xe86a8a, 0x5ac88a][(k + Math.floor(rnd() * 4)) % 4];
      const x = (k - 1) * 0.45, lean = (k - 1) * 0.12;
      p(0.36, 1.7, 0.06, c, x, 0.8, 0, 0, 0, lean); p(0.26, 0.15, 0.065, c, x + lean * 1.7 * 0.5, 1.7, 0, 0, 0, lean);
      p(0.06, 1.6, 0.07, 0xffffff, x, 0.8, 0, 0, 0, lean);
    }
  }
  function volleyNet(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (const s of [-1, 1]) p(0.1, 2.2, 0.1, 0xf4f0e8, s * 2.4, 1.1, 0);
    p(4.8, 0.08, 0.03, 0xffffff, 0, 2.1, 0); p(4.8, 0.06, 0.03, 0xffffff, 0, 1.5, 0);
    for (let k = 0; k < 16; k++) p(0.015, 0.6, 0.015, 0xe8e8e8, -2.25 + k * 0.3, 1.8, 0);
    for (let k = 0; k < 3; k++) p(4.8, 0.015, 0.015, 0xe8e8e8, 0, 1.65 + k * 0.15, 0);
    for (let k = 0; k < 3; k++) { p(0.3, 0.3, 0.3, [0xffffff, 0xf0c040, 0x4ab8e8][k], 1.5 + (k === 1 ? 0.07 : 0), 0.15, 1.6 + (k === 2 ? 0.07 : 0)); } // 공 (세 겹으로 줄무늬)
    for (let k = 0; k < 12; k++) p(0.12, 0.02, 0.12, 0xf4f0e8, -2.5 + k * 0.45, 0.01, -2.5); for (let k = 0; k < 12; k++) p(0.12, 0.02, 0.12, 0xf4f0e8, -2.5 + k * 0.45, 0.01, 2.5); // 코트 줄
  }
  function crab(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    p(0.3, 0.12, 0.22, 0xe8502a, 0, 0.08, 0); p(0.24, 0.05, 0.16, 0xf06a3a, 0, 0.15, 0);
    for (const s of [-1, 1]) { p(0.03, 0.08, 0.03, 0xe8502a, s * 0.05, 0.2, -0.08); p(0.04, 0.04, 0.04, 0x111111, s * 0.05, 0.25, -0.08); p(0.14, 0.06, 0.06, 0xe8502a, s * 0.2, 0.1, -0.12, 0, s * 0.5, 0); p(0.08, 0.08, 0.08, 0xf06a3a, s * 0.26, 0.12, -0.2); for (let k = 0; k < 3; k++) p(0.12, 0.03, 0.03, 0xd8402a, s * 0.2, 0.04, -0.04 + k * 0.07, 0, 0, s * 0.4); }
  }
  function driftPile(b, P) {
    const p = at(b, P.x, P.y, P.z, P.ry);
    for (let k = 0; k < 5; k++) p(1.2 + rnd() * 0.8, 0.12 + rnd() * 0.06, 0.14, k % 2 ? 0xc8b498 : 0xb8a488, (rnd() - 0.5) * 0.4, 0.07 + k * 0.08, (rnd() - 0.5) * 0.4, 0, rnd() * 3, 0);
    for (let k = 0; k < 5; k++) p(0.08, 0.03, 0.07, [0xffe0d0, 0xffc0a0, 0xf4f0e8, 0xe8b8ff][k % 4], (rnd() - 0.5) * 1.4, 0.02, (rnd() - 0.5) * 1.4); // 조개
    p(0.24, 0.03, 0.24, 0xff8a5a, 0.6, 0.02, 0.4, 0, 0.6, 0); p(0.24, 0.03, 0.08, 0xff8a5a, 0.6, 0.021, 0.4, 0, 1.6, 0); // 불가사리
  }

  // =====================================================
  //  놓기 (구역마다 한 덩어리)
  // =====================================================
  const place = (b, fn, boxes, n, r, opt) => { let k = 0; for (let i = 0; i < n; i++) { const P = spot(boxes, r, opt); if (P) { fn(b, P); k++; } } return k; };
  {
    const b = batch();
    place(b, fountain, [[-6, 6, 13, 21]], 1, 2.6, { solid: 2.2 });
    place(b, well, VILLAGE, 1, 1.4, { solid: 1.1 });
    place(b, bench, VILLAGE, 8, 1.0);
    place(b, lamp, VILLAGE, 10, 0.5, { solid: 0.2 });
    place(b, planter, VILLAGE, 10, 0.8);
    place(b, mailbox, VILLAGE, 3, 0.9, { solid: 0.25 });
    place(b, crates, VILLAGE, 6, 1.0, { solid: 0.8 });
    place(b, fruitCart, VILLAGE, 2, 1.4, { solid: 1.1 });
    place(b, birdhouse, VILLAGE, 4, 0.4, { solid: 0.15 });
    place(b, veggieGarden, VILLAGE, 3, 1.6);
    place(b, bicycle, VILLAGE, 2, 0.8);
    b.build();
  }
  {
    const b = batch();
    place(b, reeds, SHORE, 26, 0.6, { shore: true });
    place(b, steppingStones, SHORE, 5, 1.4, { shore: true });
    place(b, gearRack, SHORE, 3, 1.0, { shore: true, solid: 0.7 });
    place(b, rowboat, SHORE, 2, 1.2, { shore: true, solid: 0.8 });
    place(b, lilyPads, LAKE_W, 14, 1.4, { water: true });
    place(b, duckFamily, LAKE_W, 3, 1.4, { water: true });
    b.build();
  }
  {
    const b = batch();
    place(b, fairyRing, FOREST, 5, 1.4);
    place(b, mossLog, FOREST, 8, 1.4, { solid: 0.6 });
    place(b, stump, FOREST, 6, 0.6, { solid: 0.45 });
    place(b, campsite, FOREST, 1, 3.0, { solid: 1.0 });
    place(b, mossRock, FOREST, 14, 0.9, { solid: 0.5 });
    place(b, berryBush, FOREST, 10, 0.6);
    place(b, owlPost, FOREST, 3, 0.5, { solid: 0.2 });
    place(b, forestSign, FOREST, 3, 0.8, { solid: 0.3 });
    b.build();
  }
  {
    const b = batch();
    place(b, sandcastle, BEACH, 4, 1.2, { anyY: true });
    place(b, deckChair, BEACH, 5, 1.0, { anyY: true });
    place(b, lifeguard, BEACH, 1, 1.6, { anyY: true, solid: 1.0 });
    place(b, surfboards, BEACH, 3, 0.8, { anyY: true, solid: 0.4 });
    place(b, volleyNet, BEACH, 1, 3.0, { anyY: true });
    place(b, crab, BEACH, 10, 0.3, { anyY: true });
    place(b, driftPile, BEACH, 5, 1.0, { anyY: true });
    b.build();
  }

  // =====================================================
  //  나비 (낮에 꽃 근처를 팔랑팔랑)
  // =====================================================
  const flies = [];
  const wingGeo = new THREE.PlaneGeometry(0.16, 0.12); wingGeo.translate(0.08, 0, 0);
  const BUTTER = [0xffd84a, 0xff8ac8, 0x8ad8ff, 0xffffff, 0xffa04a, 0xb88aff];
  for (let i = 0; i < 28; i++) {
    const P = spot([...VILLAGE, ...FOREST], 0.1) || { x: 0, z: 10, y: 0 };
    used.pop(); // 나비는 자리를 차지하지 않아요
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: BUTTER[i % BUTTER.length], side: THREE.DoubleSide });
    const L = new THREE.Mesh(wingGeo, m), R = new THREE.Mesh(wingGeo, m);
    R.scale.x = -1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
    g.add(L, R, body);
    g.userData.dynamic = true;
    scene.add(g);
    flies.push({ g, L, R, hx: P.x, hz: P.z, hy: P.y, ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.5 });
  }

  return {
    update(dt, t) {
      const day = !isNight();
      for (const f of flies) {
        f.g.visible = day;
        if (!day) continue;
        const a = t * f.sp + f.ph;
        const x = f.hx + Math.sin(a) * 2.2 + Math.sin(a * 2.3) * 0.6, z = f.hz + Math.cos(a * 0.8) * 2.2;
        const y = f.hy + 0.7 + Math.sin(a * 3.1) * 0.35 + Math.sin(t * 9 + f.ph) * 0.05;
        f.g.rotation.y = Math.atan2(x - f.g.position.x, z - f.g.position.z);
        f.g.position.set(x, y, z);
        const flap = Math.sin(t * 22 + f.ph) * 1.1;
        f.L.rotation.z = flap; f.R.rotation.z = -flap;
      }
    }
  };
}
