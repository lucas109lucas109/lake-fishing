// =====================================================
//  반려동물 — 반려동물 가게에서 사서 같이 다녀요
//
//  모든 동물은 작은 블록을 쌓아서 만들어요.
//   P('부위', 돌아가는점x, y, z) 로 부위(몸·머리·꼬리·다리·날개)를 고르고
//   그 부위에 b(가로, 높이, 세로, 색, x, y, z, 돌림x, 돌림y, 돌림z) 로 블록을 붙여요.
//   b.glow(...) 는 스스로 빛나는 블록이에요.
//  동물의 발밑 한가운데가 (0, 0, 0), 얼굴이 +z 쪽을 봐요.
//
//  하는 일
//   - 따라다니기 (걸음 모양이 동물마다 달라요: 걷기 · 깡총 · 뒤뚱 · 날기 · 느릿느릿)
//   - 멈추면 앉고, 오래 있으면 엎드리고, 밤에는 쿨쿨 자요
//   - E 로 쓰다듬기 · 먹이 주기로 친해지기 (하트)
//   - 많이 친해지면 낚시 운이 조금 올라가고, 가끔 재료를 물어 와요
//   - 데리고 다니지 않는 동물은 내 집 안에서 놀아요
// =====================================================
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------- 공통 부위 만들기 도우미 ----------------
const EYE_SHINE = 0xffffff;
// 눈 한 쌍 (흰자 없이 까만 눈 + 반짝 점)
function eyes(h, x, y, z, o = {}) {
  const s = o.size ?? 0.04, col = o.color ?? 0x15131a;
  for (const k of [-1, 1]) {
    if (o.iris) { h(s * 1.25, s * 1.3, 0.012, o.iris, k * x, y, z - 0.002); h(s * 0.5, s * 0.95, 0.014, col, k * x, y, z + 0.001); }
    else h(s, s * 1.1, 0.014, col, k * x, y, z);
    h(s * 0.36, s * 0.36, 0.016, EYE_SHINE, k * x + s * 0.22, y + s * 0.25, z + 0.003);
  }
}
// 네 발 동물의 다리 4개 (0 왼앞 · 1 오른앞 · 2 왼뒤 · 3 오른뒤)
function legs4(P, o) {
  const { leg, x, zf, zb, w, c, paw, front = c, d = w } = o;
  [[-x, zf], [x, zf], [-x, zb], [x, zb]].forEach(([lx, lz], i) => {
    const lg = P('leg' + i, lx, leg, lz);
    const col = i < 2 ? front : c;
    lg(w, leg, d, col, lx, leg / 2, lz);
    lg(w * 1.12, leg * 0.12, d * 1.05, col, lx, leg * 0.78, lz); // 허벅지 살짝 두껍게
    lg(w * 1.12, Math.min(0.04, leg * 0.25), d * 1.3, paw ?? col, lx, Math.min(0.02, leg * 0.12), lz + d * 0.12);
    if (o.toes) for (const t of [-1, 0, 1]) lg(0.008, 0.012, 0.01, o.toes, lx + t * w * 0.3, 0.02, lz + d * 0.78);
  });
}

// ---------------- 고양이 ----------------
function cat(P, o) {
  const { c, belly = c, stripe, eye = 0x4aa04a, nose = 0xff8aa0, sock, earIn = 0xffa8b8, tailTip } = o;
  const leg = 0.15, W = 0.2, H = 0.18, L = 0.44, by = leg + H / 2;
  const b = P('body');
  b(W, H, L, c, 0, by, 0);
  b(W * 1.04, H * 0.92, L * 0.32, c, 0, by + 0.005, L * 0.3);           // 가슴
  b(W * 0.9, 0.05, L * 0.75, belly, 0, by - H / 2 + 0.02, 0.02);        // 배
  b(W * 0.7, 0.07, 0.03, belly, 0, by - 0.02, L / 2 + 0.005);           // 앞가슴 흰 털
  b(W * 1.02, H * 0.7, 0.1, c, 0, by - 0.01, -L / 2 + 0.06);            // 엉덩이
  if (stripe) for (let k = 0; k < 4; k++) b(W + 0.008, H * 0.45, 0.032, stripe, 0, by + H * 0.3, -0.15 + k * 0.095);
  if (o.patches) for (const p of o.patches) b(...p);
  legs4(P, { leg, x: 0.062, zf: 0.15, zb: -0.15, w: 0.062, c, paw: sock ?? c, toes: o.toes });
  const hy = by + 0.06, hz = L / 2 - 0.02;
  const h = P('head', 0, hy, hz);
  const sy = by + 0.13, sz = L / 2 + 0.07;
  h(0.22, 0.18, 0.17, c, 0, sy, sz);                                      // 머리
  h(0.24, 0.1, 0.13, c, 0, sy - 0.04, sz + 0.005);                        // 볼살
  h(0.12, 0.07, 0.06, belly, 0, sy - 0.055, sz + 0.09);                   // 주둥이
  h(0.035, 0.022, 0.02, nose, 0, sy - 0.03, sz + 0.122);                  // 코
  h(0.012, 0.02, 0.01, 0x8a5a5a, 0, sy - 0.05, sz + 0.12);                // 입
  eyes(h, 0.055, sy + 0.015, sz + 0.087, { size: 0.042, iris: eye });
  for (const k of [-1, 1]) {
    h(0.075, 0.06, 0.035, c, k * 0.07, sy + 0.115, sz - 0.03);            // 귀 (세모를 블록 3단으로)
    h(0.05, 0.045, 0.035, c, k * 0.074, sy + 0.16, sz - 0.03);
    h(0.024, 0.03, 0.035, tailTip && o.earTip ? tailTip : c, k * 0.077, sy + 0.195, sz - 0.03);
    h(0.04, 0.045, 0.01, earIn, k * 0.07, sy + 0.13, sz - 0.01);         // 귀 안쪽 분홍
    for (const yy of [-0.035, -0.055]) h(0.08, 0.005, 0.005, 0xf4f0ea, k * 0.1, sy + yy, sz + 0.1, 0, 0, k * (yy === -0.035 ? 0.12 : -0.08)); // 수염
  }
  if (stripe) { h(0.028, 0.012, 0.1, stripe, 0, sy + 0.093, sz - 0.01); for (const k of [-1, 1]) h(0.02, 0.012, 0.08, stripe, k * 0.045, sy + 0.093, sz - 0.02, 0, k * 0.3, 0); }
  const t = P('tail', 0, by + 0.05, -L / 2);
  for (let k = 0; k < 7; k++) {
    const col = k >= 5 && tailTip ? tailTip : stripe && k % 2 ? stripe : c;
    t(0.046, 0.046, 0.05, col, 0, by + 0.05 + k * 0.038 + k * k * 0.006, -L / 2 - 0.025 - k * 0.034 + k * k * 0.004);
  }
}

// ---------------- 강아지 ----------------
function dog(P, o) {
  const { c, belly = 0xfff4e4, cheek = belly, ear = 'up', eye = 0x2a1a10, nose = 0x1a1414, tail = 'curl', fluffy } = o;
  const leg = o.leg ?? 0.17, W = 0.22, H = 0.2, L = 0.46, by = leg + H / 2;
  const b = P('body');
  b(W, H, L, c, 0, by, 0);
  b(W * 1.06, H * 1.0, L * 0.34, c, 0, by + 0.01, L * 0.3);
  b(W * 0.86, 0.05, L * 0.7, belly, 0, by - H / 2 + 0.02, 0.02);
  b(W * 0.66, 0.12, 0.03, belly, 0, by - 0.01, L / 2 + 0.01);               // 하얀 가슴
  if (o.collar) { b(W * 0.82, 0.04, 0.12, o.collar, 0, by + 0.07, L / 2 - 0.02); b(0.04, 0.045, 0.02, 0xf4c84a, 0, by + 0.03, L / 2 + 0.045); }
  if (fluffy) for (const [x, y, z] of [[0, by + 0.11, 0.1], [0, by + 0.11, -0.08], [0.11, by, 0.12], [-0.11, by, 0.12], [0.11, by, -0.1], [-0.11, by, -0.1]]) b(0.1, 0.09, 0.12, c, x, y, z);
  legs4(P, { leg, x: 0.07, zf: 0.16, zb: -0.16, w: 0.066, c, paw: o.sock ?? belly, toes: o.toes });
  if (fluffy) for (let i = 0; i < 4; i++) { const lp = P('leg' + i); const lx = i % 2 ? 0.07 : -0.07, lz = i < 2 ? 0.16 : -0.16; lp(0.1, 0.07, 0.1, c, lx, 0.05, lz); }
  const hy = by + 0.07, hz = L / 2;
  const h = P('head', 0, hy, hz);
  const sy = by + 0.15, sz = L / 2 + 0.07;
  h(0.22, 0.19, 0.18, c, 0, sy, sz);
  h(0.24, 0.08, 0.12, cheek, 0, sy - 0.06, sz + 0.02);                         // 볼 하얀 털
  h(0.12, 0.08, 0.1, cheek, 0, sy - 0.05, sz + 0.12);                           // 주둥이
  h(0.11, 0.03, 0.09, c, 0, sy - 0.003, sz + 0.11);                            // 콧등
  h(0.05, 0.035, 0.03, nose, 0, sy - 0.02, sz + 0.175);                        // 코
  h(0.02, 0.01, 0.01, 0xffffff, 0.012, sy - 0.008, sz + 0.191);
  h(0.04, 0.02, 0.025, 0xff7a8a, 0, sy - 0.1, sz + 0.14);                      // 혀
  eyes(h, 0.056, sy + 0.025, sz + 0.092, { size: 0.04, color: eye });
  for (const k of [-1, 1]) h(0.035, 0.012, 0.02, cheek, k * 0.056, sy + 0.07, sz + 0.085); // 눈썹 점 (시바 느낌)
  for (const k of [-1, 1]) {
    if (ear === 'up') {
      h(0.07, 0.06, 0.04, c, k * 0.07, sy + 0.12, sz - 0.03);
      h(0.045, 0.045, 0.04, c, k * 0.075, sy + 0.165, sz - 0.03);
      h(0.04, 0.05, 0.01, o.earIn ?? 0xf4c8b0, k * 0.07, sy + 0.135, sz - 0.008);
    } else {
      h(0.05, 0.13, 0.08, o.earC ?? c, k * 0.125, sy - 0.0, sz - 0.01, 0, 0, k * 0.2);  // 늘어진 귀
      if (fluffy) h(0.07, 0.08, 0.09, o.earC ?? c, k * 0.135, sy - 0.07, sz - 0.01);
    }
  }
  if (fluffy) h(0.17, 0.08, 0.15, c, 0, sy + 0.11, sz - 0.01);                  // 머리 위 뽀글털
  const t = P('tail', 0, by + 0.07, -L / 2);
  if (tail === 'curl') {
    // 동그랗게 말린 꼬리
    for (let k = 0; k < 9; k++) { const a = k * 0.6; t(0.055, 0.055, 0.055, k > 6 ? belly : c, 0, by + 0.12 + Math.sin(a) * 0.07, -L / 2 - 0.03 + (1 - Math.cos(a)) * -0.04 + k * 0.006); }
  } else if (tail === 'pom') {
    t(0.035, 0.1, 0.035, c, 0, by + 0.12, -L / 2 - 0.02, -0.5, 0, 0);
    t(0.1, 0.1, 0.1, c, 0, by + 0.2, -L / 2 - 0.06);
  } else {
    for (let k = 0; k < 6; k++) t(0.045, 0.045, 0.05, c, 0, by + 0.08 + k * 0.03, -L / 2 - 0.03 - k * 0.035);
  }
}

