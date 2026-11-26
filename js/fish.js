// =====================================================
//  물고기 데이터 + 물고기 3D 모양 만들기
// =====================================================
import * as THREE from 'three';

// 희귀도: speed/jump = 물고기가 얼마나 빠르게 날뛰는지 (초록 칸 크기는 낚싯대가 정해요)
export const RARITY = {
  common:    { label: '흔함',     color: '#d8d2c4', speed: 1.3, jump: 1.3 },
  uncommon:  { label: '희귀',     color: '#7fd48f', speed: 1.9, jump: 1.0 },
  rare:      { label: '매우 희귀', color: '#6db8ff', speed: 2.6, jump: 0.8 },
  legendary: { label: '전설',     color: '#ffc94d', speed: 3.4, jump: 0.6 },
  mythic:    { label: '신화',     color: '#ff7ad9', speed: 3.8, jump: 0.5 }
};

// 실제로 있는 물고기들
// w = 무게 범위(kg), perKg = 1kg 당 가격($), look = 모양 정보
export const FISH = [
  // ---- 흔함 ----
  { name: '피라미', rarity: 'common', w: [0.01, 0.08], perKg: 300,
    look: { L: 0.6, h: 0.14, w: 0.08, color: 0xc7d3dc, belly: 0xf0f4f6, fin: 0xe8806a, pattern: 'stripes', pc: 0x8a7fc0, size: 0.8 } },
  { name: '붕어', rarity: 'common', w: [0.1, 1.5], perKg: 25,
    look: { L: 0.75, h: 0.34, w: 0.14, color: 0x8a7a45, belly: 0xd8c88a, fin: 0x6b5a35, iris: 0xe8d890, size: 0.9 } },
  { name: '블루길', rarity: 'common', w: [0.05, 0.4], perKg: 60,
    look: { L: 0.6, h: 0.38, w: 0.12, color: 0x5e7a6a, belly: 0xe8a050, fin: 0x4a5a50, pattern: 'stripes', pc: 0x40564a, gill: true, size: 0.85 } },
  { name: '빙어', rarity: 'common', w: [0.005, 0.03], perKg: 600,
    look: { L: 0.55, h: 0.1, w: 0.07, color: 0xd6e4ea, belly: 0xf4f8fa, fin: 0xc0d0d8, pattern: 'band', pc: 0x9cc0d4, size: 0.65 } },
  { name: '미꾸라지', rarity: 'common', w: [0.01, 0.05], perKg: 400,
    look: { L: 0.65, h: 0.1, w: 0.09, color: 0x7a6a4a, belly: 0xc8b890, fin: 0x6a5a3c, pattern: 'spots', pc: 0x3a3020, eel: true, whiskers: true, size: 0.7 } },
  // 흔한데 큰 물고기들 (플레이어만 해요!)
  { name: '초어', rarity: 'common', w: [5, 35], perKg: 3,
    look: { L: 1.3, h: 0.4, w: 0.3, color: 0x7a8048, belly: 0xd8d0a0, fin: 0x5e6438, size: 2.2 } },
  { name: '백련어', rarity: 'common', w: [5, 30], perKg: 3,
    look: { L: 1.2, h: 0.46, w: 0.3, color: 0xb8c0c4, belly: 0xeef0f0, fin: 0x9aa4a8, bigHead: true, size: 2.0 } },
  // ---- 희귀 ----
  { name: '배스', rarity: 'uncommon', w: [0.3, 4], perKg: 30,
    look: { L: 1.0, h: 0.32, w: 0.16, color: 0x6f8a4a, belly: 0xe6e0c0, fin: 0x55703a, pattern: 'band', pc: 0x34401f, bigMouth: true, iris: 0xd89a40 } },
  { name: '송어', rarity: 'uncommon', w: [0.5, 5], perKg: 28,
    look: { L: 1.0, h: 0.26, w: 0.14, color: 0x8a9890, belly: 0xe8e8e0, fin: 0x6f7a70, pattern: 'spots', pc: 0x2a2a2a } },
  { name: '무지개송어', rarity: 'uncommon', w: [0.5, 6], perKg: 32,
    look: { L: 1.0, h: 0.27, w: 0.14, color: 0x7f9a8a, belly: 0xeef0e8, fin: 0x6a7a6a, pattern: 'spots', pc: 0x2a2a2a, blush: 0xe07a9a } },
  { name: '잉어', rarity: 'uncommon', w: [1, 15], perKg: 12,
    look: { L: 1.15, h: 0.38, w: 0.2, color: 0xb07a3a, belly: 0xe8d090, fin: 0x8a5a2a, whiskers: true, iris: 0xf0c860, size: 1.1 } },
  { name: '꺽지', rarity: 'uncommon', w: [0.05, 0.3], perKg: 90,
    look: { L: 0.7, h: 0.3, w: 0.14, color: 0x5a5238, belly: 0xb8b08a, fin: 0x4a442e, pattern: 'stripes', pc: 0x3a3424, gill: true, tallDorsal: true, size: 0.85 } },
  { name: '누치', rarity: 'uncommon', w: [0.5, 4], perKg: 22,
    look: { L: 1.15, h: 0.26, w: 0.15, color: 0xb8b0a0, belly: 0xece8e0, fin: 0x9a9080, whiskers: true, pattern: 'spots', pc: 0x7a7060 } },
  { name: '대두어', rarity: 'uncommon', w: [10, 40], perKg: 3,
    look: { L: 1.3, h: 0.5, w: 0.34, color: 0x6a6e6a, belly: 0xd0d0c8, fin: 0x55585a, bigHead: true, pattern: 'blotch', pc: 0x3e423e, size: 2.6 } },
  { name: '대구', rarity: 'uncommon', w: [5, 40], perKg: 4,
    look: { L: 1.3, h: 0.42, w: 0.32, color: 0x9a8a5a, belly: 0xece6d4, fin: 0x7a6c46, bigHead: true, whiskers: true, pattern: 'spots', pc: 0x5a4c30, size: 2.4 } },
  // ---- 매우 희귀 ----
  { name: '쏘가리', rarity: 'rare', w: [0.3, 3], perKg: 90,
    look: { L: 0.9, h: 0.3, w: 0.15, color: 0xc9a85a, belly: 0xf0e0b0, fin: 0xa88a40, pattern: 'spots', pc: 0x4a3a20, tallDorsal: true, bigMouth: true } },
  { name: '메기', rarity: 'rare', w: [2, 30], perKg: 12,
    look: { L: 1.3, h: 0.24, w: 0.24, color: 0x4a4a3a, belly: 0xb8b0a0, fin: 0x3a3a2e, whiskers: true, longWhisk: true, smooth: true, pattern: 'blotch', pc: 0x34342a, size: 1.2 } },
  { name: '가물치', rarity: 'rare', w: [1, 8], perKg: 35,
    look: { L: 1.4, h: 0.24, w: 0.18, color: 0x46523a, belly: 0xb8b89a, fin: 0x323a28, pattern: 'blotch', pc: 0x1f2618, longDorsal: true, size: 1.2 } },
  { name: '연어', rarity: 'rare', w: [2, 15], perKg: 25,
    look: { L: 1.3, h: 0.3, w: 0.17, color: 0x8a98a8, belly: 0xf2ece4, fin: 0x6a7888, pattern: 'spots', pc: 0x3a4250, blush: 0xd86a6a, size: 1.2 } },
  { name: '산천어', rarity: 'rare', w: [0.2, 1.5], perKg: 120,
    look: { L: 0.9, h: 0.24, w: 0.13, color: 0x8a9a8a, belly: 0xf0eee6, fin: 0x7a8a7a, pattern: 'blotch', pc: 0x5a6a7a, blush: 0xe8a0b0 } },
  { name: '뱀장어', rarity: 'rare', w: [0.3, 3], perKg: 110,
    look: { L: 1.5, h: 0.13, w: 0.11, color: 0x3a4430, belly: 0xd8d0a0, fin: 0x2e3626, eel: true, longDorsal: true, size: 1.1 } },
  { name: '열목어', rarity: 'uncommon', w: [0.5, 5], perKg: 34,
    look: { L: 1.05, h: 0.27, w: 0.15, color: 0x7a6a5a, belly: 0xe8d8c8, fin: 0x8a5a4a, pattern: 'spots', pc: 0x2a2018, blush: 0xc85a4a, iris: 0xe0a080 } },
  { name: '자바리', rarity: 'rare', w: [20, 120], perKg: 8,
    look: { L: 1.2, h: 0.5, w: 0.4, color: 0x6a5a40, belly: 0xb8a888, fin: 0x54462e, bigHead: true, bigMouth: true, pattern: 'blotch', pc: 0x3a3020, size: 3.0 } },
  // ---- 전설 ----
  { name: '철갑상어', rarity: 'legendary', w: [20, 200], perKg: 9,
    look: { L: 1.8, h: 0.26, w: 0.22, color: 0x5a646a, belly: 0xd8d8d0, fin: 0x4a5258, pattern: 'scutes', pc: 0xcfcfbf, snout: true, hetero: true, smooth: true, size: 1.5 } },
  { name: '물 만난 광어', rarity: 'legendary', w: [1, 10], perKg: 180,
    look: { flat: true, L: 1.0, h: 0.12, w: 0.55, color: 0x7a6a50, belly: 0xf2efe6, fin: 0x6a5a42, pc: 0x4a3e2e, size: 1.6 } },
  // 미쳐버린 헤비메탈 스타: 삐죽삐죽 머리, 번개 무늬, 징 박힌 등, 빨간 눈, 내민 혀
  { name: '전기뱀장어', rarity: 'legendary', w: [5, 20], perKg: 40,
    look: { eel: true, metal: true, longDorsal: true, L: 1.6, h: 0.26, w: 0.2, color: 0x1c1a26, belly: 0x3a2e4e, fin: 0x7a3cff, pc: 0xffe23a,
      iris: 0xff3030, glow: [0xffe23a, 0x7a3cff, 0xff3030, 0xb46cff], size: 1.6 } },
  { name: '개복치', rarity: 'legendary', w: [100, 600], perKg: 3,
    look: { sunfish: true, L: 1.0, h: 1.0, w: 0.3, color: 0x8a96a0, belly: 0xd8dee2, fin: 0x707c86, pattern: 'spots', pc: 0x6a7680, size: 3.4 } },
  { name: '피라루쿠', rarity: 'legendary', w: [50, 200], perKg: 9,
    look: { L: 1.7, h: 0.36, w: 0.3, color: 0x4a5448, belly: 0xc8b8a0, fin: 0xb03a2a, pattern: 'scales', pc: 0xa83a2a, size: 3.4 } },
  { name: '황쏘가리', rarity: 'legendary', w: [0.5, 3], perKg: 600,
    look: { L: 0.95, h: 0.32, w: 0.16, color: 0xf2c040, belly: 0xfff0b0, fin: 0xe0a020, pattern: 'spots', pc: 0xc87a18, tallDorsal: true, bigMouth: true, iris: 0xfff0c0, glow: [0xfff0c0], size: 1.3 } },
  // ---- 신화 ----
  { name: '대왕 참치', rarity: 'mythic', w: [300, 420], perKg: 6, huge: true,
    look: { L: 2.2, h: 0.62, w: 0.46, color: 0x1f3a6a, belly: 0xdfe6ee, fin: 0x6a7c94, pc: 0xf2c230, tuna: true, size: 4.6 } },

  // =========== 비 올 때만 큰 호수에 나타나는 물고기들 (weather: 'rain') ===========
  { name: '빗방울 송사리', weather: 'rain', rarity: 'uncommon', w: [0.05, 0.5], perKg: 220,
    look: { L: 0.7, h: 0.24, w: 0.14, color: 0x8ac8f0, belly: 0xe0f4ff, fin: 0x5aa8e0, pattern: 'spots', pc: 0xffffff, iris: 0xffffff, smooth: true, ghost: 0.85, size: 1.0 } },
  { name: '먹구름 메기', weather: 'rain', rarity: 'rare', w: [3, 20], perKg: 40,
    look: { L: 1.3, h: 0.26, w: 0.26, color: 0x4a4e5a, belly: 0x7a7e8a, fin: 0x3a3e4a, whiskers: true, longWhisk: true, smooth: true,
      puffs: [0x6a6e7a, 0x8a8e9a, 0x5a5e6a], lava: 0xffe23a, iris: 0xffe23a, glow: [0xffe23a], size: 1.5 } },
  { name: '무지개 붕어', weather: 'rain', rarity: 'legendary', w: [0.5, 3], perKg: 700,
    look: { L: 0.8, h: 0.36, w: 0.16, color: 0xf4f4f4, belly: 0xffffff, fin: 0xb48cff, rainbow: true, smooth: true, iris: 0xffffff, size: 1.2 } },

  // =========== 산 위 연못에만 사는, 세상에 없는 물고기들 (zone: 'mountain') ===========
  { name: '솜사탕 붕어', zone: 'mountain', rarity: 'common', w: [0.3, 2], perKg: 60,
    look: { L: 0.8, h: 0.4, w: 0.2, color: 0xffb6d5, belly: 0xffe0ee, fin: 0xa8d8ff, iris: 0xffffff, smooth: true, puffs: [0xffc8e0, 0xb8e0ff, 0xfff0f8], size: 1.2 } },
  { name: '구름 송사리', zone: 'mountain', rarity: 'common', w: [0.05, 0.6], perKg: 150,
    look: { L: 0.7, h: 0.26, w: 0.16, color: 0xf4f8ff, belly: 0xffffff, fin: 0xd8e4f4, iris: 0xb8d8ff, smooth: true, puffs: [0xffffff, 0xeef4ff, 0xdde8f6], size: 1.1 } },
  { name: '별사탕 복어', zone: 'mountain', rarity: 'uncommon', w: [0.5, 3], perKg: 90,
    look: { puffer: true, L: 0.7, h: 0.6, w: 0.58, color: 0xfff1a8, belly: 0xfffbe0, fin: 0xffb84a, spikes: [0xff6a8a, 0x6ad0ff, 0xa8ff7a, 0xffd84a, 0xc08aff], size: 1.3 } },
  { name: '젤리피쉬', zone: 'mountain', rarity: 'uncommon', w: [0.2, 1.5], perKg: 140,
    look: { jelly: true, L: 0.7, h: 0.5, w: 0.7, color: 0xff9ad8, belly: 0xffd0f0, fin: 0xd08aff, glow: [0xff9ad8, 0xd08aff], ghost: 0.72, size: 1.2 } },
  // 크리스마스 막대 사탕처럼 빨강·하양 사선 줄무늬 (사이사이 초록 줄)
  { name: '캔디 피쉬', zone: 'mountain', rarity: 'rare', w: [0.3, 2.5], perKg: 120,
    look: { candy: true, smooth: true, L: 0.9, h: 0.34, w: 0.18, color: 0xfbf6f0, belly: 0xfbf6f0, fin: 0xe02a3a, pc: 0xe02a3a, pc2: 0x2a9a4a, iris: 0xffffff, size: 1.1 } },
  { name: '용암 메기', zone: 'mountain', rarity: 'rare', w: [3, 25], perKg: 30,
    look: { L: 1.3, h: 0.26, w: 0.26, color: 0x2a1c16, belly: 0x3a2a20, fin: 0x1a1210, whiskers: true, longWhisk: true, smooth: true, lava: 0xff6a1a, iris: 0xffb02a, glow: [0xff6a1a, 0xffb02a], size: 1.6 } },
  { name: '유령 잉어', zone: 'mountain', rarity: 'legendary', w: [2, 18], perKg: 80,
    look: { L: 1.15, h: 0.38, w: 0.2, color: 0xd8f4ff, belly: 0xf0fbff, fin: 0xa8e4ff, whiskers: true, iris: 0x5af0ff, glow: [0x5af0ff], ghost: 0.45, size: 1.5 } },
  { name: '달빛 해마', zone: 'mountain', rarity: 'legendary', w: [0.5, 4], perKg: 400,
    look: { seahorse: true, L: 0.5, h: 1.0, w: 0.22, color: 0xf6e6a0, belly: 0xfff6d0, fin: 0xd8c8ff, pc: 0xfff8e0, glow: [0xfff8e0], size: 1.6 } },
  { name: '황금 왕관 잉어', zone: 'mountain', rarity: 'mythic', w: [30, 80], perKg: 60, huge: true,
    look: { L: 1.3, h: 0.44, w: 0.24, color: 0xf2b830, belly: 0xffe08a, fin: 0xe08a20, whiskers: true, crown: true, iris: 0xffffff, glow: [0xffd84a], size: 3.4 } }
];
// =========== 오로라 강 (큰 호수 서쪽) — 화면을 가릴 만큼 거대한 물고기들 (zone: 'aurora') ===========
FISH.push(
  { name: '오로라 연어', zone: 'aurora', rarity: 'common', w: [8, 30], perKg: 8,
    look: { L: 1.3, h: 0.32, w: 0.18, color: 0x5ad0c0, belly: 0xe0fff8, fin: 0xb48cff, pattern: 'spots', pc: 0xe8d0ff, blush: 0xff9ad8, iris: 0xd8fff4, glow: [0xe8d0ff], size: 3.0 } },
  { name: '수정 비늘 잉어', zone: 'aurora', rarity: 'common', w: [10, 40], perKg: 7,
    look: { L: 1.2, h: 0.42, w: 0.24, color: 0x8ab8e0, belly: 0xe8f4ff, fin: 0x6a8ad8, whiskers: true, crystals: 0xb8f0ff, iris: 0xffffff, glow: [0xb8f0ff], size: 3.4 } },
  { name: '별무리 가오리', zone: 'aurora', rarity: 'uncommon', w: [80, 400], perKg: 2.5,
    look: { ray: true, L: 1.0, h: 0.12, w: 1.3, color: 0x24305a, belly: 0xe8eeff, fin: 0x3a4a8a, pc: 0xfff6c8, glow: [0xfff6c8], size: 6.0 } },
  { name: '심연 아귀', zone: 'aurora', rarity: 'rare', w: [30, 150], perKg: 6,
    look: { angler: true, L: 1.1, h: 0.62, w: 0.6, color: 0x2a2440, belly: 0x4a3a5a, fin: 0x1a1428, pc: 0x7affe8, iris: 0xffe23a, glow: [0x7affe8, 0xffe23a], size: 5.0 } },
  { name: '고대 실러캔스', zone: 'aurora', rarity: 'rare', w: [40, 120], perKg: 7,
    look: { L: 1.4, h: 0.4, w: 0.26, color: 0x2a4a7a, belly: 0x5a7aa8, fin: 0x1a3460, pattern: 'spots', pc: 0xf0f4ff, bigHead: true, smooth: true, iris: 0xffd84a, size: 5.5 } },
  { name: '빛나는 고래상어', zone: 'aurora', rarity: 'legendary', w: [900, 3000], perKg: 1.2,
    look: { L: 2.0, h: 0.5, w: 0.5, color: 0x2a3a4e, belly: 0xd8e0e8, fin: 0x24323f, pattern: 'spots', pc: 0xbfffff, bigHead: true, smooth: true, glow: [0xbfffff], iris: 0xffffff, size: 8.5 } },
  { name: '오로라 리바이어던', zone: 'aurora', rarity: 'mythic', w: [2000, 6000], perKg: 1.5, huge: true,
    look: { serpent: true, L: 3.0, h: 0.34, w: 0.3, color: 0x1a2a5a, belly: 0x7af0d0, fin: 0xb46cff, pc: 0x7affd0, iris: 0xff6ad8, glow: [0x7affd0, 0xb46cff, 0xff6ad8], size: 6.0 } }
);

