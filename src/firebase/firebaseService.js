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

let appInstance = null;
async function getFirebaseApp() {
  if (appInstance) return appInstance;
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const apps = getApps();
  if (apps && apps.length > 0) {
    appInstance = apps[0];
  } else {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

async function getFirestoreContext() {
  if (dbInstance && firestoreLib) {
    return { db: dbInstance, ...firestoreLib };
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const app = await getFirebaseApp();
      const fs = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      dbInstance = fs.getFirestore(app);
      firestoreLib = fs;
      console.log("🔥 [Firebase] Pita Mutfak Cloud Firestore bağlantısı aktif!");
      return { db: dbInstance, ...firestoreLib };
    } catch (err) {
      console.warn("⚠️ [Firebase] Bulut bağlantısı kurulamadı (yerel mod aktif):", err);
      initPromise = null;
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
    const { db, doc, setDoc, collection, getDocs, deleteDoc } = ctx;
    const clean = cleanForFirestore(customer);

    // Normalize phone: strip non-digits, take last 10 digits
    const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
    const custPhone = normPhone(clean.phone);
    const custEmail = (clean.email || '').toLowerCase().trim();

    // 1. Search all existing customers for a match by email or phone
    let existingDoc = null;
    let existingData = null;
    const duplicateDocs = []; // docs to delete after merge

    try {
      const snap = await getDocs(collection(db, "customers"));
      snap.forEach(d => {
        const data = d.data();
        const docPhone = normPhone(data.phone);
        const docEmail = (data.email || '').toLowerCase().trim();

        const phoneMatch = custPhone.length >= 7 && docPhone.length >= 7 && custPhone === docPhone;
        const emailMatch = custEmail && docEmail && custEmail === docEmail;

        if (phoneMatch || emailMatch) {
          if (!existingDoc) {
            // First match — this is the record we'll update
            existingDoc = d;
            existingData = data;
          } else {
            // Additional matches — these are duplicates to clean up
            duplicateDocs.push(d);
          }
        }
      });
    } catch (e) {
      console.warn("Firestore müşteri arama hatası:", e);
    }

    // 2. Merge fields: keep the most complete data
    let merged = { ...clean };
    if (existingData) {
      merged = {
        ...existingData,
        ...clean,
        // Preserve non-empty fields from existing record
        name: clean.name || existingData.name || '',
        email: clean.email || existingData.email || '',
        phone: clean.phone || existingData.phone || '',
        uid: clean.uid || existingData.uid || '',
        photoURL: clean.photoURL || existingData.photoURL || '',
        // Accumulate order stats
        total_orders: Math.max(Number(existingData.total_orders) || 0, Number(clean.total_orders) || 0),
        total_spent: Math.max(Number(existingData.total_spent) || 0, Number(clean.total_spent) || 0),
        // Keep the earliest registration date
        registered_at: existingData.registered_at || clean.registered_at || new Date().toISOString(),
        // Preserve verified status
        phoneVerified: clean.phoneVerified || existingData.phoneVerified || false,
        is_verified: clean.is_verified || existingData.is_verified || 0
      };
    }

    // 3. Determine canonical key: prefer phone, then email, then uid
    const mergedPhone = normPhone(merged.phone);
    const mergedEmail = (merged.email || '').toLowerCase().trim();
    const rawKey = (mergedPhone.length >= 7 ? merged.phone : null) || mergedEmail || merged.uid || `cust-${Date.now()}`;
    const key = String(rawKey).replace(/[\/\#\$\[\]]/g, '_');

    // 4. Write the merged record
    const custRef = doc(db, "customers", key);
    await setDoc(custRef, {
      ...merged,
      _updatedAt: new Date().toISOString()
    }, { merge: true });

    // 5. Clean up: delete old doc if it had a different key, plus any duplicates
    if (existingDoc && existingDoc.id !== key) {
      try { await deleteDoc(doc(db, "customers", existingDoc.id)); } catch (e) {}
    }
    for (const dupDoc of duplicateDocs) {
      if (dupDoc.id !== key) {
        try { await deleteDoc(doc(db, "customers", dupDoc.id)); } catch (e) {}
      }
    }

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

export async function deleteCustomerFromFirestore(identifier) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, deleteDoc, collection, getDocs } = ctx;
    if (!identifier) return false;

    const key = String(identifier).replace(/[\/\#\$\[\]]/g, '_');
    try {
      await deleteDoc(doc(db, "customers", key));
    } catch (e) {}

    // İlgili müşteriyi diğer alanlarla da (telefon, e-posta, id) kontrol edip temizle
    try {
      const snap = await getDocs(collection(db, "customers"));
      snap.forEach(async (d) => {
        const data = d.data();
        if (d.id === key || d.id === identifier || data.phone === identifier || data.email === identifier || data.id === identifier) {
          try {
            await deleteDoc(doc(db, "customers", d.id));
          } catch (err) {}
        }
      });
    } catch (e) {}

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

// =================== 5.2 GÜN SONU KAPANIPLARI & Z-RAPORU ===================

export async function syncDailyClosingToFirestore(closing) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const clean = cleanForFirestore(closing);
    const closeId = String(clean.date || clean.id || `close-${Date.now()}`);
    const ref = doc(db, "daily_closings", closeId);
    await setDoc(ref, {
      ...clean,
      id: closeId,
      _syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Firestore gün sonu kaydetme hatası:", e);
    return false;
  }
}

export function subscribeFirestoreDailyClosings(callback) {
  let unsubscribe = null;
  getFirestoreContext().then((ctx) => {
    if (!ctx || !ctx.db) return;
    const { db, collection, onSnapshot } = ctx;
    try {
      const collRef = collection(db, "daily_closings");
      unsubscribe = onSnapshot(collRef, (snapshot) => {
        const list = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        callback(list);
      }, (error) => {
        console.warn("Firestore gün sonu dinleme:", error);
      });
    } catch (e) {
      console.warn("Firestore gün sonu dinleyici:", e);
    }
  }).catch(() => {});

  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) {}
    }
  };
}

export async function getDailyClosingsFromFirestore() {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return [];
    const { db, collection, getDocs } = ctx;
    const snap = await getDocs(collection(db, "daily_closings"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return list;
  } catch (e) {
    console.warn("Firestore gün sonu listesi alınamadı:", e);
    return [];
  }
}

// =================== 6. GOOGLE AUTHENTICATION ===================

export async function signInWithGoogle() {
  try {
    const app = await getFirebaseApp();
    const { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // 1. Önce Hızlı Popup ile Giriş Dene (Sayfayı terk etmez, sepeti korur, iPad ve mobil tarayıcılarda hızlıdır)
    try {
      const result = await signInWithPopup(auth, provider);
      if (result && result.user) {
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
      }
    } catch (popupErr) {
      console.warn("Google popup girişi açılamadı, yönlendirme (redirect) deneniyor:", popupErr);
      if (popupErr.code === 'auth/unauthorized-domain' || popupErr.message?.includes('unauthorized-domain')) {
        return {
          ok: false,
          error: 'Yetkisiz Alan Adı: Firebase Console > Authentication > Authorized Domains\'e alan adınızı ekleyin.',
          code: popupErr.code
        };
      }
      if (popupErr.code === 'auth/popup-closed-by-user') {
        return { ok: false, error: 'Google giriş penceresi kapatıldı.' };
      }
      // Popup engellendiyse redirect metoduna geç
      await signInWithRedirect(auth, provider);
      return { ok: false, redirecting: true };
    }

    return { ok: false, error: 'Giriş yapılamadı.' };
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
    const app = await getFirebaseApp();
    const { getAuth, getRedirectResult } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

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

// Oturum Değişikliklerini Dinleme (Firebase Auth Persistent State)
export function initAuthListener(onUserChanged) {
  try {
    getFirebaseApp().then((app) => {
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js").then(({ getAuth, onAuthStateChanged }) => {
        const auth = getAuth(app);
        onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser && typeof onUserChanged === 'function') {
            const profile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Google Kullanıcısı',
              email: firebaseUser.email || '',
              phone: firebaseUser.phoneNumber || '',
              photoURL: firebaseUser.photoURL || '',
              auth_provider: 'google'
            };
            onUserChanged(profile);
          }
        });
      }).catch(() => {});
    }).catch(() => {});
  } catch (e) {}
}

// =================== 6.1. FIREBASE PHONE AUTHENTICATION (reCAPTCHA & SMS) ===================

export function formatPhoneNumberForFirebase(phone) {
  if (!phone) return '';
  // Rakam harici karakterleri temizle
  let cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  // 05xx -> 5xx
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  // 905xx (12 hane) -> +905xx
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  return '+90' + cleaned;
}

export function resetRecaptchaVerifier() {
  try {
    if (window.recaptchaVerifier) {
      if (typeof window.recaptchaVerifier.clear === 'function') {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
  } catch (e) {
    console.warn("reCAPTCHA temizleme uyarısı:", e);
  }
}

export async function getRecaptchaVerifier(containerId = 'recaptcha-container') {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const app = await getFirebaseApp();
  const { getAuth, RecaptchaVerifier } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const auth = getAuth(app);

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('🛡️ [Firebase] reCAPTCHA doğrulaması tamamlandı.');
    },
    'expired-callback': () => {
      console.warn('⚠️ [Firebase] reCAPTCHA süresi doldu, sıfırlanıyor.');
      resetRecaptchaVerifier();
    }
  });

  return window.recaptchaVerifier;
}

export async function sendFirebasePhoneVerification(phone) {
  try {
    const formatted = formatPhoneNumberForFirebase(phone);
    if (!formatted || formatted.length < 12) {
      return { ok: false, error: 'Lütfen geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX).' };
    }

    const app = await getFirebaseApp();
    const { getAuth, signInWithPhoneNumber } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const auth = getAuth(app);

    const appVerifier = await getRecaptchaVerifier();

    console.log(`📱 [Firebase Auth] SMS kodu talep ediliyor: ${formatted}`);
    const confirmationResult = await signInWithPhoneNumber(auth, formatted, appVerifier);
    window.confirmationResult = confirmationResult;

    return {
      ok: true,
      formattedPhone: formatted,
      message: `${formatted} numarasına SMS ile 6 haneli doğrulama kodu gönderildi.`
    };
  } catch (error) {
    console.warn("⚠️ Firebase Phone Auth hatası:", error);
    resetRecaptchaVerifier();

    let errorMsg = 'SMS kodu gönderilemedi.';
    if (error.code === 'auth/invalid-phone-number') {
      errorMsg = 'Geçersiz telefon numarası formatı. Lütfen kontrol ediniz.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = 'Çok fazla kod talebinde bulunuldu. Lütfen biraz bekleyiniz.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMsg = 'SMS kotası aşıldı. Lütfen daha sonra tekrar deneyiniz.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMsg = 'Güvenlik kontrolü (reCAPTCHA) başarısız oldu. Lütfen tekrar deneyiniz.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMsg = 'Firebase Console > Authentication altında Telefon ile Giriş (Phone Auth) sağlayıcısı etkinleştirilmemiş.';
    } else if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
      errorMsg = 'Yetkisiz Alan Adı: Firebase Console > Authentication > Authorized Domains\'e alan adınızı ekleyin.';
    } else if (error.message) {
      errorMsg = error.message;
    }

    return {
      ok: false,
      error: errorMsg,
      code: error.code
    };
  }
}

