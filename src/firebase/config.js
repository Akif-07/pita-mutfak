// Pita Mutfak - Firebase Yapılandırması & Bulut Servisleri
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAw_K7jI57SHfBWXgVIYZOC1jvrxQKU6yQ",
  authDomain: "pita-mutfak.firebaseapp.com",
  projectId: "pita-mutfak",
  storageBucket: "pita-mutfak.firebasestorage.app",
  messagingSenderId: "744672149450",
  appId: "1:744672149450:web:74eb672741c0c63f27d933",
  measurementId: "G-8M4EKX87RH"
};

let app = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("🔥 [Firebase] Pita Mutfak Cloud Firestore & Auth başarıyla bağlandı!");
} catch (e) {
  console.warn("⚠️ [Firebase] Başlatılamadı veya çevrimdışı, yerel mod aktif:", e);
}

export { app, db, auth };
