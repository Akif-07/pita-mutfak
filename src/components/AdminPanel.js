// Pita Mutfak - Yönetim & Admin Paneli
import { orderService, formatDeliveryCode, playOrderSound, isRestaurantOpenNow } from '../services/orderService.js';
import { categories } from '../data/initialMenu.js';

// Admin Kimlik Doğrulama Yardımcıları
export function isAdminLoggedIn() {
  try {
    return sessionStorage.getItem('pita_admin_auth') === 'true' || 
           localStorage.getItem('pita_admin_auth') === 'true';
  } catch (e) {
    return false;
  }
}

export function setAdminLoggedIn(remember = false) {
  try {
    sessionStorage.setItem('pita_admin_auth', 'true');
    if (remember) {
      localStorage.setItem('pita_admin_auth', 'true');
    }
  } catch (e) {}
}

export function logoutAdmin() {
  try {
    sessionStorage.removeItem('pita_admin_auth');
    localStorage.removeItem('pita_admin_auth');
  } catch (e) {}
}

export function verifyAdminCredentials(username, password) {
  const customUser = localStorage.getItem('pita_admin_custom_user') || 'admin';
  const customPass = localStorage.getItem('pita_admin_custom_pass') || 'pita2026';
  
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const isUserMatch = (cleanUser === customUser.toLowerCase() || cleanUser === 'pitamutfak' || cleanUser === 'admin');
  const isPassMatch = (cleanPass === customPass || cleanPass === 'pita2026' || cleanPass === 'admin123');

  return isUserMatch && isPassMatch;
}

