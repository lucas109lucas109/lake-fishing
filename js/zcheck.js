// =====================================================
//  겹친 면 검사기 (테스트용 · 게임에는 영향 없어요)
//   같은 평면 · 같은 방향 · 다른 색 면이 실제로 겹치는 곳(z-fighting)을 찾아서 위치를 알려 줘요.
//   zfix.js 와 같은 판정(2D 삼각형이 1.5cm 넘게 겹치는지)을 쓰지만, 고치지는 않고 목록만 만들어요.
//   눈에 안 보이는 면(땅속을 향한 아랫면)은 빼요.
//
//   쓰는 법 (개발자 콘솔):
//     const Z = await import('/js/zcheck.js'); const T = await import('three');
//     Z.findCoplanar(T, __game.scene, (p) => p.z < -900)   // 박물관 안만 검사
// =====================================================
export function findCoplanar(THREE, scene, where = () => true, max = 200) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), ctr = new THREE.Vector3();
  const planes = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    const col = o.geometry.attributes.color, idx = o.geometry.index, mw = o.matrixWorld, cnt = idx ? idx.count : pos.count;
    for (let t = 0; t < cnt; t += 3) {
      const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mw); b.fromBufferAttribute(pos, i1).applyMatrix4(mw); c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
      ctr.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      if (!where(ctr)) continue;
      e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2);
      const ar = n.length() / 2; if (ar < 0.002) continue;
      n.normalize();
      if (n.y < -0.9) continue; // 아랫면: 땅이나 받침에 붙어 있어서 안 보여요
      const d = n.dot(a);
      const key = `${Math.round(n.x * 40)},${Math.round(n.y * 40)},${Math.round(n.z * 40)}|${Math.round(d / 0.004)}`;
      let ux, uy, uz;
      if (Math.abs(n.y) < 0.9) { ux = n.z; uy = 0; uz = -n.x; } else { ux = 1; uy = 0; uz = 0; }
      const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      const vx = n.y * uz - n.z * uy, vy = n.z * ux - n.x * uz, vz = n.x * uy - n.y * ux;
      const P = [a, b, c].map((p) => [p.x * ux + p.y * uy + p.z * uz, p.x * vx + p.y * vy + p.z * vz]);
      const cc = col ? [col.getX(i0), col.getY(i0), col.getZ(i0)] : m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1]; // 하늘 돔 같은 셰이더 재질은 색이 없어요
      let L = planes.get(key); if (!L) planes.set(key, (L = []));
      L.push({ P, c: cc, d, mat: m.id, tex: !!m.map, at: [+ctr.x.toFixed(2), +ctr.y.toFixed(3), +ctr.z.toFixed(2)], n: [+n.x.toFixed(2), +n.y.toFixed(2), +n.z.toFixed(2)] });
    }
  });
  const axes = (P) => [0, 1, 2].map((i) => { const p = P[i], q = P[(i + 1) % 3]; return [-(q[1] - p[1]), q[0] - p[0]]; });
  const overlap = (A, B) => {
    for (const ax of axes(A).concat(axes(B))) {
      const l = Math.hypot(ax[0], ax[1]); if (l < 1e-9) continue;
      const x = ax[0] / l, y = ax[1] / l;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      for (const p of A) { const s = p[0] * x + p[1] * y; if (s < a0) a0 = s; if (s > a1) a1 = s; }
      for (const p of B) { const s = p[0] * x + p[1] * y; if (s < b0) b0 = s; if (s > b1) b1 = s; }
      if (Math.min(a1, b1) - Math.max(a0, b0) < 0.015) return false;
    }
    return true;
  };
  const found = [];
  for (const [key, L0] of planes) {
    const [nk, dk] = key.split('|');
    const L1 = planes.get(nk + '|' + (+dk + 1));
    const all = L1 ? L0.concat(L1) : L0;
    if (all.length < 2) continue;
    for (const r of all) { r.u0 = Math.min(r.P[0][0], r.P[1][0], r.P[2][0]); r.u1 = Math.max(r.P[0][0], r.P[1][0], r.P[2][0]); r.v0 = Math.min(r.P[0][1], r.P[1][1], r.P[2][1]); r.v1 = Math.max(r.P[0][1], r.P[1][1], r.P[2][1]); }
    const sorted = all.slice().sort((p, q) => p.u0 - q.u0);
    for (let i = 0; i < sorted.length; i++) {
      const A = sorted[i];
      for (let j = i + 1; j < sorted.length && sorted[j].u0 < A.u1 - 0.015; j++) {
        const B = sorted[j];
        if (Math.abs(A.d - B.d) > 0.004) continue;
        if (B.v0 > A.v1 - 0.015 || A.v0 > B.v1 - 0.015) continue;
        const dc = Math.abs(A.c[0] - B.c[0]) + Math.abs(A.c[1] - B.c[1]) + Math.abs(A.c[2] - B.c[2]);
        if (dc < 0.06 && !A.tex && !B.tex) continue; // 같은 색끼리는 겹쳐도 깜빡임이 안 보여요 (합치기 뒤엔 재질 번호가 달라져도 색이 같으면 같아요)
        if (!overlap(A.P, B.P)) continue;
        found.push({ at: A.at, n: A.n, other: B.at });
        if (found.length >= max) return found;
      }
    }
  }
  return found;
}
