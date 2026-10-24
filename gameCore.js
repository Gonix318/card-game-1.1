/* ==========================================================================
   MODULE 7/10: GAME CORE & PROGRESSION - CYBERRANK & NON-STOP FORGE
   ========================================================================== */

// 1. TRẠNG THÁI TOÀN CỤC CỦA NGƯỜI CHƠI (GLOBAL STATE)
const gameState = {
  player: {
    name: 'Cyber Champion',
    level: 1,
    exp: 0,
    maxExp: 175,
    gold: 25000,
    gems: 120,
    normalDust: 3500,
    superDust: 15,
    benchCapacity: 2, // Mặc định 2 ô dự bị, tối đa 10 ô
    deck: {
      main: [], // Tối đa 5 thẻ tiên phong
      sub: []   // Tối đa benchCapacity thẻ
    },
    inventory: [],
    buffInventory: {
      HEAL: 3,
      SHIELD: 2,
      OVERLOAD: 3,
      HASTE: 3
    },
    cloudRecordId: null
  },
  selectedForgeCardUid: null
};

// 2. BẢNG 11 BẬC DANH HIỆU CYBERRANK THEO TEAM OVR
const CYBER_RANK_TIERS = [
  { minOvr: 35000, name: 'THE ERROR', className: 'tier-the-error' },
  { minOvr: 25000, name: 'Bất Tử', className: 'tier-immortal' },
  { minOvr: 18000, name: 'Tối Thượng', className: 'tier-supreme' },
  { minOvr: 12000, name: 'Huyền Thoại', className: 'tier-legend' },
  { minOvr: 8000,  name: 'Đại Sư', className: 'tier-grandmaster' },
  { minOvr: 5000,  name: 'Cao Thủ', className: 'tier-master' },
  { minOvr: 3000,  name: 'Kim Cương', className: 'tier-diamond' },
  { minOvr: 1800,  name: 'Bạch Kim', className: 'tier-platinum' },
  { minOvr: 1000,  name: 'Vàng', className: 'tier-gold' },
  { minOvr: 400,   name: 'Bạc', className: 'tier-silver' },
  { minOvr: 0,     name: 'Đồng (Newbie)', className: 'tier-bronze' }
];

// 3. TÍNH TOÁN OVR CỦA TỪNG THẺ VÀ TOÀN ĐỘI
function calculateCardPower(card) {
  if (!card) return 0;
  // Tổng sao thực tế = (sao cầu vồng * 7) + sao vàng dư
  const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);
  const starMultiplier = 1 + effectiveStars * 0.18; // Mỗi sao tăng 18% thực lực

  const rankMul = CARD_RANKS_CONFIG[card.rank]?.multiplier || 1.0;
  const power = Math.floor(
    ((card.baseHp * 0.45) + (card.baseAtk * 1.85) + (card.baseSpd * 1.2)) * rankMul * starMultiplier
  );
  return power;
}

function calculateTeamOVR() {
  const mainCards = gameState.player.deck.main || [];
  const subCards = gameState.player.deck.sub || [];

  if (mainCards.length === 0) return 0;

  // Tiên phong (5 thẻ chính) gánh 80% trọng số OVR
  const totalMainPower = mainCards.reduce((sum, c) => sum + calculateCardPower(c), 0);
  const avgMain = totalMainPower / 5;

  // Dự bị đóng góp 20% trọng số OVR
  let avgSub = 0;
  if (subCards.length > 0) {
    const totalSubPower = subCards.reduce((sum, c) => sum + calculateCardPower(c), 0);
    avgSub = totalSubPower / subCards.length;
  }

  const teamOvr = Math.round(avgMain * 0.8 + avgSub * 0.2);
  return teamOvr;
}

function getCyberRankTier(ovr) {
  for (const tier of CYBER_RANK_TIERS) {
    if (ovr >= tier.minOvr) return tier;
  }
  return CYBER_RANK_TIERS[CYBER_RANK_TIERS.length - 1];
}

// 4. HỆ THỐNG KINH NGHIỆM VÀ LÊN CẤP
function addPlayerExp(amount) {
  gameState.player.exp += amount;
  while (gameState.player.exp >= gameState.player.maxExp) {
    gameState.player.exp -= gameState.player.maxExp;
    gameState.player.level++;
    gameState.player.maxExp = Math.round(gameState.player.maxExp * 1.35 + 50);
    triggerLevelUpModal(gameState.player.level);
  }
  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();
}

