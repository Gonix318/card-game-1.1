/* ==========================================================================
   MODULE 6/10: CARDS DATA & GACHA CONFIG - CYBERRANK & 5 DAYS EVENT
   ========================================================================== */

// 1. NGUYÊN TỐ CƠ BẢN VÀ QUAN HỆ KHẮC CHẾ (x1.35 SÁT THƯƠNG)
const ELEMENTS = {
  FIRE: { name: 'Hỏa', icon: '🔥', strongAgainst: 'ICE', color: '#ff3838' },
  ICE: { name: 'Băng', icon: '❄️', strongAgainst: 'THUNDER', color: '#17c0eb' },
  THUNDER: { name: 'Lôi', icon: '⚡', strongAgainst: 'DARK', color: '#ffb142' },
  DARK: { name: 'Ám', icon: '🌑', strongAgainst: 'FIRE', color: '#7158e2' }
};

// 2. TƯỚNG ĐỘC QUYỀN KỶ NIỆM 5 NGÀY (EVENT 25/10) - THE JOKER
const EVENT_JOKER_CARD = {
  id: 'CARD_EVENT_THE_JOKER',
  name: 'The Joker',
  rank: 'EVENT_EXCLUSIVE',
  element: 'DARK',
  elementInfo: ELEMENTS.DARK,
  baseAtk: 260,
  baseHp: 888,
  baseSpd: 145,
  targetType: 'SINGLE',
  unlockedSkill: 'Điên Loạn Tuyệt Đối',
  eventExclusive: true,
  description: 'Gã Hề Điên Loạn mang sức mạnh phá vỡ mọi quy chuẩn và bức tường thứ 4.',
  jokerMechanics: {
    // 1% nổ Instant Win Cutscene
    instantWinRate: 0.01,
    // 5% Bộ Bài Tử Thần (Buff 170% ATK cho toàn đội đến hết trận)
    deathDeckRate: 0.05,
    deathDeckMultiplier: 1.70,
    // 10% Nụ Cười Quái Dị (Choáng mất lượt + 1% trảm 2 tướng ngẫu nhiên)
    creepySmileRate: 0.10,
    doubleKillInsideRate: 0.01
  }
};

// 3. BỘ BA TƯỚNG HALLOWEEN
const HALLOWEEN_EVENT_CARDS = [
  {
    id: 'CARD_EVENT_DARK_LORD',
    name: 'Dark Lord',
    rank: 'EVENT',
    element: 'DARK',
    elementInfo: ELEMENTS.DARK,
    baseAtk: 245,
    baseHp: 980,
    baseSpd: 125,
    targetType: 'AOE',
    unlockedSkill: 'Nụ Cười Ma Quái'
  },
  {
    id: 'CARD_EVENT_XINGLENG',
    name: 'Xingleng',
    rank: 'EVENT',
    element: 'FIRE',
    elementInfo: ELEMENTS.FIRE,
    baseAtk: 275,
    baseHp: 1050,
    baseSpd: 140,
    targetType: 'SINGLE',
    unlockedSkill: 'Tru Di Ngũ Tướng'
  },
  {
    id: 'CARD_EVENT_ADX',
    name: 'Armored Dark Xingleng',
    rank: 'EVENT',
    element: 'DARK',
    elementInfo: ELEMENTS.DARK,
    baseAtk: 240,
    baseHp: 1050,
    baseSpd: 130,
    targetType: 'CHAIN_PULSE',
    unlockedSkill: 'Bát Quái Siêu Giáp'
  }
];

// 4. THỐNG KÊ PHẨM CẤP VÀ HỆ SỐ NỀN TẢNG
const CARD_RANKS_CONFIG = {
  C: { name: 'C', multiplier: 1.0, baseHpRange: [200, 320], baseAtkRange: [40, 65], baseSpdRange: [80, 95], scrapDust: 15, scrapSuperDust: 0 },
  B: { name: 'B', multiplier: 1.4, baseHpRange: [330, 480], baseAtkRange: [70, 95], baseSpdRange: [96, 110], scrapDust: 35, scrapSuperDust: 0 },
  A: { name: 'A', multiplier: 2.0, baseHpRange: [500, 680], baseAtkRange: [100, 135], baseSpdRange: [111, 125], scrapDust: 85, scrapSuperDust: 0 },
  S: { name: 'S', multiplier: 2.8, baseHpRange: [700, 920], baseAtkRange: [140, 185], baseSpdRange: [126, 138], scrapDust: 250, scrapSuperDust: 1 },
  SSS: { name: 'SSS', multiplier: 4.0, baseHpRange: [950, 1250], baseAtkRange: [195, 260], baseSpdRange: [139, 150], scrapDust: 800, scrapSuperDust: 3 },
  EVENT: { name: 'EVENT', multiplier: 4.2, scrapDust: 1200, scrapSuperDust: 5 },
  EVENT_EXCLUSIVE: { name: 'EVENT_EXCLUSIVE', multiplier: 4.8, scrapDust: 2500, scrapSuperDust: 10 }
};

