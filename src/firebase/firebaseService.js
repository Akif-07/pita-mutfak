// Pita Mutfak - Firebase Firestore Canlı Senkronizasyon Servisi
import { db, auth } from './config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const isFirebaseActive = () => !!db;

// =================== 1. SİPARİŞLER (ORDERS) ===================

export async function syncOrderToFirestore(order) {
  if (!db) return false;
  try {
    const orderRef = doc(db, "orders", order.id);
    await setDoc(orderRef, {
      ...order,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore sipariş kaydetme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreOrders(callback) {
  if (!db) return null;
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      if (orders.length > 0) {
        callback(orders);
      }
    }, (error) => {
      console.warn("Firestore sipariş dinleme hatası (kurallar veya bağlantı):", error);
    });
  } catch (e) {
    console.warn("Firestore abone olunamadı:", e);
    return null;
  }
}

// =================== 2. MÜŞTERİ YORUMLARI (REVIEWS) ===================

export async function syncReviewToFirestore(review) {
  if (!db) return false;
  try {
    const reviewId = String(review.id || Date.now());
    const reviewRef = doc(db, "reviews", reviewId);
    await setDoc(reviewRef, {
      ...review,
      id: reviewId,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore yorum kaydetme hatası:", e);
    return false;
  }
}

export async function deleteReviewFromFirestore(reviewId) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "reviews", String(reviewId)));
    return true;
  } catch (e) {
    console.warn("Firestore yorum silme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreReviews(callback) {
  if (!db) return null;
  try {
    const q = query(collection(db, "reviews"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      const reviews = [];
      snapshot.forEach(doc => {
        reviews.push({ id: doc.id, ...doc.data() });
      });
      if (reviews.length > 0) {
        callback(reviews);
      }
    }, (error) => {
      console.warn("Firestore yorum dinleme hatası:", error);
    });
  } catch (e) {
    console.warn("Firestore yorum abone olunamadı:", e);
    return null;
  }
}

// =================== 3. MÜŞTERİLER (CUSTOMERS) ===================

export async function syncCustomerToFirestore(customer) {
  if (!db) return false;
  try {
    const key = customer.phone || customer.email || `cust-${Date.now()}`;
    const custRef = doc(db, "customers", key);
    await setDoc(custRef, {
      ...customer,
      _updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore müşteri kaydetme:", e);
    return false;
  }
}

export async function getCustomersFromFirestore() {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "customers"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) {
    console.warn("Firestore müşteriler çekilemedi:", e);
    return [];
  }
}

export async function deleteCustomerFromFirestore(phone) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "customers", phone));
    return true;
  } catch (e) {
    console.warn("Firestore müşteri silme:", e);
    return false;
  }
}

// =================== 4. STOK (STOCK) ===================

export async function syncStockToFirestore(productId, quantity, lowStockThreshold) {
  if (!db) return false;
  try {
    const stockRef = doc(db, "stock", productId);
    await setDoc(stockRef, {
      product_id: productId,
      quantity,
      low_stock_threshold: lowStockThreshold || 5,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore stok güncelleme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreStock(callback) {
  if (!db) return null;
  try {
    return onSnapshot(collection(db, "stock"), (snapshot) => {
      const stockList = [];
      snapshot.forEach(doc => {
        stockList.push({ product_id: doc.id, ...doc.data() });
      });
      if (stockList.length > 0) {
        callback(stockList);
      }
    }, (error) => {
      console.warn("Firestore stok dinleme:", error);
    });
  } catch (e) {
    console.warn("Firestore stok abone:", e);
    return null;
  }
}
