/* ==========================================================================
   MODULE 9/10: BATTLE ENGINE & COMBAT SYSTEM - CYBERRANK & JOKER CUTSCENE
   ========================================================================== */

// 1. TRẠNG THÁI TRẬN ĐẤU (BATTLE SESSION STATE)
const battleSession = {
  active: false,
  isPlayerTurn: true,
  turnNumber: 1,
  selectedAttackerUid: null,
  activeBuffs: {
    shieldActive: false,
    overloadActive: false,
    hasteActive: false,
    jokerDeathDeckBonus: 1.0 // Hệ số x1.7 nếu nổ 5% của Joker
  },
  playerField: [],
  playerBench: [],
  botField: [],
  botBench: [],
  matchType: 'BOT', // BOT hoặc BOSS
  targetBotTier: 1
};

// 2. BỘ TỔNG HỢP ÂM THANH CUTSCENE BẰNG WEB AUDIO API
let webAudioContext = null;

function initWebAudio() {
  if (!webAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    webAudioContext = new AudioContextClass();
  }
  if (webAudioContext.state === 'suspended') {
    webAudioContext.resume();
  }
  return webAudioContext;
}

function playSynthesizedJokerCutsceneSfx() {
  try {
    const ctx = initWebAudio();
    const now = ctx.currentTime;

    // LỚP 1: Tiếng rè nhiễu sóng màn hình rách (0.0s - 0.7s)
    const bufferSize = Math.floor(ctx.sampleRate * 0.7);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1100, now);
    noiseFilter.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // LỚP 2: Còi báo động ma quái dồn dập (0.5s - 2.5s)
    const riserOsc = ctx.createOscillator();
    const riserGain = ctx.createGain();

    riserOsc.type = 'sawtooth';
    riserOsc.frequency.setValueAtTime(110, now + 0.5);
    riserOsc.frequency.exponentialRampToValueAtTime(950, now + 2.45);

    riserGain.gain.setValueAtTime(0.01, now + 0.5);
    riserGain.gain.linearRampToValueAtTime(0.7, now + 2.3);
    riserGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    riserOsc.connect(riserGain);
    riserGain.connect(ctx.destination);
    riserOsc.start(now + 0.5);
    riserOsc.stop(now + 2.5);

    // LỚP 3: Cú nổ Bùmmm Bass Drop kết liễu trận đấu (2.45s)
    setTimeout(() => {
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();

      boomOsc.type = 'sine';
      boomOsc.frequency.setValueAtTime(180, ctx.currentTime);
      boomOsc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.8);

      boomGain.gain.setValueAtTime(1.0, ctx.currentTime);
      boomGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      boomOsc.connect(boomGain);
      boomGain.connect(ctx.destination);

      boomOsc.start(ctx.currentTime);
      boomOsc.stop(ctx.currentTime + 0.8);
    }, 2450);

  } catch (err) {
    console.warn('Web Audio API gặp sự cố kích hoạt:', err);
  }
}

// 3. KHỞI TẠO ĐỘI HÌNH BOT / BOSS BÁM ĐUỔI THEO TEAM OVR
function generateDynamicOpponentDeck(ovrMultiplier, benchCount = 2) {
  const playerOvr = calculateTeamOVR();
  const targetOvr = Math.max(250, Math.round(playerOvr * ovrMultiplier));
  const baseCardPower = targetOvr / 0.8 / 5; // Tính sức mạnh bình quân mỗi thẻ

  const pool = MASTER_CARD_DATABASE.filter(c => !c.eventExclusive);
  const generatedMain = [];
  const generatedSub = [];

  for (let i = 0; i < 5; i++) {
    const raw = pool[Math.floor(Math.random() * pool.length)];
    const hpScale = Math.round(baseCardPower * 0.95);
    const atkScale = Math.round(baseCardPower * 0.22);
    generatedMain.push({
      ...raw,
      uid: `BOT_MAIN_${i}_${Date.now()}`,
      currentHp: hpScale,
      maxHp: hpScale,
      combatAtk: atkScale,
      combatSpd: raw.baseSpd,
      stars: Math.floor(Math.random() * 5),
      rainbowStars: 0,
      isStunned: false
    });
  }

  for (let i = 0; i < benchCount; i++) {
    const raw = pool[Math.floor(Math.random() * pool.length)];
    const hpScale = Math.round(baseCardPower * 0.85);
    const atkScale = Math.round(baseCardPower * 0.20);
    generatedSub.push({
      ...raw,
      uid: `BOT_SUB_${i}_${Date.now()}`,
      currentHp: hpScale,
      maxHp: hpScale,
      combatAtk: atkScale,
      combatSpd: raw.baseSpd,
      stars: 0,
      rainbowStars: 0,
      isStunned: false
    });
  }

  return { main: generatedMain, sub: generatedSub };
}

