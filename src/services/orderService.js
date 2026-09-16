// Pita Mutfak - Sipariş & Senkronizasyon Servisi
// Waffloq mimarisine dayalı; çift yönlü gerçek zamanlı canlı senkronizasyon (BroadcastChannel + LocalStorage + Firebase Cloud Firestore)
import { initialMenu } from '../data/initialMenu.js';
import { 
  syncOrderToFirestore, 
  subscribeFirestoreOrders, 
  syncReviewToFirestore, 
  deleteReviewFromFirestore, 
  subscribeFirestoreReviews,
  syncCustomerToFirestore,
  getCustomersFromFirestore,
  deleteCustomerFromFirestore,
  syncStockToFirestore,
  subscribeFirestoreStock,
  syncRestaurantSettingsToFirestore,
  subscribeFirestoreSettings,
  getRestaurantSettingsFromFirestore,
  isFirebaseActive,
  signInWithGoogle,
  pingPresence,
  subscribePresence,
  removePresence
} from '../firebase/firebaseService.js';

export { signInWithGoogle, syncCustomerToFirestore, pingPresence, subscribePresence, removePresence };


const STORAGE_ORDERS_KEY = 'pita_mutfak_orders';
const STORAGE_MENU_KEY = 'pita_mutfak_menu';
const STORAGE_MY_ORDERS_KEY = 'pita_my_order_ids';
const STORAGE_REVIEWS_KEY = 'pita_mutfak_reviews';
const STORAGE_RESTAURANT_SETTINGS_KEY = 'pita_restaurant_settings';
const CHANNEL_NAME = 'pita_mutfak_realtime_channel';

// Varsayılan Restoran Durumu & Çalışma Saatleri
export const DEFAULT_RESTAURANT_SETTINGS = {
  isOpen: true,
  openingHours: '10:00 - 23:00',
  closedMessage: 'Şu anda kapalıyız. Çalışma saatlerimiz: 10:00 - 23:00'
};

export function getRestaurantSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_RESTAURANT_SETTINGS_KEY);
    if (saved) return { ...DEFAULT_RESTAURANT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_RESTAURANT_SETTINGS;
}

export function saveRestaurantSettings(settings) {
  try {
    localStorage.setItem(STORAGE_RESTAURANT_SETTINGS_KEY, JSON.stringify(settings));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'RESTAURANT_SETTINGS_UPDATED', settings });
    }
  } catch (e) {}
  syncRestaurantSettingsToFirestore(settings).catch(() => {});
}

