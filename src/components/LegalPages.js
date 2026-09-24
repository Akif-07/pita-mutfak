// Pita Mutfak - Gizlilik Politikası & Hizmet Şartları Sayfaları
const BRAND_NAME = 'Pita Mutfak';
const BRAND_EMAIL = 'destek@pitamutfak.com';
const BRAND_WEBSITE = 'https://pita-mutfak.vercel.app';
const BRAND_PHONE = '+90 5XX XXX XX XX';
const LAST_UPDATE_DATE = '24 Eylül 2026';

const COMMON_STYLES = `
  <style>
    .legal-page {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F7F9F8;
      min-height: 100vh;
      color: #121212;
    }
    .legal-header {
      background: #0E1511;
      color: white;
      padding: 0;
    }
    .legal-header-inner {
      max-width: 860px;
      margin: 0 auto;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .legal-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
      background: #06C167;
    }
    .legal-logo img { width: 100%; height: 100%; object-fit: cover; }
    .legal-brand { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .legal-brand span { color: #06C167; }
    .legal-back-btn {
      margin-left: auto;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 8px 16px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .legal-back-btn:hover { background: rgba(255,255,255,0.18); }
    .legal-hero {
      background: linear-gradient(135deg, #0E1511 60%, #1A2E22);
      color: white;
      padding: 40px 24px 56px;
    }
    .legal-hero-inner {
      max-width: 860px;
      margin: 0 auto;
    }
    .legal-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(6,193,103,0.15);
      border: 1px solid rgba(6,193,103,0.3);
      color: #06C167;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 99px;
      margin-bottom: 16px;
    }
    .legal-title {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -1px;
      line-height: 1.2;
      margin: 0 0 10px;
    }
    .legal-subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin: 0;
    }
    .legal-body {
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }
    .legal-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .legal-card h2 {
      font-size: 18px;
      font-weight: 800;
      color: #121212;
      margin: 0 0 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legal-card h2 .section-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #E8F8EE;
      color: #06C167;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .legal-card p, .legal-card li {
      font-size: 14px;
      line-height: 1.75;
      color: #4b5563;
      margin: 0 0 10px;
    }
    .legal-card ul, .legal-card ol {
      padding-left: 20px;
      margin: 8px 0 10px;
    }
    .legal-card a { color: #06C167; text-decoration: none; font-weight: 600; }
    .legal-card a:hover { text-decoration: underline; }
    .legal-highlight {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      color: #166534;
      margin-top: 12px;
    }
    .legal-warning {
      background: #FFF7ED;
      border: 1px solid #FED7AA;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      color: #92400E;
      margin-top: 12px;
    }
    .legal-footer {
      background: #0E1511;
      color: #6b7280;
      text-align: center;
      padding: 24px;
      font-size: 12px;
    }
    .legal-footer a { color: #06C167; text-decoration: none; font-weight: 600; }
    @media (max-width: 640px) {
      .legal-title { font-size: 24px; }
      .legal-card { padding: 20px; border-radius: 16px; }
    }
  </style>
`;

