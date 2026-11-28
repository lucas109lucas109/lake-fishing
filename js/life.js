// =====================================================
//  힐링 생활: 가구점 · 집 꾸미기 · 채집 · 정원 텃밭
//  (반려동물 · 계절 · 친밀도 · 도감 보상 · 같이 하는 이벤트는 아래쪽에 이어서 있어요)
//
//  main.js 가 setupLife(ctx) 로 필요한 도구를 넘겨줘요.
//  기록(세이브)은 save.furn / save.decor / save.mats / save.garden 에 들어가요.
// =====================================================
import { FURNITURE, FURN_CATS, findFurniture, buildFurniture } from './furniture.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PETS, setupPets } from './pets.js';
import { setupSeasons, getSeason } from './seasons.js';
import { setupFriends } from './friends.js';
import { setupCoop } from './coop.js';
import { setupDecor } from './decor.js';

// ---------------- 채집 재료 ----------------
//  zone: 어디서 주울 수 있는지 (lake 호숫가·마을 / forest 숲 / beach 모래사장 / island 집 섬 / aurora 오로라 강 / jungle 정글섬 / mountain 언덕 위)
//  price: 판매점에서 팔 때 값 · love: 이걸 좋아하는 NPC 가 많을수록 선물로 좋아요
//  season: 그 계절에만 나와요 (spring/summer/autumn/winter)
export const MATS = [
  // 꽃 · 풀
  { id: 'daisy', name: '데이지', zone: ['lake', 'island'], price: 15, color: 0xffffff, kind: 'flower', c2: 0xffe066 },
  { id: 'tulip', name: '빨간 튤립', zone: ['lake'], price: 20, color: 0xff3a5a, kind: 'tulip' },
  { id: 'lavender', name: '라벤더', zone: ['lake', 'mountain'], price: 25, color: 0xa87ae8, kind: 'lavender' },
  { id: 'clover', name: '네잎클로버', zone: ['lake', 'forest'], price: 120, color: 0x3ab84a, kind: 'clover', rare: true },
  { id: 'herb', name: '약초', zone: ['forest', 'mountain'], price: 30, color: 0x5ab84a, kind: 'herb' },
  { id: 'hibiscus', name: '히비스커스', zone: ['jungle', 'island'], price: 60, color: 0xff3a6a, kind: 'flower', c2: 0xffd84a },
  { id: 'blossom', name: '벚꽃잎', zone: ['lake'], price: 40, color: 0xffb8d0, kind: 'petals', season: 'spring' },
  { id: 'sunflower_m', name: '해바라기', zone: ['lake', 'island'], price: 45, color: 0xffd83a, kind: 'flower', c2: 0x6a3a1a, season: 'summer' },
  { id: 'maple', name: '단풍잎', zone: ['forest', 'lake'], price: 35, color: 0xe8502a, kind: 'leaf', season: 'autumn' },
  // 열매 · 버섯
  { id: 'berry', name: '산딸기', zone: ['forest'], price: 25, color: 0xd8203a, kind: 'berry' },
  { id: 'blueberry', name: '블루베리', zone: ['forest', 'mountain'], price: 30, color: 0x3a4ad8, kind: 'berry' },
  { id: 'mushroom_r', name: '빨간 버섯', zone: ['forest'], price: 35, color: 0xd83a3a, kind: 'mushroom' },
  { id: 'mushroom_b', name: '갈색 버섯', zone: ['forest', 'lake'], price: 20, color: 0x9a6a3a, kind: 'mushroom' },
  { id: 'glowshroom', name: '빛나는 버섯', zone: ['aurora'], price: 150, color: 0x6affe0, kind: 'mushroom', glow: true },
  { id: 'apple', name: '사과', zone: ['lake', 'forest'], price: 30, color: 0xe83a3a, kind: 'fruit' },
  { id: 'chestnut', name: '밤송이', zone: ['forest'], price: 40, color: 0x7a4a24, kind: 'chestnut', season: 'autumn' },
  { id: 'pinecone', name: '솔방울', zone: ['forest', 'mountain'], price: 20, color: 0x8a5a2a, kind: 'pinecone' },
  { id: 'coconut', name: '코코넛', zone: ['beach', 'island'], price: 60, color: 0x6a4a2a, kind: 'coconut' },
  { id: 'mango', name: '망고', zone: ['jungle'], price: 400, color: 0xffb02a, kind: 'fruit' },
  { id: 'banana', name: '바나나', zone: ['jungle'], price: 300, color: 0xffe04a, kind: 'banana' },
  { id: 'cacao', name: '카카오 열매', zone: ['jungle'], price: 600, color: 0xc8702a, kind: 'cacao' },
  // 바다 · 돌
  { id: 'shell', name: '조개껍데기', zone: ['beach', 'island'], price: 20, color: 0xffe0d0, kind: 'shell' },
  { id: 'conch', name: '소라껍데기', zone: ['beach'], price: 70, color: 0xffc8a0, kind: 'conch' },
  { id: 'starfish', name: '불가사리', zone: ['beach', 'island'], price: 45, color: 0xff7a4a, kind: 'starfish' },
  { id: 'pearl', name: '진주', zone: ['beach', 'island'], price: 800, color: 0xfff8fa, kind: 'pearl', rare: true },
  { id: 'driftwood', name: '유목 조각', zone: ['beach'], price: 15, color: 0xb8a080, kind: 'wood' },
  { id: 'seaglass', name: '바다 유리', zone: ['beach'], price: 90, color: 0x6ad8c8, kind: 'gem' },
  { id: 'pebble', name: '동글 조약돌', zone: ['lake', 'beach'], price: 8, color: 0xb0a898, kind: 'pebble' },
  { id: 'crystal', name: '오로라 수정', zone: ['aurora'], price: 250, color: 0xb48cff, kind: 'gem', glow: true },
  { id: 'amethyst', name: '자수정', zone: ['mountain'], price: 180, color: 0x9a5ad8, kind: 'gem' },
  { id: 'jelly_gel', name: '해파리 젤리', zone: ['beach'], price: 120, color: 0xd8a8ff, kind: 'jelly', glow: true },
  { id: 'jungle_relic', name: '고대 유물 조각', zone: ['jungle'], price: 3000, color: 0x6affb0, kind: 'relic', rare: true, glow: true },
  { id: 'feather', name: '앵무새 깃털', zone: ['jungle'], price: 500, color: 0x2ab84a, kind: 'feather' },
  { id: 'snow_crystal', name: '눈 결정', zone: ['lake', 'mountain', 'forest'], price: 60, color: 0xdff6ff, kind: 'snow', season: 'winter', glow: true },
  // 씨앗 (정원에 심어요)
  { id: 'seed_flower', name: '꽃씨', zone: ['lake', 'island'], price: 10, color: 0x8a6a3a, kind: 'seed', grows: 'bouquet' },
  { id: 'seed_straw', name: '딸기 씨앗', zone: ['forest'], price: 15, color: 0xd8302a, kind: 'seed', grows: 'strawberry' },
  { id: 'seed_carrot', name: '당근 씨앗', zone: ['lake', 'forest'], price: 12, color: 0xff8a2a, kind: 'seed', grows: 'carrot' },
  { id: 'seed_pumpkin', name: '호박 씨앗', zone: ['forest', 'island'], price: 20, color: 0xf07a1a, kind: 'seed', grows: 'pumpkin' },
  { id: 'seed_melon', name: '수박 씨앗', zone: ['island', 'beach'], price: 25, color: 0x2a2a2a, kind: 'seed', grows: 'watermelon' },
  // 정원에서 키워서 얻는 것
  { id: 'bouquet', name: '알록달록 꽃다발', zone: [], price: 180, color: 0xff8ab0, kind: 'bouquet' },
  { id: 'strawberry', name: '딸기', zone: [], price: 120, color: 0xe8203a, kind: 'berry' },
  { id: 'carrot', name: '당근', zone: [], price: 90, color: 0xff8a2a, kind: 'carrot' },
  { id: 'pumpkin', name: '호박', zone: [], price: 260, color: 0xf07a1a, kind: 'pumpkin' },
  { id: 'watermelon', name: '수박', zone: [], price: 340, color: 0x3a9a3a, kind: 'watermelon' }
];
export const findMat = (id) => MATS.find((m) => m.id === id);
// 정원 작물: 씨앗 → 다 자라는 데 걸리는 시간(분)
const CROPS = { bouquet: 4, strawberry: 6, carrot: 5, pumpkin: 9, watermelon: 12 };

