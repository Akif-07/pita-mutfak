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
  getGoogleRedirectResult,
  initAuthListener,
  pingPresence,
  subscribePresence,
  removePresence,
  syncExpenseToFirestore,
  deleteExpenseFromFirestore,
  subscribeFirestoreExpenses,
  getExpensesFromFirestore,
  syncDailyClosingToFirestore,
  subscribeFirestoreDailyClosings,
  getDailyClosingsFromFirestore,
  sendFirebasePhoneVerification,
  confirmFirebasePhoneCode,
  formatPhoneNumberForFirebase,
  resetRecaptchaVerifier,
  sendContactMessageToFirestore,
  getContactMessagesFromFirestore,
  updateContactMessageStatus,
  deleteContactMessageFromFirestore,
  replyContactMessageInFirestore,
  broadcastFlashDealToFirestore,
  stopFlashDealInFirestore,
  subscribeFirestoreFlashDeal,
  firebaseSignOut
} from '../firebase/firebaseService.js';

export { 
  signInWithGoogle, 
  getGoogleRedirectResult, 
  initAuthListener, 
  syncCustomerToFirestore, 
  pingPresence, 
  subscribePresence, 
  removePresence, 
  sendFirebasePhoneVerification,
  confirmFirebasePhoneCode,
  formatPhoneNumberForFirebase,
  resetRecaptchaVerifier,
  sendContactMessageToFirestore,
  getContactMessagesFromFirestore,
  updateContactMessageStatus,
  deleteContactMessageFromFirestore,
  replyContactMessageInFirestore,
  broadcastFlashDealToFirestore,
  stopFlashDealInFirestore,
  subscribeFirestoreFlashDeal,
  firebaseSignOut
};





const STORAGE_ORDERS_KEY = 'pita_mutfak_orders';
const STORAGE_MENU_KEY = 'pita_mutfak_menu';
const STORAGE_MY_ORDERS_KEY = 'pita_my_order_ids';
const STORAGE_REVIEWS_KEY = 'pita_mutfak_reviews';
const STORAGE_RESTAURANT_SETTINGS_KEY = 'pita_restaurant_settings';
const STORAGE_EXPENSES_KEY = 'pita_mutfak_expenses';
const STORAGE_DAILY_CLOSINGS_KEY = 'pita_mutfak_daily_closings';
const CHANNEL_NAME = 'pita_mutfak_realtime_channel';


// Varsayılan Restoran Durumu & Çalışma Saatleri
export const DEFAULT_RESTAURANT_SETTINGS = {
  isOpen: true,
  openingHours: '10:00 - 23:00',
  closedMessage: 'Şu anda kapalıyız. Çalışma saatlerimiz: 10:00 - 23:00',
  forceOpen: false
};

// Türkiye Saati Getirme (UTC+3)
export function getTurkeyTime() {
  try {
    const now = new Date();
    const trStr = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    const [h, m] = trStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      return { hours: h, minutes: m, totalMinutes: h * 60 + m };
    }
  } catch (e) {}
  const now = new Date();
  return { hours: now.getHours(), minutes: now.getMinutes(), totalMinutes: now.getHours() * 60 + now.getMinutes() };
}

// Çalışma Saatlerini Ayrıştırma (Örn: "10:00 - 23:00")
export function parseOpeningHours(hoursStr = '10:00 - 23:00') {
  if (!hoursStr || typeof hoursStr !== 'string') {
    return { startMinutes: 10 * 60, endMinutes: 23 * 60, startStr: '10:00', endStr: '23:00' };
  }
  const parts = hoursStr.split('-').map(s => s.trim());
  if (parts.length !== 2) {
    return { startMinutes: 10 * 60, endMinutes: 23 * 60, startStr: '10:00', endStr: '23:00' };
  }
  const [sH, sM] = parts[0].split(':').map(Number);
  const [eH, eM] = parts[1].split(':').map(Number);
  const startMinutes = (isNaN(sH) ? 10 : sH) * 60 + (isNaN(sM) ? 0 : sM);
  let endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 0 : eM);
  if (endMinutes === 0 && eH === 0) {
    endMinutes = 24 * 60;
  }
  return {
    startMinutes,
    endMinutes,
    startStr: parts[0] || '10:00',
    endStr: parts[1] || '23:00'
  };
}

// Restoran Şu Anda Açık mı? (Admin Açık/Kapalı + Saat Kontrolü)
export function isRestaurantOpenNow(settings) {
  const current = settings || getRestaurantSettings();
  const hoursStr = current.openingHours || '10:00 - 23:00';

  // 1. Manuel olarak kapatıldıysa (Admin paneli üzerinden 'Restoran Kapalı' yapıldıysa)
  if (current.isOpen === false) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      openingHours: hoursStr,
      message: current.closedMessage || 'Restoranımız şu anda sipariş alımına kapalıdır.'
    };
  }

  // 2. Yönetici zorla açık tutmuşsa
  if (current.forceOpen === true) {
    return {
      isOpen: true,
      reason: 'force_open',
      openingHours: hoursStr,
      message: 'Restoran Açık'
    };
  }

  // 3. Çalışma saatleri kontrolü (Varsayılan 10:00 - 23:00)
  const now = getTurkeyTime();
  const { startMinutes, endMinutes, startStr } = parseOpeningHours(hoursStr);

  let isWithin = false;
  if (startMinutes <= endMinutes) {
    // Normal gün içi aralık: 10:00 - 23:00
    isWithin = now.totalMinutes >= startMinutes && now.totalMinutes < endMinutes;
  } else {
    // Gece yarısını aşan aralık: örn. 18:00 - 02:00
    isWithin = now.totalMinutes >= startMinutes || now.totalMinutes < endMinutes;
  }

  if (!isWithin) {
    return {
      isOpen: false,
      reason: 'outside_hours',
      openingHours: hoursStr,
      message: `Restoranımız şu anda kapalıdır. Çalışma saatlerimiz: ${hoursStr}. Sipariş alımı saat ${startStr}'da başlayacaktır.`
    };
  }

  return {
    isOpen: true,
    reason: 'open',
    openingHours: hoursStr,
    message: 'Restoran Açık'
  };
}

