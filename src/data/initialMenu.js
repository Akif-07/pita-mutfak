// Pita Mutfak - Başlangıç Menü Veritabanı
export const initialMenu = [
  // TAVUK PİLAV ÇEŞİTLERİ
  {
    id: "tp-1",
    name: "Klasik Didilmiş Tavuk Pilav",
    category: "tavuk-pilav",
    categoryTitle: "Tavuk Pilav Çeşitleri",
    price: 130,
    description: "Tereyağlı nohutlu tane pirinç pilavı, taze haşlanmış didilmiş tiftik tavuk göğsü, karabiber ve turşu ile.",
    image: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=600&q=80",
    badge: "Çok Satan",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon (100g Tavuk)", price: 0 },
      { name: "Duble Tavuk (+70g Tavuk)", price: 45 },
      { name: "Ekstra Pilav Porsiyonu", price: 30 }
    ]
  },
  {
    id: "tp-2",
    name: "Özel Baharatlı & Acılı Tavuk Pilav",
    category: "tavuk-pilav",
    categoryTitle: "Tavuk Pilav Çeşitleri",
    price: 145,
    description: "Özel acı baharat harmanıyla sotelenmiş sulu tavuk parçaları, tereyağlı nohutlu pilav ve közlenmiş biber eşliğinde.",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    badge: "Şefin Spesiyali",
    isAvailable: true,
    options: [
      { name: "Orta Acılı", price: 0 },
      { name: "Ekstra Acı Sevenlere", price: 0 },
      { name: "Duble Tavuk Ekle", price: 45 }
    ]
  },
  {
    id: "tp-3",
    name: "Körili Tavuklu Pilav",
    category: "tavuk-pilav",
    categoryTitle: "Tavuk Pilav Çeşitleri",
    price: 155,
    description: "Hafif krema ve aromatik köri sosunda pişmiş tavuk bonfile dilimleri, mısır taneleri ve tereyağlı pirinç pilavı.",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    badge: "Gurme Lezzet",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Duble Köri Tavuk", price: 50 }
    ]
  },
  {
    id: "tp-4",
    name: "Kavrulan Ciğerli & Tavuklu Karışık Pilav",
    category: "tavuk-pilav",
    categoryTitle: "Tavuk Pilav Çeşitleri",
    price: 165,
    description: "Taze kekik ve soğanla karamelize edilmiş nefis ciğer sote, didilmiş tavuk göğsü ve tereyağlı nohutlu pilav ziyafeti.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    badge: "Spesiyal",
    isAvailable: true,
    options: [
      { name: "Normal Karışık", price: 0 },
      { name: "Ekstra Ciğer Payı", price: 45 }
    ]
  },

  // MAKARNA ÇEŞİTLERİ
  {
    id: "mk-1",
    name: "Kremalı Tavuklu & Mantarlı Penne",
    category: "makarna",
    categoryTitle: "Makarna Çeşitleri",
    price: 160,
    description: "Al dente penne makarna, taze dilimlenmiş kültür mantarları, jülyen tavuk bonfile, zengin krema sosu ve rendelenmiş parmesan.",
    image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80",
    badge: "Favori",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Ekstra Tavuk & Mantar", price: 40 },
      { name: "Ekstra Parmesan Peyniri", price: 25 }
    ]
  },
  {
    id: "mk-2",
    name: "Ağır Ateşte Pişmiş Bolonez Penne",
    category: "makarna",
    categoryTitle: "Makarna Çeşitleri",
    price: 175,
    description: "Kıyma, domates rendesi, havuç, kereviz sapı ve taze baharatlarla 3 saat ağır ateşte demlenmiş geleneksel İtalyan soslu penne.",
    image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=600&q=80",
    badge: "Klasik",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Duble Bolonez Sosu", price: 45 },
      { name: "Ekstra Kaşar Rendesi", price: 20 }
    ]
  },
  {
    id: "mk-3",
    name: "Köri Soslu & Renkli Biberli Tavuklu Makarna",
    category: "makarna",
    categoryTitle: "Makarna Çeşitleri",
    price: 155,
    description: "Kırmızı kapya ve yeşil köy biberiyle harmanlanmış kremalı köri sosu, ızgara tavuk parçaları ve penne makarna.",
    image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=600&q=80",
    badge: "Aromatik",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Ekstra Tavuk", price: 40 }
    ]
  },
  {
    id: "mk-4",
    name: "Fesleğenli Pesto Soslu Penne",
    category: "makarna",
    categoryTitle: "Makarna Çeşitleri",
    price: 150,
    description: "Taze fesleğen yaprakları, ceviz içi, sızma zeytinyağı, sarımsak ve parmesanla hazırlanan ev yapımı pesto sos.",
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
    badge: "Vejetaryen",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Tavuk İlavesi", price: 35 },
      { name: "Ceviz ve Parmesan Ekle", price: 25 }
    ]
  },
  {
    id: "mk-5",
    name: "Fırınlanmış Dört Peynirli Kaşarlı Makarna",
    category: "makarna",
    categoryTitle: "Makarna Çeşitleri",
    price: 165,
    description: "Eriyen taze kaşar, mozarella, çeçil ve parmesan peynirlerinin fırında nar gibi kızartılmasıyla hazırlanan enfes peynirli lezzet.",
    image: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=600&q=80",
    badge: "Peynir Sever",
    isAvailable: true,
    options: [
      { name: "Standart Porsiyon", price: 0 },
      { name: "Ekstra Kızarmış Kaşar", price: 30 }
    ]
  },

  // KURU FASULYE & PİLAV
  {
    id: "kf-1",
    name: "Güveçte Ağır Ateş İspir Kuru Fasulye & Pilav",
    category: "kuru-fasulye",
    categoryTitle: "Kuru Fasulye & Pilav",
    price: 150,
    description: "Hakiki İspir kuru fasulyesi, güveç kaplarında kısık ateşte pişirilmiş lokum kıvamında sos, yanında tereyağlı tane pilav ve biber turşusu.",
    image: "https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=600&q=80",
    badge: "Geleneksel Efsane",
    isAvailable: true,
    options: [
      { name: "Standart Menü (Fasulye + Pilav + Turşu)", price: 0 },
      { name: "Duble Pilav İlavesi", price: 30 },
      { name: "Ekstra Fasulye Porsiyonu", price: 45 }
    ]
  },
  {
    id: "kf-2",
    name: "Dana Etli Güveç Kuru Fasulye & Pilav",
    category: "kuru-fasulye",
    categoryTitle: "Kuru Fasulye & Pilav",
    price: 185,
    description: "Yumuşacık dana kuşbaşı etleriyle birlikte taş fırında ağır ağır demlenmiş leziz etli kuru fasulye ve tereyağlı pirinç pilavı.",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80",
    badge: "Özel Etli",
    isAvailable: true,
    options: [
      { name: "Standart Etli Menü", price: 0 },
      { name: "Ekstra Et Porsiyonu", price: 55 }
    ]
  },
  {
    id: "kf-3",
    name: "Pita Kral Kuru Fasulye Menü (Tam Set)",
    category: "kuru-fasulye",
    categoryTitle: "Kuru Fasulye & Pilav",
    price: 210,
    description: "Etli İspir Kuru Fasulye + Tereyağlı Pilav + Çoban Salata + Bol Köpüklü Yayık Ayran + Karışık Turşu ve Sıcak Lavaş.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    badge: "En Çok Doyuran",
    isAvailable: true,
    options: [
      { name: "Tam Set Menü", price: 0 },
      { name: "Tatlı İlavesi (Fırın Sütlaç)", price: 50 }
    ]
  },

  // İÇECEKLER & YAN LEZZETLER
  {
    id: "ic-1",
    name: "Bol Köpüklü Ev Yapımı Yayık Ayran",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 35,
    description: "Köy yoğurdundan geleneksel yöntemle çalkalanarak hazırlanan buz gibi taze köpüklü ayran (330ml).",
    image: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80",
    badge: "Serinletici",
    isAvailable: true,
    options: []
  },
  {
    id: "ic-2",
    name: "Kutu Meşrubat Çeşitleri (330ml)",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 45,
    description: "Coca-Cola, Coca-Cola Zero, Fanta, Sprite soğuk kutu meşrubat.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    badge: null,
    isAvailable: true,
    options: [
      { name: "Coca-Cola Orijinal", price: 0 },
      { name: "Coca-Cola Zero Sugar", price: 0 },
      { name: "Fanta Portakal", price: 0 },
      { name: "Sprite Limon", price: 0 }
    ]
  },
  {
    id: "ic-3",
    name: "Geleneksel Fırın Sütlaç",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 65,
    description: "Toprak güveçte üstü nar gibi kızarmış, tam kıvamında enfes fırın sütlaç, fındık parçacıklarıyla.",
    image: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    badge: "Tatlı Kapanış",
    isAvailable: true,
    options: []
  },
  {
    id: "ic-4",
    name: "Karışık Biber & Lahana Turşu Tabağı",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 30,
    description: "Kıtır kıtır kornişon, acı süs biberi ve beyaz lahana karışık turşusu.",
    image: "https://images.unsplash.com/photo-1589135233689-d56353d2d46e?auto=format&fit=crop&w=600&q=80",
    badge: null,
    isAvailable: true,
    options: []
  },
  {
    id: "ic-5",
    name: "Akışkan Çikolatalı Sıcak Sufle",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 75,
    description: "İçi sıcak akışkan Belçika çikolatalı, pudra şekeri serpiştirilmiş nefis fırın sufle.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    badge: "Çok Sevilen",
    isAvailable: true,
    options: []
  },
  {
    id: "ic-6",
    name: "Uludağ Doğal Maden Suyu (200ml)",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 25,
    description: "Doğal zengin mineralli soğuk cam şişe maden suyu.",
    image: "https://images.unsplash.com/photo-1559839914-ba2c6a0f62d8?auto=format&fit=crop&w=600&q=80",
    badge: null,
    isAvailable: true,
    options: []
  },
  {
    id: "ic-7",
    name: "Tarihi Niğde Gazozu (Cam Şişe)",
    category: "icecek",
    categoryTitle: "İçecek & Yan Lezzetler",
    price: 35,
    description: "Geleneksel ahududu aromalı enfes buz gibi cam şişe gazoz.",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80",
    badge: "Klasik",
    isAvailable: true,
    options: []
  },

  // ÇITIR PİZZA ÇEŞİTLERİ (TAŞ FIRIN)
  {
    id: "pz-1",
    name: "Klasik Margherita Pizza",
    category: "pizza",
    categoryTitle: "Çıtır Pizza Çeşitleri",
    price: 185,
    description: "İtalyan domates sosu, bol mozzarella peyniri, taze fesleğen ve sızma zeytinyağı ile taş fırında ince çıtır hamur.",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
    badge: "Çok Satan",
    isAvailable: true,
    options: [
      { name: "Orta Boy (28cm)", price: 0 },
      { name: "Büyük Boy (33cm)", price: 50 },
      { name: "Ekstra Mozzarella", price: 35 }
    ]
  },
  {
    id: "pz-2",
    name: "Bol Malzemeli Karışık Pizza",
    category: "pizza",
    categoryTitle: "Çıtır Pizza Çeşitleri",
    price: 220,
    description: "Özel pizza sosu, mozzarella, kasap sucuk, salam, kültür mantarı, mısır, yeşil biber ve siyah zeytin ziyafeti.",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80",
    badge: "Şefin Favorisi",
    isAvailable: true,
    options: [
      { name: "Orta Boy (28cm)", price: 0 },
      { name: "Büyük Boy (33cm)", price: 55 },
      { name: "Peynirli Kenar Ekle", price: 40 }
    ]
  },
  {
    id: "pz-3",
    name: "Barbekü Tavuklu & Mantarlı Pizza",
    category: "pizza",
    categoryTitle: "Çıtır Pizza Çeşitleri",
    price: 210,
    description: "Füme barbekü sosu, jülyen marine tavuk parçaları, mozzarella peyniri, kırmızı soğan ve taze mantar.",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    badge: "Gurme Lezzet",
    isAvailable: true,
    options: [
      { name: "Orta Boy (28cm)", price: 0 },
      { name: "Büyük Boy (33cm)", price: 50 },
      { name: "Ekstra Tavuk Bonfile", price: 35 }
    ]
  },
  {
    id: "pz-4",
    name: "Acılı Kasap Sucuklu Pizza",
    category: "pizza",
    categoryTitle: "Çıtır Pizza Çeşitleri",
    price: 205,
    description: "Kayseri kasap sucuğu, bol eriyen kaşar ve mozzarella, jalapeno acı biber turşusu ve kekikli domates sosu.",
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
    badge: "Acı Severler",
    isAvailable: true,
    options: [
      { name: "Orta Boy (28cm)", price: 0 },
      { name: "Büyük Boy (33cm)", price: 50 }
    ]
  }
];

export const categories = [
  { id: "all", name: "Tüm Menü", icon: "Utensils" },
  { id: "tavuk-pilav", name: "Tavuk Pilav", icon: "Drumstick" },
  { id: "makarna", name: "Makarna Çeşitleri", icon: "Wheat" },
  { id: "pizza", name: "Çıtır Pizza", icon: "Pizza" },
  { id: "kuru-fasulye", name: "Kuru Fasulye & Pilav", icon: "Flame" },
  { id: "icecek", name: "İçecek & Tatlı", icon: "Coffee" }
];

