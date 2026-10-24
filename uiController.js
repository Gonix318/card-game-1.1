/* ==========================================================================
   MODULE 10/10: UI CONTROLLER & DOM INTERACTIONS - CYBERRANK & GACHA 3D
   ========================================================================== */

let currentPackSize = 25;
let currentRevealCards = [];
let minigameInterval = null;
let minigameSpawnInterval = null;
let minigameTimeLeft = 30;
let minigameScore = 0;
let minigameGold = 0;
let minigameGems = 0;
let currentInventoryFilter = 'ALL';
let currentForgeFilter = 'ALL';

// 1. KHỞI TẠO HỆ THỐNG KHI TẢI TRANG
document.addEventListener('DOMContentLoaded', () => {
  // Nạp dữ liệu lưu trữ
  loadLocalState();

  // Khởi tạo Top HUD
  updateTopHUD();

  // Đăng ký sự kiện chuyển Tab
  initNavigationTabs();

  // Render các thành phần mặc định
  renderDeckAndCollection();
  renderForgePickerList();

  // Cập nhật giá các gói Gacha theo kích thước mặc định
  updateGachaButtonCosts();
});

// 2. CẬP NHẬT TOP HUD (OVR 11 BẬC & TÀI NGUYÊN)
function updateTopHUD() {
  const p = gameState.player;
  const nameEl = document.getElementById('playerDisplayName');
  const lvEl = document.getElementById('playerLevelTag');
  const expFill = document.getElementById('expFill');
  const expText = document.getElementById('expText');
  const ovrVal = document.getElementById('teamOvrScore');
  const ovrTier = document.getElementById('teamOvrTierTag');

  const goldEl = document.getElementById('goldDisplay');
  const gemEl = document.getElementById('gemDisplay');
  const dustEl = document.getElementById('dustDisplay');
  const superDustEl = document.getElementById('superDustDisplay');
  const cardsCountEl = document.getElementById('totalCardsCount');

  if (nameEl) nameEl.textContent = p.name;
  if (lvEl) lvEl.textContent = `Lv.${p.level}`;
  
  const expPct = Math.min(100, Math.round((p.exp / p.maxExp) * 100));
  if (expFill) expFill.style.width = `${expPct}%`;
  if (expText) expText.textContent = `${p.exp}/${p.maxExp} EXP (${expPct}%)`;

  // Tính toán OVR và 11 Bậc CyberRank
  const teamOvr = calculateTeamOVR();
  const tierInfo = getCyberRankTier(teamOvr);

  if (ovrVal) ovrVal.textContent = teamOvr.toLocaleString('vi-VN');
  if (ovrTier) {
    ovrTier.textContent = tierInfo.name;
    // Xóa hết class cũ, áp dụng class bậc mới (bao gồm .tier-the-error)
    ovrTier.className = `ovr-tier-tag ${tierInfo.className}`;
  }

  if (goldEl) goldEl.textContent = (p.gold || 0).toLocaleString('vi-VN');
  if (gemEl) gemEl.textContent = (p.gems || 0).toLocaleString('vi-VN');
  if (dustEl) dustEl.textContent = (p.normalDust || 0).toLocaleString('vi-VN');
  if (superDustEl) superDustEl.textContent = (p.superDust || 0).toLocaleString('vi-VN');
  if (cardsCountEl) cardsCountEl.textContent = p.inventory.length;

  // Cập nhật số ô dự bị tại shop
  const curBenchTxt = document.getElementById('currentBenchSlotsTxt');
  const benchCostTxt = document.getElementById('benchUpgradeCostTxt');
  if (curBenchTxt) curBenchTxt.textContent = p.benchCapacity;
  if (benchCostTxt) benchCostTxt.textContent = `Chi phí: ${p.benchCapacity * 15} 💎`;
}

