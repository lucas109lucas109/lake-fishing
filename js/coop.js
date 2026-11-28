// =====================================================
//  같이 놀기 — 멀티에서 친구들과 함께하면 더 좋은 것들
//
//   함께 모닥불 : 모닥불 가까이에 친구와 같이 있으면 '함께 모닥불' 버프 (운 +8%)
//   불꽃놀이    : 불꽃놀이 가게에서 사서 K 키로 쏴요. 같은 방 친구들 화면에도 터져요.
//                 여러 사람이 잇달아 쏘면 모두에게 '축제' 버프 (운 +5%)
//   황금 물고기 떼: 15분마다 3분 동안 호수 한곳에 금빛 물결이 생겨요.
//                 그 안에 찌를 던지면 운이 올라가고, 같이 있는 친구가 많을수록 더 올라가요.
//                 (진짜 시계로 정해서 같은 방 친구들은 모두 같은 때 · 같은 곳에 보여요)
//   손 흔들기   : V 키 (머리 위에 말풍선 · 친구 화면에도 보여요)
// =====================================================

export function setupCoop(ctx) {
  const { THREE, scene, save, writeSave, money, openPanel, modalOpen, game, makeShop, tone, sfx, updateUI, notice, isNight, makePanel, esc, inLake, groundY, colliders } = ctx;
  const multi = () => (ctx.multi ? ctx.multi() : null);
  const others = () => { const m = multi(); return m && m.connected ? m.positions() : []; };
  const me = () => ctx.person.position;
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

  // ---------- 공통: 반짝이 입자 ----------
  const sparks = [];
  const sparkGeo = new THREE.OctahedronGeometry(0.17, 0);
  const sparkMats = new Map(); // 색 + 밤낮 → 재질 하나 (같이 써요)
  const sparkMat = (color) => { const k = color + (isNight() ? 'n' : 'd'); if (!sparkMats.has(k)) sparkMats.set(k, new THREE.MeshBasicMaterial({ color, transparent: true, blending: isNight() ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, fog: false })); return sparkMats.get(k); };
  const MAX_SPARKS = 1400;
  // opt: drag 공기 저항 · size 크기 · trail 지나간 자리에 작은 불티 · twinkle 깜빡깜빡 · split 몇 초 뒤 다시 터짐 [색, 개수]
  function spark(pos, color, v, life, gravity, opt = {}) {
    if (sparks.length >= MAX_SPARKS) return;
    const m = new THREE.Mesh(sparkGeo, sparkMat(color));
    m.position.copy(pos); m.userData.dynamic = true; m.scale.setScalar(opt.size || 1);
    scene.add(m);
    sparks.push({ m, v, life: 0, max: life, g: gravity, drag: opt.drag ?? 1.2, size: opt.size || 1, trail: opt.trail || 0, tAcc: 0, twinkle: !!opt.twinkle, split: opt.split || null, color });
  }
  function burst(pos, color, n, speed, life, gravity = 3, opt = {}) {
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(speed * (0.75 + Math.random() * 0.3));
      spark(pos, color, v, life * (0.8 + Math.random() * 0.4), gravity, opt);
    }
  }
  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      s.v.y -= s.g * dt; s.v.multiplyScalar(1 - dt * s.drag);
      s.m.position.addScaledVector(s.v, dt);
      const k = s.life / s.max;
      let sc = s.size * (k > 0.6 ? Math.max(0.05, (1 - k) / 0.4) : 1) * (1 - k * 0.4);
      if (s.twinkle) sc *= Math.random() < 0.35 ? 0.15 : 1.1;
      s.m.scale.setScalar(sc);
      if (s.trail) { s.tAcc += dt; if (s.tAcc > s.trail) { s.tAcc = 0; spark(s.m.position, s.color, new THREE.Vector3(0, -0.2, 0), 0.5, 0.6, { size: s.size * 0.45, drag: 3 }); } }
      if (s.split && s.life > s.split[2]) { const [c, n] = s.split; s.split = null; burst(s.m.position, c, n, 2.2, 0.8, 1.5, { size: 0.6 }); }
      if (k >= 1) { scene.remove(s.m); sparks.splice(i, 1); }
    }
  }

  // ---------- 말풍선 (손 흔들기 · 응원) ----------
  function bubbleTex(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,.95)'; g.strokeStyle = '#5a4a7a'; g.lineWidth = 5;
    g.beginPath(); g.roundRect(8, 8, 240, 62, 24); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(112, 68); g.lineTo(128, 90); g.lineTo(144, 68); g.fill();
    g.font = 'bold 34px Jua, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a3a6a';
    g.fillText(text, 128, 40);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const bubbles = [];
  function bubble(group, text) {
    if (!group) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex(text), transparent: true, depthWrite: false }));
    s.scale.set(1.6, 0.6, 1);
    scene.add(s);
    bubbles.push({ s, group, life: 0 });
  }
  function updateBubbles(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.life += dt;
      b.s.position.copy(b.group.position).add(new THREE.Vector3(0, 3.6 + Math.min(0.3, b.life * 0.6), 0));
      b.s.material.opacity = b.life > 2.2 ? Math.max(0, 1 - (b.life - 2.2) / 0.6) : 1;
      if (b.life > 2.8) { scene.remove(b.s); b.s.material.map.dispose(); b.s.material.dispose(); bubbles.splice(i, 1); }
    }
  }
  const WAVES = ['안녕!', '반가워요!', '같이 낚시해요!', '최고예요!', '고마워요!'];
  let waveI = 0;
  function wave() {
    const text = WAVES[waveI++ % WAVES.length];
    bubble(ctx.person, text);
    tone(880, 0.06, 'triangle', 0.04); tone(1175, 0.08, 'triangle', 0.035, 0.06);
    const m = multi(); if (m) m.sendFx('wave', me().x, me().z, (waveI - 1) % WAVES.length);
  }

  // ---------- 불꽃놀이 ----------
  const FW_COLORS = [0xff5a7a, 0xffd84a, 0x5ad8ff, 0x8aff6a, 0xd88aff, 0xff9a3a, 0xffffff, 0x5affd8];
  const rockets = [];
  // ---------- 터지는 모양 7가지 ----------
  //  peony 공 · ring 고리 · willow 버드나무(금빛 꼬리가 길게 늘어져요) · crossette 십자(조각이 또 터져요)
  //  heart 하트 · glitter 반짝이(타닥타닥 깜빡) · chrysanthemum 국화(꼬리 달린 큰 공 + 가운데 다른 색)
  const SHAPES = ['peony', 'ring', 'willow', 'crossette', 'heart', 'glitter', 'chrysanthemum'];
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  flash.userData.dynamic = true; scene.add(flash);
  let flashT = 0;
  function explode(p, c1, c2, shape) {
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    if (shape === 'ring') {
      const tilt = Math.random() * 1.2 - 0.6, yaw = Math.random() * Math.PI;
      for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; const v = v3(Math.cos(a) * 7, Math.sin(a) * 7 * Math.sin(tilt), Math.sin(a) * 7 * Math.cos(tilt)).applyAxisAngle(v3(0, 1, 0), yaw); spark(p, i % 2 ? c1 : c2, v, 1.8, 1.2, { drag: 1.1, size: 1.2 }); }
      burst(p, 0xffffff, 20, 2, 0.8, 0.6);
    } else if (shape === 'willow') {
      burst(p, 0xffc84a, 110, 6, 3.4, 1.1, { drag: 1.8, trail: 0.07, size: 0.9 });
      burst(p, c1, 25, 3, 1.2, 1.2);
    } else if (shape === 'crossette') {
      for (let i = 0; i < 16; i++) { const th = (i / 16) * Math.PI * 2, ph = (i % 2 ? 0.6 : 1.5); const v = v3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(6.5); spark(p, c1, v, 1.6, 1.6, { size: 1.5, trail: 0.05, split: [c2, 14, 0.75] }); }
    } else if (shape === 'heart') {
      for (let i = 0; i < 100; i++) { const a = (i / 100) * Math.PI * 2, hx = 16 * Math.sin(a) ** 3, hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); const v = v3(hx * 0.42, hy * 0.42, 0).applyAxisAngle(v3(0, 1, 0), ctx.cam ? ctx.cam.yaw : 0); spark(p, i % 3 ? 0xff5a8a : 0xffb0c8, v, 2.0, 0.6, { drag: 1.6, size: 1.2 }); }
    } else if (shape === 'glitter') {
      burst(p, c1, 60, 6, 1.8, 1.6, { size: 1.1 });
      burst(p, 0xffffff, 120, 4.5, 2.4, 1.0, { twinkle: true, drag: 1.6, size: 0.7 });
    } else if (shape === 'chrysanthemum') {
      burst(p, c1, 120, 7.5, 2.0, 1.6, { trail: 0.06, size: 1.1 });
      burst(p, c2, 50, 3.2, 1.6, 1.3, { size: 1.2 });
      burst(p, 0xffffff, 16, 1.2, 0.7, 0.4);
    } else { // peony
      burst(p, c1, 110, 7, 1.9, 1.8, { size: 1.15 });
      burst(p, c2, 55, 3.8, 1.5, 1.5);
      burst(p, 0xffffff, 14, 1.2, 0.6, 0.5);
    }
    flash.position.copy(p); flash.material.color.setHex(c1); flashT = 0.35; // 하늘이 번쩍
  }
  function launch(x, z, c, mine, h = 7, shape = null) {
    const y0 = Math.max(groundY(x, z), ctx.waterY ?? -1e9) + 0.5; // 물 위에서 쏘면 물 높이부터
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }));
    head.position.set(x, y0, z); head.userData.dynamic = true;
    scene.add(head);
    const fuse = 1.0 + Math.random() * 0.15;
    // 중력 6 기준으로 fuse 초 뒤 딱 h 높이에서 터져요
    rockets.push({ head, vy: (h + 3 * fuse * fuse) / fuse, color: FW_COLORS[c % FW_COLORS.length], color2: FW_COLORS[(c + 3) % FW_COLORS.length], trail: 0, t: 0, fuse, shape: shape || SHAPES[(c + Math.floor(h * 7)) % SHAPES.length] });
    tone(300, 0.5, 'sawtooth', 0.012); tone(600, 0.4, 'sine', 0.01, 0.1);
    if (mine) { const m = multi(); if (m) m.sendFx('firework', x, z, c); }
    festival.push(performance.now());
  }
  function updateRockets(dt) {
    if (flashT > 0) { flashT -= dt; flash.material.opacity = Math.max(0, flashT) * (isNight() ? 0.9 : 0.4); flash.scale.setScalar(6 + (0.35 - flashT) * 40); } else flash.material.opacity = 0;
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t += dt; r.vy -= 6 * dt;
      r.head.position.y += r.vy * dt;
      r.head.position.x += Math.sin(r.t * 9) * 0.02;
      r.trail += dt;
      if (r.trail > 0.025) { r.trail = 0; burst(r.head.position, 0xffc860, 2, 0.5, 0.6, 1, { size: 0.7 }); }
      if (r.t > r.fuse) {
        const p = r.head.position;
        explode(p, r.color, r.color2, r.shape);
        const near = Math.sqrt(dist2(p, me()));
        const vol = Math.max(0.005, 0.05 - near * 0.0008);
        tone(90, 0.35, 'sawtooth', vol); tone(140, 0.25, 'square', vol * 0.6, 0.02);
        for (let k = 0; k < 6; k++) tone(1500 + Math.random() * 1500, 0.04, 'square', vol * 0.25, 0.25 + k * 0.07); // 타닥타닥
        scene.remove(r.head); r.head.geometry.dispose(); r.head.material.dispose();
        rockets.splice(i, 1);
      }
    }
  }
  // 여러 번 잇달아 터지면 (그중 친구 것이 있으면) 모두 축제 버프
  const festival = [];
  let friendFw = 0, festAt = 0;
  function checkFestival() {
    const now = performance.now();
    while (festival.length && now - festival[0] > 12000) festival.shift();
    if (festival.length >= 3 && now - friendFw < 12000 && now - festAt > 180000) {
      festAt = now;
      ctx.softBuff(0.05, 180);
      notice('친구들과 불꽃놀이 축제! 3분 동안 낚시 운 +5%');
      tone(784, 0.15, 'triangle', 0.05); tone(1047, 0.2, 'triangle', 0.05, 0.15);
    }
  }
  function fireKey() {
    if ((save.fireworks || 0) <= 0) { notice('불꽃놀이가 없어요. 마을의 불꽃놀이 가게에서 살 수 있어요.'); return; }
    save.fireworks--; writeSave();
    // 화면 위쪽(가운데에서 45% 위) 지점을 향하는 시선 위, 캐릭터보다 14칸 앞에서 터지게 맞춰요
    // (예전엔 캐릭터 뒤쪽 · 화면 위쪽 밖에서 터져서 안 보였어요)
    const cam = ctx.camera, cp = cam.position;
    const dir = new THREE.Vector3(0, 0.45, 0.5).unproject(cam).sub(cp).normalize();
    const hl = Math.hypot(dir.x, dir.z) || 1;
    const toMe = Math.hypot(me().x - cp.x, me().z - cp.z);
    const t = (toMe + 14) / hl;
    const x = cp.x + dir.x * t, z = cp.z + dir.z * t;
    const base = Math.max(groundY(x, z), ctx.waterY ?? -1e9) + 0.5;
    const h = Math.min(17, Math.max(7, cp.y + dir.y * t - base + 1)); // 터질 높이 (7~17칸, 화면 안에서 크게)
    // 한 번에 5발이 시간차로 연달아: 가운데 큰 거 + 양옆 + 위로 높이 (모양 · 색이 전부 달라요)
    const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    const plan = [[0, 0, 0], [-6, -2, 350], [6, -2, 700], [-3, 4, 1050], [3, 6, 1400]];
    const c0 = Math.floor(Math.random() * 8);
    plan.forEach(([off, dh, ms], i) => setTimeout(() => launch(x + side.x * off, z + side.z * off, c0 + i * 3, true, h + dh, SHAPES[(c0 + i * 2) % SHAPES.length]), ms));
    notice(`펑! 불꽃놀이 남은 개수 ${save.fireworks}개${isNight() ? '' : ' (밤에 쏘면 더 예뻐요)'}`);
  }

  // 불꽃놀이 가게: 마을 가장자리 빈자리에 세워요
  const fwPanel = makePanel('fwPanel', '불꽃놀이 가게');
  {
    const cands = [[-29, 9, -20, 6], [29, 18, 20, 12], [-8, 23, -4, 14], [10, 23, 6, 14], [-30, 19, -20, 12], [30, 4, 20, 6], [-18, 23, -12, 14]];
    let pick = cands.find(([x, z]) => !inLake(x, z, 3) && groundY(x, z) < 0.15 && !colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 3) ** 2)) || cands[0];
    const [x, z, fx, fz] = pick;
    const { g, part } = makeShop('fwshop', '불꽃놀이 가게', x, z, fx, fz, 0x2a2a4a, 0xd84a5a);
    const m = ctx.mat;
    // 진열대 위 폭죽 (색색 원통 다발) · 별 장식 · 줄 전구
    for (let i = 0; i < 9; i++) {
      const cx = -1.2 + (i % 5) * 0.55, cz = -0.9 + Math.floor(i / 5) * 0.35, h = 0.35 + (i % 3) * 0.12;
      part(0.12, h, 0.12, m(FW_COLORS[i % 8]), cx, 0.25 + h / 2, cz);
      part(0.14, 0.04, 0.14, m(0xf4e8c8), cx, 0.25 + h, cz);
      part(0.02, 0.1, 0.02, m(0x3a3a3a), cx, 0.3 + h, cz);
    }
    for (let i = 0; i < 4; i++) part(0.18, 0.5, 0.18, m(FW_COLORS[(i + 2) % 8]), -1.2 + i * 0.8, 1.45, 0.95);
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: FW_COLORS[i % 8] })); b.position.set(-1.6 + i * 0.4, 2.45 - Math.sin((i / 8) * Math.PI) * 0.18, 1.42); g.add(b); }
    for (const sx of [-1, 1]) { part(0.35, 0.08, 0.04, m(0xffd84a), sx * 1.1, 2.75, 1.4); part(0.08, 0.35, 0.04, m(0xffd84a), sx * 1.1, 2.75, 1.4); }
  }
  const FW_PACKS = [[1, 300], [5, 1300], [20, 4500]];
  function renderFw() {
    const body = fwPanel.querySelector('.pbody');
    body.innerHTML = `<div class="count">가진 돈 ${money(save.money)} · 가진 불꽃놀이 <b>${save.fireworks || 0}개</b><br>어디서든 <b>K</b> 키로 쏴요. 멀티에서 같은 방 친구들 화면에도 터져요. 친구들과 잇달아 쏘면 모두 '축제' 버프를 받아요!</div>`;
    for (const [n, price] of FW_PACKS) {
      const row = document.createElement('div'); row.className = 'sellRow';
      row.innerHTML = `<span class="nm">불꽃놀이 ${n}개 <span style="color:#aaa">${money(price)}</span></span>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '사기'; b.disabled = save.money < price;
      b.onclick = () => { if (save.money < price) return; save.money -= price; save.fireworks = (save.fireworks || 0) + n; writeSave(); sfx.coin(); updateUI(); renderFw(); };
      row.appendChild(b); body.appendChild(row);
    }
  }

  // ---------- 함께 모닥불 ----------
  let fireAt = 0;
  function checkCampfire(now) {
    const cp = ctx.campfire && ctx.campfire.pos;
    if (!cp || now - fireAt < 180000) return;
    if (dist2(me(), cp) > 4.5 * 4.5) return;
    const mates = others().filter((o) => dist2(o, cp) < 4.5 * 4.5);
    if (!mates.length) return;
    fireAt = now;
    ctx.softBuff(0.08, 180);
    notice(`${mates.map((o) => o.name).join(', ')} 님과 함께 모닥불! 3분 동안 낚시 운 +8%`);
    burst(cp.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffb04a, 30, 2.5, 1.2, 0.5);
  }

  // ---------- 황금 물고기 떼 (15분마다 3분) ----------
  const EVENT_EVERY = 15 * 60000, EVENT_LEN = 3 * 60000;
  const SPOTS = [[-8, -12], [8, -18], [0, -8], [-14, -18], [12, -10], [-4, -22], [16, -16]];
  const evGroup = new THREE.Group(); evGroup.visible = false; evGroup.userData.dynamic = true;
  scene.add(evGroup);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 48), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; evGroup.add(ring);
  const ring2 = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshBasicMaterial({ color: 0xffe890, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = -0.01; evGroup.add(ring2);
  // 하늘 높이 솟는 금빛 기둥 (마을 어디서든 보여요) + 안쪽 밝은 심지
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.4, 46, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  beam.position.y = 23; evGroup.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 46, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffe0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  core.position.y = 23; evGroup.add(core);
  // 금빛 물고기가 퐁퐁 뛰어올라요
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc830, emissive: 0xffa010, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
  const jumpers = Array.from({ length: 6 }, (_, i) => {
    const f = new THREE.Group(); f.scale.setScalar(1.8); // 크게 (잘 보이게)
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.5), goldMat); f.add(bd);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.16), goldMat); tl.position.z = -0.32; f.add(tl);
    evGroup.add(f);
    return { f, t: i * 0.7, a: Math.random() * 6.28, r: 1 + Math.random() * 2.2 };
  });
  const hud = document.createElement('div'); hud.id = 'coopHud'; hud.className = 'hidden'; document.body.appendChild(hud);
  let evShown = -1, evPos = null;
  function eventState(now = Date.now()) {
    const slot = Math.floor(now / EVENT_EVERY), into = now % EVENT_EVERY;
    if (into >= EVENT_LEN) return null;
    const [x, z] = SPOTS[slot % SPOTS.length];
    return { slot, x, z, left: EVENT_LEN - into };
  }
  function eventBonus() {
    const ev = eventState();
    if (!ev || !ctx.bobber || !ctx.bobber.visible) return 0;
    const b = ctx.bobber.position;
    if ((b.x - ev.x) ** 2 + (b.z - ev.z) ** 2 > 4 * 4) return 0;
    const mates = others().filter((o) => (o.x - ev.x) ** 2 + (o.z - ev.z) ** 2 < 12 * 12).length;
    return 0.1 + Math.min(4, mates) * 0.05; // 혼자 +10%, 친구 한 명마다 +5% (최대 +30%)
  }
  function updateEvent(dt, t) {
    const ev = eventState();
    if (!ev) { if (evGroup.visible) { evGroup.visible = false; hud.classList.add('hidden'); } return; }
    if (evShown !== ev.slot) {
      evShown = ev.slot;
      evPos = new THREE.Vector3(ev.x, (ctx.waterY ?? 0.02) + 0.04, ev.z);
      evGroup.position.copy(evPos);
      notice('황금 물고기 떼가 나타났어요! 큰 호수의 금빛 기둥 아래 동그란 물결 안에 찌를 던지면 운이 올라가요.');
      if (ctx.banner) ctx.banner('황금 물고기 떼!', '큰 호수에 금빛 기둥이 솟았어요 — 기둥 아래 금빛 물결 안에 찌를 던지면 3분 동안 운 +10% (친구와 함께면 더!)', '#ffd84a', 6500);
      tone(660, 0.15, 'triangle', 0.05); tone(990, 0.2, 'triangle', 0.05, 0.12); tone(1320, 0.3, 'sine', 0.05, 0.26);
    }
    evGroup.visible = true;
    ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.2;
    ring.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04);
    beam.material.opacity = 0.18 + Math.sin(t * 2) * 0.06; core.material.opacity = 0.3 + Math.sin(t * 3) * 0.1;
    for (const j of jumpers) {
      j.t += dt;
      const ph = (j.t % 3.2) / 0.9; // 0~1 뛰는 동안, 그 뒤엔 물속
      if (ph <= 1) {
        j.f.visible = true;
        const x = Math.cos(j.a) * j.r, z = Math.sin(j.a) * j.r;
        j.f.position.set(x + Math.cos(j.a + 1.57) * (ph - 0.5) * 1.2, Math.sin(ph * Math.PI) * 1.1, z + Math.sin(j.a + 1.57) * (ph - 0.5) * 1.2);
        j.f.rotation.set((ph - 0.5) * 2.2, -j.a, 0);
        if (ph < 0.05 || (ph > 0.95 && !j.splash)) { j.splash = ph > 0.95; burst(evPos.clone().add(j.f.position), 0xbfeaff, 6, 1.6, 0.6, 4); }
      } else { j.f.visible = false; j.splash = false; if (Math.random() < 0.01) { j.a = Math.random() * 6.28; j.r = 1 + Math.random() * 2.2; } }
    }
    const mates = others().filter((o) => (o.x - ev.x) ** 2 + (o.z - ev.z) ** 2 < 12 * 12).length;
    const s = Math.ceil(ev.left / 1000);
    // 어디로 가야 하는지: 카메라 기준 화살표 + 거리 / 찌가 물결 안이면 "적용 중"
    const pp = ctx.person.position, ddx = ev.x - pp.x, ddz = ev.z - pp.z, dist = Math.hypot(ddx, ddz);
    let ang = Math.atan2(-ddx, -ddz) - (ctx.cam ? ctx.cam.yaw : 0); ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    const arrow = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    const inside = eventBonus() > 0;
    const where = inside ? '찌가 금빛 물결 안! 운 적용 중' : dist < 6 ? '금빛 물결 안에 찌를 던져요' : `큰 호수 ${arrow} ${Math.round(dist)}m`;
    const txt = `황금 물고기 떼 · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} 남음 · ${where} · 운 +${Math.round((0.1 + Math.min(4, mates) * 0.05) * 100)}%${mates ? ` (함께 ${mates}명)` : ''}`;
    if (hud.textContent !== txt) hud.textContent = txt;
    hud.classList.remove('hidden');
  }

  // ---------- 키 ----------
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || modalOpen() || ctx.decorating() || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
    if (e.code === 'KeyV') wave();
    else if (e.code === 'KeyK') fireKey();
  });

  return {
    interact(s) { if (s.kind === 'fwshop') { renderFw(); openPanel(fwPanel); return true; } return false; },
    luckBonus: eventBonus, rockets, sparks,
    onFx(r, m) {
      if (m.k === 'firework') { friendFw = performance.now(); launch(m.x, m.z, m.c | 0, false, 14); }
      else if (m.k === 'wave') { bubble(r.group, WAVES[(m.c | 0) % WAVES.length]); tone(880, 0.06, 'triangle', 0.03); }
    },
    update(dt, t, now) {
      updateSparks(dt); updateBubbles(dt); updateRockets(dt); checkFestival();
      checkCampfire(now);
      updateEvent(dt, t);
    }
  };
}