// 4. BẮT ĐẦU VÀ THIẾT LẬP TRẬN ĐẤU
function startQuickMatch(botTier) {
  initWebAudio();

  if (!gameState.player.deck.main || gameState.player.deck.main.length === 0) {
    alert('Vui lòng xếp ít nhất 1 thẻ Tiên Phong vào đội hình trước khi ra trận!');
    return;
  }

  const multiplierMap = { 1: 0.98, 2: 1.08, 3: 1.18, 4: 1.28, 5: 1.45 };
  const targetMultiplier = multiplierMap[botTier] || 1.0;

  battleSession.active = true;
  battleSession.matchType = 'BOT';
  battleSession.targetBotTier = botTier;
  battleSession.turnNumber = 1;
  battleSession.isPlayerTurn = true;
  battleSession.selectedAttackerUid = null;
  battleSession.activeBuffs = {
    shieldActive: false,
    overloadActive: false,
    hasteActive: false,
    jokerDeathDeckBonus: 1.0
  };

  // Khởi tạo thẻ phía người chơi
  battleSession.playerField = gameState.player.deck.main.map(card => {
    const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);
    const starMult = 1 + effectiveStars * 0.18;
    const maxHp = Math.round(card.baseHp * starMult);
    return {
      ...card,
      currentHp: maxHp,
      maxHp: maxHp,
      combatAtk: Math.round(card.baseAtk * starMult),
      combatSpd: card.baseSpd,
      isStunned: false
    };
  });

  battleSession.playerBench = gameState.player.deck.sub.map(card => {
    const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);
    const starMult = 1 + effectiveStars * 0.18;
    const maxHp = Math.round(card.baseHp * starMult);
    return {
      ...card,
      currentHp: maxHp,
      maxHp: maxHp,
      combatAtk: Math.round(card.baseAtk * starMult),
      combatSpd: card.baseSpd,
      isStunned: false
    };
  });

  // Khởi tạo phía Bot
  const botDeck = generateDynamicOpponentDeck(targetMultiplier, Math.min(4, botTier));
  battleSession.botField = botDeck.main;
  battleSession.botBench = botDeck.sub;

  // Chuyển giao diện sang sàn đấu trực chiến
  document.getElementById('botSelectView')?.classList.add('hidden');
  document.getElementById('battleArenaView')?.classList.remove('hidden');

  logCombatAction(`⚔️ Trận đấu bắt đầu với Bot Cấp ${botTier}! Chọn thẻ bên bạn để tấn công.`);
  renderCombatArena();
}

function startBossRaid(bossType) {
  initWebAudio();

  let bossMultiplier = 1.8;
  let bossTitle = 'Hắc Long Vương';

  if (bossType === 'BOSS_FROST') {
    bossMultiplier = 1.9;
    bossTitle = 'Chúa Tể Băng Diệt';
  } else if (bossType === 'BOSS_THE_ERROR') {
    bossMultiplier = 2.05;
    bossTitle = 'THE ERROR Ma Thần';
  }

  battleSession.active = true;
  battleSession.matchType = 'BOSS';
  battleSession.turnNumber = 1;
  battleSession.isPlayerTurn = true;
  battleSession.selectedAttackerUid = null;
  battleSession.activeBuffs = {
    shieldActive: false,
    overloadActive: false,
    hasteActive: false,
    jokerDeathDeckBonus: 1.0
  };

  battleSession.playerField = gameState.player.deck.main.map(card => {
    const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);
    const starMult = 1 + effectiveStars * 0.18;
    const maxHp = Math.round(card.baseHp * starMult);
    return {
      ...card,
      currentHp: maxHp,
      maxHp: maxHp,
      combatAtk: Math.round(card.baseAtk * starMult),
      combatSpd: card.baseSpd,
      isStunned: false
    };
  });

  battleSession.playerBench = gameState.player.deck.sub.map(card => {
    const effectiveStars = (card.rainbowStars || 0) * 7 + (card.stars || 0);
    const starMult = 1 + effectiveStars * 0.18;
    const maxHp = Math.round(card.baseHp * starMult);
    return {
      ...card,
      currentHp: maxHp,
      maxHp: maxHp,
      combatAtk: Math.round(card.baseAtk * starMult),
      combatSpd: card.baseSpd,
      isStunned: false
    };
  });

  const bossDeck = generateDynamicOpponentDeck(bossMultiplier, 4);
  battleSession.botField = bossDeck.main;
  battleSession.botBench = bossDeck.sub;

  document.getElementById('botSelectView')?.classList.add('hidden');
  document.getElementById('battleArenaView')?.classList.remove('hidden');

  logCombatAction(`👾 Khiêu chiến Boss ${bossTitle} kích hoạt! Cảnh giác cao độ.`);
  renderCombatArena();
}