// 오로라 강의 작고 싼 물고기들 — 거대한 물고기 사이사이에 자주 걸려요 (반짝반짝 예쁘지만 값은 싸요)
FISH.push(
  { name: '오로라 피라미', zone: 'aurora', rarity: 'common', w: [0.02, 0.1], perKg: 110,
    look: { L: 0.6, h: 0.14, w: 0.08, color: 0x8af0d8, belly: 0xeafff8, fin: 0xc8a0ff, pattern: 'stripes', pc: 0xb48cff, iris: 0xe8fff8, size: 0.8 } },
  { name: '별빛 송사리', zone: 'aurora', rarity: 'common', w: [0.03, 0.2], perKg: 80,
    look: { L: 0.6, h: 0.2, w: 0.1, color: 0x3a4a8a, belly: 0xd8e0ff, fin: 0x6a7ad8, pattern: 'spots', pc: 0xfff6c8, glow: [0xfff6c8], size: 0.8 } },
  { name: '얼음꽃 빙어', zone: 'aurora', rarity: 'common', w: [0.01, 0.05], perKg: 180,
    look: { L: 0.55, h: 0.1, w: 0.07, color: 0xd8f4ff, belly: 0xffffff, fin: 0xa8e4ff, pattern: 'band', pc: 0x8ad0ff, smooth: true, size: 0.7 } },
  { name: '청록 붕어', zone: 'aurora', rarity: 'common', w: [0.2, 1.5], perKg: 18,
    look: { L: 0.75, h: 0.34, w: 0.14, color: 0x2a9a8a, belly: 0xc8f0e0, fin: 0x1a6a6a, iris: 0xe8fff0, size: 0.95 } },
  { name: '물안개 미꾸라지', zone: 'aurora', rarity: 'common', w: [0.02, 0.08], perKg: 140,
    look: { L: 0.65, h: 0.1, w: 0.09, color: 0x9aa8c8, belly: 0xe0e8f8, fin: 0x7a88a8, pattern: 'spots', pc: 0x5a6888, eel: true, whiskers: true, size: 0.75 } },
  { name: '보랏빛 블루길', zone: 'aurora', rarity: 'common', w: [0.05, 0.4], perKg: 45,
    look: { L: 0.6, h: 0.38, w: 0.12, color: 0x7a5aa8, belly: 0xffb0d8, fin: 0x5a3a88, pattern: 'stripes', pc: 0x4a2a78, gill: true, size: 0.85 } },
  { name: '반딧불 금붕어', zone: 'aurora', rarity: 'uncommon', w: [0.1, 0.8], perKg: 55,
    look: { L: 0.7, h: 0.36, w: 0.16, color: 0xffa84a, belly: 0xfff0c8, fin: 0xffe07a, iris: 0xffffff, pc: 0xfff6a0, glow: [0xfff6a0], blush: 0xff7a5a, size: 0.95 } },
  { name: '눈송이 각시붕어', zone: 'aurora', rarity: 'uncommon', w: [0.02, 0.12], perKg: 240,
    look: { L: 0.55, h: 0.3, w: 0.1, color: 0xf0f6ff, belly: 0xffffff, fin: 0xff9ad8, pattern: 'spots', pc: 0xb8e0ff, iris: 0x5ab8ff, size: 0.8 } },
  { name: '무지갯빛 꺽지', zone: 'aurora', rarity: 'uncommon', w: [0.05, 0.4], perKg: 70,
    look: { L: 0.7, h: 0.3, w: 0.14, color: 0x4a6a9a, belly: 0xd8e8ff, fin: 0xff8ad8, pattern: 'stripes', pc: 0x7affd0, gill: true, tallDorsal: true, size: 0.85 } }
);

