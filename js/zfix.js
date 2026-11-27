// =====================================================
//  겹쳐 보이는 면 고치기 (z-fighting)
//
//  두 블록의 면이 "똑같은 높이(같은 평면)"에 겹쳐 있으면, 컴퓨터가 어느 쪽이 앞인지
//  못 정해서 줄무늬처럼 지글지글 깜빡여요 (난간 위 장식, 땅 위 텃밭 흙 같은 곳).
//  블록 수가 너무 많아서 하나하나 손으로 고치는 대신,
//  게임이 움직이지 않는 블록을 한 덩어리로 합친 뒤(optimize.js)에
//    1) 같은 평면 · 같은 방향 · 다른 색이면서 실제로 겹치는 면을 찾고
//    2) 둘 중 "작은 면"(장식 쪽)을 바깥으로 8mm 살짝 띄워요.
//  8mm 는 눈으로는 안 보이지만 깜빡임은 사라져요.
//  다른 물체와 같이 쓰지 않는 "자기만의 모양 정보"만 고쳐요 (같이 쓰는 걸 고치면 엉뚱한 데도 바뀌어요).
// =====================================================
const LIFT = 0.008;

export function fixCoplanar(THREE, scene, opts = {}) {
  // opts.all = 숨김·움직이는 물체도 검사 (가구 한 개처럼 따로 만든 덩어리용) · opts.quiet = 기록 안 남기기
  const t0 = performance.now();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  const planes = new Map();
  const meshes = [];
  scene.updateMatrixWorld(true);
  // 같은 모양 정보를 여러 물체가 같이 쓰면 고치면 안 돼요 (하나 고치면 다 바뀌어요) → 몇 번 쓰이는지 세요
  const refs = new Map();
  scene.traverse((o) => { if (o.geometry) refs.set(o.geometry, (refs.get(o.geometry) || 0) + 1); });
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (!opts.all) for (let p = o; p; p = p.parent) { if (!p.visible || p.userData.dynamic) return; }
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    const mi = meshes.length;
    meshes.push(o);
    const col = o.geometry.attributes.color, idx = o.geometry.index;
    const mw = o.matrixWorld, cnt = idx ? idx.count : pos.count;
    const editable = refs.get(o.geometry) === 1;
    for (let t = 0; t < cnt; t += 3) {
      const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mw); b.fromBufferAttribute(pos, i1).applyMatrix4(mw); c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
      e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2);
      const ar = n.length() / 2; if (ar < 0.002) continue;
      n.normalize();
      const nk = `${Math.round(n.x * 40)},${Math.round(n.y * 40)},${Math.round(n.z * 40)}`;
      const d = n.dot(a);
      const key = nk + '|' + Math.round(d / 0.004);
      // 평면 위 2D 좌표
      let ux, uy, uz;
      if (Math.abs(n.y) < 0.9) { ux = n.z; uy = 0; uz = -n.x; } else { ux = 1; uy = 0; uz = 0; }
      const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      const vx = n.y * uz - n.z * uy, vy = n.z * ux - n.x * uz, vz = n.x * uy - n.y * ux;
      const P = [a, b, c].map((p) => [p.x * ux + p.y * uy + p.z * uz, p.x * vx + p.y * vy + p.z * vz]);
      const cc = col ? [col.getX(i0), col.getY(i0), col.getZ(i0)] : m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1];
      let L = planes.get(key); if (!L) planes.set(key, (L = []));
      L.push({ P, c: cc, mi, vi: [i0, i1, i2], d, ar, editable, nx: n.x, ny: n.y, nz: n.z, tex: !!m.map, mat: m.id });
    }
  });

  // 2D 삼각형이 실제로 겹치는지 (모서리만 닿는 건 빼요)
  const axes = (P) => [0, 1, 2].map((i) => { const p = P[i], q = P[(i + 1) % 3]; return [-(q[1] - p[1]), q[0] - p[0]]; });
  function overlap(A, B) {
    for (const ax of axes(A).concat(axes(B))) {
      const l = Math.hypot(ax[0], ax[1]); if (l < 1e-9) continue;
      const x = ax[0] / l, y = ax[1] / l;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      for (const p of A) { const s = p[0] * x + p[1] * y; if (s < a0) a0 = s; if (s > a1) a1 = s; }
      for (const p of B) { const s = p[0] * x + p[1] * y; if (s < b0) b0 = s; if (s > b1) b1 = s; }
      if (Math.min(a1, b1) - Math.max(a0, b0) < 0.015) return false;
    }
    return true;
  }

  // 면 묶기: 같은 덩어리 · 같은 평면에서 꼭짓점을 같이 쓰는 삼각형 = 한 면 (상자의 한 면 = 삼각형 2개)
  const faceOf = new Map(); // tri record → face {tris, area}
  function buildFaces(L) {
    const byMesh = new Map();
    for (const r of L) { let q = byMesh.get(r.mi); if (!q) byMesh.set(r.mi, (q = [])); q.push(r); }
    for (const [mi, rs] of byMesh) {
      const pos = meshes[mi].geometry.attributes.position;
      const vk = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      const owner = new Map();
      const parent = rs.map((_, i) => i);
      const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
      rs.forEach((r, i) => { for (let k = 0; k < 3; k++) { const key = vk(r.vi[k]); const j = owner.get(key); if (j === undefined) owner.set(key, i); else parent[find(i)] = find(j); } });
      const groups = new Map();
      rs.forEach((r, i) => { const g = find(i); let f = groups.get(g); if (!f) groups.set(g, (f = { tris: [], area: 0, mi })); f.tris.push(r); f.area += r.ar; faceOf.set(r, f); });
    }
  }

  const lift = new Map(); // face → 띄울 방향
  let pairs = 0;
  for (const [key, L0] of planes) {
    const [nk, dk] = key.split('|');
    const L1 = planes.get(nk + '|' + (+dk + 1));
    const all = L1 ? L0.concat(L1) : L0;
    if (all.length < 2 || all.length > 20000) continue;
    for (const r of all) { if (r.u0 === undefined) { r.u0 = Math.min(r.P[0][0], r.P[1][0], r.P[2][0]); r.u1 = Math.max(r.P[0][0], r.P[1][0], r.P[2][0]); r.v0 = Math.min(r.P[0][1], r.P[1][1], r.P[2][1]); r.v1 = Math.max(r.P[0][1], r.P[1][1], r.P[2][1]); } }
    const sorted = all.slice().sort((p, q) => p.u0 - q.u0);
    let built = false;
    for (let i = 0; i < sorted.length; i++) {
      const A = sorted[i];
      for (let j = i + 1; j < sorted.length && sorted[j].u0 < A.u1 - 0.015; j++) {
        const B = sorted[j];
        if (Math.abs(A.d - B.d) > 0.004) continue;
        if (B.v0 > A.v1 - 0.015 || A.v0 > B.v1 - 0.015) continue;
        const dc = Math.abs(A.c[0] - B.c[0]) + Math.abs(A.c[1] - B.c[1]) + Math.abs(A.c[2] - B.c[2]);
        if (dc < 0.06 && !A.tex && !B.tex && A.mat === B.mat) continue; // 같은 색이면 겹쳐도 티가 안 나요
        if (!overlap(A.P, B.P)) continue;
        if (!built) { buildFaces(L0); if (L1) buildFaces(L1); built = true; }
        const fA = faceOf.get(A), fB = faceOf.get(B);
        if (!fA || !fB || fA === fB) continue;
        // 작은 면(장식)을 띄워요. 못 고치는 쪽이면 다른 쪽을 반대로 살짝 넣어요
        let f = fA.area <= fB.area ? fA : fB, sign = 1;
        const other = f === fA ? fB : fA;
        if (!f.tris[0].editable) { if (!other.tris[0].editable) continue; f = other; sign = -1; }
        if (!lift.has(f)) { lift.set(f, sign); pairs++; }
      }
    }
  }

  // 실제로 옮기기: 세상 좌표에서 띄운 다음, 물체 자기 좌표로 되돌려 넣어요
  const touched = new Set();
  const w = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const [f, sign] of lift) {
    const mesh = meshes[f.mi], pos = mesh.geometry.attributes.position;
    inv.copy(mesh.matrixWorld).invert();
    const done = new Set();
    for (const r of f.tris) for (let k = 0; k < 3; k++) {
      const i = r.vi[k]; if (done.has(i)) continue; done.add(i);
      w.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      w.set(w.x + r.nx * LIFT * sign, w.y + r.ny * LIFT * sign, w.z + r.nz * LIFT * sign).applyMatrix4(inv);
      pos.setXYZ(i, w.x, w.y, w.z);
    }
    touched.add(mesh);
  }
  for (const m of touched) { m.geometry.attributes.position.needsUpdate = true; m.geometry.computeBoundingSphere(); }
  if (!opts.quiet) console.log(`[겹침 고치기] 겹친 면 ${pairs}개를 살짝 띄웠어요 (${Math.round(performance.now() - t0)}ms)`);
  return pairs;
}