// =================== SEPET HAFIZASI (LOCALSTORAGE) ===================
const STORAGE_CART_KEY = 'pita_cart';

export function getStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredCart(cart) {
  try {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      localStorage.removeItem(STORAGE_CART_KEY);
    } else {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    }
  } catch (e) {}
}

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
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Eksik yeni ürünleri (örn. yeni eklenen taş fırın pizzalar) otomatik olarak menüye dahil et
        const existingIds = new Set(parsed.map(p => p.id));
        const missingItems = initialMenu.filter(p => !existingIds.has(p.id));
        if (missingItems.length > 0) {
          const merged = [...parsed, ...missingItems];
          saveMenu(merged);
          return merged;
        }
        return parsed;
      }
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
    sessionStorage.removeItem('pita_explicit_logout');
  } else {
    localStorage.removeItem('pita_current_user');
  }
}

export function getMyOrders(ordersList = null, user = null) {
  const myIds = getMyOrderIds();
  const allOrders = Array.isArray(ordersList) ? ordersList : getStoredOrders();
  const currentUser = user || getCurrentUser();
  const currentPhone = currentUser ? (currentUser.phone || '').replace(/\D/g, '') : '';
  const currentEmail = currentUser && currentUser.email ? currentUser.email.trim().toLowerCase() : '';
  const currentUid = currentUser ? (currentUser.uid || currentUser.id || '') : '';

  return allOrders.filter(o => {
    if (myIds.includes(o.id) || myIds.includes(String(o.id))) return true;
    if (currentUid && (o.userId === currentUid || o.customerId === currentUid)) return true;
    if (currentEmail && o.customerEmail && o.customerEmail.trim().toLowerCase() === currentEmail) return true;
    if (currentPhone && o.customerPhone) {
      const orderPhone = o.customerPhone.replace(/\D/g, '');
      if (orderPhone && (orderPhone === currentPhone || orderPhone.endsWith(currentPhone) || currentPhone.endsWith(orderPhone))) {
        addMyOrderId(o.id);
        return true;
      }
    }
    return false;
  });
}

export function isFirstOrderDiscountAvailable(user = null, ordersList = null) {
  // 1. Tarayıcıda indirim daha önce kullanıldı olarak işaretlendiyse
  if (localStorage.getItem('pita_first_order_used')) {
    return false;
  }

  const u = user || getCurrentUser();
  // 2. Kullanıcının kayıtlı sipariş sayısı varsa ve > 0 ise
  if (u) {
    const totalOrders = Number(u.total_orders || u.totalOrders || u.order_count || 0);
    if (totalOrders > 0) {
      return false;
    }
  }

  // 3. Geçmiş siparişler listesinde siparişi var mı?
  try {
    const myOrders = getMyOrders(ordersList, u);
    if (myOrders && myOrders.length > 0) {
      return false;
    }
  } catch (e) {}

  // 4. Stored customers veritabanında bu müşteri var mı ve total_orders > 0 mı?
  if (u && (u.phone || u.email)) {
    try {
      const customers = getStoredCustomers();
      const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
      const uEmail = (u.email || '').trim().toLowerCase();
      const match = customers.find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
        const cEmail = (c.email || '').trim().toLowerCase();
        return (uPhone && cPhone && uPhone === cPhone) || (uEmail && cEmail && uEmail === cEmail);
      });
      if (match && Number(match.total_orders || match.totalOrders || match.order_count || 0) > 0) {
        return false;
      }
    } catch (e) {}
  }

  return true;
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

// =================== ADRES DEFTERI (LOCALSTORAGE) ===================

