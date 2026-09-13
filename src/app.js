// Pita Mutfak - Ana Uygulama Yöneticisi & Router
import { orderService, getCurrentUser, isFirstOrderDiscountAvailable } from './services/orderService.js';
import { renderCustomerView } from './components/CustomerView.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderCourierPanel } from './components/CourierPanel.js';

// Uygulama Global State'i
const state = {
  currentView: 'customer', // 'customer' | 'admin' | 'courier'
  currentUser: getCurrentUser(), // Oturum açmış müşteri bilgisi { name, phone }
  isLoginModalOpen: false,
  isDiscountPromoOpen: false,
  firstOrderDiscountApplied: isFirstOrderDiscountAvailable(), // İlk sipariş indirimi aktif mi?
  discountPercentage: 20, // %20 İlk sipariş indirimi
  activeCategory: 'all',
  cart: [],
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
  activeAssignCodeCustomer: null,
  activeSendMessageCustomer: null,
  isCustomerInboxOpen: false,
  customerMessages: [],
  isAdminAddProductOpen: false,
  courierFilter: 'active',
  verificationResults: {}
};

// Müşteri Özel Mesajlarını Yükleme Fonksiyonu
async function loadCustomerMessages() {
  if (state.currentUser && state.currentUser.phone) {
    try {
      const msgs = await orderService.getCustomerMessages(state.currentUser.phone);
      state.customerMessages = Array.isArray(msgs) ? msgs : [];

      // Müşterinin özel kodunu müşteri profiline senkronize et
      const custRecord = state.customers.find(c => c.phone === state.currentUser.phone);
      if (custRecord) {
        state.currentUser.custom_code = custRecord.custom_code || '';
        state.currentUser.custom_discount = custRecord.custom_discount || 0;
      }
      render();
    } catch (e) {
      console.warn("Müşteri mesajları yüklenirken hata:", e);
    }
  } else {
    state.customerMessages = [];
  }
}

// Backend Verilerini Yükleme Fonksiyonu
async function loadBackendData() {
  try {
    const [customers, stock] = await Promise.all([
      orderService.getCustomers(),
      orderService.getStock()
    ]);
    state.customers = Array.isArray(customers) ? customers : [];
    state.stockList = Array.isArray(stock) ? stock : [];

    // Eğer stok veritabanı henüz boşsa menüdeki ürünlerle başlat
    if (state.stockList.length === 0) {
      await orderService.initStockFromMenu();
      state.stockList = await orderService.getStock();
    }

    // Müşteri oturum açmışsa mesajlarını ve özel kodunu da güncelle
    if (state.currentUser && state.currentUser.phone) {
      await loadCustomerMessages();
    } else {
      render();
    }
  } catch (e) {
    console.warn("Backend veri yüklenirken hata:", e);
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

// Router: URL Hash kontrolü (#, #/admin, #/kurye)
function syncViewFromHash() {
  const hash = window.location.hash.toLowerCase();
  if (hash.startsWith('#/admin') || hash === '#admin') {
    state.currentView = 'admin';
    loadBackendData();
  } else if (hash.startsWith('#/kurye') || hash === '#kurye' || hash.startsWith('#/courier')) {
    state.currentView = 'courier';
  } else {
    state.currentView = 'customer';
  }
}

// State Güncelleme ve Yeniden Render Fonksiyonu
function handleStateChange(newState) {
  Object.assign(state, newState);

  // Eğer yeni sipariş oluşturulduysa son sipariş ID'sini kaydet
  if (newState.activeTrackingOrder) {
    localStorage.setItem('pita_last_order_id', newState.activeTrackingOrder.id);
  }

  // Eğer sekme değiştirildiyse verileri tazele
  if (newState.adminActiveTab === 'customers' || newState.adminActiveTab === 'menu') {
    loadBackendData();
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
  }
}

// Canlı Sipariş Senkronizasyonunu Başlat
orderService.subscribe((orders) => {
  // Eğer aktif takip edilen sipariş varsa durumunu canlı güncelle
  if (state.activeTrackingOrder) {
    const updated = orders.find(o => o.id === state.activeTrackingOrder.id);
    if (updated) {
      state.activeTrackingOrder = updated;
    }
  }
  render();
});

// Menü Güncelleme Senkronizasyonu
orderService.subscribeMenu(() => {
  render();
});

// Canlı Müşteri ve Mesaj Senkronizasyonu
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel('pita_mutfak_realtime_channel');
    channel.addEventListener('message', (e) => {
      if (e.data && (e.data.type === 'CUSTOMER_UPDATED' || e.data.type === 'CUSTOMER_DELETED' || e.data.type === 'NEW_MESSAGE_SENT' || e.data.type === 'STOCK_UPDATED')) {
        loadBackendData();
        loadCustomerMessages();
      }
    });
  }
} catch (e) {}

// Hash Değişimi Dinleyici
window.addEventListener('hashchange', () => {
  syncViewFromHash();
  render();
});

// Başlangıç Yüklemesi
syncViewFromHash();
loadBackendData();
loadCustomerMessages();
render();