// ---------------- 여우 ----------------
function fox(P, o) {
  const { c, belly = 0xfff6ec, sock = 0x2a2026, tip = 0xffffff, eye = 0x2a1a10, glow } = o;
  const leg = 0.17, W = 0.18, H = 0.18, L = 0.46, by = leg + H / 2;
  const b = P('body');
  b(W, H, L, c, 0, by, 0);
  b(W * 1.06, H, L * 0.3, c, 0, by + 0.01, L * 0.3);
  b(W * 0.8, 0.05, L * 0.7, belly, 0, by - H / 2 + 0.02, 0.02);
  b(W * 0.75, 0.13, 0.04, belly, 0, by - 0.01, L / 2 + 0.01);
  if (glow) for (let k = 0; k < 3; k++) b.glow(0.03, 0.012, 0.06, glow, 0, by + H / 2 + 0.003, -0.12 + k * 0.12); // 등에 빛나는 무늬
  legs4(P, { leg, x: 0.058, zf: 0.16, zb: -0.16, w: 0.055, c: sock, front: sock, paw: sock });
  for (let i = 0; i < 4; i++) { const lp = P('leg' + i); const lx = i % 2 ? 0.058 : -0.058, lz = i < 2 ? 0.16 : -0.16; lp(0.062, 0.06, 0.062, c, lx, leg - 0.03, lz); }
  const hy = by + 0.07, hz = L / 2;
  const h = P('head', 0, hy, hz);
  const sy = by + 0.14, sz = L / 2 + 0.06;
  h(0.2, 0.16, 0.16, c, 0, sy, sz);
  h(0.24, 0.07, 0.1, belly, 0, sy - 0.05, sz + 0.0);                // 하얀 볼 (옆으로 뾰족)
  h(0.09, 0.065, 0.12, belly, 0, sy - 0.04, sz + 0.12);              // 긴 주둥이
  h(0.09, 0.025, 0.12, c, 0, sy - 0.0, sz + 0.11);
  h(0.035, 0.03, 0.025, 0x1a1414, 0, sy - 0.02, sz + 0.185);
  eyes(h, 0.05, sy + 0.025, sz + 0.082, { size: 0.036, color: eye });
  if (glow) for (const k of [-1, 1]) h.glow(0.02, 0.05, 0.01, glow, k * 0.03, sy + 0.06, sz + 0.081);
  for (const k of [-1, 1]) {
    h(0.08, 0.07, 0.035, c, k * 0.066, sy + 0.11, sz - 0.03);
    h(0.055, 0.06, 0.035, c, k * 0.07, sy + 0.17, sz - 0.03);
    h(0.03, 0.04, 0.036, sock, k * 0.073, sy + 0.215, sz - 0.03);   // 까만 귀끝
    h(0.045, 0.06, 0.01, belly, k * 0.066, sy + 0.13, sz - 0.01);
  }
  // 복슬복슬 큰 꼬리 (끝은 하얗게)
  const t = P('tail', 0, by + 0.04, -L / 2);
  const segs = [[0.07, 0], [0.1, 1], [0.12, 2], [0.13, 3], [0.12, 4], [0.1, 5], [0.08, 6]];
  for (const [s, k] of segs) {
    const y = by + 0.03 + k * 0.022 - (k > 3 ? (k - 3) * 0.01 : 0), z = -L / 2 - 0.04 - k * 0.055;
    if (k >= 5 && glow) t.glow(s, s, 0.065, glow, 0, y, z);
    else t(s, s, 0.065, k >= 5 ? tip : c, 0, y, z);
  }
}

// ---------------- 토끼 ----------------
function bunny(P, o) {
  const { c, belly = c, earIn = 0xffb0c0, eye = 0x2a1a20, spot } = o;
  const by = 0.13;
  const b = P('body');
  b(0.2, 0.18, 0.26, c, 0, by, -0.02);
  b(0.22, 0.16, 0.18, c, 0, by - 0.01, -0.08);                         // 동그란 엉덩이
  b(0.16, 0.14, 0.1, belly, 0, by - 0.01, 0.1);                        // 가슴
  if (spot) b(0.12, 0.08, 0.14, spot, 0.05, by + 0.07, -0.05);

  // 뒷다리는 큰 발, 앞다리는 짧게
  const lp = [[-0.05, 0.1], [0.05, 0.1], [-0.08, -0.08], [0.08, -0.08]];
  lp.forEach(([x, z], i) => {
    const lg = P('leg' + i, x, 0.07, z);
    if (i < 2) { lg(0.045, 0.07, 0.045, c, x, 0.035, z); lg(0.05, 0.02, 0.06, belly, x, 0.01, z + 0.01); }
    else { lg(0.06, 0.09, 0.1, c, x, 0.05, z); lg(0.06, 0.025, 0.14, belly, x, 0.012, z + 0.03); }
  });
  const hy = by + 0.06, hz = 0.1;
  const h = P('head', 0, hy, hz);
  const sy = by + 0.12, sz = 0.15;
  h(0.17, 0.15, 0.15, c, 0, sy, sz);
  h(0.19, 0.08, 0.1, c, 0, sy - 0.04, sz + 0.02);                     // 볼
  h(0.07, 0.04, 0.03, belly, 0, sy - 0.04, sz + 0.075);
  h(0.025, 0.018, 0.012, 0xff8aa8, 0, sy - 0.02, sz + 0.09);
  eyes(h, 0.05, sy + 0.015, sz + 0.077, { size: 0.036, color: eye });
  for (const k of [-1, 1]) {
    // 긴 귀 (살짝 뒤로 젖혀서)
    for (let s = 0; s < 4; s++) h(0.05, 0.06, 0.03, c, k * 0.04, sy + 0.1 + s * 0.055, sz - 0.02 - s * 0.012, -0.2, 0, k * 0.08);
    h(0.03, 0.18, 0.008, earIn, k * 0.04, sy + 0.17, sz - 0.0, -0.2, 0, k * 0.08);
  }
  const t = P('tail', 0, by, -0.2);
  t(0.08, 0.08, 0.07, 0xffffff, 0, by + 0.02, -0.22);                 // 퐁실 꼬리
  t(0.05, 0.05, 0.03, 0xf4f0ea, 0, by + 0.02, -0.26);
}

// ---------------- 햄스터 ----------------
function hamster(P, o) {
  const { c, belly = 0xfff4e4, eye = 0x15131a } = o;
  const by = 0.075;
  const b = P('body');
  b(0.16, 0.12, 0.2, c, 0, by, 0);
  b(0.18, 0.1, 0.16, c, 0, by - 0.005, -0.01);
  b(0.13, 0.04, 0.16, belly, 0, by - 0.05, 0.01);
  b(0.1, 0.06, 0.02, belly, 0, by - 0.02, 0.1);
  if (o.stripe) b(0.03, 0.012, 0.16, o.stripe, 0, by + 0.062, -0.01);
  [[-0.05, 0.06], [0.05, 0.06], [-0.05, -0.06], [0.05, -0.06]].forEach(([x, z], i) => { const lg = P('leg' + i, x, 0.03, z); lg(0.035, 0.03, 0.035, 0xffb8c0, x, 0.015, z + 0.005); });
  const h = P('head', 0, by + 0.03, 0.08);
  const sy = by + 0.04, sz = 0.12;
  h(0.15, 0.12, 0.1, c, 0, sy, sz);
  h(0.19, 0.07, 0.07, belly, 0, sy - 0.025, sz + 0.02);              // 빵빵한 볼주머니
  h(0.02, 0.014, 0.01, 0xff8aa0, 0, sy - 0.005, sz + 0.06);
  eyes(h, 0.04, sy + 0.015, sz + 0.051, { size: 0.026, color: eye });
  for (const k of [-1, 1]) { h(0.04, 0.035, 0.02, c, k * 0.05, sy + 0.07, sz - 0.02); h(0.025, 0.022, 0.006, 0xffb0c0, k * 0.05, sy + 0.07, sz - 0.008); }
  const t = P('tail', 0, by, -0.1);
  t(0.025, 0.02, 0.02, c, 0, by - 0.01, -0.11);
}