// 3. ĐIỀU HƯỚNG TABS
function initNavigationTabs() {
  const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
  const panes = document.querySelectorAll('.tab-pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      if (!targetId) return;

      navBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      // Refresh dữ liệu theo từng tab
      if (targetId === 'deckTab') renderDeckAndCollection();
      if (targetId === 'forgeTab') {
        renderForgeActiveCard();
        renderForgePickerList();
      }
    });
  });
}

// 4. RENDER ĐỘI HÌNH & KHO THẺ
function renderDeckAndCollection() {
  const mainRow = document.getElementById('deckMainRow');
  const subRow = document.getElementById('deckSubRow');
  const subBadge = document.getElementById('deckSubCountBadge');
  const colGrid = document.getElementById('collectionGrid');

  if (subBadge) subBadge.textContent = gameState.player.benchCapacity;

  // Render 5 Tiên Phong
  if (mainRow) {
    mainRow.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const card = gameState.player.deck.main[i];
      mainRow.appendChild(createDeckSlotCard(card, 'MAIN', i));
    }
  }

  // Render Ghế Dự Bị theo sức chứa
  if (subRow) {
    subRow.innerHTML = '';
    for (let i = 0; i < gameState.player.benchCapacity; i++) {
      const card = gameState.player.deck.sub[i];
      subRow.appendChild(createDeckSlotCard(card, 'SUB', i));
    }
  }

  // Render Kho thẻ có lọc
  if (colGrid) {
    let list = [...gameState.player.inventory];
    if (currentInventoryFilter !== 'ALL') {
      list = list.filter(c => c.rank === currentInventoryFilter);
    }

    colGrid.innerHTML = list.map(c => renderCardMiniTemplate(c, 'COLLECTION')).join('');
  }
}

function createDeckSlotCard(card, slotType, index) {
  const div = document.createElement('div');
  if (!card) {
    div.className = 'battle-card empty-slot';
    div.style.justifyContent = 'center';
    div.style.borderStyle = 'dashed';
    div.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">Ô Trống #${index + 1}</span>`;
    return div;
  }

  div.className = `battle-card rank-${(card.rank || 'c').toLowerCase()} ${card.eventExclusive ? 'rank-event_exclusive' : ''}`;
  
  const hasRainbow = (card.rainbowStars || 0) > 0;
  const starsDisplay = hasRainbow 
    ? `<span class="rainbow-badge-txt">${card.rainbowStars}🌈</span> ${'⭐'.repeat(card.stars || 0)}`
    : '⭐'.repeat(card.stars || 0);

  div.innerHTML = `
    <span class="card-element-tag">${card.elementInfo?.icon || ELEMENTS[card.element]?.icon || '✨'}</span>
    <span class="card-rank-tag">${card.rank}</span>
    <div class="card-stars ${hasRainbow ? 'has-rainbow' : ''}">${starsDisplay}</div>
    <div class="card-art-emoji">${card.eventExclusive ? '🃏' : '🧙'}</div>
    <div class="card-title">${card.name}</div>
    <div class="card-combat-stats">
      <span class="atk">⚔️ ${card.baseAtk}</span>
      <span class="spd">⚡ ${card.baseSpd}</span>
    </div>
    <button class="btn-danger-outline" style="font-size:10px; padding:2px 4px; margin-top:4px; width:100%;" 
            onclick="removeCardFromDeck('${slotType}', ${index})">GỠ THẺ</button>
  `;
  return div;
}