// 5. TƯƠNG TÁC CHỌN TƯỚNG VÀ XỬ LÝ ĐÒN ĐÁNH
function selectCombatAttacker(uid) {
  if (!battleSession.isPlayerTurn || !battleSession.active) return;
  const card = battleSession.playerField.find(c => c.uid === uid);
  if (!card || card.currentHp <= 0) return;
  if (card.isStunned) {
    logCombatAction(`⚠️ ${card.name} đang bị Choáng, không thể hành động!`);
    return;
  }

  battleSession.selectedAttackerUid = uid;
  logCombatAction(`👉 Đã chọn [${card.name}]. Hãy click vào thẻ đối thủ muốn công kích!`);
  renderCombatArena();
}

function selectCombatTarget(targetUid) {
  if (!battleSession.isPlayerTurn || !battleSession.active) return;
  if (!battleSession.selectedAttackerUid) {
    logCombatAction('⚠️ Vui lòng chọn 1 thẻ tiên phong bên bạn trước khi tấn công!');
    return;
  }

  const attacker = battleSession.playerField.find(c => c.uid === battleSession.selectedAttackerUid);
  const target = battleSession.botField.find(c => c.uid === targetUid);

  if (!attacker || !target || target.currentHp <= 0) return;

  // Thực hiện đòn tấn công của người chơi
  executePlayerAttack(attacker, target);
}