export function renderPrivacyPolicy(container) {
  container.innerHTML = `
    <div class="legal-page">
      ${COMMON_STYLES}

      <header class="legal-header">
        <div class="legal-header-inner">
          <div class="legal-logo">
            <img src="./assets/logo_app.jpg" alt="Pita Mutfak Logo">
          </div>
          <div class="legal-brand">pita<span>mutfak</span></div>
          <a href="#/" class="legal-back-btn" id="legal-back-home">← Ana Sayfaya Dön</a>
        </div>
      </header>

      <div class="legal-hero">
        <div class="legal-hero-inner">
          <div class="legal-badge">
            <span>🔒</span>
            <span>Son Güncelleme: ${LAST_UPDATE_DATE}</span>
          </div>
          <h1 class="legal-title">Gizlilik Politikası</h1>
          <p class="legal-subtitle">
            Kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklıyoruz.<br>
            Bu politika, ${BRAND_NAME} web sitesini ve hizmetlerini kullanan tüm ziyaretçiler için geçerlidir.
          </p>
        </div>
      </div>

      <div class="legal-body">

        <div class="legal-card">
          <h2><span class="section-num">1</span> Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında <strong>${BRAND_NAME}</strong>,
            kişisel verilerinizin işlenmesinden sorumlu veri sorumlusudur.
          </p>
          <p><strong>İletişim:</strong> <a href="mailto:${BRAND_EMAIL}">${BRAND_EMAIL}</a></p>
          <p><strong>Web Sitesi:</strong> <a href="${BRAND_WEBSITE}" target="_blank">${BRAND_WEBSITE}</a></p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">2</span> Hangi Verileri Topluyoruz?</h2>
          <p>Hizmetimizi kullanırken aşağıdaki kişisel verilerinizi işleyebiliriz:</p>
          <ul>
            <li><strong>Kimlik Bilgileri:</strong> Ad, soyad ve Google hesabınızdaki görünen isim.</li>
            <li><strong>İletişim Bilgileri:</strong> Cep telefonu numarası ve e-posta adresi.</li>
            <li><strong>Sipariş Bilgileri:</strong> Sipariş içeriği, teslimat adresi, sipariş tarihi ve ödeme yöntemi.</li>
            <li><strong>Giriş Bilgileri:</strong> Google OAuth aracılığıyla oturum açılması durumunda Google tarafından paylaşılan profil bilgileri (ad, e-posta, profil fotoğrafı URL'si).</li>
            <li><strong>Cihaz ve Kullanım Verileri:</strong> IP adresi, tarayıcı türü, işletim sistemi, siteye erişim süresi ve gezinme verileri.</li>
            <li><strong>Telefon Doğrulama Verileri:</strong> SMS doğrulaması için kullanılan telefon numarası (Firebase Authentication aracılığıyla).</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">3</span> Verilerinizi Neden İşliyoruz?</h2>
          <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
          <ul>
            <li>Sipariş oluşturma, takip etme ve teslim sürecinin yönetimi.</li>
            <li>Müşteri kimliğinin doğrulanması ve hesap güvenliğinin sağlanması.</li>
            <li>Sipariş ile ilgili SMS ve bildirim gönderimi.</li>
            <li>Kullanıcı deneyimini iyileştirme ve kişiselleştirme.</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
            <li>Müşteri destek hizmetinin sunulması.</li>
          </ul>
          <div class="legal-highlight">
            ✅ Kişisel verileriniz yalnızca belirtilen amaçlar kapsamında ve gereği kadar işlenmektedir.
            Üçüncü taraflara pazarlama amacıyla satılmamaktadır.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">4</span> Verilerinizi Nasıl Saklıyoruz?</h2>
          <p>
            Kişisel verileriniz ağırlıklı olarak tarayıcınızın <strong>localStorage</strong> alanında (cihazınızda)
            ve <strong>Google Firebase Firestore</strong> bulut veritabanında şifreli biçimde saklanmaktadır.
          </p>
          <ul>
            <li>Firebase, Google'ın güvenlik standartlarına ve ISO 27001 sertifikasına uygun altyapı kullanmaktadır.</li>
            <li>Veriler yetkisiz erişime karşı şifreli kanallar (TLS/HTTPS) üzerinden iletilmektedir.</li>
            <li>Hesabınızı sildiğinizde veya tarayıcı önbelleğinizi temizlediğinizde yerel veriler silinir.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">5</span> Google OAuth ile Giriş</h2>
          <p>
            Sitemize Google hesabınızla giriş yapmanız durumunda, Google aşağıdaki verileri bizimle paylaşır:
          </p>
          <ul>
            <li>Adınız ve soyadınız</li>
            <li>E-posta adresiniz</li>
            <li>Profil fotoğrafınızın URL'si</li>
          </ul>
          <p>
            Bu bilgiler, hesabınızı oluşturmak ve sipariş geçmişinizi görüntülemek amacıyla kullanılır.
            Google'ın kendi gizlilik politikasına
            <a href="https://policies.google.com/privacy" target="_blank">buradan</a> ulaşabilirsiniz.
          </p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">6</span> Firebase ve Üçüncü Taraf Hizmetleri</h2>
          <p>Sitemizde aşağıdaki üçüncü taraf hizmetleri kullanılmaktadır:</p>
          <ul>
            <li><strong>Google Firebase Authentication:</strong> Kullanıcı doğrulama ve SMS kodları için.</li>
            <li><strong>Google Firebase Firestore:</strong> Gerçek zamanlı veri senkronizasyonu için.</li>
            <li><strong>Google reCAPTCHA:</strong> Bot saldırılarını önlemek için görünmez doğrulama aracı.</li>
            <li><strong>Vercel:</strong> Barındırma ve dağıtım hizmeti.</li>
            <li><strong>Unsplash:</strong> Ürün görselleri (anonim, kişisel veri içermez).</li>
            <li><strong>Google Fonts:</strong> Tipografi (anonim bağlantı isteği).</li>
          </ul>
          <div class="legal-warning">
            ⚠️ Bu üçüncü taraf hizmet sağlayıcıların kendi gizlilik politikaları ve veri işleme süreçleri
            bulunmaktadır. Bunlar üzerinde kontrolümüz bulunmamaktadır.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">7</span> Çerezler (Cookies) ve Yerel Depolama</h2>
          <p>
            Sitemiz çerez kullanmamakla birlikte, oturum bilgilerini ve sipariş geçmişini saklamak amacıyla
            tarayıcının <strong>localStorage</strong> ve <strong>sessionStorage</strong> alanlarını kullanmaktadır.
          </p>
          <ul>
            <li><code>pita_current_user</code>: Oturum açmış kullanıcı profili.</li>
            <li><code>pita_mutfak_orders</code>: Yerel sipariş kaydı.</li>
            <li><code>pita_mutfak_menu</code>: Menü önbelleği.</li>
            <li><code>pita_admin_auth</code>: Yönetici oturum durumu.</li>
          </ul>
          <p>Tarayıcı ayarlarınızdan bu verileri dilediğiniz zaman silebilirsiniz.</p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">8</span> Veri Saklama Süresi</h2>
          <p>Kişisel verileriniz aşağıdaki koşullara kadar saklanır:</p>
          <ul>
            <li>Müşteri hesap verileri: Hesap silme talebine veya son etkinlik tarihinden itibaren 2 yıl.</li>
            <li>Sipariş verileri: Türk vergi mevzuatı gereğince 5 yıl.</li>
            <li>Tarayıcı yerel depolama: Siz silene kadar veya tarayıcı önbelleği temizlenene kadar.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">9</span> Haklarınız (KVKK Madde 11)</h2>
          <p>6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme hakkı.</li>
            <li>İşlenen verileriniz hakkında bilgi talep etme hakkı.</li>
            <li>Verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme hakkı.</li>
            <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme hakkı.</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme hakkı.</li>
            <li>KVKK'nın 7. maddesi kapsamında silinmesini veya yok edilmesini isteme hakkı.</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi sonucuna itiraz etme hakkı.</li>
            <li>Verilerin kanuna aykırı işlenmesi nedeniyle oluşan zararın tazminini talep etme hakkı.</li>
          </ul>
          <div class="legal-highlight">
            📧 Taleplerinizi <a href="mailto:${BRAND_EMAIL}">${BRAND_EMAIL}</a> adresine
            e-posta ile iletebilirsiniz. 30 gün içinde yanıt verilecektir.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">10</span> Politika Değişiklikleri</h2>
          <p>
            Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler yapıldığında,
            sitemizde duyuru yayınlanacak ve güncelleme tarihi değiştirilecektir.
            Politikanın güncel halini düzenli olarak incelemenizi öneririz.
          </p>
          <p><strong>Son güncelleme tarihi:</strong> ${LAST_UPDATE_DATE}</p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">11</span> İletişim</h2>
          <p>Gizlilik politikamızla ilgili sorularınız için bizimle iletişime geçebilirsiniz:</p>
          <ul>
            <li><strong>E-posta:</strong> <a href="mailto:${BRAND_EMAIL}">${BRAND_EMAIL}</a></li>
            <li><strong>Web sitesi:</strong> <a href="${BRAND_WEBSITE}">${BRAND_WEBSITE}</a></li>
          </ul>
        </div>

      </div>

      <footer class="legal-footer">
        <p>© ${new Date().getFullYear()} ${BRAND_NAME} — Tüm hakları saklıdır.</p>
        <p style="margin-top: 6px;">
          <a href="#/terms">Kullanım Şartları</a> &nbsp;·&nbsp;
          <a href="#/">Ana Sayfa</a>
        </p>
      </footer>
    </div>
  `;

  document.getElementById('legal-back-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#/';
  });
}