function renderCardMiniTemplate(card, context) {
  const hasRainbow = (card.rainbowStars || 0) > 0;
  const starsDisplay = hasRainbow 
    ? `<span class="rainbow-badge-txt">${card.rainbowStars}🌈</span> ${'⭐'.repeat(card.stars || 0)}`
    : '⭐'.repeat(card.stars || 0);

  const isInMain = gameState.player.deck.main.some(c => c.uid === card.uid);
  const isInSub = gameState.player.deck.sub.some(c => c.uid === card.uid);
  const inUse = isInMain ? 'TIÊN PHONG' : (isInSub ? 'DỰ BỊ' : null);

  return `
    <div class="battle-card rank-${(card.rank || 'c').toLowerCase()} ${card.eventExclusive ? 'rank-event_exclusive' : ''}">
      <span class="card-element-tag">${card.elementInfo?.icon || ELEMENTS[card.element]?.icon || '✨'}</span>
      <span class="card-rank-tag">${card.rank}</span>
      <div class="card-stars ${hasRainbow ? 'has-rainbow' : ''}">${starsDisplay}</div>
      <div class="card-art-emoji">${card.eventExclusive ? '🃏' : '🧙'}</div>
      <div class="card-title">${card.name}</div>
      <div class="card-combat-stats">
        <span class="atk">⚔️ ${card.baseAtk}</span>
        <span class="spd">⚡ ${card.baseSpd}</span>
      </div>
      ${inUse ? `
        <span style="font-size:10px; color:var(--cyan-neon); font-weight:700; margin-top:4px;">${inUse}</span>
      ` : `
        <div style="display:flex; gap:2px; width:100%; margin-top:4px;">
          <button class="btn-cyan-outline" style="font-size:9px; padding:2px; flex:1;" onclick="assignCardToDeck('${card.uid}', 'MAIN')">CHÍNH</button>
          <button class="btn-gold" style="font-size:9px; padding:2px; flex:1;" onclick="assignCardToDeck('${card.uid}', 'SUB')">DỰ BỊ</button>
        </div>
      `}
    </div>
  `;
}

function assignCardToDeck(uid, slotType) {
  const card = gameState.player.inventory.find(c => c.uid === uid);
  if (!card) return;

  // Xóa khỏi vị trí cũ nếu đang gắn
  gameState.player.deck.main = gameState.player.deck.main.filter(c => c.uid !== uid);
  gameState.player.deck.sub = gameState.player.deck.sub.filter(c => c.uid !== uid);

  if (slotType === 'MAIN') {
    if (gameState.player.deck.main.length >= 5) {
      alert('Đội hình Tiên Phong đã đủ 5 thẻ! Hãy gỡ bớt thẻ cũ trước.');
      return;
    }
    gameState.player.deck.main.push(card);
  } else {
    if (gameState.player.deck.sub.length >= gameState.player.benchCapacity) {
      alert(`Ghế Dự Bị đã đầy (${gameState.player.benchCapacity} ô)! Hãy mở rộng thêm tại Cửa Hàng.`);
      return;
    }
    gameState.player.deck.sub.push(card);
  }

  saveLocalState();
  updateTopHUD();
  renderDeckAndCollection();
}

function removeCardFromDeck(slotType, index) {
  if (slotType === 'MAIN') {
    gameState.player.deck.main.splice(index, 1);
  } else {
    gameState.player.deck.sub.splice(index, 1);
  }
  saveLocalState();
  updateTopHUD();
  renderDeckAndCollection();
}

function filterCards(rank) {
  currentInventoryFilter = rank;
  const btns = document.querySelectorAll('.inventory-collection-box .filter-btn');
  btns.forEach(b => b.classList.remove('active'));
  event?.target?.classList.add('active');
  renderDeckAndCollection();
}

// 5. GACHA & MỞ GÓI CHIÊU MỘ
function setPackSize(size) {
  currentPackSize = size;
  const btns = document.querySelectorAll('.pack-size-selector-bar .btn-size');
  btns.forEach(b => b.classList.remove('active'));
  event?.target?.classList.add('active');
  updateGachaButtonCosts();
}

