// Pita Mutfak - Kurye Teslimat & 8 Haneli Kod Doğrulama Paneli
import { orderService, formatDeliveryCode } from '../services/orderService.js';

export function renderCourierPanel(container, state, onStateChange) {
  const orders = orderService.getOrders();
  const courierFilter = state.courierFilter || 'active'; // 'active' | 'completed'

  // Kuryenin teslim edeceği aktif siparişler: SADECE admin "Yola Çıkar" dediğinde (on_the_way)
  const activeDeliveries = orders.filter(o => o.status === 'on_the_way');
  const completedDeliveries = orders.filter(o => o.status === 'delivered');

  container.innerHTML = `
    <div class="min-h-screen bg-[#F0F4F2] text-[#121212] pb-24">
      
      <!-- Kurye Üst Barı -->
      <header class="bg-[#121212] text-white sticky top-0 z-30 shadow-md">
        <div class="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-[#06C167] text-white flex items-center justify-center font-black text-xl shadow-md">
              🛵
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-base font-black tracking-tight">Kurye Paneli</h1>
                <span class="bg-[#06C167] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Pita Kurye</span>
              </div>
              <p class="text-[11px] text-gray-400">8 Haneli Kod Doğrulama Sistemi</p>
            </div>
          </div>

          <!-- Kurye Durumu -->
          <div class="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
            <span class="w-2.5 h-2.5 rounded-full bg-[#06C167] animate-ping"></span>
            <span class="text-xs font-bold text-gray-200">Çevrimiçi</span>
          </div>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-4 pt-4">
        
        <!-- Özet Sayaçlar ve Sekmeler -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <button 
            id="courier-tab-active" 
            class="p-4 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between
            ${courierFilter === 'active' 
              ? 'bg-white border-[#06C167] ring-2 ring-[#06C167]/20 shadow-sm' 
              : 'bg-white/70 border-gray-200 hover:bg-white text-gray-500'}"
          >
            <div>
              <span class="text-xs font-bold uppercase ${courierFilter === 'active' ? 'text-[#06C167]' : 'text-gray-400'}">Aktif Görevler</span>
              <div class="text-2xl font-black text-[#121212] mt-0.5">${activeDeliveries.length}</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
              📦
            </div>
          </button>

          <button 
            id="courier-tab-completed" 
            class="p-4 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between
            ${courierFilter === 'completed' 
              ? 'bg-white border-[#06C167] ring-2 ring-[#06C167]/20 shadow-sm' 
              : 'bg-white/70 border-gray-200 hover:bg-white text-gray-500'}"
          >
            <div>
              <span class="text-xs font-bold uppercase ${courierFilter === 'completed' ? 'text-[#06C167]' : 'text-gray-400'}">Teslim Edilenler</span>
              <div class="text-2xl font-black text-[#06C167] mt-0.5">${completedDeliveries.length}</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-[#06C167] flex items-center justify-center text-lg font-bold">
              ✅
            </div>
          </button>
        </div>

        <!-- ================= AKTİF TESLİMATLAR ================= -->
        ${courierFilter === 'active' ? `
          <div class="space-y-4">
            ${activeDeliveries.length === 0 ? `
              <div class="bg-white rounded-3xl p-10 text-center border border-gray-200 shadow-xs">
                <div class="text-5xl mb-3">🛵</div>
                <h3 class="font-extrabold text-base text-gray-800">Şu An Bekleyen Teslimat Yok</h3>
                <p class="text-xs text-gray-400 mt-1">Admin panelinden bir sipariş "Kurye Yolda" durumuna getirildiğinde buraya anında düşecektir.</p>
              </div>
            ` : activeDeliveries.map(delivery => renderActiveDeliveryCard(delivery, state)).join('')}
          </div>
        ` : ''}

        <!-- ================= TESLİM EDİLENLER LİSTESİ ================= -->
        ${courierFilter === 'completed' ? `
          <div class="space-y-3">
            ${completedDeliveries.length === 0 ? `
              <div class="bg-white rounded-3xl p-10 text-center border border-gray-200">
                <div class="text-4xl mb-2">📋</div>
                <p class="text-xs text-gray-500 font-medium">Henüz teslim edilmiş sipariş bulunmuyor.</p>
              </div>
            ` : completedDeliveries.map(del => `
              <div class="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-xs text-gray-800">#${del.id}</span>
                    <span class="bg-emerald-100 text-[#06C167] text-[10px] font-bold px-2 py-0.5 rounded-full">Teslim Edildi</span>
                  </div>
                  <h4 class="font-extrabold text-sm text-[#121212] mt-1">${del.customerName}</h4>
                  <p class="text-xs text-gray-500 line-clamp-1">${del.deliveryAddress || del.tableNumber}</p>
                  <p class="text-[11px] text-gray-400 mt-0.5">Doğrulanan Kod: <span class="font-mono font-bold text-gray-700">${formatDeliveryCode(del.deliveryCode)}</span></p>
                </div>
                <div class="text-right">
                  <span class="text-sm font-black text-[#06C167]">₺${del.totalAmount}</span>
                  <span class="text-[10px] text-gray-400 block">${del.deliveredTimeFormatted || del.orderTimeFormatted}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

      </main>

    </div>
  `;

  attachCourierEventListeners(container, state, onStateChange);
}

// Aktif Teslimat Kartı (8 Haneli Kod Giriş Alanı ile Birlikte)
function renderActiveDeliveryCard(delivery, state) {
  const isOutForDelivery = delivery.status === 'on_the_way';
  const encodedAddress = encodeURIComponent(delivery.deliveryAddress || '');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const verificationResult = state.verificationResults && state.verificationResults[delivery.id];

  return `
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${isOutForDelivery ? 'ring-2 ring-purple-500/30' : ''}">
      
      <!-- Üst Şerit -->
      <div class="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div class="flex items-center gap-2">
          <span class="font-mono font-black text-sm text-[#121212]">#${delivery.id}</span>
          <span class="text-xs text-gray-400 font-medium">• ${delivery.orderTimeFormatted}</span>
        </div>
        <span class="text-xs font-black px-3 py-1 rounded-full ${isOutForDelivery ? 'bg-purple-100 text-purple-800 animate-pulse' : 'bg-blue-100 text-blue-800'}">
          ${isOutForDelivery ? '🛵 Dağıtımda (Yolda)' : '🍳 Mutfakta Hazırlanıyor'}
        </span>
      </div>

      <!-- Müşteri ve İletişim Bilgileri -->
      <div class="p-5 space-y-4">
        
        <div>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Müşteri</span>
          <h3 class="text-lg font-black text-[#121212]">${delivery.customerName}</h3>
        </div>

        <!-- Hızlı Arama ve Harita Butonları -->
        <div class="grid grid-cols-2 gap-2">
          <a 
            href="tel:${delivery.customerPhone}" 
            class="flex items-center justify-center gap-2 bg-[#E8F8EE] hover:bg-[#06C167] text-[#06C167] hover:text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-2xs"
          >
            <span>📞</span>
            <span>Müşteriyi Ara</span>
          </a>

          <a 
            href="${mapsUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-2xs"
          >
            <span>📍</span>
            <span>Haritada Aç</span>
          </a>
        </div>

        <!-- Adres ve Not -->
        <div class="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-xs">
          <div class="font-semibold text-gray-800 leading-relaxed">
            <span class="font-bold text-gray-900">Adres:</span> ${delivery.deliveryAddress || delivery.tableNumber}
          </div>
          ${delivery.orderNote ? `
            <div class="text-amber-800 font-medium italic mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
              ⚠️ Not: "${delivery.orderNote}"
            </div>
          ` : ''}
        </div>

        <!-- Sipariş Kalemleri ve Tahsil Edilecek Tutar -->
        <div class="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
          <div>
            <span class="text-gray-500 font-medium">Sipariş İçeriği:</span>
            <span class="font-bold text-gray-800">${delivery.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</span>
          </div>
          <div class="text-right pl-3">
            <span class="text-[10px] text-gray-400 block">${delivery.paymentMethod === 'cash' ? '💵 Kapıda Nakit Tahsilat' : '🏦 EFT/Havale ile Ödendi'}</span>
            <span class="text-base font-black text-[#06C167]">₺${delivery.totalAmount}</span>
          </div>
        </div>

        <!-- ================= 8 HANELİ KOD DOĞRULAMA MOTORU ================= -->
        <div class="bg-gradient-to-br from-[#F5FAF6] to-[#E9F7EE] border-2 border-[#06C167]/60 rounded-2xl p-4 sm:p-5 mt-4 shadow-sm">
          
          <div class="flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-lg bg-[#06C167] text-white flex items-center justify-center text-xs font-black">
              🔒
            </span>
            <h4 class="text-xs font-black text-gray-900 uppercase tracking-wider">
              Müşteri 8 Haneli Teslimat Kodu
            </h4>
          </div>

          <p class="text-xs text-gray-600 mb-3 leading-relaxed">
            Paketi müşteriye teslim ederken müşterinin ekranında görünen <strong>8 haneli güvenlik kodunu</strong> alıp aşağıya giriniz:
          </p>

          <!-- Kod Giriş Formu -->
          <div class="space-y-3">
            <div class="relative">
              <input 
                type="text" 
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="9"
                data-verify-code-input="${delivery.id}" 
                placeholder="Örn: 5829 4103" 
                class="w-full text-center font-mono font-black text-xl sm:text-2xl tracking-widest px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/20 outline-none bg-white shadow-inner"
              />
            </div>

            <!-- Doğrulama Geri Bildirim Mesajı -->
            ${verificationResult ? `
              <div class="p-3 rounded-xl text-xs font-bold transition ${verificationResult.success ? 'bg-emerald-100 text-[#06C167]' : 'bg-red-100 text-red-700'}">
                ${verificationResult.message}
              </div>
            ` : ''}

            <!-- Doğrulama Butonu -->
            <button 
              data-verify-btn="${delivery.id}" 
              class="w-full bg-[#06C167] hover:bg-[#05a557] active:scale-98 text-white font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-[#06C167]/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Kodu Doğrula ve Teslimatı Tamamla</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  `;
}

// Event Listeners Bağlayıcı
function attachCourierEventListeners(container, state, onStateChange) {
  
  // Sekme Değişimi (Aktif vs Tamamlananlar)
  const tabActive = container.querySelector('#courier-tab-active');
  if (tabActive) {
    tabActive.addEventListener('click', () => onStateChange({ courierFilter: 'active' }));
  }

  const tabCompleted = container.querySelector('#courier-tab-completed');
  if (tabCompleted) {
    tabCompleted.addEventListener('click', () => onStateChange({ courierFilter: 'completed' }));
  }

  // 8 Haneli Kod Input Formatlayıcı (Kullanıcı yazarken otomatik boşluk koyma)
  container.querySelectorAll('[data-verify-code-input]').forEach(input => {
    input.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 8) val = val.slice(0, 8);
      if (val.length > 4) {
        e.target.value = `${val.slice(0, 4)} ${val.slice(4)}`;
      } else {
        e.target.value = val;
      }
    });

    // Enter tuşuna basıldığında doğrula
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const orderId = input.getAttribute('data-verify-code-input');
        const verifyBtn = container.querySelector(`[data-verify-btn="${orderId}"]`);
        if (verifyBtn) verifyBtn.click();
      }
    });
  });

  // Kodu Doğrula ve Teslimatı Tamamla Butonları
  container.querySelectorAll('[data-verify-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-verify-btn');
      const inputEl = container.querySelector(`[data-verify-code-input="${orderId}"]`);
      if (!inputEl) return;

      const enteredCode = inputEl.value;
      const result = orderService.verifyAndDeliver(orderId, enteredCode);

      const currentResults = state.verificationResults || {};
      currentResults[orderId] = result;

      onStateChange({ verificationResults: currentResults });

      if (result.success) {
        // 1.5 saniye sonra tebrik mesajını kaldırıp listeyi temizle
        setTimeout(() => {
          delete currentResults[orderId];
          onStateChange({ verificationResults: currentResults });
        }, 1800);
      }
    });
  });

}