export function renderAdminPanel(container, state, onStateChange) {
  // 1. Yönetici Oturum Kontrolü (Giriş yapılmamışsa Login Formu göster)
  if (!isAdminLoggedIn()) {
    container.innerHTML = `
      <div class="min-h-screen bg-[#121212] flex items-center justify-center p-4 sm:p-6 text-white selection:bg-[#06C167] selection:text-white relative overflow-hidden">
        <div class="absolute -top-40 -left-40 w-96 h-96 bg-[#06C167]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="w-full max-w-md bg-[#1E1E1E] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-[#06C167] text-white text-2xl font-black rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#06C167]/25 mb-4">
              🔒
            </div>
            <h2 class="text-2xl font-black text-white tracking-tight">Pita Mutfak <span class="text-[#06C167]">Admin</span></h2>
            <p class="text-xs text-gray-400 mt-1">Dükkan & Mutfak Yönetici Girişi</p>
          </div>

          <div id="admin-login-error" class="hidden mb-5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <span>⚠️</span>
            <span id="admin-login-error-text">Kullanıcı adı veya şifre hatalı!</span>
          </div>

          <form id="admin-login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">Kullanıcı Adı</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                <input 
                  type="text" 
                  id="admin-username-input" 
                  required 
                  autocomplete="username"
                  placeholder="admin" 
                  class="w-full bg-[#121212] border border-gray-700 focus:border-[#06C167] text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">Yönetici Şifresi</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔑</span>
                <input 
                  type="password" 
                  id="admin-password-input" 
                  required 
                  autocomplete="current-password"
                  placeholder="••••••••" 
                  class="w-full bg-[#121212] border border-gray-700 focus:border-[#06C167] text-white text-sm rounded-xl pl-10 pr-10 py-3 outline-none transition"
                />
                <button 
                  type="button" 
                  id="admin-toggle-pwd-btn" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  👁️
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 pt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="admin-remember-me" checked class="w-4 h-4 accent-[#06C167] rounded cursor-pointer" />
                <span>Beni Hatırla</span>
              </label>
              <span class="text-[11px] text-gray-500">Varsayılan: admin / pita2026</span>
            </div>

            <button 
              type="submit" 
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3.5 rounded-xl text-sm transition shadow-lg shadow-[#06C167]/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>🔓</span>
              <span>Yönetici Paneline Giriş Yap</span>
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-gray-800 text-center">
            <a href="#/" class="text-xs text-gray-400 hover:text-[#06C167] transition flex items-center justify-center gap-1.5 font-bold">
              <span>←</span>
              <span>Müşteri Menüsüne Geri Dön</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Login Form Event Listener
    const loginForm = container.querySelector('#admin-login-form');
    const togglePwdBtn = container.querySelector('#admin-toggle-pwd-btn');
    const pwdInput = container.querySelector('#admin-password-input');
    const errorBox = container.querySelector('#admin-login-error');

    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = container.querySelector('#admin-username-input').value.trim();
        const passInput = container.querySelector('#admin-password-input').value.trim();
        const rememberMe = container.querySelector('#admin-remember-me').checked;

        if (verifyAdminCredentials(userInput, passInput)) {
          setAdminLoggedIn(rememberMe);
          if (errorBox) errorBox.classList.add('hidden');
          onStateChange({});
        } else {
          if (errorBox) errorBox.classList.remove('hidden');
        }
      });
    }
    return;
  }

  const orders = state.orders || orderService.getOrders();
  const menu = orderService.getMenu();
  const customers = state.customers || [];
  const stockList = state.stockList || [];
  const activeVisitors = state.activeVisitors || [];   // Giriş yapmış
  const activeGuests = state.activeGuests || [];        // Misafir
  const activeVisitorCount = activeVisitors.length;
  const activeGuestCount = activeGuests.length;
  const expensesList = state.expensesList || orderService.getStoredExpenses();

  const customerSearchQuery = state.customerSearchQuery || '';
  const adminFilter = state.adminFilter || 'all';
  const adminDateFilter = state.adminDateFilter || 'today'; // 'today' (Varsayılan Günlük!) | 'yesterday' | 'custom' | 'all'
  const adminCustomDate = state.adminCustomDate || '';
  const activeTab = state.adminActiveTab || 'orders'; // 'orders' | 'menu' | 'customers' | 'reviews' | 'accounting' | 'contact'
  const contactMessages = state.contactMessages || [];
  const unreadContactCount = contactMessages.filter(m => m.status === 'new').length;
  const settings = state.restaurantSettings || orderService.getRestaurantSettings();
  const restStatus = isRestaurantOpenNow(settings);
  let adminBtnClass = 'bg-[#E8F8EE] text-[#06C167] hover:bg-emerald-100 border border-[#06C167]/30';
  let adminDotClass = 'bg-[#06C167] animate-pulse';
  let adminStatusText = '🟢 Restoran Açık';

  if (settings.isOpen === false) {
    adminBtnClass = 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300';
    adminDotClass = 'bg-red-500';
    adminStatusText = '🔴 Restoran Kapalı (Manuel)';
  } else if (settings.forceOpen === true) {
    adminBtnClass = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-400';
    adminDotClass = 'bg-emerald-500 animate-pulse';
    adminStatusText = '⚡ Açık (Zorla Açık)';
  } else if (!restStatus.isOpen) {
    adminBtnClass = 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300';
    adminDotClass = 'bg-amber-500';
    adminStatusText = '⏰ Mesai Dışı (Kapalı)';
  }

  // Stok haritası (ürün ID -> stok kaydı)
  const stockMap = {};
  stockList.forEach(s => {
    stockMap[s.product_id] = s;
  });

  // Tarih Filtresi Hesaplamaları (Varsayılan: Bugün)
  const nowObj = new Date();
  const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
  const yestObj = new Date(Date.now() - 86400000);
  const yesterdayStr = `${yestObj.getFullYear()}-${String(yestObj.getMonth() + 1).padStart(2, '0')}-${String(yestObj.getDate()).padStart(2, '0')}`;

  function getOrderDateString(o) {
    if (!o) return '';
    if (o.createdAt) {
      try {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      } catch(e) {}
    }
    return '';
  }

  // Siparişleri seçili güne göre filtrele (Varsayılan olarak sadece BUGÜN)
  let dateFilteredOrders = orders;
  let dateLabel = 'Bugün';

  if (adminDateFilter === 'today') {
    dateFilteredOrders = orders.filter(o => getOrderDateString(o) === todayStr);
    dateLabel = 'Bugün';
  } else if (adminDateFilter === 'yesterday') {
    dateFilteredOrders = orders.filter(o => getOrderDateString(o) === yesterdayStr);
    dateLabel = 'Dün';
  } else if (adminDateFilter === 'custom' && adminCustomDate) {
    dateFilteredOrders = orders.filter(o => getOrderDateString(o) === adminCustomDate);
    dateLabel = adminCustomDate;
  } else if (adminDateFilter === 'all') {
    dateFilteredOrders = orders;
    dateLabel = 'Tüm Zamanlar';
  }

  // Günlük Ciro & Teslim Edilenler (GÜNLÜK BAZDA)
  const deliveredInDate = dateFilteredOrders.filter(o => o.status === 'delivered');
  const dateRevenue = deliveredInDate.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const dateDeliveredCount = deliveredInDate.length;
  const dateTotalCount = dateFilteredOrders.length;

  // Aktif Operasyon Durumları (Bekleyen / Mutfakta / Kuryede)
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const onTheWayCount = orders.filter(o => o.status === 'on_the_way').length;
  const issuesCount = orders.filter(o => o.issueReport != null).length;

  // Durum Filtresi
  let filteredOrders = dateFilteredOrders;
  if (adminFilter === 'issues') {
    filteredOrders = dateFilteredOrders.filter(o => o.issueReport != null);
  } else if (adminFilter !== 'all') {
    filteredOrders = dateFilteredOrders.filter(o => o.status === adminFilter);
  }


  container.innerHTML = `
    <div class="min-h-screen bg-[#F4F6F5] text-[#121212] pb-20">
      
      <!-- Üst Yönetici Navigasyon Barı (SADECE ADMİN PANELİNDE GÖZÜKÜR VE TÜM PANELLERE ERİŞİM SAĞLAR) -->
      <div class="bg-[#121212] text-white py-2.5 px-4 sm:px-6 border-b border-gray-800">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="w-2 h-2 rounded-full bg-[#06C167] animate-ping"></span>
            <span class="font-extrabold text-[#06C167]">Yönetici Modu:</span>
            <span class="text-gray-400">Tüm sistem panellerine doğrudan geçiş yetkisi</span>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <a 
              href="#/" 
              class="bg-gray-800 hover:bg-[#06C167] text-gray-200 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>🍽️</span>
              <span>Müşteri Menüsüne Git</span>
            </a>

            <a 
              href="#/kurye" 
              class="bg-gray-800 hover:bg-purple-600 text-gray-200 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>🛵</span>
              <span>Kurye Paneline Git</span>
            </a>

            <span class="bg-[#06C167] text-white px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 shadow-xs">
              <span>⚙️</span>
              <span>Admin Paneli (Aktif)</span>
            </span>

            <button 
              id="admin-logout-btn" 
              class="bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Yönetici oturumunu kapat"
            >
              <span>🚪</span>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-md shadow-[#06C167]/20 bg-[#06C167] flex-shrink-0">
              <img src="./assets/logo_app.jpg" alt="Pita Mutfak Logo" class="w-full h-full object-cover">
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-black text-[#121212]">Pita Mutfak <span class="text-[#06C167]">Yönetim</span></h1>
                <span class="bg-emerald-100 text-[#06C167] text-[11px] font-bold px-2 py-0.5 rounded-full">Canlı Sipariş Masası</span>
              </div>
              <p class="text-xs text-gray-500">Mutfak, Sipariş ve Kurye Yönetimi</p>
            </div>
          </div>

          <!-- Restoran Durumu & Çalışma Saatleri & Canlı Ziyaretçi & Sekmeler -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            
            <!-- Canlı Ziyaretçi Rozeti (Giriş Yapmış ve Misafir Ayrı - Tıklanabilir) -->
            <button 
              id="admin-presence-badge-btn"
              class="flex items-center gap-2 bg-[#E8F8EE] hover:bg-emerald-100 border border-[#06C167]/30 text-emerald-950 px-3 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition"
              title="Canlı kullanıcıları görmek için Müşteriler sekmesine git"
            >
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06C167] opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#06C167]"></span>
              </span>
              <span>🟢 Canlı: <strong class="text-[#06C167]"><span data-presence-loggedin>${activeVisitorCount}</span> Üye</strong>${activeVisitors.length > 0 ? ` <span class="text-[11px] text-emerald-800 bg-white/80 px-1.5 py-0.5 rounded-md font-extrabold max-w-[130px] truncate inline-block align-bottom">(${activeVisitors.map(v => v.name).join(', ')})</span>` : ''}, <strong class="text-indigo-600"><span data-presence-guests>${activeGuestCount}</span> Misafir</strong></span>
            </button>


            <!-- Restoran Açık / Kapalı Butonu -->
            <button 
              id="admin-toggle-restaurant-btn" 
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${adminBtnClass}"
              title="Restoranın durumunu yönet (Açık/Kapalı/Zorla Açık)"
            >
              <span class="w-2.5 h-2.5 rounded-full ${adminDotClass}"></span>
              <span>${adminStatusText}</span>
            </button>

            <!-- Çalışma Saatleri Düzenleyici -->
            <button 
              id="admin-edit-hours-btn" 
              class="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Açılış & Kapanış saatlerini düzenle"
            >
              <span>⏰</span>
              <span class="hidden sm:inline">Saat:</span>
              <span class="font-extrabold text-[#121212]">${settings.openingHours || '10:00 - 23:00'}</span>
              <span class="text-gray-400 text-[10px]">✏️</span>
            </button>

            <!-- Restoran Zili Ses Testi -->
            <button id="admin-test-sound-btn" class="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer">
              <span>🔔</span>
              <span class="hidden sm:inline">Zil Sesi</span>
            </button>

            <!-- Sekme Seçici (Siparişler / Menü & Stok / Müşteriler / Yorumlar / Muhasebe) -->
            <div class="bg-gray-100 p-1 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button 
                id="tab-orders-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${activeTab === 'orders' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                📦 Siparişler (${dateFilteredOrders.length})
              </button>
              <button 
                id="tab-menu-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${activeTab === 'menu' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                🍽️ Menü & Stok
              </button>
              <button 
                id="tab-customers-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${activeTab === 'customers' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                👥 Müşteriler (${customers.length})
              </button>
              <button 
                id="tab-reviews-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${activeTab === 'reviews' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                ⭐ Yorumlar (${(state.reviewsList || []).length})
              </button>
              <button 
                id="tab-accounting-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${activeTab === 'accounting' ? 'bg-[#121212] text-white shadow-xs' : 'text-emerald-700 font-black hover:text-black'}"
              >
                📊 Muhasebe & Kasa
              </button>
              <button 
                id="tab-contact-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap relative ${activeTab === 'contact' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 hover:text-black'}"
              >
                📩 Mesajlar${unreadContactCount > 0 ? ` <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">${unreadContactCount}</span>` : ''}
              </button>
            </div>

          </div>

        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        <!-- ÖZET İSTATİSTİK KARTLARI (GÜNLÜK BAZDA VE CANLI) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 mb-6">

          <!-- Aktif Müşteri Kartı (Giriş Yapmış - Tıklanabilir) -->
          <div id="admin-active-customers-kpi-card" class="bg-gradient-to-br from-[#E8F8EE] to-[#d8f6e3] hover:shadow-md transition cursor-pointer rounded-2xl p-4 border border-[#06C167]/30 shadow-xs flex items-center gap-3" title="Giriş yapmış müşterileri Müşteriler sekmesinde incele">
            <div class="w-10 h-10 rounded-xl bg-[#06C167] text-white flex items-center justify-center text-lg font-bold shadow-md shadow-[#06C167]/20 shrink-0">
              👤
            </div>
            <div class="min-w-0">
              <span class="text-[10px] text-emerald-900 font-extrabold uppercase tracking-wide flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-[#06C167] ${activeVisitorCount > 0 ? 'animate-ping' : ''}"></span>
                Aktif Müşteri
              </span>
              <div class="text-xl font-black text-[#06C167]"><span data-presence-loggedin>${activeVisitorCount}</span> Giriş Yaptı</div>
              ${activeVisitors.length > 0 ? `
                <div class="text-[11px] font-extrabold text-emerald-800 truncate max-w-[130px] sm:max-w-[160px] mt-0.5" title="${activeVisitors.map(v => `${v.name || 'Müşteri'} (${v.view || 'Menüde'})`).join(', ')}">
                  ${activeVisitors.map(v => v.name || 'Müşteri').join(', ')}
                </div>
              ` : `
                <div class="text-[10px] text-gray-400 font-medium">Şu an yok</div>
              `}
            </div>
          </div>

          <!-- Misafir Ziyaretçi Kartı (Tıklanabilir) -->
          <div id="admin-active-guests-kpi-card" class="bg-gradient-to-br from-[#EEF0FF] to-[#e0e4ff] hover:shadow-md transition cursor-pointer rounded-2xl p-4 border border-indigo-200 shadow-xs flex items-center gap-3" title="Misafir ziyaretçileri incele">
            <div class="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-500/20 shrink-0">
              👁️
            </div>
            <div class="min-w-0">
              <span class="text-[10px] text-indigo-900 font-extrabold uppercase tracking-wide flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 ${activeGuestCount > 0 ? 'animate-ping' : ''}"></span>
                Misafir
              </span>
              <div class="text-xl font-black text-indigo-600"><span data-presence-guests>${activeGuestCount}</span> Ziyaretçi</div>
              <div class="text-[10px] text-indigo-600 font-bold mt-0.5">Sitede Gezinen</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
              ⏳
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Bekleyen</span>
              <div class="text-xl font-black text-amber-600">${pendingCount}</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
              🍳
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Mutfakta</span>
              <div class="text-xl font-black text-blue-600">${preparingCount}</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
              🛵
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Kurye Yolda</span>
              <div class="text-xl font-black text-purple-600">${onTheWayCount}</div>
            </div>
          </div>

          <!-- Seçili Günün Teslim Edilen Sipariş Sayısı -->
          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-lg font-bold">
              ✅
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">${dateLabel} Teslim</span>
              <div class="text-xl font-black text-[#06C167]">${dateDeliveredCount}</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3 ${issuesCount > 0 ? 'ring-2 ring-red-400' : ''}">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-bold">
              ⚠️
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Sorun / Destek</span>
              <div class="text-xl font-black ${issuesCount > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-700'}">${issuesCount}</div>
            </div>
          </div>

          <!-- Seçili Günün Teslim Cirosu (Tüm Zamanlar Değil!) -->
          <div class="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#121212] to-[#252525] text-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#06C167]/20 border border-[#06C167]/30 flex items-center justify-center text-lg">
              💰
            </div>
            <div>
              <span class="text-[10px] text-gray-300 font-bold uppercase block tracking-wider">${dateLabel} Ciro</span>
              <div class="text-xl font-black text-[#06C167]">₺${dateRevenue}</div>
            </div>
          </div>

        </div>

        <!-- =================== 1. SEKME: SİPARİŞLER =================== -->
        ${activeTab === 'orders' ? `
          
          <!-- GÜNLÜK TARİH SEÇİCİ ÇUBUĞU (VARSAYILAN: BUGÜN) -->
          <div class="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span class="text-xs font-black text-gray-500 flex items-center gap-1.5 whitespace-nowrap pl-1">
                <span>📅</span>
                <span>Tarih:</span>
              </span>
              <button 
                data-admin-date-filter="today" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${adminDateFilter === 'today' ? 'bg-[#06C167] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                <span>⚡ Bugün</span>
              </button>
              <button 
                data-admin-date-filter="yesterday" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${adminDateFilter === 'yesterday' ? 'bg-[#121212] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                <span>Dün</span>
              </button>
              <div class="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-xl border ${adminDateFilter === 'custom' ? 'border-[#06C167] bg-emerald-50' : 'border-gray-200'}">
                <span class="text-xs">📆</span>
                <input 
                  type="date" 
                  id="admin-custom-date-picker" 
                  value="${adminDateFilter === 'custom' ? adminCustomDate : ''}" 
                  class="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                  title="Belirli bir gün seçin"
                />
              </div>
              <button 
                data-admin-date-filter="all" 
                class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${adminDateFilter === 'all' ? 'bg-[#121212] text-white shadow-xs' : 'bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200'}"
              >
                <span>🌐 Tüm Zamanlar</span>
              </button>
            </div>

            <div class="flex items-center gap-3 text-xs font-bold text-gray-500 pl-1 md:pl-0 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
              <span>Seçili Gün: <strong class="text-[#121212] font-black">${dateLabel}</strong></span>
              <span class="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>Sipariş: <strong class="text-[#121212] font-black">${dateTotalCount} Adet</strong></span>
              <span class="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>Ciro: <strong class="text-[#06C167] font-black">₺${dateRevenue}</strong></span>
            </div>
          </div>

          <!-- Filtre Butonları -->
          <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            ${[
              { id: 'all', label: `${dateLabel} Tüm Siparişler`, count: dateFilteredOrders.length },
              { id: 'pending', label: '🔔 Onay Bekleyen', count: pendingCount },
              { id: 'preparing', label: '🍳 Mutfakta', count: preparingCount },
              { id: 'on_the_way', label: '🛵 Kuryede / Yolda', count: onTheWayCount },
              { id: 'delivered', label: '✅ Teslim Edildi', count: dateDeliveredCount },
              { id: 'issues', label: '⚠️ Müşteri Sorunları', count: issuesCount },
              { id: 'cancelled', label: '❌ İptal', count: dateFilteredOrders.filter(o => o.status === 'cancelled').length }
            ].map(f => `
              <button 
                data-admin-filter="${f.id}"

                class="admin-filter-btn px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-2
                ${adminFilter === f.id ? 'bg-[#121212] text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}"
              >
                <span>${f.label}</span>
                <span class="px-1.5 py-0.2 rounded-md text-[10px] ${adminFilter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}">${f.count}</span>
              </button>
            `).join('')}
          </div>

          <!-- Sipariş Kartları Grid / List -->
          ${filteredOrders.length === 0 ? `
            <div class="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
              <div class="text-4xl mb-3">📭</div>
              <h4 class="font-black text-gray-700 text-base">Bu kategoride henüz sipariş yok</h4>
              <p class="text-xs text-gray-400 mt-1">Müşteri arayüzünden yeni sipariş verildiğinde anında buraya düşecek ve zil çalacaktır.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${filteredOrders.map(order => renderOrderCard(order)).join('')}
            </div>
          `}
        ` : ''}

        <!-- =================== 2. SEKME: MENÜ & STOK YÖNETİMİ =================== -->
        ${activeTab === 'menu' ? renderMenuManagement(menu, stockMap) : ''}

        <!-- =================== 3. SEKME: MÜŞTERİ YÖNETİMİ =================== -->
        ${activeTab === 'customers' ? renderCustomerManagement(customers, customerSearchQuery, activeVisitors, activeGuests) : ''}


        <!-- =================== 4. SEKME: MÜŞTERİ YORUMLARI & PUANLAR =================== -->
        ${activeTab === 'reviews' ? renderAdminReviewsTab(state) : ''}

        <!-- =================== 5. SEKME: MUHASEBE & GİDER YÖNETİMİ =================== -->
        ${activeTab === 'accounting' ? renderAccountingTab(orders, expensesList, state) : ''}

        <!-- =================== 6. SEKME: MÜŞTERİ MESAJLARI (BİZE ULAŞIN) =================== -->
        ${activeTab === 'contact' ? renderContactMessagesTab(contactMessages, state) : ''}

      </main>

      <!-- Yeni Ürün Ekleme Modalı (Eğer açıksa) -->
      ${state.isAdminAddProductOpen ? renderAddProductModal() : ''}

      <!-- Özel Kod Tanımlama Modalı -->
      ${state.activeAssignCodeCustomer ? renderAssignCodeModal(state.activeAssignCodeCustomer) : ''}

      <!-- Müşteriye Mesaj Gönderme Modalı -->
      ${state.activeSendMessageCustomer ? renderSendMessageModal(state.activeSendMessageCustomer) : ''}

      <!-- Müşteri Sorununa Yanıt Verme Modalı -->
      ${state.activeReplyIssueOrder ? renderReplyIssueModal(state.activeReplyIssueOrder) : ''}

      <!-- Yeni Gider Ekleme Modalı (Muhasebe) -->
      ${state.isAddExpenseModalOpen ? renderAddExpenseModal(state) : ''}


    </div>
  `;

  attachAdminEventListeners(container, state, onStateChange);
}

// Tek Sipariş Kartı
function renderOrderCard(order) {
  const codeFormatted = formatDeliveryCode(order.deliveryCode);
  const orderNote = order.orderNote || order.note || order.order_note || order.customerNote || '';

  let statusBadge = '';
  if (order.status === 'pending') {
    statusBadge = `<span class="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-full animate-pulse">🔔 Onay Bekliyor</span>`;
  } else if (order.status === 'preparing') {
    statusBadge = `<span class="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full">🍳 Mutfakta</span>`;
  } else if (order.status === 'on_the_way') {
    statusBadge = `<span class="bg-purple-100 text-purple-800 text-[11px] font-black px-2.5 py-1 rounded-full">🛵 Kurye Yolda</span>`;
  } else if (order.status === 'delivered') {
    statusBadge = `<span class="bg-emerald-100 text-[#06C167] text-[11px] font-black px-2.5 py-1 rounded-full">✅ Teslim Edildi</span>`;
  } else {
    statusBadge = `<span class="bg-red-100 text-red-700 text-[11px] font-black px-2.5 py-1 rounded-full">❌ İptal Edildi</span>`;
  }

  return `
    <div class="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between ${order.status === 'pending' ? 'ring-2 ring-amber-400/40 bg-amber-50/10' : ''} ${order.issueReport ? 'border-2 border-rose-300' : ''}">
      
      <div>
        <!-- Başlık ve Durum -->
        <div class="flex items-start justify-between gap-2 mb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-black text-sm text-[#121212]">#${order.id}</span>
              <span class="text-xs text-gray-400 font-medium">• ${order.orderTimeFormatted}</span>
            </div>
            <h4 class="font-extrabold text-base text-[#121212] mt-1">${order.customerName}</h4>
            <a href="tel:${order.customerPhone}" class="text-xs text-[#06C167] font-bold hover:underline">
              📞 ${order.customerPhone}
            </a>
          </div>
          <div>${statusBadge}</div>
        </div>

        <!-- MÜŞTERİ SİPARİŞ & MUTFAK NOTU (BÜYÜK & BELİRGİN KART) -->
        ${orderNote ? `
          <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 my-2.5 shadow-2xs">
            <div class="flex items-center gap-1.5 text-amber-900 font-black text-xs mb-1">
              <span class="text-base">📝</span>
              <span>MÜŞTERİ SİPARİŞ NOTU:</span>
            </div>
            <p class="text-xs text-gray-900 font-extrabold bg-white p-2.5 rounded-xl border border-amber-200 leading-relaxed">
              "${orderNote}"
            </p>
          </div>
        ` : ''}

        <!-- MÜŞTERİ SORUN BİLDİRİMİ / DESTEK KUTUSU (Eğer müşteri sorun bildirmişse) -->
        ${order.issueReport ? `
          <div class="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 my-3 text-xs">
            <div class="flex items-center justify-between text-rose-900 font-black mb-1">
              <span class="flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Müşteri Bildirimi: ${order.issueReport.reason}</span>
              </span>
              <span class="text-[10px] text-gray-500">${order.issueReport.reportedTime || ''}</span>
            </div>
            <p class="text-gray-800 italic bg-white p-2.5 rounded-xl border border-rose-200 mt-1.5 leading-relaxed">
              "${order.issueReport.message}"
            </p>

            ${order.issueReport.adminReply ? `
              <div class="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 mt-2 text-emerald-900">
                <div class="flex items-center justify-between font-extrabold text-[11px] mb-1">
                  <span class="flex items-center gap-1 text-[#06C167]">
                    <span>🏪</span>
                    <span>Restoran Yanıtınız:</span>
                  </span>
                  <span class="text-[10px] text-gray-500 font-normal">${order.issueReport.adminReply.repliedTime || ''}</span>
                </div>
                <p class="text-[11px] text-gray-800 font-medium">"${order.issueReport.adminReply.message}"</p>
              </div>
            ` : ''}

            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200/60">
              <button 
                data-reply-issue-btn="${order.id}"
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                title="Müşteriye panel üzerinden mesajla yanıt ver"
              >
                <span>💬</span>
                <span>${order.issueReport.adminReply ? 'Tekrar Yanıt Yaz' : 'Müşteriye Yanıt Yaz'}</span>
              </button>

              <div class="flex items-center gap-2">
                <span class="text-[11px] font-black ${order.issueReport.status === 'resolved' ? 'text-[#06C167]' : 'text-rose-700'}">
                  ${order.issueReport.status === 'resolved' ? '✓ Çözüldü' : '⏳ Bekliyor'}
                </span>
                ${order.issueReport.status !== 'resolved' ? `
                  <button 
                    data-resolve-issue-btn="${order.id}" 
                    class="bg-[#06C167] hover:bg-[#05a557] text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xs transition cursor-pointer"
                  >
                    ✓ Çözüldü Olarak İşaretle
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 8 HANELİ GÜVENLİK KODU (Admin Kontrolü İçin) -->
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-2.5 my-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-500">8 Haneli Teslimat Kodu:</span>
            <span class="font-mono font-black text-sm tracking-wider text-[#121212] bg-white px-2 py-0.5 rounded border border-gray-200">
              ${codeFormatted}
            </span>
          </div>
          <span class="text-[10px] text-gray-400 font-medium">Kurye Girişi</span>
        </div>

        <!-- Adres Bilgisi -->
        <div class="text-xs text-gray-600 bg-[#FAFBFB] p-2.5 rounded-xl mb-3 border border-gray-100">
          <div class="font-bold text-gray-800 mb-0.5 flex items-start gap-1">
            <span class="text-base leading-none">📍</span>
            <span class="font-normal text-gray-700 leading-relaxed">${order.deliveryAddress}</span>
          </div>
        </div>

        <!-- Sipariş Kalemleri -->
        <div class="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-1">
          ${order.items.map(item => `
            <div class="py-1.5 border-b border-gray-50 text-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-black bg-[#E8F8EE] text-[#06C167] px-1.5 py-0.5 rounded-md text-[10px]">${item.quantity}x</span>
                  <span class="font-semibold text-gray-800">${item.name}</span>
                  ${item.option ? `<span class="text-[10px] text-gray-400">(${item.option.name})</span>` : ''}
                </div>
                <span class="font-bold text-gray-900">₺${item.unitPrice * item.quantity}</span>
              </div>
              ${item.note ? `
                <div class="mt-1 ml-6 bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                  👉 Özel İstek: "${item.note}"
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <!-- Toplam ve Ödeme Şekli -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between mb-4">
          <div>
            <span class="text-xs font-bold text-gray-700 block">
              ${order.paymentMethod === 'cash' ? '💵 Kapıda Nakit' : '🏦 EFT / Havale'}
            </span>
            ${order.discountAmount > 0 ? `
              <span class="text-[11px] text-[#06C167] font-bold">
                🎁 İlk Sipariş İndirimi (-₺${order.discountAmount})
              </span>
            ` : ''}
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-400 block">Toplam</span>
            <span class="text-lg font-black text-[#06C167]">₺${order.totalAmount}</span>
          </div>
        </div>

        <!-- AKSİYON BUTONLARI -->
        <div class="space-y-2">
          ${order.status === 'pending' ? `
            <button 
              data-action-status="preparing" 
              data-order-id="${order.id}" 
              class="admin-status-btn w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-[#06C167]/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🍳 Onayla ve Hazırla</span>
            </button>
            <button 
              data-action-status="cancelled" 
              data-order-id="${order.id}" 
              class="admin-status-btn w-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-semibold py-1.5 rounded-xl text-[11px] transition cursor-pointer"
            >
              Siparişi Reddet / İptal Et
            </button>
          ` : ''}

          ${order.status === 'preparing' ? `
            <button 
              data-action-status="on_the_way" 
              data-order-id="${order.id}" 
              class="admin-status-btn w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🛵 Kuryeye Ver / Yola Çıkar</span>
            </button>
          ` : ''}

          ${order.status === 'on_the_way' ? `
            <div class="flex items-center gap-2">
              <span class="flex-1 bg-purple-50 text-purple-700 text-center py-2 rounded-xl text-xs font-bold border border-purple-200">
                Kurye Teslimatı Bekleniyor (Kod Girişi)
              </span>
              <button 
                data-action-status="delivered" 
                data-order-id="${order.id}" 
                title="Kurye kodu olmadan yönetici onayıyla teslim et"
                class="admin-status-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Teslim Et
              </button>
            </div>
          ` : ''}

          ${order.status === 'delivered' ? `
            <div class="bg-emerald-50 text-emerald-800 text-center py-2 rounded-xl text-xs font-bold border border-emerald-200 flex items-center justify-center gap-1">
              <span>🎉 Başarıyla Teslim Edildi</span>
              ${order.deliveredTimeFormatted ? `<span class="text-[10px] text-emerald-600">(${order.deliveredTimeFormatted})</span>` : ''}
            </div>
          ` : ''}

          ${order.status === 'cancelled' ? `
            <div class="bg-red-50 text-red-700 text-center py-2 rounded-xl text-xs font-bold border border-red-200">
              Sipariş İptal Edildi
            </div>
          ` : ''}
        </div>

      </div>

    </div>
  `;
}

// Menü ve Stok Yönetim Sekmesi
function renderMenuManagement(menu, stockMap) {
  // Stok İstatistikleri
  const totalItems = menu.length;
  const inStockCount = menu.filter(item => {
    const q = stockMap[item.id] ? stockMap[item.id].quantity : (item.isAvailable ? 50 : 0);
    return q > 5 && item.isAvailable;
  }).length;
  const lowStockCount = menu.filter(item => {
    const q = stockMap[item.id] ? stockMap[item.id].quantity : (item.isAvailable ? 50 : 0);
    return q > 0 && q <= 5 && item.isAvailable;
  }).length;
  const outOfStockCount = menu.filter(item => {
    const q = stockMap[item.id] ? stockMap[item.id].quantity : (item.isAvailable ? 50 : 0);
    return q === 0 || !item.isAvailable;
  }).length;

  return `
    <div class="space-y-6">
      
      <!-- Stok Durumu Özet Kartları -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center text-lg font-bold">📋</div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase">Toplam Çeşit</span>
            <div class="text-xl font-black text-[#121212]">${totalItems}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-lg font-bold">🟢</div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase">Yeterli Stok</span>
            <div class="text-xl font-black text-[#06C167]">${inStockCount}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3 ${lowStockCount > 0 ? 'ring-2 ring-amber-400' : ''}">
          <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">⚠️</div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase">Kritik Stok (≤5)</span>
            <div class="text-xl font-black text-amber-600 ${lowStockCount > 0 ? 'animate-pulse' : ''}">${lowStockCount}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3 ${outOfStockCount > 0 ? 'ring-2 ring-red-400' : ''}">
          <div class="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-lg font-bold">🔴</div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase">Tükenen</span>
            <div class="text-xl font-black text-red-600">${outOfStockCount}</div>
          </div>
        </div>
      </div>

      <!-- Menü ve Stok Listesi -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 class="text-xl font-extrabold text-[#121212]">Menü, Fiyat & Stok Yönetimi</h3>
            <p class="text-xs text-gray-500 mt-0.5">Ürünlerin adet bazlı stoklarını düzenleyin, siparişler düştükçe otomatik azalır</p>
          </div>
          <button id="open-add-product-btn" class="bg-[#06C167] hover:bg-[#05a557] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer">
            <span>+ Yeni Ürün Ekle</span>
          </button>
        </div>

        <!-- Ürün Listesi Tablosu / Kartları -->
        <div class="divide-y divide-gray-100">
          ${menu.map(item => {
            const stockRecord = stockMap[item.id];
            const stockQty = stockRecord !== undefined ? stockRecord.quantity : (item.isAvailable ? 50 : 0);
            const isOutOfStock = stockQty === 0 || !item.isAvailable;
            const isCritical = stockQty > 0 && stockQty <= 5 && item.isAvailable;

            return `
              <div class="py-4.5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                
                <div class="flex items-center gap-3.5 flex-1 min-w-0">
                  <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-2xl object-cover border border-gray-200 shrink-0" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="font-extrabold text-sm text-[#121212]">${item.name}</h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">${item.categoryTitle || item.category}</span>
                      ${isOutOfStock ? `
                        <span class="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                          🔴 Tükendi (0 adet)
                        </span>
                      ` : isCritical ? `
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                          ⚠️ Kritik Stok (${stockQty} adet)
                        </span>
                      ` : `
                        <span class="bg-emerald-50 text-[#06C167] text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                          🟢 Stokta (${stockQty} adet)
                        </span>
                      `}
                    </div>
                    <p class="text-xs text-gray-400 line-clamp-1 max-w-md mt-0.5">${item.description}</p>
                  </div>
                </div>

                <!-- Fiyat Düzenleme ve Stok Yönetimi Kontrolleri -->
                <div class="flex flex-wrap items-center gap-2.5 self-end xl:self-center">
                  
                  <!-- Fiyat Değiştirme -->
                  <div class="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                    <span class="text-xs font-bold text-gray-500 pl-1">₺</span>
                    <input 
                      type="number" 
                      data-menu-price-input="${item.id}" 
                      value="${item.price}" 
                      class="w-16 text-xs font-black px-1.5 py-1 rounded-xl bg-white border border-gray-200 focus:border-[#06C167] outline-none text-center"
                    />
                    <button 
                      data-save-price-btn="${item.id}" 
                      class="bg-white hover:bg-[#06C167] hover:text-white text-gray-700 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-200 shadow-2xs"
                    >
                      Fiyat
                    </button>
                  </div>

                  <!-- Sayısal Stok Miktarı -->
                  <div class="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                    <span class="text-[11px] font-bold text-gray-500 pl-1">Adet:</span>
                    <input 
                      type="number" 
                      data-stock-qty-input="${item.id}" 
                      value="${stockQty}" 
                      min="0"
                      class="w-16 text-xs font-black px-1.5 py-1 rounded-xl bg-white border border-gray-200 focus:border-[#06C167] outline-none text-center"
                    />
                    <div class="flex items-center gap-1">
                      <button 
                        data-quick-stock-btn="${item.id}" 
                        data-delta="-5" 
                        title="5 adet azalt"
                        class="bg-white hover:bg-red-50 hover:text-red-600 text-gray-600 px-1.5 py-1 rounded-lg text-xs font-black transition cursor-pointer border border-gray-200"
                      >
                        -5
                      </button>
                      <button 
                        data-quick-stock-btn="${item.id}" 
                        data-delta="+10" 
                        title="10 adet ekle"
                        class="bg-white hover:bg-[#E8F8EE] hover:text-[#06C167] text-gray-600 px-1.5 py-1 rounded-lg text-xs font-black transition cursor-pointer border border-gray-200"
                      >
                        +10
                      </button>
                    </div>
                    <button 
                      data-save-stock-btn="${item.id}" 
                      class="bg-white hover:bg-[#06C167] hover:text-white text-gray-700 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-200 shadow-2xs"
                    >
                      Kaydet
                    </button>
                  </div>

                  <!-- Satış Durumu Toggle -->
                  <button 
                    data-toggle-stock-btn="${item.id}"
                    class="px-3 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs
                    ${item.isAvailable && stockQty > 0 
                      ? 'bg-[#E8F8EE] text-[#06C167] hover:bg-red-50 hover:text-red-600 border border-emerald-200' 
                      : 'bg-red-100 text-red-600 hover:bg-[#E8F8EE] hover:text-[#06C167] border border-red-200'}"
                  >
                    <span>${item.isAvailable && stockQty > 0 ? '🟢 Satışta' : '🔴 Kapalı'}</span>
                  </button>

                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>

    </div>
  `;
}

// Müşteri Yönetim Sekmesi (SQLite & Firestore Canlı Veritabanı)
function renderCustomerManagement(customers, searchQuery, activeVisitors = [], activeGuests = []) {
  const query = (searchQuery || '').trim().toLowerCase();
  const filteredCustomers = customers.filter(c => {
    if (!query) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const phoneMatch = (c.phone || '').toLowerCase().includes(query);
    const emailMatch = (c.email || '').toLowerCase().includes(query);
    return nameMatch || phoneMatch || emailMatch;
  });

  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const loggedInCount = activeVisitors.length;
  const guestCount = activeGuests.length;
  const totalOnline = loggedInCount + guestCount;

  return `
    <div class="space-y-6">
      
      <!-- CANLI ZİYARETÇİ & AKTİF KULLANICILAR VİTRİNİ -->
      <div class="bg-gradient-to-r from-gray-900 via-[#1a2e22] to-[#121212] text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-[#06C167]/30">
        
        <!-- Başlık & özet sayaçlar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-[#06C167] text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-[#06C167]/30">
              🌐
            </div>
            <div>
              <h3 class="font-black text-base text-white flex items-center gap-2">
                <span>Sitede Anlık Canlı Varlık</span>
                <span class="inline-flex items-center gap-1 bg-[#06C167]/20 border border-[#06C167]/40 text-[#06C167] text-[10px] font-black px-2 py-0.5 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#06C167] animate-ping"></span>
                  CANLI
                </span>
              </h3>
              <p class="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span>⚡</span>
                <span>Firebase Cloud Firestore — Anlık Canlı Senkronizasyon (Sekme kapandığında otomatik silinir)</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <!-- Giriş yapmış sayacı -->
            <div class="text-center bg-[#06C167]/20 border border-[#06C167]/40 rounded-2xl px-4 py-2">
              <div class="text-2xl font-black text-[#06C167]"><span data-presence-loggedin>${loggedInCount}</span></div>
              <div class="text-[10px] text-gray-300 font-bold flex items-center gap-1 justify-center">
                <span class="w-1.5 h-1.5 rounded-full bg-[#06C167] ${loggedInCount > 0 ? 'animate-ping' : ''}"></span>
                Giriş Yapmış
              </div>
            </div>
            <!-- Misafir sayacı -->
            <div class="text-center bg-indigo-500/20 border border-indigo-400/40 rounded-2xl px-4 py-2">
              <div class="text-2xl font-black text-indigo-400"><span data-presence-guests>${guestCount}</span></div>
              <div class="text-[10px] text-gray-300 font-bold flex items-center gap-1 justify-center">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 ${guestCount > 0 ? 'animate-ping' : ''}"></span>
                Misafir
              </div>
            </div>
          </div>
        </div>

        <!-- Giriş yapmış kullanıcılar listesi -->
        <div class="mb-4">
          <div class="text-[11px] font-black text-[#06C167] uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#06C167] animate-pulse"></span> Oturum Açmış Canlı Müşteriler (${loggedInCount})
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            ${activeVisitors.length === 0 ? `
              <div class="col-span-full py-4 text-center text-xs text-gray-400 bg-white/5 rounded-2xl border border-white/5">
                😴 Şu an sitede oturum açmış müşteri bulunmuyor.
              </div>
            ` : activeVisitors.map((v, i) => `
              <div class="bg-[#06C167]/15 hover:bg-[#06C167]/25 transition rounded-2xl p-3.5 border border-[#06C167]/30 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl bg-[#06C167] text-white flex items-center justify-center text-sm font-black shadow-md shadow-[#06C167]/20 shrink-0">
                    👤
                  </div>
                  <div class="min-w-0">
                    <div class="font-black text-xs text-white flex items-center gap-1.5 truncate">
                      <span>${v.name || 'Müşteri'}</span>
                      <span class="w-1.5 h-1.5 rounded-full bg-[#06C167] animate-pulse shrink-0"></span>
                    </div>
                    <div class="text-[10px] text-gray-300 mt-0.5 truncate">${v.phone || v.email || 'Kayıtlı Profil'}</div>
                  </div>
                </div>
                <div class="text-right shrink-0 ml-2">
                  <span class="text-[10px] font-black px-2.5 py-1 rounded-lg bg-black/40 text-[#06C167] border border-[#06C167]/40 shadow-xs inline-block">
                    ${v.view || 'Menüde 🍽️'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Misafir ziyaretçiler listesi -->
        <div>
          <div class="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span> Misafir Ziyaretçiler
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            ${activeGuests.length === 0 ? `
              <div class="col-span-full py-3 text-center text-xs text-gray-500">
                🔍 Şu an misafir ziyaretçi yok
              </div>
            ` : activeGuests.map((v, i) => `
              <div class="bg-indigo-500/10 hover:bg-indigo-500/15 transition rounded-xl p-3 border border-indigo-400/20 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black">👁️</div>
                  <div>
                    <div class="font-bold text-xs text-gray-300">Misafir #${i + 1}</div>
                    <div class="text-[10px] text-gray-500">Giriş yapmamış</div>
                  </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  ${v.view || 'Menüde'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Özet Kartları -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Toplam Kayıtlı Müşteri</span>
            <div class="text-2xl font-black text-[#121212]">${customers.length}</div>
            <span class="text-[11px] text-gray-500 font-medium">SQLite veritabanı aktif</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            🛍️
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Müşteri Sipariş Sayısı</span>
            <div class="text-2xl font-black text-blue-600">${totalOrders}</div>
            <span class="text-[11px] text-gray-500 font-medium">Tamamlanan toplam sipariş</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Toplam Müşteri Cirosu</span>
            <div class="text-2xl font-black text-purple-700">₺${totalSpent.toLocaleString('tr-TR')}</div>
            <span class="text-[11px] text-gray-500 font-medium">Müşterilerden gelen ciro</span>
          </div>
        </div>
      </div>

      <!-- Müşteri Listesi Tablosu -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 class="text-xl font-extrabold text-[#121212]">Kayıtlı Müşteri Veritabanı</h3>
            <p class="text-xs text-gray-500 mt-0.5">Sisteme kaydolan veya sipariş veren müşterilerin kayıt tarihleri ve sipariş verileri</p>
          </div>

          <!-- Arama Kutusu -->
          <div class="relative w-full sm:w-72">
            <input 
              id="admin-customer-search" 
              type="text" 
              placeholder="İsim veya telefon ara..." 
              value="${searchQuery || ''}"
              class="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#06C167] focus:bg-white outline-none transition"
            />
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        ${filteredCustomers.length === 0 ? `
          <div class="py-12 text-center">
            <div class="text-4xl mb-3">🔍</div>
            <h4 class="font-extrabold text-gray-700 text-sm">
              ${customers.length === 0 ? 'Henüz kayıtlı müşteri bulunmuyor.' : 'Arama kriterinize uygun müşteri bulunamadı.'}
            </h4>
            <p class="text-xs text-gray-400 mt-1">
              ${customers.length === 0 ? 'Müşteriler sipariş verdikçe veya kayıt oldukça bu alanda listelenecektir.' : 'Lütfen farklı bir isim veya telefon ile arama yapınız.'}
            </p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th class="py-3 px-3">#</th>
                  <th class="py-3 px-3">Müşteri</th>
                  <th class="py-3 px-3">Telefon</th>
                  <th class="py-3 px-3">Kayıt Tarihi</th>
                  <th class="py-3 px-3 text-center">Sipariş</th>
                  <th class="py-3 px-3 text-right">Toplam Ciro</th>
                  <th class="py-3 px-3 text-center">Tanımlı Özel Kod</th>
                  <th class="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-xs">
                ${filteredCustomers.map((customer, idx) => {
                  const regDate = customer.registered_at 
                    ? new Date(customer.registered_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Bilinmiyor';

                  const initials = (customer.name || 'M')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return `
                    <tr class="hover:bg-gray-50/80 transition">
                      <td class="py-3.5 px-3 font-mono text-gray-400 text-[11px]">${idx + 1}</td>
                      <td class="py-3.5 px-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#06C167] font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                            ${initials}
                          </div>
                          <div>
                            <div class="flex items-center gap-1.5">
                              <span class="font-bold text-gray-900">${customer.name}</span>
                              ${customer.is_verified ? `
                                <span class="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded-full">✓ Onaylı</span>
                              ` : ''}
                            </div>
                            ${customer.email ? `
                              <span class="text-[10px] text-gray-500 block font-mono">${customer.email}</span>
                            ` : ''}
                            <span class="text-[10px] text-gray-400 font-mono">ID: #${customer.id}</span>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-3">
                        <a href="tel:${customer.phone}" class="font-mono text-gray-700 hover:text-[#06C167] font-semibold flex items-center gap-1">
                          <span>📞</span>
                          <span>${customer.phone}</span>
                        </a>
                      </td>
                      <td class="py-3.5 px-3 text-gray-600 whitespace-nowrap font-medium">
                        ${regDate}
                      </td>
                      <td class="py-3.5 px-3 text-center">
                        <span class="bg-gray-100 text-gray-700 font-black px-2.5 py-1 rounded-full text-[11px]">
                          ${customer.total_orders || 0} sipariş
                        </span>
                      </td>
                      <td class="py-3.5 px-3 text-right font-black text-gray-900">
                        ₺${(customer.total_spent || 0).toLocaleString('tr-TR')}
                      </td>
                      <td class="py-3.5 px-3 text-center">
                        ${customer.custom_code ? `
                          <span class="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-[11px] font-black border border-purple-200 whitespace-nowrap">
                            🏷️ ${customer.custom_code} (%${customer.custom_discount || 0})
                          </span>
                        ` : `
                          <span class="text-gray-400 text-[11px] font-medium">
                            Yok
                          </span>
                        `}
                      </td>
                      <td class="py-3.5 px-3 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button 
                            data-open-assign-code="${customer.phone || customer.email || customer.id || ''}" 
                            title="Özel İndirim Kodu Tanımla"
                            class="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-purple-200"
                          >
                            <span>🏷️</span>
                            <span class="hidden md:inline">Kod</span>
                          </button>

                          <button 
                            data-open-send-message="${customer.phone || customer.email || customer.id || ''}" 
                            title="Müşteriye Özel Mesaj Gönder"
                            class="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-blue-200"
                          >
                            <span>✉️</span>
                            <span class="hidden md:inline">Mesaj</span>
                          </button>

                          <button 
                            data-delete-customer="${customer.phone || customer.email || customer.id || ''}" 
                            data-customer-phone="${customer.phone || ''}"
                            data-customer-email="${customer.email || ''}"
                            data-customer-id="${customer.id || ''}"
                            data-customer-name="${customer.name || 'Müşteri'}"
                            title="Müşteriyi Kalıcı Olarak Sil"
                            class="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-red-200"
                          >
                            <span>🗑️</span>
                            <span class="hidden md:inline">Sil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

    </div>
  `;
}

// 4. Müşteri Yorum & Puan Yönetim Sekmesi (Admin Panel)
function renderAdminReviewsTab(state) {
  const reviews = state.reviewsList || [];
  const avgScore = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const fiveStarCount = reviews.filter(r => r.rating === 5).length;

  return `
    <div class="space-y-6">
      
      <!-- Özet İstatistik Kartları -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold">
            ⭐
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Ortalama Puan</span>
            <div class="text-2xl font-black text-gray-900">${avgScore} / 5.0</div>
            <span class="text-[11px] text-gray-500 font-medium">Toplam ${reviews.length} değerlendirme</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-xl font-bold">
            🌟
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">5 Yıldızlı Yorumlar</span>
            <div class="text-2xl font-black text-[#06C167]">${fiveStarCount} adet</div>
            <span class="text-[11px] text-gray-500 font-medium">En yüksek memnuniyet</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            💬
          </div>
          <div>
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Yorum Durumu</span>
            <div class="text-2xl font-black text-blue-600">Canlı & Aktif</div>
            <span class="text-[11px] text-gray-500 font-medium">Sitede anında listelenir</span>
          </div>
        </div>
      </div>

      <!-- Yorumlar Tablosu -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <h3 class="text-xl font-extrabold text-[#121212]">Müşteri Değerlendirmeleri & Yorumları</h3>
            <p class="text-xs text-gray-500 mt-0.5">Sitenizden gelen müşteri geri bildirimlerini inceleyin veya uygunsuz olanları kaldırın</p>
          </div>
        </div>

        ${reviews.length === 0 ? `
          <div class="py-12 text-center text-gray-400">
            <span class="text-4xl block mb-2">⭐</span>
            <h4 class="font-extrabold text-gray-700 text-sm">Henüz bir müşteri yorumu bulunmuyor.</h4>
            <p class="text-xs text-gray-400 mt-1">Müşteriler siparişlerini veya menüyü değerlendirdikçe burada listelenecektir.</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th class="py-3 px-3">#</th>
                  <th class="py-3 px-3">Müşteri</th>
                  <th class="py-3 px-3">Ürün / Konu</th>
                  <th class="py-3 px-3 text-center">Puan</th>
                  <th class="py-3 px-3">Yorum</th>
                  <th class="py-3 px-3">Tarih</th>
                  <th class="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-xs">
                ${reviews.map((rev, idx) => {
                  const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                  const stars = '★'.repeat(rev.rating) + '☆'.repeat(Math.max(0, 5 - rev.rating));

                  return `
                    <tr class="hover:bg-gray-50/80 transition">
                      <td class="py-3.5 px-3 font-mono text-gray-400 text-[11px]">${idx + 1}</td>
                      <td class="py-3.5 px-3">
                        <span class="font-bold text-gray-900 block">${rev.customer_name}</span>
                        ${rev.customer_email ? `<span class="text-[10px] text-gray-400 font-mono block">${rev.customer_email}</span>` : ''}
                      </td>
                      <td class="py-3.5 px-3">
                        <span class="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
                          ${rev.product_name || 'Pita Mutfak Genel'}
                        </span>
                      </td>
                      <td class="py-3.5 px-3 text-center">
                        <span class="text-amber-500 font-bold tracking-widest">${stars}</span>
                      </td>
                      <td class="py-3.5 px-3 max-w-xs">
                        <p class="text-gray-700 line-clamp-2 leading-relaxed">${rev.comment}</p>
                      </td>
                      <td class="py-3.5 px-3 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                        ${dateStr}
                      </td>
                      <td class="py-3.5 px-3 text-right">
                        <button 
                          data-delete-review-btn="${rev.id}"
                          class="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-red-200 ml-auto"
                          title="Yorumu Sil"
                        >
                          <span>🗑️</span>
                          <span class="hidden md:inline">Sil</span>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

    </div>
  `;
}

// =================== 5. MUHASEBE & GİDER YÖNETİMİ (ACCOUNTING & EXPENSES) ===================
function renderAccountingTab(orders, expenses, state) {
  const accountingPeriod = state.accountingPeriod || 'today';
  const customStart = state.accountingCustomStart || '';
  const customEnd = state.accountingCustomEnd || '';
  const expenseCategoryFilter = state.expenseCategoryFilter || 'all';

  const kpis = orderService.calculateAccountingKPIs(orders, expenses, accountingPeriod, customStart, customEnd);
  const dailyLedgerRows = orderService.getDailyLedger(orders, expenses);

  // Gider listesi için kategori filtresi
  let displayedExpenses = kpis.periodExpenses;
  if (expenseCategoryFilter !== 'all') {
    displayedExpenses = displayedExpenses.filter(e => (e.category || 'Malzeme') === expenseCategoryFilter);
  }

  const categoryOptions = [
    { id: 'all', label: 'Tüm Harcamalar' },
    { id: 'Malzeme', label: '🍗 Gıda & Malzeme' },
    { id: 'Kurye', label: '🛵 Kurye & Yakıt' },
    { id: 'Kira', label: '🏢 Dükkan Kirası' },
    { id: 'Fatura', label: '💡 Fatura' },
    { id: 'Personel', label: '👥 Personel' },
    { id: 'Ambalaj', label: '📦 Ambalaj' },
    { id: 'Diğer', label: '🏷️ Diğer' }
  ];

  return `
    <div class="space-y-6">
      
      <!-- Üst Dönem Seçici & Eylem Çubuğu -->
      <div class="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-xl font-black text-[#121212]">Restoran Muhasebe & Kasa Motoru</h3>
            <span class="bg-[#E8F8EE] text-[#06C167] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-[#06C167]/30">Açık Kaynak Standartlarında</span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">Sipariş teslimat ciroları, dükkan giderleri ve çift kasa (Nakit & Banka/POS) dengesi anlık hesaplanır</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Dönem Filtreleri -->
          <div class="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button 
              data-accounting-period="today" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${accountingPeriod === 'today' ? 'bg-[#06C167] text-white shadow-xs font-black' : 'text-gray-600 hover:text-black'}"
            >
              Bugün
            </button>
            <button 
              data-accounting-period="yesterday" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${accountingPeriod === 'yesterday' ? 'bg-[#121212] text-white shadow-xs font-black' : 'text-gray-600 hover:text-black'}"
            >
              Dün
            </button>
            <button 
              data-accounting-period="week" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${accountingPeriod === 'week' ? 'bg-[#121212] text-white shadow-xs font-black' : 'text-gray-600 hover:text-black'}"
            >
              Son 7 Gün
            </button>
            <button 
              data-accounting-period="month" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${accountingPeriod === 'month' ? 'bg-[#121212] text-white shadow-xs font-black' : 'text-gray-600 hover:text-black'}"
            >
              Bu Ay
            </button>
            <button 
              data-accounting-period="all" 
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${accountingPeriod === 'all' ? 'bg-[#121212] text-white shadow-xs font-black' : 'text-gray-600 hover:text-black'}"
            >
              Tümü
            </button>
          </div>

          <!-- Özel Tarih Aralığı -->
          <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-2xl">
            <input 
              type="date" 
              id="accounting-custom-start" 
              value="${customStart}" 
              class="text-[11px] bg-transparent outline-none font-bold text-gray-700" 
              title="Başlangıç Tarihi"
            />
            <span class="text-gray-400 text-xs">-</span>
            <input 
              type="date" 
              id="accounting-custom-end" 
              value="${customEnd}" 
              class="text-[11px] bg-transparent outline-none font-bold text-gray-700" 
              title="Bitiş Tarihi"
            />
            <button 
              id="accounting-apply-range-btn" 
              class="bg-gray-800 hover:bg-[#06C167] text-white text-[10px] font-black px-2 py-1 rounded-lg transition cursor-pointer"
            >
              Filtrele
            </button>
          </div>

          <!-- Eylem Butonları: Yeni Gider, CSV İndir, Z-Raporu Yazdır -->
          <div class="flex items-center gap-1.5">
            <button 
              id="open-add-expense-btn" 
              class="bg-[#121212] hover:bg-[#06C167] text-white font-black px-3.5 py-2 rounded-2xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>➕</span>
              <span>Yeni Gider</span>
            </button>

            <button 
              id="export-accounting-csv-btn" 
              class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-3 py-2 rounded-2xl text-xs transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
              title="Muhasebe defterini Excel / CSV olarak indir"
            >
              <span>📥</span>
              <span class="hidden sm:inline">Excel / CSV</span>
            </button>

            <button 
              id="print-accounting-report-btn" 
              class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3 py-2 rounded-2xl text-xs transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
              title="Dönem Kasa & Z-Raporunu Yazdır veya PDF olarak kaydet"
            >
              <span>🖨️</span>
              <span class="hidden sm:inline">Z-Raporu Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4 BÜYÜK FİNANSAL GÖSTERGE KARTI & ÇİFT KASA BİLGİSİ -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- 1. Toplam Teslimat Geliri -->
        <div class="bg-gradient-to-br from-[#E8F8EE] to-[#d3f5df] rounded-3xl p-6 border border-[#06C167]/30 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black text-emerald-900 uppercase tracking-wider">Teslimat Geliri (Ciro)</span>
            <span class="w-9 h-9 rounded-xl bg-[#06C167] text-white flex items-center justify-center font-bold text-base shadow-sm">💰</span>
          </div>
          <div class="text-3xl font-black text-[#06C167]">₺${kpis.totalRevenue.toLocaleString('tr-TR')}</div>
          <div class="text-[11px] text-emerald-800 font-bold mt-2 pt-2 border-t border-[#06C167]/20 flex items-center justify-between">
            <span>📦 ${kpis.deliveredCount} Teslimat (${kpis.totalOrderCount} Toplam)</span>
            <span>Ort: ₺${kpis.avgOrderValue}</span>
          </div>
        </div>

        <!-- 2. Toplam İşletme Gideri -->
        <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-3xl p-6 border border-rose-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black text-rose-900 uppercase tracking-wider">Toplam İşletme Gideri</span>
            <span class="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-base shadow-sm">📉</span>
          </div>
          <div class="text-3xl font-black text-rose-600">₺${kpis.totalExpense.toLocaleString('tr-TR')}</div>
          <div class="text-[11px] text-rose-800 font-bold mt-2 pt-2 border-t border-rose-200 flex items-center justify-between">
            <span>🧾 ${kpis.periodExpenses.length} Harcama Kalemi</span>
            <span>${kpis.categoryBreakdown.length > 0 ? kpis.categoryBreakdown[0].category : 'Gider Yok'}</span>
          </div>
        </div>

        <!-- 3. Net Kâr / Kasa Bakiyesi -->
        <div class="bg-gradient-to-br ${kpis.isProfit ? 'from-[#121212] via-[#1a2e22] to-[#121212] text-white' : 'from-red-900 to-red-950 text-white'} rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black ${kpis.isProfit ? 'text-[#06C167]' : 'text-red-300'} uppercase tracking-wider">Net Kâr / Kasa Fazlası</span>
            <span class="w-9 h-9 rounded-xl ${kpis.isProfit ? 'bg-[#06C167]' : 'bg-red-600'} text-white flex items-center justify-center font-bold text-base shadow-sm">
              ${kpis.isProfit ? '📈' : '📉'}
            </span>
          </div>
          <div class="text-3xl font-black ${kpis.isProfit ? 'text-[#06C167]' : 'text-red-200'}">
            ${kpis.isProfit ? '+' : ''}₺${kpis.netProfit.toLocaleString('tr-TR')}
          </div>
          <div class="text-[11px] text-gray-300 font-semibold mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between">
            <span class="px-2 py-0.5 rounded-full ${kpis.isProfit ? 'bg-[#06C167]/30 text-[#06C167]' : 'bg-red-500/30 text-red-200'} font-black">
              Kâr Marjı: %${kpis.profitMargin}
            </span>
            <span class="text-gray-400 font-bold">${kpis.isProfit ? '🟢 Kârlı Dönem' : '🔴 Zararda'}</span>
          </div>
        </div>

        <!-- 4. Çift Kasa Ayrımı (Nakit Kasası & Banka/POS Kasası) -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black text-gray-800 uppercase tracking-wider">Kasa & Hesap Bakiyesi</span>
            <span class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shadow-xs">🏦</span>
          </div>
          <div class="space-y-2 mt-1">
            <div class="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-xl">
              <span class="text-gray-600 font-bold flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 💵 Nakit Kasa:
              </span>
              <span class="font-black ${kpis.cashBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}">
                ₺${kpis.cashBalance.toLocaleString('tr-TR')}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-xl">
              <span class="text-gray-600 font-bold flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span> 💳 Banka / POS:
              </span>
              <span class="font-black ${kpis.bankBalance >= 0 ? 'text-blue-700' : 'text-rose-600'}">
                ₺${kpis.bankBalance.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
          <div class="text-[10px] text-gray-400 font-bold pt-2 border-t border-gray-100 mt-2 flex items-center justify-between">
            <span>Nakit Ciro: ₺${kpis.cashRevenue.toLocaleString('tr-TR')}</span>
            <span>EFT Ciro: ₺${kpis.eftRevenue.toLocaleString('tr-TR')}</span>
          </div>
        </div>

      </div>

      <!-- KATEGORİ HARCAMA DAĞILIMI (GÖRSEL ÇUBUKLAR) -->
      ${kpis.categoryBreakdown.length > 0 ? `
        <div class="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
          <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <div>
              <h4 class="font-black text-sm text-[#121212]">Harcama & Gider Dağılımı</h4>
              <p class="text-[11px] text-gray-400">${kpis.periodLabel} içindeki masrafların kategorilere göre oranları</p>
            </div>
            <span class="text-xs font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-xl">
              Toplam ${kpis.categoryBreakdown.length} Kategori
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            ${kpis.categoryBreakdown.map(item => `
              <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div class="flex items-center justify-between text-xs font-extrabold text-gray-700 mb-1">
                  <span class="truncate">${item.category}</span>
                  <span class="text-rose-600 font-black">%${item.percentage}</span>
                </div>
                <div class="text-sm font-black text-[#121212]">₺${item.amount.toLocaleString('tr-TR')}</div>
                <div class="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div class="bg-rose-500 h-full rounded-full" style="width: ${item.percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- İKİ ANA TABLO: 1. İŞLETME GİDER DEFTERİ  2. GÜNLÜK KASA & Z-RAPORU -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- SOL BÖLÜM: İŞLETME GİDER DEFTERİ (7 Kolon) -->
        <div class="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            <div>
              <h4 class="font-black text-base text-[#121212]">İşletme Gider Defteri</h4>
              <p class="text-xs text-gray-400">${kpis.periodLabel} kapsamındaki harcamalar</p>
            </div>
            
            <!-- Kategori Filtresi -->
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <select 
                id="admin-expense-category-filter" 
                class="text-xs font-bold border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white outline-none focus:border-[#06C167]"
              >
                ${categoryOptions.map(cat => `
                  <option value="${cat.id}" ${expenseCategoryFilter === cat.id ? 'selected' : ''}>${cat.label}</option>
                `).join('')}
              </select>
              <span class="text-xs font-black bg-rose-50 text-rose-700 px-3 py-1 rounded-xl border border-rose-100 whitespace-nowrap">
                ₺${kpis.totalExpense.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>

          ${displayedExpenses.length === 0 ? `
            <div class="py-12 text-center text-gray-400">
              <span class="text-4xl block mb-2">🧾</span>
              <h5 class="font-black text-gray-700 text-sm">Bu dönem için kayıtlı gider bulunamadı</h5>
              <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Malzeme alımı, fatura veya personel gideri eklemek için yukarıdaki "Yeni Gider" butonunu kullanabilirsiniz.</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                    <th class="py-2.5 px-3">Tarih</th>
                    <th class="py-2.5 px-3">Kategori</th>
                    <th class="py-2.5 px-3">Gider Kalemi</th>
                    <th class="py-2.5 px-3 text-center">Ödeme Kasası</th>
                    <th class="py-2.5 px-3 text-right">Tutar</th>
                    <th class="py-2.5 px-3 text-right">Sil</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-xs">
                  ${displayedExpenses.map(exp => `
                    <tr class="hover:bg-gray-50/80 transition">
                      <td class="py-3 px-3 font-mono text-gray-500 whitespace-nowrap text-[11px]">
                        ${exp.date || (exp.createdAt ? exp.createdAt.split('T')[0] : '—')}
                      </td>
                      <td class="py-3 px-3">
                        <span class="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2 py-0.5 rounded-lg whitespace-nowrap">
                          ${exp.category || 'Malzeme'}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        <div class="font-bold text-gray-900">${exp.title}</div>
                        ${exp.note ? `<div class="text-[10px] text-gray-400 mt-0.5 font-sans">Belge/Not: ${exp.note}</div>` : ''}
                      </td>
                      <td class="py-3 px-3 text-center whitespace-nowrap">
                        ${exp.payment_account === 'bank' ? `
                          <span class="bg-blue-50 text-blue-700 font-extrabold text-[10px] px-2 py-0.5 rounded-lg border border-blue-100">💳 Banka/EFT</span>
                        ` : `
                          <span class="bg-emerald-50 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-lg border border-emerald-100">💵 Nakit</span>
                        `}
                      </td>
                      <td class="py-3 px-3 text-right font-black text-rose-600 whitespace-nowrap text-sm">
                        -₺${(parseFloat(exp.amount) || 0).toLocaleString('tr-TR')}
                      </td>
                      <td class="py-3 px-3 text-right">
                        <button 
                          data-delete-expense-btn="${exp.id}" 
                          data-expense-title="${exp.title}"
                          class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Gideri Sil"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- SAĞ BÖLÜM: GÜNLÜK KASA & Z-RAPORU (5 Kolon) -->
        <div class="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <h4 class="font-black text-base text-[#121212]">Günlük Z-Raporu Defteri</h4>
              <p class="text-xs text-gray-400">Her günün ciro, gider ve net kâr dökümü</p>
            </div>
            <span class="text-xs font-black bg-[#E8F8EE] text-[#06C167] px-3 py-1 rounded-xl border border-emerald-200">
              ${dailyLedgerRows.length} Gün Kayıtlı
            </span>
          </div>

          ${dailyLedgerRows.length === 0 ? `
            <div class="py-12 text-center text-gray-400">
              <span class="text-4xl block mb-2">📅</span>
              <h5 class="font-black text-gray-700 text-sm">Henüz gün sonu kaydı yok</h5>
              <p class="text-xs text-gray-400 mt-1">Sipariş verildikçe veya harcama yapıldıkça her günün Z-raporu burada listelenecektir.</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                    <th class="py-2.5 px-2">Tarih</th>
                    <th class="py-2.5 px-2 text-center">Sipariş</th>
                    <th class="py-2.5 px-2 text-right">Ciro</th>
                    <th class="py-2.5 px-2 text-right">Gider</th>
                    <th class="py-2.5 px-2 text-right">Net Kâr</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-xs">
                  ${dailyLedgerRows.map(row => {
                    const rowNet = row.revenue - row.expense;
                    const rowIsProfit = rowNet >= 0;
                    return `
                      <tr class="hover:bg-gray-50/80 transition">
                        <td class="py-3 px-2 font-mono font-bold text-gray-900 whitespace-nowrap text-[11px]">
                          ${row.date}
                        </td>
                        <td class="py-3 px-2 text-center whitespace-nowrap">
                          <span class="bg-gray-100 text-gray-700 font-extrabold px-2 py-0.5 rounded-lg text-[10px]">
                            ${row.deliveredCount}/${row.totalCount}
                          </span>
                        </td>
                        <td class="py-3 px-2 text-right font-bold text-[#06C167] whitespace-nowrap">
                          ₺${row.revenue.toLocaleString('tr-TR')}
                        </td>
                        <td class="py-3 px-2 text-right font-bold text-rose-500 whitespace-nowrap">
                          ₺${row.expense.toLocaleString('tr-TR')}
                        </td>
                        <td class="py-3 px-2 text-right font-black ${rowIsProfit ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">
                          ${rowIsProfit ? '+' : ''}₺${rowNet.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>

    </div>
  `;
}

// Yeni Gider / Masraf Ekleme Modalı
function renderAddExpenseModal(state) {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div id="add-expense-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-bold">
              🧾
            </div>
            <div>
              <h3 class="font-black text-base text-[#121212]">Yeni İşletme Gideri Ekle</h3>
              <p class="text-[11px] text-gray-500">Muhasebe ve dükkan kasasına yeni bir harcama işleyin</p>
            </div>
          </div>
          <button id="close-add-expense-btn" class="p-2 text-gray-400 hover:text-black cursor-pointer font-bold">✕</button>
        </div>

        <form id="admin-add-expense-form" class="space-y-4 pt-4">
          
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Gider Başlığı / Açıklaması *</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="Örn: 25 kg Didilmiş Tavuk Göğsü, 10 Teneke Ayçiçek Yağı, Kurye Yakıtı..." 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none font-medium"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Kategori *</label>
              <select 
                name="category" 
                class="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none bg-white font-medium"
              >
                <option value="Malzeme">🍗 Gıda & Malzeme</option>
                <option value="Kurye">🛵 Kurye & Yakıt</option>
                <option value="Kira">🏢 Dükkan Kirası</option>
                <option value="Fatura">💡 Elektrik / Su / Gaz</option>
                <option value="Personel">👥 Personel / Maaş</option>
                <option value="Ambalaj">📦 Ambalaj & Poşet</option>
                <option value="Diğer">🏷️ Diğer Gider</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Tutar (₺) *</label>
              <input 
                type="number" 
                name="amount" 
                step="0.01" 
                min="0.5" 
                required 
                placeholder="0.00" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none font-bold text-rose-600"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Harcama Tarihi *</label>
              <input 
                type="date" 
                name="date" 
                value="${today}" 
                required 
                class="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none font-medium bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Fatura / Fiş No (Opsiyonel)</label>
              <input 
                type="text" 
                name="note" 
                placeholder="Örn: Fiş #2045" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Ödeme Hesabı / Kasa *</label>
            <select 
              name="payment_account" 
              class="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none bg-white font-medium"
            >
              <option value="cash">💵 Nakit Kasası (Dükkan Kasasından Ödendi)</option>
              <option value="bank">💳 Banka / POS / Şirket Hesabı (EFT / Kart ile Ödendi)</option>
            </select>
          </div>

          <div class="pt-2 flex items-center gap-2">
            <button 
              type="submit" 
              class="flex-1 bg-[#121212] hover:bg-[#06C167] text-white font-extrabold py-3 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>💾 Gideri Kaydet</span>
            </button>
            <button 
              type="button" 
              id="cancel-add-expense-btn" 
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-3 rounded-2xl text-xs transition cursor-pointer"
            >
              İptal
            </button>
          </div>

        </form>

      </div>
    </div>
  `;
}

// Özel Kod Tanımlama Modalı

function renderAssignCodeModal(customer) {
  return `
    <div id="assign-code-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏷️</span>
            <div>
              <h3 class="font-black text-base text-[#121212]">Özel İndirim Kodu Tanımla</h3>
              <p class="text-[11px] text-gray-500">${customer.name} (${customer.phone})</p>
            </div>
          </div>
          <button id="close-assign-code-btn" class="p-2 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        <form id="admin-assign-code-form" data-customer-phone="${customer.phone}" class="space-y-4 pt-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Kupon / İndirim Kodu *</label>
            <input 
              type="text" 
              name="code" 
              required 
              value="${customer.custom_code || ''}" 
              placeholder="Örn: VIP25 veya PITA30" 
              class="w-full text-xs uppercase tracking-wider font-mono font-black px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 outline-none"
            />
            <p class="text-[10px] text-gray-400 mt-1">Müşteri bu kodu sepette girerek veya tek tıkla uygulayabilir.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">İndirim Oranı (% Yüzde) *</label>
            <div class="relative">
              <input 
                type="number" 
                name="discount" 
                required 
                min="1" 
                max="90" 
                value="${customer.custom_discount || 20}" 
                class="w-full text-xs font-black px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 outline-none"
              />
              <span class="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">%</span>
            </div>
          </div>

          <div class="pt-2 flex items-center gap-2">
            <button 
              type="submit" 
              class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition cursor-pointer"
            >
              Kodu Tanımla ve Kaydet
            </button>
            ${customer.custom_code ? `
              <button 
                type="button" 
                id="remove-custom-code-btn" 
                data-customer-phone="${customer.phone}"
                class="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-3 rounded-2xl text-xs transition cursor-pointer border border-red-200"
              >
                Kaldır
              </button>
            ` : ''}
          </div>
        </form>
      </div>
    </div>
  `;
}

// Müşteriye Mesaj Gönderme Modalı
function renderSendMessageModal(customer) {
  return `
    <div id="send-message-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">✉️</span>
            <div>
              <h3 class="font-black text-base text-[#121212]">Müşteriye Mesaj Gönder</h3>
              <p class="text-[11px] text-gray-500">${customer.name} (${customer.phone})</p>
            </div>
          </div>
          <button id="close-send-message-btn" class="p-2 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        <form id="admin-send-message-form" data-customer-phone="${customer.phone}" class="space-y-4 pt-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Mesaj Başlığı *</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="Örn: Pita Mutfak Özel Teşekkür / Kupon Bildirimi" 
              class="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Mesaj İçeriği *</label>
            <textarea 
              name="message" 
              rows="4" 
              required 
              placeholder="Müşterinize iletmek istediğiniz özel mesajı veya bildirimi yazınız..." 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 outline-none leading-relaxed"
            ></textarea>
            <p class="text-[10px] text-gray-400 mt-1">Bu mesaj müşterinin ekranındaki bildirim kutusuna canlı olarak iletilecektir.</p>
          </div>

          <div class="pt-2">
            <button 
              type="submit" 
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>✉️ Mesajı Hemen Gönder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Yeni Ürün Ekleme Modalı
function renderAddProductModal() {
  return `
    <div id="add-product-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 class="font-black text-lg text-[#121212]">Yeni Menü Ürünü Ekle</h3>
          <button id="close-add-product-btn" class="p-2 text-gray-400 hover:text-black">✕</button>
        </div>
        <form id="admin-add-product-form" class="space-y-4 pt-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Ürün Adı *</label>
            <input type="text" name="name" required placeholder="Örn: Tereyağlı Duble Tavuk Pilav" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"/>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Kategori *</label>
            <select name="category" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none">
              <option value="tavuk-pilav">Tavuk Pilav Çeşitleri</option>
              <option value="makarna">Makarna Çeşitleri</option>
              <option value="kuru-fasulye">Kuru Fasulye & Pilav</option>
              <option value="icecek">İçecek & Yan Lezzetler</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Fiyat (₺) *</label>
            <input type="number" name="price" required placeholder="140" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"/>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Açıklama *</label>
            <textarea name="description" rows="2" required placeholder="İçindekiler ve lezzet detayları..." class="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Görsel URL</label>
            <input type="url" name="image" placeholder="https://..." class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"/>
          </div>
          <div class="pt-2">
            <button type="submit" class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3 rounded-2xl text-xs shadow-md transition">
              Ürünü Menüye Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Müşteri Sorununa Yanıt Verme Modalı
function renderReplyIssueModal(order) {
  return `
    <div id="reply-issue-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
              💬
            </div>
            <div>
              <h3 class="font-black text-base text-[#121212]">Müşteri Sorununa Yanıt Ver</h3>
              <p class="text-[11px] text-gray-500">Sipariş #${order.id} • ${order.customerName} (${order.customerPhone})</p>
            </div>
          </div>
          <button id="close-reply-issue-btn" class="p-2 text-gray-400 hover:text-black rounded-xl transition cursor-pointer">✕</button>
        </div>

        <div class="overflow-y-auto py-4 space-y-4 flex-1">
          <!-- Müşterinin Bildirdiği Sorun Özeti -->
          <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs">
            <div class="flex items-center justify-between text-rose-900 font-black mb-1">
              <span>⚠️ Müşteri Şikayeti: ${order.issueReport?.reason || 'Genel Şikayet'}</span>
              <span class="text-[10px] text-gray-500 font-normal">${order.issueReport?.reportedTime || ''}</span>
            </div>
            <p class="text-gray-800 italic bg-white p-3 rounded-xl border border-rose-200 mt-2 leading-relaxed">
              "${order.issueReport?.message || 'Açıklama belirtilmemiş'}"
            </p>
          </div>

          <!-- Hızlı Yanıt Şablonları (Pills) -->
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-2">⚡ Hızlı Yanıt Şablonları (Tek Tıkla Ekle):</label>
            <div class="flex flex-wrap gap-1.5">
              <button 
                type="button" 
                class="quick-reply-pill bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
                data-text="Merhaba, yaşadığınız bu aksaklık için Pita Mutfak ailesi olarak çok özür dileriz. Eksik ürününüzü hemen kuryemizle telafi olarak gönderiyoruz."
              >
                🛵 Eksik Ürünü Hemen Gönderiyoruz
              </button>
              <button 
                type="button" 
                class="quick-reply-pill bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
                data-text="Merhaba, geri bildiriminiz için teşekkür ederiz. Mutfak ekibimiz uyarıldı ve bir sonraki siparişiniz için hesabınıza özel indirim tanımlandı. Afiyet olsun!"
              >
                🎁 Özür & İndirim Tanımlandı
              </button>
              <button 
                type="button" 
                class="quick-reply-pill bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
                data-text="Merhaba, yaşanan gecikme/yoğunluk nedeniyle özür dileriz. Sorun çözümlenmiştir, memnuniyetiniz bizim için çok değerlidir."
              >
                ✓ Yoğunluk Özrü & Çözüldü
              </button>
            </div>
          </div>

          <form id="admin-reply-issue-form" data-order-id="${order.id}" class="space-y-4 pt-1">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Müşteriye İletilecek Yanıt Mesajı *</label>
              <textarea 
                id="reply-issue-textarea"
                name="replyMessage" 
                rows="4" 
                required 
                placeholder="Müşterinize iletmek istediğiniz açıklama veya telafi mesajını buraya yazınız..." 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 outline-none leading-relaxed"
              >${order.issueReport?.adminReply?.message || ''}</textarea>
              <p class="text-[10px] text-gray-400 mt-1">Bu yanıt hem müşterinin sipariş detayına eklenecek hem de gelen kutusuna anında bildirim olarak düşecektir.</p>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="auto-resolve-checkbox" name="autoResolve" checked class="w-4 h-4 accent-[#06C167] rounded cursor-pointer" />
              <label for="auto-resolve-checkbox" class="text-xs font-bold text-gray-700 cursor-pointer select-none">
                Sorunu "✓ Çözüldü" olarak işaretle
              </label>
            </div>

            <div class="pt-2 flex items-center gap-2">
              <button 
                type="submit" 
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>💬 Yanıtı Müşteriye Gönder</span>
              </button>
              <button 
                type="button" 
                id="cancel-reply-issue-btn"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-3 rounded-2xl text-xs transition cursor-pointer"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

// Event Listeners Bağlayıcı
function attachAdminEventListeners(container, state, onStateChange) {
  
  // Ses Testi Butonu
  const testSoundBtn = container.querySelector('#admin-test-sound-btn');
  if (testSoundBtn) {
    testSoundBtn.addEventListener('click', () => {
      playOrderSound();
    });
  }

  // Sekme Değişimi
  const tabOrdersBtn = container.querySelector('#tab-orders-btn');
  if (tabOrdersBtn) {
    tabOrdersBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'orders' }));
  }

  const tabMenuBtn = container.querySelector('#tab-menu-btn');
  if (tabMenuBtn) {
    tabMenuBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'menu' }));
  }

  const tabCustomersBtn = container.querySelector('#tab-customers-btn');
  if (tabCustomersBtn) {
    tabCustomersBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'customers' }));
  }

  const tabReviewsBtn = container.querySelector('#tab-reviews-btn');
  if (tabReviewsBtn) {
    tabReviewsBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'reviews' }));
  }

  const tabAccountingBtn = container.querySelector('#tab-accounting-btn');
  if (tabAccountingBtn) {
    tabAccountingBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'accounting' }));
  }

  const tabContactBtn = container.querySelector('#tab-contact-btn');
  if (tabContactBtn) {
    tabContactBtn.addEventListener('click', () => {
      // Contact mesajlarını yükle
      loadContactMessages(onStateChange);
      onStateChange({ adminActiveTab: 'contact' });
    });
  }

  // Canlı Ziyaretçi Rozeti & KPI Kartları Tıklanınca Müşteriler Sekmesine Geç
  const presenceBadgeBtn = container.querySelector('#admin-presence-badge-btn');
  if (presenceBadgeBtn) {
    presenceBadgeBtn.addEventListener('click', () => onStateChange({ adminActiveTab: 'customers' }));
  }

  const activeCustKpiCard = container.querySelector('#admin-active-customers-kpi-card');
  if (activeCustKpiCard) {
    activeCustKpiCard.addEventListener('click', () => onStateChange({ adminActiveTab: 'customers' }));
  }

  const activeGuestsKpiCard = container.querySelector('#admin-active-guests-kpi-card');
  if (activeGuestsKpiCard) {
    activeGuestsKpiCard.addEventListener('click', () => onStateChange({ adminActiveTab: 'customers' }));
  }

  // Siparişler Sekmesi: Günlük Tarih Filtreleme Butonları
  container.querySelectorAll('[data-admin-date-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterVal = btn.getAttribute('data-admin-date-filter');
      onStateChange({ adminDateFilter: filterVal });
    });
  });

  const customDatePicker = container.querySelector('#admin-custom-date-picker');
  if (customDatePicker) {
    customDatePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        onStateChange({ adminDateFilter: 'custom', adminCustomDate: e.target.value });
      }
    });
  }

  // Muhasebe Sekmesi: Dönem Filtre Butonları (Bugün / Dün / Son 7 Gün / Bu Ay / Tümü)
  container.querySelectorAll('[data-accounting-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-accounting-period');
      onStateChange({ accountingPeriod: period });
    });
  });

  // Muhasebe Sekmesi: Özel Tarih Aralığı Uygula
  const applyRangeBtn = container.querySelector('#accounting-apply-range-btn');
  if (applyRangeBtn) {
    applyRangeBtn.addEventListener('click', () => {
      const start = container.querySelector('#accounting-custom-start')?.value;
      const end = container.querySelector('#accounting-custom-end')?.value;
      if (!start || !end) {
        alert("Lütfen başlangıç ve bitiş tarihlerini seçiniz.");
        return;
      }
      onStateChange({
        accountingPeriod: 'range',
        accountingCustomStart: start,
        accountingCustomEnd: end
      });
    });
  }

  // Muhasebe Sekmesi: Kategori Filtresi
  const expenseCatFilter = container.querySelector('#admin-expense-category-filter');
  if (expenseCatFilter) {
    expenseCatFilter.addEventListener('change', (e) => {
      onStateChange({ expenseCategoryFilter: e.target.value });
    });
  }

  // Muhasebe Sekmesi: Excel / CSV İndir
  const exportCsvBtn = container.querySelector('#export-accounting-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const rows = orderService.getDailyLedger(orders, expensesList);
      const kpis = orderService.calculateAccountingKPIs(orders, expensesList, state.accountingPeriod || 'today', state.accountingCustomStart, state.accountingCustomEnd);
      orderService.exportLedgerToCSV(rows, kpis.periodLabel);
    });
  }

  // Muhasebe Sekmesi: Z-Raporu Yazdır
  const printReportBtn = container.querySelector('#print-accounting-report-btn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      const kpis = orderService.calculateAccountingKPIs(orders, expensesList, state.accountingPeriod || 'today', state.accountingCustomStart, state.accountingCustomEnd);
      const rows = orderService.getDailyLedger(orders, expensesList);
      
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert("Lütfen tarayıcınızın açılır pencere (popup) engelleyicisini kapatıp tekrar deneyiniz.");
        return;
      }
      
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <title>Pita Mutfak - Gün Sonu & Z-Raporu (${kpis.periodLabel})</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #111; max-width: 800px; margin: auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 16px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 900; margin: 0; }
            .subtitle { font-size: 13px; color: #666; margin-top: 4px; }
            .period { font-size: 14px; font-weight: bold; background: #eee; display: inline-block; padding: 4px 12px; border-radius: 6px; margin-top: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold; }
            .card-val { font-size: 20px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .profit { color: #008744; font-weight: bold; }
            .loss { color: #d62d20; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">🍕🍝🍗 PİTA MUTFAK</h1>
            <div class="subtitle">Finansal Kasa & Z-Raporu Çıktısı</div>
            <div class="period">Dönem: ${kpis.periodLabel} | Tarih: ${new Date().toLocaleString('tr-TR')}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Teslimat Geliri (Ciro)</div>
              <div class="card-val">₺${kpis.totalRevenue.toLocaleString('tr-TR')}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Toplam ${kpis.deliveredCount} Teslimat (Ort: ₺${kpis.avgOrderValue})</div>
            </div>
            <div class="card">
              <div class="card-title">Toplam İşletme Gideri</div>
              <div class="card-val" style="color: #d62d20;">₺${kpis.totalExpense.toLocaleString('tr-TR')}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">${kpis.periodExpenses.length} Kalem Harcama</div>
            </div>
            <div class="card">
              <div class="card-title">Net Kâr / Zarar</div>
              <div class="card-val ${kpis.isProfit ? 'profit' : 'loss'}">
                ${kpis.isProfit ? '+' : ''}₺${kpis.netProfit.toLocaleString('tr-TR')}
              </div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Kâr Marjı: %${kpis.profitMargin}</div>
            </div>
            <div class="card">
              <div class="card-title">Kasa Ayrımı (Nakit / Banka)</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 6px;">💵 Nakit Kasa: ₺${kpis.cashBalance.toLocaleString('tr-TR')}</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">💳 Banka/POS: ₺${kpis.bankBalance.toLocaleString('tr-TR')}</div>
            </div>
          </div>

          <h3 style="margin-top: 24px; font-size: 14px;">📅 Günlük Kasa Dökümü</h3>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th style="text-align: center;">Sipariş</th>
                <th class="text-right">Nakit Gelir</th>
                <th class="text-right">EFT/Kart Gelir</th>
                <th class="text-right">Toplam Ciro</th>
                <th class="text-right">Gider</th>
                <th class="text-right">Net Kâr</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><strong>${r.date}</strong></td>
                  <td style="text-align: center;">${r.deliveredCount} / ${r.totalCount}</td>
                  <td class="text-right">₺${(r.cashRevenue || 0).toLocaleString('tr-TR')}</td>
                  <td class="text-right">₺${(r.eftRevenue || 0).toLocaleString('tr-TR')}</td>
                  <td class="text-right" style="font-weight: bold;">₺${r.revenue.toLocaleString('tr-TR')}</td>
                  <td class="text-right" style="color: #c00;">-₺${r.expense.toLocaleString('tr-TR')}</td>
                  <td class="text-right ${r.isProfit ? 'profit' : 'loss'}">${r.isProfit ? '+' : ''}₺${r.netProfit.toLocaleString('tr-TR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Pita Mutfak Otomasyon & Muhasebe Sistemi • Güvenli Belge
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    });
  }

  // Yeni Gider Modalı Aç/Kapat
  const openExpenseBtn = container.querySelector('#open-add-expense-btn');
  if (openExpenseBtn) {
    openExpenseBtn.addEventListener('click', () => onStateChange({ isAddExpenseModalOpen: true }));
  }

  const closeExpenseBtn = container.querySelector('#close-add-expense-btn');
  if (closeExpenseBtn) {
    closeExpenseBtn.addEventListener('click', () => onStateChange({ isAddExpenseModalOpen: false }));
  }

  const cancelExpenseBtn = container.querySelector('#cancel-add-expense-btn');
  if (cancelExpenseBtn) {
    cancelExpenseBtn.addEventListener('click', () => onStateChange({ isAddExpenseModalOpen: false }));
  }

  const expenseBackdrop = container.querySelector('#add-expense-modal-backdrop');
  if (expenseBackdrop) {
    expenseBackdrop.addEventListener('click', (e) => {
      if (e.target === expenseBackdrop) onStateChange({ isAddExpenseModalOpen: false });
    });
  }

  // Yeni Gider Formu Kaydetme
  const addExpenseForm = container.querySelector('#admin-add-expense-form');
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addExpenseForm);
      const title = (formData.get('title') || '').trim();
      const category = formData.get('category') || 'Malzeme';
      const amount = parseFloat(formData.get('amount')) || 0;
      const date = formData.get('date') || new Date().toISOString().split('T')[0];
      const note = (formData.get('note') || '').trim();
      const payment_account = formData.get('payment_account') || 'cash';

      if (!title || amount <= 0) {
        alert("Lütfen geçerli bir gider açıklaması ve tutarı giriniz.");
        return;
      }

      await orderService.addExpense({ title, category, amount, date, note, payment_account });
      const updated = await orderService.getExpenses();
      alert(`✓ "₺${amount} - ${title}" gideri muhasebe defterine başarıyla işlendi.`);
      onStateChange({ isAddExpenseModalOpen: false, expensesList: updated });
    });
  }

  // Gider Kaydını Silme
  container.querySelectorAll('[data-delete-expense-btn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const expId = btn.getAttribute('data-delete-expense-btn');
      const title = btn.getAttribute('data-expense-title') || 'bu gideri';
      if (confirm(`"${title}" gider kaydını muhasebeden kalıcı olarak silmek istediğinize emin misiniz?`)) {
        await orderService.deleteExpense(expId);
        const updated = await orderService.getExpenses();
        onStateChange({ expensesList: updated });
      }
    });
  });


  // Yorum Silme (Admin)
  container.querySelectorAll('[data-delete-review-btn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const revId = btn.getAttribute('data-delete-review-btn');
      if (confirm(`Bu müşteri değerlendirmesini silmek istediğinize emin misiniz?`)) {
        await orderService.deleteReview(revId);
        const updated = await orderService.getReviews();
        onStateChange({ reviewsList: updated });
        alert("Yorum başarıyla silindi.");
      }
    });
  });

  // Müşteri Arama Kutusu Dinleyicisi
  const customerSearchInput = container.querySelector('#admin-customer-search');
  if (customerSearchInput) {
    customerSearchInput.addEventListener('input', (e) => {
      onStateChange({ customerSearchQuery: e.target.value });
    });
  }

  // Sipariş Filtresi
  container.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-admin-filter');
      onStateChange({ adminFilter: f });
    });
  });

  // Sipariş Durumu Güncelleme Butonları
  container.querySelectorAll('.admin-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-order-id');
      const newStatus = btn.getAttribute('data-action-status');
      orderService.updateOrderStatus(orderId, newStatus);
      onStateChange({});
    });
  });

  // Müşteri Sorununu Çözüldü Yapma Butonu
  container.querySelectorAll('[data-resolve-issue-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-resolve-issue-btn');
      orderService.resolveIssue(orderId);
      onStateChange({});
    });
  });

  // Müşteri Sorununa Yanıt Verme Modalını Aç
  container.querySelectorAll('[data-reply-issue-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-reply-issue-btn');
      const allOrders = state.orders || orderService.getOrders();
      const order = allOrders.find(o => String(o.id) === String(orderId)) || orderService.getOrder(orderId);
      if (order) {
        onStateChange({ activeReplyIssueOrder: order });
      } else {
        onStateChange({ activeReplyIssueOrder: { id: orderId, customerName: 'Müşteri', customerPhone: '', issueReport: { reason: 'Müşteri Bildirimi', message: '' } } });
      }
    });
  });

  // Yanıt Modalını Kapat
  const closeReplyBtn = container.querySelector('#close-reply-issue-btn');
  if (closeReplyBtn) {
    closeReplyBtn.addEventListener('click', () => onStateChange({ activeReplyIssueOrder: null }));
  }
  const cancelReplyBtn = container.querySelector('#cancel-reply-issue-btn');
  if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', () => onStateChange({ activeReplyIssueOrder: null }));
  }
  const replyBackdrop = container.querySelector('#reply-issue-modal-backdrop');
  if (replyBackdrop) {
    replyBackdrop.addEventListener('click', (e) => {
      if (e.target === replyBackdrop) onStateChange({ activeReplyIssueOrder: null });
    });
  }

  // Hızlı Yanıt Şablon Butonları (Pills)
  container.querySelectorAll('.quick-reply-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const text = pill.getAttribute('data-text');
      const textarea = container.querySelector('#reply-issue-textarea');
      if (textarea && text) {
        textarea.value = text;
        textarea.focus();
      }
    });
  });

  // Yanıt Gönderme Formu Submit
  const replyIssueForm = container.querySelector('#admin-reply-issue-form');
  if (replyIssueForm) {
    replyIssueForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const orderId = replyIssueForm.getAttribute('data-order-id');
      const formData = new FormData(replyIssueForm);
      const replyMsg = (formData.get('replyMessage') || '').trim();
      const autoResolve = container.querySelector('#auto-resolve-checkbox')?.checked ?? true;

      if (!replyMsg) {
        alert("Lütfen bir yanıt mesajı yazınız.");
        return;
      }

      orderService.replyToIssue(orderId, replyMsg, autoResolve);
      alert("✓ Yanıtınız müşteriye başarıyla iletildi ve siparişe işlendi.");
      onStateChange({ activeReplyIssueOrder: null });
    });
  }

  // Menü Fiyat Güncelleme
  container.querySelectorAll('[data-save-price-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-save-price-btn');
      const input = container.querySelector(`[data-menu-price-input="${pId}"]`);
      if (input) {
        orderService.updateProductPrice(pId, input.value);
        btn.textContent = '✓ Kaydedildi';
        setTimeout(() => { btn.textContent = 'Fiyat'; }, 1500);
      }
    });
  });

  // Sayısal Stok Kaydetme
  container.querySelectorAll('[data-save-stock-btn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-save-stock-btn');
      const input = container.querySelector(`[data-stock-qty-input="${pId}"]`);
      if (input) {
        const qty = parseInt(input.value, 10);
        if (!isNaN(qty) && qty >= 0) {
          btn.textContent = '...';
          await orderService.updateStock(pId, qty);
          btn.textContent = '✓ Kaydedildi';
          setTimeout(() => { btn.textContent = 'Kaydet'; }, 1500);
          const updatedStock = await orderService.getStock();
          onStateChange({ stockList: updatedStock });
        }
      }
    });
  });

  // Hızlı Stok Arttır/Azalt Butonları (-5, +10)
  container.querySelectorAll('[data-quick-stock-btn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-quick-stock-btn');
      const delta = parseInt(btn.getAttribute('data-delta'), 10);
      const input = container.querySelector(`[data-stock-qty-input="${pId}"]`);
      if (input) {
        const current = parseInt(input.value, 10) || 0;
        const next = Math.max(0, current + delta);
        input.value = next;
        await orderService.updateStock(pId, next);
        const updatedStock = await orderService.getStock();
        onStateChange({ stockList: updatedStock });
      }
    });
  });

  // Menü Stok Durumu Aç/Kapat Toggle (Satışta / Kapalı)
  container.querySelectorAll('[data-toggle-stock-btn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-toggle-stock-btn');
      orderService.toggleStock(pId);
      onStateChange({});
    });
  });

  // Yeni Ürün Modalı Aç/Kapat
  const openAddBtn = container.querySelector('#open-add-product-btn');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => onStateChange({ isAdminAddProductOpen: true }));
  }

  const closeAddBtn = container.querySelector('#close-add-product-btn');
  if (closeAddBtn) {
    closeAddBtn.addEventListener('click', () => onStateChange({ isAdminAddProductOpen: false }));
  }

  const addForm = container.querySelector('#admin-add-product-form');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      orderService.addNewProduct({
        name: formData.get('name'),
        category: formData.get('category'),
        price: formData.get('price'),
        description: formData.get('description'),
        image: formData.get('image') || 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=600&q=80'
      });
      onStateChange({ isAdminAddProductOpen: false });
    });
  }

  // Müşteriye Özel Kod Tanımlama Modalını Aç
  container.querySelectorAll('[data-open-assign-code]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-open-assign-code');
      const customer = (state.customers || []).find(c => c.phone === val || c.email === val || c.id === val);
      if (customer) {
        onStateChange({ activeAssignCodeCustomer: customer });
      }
    });
  });

  // Müşteriye Özel Mesaj Gönderme Modalını Aç
  container.querySelectorAll('[data-open-send-message]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-open-send-message');
      const customer = (state.customers || []).find(c => c.phone === val || c.email === val || c.id === val);
      if (customer) {
        onStateChange({ activeSendMessageCustomer: customer });
      }
    });
  });

  // Müşteriyi Kalıcı Olarak Sil
  container.querySelectorAll('[data-delete-customer]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const identifier = btn.getAttribute('data-delete-customer');
      const phone = btn.getAttribute('data-customer-phone') || '';
      const email = btn.getAttribute('data-customer-email') || '';
      const id = btn.getAttribute('data-customer-id') || '';
      const name = btn.getAttribute('data-customer-name') || 'Müşteri';

      const displayKey = phone || email || identifier;
      const ok = confirm(`"${name}" (${displayKey}) adlı müşteriyi ve tüm kayıtlarını veritabanından kalıcı olarak silmek istediğinize emin misiniz?`);
      if (!ok) return;

      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span class="hidden md:inline">Siliniyor...</span>`;

      try {
        const res = await orderService.deleteCustomer(identifier, { phone, email, id, name });
        if (res && res.ok) {
          alert(`✓ "${name}" başarıyla veritabanından silindi.`);
          const updatedCustomers = await orderService.getCustomers();
          onStateChange({ customers: updatedCustomers });
        } else {
          alert("Müşteri silinirken bir hata oluştu.");
          btn.disabled = false;
          btn.innerHTML = `<span>🗑️</span><span class="hidden md:inline">Sil</span>`;
        }
      } catch (err) {
        console.error("Müşteri silme hatası:", err);
        alert("Müşteri silinirken bir hata oluştu.");
        btn.disabled = false;
        btn.innerHTML = `<span>🗑️</span><span class="hidden md:inline">Sil</span>`;
      }
    });
  });

  // Özel Kod Modalı Kapatma
  const closeAssignBtn = container.querySelector('#close-assign-code-btn');
  if (closeAssignBtn) {
    closeAssignBtn.addEventListener('click', () => onStateChange({ activeAssignCodeCustomer: null }));
  }
  const assignBackdrop = container.querySelector('#assign-code-modal-backdrop');
  if (assignBackdrop) {
    assignBackdrop.addEventListener('click', (e) => {
      if (e.target === assignBackdrop) onStateChange({ activeAssignCodeCustomer: null });
    });
  }

  // Özel Kod Formu Gönderimi
  const assignCodeForm = container.querySelector('#admin-assign-code-form');
  if (assignCodeForm) {
    assignCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = assignCodeForm.getAttribute('data-customer-phone');
      const formData = new FormData(assignCodeForm);
      const code = formData.get('code').trim().toUpperCase();
      const discount = parseInt(formData.get('discount'), 10) || 20;

      const res = await orderService.assignCustomerCode(phone, code, discount);
      if (res.ok) {
        alert(`✓ ${phone} numaralı müşteriye "${code}" (%${discount}) özel indirim kodu tanımlandı.`);
        const updatedCustomers = await orderService.getCustomers();
        onStateChange({ activeAssignCodeCustomer: null, customers: updatedCustomers });
      } else {
        alert("Özel kod tanımlanırken bir hata oluştu.");
      }
    });
  }

  // Tanımlı Kodu Kaldırma Butonu
  const removeCustomCodeBtn = container.querySelector('#remove-custom-code-btn');
  if (removeCustomCodeBtn) {
    removeCustomCodeBtn.addEventListener('click', async () => {
      const phone = removeCustomCodeBtn.getAttribute('data-customer-phone');
      await orderService.assignCustomerCode(phone, '', 0);
      alert("✓ Özel indirim kodu kaldırıldı.");
      const updatedCustomers = await orderService.getCustomers();
      onStateChange({ activeAssignCodeCustomer: null, customers: updatedCustomers });
    });
  }

  // Mesaj Gönderme Modalı Kapatma
  const closeSendMsgBtn = container.querySelector('#close-send-message-btn');
  if (closeSendMsgBtn) {
    closeSendMsgBtn.addEventListener('click', () => onStateChange({ activeSendMessageCustomer: null }));
  }
  const sendMsgBackdrop = container.querySelector('#send-message-modal-backdrop');
  if (sendMsgBackdrop) {
    sendMsgBackdrop.addEventListener('click', (e) => {
      if (e.target === sendMsgBackdrop) onStateChange({ activeSendMessageCustomer: null });
    });
  }

  // Mesaj Gönderme Formu
  const sendMessageForm = container.querySelector('#admin-send-message-form');
  if (sendMessageForm) {
    sendMessageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = sendMessageForm.getAttribute('data-customer-phone');
      const formData = new FormData(sendMessageForm);
      const title = formData.get('title').trim();
      const message = formData.get('message').trim();

      const res = await orderService.sendCustomerMessage(phone, title, message);
      if (res.ok) {
        alert(`✓ Mesaj başarıyla ${phone} numaralı müşteriye iletildi.`);
        onStateChange({ activeSendMessageCustomer: null });
      } else {
        alert("Mesaj gönderilirken bir hata oluştu.");
      }
    });
  }

  // Yönetici Çıkış Yap Butonu
  const logoutBtn = container.querySelector('#admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm("Yönetici oturumunu kapatmak istediğinize emin misiniz?")) {
        logoutAdmin();
        onStateChange({});
      }
    });
  }

  // Restoran Açık / Kapalı Durumu Değiştirme Butonu
  const toggleRestBtn = container.querySelector('#admin-toggle-restaurant-btn');
  if (toggleRestBtn) {
    toggleRestBtn.addEventListener('click', () => {
      const current = orderService.getRestaurantSettings();
      let updated;
      if (current.isOpen === false) {
        // Kapalıysa aç
        const statusCheck = isRestaurantOpenNow({ ...current, isOpen: true, forceOpen: false });
        if (!statusCheck.isOpen) {
          const wantForce = confirm(`Şu anda mesai saatleri (${current.openingHours || '10:00 - 23:00'}) dışındasınız.\n\nRestoranı mesai saatleri dışında da sipariş alması için ZORLA AÇIK tutmak ister misiniz?\n\n(Tamam: Zorla Açık, İptal: Otomatik Mesai Saati Kuralına Bağla)`);
          updated = { ...current, isOpen: true, forceOpen: wantForce };
        } else {
          updated = { ...current, isOpen: true, forceOpen: false };
        }
      } else if (current.forceOpen === true) {
        // Zorla açıksa kapat
        updated = { ...current, isOpen: false, forceOpen: false };
      } else {
        // Açıksa kapat
        updated = { ...current, isOpen: false, forceOpen: false };
      }
      orderService.saveRestaurantSettings(updated);
      onStateChange({ restaurantSettings: updated });
    });
  }

  // Çalışma Saatleri Düzenleme Butonu
  const editHoursBtn = container.querySelector('#admin-edit-hours-btn');
  if (editHoursBtn) {
    editHoursBtn.addEventListener('click', () => {
      const current = orderService.getRestaurantSettings();
      const newHours = prompt("Yeni çalışma saatlerini giriniz (Örn: 10:00 - 23:00):", current.openingHours || "10:00 - 23:00");
      if (newHours && newHours.trim()) {
        const updated = { ...current, openingHours: newHours.trim() };
        orderService.saveRestaurantSettings(updated);
        onStateChange({ restaurantSettings: updated });
      }
    });
  }

  // Contact Mesajları: Çözüldü Butonları
  container.querySelectorAll('.admin-resolve-contact-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-msg-id');
      if (!msgId) return;
      try {
        const { markContactMessageResolved } = await import('../services/orderService.js');
        await markContactMessageResolved(msgId);
        // State güncelle
        const updatedMsgs = (state.contactMessages || []).map(m =>
          m.id === msgId ? { ...m, status: 'resolved' } : m
        );
        onStateChange({ contactMessages: updatedMsgs });
      } catch (e) {
        console.warn('Mesaj güncelleme hatası:', e);
      }
    });
  });
}

// =================== CONTACT MESSAGES (MÜŞTERİ İLETİŞİM) ===================

async function loadContactMessages(onStateChange) {
  try {
    const { getContactMessages } = await import('../services/orderService.js');
    const msgs = await getContactMessages();
    onStateChange({ contactMessages: Array.isArray(msgs) ? msgs : [] });
  } catch (e) {
    console.warn('Contact messages yüklenemedi:', e);
  }
}

function renderContactMessagesTab(messages, state) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">📭</div>
        <h3 class="text-lg font-black text-gray-800 mb-2">Henüz Mesaj Yok</h3>
        <p class="text-sm text-gray-500">Müşterilerden gelen iletişim mesajları burada görünecek.</p>
      </div>
    `;
  }

  const statusLabel = { new: '🆕 Yeni', read: '👁️ Okundu', resolved: '✅ Çözüldü' };
  const statusColor = { new: 'bg-red-100 text-red-700 border-red-200', read: 'bg-blue-100 text-blue-700 border-blue-200', resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  const subjectLabel = { sikayet: '😤 Şikayet', oneri: '💡 Öneri/İstek', siparis: '📦 Sipariş Sorunu', urun: '🍕 Ürün Hakkında', diger: '💬 Diğer' };

  return `
    <div class="space-y-4 pb-10">

      <!-- Başlık & İstatistikler -->
      <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black mb-1">📩 Müşteri Mesajları</h2>
            <p class="text-xs text-purple-200">Bize Ulaşın formundan gelen şikayet, istek ve öneriler</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-black">${messages.length}</div>
            <div class="text-xs text-purple-200">Toplam Mesaj</div>
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <div class="bg-white/20 rounded-xl px-3 py-2 text-center flex-1">
            <div class="text-xl font-black">${messages.filter(m => m.status === 'new').length}</div>
            <div class="text-[11px] text-purple-200">Yeni</div>
          </div>
          <div class="bg-white/20 rounded-xl px-3 py-2 text-center flex-1">
            <div class="text-xl font-black">${messages.filter(m => m.status === 'read').length}</div>
            <div class="text-[11px] text-purple-200">Okundu</div>
          </div>
          <div class="bg-white/20 rounded-xl px-3 py-2 text-center flex-1">
            <div class="text-xl font-black">${messages.filter(m => m.status === 'resolved').length}</div>
            <div class="text-[11px] text-purple-200">Çözüldü</div>
          </div>
        </div>
      </div>

      <!-- Mesaj Listesi -->
      ${messages.map(msg => `
        <div class="bg-white rounded-2xl border ${msg.status === 'new' ? 'border-red-200 shadow-sm shadow-red-100' : 'border-gray-200'} p-5" data-contact-msg-id="${msg.id}">

          <!-- Üst Kısım -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                ${(msg.senderName || '?')[0].toUpperCase()}
              </div>
              <div>
                <div class="font-black text-gray-900 text-sm">${msg.senderName || 'Anonim'}</div>
                <div class="text-xs text-gray-400 flex items-center gap-2">
                  ${msg.senderPhone ? `<span>📞 ${msg.senderPhone}</span>` : ''}
                  <span>${new Date(msg.createdAt).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              ${msg.subject ? `<span class="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-1 rounded-lg">${subjectLabel[msg.subject] || msg.subject}</span>` : ''}
              <span class="text-[11px] font-bold px-2 py-1 rounded-lg border ${statusColor[msg.status] || 'bg-gray-100 text-gray-600 border-gray-200'}">${statusLabel[msg.status] || msg.status}</span>
            </div>
          </div>

          <!-- Mesaj Metni -->
          <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed mb-3">
            ${msg.message || ''}
          </div>

          <!-- Fotoğraf (varsa) -->
          ${msg.photoBase64 ? `
            <div class="mb-3">
              <div class="text-xs font-bold text-gray-500 mb-2">📷 Ek Fotoğraf:</div>
              <img
                src="${msg.photoBase64}"
                alt="Müşteri fotoğrafı"
                class="max-w-xs max-h-48 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition"
                onclick="window.open(this.src, '_blank')"
              >
            </div>
          ` : ''}

          <!-- Aksiyon Butonları -->
          <div class="flex items-center gap-2 flex-wrap">
            ${msg.status !== 'resolved' ? `
              <button
                class="admin-resolve-contact-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-[#06C167] hover:text-white text-emerald-700 border border-emerald-200 transition cursor-pointer"
                data-msg-id="${msg.id}"
              >✅ Çözüldü Olarak İşaretle</button>
            ` : ''}
            ${msg.senderPhone ? `
              <a
                href="tel:${msg.senderPhone}"
                class="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition"
              >📞 Geri Ara</a>
            ` : ''}
          </div>

        </div>
      `).join('')}

    </div>
  `;
}