function updateGachaButtonCosts() {
  const btnB = document.getElementById('btnBuyBronze');
  const btnS = document.getElementById('btnBuySilver');
  const btnG = document.getElementById('btnBuyGold');
  const btnD = document.getElementById('btnBuyDiamond');

  if (btnB) btnB.textContent = `MỞ x${currentPackSize} (${(GACHA_PACKS_CONFIG.BRONZE.costGold * currentPackSize).toLocaleString('vi-VN')} 🪙)`;
  if (btnS) btnS.textContent = `MỞ x${currentPackSize} (${(GACHA_PACKS_CONFIG.SILVER.costGold * currentPackSize).toLocaleString('vi-VN')} 🪙)`;
  if (btnG) btnG.textContent = `MỞ x${currentPackSize} (${(GACHA_PACKS_CONFIG.GOLD.costGold * currentPackSize).toLocaleString('vi-VN')} 🪙)`;
  if (btnD) btnD.textContent = `MỞ x${currentPackSize} (${(GACHA_PACKS_CONFIG.DIAMOND.costGold * currentPackSize).toLocaleString('vi-VN')} 🪙)`;
}

function buyGachaPack(packKey) {
  const cfg = GACHA_PACKS_CONFIG[packKey];
  if (!cfg) return;

  const totalCost = cfg.costGold * currentPackSize;
  if (gameState.player.gold < totalCost) {
    alert(`Không đủ Vàng! Cần ${totalCost.toLocaleString('vi-VN')} 🪙.`);
    return;
  }

  gameState.player.gold -= totalCost;
  executeGachaRoll(cfg.rates, currentPackSize);
}

function buyGemGachaPack(boxType, count) {
  const cfg = boxType === 'RARE' ? GACHA_PACKS_CONFIG.GEM_RARE : GACHA_PACKS_CONFIG.GEM_MYTHIC;
  const totalCost = count === 1 ? cfg.costGemsSingle : cfg.costGemsTen;

  if (gameState.player.gems < totalCost) {
    alert(`Không đủ Tinh Thạch! Cần ${totalCost} 💎.`);
    return;
  }

  gameState.player.gems -= totalCost;
  executeGachaRoll(cfg.rates, count);
}