// =========== 풍차 뒤 큰 바다 (zone: 'sea') — 바다에만 사는 물고기들 ===========
FISH.push(
  { name: '고등어', zone: 'sea', rarity: 'common', w: [0.3, 1.5], perKg: 20,
    look: { L: 0.95, h: 0.22, w: 0.13, color: 0x2a6a8a, belly: 0xeef2f4, fin: 0x3a5a6a, pattern: 'stripes', pc: 0x1a3a4a, size: 1.0 } },
  { name: '전갱이', zone: 'sea', rarity: 'common', w: [0.1, 0.6], perKg: 30,
    look: { L: 0.8, h: 0.24, w: 0.12, color: 0x8aa0a8, belly: 0xf0f4f4, fin: 0xd8c050, pattern: 'band', pc: 0xd8c050, size: 0.9 } },
  { name: '학꽁치', zone: 'sea', rarity: 'common', w: [0.05, 0.3], perKg: 70,
    look: { L: 0.9, h: 0.1, w: 0.08, color: 0x6a9ab8, belly: 0xf4f8fa, fin: 0x5a8aa8, snout: true, smooth: true, size: 0.9 } },
  { name: '우럭', zone: 'sea', rarity: 'common', w: [0.3, 2], perKg: 25,
    look: { L: 0.85, h: 0.34, w: 0.18, color: 0x4a4440, belly: 0x9a928a, fin: 0x3a3430, pattern: 'blotch', pc: 0x2a2420, bigMouth: true, gill: true, size: 1.0 } },
  { name: '참돔', zone: 'sea', rarity: 'uncommon', w: [0.5, 6], perKg: 35,
    look: { L: 0.95, h: 0.42, w: 0.16, color: 0xe86a7a, belly: 0xffe0e4, fin: 0xd84a5a, pattern: 'spots', pc: 0x7ad0ff, tallDorsal: true, size: 1.1 } },
  { name: '방어', zone: 'sea', rarity: 'uncommon', w: [2, 12], perKg: 14,
    look: { L: 1.2, h: 0.3, w: 0.18, color: 0x3a5a7a, belly: 0xf0f0ec, fin: 0xe8c840, pattern: 'band', pc: 0xe8c840, size: 1.4 } },
  { name: '쥐치', zone: 'sea', rarity: 'uncommon', w: [0.2, 1], perKg: 60,
    look: { L: 0.75, h: 0.42, w: 0.1, color: 0xb8a070, belly: 0xe8dcc0, fin: 0xa88a50, pattern: 'blotch', pc: 0x7a6440, tallDorsal: true, size: 0.95 } },
  { name: '줄무늬 다랑어', zone: 'sea', rarity: 'rare', w: [5, 30], perKg: 10,
    look: { L: 1.5, h: 0.42, w: 0.32, color: 0x24406a, belly: 0xe8ecf0, fin: 0x5a6c84, pc: 0xf2c230, tuna: true, size: 1.9 } },
  { name: '흑점 가오리', zone: 'sea', rarity: 'rare', w: [10, 60], perKg: 5,
    look: { ray: true, L: 1.0, h: 0.12, w: 1.2, color: 0x5a4a3a, belly: 0xf0ece4, fin: 0x4a3a2a, pc: 0x1a1410, size: 2.6 } },
  { name: '청새치', zone: 'sea', rarity: 'rare', w: [30, 150], perKg: 6,
    look: { L: 1.7, h: 0.32, w: 0.22, color: 0x1a3a6a, belly: 0xe0e8f0, fin: 0x2a4a8a, snout: true, pattern: 'stripes', pc: 0x6ab0ff, smooth: true, size: 3.2 } },
  { name: '돛새치', zone: 'sea', rarity: 'legendary', w: [40, 100], perKg: 9,
    look: { L: 1.7, h: 0.3, w: 0.2, color: 0x1a4a8a, belly: 0xe8f0f8, fin: 0x3a6ad8, snout: true, longDorsal: true, tallDorsal: true, pattern: 'spots', pc: 0x8ad8ff, smooth: true, size: 3.4 } },
  { name: '백상아리', zone: 'sea', rarity: 'legendary', w: [300, 1100], perKg: 2.4,
    look: { L: 2.0, h: 0.44, w: 0.4, color: 0x6a7a86, belly: 0xf4f4f0, fin: 0x5a6a76, bigHead: true, bigMouth: true, smooth: true, size: 6.0 } },
  { name: '바다의 왕 범고래', zone: 'sea', rarity: 'mythic', w: [2000, 5000], perKg: 1.6, huge: true,
    look: { L: 2.2, h: 0.55, w: 0.5, color: 0x141418, belly: 0xf6f6f6, fin: 0x101014, bigHead: true, smooth: true, tallDorsal: true, pattern: 'band', pc: 0xf6f6f6, iris: 0xffffff, size: 7.5 } }
);

// =========== 정글섬 연못 (zone: 'jungle') — 후반 콘텐츠! 정글 공방 낚싯대로만 낚여요. 아주 비싸요 ===========
FISH.push(
  { name: '에메랄드 피라냐', zone: 'jungle', rarity: 'common', w: [0.5, 3], perKg: 2500,
    look: { L: 0.75, h: 0.4, w: 0.16, color: 0x2ab86a, belly: 0xff5a3a, fin: 0x1a8a4a, bigMouth: true, iris: 0xffe23a, pattern: 'spots', pc: 0x8affc8, glow: [0x8affc8], size: 1.0 } },
  { name: '정글 아로와나', zone: 'jungle', rarity: 'common', w: [1, 6], perKg: 1500,
    look: { L: 1.3, h: 0.26, w: 0.14, color: 0xd8a83a, belly: 0xfff0c0, fin: 0xff7a2a, pattern: 'scales', pc: 0xffd84a, whiskers: true, longDorsal: true, smooth: true, size: 1.3 } },
  { name: '무지개 디스커스', zone: 'jungle', rarity: 'uncommon', w: [0.3, 1.5], perKg: 9000,
    look: { L: 0.7, h: 0.62, w: 0.1, color: 0x3ab8ff, belly: 0xffe07a, fin: 0xff6ab0, rainbow: true, smooth: true, iris: 0xff3a3a, size: 1.1 } },
  { name: '황금 비단잉어', zone: 'jungle', rarity: 'uncommon', w: [2, 10], perKg: 2000,
    look: { L: 1.15, h: 0.38, w: 0.2, color: 0xffc83a, belly: 0xfff4d0, fin: 0xffe07a, whiskers: true, pattern: 'blotch', pc: 0xd8402a, iris: 0xffffff, glow: [0xffe07a], size: 1.3 } },
  { name: '덩굴 장어', zone: 'jungle', rarity: 'rare', w: [3, 15], perKg: 3000,
    look: { eel: true, L: 1.6, h: 0.16, w: 0.13, color: 0x2a6a2a, belly: 0xb8e88a, fin: 0x6ad84a, longDorsal: true, pattern: 'stripes', pc: 0x1a4a1a, iris: 0xffe23a, size: 1.6 } },
  { name: '아마존 피라루쿠 왕', zone: 'jungle', rarity: 'rare', w: [60, 200], perKg: 400,
    look: { L: 1.8, h: 0.38, w: 0.32, color: 0x3a4a3a, belly: 0xd8c8a8, fin: 0xd83a2a, pattern: 'scales', pc: 0xd83a2a, crown: true, size: 4.0 } },
  { name: '신전의 수호 메기', zone: 'jungle', rarity: 'legendary', w: [30, 120], perKg: 1500,
    look: { L: 1.4, h: 0.28, w: 0.28, color: 0x4a5a4a, belly: 0x9aa88a, fin: 0x3a4a3a, whiskers: true, longWhisk: true, smooth: true, crystals: 0x6affb0, iris: 0x6affb0, glow: [0x6affb0], size: 2.6 } },
  { name: '태양 신의 물고기', zone: 'jungle', rarity: 'legendary', w: [5, 20], perKg: 12000,
    look: { L: 1.0, h: 0.4, w: 0.18, color: 0xffd84a, belly: 0xfff6c0, fin: 0xff8a2a, tallDorsal: true, crown: true, iris: 0xffffff, glow: [0xffd84a, 0xff8a2a], size: 1.8 } },
  { name: '고대 정글 용', zone: 'jungle', rarity: 'mythic', w: [500, 1500], perKg: 800, huge: true,
    look: { serpent: true, L: 3.0, h: 0.36, w: 0.32, color: 0x1a5a3a, belly: 0xd8f0a0, fin: 0xffc83a, pc: 0x6affb0, iris: 0xff3a3a, glow: [0x6affb0, 0xffc83a], size: 6.5 } }
);

