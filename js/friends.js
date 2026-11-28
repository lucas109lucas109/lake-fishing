// =====================================================
//  수첩 — 동네 친구들과 친해지기 · 도감 보상 · 칭호
//
//  친구 (NPC)
//   - 말을 걸면 조금씩 친해져요 (같은 사람은 3분에 한 번)
//   - G 키로 선물해요. 좋아하는 걸 주면 엄청 기뻐해요 (10분에 3번까지)
//   - 하트 2 · 4 · 6 · 8 · 10 개가 되면 선물을 줘요 (돈 · 가구 · 재료 · 특별 가구 · 칭호)
//  도감 보상
//   - 물고기를 여러 종류 모으거나, 한 곳의 물고기를 다 모으면 보상을 받아요
//  칭호
//   - 받은 칭호 중 하나를 골라 달 수 있어요 (왼쪽 위에 보여요)
// =====================================================
import { FISH, zoneOf } from './fish.js';
import { FURNITURE, findFurniture } from './furniture.js';

// ---------------- 친구들이 좋아하는 것 ----------------
//  love: 정말 좋아해요 (+80) · like: 좋아해요 (+40) · hate: 싫어해요 (-15)
//  fish: 'love' 이면 물고기 선물을 정말 좋아해요
const PREFS = {
  '부두 소년': { love: ['starfish', 'shell'], like: ['strawberry', 'berry', 'apple', 'pebble'], hate: ['mushroom_b'], fish: 'like' },
  '섬 친구': { love: ['coconut', 'hibiscus'], like: ['mango', 'banana', 'seaglass', 'conch'], hate: ['pinecone'] },
  '섬 할아버지': { love: ['driftwood', 'chestnut'], like: ['pinecone', 'herb', 'mushroom_r'], hate: ['jelly_gel'], fish: 'like' },
  '고수 할배': { love: ['herb', 'pearl'], like: ['mushroom_r', 'chestnut'], hate: ['bouquet'], fish: 'love' },
  '오로라 지기': { love: ['crystal', 'amethyst', 'glowshroom'], like: ['snow_crystal', 'jelly_gel', 'feather'], hate: ['carrot'] },
  '물결소년': { love: ['seaglass', 'pebble'], like: ['daisy', 'clover', 'shell'], hate: ['mushroom_b'] },
  '노을헌터': { love: ['sunflower_m', 'maple'], like: ['apple', 'feather', 'tulip'], hate: ['snow_crystal'] },
  '붕어왕': { love: ['pumpkin', 'watermelon'], like: ['carrot', 'strawberry'], hate: ['blossom'], fish: 'love' },
  '밤낚시러': { love: ['glowshroom', 'blueberry'], like: ['lavender', 'jelly_gel', 'amethyst'], hate: ['sunflower_m'] },
  '낚시광 민수': { love: ['watermelon', 'mango'], like: ['strawberry', 'banana'], hate: ['daisy'], fish: 'love' },
  '새벽물결': { love: ['blossom', 'tulip', 'bouquet'], like: ['lavender', 'daisy', 'hibiscus'], hate: ['mushroom_r'] }
};
// 목록에 없는 친구는 이름으로 정해요 (늘 같은 결과)
function prefsOf(name, MATS) {
  if (PREFS[name]) return PREFS[name];
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = MATS.filter((m) => m.zone.length && !m.rare);
  const pick = (k) => pool[(h >> k) % pool.length].id;
  return { love: [pick(1), pick(5)], like: [pick(2), pick(7), pick(9)], hate: [pick(11)], fish: h % 3 === 0 ? 'love' : 'like' };
}
const HEART = 100;      // 하트 하나 = 100점
const MAX_HEART = 10;
const RARITY_GIFT = { common: 15, uncommon: 30, rare: 50, legendary: 85, mythic: 120 };

