// Pita Mutfak - Müşteri Sipariş Arayüzü (Uber Eats Yeşil - Beyaz Tema)
import { 
  orderService, 
  getCurrentUser, 
  setCurrentUser, 
  isFirstOrderDiscountAvailable, 
  registerCustomer,
  sendVerificationCode,
  verifyAndRegister,
  verifyPhone,
  customerLogin,
  signInWithGoogle,
  getGoogleRedirectResult,
  syncCustomerToFirestore,
  saveCustomerLocally,
  addReview,
  isRestaurantOpenNow,
  getSavedAddresses,
  saveAddress,
  deleteAddress,
  resetRecaptchaVerifier
} from '../services/orderService.js';


import { categories } from '../data/initialMenu.js';
import { verifyAdminCredentials, setAdminLoggedIn } from './AdminPanel.js';

export function renderCustomerView(container, state, onStateChange) {
  const currentUser = state.currentUser || getCurrentUser();
  const { cart, activeCategory, selectedProduct, activeTrackingOrder, firstOrderDiscountApplied, discountPercentage } = state;
  const menu = orderService.getMenu();
  const myOrders = orderService.getMyOrders(state.orders);
  const restaurantSettings = state.restaurantSettings || orderService.getRestaurantSettings();
  const restStatus = isRestaurantOpenNow(restaurantSettings);
  const isRestaurantOpen = restStatus.isOpen;

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
      
      ${!isRestaurantOpen ? `
        <!-- Restoran Kapalı Uyarısı Bannerı -->
        <div class="bg-red-600 text-white py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 text-center sticky top-0 z-40">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span>⚠️ <strong>${restStatus.message || `Restoranımız şu anda kapalıdır. Çalışma saatlerimiz: ${restaurantSettings.openingHours || '10:00 - 23:00'}. Sipariş alımı geçici olarak durdurulmuştur.`}</strong></span>
        </div>
      ` : `
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
      `}

      <!-- Ana Header / Navigasyon -->
      <header class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm transition-all">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          <!-- Logo & Slogan -->
          <div class="flex items-center gap-3 cursor-pointer" id="nav-logo-btn">
            <div class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl overflow-hidden shadow-md shadow-[#06C167]/20 transform transition hover:scale-105 bg-[#06C167] flex-shrink-0">
              <img src="./assets/logo_app.jpg" alt="Pita Mutfak Logo" class="w-full h-full object-cover">
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-black tracking-tight text-[#121212]">pita<span class="text-[#06C167]">mutfak</span></h1>
                <span class="${isRestaurantOpen ? 'bg-[#E8F8EE] text-[#06C167]' : 'bg-red-100 text-red-600'} text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span class="w-2 h-2 rounded-full ${isRestaurantOpen ? 'bg-[#06C167] animate-pulse' : 'bg-red-500'}"></span>
                  <span>${isRestaurantOpen ? 'Açık' : 'Kapalı'}</span>
                  <span class="text-gray-400 font-normal">(${restaurantSettings.openingHours || '10:00 - 23:00'})</span>
                </span>
              </div>
              <p class="text-xs text-gray-500 font-medium">Tavuk Pilav • Taze Makarna • Çıtır Pizza</p>
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
                  ${!currentUser.phoneVerified ? '<span class="text-xs">⚠️</span>' : ''}
                </button>
                <div class="hidden group-hover:block absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div class="px-3 py-2 border-b border-gray-100 mb-1">
                    <p class="text-xs font-bold text-gray-900 truncate">${currentUser.name}</p>
                    <p class="text-[11px] text-gray-400 font-mono">${currentUser.phone || 'Telefon girilmedi'}</p>
                    ${currentUser.phoneVerified 
                      ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1">✓ Doğrulandı</span>'
                      : '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full mt-1">⚠️ Telefon Doğrulanmadı</span>'
                    }
                  </div>
                  <button id="open-addresses-btn" class="w-full text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 p-2 rounded-xl transition flex items-center gap-2 cursor-pointer">
                    <span>📍</span><span>Adreslerim</span>
                  </button>
                  <button id="open-phone-verify-btn" class="w-full text-left text-xs font-semibold ${currentUser.phoneVerified ? 'text-gray-700' : 'text-orange-600 font-bold'} hover:bg-gray-50 p-2 rounded-xl transition flex items-center gap-2 cursor-pointer">
                    <span>📞</span>
                    <span>${currentUser.phoneVerified ? 'Telefonum' : 'Telefonu Doğrula!'}</span>
                  </button>
                  <div class="border-t border-gray-100 mt-1 pt-1">
                    <button id="logout-btn" class="w-full text-left text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-xl transition cursor-pointer">
                      🚪 Çıkış Yap
                    </button>
                  </div>
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

            <!-- Müşteri Yorumları & Puan Butonu -->
            <button 
              id="open-reviews-btn" 
              class="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 sm:px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Müşteri Değerlendirmeleri ve Yorumları"
            >
              <span>⭐</span>
              <span>4.9</span>
              <span class="hidden sm:inline text-amber-700">Yorumlar</span>
            </button>

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
              Usta Ellerden <span class="text-[#06C167]">Tavuk Pilav</span>, <span class="text-[#06C167]">Taze Makarna</span> ve <span class="text-[#06C167]">Çıtır Pizza</span>
            </h2>

            <p class="text-gray-300 text-sm sm:text-base mb-6 leading-relaxed">
              Özel marine edilmiş çıtır ve tiftik tavuklar, tereyağlı nohutlu pilav, günlük krema ve fesleğenli makarnalar ile taş fırında nar gibi kızaran İtalyan hamurlu çıtır pizzalar sofranızda.
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

            const prodReviews = (state.reviewsList || []).filter(r => r.product_id === product.id);
            const prodRating = prodReviews.length > 0 
              ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1)
              : '5.0';
            const prodReviewCount = prodReviews.length > 0 ? prodReviews.length : (product.badge === 'En Çok Satan' ? 28 : 14);

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
                    <!-- Yorum & Puan Rozeti -->
                    <button 
                      type="button" 
                      data-open-product-reviews="${product.id}" 
                      class="flex items-center gap-1.5 mt-1 text-xs font-semibold text-gray-600 hover:text-[#06C167] transition cursor-pointer"
                      title="Ürün değerlendirmelerini gör"
                    >
                      <span class="text-amber-400">⭐</span>
                      <span class="font-bold text-gray-900">${prodRating}</span>
                      <span class="text-[11px] text-gray-400">(${prodReviewCount} yorum)</span>
                    </button>
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
      ${state.isCartOpen ? renderCartDrawer(cart, subtotal, discountAmount, cartTotal, firstOrderDiscountApplied, currentUser, isRestaurantOpen, restStatus.message) : ''}

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

      <!-- Müşteri Yorum & Puanlama Modalı -->
      ${state.isReviewsModalOpen ? renderReviewsModal(state) : ''}

      <!-- Sipariş Değerlendirme Modalı -->
      ${state.reviewingOrderId ? renderOrderReviewModal(state.reviewingOrderId, state) : ''}

      <!-- Adreslerim Modalı -->
      ${state.isAddressesOpen ? renderAddressesModal(currentUser) : ''}

      <!-- Telefon Doğrulama Modalı -->
      ${state.isPhoneVerifyOpen ? renderPhoneVerifyModal(currentUser, state) : ''}

    </div>
  `;

  attachCustomerEventListeners(container, state, onStateChange, menu);
}

// Giriş Yap, Kayıt Ol & Doğrulama Modalı
function renderLoginModal(state) {
  const mode = state.authMode || 'login'; // 'login' | 'register' | 'verify'
  const isVerifyStep = mode === 'verify' && state.pendingVerificationData;
  const loginNotice = state.loginNotice || '';

  return `
    <div id="login-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#06C167] text-white flex items-center justify-center text-base font-bold shadow-sm shadow-[#06C167]/30">
              ${isVerifyStep ? '📱' : '🍲'}
            </div>
            <div>
              <h3 class="font-black text-base text-gray-900">
                ${isVerifyStep ? 'Güvenlik Doğrulaması' : (mode === 'register' ? 'Kayıt Ol & %20 İndirim Kap' : 'Müşteri Girişi')}
              </h3>
              <p class="text-[11px] text-gray-500">
                ${isVerifyStep ? 'Doğrulama kodunu girerek hesabınızı aktifleştirin' : 'Pita Mutfak lezzet dünyasına hoş geldiniz'}
              </p>
            </div>
          </div>
          <button id="close-login-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        ${state.authError ? `
          <div class="bg-red-50 border border-red-300 text-red-900 rounded-2xl p-3.5 my-3 text-xs flex items-start gap-2.5 animate-in fade-in duration-200 shadow-xs">
            <span class="text-base shrink-0 leading-none">⚠️</span>
            <div class="font-bold leading-relaxed">${state.authError}</div>
          </div>
        ` : ''}

        ${loginNotice ? `
          <div class="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-3 my-3 text-xs flex items-center gap-2">
            <span class="text-base">⚠️</span>
            <span class="font-bold">${loginNotice}</span>
          </div>
        ` : ''}

        ${!isVerifyStep ? `
          <!-- Google ile Tek Tıkla Giriş Butonu -->
          <div class="mt-4">
            <button 
              type="button" 
              id="google-signin-btn"
              class="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm border border-gray-300 shadow-xs transition flex items-center justify-center gap-3 cursor-pointer active:scale-98"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google ile Hızlı Giriş Yap</span>
            </button>

            <div class="relative flex py-3 items-center">
              <div class="flex-grow border-t border-gray-200"></div>
              <span class="flex-shrink mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-wider">veya SMS / E-posta ile</span>
              <div class="flex-grow border-t border-gray-200"></div>
            </div>
          </div>

          <!-- Giriş / Kayıt Sekmeleri -->
          <div class="flex bg-gray-100 p-1 rounded-2xl mb-3 text-xs font-bold">
            <button 
              id="tab-btn-login" 
              type="button" 
              class="flex-1 py-2 rounded-xl transition cursor-pointer ${mode === 'login' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}"
            >
              Giriş Yap
            </button>
            <button 
              id="tab-btn-register" 
              type="button" 
              class="flex-1 py-2 rounded-xl transition cursor-pointer ${mode === 'register' ? 'bg-white text-[#06C167] shadow-xs' : 'text-gray-500 hover:text-gray-900'}"
            >
              Kayıt Ol (%20 İndirim)
            </button>
          </div>
        ` : ''}

        ${isVerifyStep ? `
          <!-- 6 HANELİ DOĞRULAMA KODU EKRANI -->
          <div class="space-y-4 pt-1">
            <div class="text-center py-2">
              <span class="text-3xl block mb-1">📬</span>
              <p class="text-xs text-gray-600">
                <strong class="text-gray-900">${state.pendingVerificationData.phone || state.pendingVerificationData.email}</strong> adresine 6 haneli doğrulama kodu gönderildi.
              </p>
            </div>

            <!-- Demo Kod Bildirim Bandı -->
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs flex items-center justify-between">
              <div>
                <span class="block text-[11px] text-emerald-700 font-bold">💡 SMS / Demo Doğrulama Kodu:</span>
                <span class="font-mono text-base font-black tracking-widest text-[#06C167]">${state.verificationCodeHint || '123456'}</span>
              </div>
              <button 
                type="button" 
                id="fill-demo-code-btn" 
                class="bg-[#06C167] hover:bg-[#05a557] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
              >
                Kodu Doldur
              </button>
            </div>

            <form id="verify-code-form" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1 text-center">6 Haneli Doğrulama Kodunu Giriniz *</label>
                <input 
                  type="text" 
                  id="verify-code-input"
                  name="code" 
                  required 
                  maxlength="6" 
                  placeholder="000000" 
                  autocomplete="one-time-code"
                  class="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 rounded-2xl border-2 border-emerald-300 focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/20 outline-none transition"
                />
              </div>

              <button 
                type="submit" 
                class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Doğrula & Hesabı Aç 🎉</span>
              </button>

              <button 
                type="button" 
                id="back-to-register-btn" 
                class="w-full text-center text-xs text-gray-400 hover:text-gray-700 font-semibold cursor-pointer"
              >
                ← Farklı bilgilerle tekrar dene
              </button>
            </form>
          </div>
        ` : (mode === 'register' ? `
          <!-- KAYIT OL FORMU (TELEFON / SMS / E-POSTA) -->
          <div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 my-2 flex items-center gap-3">
              <span class="text-2xl">🎁</span>
              <div>
                <span class="text-xs font-black text-emerald-900 block">%20 Hoş Geldin İndirimi</span>
                <span class="text-[11px] text-emerald-700">Bilgilerinizi girerek ilk siparişinizde anında %20 indirim kazanın!</span>
              </div>
            </div>

            <form id="customer-register-form" class="space-y-3 pt-1">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Adınız Soyadınız *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="Örn: Ahmet Yılmaz" 
                  class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Telefon Numaranız (SMS Kodu İçin) *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  placeholder="05XX XXX XX XX" 
                  class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">E-posta Adresiniz (İsteğe bağlı)</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="ornek@gmail.com" 
                  class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Şifreniz *</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  placeholder="••••••••" 
                  class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
                />
              </div>

              <button 
                type="submit" 
                class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Doğrulama Kodu Al & Kaydol 📱</span>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </form>
          </div>
        ` : `
          <!-- GİRİŞ YAP FORMU -->
          <form id="customer-login-form" class="space-y-3.5 pt-1">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Telefon Numaranız veya E-posta *</label>
              <input 
                type="text" 
                name="identifier" 
                required 
                placeholder="05XX XXX XX XX veya E-posta" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Şifreniz (veya SMS ile Giriş) *</label>
              <input 
                type="password" 
                name="password" 
                placeholder="Şifreniz (varsa)" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
              />
            </div>

            <button 
              type="submit" 
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Giriş Yap</span>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <div class="text-center pt-2 border-t border-gray-100">
              <button 
                type="button" 
                id="switch-to-register-link" 
                class="text-xs text-gray-500 hover:text-[#06C167] font-semibold cursor-pointer"
              >
                Hesabınız yok mu? <strong class="text-[#06C167]">%20 İndirimle Kayıt Olun</strong>
              </button>
            </div>
          </form>
        `)}

      </div>
    </div>
  `;
}

// Müşteri Yorum & Puanlama Modalı
function renderReviewsModal(state) {
  const reviews = state.reviewsList || [];
  const filterPid = state.reviewsFilterProductId;
  const filteredReviews = filterPid 
    ? reviews.filter(r => !r.product_id || r.product_id === filterPid)
    : reviews;

  const avgScore = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const menu = orderService.getMenu();
  const selectedProdName = filterPid ? (menu.find(m => m.id === filterPid)?.name || '') : '';

  return `
    <div id="reviews-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold border border-amber-200">
              ⭐
            </div>
            <div>
              <h3 class="font-black text-lg text-gray-900">
                ${selectedProdName ? `${selectedProdName} Değerlendirmeleri` : 'Müşteri Yorumları & Puanlar'}
              </h3>
              <p class="text-xs text-gray-500">Gerçek müşterilerimizin lezzet deneyimleri</p>
            </div>
          </div>
          <button id="close-reviews-modal-btn" class="p-2 text-gray-400 hover:text-black rounded-xl transition cursor-pointer">✕</button>
        </div>

        <!-- Puan Özeti Banner -->
        <div class="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100 rounded-2xl p-4 my-4 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-3xl font-black text-[#06C167]">${avgScore}</span>
            <div>
              <div class="text-amber-400 text-sm">★★★★★</div>
              <span class="text-[11px] font-bold text-gray-600">${reviews.length} Gerçek Müşteri Yorumu</span>
            </div>
          </div>
          <button id="toggle-add-review-btn" class="bg-[#06C167] hover:bg-[#05a557] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs">
            ✍️ Yorum Yaz
          </button>
        </div>

        <!-- Yorum Ekleme Formu (Gizlenebilir / Açılabilir) -->
        <div id="new-review-form-container" class="${state.isWritingReview ? '' : 'hidden'} bg-gray-50 border border-gray-200/80 rounded-2xl p-4 mb-4 shrink-0 transition">
          <form id="new-review-form" class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-gray-900">Deneyiminizi Puanlayın</h4>
              <div class="flex gap-1" id="star-picker">
                ${[1, 2, 3, 4, 5].map(star => `
                  <button type="button" data-star-value="${star}" class="star-pick-btn text-xl cursor-pointer text-amber-400">★</button>
                `).join('')}
              </div>
              <input type="hidden" name="rating" id="review-rating-input" value="5"/>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input 
                type="text" 
                name="customer_name" 
                required 
                placeholder="Adınız Soyadınız *" 
                value="${state.currentUser ? state.currentUser.name : ''}"
                class="text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 outline-none focus:border-[#06C167]"
              />
              <select name="product_id" class="text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 outline-none focus:border-[#06C167]">
                <option value="">Genel Lezzet & Servis</option>
                ${menu.map(m => `
                  <option value="${m.id}" ${filterPid === m.id ? 'selected' : ''}>${m.name}</option>
                `).join('')}
              </select>
            </div>

            <textarea 
              name="comment" 
              required 
              rows="2" 
              placeholder="Yemeklerin lezzeti, sıcaklığı ve servis hakkındaki düşünceleriniz..."
              class="w-full text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 outline-none focus:border-[#06C167]"
            ></textarea>

            <div class="flex justify-end gap-2">
              <button type="button" id="cancel-review-btn" class="text-xs text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-200 cursor-pointer">Vazgeç</button>
              <button type="submit" class="bg-[#06C167] text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-[#05a557] cursor-pointer shadow-xs">Yayınla</button>
            </div>
          </form>
        </div>

        <!-- Filtre Sekmeleri -->
        ${filterPid ? `
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs shrink-0">
            <span class="text-gray-500">Ürün filtresi: <strong>${selectedProdName}</strong></span>
            <button id="clear-review-filter-btn" class="text-[#06C167] font-bold hover:underline cursor-pointer">Tüm Yorumları Göster</button>
          </div>
        ` : ''}

        <!-- Yorumlar Listesi -->
        <div class="overflow-y-auto space-y-3.5 pr-1 flex-1">
          ${filteredReviews.length === 0 ? `
            <div class="text-center py-10">
              <span class="text-4xl block mb-2">⭐</span>
              <p class="text-xs font-bold text-gray-700">Bu ürün için henüz yorum yapılmamış.</p>
              <p class="text-[11px] text-gray-400 mt-1">İlk değerlendirmeyi siz yazarak diğer müşterilerimize yardımcı olabilirsiniz!</p>
            </div>
          ` : filteredReviews.map(rev => {
            const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
            const stars = '★'.repeat(rev.rating) + '☆'.repeat(Math.max(0, 5 - rev.rating));
            const initial = (rev.customer_name || 'P')[0].toUpperCase();

            return `
              <div class="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#06C167] font-black text-xs flex items-center justify-center shadow-xs">
                      ${initial}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-extrabold text-xs text-gray-900">${rev.customer_name}</span>
                        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">✓ Doğrulanmış</span>
                      </div>
                      <span class="text-amber-400 text-xs font-bold tracking-wider">${stars}</span>
                    </div>
                  </div>
                  <span class="text-[10px] text-gray-400 whitespace-nowrap font-mono">${dateStr}</span>
                </div>

                ${rev.product_name ? `
                  <span class="inline-block text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md my-1">
                    🍲 ${rev.product_name}
                  </span>
                ` : ''}

                <p class="text-xs text-gray-700 leading-relaxed mt-1 whitespace-pre-line">${rev.comment}</p>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    </div>
  `;
}

// =================== ADRES DEFTERI MODALI ===================
function renderAddressesModal(currentUser) {
  const phone = currentUser ? currentUser.phone : '';
  const addresses = phone ? getSavedAddresses(phone) : [];

  return `
    <div id="addresses-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-[#E8F8EE] text-[#06C167] flex items-center justify-center text-base font-bold">📍</div>
            <div>
              <h3 class="font-black text-base text-gray-900">Adreslerim</h3>
              <p class="text-[11px] text-gray-400">Kayıtlı teslimat adresleriniz</p>
            </div>
          </div>
          <button id="close-addresses-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        ${addresses.length === 0 ? `
          <div class="text-center py-6 text-gray-400">
            <p class="text-3xl mb-2">📍</p>
            <p class="text-sm font-semibold">Henüz kayıtlı adresiniz yok</p>
            <p class="text-xs mt-1">Aşağıya yeni adres ekleyebilirsiniz</p>
          </div>
        ` : `
          <div class="space-y-2 mb-4">
            ${addresses.map(addr => `
              <div class="flex items-start gap-2 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <span class="text-[#06C167] mt-0.5 shrink-0">📍</span>
                <p class="text-xs text-gray-700 font-medium flex-1 leading-relaxed">${addr.text}</p>
                <button 
                  class="delete-addr-btn text-red-400 hover:text-red-600 text-sm cursor-pointer shrink-0 transition p-1"
                  data-addr-id="${addr.id}"
                  title="Sil"
                >✕</button>
              </div>
            `).join('')}
          </div>
        `}

        <div class="border-t border-gray-100 pt-4">
          <p class="text-xs font-bold text-gray-700 mb-2">Yeni Adres Ekle</p>
          <form id="add-address-form" class="space-y-2">
            <textarea 
              name="newAddress"
              id="new-address-input"
              rows="3"
              placeholder="Ör: Atatürk Mah. İnönü Cad. Güneş Apt. No:14 Kat:3 Daire:5"
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              required
            ></textarea>
            <button 
              type="submit"
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              + Adresi Kaydet
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
}

// =================== TELEFON DOĞRULAMA MODALI ===================
function renderPhoneVerifyModal(currentUser, state) {
  const isVerifyStep = state.phoneVerifyStep === 'verify';
  const existingPhone = currentUser ? (currentUser.phone || '') : '';

  return `
    <div id="phone-verify-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-base">📞</div>
            <div>
              <h3 class="font-black text-base text-gray-900">${isVerifyStep ? 'Kodu Girin' : 'Telefon Doğrulama'}</h3>
              <p class="text-[11px] text-gray-400">${isVerifyStep ? 'Telefonunuza gelen kodu giriniz' : 'Sipariş verebilmek için gerekli'}</p>
            </div>
          </div>
          <button id="close-phone-verify-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        ${state.phoneVerifyError ? `
          <div class="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-3 mb-3 text-xs font-bold">
            ⚠️ ${state.phoneVerifyError}
          </div>
        ` : ''}

        ${!isVerifyStep ? `
          <!-- Adım 1: Telefon numarası gir, kod al -->
          <div class="bg-orange-50 border border-orange-200 rounded-2xl p-3 mb-4 text-xs">
            <p class="font-bold text-orange-900">📱 Telefonunuza Firebase güvencesiyle 6 haneli SMS kodu gönderilecektir.</p>
            <p class="text-orange-700 mt-1">reCAPTCHA doğrulaması arka planda görünmez olarak otomatik gerçekleştirilir.</p>
          </div>
          <form id="phone-send-code-form" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Telefon Numaranız *</label>
              <input 
                type="tel" 
                name="phone"
                id="phone-verify-input"
                required
                value="${existingPhone}"
                placeholder="05XX XXX XX XX"
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              />
            </div>
            <button 
              type="submit"
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3 rounded-2xl text-xs transition cursor-pointer"
            >
              📱 Doğrulama Kodu Gönder
            </button>
          </form>
        ` : `
          <!-- Adım 2: Kodu gir, doğrula -->
          ${state.isFirebaseSms ? `
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs flex items-center gap-3 mb-4 animate-in fade-in">
              <span class="text-2xl shrink-0">📲</span>
              <div class="flex-1">
                <span class="block text-xs font-black text-emerald-900">SMS Gönderildi!</span>
                <span class="text-[11px] text-emerald-700 leading-snug">Google Firebase ile <strong>${state.pendingPhoneVerify || ''}</strong> numarasına iletilen 6 haneli kodu giriniz.</span>
              </div>
            </div>
          ` : `
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs flex items-center justify-between mb-4">
              <div>
                <span class="block text-[11px] text-emerald-700 font-bold">💡 Doğrulama Kodu:</span>
                <span class="font-mono text-base font-black tracking-widest text-[#06C167]">${state.phoneVerifyCodeHint || '123456'}</span>
              </div>
              <button 
                type="button"
                id="fill-phone-verify-code-btn"
                class="bg-[#06C167] hover:bg-[#05a557] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
              >
                Kodu Doldur
              </button>
            </div>
          `}
          <form id="phone-verify-code-form" class="space-y-3">
            <div>

              <label class="block text-xs font-bold text-gray-700 mb-1 text-center">6 Haneli Kodu Giriniz *</label>
              <input 
                type="text" 
                id="phone-otp-input" 
                name="code" 
                required 
                maxlength="6" 
                placeholder="000000" 
                autocomplete="one-time-code" 
                class="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 rounded-2xl border-2 border-emerald-300 focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/20 outline-none transition" 
              />
              <input type="hidden" id="phone-verify-hidden-phone" value="${state.pendingPhoneVerify || existingPhone}" />
            </div>

            <button 
              type="submit" 
              class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-extrabold py-3 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-[#06C167]/20" 
            >
              ✓ Telefonu Doğrula 🎉
            </button>

            <!-- 15 Saniyelik Kodu Tekrar Gönder Butonu -->
            <div class="flex items-center justify-between px-1 py-1 text-xs">
              <span class="text-gray-400 font-medium">Kod ulaşmadı mı?</span>
              <button 
                type="button" 
                id="resend-verify-code-btn" 
                disabled
                class="text-xs font-bold text-gray-400 cursor-not-allowed transition hover:underline"
              >
                <span id="resend-btn-text">Kodu Tekrar Gönder (<span id="resend-countdown">15</span>s)</span>
              </button>
            </div>


            <!-- SMS Gelmedi mi / Alternatif Test Kodu Desteği -->
            <div class="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] text-gray-600 mt-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-800">SMS gelmedi mi?</span>
                <button type="button" id="use-test-code-btn" class="text-[#06C167] hover:text-[#05a557] font-black underline cursor-pointer">
                  Test Kodunu Doldur (123456)
                </button>
              </div>
              <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">
                Operatör / SMS gecikmesi durumunda veya test aşamasında <strong>123456</strong> kodunu kullanarak doğrulayabilirsiniz.
              </p>
            </div>

            <button 
              type="button" 
              id="back-to-phone-send-btn" 
              class="w-full text-center text-xs text-gray-400 hover:text-gray-700 font-semibold cursor-pointer pt-1" 
            >
              ← Farklı numarayla tekrar dene
            </button>
          </form>

        `}

      </div>
    </div>
  `;
}

// Sipariş Değerlendirme Modalı (Geçmiş Siparişlerim ekranından açılır)
function renderOrderReviewModal(orderId, state) {
  const order = orderService.getOrder(orderId);
  if (!order) return '';

  return `
    <div id="order-review-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-xl">⭐</span>
            <div>
              <h3 class="font-black text-base text-gray-900">Siparişi Değerlendir</h3>
              <p class="text-[11px] text-gray-400 font-mono">Sipariş #${order.id}</p>
            </div>
          </div>
          <button id="close-order-review-modal-btn" class="p-1.5 text-gray-400 hover:text-black cursor-pointer">✕</button>
        </div>

        <form id="order-review-form" data-order-id="${order.id}" class="space-y-4 pt-4">
          <div class="text-center py-2 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <span class="text-xs font-bold text-gray-700 block mb-1">Puanınız</span>
            <div class="flex justify-center gap-2" id="order-star-picker">
              ${[1, 2, 3, 4, 5].map(star => `
                <button type="button" data-star-value="${star}" class="order-star-pick-btn text-2xl cursor-pointer text-amber-400">★</button>
              `).join('')}
            </div>
            <input type="hidden" name="rating" id="order-review-rating" value="5"/>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Hangi Ürünü Değerlendiriyorsunuz?</label>
            <select name="product_id" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none">
              <option value="">Tüm Sipariş (Genel Deneyim)</option>
              ${order.items.map(it => `
                <option value="${it.id}">${it.name}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Yorumunuz *</label>
            <textarea 
              name="comment" 
              rows="3" 
              required 
              placeholder="Yemeklerin lezzeti, sıcaklığı ve teslimat hakkındaki deneyiminiz..."
              class="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#06C167] outline-none"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer"
          >
            Değerlendirmeyi Gönder ⭐
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
function renderCartDrawer(cart, subtotal, discountAmount, cartTotal, firstOrderDiscountApplied, currentUser, isRestaurantOpen = true, closedMessage = '') {
  return `
    <div id="cart-drawer-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div class="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
        
        <div class="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 class="text-lg font-extrabold text-[#121212]">Sepetim <span class="text-[#06C167]">(${cart.length} ürün)</span></h3>
          <button id="close-cart-btn" class="p-2 text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="p-5 divide-y divide-gray-100">
          ${cart.length === 0 ? `
            <div class="text-center py-16">
              <div class="w-20 h-20 mx-auto rounded-3xl bg-gray-50 flex items-center justify-center text-4xl mb-4 text-gray-300">
                🛒
              </div>
              <h4 class="font-extrabold text-base text-gray-800">Sepetiniz Boş</h4>
              <p class="text-xs text-gray-400 mt-1">Lezzetli ürünlerimizden eklemeye başlayın</p>
            </div>
          ` : cart.map((item, index) => `
            <div class="py-4 flex items-center justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h5 class="font-bold text-sm text-[#121212] truncate">${item.name}</h5>
                ${item.option ? `<p class="text-xs text-gray-500 mt-0.5">${item.option.name}</p>` : ''}
                ${item.note ? `<p class="text-[11px] text-amber-600 italic mt-0.5 line-clamp-1">Not: ${item.note}</p>` : ''}
                <div class="text-xs font-black text-[#06C167] mt-1">₺${item.unitPrice * item.quantity}</div>
              </div>

              <!-- Miktar Arttır / Azalt Butonları -->
              <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                <button 
                  data-cart-minus="${index}" 
                  class="w-7 h-7 rounded-lg bg-white hover:bg-gray-200 text-[#121212] flex items-center justify-center font-bold text-sm shadow-2xs transition cursor-pointer"
                >-</button>
                <span class="w-6 text-center text-xs font-black">${item.quantity}</span>
                <button 
                  data-cart-plus="${index}" 
                  class="w-7 h-7 rounded-lg bg-[#06C167] hover:bg-[#05a557] text-white flex items-center justify-center font-bold text-sm shadow-2xs transition cursor-pointer"
                >+</button>
              </div>
            </div>
          `).join('')}
        </div>

        ${cart.length > 0 ? `
          <div class="p-5 bg-gray-50/80 border-t border-gray-100 space-y-3">
            
            <!-- İLK SİPARİŞ İNDİRİMİ VEYA ÖZEL KOD ROZETİ (Uygula / İptal Et) -->
            ${(() => {
              const hasCustom = currentUser && currentUser.custom_code && currentUser.custom_discount > 0;
              const couponCode = hasCustom ? currentUser.custom_code : 'PITA20';
              const couponDiscount = hasCustom ? currentUser.custom_discount : 20;
              const couponText = hasCustom 
                ? `Size Özel %${couponDiscount} İndirim (${couponCode})` 
                : `%20 İlk Sipariş İndirimi (${couponCode})`;

              return `
                <div class="border ${hasCustom ? 'bg-purple-50/80 border-purple-200' : 'bg-emerald-50/80 border-emerald-200'} rounded-2xl p-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">${hasCustom ? '⭐' : '🎁'}</span>
                    <div>
                      <span class="text-xs font-black block ${hasCustom ? 'text-purple-900' : 'text-emerald-900'}">
                        ${hasCustom ? 'Özel Müşteri Kuponunuz' : 'İlk Sipariş Fırsatı'}
                      </span>
                      <span class="text-[11px] ${hasCustom ? 'text-purple-700' : 'text-emerald-700'}">${couponText}</span>
                    </div>
                  </div>
                  <button 
                    id="toggle-cart-discount-btn" 
                    class="px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${!currentUser ? 'bg-gray-200 text-gray-600 border border-gray-300' : firstOrderDiscountApplied ? (hasCustom ? 'bg-purple-600 text-white shadow-xs' : 'bg-[#06C167] text-white shadow-xs') : (hasCustom ? 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50' : 'bg-white border border-emerald-300 text-[#06C167] hover:bg-emerald-50')}"
                  >
                    ${!currentUser ? 'Giriş Yap' : firstOrderDiscountApplied ? 'Uygulandı ✓' : 'Uygula'}
                  </button>
                </div>
              `;
            })()}

            <div class="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Ara Toplam</span>
              <span class="font-bold text-gray-700">₺${subtotal}</span>
            </div>

            ${discountAmount > 0 ? `
              <div class="flex items-center justify-between text-xs text-[#06C167] font-bold">
                <span>İndirim Tutarı</span>
                <span>-₺${discountAmount}</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Teslimat Ücreti</span>
              <span class="font-bold text-emerald-600">Ücretsiz</span>
            </div>

            <div class="flex items-center justify-between text-base font-black text-[#121212] pt-2 border-t border-gray-100">
              <span>Toplam Tutar</span>
              <div class="text-right">
                ${discountAmount > 0 ? `<span class="text-xs text-gray-400 line-through mr-1.5">₺${subtotal}</span>` : ''}
                <span class="text-xl text-[#06C167]">₺${cartTotal}</span>
              </div>
            </div>

            ${!isRestaurantOpen ? `
              <div class="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl p-3 text-center mt-3 shadow-xs">
                ⚠️ ${closedMessage || 'Restoranımız şu anda kapalıdır.'}
              </div>
              <button 
                id="proceed-checkout-btn" 
                disabled
                class="w-full bg-gray-300 text-gray-500 font-bold py-3.5 rounded-2xl text-sm transition flex items-center justify-center gap-2 mt-2 cursor-not-allowed opacity-75"
              >
                <span>Restoran Şu Anda Kapalı</span>
                <span>• ₺${cartTotal}</span>
              </button>
            ` : `
              <button 
                id="proceed-checkout-btn" 
                class="w-full bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                <span>Siparişi Onayla ve Gönder</span>
                <span>• ₺${cartTotal}</span>
              </button>
            `}
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// Sipariş Tamamlama / Checkout Modalı
function renderCheckoutModal(cart, subtotal, discountAmount, cartTotal, currentUser) {
  // Telefon doğrulandı mı? (HERKES İÇİN ZORUNLU)
  const isPhoneVerified = currentUser && Boolean(currentUser.phoneVerified);
  const phoneBlocked = !isPhoneVerified;

  // Kayıtlı adresler
  const userPhone = currentUser ? currentUser.phone : '';
  const savedAddresses = userPhone ? getSavedAddresses(userPhone) : [];

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

        ${phoneBlocked ? `
          <!-- Telefon doğrulama zorunlu engel bandı -->
          <div class="bg-orange-50 border-b border-orange-200 px-5 py-3.5 flex items-center gap-3">
            <span class="text-2xl">📱</span>
            <div class="flex-1">
              <p class="text-xs font-black text-orange-900">Sipariş için telefon doğrulaması zorunludur</p>
              <p class="text-[11px] text-orange-700 mt-0.5 leading-snug">Kurye teslimatı ve sipariş güvenliği için numaranızı onaylamanız gerekmektedir.</p>
            </div>
            <button id="checkout-verify-phone-btn" type="button" class="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap shadow-xs">
              Doğrula 📱
            </button>
          </div>
        ` : ''}

        <form id="checkout-form" class="p-6 space-y-4" ${phoneBlocked ? 'data-phone-blocked="true"' : ''}>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Adınız Soyadınız *</label>
              <input 
                type="text" 
                name="customerName" 
                id="checkout-customer-name"
                required 
                value="${currentUser ? (currentUser.name || '') : ''}"
                placeholder="Örn: Ahmet Yılmaz" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              />
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-gray-700">
                  Telefon Numaranız *
                  ${isPhoneVerified ? '<span class="text-[10px] text-emerald-600 font-bold ml-1">✓ Doğrulandı</span>' : '<span class="text-[10px] text-orange-600 font-bold ml-1">⚠️ Onay Bekliyor</span>'}
                </label>
                ${phoneBlocked ? `
                  <button type="button" id="checkout-inline-verify-btn" class="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer">
                    Doğrula 📱
                  </button>
                ` : ''}
              </div>
              <input 
                type="tel" 
                name="customerPhone" 
                id="checkout-customer-phone"
                required 
                value="${currentUser ? (currentUser.phone || '') : ''}"
                placeholder="05XX XXX XX XX" 
                ${isPhoneVerified ? 'readonly' : ''}
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border ${phoneBlocked ? 'border-orange-300 bg-orange-50/50 focus:border-orange-500' : 'border-gray-200 focus:border-[#06C167] bg-gray-50 text-gray-600'} outline-none transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Teslimat Adresi (Mahalle, Sokak, Bina No, Daire) *</label>
            ${savedAddresses.length > 0 ? `
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span class="text-[10px] text-gray-400 font-semibold flex items-center">📍 Kayıtlı:</span>
                ${savedAddresses.map(addr => `
                  <button 
                    type="button" 
                    class="saved-addr-pill text-[10px] bg-[#E8F8EE] text-[#06C167] border border-[#06C167]/30 px-2 py-1 rounded-full font-semibold hover:bg-[#06C167] hover:text-white transition cursor-pointer max-w-[180px] truncate"
                    data-addr="${addr.text.replace(/"/g, '&quot;')}"
                    title="${addr.text.replace(/"/g, '&quot;')}"
                  >${addr.text.length > 30 ? addr.text.slice(0, 30) + '…' : addr.text}</button>
                `).join('')}
              </div>
            ` : ''}
            <div class="relative">
              <textarea 
                name="deliveryAddress" 
                id="delivery-address-textarea"
                rows="3" 
                required
                placeholder="Örn: Atatürk Mah. İnönü Cad. Güneş Apt. No:14 Kat:3 Daire:5" 
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
              ></textarea>
              ${currentUser && userPhone ? `
                <button type="button" id="save-current-address-btn" class="absolute bottom-2 right-2 text-[10px] text-[#06C167] hover:text-[#05a557] font-bold cursor-pointer bg-white border border-[#06C167]/30 px-2 py-1 rounded-lg transition">
                  + Kaydet
                </button>
              ` : ''}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">📝 Mutfak & Kurye Sipariş Notunuz (İsteğe bağlı)</label>
            <input 
              type="text" 
              name="orderNote" 
              placeholder="Örn: Zili çalmayın lütfen, turşusu bol olsun, ekstra çatal..." 
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#06C167] focus:ring-1 focus:ring-[#06C167] outline-none"
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

            ${phoneBlocked ? `
              <button 
                type="button"
                id="checkout-verify-phone-btn2"
                class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📞 Telefonu Doğrula</span>
              </button>
            ` : `
              <button 
                type="submit" 
                class="flex-1 bg-[#06C167] hover:bg-[#05a557] text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-[#06C167]/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siparişi Tamamla</span>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            `}
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
                <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
                  <div class="flex items-center justify-between font-black mb-1">
                    <span class="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Sorun Bildiriminiz: ${order.issueReport.reason}</span>
                    </span>
                    <span class="text-[10px] text-gray-500 font-normal">${order.issueReport.reportedTime || ''}</span>
                  </div>
                  <p class="text-[11px] text-amber-800 italic bg-white/80 p-2.5 rounded-xl border border-amber-200/60 mt-1">"${order.issueReport.message || 'Mesajınız iletildi'}"</p>
                  
                  ${order.issueReport.adminReply ? `
                    <div class="bg-white border-2 border-emerald-400 rounded-xl p-3.5 mt-3 shadow-xs">
                      <div class="flex items-center justify-between font-black text-xs text-emerald-800 mb-1">
                        <span class="flex items-center gap-1.5">
                          <span class="text-base">🏪</span>
                          <span>Pita Mutfak Yetkilisi Yanıtı:</span>
                        </span>
                        <span class="text-[10px] text-gray-400 font-normal">${order.issueReport.adminReply.repliedTime || ''}</span>
                      </div>
                      <p class="text-xs text-gray-800 font-medium leading-relaxed mt-1">${order.issueReport.adminReply.message}</p>
                    </div>
                  ` : `
                    <div class="flex items-center gap-1.5 text-[10px] text-amber-700 font-bold mt-2">
                      <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Restoran yetkilisi incelemesinde...</span>
                    </div>
                  `}
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
                      <button 
                        data-open-order-review="${order.id}" 
                        class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                        title="Bu siparişi değerlendir"
                      >
                        <span>⭐</span>
                        <span>Değerlendir</span>
                      </button>

                      ${order.issueReport ? `
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                          <span>⚠️</span>
                          <span>${order.issueReport.status === 'resolved' ? 'Sorun Çözüldü' : 'Sorun Bildirildi'}</span>
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

                ${order.issueReport ? `
                  <div class="mt-2 pt-2.5 border-t border-amber-200/80 bg-amber-50/70 rounded-xl p-3 text-xs">
                    <div class="flex items-center justify-between text-amber-900 font-bold text-[11px] mb-1">
                      <span>⚠️ Bildirilen Sorun: ${order.issueReport.reason}</span>
                      <span class="text-[10px] font-medium text-gray-500">${order.issueReport.reportedTime || ''}</span>
                    </div>
                    <p class="text-[11px] text-gray-700 italic">"${order.issueReport.message}"</p>
                    
                    ${order.issueReport.adminReply ? `
                      <div class="bg-white border border-emerald-300 rounded-xl p-2.5 mt-2 shadow-2xs">
                        <div class="flex items-center justify-between font-black text-[11px] text-emerald-800 mb-0.5">
                          <span class="flex items-center gap-1">
                            <span>🏪</span>
                            <span>Restoran Yanıtı:</span>
                          </span>
                          <span class="text-[10px] text-gray-400 font-normal">${order.issueReport.adminReply.repliedTime || ''}</span>
                        </div>
                        <p class="text-xs text-gray-800 font-medium leading-relaxed">${order.issueReport.adminReply.message}</p>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

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
    openLoginBtn.addEventListener('click', () => onStateChange({ isLoginModalOpen: true, authError: '' }));
  }

  const closeLoginBtn = container.querySelector('#close-login-btn');
  if (closeLoginBtn) {
    closeLoginBtn.addEventListener('click', () => onStateChange({ isLoginModalOpen: false, authError: '', loginNotice: '' }));
  }

  // İndirimi Kap Butonları (Banner ve Hero)
  const claimDiscountBtn = container.querySelector('#claim-discount-btn');
  const topPromoClaimBtn = container.querySelector('#top-promo-claim-btn');
  const handleClaim = () => {
    if (!state.currentUser) {
      onStateChange({ isLoginModalOpen: true, authError: '' });
    } else {
      onStateChange({ firstOrderDiscountApplied: true, isCartOpen: true });
      alert("🎉 Tebrikler! İlk siparişinize özel %20 indirim sepetinize uygulandı!");
    }
  };
  if (claimDiscountBtn) claimDiscountBtn.addEventListener('click', handleClaim);
  if (topPromoClaimBtn) topPromoClaimBtn.addEventListener('click', handleClaim);

  // =================== KİMLİK DOĞRULAMA (AUTH) SEKMELERİ & İŞLEMLERİ ===================

  // Sekme Değiştirme Butonları
  const tabBtnLogin = container.querySelector('#tab-btn-login');
  if (tabBtnLogin) {
    tabBtnLogin.addEventListener('click', () => onStateChange({ authMode: 'login', authError: '', pendingVerificationData: null }));
  }

  const tabBtnRegister = container.querySelector('#tab-btn-register');
  if (tabBtnRegister) {
    tabBtnRegister.addEventListener('click', () => onStateChange({ authMode: 'register', authError: '', pendingVerificationData: null }));
  }

  const switchToRegisterLink = container.querySelector('#switch-to-register-link');
  if (switchToRegisterLink) {
    switchToRegisterLink.addEventListener('click', () => onStateChange({ authMode: 'register', authError: '', pendingVerificationData: null }));
  }

  // Yardımcı: Şık Yükleme Ekranı ile Sayfa Yenileme
  function performSmoothReload(message = 'Giriş yapıldı, yükleniyor...') {
    if (typeof window.showGlobalLoader === 'function') {
      window.showGlobalLoader(message);
    }
    setTimeout(() => {
      window.location.reload();
    }, 350);
  }

  // Google ile Hızlı Giriş Butonu
  const googleBtn = container.querySelector('#google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span>⏳</span><span>Google Girişi Yapılıyor...</span>`;
      const isPending = state.pendingCheckout || state.isCheckoutOpen;
      if (isPending) {
        try { sessionStorage.setItem('pita_pending_checkout', 'true'); } catch (e) {}
      }
      try {
        const res = await signInWithGoogle();
        if (res && res.ok && res.user) {
          // Popup ile anında giriş yaptı!
          const user = res.user;
          setCurrentUser(user);
          saveCustomerLocally(user);
          try { await syncCustomerToFirestore(user); } catch (e) {}
          orderService.pingPresence(user);

          const wasPending = isPending || sessionStorage.getItem('pita_pending_checkout') === 'true';
          sessionStorage.removeItem('pita_pending_checkout');

          onStateChange({
            currentUser: user,
            isLoginModalOpen: false,
            isCheckoutOpen: wasPending ? true : false,
            isCartOpen: false,
            pendingCheckout: false,
            authError: '',
            loginNotice: ''
          });
          return;
        } else if (res && res.error) {
          onStateChange({ authError: res.error });
          googleBtn.disabled = false;
          googleBtn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Google ile Hızlı Giriş Yap</span>`;
        }
      } catch (err) {
        console.warn("Google login error:", err);
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Google ile Hızlı Giriş Yap</span>`;
      }
    });
  }


  // 1. Kayıt Ol Formu (Telefon / SMS / E-posta ile Doğrulama Kodu İste)
  const registerForm = container.querySelector('#customer-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const name = formData.get('name').trim();
      const email = (formData.get('email') || '').trim().toLowerCase();
      const phone = formData.get('phone').trim();
      const password = formData.get('password').trim();

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Doğrulama Kodu Gönderiliyor...";
      }

      const identifier = phone || email;
      try {
        const res = await sendVerificationCode(identifier, name, phone);
        const codeHint = (res.ok && res.data && res.data.code) ? res.data.code : '123456';
        
        onStateChange({
          authMode: 'verify',
          authError: '',
          pendingVerificationData: { name, email, phone, password, identifier },
          verificationCodeHint: codeHint
        });
      } catch (err) {
        console.warn("Doğrulama kodu gönderme:", err);
        onStateChange({
          authMode: 'verify',
          authError: '',
          pendingVerificationData: { name, email, phone, password, identifier },
          verificationCodeHint: '123456'
        });
      }
    });
  }

  // Demo Kodu Doldur Butonu
  const fillDemoCodeBtn = container.querySelector('#fill-demo-code-btn');
  if (fillDemoCodeBtn) {
    fillDemoCodeBtn.addEventListener('click', () => {
      const codeInput = container.querySelector('#verify-code-input');
      if (codeInput) {
        codeInput.value = state.verificationCodeHint || '123456';
      }
    });
  }

  // Bilgileri Değiştir / Geri Dön Butonu
  const backToRegisterBtn = container.querySelector('#back-to-register-btn');
  if (backToRegisterBtn) {
    backToRegisterBtn.addEventListener('click', () => {
      onStateChange({ authMode: 'register', authError: '', pendingVerificationData: null });
    });
  }

  // 2. 6 Haneli Kodu Doğrulama Formu
  const verifyCodeForm = container.querySelector('#verify-code-form');
  if (verifyCodeForm) {
    verifyCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = container.querySelector('#verify-code-input');
      const inputCode = codeInput ? codeInput.value.trim() : '';

      if (!inputCode) {
        onStateChange({ authError: 'Lütfen 6 haneli doğrulama kodunu giriniz.' });
        return;
      }

      const pending = state.pendingVerificationData || {};
      const payload = {
        email: pending.email,
        phone: pending.phone,
        identifier: pending.identifier || pending.phone || pending.email,
        code: inputCode,
        name: pending.name,
        password: pending.password
      };

      const submitBtn = verifyCodeForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Doğrulanıyor...";
      }

      try {
        const res = await verifyAndRegister(payload);
        if (res.ok && res.data && (res.data.customer || res.data.user)) {
          const user = res.data.customer || res.data.user;
          setCurrentUser(user);
          saveCustomerLocally(user);
          try {
            await syncCustomerToFirestore(user);
          } catch (e) {}
          orderService.pingPresence(user);

          if (state.pendingCheckout) {
            onStateChange({
              currentUser: user,
              isLoginModalOpen: false,
              isCheckoutOpen: true,
              pendingCheckout: false,
              authError: '',
              loginNotice: ''
            });
            return;
          }

          performSmoothReload(`🎉 Hoş geldiniz, ${user.name}!`);
          return;
        } else {
          const errText = res.error || (res.data && res.data.error) || 'Doğrulama kodu hatalı! Lütfen kontrol ediniz.';
          onStateChange({ authError: errText });
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Doğrula & Giriş Yap";
          }
        }
      } catch (err) {
        console.warn("Doğrulama hatası:", err);
        onStateChange({ authError: 'Doğrulama sırasında bir hata oluştu.' });
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Doğrula & Giriş Yap";
        }
      }
    });
  }

  // 3. Giriş Yap Formu (Kayıtlı Olmayan Müşteriyi Kesinlikle Kabul Etme)
  const loginForm = container.querySelector('#customer-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const identifier = formData.get('identifier').trim();
      const password = (formData.get('password') || '').trim();

      // Admin Kullanıcı Adı / Şifresi Kontrolü: Doğruysa doğrudan Admin Paneline yönlendir!
      if (verifyAdminCredentials(identifier, password)) {
        setAdminLoggedIn(true);
        window.location.hash = '#/admin';
        performSmoothReload('Yönetici paneline geçiliyor...');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerText : 'Giriş Yap';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Kontrol Ediliyor...";
      }

      try {
        const res = await customerLogin(identifier, password);
        if (res.ok && res.data && (res.data.customer || res.data.user)) {
          const user = res.data.customer || res.data.user;
          setCurrentUser(user);
          saveCustomerLocally(user);
          orderService.pingPresence(user);

          if (state.pendingCheckout) {
            onStateChange({
              currentUser: user,
              isLoginModalOpen: false,
              isCheckoutOpen: true,
              pendingCheckout: false,
              authError: '',
              loginNotice: ''
            });
            return;
          }

          performSmoothReload(`👋 Hoş geldiniz, ${user.name}!`);
          return;
        } else {
          const errText = res.error || (res.data && res.data.error) || 'Bu telefon numarası veya e-posta ile kayıtlı müşteri bulunamadı. Lütfen "Kayıt Ol" sekmesinden hesap oluşturunuz.';
          onStateChange({ authError: errText });
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
          }
        }
      } catch (err) {
        onStateChange({ authError: 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.' });
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalText;
        }
      }
    });
  }

  // =================== MÜŞTERİ YORUM & PUANLAMA İŞLEMLERİ ===================

  // Yorumlar Modalını Açma (Header veya Menü Butonu)
  const openReviewsBtn = container.querySelector('#open-reviews-btn');
  if (openReviewsBtn) {
    openReviewsBtn.addEventListener('click', () => {
      onStateChange({ isReviewsModalOpen: true, reviewsFilterProductId: null });
    });
  }

  // Ürün Kartındaki Yorum Rozetine Tıklama (Ürün bazlı filtreli açma)
  container.querySelectorAll('[data-open-product-reviews]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-open-product-reviews');
      onStateChange({ isReviewsModalOpen: true, reviewsFilterProductId: pid });
    });
  });

  // Yorumlar Modalını Kapatma
  const closeReviewsBtn = container.querySelector('#close-reviews-modal-btn');
  if (closeReviewsBtn) {
    closeReviewsBtn.addEventListener('click', () => {
      onStateChange({ isReviewsModalOpen: false, reviewsFilterProductId: null, isWritingReview: false });
    });
  }

  const reviewsBackdrop = container.querySelector('#reviews-modal-backdrop');
  if (reviewsBackdrop) {
    reviewsBackdrop.addEventListener('click', (e) => {
      if (e.target === reviewsBackdrop) {
        onStateChange({ isReviewsModalOpen: false, reviewsFilterProductId: null, isWritingReview: false });
      }
    });
  }

  // Yorum Ekleme Formunu Açma / Kapama (Toggle)
  const toggleAddReviewBtn = container.querySelector('#toggle-add-review-btn');
  if (toggleAddReviewBtn) {
    toggleAddReviewBtn.addEventListener('click', () => {
      const box = container.querySelector('#new-review-form-container');
      if (box) box.classList.toggle('hidden');
    });
  }

  const cancelReviewBtn = container.querySelector('#cancel-review-btn');
  if (cancelReviewBtn) {
    cancelReviewBtn.addEventListener('click', () => {
      const box = container.querySelector('#new-review-form-container');
      if (box) box.classList.add('hidden');
    });
  }

  // Ürün Filtresini Temizleme
  const clearReviewFilterBtn = container.querySelector('#clear-review-filter-btn');
  if (clearReviewFilterBtn) {
    clearReviewFilterBtn.addEventListener('click', () => {
      onStateChange({ reviewsFilterProductId: null });
    });
  }

  // Yıldız Seçimi (Modal içindeki 1-5 Yıldız)
  container.querySelectorAll('.star-pick-btn').forEach(starBtn => {
    starBtn.addEventListener('click', () => {
      const val = parseInt(starBtn.getAttribute('data-star-value')) || 5;
      const ratingInput = container.querySelector('#review-rating-input');
      if (ratingInput) ratingInput.value = val;

      container.querySelectorAll('.star-pick-btn').forEach(btn => {
        const bVal = parseInt(btn.getAttribute('data-star-value')) || 5;
        if (bVal <= val) {
          btn.classList.add('text-amber-400');
          btn.classList.remove('text-gray-300');
        } else {
          btn.classList.remove('text-amber-400');
          btn.classList.add('text-gray-300');
        }
      });
    });
  });

  // Yeni Yorum Formu Gönderimi
  const newReviewForm = container.querySelector('#new-review-form');
  if (newReviewForm) {
    newReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(newReviewForm);
      const customer_name = formData.get('customer_name').trim();
      const product_id = formData.get('product_id');
      const rating = parseInt(formData.get('rating')) || 5;
      const comment = formData.get('comment').trim();

      const menuList = orderService.getMenu();
      const prodItem = menuList.find(m => m.id === product_id);
      const product_name = prodItem ? prodItem.name : 'Pita Mutfak Genel';

      const reviewData = {
        customer_name,
        customer_email: state.currentUser ? (state.currentUser.email || '') : '',
        product_id,
        product_name,
        rating,
        comment
      };

      await addReview(reviewData);
      const updatedList = await orderService.getReviews();

      onStateChange({
        reviewsList: updatedList,
        isWritingReview: false
      });

      alert("⭐ Yorumunuz ve değerlendirmeniz için çok teşekkür ederiz! Sitemizde yayınlandı.");
    });
  }

  // Geçmiş Siparişlerden "Değerlendir" Butonu
  container.querySelectorAll('[data-open-order-review]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-open-order-review');
      onStateChange({ reviewingOrderId: orderId, isMyOrdersOpen: false });
    });
  });

  // Sipariş Değerlendirme Modalı Kapatma
  const closeOrderReviewBtn = container.querySelector('#close-order-review-modal-btn');
  if (closeOrderReviewBtn) {
    closeOrderReviewBtn.addEventListener('click', () => {
      onStateChange({ reviewingOrderId: null });
    });
  }

  // Sipariş Değerlendirme Yıldız Seçimi
  container.querySelectorAll('.order-star-pick-btn').forEach(starBtn => {
    starBtn.addEventListener('click', () => {
      const val = parseInt(starBtn.getAttribute('data-star-value')) || 5;
      const ratingInput = container.querySelector('#order-review-rating');
      if (ratingInput) ratingInput.value = val;

      container.querySelectorAll('.order-star-pick-btn').forEach(btn => {
        const bVal = parseInt(btn.getAttribute('data-star-value')) || 5;
        if (bVal <= val) {
          btn.classList.add('text-amber-400');
          btn.classList.remove('text-gray-300');
        } else {
          btn.classList.remove('text-amber-400');
          btn.classList.add('text-gray-300');
        }
      });
    });
  });

  // Sipariş Değerlendirme Formu Gönderimi
  const orderReviewForm = container.querySelector('#order-review-form');
  if (orderReviewForm) {
    orderReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const orderId = orderReviewForm.getAttribute('data-order-id');
      const order = orderService.getOrder(orderId);
      const formData = new FormData(orderReviewForm);

      const rating = parseInt(formData.get('rating')) || 5;
      const product_id = formData.get('product_id') || '';
      const comment = formData.get('comment').trim();

      const menuList = orderService.getMenu();
      const prodItem = menuList.find(m => m.id === product_id);
      const product_name = prodItem ? prodItem.name : (order ? `Sipariş #${order.id}` : 'Pita Mutfak');

      const reviewData = {
        customer_name: state.currentUser ? state.currentUser.name : (order ? order.customerName : 'Pita Misafiri'),
        customer_email: state.currentUser ? (state.currentUser.email || '') : '',
        order_id: orderId,
        product_id,
        product_name,
        rating,
        comment
      };

      await addReview(reviewData);
      const updatedList = await orderService.getReviews();

      onStateChange({
        reviewingOrderId: null,
        reviewsList: updatedList
      });

      alert("⭐ Siparişiniz için değerlendirmeniz kaydedildi. Afiyet olsun!");
    });
  }

  // Çıkış Yap
  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setCurrentUser(null);
      orderService.removePresence();
      performSmoothReload('Çıkış yapılıyor...');
    });
  }

  // =================== PROFİL DROPDOWN BUTONLARI ===================

  // Adreslerim Modalı Aç
  const openAddressesBtn = container.querySelector('#open-addresses-btn');
  if (openAddressesBtn) {
    openAddressesBtn.addEventListener('click', () => {
      onStateChange({ isAddressesOpen: true });
    });
  }

  // Telefon Doğrulama Modalı Aç
  const openPhoneVerifyBtn = container.querySelector('#open-phone-verify-btn');
  if (openPhoneVerifyBtn) {
    openPhoneVerifyBtn.addEventListener('click', () => {
      onStateChange({ isPhoneVerifyOpen: true, phoneVerifyStep: 'send', phoneVerifyError: '' });
    });
  }

  // Checkout'tan Telefon Doğrula butonları (Üst banner, form içi buton ve alt buton)
  const triggerPhoneVerification = async () => {
    const phoneInput = container.querySelector('#checkout-customer-phone');
    const nameInput = container.querySelector('#checkout-customer-name');
    const typedPhone = (phoneInput?.value || '').trim();
    const typedName = (nameInput?.value || '').trim();

    const user = state.currentUser || getCurrentUser();
    const targetPhone = (user && user.phone) ? user.phone : typedPhone;
    const targetName = (user && user.name) ? user.name : (typedName || 'Pita Misafiri');

    // Eğer 10 haneli veya daha uzun telefon girilmişse doğrudan kodu üretip SMS ekranına geç
    if (targetPhone && targetPhone.replace(/\D/g, '').length >= 10) {
      try {
        const res = await sendVerificationCode(targetPhone, targetName, targetPhone);
        const codeHint = (res.ok && res.data && res.data.code) ? res.data.code : (res.firebase ? '' : '123456');
        onStateChange({
          isPhoneVerifyOpen: true,
          isCheckoutOpen: false,
          phoneVerifyStep: 'verify',
          pendingPhoneVerify: targetPhone,
          pendingPhoneName: targetName,
          isFirebaseSms: Boolean(res.firebase),
          phoneVerifyCodeHint: codeHint,
          phoneVerifyError: res.firebaseError ? `⚠️ ${res.firebaseError}` : ''
        });
        return;

      } catch (e) {}
    }


    // Telefon henüz girilmemişse veya kısa ise numara giriş ekranını aç
    onStateChange({
      isPhoneVerifyOpen: true,
      isCheckoutOpen: false,
      phoneVerifyStep: 'send',
      pendingPhoneVerify: targetPhone,
      pendingPhoneName: targetName,
      phoneVerifyError: ''
    });
  };

  const checkoutVerifyPhoneBtn = container.querySelector('#checkout-verify-phone-btn');
  if (checkoutVerifyPhoneBtn) {
    checkoutVerifyPhoneBtn.addEventListener('click', triggerPhoneVerification);
  }
  const checkoutVerifyPhoneBtn2 = container.querySelector('#checkout-verify-phone-btn2');
  if (checkoutVerifyPhoneBtn2) {
    checkoutVerifyPhoneBtn2.addEventListener('click', triggerPhoneVerification);
  }
  const checkoutInlineVerifyBtn = container.querySelector('#checkout-inline-verify-btn');
  if (checkoutInlineVerifyBtn) {
    checkoutInlineVerifyBtn.addEventListener('click', triggerPhoneVerification);
  }


  // =================== ADRES DEFTERI MODALI ===================

  // Modalı Kapat
  const closeAddressesBtn = container.querySelector('#close-addresses-btn');
  if (closeAddressesBtn) {
    closeAddressesBtn.addEventListener('click', () => onStateChange({ isAddressesOpen: false }));
  }
  const addressesBackdrop = container.querySelector('#addresses-modal-backdrop');
  if (addressesBackdrop) {
    addressesBackdrop.addEventListener('click', (e) => {
      if (e.target === addressesBackdrop) onStateChange({ isAddressesOpen: false });
    });
  }

  // Adres Sil
  container.querySelectorAll('.delete-addr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addrId = btn.getAttribute('data-addr-id');
      const user = state.currentUser || getCurrentUser();
      if (!user || !user.phone) return;
      deleteAddress(user.phone, addrId);
      // Modal'ı yenile
      onStateChange({ isAddressesOpen: true });
    });
  });

  // Adres Ekle Formu
  const addAddressForm = container.querySelector('#add-address-form');
  if (addAddressForm) {
    addAddressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = state.currentUser || getCurrentUser();
      if (!user || !user.phone) return;
      const newAddrInput = addAddressForm.querySelector('#new-address-input');
      const addrText = (newAddrInput?.value || '').trim();
      if (!addrText) return;
      saveAddress(user.phone, addrText);
      // Modal'ı yenile
      onStateChange({ isAddressesOpen: true });
    });
  }

  // Checkout'ta Adres Kaydet butonu (textarea içindeki + Kaydet)
  const saveCurrentAddressBtn = container.querySelector('#save-current-address-btn');
  if (saveCurrentAddressBtn) {
    saveCurrentAddressBtn.addEventListener('click', () => {
      const user = state.currentUser || getCurrentUser();
      if (!user || !user.phone) return;
      const textarea = container.querySelector('#delivery-address-textarea');
      const addrText = (textarea?.value || '').trim();
      if (!addrText) { alert('Önce bir adres yazınız.'); return; }
      saveAddress(user.phone, addrText);
      saveCurrentAddressBtn.textContent = '✓ Kaydedildi!';
      setTimeout(() => { saveCurrentAddressBtn.textContent = '+ Kaydet'; }, 2000);
    });
  }

  // Kayıtlı adres pill'lerine tıkla → textarea'yı doldur
  container.querySelectorAll('.saved-addr-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const addrText = pill.getAttribute('data-addr');
      const textarea = container.querySelector('#delivery-address-textarea');
      if (textarea) {
        textarea.value = addrText;
        textarea.focus();
      }
    });
  });

  // =================== TELEFON DOĞRULAMA MODALI ===================

  // Modalı Kapat
  const closePhoneVerifyBtn = container.querySelector('#close-phone-verify-btn');
  if (closePhoneVerifyBtn) {
    closePhoneVerifyBtn.addEventListener('click', () => {
      if (window._resendTimer) clearInterval(window._resendTimer);
      onStateChange({ isPhoneVerifyOpen: false, phoneVerifyStep: 'send', phoneVerifyError: '' });
    });
  }
  const phoneVerifyBackdrop = container.querySelector('#phone-verify-modal-backdrop');
  if (phoneVerifyBackdrop) {
    phoneVerifyBackdrop.addEventListener('click', (e) => {
      if (e.target === phoneVerifyBackdrop) {
        if (window._resendTimer) clearInterval(window._resendTimer);
        onStateChange({ isPhoneVerifyOpen: false, phoneVerifyStep: 'send', phoneVerifyError: '' });
      }
    });
  }


  // Adım 1: Telefon numarası gir, kod gönder
  const phoneSendCodeForm = container.querySelector('#phone-send-code-form');
  if (phoneSendCodeForm) {
    phoneSendCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneInput = phoneSendCodeForm.querySelector('#phone-verify-input');
      const phone = (phoneInput?.value || '').trim();
      if (!phone) { return; }

      // Mevcut kullanıcının telefon numarasını güncelle (henüz phone yoksa)
      const user = state.currentUser || getCurrentUser();

      const submitBtn = phoneSendCodeForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor...'; }

      try {
        const res = await sendVerificationCode(phone, user ? user.name : 'Müşteri', phone);
        if (!res.ok) {
          onStateChange({ phoneVerifyError: res.error || 'Kod gönderilemedi. Lütfen tekrar deneyin.' });
          return;
        }

        const codeHint = (res.ok && res.data && res.data.code) ? res.data.code : (res.firebase ? '' : '123456');

        // Kullanıcı objesinde telefon numarasını güncelle (henüz kayıtlı değilse)
        if (user && !user.phone) {
          const updated = { ...user, phone };
          setCurrentUser(updated);
          saveCustomerLocally(updated);
          state.currentUser = updated;
        }

        onStateChange({
          phoneVerifyStep: 'verify',
          pendingPhoneVerify: phone,
          isFirebaseSms: Boolean(res.firebase),
          phoneVerifyCodeHint: codeHint,
          phoneVerifyError: res.firebaseError ? `⚠️ ${res.firebaseError}` : ''
        });
      } catch (err) {
        onStateChange({ phoneVerifyError: 'Kod gönderilemedi. Lütfen tekrar deneyin.' });
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📱 Doğrulama Kodu Gönder'; }
      }

    });
  }

  // Kodu Doldur butonu
  const fillPhoneVerifyCodeBtn = container.querySelector('#fill-phone-verify-code-btn');
  if (fillPhoneVerifyCodeBtn) {
    fillPhoneVerifyCodeBtn.addEventListener('click', () => {
      const codeInput = container.querySelector('#phone-otp-input');
      if (codeInput) codeInput.value = state.phoneVerifyCodeHint || '123456';
    });
  }

  // Test Kodunu Doldur butonu (123456)
  const useTestCodeBtn = container.querySelector('#use-test-code-btn');
  if (useTestCodeBtn) {
    useTestCodeBtn.addEventListener('click', () => {
      const codeInput = container.querySelector('#phone-otp-input');
      if (codeInput) {
        codeInput.value = '123456';
        codeInput.focus();
      }
    });
  }

  // 15 Saniyelik Geri Sayım ve Kodu Tekrar Gönder Butonu
  const resendBtn = container.querySelector('#resend-verify-code-btn');
  const resendCountdownSpan = container.querySelector('#resend-countdown');
  const resendBtnText = container.querySelector('#resend-btn-text');

  if (resendBtn && resendCountdownSpan) {
    if (window._resendTimer) clearInterval(window._resendTimer);
    let secondsLeft = 15;

    window._resendTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        if (resendCountdownSpan) resendCountdownSpan.textContent = secondsLeft;
      } else {
        clearInterval(window._resendTimer);
        window._resendTimer = null;
        resendBtn.disabled = false;
        resendBtn.classList.remove('text-gray-400', 'cursor-not-allowed');
        resendBtn.classList.add('text-[#06C167]', 'cursor-pointer', 'font-black');
        if (resendBtnText) {
          resendBtnText.innerHTML = '🔄 Kodu Tekrar Gönder';
        }
      }
    }, 1000);

    resendBtn.addEventListener('click', async () => {
      if (resendBtn.disabled) return;
      resendBtn.disabled = true;
      resendBtn.classList.remove('text-[#06C167]', 'cursor-pointer');
      resendBtn.classList.add('text-gray-400', 'cursor-not-allowed');
      if (resendBtnText) resendBtnText.textContent = 'SMS Gönderiliyor...';

      const phoneHidden = container.querySelector('#phone-verify-hidden-phone');
      const phone = (phoneHidden?.value || state.pendingPhoneVerify || '').trim();
      const user = state.currentUser || getCurrentUser();

      resetRecaptchaVerifier();

      try {
        const res = await sendVerificationCode(phone, user ? user.name : 'Müşteri', phone);
        if (res.ok) {
          const codeHint = (res.data && res.data.code) ? res.data.code : (res.firebase ? '' : '123456');
          onStateChange({
            phoneVerifyStep: 'verify',
            pendingPhoneVerify: phone,
            isFirebaseSms: Boolean(res.firebase),
            phoneVerifyCodeHint: codeHint,
            phoneVerifyError: res.firebaseError ? `⚠️ ${res.firebaseError}` : ''
          });
        } else {
          onStateChange({ phoneVerifyError: res.error || 'Kod tekrar gönderilemedi.' });
        }
      } catch (err) {
        onStateChange({ phoneVerifyError: 'Bir hata oluştu. Lütfen tekrar deneyiniz.' });
      }
    });
  }

  // Geri buton (adım 2 → adım 1)
  const backToPhoneSendBtn = container.querySelector('#back-to-phone-send-btn');
  if (backToPhoneSendBtn) {
    backToPhoneSendBtn.addEventListener('click', () => {
      if (window._resendTimer) clearInterval(window._resendTimer);
      onStateChange({ phoneVerifyStep: 'send', phoneVerifyError: '' });
    });
  }


  // Adım 2: Kodu doğrula
  const phoneVerifyCodeForm = container.querySelector('#phone-verify-code-form');
  if (phoneVerifyCodeForm) {
    phoneVerifyCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = phoneVerifyCodeForm.querySelector('#phone-otp-input');
      const phoneHidden = phoneVerifyCodeForm.querySelector('#phone-verify-hidden-phone');
      const code = (codeInput?.value || '').trim();
      const phone = (phoneHidden?.value || state.pendingPhoneVerify || '').trim();

      const submitBtn = phoneVerifyCodeForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Doğrulanıyor...'; }

      try {
        const res = await verifyPhone(phone, code, state.pendingPhoneName || '');
        if (res.ok) {
          const updatedUser = res.data ? res.data.user : null;
          if (updatedUser) {
            state.currentUser = updatedUser;
          }
          const hasCart = state.cart && state.cart.length > 0;
          onStateChange({
            isPhoneVerifyOpen: false,
            phoneVerifyStep: 'send',
            phoneVerifyError: '',
            isCheckoutOpen: hasCart,
            currentUser: updatedUser || state.currentUser
          });
          alert('🎉 Telefon numaranız başarıyla doğrulandı! Siparişinizi tamamlayabilirsiniz.');
        } else {
          onStateChange({ phoneVerifyError: res.error || 'Doğrulama kodu hatalı.' });
        }

      } catch (err) {
        onStateChange({ phoneVerifyError: 'Doğrulama başarısız. Tekrar deneyin.' });
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✓ Telefonu Doğrula 🎉'; }
      }
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

  // Sorun Bildirme Modalını Açma (Giriş Yapılmasını Zorunlu Kıl)
  container.querySelectorAll('[data-open-issue-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.currentUser) {
        onStateChange({ 
          isLoginModalOpen: true, 
          loginNotice: 'Sorun bildirebilmek için lütfen önce giriş yapınız.' 
        });
        return;
      }
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
      const restSettings = state.restaurantSettings || orderService.getRestaurantSettings();
      const currentRestStatus = isRestaurantOpenNow(restSettings);
      if (!currentRestStatus.isOpen) {
        alert(`⚠️ ${currentRestStatus.message || 'Restoranımız şu anda kapalıdır. Sipariş verilememektedir.'}`);
        return;
      }
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

      const restSettings = state.restaurantSettings || orderService.getRestaurantSettings();
      const currentRestStatus = isRestaurantOpenNow(restSettings);
      if (!currentRestStatus.isOpen) {
        alert(`⚠️ ${currentRestStatus.message || 'Restoranımız şu anda kapalıdır. Sipariş verilememektedir.'}`);
        return;
      }

      const formData = new FormData(checkoutForm);
      const customerName = (formData.get('customerName') || '').trim();
      const customerPhone = (formData.get('customerPhone') || '').trim();
      const deliveryAddress = (formData.get('deliveryAddress') || '').trim();
      const orderNote = (formData.get('orderNote') || '').trim();
      const paymentMethod = formData.get('paymentMethod');

      if (!customerName || !customerPhone || !deliveryAddress) {
        alert("Lütfen Ad Soyad, Telefon Numarası ve Teslimat Adresi alanlarını eksiksiz doldurunuz.");
        return;
      }

      // Telefon doğrulanmış mı kontrolü (HERKES İÇİN ZORUNLU GÜVENLİK KAPISI)
      let activeUser = state.currentUser || getCurrentUser();
      if (!activeUser || !activeUser.phoneVerified) {
        alert("⚠️ Telefon numaranız doğrulanmadan sipariş verilemez. Lütfen numaranızı SMS ile doğrulayınız.");
        onStateChange({
          isCheckoutOpen: false,
          isPhoneVerifyOpen: true,
          phoneVerifyStep: 'send',
          pendingPhoneVerify: customerPhone || (activeUser ? activeUser.phone : ''),
          pendingPhoneName: customerName || (activeUser ? activeUser.name : '')
        });
        return;
      }

      // Kullanıcı bilgilerini güncelle
      activeUser = {
        ...activeUser,
        name: customerName,
        phone: customerPhone || activeUser.phone
      };

      setCurrentUser(activeUser);
      state.currentUser = activeUser;
      saveCustomerLocally(activeUser);
      orderService.pingPresence(activeUser);
      registerCustomer(customerName, customerPhone).catch(() => {});

      const currentSubtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const hasCustom = state.currentUser && state.currentUser.custom_code && state.currentUser.custom_discount > 0;
      const appliedRate = hasCustom ? state.currentUser.custom_discount : state.discountPercentage;
      const couponCode = hasCustom ? state.currentUser.custom_code : 'PITA20';

      const currentDiscount = (state.firstOrderDiscountApplied && currentSubtotal > 0)
        ? Math.round(currentSubtotal * (appliedRate / 100))
        : 0;
      const finalTotal = Math.max(0, currentSubtotal - currentDiscount);
      const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

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
