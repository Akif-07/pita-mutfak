// Pita Mutfak - Ana Uygulama Yöneticisi & Router
import { orderService, getCurrentUser, isFirstOrderDiscountAvailable, removePresence, getGoogleRedirectResult, initAuthListener, syncCustomerToFirestore, firebaseSignOut } from './services/orderService.js';


import { renderCustomerView } from './components/CustomerView.js?v=2.2';
import { renderAdminPanel } from './components/AdminPanel.js?v=2.2';
import { renderCourierPanel } from './components/CourierPanel.js?v=2.2';
import { renderPrivacyPolicy, renderTermsOfService } from './components/LegalPages.js?v=2.2';

const initialUser = getCurrentUser();
const initialOrders = orderService.getOrders();
const hasCustomInit = Boolean(initialUser && initialUser.custom_code && initialUser.custom_discount > 0);
const firstOrderEligibleInit = isFirstOrderDiscountAvailable(initialUser, initialOrders);

// Uygulama Global State'i
const state = {
  currentView: 'customer', // 'customer' | 'admin' | 'courier'
  currentUser: initialUser, // Oturum açmış müşteri bilgisi { name, phone }
  restaurantSettings: orderService.getRestaurantSettings(), // Restoran açık/kapalı & çalışma saatleri
  orders: initialOrders,
  isLoginModalOpen: false,
  isDiscountPromoOpen: false,
  firstOrderDiscountApplied: (hasCustomInit || firstOrderEligibleInit), // İlk sipariş indirimi veya özel kupon aktif mi?
  discountPercentage: 20, // %20 İlk sipariş indirimi
  activeCategory: 'all',
  cart: orderService.getStoredCart(),
  selectedProduct: null,
  isCartOpen: false,
  isCheckoutOpen: false,
  activeTrackingOrder: null,
  showTrackingModal: false,
  isMyOrdersOpen: false,
  reportingOrderId: null,
  adminFilter: 'all',
  adminActiveTab: 'orders',
  customerSearchQuery: '',
  customers: [],
  stockList: [],
  reviewsList: orderService.getStoredReviews ? orderService.getStoredReviews() : [],
  isReviewsModalOpen: false,
  reviewsFilterProductId: null,
  reviewingOrderId: null,
  authMode: 'login', // 'login' | 'register' | 'verify'
  pendingVerificationData: null,
  verificationCodeHint: '',
  activeAssignCodeCustomer: null,
  activeSendMessageCustomer: null,
  isCustomerInboxOpen: false,
  customerMessages: [],
  isAdminAddProductOpen: false,
  courierFilter: 'active',
  verificationResults: {},
  activeVisitors: [], // Giriş yapmış aktif kullanıcılar
  activeGuests: [],   // Misafir (giriş yapmamış) ziyaretçiler
  adminDateFilter: 'today', // 'today' (Varsayılan Günlük!) | 'yesterday' | 'custom' | 'all'
  adminCustomDate: '',
  expensesList: [],
  dailyClosings: [],
  isAddExpenseModalOpen: false,
  accountingPeriod: 'today',
  accountingCustomStart: '',
  accountingCustomEnd: '',
  isAddressesOpen: false,
  isPhoneVerifyOpen: false,
  isContactModalOpen: false,
  contactMessages: [],
  isProfileMenuOpen: false,
  activeFlashDeal: orderService.getActiveFlashDeal ? orderService.getActiveFlashDeal() : null,
  isFlashDealModalOpen: false,
  coupons: orderService.getStoredCoupons ? orderService.getStoredCoupons() : [],
  appliedCoupon: null,
  couponInputCode: '',
  couponError: '',
  couponFilter: 'all',
  couponSearchQuery: '',
  isAddCouponModalOpen: false
};



// Müşteri Özel Mesajlarını Yükleme Fonksiyonu
async function loadCustomerMessages() {
  if (state.currentUser && state.currentUser.phone) {
    try {
      const msgs = await orderService.getCustomerMessages(state.currentUser.phone);
      state.customerMessages = Array.isArray(msgs) ? msgs : [];

      // Müşterinin özel kodunu müşteri profiline senkronize et
      if (!state.currentUser.custom_code && state.currentUser.phone) {
        try {
          const custRecord = await orderService.getCustomer(state.currentUser.phone);
          if (custRecord) {
            state.currentUser.custom_code = custRecord.custom_code || '';
            state.currentUser.custom_discount = custRecord.custom_discount || 0;
          }
        } catch (e) {}
      }
      render();
    } catch (e) {
      console.warn("Müşteri mesajları yüklenirken hata:", e);
    }
  } else {
    state.customerMessages = [];
  }
}