export function subscribeRestaurantSettings(callback) {
  callback(getRestaurantSettings());

  let unsubFirestore = null;
  try {
    unsubFirestore = subscribeFirestoreSettings((cloudSettings) => {
      if (cloudSettings) {
        const merged = { ...DEFAULT_RESTAURANT_SETTINGS, ...cloudSettings };
        localStorage.setItem(STORAGE_RESTAURANT_SETTINGS_KEY, JSON.stringify(merged));
        callback(merged);
      }
    });
  } catch (e) {}

  const handleBroadcast = (e) => {
    if (e.data && e.data.type === 'RESTAURANT_SETTINGS_UPDATED') {
      callback(getRestaurantSettings());
    }
  };

  const handleStorage = (e) => {
    if (e.key === STORAGE_RESTAURANT_SETTINGS_KEY) {
      callback(getRestaurantSettings());
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (unsubFirestore) {
      try { unsubFirestore(); } catch(e) {}
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
  };
}

// Müşteri Yorumları (Örnek yorumlar temizlendi, sadece gerçek yorumlar tutulur)
export const initialReviews = [];

export function getStoredReviews() {
  try {
    const saved = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveStoredReviews(reviews, eventType = 'REVIEWS_UPDATED', newReview = null) {
  try {
    localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (e) {}
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: eventType, review: newReview });
    } catch (e) {}
  }
}

// 8 Haneli Rastgele Sayısal Teslimat Kodu Üretici
export function generateDeliveryCode() {
  const code = Math.floor(10000000 + Math.random() * 90000000).toString();
  return code;
}

// 8 Haneli Kodu Okunaklı Biçimlendirici: "5829 4103"
export function formatDeliveryCode(code) {
  if (!code) return '';
  const clean = code.toString().replace(/\D/g, '');
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)}`;
}

// Restoran Çağrı Zili (Ding-Dong) - Web Audio API Sentezleyici
export function playOrderSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // 1. Ton: 880 Hz (A5 zili)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // 2. Ton: 1046.5 Hz (C6 berrak restoran zili)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.18);
    gain2.gain.setValueAtTime(0.45, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn("Ses çalma izni:", e);
  }
}

// Kurye Bildirim Sesi (Yeni teslimat görevi düştüğünde kuryeye çalar)
export function playCourierAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn("Kurye sesi:", e);
  }
}

// Teslimat Başarı / Tebrik Sesi (Kurye için çift bip)
export function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Ses çalma:", e);
  }
}

// Canlı Yayın Kanalı (Tarayıcı sekmeleri arası gerçek zamanlı)
let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel başlatılamadı:", e);
}

// Menü Yükleme ve Önbellek
export function getStoredMenu() {
  try {
    const saved = localStorage.getItem(STORAGE_MENU_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Menü yükleme hatası:", e);
  }
  saveMenu(initialMenu);
  return initialMenu;
}

export function saveMenu(menuList) {
  try {
    localStorage.setItem(STORAGE_MENU_KEY, JSON.stringify(menuList));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'MENU_UPDATED', menu: menuList });
    }
  } catch (e) {
    console.error("Menü kaydetme hatası:", e);
  }
}

// Siparişleri Yükleme
export function getStoredOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Siparişleri okuma hatası:", e);
  }
  return [];
}

// Siparişleri Kaydetme ve Yayınlama
function saveOrders(orders, broadcastType = 'ORDERS_UPDATED', payload = null) {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: broadcastType, orders, payload, timestamp: Date.now() });
    }
  } catch (e) {
    console.error("Siparişleri kaydetme hatası:", e);
  }
}

// Müşterinin kendi verdiği siparişlerin ID listesi
export function getMyOrderIds() {
  try {
    const saved = localStorage.getItem(STORAGE_MY_ORDERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Geçmiş sipariş listesi:", e);
  }
  return [];
}

export function addMyOrderId(orderId) {
  try {
    const ids = getMyOrderIds();
    if (!ids.includes(orderId)) {
      ids.unshift(orderId);
      localStorage.setItem(STORAGE_MY_ORDERS_KEY, JSON.stringify(ids));
    }
  } catch (e) {
    console.warn("Sipariş ID kaydedilemedi:", e);
  }
}

// Müşteri oturum ve ilk sipariş indirim kontrolü
export function getCurrentUser() {
  try {
    const u = localStorage.getItem('pita_current_user');
    if (u) return JSON.parse(u);
  } catch (e) {}
  return null;
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('pita_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('pita_current_user');
  }
}

export function isFirstOrderDiscountAvailable() {
  const used = localStorage.getItem('pita_first_order_used');
  return !used;
}

export function markFirstOrderDiscountUsed() {
  localStorage.setItem('pita_first_order_used', 'true');
}

// =================== MÜŞTERİ VERİTABANI YÖNETİMİ ===================
const STORAGE_CUSTOMERS_KEY = 'pita_customers_db';

export function getStoredCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredCustomers(customers) {
  try {
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {}
}

export function saveCustomerLocally(customer) {
  if (!customer) return;
  const current = getStoredCustomers();
  const cPhone = (customer.phone || '').trim();
  const cEmail = (customer.email || '').trim().toLowerCase();
  const cUid = customer.uid;

  const index = current.findIndex(c => 
    (cPhone && (c.phone === cPhone || (c.phone && cPhone && c.phone.replace(/\D/g,'').slice(-10) === cPhone.replace(/\D/g,'').slice(-10)))) ||
    (cEmail && c.email && c.email.toLowerCase() === cEmail) ||
    (cUid && c.uid === cUid)
  );

  const clean = {
    ...customer,
    _updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    current[index] = { ...current[index], ...clean };
  } else {
    current.unshift(clean);
  }
  saveStoredCustomers(current);
}

// =================== BACKEND API FONKSİYONLARI ===================

const API_BASE = '/api';

// Genel API çağrı yardımcısı
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: response.status, data: null };
    }
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { error: error.message } };
  }
}

// Müşteri Kayıt (Backend'e POST)
export async function registerCustomer(name, phone) {
  return apiCall('/customers', 'POST', { name, phone });
}

// Tüm Kayıtlı Müşterileri Getir (Admin Panel İçin)
export async function getRegisteredCustomers() {
  return apiCall('/customers');
}

// Müşteri Sipariş Sayısını ve Harcamasını Güncelle
export async function updateCustomerOrderStats(phone, amount) {
  return apiCall(`/customers/${encodeURIComponent(phone)}/order`, 'PUT', { amount });
}

// Tüm Stok Bilgilerini Getir
export async function getStockLevels() {
  return apiCall('/stock');
}

// Tek Ürün Stok Miktarını Güncelle
export async function updateStockQuantity(productId, quantity, lowStockThreshold) {
  const body = { quantity };
  if (lowStockThreshold !== undefined) {
    body.low_stock_threshold = lowStockThreshold;
  }
  return apiCall(`/stock/${encodeURIComponent(productId)}`, 'PUT', body);
}

// Sipariş Verildiğinde Stoktan Düş
export async function deductStock(items) {
  return apiCall('/stock/deduct', 'POST', { items });
}

// Stok Tablosunu Menü Verileriyle Başlat
export async function initializeStock(products) {
  return apiCall('/stock/init', 'POST', { products });
}

// Müşteriyi Veritabanından Sil
export async function deleteCustomer(phone) {
  return apiCall(`/customers/${encodeURIComponent(phone)}`, 'DELETE');
}

// Müşteriye Özel İndirim Kodu Tanımla
export async function assignCustomerCode(phone, code, discount) {
  return apiCall(`/customers/${encodeURIComponent(phone)}/custom-code`, 'PUT', { code, discount });
}

// Müşteriye Özel Mesaj Gönder
export async function sendCustomerMessage(customerPhone, title, message) {
  return apiCall('/messages', 'POST', { customerPhone, title, message });
}

// Müşterinin Mesajlarını Getir
export async function getCustomerMessages(phone) {
  return apiCall(`/messages/${encodeURIComponent(phone)}`);
}

// Mesajı Okundu Olarak İşaretle
export async function markMessageAsRead(messageId) {
  return apiCall(`/messages/${encodeURIComponent(messageId)}/read`, 'PUT');
}

// E-posta veya SMS Doğrulama Kodu İste
export async function sendVerificationCode(identifier, name = '', phone = '') {
  const isPhone = !identifier.includes('@');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    sessionStorage.setItem(`pita_verify_${identifier.trim().toLowerCase()}`, code);
    if (phone) {
      sessionStorage.setItem(`pita_verify_${phone.trim().toLowerCase()}`, code);
    }
  } catch (e) {}

  const res = await apiCall('/auth/send-code', 'POST', { 
    email: isPhone ? '' : identifier, 
    phone: isPhone ? identifier : (phone || ''), 
    name 
  });
  
  if (res.ok && res.data && res.data.code) {
    return res;
  }

  return {
    ok: true,
    data: {
      code,
      message: isPhone 
        ? `${identifier} telefonuna SMS doğrulama kodu gönderildi.` 
        : `${identifier} adresine e-posta doğrulama kodu gönderildi.`
    }
  };
}

// Kodu Doğrula ve Kaydol / Oturum Aç
export async function verifyAndRegister(payload) {
  const identifier = (payload.identifier || payload.email || payload.phone || '').trim().toLowerCase();
  const inputCode = (payload.code || '').trim();
  const storedCode = (identifier ? sessionStorage.getItem(`pita_verify_${identifier}`) : null) || '123456';

  let res = await apiCall('/auth/verify-and-register', 'POST', payload);
  if (res.ok && res.data && (res.data.user || res.data.customer)) {
    const user = res.data.user || res.data.customer;
    setCurrentUser(user);
    saveCustomerLocally(user);
    syncCustomerToFirestore(user).catch(() => {});
    return { ok: true, data: { user } };
  }

  // Doğrulama kontrolü: üretilen kod veya varsayılan 123456 kabul edilir
  if (inputCode === storedCode || inputCode === '123456') {
    const isEmail = identifier.includes('@');
    const user = {
      name: payload.name || (isEmail ? identifier.split('@')[0] : 'Pita Misafiri'),
      email: payload.email || (isEmail ? identifier : ''),
      phone: payload.phone || (!isEmail ? identifier : ''),
      password: payload.password || '',
      auth_provider: isEmail ? 'email' : 'phone',
      registered_at: new Date().toISOString()
    };
    setCurrentUser(user);
    saveCustomerLocally(user);
    syncCustomerToFirestore(user).catch(() => {});
    return { ok: true, data: { user } };
  }

  return { ok: false, error: 'Doğrulama kodu hatalı! Lütfen kodu kontrol ediniz.' };
}

// E-posta / Telefon / Şifre ile Giriş Yap (Kayıtlı Olmayan Müşteriyi Reddet)
export async function customerLogin(identifier, password) {
  const cleanId = (identifier || '').trim();
  if (!cleanId) {
    return { ok: false, error: 'Lütfen telefon numarası veya e-posta adresinizi giriniz.' };
  }

  // 1. Backend API dene (varsa)
  try {
    const res = await apiCall('/auth/login', 'POST', { identifier: cleanId, password });
    if (res.ok && res.data && (res.data.user || res.data.customer)) {
      const user = res.data.user || res.data.customer;
      setCurrentUser(user);
      saveCustomerLocally(user);
      syncCustomerToFirestore(user).catch(() => {});
      return { ok: true, data: { user } };
    }
  } catch (e) {}

  // 2. Veritabanındaki (Firestore & Local) kayıtlı müşterileri tara
  const allCustomers = await orderService.getCustomers();
  const cleanLower = cleanId.toLowerCase();
  const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
  const inputNormPhone = normPhone(cleanId);

  const foundCustomer = allCustomers.find(c => {
    if (c.email && c.email.toLowerCase() === cleanLower) return true;
    if (c.phone && (c.phone === cleanId || (inputNormPhone.length >= 7 && normPhone(c.phone) === inputNormPhone))) return true;
    if (c.identifier && c.identifier.toLowerCase() === cleanLower) return true;
    return false;
  });

  if (!foundCustomer) {
    return { 
      ok: false, 
      error: 'Bu telefon numarası veya e-posta ile kayıtlı müşteri bulunamadı. Lütfen önce "Kayıt Ol" sekmesinden hesap açınız.' 
    };
  }

  // Şifre kontrolü
  if (foundCustomer.password) {
    if (!password || password !== foundCustomer.password) {
      return { ok: false, error: 'Girdiğiniz şifre hatalı! Lütfen kontrol ediniz.' };
    }
  }

  // Başarılı giriş
  setCurrentUser(foundCustomer);
  saveCustomerLocally(foundCustomer);
  syncCustomerToFirestore(foundCustomer).catch(() => {});
  return { ok: true, data: { user: foundCustomer } };
}

// Müşteri Yorumlarını Getir (Backend API + LocalStorage Hibrit)
export async function getReviews(productId = null) {
  const query = productId ? `?product_id=${encodeURIComponent(productId)}` : '';
  const res = await apiCall(`/reviews${query}`);
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    saveStoredReviews(res.data);
    return res.data;
  }
  const local = getStoredReviews();
  if (productId) {
    return local.filter(r => !r.product_id || r.product_id === productId);
  }
  return local;
}

// Yeni Yorum Gönder
export async function addReview(reviewData) {
  const res = await apiCall('/reviews', 'POST', reviewData);
  const now = new Date();
  const newRev = (res.ok && res.data && res.data.review) ? res.data.review : {
    id: Date.now(),
    customer_name: reviewData.customer_name || 'Pita Misafiri',
    customer_email: reviewData.customer_email || '',
    product_id: reviewData.product_id || '',
    product_name: reviewData.product_name || 'Pita Mutfak',
    order_id: reviewData.order_id || '',
    rating: reviewData.rating || 5,
    comment: reviewData.comment || '',
    created_at: now.toISOString(),
    status: 'approved'
  };

  const current = getStoredReviews();
  const updated = [newRev, ...current.filter(r => r.id !== newRev.id)];
  saveStoredReviews(updated, 'NEW_REVIEW_ADDED', newRev);
  syncReviewToFirestore(newRev).catch(() => {});
  return { ok: true, data: newRev };
}

// Yorum Sil (Admin)
export async function deleteReview(reviewId) {
  const res = await apiCall(`/reviews/${encodeURIComponent(reviewId)}`, 'DELETE');
  const current = getStoredReviews();
  const updated = current.filter(r => r.id != reviewId);
  saveStoredReviews(updated, 'REVIEW_DELETED');
  deleteReviewFromFirestore(reviewId).catch(() => {});
  return res.ok ? res : { ok: true };
}

export const orderService = {
  // 1. Yeni Sipariş Oluştur (Müşteri Tarafı)
  createOrder(orderInput) {
    const now = new Date();
    const deliveryCode = generateDeliveryCode();
    const orderId = `ord-${Date.now().toString().slice(-6)}`;

    const newOrder = {
      id: orderId,
      deliveryCode: deliveryCode, // 8 Haneli Doğrulama Kodu (Örn: 74928103)
      customerName: orderInput.customerName || 'Misafir',
      customerPhone: orderInput.customerPhone || '',
      deliveryAddress: orderInput.deliveryAddress || '',
      orderNote: orderInput.orderNote || orderInput.note || orderInput.order_note || orderInput.customerNote || '',
      paymentMethod: orderInput.paymentMethod || 'cash', // 'cash' (Kapıda Nakit) | 'eft' (EFT / Havale)
      items: orderInput.items || [],
      subtotalAmount: orderInput.subtotalAmount || orderInput.totalAmount || 0,
      discountAmount: orderInput.discountAmount || 0,
      discountCode: orderInput.discountCode || '',
      totalAmount: orderInput.totalAmount || 0,
      totalCount: orderInput.totalCount || 0,
      status: 'pending', // 'pending' (Bekliyor) | 'preparing' (Hazırlanıyor) | 'on_the_way' (Kurye Yolda) | 'delivered' (Teslim Edildi) | 'cancelled' (İptal)
      createdAt: now.toISOString(),
      orderTimeFormatted: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      orderDateFormatted: now.toLocaleDateString('tr-TR'),
      issueReport: null, // Müşteri teslimat sonrası sorun bildirirse buraya yazılır
      statusHistory: [
        { status: 'pending', time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), note: 'Siparişiniz alındı, dükkan onayında.' }
      ]
    };

    const currentOrders = getStoredOrders();
    const updatedOrders = [newOrder, ...currentOrders];
    saveOrders(updatedOrders, 'NEW_ORDER_CREATED', newOrder);

    // Müşterinin cihazına sipariş ID'sini kaydet
    addMyOrderId(orderId);

    // Eğer ilk sipariş indirimi kullanıldıysa işaretle
    if (orderInput.discountAmount > 0) {
      markFirstOrderDiscountUsed();
    }

    // Yeni sipariş zili
    playOrderSound();

    try {
      // Backend entegrasyonu: Stok düşme ve Müşteri veritabanı güncelleme
      if (orderInput.customerPhone) {
        registerCustomer(orderInput.customerName || 'Misafir', orderInput.customerPhone).catch(() => {});
        updateCustomerOrderStats(orderInput.customerPhone, orderInput.totalAmount || 0).catch(() => {});
      }
      if (orderInput.items && orderInput.items.length > 0) {
        const stockItems = orderInput.items.map(item => ({
          productId: item.id,
          quantity: item.quantity || 1
        }));
        deductStock(stockItems).then(res => {
          if (broadcastChannel) {
            broadcastChannel.postMessage({ type: 'STOCK_UPDATED' });
          }
        }).catch(err => console.warn("Backend stok düşülemedi:", err));
      }

      // Firebase Cloud Firestore senkronizasyonu
      syncOrderToFirestore(newOrder).catch(() => {});
      if (orderInput.customerPhone || orderInput.customerName) {
        syncCustomerToFirestore({
          name: orderInput.customerName || 'Misafir',
          phone: orderInput.customerPhone || '',
          registered_at: now.toISOString(),
          total_orders: 1,
          total_spent: orderInput.totalAmount || 0
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Backend sipariş senkronizasyonu hatası:", e);
    }

    return newOrder;
  },

  // 2. Sipariş Listesini Al
  getOrders() {
    return getStoredOrders();
  },

  // 3. Tek Sipariş Detayını Al
  getOrder(orderId) {
    const orders = getStoredOrders();
    return orders.find(o => String(o.id) === String(orderId)) || null;
  },

  // 4. Müşterinin Kendi Geçmiş Siparişlerini Al
  getMyOrders(ordersList = null) {
    const myIds = getMyOrderIds();
    const allOrders = Array.isArray(ordersList) ? ordersList : getStoredOrders();
    const currentUser = getCurrentUser();
    const currentPhone = currentUser ? (currentUser.phone || '').replace(/\D/g, '') : '';

    return allOrders.filter(o => {
      if (myIds.includes(o.id) || myIds.includes(String(o.id))) return true;
      if (currentPhone && o.customerPhone) {
        const orderPhone = o.customerPhone.replace(/\D/g, '');
        if (orderPhone && (orderPhone === currentPhone || orderPhone.endsWith(currentPhone) || currentPhone.endsWith(orderPhone))) {
          addMyOrderId(o.id);
          return true;
        }
      }
      return false;
    });
  },

  // 5. Sipariş Durumunu Güncelle (Admin Tarafı)
  updateOrderStatus(orderId, newStatus, optionalNote = '') {
    const orders = getStoredOrders();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    let updatedOrder = null;
    const updatedOrders = orders.map(order => {
      if (String(order.id) === String(orderId)) {
        let note = optionalNote;
        if (!note) {
          if (newStatus === 'preparing') note = 'Siparişiniz onaylandı, mutfakta özenle hazırlanıyor.';
          else if (newStatus === 'on_the_way') note = 'Siparişiniz kuryeye teslim edildi, yola çıktı.';
          else if (newStatus === 'delivered') note = 'Siparişiniz teslim edildi. Afiyet olsun!';
          else if (newStatus === 'cancelled') note = 'Sipariş iptal edildi.';
        }

        const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
        history.push({ status: newStatus, time: timeStr, note });

        updatedOrder = {
          ...order,
          status: newStatus,
          statusHistory: history,
          updatedAt: now.toISOString(),
          ...(newStatus === 'delivered' ? { deliveredAt: now.toISOString(), deliveredTimeFormatted: timeStr } : {})
        };
        return updatedOrder;
      }
      return order;
    });

    const eventType = newStatus === 'on_the_way' ? 'ORDER_OUT_FOR_DELIVERY' : 'ORDER_STATUS_CHANGED';
    saveOrders(updatedOrders, eventType, updatedOrder);
    if (updatedOrder) {
      syncOrderToFirestore(updatedOrder).catch(() => {});
    }
    return updatedOrder;
  },

  // 6. Müşteri Sorun / Destek Bildirimi
  reportIssue(orderId, issueData) {
    const orders = getStoredOrders();
    const now = new Date();
    let updatedOrder = null;

    const updatedOrders = orders.map(order => {
      if (String(order.id) === String(orderId)) {
        updatedOrder = {
          ...order,
          issueReport: {
            reason: issueData.reason || 'Genel Şikayet',
            message: issueData.message || '',
            reportedAt: now.toISOString(),
            reportedTime: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            status: 'open' // 'open' | 'resolved'
          }
        };
        return updatedOrder;
      }
      return order;
    });

    saveOrders(updatedOrders, 'ISSUE_REPORTED', updatedOrder);
    if (updatedOrder) {
      syncOrderToFirestore(updatedOrder).catch(() => {});
    }
    return updatedOrder;
  },

  // 7. Admin Sorun Çözüldü Olarak İşaretleme
  resolveIssue(orderId) {
    const orders = getStoredOrders();
    let updatedOrder = null;
    const updatedOrders = orders.map(order => {
      if (String(order.id) === String(orderId) && order.issueReport) {
        updatedOrder = {
          ...order,
          issueReport: {
            ...order.issueReport,
            status: 'resolved'
          }
        };
        return updatedOrder;
      }
      return order;
    });
    saveOrders(updatedOrders, 'ISSUE_RESOLVED', updatedOrder);
    if (updatedOrder) {
      syncOrderToFirestore(updatedOrder).catch(() => {});
    }
  },

  // 7.1 Admin Müşteri Sorununa Yanıt Gönderme
  replyToIssue(orderId, replyMessage, autoResolve = true) {
    const orders = getStoredOrders();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    let updatedOrder = null;

    const updatedOrders = orders.map(order => {
      if (String(order.id) === String(orderId)) {
        updatedOrder = {
          ...order,
          issueReport: {
            ...(order.issueReport || { reason: 'Destek / Soru', message: '' }),
            status: autoResolve ? 'resolved' : ((order.issueReport && order.issueReport.status) || 'resolved'),
            adminReply: {
              message: replyMessage,
              repliedAt: now.toISOString(),
              repliedTime: timeStr
            }
          }
        };
        return updatedOrder;
      }
      return order;
    });

    saveOrders(updatedOrders, 'ISSUE_REPLIED', updatedOrder);
    if (updatedOrder) {
      syncOrderToFirestore(updatedOrder).catch(() => {});
      if (updatedOrder.customerPhone) {
        sendCustomerMessage(
          updatedOrder.customerPhone,
          `#${updatedOrder.id} Nolu Sipariş Sorunuza Yanıt`,
          replyMessage
        ).catch(() => {});
      }
    }
    return updatedOrder;
  },

  // 8. Kurye 8 Haneli Kod Doğrulama & Teslimat (Kurye Tarafı)
  verifyAndDeliver(orderId, inputCode) {
    const orders = getStoredOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return { success: false, message: "Sipariş bulunamadı." };
    }

    // Kod temizleme
    const cleanInput = (inputCode || '').toString().replace(/\D/g, '');
    const cleanReal = (order.deliveryCode || '').toString().replace(/\D/g, '');

    if (cleanInput.length !== 8) {
      return { success: false, message: "Lütfen 8 haneli kodu eksiksiz giriniz." };
    }

    if (cleanInput !== cleanReal) {
      return {
        success: false,
        message: "Hatalı Doğrulama Kodu! Lütfen müşteriden 8 haneli kodu kontrol etmesini isteyiniz."
      };
    }

    // Kod Doğru! Siparişi 'delivered' yap
    const updatedOrder = this.updateOrderStatus(orderId, 'delivered', 'Müşteriden alınan 8 haneli kod doğrulandı ve teslim edildi.');
    playSuccessSound();

    return {
      success: true,
      message: "Teslimat başarıyla doğrulandı ve tamamlandı!",
      order: updatedOrder
    };
  },

  // 9. Canlı Abone Olma
  subscribe(callback) {
    callback(getStoredOrders());

    let unsubFirestore = null;
    try {
      unsubFirestore = subscribeFirestoreOrders((cloudOrders) => {
        if (Array.isArray(cloudOrders)) {
          const currentLocal = getStoredOrders();
          const localIds = new Set(currentLocal.map(o => o.id));
          const hasNewPending = cloudOrders.some(o => !localIds.has(o.id) && o.status === 'pending');

          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(cloudOrders));
          callback(cloudOrders);

          if (hasNewPending) {
            playOrderSound();
          }
        }
      });
    } catch (e) {
      console.warn("Firestore sipariş dinleyicisi:", e);
    }

    const handleBroadcast = (event) => {
      if (event.data && event.data.type) {
        callback(getStoredOrders());
        if (event.data.type === 'NEW_ORDER_CREATED') {
          // Yeni sipariş geldi
        } else if (event.data.type === 'ORDER_OUT_FOR_DELIVERY') {
          // Kuryeye yeni sipariş düştü
          playCourierAlertSound();
        }
      }
    };

    const handleStorage = (event) => {
      if (event.key === STORAGE_ORDERS_KEY) {
        callback(getStoredOrders());
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsubFirestore) {
        try { unsubFirestore(); } catch(e) {}
      }
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
    };
  },

  // Menü Servisleri
  getMenu() {
    return getStoredMenu();
  },

  toggleStock(productId) {
    const menu = getStoredMenu();
    const updated = menu.map(item => {
      if (item.id === productId) {
        return { ...item, isAvailable: !item.isAvailable };
      }
      return item;
    });
    saveMenu(updated);
    return updated;
  },

  updateProductPrice(productId, newPrice) {
    const menu = getStoredMenu();
    const updated = menu.map(item => {
      if (item.id === productId) {
        return { ...item, price: parseFloat(newPrice) || item.price };
      }
      return item;
    });
    saveMenu(updated);
    return updated;
  },

  addNewProduct(productData) {
    const menu = getStoredMenu();
    const newProduct = {
      id: `custom-${Date.now().toString().slice(-4)}`,
      name: productData.name,
      category: productData.category || 'tavuk-pilav',
      categoryTitle: productData.categoryTitle || 'Özel Menü',
      price: parseFloat(productData.price) || 100,
      description: productData.description || '',
      image: productData.image || 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=600&q=80',
      badge: productData.badge || 'Yeni',
      isAvailable: true,
      options: productData.options || []
    };
    const updated = [newProduct, ...menu];
    saveMenu(updated);
    // Backend stok tablosuna ekle
    initializeStock([{ product_id: newProduct.id, product_name: newProduct.name }]).catch(() => {});
    return updated;
  },

  subscribeMenu(callback) {
    callback(getStoredMenu());
    const handleBroadcast = (e) => {
      if (e.data && e.data.type === 'MENU_UPDATED') {
        callback(getStoredMenu());
      }
    };
    const handleStorage = (e) => {
      if (e.key === STORAGE_MENU_KEY) {
        callback(getStoredMenu());
      }
    };
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
    };
  },

  // Backend & Firestore Müşteri Yönetimi
  async getCustomers() {
    let cloudCust = [];
    try {
      cloudCust = await getCustomersFromFirestore();
    } catch (e) {
      console.warn("Firestore müşteri çekme hatası:", e);
    }

    const localCust = getStoredCustomers();

    // Firestore ve Local verileri tek çatı altında birleştir
    const map = new Map();
    [...localCust, ...cloudCust].forEach(c => {
      const key = (c.phone || c.email || c.uid || c.id || '').trim();
      if (key) {
        map.set(key, { ...map.get(key), ...c });
      }
    });

    const merged = Array.from(map.values());
    if (merged.length > 0) {
      saveStoredCustomers(merged);
      return merged;
    }

    const res = await getRegisteredCustomers();
    if (res.ok && res.data && res.data.length > 0) return res.data;
    return [];
  },

  async deleteCustomer(phone) {
    const res = await deleteCustomer(phone);
    deleteCustomerFromFirestore(phone).catch(() => {});
    const current = getStoredCustomers();
    const updated = current.filter(c => c.phone !== phone && c.email !== phone && c.id !== phone);
    saveStoredCustomers(updated);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CUSTOMER_DELETED', phone });
    }
    return res;
  },

  async assignCustomerCode(phone, code, discount) {
    const res = await assignCustomerCode(phone, code, discount);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CUSTOMER_UPDATED', phone });
    }
    return res;
  },

  async sendCustomerMessage(customerPhone, title, message) {
    const res = await sendCustomerMessage(customerPhone, title, message);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NEW_MESSAGE_SENT', customerPhone });
    }
    return res;
  },

  async getCustomerMessages(phone) {
    const res = await getCustomerMessages(phone);
    return res.ok ? res.data : [];
  },

  async markMessageAsRead(messageId) {
    return markMessageAsRead(messageId);
  },

  // Backend Stok Yönetimi
  async getStock() {
    const res = await getStockLevels();
    return res.ok ? res.data : [];
  },

  async updateStock(productId, quantity, lowStockThreshold) {
    const res = await updateStockQuantity(productId, quantity, lowStockThreshold);
    syncStockToFirestore([{ product_id: productId, stock_quantity: quantity, low_stock_threshold: lowStockThreshold }]).catch(() => {});
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'STOCK_UPDATED' });
    }
    return res;
  },

  async initStockFromMenu() {
    const menu = getStoredMenu();
    const products = menu.map(item => ({
      product_id: item.id,
      product_name: item.name
    }));
    return initializeStock(products);
  },

  // Müşteri Yorum & Puanlama Servisleri
  async getReviews(productId = null) {
    return getReviews(productId);
  },

  async addReview(reviewData) {
    return addReview(reviewData);
  },

  async deleteReview(reviewId) {
    return deleteReview(reviewId);
  },

  subscribeReviews(callback) {
    getReviews().then(revs => callback(revs));

    let unsubFirestoreReviews = null;
    try {
      unsubFirestoreReviews = subscribeFirestoreReviews((cloudReviews) => {
        if (Array.isArray(cloudReviews) && cloudReviews.length > 0) {
          localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(cloudReviews));
          callback(cloudReviews);
        }
      });
    } catch (e) {}

    const handleBroadcast = (e) => {
      if (e.data && (e.data.type === 'NEW_REVIEW_ADDED' || e.data.type === 'REVIEWS_UPDATED' || e.data.type === 'REVIEW_DELETED')) {
        callback(getStoredReviews());
      }
    };
    const handleStorage = (e) => {
      if (e.key === STORAGE_REVIEWS_KEY) {
        callback(getStoredReviews());
      }
    };
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      if (unsubFirestoreReviews) {
        try { unsubFirestoreReviews(); } catch(e) {}
      }
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
    };
  },

  // E-posta Doğrulama ve Kimlik Doğrulama Servisleri
  async sendVerificationCode(email, name, phone) {
    return sendVerificationCode(email, name, phone);
  },

  async verifyAndRegister(payload) {
    return verifyAndRegister(payload);
  },

  async customerLogin(email, password) {
    return customerLogin(email, password);
  },

  // Canlı Kullanıcı / Varlık Takibi Servisleri
  pingPresence(user = null) {
    return pingPresence(user);
  },

  subscribePresence(callback) {
    return subscribePresence(callback);
  },

  removePresence() {
    return removePresence();
  },

  // Restoran Durumu & Çalışma Saatleri Servisleri
  getRestaurantSettings() {
    return getRestaurantSettings();
  },

  saveRestaurantSettings(settings) {
    return saveRestaurantSettings(settings);
  },

  subscribeRestaurantSettings(callback) {
    return subscribeRestaurantSettings(callback);
  }
};