export function renderTermsOfService(container) {
  container.innerHTML = `
    <div class="legal-page">
      ${COMMON_STYLES}

      <header class="legal-header">
        <div class="legal-header-inner">
          <div class="legal-logo">
            <img src="./assets/logo_app.jpg" alt="Pita Mutfak Logo">
          </div>
          <div class="legal-brand">pita<span>mutfak</span></div>
          <a href="#/" class="legal-back-btn" id="legal-back-home">← Ana Sayfaya Dön</a>
        </div>
      </header>

      <div class="legal-hero">
        <div class="legal-hero-inner">
          <div class="legal-badge">
            <span>📋</span>
            <span>Son Güncelleme: ${LAST_UPDATE_DATE}</span>
          </div>
          <h1 class="legal-title">Kullanım Şartları</h1>
          <p class="legal-subtitle">
            ${BRAND_NAME} hizmetini kullanmadan önce lütfen bu şartları dikkatlice okuyun.<br>
            Siteyi kullanmaya devam etmeniz, bu şartları kabul ettiğiniz anlamına gelir.
          </p>
        </div>
      </div>

      <div class="legal-body">

        <div class="legal-card">
          <h2><span class="section-num">1</span> Hizmetin Tanımı</h2>
          <p>
            <strong>${BRAND_NAME}</strong>, Türkiye'de faaliyet gösteren bir çevrimiçi yemek sipariş
            platformudur. Platform üzerinden Taş Fırın Çıtır Pizza, Taze Makarna ve Tavuk Pilav
            gibi ürünleri sipariş edebilirsiniz.
          </p>
          <p>
            Web sitemiz aracılığıyla sunulan hizmetler; sipariş oluşturma, gerçek zamanlı sipariş
            takibi, müşteri hesabı yönetimi ve teslimat koordinasyonunu kapsamaktadır.
          </p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">2</span> Kullanım Koşulları</h2>
          <p>Sitemizi kullanabilmek için aşağıdaki koşulları kabul etmeniz gerekmektedir:</p>
          <ul>
            <li>18 yaşını doldurmuş olmalı veya ebeveyn/vasi gözetimi altında kullanıyor olmalısınız.</li>
            <li>Gerçek ve doğru kişisel bilgiler sağlamanız zorunludur.</li>
            <li>Hesabınızı yalnızca siz kullanabilirsiniz; üçüncü şahıslarla paylaşamazsınız.</li>
            <li>Teslimat adresi Türkiye sınırları içinde olmalıdır.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">3</span> Sipariş ve Ödeme</h2>
          <ul>
            <li>Tüm fiyatlar Türk Lirası (₺) cinsinden belirtilmekte ve KDV dahildir.</li>
            <li>Sipariş onayı, mutfağımız tarafından kabul edildiği anda geçerlilik kazanır.</li>
            <li>Ödeme kapıda nakit veya kredi/banka kartı ile gerçekleştirilir.</li>
            <li>Sipariş iptallerinde, yemek hazırlığı başlamadan önce iletilen talepler kabul edilir.</li>
            <li>Teslimat süreleri tahmini olup; trafik ve hava koşulları nedeniyle değişkenlik gösterebilir.</li>
          </ul>
          <div class="legal-warning">
            ⚠️ Minimum sipariş tutarı uygulanabilir. Güncel limit sipariş ekranında görüntülenmektedir.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">4</span> Teslimat Koşulları</h2>
          <ul>
            <li>Teslimat yalnızca hizmet bölgemiz içinde gerçekleştirilir.</li>
            <li>Tahmini teslimat süresi sipariş sırasında bildirilmektedir.</li>
            <li>Teslimat sırasında 8 haneli güvenlik kodu kurye ile doğrulanır.</li>
            <li>Yanlış adres bilgisi nedeniyle gerçekleşemeyen teslimatlar müşterinin sorumluluğundadır.</li>
            <li>Kapıda bulunmama durumunda kurye 5 dakika bekleyerek ayrılabilir.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">5</span> İptal ve İade Politikası</h2>
          <ul>
            <li>Yemek hazırlığı başlamadan yapılan iptaller ücretsiz işlenir.</li>
            <li>Hazırlık aşamasındaki siparişler iptal edilemez.</li>
            <li>Yanlış veya eksik ürün teslimatında, fotoğraflı şikayet ile 24 saat içinde iade/yenileme hakkı doğar.</li>
            <li>İade talepleri <a href="mailto:${BRAND_EMAIL}">${BRAND_EMAIL}</a> adresine iletilmelidir.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">6</span> Müşteri Hesabı ve Güvenlik</h2>
          <ul>
            <li>Telefon numarası doğrulaması, hesap güvenliği açısından zorunludur.</li>
            <li>Google ile giriş yapıldığında hesabınız Google hesabınıza bağlanır.</li>
            <li>Hesabınızın yetkisiz kullanımını tespit ettiğinizde derhal bizi bilgilendirin.</li>
            <li>Şifre veya doğrulama kodu üçüncü şahıslarla paylaşılmamalıdır.</li>
          </ul>
          <div class="legal-highlight">
            🔒 Hesabınızı korumak için doğrulama kodunuzu (SMS) kimseyle paylaşmayın.
            ${BRAND_NAME} çalışanları asla SMS kodu istemez.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">7</span> Yorumlar ve Değerlendirmeler</h2>
          <ul>
            <li>Yorum yapabilmek için tamamlanmış bir siparişinizin bulunması gerekmektedir.</li>
            <li>Yorumlar hakaret, iftira veya yanıltıcı bilgi içeremez.</li>
            <li>Uygunsuz içerikler platformdan kaldırılabilir.</li>
            <li>Yorum yaparak içeriğin platformda yayınlanmasına izin vermiş sayılırsınız.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">8</span> Yasaklanan Kullanımlar</h2>
          <p>Aşağıdaki faaliyetler kesinlikle yasaktır:</p>
          <ul>
            <li>Sistemi veya güvenlik açıklarını kötüye kullanmak, saldırı girişiminde bulunmak.</li>
            <li>Bot, script veya otomatik araçlarla sipariş oluşturmak.</li>
            <li>Sahte kimlik veya iletişim bilgisi ile sipariş vermek.</li>
            <li>Fikri mülkiyet haklarını ihlal eden içerik paylaşmak.</li>
            <li>Platformun normal işleyişini engelleyecek yük veya trafik oluşturmak.</li>
          </ul>
          <div class="legal-warning">
            ⚠️ Yasaklanan faaliyetler nedeniyle hesabınız kalıcı olarak askıya alınabilir ve
            yasal işlem başlatılabilir.
          </div>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">9</span> Fikri Mülkiyet</h2>
          <p>
            ${BRAND_NAME} logosu, marka adı, web sitesi tasarımı, yazılım kodu ve içeriklerinin
            tüm fikri mülkiyet hakları ${BRAND_NAME}'a aittir.
          </p>
          <p>
            İzin alınmadan ticari amaçla kopyalanamaz, çoğaltılamaz veya dağıtılamaz.
          </p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">10</span> Sorumluluk Sınırlaması</h2>
          <ul>
            <li>${BRAND_NAME}, internet kesintisi, sunucu arızası veya teknik nedenlerden kaynaklanan gecikmelerden sorumlu değildir.</li>
            <li>Üçüncü taraf entegrasyonlarından (Google, Firebase, Vercel) kaynaklanan sorunlar kapsam dışındadır.</li>
            <li>Mücbir sebepler (doğal afet, salgın, kargo grevi vb.) nedeniyle oluşan aksaklıklarda sorumluluk kabul edilmez.</li>
          </ul>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">11</span> Değişiklikler</h2>
          <p>
            ${BRAND_NAME}, bu Kullanım Şartlarını önceden bildirim yapmaksızın değiştirme hakkını saklı tutar.
            Değişiklikler sitede yayınlandığı andan itibaren geçerli olur.
            Hizmeti kullanmaya devam etmeniz güncel şartları kabul ettiğiniz anlamına gelir.
          </p>
          <p><strong>Son güncelleme tarihi:</strong> ${LAST_UPDATE_DATE}</p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">12</span> Uygulanacak Hukuk</h2>
          <p>
            Bu şartlar Türkiye Cumhuriyeti hukukuna tabi olup, uyuşmazlıklarda Türkiye mahkemeleri
            ve hakem heyetleri yetkilidir.
          </p>
        </div>

        <div class="legal-card">
          <h2><span class="section-num">13</span> İletişim</h2>
          <p>Kullanım şartlarıyla ilgili sorularınız için:</p>
          <ul>
            <li><strong>E-posta:</strong> <a href="mailto:${BRAND_EMAIL}">${BRAND_EMAIL}</a></li>
            <li><strong>Web sitesi:</strong> <a href="${BRAND_WEBSITE}">${BRAND_WEBSITE}</a></li>
          </ul>
        </div>

      </div>

      <footer class="legal-footer">
        <p>© ${new Date().getFullYear()} ${BRAND_NAME} — Tüm hakları saklıdır.</p>
        <p style="margin-top: 6px;">
          <a href="#/privacy">Gizlilik Politikası</a> &nbsp;·&nbsp;
          <a href="#/">Ana Sayfa</a>
        </p>
      </footer>
    </div>
  `;

  document.getElementById('legal-back-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#/';
  });
}