// Backend Verilerini Yükleme Fonksiyonu (KVKK & Gizlilik Uyumlu)
async function loadBackendData() {
  try {
    // 1. Halka Açık Veriler: Stok ve Yorumlar (Tüm ziyaretçiler erişebilir)
    const [stock, reviews] = await Promise.all([
      orderService.getStock(),
      orderService.getReviews()
    ]);
    state.stockList = Array.isArray(stock) ? stock : [];
    state.reviewsList = Array.isArray(reviews) ? reviews : [];

    // Eğer stok veritabanı henüz boşsa menüdeki ürünlerle başlat
    if (state.stockList.length === 0) {
      await orderService.initStockFromMenu();
      state.stockList = await orderService.getStock();
    }

    // 2. KVKK & Gizlilik Kontrolü: Müşteriler, Giderler, Kasa Kapanışları ve İletişim Mesajları
    // SADECE ve SADECE Yönetici Girişi Yapılmışsa ve Yönetici Ekranındayken Yüklenir!
    // Normal ziyaretçiler ve müşteriler bu ticari/özel verileri ASLA indiremez.
    const isAdmin = state.currentView === 'admin' && (
      sessionStorage.getItem('pita_admin_auth') === 'true' || 
      localStorage.getItem('pita_admin_auth') === 'true'
    );

    if (isAdmin) {
      const [customers, expenses, closings, contactMsgs] = await Promise.all([
        orderService.getCustomers(),
        orderService.getExpenses(),
        orderService.getDailyClosings(),
        orderService.getContactMessages ? orderService.getContactMessages() : Promise.resolve([])
      ]);
      state.customers = Array.isArray(customers) ? customers : [];
      state.expensesList = Array.isArray(expenses) ? expenses : [];
      state.dailyClosings = Array.isArray(closings) ? closings : [];
      state.contactMessages = Array.isArray(contactMsgs) ? contactMsgs : [];
    } else {
      // Normal müşteri/ziyaretçi modunda hassas verileri boş tut
      state.customers = [];
      state.expensesList = [];
      state.dailyClosings = [];
      state.contactMessages = [];
    }

    // Kuponları yükle
    try {
      const allCoupons = await orderService.getCoupons();
      state.coupons = Array.isArray(allCoupons) ? allCoupons : [];
    } catch (e) {}

    // Müşteri oturum açmışsa mesajlarını ve özel kodunu da güncelle
    if (state.currentUser && state.currentUser.phone) {
      await loadCustomerMessages();
    }
    const hasCustom = state.currentUser && state.currentUser.custom_code && state.currentUser.custom_discount > 0;
    if (!hasCustom && !isFirstOrderDiscountAvailable(state.currentUser, state.orders)) {
      state.firstOrderDiscountApplied = false;
    }
    render();
  } catch (e) {
    console.warn("Backend veri yüklenirken hata:", e);
  }
}

// Google Redirect Sonucu Kontrol — Sayfa yüklenince Google'dan dönüldüyse giriş tamamla
async function checkGoogleRedirect() {
  try {
    const res = await getGoogleRedirectResult();
    if (res && res.ok && res.user) {
      const user = res.user;
      const { setCurrentUser, saveCustomerLocally } = await import('./services/orderService.js');
      const customerProfile = {
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        uid: user.uid,
        photoURL: user.photoURL || '',
        auth_provider: 'google',
        registered_at: new Date().toISOString()
      };
      setCurrentUser(customerProfile);
      saveCustomerLocally(customerProfile);
      try { await syncCustomerToFirestore(customerProfile); } catch (e) {}
      state.currentUser = customerProfile;

      const hasCustom = customerProfile.custom_code && customerProfile.custom_discount > 0;
      if (!hasCustom && !isFirstOrderDiscountAvailable(customerProfile, state.orders)) {
        state.firstOrderDiscountApplied = false;
      }

      // Eğer kullanıcı sipariş aşamasındayken Google ile giriş yaptıysa checkout ekranını geri aç
      const wasPending = sessionStorage.getItem('pita_pending_checkout') === 'true';
      if (wasPending) {
        sessionStorage.removeItem('pita_pending_checkout');
        state.isCheckoutOpen = true;
        state.isCartOpen = false;
        state.isLoginModalOpen = false;
        state.pendingCheckout = false;
      }

      startPresence();
      render();
    }
  } catch (e) {
    console.warn("Google redirect result kontrol hatası:", e);
  }
}

