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
  isFirebaseActive 
} from '../firebase/firebaseService.js';

const STORAGE_ORDERS_KEY = 'pita_mutfak_orders';
const STORAGE_MENU_KEY = 'pita_mutfak_menu';
const STORAGE_MY_ORDERS_KEY = 'pita_my_order_ids';
const STORAGE_REVIEWS_KEY = 'pita_mutfak_reviews';
const CHANNEL_NAME = 'pita_mutfak_realtime_channel';

// Başlangıç Müşteri Yorumları (Offline / Fallback)
export const initialReviews = [
  { id: 1, customer_name: "Ahmet Yılmaz", customer_email: "ahmet@gmail.com", product_id: "pilav-tavuk-klasik", product_name: "Klasik Didilmiş Tavuk Pilav", rating: 5, comment: "Tavuk pilav gerçekten efsane! Tavuğu bol, pilavı tane tane ve tereyağlıydı. Kesinlikle tavsiye ederim.", created_at: "2026-09-12T14:20:00" },
  { id: 2, customer_name: "Selin Demir", customer_email: "selin@gmail.com", product_id: "kuru-fasulye-guvec", product_name: "Güveçte Kuru Fasulye", rating: 5, comment: "Güveçte kuru fasulye sıcacık geldi, yanındaki turşu ve pilavla tam anne yemeği lezzeti. Ellerinize sağlık.", created_at: "2026-09-12T18:45:00" },
  { id: 3, customer_name: "Mehmet Kaya", customer_email: "mehmet@gmail.com", product_id: "makarna-penne-tavuk", product_name: "Kremalı Tavuklu Penne", rating: 5, comment: "Fesleğenli kremalı makarna çok lezzetliydi, porsiyon da oldukça doyurucu. Kurye de çok nazikti.", created_at: "2026-09-13T12:10:00" },
  { id: 4, customer_name: "Ayşe K.", customer_email: "ayse@gmail.com", product_id: "", product_name: "Pita Mutfak Genel", rating: 5, comment: "Sipariş 25 dakikada dumanı üstünde kapıma geldi. Kurye arkadaş çok güler yüzlüydü. Teşekkürler!", created_at: "2026-09-13T13:30:00" }
];

export function getStoredReviews() {
  try {
    const saved = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(initialReviews));
  return initialReviews;
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

// E-posta Doğrulama Kodu İste
export async function sendVerificationCode(email, name = '', phone = '') {
  return apiCall('/auth/send-code', 'POST', { email, name, phone });
}

// Kodu Doğrula ve Kaydol
export async function verifyAndRegister(payload) {
  return apiCall('/auth/verify-and-register', 'POST', payload);
}

// E-posta / Şifre ile Giriş Yap
export async function customerLogin(email, password) {
  return apiCall('/auth/login', 'POST', { email, password });
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
      orderNote: orderInput.orderNote || '',
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
    return orders.find(o => o.id === orderId) || null;
  },

  // 4. Müşterinin Kendi Geçmiş Siparişlerini Al
  getMyOrders() {
    const myIds = getMyOrderIds();
    const allOrders = getStoredOrders();
    return allOrders.filter(o => myIds.includes(o.id));
  },

  // 5. Sipariş Durumunu Güncelle (Admin Tarafı)
  updateOrderStatus(orderId, newStatus, optionalNote = '') {
    const orders = getStoredOrders();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    let updatedOrder = null;
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
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
      if (order.id === orderId) {
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
    return updatedOrder;
  },

  // 7. Admin Sorun Çözüldü Olarak İşaretleme
  resolveIssue(orderId) {
    const orders = getStoredOrders();
    const updatedOrders = orders.map(order => {
      if (order.id === orderId && order.issueReport) {
        return {
          ...order,
          issueReport: {
            ...order.issueReport,
            status: 'resolved'
          }
        };
      }
      return order;
    });
    saveOrders(updatedOrders, 'ISSUE_RESOLVED');
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
        if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(cloudOrders));
          callback(cloudOrders);
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

  // Backend Müşteri Yönetimi
  async getCustomers() {
    const res = await getRegisteredCustomers();
    if (res.ok && res.data && res.data.length > 0) return res.data;
    try {
      const cloudCust = await getCustomersFromFirestore();
      if (cloudCust && cloudCust.length > 0) return cloudCust;
    } catch (e) {}
    return res.ok ? res.data : [];
  },

  async deleteCustomer(phone) {
    const res = await deleteCustomer(phone);
    deleteCustomerFromFirestore(phone).catch(() => {});
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
  }
};