function executeGachaRoll(rates, count) {
  const pulledCards = [];

  for (let i = 0; i < count; i++) {
    const rolledRank = rollRankByRate(rates);
    let chosenCard;

    if (rolledRank === 'EVENT_EXCLUSIVE') {
      chosenCard = EVENT_JOKER_CARD;
    } else if (rolledRank === 'EVENT') {
      chosenCard = HALLOWEEN_EVENT_CARDS[Math.floor(Math.random() * HALLOWEEN_EVENT_CARDS.length)];
    } else {
      const candidates = MASTER_CARD_DATABASE.filter(c => c.rank === rolledRank && !c.eventExclusive);
      chosenCard = candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
    }

    const newCardInstance = {
      ...chosenCard,
      uid: `CARD_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      stars: 0,
      rainbowStars: 0
    };

    gameState.player.inventory.push(newCardInstance);
    pulledCards.push(newCardInstance);
  }

  saveLocalState();
  updateTopHUD();

  // Chuyển sang màn hình lật thẻ 3D
  displayGachaReveal(pulledCards);
}

function rollRankByRate(rates) {
  const rand = Math.random();
  let cumulative = 0;

  for (const [rank, probability] of Object.entries(rates)) {
    cumulative += probability;
    if (rand < cumulative) {
      return rank;
    }
  }
  return 'C';
}

function displayGachaReveal(cards) {
  currentRevealCards = cards;
  const storeView = document.getElementById('gachaStoreView');
  const revealView = document.getElementById('gachaRevealView');
  const grid = document.getElementById('cardsRevealGrid');
  const closeBtn = document.getElementById('closeRevealBtn');

  if (storeView) storeView.classList.add('hidden');
  if (revealView) revealView.classList.remove('hidden');
  if (closeBtn) closeBtn.classList.remove('hidden');

  if (grid) {
    grid.innerHTML = cards.map((c, idx) => `
      <div class="card-3d-wrap" id="revealCard_${idx}" onclick="flipSingleCard(${idx})">
        <div class="card-inner">
          <div class="card-back">🎴</div>
          <div class="card-front rank-${(c.rank || 'c').toLowerCase()} ${c.eventExclusive ? 'rank-event_exclusive' : ''}">
            <span class="card-element-tag">${c.elementInfo?.icon || ELEMENTS[c.element]?.icon || '✨'}</span>
            <span class="card-rank-tag">${c.rank}</span>
            <div class="card-art-emoji">${c.eventExclusive ? '🃏' : '🧙'}</div>
            <div class="card-title">${c.name}</div>
            <div class="card-combat-stats">
              <span class="atk">⚔️ ${c.baseAtk}</span>
              <span class="spd">⚡ ${c.baseSpd}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

function flipSingleCard(idx) {
  const cardEl = document.getElementById(`revealCard_${idx}`);
  if (cardEl) {
    cardEl.classList.add('flipped');
  }
}

function skipPackReveal() {
  const allCards = document.querySelectorAll('.card-3d-wrap');
  allCards.forEach(c => c.classList.add('flipped'));
}

function finishPackOpening() {
  const storeView = document.getElementById('gachaStoreView');
  const revealView = document.getElementById('gachaRevealView');
  if (revealView) revealView.classList.add('hidden');
  if (storeView) storeView.classList.remove('hidden');
  renderDeckAndCollection();
}

// 6. LÒ RÈN BỤI SAO & CẢNH GIỚI NON-STOP
function renderForgeActiveCard() {
  const box = document.getElementById('forgeTargetBox');
  const btnUpgrade = document.getElementById('btnExecuteUpgrade');
  const btnScrap = document.getElementById('btnScrapSelectedCard');
  const reqDustEl = document.getElementById('reqDust');
  const reqSuperDustEl = document.getElementById('reqSuperDust');
  const scrapPreview = document.getElementById('scrapValuePreview');

  const uid = gameState.selectedForgeCardUid;
  const card = gameState.player.inventory.find(c => c.uid === uid);

  if (!card) {
    if (box) box.innerHTML = '<div class="forge-empty-prompt">Bấm "Chọn Rèn" ở danh sách bên phải để đưa thẻ vào lò</div>';
    if (btnUpgrade) btnUpgrade.disabled = true;
    if (btnScrap) btnScrap.disabled = true;
    if (reqDustEl) reqDustEl.textContent = '🌟 Bụi Sao Thường: 0 / 0';
    if (reqSuperDustEl) reqSuperDustEl.textContent = '🌠 Bụi Sao Siêu Cấp: Không cần';
    if (scrapPreview) scrapPreview.textContent = 'Nhận: - Bụi Sao';
    return;
  }

  const cost = getForgeUpgradeCost(card);
  const cfg = CARD_RANKS_CONFIG[card.rank] || { scrapDust: 10, scrapSuperDust: 0 };

  const hasRainbow = (card.rainbowStars || 0) > 0;
  const starsDisplay = hasRainbow 
    ? `<span class="rainbow-badge-txt">${card.rainbowStars}🌈</span> ${'⭐'.repeat(card.stars || 0)}`
    : '⭐'.repeat(card.stars || 0);

  if (box) {
    box.innerHTML = `
      <div class="battle-card rank-${(card.rank || 'c').toLowerCase()} ${card.eventExclusive ? 'rank-event_exclusive' : ''}">
        <span class="card-element-tag">${card.elementInfo?.icon || ELEMENTS[card.element]?.icon || '✨'}</span>
        <span class="card-rank-tag">${card.rank}</span>
        <div class="card-stars ${hasRainbow ? 'has-rainbow' : ''}">${starsDisplay}</div>
        <div class="card-art-emoji">${card.eventExclusive ? '🃏' : '🧙'}</div>
        <div class="card-title">${card.name}</div>
        <div class="card-combat-stats">
          <span class="atk">⚔️ ${card.baseAtk}</span>
          <span class="spd">⚡ ${card.baseSpd}</span>
        </div>
      </div>
    `;
  }

  if (reqDustEl) reqDustEl.textContent = `🌟 Bụi Sao Thường: ${gameState.player.normalDust.toLocaleString('vi-VN')} / ${cost.reqNormalDust.toLocaleString('vi-VN')}`;
  if (reqSuperDustEl) {
    reqSuperDustEl.textContent = cost.willBecomeRainbow
      ? `🌠 ĐỘT PHÁ CẦU VỒNG 🌈! Cần: ${gameState.player.superDust} / ${cost.reqSuperDust} Bụi Siêu Cấp`
      : '🌠 Bụi Sao Siêu Cấp: Không cần (Chưa tới mốc 7 sao)';
  }

  if (scrapPreview) {
    scrapPreview.textContent = `Phân tách thẻ này nhận lại: +${cfg.scrapDust} 🌟 | +${cfg.scrapSuperDust || 0} 🌠`;
  }

  const canAfford = gameState.player.normalDust >= cost.reqNormalDust && gameState.player.superDust >= cost.reqSuperDust;
  if (btnUpgrade) btnUpgrade.disabled = !canAfford;
  if (btnScrap) btnScrap.disabled = false;
}

function renderForgePickerList() {
  const container = document.getElementById('forgeCardsPicker');
  if (!container) return;

  let list = [...gameState.player.inventory];
  if (currentForgeFilter !== 'ALL') {
    list = list.filter(c => c.rank === currentForgeFilter);
  }

  container.innerHTML = list.map(c => {
    const isSelected = gameState.selectedForgeCardUid === c.uid;
    const hasRainbow = (c.rainbowStars || 0) > 0;
    const starsDisplay = hasRainbow 
      ? `<span class="rainbow-badge-txt">${c.rainbowStars}🌈</span> ${'⭐'.repeat(c.stars || 0)}`
      : '⭐'.repeat(c.stars || 0);

    return `
      <div class="picker-card-item ${isSelected ? 'selected-target' : ''}">
        <span style="font-size:10px; font-weight:700;">${c.rank}</span>
        <div class="card-stars" style="font-size:9px;">${starsDisplay}</div>
        <div style="font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">
          ${c.name}
        </div>
        <button class="btn-select-for-forge" onclick="selectCardForForge('${c.uid}')">CHỌN RÈN</button>
      </div>
    `;
  }).join('');
}

function selectCardForForge(uid) {
  gameState.selectedForgeCardUid = uid;
  renderForgeActiveCard();
  renderForgePickerList();
}

function filterForgeCards(rank) {
  currentForgeFilter = rank;
  const btns = document.querySelectorAll('.forge-picker-filter .filter-btn');
  btns.forEach(b => b.classList.remove('active'));
  event?.target?.classList.add('active');
  renderForgePickerList();
}

function scrapSelectedCard() {
  if (gameState.selectedForgeCardUid) {
    scrapSingleCard(gameState.selectedForgeCardUid);
  }
}

// 7. PHÂN TÁCH HÀNG LOẠT MODAL
function openBatchScrapModal() {
  const modal = document.getElementById('batchScrapModal');
  if (modal) {
    modal.classList.remove('hidden');
    updateBatchScrapPreview();
  }
}

function closeBatchScrapModal() {
  const modal = document.getElementById('batchScrapModal');
  if (modal) modal.classList.add('hidden');
}

function updateBatchScrapPreview() {
  const selectedRanks = [];
  if (document.getElementById('chkScrapC')?.checked) selectedRanks.push('C');
  if (document.getElementById('chkScrapB')?.checked) selectedRanks.push('B');
  if (document.getElementById('chkScrapA')?.checked) selectedRanks.push('A');
  if (document.getElementById('chkScrapS')?.checked) selectedRanks.push('S');
  if (document.getElementById('chkScrapSSS')?.checked) selectedRanks.push('SSS');

  const deckUids = new Set([...gameState.player.deck.main, ...gameState.player.deck.sub].map(c => c.uid));

  let count = 0;
  let totalDust = 0;
  let totalSuperDust = 0;

  gameState.player.inventory.forEach(c => {
    const hasStars = (c.stars || 0) > 0 || (c.rainbowStars || 0) > 0;
    if (selectedRanks.includes(c.rank) && !hasStars && !deckUids.has(c.uid)) {
      count++;
      const cfg = CARD_RANKS_CONFIG[c.rank] || { scrapDust: 10, scrapSuperDust: 0 };
      totalDust += cfg.scrapDust;
      totalSuperDust += (cfg.scrapSuperDust || 0);
    }
  });

  const countTxt = document.getElementById('batchScrapCount');
  const dustTxt = document.getElementById('batchDustPreview');
  const superDustTxt = document.getElementById('batchSuperDustPreview');
  const confirmBtn = document.getElementById('btnConfirmBatchScrap');

  if (countTxt) countTxt.textContent = count;
  if (dustTxt) dustTxt.textContent = `+${totalDust.toLocaleString('vi-VN')}`;
  if (superDustTxt) superDustTxt.textContent = `+${totalSuperDust}`;
  if (confirmBtn) confirmBtn.disabled = count === 0;
}

// 8. CỬA HÀNG VẬT PHẨM & CHỢ GIAO THƯƠNG
function buyBuff(buffType, costGems) {
  if (gameState.player.gems < costGems) {
    alert(`Không đủ Tinh Thạch! Cần ${costGems} 💎.`);
    return;
  }
  gameState.player.gems -= costGems;
  gameState.player.buffInventory[buffType] = (gameState.player.buffInventory[buffType] || 0) + 1;
  saveLocalState();
  updateTopHUD();
  alert(`Mua thành công 1x Buff [${buffType}]!`);
}

function exchangeResource(type) {
  const p = gameState.player;
  switch (type) {
    case 'GOLD_TO_GEMS':
      if (p.gold < 10000) return alert('Không đủ 10,000 🪙');
      p.gold -= 10000; p.gems += 15; break;
    case 'GOLD_TO_DUST':
      if (p.gold < 8000) return alert('Không đủ 8,000 🪙');
      p.gold -= 8000; p.normalDust += 250; break;
    case 'GOLD_TO_SUPERDUST':
      if (p.gold < 35000) return alert('Không đủ 35,000 🪙');
      p.gold -= 35000; p.superDust += 1; break;
    case 'GEMS_TO_GOLD':
      if (p.gems < 20) return alert('Không đủ 20 💎');
      p.gems -= 20; p.gold += 10000; break;
    case 'GEMS_TO_DUST':
      if (p.gems < 20) return alert('Không đủ 20 💎');
      p.gems -= 20; p.normalDust += 500; break;
    case 'GEMS_TO_SUPERDUST':
      if (p.gems < 35) return alert('Không đủ 35 💎');
      p.gems -= 35; p.superDust += 1; break;
    case 'DUST_TO_GOLD':
      if (p.normalDust < 500) return alert('Không đủ 500 🌟');
      p.normalDust -= 500; p.gold += 4000; break;
    case 'DUST_TO_GEMS':
      if (p.normalDust < 800) return alert('Không đủ 800 🌟');
      p.normalDust -= 800; p.gems += 15; break;
    case 'DUST_TO_SUPERDUST':
      if (p.normalDust < 1000) return alert('Không đủ 1,000 🌟');
      p.normalDust -= 1000; p.superDust += 1; break;
    case 'SUPERDUST_TO_DUST':
      if (p.superDust < 1) return alert('Không đủ 1 🌠');
      p.superDust -= 1; p.normalDust += 650; break;
    case 'SUPERDUST_TO_GEMS':
      if (p.superDust < 1) return alert('Không đủ 1 🌠');
      p.superDust -= 1; p.gems += 20; break;
    case 'SUPERDUST_TO_GOLD':
      if (p.superDust < 1) return alert('Không đủ 1 🌠');
      p.superDust -= 1; p.gold += 20000; break;
  }
  saveLocalState();
  updateTopHUD();
}

// 9. THỬ THÁCH MINIGAME 30 GIÂY
function startMinigame() {
  if (minigameInterval) clearInterval(minigameInterval);
  if (minigameSpawnInterval) clearInterval(minigameSpawnInterval);

  minigameTimeLeft = 30;
  minigameScore = 0;
  minigameGold = 0;
  minigameGems = 0;

  const canvas = document.getElementById('minigameField');
  if (canvas) canvas.innerHTML = '';

  updateMinigameHUD();

  minigameInterval = setInterval(() => {
    minigameTimeLeft--;
    updateMinigameHUD();
    if (minigameTimeLeft <= 0) {
      endMinigame();
    }
  }, 1000);

  minigameSpawnInterval = setInterval(spawnMinigameTarget, 450);
}

function updateMinigameHUD() {
  const tEl = document.getElementById('minigameTimer');
  const sEl = document.getElementById('minigameScore');
  const gEl = document.getElementById('minigameGoldEarned');
  const gmEl = document.getElementById('minigameGemsEarned');

  if (tEl) tEl.textContent = `${minigameTimeLeft}s`;
  if (sEl) sEl.textContent = minigameScore;
  if (gEl) gEl.textContent = minigameGold.toLocaleString('vi-VN');
  if (gmEl) gmEl.textContent = minigameGems;
}

function spawnMinigameTarget() {
  const canvas = document.getElementById('minigameField');
  if (!canvas) return;

  const rand = Math.random();
  const target = document.createElement('div');

  const x = Math.max(10, Math.floor(Math.random() * (canvas.clientWidth - 50)));
  const y = Math.max(10, Math.floor(Math.random() * (canvas.clientHeight - 50)));

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;

  if (rand < 0.65) {
    // ĐỒNG XU VÀNG 🪙
    target.className = 'coin-target';
    target.textContent = '🪙';
    target.onclick = () => {
      minigameScore += 10;
      minigameGold += 120;
      target.remove();
      updateMinigameHUD();
    };
  } else if (rand < 0.85) {
    // TINH THẠCH 💎
    target.className = 'gem-target';
    target.textContent = '💎';
    target.onclick = () => {
      minigameScore += 25;
      minigameGems += 1;
      target.remove();
      updateMinigameHUD();
    };
  } else {
    // BOM NÉ 💣
    target.className = 'bomb-target';
    target.textContent = '💣';
    target.onclick = () => {
      minigameScore = Math.max(0, minigameScore - 30);
      minigameGold = Math.max(0, minigameGold - 300);
      target.remove();
      updateMinigameHUD();
    };
  }

  canvas.appendChild(target);

  // Biến mất sau 1.2s nếu không bấm
  setTimeout(() => {
    if (target.parentNode) target.remove();
  }, 1200);
}

function endMinigame() {
  clearInterval(minigameInterval);
  clearInterval(minigameSpawnInterval);

  gameState.player.gold += minigameGold;
  gameState.player.gems += minigameGems;
  addPlayerExp(Math.round(minigameScore * 0.8));

  saveLocalState();
  updateTopHUD();

  alert(`🎯 HẾT GIỜ!\n\nĐiểm số: ${minigameScore}\n🪙 +${minigameGold.toLocaleString('vi-VN')} Vàng\n💎 +${minigameGems} Tinh Thạch`);

  const canvas = document.getElementById('minigameField');
  if (canvas) {
    canvas.innerHTML = '<div class="welcome-minigame-text">Thử thách kết thúc! Bấm "BẮT ĐẦU CHƠI" để tiếp tục luyện tay.</div>';
  }
}
