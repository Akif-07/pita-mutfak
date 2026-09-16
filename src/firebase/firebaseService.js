// Pita Mutfak - Firebase Firestore Canlı Senkronizasyon Servisi (Lazy & Fault-Tolerant)
import { firebaseConfig } from './config.js';

let dbInstance = null;
let firestoreLib = null;
let initPromise = null;

// JSON serialize helper to remove undefined fields which cause Firestore setDoc to throw errors
function cleanForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

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
    const sanitized = cleanForFirestore(order);
    const orderRef = doc(db, "orders", sanitized.id);
    await setDoc(orderRef, {
      ...sanitized,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    console.log("🔥 [Firestore] Sipariş buluta senkronize edildi:", sanitized.id);
    return true;
  } catch (e) {
    console.error("Firestore sipariş kaydetme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreOrders(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, onSnapshot } = ctx;
    try {
      // Direct collection snapshot avoids index errors and works on any collection state
      const collRef = collection(db, "orders");
      unsubscribe = onSnapshot(collRef, (snapshot) => {
        const orders = [];
        snapshot.forEach(d => {
          orders.push({ id: d.id, ...d.data() });
        });
        // Client-side sort: newest orders first
        orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(orders);
      }, (error) => {
        console.error("Firestore sipariş dinleme hatası (Kuralları kontrol ediniz):", error);
      });
    } catch (e) {
      console.error("Firestore sipariş dinleyici hatası:", e);
    }
  }).catch((e) => console.warn("Firestore bağlantı hatası:", e));

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

// =================== 2. RESTORAN AYARLARI (AÇIK/KAPALI, ÇALIŞMA SAATLERİ) ===================

export async function syncRestaurantSettingsToFirestore(settings) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const clean = cleanForFirestore(settings);
    const settingsRef = doc(db, "settings", "restaurant");
    await setDoc(settingsRef, {
      ...clean,
      _updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("🔥 [Firestore] Restoran ayarları buluta kaydedildi:", clean);
    return true;
  } catch (e) {
    console.error("Firestore ayar kaydetme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreSettings(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, doc, onSnapshot } = ctx;
    try {
      const settingsRef = doc(db, "settings", "restaurant");
      unsubscribe = onSnapshot(settingsRef, (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      }, (error) => {
        console.warn("Firestore ayar dinleme:", error);
      });
    } catch (e) {
      console.warn("Firestore ayar dinleyici:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

export async function getRestaurantSettingsFromFirestore() {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return null;
    const { db, doc, getDoc } = ctx;
    const snap = await getDoc(doc(db, "settings", "restaurant"));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (e) {
    return null;
  }
}

// =================== 3. MÜŞTERİ YORUMLARI (REVIEWS) ===================

export async function syncReviewToFirestore(review) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const clean = cleanForFirestore(review);
    const reviewId = String(clean.id || Date.now());
    const reviewRef = doc(db, "reviews", reviewId);
    await setDoc(reviewRef, {
      ...clean,
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
    const { db, collection, onSnapshot } = ctx;
    try {
      const collRef = collection(db, "reviews");
      unsubscribe = onSnapshot(collRef, (snapshot) => {
        const reviews = [];
        snapshot.forEach(d => {
          reviews.push({ id: d.id, ...d.data() });
        });
        reviews.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        callback(reviews);
      }, (error) => {
        console.warn("Firestore yorum dinleme hatası:", error);
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

// =================== 4. MÜŞTERİLER (CUSTOMERS) ===================

export async function syncCustomerToFirestore(customer) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const clean = cleanForFirestore(customer);
    const rawKey = clean.phone || clean.email || clean.uid || `cust-${Date.now()}`;
    const key = String(rawKey).replace(/[\/\#\$\[\]]/g, '_');
    const custRef = doc(db, "customers", key);
    await setDoc(custRef, {
      ...clean,
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
    const key = String(phone).replace(/[\/\#\$\[\]]/g, '_');
    await deleteDoc(doc(db, "customers", key));
    return true;
  } catch (e) {
    console.warn("Firestore müşteri silme:", e);
    return false;
  }
}

// =================== 5. STOK (STOCK) ===================

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

// =================== 5.1 GİDERLER & MUHASEBE (EXPENSES) ===================

export async function syncExpenseToFirestore(expense) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const clean = cleanForFirestore(expense);
    const expId = String(clean.id || `exp-${Date.now()}`);
    const expRef = doc(db, "expenses", expId);
    await setDoc(expRef, {
      ...clean,
      id: expId,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore gider kaydetme:", e);
    return false;
  }
}

export async function deleteExpenseFromFirestore(expenseId) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, deleteDoc } = ctx;
    await deleteDoc(doc(db, "expenses", String(expenseId)));
    return true;
  } catch (e) {
    console.warn("Firestore gider silme:", e);
    return false;
  }
}

export function subscribeFirestoreExpenses(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, onSnapshot } = ctx;
    try {
      const collRef = collection(db, "expenses");
      unsubscribe = onSnapshot(collRef, (snapshot) => {
        const list = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        callback(list);
      }, (error) => {
        console.warn("Firestore gider dinleme hatası:", error);
      });
    } catch (e) {
      console.warn("Firestore gider dinleyici hatası:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

export async function getExpensesFromFirestore() {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return [];
    const { db, collection, getDocs } = ctx;
    const snap = await getDocs(collection(db, "expenses"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return list;
  } catch (e) {
    console.warn("Firestore giderler çekilemedi:", e);
    return [];
  }
}

// =================== 6. GOOGLE AUTHENTICATION ===================


export async function signInWithGoogle() {
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, signInWithRedirect, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    let app;
    const apps = getApps();
    if (apps && apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }

    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Redirect ile giriş — sayfa Google'a yönlenecek, dönünce getGoogleRedirectResult çağrılacak
    await signInWithRedirect(auth, provider);
    return { ok: false, redirecting: true };
  } catch (error) {
    console.warn("Firebase Google Sign-In hatası:", error);
    let errorMsg = 'Google ile giriş yapılamadı.';
    if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
      errorMsg = 'Yetkisiz Alan Adı: Firebase Console > Authentication > Authorized Domains\'e alan adınızı ekleyin.';
    } else if (error.message) {
      errorMsg = error.message;
    }
    return { ok: false, error: errorMsg, code: error.code };
  }
}

export async function getGoogleRedirectResult() {
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth, getRedirectResult } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    let app;
    const apps = getApps();
    if (apps && apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }

    const auth = getAuth(app);
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return { ok: false };

    const user = result.user;
    return {
      ok: true,
      user: {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Google Kullanıcısı',
        email: user.email || '',
        phone: user.phoneNumber || '',
        photoURL: user.photoURL || '',
        authProvider: 'google'
      }
    };
  } catch (error) {
    console.warn("Google redirect result hatası:", error);
    if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
      return { ok: false, error: 'Yetkisiz Alan Adı: Firebase Console > Authentication > Authorized Domains\'e alan adınızı ekleyin.' };
    }
    return { ok: false };
  }
}

// =================== 7. CANLI ZİYARETÇİ & AKTİF KULLANICI TAKİBİ (PRESENCE) ===================

let currentSessionId = null;
function getSessionId() {
  if (currentSessionId) return currentSessionId;
  try {
    let s = sessionStorage.getItem('pita_session_id');
    if (!s) {
      s = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('pita_session_id', s);
    }
    currentSessionId = s;
    return s;
  } catch (e) {
    currentSessionId = 'sess_' + Date.now();
    return currentSessionId;
  }
}

// Presence için anlık yerel kanal (aynı tarayıcı sekmeleri arasında 0ms gecikme)
let presenceChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    presenceChannel = new BroadcastChannel('pita_mutfak_presence_ch');
  }
} catch (e) {}

export async function pingPresence(user = null) {
  try {
    const hash = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';
    
    // Admin paneli ve Kurye paneli açıkken işletme personeli ziyaretçi/müşteri olarak sayılmaz
    if (hash.includes('admin') || hash.includes('kurye') || hash.includes('courier')) {
      return false;
    }

    const sid = getSessionId();
    let viewName = 'Menüde';


    const presenceData = {
      id: sid,
      lastSeen: Date.now(),
      name: user ? (user.name || 'Müşteri') : 'Misafir',
      email: user ? (user.email || '') : '',
      phone: user ? (user.phone || '') : '',
      isLoggedIn: !!user,
      view: viewName,
      _updatedAt: new Date().toISOString()
    };

    // Aynı cihaz sekmelerine anında bildir
    if (presenceChannel) {
      try {
        presenceChannel.postMessage({ type: 'PRESENCE_PING', data: presenceData });
      } catch (e) {}
    }

    // Firestore bulut veritabanına yaz
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const presenceRef = doc(db, "presence", sid);
    await setDoc(presenceRef, presenceData, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
}

export async function removePresence() {
  try {
    const sid = getSessionId();
    
    // Aynı cihaz sekmelerine anında silindiğini bildir
    if (presenceChannel) {
      try {
        presenceChannel.postMessage({ type: 'PRESENCE_REMOVE', id: sid });
      } catch (e) {}
    }

    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, deleteDoc } = ctx;
    const presenceRef = doc(db, "presence", sid);
    await deleteDoc(presenceRef);
    return true;
  } catch (e) {
    return false;
  }
}

// subscribePresence — { loggedIn: [...], guests: [...] } objesi döndürür
// Sayfa yenilemeye ASLA gerek kalmadan anlık ve otomatik güncellenir
export function subscribePresence(callback) {
  let unsubscribeFirestore = () => {};
  const activeSessionsMap = new Map();

  function evaluateAndEmit() {
    const now = Date.now();
    const cutoff = now - (35 * 1000); // Son 35 saniye içinde aktif olanlar
    const loggedIn = [];
    const guests = [];

    activeSessionsMap.forEach((data, id) => {
      if (!data || !data.lastSeen || data.lastSeen < cutoff) {
        activeSessionsMap.delete(id);
        return;
      }
      if (data.isLoggedIn) {
        loggedIn.push(data);
      } else {
        guests.push(data);
      }
    });

    callback({ loggedIn, guests });
  }

  // 1. Yerel BroadcastChannel Dinleyici (Aynı tarayıcıda 0ms tepki)
  const handleChannelMsg = (event) => {
    const msg = event?.data;
    if (!msg) return;
    if (msg.type === 'PRESENCE_PING' && msg.data) {
      activeSessionsMap.set(msg.data.id, msg.data);
      evaluateAndEmit();
    } else if (msg.type === 'PRESENCE_REMOVE' && msg.id) {
      activeSessionsMap.delete(msg.id);
      evaluateAndEmit();
    }
  };

  if (presenceChannel) {
    presenceChannel.addEventListener('message', handleChannelMsg);
  }

  // 2. Firestore Cloud Dinleyici (Farklı cihazlar ve uzak kullanıcılar için)
  getFirestoreContext().then(ctx => {
    if (!ctx || !ctx.db) return;
    const { db, collection, onSnapshot } = ctx;
    const colRef = collection(db, "presence");
    unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
      activeSessionsMap.clear();
      snapshot.forEach(d => {
        const data = d.data();
        if (data && data.id) {
          activeSessionsMap.set(data.id, data);
        }
      });
      evaluateAndEmit();
    }, (err) => {
      console.warn("Presence subscription error:", err);
    });
  });

  // 3. Otomatik Zamanlayıcı: Sekme kapanınca ya da sinyal kesilince
  // sayfa yenilemeye gerek kalmadan 2 saniyede bir süresi dolanları anında temizler
  const autoCleanupTimer = setInterval(() => {
    evaluateAndEmit();
  }, 2000);

  return () => {
    if (typeof unsubscribeFirestore === 'function') {
      try { unsubscribeFirestore(); } catch (e) {}
    }
    if (presenceChannel) {
      try { presenceChannel.removeEventListener('message', handleChannelMsg); } catch (e) {}
    }
    clearInterval(autoCleanupTimer);
  };
}