export async function confirmFirebasePhoneCode(code) {
  try {
    if (!window.confirmationResult) {
      return { ok: false, error: 'Aktif bir SMS doğrulama oturumu bulunamadı. Lütfen tekrar kod talep ediniz.' };
    }

    const cleanCode = String(code || '').trim();
    if (!cleanCode || cleanCode.length < 6) {
      return { ok: false, error: 'Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.' };
    }

    const result = await window.confirmationResult.confirm(cleanCode);
    const user = result.user; // Telefon başarıyla doğrulandı!

    return {
      ok: true,
      user: {
        uid: user.uid,
        name: user.displayName || 'Pita Müşterisi',
        phone: user.phoneNumber,
        phoneVerified: true,
        auth_provider: 'phone'
      }
    };
  } catch (error) {
    console.warn("⚠️ Firebase Phone Code Onay Hatası:", error);

    let errorMsg = 'Doğrulama kodu hatalı!';
    if (error.code === 'auth/invalid-verification-code') {
      errorMsg = 'Girdiğiniz 6 haneli doğrulama kodu hatalı. Lütfen kontrol ediniz.';
    } else if (error.code === 'auth/code-expired') {
      errorMsg = 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyiniz.';
    } else if (error.message) {
      errorMsg = error.message;
    }

    return {
      ok: false,
      error: errorMsg,
      code: error.code
    };
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

    // Kullanıcı parametre olarak verilmemişse yerel hafızadan çek
    let activeUser = user;
    if (!activeUser && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('pita_current_user');
        if (raw) activeUser = JSON.parse(raw);
      } catch (e) {}
    }

    const sid = getSessionId();
    let viewName = 'Menüde 🍽️';
    if (typeof document !== 'undefined') {
      if (document.querySelector('#checkout-modal-backdrop') || document.querySelector('#checkout-form')) {
        viewName = 'Sipariş Veriyor 💳';
      } else if (document.querySelector('#cart-drawer-backdrop') || document.querySelector('#cart-drawer')) {
        viewName = 'Sepette 🛒';
      } else if (document.querySelector('#tracking-modal') || document.querySelector('#active-order-banner')) {
        viewName = 'Sipariş Takibinde 🛵';
      }
    }

    const isLogged = !!(activeUser && (activeUser.name || activeUser.email || activeUser.phone || activeUser.uid));

    const presenceData = {
      id: sid,
      lastSeen: Date.now(),
      name: isLogged ? (activeUser.name || activeUser.email?.split('@')[0] || 'Müşteri') : 'Misafir',
      email: isLogged ? (activeUser.email || '') : '',
      phone: isLogged ? (activeUser.phone || '') : '',
      isLoggedIn: isLogged,
      view: viewName,
      _updatedAt: new Date().toISOString()
    };

    // 1. Aynı cihaz sekmelerine anında bildir (0ms gecikme)
    if (presenceChannel) {
      try {
        presenceChannel.postMessage({ type: 'PRESENCE_PING', data: presenceData });
      } catch (e) {}
    }

    // 2. Python server.py varsa yerel ağ ve farklı tarayıcılar için anında senkronize et
    try {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presenceData)
      }).catch(() => {});
    } catch (e) {}

    // 3. Firestore bulut veritabanına yaz (Vercel & Canlı yayın)
    try {
      const ctx = await getFirestoreContext();
      if (ctx && ctx.db) {
        const { db, doc, setDoc } = ctx;
        const presenceRef = doc(db, "presence", sid);
        await setDoc(presenceRef, presenceData, { merge: true });
      }
    } catch (e) {}

    return true;
  } catch (e) {
    return false;
  }
}

