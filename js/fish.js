// =====================================================
//  물고기 데이터 + 물고기 3D 모양 만들기
// =====================================================
import * as THREE from 'three';
import { buildRubyFishBody } from './rubyfish.js';

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

  // =========== 계절마다 큰 호수에 나타나는 물고기들 (season: 봄 spring · 여름 summer · 가을 autumn · 겨울 winter) ===========
  { name: '벚꽃 각시붕어', season: 'spring', rarity: 'common', w: [0.05, 0.4], perKg: 160,
    look: { L: 0.6, h: 0.3, w: 0.12, color: 0xffd0e0, belly: 0xfff4f8, fin: 0xff9ab8, pattern: 'band', pc: 0xff8ab0, blush: 0xff7aa8, smooth: true, size: 0.9 } },
  { name: '벚꽃 송어', season: 'spring', rarity: 'uncommon', w: [0.5, 5], perKg: 48,
    look: { L: 1.0, h: 0.27, w: 0.14, color: 0xf0c0d0, belly: 0xfff4f6, fin: 0xff9ab8, pattern: 'spots', pc: 0xff6a9a, blush: 0xff8ab0, iris: 0xffe8f0, size: 1.2 } },
  { name: '꽃잎 잉어', season: 'spring', rarity: 'rare', w: [2, 12], perKg: 70,
    look: { L: 1.2, h: 0.36, w: 0.22, color: 0xfff6f8, belly: 0xffffff, fin: 0xffb8d0, pattern: 'spots', pc: 0xff6a9a, whiskers: true, tallDorsal: true, puffs: [0xffc8dc, 0xffe0ea, 0xff9ab8], glow: [0xffc8dc], size: 1.6 } },
  { name: '봄의 정령 물고기', season: 'spring', rarity: 'legendary', w: [1, 6], perKg: 900,
    look: { L: 1.1, h: 0.4, w: 0.18, color: 0xe8fff0, belly: 0xffffff, fin: 0xffb8e0, blush: 0xff9ad0, smooth: true, ghost: 0.7, crown: true, iris: 0xffffff, glow: [0xffb8e0, 0xb8ffd0], size: 1.8 } },
  { name: '여름 은어', season: 'summer', rarity: 'common', w: [0.05, 0.3], perKg: 220,
    look: { L: 0.7, h: 0.18, w: 0.1, color: 0xc8d8a8, belly: 0xf8f8e8, fin: 0xf0d050, pattern: 'band', pc: 0xf0c040, size: 0.85 } },
  { name: '수박 복어', season: 'summer', rarity: 'uncommon', w: [0.3, 2], perKg: 90,
    look: { L: 0.6, h: 0.5, w: 0.5, color: 0x3a9a3a, belly: 0xff5a6a, fin: 0x2a7a2a, pattern: 'stripes', pc: 0x1a5a1a, smooth: true, iris: 0x1a1a1a, size: 1.1 } },
  { name: '반딧불 메기', season: 'summer', rarity: 'rare', w: [3, 18], perKg: 55,
    look: { L: 1.3, h: 0.26, w: 0.26, color: 0x1e2a1e, belly: 0x2e3a2a, fin: 0x141c14, whiskers: true, longWhisk: true, smooth: true, pattern: 'spots', pc: 0xd8ff6a, lava: 0xd8ff6a, iris: 0xd8ff6a, glow: [0xd8ff6a], size: 1.6 } },
  { name: '한여름 태양어', season: 'summer', rarity: 'legendary', w: [5, 30], perKg: 260,
    look: { L: 1.3, h: 0.44, w: 0.24, color: 0xffb02a, belly: 0xfff0a0, fin: 0xff6a1a, tallDorsal: true, crown: true, iris: 0xffffff, lava: 0xff6a1a, glow: [0xffd84a, 0xff8a2a], size: 2.6 } },
  { name: '단풍 붕어', season: 'autumn', rarity: 'common', w: [0.1, 1.5], perKg: 70,
    look: { L: 0.75, h: 0.34, w: 0.14, color: 0xd8642a, belly: 0xf8c890, fin: 0xc83a2a, iris: 0xffe0a0, pattern: 'spots', pc: 0xf0b030, size: 0.95 } },
  { name: '은행잎 금붕어', season: 'autumn', rarity: 'uncommon', w: [0.1, 0.8], perKg: 160,
    look: { L: 0.7, h: 0.34, w: 0.16, color: 0xf8c830, belly: 0xfff0b0, fin: 0xf0a020, tallDorsal: true, smooth: true, iris: 0x2a1a0a, size: 1.0 } },
  { name: '보름달 잉어', season: 'autumn', rarity: 'rare', w: [2, 14], perKg: 72,
    look: { L: 1.2, h: 0.4, w: 0.22, color: 0xfff4c8, belly: 0xffffff, fin: 0xf0d890, whiskers: true, pattern: 'spots', pc: 0xf0c040, iris: 0xfff0a0, glow: [0xfff0b0], ghost: 0.9, size: 1.6 } },
  { name: '추수 황금 잉어', season: 'autumn', rarity: 'legendary', w: [4, 25], perKg: 240,
    look: { L: 1.3, h: 0.44, w: 0.24, color: 0xe0a020, belly: 0xffe08a, fin: 0xc8502a, whiskers: true, crown: true, iris: 0xffffff, glow: [0xffd84a, 0xff8a3a], size: 2.6 } },
  { name: '눈꽃 빙어', season: 'winter', rarity: 'common', w: [0.005, 0.04], perKg: 1200,
    look: { L: 0.55, h: 0.1, w: 0.07, color: 0xe8f4fa, belly: 0xffffff, fin: 0xd0e8f4, pattern: 'band', pc: 0xa8d8f0, iris: 0x5ab0e0, size: 0.7 } },
  { name: '얼음 송어', season: 'winter', rarity: 'uncommon', w: [0.5, 5], perKg: 50,
    look: { L: 1.0, h: 0.27, w: 0.14, color: 0xb8d8e8, belly: 0xf4fbff, fin: 0x8ac0e0, pattern: 'spots', pc: 0xffffff, crystals: 0xd8f6ff, iris: 0xd8f6ff, size: 1.2 } },
  { name: '설원 연어', season: 'winter', rarity: 'rare', w: [3, 16], perKg: 64,
    look: { L: 1.3, h: 0.32, w: 0.18, color: 0xe8eef4, belly: 0xffffff, fin: 0xc0d0e0, blush: 0xff9aa8, pattern: 'spots', pc: 0xa8b8c8, iris: 0x8ad0ff, glow: [0xd8f0ff], size: 1.7 } },
  { name: '오로라 철갑상어', season: 'winter', rarity: 'legendary', w: [20, 120], perKg: 60,
    look: { L: 2.0, h: 0.36, w: 0.3, color: 0x3a4a6a, belly: 0xd8e8f4, fin: 0x5ad0c0, whiskers: true, crystals: 0xb8f0ff, pattern: 'spots', pc: 0x8affe8, iris: 0xffffff, glow: [0x8affe8, 0xb48cff], size: 3.6 } },

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
  // 고대 정글 용: 땅딸막한 몸에 이끼 낀 돌 갑옷, 나뭇잎 등가시, 짧은 다리 4개, 악어 턱, 나뭇가지 뿔 (오로라 리바이어던과 완전히 다르게)
  { name: '고대 정글 용', zone: 'jungle', rarity: 'mythic', w: [500, 1500], perKg: 800, huge: true,
    look: { dragon: true, L: 2.2, h: 0.5, w: 0.5, color: 0x2f5a2a, belly: 0xc8b878, fin: 0xffc83a, pc: 0x6affb0, iris: 0x6affb0, glow: [0x6affb0], size: 5.6 } }
);