function triggerLevelUpModal(newLv) {
  const modal = document.getElementById('levelUpModal');
  const lvTxt = document.getElementById('modalNewLevel');
  const rewardsBox = document.getElementById('modalLevelRewards');
  if (!modal) return;

  const bonusGold = newLv * 3000;
  const bonusGems = newLv * 15;
  const bonusSuperDust = Math.floor(newLv / 2) + 1;

  gameState.player.gold += bonusGold;
  gameState.player.gems += bonusGems;
  gameState.player.superDust += bonusSuperDust;

  if (lvTxt) lvTxt.textContent = `CẤP ĐỘ ${newLv}`;
  if (rewardsBox) {
    rewardsBox.innerHTML = `
      <div>🪙 +${bonusGold.toLocaleString('vi-VN')} Vàng</div>
      <div>💎 +${bonusGems} Tinh Thạch</div>
      <div>🌠 +${bonusSuperDust} Bụi Sao Siêu Cấp</div>
    `;
  }
  modal.classList.remove('hidden');
}

function closeLevelUpModal() {
  const modal = document.getElementById('levelUpModal');
  if (modal) modal.classList.add('hidden');
}

// 5. THUẬT TOÁN LÒ RÈN SAO CẦU VỒNG NON-STOP (CƠ SỐ 7)
function getForgeUpgradeCost(card) {
  if (!card) return null;
  const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);

  // Chi phí bụi sao thường tăng tiến theo cấp số cộng
  const reqNormalDust = Math.round(250 * Math.pow(1.3, effectiveStars) + effectiveStars * 100);
  
  // Khi chuẩn bị đột phá lên Sao Cầu Vồng (ở mốc 6 sao vàng lên 7) cần Bụi Siêu Cấp
  const willBecomeRainbow = ((card.stars || 0) + 1) % 7 === 0;
  const reqSuperDust = willBecomeRainbow ? Math.floor(effectiveStars / 7) + 1 : 0;

  return { reqNormalDust, reqSuperDust, willBecomeRainbow };
}

function executeCardUpgrade() {
  const uid = gameState.selectedForgeCardUid;
  if (!uid) return;

  const card = gameState.player.inventory.find(c => c.uid === uid);
  if (!card) return;

  const cost = getForgeUpgradeCost(card);
  if (!cost) return;

  if (gameState.player.normalDust < cost.reqNormalDust) {
    alert('Không đủ 🌟 Bụi Sao Thường!');
    return;
  }
  if (gameState.player.superDust < cost.reqSuperDust) {
    alert('Không đủ 🌠 Bụi Sao Siêu Cấp để đột phá Sao Cầu Vồng!');
    return;
  }

  // Khấu trừ tài nguyên
  gameState.player.normalDust -= cost.reqNormalDust;
  gameState.player.superDust -= cost.reqSuperDust;

  // Nâng tiến trình sao cơ số 7
  card.stars = (card.stars || 0) + 1;
  if (card.stars >= 7) {
    card.rainbowStars = (card.rainbowStars || 0) + Math.floor(card.stars / 7);
    card.stars = card.stars % 7;
  }

  // Tăng cường chỉ số nền tảng của thẻ
  card.baseHp = Math.round(card.baseHp * 1.15);
  card.baseAtk = Math.round(card.baseAtk * 1.15);

  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();
  if (typeof renderForgeActiveCard === 'function') renderForgeActiveCard();
  if (typeof renderForgePickerList === 'function') renderForgePickerList();
  if (typeof renderDeckAndCollection === 'function') renderDeckAndCollection();
}

// 6. PHÂN TÁCH BỤI SAO (SCRAP SYSTEM)
function scrapSingleCard(uid) {
  const idx = gameState.player.inventory.findIndex(c => c.uid === uid);
  if (idx === -1) return;

  const card = gameState.player.inventory[idx];
  // Khóa an toàn: Không cho phép phân tách nhầm thẻ trong đội hình hoặc đã nâng sao
  const isInDeck = [...gameState.player.deck.main, ...gameState.player.deck.sub].some(c => c.uid === uid);
  if (isInDeck) {
    alert('Thẻ bài đang xuất chiến trong đội hình, không thể phân tách!');
    return;
  }
  if ((card.rainbowStars || 0) > 0 || (card.stars || 0) > 0) {
    if (!confirm('Thẻ này đã được nâng cấp Sao! Bạn có chắc chắn muốn phân tách không?')) return;
  }

  const cfg = CARD_RANKS_CONFIG[card.rank] || { scrapDust: 10, scrapSuperDust: 0 };
  gameState.player.normalDust += cfg.scrapDust;
  gameState.player.superDust += (cfg.scrapSuperDust || 0);

  gameState.player.inventory.splice(idx, 1);
  gameState.selectedForgeCardUid = null;

  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();
  if (typeof renderForgeActiveCard === 'function') renderForgeActiveCard();
  if (typeof renderForgePickerList === 'function') renderForgePickerList();
  if (typeof renderDeckAndCollection === 'function') renderDeckAndCollection();
}

