/* ==========================================================================
   MODULE 8/10: NETWORK SYNC & ADMIN CLOUD - CYBERRANK & MOCKAPI
   ========================================================================== */

const STORAGE_KEY = 'CYBER_CARD_LEGENDS_SAVE_DATA_V5';
const MOCKAPI_ENDPOINT = 'https://67198cfb7fc4c5ff8f4d9c72.mockapi.io/api/v1/players';

// 1. TẠO THẺ KHỞI ĐẦU CHO NGƯỜI CHƠI MỚI (NEW GAME INITIALIZER)
function generateStarterDeck() {
  const starterUids = [];
  const starters = [];

  // Tặng 1 tướng S, 2 tướng A, 3 tướng B, 2 tướng C khởi đầu
  const targetRanks = ['S', 'A', 'A', 'B', 'B', 'B', 'C', 'C'];
  
  targetRanks.forEach((rank, idx) => {
    const candidates = MASTER_CARD_DATABASE.filter(c => c.rank === rank && !c.eventExclusive);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
    
    starters.push({
      ...chosen,
      uid: `UID_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      stars: 0,
      rainbowStars: 0
    });
  });

  return starters;
}

// 2. LƯU & TẢI DỮ LIỆU TỪ LOCALSTORAGE
function saveLocalState() {
  try {
    const serialized = JSON.stringify(gameState.player);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Lỗi khi lưu LocalStorage:', err);
  }
}

function loadLocalState() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      gameState.player = {
        ...gameState.player,
        ...parsed,
        buffInventory: parsed.buffInventory || { HEAL: 3, SHIELD: 2, OVERLOAD: 3, HASTE: 3 }
      };
      
      // Đồng bộ thông số card gốc (tránh lỗi mismatch dữ liệu cũ)
      gameState.player.inventory = (gameState.player.inventory || []).map(card => {
        const base = MASTER_CARD_DATABASE.find(b => b.id === card.id);
        return base ? { ...base, ...card } : card;
      });

      // Tái liên kết thẻ trong Deck với con trỏ Inventory
      const invMap = new Map(gameState.player.inventory.map(c => [c.uid, c]));
      gameState.player.deck.main = (gameState.player.deck.main || []).map(c => invMap.get(c.uid) || c).filter(Boolean);
      gameState.player.deck.sub = (gameState.player.deck.sub || []).map(c => invMap.get(c.uid) || c).filter(Boolean);

    } else {
      // Người chơi mới hoàn toàn
      const starters = generateStarterDeck();
      gameState.player.inventory = [...starters];
      gameState.player.deck.main = starters.slice(0, 5);
      gameState.player.deck.sub = starters.slice(5, 7);
      saveLocalState();
    }
  } catch (err) {
    console.warn('Lỗi đọc LocalStorage, khởi tạo dữ liệu mặc định:', err);
  }
}

// 3. ĐỒNG BỘ ĐÁM MÂY (CLOUD SYNC VỚI MOCKAPI)
async function syncDataToCloud(silent = true) {
  const alertBanner = document.getElementById('globalServerAlert');
  const alertMsg = document.getElementById('alertMessage');

  if (!silent && alertBanner && alertMsg) {
    alertMsg.textContent = 'Đang đồng bộ dữ liệu CyberRank lên Cloud...';
    alertBanner.classList.remove('hidden');
  }

  const payload = {
    name: gameState.player.name,
    level: gameState.player.level,
    exp: gameState.player.exp,
    gold: gameState.player.gold,
    gems: gameState.player.gems,
    normalDust: gameState.player.normalDust,
    superDust: gameState.player.superDust,
    teamOvr: calculateTeamOVR(),
    totalCards: gameState.player.inventory.length,
    benchCapacity: gameState.player.benchCapacity,
    updatedAt: new Date().toISOString()
  };

  try {
    let res;
    if (gameState.player.cloudRecordId) {
      res = await fetch(`${MOCKAPI_ENDPOINT}/${gameState.player.cloudRecordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(MOCKAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      const data = await res.json();
      gameState.player.cloudRecordId = data.id;
      saveLocalState();
      if (!silent && alertMsg) {
        alertMsg.textContent = 'Đồng bộ Cloud thành công! Dữ liệu đã lưu.';
        setTimeout(() => alertBanner?.classList.add('hidden'), 2500);
      }
    }
  } catch (err) {
    console.warn('Không thể kết nối MockAPI Cloud:', err);
    if (!silent && alertMsg) {
      alertMsg.textContent = 'Chế độ Ngoại tuyến: Đã lưu trên máy cục bộ.';
      setTimeout(() => alertBanner?.classList.add('hidden'), 2500);
    }
  }
}

// 4. BẢNG ĐIỀU KHIỂN QUẢN TRỊ ADMIN CLOUD (AUDIT THE JOKER & OVR)
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.remove('hidden');
    fetchAdminData();
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('hidden');
}

async function fetchAdminData() {
  const tbody = document.getElementById('adminTableBody');
  const countTxt = document.getElementById('adminDataCount');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải máy chủ...</td></tr>';

  try {
    const res = await fetch(MOCKAPI_ENDPOINT);
    if (!res.ok) throw new Error('Mạng không ổn định');
    const players = await res.json();

    if (countTxt) countTxt.textContent = `Tổng cộng: ${players.length} người chơi trực tuyến`;

    tbody.innerHTML = players.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td><b>${p.name || 'Vô Danh'}</b></td>
        <td>Lv.${p.level || 1}</td>
        <td>🪙 ${p.gold?.toLocaleString('vi-VN') || 0} | 💎 ${p.gems || 0}</td>
        <td><b style="color: #00f2fe;">${p.teamOvr || 0}</b></td>
        <td>${p.totalCards || 0} Thẻ</td>
        <td>${p.benchCapacity || 2} Ô</td>
        <td>
          <button class="btn-danger-outline" style="font-size:11px; padding:2px 6px;" onclick="deleteAdminPlayer('${p.id}')">Xóa</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ff3366;">Lỗi nạp dữ liệu: ${err.message}</td></tr>`;
  }
}

async function deleteAdminPlayer(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa bản ghi #${id}?`)) return;
  try {
    await fetch(`${MOCKAPI_ENDPOINT}/${id}`, { method: 'DELETE' });
    fetchAdminData();
  } catch (err) {
    alert('Không thể xóa bản ghi: ' + err.message);
  }
}

// Tự động đồng bộ ngầm mỗi 3 phút
setInterval(() => {
  syncDataToCloud(true);
}, 180000);
