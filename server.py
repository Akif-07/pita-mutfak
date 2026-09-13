import http.server
import socketserver
import os
import sys
import sqlite3
import json
from urllib.parse import urlparse, unquote
from datetime import datetime

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DIRECTORY, "pita_mutfak.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
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
        cursor.execute("ALTER TABLE customers ADD COLUMN custom_code TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN custom_discount INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stock (
      product_id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 50,
      low_stock_threshold INTEGER DEFAULT 5,
      updated_at TEXT
    )
    ''')

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
    
    conn.commit()
    conn.close()

class PitaMutfakHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # CORS & Onbellek basliklari
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
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
            body = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
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

        if path.startswith('/api/'):
            self.handle_api_get(path)
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

        if path.startswith('/api/'):
            self.handle_api_delete(path)
        else:
            self.send_error(405, "Method Not Allowed")

    def handle_api_get(self, path):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if path == '/api/customers':
                cursor.execute("SELECT * FROM customers")
                customers = [dict(row) for row in cursor.fetchall()]
                self.send_json(200, customers)
            
            elif path.startswith('/api/customers/'):
                phone = unquote(path.split('/')[-1])
                cursor.execute("SELECT * FROM customers WHERE phone = ?", (phone,))
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
            
            else:
                self.send_json(404, {"error": "Not Found"})
        
        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

    def handle_api_post(self, path):
        body = self.read_json_body()
        if body is None:
            self.send_json(400, {"error": "Invalid JSON body"})
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if path == '/api/customers':
                name = body.get('name')
                phone = body.get('phone')
                
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
                        "INSERT INTO customers (name, phone, registered_at) VALUES (?, ?, ?)",
                        (name, phone, registered_at)
                    )
                    conn.commit()
                    customer_id = cursor.lastrowid
                    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
                    new_customer = cursor.fetchone()
                    self.send_json(201, dict(new_customer))
            
            elif path == '/api/stock/deduct':
                items = body.get('items', [])
                if not isinstance(items, list):
                    self.send_json(400, {"error": "Items must be a list"})
                    return
                
                # Check stock before deducting
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
                
                # Deduct
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

            else:
                self.send_json(404, {"error": "Not Found"})
        
        except Exception as e:
            self.send_json(500, {"error": str(e)})
        finally:
            if 'conn' in locals():
                conn.close()

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
                # /api/customers/{phone}/order
                parts = path.split('/')
                if len(parts) >= 4:
                    phone = unquote(parts[3])
                else:
                    self.send_json(400, {"error": "Invalid path"})
                    return

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
                # /api/stock/{productId}
                parts = path.split('/')
                if len(parts) >= 4:
                    product_id = unquote(parts[3])
                else:
                    self.send_json(400, {"error": "Invalid path"})
                    return
                
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
                # /api/customers/{phone}/custom-code
                parts = path.split('/')
                if len(parts) >= 4:
                    phone = unquote(parts[3])
                else:
                    self.send_json(400, {"error": "Invalid path"})
                    return

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
                # /api/messages/{id}/read
                parts = path.split('/')
                if len(parts) >= 4:
                    msg_id = unquote(parts[3])
                else:
                    self.send_json(400, {"error": "Invalid path"})
                    return

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

    def handle_api_delete(self, path):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

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
                print("[PITA MUTFAK] Cevrimici Siparis & Yonetim Sistemi")
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