// 5. MÁY SINH DANH SÁCH 500 TƯỚNG GỐC CỦA GAME
function generateStandardCardPool() {
  const titles = [
    'Chiến Binh', 'Phù Thủy', 'Sát Thủ', 'Hiệp Sĩ', 'Thợ Săn', 'Thần Trộm', 
    'Cơ Giáp', 'Vệ Binh', 'Thiền Sư', 'Cung Thủ', 'Pháp Sư', 'Lãng Khách',
    'Cuồng Nộ', 'Hộ Vệ', 'Tử Thần', 'Tiên Phong', 'Cửu Vĩ', 'Long Tướng'
  ];
  const prefixes = [
    'Băng Phong', 'Hỏa Diệm', 'Lôi Quang', 'Hắc Ám', 'Cổ Đại', 'Hư Không',
    'Nguyên Tử', 'Lượng Tử', 'Bất Diệt', 'Hủy Diệt', 'Thái Cực', 'Huyễn Ảnh'
  ];
  const elementKeys = Object.keys(ELEMENTS);
  const ranksDistribution = [
    { rank: 'C', count: 180 },
    { rank: 'B', count: 140 },
    { rank: 'A', count: 100 },
    { rank: 'S', count: 60 },
    { rank: 'SSS', count: 20 }
  ];

  const pool = [];
  let cardIndex = 1;

  ranksDistribution.forEach(({ rank, count }) => {
    const cfg = CARD_RANKS_CONFIG[rank];
    for (let i = 0; i < count; i++) {
      const elemKey = elementKeys[Math.floor(Math.random() * elementKeys.length)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      
      const hp = Math.floor(cfg.baseHpRange[0] + Math.random() * (cfg.baseHpRange[1] - cfg.baseHpRange[0]));
      const atk = Math.floor(cfg.baseAtkRange[0] + Math.random() * (cfg.baseAtkRange[1] - cfg.baseAtkRange[0]));
      const spd = Math.floor(cfg.baseSpdRange[0] + Math.random() * (cfg.baseSpdRange[1] - cfg.baseSpdRange[0]));

      pool.push({
        id: `CARD_STD_${String(cardIndex).padStart(4, '0')}`,
        name: `${prefix} ${title}`,
        rank: rank,
        element: elemKey,
        elementInfo: ELEMENTS[elemKey],
        baseHp: hp,
        baseAtk: atk,
        baseSpd: spd,
        targetType: Math.random() < 0.25 ? 'AOE' : 'SINGLE',
        unlockedSkill: rank === 'SSS' ? 'Cuồng Nộ Tối Thượng' : null
      });
      cardIndex++;
    }
  });

  return pool;
}

// KHỞI TẠO TẬP DANH MỤC THẺ BÀI TOÀN HỆ THỐNG
const MASTER_CARD_DATABASE = [
  EVENT_JOKER_CARD,
  ...HALLOWEEN_EVENT_CARDS,
  ...generateStandardCardPool()
];

// 6. CẤU HÌNH TỶ LỆ CÁC GÓI GACHA
const GACHA_PACKS_CONFIG = {
  // GÓI VÀNG (🪙)
  BRONZE: {
    name: 'Gói Đồng',
    costGold: 1000,
    rates: { C: 0.75, B: 0.20, A: 0.05, S: 0, SSS: 0, EVENT: 0, EVENT_EXCLUSIVE: 0 }
  },
  SILVER: {
    name: 'Gói Bạc',
    costGold: 3500,
    rates: { C: 0, B: 0.60, A: 0.32, S: 0.08, SSS: 0, EVENT: 0, EVENT_EXCLUSIVE: 0 }
  },
  GOLD: {
    name: 'Gói Vàng',
    costGold: 10000,
    rates: { C: 0, B: 0, A: 0.55, S: 0.38, SSS: 0.07, EVENT: 0, EVENT_EXCLUSIVE: 0 }
  },
  DIAMOND: {
    name: 'Gói Kim Cương (Event 25/10)',
    costGold: 35000,
    rates: { C: 0, B: 0, A: 0, S: 0.48, SSS: 0.44, EVENT: 0.07, EVENT_EXCLUSIVE: 0.01 }
  },

  // HÒM CAO CẤP BẰNG TINH THẠCH (💎)
  GEM_RARE: {
    name: 'Hòm Tinh Thạch Hiếm',
    costGemsSingle: 15,
    costGemsTen: 135,
    rates: { C: 0, B: 0, A: 0, S: 0.70, SSS: 0.25, EVENT: 0.04, EVENT_EXCLUSIVE: 0.01 }
  },
  GEM_MYTHIC: {
    name: 'Hòm Kỷ Niệm 5 Ngày (Thần Thoại)',
    costGemsSingle: 35,
    costGemsTen: 300,
    rates: { C: 0, B: 0, A: 0, S: 0, SSS: 0.80, EVENT: 0.18, EVENT_EXCLUSIVE: 0.02 }
  }
};