// Son verilen siparişi yerel hafızadan hatırla
try {
  const lastActiveOrderId = localStorage.getItem('pita_last_order_id');
  if (lastActiveOrderId) {
    const found = orderService.getOrder(lastActiveOrderId);
    if (found && found.status !== 'delivered' && found.status !== 'cancelled') {
      state.activeTrackingOrder = found;
    }
  }
} catch (e) {
  console.warn("Son sipariş okunamadı:", e);
}

// Router: URL Hash kontrolü (#, #/admin, #/kurye, #/privacy, #/terms)
function syncViewFromHash() {
  const hash = window.location.hash.toLowerCase();
  if (hash.startsWith('#/admin') || hash === '#admin') {
    state.currentView = 'admin';
    syncAdminSubscriptions();
    loadBackendData();
  } else if (hash.startsWith('#/kurye') || hash === '#kurye' || hash.startsWith('#/courier')) {
    state.currentView = 'courier';
    syncAdminSubscriptions();
  } else if (hash.startsWith('#/privacy')) {
    state.currentView = 'privacy';
    syncAdminSubscriptions();
  } else if (hash.startsWith('#/terms')) {
    state.currentView = 'terms';
    syncAdminSubscriptions();
  } else {
    state.currentView = 'customer';
    syncAdminSubscriptions();
  }
}

// State Güncelleme ve Yeniden Render Fonksiyonu
function handleStateChange(newState) {
  const prevUser = state.currentUser;
  Object.assign(state, newState);

  // Eğer yeni sipariş oluşturulduysa son sipariş ID'sini kaydet
  if (newState.activeTrackingOrder) {
    localStorage.setItem('pita_last_order_id', newState.activeTrackingOrder.id);
  }

  // Eğer sepet güncellendiyse yerel hafızaya kaydet
  if ('cart' in newState) {
    orderService.saveStoredCart(newState.cart);
  }

  // Yönetici abonelik durumunu kontrol et
  syncAdminSubscriptions();

  // Eğer sekme değiştirildiyse veya yönetici girişi yapıldıysa verileri tazele
  if (newState.adminActiveTab === 'customers' || newState.adminActiveTab === 'menu' || newState.adminActiveTab === 'contact' || state.currentView === 'admin') {
    loadBackendData();
  }

  // Kullanıcı giriş/çıkış değişikliği — presence'ı güncelle
  if ('currentUser' in newState) {
    if (newState.currentUser) {
      // Giriş yaptı — presence hemen başlat ve anında ping gönder
      startPresence();
      orderService.pingPresence(newState.currentUser);
    } else if (!newState.currentUser && prevUser) {
      // Çıkış yaptı — presence sil ve misafir olarak yeniden başlat
      if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
      }
      orderService.removePresence();
      setTimeout(() => startPresence(), 300);
    }
  }

  // İlk sipariş indirimi kontrolü: Eğer müşteri daha önce sipariş verdiyse ve özel kodu yoksa indirim uygulanamaz
  const activeUser = state.currentUser;
  const hasCustomActive = activeUser && activeUser.custom_code && activeUser.custom_discount > 0;
  if (!hasCustomActive && !isFirstOrderDiscountAvailable(activeUser, state.orders)) {
    state.firstOrderDiscountApplied = false;
  }

  render();
}

// Ana Render Motoru
function render() {
  const appContainer = document.getElementById('app-content');
  if (!appContainer) return;

  // Seçili Ekranı Render Et
  if (state.currentView === 'customer') {
    renderCustomerView(appContainer, state, handleStateChange);
  } else if (state.currentView === 'admin') {
    renderAdminPanel(appContainer, state, handleStateChange);
  } else if (state.currentView === 'courier') {
    renderCourierPanel(appContainer, state, handleStateChange);
  } else if (state.currentView === 'privacy') {
    renderPrivacyPolicy(appContainer);
    window.scrollTo(0, 0);
  } else if (state.currentView === 'terms') {
    renderTermsOfService(appContainer);
    window.scrollTo(0, 0);
  }
}