export async function removePresence() {
  try {
    const sid = getSessionId();
    
    // 1. Aynı cihaz sekmelerine anında silindiğini bildir (0ms)
    if (presenceChannel) {
      try {
        presenceChannel.postMessage({ type: 'PRESENCE_REMOVE', id: sid });
      } catch (e) {}
    }

    // 2. Python server.py sunucusundan sil
    try {
      fetch(`/api/presence?id=${encodeURIComponent(sid)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}

    // 3. Firestore bulut veritabanından sil
    try {
      const ctx = await getFirestoreContext();
      if (ctx && ctx.db) {
        const { db, doc, deleteDoc } = ctx;
        const presenceRef = doc(db, "presence", sid);
        await deleteDoc(presenceRef);
      }
    } catch (e) {}

    return true;
  } catch (e) {
    return false;
  }
}

// subscribePresence — { loggedIn: [...], guests: [...] } objesi döndürür
// Sayfa yenilemeye ASLA gerek kalmadan ultra-hızlı ve anlık güncellenir
export function subscribePresence(callback) {
  let unsubscribeFirestore = () => {};
  const activeSessionsMap = new Map();
  let lastEmitFingerprint = '';

  function evaluateAndEmit() {
    const now = Date.now();
    // 45 saniye zaman aşımı: mobil arka plan, cihazlar arası saat farkı ve ağ gecikmesini güvenle tolere eder
    const cutoff = now - (45 * 1000);
    const loggedIn = [];
    const guests = [];

    activeSessionsMap.forEach((data, id) => {
      const lastActive = data.localReceivedAt || data.lastSeen || 0;
      if (!data || lastActive < cutoff) {
        activeSessionsMap.delete(id);
        return;
      }
      if (data.isLoggedIn) {
        loggedIn.push(data);
      } else {
        guests.push(data);
      }
    });

    // Parmak izi (fingerprint) kontrolü: Sadece üye veya misafir listesinde/durumunda değişiklik olunca callback tetikle
    const fp = loggedIn.map(u => `${u.id}:${u.name}:${u.view}`).sort().join('|') + '::' + guests.map(g => `${g.id}:${g.view}`).sort().join('|');
    if (fp !== lastEmitFingerprint) {
      lastEmitFingerprint = fp;
      callback({ loggedIn, guests });
    }
  }

  // 1. Yerel BroadcastChannel Dinleyici (Aynı tarayıcıda 0ms tepki)
  const handleChannelMsg = (event) => {
    const msg = event?.data;
    if (!msg) return;
    if (msg.type === 'PRESENCE_PING' && msg.data) {
      activeSessionsMap.set(msg.data.id, { ...msg.data, localReceivedAt: Date.now() });
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
  try {
    getFirestoreContext().then(ctx => {
      if (!ctx || !ctx.db) return;
      const { db, collection, onSnapshot } = ctx;
      const colRef = collection(db, "presence");
      unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
        const currentRemoteIds = new Set();
        snapshot.forEach(d => {
          const data = d.data();
          if (data && data.id) {
            currentRemoteIds.add(data.id);
            activeSessionsMap.set(data.id, { ...data, localReceivedAt: Date.now(), fromFirestore: true });
          }
        });
        // Firestore'dan silinen eski oturumları haritadan düşür
        activeSessionsMap.forEach((val, key) => {
          if (val && val.fromFirestore && !currentRemoteIds.has(key)) {
            activeSessionsMap.delete(key);
          }
        });
        evaluateAndEmit();
      }, (err) => {
        console.warn("Presence subscription error:", err);
      });
    }).catch(() => {});
  } catch (e) {}

  // 3. Yerel Sunucu Polling (/api/presence - server.py üzerinden çapraz cihaz desteği)
  const pollLocalServer = async () => {
    try {
      const res = await fetch('/api/presence');
      if (res.ok) {
        const json = await res.json();
        if (json && (Array.isArray(json.loggedIn) || Array.isArray(json.guests))) {
          const all = [...(json.loggedIn || []), ...(json.guests || [])];
          all.forEach(item => {
            if (item && item.id) {
              activeSessionsMap.set(item.id, { ...item, localReceivedAt: Date.now() });
            }
          });
          evaluateAndEmit();
        }
      }
    } catch (e) {}
  };
  pollLocalServer();
  const localPollTimer = setInterval(pollLocalServer, 4000);

  // 4. Otomatik Temizlik Zamanlayıcısı: 3 saniyede bir süresi dolanları temizle
  const autoCleanupTimer = setInterval(() => {
    evaluateAndEmit();
  }, 3000);

  return () => {
    if (typeof unsubscribeFirestore === 'function') {
      try { unsubscribeFirestore(); } catch (e) {}
    }
    if (presenceChannel) {
      try { presenceChannel.removeEventListener('message', handleChannelMsg); } catch (e) {}
    }
    clearInterval(localPollTimer);
    clearInterval(autoCleanupTimer);
  };
}

// =================== 8. CONTACT MESSAGES (MÜŞTERİ İLETİŞİM MESAJLARI) ===================

export async function sendContactMessageToFirestore(message) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc } = ctx;
    const sanitized = cleanForFirestore(message);
    await setDoc(doc(db, 'contact_messages', message.id), sanitized);
    return true;
  } catch (e) {
    console.warn('Contact message gönderme hatası:', e);
    return false;
  }
}

export async function getContactMessagesFromFirestore() {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return [];
    const { db, collection, getDocs, query, orderBy } = ctx;
    const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Contact messages getirme hatası:', e);
    return [];
  }
}

export async function updateContactMessageStatus(messageId, status) {
  try {
    const ctx = await getFirestoreContext();
    if (!ctx || !ctx.db) return false;
    const { db, doc, setDoc, getDoc } = ctx;
    const ref = doc(db, 'contact_messages', messageId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { ...snap.data(), status, updatedAt: new Date().toISOString() });
    }
    return true;
  } catch (e) {
    console.warn('Contact message status güncelleme hatası:', e);
    return false;
  }
}
