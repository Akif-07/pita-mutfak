// Pita Mutfak - Müşteri Sipariş Arayüzü (Uber Eats Yeşil - Beyaz Tema)
import { orderService, getCurrentUser, setCurrentUser, isFirstOrderDiscountAvailable, registerCustomer } from '../services/orderService.js';
import { categories } from '../data/initialMenu.js';

export function renderCustomerView(container, state, onStateChange) {
  const { cart, activeCategory, selectedProduct, activeTrackingOrder, currentUser, firstOrderDiscountApplied, discountPercentage } = state;
  const menu = orderService.getMenu();
  const myOrders = orderService.getMyOrders();

  // Backend SQLite stok haritası
  const stockMap = {};
  (state.stockList || []).forEach(s => {
    stockMap[s.product_id] = s;
  });

  // Kategoriye göre ürün filtreleme
  const filteredMenu = activeCategory === 'all'
    ? menu
    : menu.filter(item => item.category === activeCategory);

  // Sepet hesaplamaları
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  const messages = state.customerMessages || [];
  const unreadMessagesCount = messages.filter(m => !m.is_read).length;

  // Özel kod veya ilk sipariş indirimi kontrolü
  const hasCustomCode = currentUser && currentUser.custom_code && currentUser.custom_discount > 0;
  const activeDiscountRate = hasCustomCode 
    ? currentUser.custom_discount 
    : discountPercentage;

  const activeCouponCode = hasCustomCode 
    ? currentUser.custom_code 
    : (firstOrderDiscountApplied ? 'PITA20' : '');

  // İndirim hesaplama
  const discountAmount = (firstOrderDiscountApplied && subtotal > 0)
    ? Math.round(subtotal * (activeDiscountRate / 100))
    : 0;
  const cartTotal = Math.max(0, subtotal - discountAmount);

  container.innerHTML = `
    <div class="min-h-screen bg-[#F7F9F8] text-[#121212] pb-24">
      
      <!-- Üst Bilgi ve İndirim Kap Bannerı (Uber Eats Stili) -->
      <div class="bg-[#06C167] text-white py-2 px-4 text-xs sm:text-sm font-medium shadow-sm">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>🎉 Pita Mutfak'a Hoş Geldiniz! İlk siparişinize özel <strong>%20 İndirim</strong> fırsatı!</span>
          </div>
          <button 
            id="top-promo-claim-btn" 
            class="bg-white text-[#06C167] hover:bg-[#E8F8EE] px-3 py-1 rounded-full text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            ${firstOrderDiscountApplied ? '✓ İndirim Tanımlandı' : '🎁 İndirimi Kap'}
          </button>
        </div>
      </div>

      <!-- Ana Header / Navigasyon -->
      <header class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm transition-all">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          <!-- Logo & Slogan -->
          <div class="flex items-center gap-3 cursor-pointer" id="nav-logo-btn">
            <div class="w-12 h-12 rounded-2xl bg-[#06C167] text-white flex items-center justify-center shadow-md shadow-[#06C167]/20 transform transition hover:scale-105">
              <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-black tracking-tight text-[#121212]">pita<span class="text-[#06C167]">mutfak</span></h1>
                <span class="bg-[#E8F8EE] text-[#06C167] text-[11px] font-bold px-2 py-0.5 rounded-full">Açık</span>
              </div>
              <p class="text-xs text-gray-500 font-medium">Tavuk Pilav • Taze Makarna • Güveçte Kuru Fasulye</p>
            </div>
          </div>

          <!-- Sağ Taraf: Giriş Yap, Geçmiş Siparişler & Sepet Butonu -->
          <div class="flex items-center gap-2 sm:gap-3">
            
            <!-- Kullanıcı Giriş / Profil Butonu -->
            ${currentUser ? `
              <div class="relative group">
                <button 
                  id="user-profile-btn" 
                  class="flex items-center gap-1.5 bg-[#E8F8EE] text-[#06C167] border border-[#06C167]/30 px-3 py-2 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <span>👤</span>
                  <span class="max-w-[100px] truncate">${currentUser.name}</span>
                </button>
                <div class="hidden group-hover:block absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div class="px-3 py-2 border-b border-gray-100">
                    <p class="text-xs font-bold text-gray-900 truncate">${currentUser.name}</p>
                    <p class="text-[11px] text-gray-400 font-mono">${currentUser.phone}</p>
                  </div>
                  <button id="logout-btn" class="w-full text-left text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-xl transition mt-1 cursor-pointer">
                    Çıkış Yap
                  </button>
                </div>
              </div>

              <!-- Müşteri Mesaj / Bildirim Kutusu Butonu -->
              <button 
                id="open-customer-inbox-btn" 
                class="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer shadow-2xs"
                title="Yönetimden Gelen Mesajlar & Kuponlarım"
              >
                <span class="text-sm">🔔</span>
                ${unreadMessagesCount > 0 ? `
                  <span class="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 animate-pulse">
                    ${unreadMessagesCount}
                  </span>
                ` : ''}
              </button>
            ` : `
              <button 
                id="open-login-btn" 
                class="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <span>👤</span>
                <span>Giriş Yap</span>
              </button>
            `}

            <!-- Geçmiş Siparişlerim Butonu -->
            <button 
              id="my-orders-btn" 
              class="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <span>📋</span>
              <span class="hidden sm:inline">Siparişlerim</span>
              ${myOrders.length > 0 ? `
                <span class="bg-gray-800 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  ${myOrders.length}
                </span>
              ` : ''}
            </button>

            <!-- Canlı Takip Varsa Hızlı Buton -->
            ${activeTrackingOrder ? `
              <button id="quick-track-btn" class="flex items-center gap-2 bg-[#E8F8EE] text-[#06C167] border border-[#06C167]/30 px-3 py-2 rounded-full text-xs font-bold hover:bg-[#06C167] hover:text-white transition shadow-sm cursor-pointer">
                <span class="w-2 h-2 rounded-full bg-[#06C167] animate-pulse"></span>
                <span class="hidden sm:inline">Takip Et</span>
                <span class="sm:hidden font-mono">#${activeTrackingOrder.id.slice(-4)}</span>
              </button>
            ` : ''}

            <!-- Sepet Butonu (Uber Eats Yeşil Pill) -->
            <button id="open-cart-btn" class="relative flex items-center gap-2 bg-[#06C167] hover:bg-[#05a557] active:scale-95 text-white font-bold px-3.5 sm:px-5 py-2.5 rounded-full shadow-lg shadow-[#06C167]/25 transition duration-200 cursor-pointer">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span class="hidden sm:inline text-sm">Sepet</span>
              <span class="bg-white text-[#06C167] text-xs font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                ${cartItemCount}
              </span>
              ${cartTotal > 0 ? `<span class="hidden md:inline border-l border-white/30 pl-2 text-sm font-semibold">₺${cartTotal}</span>` : ''}
            </button>

          </div>

        </div>
      </header>

      <!-- Hero Banner & İLK SİPARİŞİNE İNDİRİMİ KAP KARTI -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121212] via-[#1A2E22] to-[#121212] text-white p-6 sm:p-10 shadow-xl">
          <div class="relative z-10 max-w-xl">
            
            <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/15 px-3 py-1 rounded-full text-xs font-semibold text-[#06C167] mb-4">
              <span class="w-2 h-2 rounded-full bg-[#06C167]"></span>
              <span>Ev Yapımı Sıcak & Taze Lezzetler</span>
            </div>

            <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
              Usta Ellerden <span class="text-[#06C167]">Tavuk Pilav</span>, <span class="text-[#06C167]">Makarna</span> ve <span class="text-[#06C167]">Kuru Fasulye</span>
            </h2>

            <p class="text-gray-300 text-sm sm:text-base mb-6 leading-relaxed">
              Özel marine edilmiş çıtır ve tiftik tavuklar, tereyağlı tane nohutlu pilav, günlük taze hazırlanan makarnalar ve ağır ateşte güveçte pişen kuru fasulye sofranızda.
            </p>

            <!-- İLK SİPARİŞİNE İNDİRİMİ KAP ETKİLEŞİMLİ KUTUSU -->
            <div class="bg-gradient-to-r from-[#06C167]/20 to-white/10 border border-[#06C167]/50 rounded-2xl p-4 backdrop-blur mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-[#06C167] text-white flex items-center justify-center text-2xl shadow-md">
                  🎁
                </div>
                <div>
                  <h4 class="text-sm font-black text-white">İlk Siparişine Özel %20 İndirim!</h4>
                  <p class="text-xs text-gray-300">Kupon Kodu: <strong class="text-[#06C167] font-mono tracking-wider">PITA20</strong></p>
                </div>
              </div>

              <button 
                id="claim-discount-btn" 
                class="bg-[#06C167] hover:bg-[#05a557] active:scale-95 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>${firstOrderDiscountApplied ? '✓ İndirim Sepete Eklendi' : 'İndirimi Hemen Kap!'}</span>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-200">
              <div class="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <span>⏱️</span>
                <span class="font-semibold">25-35 Dakika Teslimat</span>
              </div>
              <div class="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <span>🛵</span>
                <span class="font-semibold">8 Haneli Güvenli Kod</span>
              </div>
              <div class="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <span>⭐</span>
                <span class="font-semibold">4.9 Puan</span>
              </div>
            </div>

          </div>
          <div class="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 lg:opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#06C167] to-transparent"></div>
        </div>
      </div>

      <!-- Kategori Filtre Butonları (Pill Bar) -->
      <div class="sticky top-20 z-20 bg-[#F7F9F8]/95 backdrop-blur py-4 border-b border-gray-200/60 shadow-xs">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
            ${categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return `
                <button
                  data-category="${cat.id}"
                  class="category-btn whitespace-nowrap px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm
                  ${isActive 
                    ? 'bg-[#121212] text-white shadow-md scale-102' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-black border border-gray-200/80'}"
                >
                  <span>${cat.name}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Menü Listesi (Grid) -->
      <main class="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl sm:text-2xl font-black text-[#121212]">
              ${categories.find(c => c.id === activeCategory)?.name || 'Menü'}
            </h3>
            <p class="text-xs text-gray-500 font-medium mt-0.5">${filteredMenu.length} leziz seçenek sizi bekliyor</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${filteredMenu.map(product => {
            const stockRecord = stockMap[product.id];
            const stockQty = stockRecord !== undefined ? stockRecord.quantity : (product.isAvailable ? 50 : 0);
            const isAvailable = product.isAvailable && stockQty > 0;

            return `
              <div class="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${!isAvailable ? 'opacity-60 grayscale' : ''}">
                
                <div class="relative h-48 w-full overflow-hidden bg-gray-100">
                  <img 
                    src="${product.image}" 
                    alt="${product.name}" 
                    class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  ${product.badge ? `
                    <span class="absolute top-3 left-3 bg-[#06C167] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                      ${product.badge}
                    </span>
                  ` : ''}
                  ${!isAvailable ? `
                    <div class="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <span class="bg-red-500 text-white font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                        Tükendi
                      </span>
                    </div>
                  ` : ''}
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 class="font-extrabold text-base sm:text-lg text-[#121212] group-hover:text-[#06C167] transition">
                      ${product.name}
                    </h4>
                    <p class="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                      ${product.description}
                    </p>
                  </div>

                  <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span class="text-xs text-gray-400 font-medium block">Fiyat</span>
                      <span class="text-lg font-black text-[#121212]">₺${product.price}</span>
                    </div>

                    ${isAvailable ? `
                      <button
                        data-product-id="${product.id}"
                        class="add-product-btn flex items-center gap-1.5 bg-[#E8F8EE] hover:bg-[#06C167] text-[#06C167] hover:text-white px-4 py-2 rounded-2xl font-bold text-xs transition duration-200 shadow-sm cursor-pointer"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Ekle</span>
                      </button>
                    ` : `
                      <button disabled class="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-not-allowed">
                        Tükendi
                      </button>
                    `}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </main>

      <!-- Ürün Detay & Özelleştirme Modalı -->
      ${selectedProduct ? renderProductModal(selectedProduct) : ''}

      <!-- Sepet Çekmecesi (Cart Drawer) -->
      ${state.isCartOpen ? renderCartDrawer(cart, subtotal, discountAmount, cartTotal, firstOrderDiscountApplied, currentUser) : ''}

      <!-- Sipariş Tamamlama / Checkout Modalı -->
      ${state.isCheckoutOpen ? renderCheckoutModal(cart, subtotal, discountAmount, cartTotal, currentUser) : ''}

      <!-- Canlı Sipariş Takip Modalı -->
      ${activeTrackingOrder && state.showTrackingModal ? renderTrackingModal(activeTrackingOrder) : ''}

      <!-- Geçmiş Siparişlerim Modalı -->
      ${state.isMyOrdersOpen ? renderMyOrdersModal(myOrders, state) : ''}

      <!-- Sorun Bildirme Modalı -->
      ${state.reportingOrderId ? renderIssueModal(state.reportingOrderId, state) : ''}

      <!-- Kullanıcı Giriş / Kayıt Modalı -->
      ${state.isLoginModalOpen ? renderLoginModal(state) : ''}

      <!-- Müşteri Mesajları & Bildirimler Modalı -->
      ${state.isCustomerInboxOpen ? renderCustomerInboxModal(messages, currentUser) : ''}

    </div>
  `;

  attachCustomerEventListeners(container, state, onStateChange, menu);
}

// Giriş Yap & İlk Sipariş İndirimi Modalı
function renderLoginModal(state) {
  return `
    <div id="login-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-[#06C167] text-white flex items-center justify-center text-sm font-bold">
              🍲
            </div>
            <div>
              <h3 class="font-black text-base text-gray-900">Giriş Yap / Kayıt Ol</h3>
              <p class="text-[11px] text-gray-500">İlk siparişinize özel %20 indirim hesabınıza tanımlanır</p>
            </div>
          </div>
          <button id="close-login-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 my-4 flex items-center gap-3">
          <span class="text-2xl">🎁</span>
          <div>
            <span class="text-xs font-black text-emerald-900 block">%20 Hoş Geldin İndirimi</span>
            <span class="text-[11px] text-emerald-700">Bilgilerinizi girerek ilk siparişinizde anında %20 indirim kazanın!</span>
          </div>
        </div>

        <form id="customer-login-form" class="space-y-3.5">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Adınız Soyadınız *</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="Örn: Ahmet Yılmaz" 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Telefon Numaranız *</label>
            <input 
              type="tel" 
              name="phone" 
              required 
              placeholder="05XX XXX XX XX" 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Giriş Yap & İndirimi Kap</span>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </form>

      </div>
    </div>
  `;
}

// Ürün Detay & Porsiyon Seçim Modalı
function renderProductModal(product) {
  return `
    <div id="product-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div class="relative h-56 w-full">
          <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover"/>
          <button id="close-product-modal" class="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          ${product.badge ? `<span class="absolute bottom-4 left-4 bg-[#06C167] text-white text-xs font-bold px-3 py-1 rounded-full shadow">${product.badge}</span>` : ''}
        </div>

        <div class="p-6">
          <h3 class="text-xl font-black text-[#121212]">${product.name}</h3>
          <p class="text-xs text-gray-500 mt-1 leading-relaxed">${product.description}</p>
          <div class="mt-3 text-lg font-black text-[#06C167]">₺${product.price}</div>

          ${product.options && product.options.length > 0 ? `
            <div class="mt-5 pt-4 border-t border-gray-100">
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Porsiyon / İlave Seçimi</label>
              <div class="space-y-2" id="product-options-group">
                ${product.options.map((opt, idx) => `
                  <label class="flex items-center justify-between p-3 rounded-2xl border border-gray-200 hover:border-[#06C167] cursor-pointer transition bg-white has-[:checked]:border-[#06C167] has-[:checked]:bg-[#E8F8EE]">
                    <div class="flex items-center gap-3">
                      <input type="radio" name="product-option" value="${idx}" ${idx === 0 ? 'checked' : ''} class="accent-[#06C167] w-4 h-4">
                      <span class="text-xs font-semibold text-gray-800">${opt.name}</span>
                    </div>
                    <span class="text-xs font-extrabold text-gray-900">${opt.price > 0 ? `+₺${opt.price}` : 'Ücretsiz'}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="mt-4">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Sipariş Notu (İsteğe bağlı)</label>
            <input 
              type="text" 
              id="product-note-input" 
              placeholder="Örn: Turşusu bol olsun, karabiberli olsun..." 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
            />
          </div>

          <div class="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <div class="flex items-center border border-gray-200 rounded-2xl p-1 bg-gray-50">
              <button id="modal-qty-minus" class="w-8 h-8 rounded-xl bg-white hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center shadow-xs transition">-</button>
              <span id="modal-qty-val" class="w-8 text-center text-sm font-extrabold">1</span>
              <button id="modal-qty-plus" class="w-8 h-8 rounded-xl bg-white hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center shadow-xs transition">+</button>
            </div>

            <button 
              id="modal-confirm-add-btn" 
              class="flex-1 bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3 px-6 rounded-2xl text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sepete Ekle</span>
              <span id="modal-calculated-price" class="font-extrabold">• ₺${product.price}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
}

// Sepet Çekmecesi (İlk Sipariş İndirim Satırı ve Kupon Kutusu ile)
function renderCartDrawer(cart, subtotal, discountAmount, cartTotal, firstOrderDiscountApplied, currentUser) {
  return `
    <div id="cart-drawer-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div class="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
        
        <div class="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 class="text-lg font-extrabold text-[#121212]">Sepetim <span class="text-[#06C167]">(${cart.length} ürün)</span></h3>
          <button id="close-cart-btn" class="p-2 text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          ${cart.length === 0 ? `
            <div class="text-center py-8">
              <span class="text-5xl block mb-3">🛒</span>
              <p class="text-sm font-bold text-gray-500">Sepetiniz boş</p>
              <p class="text-xs text-gray-400 mt-1">Menüden lezzetli ürünler ekleyin</p>
            </div>
          ` : cart.map((item, index) => `
            <div class="flex items-start gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <img src="${item.image}" class="w-14 h-14 rounded-xl object-cover border border-gray-200" />
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-extrabold text-[#121212] truncate">${item.name}</h4>
                ${item.selectedOption ? `<p class="text-[10px] text-gray-400 font-medium truncate">+ ${item.selectedOption}</p>` : ''}
                ${item.note ? `<p class="text-[10px] text-gray-400 italic truncate">📝 ${item.note}</p>` : ''}
                <div class="flex items-center justify-between mt-1.5">
                  <div class="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button data-cart-minus="${index}" class="px-2.5 py-1 text-xs font-black text-gray-600 hover:bg-gray-100 transition cursor-pointer">−</button>
                    <span class="px-2 text-xs font-black text-[#121212]">${item.quantity}</span>
                    <button data-cart-plus="${index}" class="px-2.5 py-1 text-xs font-black text-[#06C167] hover:bg-[#E8F8EE] transition cursor-pointer">+</button>
                  </div>
                  <span class="text-sm font-black text-[#06C167]">₺${item.unitPrice * item.quantity}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        ${cart.length > 0 ? `
          <div class="p-5 border-t border-gray-100 bg-white space-y-3">
            
            <!-- İndirim Kuponu Rozeti (İlk Sipariş veya Müşteriye Özel Tanımlı Kod) -->
            ${(() => {
              const hasCustom = currentUser && currentUser.custom_code && currentUser.custom_discount > 0;
              const couponTitle = hasCustom ? `${currentUser.custom_code} Kuponu` : 'PITA20 Kuponu';
              const couponText = !currentUser 
                ? 'İndirim için giriş yapın' 
                : hasCustom 
                  ? (firstOrderDiscountApplied ? `Size özel %${currentUser.custom_discount} indirim uygulandı` : `Size özel %${currentUser.custom_discount} indirim`) 
                  : (firstOrderDiscountApplied ? 'İlk siparişinize özel %20 indirim uygulandı' : 'İlk sipariş indirimi');

              return `
                <div class="${hasCustom ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'} border rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="text-base">${hasCustom ? '🏷️' : '🎁'}</span>
                    <div>
                      <span class="font-extrabold ${hasCustom ? 'text-purple-950' : 'text-emerald-950'} block">${couponTitle}</span>
                      <span class="text-[11px] ${hasCustom ? 'text-purple-700' : 'text-emerald-700'}">${couponText}</span>
                    </div>
                  </div>
                  <button 
                    id="toggle-cart-discount-btn" 
                    class="px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${!currentUser ? 'bg-gray-200 text-gray-600 border border-gray-300' : firstOrderDiscountApplied ? (hasCustom ? 'bg-purple-600 text-white' : 'bg-[#06C167] text-white') : (hasCustom ? 'bg-white border border-purple-300 text-purple-700' : 'bg-white border border-emerald-300 text-[#06C167]')}"
                  >
                    ${!currentUser ? '🔒 Giriş Yap' : firstOrderDiscountApplied ? '✓ Uygulandı' : 'Uygula'}
                  </button>
                </div>
              `;
            })()}

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Ara Toplam</span>
              <span>₺${subtotal}</span>
            </div>

            ${discountAmount > 0 ? `
              <div class="flex items-center justify-between text-xs text-[#06C167] font-bold">
                <span class="flex items-center gap-1">
                  <span>🎉</span>
                  <span>${currentUser && currentUser.custom_code ? `Özel İndirim (%${currentUser.custom_discount})` : 'İlk Sipariş İndirimi (%20)'}</span>
                </span>
                <span>-₺${discountAmount}</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs text-[#06C167] font-semibold">
              <span>Teslimat Ücreti</span>
              <span>Ücretsiz</span>
            </div>

            <div class="flex items-center justify-between text-base font-black text-[#121212] pt-2 border-t border-gray-100">
              <span>Toplam</span>
              <div class="text-right">
                ${discountAmount > 0 ? `<span class="text-xs text-gray-400 line-through mr-1.5">₺${subtotal}</span>` : ''}
                <span class="text-xl text-[#06C167]">₺${cartTotal}</span>
              </div>
            </div>

            <button 
              id="proceed-checkout-btn" 
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              <span>Siparişi Onayla ve Gönder</span>
              <span>• ₺${cartTotal}</span>
            </button>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// Sipariş Tamamlama / Checkout Modalı
function renderCheckoutModal(cart, subtotal, discountAmount, cartTotal, currentUser) {
  return `
    <div id="checkout-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-extrabold text-lg text-[#121212]">Siparişinizi Tamamlayın</h3>
            <p class="text-xs text-gray-500">Teslimat adresinizi ve ödeme yönteminizi seçiniz</p>
          </div>
          <button id="close-checkout-btn" class="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form id="checkout-form" class="p-6 space-y-4">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Adınız Soyadınız *</label>
              <input 
                type="text" 
                name="customerName" 
                required 
                value="${currentUser ? currentUser.name : ''}"
                placeholder="Örn: Ahmet Yılmaz" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Telefon Numaranız *</label>
              <input 
                type="tel" 
                name="customerPhone" 
                required 
                value="${currentUser ? currentUser.phone : ''}"
                placeholder="05XX XXX XX XX" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Teslimat Adresi (Mahalle, Sokak, Bina No, Daire) *</label>
            <textarea 
              name="deliveryAddress" 
              rows="3" 
              required
              placeholder="Örn: Atatürk Mah. İnönü Cad. Güneş Apt. No:14 Kat:3 Daire:5" 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Kurye / Mutfak Notu (İsteğe bağlı)</label>
            <input 
              type="text" 
              name="orderNote" 
              placeholder="Örn: Zili çalmayın bebek uyuyor, kapıya asınız" 
              class="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1.5">Ödeme Yöntemi *</label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-2.5 p-3 rounded-2xl border border-gray-200 cursor-pointer has-[:checked]:border-[#06C167] has-[:checked]:bg-[#E8F8EE] transition">
                <input type="radio" name="paymentMethod" value="cash" checked class="accent-[#06C167] w-4 h-4">
                <div>
                  <span class="text-xs font-black text-gray-900 block">💵 Kapıda Nakit</span>
                  <span class="text-[10px] text-gray-500">Teslimatta nakit ödeme</span>
                </div>
              </label>

              <label class="flex items-center gap-2.5 p-3 rounded-2xl border border-gray-200 cursor-pointer has-[:checked]:border-[#06C167] has-[:checked]:bg-[#E8F8EE] transition">
                <input type="radio" name="paymentMethod" value="eft" class="accent-[#06C167] w-4 h-4">
                <div>
                  <span class="text-xs font-black text-gray-900 block">🏦 EFT / Havale</span>
                  <span class="text-[10px] text-gray-500">Banka hesabına havale</span>
                </div>
              </label>
            </div>
          </div>

          <div id="eft-details-box" class="hidden bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-emerald-900">Pita Mutfak Banka Bilgileri</span>
              <span class="bg-[#06C167] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Hızlı Onay</span>
            </div>
            <div class="text-gray-700 font-medium">
              <div><strong>Banka:</strong> Ziraat Bankası</div>
              <div><strong>Alıcı:</strong> Pita Mutfak Gıda Tic. Ltd. Şti.</div>
              <div class="mt-1 flex items-center justify-between bg-white p-2 rounded-xl border border-emerald-200 font-mono text-[11px] font-bold text-gray-900">
                <span id="iban-text">TR56 0001 0000 1234 5678 9012 34</span>
                <button type="button" id="copy-iban-btn" class="bg-emerald-100 hover:bg-[#06C167] hover:text-white text-[#06C167] px-2 py-1 rounded-lg text-[10px] font-bold transition">
                  Kopyala
                </button>
              </div>
              <p class="text-[11px] text-emerald-800 mt-2 font-medium">
                💡 Lütfen açıklama kısmına <strong>Adınızı</strong> yazınız.
              </p>
            </div>
          </div>

          ${discountAmount > 0 ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
              <span class="font-bold">🎉 İlk Sipariş İndirimi (%20):</span>
              <span class="font-black text-[#06C167]">-₺${discountAmount}</span>
            </div>
          ` : ''}

          <div class="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <div>
              <span class="text-xs text-gray-400 block">Ödenecek Tutar</span>
              <span class="text-xl font-black text-[#06C167]">₺${cartTotal}</span>
            </div>

            <button 
              type="submit" 
              class="flex-1 bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Siparişi Tamamla</span>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

        </form>

      </div>
    </div>
  `;
}

// Canlı Sipariş Takip Modalı
function renderTrackingModal(order) {
  const steps = [
    { key: 'pending', label: 'Sipariş Alındı', icon: '📝' },
    { key: 'preparing', label: 'Hazırlanıyor', icon: '🍳' },
    { key: 'on_the_way', label: 'Kurye Yolda', icon: '🛵' },
    { key: 'delivered', label: 'Teslim Edildi', icon: '✅' }
  ];

  const statusOrder = ['pending', 'preparing', 'on_the_way', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status);

  return `
    <div id="tracking-modal-backdrop" class="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="bg-[#06C167] text-white p-6 text-center relative">
          <button id="close-tracking-modal" class="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div class="w-14 h-14 mx-auto rounded-full bg-white/20 flex items-center justify-center text-3xl mb-3 shadow-inner">
            ${order.status === 'delivered' ? '🎉' : '🛵'}
          </div>
          <h3 class="text-xl font-extrabold tracking-tight">Sipariş Takibi</h3>
          <p class="text-xs text-white/90 mt-1">Sipariş No: <strong>#${order.id}</strong> • ${order.orderTimeFormatted}</p>
        </div>

        <div class="p-6 space-y-6">

          ${order.status !== 'delivered' ? `
            <div class="bg-gradient-to-br from-[#E8F8EE] to-[#D5F5E0] border-2 border-[#06C167] rounded-2xl p-5 text-center shadow-md">
              <div class="inline-flex items-center gap-1.5 text-xs font-bold text-[#06C167] uppercase tracking-wider mb-1">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Siparişiniz Güvende</span>
              </div>
              <p class="text-xs text-gray-600 font-medium mt-2">
                Siparişiniz güvenli bir şekilde takip edilmektedir. Kurye kapınıza geldiğinde teslimat otomatik olarak doğrulanacaktır.
              </p>
            </div>
          ` : `
            <div class="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-center">
              <span class="text-3xl block mb-2">🎉</span>
              <h4 class="text-base font-black text-emerald-900">Siparişiniz Başarıyla Teslim Edildi!</h4>
              <p class="text-xs text-emerald-700 mt-1">Afiyet olsun! Bizi tercih ettiğiniz için teşekkür ederiz.</p>
            </div>
          `}

          <div>
            <div class="flex items-center justify-between relative mb-2">
              <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
              <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#06C167] z-0 transition-all duration-500" style="width: ${Math.max(0, (currentIndex / 3) * 100)}%;"></div>
              
              ${steps.map((step, idx) => {
                const isPassed = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                return `
                  <div class="relative z-10 flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isPassed ? 'bg-[#06C167] text-white shadow-md' : 'bg-white border-2 border-gray-300 text-gray-400'} ${isCurrent ? 'ring-4 ring-[#06C167]/20 scale-110' : ''}">
                      ${step.icon}
                    </div>
                    <span class="text-[10px] font-bold mt-1.5 ${isPassed ? 'text-[#06C167]' : 'text-gray-400'} text-center whitespace-nowrap">
                      ${step.label}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center text-xs font-medium text-gray-700 mt-4">
              ${order.statusHistory && order.statusHistory.length > 0 
                ? order.statusHistory[order.statusHistory.length - 1].note 
                : 'Siparişiniz işleniyor...'}
            </div>
          </div>

          ${order.status === 'delivered' ? `
            <div class="pt-2">
              ${order.issueReport ? `
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  <div class="font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Sorun Bildiriminiz Restorana İletildi (${order.issueReport.reason})</span>
                  </div>
                  <p class="text-[11px] text-amber-700 mt-1">"${order.issueReport.message || 'Mesajınız iletildi'}"</p>
                  <span class="text-[10px] text-gray-500 block mt-1">Durum: Restoran incelemesinde</span>
                </div>
              ` : `
                <button 
                  data-open-issue-btn="${order.id}" 
                  class="w-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>⚠️</span>
                  <span>Siparişinizle ilgili bir sorun mu var? Bize bildirin</span>
                </button>
              `}
            </div>
          ` : ''}

          <div class="border-t border-gray-100 pt-4 text-xs space-y-2">
            <div class="flex justify-between text-gray-600">
              <span>Müşteri:</span>
              <span class="font-bold text-gray-900">${order.customerName} (${order.customerPhone})</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Adres:</span>
              <span class="font-bold text-gray-900 text-right">${order.deliveryAddress}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Ürünler:</span>
              <span class="font-semibold text-gray-800 text-right">${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</span>
            </div>
            ${order.discountAmount > 0 ? `
              <div class="flex justify-between text-[#06C167] font-semibold">
                <span>İlk Sipariş İndirimi (%20):</span>
                <span>-₺${order.discountAmount}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-gray-900 font-extrabold text-sm pt-2 border-t border-gray-100">
              <span>Toplam:</span>
              <span class="text-[#06C167]">₺${order.totalAmount} (${order.paymentMethod === 'cash' ? 'Kapıda Nakit' : 'EFT / Havale'})</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button id="track-new-order-btn" class="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer">
              Menüye Dön
            </button>
          </div>

        </div>

      </div>
    </div>
  `;
}

// Geçmiş Siparişlerim Modalı
function renderMyOrdersModal(myOrders, state) {
  return `
    <div id="my-orders-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">📋</span>
            <div>
              <h3 class="font-extrabold text-lg text-[#121212]">Geçmiş Siparişlerim</h3>
              <p class="text-xs text-gray-500">Daha önce verdiğiniz tüm siparişler ve destek</p>
            </div>
          </div>
          <button id="close-my-orders-btn" class="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="p-5 flex-1 overflow-y-auto space-y-4">
          ${myOrders.length === 0 ? `
            <div class="text-center py-12 text-gray-400">
              <div class="text-4xl mb-2">🍽️</div>
              <p class="font-bold text-gray-700 text-sm">Henüz bir siparişiniz bulunmuyor</p>
              <p class="text-xs text-gray-400 mt-1">Leziz menümüzden ilk siparişinizi hemen oluşturabilirsiniz.</p>
            </div>
          ` : myOrders.map(order => {
            let badgeClass = 'bg-gray-100 text-gray-700';
            let badgeText = order.status;
            if (order.status === 'pending') { badgeClass = 'bg-amber-100 text-amber-800'; badgeText = 'Onay Bekliyor'; }
            else if (order.status === 'preparing') { badgeClass = 'bg-blue-100 text-blue-800'; badgeText = 'Hazırlanıyor'; }
            else if (order.status === 'on_the_way') { badgeClass = 'bg-purple-100 text-purple-800'; badgeText = 'Kurye Yolda'; }
            else if (order.status === 'delivered') { badgeClass = 'bg-emerald-100 text-[#06C167]'; badgeText = 'Teslim Edildi'; }

            return `
              <div class="border border-gray-100 rounded-2xl p-4 bg-[#FAFBFB] space-y-3">
                
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-mono font-black text-xs text-gray-900">#${order.id}</span>
                    <span class="text-xs text-gray-400 ml-2">${order.orderDateFormatted} • ${order.orderTimeFormatted}</span>
                  </div>
                  <span class="text-[11px] font-black px-2.5 py-1 rounded-full ${badgeClass}">${badgeText}</span>
                </div>

                <div class="text-xs text-gray-700">
                  <div class="font-medium">${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div>
                  <div class="text-gray-400 text-[11px] mt-0.5">${order.deliveryAddress}</div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-200/60">
                  <div>
                    <span class="text-[10px] text-gray-400 block">${order.paymentMethod === 'cash' ? 'Kapıda Nakit' : 'EFT / Havale'}</span>
                    <span class="text-sm font-black text-[#06C167]">₺${order.totalAmount}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button 
                      data-open-detail-order="${order.id}" 
                      class="bg-white border border-gray-200 hover:border-gray-400 text-gray-700 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Takip Et
                    </button>

                    ${order.status === 'delivered' ? `
                      ${order.issueReport ? `
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1.5 rounded-xl">
                          ⚠️ Sorun Bildirildi
                        </span>
                      ` : `
                        <button 
                          data-open-issue-btn="${order.id}" 
                          class="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                        >
                          ⚠️ Sorun Bildir
                        </button>
                      `}
                    ` : ''}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    </div>
  `;
}

// Sorun Bildirme Modalı
function renderIssueModal(orderId, state) {
  const order = orderService.getOrder(orderId);
  if (!order) return '';

  return `
    <div id="issue-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <h3 class="font-extrabold text-base text-gray-900">Sorun Bildir (Sipariş #${order.id})</h3>
          </div>
          <button id="close-issue-modal-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        <form id="issue-report-form" data-issue-order-id="${order.id}" class="space-y-4 pt-4">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Sorunun Konusu *</label>
            <select name="reason" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none">
              <option value="Sipariş Soğuk Geldi">Sipariş Soğuk Geldi</option>
              <option value="Eksik Ürün / İçecek">Eksik Ürün veya İçecek</option>
              <option value="Yanlış Ürün Gönderildi">Yanlış Ürün Gönderildi</option>
              <option value="Kurye ile İlgili Sorun">Kurye ile İlgili Sorun</option>
              <option value="Lezzet / Kalite Beğenilmedi">Lezzet / Kalite Memnuniyetsizliği</option>
              <option value="Diğer Sorun">Diğer</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Açıklamanız *</label>
            <textarea 
              name="message" 
              rows="3" 
              required 
              placeholder="Yaşadığınız sorunu detaylandırınız. Restoran yönetimimiz en kısa sürede inceleyecektir."
              class="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3 rounded-2xl text-xs shadow-md transition cursor-pointer"
          >
            Restorana İlet
          </button>
        </form>

      </div>
    </div>
  `;
}

// Müşteri Mesaj Kutusu & Bildirim Modalı
function renderCustomerInboxModal(messages, currentUser) {
  const hasCustomCode = currentUser && currentUser.custom_code && currentUser.custom_discount > 0;

  return `
    <div id="customer-inbox-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-[#E8F8EE] text-[#06C167] flex items-center justify-center text-lg font-bold">
              🔔
            </div>
            <div>
              <h3 class="font-extrabold text-base text-[#121212]">Bildirimler & Mesajlar</h3>
              <p class="text-[11px] text-gray-500">Pita Mutfak yönetiminden size özel bildirimler</p>
            </div>
          </div>
          <button id="close-customer-inbox-btn" class="p-2 text-gray-400 hover:text-black rounded-xl transition cursor-pointer">✕</button>
        </div>

        <div class="overflow-y-auto py-4 space-y-3.5 flex-1">
          
          <!-- Size Özel Tanımlı Kod Varsa Kart Olarak Göster -->
          ${hasCustomCode ? `
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] uppercase tracking-wider font-black bg-white/20 px-2 py-0.5 rounded-full">🎉 Size Özel Tanımlandı</span>
                <span class="text-xs font-black bg-white text-purple-700 px-2 py-0.5 rounded-full">%${currentUser.custom_discount} İNDİRİM</span>
              </div>
              <h4 class="font-black text-sm">Özel İndirim Kodunuz: <span class="font-mono tracking-widest bg-white/10 px-2 py-0.5 rounded-lg">${currentUser.custom_code}</span></h4>
              <p class="text-[11px] text-purple-100 mt-1.5">Bu kupon hesabınıza tanımlanmıştır. Sepetinizde otomatik uygulanır veya indirim kutusundan açabilirsiniz.</p>
            </div>
          ` : ''}

          <!-- Mesajlar Listesi -->
          ${messages.length === 0 ? `
            <div class="py-10 text-center">
              <span class="text-4xl block mb-2">📭</span>
              <p class="text-xs font-bold text-gray-600">Henüz yeni bir mesajınız yok</p>
              <p class="text-[11px] text-gray-400 mt-1">Restoranımız size özel teklif ve bildirimler ilettiğinde burada göreceksiniz.</p>
            </div>
          ` : messages.map(msg => {
            const dateStr = msg.created_at 
              ? new Date(msg.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : '';

            return `
              <div class="p-4 rounded-2xl border ${msg.is_read ? 'bg-gray-50 border-gray-100' : 'bg-emerald-50/70 border-emerald-200'} transition">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="flex items-center gap-1.5">
                    ${!msg.is_read ? `<span class="w-2 h-2 rounded-full bg-[#06C167] animate-ping"></span>` : ''}
                    <h4 class="font-extrabold text-xs text-[#121212]">${msg.title}</h4>
                  </div>
                  <span class="text-[10px] text-gray-400 font-mono whitespace-nowrap">${dateStr}</span>
                </div>
                <p class="text-xs text-gray-600 leading-relaxed mt-1 whitespace-pre-line">${msg.message}</p>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/60 text-[10px] text-gray-400">
                  <span>✉️ ${msg.sender || 'Pita Mutfak Yönetimi'}</span>
                  ${!msg.is_read ? `<span class="text-[#06C167] font-bold">Yeni Bildirim</span>` : `<span class="text-gray-400">Okundu</span>`}
                </div>
              </div>
            `;
          }).join('')}

        </div>

      </div>
    </div>
  `;
}

// Event Listeners Bağlayıcı
function attachCustomerEventListeners(container, state, onStateChange, menu) {
  
  // Kategori tıklama
  container.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      onStateChange({ activeCategory: cat });
    });
  });

  // Giriş Yap Modalını Açma / Kapatma
  const openLoginBtn = container.querySelector('#open-login-btn');
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => onStateChange({ isLoginModalOpen: true }));
  }

  const closeLoginBtn = container.querySelector('#close-login-btn');
  if (closeLoginBtn) {
    closeLoginBtn.addEventListener('click', () => onStateChange({ isLoginModalOpen: false }));
  }

  // İndirimi Kap Butonları (Banner ve Hero)
  const claimDiscountBtn = container.querySelector('#claim-discount-btn');
  const topPromoClaimBtn = container.querySelector('#top-promo-claim-btn');
  const handleClaim = () => {
    if (!state.currentUser) {
      onStateChange({ isLoginModalOpen: true });
    } else {
      onStateChange({ firstOrderDiscountApplied: true, isCartOpen: true });
      alert("🎉 Tebrikler! İlk siparişinize özel %20 indirim sepetinize uygulandı!");
    }
  };
  if (claimDiscountBtn) claimDiscountBtn.addEventListener('click', handleClaim);
  if (topPromoClaimBtn) topPromoClaimBtn.addEventListener('click', handleClaim);

  // Giriş / Kayıt Formu Gönderimi
  const loginForm = container.querySelector('#customer-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const name = formData.get('name').trim();
      const phone = formData.get('phone').trim();

      const user = { name, phone };
      setCurrentUser(user);

      // Backend SQLite veritabanına müşteriyi kaydet
      registerCustomer(name, phone).catch(err => console.warn("Backend müşteri kaydı:", err));

      onStateChange({
        currentUser: user,
        isLoginModalOpen: false,
        firstOrderDiscountApplied: true
      });

      alert(`🎉 Hoş geldiniz, ${name}! İlk siparişinize özel %20 indirim tanımlandı.`);
    });
  }

  // Çıkış Yap
  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setCurrentUser(null);
      onStateChange({ currentUser: null, firstOrderDiscountApplied: false });
    });
  }

  // Sepetteki Kupon Toggle Butonu
  const toggleDiscountBtn = container.querySelector('#toggle-cart-discount-btn');
  if (toggleDiscountBtn) {
    toggleDiscountBtn.addEventListener('click', () => {
      if (!state.currentUser) {
        // Giriş yapmadan indirim kullanılamaz
        onStateChange({ isLoginModalOpen: true });
        return;
      }
      onStateChange({ firstOrderDiscountApplied: !state.firstOrderDiscountApplied });
    });
  }

  // Sepet Açma / Kapama
  const openCartBtn = container.querySelector('#open-cart-btn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => onStateChange({ isCartOpen: true }));
  }

  const closeCartBtn = container.querySelector('#close-cart-btn');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => onStateChange({ isCartOpen: false }));
  }

  const cartBackdrop = container.querySelector('#cart-drawer-backdrop');
  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', (e) => {
      if (e.target === cartBackdrop) onStateChange({ isCartOpen: false });
    });
  }

  // Geçmiş Siparişlerim Açma / Kapama
  const myOrdersBtn = container.querySelector('#my-orders-btn');
  if (myOrdersBtn) {
    myOrdersBtn.addEventListener('click', () => onStateChange({ isMyOrdersOpen: true }));
  }

  const closeMyOrdersBtn = container.querySelector('#close-my-orders-btn');
  if (closeMyOrdersBtn) {
    closeMyOrdersBtn.addEventListener('click', () => onStateChange({ isMyOrdersOpen: false }));
  }

  // Geçmiş siparişler içinden bir siparişi takip modaliyle açma
  container.querySelectorAll('[data-open-detail-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-open-detail-order');
      const order = orderService.getOrder(orderId);
      if (order) {
        onStateChange({
          isMyOrdersOpen: false,
          activeTrackingOrder: order,
          showTrackingModal: true
        });
      }
    });
  });

  // Sorun Bildirme Modalını Açma
  container.querySelectorAll('[data-open-issue-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-open-issue-btn');
      onStateChange({ reportingOrderId: orderId });
    });
  });

  const closeIssueBtn = container.querySelector('#close-issue-modal-btn');
  if (closeIssueBtn) {
    closeIssueBtn.addEventListener('click', () => onStateChange({ reportingOrderId: null }));
  }

  // Sorun Bildirimi Gönderme
  const issueForm = container.querySelector('#issue-report-form');
  if (issueForm) {
    issueForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const orderId = issueForm.getAttribute('data-issue-order-id');
      const formData = new FormData(issueForm);
      const reason = formData.get('reason');
      const message = formData.get('message');

      const updated = orderService.reportIssue(orderId, { reason, message });
      alert("✓ Bildiriminiz restorana iletildi. Yetkilimiz en kısa sürede sizinle iletişime geçecektir.");
      onStateChange({
        reportingOrderId: null,
        activeTrackingOrder: updated
      });
    });
  }

  // Ürün modalı açma
  container.querySelectorAll('.add-product-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-product-id');
      const product = menu.find(p => p.id === pId);
      if (product) {
        onStateChange({ selectedProduct: product, modalQty: 1, modalOptionIndex: 0 });
      }
    });
  });

  // Ürün modalı kapatma
  const closeProductBtn = container.querySelector('#close-product-modal');
  if (closeProductBtn) {
    closeProductBtn.addEventListener('click', () => onStateChange({ selectedProduct: null }));
  }
  const productBackdrop = container.querySelector('#product-modal-backdrop');
  if (productBackdrop) {
    productBackdrop.addEventListener('click', (e) => {
      if (e.target === productBackdrop) onStateChange({ selectedProduct: null });
    });
  }

  // Modalda miktar arttırma / azaltma
  let modalQty = 1;
  let selectedOptionIndex = 0;
  const qtyValEl = container.querySelector('#modal-qty-val');
  const priceEl = container.querySelector('#modal-calculated-price');

  const updateModalPrice = () => {
    if (!state.selectedProduct) return;
    const basePrice = state.selectedProduct.price;
    const optionExtra = (state.selectedProduct.options && state.selectedProduct.options[selectedOptionIndex]) 
      ? state.selectedProduct.options[selectedOptionIndex].price 
      : 0;
    const singlePrice = basePrice + optionExtra;
    const total = singlePrice * modalQty;
    if (priceEl) priceEl.textContent = `• ₺${total}`;
    if (qtyValEl) qtyValEl.textContent = modalQty;
  };

  const qtyMinus = container.querySelector('#modal-qty-minus');
  const qtyPlus = container.querySelector('#modal-qty-plus');
  if (qtyMinus && qtyPlus) {
    qtyMinus.addEventListener('click', () => {
      if (modalQty > 1) {
        modalQty--;
        updateModalPrice();
      }
    });
    qtyPlus.addEventListener('click', () => {
      modalQty++;
      updateModalPrice();
    });
  }

  // Seçenek radyoları
  const radioInputs = container.querySelectorAll('input[name="product-option"]');
  radioInputs.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedOptionIndex = parseInt(e.target.value, 10);
      updateModalPrice();
    });
  });

  // Modaldan sepete ekle onay
  const confirmAddBtn = container.querySelector('#modal-confirm-add-btn');
  if (confirmAddBtn && state.selectedProduct) {
    confirmAddBtn.addEventListener('click', () => {
      const p = state.selectedProduct;
      const opt = (p.options && p.options[selectedOptionIndex]) ? p.options[selectedOptionIndex] : null;
      const noteInput = container.querySelector('#product-note-input');
      const note = noteInput ? noteInput.value.trim() : '';

      const unitPrice = p.price + (opt ? opt.price : 0);
      const cartItem = {
        productId: p.id,
        name: p.name,
        option: opt,
        note: note,
        unitPrice: unitPrice,
        quantity: modalQty
      };

      const existingIndex = state.cart.findIndex(item => 
        item.productId === cartItem.productId && 
        JSON.stringify(item.option) === JSON.stringify(cartItem.option) &&
        item.note === cartItem.note
      );

      let newCart;
      if (existingIndex > -1) {
        newCart = [...state.cart];
        newCart[existingIndex].quantity += modalQty;
      } else {
        newCart = [...state.cart, cartItem];
      }

      onStateChange({ cart: newCart, selectedProduct: null, isCartOpen: true });
    });
  }

  // Sepetteki artı/eksi butonları
  container.querySelectorAll('[data-cart-plus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-cart-plus'), 10);
      const newCart = [...state.cart];
      newCart[idx].quantity++;
      onStateChange({ cart: newCart });
    });
  });

  container.querySelectorAll('[data-cart-minus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-cart-minus'), 10);
      let newCart = [...state.cart];
      if (newCart[idx].quantity > 1) {
        newCart[idx].quantity--;
      } else {
        newCart.splice(idx, 1);
      }
      onStateChange({ cart: newCart });
    });
  });

  // Siparişi Onayla / Checkout'a Geç Butonu
  const proceedBtn = container.querySelector('#proceed-checkout-btn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      onStateChange({ isCartOpen: false, isCheckoutOpen: true });
    });
  }

  // Checkout Kapatma
  const closeCheckoutBtn = container.querySelector('#close-checkout-btn');
  if (closeCheckoutBtn) {
    closeCheckoutBtn.addEventListener('click', () => onStateChange({ isCheckoutOpen: false }));
  }

  // Ödeme Yöntemi Değişimi (EFT/Havale kutusu gösterme)
  const paymentRadios = container.querySelectorAll('input[name="paymentMethod"]');
  const eftBox = container.querySelector('#eft-details-box');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'eft') {
        if (eftBox) eftBox.classList.remove('hidden');
      } else {
        if (eftBox) eftBox.classList.add('hidden');
      }
    });
  });

  // IBAN Kopyalama Butonu
  const copyIbanBtn = container.querySelector('#copy-iban-btn');
  if (copyIbanBtn) {
    copyIbanBtn.addEventListener('click', () => {
      const ibanText = container.querySelector('#iban-text')?.textContent || '';
      navigator.clipboard.writeText(ibanText.replace(/\s+/g, '')).then(() => {
        copyIbanBtn.textContent = '✓ Kopyalandı!';
        setTimeout(() => { copyIbanBtn.textContent = 'Kopyala'; }, 2000);
      });
    });
  }

  // Checkout Form Gönderimi (Sipariş Verme)
  const checkoutForm = container.querySelector('#checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(checkoutForm);
      const customerName = formData.get('customerName');
      const customerPhone = formData.get('customerPhone');
      const deliveryAddress = formData.get('deliveryAddress') || '';
      const orderNote = formData.get('orderNote') || '';
      const paymentMethod = formData.get('paymentMethod');

      const currentSubtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const hasCustom = state.currentUser && state.currentUser.custom_code && state.currentUser.custom_discount > 0;
      const appliedRate = hasCustom ? state.currentUser.custom_discount : state.discountPercentage;
      const couponCode = hasCustom ? state.currentUser.custom_code : 'PITA20';

      const currentDiscount = (state.firstOrderDiscountApplied && currentSubtotal > 0)
        ? Math.round(currentSubtotal * (appliedRate / 100))
        : 0;
      const finalTotal = Math.max(0, currentSubtotal - currentDiscount);
      const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

      // Kullanıcı bilgisini güncelle
      if (!state.currentUser && customerName) {
        const user = { name: customerName, phone: customerPhone };
        setCurrentUser(user);
        state.currentUser = user;
        if (customerPhone) {
          registerCustomer(customerName, customerPhone).catch(err => console.warn("Backend müşteri kaydı:", err));
        }
      }

      const createdOrder = orderService.createOrder({
        customerName,
        customerPhone,
        deliveryAddress,
        orderNote,
        paymentMethod,
        items: state.cart,
        subtotalAmount: currentSubtotal,
        discountAmount: currentDiscount,
        discountCode: currentDiscount > 0 ? couponCode : '',
        totalAmount: finalTotal,
        totalCount: cartCount
      });

      onStateChange({
        cart: [],
        isCheckoutOpen: false,
        activeTrackingOrder: createdOrder,
        showTrackingModal: true,
        firstOrderDiscountApplied: false // Kullanıldı
      });
    });
  }

  // Müşteri Gelen Kutusu / Bildirimler Modalı Açma & Okundu Yapma
  const openInboxBtn = container.querySelector('#open-customer-inbox-btn');
  if (openInboxBtn) {
    openInboxBtn.addEventListener('click', () => {
      onStateChange({ isCustomerInboxOpen: true });
      // Okunmamış mesajları okundu olarak işaretle
      const unread = (state.customerMessages || []).filter(m => !m.is_read);
      for (const m of unread) {
        orderService.markMessageAsRead(m.id).catch(() => {});
        m.is_read = 1;
      }
    });
  }

  const closeInboxBtn = container.querySelector('#close-customer-inbox-btn');
  if (closeInboxBtn) {
    closeInboxBtn.addEventListener('click', () => onStateChange({ isCustomerInboxOpen: false }));
  }

  const inboxBackdrop = container.querySelector('#customer-inbox-backdrop');
  if (inboxBackdrop) {
    inboxBackdrop.addEventListener('click', (e) => {
      if (e.target === inboxBackdrop) onStateChange({ isCustomerInboxOpen: false });
    });
  }

  // Canlı Takip Hızlı Buton & Kapatma Butonu
  const quickTrackBtn = container.querySelector('#quick-track-btn');
  if (quickTrackBtn) {
    quickTrackBtn.addEventListener('click', () => onStateChange({ showTrackingModal: true }));
  }

  const closeTrackingBtn = container.querySelector('#close-tracking-modal');
  if (closeTrackingBtn) {
    closeTrackingBtn.addEventListener('click', () => onStateChange({ showTrackingModal: false }));
  }

  const newOrderReturnBtn = container.querySelector('#track-new-order-btn');
  if (newOrderReturnBtn) {
    newOrderReturnBtn.addEventListener('click', () => onStateChange({ showTrackingModal: false }));
  }
}