// Canlı Sipariş Senkronizasyonunu Başlat
orderService.subscribe((orders) => {
  state.orders = Array.isArray(orders) ? orders : [];
  const activeUser = state.currentUser;
  const hasCustomActive = activeUser && activeUser.custom_code && activeUser.custom_discount > 0;
  if (!hasCustomActive && !isFirstOrderDiscountAvailable(activeUser, state.orders)) {
    state.firstOrderDiscountApplied = false;
  }
  // Eğer aktif takip edilen sipariş varsa durumunu canlı güncelle
  if (state.activeTrackingOrder) {
    const updated = state.orders.find(o => o.id === state.activeTrackingOrder.id);
    if (updated) {
      state.activeTrackingOrder = updated;
      if (updated.status === 'delivered' || updated.status === 'cancelled') {
        localStorage.removeItem('pita_last_order_id');
      }
    }
  }
  render();
});

// Menü Güncelleme Senkronizasyonu
orderService.subscribeMenu(() => {
  render();
});

// Restoran Açık/Kapalı ve Çalışma Saatleri Canlı Senkronizasyonu
orderService.subscribeRestaurantSettings((settings) => {
  state.restaurantSettings = settings;
  render();
});

// Müşteri Yorumları Canlı Senkronizasyonu
orderService.subscribeReviews((reviews) => {
  state.reviewsList = Array.isArray(reviews) ? reviews : [];
  render();
});

// Yönetici Canlı Abonelikleri (Yalnızca Yönetici Girişi Yapıldığında ve Admin Ekranındayken Dinlenir)
let unsubExpenses = null;
let unsubDailyClosings = null;

function syncAdminSubscriptions() {
  const isAdmin = (
    sessionStorage.getItem('pita_admin_auth') === 'true' || 
    localStorage.getItem('pita_admin_auth') === 'true'
  );

  if (isAdmin && !unsubExpenses) {
    try {
      unsubExpenses = orderService.subscribeExpenses((expenses) => {
        state.expensesList = Array.isArray(expenses) ? expenses : [];
        if (state.currentView === 'admin') render();
      });
    } catch (e) {}
  } else if (!isAdmin && unsubExpenses) {
    if (typeof unsubExpenses === 'function') {
      try { unsubExpenses(); } catch (e) {}
    }
    unsubExpenses = null;
  }

  if (isAdmin && !unsubDailyClosings) {
    try {
      unsubDailyClosings = orderService.subscribeDailyClosings((closings) => {
        state.dailyClosings = Array.isArray(closings) ? closings : [];
        if (state.currentView === 'admin') render();
      });
    } catch (e) {}
  } else if (!isAdmin && unsubDailyClosings) {
    if (typeof unsubDailyClosings === 'function') {
      try { unsubDailyClosings(); } catch (e) {}
    }
    unsubDailyClosings = null;
  }
}

// Canlı Flaş İndirim Senkronizasyonu
if (typeof orderService.subscribeFlashDeal === 'function') {
  orderService.subscribeFlashDeal((deal) => {
    state.activeFlashDeal = deal;
    render();
  });
}

// 10 Haneli Tek Seferlik Kupon Senkronizasyonu
if (typeof orderService.subscribeCoupons === 'function') {
  orderService.subscribeCoupons((cloudCoupons) => {
    if (Array.isArray(cloudCoupons)) {
      state.coupons = cloudCoupons;
      if (state.appliedCoupon) {
        const found = cloudCoupons.find(c => c.code === state.appliedCoupon.code || c.id === state.appliedCoupon.id);
        if (!found || found.isUsed) {
          state.appliedCoupon = null;
          state.couponError = 'Uyguladığınız kupon kodu artık geçerli değildir.';
        }
      }
      render();
    }
  });
}