// =========== 루비 섬 (zone: 'ruby') — 최후반 콘텐츠! 루비 공방 낚싯대로만 낚여요. 정글보다 훨씬 비싸요 ===========
//  다른 곳 물고기를 색만 바꾼 게 아니라, 루비 섬에만 사는 새 생김새의 생물들이에요 (모양은 rubyfish.js 의 rk)
//  루비 신전의 봉인: '홍염 날개어' [다크] 2마리 / '홍옥 바다용' [핏빛] 2마리를 바쳐야 풀려요 (ruby.js)
FISH.push(
  // ---- 흔함 ----
  { name: '홍옥 원석어', zone: 'ruby', rarity: 'common', w: [0.2, 1.2], perKg: 60000,
    look: { rk: 'facet', L: 0.8, h: 0.42, w: 0.24, color: 0xc8203a, belly: 0xff8a9a, fin: 0x8a0a1a, pc: 0xff9aa8, gem: 0xff3a5a, iris: 0xffe0e6, glow: [0xff3a5a], size: 1.0 } },
  { name: '불씨 초롱어', zone: 'ruby', rarity: 'common', w: [0.3, 1.5], perKg: 50000,
    look: { rk: 'lantern', L: 0.7, h: 0.5, w: 0.5, color: 0xe85a3a, belly: 0xffd0b0, fin: 0xb8202a, pc: 0x8a1a14, gem: 0xffb02a, glow: [0xffb02a], size: 0.95 } },
  { name: '석류 구슬어', zone: 'ruby', rarity: 'common', w: [0.1, 0.8], perKg: 90000,
    look: { rk: 'orb', L: 0.9, h: 0.3, w: 0.3, color: 0xa8102a, belly: 0xffc0c8, fin: 0xff6a7a, pc: 0xd8304a, gem: 0xffd0d8, glow: [0xffd0d8], size: 0.9 } },
  { name: '루비 칼날치', zone: 'ruby', rarity: 'common', w: [0.2, 1.0], perKg: 80000,
    look: { rk: 'blade', L: 1.0, h: 0.2, w: 0.07, color: 0xd8d0d4, belly: 0xf4eef0, fin: 0xa8182a, pc: 0xffffff, gem: 0xff2a4a, glow: [0xff2a4a], size: 1.0 } },
  { name: '진홍 꽃잎어', zone: 'ruby', rarity: 'common', w: [0.3, 2.0], perKg: 55000,
    look: { rk: 'flower', L: 0.75, h: 0.42, w: 0.3, color: 0xe84a6a, belly: 0xffe0e8, fin: 0xff9ab8, pc: 0xd8203a, gem: 0xffe23a, glow: [0xffe23a], size: 1.0 } },
  { name: '홍옥 소라고기', zone: 'ruby', rarity: 'common', w: [0.2, 1.0], perKg: 85000,
    look: { rk: 'shell', L: 0.75, h: 0.5, w: 0.36, color: 0xc84a4a, belly: 0xf4c8b8, fin: 0xff8a7a, pc: 0xe88a6a, gem: 0xff3a5a, glow: [0xff3a5a], size: 0.9 } },
  { name: '핏빛 리본어', zone: 'ruby', rarity: 'common', w: [0.1, 0.6], perKg: 120000,
    look: { rk: 'ribbon', L: 1.1, h: 0.16, w: 0.08, color: 0x8a0a1a, belly: 0xffb0b8, fin: 0xff3a4a, pc: 0xffd84a, gem: 0xff6a8a, glow: [0xff6a8a], size: 1.0 } },
  // ---- 희귀 ----
  { name: '홍염 초롱어', zone: 'ruby', rarity: 'uncommon', w: [2, 8], perKg: 38000,
    look: { rk: 'lantern', L: 0.7, h: 0.5, w: 0.5, color: 0xb81a2a, belly: 0xffc0a0, fin: 0xff6a2a, pc: 0xffd84a, gem: 0xff6a1a, glow: [0xff6a1a], size: 1.6 } },
  { name: '석류석 원석어', zone: 'ruby', rarity: 'uncommon', w: [2, 9], perKg: 40000,
    look: { rk: 'facet', L: 0.8, h: 0.42, w: 0.24, color: 0x6a0a1a, belly: 0xc8304a, fin: 0x3a0610, pc: 0xd8506a, gem: 0xff2a4a, iris: 0xffd84a, glow: [0xff2a4a], size: 1.7 } },
  { name: '보석눈 망치어', zone: 'ruby', rarity: 'uncommon', w: [3, 14], perKg: 30000,
    look: { rk: 'hammer', L: 1.2, h: 0.3, w: 0.26, color: 0x7a3a44, belly: 0xf0d8d8, fin: 0x5a2030, pc: 0xd8a0a8, gem: 0xff2a4a, glow: [0xff2a4a], size: 1.9 } },
  { name: '진홍 보석오징어', zone: 'ruby', rarity: 'uncommon', w: [1, 6], perKg: 60000,
    look: { rk: 'squid', L: 1.0, h: 0.34, w: 0.34, color: 0xd8304a, belly: 0xffd0d8, fin: 0xff7a8a, pc: 0xb81a30, gem: 0xffe23a, glow: [0xffe23a], size: 1.5 } },
  { name: '홍옥 등딱지어', zone: 'ruby', rarity: 'uncommon', w: [4, 15], perKg: 28000,
    look: { rk: 'turtle', L: 0.9, h: 0.36, w: 0.6, color: 0x8a2a2a, belly: 0xe8c8a8, fin: 0x6a3a2a, pc: 0xb84a3a, gem: 0xff3a5a, glow: [0xff3a5a], size: 1.6 } },
  { name: '붉은 왕관 소라고기', zone: 'ruby', rarity: 'uncommon', w: [1, 5], perKg: 70000,
    look: { rk: 'shell', L: 0.75, h: 0.5, w: 0.36, color: 0x8a1020, belly: 0xffd0c0, fin: 0xffb03a, pc: 0xffd84a, gem: 0xffe23a, glow: [0xffe23a], size: 1.5 } },
  // ---- 매우 희귀 ----
  { name: '루비 바위갑옷어', zone: 'ruby', rarity: 'rare', w: [20, 90], perKg: 20000,
    look: { rk: 'golem', L: 1.1, h: 0.6, w: 0.55, color: 0x4a2a2a, belly: 0x6a3a36, fin: 0x3a2020, pc: 0x5a3430, gem: 0xff3a2a, glow: [0xff3a2a], size: 3.0 } },
  { name: '홍옥 칼날왕', zone: 'ruby', rarity: 'rare', w: [15, 60], perKg: 18000,
    look: { rk: 'blade', L: 1.0, h: 0.2, w: 0.07, color: 0xb8182a, belly: 0xffd0d8, fin: 0xffd84a, pc: 0xffe8a0, gem: 0xffd84a, glow: [0xffd84a], size: 3.4 } },
  { name: '진홍 리본왕', zone: 'ruby', rarity: 'rare', w: [10, 40], perKg: 22000,
    look: { rk: 'ribbon', L: 1.1, h: 0.16, w: 0.08, color: 0x5a0a1a, belly: 0xff8a9a, fin: 0xffd84a, pc: 0xff3a5a, gem: 0xffe23a, glow: [0xffe23a], size: 3.6 } },
  { name: '거대 석류 오징어', zone: 'ruby', rarity: 'rare', w: [30, 120], perKg: 15000,
    look: { rk: 'squid', L: 1.0, h: 0.34, w: 0.34, color: 0x6a0a1a, belly: 0xff9aa8, fin: 0xd8203a, pc: 0x8a1a2a, gem: 0xff4a6a, glow: [0xff4a6a], size: 3.6 } },
  { name: '보석꽃 여왕어', zone: 'ruby', rarity: 'rare', w: [8, 30], perKg: 26000,
    look: { rk: 'flower', L: 0.75, h: 0.42, w: 0.3, color: 0xffd0e0, belly: 0xffffff, fin: 0xff3a6a, pc: 0xffd84a, gem: 0xff2a4a, glow: [0xff2a4a], size: 2.6 } },
  // ---- 전설 ----
  { name: '홍염 날개어', zone: 'ruby', rarity: 'legendary', w: [150, 600], perKg: 9000,
    look: { rk: 'phoenix', L: 1.0, h: 0.42, w: 0.36, color: 0xc8202a, belly: 0xffd8a0, fin: 0xff3a1a, pc: 0xff8a2a, gem: 0xffd84a, iris: 0xffe23a, glow: [0xffd84a, 0xff8a2a], size: 4.6 } },
  { name: '루비 심장 수호어', zone: 'ruby', rarity: 'legendary', w: [80, 300], perKg: 12000,
    look: { rk: 'golem', L: 1.1, h: 0.6, w: 0.55, color: 0x2a1a1e, belly: 0x5a2a30, fin: 0xd8b040, pc: 0x3a2428, gem: 0xff1a3a, iris: 0xff2a4a, glow: [0xff1a3a], size: 4.0 } },
  { name: '진홍 망치왕', zone: 'ruby', rarity: 'legendary', w: [200, 700], perKg: 6000,
    look: { rk: 'hammer', L: 1.2, h: 0.3, w: 0.26, color: 0x8a0a1a, belly: 0xffd0c8, fin: 0x5a0610, pc: 0xffd84a, gem: 0xffd84a, glow: [0xffd84a], size: 6.0 } },
  { name: '루비 고래거북', zone: 'ruby', rarity: 'legendary', w: [800, 2500], perKg: 2000,
    look: { rk: 'turtle', L: 0.9, h: 0.36, w: 0.6, color: 0x5a1a1e, belly: 0xe8d0b0, fin: 0x4a2a24, pc: 0x8a2a30, gem: 0xff2a4a, glow: [0xff2a4a], size: 8.0 } },
  { name: '천 개의 초롱 군주', zone: 'ruby', rarity: 'legendary', w: [5, 20], perKg: 150000,
    look: { rk: 'lantern', crownR: true, L: 0.7, h: 0.5, w: 0.5, color: 0xffd0a0, belly: 0xfff4e0, fin: 0xd8203a, pc: 0xd8b040, gem: 0xff3a2a, glow: [0xff3a2a], size: 2.4 } },
  // ---- 신화 ----
  { name: '홍옥 바다용', zone: 'ruby', rarity: 'mythic', w: [1200, 3600], perKg: 5000, huge: true,
    look: { rk: 'wyrm', L: 2.2, h: 0.5, w: 0.5, color: 0x8a0a1a, belly: 0xffc0a0, fin: 0xff3a5a, pc: 0xd8203a, gem: 0xffe23a, iris: 0xffe23a, glow: [0xffe23a], size: 6.6 } },
  { name: '홍염 불사조', zone: 'ruby', rarity: 'mythic', w: [2500, 7000], perKg: 2600, huge: true,
    look: { rk: 'phoenix', L: 1.0, h: 0.42, w: 0.36, color: 0xffd84a, belly: 0xfff0c0, fin: 0xff2a1a, pc: 0xff7a1a, gem: 0xffffff, iris: 0xff2a1a, glow: [0xffffff, 0xff7a1a, 0xff2a1a], size: 8.6 } }
);