function executePlayerAttack(attacker, target) {
  // ==========================================
  // KIỂM TRA ĐẶC TÍNH ĐỘC QUYỀN: THE JOKER (1% / 5% / 10%)
  // ==========================================
  if (attacker.eventExclusive || attacker.id === 'CARD_EVENT_THE_JOKER') {
    const rng = Math.random();

    // 1% INSTANT WIN CUTSCENE
    if (rng < 0.01) {
      triggerJokerCutsceneInstantWin();
      return;
    }

    // 5% BỘ BÀI TỬ THẦN (BUFF x1.70 ATK VĨNH VIỄN)
    if (rng >= 0.01 && rng < 0.06) {
      battleSession.activeBuffs.jokerDeathDeckBonus = 1.70;
      logCombatAction(`🃏 [The Joker] Kích hoạt "Bộ Bài Tử Thần"! Toàn đội nhận +70% ATK đến hết trận.`);
      showMultiHitBurstVisual('DEATH DECK x1.7!');
    }

    // 10% NỤ CƯỜI QUÁI DỊ (CHOÁNG + 1% TRẢM 2 THẺ)
    if (rng >= 0.06 && rng < 0.16) {
      target.isStunned = true;
      logCombatAction(`🃏 [The Joker] Thả nụ cười rùng rợn! [${target.name}] bị Choáng 1 lượt!`);
      
      // 1% tỷ lệ trảm 2 tướng ngẫu nhiên bên trong
      if (Math.random() < 0.01) {
        const aliveBotCards = battleSession.botField.filter(c => c.currentHp > 0);
        const executeCount = Math.min(2, aliveBotCards.length);
        for (let i = 0; i < executeCount; i++) {
          aliveBotCards[i].currentHp = 0;
        }
        logCombatAction(`☠️ [The Joker] Trảm kích đoạt hồn 2 thẻ bài đối thủ cùng lúc!`);
      }
    }
  }

  // ==========================================
  // TÍNH TOÁN HỆ SỐ SÁT THƯƠNG
  // ==========================================
  let baseDamage = attacker.combatAtk;

  // Hệ số khắc chế nguyên tố (x1.35)
  const elemCfg = ELEMENTS[attacker.element];
  let isCritElem = false;
  if (elemCfg && elemCfg.strongAgainst === target.element) {
    baseDamage = Math.round(baseDamage * 1.35);
    isCritElem = true;
  }

  // Buff Bạo kích (Overload)
  if (battleSession.activeBuffs.overloadActive) {
    baseDamage = Math.round(baseDamage * 1.6);
    battleSession.activeBuffs.overloadActive = false;
    logCombatAction('⚡ Kích hoạt Bạo Kích Overload (+60% DMG)!');
  }

  // Buff Joker Death Deck (nếu có)
  baseDamage = Math.round(baseDamage * battleSession.activeBuffs.jokerDeathDeckBonus);

  // Số lần tấn công (Nếu bật buff Haste = 8 đòn liên tiếp)
  const strikeCount = battleSession.activeBuffs.hasteActive ? 8 : 1;
  battleSession.activeBuffs.hasteActive = false;

  let totalDealt = 0;
  for (let s = 0; s < strikeCount; s++) {
    const dmg = Math.round(baseDamage * (0.9 + Math.random() * 0.2));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    totalDealt += dmg;
  }

  // Kỹ năng chuỗi xung kích ADX
  if (attacker.id === 'CARD_EVENT_ADX' && attacker.targetType === 'CHAIN_PULSE') {
    const splashDmg = Math.round(totalDealt * 0.35);
    battleSession.botField.forEach(otherTarget => {
      if (otherTarget.uid !== target.uid && otherTarget.currentHp > 0) {
        otherTarget.currentHp = Math.max(0, otherTarget.currentHp - splashDmg);
      }
    });
    logCombatAction(`🛡️ [ADX] Phóng Bát Quái Xung Kích lan ${splashDmg} DMG sang toàn bộ phe địch!`);
  }

  logCombatAction(`💥 [${attacker.name}] tấn công [${target.name}], gây tổng cộng ${totalDealt} sát thương! ${isCritElem ? '(Khắc chế x1.35 🔥)' : ''}`);

  if (strikeCount > 1) {
    showMultiHitBurstVisual(`${strikeCount}x COMBO BURST!`);
  }

  // Dọn dẹp thẻ chết và đẩy thẻ dự bị lên
  handleFieldReplacements();

  // Kiểm tra điều kiện thắng trận
  if (checkBattleEndCondition()) return;

  // Chuyển lượt sang Bot
  battleSession.selectedAttackerUid = null;
  battleSession.isPlayerTurn = false;
  renderCombatArena();

  setTimeout(executeBotTurn, 1000);
}

// 6. LƯỢT HÀNH ĐỘNG CỦA BOT / BOSS
function executeBotTurn() {
  if (!battleSession.active) return;

  const activeBotCards = battleSession.botField.filter(c => c.currentHp > 0 && !c.isStunned);
  const activePlayerCards = battleSession.playerField.filter(c => c.currentHp > 0);

  // Hồi phục trạng thái choáng cho những thẻ bị choáng
  battleSession.botField.forEach(c => {
    if (c.isStunned) c.isStunned = false;
  });

  if (activeBotCards.length === 0 || activePlayerCards.length === 0) {
    checkBattleEndCondition();
    return;
  }

  // Bot chọn thẻ công kích
  const botAttacker = activeBotCards[Math.floor(Math.random() * activeBotCards.length)];

  // Chiến thuật Bot theo Tier:
  // Bot 3 trở lên ưu tiên dứt điểm thẻ yếu máu nhất
  let playerTarget = activePlayerCards[0];
  if (battleSession.targetBotTier >= 3) {
    playerTarget = [...activePlayerCards].sort((a, b) => a.currentHp - b.currentHp)[0];
  } else {
    playerTarget = activePlayerCards[Math.floor(Math.random() * activePlayerCards.length)];
  }

  // Kiểm tra Khiên Bất Tử của người chơi
  if (battleSession.activeBuffs.shieldActive) {
    battleSession.activeBuffs.shieldActive = false;
    logCombatAction(`🛡️ [Khiên Bất Tử] đã hấp thụ trọn vẹn đòn đánh từ [${botAttacker.name}]!`);
  } else {
    let botDmg = Math.round(botAttacker.combatAtk * (0.9 + Math.random() * 0.2));

    // Khắc chế nguyên tố
    const elemCfg = ELEMENTS[botAttacker.element];
    if (elemCfg && elemCfg.strongAgainst === playerTarget.element) {
      botDmg = Math.round(botDmg * 1.35);
    }

    playerTarget.currentHp = Math.max(0, playerTarget.currentHp - botDmg);
    logCombatAction(`⚠️ [${botAttacker.name}] phản công [${playerTarget.name}], gây ${botDmg} sát thương!`);
  }

  handleFieldReplacements();

  if (checkBattleEndCondition()) return;

  // Trả lượt về cho người chơi
  battleSession.isPlayerTurn = true;
  battleSession.turnNumber++;
  renderCombatArena();
}