// 물고기가 사는 곳: 'lake'(큰 호수·개울) 또는 'mountain'(산 위 연못)
export const zoneOf = (f) => f.zone || 'lake';

// 이로치 (색이 다른 특별한 물고기)
// chance = 붙을 확률, mult = 가격 배율, tint = 바뀌는 색
//  (확률은 예전보다 살짝 낮췄어요. 얼음·방사능·글리치가 새로 생겼어요)
export const MUTATIONS = [
  { name: '골드',   color: '#ffcf3f', chance: 0.07, mult: 2.0, tint: 0xffd84a, mix: 0.88, metal: 0.3, rough: 0.3, glow: 0xb08000, gi: 0.45 },
  { name: '다크',   color: '#a07cff', chance: 0.045, mult: 2.5, tint: 0x1c1428, mix: 0.85, metal: 0.2, rough: 0.4, glow: 0x5a2aa8, gi: 0.45 },
  { name: '화이트', color: '#f4f4f4', chance: 0.035, mult: 3.0, tint: 0xf6f6f2, mix: 0.85, metal: 0.05, rough: 0.5, glow: 0x000000, gi: 0 },
  // 얼음: 몸 색은 살짝 푸르게만 바꾸고, 겉을 투명한 얼음 껍질이 감싸요 (+ 등에 고드름 결정)
  { name: '얼음',   color: '#aee9ff', chance: 0.03, mult: 3.5, tint: 0xb8e8ff, mix: 0.45, metal: 0.1, rough: 0.3, glow: 0x3a8ab8, gi: 0.15, ice: true },
  { name: '핏빛',   color: '#ff4a4a', chance: 0.022, mult: 4.0, tint: 0x9a0f18, mix: 0.8, metal: 0.2, rough: 0.35, glow: 0x8a0010, gi: 0.4 },
  { name: '알비노', color: '#ffc4d0', chance: 0.014, mult: 6.0, tint: 0xffe6ea, mix: 0.88, metal: 0, rough: 0.5, glow: 0x000000, gi: 0, eye: 0xd8202a },
  { name: '방사능', color: '#7dff3a', chance: 0.01, mult: 7.0, tint: 0x6aff2a, mix: 0.8, metal: 0.1, rough: 0.4, glow: 0x3aff1a, gi: 0.95 },
  { name: '다이아', color: '#9ff3ff', chance: 0.007, mult: 10.0, tint: 0xd8faff, mix: 0.85, metal: 0.2, rough: 0.05, glow: 0x3ad8ff, gi: 0.5, clear: true },
  // 글리치: 화면이 고장 난 것처럼 블록마다 분홍·하늘·검정·하양이 뒤죽박죽 (12배!)
  { name: '글리치', color: '#ff3ad8', chance: 0.004, mult: 12.0, tint: 0xff2ad8, mix: 0.9, metal: 0.3, rough: 0.3, glow: 0xff2ad8, gi: 0.7, glitch: [0xff2ad8, 0x2affff, 0x15101c, 0xffffff, 0x7a2aff] }
];

export function findFish(name) {
  return FISH.find((f) => f.name === name);
}
export function findMut(name) {
  return MUTATIONS.find((m) => m.name === name) || null;
}
// 이로치는 최대 3개까지 겹쳐요. 저장할 땐 "골드+다이아" 처럼 + 로 이어서 적어요.
// 문자열을 이로치 목록으로 바꿔요 (없는 이름, 중복, 3개 이상은 버려요)
export const MAX_MUTS = 3;
export function mutList(str) {
  if (typeof str !== 'string' || !str) return [];
  const out = [];
  for (const n of str.split('+')) {
    const m = findMut(n);
    if (m && !out.includes(m)) out.push(m);
    if (out.length === MAX_MUTS) break;
  }
  return out;
}
// 가격 배율: 겹치면 곱해요 (골드 2 x 다이아 10 = 20배)
export const mutMult = (str) => mutList(str).reduce((k, m) => k * m.mult, 1);
// 저장용 깨끗한 문자열 (없으면 null)
export const mutKey = (str) => mutList(str).map((m) => m.name).join('+') || null;

// 물고기 값 계산 (한 곳에서만 계산해요). PRICE_MULT 를 올리면 모든 물고기가 비싸져요
export const PRICE_MULT = 3;
export function priceOf(f, weight, mut) {
  return Math.max(1, Math.round(weight * f.perKg * PRICE_MULT * mutMult(mut)));
}

// 물고기 한 마리 뽑기 (luck 이 높을수록 귀한 물고기와 이로치가 잘 나와요)
// zone: 'lake' 이면 큰 호수 물고기, 'mountain' 이면 산 위 연못 물고기만 나와요
// rain = true 면 비 올 때만 나오는 물고기도 섞여요 (비 오는 날엔 더 잘 나와요)
export function rollFish(luck, zone = 'lake', rain = false) {
  if (rain && zone === 'lake' && Math.random() < 0.3) {
    // 비 오는 날의 특별 손님: 30% 확률로 비 물고기 중에서 골라요 (귀할수록 드물게)
    const r2 = Math.random();
    const want = r2 < 0.6 - luck * 0.5 ? 'uncommon' : r2 < 0.92 - luck * 0.3 ? 'rare' : 'legendary';
    const rp = FISH.filter((f) => f.weather === 'rain' && f.rarity === want);
    if (rp.length) return makeCatch(rp[Math.floor(Math.random() * rp.length)], luck);
  }
  return rollNormal(luck, zone);
}
// 희귀도별 확률 (합치면 1). 운이 높을수록 흔한 건 줄고 귀한 건 늘어요.
// 운이 아무리 높아도 마이너스가 되거나 100%를 넘지 않게, 무게를 매긴 다음 나눠서 비율로 만들어요.
const RARITY_BASE = { common: 0.55, uncommon: 0.25, rare: 0.14, legendary: 0.05, mythic: 0.01 };
const RARITY_LUCK = { uncommon: 0.8, rare: 2, legendary: 3, mythic: 4 }; // 운 1 당 얼마나 늘어나는지
export function rarityOdds(luck) {
  const L = Math.max(0, luck);
  const w = {};
  for (const [k, b] of Object.entries(RARITY_BASE)) w[k] = k === 'common' ? b * Math.max(0.15, 1 - L * 0.9) : b * (1 + L * RARITY_LUCK[k]);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) w[k] /= sum;
  return w;
}
function rollNormal(luck, zone) {
  const odds = rarityOdds(luck);
  let r = Math.random(), rarity = 'mythic';
  for (const [k, v] of Object.entries(odds)) { if (r < v) { rarity = k; break; } r -= v; }
  // 비 물고기(weather)는 평소에는 안 나와요
  let pool = FISH.filter((f) => f.rarity === rarity && zoneOf(f) === zone && !f.weather);
  if (!pool.length) pool = FISH.filter((f) => zoneOf(f) === zone && !f.weather);
  return makeCatch(pool[Math.floor(Math.random() * pool.length)], luck);
}
// 고른 물고기에 무게·이로치·값을 붙여요
function makeCatch(f, luck) {
  // 같은 물고기라도 무게는 매번 달라요 (가벼운 게 더 자주 나와요)
  let weight = f.w[0] + (f.w[1] - f.w[0]) * Math.pow(Math.random(), 1.8);
  weight = weight < 1 ? Math.round(weight * 1000) / 1000 : Math.round(weight * 10) / 10;
  // 이로치: 귀한 것부터 차례로 확률을 쌓아서 하나 골라요 (골드 10% 가 제일 흔해요)
  // 하나가 붙으면 절반 확률로 두 번째, 또 붙으면 1/4 확률로 세 번째 이로치까지 겹칠 수 있어요
  const boost = 1 + luck * 1.5;
  const pick = (scale, except) => {
    const roll = Math.random();
    let acc = 0;
    for (const m of [...MUTATIONS].reverse()) {
      if (except.includes(m)) continue;
      acc += m.chance * boost * scale;
      if (roll < acc) return m;
    }
    return null;
  };
  const muts = [];
  const m1 = pick(1, []);
  if (m1) {
    muts.push(m1);
    const m2 = pick(0.5, muts);
    if (m2) {
      muts.push(m2);
      const m3 = pick(0.25, muts);
      if (m3) muts.push(m3);
    }
  }
  const mut = muts.map((m) => m.name).join('+') || null;
  const price = priceOf(f, weight, mut);
  return { name: f.name, weight, mut, price };
}

export function fmtKg(w) {
  if (w < 0.1) return w.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + 'kg';
  if (w < 1) return w.toFixed(2) + 'kg';
  if (w < 100) return w.toFixed(1) + 'kg';
  return Math.round(w) + 'kg';
}

