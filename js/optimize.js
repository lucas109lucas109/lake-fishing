// =====================================================
//  최적화: 움직이지 않는 물체(나무·바위·가게·울타리…)를 한 덩어리로 합쳐요
//
//  왜? 컴퓨터는 물체 하나를 그릴 때마다 그래픽카드에 "이거 그려!" 하고 명령을 보내요.
//  물체가 3000개면 매 장면마다 명령을 3000번(그림자까지 하면 더) 보내야 해서
//  좋은 컴퓨터도 CPU가 바빠서 뚝뚝 끊겨요. 특히 144Hz·240Hz 모니터(피씨방)에서요.
//  색깔을 블록 자체에 칠해 넣고 하나로 붙이면, 색이 달라도 명령 한 번에 그릴 수 있어요.
//
//  어떻게? 게임이 시작되고 몇 초 동안 지켜봐서, 그동안 "조금도 안 움직인" 블록만 합쳐요.
//  원래 블록은 지우지 않고 숨겨만 둬요 (카메라가 벽에 부딪히는 계산 같은 건 그대로 돼요).
//  userData.dynamic = true 가 붙은 물체(사람, 찌, 보트, 물고기)는 안 건드려요.
// =====================================================
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CELL = 32; // 맵을 32칸 크기 구역으로 나눠서 합쳐요 (안 보이는 구역은 통째로 안 그리게)
const mergedMats = new Map(); // 합친 덩어리용 물감 (같은 성질이면 같이 써요)

export function startStaticMerge({ THREE, scene, protect = new Set(), waitMs = 4000, onDone }) {
  // 1) 지금 모습을 기록해요
  const snap = [];
  const walk = (o) => {
    if (o.userData.dynamic || o.isLight || o.isCamera) return; // 움직이는 것(사람·찌 등)은 통째로 빼요
    if (o.isMesh) snap.push({ mesh: o, m: o.matrixWorld.clone(), ver: o.geometry.attributes.position?.version ?? 0 });
    for (const c of o.children) walk(c);
  };
  for (const top of scene.children) walk(top);

  // 2) 몇 초 뒤에 다시 보고, 그동안 안 움직이고 모양도 안 바뀐 블록만 합쳐요
  setTimeout(() => {
    scene.updateMatrixWorld(true);
    const buckets = new Map();
    let merged = 0;
    for (const { mesh, m, ver } of snap) {
      if (!inScene(mesh, scene) || !mesh.matrixWorld.equals(m) || (mesh.geometry.attributes.position?.version ?? 0) !== ver) continue;
      if (!canMerge(mesh)) continue;
      const mk = mergeKey(THREE, mesh.material, protect);
      mesh.geometry.computeBoundingSphere();
      const c = mesh.geometry.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld);
      const bk = `${mk.key}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}|${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`;
      let b = buckets.get(bk);
      if (!b) buckets.set(bk, (b = { mk, cast: mesh.castShadow, recv: mesh.receiveShadow, geos: [], originals: [] }));
      const g = cleanGeometry(THREE, mesh.geometry, mesh.material, mk.paint);
      if (!g) continue;
      g.applyMatrix4(mesh.matrixWorld);
      b.geos.push(g);
      b.originals.push(mesh);
    }
    for (const b of buckets.values()) {
      if (b.geos.length < 2) { b.geos.forEach((g) => g.dispose()); continue; } // 혼자면 합칠 필요 없어요
      const geo = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      if (!geo) continue; // 모양 정보가 서로 안 맞으면 포기 (원래대로 둬요)
      const m = new THREE.Mesh(geo, b.mk.mat);
      m.castShadow = b.cast; m.receiveShadow = b.recv;
      m.matrixAutoUpdate = false; // 안 움직이니까 위치 계산도 안 해요
      m.userData.mergedStatic = true;
      scene.add(m);
      for (const o of b.originals) { o.visible = false; o.matrixAutoUpdate = false; } // 원래 것은 숨겨요
      merged += b.originals.length;
    }
    onDone && onDone(merged);
  }, waitMs);
}

const inScene = (o, scene) => { for (let p = o; p; p = p.parent) if (p === scene) return true; return false; };