// Canlı Ziyaretçi & Aktif Kullanıcı Senkronizasyonu (giriş yapmış + misafir ayrı)
orderService.subscribePresence(({ loggedIn = [], guests = [] } = {}) => {
  const prevLoggedInCount = (state.activeVisitors || []).length;
  const prevGuestCount = (state.activeGuests || []).length;
  const prevNames = (state.activeVisitors || []).map(u => u.name).join(',');
  const newNames = loggedIn.map(u => u.name).join(',');

  state.activeVisitors = loggedIn;       // Giriş yapmış kullanıcılar
  state.activeGuests = guests;           // Misafir ziyaretçiler

  // In-place DOM güncelleme (full re-render beklemeden anlık ve pürüzsüz)
  try {
    document.querySelectorAll('[data-presence-loggedin]').forEach(el => {
      el.textContent = loggedIn.length;
    });
    document.querySelectorAll('[data-presence-guests]').forEach(el => {
      el.textContent = guests.length;
    });
    document.querySelectorAll('[data-presence-total]').forEach(el => {
      el.textContent = (loggedIn.length + guests.length);
    });
  } catch (e) {}

  // Değişiklik varsa ve admin panelindeyse form girişi yapılmıyorken render et
  const hasChanged = prevLoggedInCount !== loggedIn.length || prevGuestCount !== guests.length || prevNames !== newNames;
  if (hasChanged && state.currentView === 'admin') {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
    if (!isTyping) {
      render();
    }
  }
});

// Yardımcı: Personel/İç Panel Kontrolü (Admin & Kurye Masası ziyaretçi sayılmaz)
function isInternalPanel() {
  const hash = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';
  return hash.includes('admin') || hash.includes('kurye') || hash.includes('courier');
}

// Canlı Varlık Pingi — her müşteri/ziyaretçi için (admin & kurye personeli hariç), 4 saniyede bir anlık nabız
let presenceInterval = null;
function startPresence() {
  if (isInternalPanel()) {
    orderService.removePresence();
    return;
  }
  const u = state.currentUser || getCurrentUser() || null;
  orderService.pingPresence(u);
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(() => {
    if (isInternalPanel()) {
      orderService.removePresence();
      return;
    }
    const currentU = state.currentUser || getCurrentUser() || null;
    orderService.pingPresence(currentU);
  }, 4000);
}
startPresence();

// Sekme kapanınca veya sayfa tamamen terk edilince presence'ı temizle
window.addEventListener('beforeunload', () => {
  orderService.removePresence();
});
window.addEventListener('pagehide', () => {
  orderService.removePresence();
});

// Sekme görünürlüğü değiştiğinde:
// Arka plana geçildiğinde kullanıcıyı HEMEN SİLME (sekme değiştiren veya başka uygulamaya bakan müşteriyi hemen yok sayma!)
// Sekmeye geri dönüldüğünde ise presence pingini derhal tazele
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startPresence();
  }
});

// Hash Değişimi Dinleyici
window.addEventListener('hashchange', () => {
  syncViewFromHash();
  // Eğer admin veya kurye paneline geçildiyse presence'tan düş, müşteri menüsüne dönüldüyse ping başlat
  if (isInternalPanel()) {
    orderService.removePresence();
  } else {
    startPresence();
  }
  render();
});



// Başlangıç Yüklemesi
syncViewFromHash();
render();
loadBackendData();
loadCustomerMessages();
checkGoogleRedirect(); // Google redirect ile döndüyse giriş tamamla

// Firebase Persistent Auth Dinleyicisi (Tarayıcı yenilense dahi Google oturumunu hatırla)
initAuthListener((firebaseProfile) => {
  const isExplicitLoggedOut = sessionStorage.getItem('pita_explicit_logout') === 'true';
  if (!state.currentUser && !isExplicitLoggedOut) {
    state.currentUser = firebaseProfile;
    orderService.setCurrentUser(firebaseProfile);
    orderService.saveCustomerLocally(firebaseProfile);
    startPresence();
    render();
  }
});

// Çalışma saatleri dakika bazlı kontrolü (saat 23:00'e veya 10:00'a ulaşıldığında anında otomatik güncellenir)
setInterval(() => {
  if (state.currentView === 'customer' || state.currentView === 'admin') {
    render();
  }
}, 60000);

// Sayfa ilk yüklendiğinde yükleme ekranını yumuşakça kaldır
setTimeout(() => {
  if (typeof window.hideGlobalLoader === 'function') {
    window.hideGlobalLoader();
  }
}, 350);