// ---------------- 카피바라 ----------------
function capybara(P, o) {
  const c = o.c, c2 = o.c2 ?? 0x8a6038;
  const leg = 0.1, by = leg + 0.12;
  const b = P('body');
  b(0.28, 0.24, 0.5, c, 0, by, 0);
  b(0.3, 0.2, 0.4, c, 0, by - 0.01, -0.02);
  b(0.26, 0.04, 0.4, c2, 0, by - 0.12, 0.0);
  for (let k = 0; k < 6; k++) b(0.29, 0.012, 0.02, c2, 0, by + 0.08 - (k % 2) * 0.03, -0.18 + k * 0.07); // 털결
  legs4(P, { leg, x: 0.09, zf: 0.17, zb: -0.17, w: 0.08, c: c2, paw: 0x3a2a1a });
  const h = P('head', 0, by + 0.06, 0.25);
  const sy = by + 0.08, sz = 0.36;
  h(0.22, 0.2, 0.22, c, 0, sy, sz);                                 // 네모난 큰 얼굴
  h(0.2, 0.15, 0.08, c2, 0, sy - 0.02, sz + 0.13);                  // 넓적 코
  for (const k of [-1, 1]) h(0.03, 0.04, 0.01, 0x2a1a10, k * 0.05, sy, sz + 0.172);
  h(0.06, 0.012, 0.01, 0x3a2416, 0, sy - 0.065, sz + 0.172);
  eyes(h, 0.08, sy + 0.06, sz + 0.11, { size: 0.03 });
  for (const k of [-1, 1]) for (let e = 0; e < 3; e++) h(0.005, 0.03, 0.005, 0x3a2416, k * 0.08 + (e - 1) * 0.012, sy + 0.096, sz + 0.11); // 졸린 눈썹
  for (const k of [-1, 1]) { h(0.05, 0.04, 0.03, c2, k * 0.08, sy + 0.12, sz - 0.07); }
  // 머리 위 유자 (카피바라는 온천에서 유자를 올려요)
  h(0.08, 0.07, 0.08, 0xffb21a, 0, sy + 0.14, sz - 0.02);
  h(0.06, 0.02, 0.06, 0xffc84a, 0, sy + 0.18, sz - 0.02);
  h(0.02, 0.025, 0.02, 0x4a8a2a, 0, sy + 0.2, sz - 0.02);
  h(0.04, 0.01, 0.025, 0x5aaa3a, 0.025, sy + 0.205, sz - 0.02, 0, 0, -0.4);
  const t = P('tail', 0, by, -0.25);
  t(0.04, 0.04, 0.03, c2, 0, by + 0.02, -0.26);
}

// ---------------- 곰 · 판다 ----------------
function bear(P, o) {
  const { c, c2 = c, muzzle = 0xe8c89a, leg = c2, shoulder, patch, eye = 0x15131a, ear = c2 } = o;
  const lg = 0.14, by = lg + 0.13;
  const b = P('body');
  b(0.28, 0.26, 0.38, c, 0, by, 0);
  b(0.3, 0.24, 0.26, c, 0, by - 0.01, -0.04);
  if (shoulder) b(0.305, 0.27, 0.12, shoulder, 0, by + 0.005, 0.12);
  b(0.2, 0.04, 0.24, o.belly ?? c, 0, by - 0.125, 0.02);
  legs4(P, { leg: lg, x: 0.09, zf: 0.13, zb: -0.13, w: 0.09, c: leg, paw: leg });
  for (let i = 0; i < 4; i++) { const p = P('leg' + i); const lx = i % 2 ? 0.09 : -0.09, lz = i < 2 ? 0.13 : -0.13; p(0.06, 0.012, 0.012, 0xe8b8a0, lx, 0.012, lz + 0.065); }
  const h = P('head', 0, by + 0.08, 0.18);
  const sy = by + 0.15, sz = 0.26;
  h(0.25, 0.22, 0.2, c, 0, sy, sz);
  h(0.27, 0.1, 0.15, c, 0, sy - 0.05, sz);
  h(0.12, 0.08, 0.06, muzzle, 0, sy - 0.05, sz + 0.11);
  h(0.05, 0.035, 0.025, 0x1a1414, 0, sy - 0.025, sz + 0.142);
  h(0.012, 0.025, 0.012, 0x3a2420, 0, sy - 0.06, sz + 0.142);
  if (patch) for (const k of [-1, 1]) h(0.065, 0.07, 0.012, patch, k * 0.065, sy + 0.015, sz + 0.1, 0, 0, k * -0.35);
  eyes(h, 0.062, sy + 0.02, sz + 0.108, { size: 0.034, color: patch ? 0x15131a : eye });
  for (const k of [-1, 1]) { h(0.08, 0.07, 0.04, ear, k * 0.1, sy + 0.12, sz - 0.04); h(0.045, 0.04, 0.01, patch ? ear : 0xc89a7a, k * 0.1, sy + 0.12, sz - 0.018); }
  const t = P('tail', 0, by, -0.19);
  t(0.06, 0.06, 0.04, c, 0, by + 0.04, -0.2);
}

// ---------------- 수달 ----------------
function otter(P, o) {
  const { c, belly = 0xd8b890 } = o;
  const leg = 0.07, by = leg + 0.08;
  const b = P('body');
  b(0.17, 0.16, 0.5, c, 0, by, -0.02);
  b(0.19, 0.17, 0.2, c, 0, by + 0.01, 0.12);
  b(0.13, 0.04, 0.42, belly, 0, by - 0.075, 0.0);
  b(0.15, 0.1, 0.03, belly, 0, by, 0.22);
  legs4(P, { leg, x: 0.07, zf: 0.16, zb: -0.16, w: 0.06, c: 0x5a3a22, paw: 0x4a2e18 });
  const h = P('head', 0, by + 0.04, 0.22);
  const sy = by + 0.08, sz = 0.3;
  h(0.17, 0.14, 0.14, c, 0, sy, sz);
  h(0.15, 0.08, 0.08, belly, 0, sy - 0.03, sz + 0.07);                  // 하얀 얼굴
  h(0.045, 0.03, 0.02, 0x1a1414, 0, sy - 0.0, sz + 0.115);
  for (const k of [-1, 1]) for (const yy of [-0.02, -0.035]) h(0.07, 0.004, 0.004, 0xf4f0ea, k * 0.08, sy + yy, sz + 0.1, 0, 0, k * 0.1);
  eyes(h, 0.045, sy + 0.03, sz + 0.071, { size: 0.03 });
  for (const k of [-1, 1]) h(0.035, 0.03, 0.02, 0x5a3a22, k * 0.075, sy + 0.06, sz - 0.03);
  // 가슴에 꼭 안은 조개 (수달은 좋아하는 돌·조개를 갖고 다녀요)
  b(0.08, 0.06, 0.03, 0xf8e8d8, 0, by + 0.0, 0.24); b(0.07, 0.012, 0.032, 0xe8c8b0, 0, by + 0.01, 0.24); b(0.07, 0.012, 0.032, 0xe8c8b0, 0, by - 0.012, 0.24);
  const t = P('tail', 0, by - 0.01, -0.27);
  for (let k = 0; k < 5; k++) { const s = 0.1 - k * 0.016; t(s, s * 0.7, 0.07, c, 0, by - 0.02 - k * 0.012, -0.3 - k * 0.06); }
}

// ---------------- 거북이 ----------------
function turtle(P, o) {
  const { c = 0x4a8a3a, shell = 0x7a5a2a, shell2 = 0xa8803a, skin = 0x8ac86a } = o;
  const by = 0.09;
  const b = P('body');
  b(0.3, 0.06, 0.34, 0xd8c890, 0, by - 0.02, 0);                 // 배딱지
  b(0.32, 0.08, 0.36, shell, 0, by + 0.04, 0);                   // 등딱지
  b(0.26, 0.06, 0.3, shell, 0, by + 0.1, 0);
  b(0.18, 0.04, 0.2, shell, 0, by + 0.14, 0);
  for (const [x, z] of [[0, 0], [0.08, 0.08], [-0.08, 0.08], [0.08, -0.08], [-0.08, -0.08], [0, 0.12], [0, -0.12]]) b(0.07, 0.012, 0.07, shell2, x, by + (x || z ? 0.131 : 0.161), z); // 등 무늬 칸
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b(0.05, 0.03, 0.05, shell2, Math.cos(a) * 0.15, by + 0.01, Math.sin(a) * 0.17); }
  [[-0.12, 0.12], [0.12, 0.12], [-0.12, -0.12], [0.12, -0.12]].forEach(([x, z], i) => { const lg = P('leg' + i, x, 0.05, z); lg(0.07, 0.06, 0.07, skin, x * 1.1, 0.03, z * 1.1); for (const t of [-1, 0, 1]) lg(0.012, 0.01, 0.012, 0xf4f0e0, x * 1.1 + t * 0.02, 0.005, z * 1.1 + Math.sign(z) * 0.035); });
  const h = P('head', 0, by + 0.02, 0.18);
  h(0.06, 0.06, 0.1, skin, 0, by + 0.03, 0.22);                  // 목
  h(0.1, 0.09, 0.11, skin, 0, by + 0.06, 0.3);
  h(0.08, 0.012, 0.01, 0x3a5a2a, 0, by + 0.03, 0.356);             // 웃는 입
  eyes(h, 0.035, by + 0.08, 0.356, { size: 0.026 });
  const t = P('tail', 0, by, -0.18);
  t(0.04, 0.03, 0.06, skin, 0, by - 0.01, -0.21);
}