// ---------------- 세이브 검사 (main.js 의 cleanSave 가 불러요) ----------------
export function cleanLife(s, out) {
  const intIn = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.floor(Number(v)))) : d);
  out.furn = {};
  if (s.furn && typeof s.furn === 'object') for (const f of FURNITURE) { const n = intIn(s.furn[f.id], 0, 999, 0); if (n) out.furn[f.id] = n; }
  out.mats = {};
  if (s.mats && typeof s.mats === 'object') for (const m of MATS) { const n = intIn(s.mats[m.id], 0, 99999, 0); if (n) out.mats[m.id] = n; }
  out.decor = {};
  if (s.decor && typeof s.decor === 'object') for (const hid of out.homes || []) {
    const list = Array.isArray(s.decor[hid]) ? s.decor[hid] : [];
    out.decor[hid] = list.slice(0, 120).filter((d) => d && findFurniture(d.f) && Number.isFinite(d.x) && Number.isFinite(d.z))
      .map((d) => ({ f: d.f, x: Math.max(-16, Math.min(16, +d.x)), z: Math.max(-16, Math.min(16, +d.z)), r: intIn(d.r, 0, 3, 0) }));
  }
  out.houseSeed = s.houseSeed === true; // 기본 가구(소파·침대·책장…)를 옮길 수 있는 가구로 받았는지
  out.garden = {};
  if (s.garden && typeof s.garden === 'object') for (const hid of out.homes || []) {
    const list = Array.isArray(s.garden[hid]) ? s.garden[hid] : [];
    out.garden[hid] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const p = list[i]; return p && CROPS[p.c] && Number.isFinite(p.at) ? { c: p.c, at: intIn(p.at, 0, 1e15, 0) } : null; });
  }
  // (반려동물 · 친밀도 · 보상 · 칭호는 아래 cleanLife2 에서)
  cleanLife2(s, out, intIn);
}

