import http.server
import socketserver
import os
import sys
import sqlite3
import json
import random
from urllib.parse import urlparse, parse_qs, unquote
from datetime import datetime

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DIRECTORY, "pita_mutfak.db")

# Geçici e-posta doğrulama kodları belleği (email.lower() -> {code, created_at, name, phone})
VERIFICATION_CODES = {}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Müşteriler Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT DEFAULT '',
      password TEXT DEFAULT '',
      is_verified INTEGER DEFAULT 0,
      registered_at TEXT NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      first_order_discount_used INTEGER DEFAULT 0,
      custom_code TEXT DEFAULT '',
      custom_discount INTEGER DEFAULT 0
    )
    ''')
    
    # Mevcut veritabanı varsa yeni kolonları güvenle ekle
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN email TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN password TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN is_verified INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN custom_code TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN custom_discount INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # 2. Stok Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stock (
      product_id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 50,
      low_stock_threshold INTEGER DEFAULT 5,
      updated_at TEXT
    )
    ''')

    # 3. Mesajlar / Bildirimler Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT NOT NULL,
      sender TEXT DEFAULT 'Pita Mutfak Yönetimi',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_read INTEGER DEFAULT 0
    )
    ''')

    # 4. Müşteri Yorumları & Değerlendirmeleri Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      product_id TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      order_id TEXT DEFAULT '',
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'approved'
    )
    ''')

    # Başlangıçta örnek müşteri yorumları ekle (eğer boşsa)
    cursor.execute("SELECT COUNT(*) FROM reviews")
    if cursor.fetchone()[0] == 0:
        initial_reviews = [
            ("Ahmet Yılmaz", "ahmet@gmail.com", "pilav-tavuk-klasik", "Klasik Didilmiş Tavuk Pilav", "", 5, "Tavuk pilav gerçekten efsane! Tavuğu bol, pilavı tane tane ve tereyağlıydı. Kesinlikle tavsiye ederim.", "2026-09-12T14:20:00"),
            ("Selin Demir", "selin@gmail.com", "kuru-fasulye-guvec", "Güveçte Kuru Fasulye", "", 5, "Güveçte kuru fasulye sıcacık geldi, yanındaki turşu ve pilavla tam anne yemeği lezzeti. Ellerinize sağlık.", "2026-09-12T18:45:00"),
            ("Mehmet Kaya", "mehmet@gmail.com", "makarna-penne-tavuk", "Kremalı Tavuklu Penne", "", 5, "Fesleğenli kremalı makarna çok lezzetliydi, porsiyon da oldukça doyurucu. Kurye de çok nazikti.", "2026-09-13T12:10:00"),
            ("Ayşe K.", "ayse@gmail.com", "", "Pita Mutfak Genel", "", 5, "Sipariş 25 dakikada dumanı üstünde kapıma geldi. Kurye arkadaş çok güler yüzlüydü. Teşekkürler!", "2026-09-13T13:30:00")
        ]
        cursor.executemany(
            "INSERT INTO reviews (customer_name, customer_email, product_id, product_name, order_id, rating, comment, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')",
            initial_reviews
        )
    
    # 5. Giderler & Harcamalar Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Malzeme',
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      payment_account TEXT DEFAULT 'cash',
      created_at TEXT NOT NULL
    )
    ''')

    # 6. Gün Sonu Z-Raporları & Kasa Kapanış Tablosu
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_closings (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      total_orders INTEGER DEFAULT 0,
      delivered_orders INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      expense REAL DEFAULT 0,
      net_profit REAL DEFAULT 0,
      cash_amount REAL DEFAULT 0,
      eft_amount REAL DEFAULT 0,
      closed_at TEXT NOT NULL
    )
    ''')

    conn.commit()
    conn.close()

class PitaMutfakHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'application/javascript; charset=utf-8'
        if path.endswith('.json'):
            return 'application/json; charset=utf-8'
        if path.endswith('.html'):
            return 'text/html; charset=utf-8'
        return super().guess_type(path)

    def send_json(self, status, data):
        try:
            body = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            print(f"Error sending JSON: {e}")

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                decoded = post_data.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    decoded = post_data.decode('windows-1254')
                except Exception:
                    decoded = post_data.decode('utf-8', errors='replace')
            try:
                return json.loads(decoded)
            except json.JSONDecodeError:
                return None
        return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)

        if path.startswith('/api/'):
            self.handle_api_get(path, query_params)
        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith('/api/'):
            self.handle_api_post(path)
        else:
            self.send_error(405, "Method Not Allowed")

    def do_PUT(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith('/api/'):
            self.handle_api_put(path)
        else:
            self.send_error(405, "Method Not Allowed")

    def do_DELETE(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)

        if path.startswith('/api/'):
            self.handle_api_delete(path, query_params)
        else:
            self.send_error(405, "Method Not Allowed")

    # =================== API GET ===================
    def handle_api_get(self, path, query_params):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if path == '/api/customers':
                cursor.execute("SELECT id, name, phone, email, is_verified, registered_at, total_orders, total_spent, custom_code, custom_discount FROM customers ORDER BY id DESC")
                customers = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, customers)
            
            elif path.startswith('/api/customers/'):
                phone = unquote(path.split('/')[-1])
                cursor.execute("SELECT * FROM customers WHERE phone = ? OR email = ?", (phone, phone))
                row = cursor.fetchone()
                if row:
                    self.send_json(200, dict(row))
                else:
                    self.send_json(404, {"error": "Customer not found"})
            
            elif path.startswith('/api/messages/'):
                phone = unquote(path.split('/')[-1])
                cursor.execute("SELECT * FROM messages WHERE customer_phone = ? ORDER BY id DESC", (phone,))
                messages = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, messages)

            elif path == '/api/stock':
                cursor.execute("SELECT * FROM stock")
                stock_items = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, stock_items)

            elif path == '/api/reviews':
                product_id = query_params.get('product_id', [None])[0]
                if product_id:
                    cursor.execute("SELECT * FROM reviews WHERE (product_id = ? OR product_id = '') ORDER BY id DESC", (product_id,))
                else:
                    cursor.execute("SELECT * FROM reviews ORDER BY id DESC")
                reviews = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, reviews)

            elif path == '/api/expenses':
                category = query_params.get('category', [None])[0]
                date_filter = query_params.get('date', [None])[0]
                sql = "SELECT * FROM expenses WHERE 1=1"
                params = []
                if category:
                    sql += " AND category = ?"
                    params.append(category)
                if date_filter:
                    sql += " AND date = ?"
                    params.append(date_filter)
                sql += " ORDER BY date DESC, created_at DESC"
                cursor.execute(sql, tuple(params))
                expenses = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, expenses)

            elif path == '/api/daily-closings':
                cursor.execute("SELECT * FROM daily_closings ORDER BY date DESC")
                closings = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, closings)
            
            else:
                self.send_json(404, {"error": "Not Found"})
        
        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

    # =================== API POST ===================
    def handle_api_post(self, path):
        body = self.read_json_body()
        if body is None:
            self.send_json(400, {"error": "Invalid JSON body"})
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # 1. E-posta Doğrulama Kodu Üret ve İlet (POST /api/auth/send-code)
            if path == '/api/auth/send-code':
                email = str(body.get('email', '')).strip().lower()
                name = str(body.get('name', '')).strip()
                phone = str(body.get('phone', '')).strip()

                if not email or '@' not in email:
                    self.send_json(400, {"error": "Lütfen geçerli bir e-posta adresi giriniz."})
                    return

                # 6 Haneli Rastgele Sayısal Kod Üret
                code = f"{random.randint(100000, 999999)}"
                now = datetime.now().isoformat()
                VERIFICATION_CODES[email] = {
                    "code": code,
                    "created_at": now,
                    "name": name,
                    "phone": phone
                }

                print(f"[AUTH] Dogrulama Kodu Uretildi -> E-Posta: {email} | Kod: {code}")

                # JSON yanıtında kodu da dönüyoruz (Demo/test ortamında anında test edilebilmesi için)
                self.send_json(200, {
                    "success": True,
                    "message": f"6 haneli doğrulama kodu {email} adresine iletildi.",
                    "code": code,
                    "email": email
                })

            # 2. Kodu Doğrula ve Müşteriyi Kaydet (POST /api/auth/verify-and-register)
            elif path == '/api/auth/verify-and-register':
                email = str(body.get('email', '')).strip().lower()
                input_code = str(body.get('code', '')).strip()
                name = str(body.get('name', '')).strip()
                phone = str(body.get('phone', '')).strip()
                password = str(body.get('password', '')).strip()

                if not email or not input_code:
                    self.send_json(400, {"error": "E-posta ve doğrulama kodu zorunludur."})
                    return

                stored = VERIFICATION_CODES.get(email)
                # Test/demo kolaylığı için 123456 veya üretilen kod kabul edilir
                is_valid_code = (stored and stored.get('code') == input_code) or (input_code == "123456")

                if not is_valid_code:
                    self.send_json(400, {"error": "Hatalı doğrulama kodu! Lütfen size iletilen 6 haneli kodu kontrol ediniz."})
                    return

                now = datetime.now().isoformat()
                # Kullanıcı daha önce var mı?
                cursor.execute("SELECT * FROM customers WHERE email = ? OR phone = ?", (email, phone))
                existing = cursor.fetchone()

                if existing:
                    cursor.execute(
                        "UPDATE customers SET name = ?, phone = ?, email = ?, password = ?, is_verified = 1 WHERE id = ?",
                        (name or existing['name'], phone or existing['phone'], email, password or existing['password'], existing['id'])
                    )
                    conn.commit()
                    cursor.execute("SELECT * FROM customers WHERE id = ?", (existing['id'],))
                    customer = cursor.fetchone()
                else:
                    cursor.execute(
                        "INSERT INTO customers (name, phone, email, password, is_verified, registered_at) VALUES (?, ?, ?, ?, 1, ?)",
                        (name or 'Misafir Müşteri', phone or email, email, password, now)
                    )
                    conn.commit()
                    customer_id = cursor.lastrowid
                    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
                    customer = cursor.fetchone()

                # Kod kullanıldıktan sonra temizle
                if email in VERIFICATION_CODES:
                    del VERIFICATION_CODES[email]

                self.send_json(200, {
                    "success": True,
                    "message": "Hesabınız başarıyla doğrulandı ve oluşturuldu!",
                    "customer": dict(customer)
                })

            # 3. E-posta / Telefon ile Giriş Yap (POST /api/auth/login)
            elif path == '/api/auth/login':
                identifier = str(body.get('email', '') or body.get('phone', '')).strip().lower()
                password = str(body.get('password', '')).strip()

                if not identifier:
                    self.send_json(400, {"error": "E-posta veya telefon numarası gereklidir."})
                    return

                cursor.execute("SELECT * FROM customers WHERE lower(email) = ? OR phone = ?", (identifier, identifier))
                customer = cursor.fetchone()

                if not customer:
                    self.send_json(404, {"error": "Bu bilgilerle kayıtlı bir müşteri bulunamadı."})
                    return

                # Eğer şifre belirlenmişse ve girilmişse kontrol et
                if customer['password'] and password and customer['password'] != password:
                    self.send_json(401, {"error": "Hatalı şifre girdiniz."})
                    return

                self.send_json(200, {
                    "success": True,
                    "customer": dict(customer)
                })

            # 4. Yeni Müşteri Yorumu & Puanı Ekle (POST /api/reviews)
            elif path == '/api/reviews':
                customer_name = str(body.get('customer_name', '')).strip() or 'Pita Lezzet Sever'
                customer_email = str(body.get('customer_email', '')).strip().lower()
                product_id = str(body.get('product_id', '')).strip()
                product_name = str(body.get('product_name', '')).strip() or 'Pita Mutfak'
                order_id = str(body.get('order_id', '')).strip()
                rating = int(body.get('rating', 5))
                comment = str(body.get('comment', '')).strip()

                if not comment:
                    self.send_json(400, {"error": "Yorum metni zorunludur."})
                    return

                rating = max(1, min(5, rating))
                now = datetime.now().isoformat()

                cursor.execute(
                    '''INSERT INTO reviews (customer_name, customer_email, product_id, product_name, order_id, rating, comment, created_at, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')''',
                    (customer_name, customer_email, product_id, product_name, order_id, rating, comment, now)
                )
                conn.commit()
                review_id = cursor.lastrowid
                cursor.execute("SELECT * FROM reviews WHERE id = ?", (review_id,))
                new_review = cursor.fetchone()

                self.send_json(201, {
                    "success": True,
                    "message": "Değerlendirmeniz için teşekkür ederiz!",
                    "review": dict(new_review)
                })

            # 5. Klasik Müşteri Kayıt (POST /api/customers)
            elif path == '/api/customers':
                name = body.get('name')
                phone = body.get('phone')
                email = body.get('email', '')
                
                if not name or not phone:
                    self.send_json(400, {"error": "Name and phone are required"})
                    return
                
                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                existing = cursor.fetchone()
                
                if existing:
                    self.send_json(200, dict(existing))
                else:
                    registered_at = datetime.now().isoformat()
                    cursor.execute(
                        "INSERT INTO customers (name, phone, email, registered_at) VALUES (?, ?, ?, ?)",
                        (name, phone, email, registered_at)
                    )
                    conn.commit()
                    customer_id = cursor.lastrowid
                    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
                    new_customer = cursor.fetchone()
                    self.send_json(201, dict(new_customer))
            
            # 6. Stok Düşme (POST /api/stock/deduct)
            elif path == '/api/stock/deduct':
                items = body.get('items', [])
                if not isinstance(items, list):
                    self.send_json(400, {"error": "Items must be a list"})
                    return
                
                errors = []
                for item in items:
                    pid = item.get('productId')
                    qty = item.get('quantity', 0)
                    cursor.execute("SELECT quantity, product_name FROM stock WHERE product_id = ?", (pid,))
                    row = cursor.fetchone()
                    if row:
                        if row['quantity'] < qty:
                            errors.append(f"Not enough stock for {row['product_name']}")
                    else:
                        errors.append(f"Product {pid} not found in stock")
                
                if errors:
                    self.send_json(400, {"error": "Stock check failed", "details": errors})
                    return
                
                now = datetime.now().isoformat()
                for item in items:
                    pid = item.get('productId')
                    qty = item.get('quantity', 0)
                    cursor.execute(
                        "UPDATE stock SET quantity = quantity - ?, updated_at = ? WHERE product_id = ?",
                        (qty, now, pid)
                    )
                conn.commit()
                self.send_json(200, {"message": "Stock deducted successfully"})

            # 7. Stok Başlatma (POST /api/stock/init)
            elif path == '/api/stock/init':
                products = body.get('products', [])
                now = datetime.now().isoformat()
                added_count = 0
                for prod in products:
                    pid = prod.get('product_id')
                    pname = prod.get('product_name')
                    if pid and pname:
                        cursor.execute("SELECT 1 FROM stock WHERE product_id = ?", (pid,))
                        if not cursor.fetchone():
                            cursor.execute(
                                "INSERT INTO stock (product_id, product_name, updated_at) VALUES (?, ?, ?)",
                                (pid, pname, now)
                            )
                            added_count += 1
                conn.commit()
                self.send_json(200, {"message": f"Initialized {added_count} products"})
            
            # 8. Müşteriye Özel Mesaj Gönder (POST /api/messages)
            elif path == '/api/messages':
                customer_phone = body.get('customerPhone')
                title = body.get('title')
                message = body.get('message')
                sender = body.get('sender', 'Pita Mutfak Yönetimi')

                if not customer_phone or not title or not message:
                    self.send_json(400, {"error": "customerPhone, title, and message are required"})
                    return

                now = datetime.now().isoformat()
                cursor.execute(
                    "INSERT INTO messages (customer_phone, sender, title, message, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)",
                    (customer_phone, sender, title, message, now)
                )
                conn.commit()
                msg_id = cursor.lastrowid
                cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
                new_msg = cursor.fetchone()
                self.send_json(201, dict(new_msg))

            # 9. Yeni Gider Ekle (POST /api/expenses)
            elif path == '/api/expenses':
                title = str(body.get('title', '')).strip()
                if not title:
                    self.send_json(400, {"error": "title is required"})
                    return
                exp_id = str(body.get('id') or f"exp_{int(datetime.now().timestamp() * 1000)}_{random.randint(100, 999)}")
                category = str(body.get('category', 'Malzeme')).strip()
                amount = float(body.get('amount', 0))
                date_str = str(body.get('date', datetime.now().strftime('%Y-%m-%d'))).strip()
                note = str(body.get('note', '')).strip()
                payment_account = str(body.get('payment_account', 'cash')).strip()
                created_at = str(body.get('createdAt') or body.get('created_at') or datetime.now().isoformat())

                cursor.execute(
                    "INSERT OR REPLACE INTO expenses (id, title, category, amount, date, note, payment_account, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (exp_id, title, category, amount, date_str, note, payment_account, created_at)
                )
                conn.commit()
                cursor.execute("SELECT * FROM expenses WHERE id = ?", (exp_id,))
                row = cursor.fetchone()
                self.send_json(201, dict(row) if row else {"id": exp_id, "title": title, "amount": amount})

            # 10. Gün Sonu Kapanışı Kaydet (POST /api/daily-closings)
            elif path == '/api/daily-closings':
                date_str = str(body.get('date', datetime.now().strftime('%Y-%m-%d'))).strip()
                closing_id = str(body.get('id') or f"close_{date_str}")
                total_orders = int(body.get('total_orders', 0))
                delivered_orders = int(body.get('delivered_orders', 0))
                revenue = float(body.get('revenue', 0))
                expense = float(body.get('expense', 0))
                net_profit = float(body.get('net_profit', revenue - expense))
                cash_amount = float(body.get('cash_amount', 0))
                eft_amount = float(body.get('eft_amount', 0))
                closed_at = str(body.get('closed_at', datetime.now().isoformat()))

                cursor.execute(
                    "INSERT OR REPLACE INTO daily_closings (id, date, total_orders, delivered_orders, revenue, expense, net_profit, cash_amount, eft_amount, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (closing_id, date_str, total_orders, delivered_orders, revenue, expense, net_profit, cash_amount, eft_amount, closed_at)
                )
                conn.commit()
                cursor.execute("SELECT * FROM daily_closings WHERE id = ?", (closing_id,))
                row = cursor.fetchone()
                self.send_json(201, dict(row) if row else {"id": closing_id, "date": date_str})

            else:
                self.send_json(404, {"error": "Not Found"})
        
        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

    # =================== API PUT ===================
    def handle_api_put(self, path):
        body = self.read_json_body()
        if body is None:
            self.send_json(400, {"error": "Invalid JSON body"})
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if path.startswith('/api/customers/') and path.endswith('/order'):
                parts = path.split('/')
                phone = unquote(parts[3]) if len(parts) >= 4 else None
                amount = body.get('amount', 0)
                
                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                customer = cursor.fetchone()
                if not customer:
                    self.send_json(404, {"error": "Customer not found"})
                    return
                
                cursor.execute(
                    "UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE phone = ?",
                    (amount, phone)
                )
                conn.commit()
                
                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                updated_customer = cursor.fetchone()
                self.send_json(200, dict(updated_customer))
                
            elif path.startswith('/api/stock/') and not path.endswith('/deduct') and not path.endswith('/init'):
                parts = path.split('/')
                product_id = unquote(parts[3]) if len(parts) >= 4 else None
                
                qty = body.get('quantity')
                low_stock_threshold = body.get('low_stock_threshold')
                now = datetime.now().isoformat()
                
                cursor.execute("SELECT * FROM stock WHERE product_id = ?", (product_id,))
                if not cursor.fetchone():
                    self.send_json(404, {"error": "Product not found"})
                    return
                
                updates = []
                params = []
                if qty is not None:
                    updates.append("quantity = ?")
                    params.append(qty)
                if low_stock_threshold is not None:
                    updates.append("low_stock_threshold = ?")
                    params.append(low_stock_threshold)
                
                if updates:
                    updates.append("updated_at = ?")
                    params.append(now)
                    query = f"UPDATE stock SET {', '.join(updates)} WHERE product_id = ?"
                    params.append(product_id)
                    cursor.execute(query, tuple(params))
                    conn.commit()
                
                cursor.execute("SELECT * FROM stock WHERE product_id = ?", (product_id,))
                updated_stock = cursor.fetchone()
                self.send_json(200, dict(updated_stock))
            
            elif path.startswith('/api/customers/') and path.endswith('/custom-code'):
                parts = path.split('/')
                phone = unquote(parts[3]) if len(parts) >= 4 else None

                code = str(body.get('code', '')).strip().upper()
                discount = int(body.get('discount', 0))

                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                customer = cursor.fetchone()
                if not customer:
                    self.send_json(404, {"error": "Customer not found"})
                    return

                cursor.execute(
                    "UPDATE customers SET custom_code = ?, custom_discount = ? WHERE phone = ?",
                    (code, discount, phone)
                )
                conn.commit()

                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                updated_customer = cursor.fetchone()
                self.send_json(200, dict(updated_customer))

            elif path.startswith('/api/messages/') and path.endswith('/read'):
                parts = path.split('/')
                msg_id = unquote(parts[3]) if len(parts) >= 4 else None

                cursor.execute("UPDATE messages SET is_read = 1 WHERE id = ?", (msg_id,))
                conn.commit()
                self.send_json(200, {"message": "Message marked as read"})

            else:
                self.send_json(404, {"error": "Not Found"})
                
        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

    # =================== API DELETE ===================
    def handle_api_delete(self, path, query_params):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Müşteri Sil
            if path.startswith('/api/customers/'):
                phone = unquote(path.split('/')[-1])
                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
                customer = cursor.fetchone()
                if not customer:
                    self.send_json(404, {"error": "Customer not found"})
                    return

                cursor.execute("DELETE FROM customers WHERE phone = ?", (phone,))
                cursor.execute("DELETE FROM messages WHERE customer_phone = ?", (phone,))
                conn.commit()
                self.send_json(200, {"message": f"Customer {phone} deleted successfully"})

            # Yorum Sil (DELETE /api/reviews/{id} veya DELETE /api/reviews?id=123)
            elif path.startswith('/api/reviews'):
                review_id = None
                if path.startswith('/api/reviews/'):
                    review_id = unquote(path.split('/')[-1])
                elif 'id' in query_params:
                    review_id = query_params['id'][0]

                if not review_id:
                    self.send_json(400, {"error": "Review ID required"})
                    return

                cursor.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
                conn.commit()
                self.send_json(200, {"message": f"Review {review_id} deleted successfully"})

            # Gider Sil (DELETE /api/expenses/{id} veya DELETE /api/expenses?id=123)
            elif path.startswith('/api/expenses'):
                expense_id = None
                if path.startswith('/api/expenses/'):
                    expense_id = unquote(path.split('/')[-1])
                elif 'id' in query_params:
                    expense_id = query_params['id'][0]

                if not expense_id:
                    self.send_json(400, {"error": "Expense ID required"})
                    return

                cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
                conn.commit()
                self.send_json(200, {"message": f"Expense {expense_id} deleted successfully"})

            else:
                self.send_json(404, {"error": "Not Found"})

        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

if __name__ == '__main__':
    init_db()
    os.chdir(DIRECTORY)
    for port in [8080, 8081, 3000, 5000]:
        try:
            with socketserver.TCPServer(("", port), PitaMutfakHandler) as httpd:
                print("=" * 60)
                print("[PITA MUTFAK] Cevrimici Siparis, Dogrulama & Yonetim Sistemi")
                print("=" * 60)
                print(f"Sunucu basariyla calisiyor: http://localhost:{port}")
                print(f"- Musteri Menusu   : http://localhost:{port}/")
                print(f"- Admin Paneli     : http://localhost:{port}/#/admin")
                print(f"- Kurye Paneli     : http://localhost:{port}/#/kurye")
                print("=" * 60)
                print("Durdurmak icin Ctrl+C tuslayiniz.\n")
                sys.stdout.flush()
                httpd.serve_forever()
                break
        except OSError:
            continue