// 7. ĐẨY QUÂN DỰ BỊ VÀO SÂN KHI CÓ THẺ TỬ TRẬN
function handleFieldReplacements() {
  // Thay thế bên người chơi
  for (let i = 0; i < battleSession.playerField.length; i++) {
    if (battleSession.playerField[i].currentHp <= 0 && battleSession.playerBench.length > 0) {
      const substitute = battleSession.playerBench.shift();
      logCombatAction(`🔄 [Dự Bị] ${substitute.name} tiến vào sàn đấu thay thế thẻ đã ngã xuống!`);
      battleSession.playerField[i] = substitute;
    }
  }

  // Thay thế bên Bot
  for (let i = 0; i < battleSession.botField.length; i++) {
    if (battleSession.botField[i].currentHp <= 0 && battleSession.botBench.length > 0) {
      const substitute = battleSession.botBench.shift();
      logCombatAction(`🔄 [Địch Dự Bị] ${substitute.name} xuất hiện trên sàn đấu!`);
      battleSession.botField[i] = substitute;
    }
  }
}

// 8. KIỂM TRA KẾT THÚC VÀ TRAO THƯỞNG
function checkBattleEndCondition() {
  const isPlayerDefeated = battleSession.playerField.every(c => c.currentHp <= 0) && battleSession.playerBench.length === 0;
  const isBotDefeated = battleSession.botField.every(c => c.currentHp <= 0) && battleSession.botBench.length === 0;

  if (isBotDefeated) {
    concludeBattle(true);
    return true;
  }
  if (isPlayerDefeated) {
    concludeBattle(false);
    return true;
  }
  return false;
}

function concludeBattle(isVictory) {
  battleSession.active = false;

  if (isVictory) {
    const rewardGold = battleSession.matchType === 'BOSS' ? 8000 : 2500 * battleSession.targetBotTier;
    const rewardExp = battleSession.matchType === 'BOSS' ? 120 : 35 * battleSession.targetBotTier;
    const rewardDust = battleSession.matchType === 'BOSS' ? 300 : 60;
    const rewardSuperDust = battleSession.matchType === 'BOSS' ? 2 : 0;

    gameState.player.gold += rewardGold;
    gameState.player.normalDust += rewardDust;
    gameState.player.superDust += rewardSuperDust;

    logCombatAction(`🏆 CHIẾN THẮNG VANG DỘI! Nhận +${rewardGold} 🪙, +${rewardDust} 🌟`);
    alert(`🏆 CHIẾN THẮNG OANH LIỆT!\n\nPhần thưởng:\n🪙 +${rewardGold} Vàng\n🌟 +${rewardDust} Bụi Sao Thường\n🌠 +${rewardSuperDust} Bụi Siêu Cấp`);
    
    addPlayerExp(rewardExp);
  } else {
    logCombatAction('💀 THẤT BẠI! Hãy cường hóa thêm Sao Cầu Vồng 🌈 và nâng cấp đội hình.');
    alert('💀 THẤT BẠI! Đội hình của bạn đã cạn kiệt sinh lực.');
  }

  saveLocalState();
  if (typeof updateTopHUD === 'function') updateTopHUD();

  // Đóng sàn đấu quay về sảnh chọn
  document.getElementById('battleArenaView')?.classList.add('hidden');
  document.getElementById('botSelectView')?.classList.remove('hidden');
}

function surrenderBattle() {
  if (!battleSession.active) return;
  if (confirm('Bạn có chắc chắn muốn đầu hàng không?')) {
    concludeBattle(false);
  }
}

