// =====================================================
//  멀티플레이 — 같은 방에 최대 5명이 같이 낚시해요
//  서버(server.js)의 /ws 에 연결해서, 내 모습을 0.1초마다 보내고
//  다른 사람들의 모습을 받아서 화면에 그려요.
// =====================================================

// 다른 플레이어 옷차림 (번호로 골라요)
export const PLAYER_LOOKS = [
  { skin: 0xf6cfa8, shirt: 0xf4efe4, vest: 0x4e6f8f, vestPocket: 0x3a5670, pants: 0x34405e, boots: 0x6b3e2a, hair: 'short', hairColor: 0x2a1a12, hat: 'bucket', hatColor: 0x8fb0d8 },
  { skin: 0xe8b48a, shirt: 0xd86a8a, pants: 0x3a3048, boots: 0x2a2220, hair: 'long', hairColor: 0x5a2a1a, hat: 'cap', hatColor: 0xffd36b },
  { skin: 0xf3d2b3, shirt: 0x6ab48a, vest: 0x2e5a44, vestPocket: 0x22443a, pants: 0x4a3a2a, boots: 0x3d2b20, hair: 'short', hairColor: 0xd8b060, hat: 'straw', hatColor: 0xe6cf8f },
  { skin: 0xdcae8a, shirt: 0x2a2a3a, pants: 0x5a5a7a, boots: 0x1a1a1a, hair: 'short', hairColor: 0x111111, glasses: 0x223344, hat: 'cap', hatColor: 0x7a3cff },
  { skin: 0xf0c8a0, shirt: 0xffa24a, pants: 0x2f3b52, boots: 0x2a2a30, hair: 'long', hairColor: 0x1f1a17, hat: 'bucket', hatColor: 0xff6a5a },
  { skin: 0xe2b896, shirt: 0xb8e0ff, vest: 0xf0ece0, vestPocket: 0xd0ccc0, pants: 0x3a4a5a, boots: 0x4a3020, hair: 'short', hairColor: 0x8a5a3a }
];