// -----------------------------------------------------
//  블록으로 물고기 모양 만들기 (머리는 +x 방향)
// -----------------------------------------------------
const EYE = 0x111111, SHINE = 0xffffff, SCLERA = 0xf4efe0;
// 색을 진하게(k<1) / 밝게(k>1)
const shade = (c, k) => {
  const col = new THREE.Color(c);
  if (k < 1) col.multiplyScalar(k);
  else col.lerp(new THREE.Color(0xffffff), k - 1);
  return col.getHex();
};
// weight 를 주면 같은 물고기라도 무거울수록 더 크게 보여요
// 얼음 이로치용 재질 (모든 물고기가 같이 써요)
const ICE_MAT = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.15, emissive: 0x6ac8ff, emissiveIntensity: 0.18, depthWrite: false });
const ICE_CRYSTAL = new THREE.MeshStandardMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.2, emissive: 0x8ad8ff, emissiveIntensity: 0.5 });
export function makeFishModel(f, mutName, weight) {
  const o = f.look;
  const L = o.L, H = o.h, W = o.w;
  const g = new THREE.Group();
  // 이로치가 1개면 몸 전체가 그 색, 2개면 머리 쪽 절반(+x)은 첫 번째·꼬리 쪽 절반은 두 번째,
  // 3개면 머리·가운데·꼬리 세 칸으로 나눠 칠해요
  const muts = mutList(mutName);
  let iced = false; // 얼음 껍질을 씌운 블록이 있으면 true (등에 고드름을 달아요)

  const piece = (w, h, d, c, x, y, z, rx, ry, rz, mut) => {
    let color = new THREE.Color(c);
    const params = { color, roughness: 0.55 };
    // 스스로 빛나는 색 (전기뱀장어의 번개, 눈 등)
    if (o.glow && o.glow.includes(c)) Object.assign(params, { emissive: new THREE.Color(c), emissiveIntensity: 0.9 });
    // 유령·해파리처럼 몸이 비쳐 보이는 물고기
    if (o.ghost && c !== EYE && c !== SHINE) Object.assign(params, { transparent: true, opacity: o.ghost, depthWrite: false });
    if (mut && c !== SHINE && c !== SCLERA) {
      // 글리치는 블록마다 아무 색이나 골라요 (고장 난 화면처럼)
      const tint = mut.glitch ? mut.glitch[Math.floor(Math.random() * mut.glitch.length)] : mut.tint;
      if (c === EYE) color = new THREE.Color(mut.eye ?? EYE);
      else color.lerp(new THREE.Color(tint), mut.mix); // 이로치는 몸 색이 통째로 바뀌어요
      Object.assign(params, {
        color, metalness: mut.metal, roughness: mut.rough,
        emissive: new THREE.Color(mut.glitch ? tint : mut.glow), emissiveIntensity: mut.gi
      });
      if (mut.clear) Object.assign(params, { transparent: true, opacity: 0.82 });
    }
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(params));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    if (mut) m.userData.mut = mut.name; // 이펙트에서 써요 (어느 이로치 칸인지)
    g.add(m);
    // 얼음 이로치: 블록마다 조금 더 큰 투명 얼음 껍질을 씌워요 (반짝반짝 차가워 보이게)
    if (mut && mut.ice && c !== SHINE) {
      const pad = Math.max(0.02, Math.min(w, h, d) * 0.18);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(w + pad, h + pad, d + pad), ICE_MAT);
      shell.castShadow = false;
      m.add(shell);
      iced = true;
    }
    return m;
  };
  const add = (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => {
    if (muts.length < 2) return piece(w, h, d, c, x, y, z, rx, ry, rz, muts[0]);
    // 여러 색: 경계선(2개면 x=0, 3개면 x=±L/6)을 걸치는 블록은 잘라서 칸마다 칠해요
    const cuts = muts.length === 2 ? [0] : [L / 6, -L / 6]; // 머리 쪽(+x)부터
    const segOf = (px) => { let i = 0; while (i < cuts.length && px < cuts[i]) i++; return muts[i]; };
    if (rx || ry || rz) return piece(w, h, d, c, x, y, z, rx, ry, rz, segOf(x));
    let hi = x + w / 2, last;
    const lo = x - w / 2;
    for (const cut of cuts) {
      if (cut < hi && cut > lo) { last = piece(hi - cut, h, d, c, (hi + cut) / 2, y, z, 0, 0, 0, segOf((hi + cut) / 2)); hi = cut; }
    }
    return piece(hi - lo, h, d, c, (hi + lo) / 2, y, z, 0, 0, 0, segOf((hi + lo) / 2)) || last;
  };

  // 눈: 흰자(또는 눈 색) + 검은 눈동자 + 반짝이. side 방향(±z)으로 붙여요
  const eyeSide = (x, y, z, s, e) => {
    add(e, e, 0.014, o.iris ?? SCLERA, x, y, z);
    add(e * 0.58, e * 0.62, 0.014, EYE, x + e * 0.1, y - e * 0.02, z + s * 0.008);
    add(e * 0.22, e * 0.22, 0.01, SHINE, x + e * 0.22, y + e * 0.2, z + s * 0.015);
  };
  // 위를 보는 눈 (광어)
  const eyeTop = (x, y, z, e) => {
    add(e, 0.014, e, o.iris ?? SCLERA, x, y, z);
    add(e * 0.6, 0.014, e * 0.6, EYE, x + e * 0.08, y + 0.008, z);
    add(e * 0.22, 0.01, e * 0.22, SHINE, x + e * 0.24, y + 0.015, z - e * 0.18);
  };

  if (o.ray) {
    // 별무리 가오리: 넓적한 마름모 날개 + 긴 꼬리 + 등에 별무늬
    add(L * 0.6, H, W * 0.5, o.color, 0, 0, 0);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const span = W * (0.5 - i * 0.1);
        add(L * (0.55 - i * 0.1), H * 0.8, span * 0.5, o.color, -i * L * 0.03, -i * H * 0.03, s * (W * 0.25 + span * 0.25 + i * W * 0.02));
      }
      add(L * 0.18, H * 0.6, W * 0.08, o.fin, L * 0.3, 0, s * W * 0.1, 0, s * 0.4, 0); // 머리 지느러미(뿔)
      add(0.06, 0.06, 0.06, EYE, L * 0.28, H * 0.5, s * W * 0.12);
    }
    add(L * 0.58, 0.01, W * 1.2, o.belly, 0, -H / 2 - 0.006, 0);
    add(L * 0.9, H * 0.25, H * 0.25, o.color, -L * 0.7, 0, 0);       // 긴 꼬리
    for (let i = 0; i < 16; i++) {
      const x = (-0.25 + ((i * 0.37) % 0.5)) * L, z = (((i * 0.61) % 1) - 0.5) * W * 0.9;
      add(0.05, 0.012, 0.05, o.pc, x, H / 2 + 0.005, z);
    }
  } else if (o.angler) {
    // 심연 아귀: 커다란 머리와 이빨, 머리 위 빛나는 초롱
    add(L * 0.75, H, W, o.color, 0, 0, 0);
    add(L * 0.3, H * 1.05, W * 1.05, o.color, L * 0.35, H * 0.02, 0);
    add(L * 0.65, H * 0.3, W * 1.02, o.belly, 0, -H * 0.36, 0);
    add(L * 0.1, H * 0.45, W * 0.9, 0x120a18, L * 0.52, -H * 0.12, 0);       // 쩍 벌린 입
    for (let i = 0; i < 6; i++) for (const yy of [1, -1]) {
      add(L * 0.02, H * 0.12, L * 0.02, 0xf4f0e0, L * 0.56, yy * H * 0.06 - H * 0.12, (i - 2.5) * W * 0.15, 0, 0, yy > 0 ? Math.PI : 0); // 뾰족 이빨
    }
    add(L * 0.04, H * 0.04, L * 0.5, o.fin, L * 0.28, H * 0.65, 0, 0, Math.PI / 2, 0.9);  // 초롱대
    add(H * 0.22, H * 0.22, H * 0.22, o.pc, L * 0.62, H * 0.82, 0, 0, Math.PI / 4, Math.PI / 4); // 빛나는 초롱
    add(L * 0.14, H * 0.6, W * 0.14, o.fin, -L * 0.45, 0, 0);
    for (const s of [-1, 1]) {
      eyeSide(L * 0.4, H * 0.28, s * (W * 0.53 + 0.01), s, H * 0.16);
      add(L * 0.14, H * 0.3, 0.02, o.fin, L * 0.05, -H * 0.2, s * (W / 2 + 0.01), 0, 0, -0.5);
    }
  } else if (o.serpent) {
    // 오로라 리바이어던: 물결치는 긴 몸통 마디, 등에 빛나는 지느러미, 용 같은 머리
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const x = L * 0.4 - i * L * 0.085;
      const y = Math.sin(i * 0.8) * H * 0.7;
      const sh = 1 - i * 0.05;
      add(L * 0.1, H * sh, W * sh, o.color, x, y, 0);
      add(L * 0.09, H * 0.3 * sh, W * 1.02 * sh, o.belly, x, y - H * 0.35 * sh, 0);
      add(L * 0.05, H * 0.5 * sh, W * 0.1, i % 2 ? o.fin : o.pc, x, y + H * 0.7 * sh, 0, 0, 0, 0.3);
      if (i % 3 === 0) for (const s of [-1, 1]) add(L * 0.04, H * 0.12, 0.012, o.pc, x, y, s * (W * sh / 2 + 0.006));
    }
    add(L * 0.14, H * 1.1, W * 1.05, o.color, L * 0.5, 0, 0);               // 머리
    add(L * 0.12, H * 0.45, W * 0.8, o.color, L * 0.62, -H * 0.15, 0);       // 주둥이
    for (const s of [-1, 1]) {
      add(L * 0.12, H * 0.08, H * 0.08, o.pc, L * 0.42, H * 0.65, s * W * 0.3, 0, s * 0.4, 0.6); // 뿔
      eyeSide(L * 0.54, H * 0.18, s * (W * 0.53 + 0.01), s, H * 0.25);
      add(L * 0.25, H * 0.04, 0.02, o.fin, L * 0.66, -H * 0.3, s * W * 0.3, 0, s * 0.5, -0.2); // 수염
    }
    add(L * 0.16, H * 1.2, W * 0.2, o.fin, -L * 0.62, Math.sin(12 * 0.8) * H * 0.7, 0);        // 꼬리지느러미
  } else if (o.puffer) {
    // 별사탕 복어: 동글동글 네모 몸에 알록달록 가시가 송송
    add(L * 0.72, H, W, o.color, 0, 0, 0);
    add(L * 0.62, H * 0.86, W * 1.06, o.color, 0, 0, 0);
    add(L * 0.64, H * 1.06, W * 0.86, o.color, 0, 0, 0);
    add(L * 0.6, H * 0.3, W * 0.9, o.belly, 0, -H * 0.38, 0);
    add(L * 0.1, H * 0.4, W * 0.12, o.fin, -L * 0.42, 0, 0);
    add(L * 0.06, H * 0.12, W * 0.18, 0xd85a6a, L * 0.37, -H * 0.12, 0); // 뽀뽀하는 입
    for (const s of [-1, 1]) {
      eyeSide(L * 0.26, H * 0.16, s * (W * 0.53 + 0.01), s, H * 0.3);
      add(L * 0.1, H * 0.18, 0.02, o.fin, L * 0.05, -H * 0.05, s * (W * 0.53 + 0.01), 0, 0, -0.5);
    }
    let k = 0;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const x = -L * 0.26 + i * L * 0.12, sp = o.spikes[k++ % o.spikes.length];
      add(H * 0.12, H * 0.2, H * 0.12, sp, x, H * 0.56, (j - 1) * W * 0.3, 0, Math.PI / 4, 0);       // 위
      for (const s of [-1, 1]) add(H * 0.12, H * 0.12, H * 0.2, o.spikes[(k + j) % o.spikes.length], x, (j - 1) * H * 0.28, s * W * 0.58, Math.PI / 4, 0, 0); // 옆
    }
  } else if (o.jelly) {
    // 젤리피쉬: 반짝이는 말랑 지붕 + 살랑살랑 다리
    add(W, H * 0.42, W, o.color, 0, 0, 0);
    add(W * 0.82, H * 0.3, W * 0.82, o.color, 0, H * 0.32, 0);
    add(W * 0.5, H * 0.2, W * 0.5, o.belly, 0, H * 0.54, 0);
    add(W * 1.06, H * 0.08, W * 1.06, o.fin, 0, -H * 0.2, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = H * (0.8 + (i % 3) * 0.3);
      add(H * 0.06, len, H * 0.06, i % 2 ? o.fin : o.color, Math.cos(a) * W * 0.36, -H * 0.2 - len / 2, Math.sin(a) * W * 0.36, Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2);
    }
    for (const s of [-1, 1]) {
      add(W * 0.12, W * 0.14, 0.014, EYE, W * 0.505, H * 0.06, s * W * 0.16, 0, Math.PI / 2, 0);
      add(W * 0.05, W * 0.05, 0.01, SHINE, W * 0.512, H * 0.1, s * W * 0.14, 0, Math.PI / 2, 0);
      add(W * 0.12, W * 0.05, 0.01, 0xff6aa8, W * 0.505, -H * 0.06, s * W * 0.28, 0, Math.PI / 2, 0); // 볼터치
    }
  } else if (o.seahorse) {
    // 달빛 해마: 세로로 선 몸, 앞으로 내민 주둥이, 돌돌 말린 꼬리
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const y = H * 0.35 - i * H * 0.13;
      const x = Math.sin(i * 0.6) * L * 0.18;
      add(L * (0.62 - i * 0.05), H * 0.15, W, o.color, x, y, 0);
      add(L * 0.12, H * 0.13, W * 1.02, o.belly, x + L * (0.28 - i * 0.025), y, 0);
      add(L * 0.08, H * 0.04, W * 1.04, o.pc, x + L * 0.05, y - H * 0.06, 0); // 마디 줄
    }
    add(L * 0.5, H * 0.2, W * 0.95, o.color, L * 0.1, H * 0.5, 0);           // 머리
    add(L * 0.5, H * 0.08, W * 0.5, o.color, L * 0.5, H * 0.46, 0);          // 주둥이
    for (let k = 0; k < 3; k++) add(L * 0.08, H * 0.08, W * 0.3, o.pc, L * (0.0 + k * 0.08), H * (0.63 + (k % 2) * 0.04), 0); // 왕관 뿔
    for (let i = 0; i < 5; i++) {
      const a = i * 1.0;
      add(L * 0.16, H * 0.07, W * 0.8, o.color, -L * 0.05 + Math.cos(a) * L * 0.16, -H * 0.45 - Math.sin(a) * H * 0.06 - i * H * 0.02, 0, 0, 0, a);
    }
    add(L * 0.06, H * 0.3, W * 0.4, o.fin, -L * 0.28, H * 0.12, 0, 0, 0, 0.2);   // 등지느러미
    for (const s of [-1, 1]) eyeSide(L * 0.18, H * 0.54, s * (W * 0.48 + 0.008), s, H * 0.09);
  } else if (o.sunfish) {
    // 개복치: 동글넓적한 몸, 위아래로 긴 지느러미, 꼬리가 거의 없어요
    add(L * 0.72, H * 0.8, W, o.color, 0, 0, 0);
    add(L * 0.6, H * 0.18, W * 1.02, o.belly, L * 0.02, -H * 0.34, 0);
    add(L * 0.18, H * 0.55, W * 0.9, o.color, L * 0.42, 0, 0);
    add(L * 0.16, H * 0.62, W * 0.14, o.fin, -L * 0.16, H * 0.62, 0, 0, 0, 0.25);
    add(L * 0.16, H * 0.62, W * 0.14, o.fin, -L * 0.16, -H * 0.62, 0, 0, 0, -0.25);
    add(L * 0.12, H * 0.78, W * 0.5, o.fin, -L * 0.4, 0, 0);
    add(L * 0.06, H * 0.08, W * 0.5, 0x3a3a3a, L * 0.52, -H * 0.06, 0);
    for (const s of [-1, 1]) {
      add(L * 0.1, H * 0.12, 0.02, o.fin, L * 0.22, 0, s * (W / 2 + 0.01), 0, 0, -0.3);
      eyeSide(L * 0.42, H * 0.1, s * (W * 0.45 + 0.008), s, H * 0.13);
      add(L * 0.02, H * 0.4, 0.01, shade(o.color, 0.6), L * 0.33, 0, s * (W / 2 + 0.004)); // 아가미 선
      for (let i = 0; i < 8; i++) {
        const x = (-0.25 + ((i * 0.37) % 0.5)) * L;
        const y = (((i * 0.53) % 1) - 0.5) * H * 0.5;
        add(0.06, 0.05, 0.01, o.pc, x, y, s * (W / 2 + 0.005));
      }
    }
  } else if (o.flat) {
    // 광어: 납작하고 눈이 둘 다 위에 있어요
    add(L * 0.75, H, W, o.color, 0, 0, 0);
    add(L * 0.82, H * 0.35, W * 1.18, o.fin, 0, -H * 0.15, 0);
    add(L * 0.18, H * 0.9, W * 0.6, o.color, L * 0.43, 0, 0);
    add(L * 0.18, H * 0.35, W * 0.7, o.fin, -L * 0.48, 0, 0);
    add(L * 0.74, 0.01, W * 0.98, o.belly, 0, -H / 2 - 0.006, 0);
    eyeTop(L * 0.44, H / 2 + 0.008, W * 0.14, W * 0.13);
    eyeTop(L * 0.37, H / 2 + 0.008, -W * 0.06, W * 0.13);
    add(L * 0.02, 0.012, W * 0.5, shade(o.color, 0.6), L * 0.33, H / 2 + 0.004, 0); // 아가미 선
    add(0.012, H * 0.4, W * 0.3, shade(o.color, 0.5), L * 0.52, -H * 0.1, W * 0.05); // 입
    for (let i = 0; i < 14; i++) {
      const x = (-0.32 + ((i * 0.37) % 0.62)) * L;
      const z = (((i * 0.61) % 1) - 0.5) * W * 0.8;
      const sz = W * (0.06 + (i % 3) * 0.03);
      add(sz, 0.012, sz, i % 4 === 0 ? shade(o.color, 1.3) : o.pc, x, H / 2 + 0.004, z);
    }
    // 테두리 지느러미 줄무늬
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
      add(L * 0.015, H * 0.37, W * 0.09, shade(o.fin, 0.7), -L * 0.32 + i * L * 0.08, -H * 0.15, s * W * 0.545);
    }
  } else {
    add(L * 0.7, H, W, o.color, 0, 0, 0);                                 // 몸통
    add(L * 0.62, H * 0.3, W * 1.02, o.belly, L * 0.02, -H * 0.36, 0);    // 배
    if (o.bigHead) add(L * 0.28, H * 1.02, W * 1.0, o.color, L * 0.46, 0, 0); // 큰 머리
    else add(L * 0.24, H * 0.84, W * 0.92, o.color, L * 0.47, -H * 0.04, 0);   // 머리
    if (o.snout) add(L * 0.22, H * 0.25, W * 0.4, o.color, L * 0.68, -H * 0.12, 0);

    if (o.eel) {
      // 장어류: 몸이 길게 이어지고 꼬리가 작아요
      add(L * 0.2, H * 0.85, W * 0.8, o.color, -L * 0.42, 0, 0);
      add(L * 0.08, H * 0.9, W * 0.25, o.fin, -L * 0.55, 0, 0);
      add(L * 0.6, H * 0.12, W * 0.1, o.fin, -L * 0.1, -H * 0.55, 0);   // 뒷지느러미
    } else if (o.tuna) {
      // 참치: 초승달 꼬리 + 노란 토막 지느러미
      add(L * 0.12, H * 0.32, W * 0.5, o.color, -L * 0.41, 0, 0);
      add(L * 0.22, H * 0.12, W * 0.12, o.fin, -L * 0.53, H * 0.32, 0, 0, 0, 0.85);
      add(L * 0.22, H * 0.12, W * 0.12, o.fin, -L * 0.53, -H * 0.32, 0, 0, 0, -0.85);
      for (let i = 0; i < 6; i++) {
        const x = -L * 0.18 - i * L * 0.04;
        add(L * 0.025, H * 0.1, W * 0.08, o.pc, x, H * 0.47 - i * H * 0.03, 0);
        add(L * 0.025, H * 0.1, W * 0.08, o.pc, x, -H * 0.47 + i * H * 0.03, 0);
      }
      add(L * 0.12, H * 0.28, W * 0.1, o.pc, -L * 0.08, -H * 0.55, 0, 0, 0, 0.5); // 노란 뒷지느러미
      add(L * 0.14, H * 0.3, W * 0.1, o.fin, -L * 0.02, H * 0.62, 0, 0, 0, 0.4); // 두 번째 등지느러미
    } else {
      add(L * 0.12, H * 0.42, W * 0.6, o.color, -L * 0.41, 0, 0);
      if (o.hetero) {
        add(L * 0.2, H * 0.25, W * 0.15, o.fin, -L * 0.55, H * 0.22, 0, 0, 0, 0.5);
        add(L * 0.1, H * 0.2, W * 0.15, o.fin, -L * 0.51, -H * 0.15, 0, 0, 0, -0.4);
      } else {
        add(L * 0.12, H * 1.1, W * 0.14, o.fin, -L * 0.52, 0, 0);
      }
    }
    // 등지느러미
    if (o.longDorsal) add(L * 0.75, H * 0.18, W * 0.12, o.fin, -L * 0.02, H * 0.58, 0);
    else {
      const dh = o.tallDorsal ? 0.5 : o.tuna ? 0.45 : 0.32;
      add(L * 0.28, H * dh, W * 0.12, o.fin, L * (o.tuna ? 0.12 : -0.02), H * 0.5 + H * dh / 2, 0);
    }
    for (const s of [-1, 1]) {
      // 가슴지느러미 (참치는 길어요)
      if (o.tuna) add(L * 0.3, H * 0.1, 0.03, o.fin, L * 0.12, -H * 0.05, s * (W / 2 + 0.02), 0, 0, -0.3);
      else add(L * 0.12, H * 0.2, 0.02, o.fin, L * 0.25, -H * 0.25, s * (W / 2 + 0.01), 0, 0, -0.4);
      // 눈 (머리 크기에 맞춰 크게)
      const hw = o.bigHead ? W : W * 0.92;
      const e = Math.max(0.045, Math.min(H * 0.3, L * 0.085));
      eyeSide(L * 0.51, H * 0.12, s * (hw / 2 + 0.007), s, e);
      // 아가미 뚜껑 선 + 입꼬리
      add(L * 0.022, H * 0.78, 0.01, shade(o.color, 0.55), L * 0.355, -H * 0.03, s * (hw / 2 + 0.004));
      add(L * 0.08, H * 0.035, 0.01, shade(o.color, 0.45), L * 0.55, -H * 0.17, s * (hw / 2 + 0.004));
      // 옆줄 (몸 옆을 따라 가는 가는 선)
      if (!o.eel) add(L * 0.62, H * 0.03, 0.01, shade(o.color, 1.35), -L * 0.03, H * 0.06, s * (W / 2 + 0.006));
      // 비늘 무늬 (매끈한 물고기는 빼요)
      if (!o.smooth && !o.eel && !o.tuna) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
          const x = -L * 0.3 + c * L * 0.105 + (r % 2) * L * 0.052;
          const y = (r - 1) * H * 0.24 + H * 0.06;
          add(L * 0.06, H * 0.15, 0.01, shade(o.color, (r + c) % 2 ? 1.16 : 0.86), x, y, s * (W / 2 + 0.003));
        }
      }
      if (o.gill) add(H * 0.22, H * 0.26, 0.01, 0x1f2a50, L * 0.37, H * 0.05, s * (W / 2 + 0.007));
      if (o.blush) add(L * 0.5, H * 0.14, 0.01, o.blush, 0, 0, s * (W / 2 + 0.005));
    }
    // 등은 진하게 (물고기는 위에서 보면 어둡고 아래는 밝아요)
    add(L * 0.68, H * 0.16, W * 1.015, shade(o.color, 0.7), 0, H * 0.43, 0);
    // 입술
    add(0.012, H * 0.14, W * 0.5, shade(o.color, 0.5), L * (o.bigHead ? 0.6 : 0.59), -H * 0.12, 0);
    // 꼬리지느러미 줄 (보통 꼬리일 때)
    if (!o.eel && !o.tuna && !o.hetero) {
      for (let k = 0; k < 4; k++) add(L * 0.11, H * 0.03, W * 0.16, shade(o.fin, 0.65), -L * 0.52, (k - 1.5) * H * 0.27, 0);
    }
    if (o.bigMouth) add(L * 0.06, H * 0.12, W * 0.8, 0x2a2a2a, L * 0.59, -H * 0.12, 0);
    if (o.whiskers) {
      for (const s of [-1, 1]) {
        const len = L * (o.longWhisk ? 0.3 : 0.12);
        add(len, 0.015, 0.015, o.fin, L * 0.6 + len * 0.3, -H * 0.2, s * W * 0.32, 0, s * 0.6, -0.3);
      }
    }
    // 무늬
    if (o.pattern === 'stripes') {
      for (let i = 0; i < 5; i++) add(L * 0.04, H * 1.02, W * 1.03, o.pc, -L * 0.25 + i * L * 0.12, 0, 0);
    } else if (o.pattern === 'band') {
      add(L * 0.7, H * 0.12, W * 1.03, o.pc, 0, 0, 0);
    } else if (o.pattern === 'spots' || o.pattern === 'blotch') {
      const sz = o.pattern === 'blotch' ? H * 0.32 : H * 0.16; // 몸 크기에 맞춰서
      for (let i = 0; i < 12; i++) {
        const x = (-0.3 + ((i * 0.37) % 0.6)) * L;
        const y = (((i * 0.53) % 1) - 0.5) * H * 0.6;
        const s = i % 2 ? 1 : -1;
        add(sz, sz * 0.8, 0.01, o.pc, x, y, s * (W / 2 + 0.005));
      }
    } else if (o.pattern === 'scales') {
      // 피라루쿠: 몸 뒤쪽 비늘이 빨갛게 물들어요
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (const s of [-1, 1]) {
        add(L * 0.06, H * 0.22, 0.01, o.pc, -L * 0.1 - i * L * 0.07, (j - 1) * H * 0.26, s * (W / 2 + 0.005));
      }
    } else if (o.pattern === 'scutes') {
      for (let i = 0; i < 7; i++) {
        const x = -L * 0.32 + i * L * 0.1;
        add(0.06, 0.05, 0.06, o.pc, x, H / 2 + 0.02, 0);
        for (const s of [-1, 1]) add(0.05, 0.05, 0.02, o.pc, x, 0, s * (W / 2 + 0.01));
      }
    }
    if (o.tuna) {
      // 참치 옆구리의 반짝이는 선
      for (const s of [-1, 1]) add(L * 0.6, H * 0.06, 0.01, 0x8ab0d0, 0, -H * 0.12, s * (W / 2 + 0.006));
    }
    if (o.candy) {
      // 막대 사탕 줄무늬: 하얀 몸에 빨간 사선 줄, 그 옆에 가는 초록 줄
      for (let i = 0; i < 6; i++) {
        const x = -L * 0.3 + i * L * 0.12;
        add(L * 0.045, H * 1.12, W * 1.05, o.pc, x, 0, 0, 0, 0, 0.55);
        add(L * 0.015, H * 1.1, W * 1.06, o.pc2, x + L * 0.04, 0, 0, 0, 0, 0.55);
      }
      // 머리에도 빨간 띠 하나, 꼬리지느러미는 빨강·하양 줄
      add(L * 0.04, H * 0.9, W * 0.96, o.pc, L * 0.46, -H * 0.03, 0, 0, 0, 0.55);
      for (let k = 0; k < 3; k++) add(L * 0.115, H * 0.12, W * 0.17, 0xfbf6f0, -L * 0.52, (k - 1) * H * 0.36, 0);
    }
    if (o.crystals) {
      // 수정 비늘: 등과 옆구리에 빛나는 수정이 솟아 있어요
      for (let i = 0; i < 7; i++) {
        const x = -L * 0.3 + i * L * 0.1, hh = H * (0.4 + (i % 3) * 0.15);
        add(H * 0.14, hh, H * 0.14, o.crystals, x, H * 0.5 + hh / 2, ((i % 3) - 1) * W * 0.2, 0, i, 0.2);
      }
    }
    if (o.rainbow) {
      // 무지개 붕어: 몸을 빨주노초파남보 세로 띠로
      const rb = [0xff5a5a, 0xffa23a, 0xffe23a, 0x6ad86a, 0x5ab4ff, 0x6a6aff, 0xb46aff];
      rb.forEach((c, i) => add(L * 0.09, H * 1.02, W * 1.03, c, -L * 0.33 + i * L * 0.1, 0, 0));
      add(L * 0.12, H * 1.1, W * 0.15, 0xff8ad8, -L * 0.52, 0, 0);
    }
    if (o.puffs) {
      // 솜사탕·구름: 몸 여기저기에 몽글몽글 솜 덩어리
      for (let i = 0; i < 12; i++) {
        const sz = H * (0.35 + (i % 3) * 0.12);
        const x = -L * 0.32 + (i % 6) * L * 0.12;
        const top = i < 6;
        add(sz, sz, sz, o.puffs[i % o.puffs.length], x, top ? H * 0.5 : (i % 2 ? 1 : -1) * 0, top ? ((i % 3) - 1) * W * 0.25 : (i % 2 ? 1 : -1) * W * 0.55, 0.3 * i, 0.5 * i, 0);
      }
    }
    if (o.lava) {
      // 용암 메기: 까만 바위 몸에 빛나는 주황 금
      for (const s of [-1, 1]) {
        for (let i = 0; i < 10; i++) {
          const x = -L * 0.34 + i * L * 0.07;
          add(L * 0.08, H * 0.05, 0.01, o.lava, x, ((i * 7) % 5 - 2) * H * 0.09, s * (W / 2 + 0.007), 0, 0, i % 2 ? -0.8 : 0.6);
        }
      }
      for (let i = 0; i < 6; i++) add(H * 0.14, 0.012, H * 0.14, 0xffb02a, -L * 0.3 + i * L * 0.11, H / 2 + 0.006, ((i % 3) - 1) * W * 0.25);
    }
    if (o.crown) {
      // 황금 왕관
      const cx = L * 0.47, cy = H * 0.5, cw = W * 0.9;
      add(L * 0.22, H * 0.12, cw, 0xffd84a, cx, cy, 0);
      for (let i = 0; i < 4; i++) {
        const zz = (i - 1.5) * cw * 0.3;
        add(L * 0.05, H * 0.24, H * 0.08, 0xffd84a, cx, cy + H * 0.16, zz);
        add(H * 0.1, H * 0.1, H * 0.1, i % 2 ? 0xff3a5a : 0x3ac8ff, cx, cy + H * 0.32, zz, 0, Math.PI / 4, Math.PI / 4);
      }
      for (const s of [-1, 1]) add(H * 0.09, H * 0.09, 0.01, 0x3aff8a, cx, cy, s * (cw / 2 + 0.006));
    }
    if (o.metal) {
      // 헤비메탈 머리: 뒤로 뻗친 삐죽삐죽 검은 머리카락 + 보라색 끝
      // 머리 위에서 사방으로 뻗친 큰 갈기 (록스타처럼!)
      const hairX = L * 0.44;
      for (let k = 0; k < 11; k++) {
        const len = H * (2.4 + (k % 3) * 0.9);
        const ang = 0.15 + k * 0.13;                 // 앞쪽은 서 있고, 뒤로 갈수록 눕혀요
        const zz = ((k % 3) - 1) * W * 0.35;
        const bx = hairX - k * L * 0.022, by = H * 0.4;
        const cx = bx - Math.sin(ang) * len * 0.5, cy = by + Math.cos(ang) * len * 0.5;
        add(H * 0.3, len, H * 0.3, 0x0c0c10, cx, cy, zz, 0, 0, ang);
        add(H * 0.34, H * 0.36, H * 0.34, k % 2 ? 0x7a3cff : 0xb46cff,
          bx - Math.sin(ang) * len, by + Math.cos(ang) * len, zz, 0, 0, ang);
      }
      // 번개 무늬 (빛나는 노란 지그재그)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          const x = -L * 0.36 + i * L * 0.075;
          add(L * 0.09, H * 0.14, 0.01, o.pc, x, (i % 2 ? 0.14 : -0.14) * H, s * (W / 2 + 0.007), 0, 0, i % 2 ? -0.7 : 0.7);
        }
      }
      // 징 박힌 등 (은색 뾰족이)
      for (let i = 0; i < 7; i++) {
        add(H * 0.26, H * 0.26, H * 0.26, 0xd8d8e0, -L * 0.34 + i * L * 0.1, H * 0.7, 0, 0, Math.PI / 4, Math.PI / 4);
      }
      // 징 박힌 목걸이
      for (const s of [-1, 1]) add(L * 0.03, H * 0.9, 0.012, 0x2a2a2a, L * 0.33, 0, s * (W / 2 + 0.01));
      // 메롱 내민 혀
      add(L * 0.05, H * 0.12, W * 0.35, 0xff5a8a, L * 0.62, -H * 0.36, 0, 0, 0, -0.5);
    }
  }
  // 얼음 이로치: 등 위에 뾰족한 얼음 결정 몇 개 + 배 아래 고드름
  if (iced) {
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 + (k % 2) * 0.025, 0), ICE_CRYSTAL);
      c.scale.y = 2.4;
      c.position.set(-L * 0.3 + k * L * 0.18, H * 0.55 + 0.04, (k % 2 ? 1 : -1) * W * 0.15);
      c.rotation.z = (k % 2 ? 0.3 : -0.3);
      g.add(c);
    }
    for (let k = 0; k < 3; k++) {
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), ICE_CRYSTAL);
      ic.rotation.x = Math.PI;
      ic.position.set(-L * 0.15 + k * L * 0.15, -H * 0.5 - 0.05, 0);
      g.add(ic);
    }
  }
  g.scale.setScalar(fishScale(f, weight));
  g.userData.dynamic = true; // 물고기는 움직여요 (최적화에서 빼요)
  if (muts.length) addFishFx(g, muts, L, H, W);
  return g;
}

