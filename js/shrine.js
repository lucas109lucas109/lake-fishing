// =====================================================
//  루비 신전 성소 (보스 낚시터)
//   봉인을 풀면 루비 신전의 문이 열려요. 문 앞에서 E → 화면이 까매졌다가 성소로 (박물관처럼 따로 떨어진 방)
//   성소 한가운데 둥근 연못에서 그 봉인의 보스 물고기를 낚을 수 있어요. 보스가 있으면 연못 속에 큰 그림자가 맴돌아요
//   카메라는 평소 시점 (freeCam)
// =====================================================
import { DecoBatch } from './seaworld.js';

export const SHRINE = { x: 420, z: -1000 };                         // 성소 방 한가운데
export const SHRINE_POOL = { x: SHRINE.x, z: SHRINE.z + 2, r: 7 };   // 보스 연못
const FLOOR = 0.3;

export function buildShrine(ctx) {
  const { THREE, scene, LANTERN_MATS, door } = ctx;
  let seed = 7171;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12), OCTA = new THREE.OctahedronGeometry(0.5, 0), CONE = new THREE.ConeGeometry(0.5, 1, 6);
  const b = new DecoBatch(THREE), bt = new DecoBatch(THREE);
  const gemMat = new THREE.MeshStandardMaterial({ color: 0xff2a4a, roughness: 0.15, emissive: 0xd8102a, emissiveIntensity: 0.9, vertexColors: true });
  const gems = new DecoBatch(THREE);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd8b0, emissive: 0xff7a3a, emissiveIntensity: 1.3 });
  LANTERN_MATS.push(glowMat);
  const glow = new DecoBatch(THREE);
  const W = 44, D = 36, X = SHRINE.x, Z = SHRINE.z, x0 = X - W / 2, x1 = X + W / 2, z0 = Z - D / 2, z1 = Z + D / 2, WH = 7.5;
  const P = SHRINE_POOL;
  const rects = [];
  const block = (ax, az, bx, bz) => rects.push([Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]);
  const ST = [0x5a1a22, 0x4a121a, 0x6a2430], STONE = [0xe8d0c8, 0xd8bcb4, 0xf0dcd4], GOLD = 0xd8b040;
  // 방 둘레는 까맣게
  { const v = new THREE.Mesh(new THREE.BoxGeometry(W + 60, 50, D + 60), new THREE.MeshBasicMaterial({ color: 0x0a0406, side: THREE.BackSide, fog: false })); v.position.set(X, 10, Z); v.userData.dynamic = true; scene.add(v); }
  // 바닥: 받침 + 붉은 · 흰 돌 체크 타일 (연못 자리는 비워요) + 연못 둘레 룬 원 2겹
  b.add(BOX, 0x2a1418, [X, FLOOR - 1.7, Z], [0, 0, 0], [W + 2, 0.6, D + 2]); // 받침은 연못 바닥보다 아래 (연못 물이 가려지지 않게)
  for (let x = x0 + 0.75; x < x1; x += 1.5) for (let z = z0 + 0.75; z < z1; z += 1.5) {
    if (Math.hypot(x - P.x, z - P.z) < P.r + 0.9) continue;
    const i = Math.round((x - x0) / 1.5) + Math.round((z - z0) / 1.5);
    b.add(BOX, i % 2 ? pick(ST) : pick(STONE), [x, FLOOR - 0.05, z], [0, 0, 0], [1.46, 0.1, 1.46]);
  }
  for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; b.add(BOX, k % 2 ? 0xc8a8a0 : 0xd8b8b0, [P.x + Math.cos(a) * (P.r + 0.45), FLOOR + 0.12, P.z + Math.sin(a) * (P.r + 0.45)], [0, -a, 0], [0.9, 0.34, 1.05]); } // 연못 테두리 돌
  for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; b.add(BOX, GOLD, [P.x + Math.cos(a) * (P.r + 0.45), FLOOR + 0.3 + (k % 2) * 0.012, P.z + Math.sin(a) * (P.r + 0.45)], [0, -a, 0], [0.92, 0.04, 1.08]); }
  for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; gems.add(BOX, 0xffffff, [P.x + Math.cos(a) * (P.r + 1.6), FLOOR + 0.012, P.z + Math.sin(a) * (P.r + 1.6)], [0, -a, 0], [0.18, 0.02, 0.5]); } // 빛나는 룬 원
  b.add(new THREE.CylinderGeometry(1, 1, 1, 32), 0x1a0608, [P.x, FLOOR - 1.2, P.z], [0, 0, 0], [P.r + 0.2, 0.4, P.r + 0.2]);       // 연못 바닥 (깊고 어두워요)
  b.add(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), 0x3a1018, [P.x, FLOOR - 0.6, P.z], [0, 0, 0], [P.r + 0.1, 1.2, P.r + 0.1]); // 연못 벽
  for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, r = rnd() * P.r * 0.8; gems.add(OCTA, 0xffffff, [P.x + Math.cos(a) * r, FLOOR - 0.95, P.z + Math.sin(a) * r], [rnd(), rnd(), 0], [0.3, 0.6, 0.3]); } // 물속 루비
  // 벽: 뒤 · 옆 (높게) + 판넬 + 금 띠 / 앞은 낮은 턱 + 가운데 나가는 매트
  const wall = (cx, cz, sx, sz, nx, nz) => {
    b.add(BOX, ST[0], [cx, FLOOR + WH / 2, cz], [0, 0, 0], [sx, WH, sz]);
    const L = Math.max(sx, sz), along = sx > sz, o = 0.27;
    for (let t = -L / 2 + 1.5; t < L / 2 - 1; t += 3) {
      bt.add(BOX, ST[2], [cx + (along ? t : 0) + nx * o, FLOOR + 3.6, cz + (along ? 0 : t) + nz * o], [0, 0, 0], along ? [2.4, 5.4, 0.04] : [0.04, 5.4, 2.4]);
      gems.add(OCTA, 0xffffff, [cx + (along ? t : 0) + nx * (o + 0.08), FLOOR + 4.6, cz + (along ? 0 : t) + nz * (o + 0.08)], [0, 0, 0], [0.3, 0.5, 0.3]);
    }
    for (const hy of [0.2, 1.3, WH - 0.2]) b.add(BOX, GOLD, [cx + nx * (o + 0.03), FLOOR + hy, cz + nz * (o + 0.03)], [0, 0, 0], along ? [L, 0.14, 0.08] : [0.08, 0.14, L]);
  };
  wall(X, z1, W, 0.5, 0, -1); wall(x0, Z, 0.5, D, 1, 0); wall(x1, Z, 0.5, D, -1, 0);
  block(x0 - 2, z1 - 0.4, x1 + 2, z1 + 2); block(x0 - 2, z0 - 2, x0 + 0.4, z1 + 2); block(x1 - 0.4, z0 - 2, x1 + 2, z1 + 2);
  for (const s of [-1, 1]) { const a = s < 0 ? x0 : X + 1.8, c = s < 0 ? X - 1.8 : x1; b.add(BOX, ST[1], [(a + c) / 2, FLOOR + 0.35, z0], [0, 0, 0], [c - a, 0.7, 0.5]); b.add(BOX, GOLD, [(a + c) / 2, FLOOR + 0.73, z0], [0, 0, 0], [c - a, 0.06, 0.56]); block(a, z0 - 1, c, z0 + 0.35); }
  block(X - 1.8, z0 - 1.6, X + 1.8, z0 - 0.5);
  bt.add(BOX, 0x8a1a2a, [X, FLOOR + 0.02, z0 + 1.0], [0, 0, 0], [3.2, 0.02, 1.4]); bt.add(BOX, GOLD, [X, FLOOR + 0.032, z0 + 1.0], [0, 0, 0], [2.6, 0.006, 0.9]);
  // 기둥 8개 (연못 둘레) + 화로 4개 (불꽃이 일렁여요)
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8a4a, emissive: 0xff3a1a, emissiveIntensity: 2, roughness: 0.6 });
  const flames = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, cx = P.x + Math.cos(a) * (P.r + 4.2), cz = P.z + Math.sin(a) * (P.r + 4.2);
    b.add(BOX, ST[1], [cx, FLOOR + 0.2, cz], [0, 0, 0], [1.2, 0.4, 1.2]);
    for (let m = 0; m < 6; m++) b.add(CYL, m % 2 ? STONE[0] : STONE[2], [cx, FLOOR + 0.4 + (m + 0.5) * 0.9, cz], [0, 0, 0], [0.8 - m * 0.02, 0.9, 0.8 - m * 0.02]);
    b.add(BOX, GOLD, [cx, FLOOR + 5.9, cz], [0, 0, 0], [1.1, 0.2, 1.1]);
    gems.add(OCTA, 0xffffff, [cx, FLOOR + 6.4, cz], [0, 0, 0], [0.5, 0.8, 0.5]);
    block(cx - 0.6, cz - 0.6, cx + 0.6, cz + 0.6);
    if (k % 2 === 0) {
      const bx = cx + Math.cos(a) * 1.6, bz = cz + Math.sin(a) * 1.6;
      b.add(BOX, ST[2], [bx, FLOOR + 0.45, bz], [0, 0, 0], [0.7, 0.9, 0.7]);
      b.add(CYL, 0x2a2a2a, [bx, FLOOR + 1.0, bz], [0, 0, 0], [0.9, 0.25, 0.9]);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), flameMat); f.position.set(bx, FLOOR + 1.55, bz); f.userData.dynamic = true; scene.add(f); flames.push(f);
      block(bx - 0.45, bz - 0.45, bx + 0.45, bz + 0.45);
    }
  }
  // 연못 뒤 제단 + 거대한 루비 용 머리 석상 (뿔 · 눈 · 이빨) — 성소의 주인
  {
    const ax = X, az = z1 - 4;
    for (let k = 0; k < 3; k++) b.add(BOX, k % 2 ? ST[2] : STONE[1], [ax, FLOOR + 0.25 + k * 0.5, az], [0, 0, 0], [8 - k * 1.6, 0.5, 5 - k * 1.0]);
    b.add(BOX, ST[0], [ax, FLOOR + 3.2, az], [0, 0, 0], [3.2, 2.6, 2.4]);                  // 머리
    b.add(BOX, ST[1], [ax, FLOOR + 2.6, az - 1.6], [0, 0, 0], [2.4, 1.2, 1.4]);            // 주둥이
    for (const s of [-1, 1]) {
      gems.add(BOX, 0xffffff, [ax + s * 0.8, FLOOR + 3.6, az - 1.22], [0, 0, 0], [0.5, 0.3, 0.06]); // 빛나는 눈
      b.add(BOX, GOLD, [ax + s * 1.2, FLOOR + 4.9, az + 0.2], [0, 0, s * -0.5], [0.3, 1.8, 0.3]); // 뿔
      for (let m = 0; m < 3; m++) b.add(BOX, 0xfff4e0, [ax + s * (0.3 + m * 0.35), FLOOR + 1.95, az - 2.2], [0, 0, 0], [0.14, 0.3, 0.14]); // 이빨
    }
    gems.add(OCTA, 0xffffff, [ax, FLOOR + 5.2, az], [0, 0, 0], [1.0, 1.6, 1.0]);
    block(ax - 4.2, az - 2.6, ax + 4.2, az + 2.6);
  }
  // 벽 등불
  for (const [lx, lz] of [[x0 + 0.5, Z - 8], [x0 + 0.5, Z + 8], [x1 - 0.5, Z - 8], [x1 - 0.5, Z + 8]]) { glow.add(BOX, 0xffffff, [lx, FLOOR + 3.2, lz], [0, 0, 0], [0.3, 0.5, 0.3]); b.add(CONE, GOLD, [lx, FLOOR + 3.6, lz], [0, 0, 0], [0.5, 0.3, 0.5]); }
  b.build(scene, { cast: false }); bt.build(scene, { cast: false }); gems.build(scene, { cast: false, material: gemMat }); glow.build(scene, { cast: false, material: glowMat });
  // 보스 그림자 (보스가 있을 때만 물속에서 크게 맴돌아요) + 붉은 고리
  const shadow = new THREE.Group(); shadow.userData.dynamic = true;
  const sm = new THREE.MeshBasicMaterial({ color: 0x050000, transparent: true, opacity: 0.55, depthWrite: false });
  for (const [sx, sz, ox] of [[5.2, 1.6, 0], [1.8, 2.6, -3.0], [1.2, 0.7, 2.9]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.02, sz), sm); m.position.set(ox, 0, 0); shadow.add(m); }
  shadow.position.set(P.x, 0.16, P.z); scene.add(shadow); // 연못 물(0.14) 바로 위
  const ring = new THREE.Mesh(new THREE.TorusGeometry(P.r - 0.4, 0.07, 6, 48), new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.6 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(P.x, 0.17, P.z); ring.userData.dynamic = true; scene.add(ring);
  const light = new THREE.PointLight(0xff6a4a, 0, 50, 1.0); light.position.set(X, FLOOR + 12, Z); scene.add(light);

  const room = {
    id: 'shrine', name: '루비 신전 성소', freeCam: true,
    x: X, z: Z, x0, x1, z0, z1, rw: W, rd: D, floorY: FLOOR,
    exitAt: { x: X, z: z0 + 0.55 }, enterAt: { x: X, z: z0 + 2.4 },
    ext: { doorX: door.x, doorZ: door.z, out: { x: door.x, z: door.z - 2.3, ry: 0 } }, // 나오면 신전 문 앞, 선착장 쪽(북쪽)을 봐요
    enterMsg: '루비 신전 성소예요. 가운데 연못에 낚싯대를 던져 보세요. 문 앞 매트를 밟으면 밖으로 나가요.'
  };
  return {
    room,
    inside: (x, z) => x > x0 - 0.2 && x < x1 + 0.2 && z > z0 - 1.6 && z < z1 + 0.2,
    blocked: (x, z) => Math.hypot(x - P.x, z - P.z) < P.r + 0.55 || rects.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]),
    update(t, here, bossOn) {
      light.intensity = here ? 10 : 0;
      flames.forEach((f, i) => f.scale.set(1, 0.85 + Math.sin(t * 9 + i * 2) * 0.2, 1));
      shadow.visible = ring.visible = !!bossOn;
      if (bossOn) {
        const a = t * 0.35;
        shadow.position.set(P.x + Math.cos(a) * P.r * 0.45, 0.16, P.z + Math.sin(a) * P.r * 0.45);
        shadow.rotation.y = -a - Math.PI / 2;
        ring.material.opacity = 0.35 + Math.sin(t * 3) * 0.25;
      }
    }
  };
}