// ---------------- 도감 보상 ----------------
const ZONE_NAME = { lake: '큰 호수', mountain: '산 위 연못', aurora: '오로라 강', sea: '바다', jungle: '정글', ruby: '루비 섬', rain: '비 오는 날', season: '사계절' };
const groupOf = (f) => (f.season ? 'season' : f.weather ? 'rain' : zoneOf(f));
function dexGoals() {
  const total = FISH.length;
  const n = (save) => FISH.filter((f) => save.dex[f.name]).length;
  const goals = [
    // 보상을 크게 늘렸어요 (돈 · 가구 · 칭호 · 낚싯대). rod = 그 낚싯대를 공짜로 받아요 (이미 있으면 돈만)
    { id: 'd10', name: '물고기 10종 모으기', need: 10, get: n, money: 100000, rod: '별빛 낚싯대', title: '새내기 낚시꾼' },
    { id: 'd25', name: '물고기 25종 모으기', need: 25, get: n, money: 500000, rod: '솜사탕 낚싯대', furn: 'rainbow_lamp' },
    { id: 'd40', name: '물고기 40종 모으기', need: 40, get: n, money: 2000000, rod: '은하수 낚싯대', furn: 'fish_statue', title: '물고기 박사' },
    { id: 'd60', name: '물고기 60종 모으기', need: 60, get: n, money: 8000000, rod: '심해왕의 삼지창', furn: 'dex_shelf' },
    { id: 'd80', name: '물고기 80종 모으기', need: 80, get: n, money: 30000000, rod: '덩굴 낚싯대', furn: 'gyotaku', title: '전설의 어부' },
    { id: 'd100', name: '물고기 100종 모으기', need: 100, get: n, money: 100000000, rod: '황금 신전 낚싯대', furn: 'king_trophy', title: '낚시왕' },
    { id: 'd110', name: '물고기 110종 모으기', need: 110, get: n, money: 300000000, rod: '정글 왕의 낚싯대' },
    { id: 'd120', name: '물고기 120종 모으기', need: 120, get: n, money: 1000000000, rod: '루비 낚싯대', title: '보석 사냥꾼' },
    { id: 'dall', name: `도감 완성 (${total}종 전부)`, need: total, get: n, money: 5000000000, rod: '석류석 낚싯대', furn: 'aurora_globe', title: '호수의 주인', luck: 0.03 }
  ].filter((g, i, arr) => g.need <= total || g.id === 'dall');
  const zoneTitles = { lake: '큰 호수 지킴이', mountain: '산 위의 신선', aurora: '오로라 탐험가', sea: '바다 사나이', jungle: '정글 탐험대', ruby: '루비의 주인', rain: '비를 부르는 자', season: '사계절 낚시꾼' };
  const zoneMoney = { lake: 600000, mountain: 1200000, aurora: 3000000, sea: 5000000, jungle: 30000000, ruby: 2000000000, rain: 2000000, season: 8000000 };
  const zoneRod = { lake: '노을빛 낚싯대', mountain: '용암 낚싯대', aurora: '오로라 낚싯대', sea: '심해왕의 삼지창', jungle: '정글 왕의 낚싯대', ruby: '진홍 용비늘 낚싯대', rain: '그림자 낚싯대', season: '산호 낚싯대' };
  for (const z of Object.keys(ZONE_NAME)) {
    const list = FISH.filter((f) => groupOf(f) === z);
    if (!list.length) continue;
    goals.push({ id: 'z_' + z, name: `${ZONE_NAME[z]} 물고기 전부 (${list.length}종)`, need: list.length, get: (save) => list.filter((f) => save.dex[f.name]).length, money: zoneMoney[z], rod: zoneRod[z], title: zoneTitles[z] });
  }
  goals.push({ id: 'c100', name: '물고기 100마리 낚기', need: 100, get: (save) => save.caught, money: 300000 });
  goals.push({ id: 'c1000', name: '물고기 1000마리 낚기', need: 1000, get: (save) => save.caught, money: 5000000, title: '낚시 중독' });
  goals.push({ id: 'c5000', name: '물고기 5000마리 낚기', need: 5000, get: (save) => save.caught, money: 50000000, title: '호수의 전설' });
  goals.push({ id: 'c20000', name: '물고기 20000마리 낚기', need: 20000, get: (save) => save.caught, money: 1000000000, title: '바다를 비운 자' });
  return goals;
}