// 9. KÍCH HOẠT CUTSCENE THE JOKER (1% INSTANT WIN)
function triggerJokerCutsceneInstantWin() {
  battleSession.active = false;
  const cutscene = document.getElementById('jokerCutsceneOverlay');

  if (cutscene) {
    cutscene.classList.remove('hidden');
    // Bắt đầu chuỗi âm thanh tổng hợp từ Web Audio API
    playSynthesizedJokerCutsceneSfx();

    // 2.8 giây sau cutscene nổ tung, xóa sổ toàn bộ sàn đấu địch
    setTimeout(() => {
      cutscene.classList.add('hidden');
      battleSession.botField.forEach(c => c.currentHp = 0);
      battleSession.botBench = [];
      logCombatAction('🃏 THE JOKER ĐÃ XÉ RÁCH THỰC TẠI! CHIẾN THẮNG TUYỆT ĐỐI!');
      concludeBattle(true);
    }, 2800);
  } else {
    // Dự phòng nếu không tìm thấy phần tử DOM
    battleSession.botField.forEach(c => c.currentHp = 0);
    concludeBattle(true);
  }
}

// 10. THAO TÁC BUFF CHIẾN THUẬT VÀ TIỆN ÍCH
function triggerBuff(buffType) {
  if (!battleSession.active || !battleSession.isPlayerTurn) return;

  const count = gameState.player.buffInventory[buffType] || 0;
  if (count <= 0) {
    alert('Vật phẩm Buff này đã hết! Hãy mua thêm tại Cửa Hàng.');
    return;
  }

  if (buffType === 'HEAL') {
    gameState.player.buffInventory.HEAL--;
    battleSession.playerField.forEach(c => {
      if (c.currentHp > 0) {
        c.currentHp = Math.min(c.maxHp, c.currentHp + Math.round(c.maxHp * 0.35));
      }
    });
    logCombatAction('🧪 Huyết Dược: Hồi phục 35% HP toàn bộ đội hình!');
  } else if (buffType === 'SHIELD') {
    gameState.player.buffInventory.SHIELD--;
    battleSession.activeBuffs.shieldActive = true;
    logCombatAction('🛡️ Khiên Bất Tử kích hoạt: Miễn nhiễm hoàn toàn đòn đánh kế tiếp!');
  } else if (buffType === 'OVERLOAD') {
    gameState.player.buffInventory.OVERLOAD--;
    battleSession.activeBuffs.overloadActive = true;
    logCombatAction('⚡ Bạo Kích Overload sẵn sàng (+60% DMG đòn đánh tiếp theo)!');
  } else if (buffType === 'HASTE') {
    gameState.player.buffInventory.HASTE--;
    battleSession.activeBuffs.hasteActive = true;
    logCombatAction('🌪️ Thần Tốc kích hoạt: Giải phóng 8 cú đánh liên hoàn!');
  }

  saveLocalState();
  renderCombatArena();
}

function showMultiHitBurstVisual(text) {
  const popup = document.getElementById('multiHitBurst');
  if (popup) {
    popup.textContent = text;
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 900);
  }
}

function logCombatAction(msg) {
  const logEl = document.getElementById('combatLogText');
  if (logEl) {
    logEl.textContent = msg;
  }
}