export function getSavedAddresses(phone) {
  try {
    const key = `pita_addresses_${(phone || 'guest').replace(/\D/g, '')}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveAddress(phone, addressText) {
  if (!addressText || !addressText.trim()) return null;
  try {
    const key = `pita_addresses_${(phone || 'guest').replace(/\D/g, '')}`;
    const addresses = getSavedAddresses(phone);
    const newAddr = {
      id: `addr_${Date.now()}`,
      text: addressText.trim(),
      savedAt: new Date().toISOString()
    };
    addresses.unshift(newAddr);
    // En fazla 5 adres tut
    const trimmed = addresses.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(trimmed));
    return newAddr;
  } catch (e) {
    return null;
  }
}

export function deleteAddress(phone, addressId) {
  try {
    const key = `pita_addresses_${(phone || 'guest').replace(/\D/g, '')}`;
    const addresses = getSavedAddresses(phone).filter(a => a.id !== addressId);
    localStorage.setItem(key, JSON.stringify(addresses));
    return true;
  } catch (e) {
    return false;
  }
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
  try {
    return await apiCall(`/customers/${encodeURIComponent(phone)}`, 'DELETE');
  } catch (e) {
    return { ok: false };
  }
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
  const targetPhone = isPhone ? identifier : phone;
  let firebaseErrorMsg = '';

  // 1. Eğer telefon ise, Firebase Phone Authentication (reCAPTCHA + gerçek SMS) dene
  if (isPhone && targetPhone) {
    try {
      const fbRes = await sendFirebasePhoneVerification(targetPhone);
      if (fbRes.ok) {
        return {
          ok: true,
          firebase: true,
          data: {
            message: fbRes.message || `${targetPhone} numarasına SMS ile doğrulama kodu gönderildi.`,
            phone: targetPhone
          }
        };
      } else {
        firebaseErrorMsg = fbRes.error || '';
        console.warn("Firebase Phone Auth SMS gönderilemedi, yerel koda geçiliyor:", fbRes.error);
      }
    } catch (fbErr) {
      firebaseErrorMsg = fbErr.message || '';
      console.warn("Firebase Phone Auth istisnası:", fbErr);
    }
  }

  // 2. Yedek / Demo Mod: Backend ve yerel kod üretimi
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
    return {
      ...res,
      firebase: false,
      firebaseError: firebaseErrorMsg
    };
  }

  return {
    ok: true,
    firebase: false,
    firebaseError: firebaseErrorMsg,
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
  const isTestCode = inputCode === '123456';
  let fbUser = null;

  // 1. Firebase SMS oturumu varsa ve test kodu değilse Firebase ile onayla
  if (window.confirmationResult && !isTestCode) {
    try {
      const fbRes = await confirmFirebasePhoneCode(inputCode);
      if (fbRes.ok && fbRes.user) {
        fbUser = fbRes.user;
      } else {
        return { ok: false, error: fbRes.error || 'Doğrulama kodu hatalı! Lütfen kodu kontrol ediniz.' };
      }
    } catch (e) {}
  }

  const storedCode = (identifier ? sessionStorage.getItem(`pita_verify_${identifier}`) : null) || '123456';

  let res = await apiCall('/auth/verify-and-register', 'POST', payload);
  if (res.ok && res.data && (res.data.user || res.data.customer)) {
    const rawUser = res.data.user || res.data.customer;
    // Telefon ile doğrulama yapıldıysa phoneVerified=true ekle
    const isPhoneIdent = payload.phone && !identifier.includes('@');
    const user = {
      ...rawUser,
      uid: fbUser ? fbUser.uid : (rawUser.uid || ''),
      phoneVerified: rawUser.phoneVerified || isPhoneIdent || rawUser.is_verified === 1 || Boolean(fbUser) || false
    };
    setCurrentUser(user);
    saveCustomerLocally(user);
    syncCustomerToFirestore(user).catch(() => {});
    return { ok: true, data: { user } };
  }

  // Doğrulama kontrolü: Firebase onayı, üretilen kod veya varsayılan 123456 kabul edilir
  if (fbUser || inputCode === storedCode || inputCode === '123456') {
    const isEmail = identifier.includes('@');
    const user = {
      uid: fbUser ? fbUser.uid : '',
      name: payload.name || (isEmail ? identifier.split('@')[0] : 'Pita Misafiri'),
      email: payload.email || (isEmail ? identifier : ''),
      phone: fbUser ? fbUser.phone : (payload.phone || (!isEmail ? identifier : '')),
      password: payload.password || '',
      auth_provider: isEmail ? 'email' : 'phone',
      registered_at: new Date().toISOString(),
      phoneVerified: !isEmail || Boolean(fbUser)
    };
    setCurrentUser(user);
    saveCustomerLocally(user);
    syncCustomerToFirestore(user).catch(() => {});
    return { ok: true, data: { user } };
  }

  return { ok: false, error: 'Doğrulama kodu hatalı! Lütfen kodu kontrol ediniz.' };
}

// Telefon doğrulamasını güncelle (profil veya sipariş üzerinden doğrulama)
export async function verifyPhone(phone, code, name = '') {
  const inputCode = (code || '').trim();
  const isTestCode = inputCode === '123456' || (phone && inputCode === sessionStorage.getItem(`pita_verify_${phone.trim().toLowerCase()}`));
  let firebaseSuccess = false;
  let firebaseUser = null;

  // 1. Firebase SMS oturumu varsa ve test kodu değilse Firebase ile onayla
  if (window.confirmationResult && !isTestCode) {
    try {
      const fbConfirm = await confirmFirebasePhoneCode(inputCode);
      if (fbConfirm.ok && fbConfirm.user) {
        firebaseSuccess = true;
        firebaseUser = fbConfirm.user;
      } else {
        return { ok: false, error: fbConfirm.error || 'Doğrulama kodu hatalı! Lütfen tekrar kontrol ediniz.' };
      }
    } catch (e) {
      console.warn("Firebase confirm hatası:", e);
    }
  }

  // 2. Firebase oturumu yoksa veya test koduysa yerel/sessionStorage kontrolü
  if (!firebaseSuccess) {
    const identifier = (phone || '').trim().toLowerCase();
    const storedCode = (identifier ? sessionStorage.getItem(`pita_verify_${identifier}`) : null) || '123456';
    if (inputCode !== storedCode && inputCode !== '123456') {
      return { ok: false, error: 'Doğrulama kodu hatalı! Lütfen kodu kontrol ediniz.' };
    }
  }


  // Backend'e telefon doğrulandı bilgisini gönder
  try {
    await apiCall(`/customers/${encodeURIComponent(phone)}/verify-phone`, 'PUT', {});
  } catch (e) {}

  // Mevcut kullanıcıyı güncelle veya yeni kullanıcı oluştur
  const currentUser = getCurrentUser();
  if (currentUser) {
    const updated = {
      ...currentUser,
      phone,
      uid: firebaseUser ? firebaseUser.uid : (currentUser.uid || ''),
      name: currentUser.name || name || 'Pita Misafiri',
      phoneVerified: true,
      is_verified: 1
    };
    setCurrentUser(updated);
    saveCustomerLocally(updated);
    syncCustomerToFirestore(updated).catch(() => {});
    return { ok: true, data: { user: updated } };
  } else {
    const newUser = {
      name: name || 'Pita Misafiri',
      phone,
      uid: firebaseUser ? firebaseUser.uid : '',
      phoneVerified: true,
      is_verified: 1,
      auth_provider: 'phone',
      registered_at: new Date().toISOString()
    };
    setCurrentUser(newUser);
    saveCustomerLocally(newUser);
    syncCustomerToFirestore(newUser).catch(() => {});
    return { ok: true, data: { user: newUser } };
  }
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
      const rawUser = res.data.user || res.data.customer;
      const user = {
        ...rawUser,
        phoneVerified: Boolean(rawUser.phoneVerified || rawUser.is_verified === 1 || (rawUser.phone && rawUser.auth_provider === 'phone'))
      };
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
  const user = {
    ...foundCustomer,
    phoneVerified: Boolean(foundCustomer.phoneVerified || foundCustomer.is_verified === 1 || (foundCustomer.phone && foundCustomer.auth_provider === 'phone'))
  };
  setCurrentUser(user);
  saveCustomerLocally(user);
  syncCustomerToFirestore(user).catch(() => {});
  return { ok: true, data: { user } };
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
      customerEmail: orderInput.customerEmail || '',
      userId: orderInput.userId || '',
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

    // Eğer ilk sipariş indirimi kullanıldıysa veya sipariş verildiyse ilk sipariş hakkını tamamla
    if (orderInput.discountAmount > 0 || orderInput.discountCode === 'PITA20') {
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
  getMyOrders(ordersList = null, user = null) {
    return getMyOrders(ordersList, user);
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

  // 7.2 Admin Sorun Bildirimini Silme / Temizleme
  clearIssueReport(orderId) {
    const orders = getStoredOrders();
    let updatedOrder = null;
    const updatedOrders = orders.map(order => {
      if (String(order.id) === String(orderId)) {
        const { issueReport, ...rest } = order;
        updatedOrder = { ...rest, issueReport: null };
        return updatedOrder;
      }
      return order;
    });
    saveOrders(updatedOrders, 'ISSUE_CLEARED', updatedOrder);
    if (updatedOrder) {
      syncOrderToFirestore(updatedOrder).catch(() => {});
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

  async deleteCustomer(identifier, customerObj = null) {
    const phone = (customerObj && customerObj.phone) || (identifier && !identifier.includes('@') ? identifier : '');
    const email = (customerObj && customerObj.email) || (identifier && identifier.includes('@') ? identifier : '');
    const id = (customerObj && customerObj.id) || (identifier || '');

    // 1. Backend API çağrısı (varsa çalışır, yoksa hata vermez)
    if (phone) {
      try { deleteCustomer(phone).catch(() => {}); } catch (e) {}
    }

    // 2. Firestore Bulut Veritabanından Sil
    try {
      if (id) deleteCustomerFromFirestore(id).catch(() => {});
      if (phone) deleteCustomerFromFirestore(phone).catch(() => {});
      if (email) deleteCustomerFromFirestore(email).catch(() => {});
    } catch (e) {}

    // 3. Yerel Hafızadan Sil
    const current = getStoredCustomers();
    const updated = current.filter(c => {
      if (phone && c.phone && (c.phone === phone || c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))) return false;
      if (email && c.email && c.email.toLowerCase() === email.toLowerCase()) return false;
      if (id && (c.id === id || String(c.id) === String(id))) return false;
      if (identifier && (c.phone === identifier || c.email === identifier || c.id === identifier)) return false;
      return true;
    });
    saveStoredCustomers(updated);

    // 4. Diğer tarayıcı sekmelerine bildir
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CUSTOMER_DELETED', phone, email, id });
    }

    return { ok: true };
  },

  async assignCustomerCode(phone, code, discount) {
    try {
      assignCustomerCode(phone, code, discount).catch(() => {});
    } catch (e) {}

    // Yerel ve Firestore senkronizasyonu
    const current = getStoredCustomers();
    const updated = current.map(c => {
      if (c.phone === phone || c.email === phone || c.id === phone) {
        return { ...c, custom_code: code, custom_discount: discount };
      }
      return c;
    });
    saveStoredCustomers(updated);

    const targetCust = updated.find(c => c.phone === phone || c.email === phone || c.id === phone);
    if (targetCust) {
      syncCustomerToFirestore(targetCust).catch(() => {});
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CUSTOMER_UPDATED', phone });
    }
    return { ok: true };
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
  getStoredReviews() {
    return getStoredReviews();
  },

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

  async verifyPhone(phone, code) {
    return verifyPhone(phone, code);
  },

  async customerLogin(email, password) {
    return customerLogin(email, password);
  },

  // Adres Defteri
  getSavedAddresses(phone) {
    return getSavedAddresses(phone);
  },

  saveAddress(phone, addressText) {
    return saveAddress(phone, addressText);
  },

  deleteAddress(phone, addressId) {
    return deleteAddress(phone, addressId);
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
  },

  isRestaurantOpenNow(settings) {
    return isRestaurantOpenNow(settings);
  },

  getTurkeyTime() {
    return getTurkeyTime();
  },

  parseOpeningHours(hoursStr) {
    return parseOpeningHours(hoursStr);
  },

  getStoredCart() {
    return getStoredCart();
  },

  saveStoredCart(cart) {
    return saveStoredCart(cart);
  },

  // Muhasebe & Gider Yönetim Servisleri
  getExpenses() {
    return getExpenses();
  },

  addExpense(data) {
    return addExpense(data);
  },

  deleteExpense(expenseId) {
    return deleteExpense(expenseId);
  },

  subscribeExpenses(callback) {
    return subscribeExpenses(callback);
  },

  getDailyClosings() {
    return getDailyClosings();
  },

  saveDailyClosing(closingData) {
    return saveDailyClosing(closingData);
  },

  subscribeDailyClosings(callback) {
    return subscribeDailyClosings(callback);
  },

  calculateAccountingKPIs(orders, expenses, period, customStart, customEnd) {
    return calculateAccountingKPIs(orders, expenses, period, customStart, customEnd);
  },

  getDailyLedger(orders, expenses) {
    return getDailyLedger(orders, expenses);
  },

  exportLedgerToCSV(dailyLedgerRows, periodLabel) {
    return exportLedgerToCSV(dailyLedgerRows, periodLabel);
  },

  getContactMessages() {
    return getContactMessages();
  },

  submitContactMessage(data) {
    return submitContactMessage(data);
  },

  markContactMessageResolved(messageId) {
    return markContactMessageResolved(messageId);
  },

  // Canlı Flaş İndirim Servisleri
  broadcastFlashDeal(dealData) {
    return broadcastFlashDeal(dealData);
  },

  stopFlashDeal() {
    return stopFlashDeal();
  },

  getActiveFlashDeal() {
    return getActiveFlashDeal();
  },

  subscribeFlashDeal(callback) {
    return subscribeFlashDeal(callback);
  }
};


// =================== GİDERLER & MUHASEBE YARDIMCI FONKSİYONLARI ===================

export function getStoredExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredExpenses(expenses, broadcastType = 'EXPENSES_UPDATED') {
  try {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: broadcastType, expenses, timestamp: Date.now() });
    }
  } catch (e) {
    console.warn("Giderler kaydedilemedi:", e);
  }
}

export async function getExpenses() {
  const local = getStoredExpenses();
  try {
    // 1. Önce Firestore'dan çekmeyi dene
    const fromFirestore = await getExpensesFromFirestore();
    if (Array.isArray(fromFirestore) && fromFirestore.length > 0) {
      saveStoredExpenses(fromFirestore, 'EXPENSES_SYNCED');
      return fromFirestore;
    }
  } catch (e) {}

  try {
    // 2. Python server.py varsa oradan çekmeyi dene
    const res = await apiCall('/expenses');
    if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
      saveStoredExpenses(res.data, 'EXPENSES_SYNCED');
      return res.data;
    }
  } catch (e) {}

  return local;
}

export async function addExpense(expenseData) {
  const newExp = {
    id: expenseData.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: (expenseData.title || 'Gider').trim(),
    category: expenseData.category || 'Malzeme',
    amount: parseFloat(expenseData.amount) || 0,
    date: expenseData.date || new Date().toISOString().split('T')[0],
    note: (expenseData.note || '').trim(),
    payment_account: expenseData.payment_account || 'cash', // 'cash' (Nakit Kasa) | 'bank' (Banka Kasa)
    createdAt: expenseData.createdAt || new Date().toISOString()
  };
  const current = getStoredExpenses();
  const updated = [newExp, ...current.filter(e => e.id !== newExp.id)];
  saveStoredExpenses(updated, 'EXPENSE_ADDED');

  // Cloud Firestore senkronizasyonu
  syncExpenseToFirestore(newExp).catch(() => {});

  // Yerel Python backend senkronizasyonu (varsa)
  apiCall('/expenses', 'POST', newExp).catch(() => {});

  return { ok: true, expense: newExp };
}

export async function deleteExpense(expenseId) {
  const current = getStoredExpenses();
  const updated = current.filter(e => String(e.id) !== String(expenseId));
  saveStoredExpenses(updated, 'EXPENSE_DELETED');

  // Cloud Firestore ve Python backend'den temizle
  deleteExpenseFromFirestore(expenseId).catch(() => {});
  apiCall(`/expenses/${encodeURIComponent(expenseId)}`, 'DELETE').catch(() => {});

  return { ok: true };
}

export function subscribeExpenses(callback) {
  const handleBroadcast = (event) => {
    if (event.data && (event.data.type === 'EXPENSES_UPDATED' || event.data.type === 'EXPENSE_ADDED' || event.data.type === 'EXPENSE_DELETED')) {
      callback(getStoredExpenses());
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  const unsubFirestore = subscribeFirestoreExpenses((firestoreExpenses) => {
    if (Array.isArray(firestoreExpenses) && firestoreExpenses.length > 0) {
      localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(firestoreExpenses));
      callback(firestoreExpenses);
    }
  });

  return () => {
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
    if (unsubFirestore) unsubFirestore();
  };
}

// =================== GÜN SONU KAPANIPLARI & Z-RAPORU ===================

export function getStoredDailyClosings() {
  try {
    const raw = localStorage.getItem(STORAGE_DAILY_CLOSINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredDailyClosings(closings, broadcastType = 'DAILY_CLOSINGS_UPDATED') {
  try {
    localStorage.setItem(STORAGE_DAILY_CLOSINGS_KEY, JSON.stringify(closings));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: broadcastType, closings, timestamp: Date.now() });
    }
  } catch (e) {}
}

export async function getDailyClosings() {
  const local = getStoredDailyClosings();
  try {
    const fromFirestore = await getDailyClosingsFromFirestore();
    if (Array.isArray(fromFirestore) && fromFirestore.length > 0) {
      saveStoredDailyClosings(fromFirestore, 'DAILY_CLOSINGS_SYNCED');
      return fromFirestore;
    }
  } catch (e) {}

  try {
    const res = await apiCall('/daily-closings');
    if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
      saveStoredDailyClosings(res.data, 'DAILY_CLOSINGS_SYNCED');
      return res.data;
    }
  } catch (e) {}

  return local;
}

export async function saveDailyClosing(closingData) {
  const dateStr = closingData.date || new Date().toISOString().split('T')[0];
  const newClosing = {
    id: closingData.id || `close-${dateStr}`,
    date: dateStr,
    total_orders: parseInt(closingData.total_orders || 0, 10),
    delivered_orders: parseInt(closingData.delivered_orders || 0, 10),
    revenue: parseFloat(closingData.revenue || 0),
    expense: parseFloat(closingData.expense || 0),
    net_profit: parseFloat(closingData.net_profit || (closingData.revenue - closingData.expense)),
    cash_amount: parseFloat(closingData.cash_amount || 0),
    eft_amount: parseFloat(closingData.eft_amount || 0),
    closed_at: closingData.closed_at || new Date().toISOString()
  };

  const current = getStoredDailyClosings();
  const updated = [newClosing, ...current.filter(c => c.date !== dateStr)];
  saveStoredDailyClosings(updated, 'DAILY_CLOSING_SAVED');

  syncDailyClosingToFirestore(newClosing).catch(() => {});
  apiCall('/daily-closings', 'POST', newClosing).catch(() => {});

  return { ok: true, closing: newClosing };
}

export function subscribeDailyClosings(callback) {
  const handleBroadcast = (event) => {
    if (event.data && (event.data.type === 'DAILY_CLOSINGS_UPDATED' || event.data.type === 'DAILY_CLOSING_SAVED')) {
      callback(getStoredDailyClosings());
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  const unsubFirestore = subscribeFirestoreDailyClosings((firestoreClosings) => {
    if (Array.isArray(firestoreClosings) && firestoreClosings.length > 0) {
      localStorage.setItem(STORAGE_DAILY_CLOSINGS_KEY, JSON.stringify(firestoreClosings));
      callback(firestoreClosings);
    }
  });

  return () => {
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
    if (unsubFirestore) unsubFirestore();
  };
}

// =================== MUHASEBE HESAPLAMA MOTORU ===================

export function getDateStringFromISO(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  } catch (e) {}
  return '';
}

export function calculateAccountingKPIs(orders = [], expenses = [], period = 'today', customStart = '', customEnd = '') {
  const now = new Date();
  const todayStr = getDateStringFromISO(now.toISOString());
  const yestObj = new Date(Date.now() - 86400000);
  const yesterdayStr = getDateStringFromISO(yestObj.toISOString());

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthName = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  // 7 Gün öncesi
  const weekAgoObj = new Date(Date.now() - 7 * 86400000);
  const weekAgoStr = getDateStringFromISO(weekAgoObj.toISOString());

  let periodOrders = orders;
  let periodExpenses = expenses;
  let periodLabel = 'Bugün';

  if (period === 'today') {
    periodLabel = 'Bugün (' + now.toLocaleDateString('tr-TR') + ')';
    periodOrders = orders.filter(o => getDateStringFromISO(o.createdAt) === todayStr);
    periodExpenses = expenses.filter(e => (e.date || getDateStringFromISO(e.createdAt)) === todayStr);
  } else if (period === 'yesterday') {
    periodLabel = 'Dün (' + yestObj.toLocaleDateString('tr-TR') + ')';
    periodOrders = orders.filter(o => getDateStringFromISO(o.createdAt) === yesterdayStr);
    periodExpenses = expenses.filter(e => (e.date || getDateStringFromISO(e.createdAt)) === yesterdayStr);
  } else if (period === 'week') {
    periodLabel = 'Son 7 Gün';
    periodOrders = orders.filter(o => {
      const d = getDateStringFromISO(o.createdAt);
      return d >= weekAgoStr && d <= todayStr;
    });
    periodExpenses = expenses.filter(e => {
      const d = e.date || getDateStringFromISO(e.createdAt);
      return d >= weekAgoStr && d <= todayStr;
    });
  } else if (period === 'month') {
    periodLabel = 'Bu Ay (' + monthName + ')';
    periodOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    periodExpenses = expenses.filter(e => {
      const dStr = e.date || getDateStringFromISO(e.createdAt);
      if (!dStr) return false;
      const d = new Date(dStr);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  } else if (period === 'range' && customStart && customEnd) {
    periodLabel = `${customStart} - ${customEnd}`;
    periodOrders = orders.filter(o => {
      const d = getDateStringFromISO(o.createdAt);
      return d >= customStart && d <= customEnd;
    });
    periodExpenses = expenses.filter(e => {
      const d = e.date || getDateStringFromISO(e.createdAt);
      return d >= customStart && d <= customEnd;
    });
  } else if (period === 'all') {
    periodLabel = 'Tüm Zamanlar Genel Muhasebe';
    periodOrders = orders;
    periodExpenses = expenses;
  }

  // Sipariş ve gelir analizleri
  const deliveredOrders = periodOrders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const deliveredCount = deliveredOrders.length;
  const totalOrderCount = periodOrders.length;
  const avgOrderValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;

  // Ödeme tiplerine göre gelir
  const cashRevenue = deliveredOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const eftRevenue = deliveredOrders
    .filter(o => o.paymentMethod === 'eft')
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  // Gider analizleri
  const totalExpense = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const cashExpense = periodExpenses
    .filter(e => e.payment_account !== 'bank')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const bankExpense = periodExpenses
    .filter(e => e.payment_account === 'bank')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Kasa durumları (Çift Kasa)
  const cashBalance = cashRevenue - cashExpense; // Nakit Kasa Bakiyesi
  const bankBalance = eftRevenue - bankExpense;  // Banka/POS Kasa Bakiyesi
  const netProfit = totalRevenue - totalExpense;
  const isProfit = netProfit >= 0;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : (totalExpense > 0 ? -100 : 0);

  // Kategori bazlı gider dağılımı
  const categoryTotals = {};
  periodExpenses.forEach(exp => {
    const cat = exp.category || 'Malzeme';
    const amt = parseFloat(exp.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
  });

  const categoryBreakdown = Object.keys(categoryTotals).map(cat => ({
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpense > 0 ? Math.round((categoryTotals[cat] / totalExpense) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  return {
    period,
    periodLabel,
    totalRevenue,
    deliveredCount,
    totalOrderCount,
    avgOrderValue,
    cashRevenue,
    eftRevenue,
    totalExpense,
    cashExpense,
    bankExpense,
    cashBalance,
    bankBalance,
    netProfit,
    isProfit,
    profitMargin,
    categoryBreakdown,
    periodExpenses,
    periodOrders
  };
}

export function getDailyLedger(orders = [], expenses = []) {
  const dailyMap = {};

  orders.forEach(o => {
    const dStr = getDateStringFromISO(o.createdAt);
    if (!dStr) return;
    if (!dailyMap[dStr]) {
      dailyMap[dStr] = {
        date: dStr,
        totalCount: 0,
        deliveredCount: 0,
        revenue: 0,
        cashRevenue: 0,
        eftRevenue: 0,
        expense: 0
      };
    }
    dailyMap[dStr].totalCount += 1;
    if (o.status === 'delivered') {
      const amt = parseFloat(o.totalAmount) || 0;
      dailyMap[dStr].deliveredCount += 1;
      dailyMap[dStr].revenue += amt;
      if (o.paymentMethod === 'cash') dailyMap[dStr].cashRevenue += amt;
      if (o.paymentMethod === 'eft') dailyMap[dStr].eftRevenue += amt;
    }
  });

  expenses.forEach(e => {
    const dStr = e.date || getDateStringFromISO(e.createdAt);
    if (!dStr) return;
    if (!dailyMap[dStr]) {
      dailyMap[dStr] = {
        date: dStr,
        totalCount: 0,
        deliveredCount: 0,
        revenue: 0,
        cashRevenue: 0,
        eftRevenue: 0,
        expense: 0
      };
    }
    dailyMap[dStr].expense += (parseFloat(e.amount) || 0);
  });

  return Object.values(dailyMap)
    .map(row => ({
      ...row,
      netProfit: row.revenue - row.expense,
      isProfit: (row.revenue - row.expense) >= 0
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function exportLedgerToCSV(dailyLedgerRows = [], periodLabel = 'Rapor') {
  if (!dailyLedgerRows || dailyLedgerRows.length === 0) {
    alert("Dışa aktarılacak muhasebe kaydı bulunamadı.");
    return;
  }

  const headers = [
    "Tarih",
    "Toplam Siparis",
    "Teslim Edilen",
    "Teslimat Cirosu (TL)",
    "Kapida Nakit (TL)",
    "Havale / EFT (TL)",
    "Isletme Gideri (TL)",
    "Net Kar / Zarar (TL)",
    "Durum"
  ];

  const rows = dailyLedgerRows.map(r => [
    `"${r.date}"`,
    r.totalCount,
    r.deliveredCount,
    `"${r.revenue.toFixed(2)}"`,
    `"${(r.cashRevenue || 0).toFixed(2)}"`,
    `"${(r.eftRevenue || 0).toFixed(2)}"`,
    `"${r.expense.toFixed(2)}"`,
    `"${r.netProfit.toFixed(2)}"`,
    r.isProfit ? '"Karda"' : '"Zararda"'
  ]);

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nowStr = new Date().toISOString().split('T')[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `Pita_Mutfak_Muhasebe_Kasa_Raporu_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =================== MÜŞTERİ İLETİŞİM MESAJLARI (Bize Ulaşın) ===================

export async function submitContactMessage(data) {
  const msg = {
    id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    senderName: data.senderName || 'Anonim',
    senderPhone: data.senderPhone || '',
    senderEmail: data.senderEmail || '',
    subject: data.subject || '',
    message: data.message || '',
    photoBase64: data.photoBase64 || null,
    photoName: data.photoName || null,
    status: 'new', // 'new' | 'read' | 'resolved'
    createdAt: new Date().toISOString()
  };

  // Firestore'a kaydet (ana kayıt)
  try {
    await sendContactMessageToFirestore(msg);
  } catch (e) {}

  // Yerel yedek (Firestore offline ise)
  try {
    const existing = JSON.parse(localStorage.getItem('pita_contact_messages') || '[]');
    existing.unshift(msg);
    localStorage.setItem('pita_contact_messages', JSON.stringify(existing.slice(0, 100)));
  } catch (e) {}

  return { ok: true, id: msg.id };
}

export async function getContactMessages() {
  try {
    const fromFirestore = await getContactMessagesFromFirestore();
    if (fromFirestore && fromFirestore.length > 0) return fromFirestore;
  } catch (e) {}
  try {
    return JSON.parse(localStorage.getItem('pita_contact_messages') || '[]');
  } catch (e) { return []; }
}

export async function markContactMessageResolved(messageId) {
  try { await updateContactMessageStatus(messageId, 'resolved'); } catch (e) {}
  try {
    const msgs = JSON.parse(localStorage.getItem('pita_contact_messages') || '[]');
    const updated = msgs.map(m => m.id === messageId ? { ...m, status: 'resolved' } : m);
    localStorage.setItem('pita_contact_messages', JSON.stringify(updated));
  } catch (e) {}
}

export async function deleteContactMessage(messageId) {
  try {
    await deleteContactMessageFromFirestore(messageId);
  } catch (e) {}
  try {
    const msgs = JSON.parse(localStorage.getItem('pita_contact_messages') || '[]');
    const filtered = msgs.filter(m => String(m.id) !== String(messageId));
    localStorage.setItem('pita_contact_messages', JSON.stringify(filtered));
  } catch (e) {}
  return true;
}

export async function replyToContactMessage(messageId, replyText, senderPhone = '', senderName = '') {
  const now = new Date();
  const replyData = {
    message: replyText,
    repliedAt: now.toISOString(),
    repliedTime: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    repliedDate: now.toLocaleDateString('tr-TR')
  };

  try {
    await replyContactMessageInFirestore(messageId, replyData);
  } catch (e) {}

  try {
    const msgs = JSON.parse(localStorage.getItem('pita_contact_messages') || '[]');
    const updated = msgs.map(m => String(m.id) === String(messageId) ? { ...m, status: 'resolved', adminReply: replyData } : m);
    localStorage.setItem('pita_contact_messages', JSON.stringify(updated));
  } catch (e) {}

  // Müşteriye bildirim / mesaj ilet (Customer Inbox)
  if (senderPhone) {
    try {
      const cleanPhone = senderPhone.replace(/\D/g, '');
      const noteItem = {
        id: 'msg_reply_' + Date.now(),
        type: 'support_reply',
        title: '💬 Pita Mutfak Yetkilisi Yanıtı',
        message: `Sayın ${senderName || 'Misafirimiz'},\nİletişim mesajınıza yetkilimiz yanıt verdi:\n"${replyText}"`,
        createdAt: now.toISOString(),
        read: false
      };
      const key = `pita_customer_messages_${cleanPhone}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(noteItem);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {}
  }

  return { ok: true, replyData };
}

// =================== CANLI FLAŞ İNDİRİM & ANLIK BİLDİRİM (FLASH DEALS) ===================

const STORAGE_FLASH_DEAL_KEY = 'pita_active_flash_deal';

export async function broadcastFlashDeal(dealData) {
  const durationMin = Number(dealData.durationMinutes) || 10;
  const startedAt = dealData.startedAt || new Date().toISOString();
  const expiresAt = dealData.expiresAt || new Date(Date.now() + durationMin * 60 * 1000).toISOString();

  const flashDeal = {
    id: dealData.id || ('flash_' + Date.now()),
    productId: dealData.productId,
    productName: dealData.productName || 'Özel Ürün',
    productImage: dealData.productImage || '',
    originalPrice: Number(dealData.originalPrice) || 0,
    flashPrice: Number(dealData.flashPrice) || 0,
    durationMinutes: durationMin,
    startedAt,
    expiresAt,
    title: dealData.title || `⚡ ${durationMin} DAKİKALIK FLAŞ İNDİRİM!`,
    message: dealData.message || 'Seçili lezzetimizde şok indirim! Geri sayım bitmeden siparişini ver.',
    active: true,
    targetAudience: 'all'
  };

  // 1. LocalStorage
  try {
    localStorage.setItem(STORAGE_FLASH_DEAL_KEY, JSON.stringify(flashDeal));
  } catch (e) {}

  // 2. BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'FLASH_DEAL_START', data: flashDeal });
    } catch (e) {}
  }

  // 3. Firestore Cloud
  try {
    await broadcastFlashDealToFirestore(flashDeal);
  } catch (e) {}

  return flashDeal;
}

export async function stopFlashDeal() {
  try {
    localStorage.removeItem(STORAGE_FLASH_DEAL_KEY);
  } catch (e) {}

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'FLASH_DEAL_STOP' });
    } catch (e) {}
  }

  try {
    await stopFlashDealInFirestore();
  } catch (e) {}

  return true;
}

export function getActiveFlashDeal() {
  try {
    const raw = localStorage.getItem(STORAGE_FLASH_DEAL_KEY);
    if (!raw) return null;
    const deal = JSON.parse(raw);
    if (!deal || !deal.active) return null;
    const expiresMs = new Date(deal.expiresAt).getTime();
    if (Date.now() >= expiresMs) {
      localStorage.removeItem(STORAGE_FLASH_DEAL_KEY);
      return null;
    }
    return deal;
  } catch (e) {
    return null;
  }
}

export function subscribeFlashDeal(callback) {
  // İlk durumu gönder
  callback(getActiveFlashDeal());

  // 1. Firestore Cloud Dinleyici
  let unsubFirestore = null;
  try {
    unsubFirestore = subscribeFirestoreFlashDeal((cloudDeal) => {
      if (cloudDeal && cloudDeal.active) {
        const expiresMs = new Date(cloudDeal.expiresAt).getTime();
        if (Date.now() < expiresMs) {
          localStorage.setItem(STORAGE_FLASH_DEAL_KEY, JSON.stringify(cloudDeal));
          callback(cloudDeal);
          return;
        }
      }
      localStorage.removeItem(STORAGE_FLASH_DEAL_KEY);
      callback(null);
    });
  } catch (e) {}

  // 2. BroadcastChannel Dinleyicisi
  const handleBroadcast = (e) => {
    const msg = e?.data;
    if (!msg) return;
    if (msg.type === 'FLASH_DEAL_START' && msg.data) {
      localStorage.setItem(STORAGE_FLASH_DEAL_KEY, JSON.stringify(msg.data));
      callback(msg.data);
    } else if (msg.type === 'FLASH_DEAL_STOP') {
      localStorage.removeItem(STORAGE_FLASH_DEAL_KEY);
      callback(null);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  const handleStorage = (e) => {
    if (e.key === STORAGE_FLASH_DEAL_KEY) {
      callback(getActiveFlashDeal());
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Süre dolumu kontrolü (her 1 saniyede bir)
  const interval = setInterval(() => {
    const current = getActiveFlashDeal();
    if (!current) {
      const raw = localStorage.getItem(STORAGE_FLASH_DEAL_KEY);
      if (raw) {
        localStorage.removeItem(STORAGE_FLASH_DEAL_KEY);
        callback(null);
      }
    }
  }, 1000);

  return () => {
    if (unsubFirestore) {
      try { unsubFirestore(); } catch (e) {}
    }
    if (broadcastChannel) {
      try { broadcastChannel.removeEventListener('message', handleBroadcast); } catch (e) {}
    }
    window.removeEventListener('storage', handleStorage);
    clearInterval(interval);
  };
}