// =========== 루비 신전 성소의 보스 (zone: 'boss') — 봉인을 풀면 신전 문이 열리고, 성소 연못에서만 한 번씩 나와요 ===========
//  보스는 한 마리뿐. 낚으면 성소 안에서 신전 낚싯대 2개(홍염 · 왕관)를 살 수 있어요. 일반 낚시로는 절대 안 나와요 (박물관 어항도 없어요)
FISH.push(
  { name: '성소의 홍염 수호룡', zone: 'boss', boss: true, rarity: 'mythic', w: [4000, 6000], perKg: 3000, huge: true,
    look: { rk: 'wyrm', L: 2.2, h: 0.5, w: 0.5, color: 0xd8202a, belly: 0xffd890, fin: 0xff8a1a, pc: 0xffd84a, gem: 0xfff0a0, iris: 0xffffff, glow: [0xfff0a0, 0xff8a1a], size: 8.4 } }
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
export function rollFish(luck, zone = 'lake', rain = false, season = null) {
  if (season && zone === 'lake' && Math.random() < 0.28) {
    // 계절 손님: 28% 확률로 지금 계절 물고기 중에서 골라요
    const r3 = Math.random();
    const want = r3 < 0.5 - luck * 0.3 ? 'common' : r3 < 0.8 - luck * 0.3 ? 'uncommon' : r3 < 0.97 - luck * 0.1 ? 'rare' : 'legendary';
    const sp = FISH.filter((f) => f.season === season && f.rarity === want);
    if (sp.length) return makeCatch(sp[Math.floor(Math.random() * sp.length)], luck);
  }
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
  let pool = FISH.filter((f) => f.rarity === rarity && zoneOf(f) === zone && !f.weather && !f.season && !f.boss);
  if (!pool.length) pool = FISH.filter((f) => zoneOf(f) === zone && !f.weather && !f.season && !f.boss);
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

// 보스 물고기 한 마리 (성소 연못에서만): 무게 · 이로치 · 값은 보통 물고기처럼 붙어요
export function makeBossCatch(name, luck) { const f = FISH.find((x) => x.name === name); return f ? makeCatch(f, luck) : null; }

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

  if (o.rk) {
    // 루비 섬 물고기: 새 생김새 (rubyfish.js)
    buildRubyFishBody(o, add, eyeSide, L, H, W);
  } else if (o.ray) {
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
  } else if (o.dragon) {
    // ---------- 고대 정글 용 ----------
    const STONE = 0x5e6a50, STONE2 = 0x748060, MOSS = 0x4a8a3a, MOSS2 = 0x5ea844, LEAF2 = 0x3a9a3a, HORN = 0x6a4a2a, TOOTH = 0xf4efe0, CLAW = 0xe8dcc0;
    // 몸통: 굵은 마디 7개 (꼬리 쪽으로 살짝 가늘게)
    for (let i = 0; i < 7; i++) {
      const x = L * 0.28 - i * L * 0.1, sh = 1 - i * 0.045;
      add(L * 0.11, H * sh, W * sh, o.color, x, 0, 0);
      add(L * 0.1, H * 0.22 * sh, W * 0.9 * sh, o.belly, x, -H * 0.42 * sh, 0);                        // 배 비늘
      if (i % 2 === 0) add(L * 0.03, H * 0.06, W * 0.4, o.pc, x, -H * 0.53 * sh, 0);                     // 배에 빛나는 룬
      // 등: 돌 갑옷 판 + 이끼 + 나뭇잎 가시
      add(L * 0.09, H * 0.2, W * 0.78 * sh, i % 2 ? STONE : STONE2, x, H * 0.55 * sh, 0);
      add(L * 0.05, H * 0.06, W * 0.5 * sh, i % 2 ? MOSS : MOSS2, x + L * 0.02, H * 0.67 * sh, (i % 3 - 1) * W * 0.1);
      add(L * 0.06, H * 0.5, W * 0.05, o.fin, x, H * 0.92 * sh, 0, 0, 0, 0.3);                           // 금빛 잎 가시
      add(L * 0.04, H * 0.32, W * 0.05, LEAF2, x - L * 0.03, H * 0.82 * sh, 0, 0, 0, 0.45);              // 초록 잎 가시
      for (const s of [-1, 1]) add(L * 0.08, H * 0.16, 0.012, i % 2 ? STONE2 : STONE, x, H * 0.1, s * (W * sh / 2 + 0.006)); // 옆구리 비늘
    }
    // 꼬리: 4마디가 살짝 위로 휘고, 끝은 나뭇잎 부채
    for (let i = 0; i < 4; i++) {
      const x = -L * 0.42 - i * L * 0.075, y = i * i * H * 0.04, sh = 0.7 - i * 0.13;
      add(L * 0.08, H * sh, W * sh, o.color, x, y, 0);
      add(L * 0.05, H * 0.25 * sh + 0.02, W * 0.06, o.fin, x, y + H * sh * 0.6, 0, 0, 0, 0.3);
    }
    for (const a of [-0.6, 0, 0.6]) add(L * 0.14, H * 0.06, W * 0.36, a ? LEAF2 : o.fin, -L * 0.74, H * 0.45, a * W * 0.4, 0, a, 0.25);
    // 짧은 다리 4개 + 발톱 3개씩
    for (const lx of [L * 0.18, -L * 0.24]) for (const s of [-1, 1]) {
      add(L * 0.08, H * 0.45, W * 0.22, o.color, lx, -H * 0.42, s * W * 0.52, s * 0.25, 0, 0);
      add(L * 0.07, H * 0.32, W * 0.2, o.color, lx + L * 0.02, -H * 0.78, s * W * 0.62);
      add(L * 0.11, H * 0.1, W * 0.26, STONE, lx + L * 0.03, -H * 0.96, s * W * 0.62);
      for (const c of [-1, 0, 1]) add(L * 0.035, H * 0.06, H * 0.06, CLAW, lx + L * 0.09, -H * 0.98, s * W * 0.62 + c * W * 0.08, 0, 0, -0.4);
    }
    // 목 + 머리 + 악어처럼 긴 턱 (살짝 벌어져 있어요)
    add(L * 0.1, H * 0.85, W * 0.8, o.color, L * 0.38, H * 0.06, 0);
    add(L * 0.16, H * 0.82, W * 0.82, o.color, L * 0.5, H * 0.12, 0);
    add(L * 0.13, H * 0.2, W * 0.7, STONE, L * 0.5, H * 0.56, 0);                                           // 머리 위 돌판
    add(L * 0.22, H * 0.3, W * 0.58, o.color, L * 0.68, H * 0.02, 0);                                        // 위턱
    add(L * 0.2, H * 0.16, W * 0.52, o.belly, L * 0.66, -H * 0.3, 0, 0, 0, -0.12);                          // 아래턱
    add(L * 0.18, H * 0.06, W * 0.46, 0x8a2a2a, L * 0.66, -H * 0.17, 0, 0, 0, -0.06);                        // 입 안
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {
      add(L * 0.018, H * 0.09, W * 0.04, TOOTH, L * 0.58 + k * L * 0.04, -H * 0.13, s * W * 0.25);           // 윗니
      if (k % 2 === 0) add(L * 0.018, H * 0.08, W * 0.04, TOOTH, L * 0.6 + k * L * 0.04, -H * 0.24, s * W * 0.23); // 아랫니
    }
    for (const s of [-1, 1]) {
      add(L * 0.03, H * 0.05, W * 0.06, 0x1a1a14, L * 0.78, H * 0.12, s * W * 0.14);                         // 콧구멍
      add(L * 0.12, H * 0.08, W * 0.2, STONE2, L * 0.52, H * 0.42, s * W * 0.3, 0, 0, 0.15);                  // 눈썹 돌
      eyeSide(L * 0.54, H * 0.26, s * (W * 0.42 + 0.01), s, H * 0.2);                                          // 빛나는 에메랄드 눈
      // 나뭇가지 사슴뿔: 큰 줄기 + 가지 2개 + 끝에 잎
      add(L * 0.04, H * 0.7, L * 0.04, HORN, L * 0.44, H * 0.88, s * W * 0.28, s * 0.35, 0, 0.45);
      add(L * 0.03, H * 0.38, L * 0.03, HORN, L * 0.36, H * 1.18, s * W * 0.42, s * 0.5, 0, 0.9);
      add(L * 0.03, H * 0.32, L * 0.03, HORN, L * 0.48, H * 1.2, s * W * 0.48, s * 0.6, 0, -0.2);
      for (const [hx, hy] of [[L * 0.3, H * 1.34], [L * 0.49, H * 1.38], [L * 0.38, H * 1.06]]) add(L * 0.06, H * 0.05, W * 0.12, (hx > L * 0.4) ? MOSS2 : LEAF2, hx, hy, s * W * 0.5, 0, s * 0.4, 0.3);
      // 덩굴 수염 (턱 아래로 늘어져요)
      add(L * 0.02, H * 0.42, L * 0.02, LEAF2, L * 0.6, -H * 0.55, s * W * 0.18);
      add(L * 0.05, H * 0.04, W * 0.08, MOSS2, L * 0.6, -H * 0.76, s * W * 0.18);
    }
    // 앞다리 쪽 등에 작은 꽃 몇 송이
    for (const [fx2, fz2, fc] of [[L * 0.12, W * 0.12, 0xff5a8a], [-L * 0.1, -W * 0.1, 0xffd83a], [-L * 0.3, W * 0.08, 0xff7a2a]]) add(L * 0.025, H * 0.06, L * 0.025, fc, fx2, H * 0.74, fz2);
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
//  이로치 이펙트: 만든 물고기 모형을 기억해 두고, 매 장면 updateFishFx 로 움직여요
//   골드   = 몸을 훑고 지나가는 금빛 광택 + 반짝 별 + 위로 날아오르는 금가루
//   다크   = 몸에서 피어오르는 검보랏빛 연기 + 그림자처럼 어두워졌다 밝아지기 + 빛나는 보라 눈
//   화이트 = 머리 위 빛나는 고리(천사 링) + 은은한 하얀 빛 숨결 + 맴도는 빛 알갱이
//   얼음   = 차가운 입김(서리 알갱이가 흩날림) + 얼음 결정이 자랐다 줄었다 + 푸른 냉기 맥박
//   핏빛   = 심장처럼 두근(두 번씩) 붉게 빛나기 + 뚝뚝 떨어지는 핏방울 + 붉은 안개
//   알비노 = 분홍빛 무지개 광택 + 동글동글 떠오르는 비눗방울
//   방사능 = 강한 초록 맥박 + 보글보글 독 거품 + 지직 튀는 초록 번개
//   다이아 = 무지갯빛 반짝이 + 블록마다 번쩍이는 빛 + 빙글 도는 다이아 조각
//   글리치 = 블록이 지직지직 튀고 · 사라지고 · 늘어나고 · 번쩍이고 · 찢어져요
// =====================================================
const FX = new Set();
const G_SPARK = new THREE.OctahedronGeometry(0.035, 0);
const G_CUBE = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const G_BALL = new THREE.IcosahedronGeometry(0.04, 1);
const G_DROP = new THREE.ConeGeometry(0.025, 0.06, 5);
const G_BOLT = new THREE.BoxGeometry(0.015, 0.11, 0.015);
const G_RING = new THREE.TorusGeometry(1, 0.08, 6, 24);
const basic = (c, o = 1, add = false) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
const M = {
  gold: basic(0xfff0a0, 1, true), goldDust: basic(0xffd84a, 0.9, true),
  dark: basic(0x2a0a3a, 0.75), darkGlow: basic(0x9a4aff, 0.9, true),
  white: basic(0xffffff, 0.9, true), halo: basic(0xfff8d8, 0.85, true),
  frost: basic(0xe8fbff, 0.85, true), iceShard: basic(0xbff0ff, 0.9, true),
  blood: basic(0xc8101a, 0.95), bloodMist: basic(0x8a0010, 0.35),
  bubble: basic(0xffd0e8, 0.55, true), bubble2: basic(0xd0f0ff, 0.5, true),
  toxic: basic(0x8aff3a, 0.8, true), bolt: basic(0xd8ff5a, 1, true),
  prism: [0xff6a8a, 0xffd84a, 0x6affb0, 0x6ac8ff, 0xc08aff].map((c) => basic(c, 1, true))
};
// 이로치마다 파티클 몇 개를 어떤 모양으로
const RECIPE = {
  골드: [['glint', 4, G_SPARK, M.gold], ['dust', 6, G_CUBE, M.goldDust]],
  다크: [['smoke', 9, G_CUBE, M.dark], ['wisp', 3, G_SPARK, M.darkGlow]],
  화이트: [['halo', 1, G_RING, M.halo], ['mote', 6, G_SPARK, M.white]],
  얼음: [['frost', 10, G_CUBE, M.frost], ['shard', 3, G_SPARK, M.iceShard]],
  핏빛: [['drop', 4, G_DROP, M.blood], ['mist', 4, G_BALL, M.bloodMist]],
  알비노: [['bubble', 7, G_BALL, M.bubble], ['bubble', 3, G_BALL, M.bubble2]],
  방사능: [['toxic', 8, G_BALL, M.toxic], ['bolt', 4, G_BOLT, M.bolt]],
  다이아: [['prism', 8, G_SPARK, null], ['spin', 2, G_SPARK, M.white]]
};
function addFishFx(g, muts, L, H, W) {
  const names = muts.map((m) => m.name);
  const pieces = [];
  g.traverse((o) => {
    if (o.isMesh && o.userData.mut) {
      o.userData.base0 = o.position.clone();
      o.userData.em0 = o.material.emissive.getHex();
      o.userData.ei0 = o.material.emissiveIntensity;
      o.userData.c0 = o.material.color.getHex();
      pieces.push(o);
    }
  });
  const fx = { names, pieces, L, H, W, parts: [], glitchUntil: 0, seen: false };
  for (const n of names) for (const [kind, count, geo, mat] of RECIPE[n] || []) {
    for (let k = 0; k < count; k++) {
      const m = mat || M.prism[k % M.prism.length];
      const p = new THREE.Mesh(geo, m);
      p.visible = false;
      p.scale.setScalar(0.001); // 처음엔 아주 작게 (물고기 크기 계산에 끼어들지 않게)
      p.renderOrder = 6;
      p.userData = { kind, ph: Math.random() * 10, k, n: count, seed: Math.random() };
      g.add(p);
      fx.parts.push(p);
    }
  }
  g.userData.fx = fx;
  FX.add(g);
}
// 블록 하나의 빛(emissive)을 잠깐 바꾸기 (원래 색으로 돌아갈 수 있게 기억해 둬요)
const glowPiece = (p, color, intensity) => { p.material.emissive.setHex(color); p.material.emissiveIntensity = intensity; };
const resetPiece = (p) => { const u = p.userData; p.material.emissive.setHex(u.em0); p.material.emissiveIntensity = u.ei0; };
export function updateFishFx(t) {
  for (const g of FX) {
    const fx = g.userData.fx;
    if (!fx) { FX.delete(g); continue; } // 이펙트 정보가 없어졌으면 그냥 빼요 (게임이 멈추지 않게)
    if (!g.parent) { if (fx.seen) FX.delete(g); continue; } // 화면에서 사라진 물고기는 잊어요
    fx.seen = true;
    const { names, pieces, L, H, W } = fx;
    // ---------- 블록 자체의 빛 + 살짝 움직이기 ----------
    //  골드: 금빛 물결이 몸을 따라 출렁 · 다크: 그림자가 일렁이며 블록이 살짝 흩어졌다 모여요
    //  화이트: 숨 쉬듯 부풀었다 줄었다 · 얼음: 가끔 얼어붙듯 바르르 · 핏빛: 심장 박동에 맞춰 몸이 쿵쿵
    //  알비노: 비눗방울처럼 말랑 출렁 · 방사능: 지직지직 경련 · 다이아: 블록마다 반짝 튀어나왔다 들어가요
    for (const p of pieces) {
      const u = p.userData, mt = u.mut, nx = (u.base0.x / (L || 1)) + 0.5; // 머리 쪽 1, 꼬리 쪽 0
      if (mt !== '글리치' && u.base0) {
        const b0 = u.base0, ph = u.ph0 ?? (u.ph0 = Math.random() * 6.28);
        let dx = 0, dy = 0, dz = 0, sc = 1;
        if (mt === '골드') { dy = Math.sin(t * 4 - nx * 7) * H * 0.04; sc = 1 + Math.max(0, Math.sin(t * 4 - nx * 7)) * 0.06; }
        else if (mt === '다크') { const k = Math.sin(t * 1.3 + ph); dx = k * L * 0.012; dy = Math.cos(t * 1.7 + ph) * H * 0.03; dz = Math.sin(t * 2.1 + ph) * W * 0.06; }
        else if (mt === '화이트') sc = 1 + Math.sin(t * 1.8) * 0.045;
        else if (mt === '얼음') { const shiver = (t % 4) < 0.35 ? 1 : 0; dx = shiver * (Math.random() - 0.5) * L * 0.012; dz = shiver * (Math.random() - 0.5) * W * 0.05; }
        else if (mt === '핏빛') { const beat = (t * 1.1) % 1, pulse = Math.exp(-((beat - 0.08) ** 2) * 600) + Math.exp(-((beat - 0.26) ** 2) * 600) * 0.7; sc = 1 + pulse * 0.09; dy = b0.y * pulse * 0.08; dz = b0.z * pulse * 0.12; }
        else if (mt === '알비노') { dy = Math.sin(t * 2.4 + nx * 5) * H * 0.035; sc = 1 + Math.sin(t * 2.4 + nx * 5 + 1) * 0.04; }
        else if (mt === '방사능') { if (Math.random() < 0.06) u.tw = t + 0.07; if (u.tw > t) { dx = (Math.random() - 0.5) * L * 0.05; dy = (Math.random() - 0.5) * H * 0.12; } }
        else if (mt === '다이아') { const pop = u.flashUntil > t ? 1 : 0; dz = Math.sign(b0.z || 1) * pop * W * 0.08; sc = 1 + pop * 0.12; }
        p.position.set(b0.x + dx, b0.y + dy, b0.z + dz);
        p.scale.setScalar(sc);
      }
      if (mt === '골드') {
        // 금빛 광택이 꼬리→머리로 훑고 지나가요
        const sweep = Math.exp(-((nx - ((t * 0.7) % 1.6 - 0.3)) ** 2) * 40);
        glowPiece(p, 0xffd84a, u.ei0 + sweep * 1.4);
      } else if (mt === '다크') {
        // 그림자처럼 어두워졌다가, 가끔 보랏빛이 확 번져요
        const k = 0.5 + Math.sin(t * 1.6 + nx * 3) * 0.5;
        glowPiece(p, 0x5a1aa8, 0.15 + k * 0.6);
      } else if (mt === '화이트') {
        glowPiece(p, 0xfff6e0, 0.25 + (0.5 + Math.sin(t * 1.8) * 0.5) * 0.55);
      } else if (mt === '얼음') {
        const k = Math.max(0, Math.sin(t * 2.2 - nx * 4));
        glowPiece(p, 0x6ad8ff, 0.12 + k * 0.7);
      } else if (mt === '핏빛') {
        // 두근두근 (한 박자에 두 번)
        const beat = (t * 1.1) % 1, pulse = Math.exp(-((beat - 0.08) ** 2) * 600) + Math.exp(-((beat - 0.26) ** 2) * 600) * 0.7;
        glowPiece(p, 0xff1a2a, 0.25 + pulse * 1.8);
      } else if (mt === '알비노') {
        // 분홍빛 무지개 광택이 천천히 흘러요
        p.material.emissive.setHSL((0.9 + Math.sin(t * 0.6 + nx * 2) * 0.08) % 1, 0.7, 0.75); p.material.emissiveIntensity = 0.25 + Math.sin(t * 2 + nx * 5) * 0.12;
      } else if (mt === '방사능') {
        const k = 0.5 + Math.sin(t * 5) * 0.5, flick = Math.random() < 0.03 ? 1.2 : 0; // 가끔 지직 번쩍
        glowPiece(p, 0x3aff1a, 0.6 + k * 1.0 + flick);
      } else if (mt === '다이아') {
        // 블록마다 가끔 하얗게·무지갯빛으로 번쩍
        if (Math.random() < 0.025) u.flashUntil = t + 0.12, u.flashC = [0xffffff, 0x8affff, 0xff9af0, 0xfff28a][Math.floor(Math.random() * 4)];
        if (u.flashUntil > t) glowPiece(p, u.flashC, 2.2); else glowPiece(p, 0x3ad8ff, u.ei0);
      }
    }
    // ---------- 글리치: 아주 심하게 지지직 ----------
    if (names.includes('글리치')) {
      if (t > fx.glitchUntil) {
        for (const p of pieces) {
          const u = p.userData;
          if (u.mut !== '글리치') { p.visible = true; continue; } // 다른 이로치 블록은 위에서 따로 움직여요
          p.position.copy(u.base0); p.visible = true; p.scale.set(1, 1, 1);
          resetPiece(p);
        }
        if (Math.random() < 0.4) {
          fx.glitchUntil = t + 0.03 + Math.random() * 0.1;
          const gl = pieces.filter((p) => p.userData.mut === '글리치');
          const n = 3 + Math.floor(Math.random() * Math.min(10, gl.length));
          const COLS = [0xff2ad8, 0x2affff, 0xffffff, 0x2a2aff, 0x15ff6a];
          for (let k = 0; k < n; k++) {
            const p = gl[Math.floor(Math.random() * gl.length)];
            if (!p) continue;
            const roll = Math.random();
            if (roll < 0.25) p.visible = false;
            else {
              p.position.x += (Math.random() - 0.5) * L * 1.2;
              p.position.y += (Math.random() - 0.5) * H * 1.6;
              p.position.z += (Math.random() - 0.5) * W * 2.0;
              if (roll < 0.55) p.scale.set(1 + Math.random() * 3, 1, 1);
              if (roll > 0.6) glowPiece(p, COLS[Math.floor(Math.random() * COLS.length)], 1.6);
            }
          }
          if (Math.random() < 0.45) {
            const cut = (Math.random() - 0.5) * H, shift = (Math.random() - 0.5) * L * 0.5;
            for (const p of pieces) if (p.userData.base0.y > cut) p.position.x += shift;
          }
        }
      }
    }
    // ---------- 파티클 ----------
    for (const p of fx.parts) {
      const u = p.userData;
      p.visible = true;
      if (u.kind === 'glint') { // 골드: 몸 여기저기 반짝 별
        const q = (t * 0.9 + u.ph) % 1;
        if (q < 0.03 || !u.set) { u.set = true; p.position.set((Math.random() - 0.5) * L, (Math.random() - 0.3) * H, (Math.random() - 0.5) * (W + 0.1)); }
        const s = q < 0.35 ? Math.sin((q / 0.35) * Math.PI) * 1.6 : 0;
        p.scale.set(s * 0.6, s * 1.8, s * 0.6); p.rotation.set(0, t * 4, 0);
      } else if (u.kind === 'dust') { // 골드: 위로 반짝이며 날아오르는 금가루
        const q = (t * 0.45 + u.ph) % 1;
        p.position.set(((u.seed - 0.5) * L), -H * 0.2 + q * H * 2.4, Math.sin(u.ph * 9) * W * 0.6);
        p.scale.setScalar(Math.max(0.01, 1 - q) * 0.9); p.rotation.set(t * 3, t * 2, 0);
      } else if (u.kind === 'smoke') { // 다크: 몸에서 피어오르는 검보랏빛 연기
        const q = (t * 0.35 + u.ph) % 1;
        p.position.set((u.seed - 0.5) * L * 0.9 + Math.sin(t + u.ph) * 0.05, H * 0.2 + q * H * 2.2, Math.cos(u.ph * 5) * W * 0.5);
        const s = Math.sin(q * Math.PI) * (1.4 + u.seed);
        p.scale.setScalar(Math.max(0.01, s)); p.rotation.set(t, t * 0.7, 0);
      } else if (u.kind === 'wisp') { // 다크: 보랏빛 혼불이 천천히 맴돌아요
        const a = t * 0.8 + (u.k / u.n) * Math.PI * 2;
        p.position.set(Math.cos(a) * L * 0.6, Math.sin(t * 1.5 + u.k) * H * 0.5, Math.sin(a) * (W + 0.2));
        p.scale.setScalar(1 + Math.sin(t * 4 + u.k) * 0.4);
      } else if (u.kind === 'halo') { // 화이트: 머리 위 빛나는 고리
        p.position.set(L * 0.15, H * 0.95 + Math.sin(t * 2) * H * 0.06, 0);
        p.rotation.set(Math.PI / 2 - 0.55, Math.sin(t * 0.8) * 0.25, t * 0.6); // 살짝 기울여서 동그란 고리로 보이게
        p.scale.set(W * 0.9 + 0.05, W * 0.9 + 0.05, 0.6);
      } else if (u.kind === 'mote') { // 화이트: 몸 주위를 도는 빛 알갱이
        const a = t * 1.2 + (u.k / u.n) * Math.PI * 2;
        p.position.set(Math.cos(a) * L * 0.55, Math.sin(a * 2) * H * 0.4, Math.sin(a) * (W + 0.15));
        p.scale.setScalar(0.7 + Math.sin(t * 5 + u.k) * 0.3);
      } else if (u.kind === 'frost') { // 얼음: 흩날리는 서리 알갱이 (차가운 입김)
        const q = (t * 0.5 + u.ph) % 1;
        p.position.set((u.seed - 0.5) * L * 1.1 + q * 0.15, H * 0.5 - q * H * 1.6, Math.sin(u.ph * 7 + q * 3) * (W * 0.8 + 0.05));
        p.scale.setScalar(Math.max(0.01, Math.sin(q * Math.PI)) * 0.55); p.rotation.set(t * 2, t, 0);
      } else if (u.kind === 'shard') { // 얼음: 등 위 얼음 결정이 자랐다 줄었다
        const s = 0.8 + Math.max(0, Math.sin(t * 1.4 + u.k * 2)) * 1.6;
        p.position.set(-L * 0.2 + u.k * L * 0.2, H * 0.62, 0);
        p.scale.set(s * 0.7, s * 2.2, s * 0.7);
      } else if (u.kind === 'drop') { // 핏빛: 뚝뚝 떨어지는 핏방울
        const q = (t * 0.6 + u.ph) % 1;
        p.position.set((u.seed - 0.5) * L * 0.7, -H * 0.45 - q * q * H * 2.5, (u.seed - 0.5) * W * 0.4);
        p.rotation.set(Math.PI, 0, 0);
        p.scale.setScalar(q < 0.85 ? 1 : Math.max(0.01, (1 - q) * 6));
      } else if (u.kind === 'mist') { // 핏빛: 몸을 감싸는 붉은 안개
        const a = t * 0.5 + (u.k / u.n) * Math.PI * 2;
        p.position.set(Math.cos(a) * L * 0.4, -H * 0.1 + Math.sin(t + u.k) * H * 0.2, Math.sin(a) * (W * 0.7 + 0.05));
        p.scale.setScalar(2.2 + Math.sin(t * 1.3 + u.k) * 0.8);
      } else if (u.kind === 'bubble') { // 알비노: 동글동글 떠오르는 비눗방울
        const q = (t * 0.3 + u.ph) % 1;
        p.position.set((u.seed - 0.5) * L + Math.sin(t * 2 + u.ph) * 0.05, -H * 0.2 + q * H * 2.6, Math.cos(u.ph * 4) * W * 0.6);
        p.scale.setScalar((0.6 + u.seed * 0.9) * (q < 0.92 ? 1 : 0.01));
      } else if (u.kind === 'toxic') { // 방사능: 보글보글 올라가는 독 거품
        const q = (t * 0.55 + u.ph) % 1;
        p.position.set((u.seed - 0.5) * L * 0.8, H * 0.1 + q * H * 1.8, Math.sin(u.ph * 6) * W * 0.5);
        p.scale.setScalar((0.5 + u.seed * 0.8) * Math.max(0.01, 1 - q * 0.7) * (q > 0.95 ? 0.01 : 1));
      } else if (u.kind === 'bolt') { // 방사능: 몸 가장자리에서 지직 튀는 초록 번개
        if (Math.random() < 0.08) { u.on = t + 0.06; p.position.set((Math.random() - 0.5) * L, (Math.random() - 0.5) * H * 1.2, (Math.random() < 0.5 ? -1 : 1) * (W * 0.6 + 0.02)); p.rotation.set(0, 0, (Math.random() - 0.5) * 2); }
        p.visible = u.on > t;
      } else if (u.kind === 'prism') { // 다이아: 무지갯빛 반짝이
        const q = (t * 0.8 + u.ph) % 1;
        if (q < 0.03 || !u.set) { u.set = true; p.position.set((Math.random() - 0.5) * L * 1.1, (Math.random() - 0.3) * H * 1.2, (Math.random() - 0.5) * (W + 0.2)); }
        const s = q < 0.4 ? Math.sin((q / 0.4) * Math.PI) * 1.8 : 0;
        p.scale.set(s * 0.5, s * 1.6, s * 0.5); p.rotation.set(0, t * 3, 0);
      } else if (u.kind === 'spin') { // 다이아: 빙글 도는 다이아 조각
        const a = t * 1.6 + u.k * Math.PI;
        p.position.set(Math.cos(a) * L * 0.5, H * 0.7, Math.sin(a) * (W + 0.25));
        p.scale.set(1.4, 2.4, 1.4); p.rotation.set(0, t * 3, 0);
      }
    }
  }
}