export function setupFriends(ctx) {
  const { THREE, scene, save, writeSave, money, openPanel, modalOpen, game, walkers, npcs, MATS, findMat, makePanel, notice, esc, tone, sfx, updateUI } = ctx;
  const F = save.friends, R = save.rewards;
  const GOALS = dexGoals();

  // ---------- 하트 뿅뿅 (NPC 머리 위) ----------
  const heartTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff6a9a'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 8, 8, 32, 20); g.bezierCurveTo(56, 8, 60, 34, 32, 54); g.closePath(); g.stroke(); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const fx = [];
  function hearts(pos, n) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.3, (Math.random() - 0.5) * 0.6));
      s.scale.setScalar(0.001); scene.add(s);
      fx.push({ s, life: -i * 0.12, max: 1.6 });
    }
  }

  // ---------- 친구 기록 ----------
  const people = () => [...walkers, ...npcs].filter((n) => n.name);
  const rec = (name) => (F[name] || (F[name] = { p: 0, t: 0, g: [], got: [], known: [] }));
  const heartsOf = (name) => Math.min(MAX_HEART, Math.floor((F[name]?.p || 0) / HEART));
  function addPoints(n, pts) {
    const r = rec(n.name);
    const before = heartsOf(n.name);
    r.p = Math.max(0, Math.min(MAX_HEART * HEART, r.p + pts));
    const after = heartsOf(n.name);
    if (after > before) {
      for (let h = before + 1; h <= after; h++) giveFriendReward(n, h);
      hearts(n.group.position.clone().add(new THREE.Vector3(0, 3.0, 0)), 6);
      tone(784, 0.12, 'triangle', 0.05); tone(988, 0.14, 'triangle', 0.05, 0.12); tone(1319, 0.2, 'sine', 0.05, 0.24);
    }
    writeSave();
  }
  function giveFriendReward(n, h) {
    const r = rec(n.name);
    if (r.got.includes(h)) return;
    r.got.push(h);
    const pf = prefsOf(n.name, MATS);
    let msg = '';
    if (h === 2) { save.money += 3000; msg = `${money(3000)} 용돈`; }
    else if (h === 4) {
      const pool = FURNITURE.filter((f) => !f.hidden && !f.mats && f.price <= 5000);
      const f = pool[Math.floor(Math.random() * pool.length)];
      save.furn[f.id] = (save.furn[f.id] || 0) + 1; msg = `가구 「${f.name}」`;
    } else if (h === 6) {
      for (const id of pf.love) save.mats[id] = (save.mats[id] || 0) + 2;
      msg = pf.love.map((id) => `${findMat(id)?.name || id} 2개`).join(', ');
    } else if (h === 8) { save.furn.friend_frame = (save.furn.friend_frame || 0) + 1; save.money += 20000; msg = `특별 가구 「우정 사진 액자」 + ${money(20000)}`; }
    else if (h === 10) {
      save.furn.friend_trophy = (save.furn.friend_trophy || 0) + 1;
      const t = `${n.name}의 단짝`;
      if (!save.titles.includes(t)) save.titles.push(t);
      msg = `특별 가구 「우정 트로피」 + 칭호 「${t}」`;
    }
    if (msg) setTimeout(() => notice(`${n.name}와(과) 하트 ${h}개! 선물로 ${msg}를 받았어요.`), 1800);
    updateUI();
  }

  // ---------- 말 걸기 (main.js 의 talkTo 에서 불러요) ----------
  function onTalk(n) {
    if (!n.name) return;
    const r = rec(n.name), now = Date.now();
    if (now - r.t < 180000) { writeSave(); return; }
    r.t = now;
    addPoints(n, 12);
  }

  // ---------- 선물하기 (G) ----------
  const giftPanel = makePanel('giftPanel', '선물하기');
  let giftTo = null, lastReact = null;
  function giftsLeft(name) { const r = rec(name), now = Date.now(); r.g = r.g.filter((t) => now - t < 600000); return 3 - r.g.length; }
  function reactLine(kind) {
    const L = {
      love: ['우와아! 이거 제가 정말 좋아하는 거예요! 고마워요!', '세상에… 어떻게 알았어요? 최고의 선물이에요!', '너무 좋아요! 오늘 기분 최고예요!'],
      like: ['오, 고마워요! 잘 쓸게요.', '이거 좋네요. 고마워요!', '헤헤, 마음에 들어요.'],
      normal: ['고마워요. 마음만으로도 기뻐요.', '음, 고마워요!', '선물 고마워요.'],
      hate: ['아… 이건 별로 안 좋아해서요… 그래도 마음은 고마워요.', '으음… 이건 좀…', '하하… 고마워요… (별로인 것 같다)']
    }[kind];
    return L[Math.floor(Math.random() * L.length)];
  }
  function give(n, item) {
    if (giftsLeft(n.name) <= 0) { notice(`${n.name}에게는 오늘 선물을 많이 줬어요. 조금 있다가 줘요.`); return; }
    const pf = prefsOf(n.name, MATS), r = rec(n.name);
    let kind = 'normal', pts = 20;
    if (item.mat) {
      const id = item.mat.id;
      if (pf.love.includes(id)) { kind = 'love'; pts = 80; }
      else if (pf.like.includes(id)) { kind = 'like'; pts = 40; }
      else if (pf.hate.includes(id)) { kind = 'hate'; pts = -15; }
      save.mats[id]--; if (!save.mats[id]) delete save.mats[id];
      if (kind !== 'normal' && !r.known.includes(id)) r.known.push(id); // 반응을 보고 취향을 알게 돼요
    } else if (item.fish) {
      const f = ctx.findFish(item.fish.name);
      pts = RARITY_GIFT[f?.rarity] ?? 15;
      if (pf.fish === 'love') { pts = Math.round(pts * 2.2) + 20; kind = 'love'; } else if (pf.fish === 'like') { pts = Math.round(pts * 1.4) + 5; kind = pts >= 40 ? 'like' : 'normal'; }
      save.inv = save.inv.filter((x) => x !== item.fish);
      if (game.selected === item.fish.id) ctx.equip(null);
      ctx.renderHotbar();
      if (pf.fish && !r.known.includes('fish')) r.known.push('fish');
    }
    r.g.push(Date.now());
    lastReact = { kind, text: reactLine(kind) };
    if (ctx.sayLine) ctx.sayLine(n, lastReact.text, 5000);
    if (kind === 'love') hearts(n.group.position.clone().add(new THREE.Vector3(0, 3.0, 0)), 4);
    sfx.coin();
    addPoints(n, pts);
    renderGift();
  }
  function renderGift() {
    const n = giftTo; if (!n) return;
    const body = giftPanel.querySelector('.pbody');
    const r = rec(n.name), pf = prefsOf(n.name, MATS), hcount = heartsOf(n.name);
    body.innerHTML = `<div class="friendHead"><b>${esc(n.name)}</b> ${heartBar(hcount)} <span class="count">다음 하트까지 ${hcount >= MAX_HEART ? '최고예요!' : (HEART - (r.p % HEART)) + '점'} · 남은 선물 ${giftsLeft(n.name)}번</span></div>
      ${lastReact ? `<div class="giftReact ${lastReact.kind}">「${esc(lastReact.text)}」</div>` : ''}
      <div class="count">좋아하는 걸 주면 크게 친해져요. 줘 보면 좋아하는지 알게 돼요. ${r.known.length ? '알아낸 취향: ' + r.known.map((k) => k === 'fish' ? '물고기' : `${findMat(k)?.name || k}${pf.love.includes(k) ? '(정말 좋아함)' : pf.hate.includes(k) ? '(싫어함)' : '(좋아함)'}`).join(', ') : ''}</div>
      <div class="secTitle">채집 재료</div><div class="matGrid giftMats"></div><div class="secTitle">가방 속 물고기</div><div class="matGrid giftFish"></div>`;
    const gm = body.querySelector('.giftMats'), gf = body.querySelector('.giftFish');
    const mats = MATS.filter((m) => (save.mats[m.id] || 0) > 0);
    if (!mats.length) gm.innerHTML = '<div class="count">재료가 없어요. 맵에서 반짝이는 걸 주워 와요.</div>';
    for (const m of mats) {
      const tag = r.known.includes(m.id) ? (pf.love.includes(m.id) ? '<span class="giftTag love">정말 좋아함</span>' : pf.hate.includes(m.id) ? '<span class="giftTag hate">싫어함</span>' : '<span class="giftTag like">좋아함</span>') : '';
      const card = document.createElement('div'); card.className = 'matCard';
      card.innerHTML = `<span class="mdot" style="background:#${m.color.toString(16).padStart(6, '0')}"></span><span class="mnm">${esc(m.name)} ${tag}</span><span class="mcnt">${save.mats[m.id]}개</span>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '주기'; b.disabled = giftsLeft(n.name) <= 0;
      b.onclick = () => give(n, { mat: m });
      card.appendChild(b); gm.appendChild(card);
    }
    const fish = save.inv.slice().sort((a, b) => a.price - b.price).slice(0, 24);
    if (!fish.length) gf.innerHTML = '<div class="count">가방에 물고기가 없어요.</div>';
    for (const it of fish) {
      const card = document.createElement('div'); card.className = 'matCard';
      card.innerHTML = `<span class="mdot" style="background:#7ab8e8"></span><span class="mnm">${esc(it.name)}</span><span class="mpr">${money(it.price)}</span>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '주기'; b.disabled = giftsLeft(n.name) <= 0;
      b.onclick = () => give(n, { fish: it });
      card.appendChild(b); gf.appendChild(card);
    }
  }
  function openGift(n) { giftTo = n; lastReact = null; rec(n.name); renderGift(); openPanel(giftPanel); }
  const heartBar = (h) => `<span class="hearts">${Array.from({ length: MAX_HEART }, (_, i) => `<i class="${i < h ? 'on' : ''}"></i>`).join('')}</span>`;

  // ---------- 도감 보상 ----------
  const doneGoal = (g) => g.get(save) >= g.need;
  const claimable = () => GOALS.filter((g) => doneGoal(g) && !R.dex.includes(g.id));
  function claim(g) {
    if (!doneGoal(g) || R.dex.includes(g.id)) return;
    R.dex.push(g.id);
    const got = [];
    if (g.money) { save.money += g.money; got.push(money(g.money)); }
    if (g.rod && ctx.giveRod) { const ok = ctx.giveRod(g.rod); got.push(ok ? `낚싯대 「${g.rod}」` : `(「${g.rod}」은 이미 있어요)`); }
    if (g.furn) { save.furn[g.furn] = (save.furn[g.furn] || 0) + 1; got.push(`가구 「${findFurniture(g.furn)?.name}」`); }
    if (g.title && !save.titles.includes(g.title)) { save.titles.push(g.title); got.push(`칭호 「${g.title}」`); }
    if (g.luck) got.push(`낚시 운 +${Math.round(g.luck * 100)}% (계속)`);
    writeSave(); sfx.coin(); updateUI(); updateTitleLine();
    tone(659, 0.12, 'triangle', 0.05); tone(880, 0.12, 'triangle', 0.05, 0.1); tone(1175, 0.25, 'sine', 0.05, 0.2);
    notice(`보상: ${got.join(' · ')}`);
  }
  let lastClaimable = -1;
  function checkGoals() {
    const n = claimable().length;
    if (n > lastClaimable && lastClaimable >= 0) notice(`수첩에 받을 수 있는 보상이 생겼어요! (N 키)`);
    lastClaimable = n;
    book.dataset.dot = n ? '1' : '';
    bookBtn.classList.toggle('dot', n > 0);
  }
  const luckBonus = () => GOALS.filter((g) => g.luck && R.dex.includes(g.id)).reduce((a, g) => a + g.luck, 0);

  // ---------- 칭호 (왼쪽 위에 보여요) ----------
  const titleLine = document.createElement('div');
  titleLine.id = 'titleLine'; titleLine.className = 'rodName';
  (document.getElementById('seasonLine') || document.getElementById('clock'))?.after(titleLine);
  function updateTitleLine() { titleLine.textContent = save.title ? `칭호 · ${save.title}` : ''; titleLine.classList.toggle('hidden', !save.title); }

  // ---------- 수첩 창 (N) ----------
  const book = makePanel('bookPanel', '수첩');
  let tab = 'friends';
  function renderBook() {
    const body = book.querySelector('.pbody');
    const tabs = [['friends', '친구'], ['dex', '도감 보상'], ['titles', '칭호']].map(([k, t]) => `<button class="tab${tab === k ? ' active' : ''}" data-t="${k}">${t}${k === 'dex' && claimable().length ? ` (${claimable().length})` : ''}</button>`).join('');
    body.innerHTML = `<div class="tabs">${tabs}</div><div class="bookBody"></div>`;
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; renderBook(); }));
    const bb = body.querySelector('.bookBody');
    if (tab === 'friends') {
      bb.innerHTML = '<div class="count">사람들에게 말을 걸고(E), 가까이에서 <b>G</b> 키로 선물해요. 하트 2 · 4 · 6 · 8 · 10개마다 선물을 받아요.</div>';
      for (const n of people()) {
        const r = F[n.name], met = !!r, h = heartsOf(n.name), pf = prefsOf(n.name, MATS);
        const next = [2, 4, 6, 8, 10].find((x) => x > h);
        const nextTxt = { 2: '용돈', 4: '가구 선물', 6: '좋아하는 재료', 8: '우정 사진 액자', 10: '우정 트로피 + 단짝 칭호' }[next] || '모든 선물을 받았어요!';
        const row = document.createElement('div'); row.className = 'friendRow';
        row.innerHTML = met
          ? `<div class="fname">${esc(n.name)}</div>${heartBar(h)}<div class="fnext">다음 선물: ${next ? `하트 ${next}개 · ${nextTxt}` : nextTxt}</div><div class="fknown">${r.known.length ? '취향: ' + r.known.map((k) => k === 'fish' ? '물고기' : findMat(k)?.name || k).join(', ') : '취향: 선물을 줘 보면 알 수 있어요'}</div>`
          : `<div class="fname">???</div>${heartBar(0)}<div class="fnext">아직 말을 걸어 보지 않았어요.</div>`;
        bb.appendChild(row);
      }
    } else if (tab === 'dex') {
      const got = FISH.filter((f) => save.dex[f.name]).length;
      bb.innerHTML = `<div class="count">모은 물고기 ${got} / ${FISH.length}종 · 낚은 물고기 ${save.caught}마리</div>`;
      for (const g of GOALS) {
        const cur = Math.min(g.need, g.get(save)), done = cur >= g.need, claimed = R.dex.includes(g.id);
        const gifts = [g.money ? money(g.money) : '', g.rod ? `낚싯대 「${g.rod}」` : '', g.furn ? `「${findFurniture(g.furn)?.name}」` : '', g.title ? `칭호 「${g.title}」` : '', g.luck ? `운 +${Math.round(g.luck * 100)}%` : ''].filter(Boolean).join(' · ');
        const row = document.createElement('div'); row.className = 'goalRow' + (claimed ? ' claimed' : done ? ' ready' : '');
        row.innerHTML = `<div class="gname">${esc(g.name)}</div><div class="gbar"><i style="width:${(cur / g.need) * 100}%"></i><span>${cur} / ${g.need}</span></div><div class="ggift">${gifts}</div>`;
        const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = claimed ? '받았어요' : '받기'; b.disabled = claimed || !done;
        b.onclick = () => { claim(g); renderBook(); checkGoals(); };
        row.appendChild(b); bb.appendChild(row);
      }
    } else {
      bb.innerHTML = `<div class="count">받은 칭호 중 하나를 달 수 있어요. 도감 보상과 친구 하트 10개로 칭호를 받아요.</div>`;
      const list = document.createElement('div'); list.className = 'titleList';
      const mk = (t, label) => { const b = document.createElement('button'); b.className = 'titleBtn' + (save.title === t ? ' on' : ''); b.textContent = label; b.onclick = () => { save.title = t; writeSave(); updateTitleLine(); renderBook(); }; return b; };
      list.appendChild(mk('', '칭호 안 달기'));
      for (const t of save.titles) list.appendChild(mk(t, t));
      if (!save.titles.length) list.insertAdjacentHTML('beforeend', '<div class="count">아직 받은 칭호가 없어요.</div>');
      bb.appendChild(list);
    }
  }
  function openBook() { renderBook(); openPanel(book); }
  const bookBtn = document.createElement('button');
  bookBtn.className = 'smallBtn'; bookBtn.id = 'bookBtn'; bookBtn.textContent = '수첩 (N)';
  bookBtn.onclick = (e) => { e.currentTarget.blur(); openBook(); };
  const topBar = document.getElementById('multiBtn')?.parentElement;
  if (topBar) topBar.insertBefore(bookBtn, document.getElementById('accountBtn'));
  window.addEventListener('keydown', (e) => {
    if (e.repeat || ctx.decorating() || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) || e.ctrlKey) return;
    if (e.code === 'KeyN') {
      if (!book.classList.contains('hidden')) book.classList.add('hidden');
      else if (!modalOpen()) openBook();
    } else if (e.code === 'KeyG') {
      if (!giftPanel.classList.contains('hidden')) giftPanel.classList.add('hidden');
      else if (!modalOpen() && game.nearTalk && game.nearTalk.name) openGift(game.nearTalk);
    }
  });

  updateTitleLine();
  checkGoals();
  let goalTick = 0;
  return {
    onTalk,
    onCatch() { checkGoals(); },
    luckBonus,
    update(dt, now) {
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.life += dt;
        if (f.life < 0) continue;
        const k = f.life / f.max;
        f.s.position.y += dt * 0.7;
        f.s.scale.setScalar(0.32 * Math.min(1, k * 5));
        f.s.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
        if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); }
      }
      if (now - goalTick > 5000) { goalTick = now; checkGoals(); }
    }
  };
}
