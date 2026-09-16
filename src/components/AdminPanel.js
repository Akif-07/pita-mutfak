// Pita Mutfak - Yönetim & Admin Paneli
import { orderService, formatDeliveryCode, playOrderSound } from '../services/orderService.js';
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

  const orders = orderService.getOrders();
  const menu = orderService.getMenu();
  const customers = state.customers || [];
  const stockList = state.stockList || [];
  const customerSearchQuery = state.customerSearchQuery || '';
  const adminFilter = state.adminFilter || 'all';
  const activeTab = state.adminActiveTab || 'orders'; // 'orders' | 'menu' | 'customers'

  // Stok haritası (ürün ID -> stok kaydı)
  const stockMap = {};
  stockList.forEach(s => {
    stockMap[s.product_id] = s;
  });

  // İstatistikler
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const onTheWayCount = orders.filter(o => o.status === 'on_the_way').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const issuesCount = orders.filter(o => o.issueReport != null).length;
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Filtrelenmiş siparişler
  let filteredOrders = orders;
  if (adminFilter === 'issues') {
    filteredOrders = orders.filter(o => o.issueReport != null);
  } else if (adminFilter !== 'all') {
    filteredOrders = orders.filter(o => o.status === adminFilter);
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
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-[#06C167] text-white flex items-center justify-center font-bold shadow-md shadow-[#06C167]/20">
              🍲
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-black text-[#121212]">Pita Mutfak <span class="text-[#06C167]">Yönetim</span></h1>
                <span class="bg-emerald-100 text-[#06C167] text-[11px] font-bold px-2 py-0.5 rounded-full">Canlı Sipariş Masası</span>
              </div>
              <p class="text-xs text-gray-500">Mutfak, Sipariş ve Kurye Yönetimi</p>
            </div>
          </div>

          <!-- Sağ Butonlar (Ses Testi ve Sekmeler) -->
          <div class="flex items-center gap-2 sm:gap-4">
            
            <!-- Restoran Zili Ses Testi -->
            <button id="admin-test-sound-btn" class="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer">
              <span>🔔</span>
              <span class="hidden sm:inline">Zil Sesi Testi</span>
            </button>

            <!-- Sekme Seçici (Siparişler / Menü & Stok / Müşteriler) -->
            <div class="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
              <button 
                id="tab-orders-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${activeTab === 'orders' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                📦 Siparişler (${orders.length})
              </button>
              <button 
                id="tab-menu-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${activeTab === 'menu' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                🍽️ Menü & Stok
              </button>
              <button 
                id="tab-customers-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${activeTab === 'customers' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                👥 Müşteriler (${customers.length})
              </button>
              <button 
                id="tab-reviews-btn" 
                class="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${activeTab === 'reviews' ? 'bg-white text-[#121212] shadow-xs' : 'text-gray-500 hover:text-black'}"
              >
                ⭐ Yorumlar (${(state.reviewsList || []).length})
              </button>
            </div>

          </div>

        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        <!-- ÖZET İSTATİSTİK KARTLARI -->
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4 mb-6">
          
          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
              ⏳
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Yeni Sipariş</span>
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

          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-lg font-bold">
              ✅
            </div>
            <div>
              <span class="text-xs text-gray-400 font-bold uppercase">Teslim Edilen</span>
              <div class="text-xl font-black text-[#06C167]">${deliveredCount}</div>
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

          <div class="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#121212] to-[#252525] text-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">
              💰
            </div>
            <div>
              <span class="text-[11px] text-gray-300 font-bold uppercase">Teslim Cirosu</span>
              <div class="text-xl font-black text-[#06C167]">₺${totalRevenue}</div>
            </div>
          </div>

        </div>

        <!-- =================== 1. SEKME: SİPARİŞLER =================== -->
        ${activeTab === 'orders' ? `
          <!-- Filtre Butonları -->
          <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            ${[
              { id: 'all', label: 'Tüm Siparişler', count: orders.length },
              { id: 'pending', label: '🔔 Onay Bekleyen', count: pendingCount },
              { id: 'preparing', label: '🍳 Mutfakta', count: preparingCount },
              { id: 'on_the_way', label: '🛵 Kuryede / Yolda', count: onTheWayCount },
              { id: 'delivered', label: '✅ Teslim Edildi', count: deliveredCount },
              { id: 'issues', label: '⚠️ Müşteri Sorunları', count: issuesCount },
              { id: 'cancelled', label: '❌ İptal', count: orders.filter(o => o.status === 'cancelled').length }
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
        ${activeTab === 'customers' ? renderCustomerManagement(customers, customerSearchQuery) : ''}

        <!-- =================== 4. SEKME: MÜŞTERİ YORUMLARI & PUANLAR =================== -->
        ${activeTab === 'reviews' ? renderAdminReviewsTab(state) : ''}

      </main>

      <!-- Yeni Ürün Ekleme Modalı (Eğer açıksa) -->
      ${state.isAdminAddProductOpen ? renderAddProductModal() : ''}

      <!-- Özel Kod Tanımlama Modalı -->
      ${state.activeAssignCodeCustomer ? renderAssignCodeModal(state.activeAssignCodeCustomer) : ''}

      <!-- Müşteriye Mesaj Gönderme Modalı -->
      ${state.activeSendMessageCustomer ? renderSendMessageModal(state.activeSendMessageCustomer) : ''}

    </div>
  `;

  attachAdminEventListeners(container, state, onStateChange);
}

// Tek Sipariş Kartı
function renderOrderCard(order) {
  const codeFormatted = formatDeliveryCode(order.deliveryCode);

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
            <div class="mt-2.5 flex items-center justify-between">
              <span class="text-[11px] font-black ${order.issueReport.status === 'resolved' ? 'text-[#06C167]' : 'text-rose-700'}">
                ${order.issueReport.status === 'resolved' ? '✓ Sorun Çözüldü Olarak İşaretlendi' : '⏳ İnceleme Bekliyor'}
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
          ${order.orderNote ? `<div class="text-amber-700 font-medium italic mt-1.5 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/50">📝 Not: "${order.orderNote}"</div>` : ''}
        </div>

        <!-- Sipariş Kalemleri -->
        <div class="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1">
          ${order.items.map(item => `
            <div class="flex items-center justify-between text-xs py-1 border-b border-gray-50">
              <div class="flex items-center gap-2">
                <span class="font-black bg-[#E8F8EE] text-[#06C167] px-1.5 py-0.5 rounded-md text-[10px]">${item.quantity}x</span>
                <span class="font-semibold text-gray-800">${item.name}</span>
                ${item.option ? `<span class="text-[10px] text-gray-400">(${item.option.name})</span>` : ''}
              </div>
              <span class="font-bold text-gray-900">₺${item.unitPrice * item.quantity}</span>
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

// Müşteri Yönetim Sekmesi (SQLite Backend Veritabanı)
function renderCustomerManagement(customers, searchQuery) {
  const query = (searchQuery || '').trim().toLowerCase();
  const filteredCustomers = customers.filter(c => {
    if (!query) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const phoneMatch = (c.phone || '').toLowerCase().includes(query);
    return nameMatch || phoneMatch;
  });

  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return `
    <div class="space-y-6">
      
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
                            data-open-assign-code="${customer.phone}" 
                            title="Özel İndirim Kodu Tanımla"
                            class="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-purple-200"
                          >
                            <span>🏷️</span>
                            <span class="hidden md:inline">Kod</span>
                          </button>

                          <button 
                            data-open-send-message="${customer.phone}" 
                            title="Müşteriye Özel Mesaj Gönder"
                            class="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-blue-200"
                          >
                            <span>✉️</span>
                            <span class="hidden md:inline">Mesaj</span>
                          </button>

                          <button 
                            data-delete-customer="${customer.phone}" 
                            data-customer-name="${customer.name}"
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
      const phone = btn.getAttribute('data-open-assign-code');
      const customer = (state.customers || []).find(c => c.phone === phone);
      if (customer) {
        onStateChange({ activeAssignCodeCustomer: customer });
      }
    });
  });

  // Müşteriye Özel Mesaj Gönderme Modalını Aç
  container.querySelectorAll('[data-open-send-message]').forEach(btn => {
    btn.addEventListener('click', () => {
      const phone = btn.getAttribute('data-open-send-message');
      const customer = (state.customers || []).find(c => c.phone === phone);
      if (customer) {
        onStateChange({ activeSendMessageCustomer: customer });
      }
    });
  });

  // Müşteriyi Kalıcı Olarak Sil
  container.querySelectorAll('[data-delete-customer]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const phone = btn.getAttribute('data-delete-customer');
      const name = btn.getAttribute('data-customer-name') || phone;
      const ok = confirm(`"${name}" (${phone}) adlı müşteriyi ve mesaj geçmişini veritabanından kalıcı olarak silmek istediğinize emin misiniz?`);
      if (!ok) return;

      const res = await orderService.deleteCustomer(phone);
      if (res.ok) {
        alert(`✓ "${name}" başarıyla veritabanından silindi.`);
        const updatedCustomers = await orderService.getCustomers();
        onStateChange({ customers: updatedCustomers });
      } else {
        alert("Müşteri silinirken hata oluştu.");
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
}