// ---------------- 오리 · 펭귄 (두 발) ----------------
function duck(P, o) {
  const { c = 0xffe04a, c2 = 0xffd02a, beak = 0xff9a2a } = o;
  const by = 0.12;
  const b = P('body');
  b(0.18, 0.15, 0.24, c, 0, by, 0);
  b(0.16, 0.12, 0.08, c, 0, by + 0.04, -0.13, 0.5, 0, 0);          // 뾰족 꼬리깃
  b(0.15, 0.04, 0.2, c2, 0, by - 0.07, 0.01);
  [[-0.045, 0.02], [0.045, 0.02]].forEach(([x, z], i) => { const lg = P('leg' + i, x, 0.06, z); lg(0.02, 0.06, 0.02, beak, x, 0.03, z); lg(0.06, 0.012, 0.07, beak, x, 0.006, z + 0.02); });
  for (const [n, k] of [['wingL', -1], ['wingR', 1]]) { const w = P(n, k * 0.09, by + 0.04, 0.04); w(0.025, 0.1, 0.17, c2, k * 0.1, by + 0.01, -0.01); w(0.026, 0.04, 0.08, c, k * 0.1, by + 0.05, 0.03); }
  const h = P('head', 0, by + 0.07, 0.07);
  const sy = by + 0.15, sz = 0.09;
  h(0.14, 0.13, 0.13, c, 0, sy, sz);
  h(0.1, 0.03, 0.07, beak, 0, sy - 0.03, sz + 0.09);               // 넓적한 부리
  h(0.08, 0.02, 0.05, 0xf08a1a, 0, sy - 0.05, sz + 0.08);
  for (const k of [-1, 1]) h(0.035, 0.022, 0.01, 0xffa8a8, k * 0.055, sy - 0.02, sz + 0.066); // 발그레
  eyes(h, 0.04, sy + 0.015, sz + 0.066, { size: 0.03 });
  h(0.02, 0.05, 0.02, c, 0, sy + 0.08, sz - 0.01, 0.3, 0, 0);       // 머리 깃털 한 가닥
  P('tail', 0, by, -0.12);
}
function penguin(P, o) {
  const back = 0x22283a, front = 0xf8f8f4, beak = 0xffa02a;
  const by = 0.16;
  const b = P('body');
  b(0.22, 0.26, 0.2, back, 0, by + 0.02, 0);
  b(0.18, 0.24, 0.04, front, 0, by + 0.01, 0.095);
  b(0.2, 0.06, 0.18, back, 0, by - 0.12, -0.01);
  b(0.1, 0.06, 0.04, back, 0, by - 0.1, -0.11, 0.4, 0, 0);
  if (o.scarf) { b(0.235, 0.04, 0.215, o.scarf, 0, by + 0.12, 0); b(0.05, 0.1, 0.02, o.scarf, 0.06, by + 0.06, 0.11); }
  [[-0.05, 0.03], [0.05, 0.03]].forEach(([x, z], i) => { const lg = P('leg' + i, x, 0.04, z); lg(0.03, 0.04, 0.03, beak, x, 0.02, z); lg(0.06, 0.012, 0.07, beak, x, 0.006, z + 0.02); });
  for (const [n, k] of [['wingL', -1], ['wingR', 1]]) { const w = P(n, k * 0.115, by + 0.1, 0); w(0.03, 0.2, 0.1, back, k * 0.125, by + 0.0, 0); }
  const h = P('head', 0, by + 0.14, 0.0);
  const sy = by + 0.22, sz = 0.01;
  h(0.2, 0.16, 0.18, back, 0, sy, sz);
  h(0.14, 0.1, 0.03, front, 0, sy - 0.02, sz + 0.085);
  for (const k of [-1, 1]) h(0.05, 0.06, 0.03, front, k * 0.05, sy + 0.01, sz + 0.08);
  h(0.06, 0.035, 0.06, beak, 0, sy - 0.025, sz + 0.12);
  for (const k of [-1, 1]) h(0.03, 0.02, 0.01, 0xffa8b8, k * 0.07, sy - 0.04, sz + 0.1);
  eyes(h, 0.045, sy + 0.01, sz + 0.1, { size: 0.028 });
  P('tail', 0, by, -0.1);
}

// ---------------- 아기 용 (날아다녀요) ----------------
function dragon(P, o) {
  const { c = 0x4ab87a, c2 = 0x2a8a5a, belly = 0xf8e09a, wing = 0x9ad8b0, horn = 0xf4ecd8, glow = 0x8affd8 } = o;
  const leg = 0.11, by = leg + 0.11;
  const b = P('body');
  b(0.2, 0.2, 0.34, c, 0, by, 0);
  b(0.22, 0.2, 0.18, c, 0, by + 0.01, 0.08);
  for (let k = 0; k < 5; k++) b(0.14, 0.012, 0.05, belly, 0, by - 0.1, -0.12 + k * 0.06);    // 배 비늘 줄
  for (let k = 0; k < 4; k++) b(0.035, 0.05, 0.035, c2, 0, by + 0.12, -0.12 + k * 0.08, 0.4, 0, 0); // 등 가시
  b.glow(0.06, 0.06, 0.012, glow, 0, by + 0.03, 0.172);                                      // 가슴에서 빛나는 보석
  legs4(P, { leg, x: 0.08, zf: 0.11, zb: -0.11, w: 0.06, c: c2, paw: c2 });
  for (let i = 0; i < 4; i++) { const p = P('leg' + i); const lx = i % 2 ? 0.08 : -0.08, lz = i < 2 ? 0.11 : -0.11; for (const t of [-1, 0, 1]) p(0.012, 0.015, 0.02, horn, lx + t * 0.02, 0.01, lz + 0.045); }
  for (const [n, k] of [['wingL', -1], ['wingR', 1]]) {
    const w = P(n, k * 0.09, by + 0.08, 0.02);
    w(0.2, 0.02, 0.025, c2, k * 0.19, by + 0.12, 0.02, 0, 0, k * -0.3);                       // 날개 뼈
    for (let s = 0; s < 3; s++) w(0.07, 0.012, 0.16 - s * 0.03, wing, k * (0.13 + s * 0.06), by + 0.09 + s * 0.012, -0.04 - s * 0.02, 0, 0, k * -0.3);
    w(0.02, 0.03, 0.02, horn, k * 0.3, by + 0.165, 0.02);
  }
  const h = P('head', 0, by + 0.07, 0.17);
  const sy = by + 0.15, sz = 0.24;
  h(0.2, 0.17, 0.18, c, 0, sy, sz);
  h(0.14, 0.08, 0.11, c, 0, sy - 0.04, sz + 0.12);
  h(0.13, 0.03, 0.1, belly, 0, sy - 0.08, sz + 0.11);
  for (const k of [-1, 1]) h(0.02, 0.015, 0.012, 0x1a3a2a, k * 0.03, sy - 0.01, sz + 0.176);
  for (const k of [-1, 1]) { h.glow(0.045, 0.05, 0.012, glow, k * 0.055, sy + 0.02, sz + 0.093); h(0.02, 0.035, 0.014, 0x0a2a1a, k * 0.055, sy + 0.02, sz + 0.096); }
  for (const k of [-1, 1]) { h(0.03, 0.06, 0.03, horn, k * 0.06, sy + 0.12, sz - 0.05, -0.5, 0, k * 0.2); h(0.022, 0.05, 0.022, horn, k * 0.065, sy + 0.16, sz - 0.09, -1.0, 0, k * 0.2); }
  h(0.03, 0.04, 0.03, c2, 0, sy + 0.1, sz - 0.08);
  for (const k of [-1, 1]) h(0.012, 0.025, 0.04, wing, k * 0.11, sy + 0.02, sz - 0.04, 0, k * 0.4, 0);
  const t = P('tail', 0, by, -0.17);
  for (let k = 0; k < 7; k++) { const s = 0.09 - k * 0.009; t(s, s, 0.06, c, 0, by - k * 0.012, -0.2 - k * 0.05); if (k % 2 === 0) t(0.02, 0.035, 0.03, c2, 0, by + s / 2 - k * 0.012 + 0.01, -0.2 - k * 0.05); }
  t(0.08, 0.02, 0.06, c2, 0, by - 0.09, -0.56);       // 꼬리 끝 지느러미
  t.glow(0.04, 0.025, 0.04, glow, 0, by - 0.09, -0.56);
}

