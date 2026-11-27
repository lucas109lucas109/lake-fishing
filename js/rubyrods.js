// =====================================================
//  루비 공방 낚싯대 5종 모양 (main.js buildRod 가 불러요)
//   정글 낚싯대보다 더 촘촘하게: 공통 정밀 부품(코르크 손잡이 · 끝 마개 · 릴 · 가이드 7개 · 이음새 띠) + 종류별 장식
//   블록이 수백 개라도 같은 재질끼리 compactRig 로 합쳐서 가벼워요 (움직이는 조각만 빼고)
// =====================================================
export function buildRubyRod(o) {
  const { THREE, r, target, put, spin, mat, compactRig, ROD_LEN } = o;
  const half = ROD_LEN / 2;
  // 기본 줄 고리(도넛 5개)는 빼요 — 아래에서 다리 · 테 · 안쪽 고리까지 있는 정밀 가이드 7개로 바꿔 달아요
  for (const c of [...target.children]) if (c.isMesh && c.geometry && c.geometry.type === 'TorusGeometry') target.remove(c);
  const radAt = (y) => 0.058 - ((y + half) / ROD_LEN) * 0.036; // 그 높이의 몸통 굵기
  const mats = new Map();
  const M = (c, rough = 0.5, extra = {}) => { const k = c + '|' + rough + '|' + JSON.stringify(extra); if (!mats.has(k)) mats.set(k, mat(c, rough, extra)); return mats.get(k); };
  const G = (c, i = 1.2) => M(c, 0.2, { emissive: c, emissiveIntensity: i });
  const cube = (s, m, x, y, z) => { const b = put(new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), m), x, y, z); b.castShadow = false; return b; };
  const gemG = new THREE.OctahedronGeometry(1, 0);
  const gem = (sz, m, x, y, z, sy = 1.4) => { const b = put(new THREE.Mesh(gemG, m), x, y, z); b.scale.set(sz, sz * sy, sz); b.castShadow = false; return b; };
  const ball = (rad, m, x, y, z) => { const b = put(new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), m), x, y, z); b.castShadow = false; return b; };
  // 몸통 둘레에 블록 한 바퀴
  const ring = (y, n, size, mOf, out = 0.006, skip = () => false, hMul = 1.3) => {
    const rr = radAt(y) + out;
    for (let k = 0; k < n; k++) { if (skip(k)) continue; const a = (k / n) * Math.PI * 2; const b = cube([size, size * hMul, size], mOf(k), Math.cos(a) * rr, y, Math.sin(a) * rr); b.rotation.y = -a; }
  };
  const keep = new Set(); // 합치지 않을 것 (움직이거나 빛이 바뀌는 조각)
  // 금속은 주변 반사(환경맵)가 없어서 금속감을 너무 높이면 거무스름해져요 → 적당히 + 살짝 스스로 빛나게
  const GOLD = M(0xe8c050, 0.3, { metalness: 0.45, emissive: 0x5a3a00, emissiveIntensity: 0.35 }), GOLDD = M(0xb8902a, 0.35, { metalness: 0.4, emissive: 0x3a2400, emissiveIntensity: 0.3 }), SILV = M(0xd8dce4, 0.3, { metalness: 0.4 });
  const RUBY = G(0xff2a4a, 0.9), RUBYD = G(0xc8102a, 0.7), RUBYL = G(0xff8a9a, 1.0), BLK = M(0x1a1416, 0.5);
  const reelM = M(r.reelC, 0.3, { metalness: 0.7 });

  // ---- 공통 1: 코르크 손잡이 (코르크 3톤 8줄 x 12조각 + 사이사이 금 띠) ----
  const cork = [M(0xc8a070, 0.95), M(0xb08a5a, 0.95), M(0xd8b484, 0.95)];
  const fancy = r.style === 'ruby4' || r.style === 'ruby5', gripAlt = r.style === 'ruby4' ? M(0xf0e0d8, 0.5) : M(r.grip, 0.7);
  for (let row = 0; row < 8; row++) ring(-half + 0.06 + row * 0.072, 12, 0.03, (k) => (fancy && row % 2 ? gripAlt : cork[(k + row) % 3]), 0.072, () => false, 2.2);
  for (let row = 0; row < 9; row++) ring(-half + 0.025 + row * 0.072, 14, 0.012, () => (r.style === 'ruby5' ? GOLD : GOLDD), 0.08, (k) => k % 2 === 1, 0.6);
  // ---- 공통 2: 끝 마개 (금속 3층 + 볼트 6개 + 루비) ----
  for (let k = 0; k < 3; k++) { const c = put(new THREE.Mesh(new THREE.CylinderGeometry(0.095 - k * 0.012, 0.1 - k * 0.012, 0.025, 12), k % 2 ? GOLDD : GOLD), 0, -half - 0.03 + k * 0.025, 0); c.castShadow = false; }
  for (let k = 0; k < 6; k++) { const a = k * 1.047; cube([0.012, 0.012, 0.012], SILV, Math.cos(a) * 0.088, -half - 0.03, Math.sin(a) * 0.088); }
  gem(0.03, RUBY, 0, -half - 0.075, 0, 1.2);
  // ---- 공통 3: 정밀 릴 (스풀 테 · 감긴 줄 · 손잡이 팔 · 손잡이 · 줄걸이 고리 · 드랙 다이얼 · 다리 · 볼트) ----
  const ry0 = -half + 0.85;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cube([0.02, 0.05, 0.02], k % 2 ? GOLD : reelM, 0.15, ry0 + Math.cos(a) * 0.105, Math.sin(a) * 0.105); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; cube([0.012, 0.012, 0.012], M(0xf1e0c4, 0.8), 0.155, ry0 + Math.cos(a) * 0.085, Math.sin(a) * 0.085); }
  cube([0.012, 0.15, 0.025], GOLD, 0.21, ry0 + 0.06, 0);
  cube([0.05, 0.025, 0.04], BLK, 0.23, ry0 + 0.13, 0.02);
  for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3; cube([0.008, 0.008, 0.008], SILV, 0.16 + Math.cos(a) * 0.02, ry0 + Math.sin(a) * 0.12, Math.cos(a) * 0.1); }
  cube([0.03, 0.03, 0.03], GOLD, 0.12, ry0, 0.11); gem(0.016, RUBY, 0.12, ry0, 0.13, 1);
  cube([0.05, 0.12, 0.03], reelM, 0.075, ry0 - 0.02, 0);
  for (const dy of [-0.06, 0.06]) cube([0.008, 0.008, 0.008], SILV, 0.09, ry0 + dy, 0.016);
  // ---- 공통 4: 정밀 가이드 7개 (다리 2 · 테 8조각 · 안쪽 고리 · 양옆 실 감은 자리) + 후크 걸이 ----
  for (let k = 0; k < 7; k++) {
    const y = -half + 1.0 + k * 0.23, rr = radAt(y), gs = 0.035 - k * 0.003;
    for (const dy of [-0.03, 0.03]) cube([0.01, 0.012, 0.01], SILV, rr + 0.012, y + dy, 0);
    for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; cube([0.008, 0.008, 0.008], k === 6 ? GOLD : SILV, rr + 0.03 + gs + Math.cos(a) * gs, y + Math.sin(a) * gs, 0); }
    for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; cube([0.005, 0.005, 0.005], M(0x2a2a2a, 0.3), rr + 0.03 + gs + Math.cos(a) * gs * 0.6, y + Math.sin(a) * gs * 0.6, 0); }
    ring(y - 0.045, 8, 0.008, () => RUBYD, 0.003, () => false, 1);
    ring(y + 0.045, 8, 0.008, () => RUBYD, 0.003, () => false, 1);
  }
  cube([0.008, 0.03, 0.008], SILV, radAt(-half + 0.75) + 0.01, -half + 0.75, 0);
  // ---- 공통 5: 이음새 금속 띠 3곳 (띠 2줄 + 볼트 6) ----
  for (const yb of [-half + 0.7, -half + 1.25, -half + 1.85]) { ring(yb, 12, 0.013, () => GOLD, 0.004); ring(yb + 0.03, 12, 0.013, () => GOLDD, 0.004); ring(yb + 0.015, 6, 0.007, () => SILV, 0.012, () => false, 1); }

  if (r.style === 'ruby1') {
    // 루비 낚싯대: 금 나선 2줄 + 나선 사이 홍옥(금 받침) + 끝에 갈퀴로 물린 큰 홍옥
    for (let k = 0; k < 64; k++) { const t = k / 64, y = -half + 0.72 + t * (ROD_LEN - 0.86); for (const ph of [0, Math.PI]) { const a = t * Math.PI * 8 + ph, rr = radAt(y) + 0.008; const b = cube([0.012, 0.018, 0.012], GOLD, Math.cos(a) * rr, y, Math.sin(a) * rr); b.rotation.y = -a; } }
    for (let k = 0; k < 18; k++) { const t = (k + 0.5) / 18, y = -half + 0.72 + t * (ROD_LEN - 0.86), a = t * Math.PI * 8 + Math.PI / 2, rr = radAt(y) + 0.012; gem(0.014, k % 3 ? RUBY : RUBYL, Math.cos(a) * rr, y, Math.sin(a) * rr); cube([0.02, 0.006, 0.02], GOLDD, Math.cos(a) * (rr - 0.004), y - 0.014, Math.sin(a) * (rr - 0.004)); }
    for (let k = 0; k < 4; k++) { const a = k * 1.57; const b = cube([0.012, 0.06, 0.012], GOLD, Math.cos(a) * 0.03, half + 0.02, Math.sin(a) * 0.03); b.rotation.z = Math.cos(a) * 0.4; b.rotation.x = -Math.sin(a) * 0.4; }
    cube([0.04, 0.012, 0.04], GOLD, 0, half + 0.01, 0);
    const big = gem(0.05, G(0xff2a4a, 1.5), 0, half + 0.09, 0, 1.6); spin.push({ mesh: big, kind: 'self' });
  }
  if (r.style === 'ruby2') {
    // 석류석 낚싯대: 몸통 곳곳에서 비스듬히 자라는 수정 무리(4개씩) + 바위 껍질 + 띠 4줄 + 끝에 석류석 꽃
    const shard = [G(0x8a0a1a, 0.6), G(0xc8203a, 0.8), G(0xff6a7a, 1.0)];
    for (let c = 0; c < 11; c++) {
      const y = -half + 0.95 + c * 0.14, a0 = c * 2.3, rr = radAt(y);
      for (let k = 0; k < 4; k++) { const a = a0 + (k - 1.5) * 0.35, len = 0.03 + (k % 3) * 0.015; const g2 = gem(0.012 + (k % 2) * 0.005, shard[(c + k) % 3], Math.cos(a) * (rr + len * 0.6), y + (k - 1.5) * 0.012, Math.sin(a) * (rr + len * 0.6), 2.4); g2.rotation.z = Math.cos(a) * -1.0; g2.rotation.x = Math.sin(a) * 1.0; }
      for (let k = 0; k < 3; k++) { const a = a0 + Math.PI + k * 0.4; const b = cube([0.02, 0.014, 0.02], M([0x4a2a28, 0x3a2020, 0x5a3430][k], 0.95), Math.cos(a) * (rr + 0.006), y + 0.02, Math.sin(a) * (rr + 0.006)); b.rotation.y = -a; }
    }
    for (let b2 = 0; b2 < 4; b2++) ring(-half + 0.9 + b2 * 0.45, 10, 0.016, (k) => ((k + b2) % 2 ? RUBYD : M(0x2a0a10, 0.4)), 0.004);
    for (let k = 0; k < 8; k++) { const a = k * 0.785; cube([0.014, 0.012, 0.014], M(0x3a2020, 0.9), Math.cos(a) * 0.03, half + 0.005, Math.sin(a) * 0.03); }
    for (let k = 0; k < 6; k++) { const a = k * 1.047; const g2 = gem(0.018, shard[k % 3], Math.cos(a) * 0.035, half + 0.05, Math.sin(a) * 0.035, 2.2); g2.rotation.z = Math.cos(a) * -0.7; g2.rotation.x = Math.sin(a) * 0.7; }
    const tip = gem(0.04, G(0xff4a6a, 1.5), 0, half + 0.1, 0, 2.2); spin.push({ mesh: tip, kind: 'self' }); // 'pulse' 는 크기를 1로 덮어써서 보석이 커져요
  }
  if (r.style === 'ruby3') {
    // 진홍 용비늘 낚싯대: 비늘을 기와처럼 26줄 겹쳐요(줄마다 어긋나게) + 금빛 등가시 + 손잡이 위 발톱 4개 + 끝에 용 머리
    const scl = [M(0x8a0a1a, 0.35, { metalness: 0.4 }), M(0xb8182a, 0.35, { metalness: 0.4 }), M(0x6a0a14, 0.35, { metalness: 0.4 })];
    for (let row = 0; row < 26; row++) {
      const y = -half + 0.72 + row * 0.068;
      for (let k = 0; k < 9; k++) { const a = ((k + (row % 2) * 0.5) / 9) * Math.PI * 2, rr = radAt(y) + 0.006; const b = cube([0.022, 0.03, 0.012], scl[(k + row) % 3], Math.cos(a) * rr, y, Math.sin(a) * rr); b.rotation.set(0.25, -a, 0, 'YXZ'); }
    }
    for (let k = 0; k < 20; k++) { const y = -half + 0.8 + k * 0.085, rr = radAt(y); const b = cube([0.01, 0.03, 0.022], G(0xffc83a, 0.6), 0, y, -(rr + 0.016)); b.rotation.x = -0.5; }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; for (let m = 0; m < 3; m++) { const b = cube([0.012, 0.03, 0.012], m === 2 ? M(0xf4f0e0, 0.4) : scl[1], Math.cos(a) * (0.085 + m * 0.012), -half + 0.66 - m * 0.022, Math.sin(a) * (0.085 + m * 0.012)); b.rotation.z = Math.cos(a) * (0.4 + m * 0.4); b.rotation.x = -Math.sin(a) * (0.4 + m * 0.4); } }
    const hy = half + 0.08;
    cube([0.07, 0.06, 0.075], scl[1], 0, hy, 0); cube([0.05, 0.035, 0.06], scl[0], 0, hy - 0.005, -0.06); cube([0.045, 0.015, 0.05], scl[2], 0, hy - 0.035, -0.055);
    for (const s2 of [-1, 1]) {
      cube([0.008, 0.008, 0.008], BLK, s2 * 0.012, hy + 0.012, -0.09);                                               // 콧구멍
      gem(0.011, G(0xffe23a, 1.6), s2 * 0.034, hy + 0.018, -0.02, 1);                                                // 눈
      for (let m = 0; m < 3; m++) cube([0.01, 0.02, 0.01], M(0xf4e0c0, 0.5), s2 * (0.022 + m * 0.006), hy + 0.04 + m * 0.018, 0.02 + m * 0.012); // 뿔
      for (let m = 0; m < 4; m++) cube([0.006, 0.006, 0.006], G(0xffc83a, 0.8), s2 * (0.03 + m * 0.01), hy - 0.02 - m * 0.006, -0.07 + m * 0.004); // 수염
      for (let m = 0; m < 3; m++) cube([0.006, 0.01, 0.006], M(0xffffff, 0.4), s2 * 0.02 - s2 * m * 0.01, hy - 0.025, -0.085); // 이빨
    }
    for (let k = 0; k < 5; k++) cube([0.012, 0.03 - k * 0.004, 0.012], G(0xffc83a, 0.6), 0, hy + 0.04 + k * 0.004, 0.02 + k * 0.014); // 갈기
    const breath = gem(0.025, G(0xff6a2a, 1.8), 0, hy - 0.01, -0.12, 1); spin.push({ mesh: breath, kind: 'self' }); // 'pulse' 는 크기를 1로 덮어써서 보석이 커져요
  }
  if (r.style === 'ruby4') {
    // 루비 신전의 홍염 낚싯대: 대리석 몸통 + 금 · 대리석 기둥 홈 10줄 + 빛나는 불꽃 나선 + 금 · 루비 띠 + 끝에 작은 신전과 떠 있는 불꽃 루비
    const marble = [M(0xf0e0d8, 0.35), M(0xe4d0c8, 0.35), M(0xf8ece6, 0.35)], flame = [G(0xff3a1a, 1.4), G(0xff8a2a, 1.5), G(0xffd84a, 1.6)];
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; for (let m = 0; m < 10; m++) { const y = -half + 0.78 + m * 0.17, rr = radAt(y) + 0.004; const b = cube([0.006, 0.15, 0.006], m % 2 ? GOLDD : marble[k % 3], Math.cos(a) * rr, y, Math.sin(a) * rr); b.rotation.y = -a; } }
    for (let k = 0; k < 80; k++) { const t = k / 80, y = -half + 0.75 + t * (ROD_LEN - 0.9), a = -t * Math.PI * 10, rr = radAt(y) + 0.016; cube([0.011, 0.016, 0.011], flame[k % 3], Math.cos(a) * rr, y, Math.sin(a) * rr); }
    for (let b2 = 0; b2 < 5; b2++) ring(-half + 0.95 + b2 * 0.33, 12, 0.014, (k) => (k % 3 ? GOLD : RUBY), 0.006);
    const ty = half + 0.01;
    cube([0.11, 0.015, 0.11], marble[0], 0, ty, 0); cube([0.09, 0.015, 0.09], GOLD, 0, ty + 0.015, 0);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cube([0.012, 0.07, 0.012], marble[2], dx * 0.03, ty + 0.06, dz * 0.03); cube([0.018, 0.008, 0.018], GOLD, dx * 0.03, ty + 0.096, dz * 0.03); cube([0.012, 0.012, 0.012], GOLD, dx * 0.052, ty + 0.1, dz * 0.052); }
    cube([0.1, 0.014, 0.1], RUBYD, 0, ty + 0.105, 0); cube([0.07, 0.014, 0.07], RUBY, 0, ty + 0.12, 0); cube([0.04, 0.014, 0.04], GOLD, 0, ty + 0.134, 0);
    const ember = gem(0.02, G(0xff6a1a, 1.8), 0, ty + 0.06, 0, 1.5); spin.push({ mesh: ember, kind: 'self' }); // 'pulse' 는 크기를 1로 덮어써서 보석이 커져요
    const top = gem(0.04, G(0xff3a2a, 1.8), 0, ty + 0.22, 0, 1.7); spin.push({ mesh: top, kind: 'self' });
  }
  if (r.style === 'ruby5') {
    // 루비 왕관 낚싯대: 금 몸통에 덩굴무늬 120조각 + 루비 · 진주 24개 + 벨벳 띠 4줄(금 테) + 손잡이 아래 술 5가닥 + 왕관
    const velvet = M(0x8a0a1a, 0.9), pearl = M(0xfff6fa, 0.2, { metalness: 0.2 });
    for (let k = 0; k < 120; k++) { const t = k / 120, y = -half + 0.74 + t * (ROD_LEN - 0.9), a = t * Math.PI * 12 + Math.sin(t * 40) * 0.6, rr = radAt(y) + 0.006; cube([0.008, 0.012, 0.008], k % 2 ? GOLD : GOLDD, Math.cos(a) * rr, y, Math.sin(a) * rr); }
    for (let k = 0; k < 24; k++) { const t = (k + 0.5) / 24, y = -half + 0.78 + t * (ROD_LEN - 0.95), a = k * 2.4, rr = radAt(y) + 0.01; if (k % 3 === 2) ball(0.009, pearl, Math.cos(a) * rr, y, Math.sin(a) * rr); else gem(0.012, k % 3 ? RUBY : RUBYL, Math.cos(a) * rr, y, Math.sin(a) * rr); }
    for (let b2 = 0; b2 < 4; b2++) { const y = -half + 1.0 + b2 * 0.42; ring(y, 14, 0.016, () => velvet, 0.005, () => false, 1.6); ring(y - 0.022, 14, 0.008, () => GOLD, 0.008, () => false, 1); ring(y + 0.022, 14, 0.008, () => GOLD, 0.008, () => false, 1); }
    for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.3; for (let m = 0; m < 6; m++) cube([0.012, 0.03, 0.012], m === 5 ? GOLD : velvet, 0.1 + Math.sin(a) * 0.012 * m, -half + 0.15 - m * 0.026, Math.cos(a) * 0.012 * m - 0.02); }
    const cy = half + 0.03;
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; cube([0.02, 0.022, 0.012], GOLD, Math.cos(a) * 0.062, cy, Math.sin(a) * 0.062).rotation.y = -a; cube([0.02, 0.01, 0.012], GOLDD, Math.cos(a) * 0.064, cy + 0.016, Math.sin(a) * 0.064).rotation.y = -a; }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; gem(0.009, k % 2 ? RUBY : RUBYL, Math.cos(a) * 0.072, cy, Math.sin(a) * 0.072, 1); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cube([0.012, 0.05, 0.012], GOLD, Math.cos(a) * 0.06, cy + 0.04, Math.sin(a) * 0.06); ball(0.009, pearl, Math.cos(a) * 0.06, cy + 0.07, Math.sin(a) * 0.06); }
    for (const rot of [0, Math.PI / 2]) for (let k = 0; k < 9; k++) { const t = (k / 8) * Math.PI, x2 = Math.cos(t) * 0.058, y2 = cy + 0.05 + Math.sin(t) * 0.05; cube([0.01, 0.01, 0.012], GOLD, Math.cos(rot) * x2, y2, Math.sin(rot) * x2); }
    const cap = put(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), velvet), 0, cy + 0.02, 0); cap.castShadow = false;
    ball(0.016, GOLD, 0, cy + 0.11, 0);
    cube([0.008, 0.04, 0.008], GOLD, 0, cy + 0.14, 0); cube([0.026, 0.008, 0.008], GOLD, 0, cy + 0.145, 0);
    const crownGem = gem(0.03, G(0xff2a4a, 1.8), 0, cy + 0.21, 0, 1.6); spin.push({ mesh: crownGem, kind: 'self' });
  }
  for (const s of spin) keep.add(s.mesh);
  compactRig(THREE, target, keep);
}