export function setupMulti(ctx) {
  const { THREE, scene, makeBlockPerson, buildRod, placeSpin, RODS, ROD_LEN, makeBobber, cordMat, makeNameTag,
    makeFishModel, findFish, fishScale, getMyState, onFeed, onStatus, outfitToLook, makeBoatModel, getOutfit } = ctx;

  let ws = null;
  let myId = null, room = null, maxPlayers = 5, opened = false, wanted = false;
  let lastSend = 0, heartbeat = 0;
  const remotes = new Map(); // id → 다른 플레이어
  const tmp = new THREE.Vector3();
  const FLOP_FISH = '물 만난 광어'; // 펄떡펄떡 뛰는 물고기

  const status = (text, ok = false) => onStatus && onStatus(text, ok, { room, count: remotes.size + 1, max: maxPlayers, connected: opened && !!room });

  // ---------- 연결 ----------
  function connect(name, roomCode, look) {
    disconnect(true);
    wanted = true;
    let url;
    try { url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; } catch (_) { return; }
    status('서버에 연결하는 중…');
    try { ws = new WebSocket(url); } catch (_) { status('연결할 수 없어요.'); return; }
    ws.onopen = () => {
      opened = true;
      ws.send(JSON.stringify({ t: 'join', name, room: roomCode, look, o: getOutfit ? getOutfit() : null, s: getMyState() }));
      // 탭을 내려 둬도 연결이 안 끊기게 가끔 신호를 보내요
      clearInterval(heartbeat);
      heartbeat = setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 's', s: getMyState() })); }, 5000);
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (_) { return; }
      handle(m);
    };
    ws.onclose = () => {
      const was = opened && room;
      clearInterval(heartbeat);
      opened = false;
      room = null;
      clearRemotes();
      if (!wanted) return;
      status(was ? '연결이 끊겼어요. 다시 접속해 보세요.' : '이 사이트에는 멀티 서버가 없어요. (server.js 로 켠 곳에서만 돼요)');
      wanted = false;
    };
    ws.onerror = () => {};
  }
  function disconnect(silent) {
    wanted = false;
    clearInterval(heartbeat);
    if (ws) { try { ws.send(JSON.stringify({ t: 'leave' })); } catch (_) {} try { ws.close(); } catch (_) {} }
    ws = null;
    opened = false;
    room = null;
    clearRemotes();
    if (!silent) status('혼자 하기 모드예요.');
  }

  // ---------- 받은 메시지 ----------
  function handle(m) {
    if (m.t === 'welcome') {
      myId = m.id; room = m.room; maxPlayers = m.max || 5;
      for (const p of m.players || []) addRemote(p);
      status(`방 ${room}에 들어왔어요!`, true);
      onFeed && onFeed(`방 ${room}에 들어왔어요. (${remotes.size + 1}/${maxPlayers}명)`);
    } else if (m.t === 'full') {
      status(`방이 꽉 찼어요. (최대 ${m.max}명)`);
      wanted = false;
      try { ws.close(); } catch (_) {}
    } else if (m.t === 'error') {
      status(String(m.msg || '오류가 났어요.'));
    } else if (m.t === 'join') {
      addRemote(m);
      onFeed && onFeed(`${m.name} 님이 들어왔어요.`);
      status(`방 ${room}`, true);
    } else if (m.t === 'leave') {
      const r = remotes.get(m.id);
      if (r) { onFeed && onFeed(`${r.name} 님이 나갔어요.`); removeRemote(m.id); status(`방 ${room}`, true); }
    } else if (m.t === 's') {
      const r = remotes.get(m.id);
      if (r && m.s) r.s = m.s;
    } else if (m.t === 'outfit') {
      const r = remotes.get(m.id);
      if (r && m.o) dressRemote(r, m.o);
    } else if (m.t === 'catch') {
      const r = remotes.get(m.id);
      const f = findFish(m.f);
      if (r && f) {
        popFish(r, f, m.m, m.w);
        const w = m.w < 1 ? m.w.toFixed(2) : m.w < 100 ? m.w.toFixed(1) : Math.round(m.w);
        onFeed && onFeed(`${r.name} 님이 ${m.m ? m.m.replace('+', ' ') + ' ' : ''}${f.name} ${w}kg를 낚았어요!`);
      }
    }
  }

  // ---------- 다른 플레이어 만들기 ----------
  function addRemote(p) {
    if (!p || !p.id || remotes.has(p.id) || p.id === myId) return;
    // 옷차림 정보가 있으면 그 옷으로, 없으면 기본 옷 중 하나로
    const look = p.o && outfitToLook ? outfitToLook(p.o) : PLAYER_LOOKS[Math.abs(p.look | 0) % PLAYER_LOOKS.length];
    const body = makeBlockPerson(look);
    body.group.scale.setScalar(1.2);
    const s = p.s || { x: 0, y: -0.08, z: 8, r: 0, a: 'idle', rod: -1, n: 0 };
    body.group.position.set(s.x, s.y, s.z);
    scene.add(body.group);
    const rodG = new THREE.Group();
    rodG.position.set(0, -1.048, -0.907);
    rodG.rotation.x = -2.1;
    rodG.visible = false;
    body.armR.add(rodG);
    const tag = makeNameTag();
    body.group.add(tag.sp);
    tag.draw(p.name, s.n || 0);
    const bob = makeBobber(0.9);
    bob.visible = false;
    scene.add(bob);
    const line = new THREE.Line(new THREE.BufferGeometry(), cordMat);
    line.visible = false;
    scene.add(line);
    remotes.set(p.id, { id: p.id, name: p.name, ...body, rodG, rodIdx: -2, spin: [], tag, boat: null, boatIdx: -1, shownN: s.n || 0, bob, line, s, held: null, heldKey: '', arm: 1.2, walkT: 0, pop: null, prev: body.group.position.clone() });
  }
  function removeRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    scene.remove(r.group, r.bob, r.line);
    if (r.boat) scene.remove(r.boat);
    if (r.pop) scene.remove(r.pop.model);
    remotes.delete(id);
  }
  function clearRemotes() { for (const id of [...remotes.keys()]) removeRemote(id); }

  // 옷을 바꾸면 몸을 새로 만들고 낚싯대·이름표·물고기를 옮겨요
  function dressRemote(r, o) {
    if (!outfitToLook) return;
    const nb = makeBlockPerson(outfitToLook(o));
    nb.group.scale.setScalar(1.2);
    nb.group.position.copy(r.group.position);
    nb.group.rotation.copy(r.group.rotation);
    r.armR.remove(r.rodG); nb.armR.add(r.rodG);
    r.group.remove(r.tag.sp); nb.group.add(r.tag.sp);
    if (r.held) { r.group.remove(r.held); nb.group.add(r.held); }
    scene.remove(r.group);
    scene.add(nb.group);
    Object.assign(r, nb);
  }

  function popFish(r, f, mut, w) {
    const model = makeFishModel(f, mut, w);
    const sc = fishScale(f, w);
    if (sc > 2.2) model.scale.multiplyScalar(2.2 / sc);
    scene.add(model);
    if (r.pop) scene.remove(r.pop.model);
    r.pop = { model, start: performance.now(), from: (r.s.b ? tmp.fromArray(r.s.b) : r.group.position).clone(), flop: f.name === FLOP_FISH };
  }

  // ---------- 매 프레임 ----------
  function update(now, dt, t) {
    // 내 모습 보내기 (0.1초마다)
    if (opened && room && ws && ws.readyState === 1 && now - lastSend > 100) {
      lastSend = now;
      ws.send(JSON.stringify({ t: 's', s: getMyState() }));
    }
    for (const r of remotes.values()) {
      const s = r.s, g = r.group;
      // 부드럽게 따라가기
      const k = Math.min(1, dt * 10);
      r.prev.copy(g.position);
      g.position.x += (s.x - g.position.x) * k;
      g.position.y += (s.y - g.position.y) * k;
      g.position.z += (s.z - g.position.z) * k;
      let dr = s.r - g.rotation.y;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      g.rotation.y += dr * k;
      const speed = r.prev.distanceTo(g.position) / Math.max(dt, 0.001);
      const moving = speed > 0.6 && s.a !== 'sit';
      if (moving) r.walkT += dt * 9;
      // 이름표 숫자
      // 보트: 타고 있으면 몸 아래에 보트를 그려요
      const bt = s.bt >= 0 && makeBoatModel ? s.bt : -1;
      if (bt !== r.boatIdx) {
        r.boatIdx = bt;
        if (r.boat) { scene.remove(r.boat); r.boat = null; }
        if (bt >= 0) { r.boat = makeBoatModel(bt); scene.add(r.boat); }
      }
      if (r.boat) {
        r.boat.position.set(g.position.x - Math.sin(g.rotation.y) * 0.25, g.position.y + 0.6 - (r.boat.userData.seat ?? 0.38), g.position.z - Math.cos(g.rotation.y) * 0.25);
        r.boat.rotation.set(0, g.rotation.y, Math.sin(t * 1.1) * 0.03);
      }
      if (s.n !== r.shownN) { r.shownN = s.n; r.tag.draw(r.name, s.n); }
      // 낚싯대 바꾸기 / 꺼내기
      if (s.rod !== r.rodIdx) {
        r.rodIdx = s.rod;
        if (s.rod >= 0 && RODS[s.rod]) r.spin = buildRod(RODS[s.rod], r.rodG);
      }
      r.rodG.visible = s.rod >= 0 && s.a !== 'swim';
      // 손에 든 물고기
      const hk = s.f && s.rod < 0 && s.a !== 'swim' ? s.f + '|' + (s.m || '') : '';
      if (hk !== r.heldKey) {
        r.heldKey = hk;
        if (r.held) { g.remove(r.held); r.held = null; }
        const f = hk && findFish(s.f);
        if (f) {
          r.held = makeFishModel(f, s.m);
          r.held.scale.multiplyScalar(0.55);
          r.held.position.set(0, 0.95, -0.5);
          r.held.userData.flop = f.name === FLOP_FISH;
          g.add(r.held);
        }
      }
      // 물 만난 광어는 다른 사람 손에서도 펄떡펄떡! (내 화면이랑 같은 움직임)
      if (r.held && r.held.userData.flop) {
        const kick = Math.max(0, Math.sin(t * 8.5));
        r.held.rotation.set(Math.sin(t * 11) * 0.5, Math.sin(t * 5) * 0.4, Math.sin(t * 17) * 0.85);
        r.held.position.set(Math.sin(t * 7) * 0.08, 0.95 + kick * 0.45, -0.5 + Math.cos(t * 9) * 0.06);
      }
      // 팔·다리
      const empty = !r.rodG.visible && !r.held;
      let target = { charge: 2.6, cast: 0.85, reel: 1.3 + Math.sin(t * 18) * 0.12, bite: 1.05, caught: 2.0, hold: 1.3 }[s.a];
      if (target === undefined) target = empty ? 0 : 1.2;
      r.arm += (target - r.arm) * Math.min(1, dt * 12);
      const aSwing = empty && moving ? Math.sin(r.walkT) * 0.6 : 0;
      r.armL.rotation.x = r.arm - aSwing;
      r.armR.rotation.x = r.arm + aSwing;
      if (s.a === 'swim') {
        r.armL.rotation.x = moving ? t * 7 : 1.4 + Math.sin(t * 3) * 0.35;
        r.armR.rotation.x = moving ? t * 7 + Math.PI : 1.4 - Math.sin(t * 3) * 0.35;
      }
      g.rotation.order = 'YXZ';
      g.rotation.x += ((s.a === 'swim' ? (moving ? -0.55 : -0.15) : 0) - g.rotation.x) * Math.min(1, dt * 8);
      const legSwing = s.a === 'swim' ? Math.sin(t * 18) * 0.35 : moving ? Math.sin(r.walkT) * 0.6 : 0;
      if (s.a === 'sit') r.legs.forEach((l) => (l.rotation.x = Math.PI / 2));
      else {
        r.legs[0].rotation.x += (legSwing - r.legs[0].rotation.x) * Math.min(1, dt * 15);
        r.legs[1].rotation.x += (-legSwing - r.legs[1].rotation.x) * Math.min(1, dt * 15);
      }
      placeSpin(r.spin, t);
      // 찌와 낚싯줄
      const showBob = !!s.b && r.rodG.visible;
      r.bob.visible = showBob;
      r.line.visible = showBob;
      if (showBob) {
        r.bob.position.lerp(tmp.fromArray(s.b), Math.min(1, dt * 12));
        r.rodG.localToWorld(tmp.set(0, ROD_LEN / 2, 0));
        const e = r.bob.position;
        r.line.geometry.setFromPoints([
          tmp.clone(),
          new THREE.Vector3((tmp.x + e.x) / 2, Math.max(e.y + 0.3, (tmp.y + e.y) / 2 - 0.3), (tmp.z + e.z) / 2),
          e.clone()
        ]);
      }
      // 잡은 물고기 튀어 오르기
      if (r.pop) {
        const q = (now - r.pop.start) / 1000;
        if (q > 1.6) { scene.remove(r.pop.model); r.pop = null; }
        else {
          tmp.set(g.position.x, g.position.y + 3.2, g.position.z);
          r.pop.model.position.lerpVectors(r.pop.from, tmp, Math.min(1, q));
          r.pop.model.position.y += Math.sin(Math.min(1, q) * Math.PI) * 1.2;
          r.pop.model.rotation.y = g.rotation.y + Math.PI / 2;
          r.pop.model.rotation.z = Math.sin(t * 20) * 0.3;
          if (r.pop.flop) {
            // 물 만난 광어는 올라오는 내내 펄떡펄떡
            r.pop.model.rotation.z = Math.sin(t * 18) * 0.95;
            r.pop.model.rotation.x = Math.sin(t * 11) * 0.55;
            r.pop.model.position.y += Math.max(0, Math.sin(t * 9)) * 0.5;
          }
        }
      }
    }
  }

  function sendCatch(item) {
    if (opened && room && ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'catch', f: item.name, m: item.mut || null, w: item.weight }));
  }

  function sendOutfit(o) {
    if (opened && room && ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'outfit', o }));
  }

  return {
    connect, disconnect, update, sendCatch, sendOutfit,
    get connected() { return opened && !!room; },
    get room() { return room; },
    players: () => [...remotes.values()].map((r) => ({ name: r.name, n: r.s.n }))
  };
}