// ---------------- 반려동물 목록 ----------------
//  gait: walk 걷기 · hop 깡총 · waddle 뒤뚱 · fly 날기 · slow 느릿느릿
//  sit: quad (네 발로 앉기) · low (그냥 납작 엎드리기)
//  swim: 물에서도 같이 헤엄쳐요 · sound: 쓰다듬을 때 소리
export const PETS = [
  { id: 'duckling', name: '아기 오리', price: 3000, gait: 'waddle', sit: 'low', swim: true, sound: 'quack', desc: '삑삑 따라오는 노란 아기 오리. 물에서도 같이 동동 떠요.', build: (P) => duck(P, {}) },
  { id: 'hamster', name: '햄스터', price: 5000, gait: 'walk', sit: 'low', sound: 'squeak', scale: 1.15, desc: '볼이 빵빵한 손바닥만 한 친구.', build: (P) => hamster(P, { c: 0xf0b070, stripe: 0xc08048 }) },
  { id: 'bunny', name: '하얀 토끼', price: 6000, gait: 'hop', sit: 'low', sound: 'squeak', desc: '깡총깡총. 귀가 쫑긋한 하얀 토끼.', build: (P) => bunny(P, { c: 0xf8f6f2, belly: 0xffffff }) },
  { id: 'bunny_brown', name: '얼룩 토끼', price: 7500, gait: 'hop', sit: 'low', sound: 'squeak', desc: '갈색 얼룩이 귀여운 토끼.', build: (P) => bunny(P, { c: 0xf4ece0, belly: 0xffffff, spot: 0x8a5a3a, earIn: 0xf0a8a0 }) },
  { id: 'cat_cheese', name: '치즈 고양이', price: 8000, gait: 'walk', sit: 'quad', sound: 'meow', desc: '줄무늬 치즈 고양이. 낚시하면 옆에서 같이 물을 봐요.', build: (P) => cat(P, { c: 0xf0a040, belly: 0xfff0d8, stripe: 0xc86a1a, sock: 0xfff0d8, eye: 0x6ab84a }) },
  { id: 'cat_black', name: '까망 고양이', price: 12000, gait: 'walk', sit: 'quad', sound: 'meow', desc: '노란 눈의 새까만 고양이. 밤에 더 멋있어요.', build: (P) => cat(P, { c: 0x2a2830, belly: 0x34323a, eye: 0xf0d020, nose: 0x5a4a52, earIn: 0x6a4a5a }) },
  { id: 'cat_calico', name: '삼색 고양이', price: 16000, gait: 'walk', sit: 'quad', sound: 'meow', desc: '하양 · 주황 · 까만 얼룩이 섞인 고양이.', build: (P) => cat(P, { c: 0xfaf6ee, belly: 0xffffff, eye: 0xd8a020, patches: [[0.205, 0.1, 0.16, 0xe88a3a, 0, 0.29, -0.08], [0.15, 0.08, 0.12, 0x2a2628, 0.03, 0.31, 0.1]], tailTip: 0x2a2628 }) },
  { id: 'shiba', name: '시바견', price: 15000, gait: 'walk', sit: 'quad', sound: 'woof', desc: '말린 꼬리를 살랑살랑. 늘 웃는 얼굴의 시바.', build: (P) => dog(P, { c: 0xe0943a, collar: 0xd84a4a }) },
  { id: 'poodle', name: '하양 푸들', price: 22000, gait: 'walk', sit: 'quad', sound: 'woof', desc: '구름처럼 몽실몽실한 푸들.', build: (P) => dog(P, { c: 0xfaf6f0, belly: 0xffffff, cheek: 0xfaf6f0, ear: 'flop', tail: 'pom', fluffy: true, nose: 0x2a2026, collar: 0x5aa8f0 }) },
  { id: 'retriever', name: '골든 리트리버', price: 32000, gait: 'walk', sit: 'quad', sound: 'woof', desc: '다정하고 순한 황금빛 강아지.', build: (P) => dog(P, { c: 0xe8b860, belly: 0xf4d898, cheek: 0xe8b860, ear: 'flop', earC: 0xd8a048, tail: 'long', leg: 0.2, collar: 0x3a8a5a }) },
  { id: 'turtle', name: '꼬마 거북이', price: 25000, gait: 'slow', sit: 'low', swim: true, sound: 'squeak', desc: '느릿느릿 하지만 끝까지 따라와요.', build: (P) => turtle(P, {}) },
  { id: 'otter', name: '수달', price: 40000, gait: 'walk', sit: 'low', swim: true, sound: 'squeak', desc: '좋아하는 조개를 꼭 안고 다녀요. 헤엄 선수!', build: (P) => otter(P, { c: 0x7a5232 }) },
  { id: 'fox', name: '여우', price: 60000, gait: 'walk', sit: 'quad', sound: 'yip', desc: '복슬복슬한 꼬리의 숲속 여우.', build: (P) => fox(P, { c: 0xe8742a }) },
  { id: 'penguin', name: '아기 펭귄', price: 90000, gait: 'waddle', sit: 'low', swim: true, sound: 'quack', desc: '목도리를 두른 뒤뚱뒤뚱 아기 펭귄.', build: (P) => penguin(P, { scarf: 0xe84a5a }) },
  { id: 'bear', name: '아기 곰', price: 120000, gait: 'walk', sit: 'quad', sound: 'woof', desc: '꿀을 좋아하는 동글동글 아기 곰.', build: (P) => bear(P, { c: 0x8a5a32, c2: 0x6a4224, muzzle: 0xe0b888 }) },
  { id: 'capybara', name: '카피바라', price: 150000, gait: 'slow', sit: 'low', swim: true, sound: 'squeak', scale: 0.95, desc: '머리에 유자를 얹은 세상 느긋한 친구.', build: (P) => capybara(P, { c: 0xa87a4a }) },
  { id: 'panda', name: '아기 판다', price: 400000, gait: 'walk', sit: 'quad', sound: 'squeak', desc: '대나무 숲에서 온 귀한 아기 판다.', build: (P) => bear(P, { c: 0xfaf8f4, c2: 0x1e1c22, leg: 0x1e1c22, shoulder: 0x1e1c22, muzzle: 0xffffff, patch: 0x1e1c22, ear: 0x1e1c22, belly: 0xfaf8f4 }) },
  { id: 'spirit_fox', name: '오로라 여우', price: 1200000, gait: 'walk', sit: 'quad', sound: 'yip', glowAura: 0x8ae8ff, desc: '오로라 강에서 왔다는 신비한 하얀 여우. 꼬리 끝이 빛나요.', build: (P) => fox(P, { c: 0xf4f8ff, belly: 0xffffff, sock: 0xb8d8f0, tip: 0x8ae8ff, eye: 0x2a5a8a, glow: 0x8ae8ff }) },
  { id: 'dragon', name: '아기 용', price: 5000000, gait: 'fly', sit: 'quad', sound: 'roar', glowAura: 0x8affd8, desc: '정글 신전 전설 속 아기 용. 날개를 파닥이며 따라 날아요.', build: (P) => dragon(P, {}) },
  { id: 'dragon_red', name: '불꽃 아기 용', price: 8000000, gait: 'fly', sit: 'quad', sound: 'roar', glowAura: 0xffb04a, desc: '불꽃처럼 붉은 아기 용. 가슴 보석이 뜨겁게 빛나요.', build: (P) => dragon(P, { c: 0xe84a3a, c2: 0xa82a2a, belly: 0xffd88a, wing: 0xffa86a, glow: 0xffd04a }) }
];
export const findPet = (id) => PETS.find((p) => p.id === id);

// ---------------- 블록을 모아서 부위별로 한 덩어리씩 ----------------
export function buildPet(THREE, def) {
  const parts = {};
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const add = (list, piv) => (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const geo = box.clone();
    e.set(rx, ry, rz); q.setFromEuler(e);
    m4.compose(v.set(x - piv[0], y - piv[1], z - piv[2]), q, sc.set(w, h, d));
    geo.applyMatrix4(m4);
    const col = new THREE.Color(c), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    list.push(geo);
  };
  const P = (name, px = 0, py = 0, pz = 0) => {
    if (!parts[name]) parts[name] = { pivot: [px, py, pz], solid: [], glow: [] };
    const G = parts[name];
    const f = add(G.solid, G.pivot);
    f.glow = add(G.glow, G.pivot);
    return f;
  };
  def.build(P);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const rig = { root, body, parts: {}, legH: 0.15 };
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const [name, G] of Object.entries(parts)) {
    const pg = new THREE.Group();
    pg.position.set(G.pivot[0], G.pivot[1], G.pivot[2]);
    if (G.solid.length) { const m = new THREE.Mesh(mergeGeometries(G.solid, false), solidMat); m.castShadow = true; m.receiveShadow = true; pg.add(m); }
    if (G.glow.length) pg.add(new THREE.Mesh(mergeGeometries(G.glow, false), glowMat));
    G.solid.forEach((x) => x.dispose()); G.glow.forEach((x) => x.dispose());
    body.add(pg);
    rig.parts[name] = pg;
    if (name === 'leg0') rig.legH = G.pivot[1];
  }
  root.scale.setScalar((def.scale || 1) * 1.7);
  root.userData.dynamic = true;
  return rig;
}

