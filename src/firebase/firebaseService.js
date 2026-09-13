// Pita Mutfak - Firebase Firestore Canlı Senkronizasyon Servisi (Lazy & Fault-Tolerant)
import { firebaseConfig } from './config.js';

let dbInstance = null;
let firestoreLib = null;
let initPromise = null;

async function getFirestoreContext() {
  if (dbInstance && firestoreLib) {
    return { db: dbInstance, ...firestoreLib };
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      const fs = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const app = initializeApp(firebaseConfig);
      dbInstance = fs.getFirestore(app);
      firestoreLib = fs;
      console.log("🔥 [Firebase] Pita Mutfak Cloud Firestore bağlantısı aktif!");
      return { db: dbInstance, ...firestoreLib };
    } catch (err) {
      console.warn("⚠️ [Firebase] Bulut bağlantısı kurulamadı (yerel mod aktif):", err);
      return null;
    }
  })();

  return initPromise;
}

export const isFirebaseActive = () => !!dbInstance;

// =================== 1. SİPARİŞLER (ORDERS) ===================

export async function syncOrderToFirestore(order) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const orderRef = doc(db, "orders", order.id);
    await setDoc(orderRef, {
      ...order,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore sipariş kaydetme:", e);
    return false;
  }
}

export function subscribeFirestoreOrders(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, query, orderBy, onSnapshot } = ctx;
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach(d => {
          orders.push({ id: d.id, ...d.data() });
        });
        if (orders.length > 0) {
          callback(orders);
        }
      }, (error) => {
        console.warn("Firestore sipariş dinleme:", error);
      });
    } catch (e) {
      console.warn("Firestore sipariş dinleyici hatası:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

// =================== 2. MÜŞTERİ YORUMLARI (REVIEWS) ===================

export async function syncReviewToFirestore(review) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const reviewId = String(review.id || Date.now());
    const reviewRef = doc(db, "reviews", reviewId);
    await setDoc(reviewRef, {
      ...review,
      id: reviewId,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore yorum kaydetme:", e);
    return false;
  }
}

export async function deleteReviewFromFirestore(reviewId) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, deleteDoc } = ctx;
    await deleteDoc(doc(db, "reviews", String(reviewId)));
    return true;
  } catch (e) {
    console.warn("Firestore yorum silme:", e);
    return false;
  }
}

export function subscribeFirestoreReviews(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, query, orderBy, onSnapshot } = ctx;
    try {
      const q = query(collection(db, "reviews"), orderBy("created_at", "desc"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const reviews = [];
        snapshot.forEach(d => {
          reviews.push({ id: d.id, ...d.data() });
        });
        if (reviews.length > 0) {
          callback(reviews);
        }
      }, (error) => {
        console.warn("Firestore yorum dinleme:", error);
      });
    } catch (e) {
      console.warn("Firestore yorum dinleyici hatası:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

// =================== 3. MÜŞTERİLER (CUSTOMERS) ===================

export async function syncCustomerToFirestore(customer) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
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
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return [];
    const { db, collection, getDocs } = ctx;
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
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, deleteDoc } = ctx;
    await deleteDoc(doc(db, "customers", phone));
    return true;
  } catch (e) {
    console.warn("Firestore müşteri silme:", e);
    return false;
  }
}

// =================== 4. STOK (STOCK) ===================

export async function syncStockToFirestore(stockItems) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    if (Array.isArray(stockItems)) {
      for (const item of stockItems) {
        if (item.product_id) {
          const stockRef = doc(db, "stock", item.product_id);
          await setDoc(stockRef, {
            product_id: item.product_id,
            quantity: item.stock_quantity ?? item.quantity ?? 100,
            low_stock_threshold: item.low_stock_threshold || 5,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }
    }
    return true;
  } catch (e) {
    console.warn("Firestore stok güncelleme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreStock(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, onSnapshot } = ctx;
    try {
      unsubscribe = onSnapshot(collection(db, "stock"), (snapshot) => {
        const stockList = [];
        snapshot.forEach(d => {
          stockList.push({ product_id: d.id, ...d.data() });
        });
        if (stockList.length > 0) {
          callback(stockList);
        }
      }, (error) => {
        console.warn("Firestore stok dinleme hatası:", error);
      });
    } catch (e) {
      console.warn("Firestore stok dinleyici hatası:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}