// 화면에 보이는 크기: 기본 크기 x (무게가 무거울수록 0.85 ~ 1.3배)
export function fishScale(f, weight) {
  const base = f.look.size ?? 1;
  if (weight === undefined) return base;
  const k = Math.min(1, Math.max(0, (weight - f.w[0]) / (f.w[1] - f.w[0])));
  return base * (0.85 + 0.45 * k);
}


// =====================================================
//  이로치 이펙트 (은은하게): 만든 물고기 모형을 기억해 두고, 매 장면 updateFishFx 로 움직여요
//   글리치 = 블록이 지직지직 튀고 깜빡 · 골드/다이아/화이트/얼음 = 반짝이 · 방사능 = 초록 맥박
//   다크 = 보랏빛 알갱이가 맴돌기 · 핏빛 = 가끔 붉은 방울 · 알비노 = 은은한 빛
// =====================================================
const FX = new Set();
const SPARK_GEO = new THREE.OctahedronGeometry(0.035, 0);
const fxMat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
const SPARK = { 골드: fxMat(0xfff2a0), 다이아: fxMat(0xe8fdff), 화이트: fxMat(0xffffff), 얼음: fxMat(0xcff4ff), 다크: fxMat(0x6a3aa8, 0.8), 핏빛: fxMat(0xc8101a, 0.9) };
function addFishFx(g, muts, L, H, W) {
  const names = muts.map((m) => m.name);
  const pieces = [];
  g.traverse((o) => { if (o.isMesh && o.userData.mut) { o.userData.base0 = o.position.clone(); pieces.push(o); } });
  const fx = { names, pieces, L, H, W, parts: [], glitchUntil: 0, seen: false };
  // 반짝이 / 알갱이 / 방울 조각 미리 만들기 (작은 것 몇 개만)
  for (const n of names) {
    const count = n === '다크' ? 5 : n === '핏빛' ? 2 : SPARK[n] ? 3 : 0;
    for (let k = 0; k < count; k++) {
      const p = new THREE.Mesh(SPARK_GEO, SPARK[n]);
      p.visible = false;
      p.userData = { kind: n, ph: Math.random() * 10, t0: 0 };
      g.add(p);
      fx.parts.push(p);
    }
  }
  g.userData.fx = fx;
  FX.add(g);
}
export function updateFishFx(t) {
  for (const g of FX) {
    const fx = g.userData.fx;
    if (!fx) { FX.delete(g); continue; } // 이펙트 정보가 없어졌으면 그냥 빼요 (게임이 멈추지 않게)
    if (!g.parent) { if (fx.seen) FX.delete(g); continue; } // 화면에서 사라진 물고기는 잊어요
    fx.seen = true;
    const { names, pieces, L, H, W } = fx;
    // 글리치: 가끔 몇 블록이 옆으로 튀고/사라졌다가 금방 돌아와요
    if (names.includes('글리치')) {
      if (t > fx.glitchUntil) {
        for (const p of pieces) { p.position.copy(p.userData.base0); p.visible = true; }
        g.userData.gx = 0;
        if (Math.random() < 0.06) {
          fx.glitchUntil = t + 0.05 + Math.random() * 0.09;
          const n = 1 + Math.floor(Math.random() * 4);
          for (let k = 0; k < n; k++) {
            const p = pieces[Math.floor(Math.random() * pieces.length)];
            if (!p || p.userData.mut !== '글리치') continue;
            if (Math.random() < 0.3) p.visible = false;
            else p.position.x += (Math.random() - 0.5) * L * 0.25, p.position.y += (Math.random() - 0.5) * H * 0.3;
          }
        }
      }
    }
    // 방사능: 초록 빛이 숨 쉬듯 / 알비노: 아주 은은하게
    if (names.includes('방사능') || names.includes('알비노')) {
      const k = 0.55 + Math.sin(t * 4) * 0.4;
      for (const p of pieces) {
        if (p.userData.mut === '방사능') p.material.emissiveIntensity = 0.5 + k * 0.8;
        else if (p.userData.mut === '알비노') p.material.emissiveIntensity = 0.06 + k * 0.08;
      }
      for (const p of pieces) if (p.userData.mut === '알비노' && p.material.emissive.getHex() === 0) p.material.emissive.set(0xffd8e0);
    }
    // 반짝이 · 알갱이 · 방울
    for (const p of fx.parts) {
      const u = p.userData;
      if (u.kind === '다크') { // 몸 주위를 천천히 맴도는 보랏빛 알갱이
        const a = t * 0.9 + u.ph;
        p.visible = true;
        p.position.set(Math.cos(a) * L * 0.55, Math.sin(t * 1.3 + u.ph) * H * 0.5, Math.sin(a) * (W + 0.15));
        p.scale.setScalar(0.7 + Math.sin(t * 3 + u.ph) * 0.3);
        continue;
      }
      if (u.kind === '핏빛') { // 가끔 아래로 똑 떨어지는 방울
        const q = ((t * 0.35 + u.ph) % 1);
        p.visible = q < 0.35;
        p.position.set((u.ph % 1 - 0.5) * L * 0.6, -H * 0.4 - q * 0.9, 0);
        p.scale.set(0.6, 1.0, 0.6);
        continue;
      }
      // 반짝이: 몸 여기저기에서 생겼다가 사라져요
      const q = ((t * 0.7 + u.ph) % 1);
      if (q < 0.02 || !u.set) { u.set = true; p.position.set((Math.random() - 0.5) * L, (Math.random() - 0.3) * H, (Math.random() - 0.5) * (W + 0.1)); }
      p.visible = q < 0.4;
      const s = Math.sin((q / 0.4) * Math.PI);
      p.scale.setScalar(Math.max(0.01, s));
      p.rotation.set(t * 3, t * 2, 0);
    }
  }
}