// 합쳐도 되는 블록인지
function canMerge(o) {
  if (!o.visible || o.isInstancedMesh || o.isSkinnedMesh || o.children.length) return false;
  for (let p = o; p; p = p.parent) if (!p.visible) return false; // 숨어 있던 건 나중에 보일 수도 있어요
  const m = o.material;
  if (!m || Array.isArray(m) || m.transparent || m.alphaTest > 0) return false; // 투명한 건 그리는 순서가 중요해요
  if (o.onBeforeRender !== o.constructor.prototype.onBeforeRender) return false;
  if (o.morphTargetInfluences) return false;
  return true;
}

// 어떤 블록끼리 같이 붙일지 정해요.
//  - 평범한 색 블록(그림 없음, 빛 안 남): 색은 블록에 칠하고, 거칠기·금속 느낌이 비슷한 것끼리 한 덩어리
//  - 그 밖(그림이 붙었거나, 빛나거나, 게임이 나중에 색을 바꾸는 것): 물감이 똑같은 것끼리만
function mergeKey(THREE, m, protect) {
  const plain = m.isMeshStandardMaterial && !m.map && !m.vertexColors && !protect.has(m) && !m.userData.keep &&
    (m.emissiveIntensity === 0 || m.emissive.getHex() === 0) && !m.normalMap && !m.roughnessMap && !m.alphaMap;
  if (!plain) return { key: 'id:' + m.uuid, mat: m, paint: false };
  const r = Math.round(m.roughness * 5) / 5, mt = Math.round(m.metalness * 5) / 5;
  const key = `paint:${r},${mt},${m.flatShading ? 1 : 0},${m.side},${m.fog ? 1 : 0}`;
  let mat = mergedMats.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r, metalness: mt, flatShading: m.flatShading, side: m.side, fog: m.fog });
    mergedMats.set(key, mat);
  }
  return { key, mat, paint: true };
}

// 합치려면 모양 정보 종류가 다 같아야 해요 → 위치·방향(+색)만 남기고 맞춰요
//  paint = true 면 블록의 색을 꼭짓점마다 칠해 넣어요
function cleanGeometry(THREE, src, mat, paint) {
  if (!src.attributes.position) return null;
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name === 'position' || name === 'normal') continue;
    if (name === 'color' && mat.vertexColors && !paint) continue;
    if (name === 'uv' && mat.map && !paint) continue;
    g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (paint) {
    const n = g.attributes.position.count, col = new Float32Array(n * 3), c = mat.color;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

// =====================================================
//  사람(블록 캐릭터) 가볍게 하기
//  사람 한 명이 블록 수십 개로 되어 있어요. 머리·팔·다리처럼 "같이 움직이는 덩어리" 안에서
//  블록들을 하나로 붙여요 (색은 블록에 칠해서). 움직임은 그대로예요.
//  skip 에 든 것(눈·입처럼 숨겼다 보였다 하는 것)은 안 붙여요.
// =====================================================
export function compactRig(THREE, root, skip = new Set()) {
  const nodes = [];
  root.traverse((o) => { if (!o.isMesh || o.children.length) nodes.push(o); }); // 관절(그룹)들
  for (const node of nodes) {
    const buckets = new Map();
    for (const c of node.children) {
      if (!c.isMesh || c.children.length || skip.has(c) || !c.visible) continue;
      const m = c.material;
      if (!m || Array.isArray(m) || m.transparent || m.alphaTest > 0) continue;
      const mk = mergeKey(THREE, m, new Set());
      const key = mk.key + '|' + (c.castShadow ? 1 : 0) + (c.receiveShadow ? 1 : 0);
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mk, cast: c.castShadow, recv: c.receiveShadow, list: [] }));
      b.list.push(c);
    }
    for (const b of buckets.values()) {
      if (b.list.length < 2) continue;
      const geos = [];
      for (const c of b.list) {
        c.updateMatrix();
        const g = cleanGeometry(THREE, c.geometry, c.material, b.mk.paint);
        if (!g) continue;
        g.applyMatrix4(c.matrix); // 관절 기준 자리로 옮겨서
        geos.push(g);
      }
      const geo = geos.length >= 2 && mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, b.mk.mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      node.add(mesh);
      for (const c of b.list) node.remove(c);
    }
  }
}
