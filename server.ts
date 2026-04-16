import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database setup
const db = new Database("benua.db");

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    phone TEXT,
    zipcode TEXT,
    address TEXT,
    detail_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    description_image_url TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    material TEXT,
    dimensions TEXT,
    origin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    shipping_address TEXT,
    total_amount INTEGER,
    shipping_fee INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT UNIQUE NOT NULL,
    totp_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add columns to existing products table if they don't exist (SQLite ALTER TABLE limitation workaround)
try { db.exec(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN material TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN dimensions TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN origin TEXT`); } catch(e) {}

const JWT_SECRET = process.env.JWT_SECRET || "benua-secret-key-2024";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "benua-admin-123";

// Seed initial admin key
const adminKeyCount = db.prepare("SELECT COUNT(*) as count FROM admin_keys").get() as any;
if (adminKeyCount.count === 0) {
  db.prepare("INSERT INTO admin_keys (key_value) VALUES (?)").run(ADMIN_PASSWORD);
}

// Helper to hash password with SHA512
function hashPassword(password: string) {
  return crypto.createHash("sha512").update(password).digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // --- Auth Middleware ---
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- User Auth APIs ---
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, phone, zipcode, address, detail_address } = req.body;
    try {
      const hashedPassword = hashPassword(password);
      const info = db.prepare(
        "INSERT INTO users (email, password, name, phone, zipcode, address, detail_address) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(email, hashedPassword, name, phone, zipcode, address, detail_address);
      
      const token = jwt.sign({ id: info.lastInsertRowid, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("user_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ success: true });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({ error: "이미 존재하는 이메일입니다." });
      }
      res.status(500).json({ error: "회원가입 실패" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }
      
      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("user_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ success: true, user: { name: user.name, email: user.email, address: user.address } });
    } catch (err) {
      res.status(500).json({ error: "로그인 실패" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.json({ user: null });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT id, name, email, phone, zipcode, address, detail_address FROM users WHERE id = ?").get(decoded.id);
      res.json({ user });
    } catch (err) {
      res.json({ user: null });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("user_token");
    res.json({ success: true });
  });

  // --- OAuth APIs ---
  const getRedirectUri = (req: express.Request, provider: string) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}/api/auth/${provider}/callback`;
  };

  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = getRedirectUri(req, 'google');
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req, 'google');
    
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) throw new Error('No access token');

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(userData.email) as any;
      
      if (!user) {
        res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered' }, '*');
              window.close();
            }
          </script></body></html>
        `);
        return;
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
      });

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    } catch (error) {
      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'server_error' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    }
  });

  app.get("/api/auth/naver/url", (req, res) => {
    const redirectUri = getRedirectUri(req, 'naver');
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: process.env.NAVER_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state
    });
    res.json({ url: `https://nid.naver.com/oauth2.0/authorize?${params}` });
  });

  app.get("/api/auth/naver/callback", async (req, res) => {
    const { code, state } = req.query;
    
    try {
      const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code as string}&state=${state as string}`);
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) throw new Error('No access token');

      const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      
      if (userData.resultcode !== '00') throw new Error('Failed to get user profile');

      const email = userData.response.email;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      
      if (!user) {
        res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered' }, '*');
              window.close();
            }
          </script></body></html>
        `);
        return;
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
      });

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    } catch (error) {
      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'server_error' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    }
  });

  // --- API Routes ---

  // Auth
  app.post("/api/admin/verify-key", async (req, res) => {
    const { adminKey } = req.body;
    const keyRecord = db.prepare("SELECT * FROM admin_keys WHERE key_value = ?").get(adminKey) as any;
    
    if (!keyRecord) {
      return res.status(401).json({ error: "유효하지 않은 관리자 Key입니다." });
    }

    if (!keyRecord.totp_secret) {
      const secret = speakeasy.generateSecret({ name: 'Benua Admin' });
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
      return res.json({ requiresSetup: true, secret: secret.base32, qrCodeUrl });
    } else {
      return res.json({ requiresSetup: false });
    }
  });

  app.post("/api/admin/verify-totp", (req, res) => {
    const { adminKey, token, secret } = req.body;
    const keyRecord = db.prepare("SELECT * FROM admin_keys WHERE key_value = ?").get(adminKey) as any;
    
    if (!keyRecord) return res.status(401).json({ error: "유효하지 않은 관리자 Key입니다." });

    const totpSecret = keyRecord.totp_secret || secret;
    if (!totpSecret) return res.status(400).json({ error: "TOTP 시크릿이 없습니다." });

    const isValid = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });
    
    if (!isValid) return res.status(401).json({ error: "잘못된 인증 코드입니다." });

    if (!keyRecord.totp_secret) {
      db.prepare("UPDATE admin_keys SET totp_secret = ? WHERE id = ?").run(totpSecret, keyRecord.id);
    }

    const jwtToken = jwt.sign({ role: "admin", keyId: keyRecord.id }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("admin_token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ success: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/check", authenticateAdmin, (req, res) => {
    res.json({ authenticated: true });
  });

  // Admin Keys Management
  app.get("/api/admin/keys", authenticateAdmin, (req, res) => {
    const keys = db.prepare("SELECT id, key_value, CASE WHEN totp_secret IS NULL THEN 0 ELSE 1 END as has_2fa, created_at FROM admin_keys ORDER BY created_at DESC").all();
    res.json(keys);
  });

  app.post("/api/admin/keys", authenticateAdmin, (req, res) => {
    const { keyValue } = req.body;
    if (!keyValue) return res.status(400).json({ error: "Key 값을 입력해주세요." });
    try {
      db.prepare("INSERT INTO admin_keys (key_value) VALUES (?)").run(keyValue);
      res.json({ success: true });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({ error: "이미 존재하는 Key입니다." });
      }
      res.status(500).json({ error: "Key 추가 실패" });
    }
  });

  app.delete("/api/admin/keys/:id", authenticateAdmin, (req, res) => {
    const count = db.prepare("SELECT COUNT(*) as count FROM admin_keys").get() as any;
    if (count.count <= 1) {
      return res.status(400).json({ error: "최소 1개의 관리자 Key가 필요합니다." });
    }
    db.prepare("DELETE FROM admin_keys WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", (req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", (req, res) => {
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", authenticateAdmin, upload.fields([
    { name: "image", maxCount: 1 },
    { name: "description_image", maxCount: 1 }
  ]), (req: any, res) => {
    const { name, price, description, category, stock, material, dimensions, origin } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    const image_url = files["image"] ? `/uploads/${files["image"][0].filename}` : null;
    const description_image_url = files["description_image"] ? `/uploads/${files["description_image"][0].filename}` : null;

    try {
      const info = db.prepare(
        "INSERT INTO products (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, price, parseInt(price), description, image_url, description_image_url, category, parseInt(stock) || 0, material, dimensions, origin);
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.delete("/api/products/:id", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Orders
  app.post("/api/orders", (req, res) => {
    const { user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee } = req.body;
    const order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const info = db.prepare(
        "INSERT INTO orders (order_number, user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(order_number, user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee);
      
      res.json({ success: true, order_number });
    } catch (err) {
      res.status(500).json({ error: "주문 생성 실패" });
    }
  });

  app.get("/api/orders/me", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(decoded.id);
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.delete("/api/admin/orders/test", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM orders").run();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "테스트 주문 삭제 실패" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