function executeBatchScrap() {
  const selectedRanks = [];
  if (document.getElementById('chkScrapC')?.checked) selectedRanks.push('C');
  if (document.getElementById('chkScrapB')?.checked) selectedRanks.push('B');
  if (document.getElementById('chkScrapA')?.checked) selectedRanks.push('A');
  if (document.getElementById('chkScrapS')?.checked) selectedRanks.push('S');
  if (document.getElementById('chkScrapSSS')?.checked) selectedRanks.push('SSS');

  const deckUids = new Set([...gameState.player.deck.main, ...gameState.player.deck.sub].map(c => c.uid));
  
  let totalNormalDustGained = 0;
  let totalSuperDustGained = 0;
  let scrapCount = 0;

  // Lọc chỉ phân tách các thẻ KHÔNG có sao và KHÔNG nằm trong deck
  gameState.player.inventory = gameState.player.inventory.filter(card => {
    const isTargetRank = selectedRanks.includes(card.rank);
    const hasStars = (card.stars || 0) > 0 || (card.rainbowStars || 0) > 0;
    const inDeck = deckUids.has(card.uid);

    if (isTargetRank && !hasStars && !inDeck) {
      const cfg = CARD_RANKS_CONFIG[card.rank] || { scrapDust: 10, scrapSuperDust: 0 };
      totalNormalDustGained += cfg.scrapDust;
      totalSuperDustGained += (cfg.scrapSuperDust || 0);
      scrapCount++;
      return false; // Bị loại khỏi kho
    }
    return true; // Giữ lại
  });

  gameState.player.normalDust += totalNormalDustGained;
  gameState.player.superDust += totalSuperDustGained;

  saveLocalState();
  closeBatchScrapModal();
  if (typeof updateTopHUD === 'function') updateTopHUD();
  if (typeof renderDeckAndCollection === 'function') renderDeckAndCollection();
  if (typeof renderForgePickerList === 'function') renderForgePickerList();

  alert(`Đã phân tách thành công ${scrapCount} thẻ bài!\n+${totalNormalDustGained} 🌟 Bụi Thường\n+${totalSuperDustGained} 🌠 Bụi Siêu Cấp`);
}

// 7. MỞ RỘNG GHẾ DỰ BỊ VÀ TỐI ƯU HÓA ĐỘI HÌNH
function upgradeBenchCapacity() {
  if (gameState.player.benchCapacity >= 10) {
    alert('Ghế dự bị đã đạt giới hạn tối đa 10 ô!');
    return;
  }
  const cost = gameState.player.benchCapacity * 15;
  if (gameState.player.gems < cost) {
    alert(`Không đủ Tinh Thạch! Cần ${cost} 💎 để mở rộng ô tiếp theo.`);
    return;
  }

  gameState.player.gems -= cost;
  gameState.player.benchCapacity++;
  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();
  if (typeof renderDeckAndCollection === 'function') renderDeckAndCollection();
}

function autoOptimizeFormation() {
  if (gameState.player.inventory.length === 0) return;

  // Sắp xếp kho theo thứ tự lực chiến thẻ bài giảm dần
  const sortedInventory = [...gameState.player.inventory].sort((a, b) => {
    return calculateCardPower(b) - calculateCardPower(a);
  });

  // Chọn 5 thẻ mạnh nhất làm Tiên Phong
  gameState.player.deck.main = sortedInventory.slice(0, 5);

  // Chọn các thẻ mạnh tiếp theo đưa vào Ghế Dự Bị theo sức chứa
  const remaining = sortedInventory.slice(5);
  gameState.player.deck.sub = remaining.slice(0, gameState.player.benchCapacity);

  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();
  if (typeof renderDeckAndCollection === 'function') renderDeckAndCollection();
}