// 11. RENDER GIAO DIỆN SÀN ĐẤU (CARD FIELD SLOTS)
function renderCombatArena() {
  const turnEl = document.getElementById('turnIndicator');
  const botBenchCountEl = document.getElementById('botSubCount');
  const playerBenchCountEl = document.getElementById('playerBenchCountTxt');
  const botSlots = document.getElementById('botFieldSlots');
  const playerSlots = document.getElementById('playerFieldSlots');
  const playerBenchSlots = document.getElementById('playerBenchSlots');

  // Cập nhật lượt
  if (turnEl) {
    if (battleSession.isPlayerTurn) {
      turnEl.textContent = `LƯỢT CỦA BẠN (T${battleSession.turnNumber})`;
      turnEl.classList.remove('enemy-turn');
    } else {
      turnEl.textContent = `LƯỢT ĐỐI THỦ (T${battleSession.turnNumber})`;
      turnEl.classList.add('enemy-turn');
    }
  }

  // Cập nhật số lượng dự bị
  if (botBenchCountEl) botBenchCountEl.textContent = `Dự bị địch: ${battleSession.botBench.length}`;
  if (playerBenchCountEl) playerBenchCountEl.textContent = `Dự bị: ${battleSession.playerBench.length}/${gameState.player.benchCapacity}`;

  // Cập nhật số lượng buff trên nút
  const bH = document.getElementById('countBuffHeal');
  const bS = document.getElementById('countBuffShield');
  const bA = document.getElementById('countBuffAtk');
  const bSp = document.getElementById('countBuffSpeed');
  if (bH) bH.textContent = gameState.player.buffInventory.HEAL || 0;
  if (bS) bS.textContent = gameState.player.buffInventory.SHIELD || 0;
  if (bA) bA.textContent = gameState.player.buffInventory.OVERLOAD || 0;
  if (bSp) bSp.textContent = gameState.player.buffInventory.HASTE || 0;

  // Render hàng Bot
  if (botSlots) {
    botSlots.innerHTML = battleSession.botField.map(c => {
      const isDead = c.currentHp <= 0;
      const hpPct = Math.max(0, Math.round((c.currentHp / c.maxHp) * 100));
      return `
        <div class="battle-card rank-${(c.rank || 'c').toLowerCase()} ${isDead ? 'dead' : 'targetable'} ${c.isStunned ? 'card-stunned-mask' : ''}"
             onclick="selectCombatTarget('${c.uid}')">
          <span class="card-element-tag">${ELEMENTS[c.element]?.icon || '✨'}</span>
          <span class="card-rank-tag">${c.rank}</span>
          <div class="card-art-emoji">${c.id.includes('JOKER') ? '🃏' : (c.id.includes('BOSS') ? '👾' : '👹')}</div>
          <div class="card-title">${c.name}</div>
          <div class="card-hp-bar">
            <div class="card-hp-fill ${hpPct < 25 ? 'critical-hp' : ''}" style="width: ${hpPct}%;"></div>
          </div>
          <div class="card-combat-stats">
            <span class="atk">⚔️ ${c.combatAtk}</span>
            <span class="spd">⚡ ${c.combatSpd}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render hàng người chơi
  if (playerSlots) {
    playerSlots.innerHTML = battleSession.playerField.map(c => {
      const isDead = c.currentHp <= 0;
      const isSelected = battleSession.selectedAttackerUid === c.uid;
      const hpPct = Math.max(0, Math.round((c.currentHp / c.maxHp) * 100));

      const hasRainbow = (c.rainbowStars || 0) > 0;
      const starsDisplay = hasRainbow 
        ? `<span class="rainbow-badge-txt">${c.rainbowStars}🌈</span> ${'⭐'.repeat(c.stars || 0)}`
        : '⭐'.repeat(c.stars || 0);

      return `
        <div class="battle-card rank-${(c.rank || 'c').toLowerCase()} ${isDead ? 'dead' : ''} ${isSelected ? 'selected-attacker' : ''} ${c.isStunned ? 'card-stunned-mask' : ''}"
             onclick="selectCombatAttacker('${c.uid}')">
          <span class="card-element-tag">${ELEMENTS[c.element]?.icon || '✨'}</span>
          <span class="card-rank-tag">${c.rank}</span>
          <div class="card-stars ${hasRainbow ? 'has-rainbow' : ''}">${starsDisplay}</div>
          <div class="card-art-emoji">${c.eventExclusive ? '🃏' : '🧙'}</div>
          <div class="card-title">${c.name}</div>
          <div class="card-hp-bar">
            <div class="card-hp-fill ${hpPct < 25 ? 'critical-hp' : ''}" style="width: ${hpPct}%;"></div>
          </div>
          <div class="card-combat-stats">
            <span class="atk">⚔️ ${c.combatAtk}</span>
            <span class="spd">⚡ ${c.combatSpd}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render khay dự bị người chơi
  if (playerBenchSlots) {
    playerBenchSlots.innerHTML = battleSession.playerBench.map(c => `
      <div class="bench-card rank-${(c.rank || 'c').toLowerCase()}">
        <span>${ELEMENTS[c.element]?.icon || ''} ${c.rank}</span>
        <div style="font-weight:700; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">
          ${c.name}
        </div>
        <span style="color:#ff5964;">⚔️ ${c.combatAtk}</span>
      </div>
    `).join('');
  }
}