// =====================================================
//  setupLife: 가구점 · 집 꾸미기 · 채집 · 정원
// =====================================================
export function setupLife(ctx) {
  const { THREE, scene, save, writeSave, money, $, openPanel, closePanels, modalOpen, registerPanel, player, game, shops, colliders,
    seaWorld, makeShop, tone, sfx, updateUI, groundY, inLake, onIsland, onPlateau, isNight, esc, mat } = ctx;
  const notice = (t) => { game.notice = t; updateUI(); };
  let seed = 777;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const glowFurnMat = new THREE.MeshBasicMaterial({ vertexColors: true });

  // ---------- 작은 패널 만들기 도우미 ----------
  function makePanel(id, title) {
    const el = document.createElement('div');
    el.id = id; el.className = 'modal hidden';
    el.innerHTML = `<div class="modalBox wide"><div class="modalHead"><span>${title}</span><button class="closeBtn">닫기</button></div><div class="pbody"></div></div>`;
    el.querySelector('.closeBtn').onclick = () => el.classList.add('hidden');
    el.addEventListener('click', (e) => { if (e.target === el) el.classList.add('hidden'); });
    document.body.appendChild(el);
    registerPanel(el);
    return el;
  }
  const costText = (f) => `${money(f.price)}${f.mats ? ' + ' + Object.entries(f.mats).map(([k, n]) => `${findMat(k)?.name || k} ${n}개`).join(', ') : ''}`;
  const canAfford = (f) => save.money >= f.price && Object.entries(f.mats || {}).every(([k, n]) => (save.mats[k] || 0) >= n);

  // =====================================================
  //  가구점: 마을 탈의실 옆. 카테고리별로 골라서 사요
  // =====================================================
  {
    const { part } = makeShop('furnshop', '가구점', -21.5, 15.5, -14, 10, 0xf0d8b0, 0x8a5a3a);
    // 가게 안에 전시용 작은 가구들 (의자 · 램프 · 화분)
    part(0.5, 0.06, 0.5, mat(0xb08a5a), -1.0, 0.65, -0.6); for (const [x, z] of [[-1.2, -0.8], [-0.8, -0.8], [-1.2, -0.4], [-0.8, -0.4]]) part(0.05, 0.42, 0.05, mat(0x8a6438), x, 0.42, z);
    part(0.06, 0.9, 0.06, mat(0xc8962a), 1.0, 0.65, -0.7); part(0.36, 0.26, 0.36, mat(0xf8e8c8), 1.0, 1.2, -0.7);
    part(0.3, 0.3, 0.3, mat(0xf4f0e8), 0.2, 0.35, -0.9); part(0.4, 0.3, 0.4, mat(0x3a9a3a), 0.2, 0.7, -0.9);
  }
  const furnPanel = makePanel('furnPanel', '가구점 · 가구 카탈로그');
  let furnCat = FURN_CATS[0];
  function renderFurnShop() {
    const body = furnPanel.querySelector('.pbody');
    const tabs = FURN_CATS.map((c) => `<button class="tab${c === furnCat ? ' active' : ''}" data-c="${c}">${c}</button>`).join('');
    body.innerHTML = `<div class="count">가진 돈 ${money(save.money)} · 산 가구는 내 집 문 앞에서 <b>E → 가구 배치하기</b>로 놓을 수 있어요. 재료가 필요한 가구도 있어요(채집함 C).</div><div class="tabs furnTabs">${tabs}</div><div class="furnGrid"></div>`;
    body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { furnCat = b.dataset.c; renderFurnShop(); }));
    const grid = body.querySelector('.furnGrid');
    for (const f of FURNITURE.filter((x) => x.cat === furnCat && !x.hidden)) { // 보상 가구(hidden)는 안 팔아요
      const card = document.createElement('div');
      card.className = 'furnCard';
      const owned = save.furn[f.id] || 0;
      card.innerHTML = `<canvas width="150" height="110"></canvas><div class="fnm">${esc(f.name)}</div><div class="fpr">${costText(f)}</div><div class="fown">가진 수 ${owned}</div>`;
      const btn = document.createElement('button');
      btn.className = 'actBtn'; btn.textContent = '사기'; btn.disabled = !canAfford(f);
      btn.onclick = () => {
        if (!canAfford(f)) return;
        save.money -= f.price;
        for (const [k, n] of Object.entries(f.mats || {})) save.mats[k] -= n;
        save.furn[f.id] = (save.furn[f.id] || 0) + 1;
        writeSave(); sfx.coin(); updateUI(); renderFurnShop();
      };
      card.appendChild(btn);
      grid.appendChild(card);
      drawPreview(card.querySelector('canvas'), f.id);
    }
  }
  // 가구 미리보기 그림 (작은 3D 그림을 한 번 그려서 붙여요)
  let prevR = null;
  const prevCache = new Map();
  function drawPreview(canvas, id, make, front) {
    const c2 = canvas.getContext('2d');
    if (prevCache.has(id)) { c2.drawImage(prevCache.get(id), 0, 0); return; }
    if (!prevR) { prevR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); prevR.setSize(150, 110); }
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(-3, 6, -5); sc.add(dl);
    const g = make ? make() : buildFurniture(THREE, id); // make 가 있으면 그걸로 (반려동물 등)
    sc.add(g);
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), cen = box.getCenter(new THREE.Vector3());
    const R = Math.max(size.x, size.y, size.z) * 1.15 + 0.2;
    const cam = new THREE.PerspectiveCamera(30, 150 / 110, 0.05, 50);
    const fz = front ? 1 : -1; // 가구는 앞이 -z, 동물은 얼굴이 +z
    cam.position.set(cen.x - R * 0.9, cen.y + R * 0.75, cen.z + fz * R * 1.5);
    cam.lookAt(cen);
    prevR.render(sc, cam);
    const img = document.createElement('canvas'); img.width = 150; img.height = 110;
    img.getContext('2d').drawImage(prevR.domElement, 0, 0);
    prevCache.set(id, img);
    c2.drawImage(img, 0, 0);
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  // =====================================================
  //  집 꾸미기: 내 집 안에서 가구를 놓고 · 돌리고 · 치워요
  //   R = 돌리기 · E/클릭 = 놓기 · X = 가까운 가구 치우기 · Esc = 끝내기
  // =====================================================
  const decorMeshes = new Map(); // houseId → [{ mesh, d }]
  const houseFloorY = 0.32;      // 집 바닥 윗면 높이
  function houseOf(id) { return seaWorld.houses.find((h) => h.id === id); }
  // 놓은 가구로 할 수 있는 것 (앞에 가서 E). 가구 앞쪽 = -z, 돌린 만큼 같이 돌아요
  const USE = {
    sit: ['chair_wood', 'rocking', 'beanbag', 'sofa2', 'sofa_pink', 'armchair', 'stool'],
    bed: ['bed_single', 'bed_star'], book: ['bookshelf', 'dex_shelf'], tea: ['table_dining', 'table_tea', 'coffee', 'table_low'],
    piano: ['piano_up'], fire: ['fireplace']
  };
  const useOf = (fid) => Object.keys(USE).find((k) => USE[k].includes(fid));
  // 나머지 가구도 전부 E 로 만져 볼 수 있어요: [버튼 글자, 멘트들, 소리('tune' 노래 · 'beep' 오락기 · 'chime' 기본)]
  //  (러그처럼 바닥에 까는 것 · 벽에 거는 것은 빼요). 조명은 불 켜기/끄기 (빛나는 블록을 켰다 껐다)
  const LAMPS = ['lamp_stand', 'candles', 'lamp_mushroom', 'lamp_jelly', 'lamp_star', 'lantern_shell', 'rainbow_lamp', 'pumpkin_lamp'];
  const FURN_MSG = {
    desk: ['공부하기', ['책상에 앉아 낚시 일기를 썼어요.', '물고기 그림을 그려 봤어요. 꽤 닮았어요!', '오늘 잡은 물고기를 공책에 정리했어요.']],
    petbed: ['쓰다듬기', ['폭신한 동물 쿠션이에요. 펫이 좋아할 것 같아요.', '쿠션을 톡톡 두드려 정리했어요.']],
    drawer: ['열어 보기', ['서랍 속에 낚싯줄 뭉치가 가지런히 있어요.', '꽃무늬 손수건이 곱게 개켜져 있어요.']],
    wardrobe: ['열어 보기', ['옷장 속에 따뜻한 스웨터가 걸려 있어요.', '비옷과 장화가 나란히 있어요. 비 오는 날 낚시용!']],
    shelf_plants: ['물 주기', ['선반 화분들에 물을 줬어요. 잎이 반짝여요.']],
    chest_storage: ['열어 보기', ['보물상자 속엔 추억이 담긴 조개껍데기가 가득해요.', '끼익… 오래된 지도 한 장이 들어 있어요.']],
    plant_monstera: ['물 주기', ['몬스테라에 물을 줬어요. 잎이 싱그러워요.']],
    cactus: ['물 주기', ['선인장엔 물을 조금만! 꽃이 활짝 웃는 것 같아요.']],
    sunflower: ['물 주기', ['해바라기에 물을 줬어요. 창 쪽으로 고개를 돌려요.']],
    bonsai: ['다듬기', ['작은 분재 가지를 조심조심 다듬었어요.']],
    vase_flowers: ['향기 맡기', ['꽃향기가 은은하게 퍼져요.']],
    cherry_pot: ['물 주기', ['벚꽃 화분에 물을 줬어요. 꽃잎이 살랑 떨어져요.']],
    trophy_fish: ['구경하기', ['반짝이는 물고기 트로피예요. 언젠가 더 큰 걸 잡을 거예요!']],
    ship_model: ['구경하기', ['정교한 돛단배 모형이에요. 돛이 바람을 머금은 것 같아요.']],
    globe: ['돌려 보기', ['지구본을 빙글 돌렸어요. 손가락이 멈춘 곳은… 바다!']],
    teddy: ['안아 주기', ['커다란 곰인형을 꼭 안았어요. 포근해요.']],
    clock: ['시계 보기', ['똑딱똑딱… 괘종시계 소리가 마음을 편하게 해요.']],
    painting: ['감상하기', ['노을 지는 호수 그림이에요. 창밖 풍경이랑 똑같아요.']],
    mirror: ['거울 보기', ['거울 속의 내가 오늘도 멋져요!']],
    shell_deco: ['구경하기', ['조개를 귀에 대 보니 파도 소리가 들려요.']],
    tank_mini: ['먹이 주기', ['작은 어항에 먹이를 톡톡. 물고기들이 몰려와요.']],
    dragon_figure: ['구경하기', ['정글 용 피규어예요. 눈이 반짝이는 것 같아요.']],
    fridge: ['열어 보기', ['냉장고에 시원한 과일 주스가 있어요. 꿀꺽!', '어제 남은 생선구이가 있어요.']],
    stove: ['요리하기', ['화덕에 생선을 노릇노릇 구웠어요. 냄새가 좋아요!']],
    sink: ['손 씻기', ['뽀득뽀득 손을 씻었어요. 비린내 안녕!']],
    arcade: ['오락하기', ['뿅뿅! 레트로 오락기 최고 점수를 노려 봐요.', '아깝다! 한 판만 더…'], 'beep'],
    record: ['음악 듣기', ['레코드판을 걸었어요. 잔잔한 노래가 흘러요.'], 'tune'],
    easel: ['그림 그리기', ['이젤에 노을 호수를 그려 봤어요.', '물감으로 황금 물고기를 그렸어요.']],
    telescope_in: ['들여다보기', ['창가 망원경으로 보니 멀리 갈매기가 날아가요.', '밤이면 별도 잘 보일 것 같아요.']],
    xmas_tree: ['구경하기', ['반짝반짝 트리 불빛이 예뻐요.']],
    snowman_doll: ['쓰다듬기', ['눈사람 인형이 방긋 웃어요.']],
    friend_frame: ['감상하기', ['친구들과 찍은 사진이에요. 그날 참 즐거웠어요.']],
    friend_trophy: ['구경하기', ['우정 트로피예요. 함께라서 더 좋아요.']],
    fish_statue: ['구경하기', ['황금 물고기 동상이 눈부셔요.']],
    dex_shelf: ['도감 보기', ['물고기 도감이 빼곡해요. 다 채워 볼까요?']],
    king_trophy: ['구경하기', ['낚시왕 트로피! 자랑스러워요.']],
    gyotaku: ['감상하기', ['전설 물고기의 어탁이에요. 크기가 어마어마해요.']],
    aurora_globe: ['흔들어 보기', ['스노우볼을 흔들자 오로라 빛 눈이 흩날려요.']]
  };
  const useEntries = new Map(), useCols = new Map(); // houseId → [shops 항목], [충돌 원]
  function rebuildDecor(hid) {
    for (const { mesh } of decorMeshes.get(hid) || []) scene.remove(mesh);
    for (const e of useEntries.get(hid) || []) { const i = shops.indexOf(e); if (i >= 0) shops.splice(i, 1); }
    for (const c of useCols.get(hid) || []) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    decorMeshes.set(hid, []); useEntries.set(hid, []); useCols.set(hid, []);
    const h = houseOf(hid);
    if (!h) return;
    if (h.fire) h.fire.visible = false, h.fireAt = false;
    if (!save.homes.includes(hid)) return;
    for (const d of save.decor[hid] || []) {
      const f = findFurniture(d.f);
      const mesh = buildFurniture(THREE, d.f, glowFurnMat);
      const cx = h.x + d.x, cz = h.z + d.z, th = d.r * Math.PI / 2;
      mesh.position.set(cx, houseFloorY + (f.flat ? 0.002 : 0), cz);
      mesh.rotation.y = th;
      scene.add(mesh);
      decorMeshes.get(hid).push({ mesh, d });
      if (f.flat || f.wall) continue;
      // 가구 크기 (한 칸 = 0.5) → 돌린 방향의 앞쪽 · 옆쪽
      const hx = f.size[0] * 0.25, hz = f.size[1] * 0.25;
      const fx = -Math.sin(th), fz = -Math.cos(th), sx = Math.cos(th), sz = -Math.sin(th);
      // 충돌: 긴 쪽을 따라 작은 원 몇 개 (지나가지 못하게)
      const r = Math.max(0.22, Math.min(hx, hz) - 0.02), long = Math.max(hx, hz) - r;
      const ax = hx >= hz ? sx : fx, az = hx >= hz ? sz : fz;
      const n = Math.max(1, Math.round(long / r) + 1);
      for (let k = 0; k < n; k++) { const t = n === 1 ? 0 : -long + (2 * long * k) / (n - 1); const c = { x: cx + ax * t, z: cz + az * t, r }; colliders.push(c); useCols.get(hid).push(c); }
      const use = useOf(d.f) || (LAMPS.includes(d.f) ? 'lamp' : FURN_MSG[d.f] ? 'msg' : null);
      if (!use) continue;
      const at = [cx + fx * (hz + 0.75), cz + fz * (hz + 0.75)];
      let furn;
      if (use === 'sit') furn = { type: 'sofa', title: `${f.name} · 앉기`, seat: { x: cx + fx * 0.05, y: h.floorY + 0.01, z: cz + fz * 0.05, ry: th }, stand: at };
      else if (use === 'bed') furn = { type: 'bed', title: `${f.name} · 자기 (아침까지)` };
      else if (use === 'book') furn = { type: 'book', title: `${f.name} · 책 읽기` };
      else if (use === 'tea') furn = { type: 'tea', title: `${f.name} · 차 마시기` };
      else if (use === 'piano') furn = { type: 'piano', title: `${f.name} · 연주하기`, seat: { x: cx + fx * 0.62, y: h.floorY + 0.01, z: cz + fz * 0.62, ry: th }, stand: [cx + fx * 1.35, cz + fz * 1.35] };
      else if (use === 'lamp') furn = { type: 'lamp', title: `${f.name} · 불 켜기/끄기`, glow: mesh.children.find((c) => c.material === glowFurnMat) };
      else if (use === 'msg') { const m = FURN_MSG[d.f]; furn = { type: 'msg', title: `${f.name} · ${m[0]}`, msgs: m[1], snd: m[2] }; }
      else if (use === 'fire') {
        furn = { type: 'fire', title: `${f.name} · 불 켜기/끄기` };
        // 집의 일렁이는 불꽃을 이 벽난로 불 구멍으로 옮겨요
        if (h.fire && !h.fireAt) { h.fire.position.set(cx + fx * 0.05, houseFloorY, cz + fz * 0.05); h.fire.rotation.y = th; h.fireAt = true; }
      }
      const e = { kind: 'furn', house: h, furn, title: furn.title, group: mesh, pos: new THREE.Vector3(at[0], houseFloorY, at[1]), promptAt: new THREE.Vector3(cx, houseFloorY + 2.0, cz), r: 1.0 };
      if (use === 'sit') e.pos.set(at[0], houseFloorY, at[1]);
      shops.push(e); useEntries.get(hid).push(e);
    }
  }
  // 기본 가구: 집을 처음 가지면 소파 · 침대 · 책장 · 벽난로 · 탁자 · 화분…을 "옮길 수 있는 가구"로 한 번 받아요
  //  (예전엔 집에 붙박이라 못 치웠어요). 한 계정에 한 번만 받아요 (이사해도 또 주지 않아요)
  function seedHome(h) {
    if (save.houseSeed || !h) return;
    save.houseSeed = true;
    const W = h.rw, D = h.rd, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2, k = h.bigKinds || {};
    const list = [
      ['bed_single', X1 - 1.4, Z1 - 1.5, 0], ['bookshelf', X0 + 1.2, Z1 - 0.45, 0], ['plant_monstera', X0 + 2.1, Z1 - 0.45, 0],
      ['fireplace', X0 + 0.45, 0.25, 3], ['sofa2', X0 + 3.0, 0.25, 1], ['table_low', X0 + 1.85, 0.25, 1],
      ['plant_monstera', X0 + 0.6, Z0 + 1.0, 0], ['plant_monstera', X1 - 0.6, Z0 + 1.0, 0], ['lamp_stand', X1 - 0.5, Z1 - 3.1, 0], ['rug_round', X0 + 2.4, 0.25, 0]
    ];
    if (k.dining) list.push(['table_dining', X1 - 3.2, -0.6, 0], ['chair_wood', X1 - 4.5, -0.6, 3], ['chair_wood', X1 - 1.9, -0.6, 1]);
    if (k.piano) list.push(['piano_up', X1 - 1.0, Z1 - 4.4, 1]);
    if (k.bed2) list.push(['bed_single', X1 - 2.9, Z1 - 1.5, 0]);
    if (!save.decor[h.id]) save.decor[h.id] = [];
    for (const [f, x, z, r] of list) { save.furn[f] = (save.furn[f] || 0) + 1; save.decor[h.id].push({ f, x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, r }); }
    writeSave();
    notice('집에 기본 가구가 생겼어요! 집 안 문 옆에서 E → 가구 배치하기로 마음대로 옮기고 치울 수 있어요.');
  }
  // 집이 바뀌었을 때 (산 집 · 내놓은 집 · 이사) — 이사하면 놓아둔 가구는 가구 가방으로 돌아와요
  function houseChanged(oldId, newId) {
    if (oldId && save.decor[oldId]) {
      for (const d of save.decor[oldId]) save.furn[d.f] = (save.furn[d.f] || 0) + 1;
      delete save.decor[oldId];
      if (save.garden[oldId]) delete save.garden[oldId];
    }
    if (newId && !save.decor[newId]) save.decor[newId] = [];
    if (newId) seedHome(houseOf(newId));
    if (newId && !save.garden[newId]) save.garden[newId] = Array(PLOTS).fill(null);
    for (const h of seaWorld.houses) { rebuildDecor(h.id); rebuildGarden(h.id); }
    pets.sync(); // 집에서 노는 동물들도 새 집으로
  }
  // 놓을 수 있는 남은 수 (가진 수 − 이미 놓은 수)
  const placedCount = (fid) => Object.values(save.decor).flat().filter((d) => d.f === fid).length;
  const freeCount = (fid) => (save.furn[fid] || 0) - placedCount(fid);
  const decorBar = document.createElement('div');
  decorBar.id = 'decorBar'; decorBar.className = 'hidden';
  document.body.appendChild(decorBar);
  let decor = null; // { h, sel, rot, ghost }
  function startDecor(h) {
    if (!save.homes.includes(h.id)) return;
    closePanels();
    if (!save.decor[h.id]) save.decor[h.id] = [];
    decor = { h, sel: null, rot: 0, ghost: null };
    renderDecorBar();
    decorBar.classList.remove('hidden');
    notice('가구 배치 중이에요. 아래에서 가구를 고르고 E 로 놓아요. R 돌리기 · X 치우기 · Esc 끝내기');
  }
  function stopDecor() {
    if (!decor) return;
    if (decor.ghost) scene.remove(decor.ghost);
    decor = null;
    decorBar.classList.add('hidden');
    writeSave();
    notice('가구 배치를 끝냈어요.');
  }
  function renderDecorBar() {
    const owned = FURNITURE.filter((f) => (save.furn[f.id] || 0) > 0);
    decorBar.innerHTML = `<div class="dbHead">가구 배치 · <b>${esc(decor.h.name)}</b> <span>R 돌리기 · E 놓기 · X 치우기 · Esc 끝내기</span><button class="actBtn" id="dbDone">끝내기</button></div><div class="dbList"></div>`;
    decorBar.querySelector('#dbDone').onclick = stopDecor;
    const list = decorBar.querySelector('.dbList');
    if (!owned.length) list.innerHTML = '<div class="count">아직 산 가구가 없어요. 마을 가구점(탈의실 옆)에서 사 와요!</div>';
    for (const f of owned) {
      const free = freeCount(f.id);
      const b = document.createElement('button');
      b.className = 'dbItem' + (decor.sel === f.id ? ' on' : '');
      b.innerHTML = `<canvas width="150" height="110"></canvas><span>${esc(f.name)} · ${free}</span>`;
      b.disabled = free <= 0;
      b.onclick = () => selectDecor(f.id);
      list.appendChild(b);
      drawPreview(b.querySelector('canvas'), f.id);
    }
  }
  function selectDecor(fid) {
    if (!decor) return;
    decor.sel = fid;
    if (decor.ghost) scene.remove(decor.ghost);
    decor.ghost = buildFurniture(THREE, fid, glowFurnMat);
    decor.ghost.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; o.material.depthWrite = false; } });
    scene.add(decor.ghost);
    renderDecorBar();
  }
  // 놓을 자리: 내 앞 1.6칸, 0.25칸 단위로 딱딱 맞춰요, 집 안쪽으로만
  function decorSpot() {
    const h = decor.h;
    let x = ctx.person.position.x - Math.sin(player.ry) * 1.6, z = ctx.person.position.z - Math.cos(player.ry) * 1.6;
    x = Math.round(x * 4) / 4; z = Math.round(z * 4) / 4;
    const ok = x > h.x0 + 0.3 && x < h.x1 - 0.3 && z > h.z0 + 0.3 && z < h.z1 - 0.3;
    return { x, z, ok };
  }
  function placeDecor() {
    if (!decor || !decor.sel || freeCount(decor.sel) <= 0) return;
    const sp = decorSpot();
    if (!sp.ok) { notice('집 안에만 놓을 수 있어요.'); return; }
    const h = decor.h;
    save.decor[h.id].push({ f: decor.sel, x: sp.x - h.x, z: sp.z - h.z, r: decor.rot });
    writeSave(); rebuildDecor(h.id); tone(520, 0.06, 'triangle', 0.05); tone(780, 0.08, 'triangle', 0.04, 0.05);
    if (freeCount(decor.sel) <= 0) { scene.remove(decor.ghost); decor.ghost = null; decor.sel = null; }
    renderDecorBar();
  }
  function removeDecor() {
    if (!decor) return;
    const h = decor.h, sp = decorSpot();
    const list = save.decor[h.id] || [];
    let best = -1, bd = 1.6;
    list.forEach((d, i) => { const dd = Math.hypot(h.x + d.x - sp.x, h.z + d.z - sp.z); if (dd < bd) { bd = dd; best = i; } });
    if (best < 0) { notice('앞에 치울 가구가 없어요.'); return; }
    list.splice(best, 1);
    writeSave(); rebuildDecor(h.id); renderDecorBar(); tone(330, 0.08, 'triangle', 0.05);
  }
  // 가구 배치 중에는 키보드를 먼저 가로채요 (E 가 다른 걸 열지 않게)
  window.addEventListener('keydown', (e) => {
    if (!decor) return;
    if (e.code === 'Escape') { stopDecor(); e.stopImmediatePropagation(); return; }
    if (e.code === 'KeyR' && !e.repeat) { decor.rot = (decor.rot + 1) % 4; e.stopImmediatePropagation(); }
    if (e.code === 'KeyE' && !e.repeat) { placeDecor(); e.stopImmediatePropagation(); }
    if (e.code === 'KeyX' && !e.repeat) { removeDecor(); e.stopImmediatePropagation(); }
  }, true);
  function updateDecor() {
    if (!decor) return;
    if (!decor.h.inside(ctx.person.position.x, ctx.person.position.z)) { stopDecor(); return; } // 집 밖으로 나가면 끝
    if (!decor.ghost) return;
    const sp = decorSpot();
    decor.ghost.position.set(sp.x, houseFloorY + 0.003, sp.z);
    decor.ghost.rotation.y = decor.rot * Math.PI / 2;
    decor.ghost.visible = true;
    decor.ghost.traverse((o) => { if (o.material && o.material.color) o.material.opacity = sp.ok ? 0.65 : 0.25; });
  }

  // =====================================================
  //  채집: 맵 곳곳에 반짝이는 채집물이 생겨요 (주우면 몇 분 뒤 다시 생겨요)
  // =====================================================
  const nodes = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  // 재료 모양 만들기 (작은 블록으로)
  function matModel(m) {
    const parts = [], glowParts = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const add = (list) => (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const g = box.clone(); e.set(rx, ry, rz); q.setFromEuler(e);
      g.applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, d)));
      const col = new THREE.Color(c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.deleteAttribute('uv');
      list.push(g);
    };
    const b = add(parts), gl = add(glowParts), c = m.color;
    const stem = 0x4a9a3a;
    switch (m.kind) {
      case 'flower': b(0.03, 0.3, 0.03, stem, 0, 0.15, 0); for (let k = 0; k < 6; k++) { const a = k * 1.047; b(0.09, 0.03, 0.05, c, Math.cos(a) * 0.06, 0.31, Math.sin(a) * 0.06, 0, -a, 0); } b(0.05, 0.04, 0.05, m.c2 || 0xffe066, 0, 0.33, 0); b(0.12, 0.02, 0.05, stem, 0.04, 0.12, 0, 0, 0, 0.5); break;
      case 'tulip': b(0.03, 0.3, 0.03, stem, 0, 0.15, 0); for (let k = 0; k < 4; k++) { const a = k * 1.57; b(0.05, 0.12, 0.03, c, Math.cos(a) * 0.03, 0.34, Math.sin(a) * 0.03, 0, -a, 0); } b(0.03, 0.18, 0.08, stem, 0.04, 0.1, 0, 0, 0, 0.3); break;
      case 'lavender': for (let s = -1; s <= 1; s++) { b(0.02, 0.34, 0.02, stem, s * 0.04, 0.17, 0); for (let k = 0; k < 5; k++) b(0.04, 0.04, 0.04, c, s * 0.04, 0.24 + k * 0.035, 0); } break;
      case 'clover': b(0.02, 0.12, 0.02, stem, 0, 0.06, 0); for (let k = 0; k < 4; k++) { const a = k * 1.57; b(0.06, 0.02, 0.06, c, Math.cos(a) * 0.04, 0.12, Math.sin(a) * 0.04, 0, a + 0.785, 0); } break;
      case 'herb': for (let k = 0; k < 5; k++) { const a = k * 1.256; b(0.12, 0.02, 0.05, c, Math.cos(a) * 0.06, 0.06 + k * 0.02, Math.sin(a) * 0.06, 0, -a, 0.4); } break;
      case 'petals': for (let k = 0; k < 6; k++) b(0.06, 0.01, 0.06, k % 2 ? c : 0xffd0e0, (k % 3 - 1) * 0.06, 0.02, (Math.floor(k / 3) - 0.5) * 0.08, 0, k, 0); break;
      case 'leaf': b(0.14, 0.01, 0.14, c, 0, 0.02, 0, 0, 0.785, 0); b(0.06, 0.012, 0.06, c, 0.08, 0.02, 0, 0, 0.785, 0); b(0.06, 0.012, 0.06, c, -0.08, 0.02, 0, 0, 0.785, 0); b(0.02, 0.015, 0.12, 0x8a3a1a, 0, 0.025, 0.06); break;
      case 'berry': b(0.18, 0.12, 0.18, 0x4a8a3a, 0, 0.06, 0); for (let k = 0; k < 5; k++) b(0.05, 0.05, 0.05, c, Math.cos(k * 1.256) * 0.07, 0.14, Math.sin(k * 1.256) * 0.07); break;
      case 'mushroom': b(0.05, 0.12, 0.05, 0xf4ecd8, 0, 0.06, 0); (m.glow ? gl : b)(0.16, 0.06, 0.16, c, 0, 0.14, 0); (m.glow ? gl : b)(0.1, 0.04, 0.1, c, 0, 0.18, 0); if (m.id === 'mushroom_r') for (let k = 0; k < 3; k++) b(0.025, 0.02, 0.025, 0xffffff, (k - 1) * 0.04, 0.2, (k % 2) * 0.03); break;
      case 'fruit': b(0.13, 0.13, 0.13, c, 0, 0.08, 0); b(0.02, 0.05, 0.02, 0x5a3a1a, 0, 0.17, 0); b(0.06, 0.01, 0.03, stem, 0.03, 0.18, 0); break;
      case 'chestnut': b(0.14, 0.12, 0.14, 0x6a8a2a, 0, 0.07, 0); for (let k = 0; k < 8; k++) b(0.01, 0.05, 0.01, 0x8aaa3a, Math.cos(k * 0.785) * 0.07, 0.08, Math.sin(k * 0.785) * 0.07, 0, 0, 0.6); b(0.07, 0.06, 0.07, c, 0, 0.14, 0); break;
      case 'pinecone': for (let k = 0; k < 4; k++) b(0.12 - k * 0.025, 0.04, 0.12 - k * 0.025, k % 2 ? c : 0x6a4a22, 0, 0.03 + k * 0.04, 0, 0, k * 0.4, 0); break;
      case 'coconut': b(0.18, 0.16, 0.18, c, 0, 0.08, 0); b(0.03, 0.03, 0.01, 0x2a1a0a, -0.03, 0.12, -0.09); b(0.03, 0.03, 0.01, 0x2a1a0a, 0.03, 0.12, -0.09); break;
      case 'banana': for (let k = 0; k < 3; k++) b(0.04, 0.04, 0.2, c, (k - 1) * 0.045, 0.04, 0, 0.3, 0, 0); b(0.12, 0.03, 0.03, 0x6a4a2a, 0, 0.06, -0.1); break;
      case 'cacao': b(0.1, 0.18, 0.1, c, 0, 0.1, 0); for (let k = 0; k < 4; k++) b(0.01, 0.16, 0.02, 0xa8501a, Math.cos(k * 1.57) * 0.05, 0.1, Math.sin(k * 1.57) * 0.05); break;
      case 'shell': for (let k = 0; k < 5; k++) b(0.03, 0.02, 0.12, k % 2 ? c : 0xffc0c8, (k - 2) * 0.025, 0.015, 0, 0, (k - 2) * 0.25, 0); break;
      case 'conch': for (let k = 0; k < 4; k++) b(0.12 - k * 0.025, 0.05, 0.12 - k * 0.025, k % 2 ? c : 0xffe8d8, 0, 0.03 + k * 0.04, 0, 0, k * 0.6, 0); break;
      case 'starfish': for (let k = 0; k < 5; k++) { const a = k * 1.2566; b(0.12, 0.025, 0.04, c, Math.cos(a) * 0.06, 0.015, Math.sin(a) * 0.06, 0, -a, 0); } break;
      case 'pearl': b(0.14, 0.04, 0.14, 0xb8a8a0, 0, 0.02, 0); gl(0.07, 0.07, 0.07, c, 0, 0.07, 0); b(0.14, 0.04, 0.12, 0xb8a8a0, 0, 0.08, 0.06, -0.8, 0, 0); break;
      case 'wood': b(0.3, 0.05, 0.06, c, 0, 0.03, 0, 0, 0.3, 0); b(0.12, 0.04, 0.04, c, 0.08, 0.04, 0.05, 0, -0.5, 0); break;
      case 'gem': (m.glow ? gl : b)(0.08, 0.16, 0.08, c, 0, 0.1, 0, 0, 0.4, 0.2); (m.glow ? gl : b)(0.06, 0.1, 0.06, c, 0.06, 0.06, 0.02, 0, 0, -0.4); break;
      case 'pebble': b(0.1, 0.05, 0.08, c, 0, 0.025, 0); b(0.07, 0.04, 0.06, 0xc8c0b0, 0.08, 0.02, 0.04); break;
      case 'jelly': gl(0.14, 0.08, 0.14, c, 0, 0.06, 0); for (let k = 0; k < 4; k++) gl(0.02, 0.06, 0.02, 0xffb8f0, Math.cos(k * 1.57) * 0.04, 0.01, Math.sin(k * 1.57) * 0.04); break;
      case 'relic': b(0.14, 0.14, 0.04, 0x7a8a6a, 0, 0.08, 0, 0, 0.3, 0); gl(0.05, 0.05, 0.02, c, 0, 0.09, -0.02, 0, 0.3, 0); break;
      case 'feather': b(0.03, 0.02, 0.24, c, 0, 0.02, 0, 0, 0.4, 0); b(0.06, 0.015, 0.12, 0xffd83a, 0.01, 0.025, 0.04, 0, 0.4, 0); b(0.05, 0.015, 0.08, 0x2a5ad8, -0.01, 0.025, -0.06, 0, 0.4, 0); break;
      case 'snow': for (let k = 0; k < 3; k++) gl(0.18, 0.02, 0.03, c, 0, 0.1, 0, 0, 0, k * 1.047); gl(0.05, 0.05, 0.05, c, 0, 0.1, 0); break;
      case 'seed': b(0.16, 0.1, 0.1, 0xd8c8a0, 0, 0.05, 0); b(0.14, 0.02, 0.08, c, 0, 0.11, 0); b(0.05, 0.04, 0.02, 0x4a9a3a, 0, 0.06, -0.06); break;
      default: b(0.1, 0.1, 0.1, c, 0, 0.05, 0);
    }
    const g = new THREE.Group();
    if (parts.length) { const mesh = new THREE.Mesh(mergeGeometries(parts, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })); mesh.castShadow = true; g.add(mesh); }
    if (glowParts.length) g.add(new THREE.Mesh(mergeGeometries(glowParts, false), new THREE.MeshBasicMaterial({ vertexColors: true })));
    parts.forEach((x) => x.dispose()); glowParts.forEach((x) => x.dispose());
    g.userData.dynamic = true;
    return g;
  }
  // 반짝이 (채집물 위에서 빛나는 작은 별 — 멀리서도 보이게)
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.9, depthWrite: false });
  const sparkGeo = new THREE.OctahedronGeometry(0.06, 0);
  // 구역마다 채집물이 생길 자리 고르기
  const ZONES = {
    lake: { box: [-30, 22, 0, 23], ok: (x, z) => !inLake(x, z, 1) && !onPlateau(x, z) },
    forest: { box: [-73, -26, -46, 22], ok: (x, z) => !inLake(x, z, 1.2) },
    beach: { custom: () => { const x = -60 + rnd() * 100, ze = seaWorld.zEdge(x); return [x, ze - 0.5 - rnd() * 6]; } },
    island: { custom: () => { const it = seaWorld.islands.filter((i) => i.id !== 'jungle')[Math.floor(rnd() * 5)]; const a = rnd() * 6.28, r = it.r * (0.5 + rnd() * 0.45); return [it.x + Math.cos(a) * r, it.z + Math.sin(a) * r]; }, y: 0.22 },
    aurora: { box: [-66, -40, -46, 22], ok: (x, z) => !inLake(x, z, 0.3) && inLake(x, z, 3.5) },
    jungle: { custom: () => { const it = seaWorld.islands.find((i) => i.id === 'jungle'); const a = rnd() * 6.28, r = it.r * (0.2 + rnd() * 0.7); return [it.x + Math.cos(a) * r, it.z + Math.sin(a) * r]; }, y: 0.22 },
    mountain: { box: [25, 39, -16, -2], ok: (x, z) => onPlateau(x, z) && !inLake(x, z, 0.8) }
  };
  const PER_ZONE = { lake: 26, forest: 30, beach: 22, island: 22, aurora: 12, jungle: 18, mountain: 10 };
  const blocked = (x, z) => colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.5) ** 2);
  for (const [zone, n] of Object.entries(PER_ZONE)) {
    const Z = ZONES[zone];
    const pool = MATS.filter((m) => m.zone.includes(zone));
    for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) {
      let x, z;
      if (Z.custom) [x, z] = Z.custom();
      else { x = Z.box[0] + rnd() * (Z.box[1] - Z.box[0]); z = Z.box[2] + rnd() * (Z.box[3] - Z.box[2]); }
      if (Z.ok && !Z.ok(x, z)) continue;
      if (!Z.custom && inLake(x, z)) continue;
      if (blocked(x, z)) continue;
      if (zone === 'island' && inLake(x, z) && !onIsland(x, z)) continue;
      if (zone === 'jungle' && !onIsland(x, z)) continue;
      const y = Z.y ?? groundY(x, z);
      const node = { zone, x, z, y, m: null, mesh: null, spark: null, respawn: 0, entry: null, ph: rnd() * 6 };
      nodes.push(node);
      k++;
    }
    for (const nd of nodes.filter((q) => q.zone === zone)) spawnNode(nd, pool, true);
  }
  // 채집물 하나 새로 생기기 (계절 재료는 그 계절에만, 귀한 건 가끔)
  function pickMat(pool) {
    const season = getSeason();
    const list = pool.filter((m) => !m.season || m.season === season);
    for (let i = 0; i < 6; i++) { const m = list[Math.floor(Math.random() * list.length)]; if (!m.rare || Math.random() < 0.15) return m; }
    return list.find((m) => !m.rare) || list[0];
  }
  function spawnNode(nd, pool, first) {
    pool = pool || MATS.filter((m) => m.zone.includes(nd.zone));
    nd.m = pickMat(pool);
    if (nd.mesh) scene.remove(nd.mesh);
    nd.mesh = matModel(nd.m);
    nd.mesh.position.set(nd.x, nd.y, nd.z);
    nd.mesh.rotation.y = Math.random() * 6.28;
    nd.mesh.scale.setScalar(1.4);
    nd.spark = new THREE.Mesh(sparkGeo, sparkMat);
    nd.spark.position.set(0, 0.55, 0);
    nd.mesh.add(nd.spark);
    scene.add(nd.mesh);
    if (!nd.entry) {
      nd.entry = { kind: 'gather', node: nd, title: '', group: new THREE.Group(), pos: new THREE.Vector3(nd.x, nd.y, nd.z), promptAt: new THREE.Vector3(nd.x, nd.y + 1.1, nd.z), r: 1.5 };
      shops.push(nd.entry);
    }
    nd.entry.title = `줍기 · ${nd.m.name}`;
    nd.entry.off = false;
  }
  function gather(nd) {
    if (!nd.m || nd.entry.off) return;
    const m = nd.m;
    const n = m.kind === 'seed' ? 1 + Math.floor(Math.random() * 3) : 1;
    save.mats[m.id] = (save.mats[m.id] || 0) + n;
    writeSave();
    scene.remove(nd.mesh); nd.mesh = null; nd.m = null;
    nd.entry.off = true;
    nd.respawn = performance.now() + (90 + Math.random() * 150) * 1000; // 1분 반 ~ 4분 뒤 다시 생겨요
    tone(880, 0.06, 'triangle', 0.05); tone(1175, 0.08, 'triangle', 0.04, 0.05);
    notice(`${m.name}${n > 1 ? ' ' + n + '개' : ''}를 주웠어요! (채집함 C)`);
    if (ctx.onGather) ctx.onGather(m);
  }
  function updateNodes(t, now) {
    for (const nd of nodes) {
      if (nd.mesh) {
        nd.mesh.position.y = nd.y + Math.sin(t * 2 + nd.ph) * 0.03;
        if (nd.spark) { nd.spark.rotation.y = t * 2; const s = 0.6 + Math.max(0, Math.sin(t * 3 + nd.ph)) * 0.8; nd.spark.scale.setScalar(s); }
      } else if (now > nd.respawn) spawnNode(nd);
    }
  }

  // =====================================================
  //  채집함 (C 키 / 위 버튼): 모은 재료 보기 · 판매점 근처에서는 팔기
  // =====================================================
  const matsPanel = makePanel('matsPanel', '채집함');
  function nearSell() { const s = game.nearShop; return s && s.kind === 'sell'; }
  function renderMats() {
    const body = matsPanel.querySelector('.pbody');
    const have = MATS.filter((m) => (save.mats[m.id] || 0) > 0);
    const canSell = nearSell();
    body.innerHTML = `<div class="count">맵 곳곳의 반짝이는 것에 다가가서 <b>E</b> 로 주워요. 재료는 가구 만들기 · 정원 · 선물 · 요리에 써요. ${canSell ? '<b>판매점 앞이라 팔 수 있어요!</b>' : '물고기 판매점 앞에서 열면 팔 수도 있어요.'}</div><div class="matGrid"></div>`;
    const grid = body.querySelector('.matGrid');
    if (!have.length) grid.innerHTML = '<div class="count">아직 모은 재료가 없어요.</div>';
    for (const m of have) {
      const card = document.createElement('div');
      card.className = 'matCard';
      card.innerHTML = `<span class="mdot" style="background:#${m.color.toString(16).padStart(6, '0')}"></span><span class="mnm">${esc(m.name)}</span><span class="mcnt">${save.mats[m.id]}개</span><span class="mpr">${money(m.price)}</span>`;
      if (canSell) {
        const b1 = document.createElement('button'); b1.className = 'actBtn'; b1.textContent = '1개 팔기';
        b1.onclick = () => { save.mats[m.id]--; save.money += m.price; if (!save.mats[m.id]) delete save.mats[m.id]; writeSave(); sfx.coin(); updateUI(); renderMats(); };
        const b2 = document.createElement('button'); b2.className = 'actBtn'; b2.textContent = '모두';
        b2.onclick = () => { save.money += m.price * save.mats[m.id]; delete save.mats[m.id]; writeSave(); sfx.coin(); updateUI(); renderMats(); };
        card.append(b1, b2);
      }
      grid.appendChild(card);
    }
  }
  const matsBtn = document.createElement('button');
  matsBtn.className = 'smallBtn'; matsBtn.id = 'matsBtn'; matsBtn.textContent = '채집함 (C)';
  matsBtn.onclick = (e) => { e.currentTarget.blur(); renderMats(); openPanel(matsPanel); };
  const topBar = document.getElementById('multiBtn')?.parentElement;
  if (topBar) topBar.insertBefore(matsBtn, document.getElementById('accountBtn'));
  window.addEventListener('keydown', (e) => {
    if (decor || e.repeat) return;
    if (e.code === 'KeyC' && !e.ctrlKey && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
      if (!matsPanel.classList.contains('hidden')) matsPanel.classList.add('hidden');
      else if (!modalOpen()) { renderMats(); openPanel(matsPanel); }
    }
  });

  // =====================================================
  //  정원 텃밭: 산 집 양옆 마당에 밭 10칸. 씨앗을 심으면 시간이 지나 자라요 (게임을 꺼도 자라요)
  //  텃밭 창에서 씨앗을 바로 살 수도 있어요
  // =====================================================
  const plotMeshes = new Map(); // houseId → [{ soil, crop, entry }]
  const PLOTS = 10;
  const cropModel = (c, stage) => {
    // stage 0 새싹 · 1 자라는 중 · 2 다 자람
    const fake = { kind: 'herb', color: 0x5ab84a };
    if (stage === 0) return matModel({ kind: 'clover', color: 0x6ad84a });
    if (stage === 1) return matModel(fake);
    const map = { bouquet: { kind: 'flower', color: 0xff6a9a, c2: 0xffd84a }, strawberry: { kind: 'berry', color: 0xe8203a }, carrot: { kind: 'carrotG' }, pumpkin: { kind: 'pumpkinG' }, watermelon: { kind: 'melonG' } };
    const spec = map[c];
    if (spec.kind === 'carrotG') { const g = matModel({ kind: 'herb', color: 0x4aaa3a }); const o = matModel({ kind: 'fruit', color: 0xff8a2a }); o.scale.set(0.7, 1.1, 0.7); o.position.y = -0.05; g.add(o); return g; }
    if (spec.kind === 'pumpkinG') { const g = new THREE.Group(); const o = matModel({ kind: 'fruit', color: 0xf07a1a }); o.scale.set(2.8, 2.0, 2.8); g.add(o); g.add(matModel({ kind: 'herb', color: 0x4a9a3a })); g.userData.dynamic = true; return g; }
    if (spec.kind === 'melonG') { const g = new THREE.Group(); const o = matModel({ kind: 'fruit', color: 0x2a8a3a }); o.scale.set(3.2, 2.4, 3.2); g.add(o); g.userData.dynamic = true; return g; }
    return matModel(spec);
  };
  // 텃밭 10칸은 모두 바깥: 0~4 = 집 왼쪽 마당, 5~9 = 집 오른쪽 마당 (울타리 안)
  function plotPos(h, i) {
    const e = h.ext || h, side = i < 5 ? -1 : 1, k = i % 5;
    return { x: side < 0 ? e.x0 - 1.15 : e.x1 + 1.15, z: e.z0 + 0.9 + k * ((e.z1 - e.z0 - 1.8) / 4), y: 0.22 };
  }
  function rebuildGarden(hid) {
    for (const p of plotMeshes.get(hid) || []) { scene.remove(p.soil); if (p.crop) scene.remove(p.crop); p.entry.off = true; }
    const h = houseOf(hid);
    if (!h) return;
    if (!save.homes.includes(hid)) { plotMeshes.set(hid, (plotMeshes.get(hid) || []).map((p) => ({ ...p, crop: null }))); return; }
    if (!save.garden[hid]) save.garden[hid] = Array(PLOTS).fill(null);
    while (save.garden[hid].length < PLOTS) save.garden[hid].push(null); // 예전 세이브는 6칸이었어요
    const old = plotMeshes.get(hid) || [];
    const list = [];
    for (let i = 0; i < PLOTS; i++) {
      const { x, z, y: py, inside } = plotPos(h, i);
      const soil = new THREE.Group();
      const dirt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
      dirt.position.y = 0.06; dirt.receiveShadow = true; soil.add(dirt);
      for (let k = 0; k < 3; k++) { const row = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x5a3a1e })); row.position.set(0, 0.13, -0.3 + k * 0.3); soil.add(row); }
      for (const [fx, fz, w, d] of [[0, 0.5, 1.05, 0.08], [0, -0.5, 1.05, 0.08], [0.5, 0, 0.08, 1.05], [-0.5, 0, 0.08, 1.05]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), new THREE.MeshStandardMaterial({ color: 0xa8784a })); e.position.set(fx, 0.08, fz); soil.add(e); }
      if (inside) { // 집 안: 나무 화분 상자 (테두리 높게 + 다리 4개 + 나뭇결)
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.1), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 })); box.position.y = 0.05; soil.add(box);
        for (const [lx, lz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), box.material); lg.position.set(lx, -0.13, lz); soil.add(lg); }
        for (let k = 0; k < 4; k++) { const gr = new THREE.Mesh(new THREE.BoxGeometry(1.115, 0.012, 0.02), new THREE.MeshStandardMaterial({ color: 0x6a4224 })); gr.position.set(0, -0.04 + k * 0.06, -0.556); soil.add(gr); }
        dirt.position.y = 0.16;
      }
      soil.position.set(x, inside ? py + 0.2 : 0.22, z); soil.userData.dynamic = true;
      scene.add(soil);
      const entry = old[i]?.entry || { kind: 'plot', title: '', group: new THREE.Group(), pos: new THREE.Vector3(x, 0.25, z), promptAt: new THREE.Vector3(x, (inside ? py : 0) + 1.4, z), r: 1.0 };
      if (!old[i]) shops.push(entry);
      entry.house = h; entry.idx = i; entry.off = false;
      list.push({ soil, crop: null, entry, stage: -1 });
    }
    plotMeshes.set(hid, list);
    refreshCrops(hid, true);
  }
  function plotStage(p) { if (!p) return -1; const mins = (Date.now() - p.at) / 60000, need = CROPS[p.c]; return mins >= need ? 2 : mins >= need * 0.4 ? 1 : 0; }
  function refreshCrops(hid, force) {
    const list = plotMeshes.get(hid);
    if (!list || !save.homes.includes(hid)) return;
    list.forEach((pm, i) => {
      const p = save.garden[hid]?.[i];
      const st = plotStage(p);
      const name = p ? findMat(p.c).name : '';
      pm.entry.title = !p ? '텃밭 · 씨앗 심기' : st === 2 ? `텃밭 · ${name} 거두기` : `텃밭 · ${name} 자라는 중 (${Math.max(1, Math.ceil(CROPS[p.c] - (Date.now() - p.at) / 60000))}분 남음)`;
      if (st === pm.stage && !force) return;
      pm.stage = st;
      if (pm.crop) { scene.remove(pm.crop); pm.crop = null; }
      if (st >= 0) {
        pm.crop = new THREE.Group();
        const pos = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
        const n = st === 2 && (p.c === 'pumpkin' || p.c === 'watermelon') ? 1 : 4;
        for (let k = 0; k < n; k++) { const c = cropModel(p.c, st); c.position.set(n === 1 ? 0 : pos[k][0], 0.14, n === 1 ? 0 : pos[k][1]); c.scale.multiplyScalar(st === 2 ? 1.5 : 1.2); pm.crop.add(c); }
        pm.crop.position.copy(pm.soil.position);
        pm.crop.userData.dynamic = true;
        scene.add(pm.crop);
      }
    });
  }
  const seedPanel = makePanel('seedPanel', '텃밭 · 씨앗 고르기');
  function usePlot(entry) {
    const h = entry.house, i = entry.idx;
    if (!save.homes.includes(h.id)) return;
    const p = save.garden[h.id][i];
    const st = plotStage(p);
    if (p && st === 2) { // 거두기
      const n = p.c === 'pumpkin' || p.c === 'watermelon' ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
      save.mats[p.c] = (save.mats[p.c] || 0) + n;
      if (Math.random() < 0.5) { const sd = MATS.find((m) => m.grows === p.c); save.mats[sd.id] = (save.mats[sd.id] || 0) + 1; } // 가끔 씨앗도
      save.garden[h.id][i] = null;
      writeSave(); refreshCrops(h.id, true); sfx.coin();
      notice(`${findMat(p.c).name} ${n}개를 거뒀어요! (채집함 C)`);
      return;
    }
    if (p) { notice(`아직 자라는 중이에요. ${Math.max(1, Math.ceil(CROPS[p.c] - (Date.now() - p.at) / 60000))}분쯤 뒤에 와요.`); return; }
    // 씨앗 고르기
    const seeds = MATS.filter((m) => m.kind === 'seed' && (save.mats[m.id] || 0) > 0);
    const body = seedPanel.querySelector('.pbody');
    body.innerHTML = `<div class="count">심을 씨앗을 골라요. 씨앗은 맵에서 줍거나 아래에서 살 수 있어요. 게임을 꺼도 계속 자라요!</div>`;
    if (!seeds.length) body.insertAdjacentHTML('beforeend', '<div class="count">가진 씨앗이 없어요. 아래 씨앗 가게에서 사거나 호숫가·숲·섬에서 주워 와요.</div>');
    // 씨앗 가게 (값은 씨앗 값의 2배)
    body.insertAdjacentHTML('beforeend', '<h3 class="chartH">씨앗 가게</h3>');
    for (const m of MATS.filter((q) => q.kind === 'seed')) {
      const price = m.price * 2;
      const row = document.createElement('div'); row.className = 'sellRow';
      row.innerHTML = `<span class="nm">${esc(m.name)} <span style="color:#aaa">${CROPS[m.grows]}분 뒤 ${esc(findMat(m.grows).name)} · 가진 ${save.mats[m.id] || 0}개</span></span><span class="pr">${money(price)}</span>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '사기'; b.disabled = save.money < price;
      b.onclick = () => { if (save.money < price) return; save.money -= price; save.mats[m.id] = (save.mats[m.id] || 0) + 1; writeSave(); updateUI(); usePlot(entry); };
      row.appendChild(b); body.appendChild(row);
    }
    body.insertAdjacentHTML('beforeend', '<h3 class="chartH">가진 씨앗</h3>');
    for (const m of seeds) {
      const row = document.createElement('div');
      row.className = 'sellRow';
      row.innerHTML = `<span class="nm">${esc(m.name)} <span style="color:#aaa">${save.mats[m.id]}개 · ${CROPS[m.grows]}분 뒤 ${esc(findMat(m.grows).name)}</span></span>`;
      const b = document.createElement('button'); b.className = 'actBtn'; b.textContent = '심기';
      b.onclick = () => { save.mats[m.id]--; if (!save.mats[m.id]) delete save.mats[m.id]; save.garden[h.id][i] = { c: m.grows, at: Date.now() }; writeSave(); refreshCrops(h.id, true); closePanels(); tone(440, 0.08, 'triangle', 0.05); notice(`${m.name}을 심었어요. ${CROPS[m.grows]}분 뒤에 거둘 수 있어요!`); };
      row.appendChild(b);
      body.appendChild(row);
    }
    openPanel(seedPanel);
  }
  let gardenTick = 0;

  // ---------- 처음 상태 맞추기 ----------
  for (const hid of save.homes) seedHome(houseOf(hid)); // 이미 집이 있던 사람도 기본 가구를 한 번 받아요
  for (const h of seaWorld.houses) { rebuildDecor(h.id); rebuildGarden(h.id); }

  // ---------- 반려동물 (pets.js) ----------
  // 아래 모듈들에 ctx 를 넘길 때 펼치기(...ctx)를 쓰면 person 같은 getter 가 그 순간 값으로 굳어요.
  // (캐릭터 모습을 바꾸면 person 이 새 것으로 바뀌는데, 반려동물이 옛 자리를 따라가던 버그)
  // 그래서 ctx 를 원형으로 이어 받아 getter 가 늘 최신 값을 돌려주게 해요.
  const sub = (extra) => Object.assign(Object.create(ctx), extra);
  const pets = setupPets(sub({ makePanel, drawPreview, notice, MATS, decorating: () => !!decor }));

  // ---------- 수첩: 친구 · 도감 보상 · 칭호 (friends.js) ----------
  const friends = setupFriends(sub({ makePanel, notice, MATS, findMat, decorating: () => !!decor }));

  // ---------- 같이 놀기: 함께 모닥불 · 불꽃놀이 · 황금 물고기 떼 (coop.js) ----------
  const coop = setupCoop(sub({ makePanel, notice, decorating: () => !!decor }));

  // ---------- 맵 꾸미기 (decor.js) — 계절 장식과 자리가 겹치지 않게 같은 목록을 써요 ----------
  const usedSpots = [];
  const decorMap = setupDecor(sub({ used: usedSpots }));

  // ---------- 계절 (seasons.js) — 계절이 바뀌면 철 지난 채집물은 새 계절 것으로 ----------
  const seasons = setupSeasons(sub({ used: usedSpots, notice, onSeason: (s) => { for (const nd of nodes) if (nd.m && nd.m.season && nd.m.season !== s) spawnNode(nd); } }));

  // ---------- main.js 와 이어지는 곳 ----------
  return {
    interact(s) {
      if (s.kind === 'furnshop') { renderFurnShop(); openPanel(furnPanel); return true; }
      if (s.kind === 'gather') { gather(s.node); return true; }
      if (s.kind === 'plot') { usePlot(s); return true; }
      return pets.interact(s) || coop.interact(s);
    },
    startDecor, houseChanged, get decorating() { return !!decor; },
    update(dt, t, now) {
      updateNodes(t, now);
      pets.update(dt, t, now);
      seasons.update(dt, t);
      friends.update(dt, now);
      coop.update(dt, t, now);
      decorMap.update(dt, t);
      updateDecor();
      if (now - gardenTick > 2000) { gardenTick = now; for (const hid of save.homes) refreshCrops(hid); }
    },
    renderMats, nodes, plots: plotMeshes, pets,
    luckBonus: () => pets.luckBonus() + friends.luckBonus() + coop.luckBonus(),
    onFx: (r, m) => coop.onFx(r, m), coop, seasons, setTod: ctx.setTod,
    onTalk: (n) => friends.onTalk(n), onCatch: (f, isNew) => friends.onCatch(f, isNew)
  };
}

// ---------------- 세이브 검사 2부: 반려동물 · 친밀도 · 보상 · 칭호 ----------------
function cleanLife2(s, out, intIn) {
  const ps = s.pets && typeof s.pets === 'object' ? s.pets : {};
  const ids = PETS.map((p) => p.id);
  const own = Array.isArray(ps.own) ? [...new Set(ps.own.filter((x) => ids.includes(x)))] : [];
  const love = {}, nm = {};
  for (const id of own) {
    love[id] = intIn(ps.love?.[id], 0, 100, 20);
    if (typeof ps.nm?.[id] === 'string') { const v = ps.nm[id].replace(/[<>]/g, '').trim().slice(0, 10); if (v) nm[id] = v; }
  }
  // team = 데리고 다니는 친구들 (최대 5) · on = 맨 앞 친구 (예전 세이브는 on 하나만 있었어요)
  let team = Array.isArray(ps.team) ? [...new Set(ps.team.filter((x) => own.includes(x)))].slice(0, 5) : [];
  if (!team.length && own.includes(ps.on)) team = [ps.on];
  out.pets = { own, on: team[0] || null, team, love, nm, t: intIn(ps.t, 0, 1e15, 0) };
  // 친구 (NPC 이름 → 점수 · 마지막 대화 · 선물 시각 · 받은 하트 보상 · 알아낸 취향)
  out.friends = {};
  if (s.friends && typeof s.friends === 'object') for (const [name, r] of Object.entries(s.friends).slice(0, 60)) {
    if (typeof name !== 'string' || name.length > 20 || !r || typeof r !== 'object') continue;
    out.friends[name] = {
      p: intIn(r.p, 0, 1000, 0), t: intIn(r.t, 0, 1e15, 0),
      g: Array.isArray(r.g) ? r.g.slice(-5).map((x) => intIn(x, 0, 1e15, 0)) : [],
      got: Array.isArray(r.got) ? [...new Set(r.got.map((x) => intIn(x, 0, 10, 0)))] : [],
      known: Array.isArray(r.known) ? r.known.filter((k) => k === 'fish' || MATS.some((m) => m.id === k)).slice(0, 20) : []
    };
  }
  out.rewards = { dex: Array.isArray(s.rewards?.dex) ? [...new Set(s.rewards.dex.filter((x) => typeof x === 'string' && x.length < 20))] : [] };
  out.titles = Array.isArray(s.titles) ? [...new Set(s.titles.filter((t) => typeof t === 'string' && t.length <= 24).map((t) => t.replace(/[<>]/g, '')))].slice(0, 60) : [];
  out.title = typeof s.title === 'string' && out.titles.includes(s.title) ? s.title : '';
  out.fireworks = intIn(s.fireworks, 0, 9999, 0);
}
