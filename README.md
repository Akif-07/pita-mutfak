# 🍲 Pita Mutfak - Online Sipariş & Kurye Doğrulama Sistemi

Pita Mutfak için özel olarak tasarlanmış, **Uber Eats yeşil-beyaz** tasarım diline sahip modern online sipariş, anlık bildirimli admin yönetim paneli ve **8 haneli teslimat kodlu** kurye doğrulama sistemi.

---

## 🌟 Öne Çıkan Özellikler

- 🍽️ **Zengin & İştah Açıcı Menü**:
  - **Tavuk Pilav Çeşitleri**: Klasik Tiftik Tavuk Pilav, Özel Acılı & Baharatlı Pilav, Körili Tavuklu Pilav, Ciğerli & Tavuklu Karışık Pilav.
  - **Makarna Çeşitleri**: Kremalı Tavuklu & Mantarlı Penne, 3 Saat Demlenmiş Bolonez Penne, Köri Soslu Renkli Biberli Makarna, Fesleğenli Pesto Soslu Penne, 4 Peynirli Fırın Makarna.
  - **Kuru Fasulye & Pilav**: Güveçte Ağır Ateş İspir Kuru Fasulye & Pilav, Dana Etli Güveç Kuru Fasulye, Pita Kral Tam Set Menü.
  - **İçecek & Tatlı**: Köpüklü Yayık Ayran, Fırın Sütlaç, Karışık Turşu.

- 🛵 **8 Haneli Teslimat Güvenlik Kodu (Kurye Doğrulama)**:
  - Müşteri sipariş verdiğinde ekranda büyük ve okunaklı **8 haneli rastgele bir güvenlik kodu** (`Örn: 5829 4103`) üretilir.
  - Kurye kapıya geldiğinde paketi teslim etmek için müşteriden bu kodu ister.
  - Kurye kendi panelinden 8 haneli kodu girdiğinde sistem kodu otomatik doğrular:
    - Kod doğruysa sipariş anında **"Teslim Edildi"** olarak onaylanır.
    - Hem admin panelinde hem müşteri takip ekranında teslimat anında güncellenir ve tebrik sesi çalar.

- 🔔 **Anlık Admin Paneli & Web Audio Sipariş Zili**:
  - Müşteri sipariş verdiği milisaniyede admin paneline düşer.
  - Harici ses dosyasına ihtiyaç duymadan tarayıcı içi Web Audio API ile berrak restoran karşılama çanı çalar.
  - Sipariş onaylama ("Hazırlanıyor"), kuryeye devretme ("Kurye Yolda") ve teslimat takibi.
  - **Menü Yönetimi**: Anlık fiyat güncelleme ve stokta biten ürünleri tek tıkla "Tükendi" yapma.

- ⚡ **Waffloq Mimarisi (Çift Yönlü Canlı Senkronizasyon)**:
  - `BroadcastChannel` ve `localStorage` olayları sayesinde sekmeler arası sıfır gecikmeli kesintisiz canlı iletişim.
  - Firebase Cloud Firestore'a doğrudan bağlanmaya hazır modüler altyapı.

---

## 🚀 Hızlı Başlangıç (Tek Komutla Çalıştırma)

Sunucuyu başlatmak için terminalde projenin bulunduğu klasöre gidin ve çalıştırın:

```powershell
python server.py
```

Tarayıcınızda açabileceğiniz adresler:
- **🍽️ Müşteri Sipariş Arayüzü:** [http://localhost:8080](http://localhost:8080)
- **⚙️ Admin Yönetim Paneli:** [http://localhost:8080/#/admin](http://localhost:8080/#/admin)
- **🛵 Kurye Teslimat Paneli:** [http://localhost:8080/#/kurye](http://localhost:8080/#/kurye)

> **İpucu:** Tarayıcınızda 3 sekme veya 3 yan yana pencere açarak (Müşteri, Admin, Kurye) bir sipariş verip sürecin baştan sona anlık olarak nasıl aktığını deneyimleyebilirsiniz!