// =====================================================
//  setupPets: 가게 · 따라다니기 · 집에서 놀기 · 친해지기
// =====================================================
export function setupPets(ctx) {
  const { THREE, scene, save, writeSave, money, openPanel, modalOpen, game, shops, seaWorld, makeShop, tone, sfx, updateUI, isNight, esc, mat, makePanel, drawPreview, notice, MATS } = ctx;
  const P = save.pets;

  // ---------- 하트 · 쿨쿨 그림 (스프라이트) ----------
  function spriteTex(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const heartTex = spriteTex((g) => {
    g.fillStyle = '#ff6a9a'; g.strokeStyle = '#ffffff'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 8, 8, 32, 20); g.bezierCurveTo(56, 8, 60, 34, 32, 54); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(22, 24, 5, 3, -0.6, 0, 6.3); g.fill();
  });
  const zTex = spriteTex((g) => { g.font = 'bold 46px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#3a4a7a'; g.strokeText('z', 32, 34); g.fillStyle = '#e8f0ff'; g.fillText('z', 32, 34); });
  const fx = [];
  function puff(tex, pos, n = 1, up = 0.6) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.3));
      s.scale.setScalar(0.001);
      scene.add(s);
      fx.push({ s, life: 0, max: 1.4 + Math.random() * 0.5, up, dx: (Math.random() - 0.5) * 0.3, size: tex === zTex ? 0.22 : 0.2 });
    }
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life += dt;
      const k = f.life / f.max;
      f.s.position.y += f.up * dt; f.s.position.x += f.dx * dt;
      f.s.scale.setScalar(f.size * Math.min(1, k * 5) * (1 - k * 0.3));
      f.s.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
      if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); }
    }
  }

  // ---------- 동물 소리 (짧은 전자음으로 흉내) ----------
  function petSound(def) {
    const s = def.sound;
    if (s === 'meow') { tone(820, 0.1, 'triangle', 0.04); tone(640, 0.2, 'triangle', 0.035, 0.08); }
    else if (s === 'woof') { tone(300, 0.08, 'square', 0.03); tone(240, 0.1, 'square', 0.025, 0.12); }
    else if (s === 'quack') { tone(560, 0.07, 'sawtooth', 0.02); tone(520, 0.08, 'sawtooth', 0.018, 0.1); }
    else if (s === 'yip') { tone(980, 0.06, 'triangle', 0.035); tone(1180, 0.08, 'triangle', 0.03, 0.07); }
    else if (s === 'roar') { tone(180, 0.25, 'sawtooth', 0.025); tone(260, 0.2, 'triangle', 0.03, 0.05); tone(520, 0.15, 'sine', 0.03, 0.2); }
    else { tone(1300, 0.05, 'sine', 0.035); tone(1500, 0.06, 'sine', 0.03, 0.06); }
  }

  // ---------- 동물 하나 만들기 ----------
  const live = []; // 지금 맵에 나와 있는 동물들
  function spawn(id, mode, house) {
    const def = findPet(id);
    const rig = buildPet(THREE, def);
    const p = { id, def, rig, mode, house, pos: new THREE.Vector3(), y: 0, ry: 0, phase: Math.random() * 6, speed: 0, sitK: 0, lieK: 0, sleepK: 0, fly: def.gait === 'fly' ? 1 : 0,
      idleT: 0, act: null, actT: 0, look: 0, happyT: 0, wanderAt: 0, target: null, zzAt: 0, swimK: 0 };
    scene.add(rig.root);
    if (def.glowAura) { // 빛나는 동물: 발밑에 은은한 빛 · 반짝 점
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.32, 24), new THREE.MeshBasicMaterial({ color: def.glowAura, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02; rig.root.add(halo); p.halo = halo;
      p.motes = [];
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshBasicMaterial({ color: def.glowAura, transparent: true, opacity: 0.8, depthWrite: false })); rig.root.add(m); p.motes.push({ m, a: (i / 6) * 6.28, r: 0.25 + Math.random() * 0.15, h: 0.1 + Math.random() * 0.4 }); }
    }
    p.entry = { kind: 'pet', pet: p, title: '', group: new THREE.Group(), pos: new THREE.Vector3(), promptAt: new THREE.Vector3(), r: 1.0 };
    shops.push(p.entry);
    live.push(p);
    return p;
  }
  function despawn(p) {
    scene.remove(p.rig.root);
    p.rig.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const i = shops.indexOf(p.entry); if (i >= 0) shops.splice(i, 1);
    live.splice(live.indexOf(p), 1);
  }
  const houseOf = (id) => seaWorld.houses.find((h) => h.id === id);
  const homeSpot = (h) => new THREE.Vector3(h.x0 + 0.8 + Math.random() * (h.x1 - h.x0 - 1.6), 0.32, h.z0 + 0.8 + Math.random() * (h.z1 - h.z0 - 1.6));
  // 세이브대로 동물들 다시 놓기: 데리고 다니는 1마리 + 집에서 노는 아이들 (최대 6)
  //  데리고 다니는 친구는 P.team (최대 5마리, P.on = 맨 앞 친구) · 나머지는 집에서 놀아요
  const MAX_TEAM = 5;
  function fixTeam() { P.team = (P.team || []).filter((id, i, a) => P.own.includes(id) && a.indexOf(id) === i).slice(0, MAX_TEAM); P.on = P.team[0] || null; }
  function syncPets() {
    for (const p of live.slice()) if (!p.shop) despawn(p);
    fixTeam();
    const pp = ctx.person.position;
    P.team.forEach((id, i) => {
      const p = spawn(id, 'follow');
      p.slot = i;
      p.pos.set(pp.x - 1.2 - i * 0.6, pp.y, pp.z - 1.2 + (i % 2) * 0.8); p.y = pp.y;
    });
    const h = save.homes[0] && houseOf(save.homes[0]);
    if (h) for (const id of P.own.filter((x) => !P.team.includes(x)).slice(0, 6)) { const p = spawn(id, 'home', h); p.pos.copy(homeSpot(h)); p.y = 0.32; p.ry = Math.random() * 6.28; }
  }
  // 멀티플레이용: 따라다니는 친구들 [동물 번호, x, y, z, 방향, 움직이는지]
  function followers() { return live.filter((p) => p.mode === 'follow').map((p) => [PETS.indexOf(p.def), Math.round(p.pos.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.pos.z * 100) / 100, Math.round(p.ry * 100) / 100, p.speed > 0.3 ? 1 : 0]); }

  // ---------- 친밀도 (0~100): 시간이 지나면 아주 조금씩 줄어요 ----------
  const love = (id) => P.love[id] ?? 20;
  function addLove(id, n) { P.love[id] = Math.max(0, Math.min(100, love(id) + n)); }
  function decayLove() {
    const now = Date.now();
    if (!P.t) P.t = now;
    const steps = Math.floor((now - P.t) / 600000); // 10분마다 1씩
    if (steps > 0) { for (const id of P.own) if (love(id) > 20) P.love[id] = Math.max(20, love(id) - steps); P.t += steps * 600000; }
  }
  const nameOf = (id) => P.nm[id] || findPet(id).name;
  const loveLabel = (n) => (n >= 90 ? '단짝' : n >= 60 ? '아주 친해요' : n >= 30 ? '친해요' : '서먹해요');
  function luckBonus() { if (!P.on) return 0; const n = Math.max(...(P.team && P.team.length ? P.team : [P.on]).map(love)); return n >= 90 ? 0.06 : n >= 60 ? 0.04 : n >= 30 ? 0.02 : 0; } // 데리고 다니는 친구 중 제일 친한 아이 기준

  // ---------- 쓰다듬기 ----------
  const petCool = {};
  function pat(p) {
    const now = performance.now();
    p.happyT = 1.4; p.act = null; p.sleepK = 0; p.idleT = 0;
    petSound(p.def);
    puff(heartTex, p.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 3, 0.5);
    if (!petCool[p.id] || now > petCool[p.id]) {
      petCool[p.id] = now + 20000;
      addLove(p.id, 4); writeSave();
      notice(`${nameOf(p.id)}를 쓰다듬었어요. 기분이 좋아 보여요! (친밀도 ${love(p.id)})`);
    } else notice(`${nameOf(p.id)}가 손에 머리를 비벼요.`);
  }

  // ---------- 먹이 주기 ----------
  const SNACKS = ['strawberry', 'berry', 'blueberry', 'apple', 'carrot', 'chestnut', 'mango', 'banana', 'coconut', 'watermelon', 'pumpkin'];
  function feedFish(id) {
    if (!save.inv.length) { notice('가방에 물고기가 없어요. 한 마리 낚아 와요!'); return; }
    const it = save.inv.reduce((a, b) => (b.price < a.price ? b : a)); // 제일 싼 물고기부터
    save.inv = save.inv.filter((x) => x !== it);
    if (game.selected === it.id) ctx.equip(null);
    addLove(id, 12);
    writeSave(); ctx.renderHotbar(); updateUI();
    const p = live.find((q) => q.id === id); if (p) { p.happyT = 1.6; puff(heartTex, p.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 4, 0.5); petSound(p.def); }
    notice(`${nameOf(id)}에게 ${it.name}를 줬어요. 냠냠! (친밀도 ${love(id)})`);
  }
  function feedSnack(id) {
    const have = SNACKS.find((k) => (save.mats[k] || 0) > 0);
    if (!have) { notice('간식(딸기 · 산딸기 · 사과 · 당근 같은 열매)이 없어요.'); return; }
    save.mats[have]--; if (!save.mats[have]) delete save.mats[have];
    addLove(id, 8);
    writeSave();
    const p = live.find((q) => q.id === id); if (p) { p.happyT = 1.4; puff(heartTex, p.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 3, 0.5); petSound(p.def); }
    const m = MATS.find((x) => x.id === have);
    notice(`${nameOf(id)}에게 ${m ? m.name : '간식'}을 줬어요. (친밀도 ${love(id)})`);
  }

  // ---------- 반려동물 가게 건물 ----------
  const shopPets = [];
  {
    const { g, part } = makeShop('petshop', '반려동물 가게', 24, 13.5, 17, 9, 0xfbe4b8, 0x5aa070);
    // 캣타워 (왼쪽 뒤)
    const post = mat(0xd8c098), pad = mat(0xa8d0e8), pad2 = mat(0xf0b8c8);
    part(0.7, 0.08, 0.7, pad, -1.15, 0.24, -0.85);
    part(0.12, 1.5, 0.12, post, -1.15, 0.95, -0.85);
    for (let k = 0; k < 10; k++) part(0.14, 0.03, 0.14, mat(0xc0a070), -1.15, 0.35 + k * 0.12, -0.85); // 감은 밧줄 무늬
    part(0.55, 0.08, 0.5, pad2, -1.15, 1.05, -0.85); part(0.45, 0.08, 0.45, pad, -1.15, 1.72, -0.85);
    part(0.4, 0.3, 0.4, pad2, -1.25, 0.45, -0.55); part(0.2, 0.18, 0.02, mat(0x5a3a4a), -1.25, 0.42, -0.34); // 숨는 집
    // 강아지 침대 · 밥그릇 (오른쪽)
    part(0.8, 0.12, 0.6, mat(0x7a5aa8), 1.0, 0.26, -0.75); part(0.66, 0.06, 0.46, mat(0xf4e8f8), 1.0, 0.34, -0.75);
    for (const [x, z, w, d] of [[1.0, -1.02, 0.8, 0.08], [0.62, -0.75, 0.08, 0.6], [1.38, -0.75, 0.08, 0.6]]) part(w, 0.2, d, mat(0x7a5aa8), x, 0.36, z);
    for (const [x, c] of [[0.35, 0xe84a5a], [0.62, 0x4a8ae8]]) { part(0.2, 0.07, 0.2, mat(c), x, 0.24, -0.25); part(0.15, 0.02, 0.15, mat(0xc8904a), x, 0.285, -0.25); }
    // 벽 선반: 사료 봉지 · 장난감 공
    part(2.6, 0.06, 0.28, mat(0x9a7048), 0, 1.85, -1.12);
    [0xe8a040, 0x4aa8d8, 0xe85a7a, 0x6ac85a, 0xf0d050].forEach((c, i) => { part(0.24, 0.32, 0.12, mat(c), -0.95 + i * 0.47, 2.05, -1.12); part(0.16, 0.08, 0.125, mat(0xffffff), -0.95 + i * 0.47, 2.08, -1.06); });
    for (const [x, c] of [[0.8, 0xe84a4a], [1.1, 0x4ac8e8], [-0.1, 0xf8d84a]]) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(c)); ball.position.set(x, 0.29, 0.25); g.add(ball); }
    // 계산대 위 · 바닥에 전시 동물 (살아 움직여요)
    const disp = [['cat_cheese', 0.55, 1.22, 0.95, 0, 'sit'], ['bunny', -0.6, 1.22, 0.95, 0.3, 'sit'], ['shiba', 1.0, 0.2, -0.7, -0.4, 'lie'], ['cat_black', -1.15, 1.76, -0.85, 0.5, 'lie']];
    for (const [id, x, y, z, ry, pose] of disp) {
      const p = spawn(id, 'shop');
      p.shop = true; p.pose = pose;
      const r = p.rig.root;
      scene.remove(r); g.add(r);
      r.position.set(x, y, z); r.rotation.y = ry; r.scale.multiplyScalar(0.85);
      p.entry.off = true; // 가게 동물은 쓰다듬기 대신 가게 창을 열어요
      shopPets.push(p);
    }
    // 가게 옆 작은 놀이 마당 (울타리 · 강아지 집 · 공)
    const fence = mat(0xf4ecdc), grass = mat(0x7ac85a), roofC = mat(0xd85a4a);
    part(2.6, 0.05, 2.2, grass, 3.4, 0.12, 0.2);
    for (let k = 0; k <= 6; k++) { part(0.08, 0.5, 0.08, fence, 2.1 + k * 0.433, 0.37, -0.9); part(0.08, 0.5, 0.08, fence, 2.1 + k * 0.433, 0.37, 1.3); }
    for (let k = 0; k <= 5; k++) part(0.08, 0.5, 0.08, fence, 4.7, 0.37, -0.9 + k * 0.44);
    for (const y of [0.3, 0.5]) { part(2.6, 0.05, 0.04, fence, 3.4, y, -0.9); part(2.6, 0.05, 0.04, fence, 3.4, y, 1.3); part(0.04, 0.05, 2.2, fence, 4.7, y, 0.2); }
    part(0.8, 0.6, 0.7, mat(0xe8c890), 4.1, 0.45, -0.35); part(0.3, 0.38, 0.02, mat(0x3a2a20), 3.9, 0.36, 0.01);
    for (const s of [-1, 1]) part(0.5, 0.06, 0.85, roofC, 4.1 + s * 0.2, 0.9, -0.35, 0, 0, s * -0.7);
    part(0.3, 0.1, 0.02, mat(0xfff4dc), 4.1, 0.65, 0.01);
    const yb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xffd84a)); yb.position.set(2.9, 0.23, 0.8); g.add(yb);
    part(0.24, 0.04, 0.06, mat(0xfaf4e8), 3.2, 0.17, 0.4); for (const s of [-1, 1]) part(0.06, 0.06, 0.09, mat(0xfaf4e8), 3.2 + s * 0.12, 0.17, 0.4); // 뼈다귀 장난감
    const yard = spawn('retriever', 'shop'); yard.shop = true; yard.pose = 'lie'; scene.remove(yard.rig.root); g.add(yard.rig.root); yard.rig.root.position.set(3.0, 0.15, -0.2); yard.rig.root.rotation.y = 1.1; yard.entry.off = true; shopPets.push(yard);
  }

  // ---------- 가게 · 내 동물 창 ----------
  const petPanel = makePanel('petPanel', '반려동물');
  let atShop = false;
  function renderPets() {
    decayLove();
    const body = petPanel.querySelector('.pbody');
    body.innerHTML = `<div class="count">가진 돈 ${money(save.money)} · 데리고 다니는 친구는 <b>5마리까지</b>, 나머지는 내 집에서 놀아요. 다가가서 <b>E</b> 로 쓰다듬고, 물고기나 간식을 주면 더 친해져요. 친해질수록 낚시 운이 조금 올라가요 (최대 +6%).</div>`;
    if (P.own.length) {
      body.insertAdjacentHTML('beforeend', '<div class="secTitle">내 친구들</div>');
      const grid = document.createElement('div'); grid.className = 'furnGrid';
      for (const id of P.own) {
        const def = findPet(id), n = love(id);
        const inTeam = (P.team || []).includes(id);
        const card = document.createElement('div'); card.className = 'furnCard petCard' + (inTeam ? ' on' : '');
        card.innerHTML = `<canvas width="150" height="110"></canvas><div class="fnm">${esc(nameOf(id))}</div><div class="fown">${esc(def.name)} · ${loveLabel(n)}</div><div class="loveBar"><i style="width:${n}%"></i></div>`;
        const mk = (t, fn, dis) => { const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = t; b.disabled = !!dis; b.onclick = () => { fn(); renderPets(); }; return b; };
        const row = document.createElement('div'); row.className = 'petBtns';
        row.append(
          mk(inTeam ? '집에 두기' : '데리고 다니기', () => {
            P.team = P.team || [];
            if (inTeam) P.team = P.team.filter((x) => x !== id);
            else if (P.team.length >= MAX_TEAM) { notice('데리고 다닐 수 있는 친구는 5마리까지예요. 한 마리를 집에 두고 와요.'); return; }
            else P.team.push(id);
            writeSave(); syncPets();
          }),
          mk('물고기 주기', () => feedFish(id), !save.inv.length),
          mk('간식 주기', () => feedSnack(id), !SNACKS.some((k) => save.mats[k])),
          mk('이름 짓기', () => { const v = prompt('새 이름 (10글자까지)', nameOf(id)); if (v != null) { const s = v.replace(/[<>]/g, '').trim().slice(0, 10); if (s) P.nm[id] = s; else delete P.nm[id]; writeSave(); } })
        );
        card.appendChild(row);
        grid.appendChild(card);
        drawPreview(card.querySelector('canvas'), 'pet:' + id, () => buildPet(THREE, def).root, true);
      }
      body.appendChild(grid);
    }
    body.insertAdjacentHTML('beforeend', `<div class="secTitle">${atShop ? '가게에서 데려오기' : '가게 친구들 (반려동물 가게에서 데려올 수 있어요)'}</div>`);
    const grid = document.createElement('div'); grid.className = 'furnGrid';
    for (const def of PETS.filter((d) => !P.own.includes(d.id))) {
      const card = document.createElement('div'); card.className = 'furnCard';
      card.innerHTML = `<canvas width="150" height="110"></canvas><div class="fnm">${esc(def.name)}</div><div class="fpr">${money(def.price)}</div><div class="fown petDesc">${esc(def.desc)}</div>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '데려오기';
      b.disabled = !atShop || save.money < def.price;
      b.onclick = () => {
        if (!atShop || save.money < def.price) return;
        save.money -= def.price; P.own.push(def.id); P.love[def.id] = 20;
        P.team = P.team || []; if (P.team.length < MAX_TEAM) P.team.push(def.id); fixTeam();
        writeSave(); sfx.coin(); updateUI(); syncPets();
        notice(`${def.name}가 가족이 됐어요! 다가가서 E 로 쓰다듬어 줘요.`);
        renderPets();
      };
      card.appendChild(b);
      grid.appendChild(card);
      drawPreview(card.querySelector('canvas'), 'pet:' + def.id, () => buildPet(THREE, def).root, true);
    }
    body.appendChild(grid);
  }
  function openPets(shop) { atShop = !!shop; renderPets(); openPanel(petPanel); }
  const petBtn = document.createElement('button');
  petBtn.className = 'smallBtn'; petBtn.id = 'petBtn'; petBtn.textContent = '반려동물 (P)';
  petBtn.onclick = (e) => { e.currentTarget.blur(); openPets(false); };
  const topBar = document.getElementById('multiBtn')?.parentElement;
  if (topBar) topBar.insertBefore(petBtn, document.getElementById('accountBtn'));
  window.addEventListener('keydown', (e) => {
    if (e.repeat || ctx.decorating()) return;
    if (e.code === 'KeyP' && !e.ctrlKey && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
      if (!petPanel.classList.contains('hidden')) petPanel.classList.add('hidden');
      else if (!modalOpen()) openPets(game.nearShop && game.nearShop.kind === 'petshop');
    }
  });

  // ---------- 움직임 ----------
  const tmp = new THREE.Vector3();
  const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  function animate(p, dt, t) {
    const { rig, def } = p, L = rig.legH, parts = rig.parts;
    const moving = p.speed > 0.15;
    const wantSit = !moving && (p.pose === 'sit' || p.idleT > 1.2) && p.pose !== 'lie' && p.act !== 'stand';
    const wantLie = !moving && (p.pose === 'lie' || p.act === 'lie' || p.sleeping);
    p.sitK += ((wantSit && !wantLie ? 1 : 0) - p.sitK) * Math.min(1, dt * 5);
    p.lieK += ((wantLie ? 1 : 0) - p.lieK) * Math.min(1, dt * 4);
    p.phase += dt * (def.gait === 'slow' ? 5 : def.gait === 'hop' ? 9 : 11) * Math.min(1.6, 0.4 + p.speed * 0.35);
    const sw = moving ? Math.sin(p.phase) : 0;
    const quad = def.sit === 'quad';
    const free = (1 - p.sitK) * (1 - p.lieK);
    let bodyY = 0, pitch = 0, roll = 0;
    // 걸음 모양
    if (def.gait === 'hop' && moving) { bodyY += Math.abs(Math.sin(p.phase)) * 0.12; pitch += -Math.cos(p.phase) * 0.18; }
    else if (def.gait === 'waddle') roll += sw * 0.18;
    else if (moving) bodyY += Math.abs(sw) * 0.012;
    // 앉기 · 엎드리기
    if (quad) { bodyY -= L * 0.3 * p.sitK; pitch -= 0.42 * p.sitK; }
    else bodyY -= L * 0.75 * p.sitK;
    bodyY -= L * 0.85 * p.lieK;
    // 신나서 콩콩 (쓰다듬기 · 먹이)
    if (p.happyT > 0) { p.happyT -= dt; bodyY += Math.abs(Math.sin(p.happyT * 9)) * 0.06; }
    // 날기
    if (def.gait === 'fly') {
      const flyT = p.lieK > 0.5 || p.sitK > 0.6 ? 0 : 1;
      p.fly += (flyT - p.fly) * Math.min(1, dt * 2);
      bodyY += p.fly * (0.45 + Math.sin(t * 2.4 + p.phase * 0.1) * 0.06);
      pitch += p.fly * (moving ? 0.15 : 0);
    }
    // 헤엄
    bodyY -= p.swimK * L * 0.9;
    rig.body.position.y = bodyY + Math.sin(t * 2.2) * 0.004 * (1 - p.lieK); // 숨쉬기
    rig.body.rotation.x = pitch;
    rig.body.rotation.z = roll;
    // 다리
    for (let i = 0; i < 4; i++) {
      const lg = parts['leg' + i]; if (!lg) continue;
      const front = i < 2;
      let a;
      if (!quad) a = (i === 0 ? sw : -sw) * 0.7 * free + (p.swimK ? Math.sin(t * 12 + i * 3) * 0.6 : 0);
      else {
        const gaitA = def.gait === 'hop' ? (front ? 0.3 : -0.5) * Math.cos(p.phase) : (i === 0 || i === 3 ? sw : -sw) * (def.gait === 'slow' ? 0.4 : 0.7);
        a = gaitA * free + p.sitK * (front ? 0.42 : -1.15) + p.lieK * (front ? -1.4 : 1.4);
        if (p.swimK) a = Math.sin(t * 10 + i * 1.7) * 0.7;
      }
      if (def.gait === 'fly' && p.fly > 0.5) a = (front ? 0.5 : 0.8) + Math.sin(t * 3 + i) * 0.1;
      lg.rotation.x += (a - lg.rotation.x) * Math.min(1, dt * 14);
    }
    // 날개
    for (const [n, k] of [['wingL', -1], ['wingR', 1]]) {
      const w = parts[n]; if (!w) continue;
      let a = 0;
      if (def.gait === 'fly') a = p.fly * Math.sin(t * (moving ? 16 : 9)) * 0.7 - 0.1;
      else if (def.gait === 'waddle') a = moving ? Math.sin(p.phase * 2) * 0.25 + 0.2 : p.happyT > 0 ? Math.sin(t * 20) * 0.5 + 0.4 : 0.05;
      w.rotation.z = k * a;
    }
    // 머리: 앉으면 몸 기울기만큼 들고, 엎드리면 숙이고, 가끔 두리번
    const hd = parts.head;
    if (hd) {
      const want = (quad ? 0.4 * p.sitK : 0) + p.lieK * 0.22 + (p.sleeping ? 0.25 : 0) - (p.happyT > 0 ? 0.25 : 0) + (p.act === 'groom' ? 0.6 + Math.sin(t * 9) * 0.15 : 0);
      hd.rotation.x += (want - hd.rotation.x) * Math.min(1, dt * 6);
      const lookY = p.act === 'look' ? Math.sin(p.actT * 1.6) * 0.7 : p.act === 'groom' ? 0.5 : p.look;
      hd.rotation.y += (lookY - hd.rotation.y) * Math.min(1, dt * 4);
      hd.rotation.z = p.act === 'tilt' ? 0.35 : hd.rotation.z * 0.9;
    }
    // 꼬리: 신나면 빨리 · 자면 천천히
    const tl = parts.tail;
    if (tl) {
      const fast = p.happyT > 0 ? 22 : moving ? 10 : p.sleeping ? 1.5 : 4;
      tl.rotation.y = Math.sin(t * fast + p.phase * 0.3) * (p.happyT > 0 ? 0.7 : 0.35);
      tl.rotation.x = p.sitK * 0.4 - (p.sleeping ? 0.3 : 0);
    }
    // 빛나는 동물 효과
    if (p.halo) { p.halo.material.opacity = 0.22 + Math.sin(t * 2.5) * 0.12; p.halo.scale.setScalar(1 + Math.sin(t * 1.7) * 0.1); }
    if (p.motes) for (const m of p.motes) { m.a += dt * 1.2; m.m.position.set(Math.cos(m.a) * m.r, m.h + bodyY + Math.sin(t * 2 + m.a) * 0.06, Math.sin(m.a) * m.r); m.m.rotation.y = t * 3; }
  }
  // 한가할 때 하는 짓 (두리번 · 그루밍 · 고개 갸웃 · 엎드리기)
  function idleBrain(p, dt, t) {
    p.idleT += dt;
    if (p.act) { p.actT += dt; if (p.actT > (p.act === 'lie' ? 12 : 2.6)) { p.act = null; p.actT = 0; } return; }
    if (p.idleT > 3 && Math.random() < dt * 0.25) {
      const list = ['look', 'look', 'groom', 'tilt', 'lie'];
      p.act = list[Math.floor(Math.random() * list.length)]; p.actT = 0;
    }
  }
  // 친구마다 주인 뒤쪽의 다른 자리로 따라와요 (주인 기준 [옆, 뒤])
  const SLOTS = [[0, 0], [-1.3, 0.5], [1.3, 0.5], [-0.75, 1.6], [0.75, 1.6]];
  function stepFollow(p, dt, t) {
    const per0 = ctx.person.position, sl = SLOTS[p.slot || 0] || SLOTS[0], pry = ctx.player.ry ?? 0;
    const per = { x: per0.x + Math.cos(pry) * sl[0] + Math.sin(pry) * sl[1], y: per0.y, z: per0.z - Math.sin(pry) * sl[0] + Math.cos(pry) * sl[1] };
    const dx = per.x - p.pos.x, dz = per.z - p.pos.z, d = Math.hypot(dx, dz);
    p.sleeping = false; p.swimK += ((game.swimming && p.def.swim ? 1 : 0) - p.swimK) * Math.min(1, dt * 3);
    if (game.inBoat) {
      // 보트에 같이 타요 (주인 옆자리)
      const ry = ctx.player.ry ?? ctx.person.rotation.y;
      tmp.set(0.45 - (p.slot || 0) * 0.22, 0, -0.25 + ((p.slot || 0) % 2) * 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); // 친구마다 보트 자리를 조금씩 다르게
      p.pos.set(per.x + tmp.x, per.y, per.z + tmp.z); p.y = per.y + 0.05;
      p.ry = ry; p.speed = 0; p.pose = 'sit';
    } else {
      p.pose = null;
      if (d > 28) { p.pos.set(per.x, per.y, per.z); p.y = per.y; }
      const waitShore = game.swimming && !p.def.swim && p.def.gait !== 'fly';
      const far = d > (ctx.player.moving ? 2.0 : 2.8);
      if (far && !waitShore) {
        const want = Math.min(7.5, Math.max(1.2, (d - 1.8) * 2.6)) * (p.def.gait === 'slow' ? 0.8 : 1);
        p.speed += (want - p.speed) * Math.min(1, dt * 6);
        const step = Math.min(p.speed * dt, d - 1.7);
        if (step > 0) { p.pos.x += (dx / d) * step; p.pos.z += (dz / d) * step; }
        p.ry = angLerp(p.ry, Math.atan2(dx, dz), Math.min(1, dt * 10));
        p.idleT = 0; p.act = null;
      } else {
        p.speed *= Math.max(0, 1 - dt * 10);
        idleBrain(p, dt, t);
        // 낚시 중이면 주인이 보는 쪽(물)을 같이 봐요
        const fishing = ['casting', 'bite', 'reeling', 'charging'].includes(game.state);
        const face = fishing && ctx.bobber ? Math.atan2(ctx.bobber.position.x - p.pos.x, ctx.bobber.position.z - p.pos.z) : Math.atan2(dx, dz);
        p.ry = angLerp(p.ry, face, Math.min(1, dt * 2.5));
        // 밤에 오래 가만히 있으면 쿨쿨
        if (isNight() && p.idleT > 20 && !fishing) p.sleeping = true;
      }
      if (!game.jumping) p.y += (per.y - p.y) * Math.min(1, dt * 6);
    }
  }
  function stepHome(p, dt, t, now) {
    const h = p.house;
    p.swimK = 0;
    if (!p.target || now > p.wanderAt) { p.target = Math.random() < 0.55 ? homeSpot(h) : null; p.wanderAt = now + 5000 + Math.random() * 9000; }
    p.sleeping = isNight() && !p.target;
    if (p.target) {
      const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { p.speed += (0.9 - p.speed) * Math.min(1, dt * 4); p.pos.x += (dx / d) * Math.min(d, p.speed * dt); p.pos.z += (dz / d) * Math.min(d, p.speed * dt); p.ry = angLerp(p.ry, Math.atan2(dx, dz), Math.min(1, dt * 6)); p.idleT = 0; p.act = null; }
      else { p.target = null; }
    } else { p.speed *= Math.max(0, 1 - dt * 8); idleBrain(p, dt, t); }
    p.y = 0.32;
  }

  let gifted = performance.now() + 150000 + Math.random() * 120000;
  syncPets();

  return {
    interact(s) {
      if (s.kind === 'petshop') { openPets(true); return true; }
      if (s.kind === 'pet') { pat(s.pet); return true; }
      return false;
    },
    luckBonus, live, followers,
    sync: syncPets,
    update(dt, t, now) {
      updateFx(dt);
      for (const p of live) {
        if (p.shop) { p.speed = 0; p.idleT += dt; idleBrain(p, dt, t); animate(p, dt, t); continue; }
        if (p.mode === 'follow') stepFollow(p, dt, t); else stepHome(p, dt, t, now);
        p.rig.root.position.set(p.pos.x, p.y, p.pos.z);
        p.rig.root.rotation.y = p.ry;
        animate(p, dt, t);
        p.entry.pos.set(p.pos.x, p.y, p.pos.z);
        p.entry.promptAt.set(p.pos.x, p.y + 0.95, p.pos.z);
        p.entry.title = `쓰다듬기 · ${nameOf(p.id)}`;
        if (p.sleeping && now > p.zzAt) { p.zzAt = now + 1300; puff(zTex, tmp.set(p.pos.x, p.y + 0.4, p.pos.z), 1, 0.35); }
      }
      // 친한 친구는 가끔 재료를 물어 와요
      if (P.on && now > gifted) {
        gifted = now + 180000 + Math.random() * 180000;
        if (love(P.on) >= 40 && !modalOpen()) {
          const pool = MATS.filter((m) => !m.rare && !m.season && m.zone && m.zone.length);
          const m = pool[Math.floor(Math.random() * pool.length)];
          save.mats[m.id] = (save.mats[m.id] || 0) + 1; writeSave();
          const p = live.find((q) => q.mode === 'follow');
          if (p) { p.happyT = 1.5; petSound(p.def); puff(heartTex, p.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 2, 0.5); }
          notice(`${nameOf(P.on)}가 ${m.name}을 물어 왔어요! (채집함 C)`);
        }
      }
    }
  };
}
