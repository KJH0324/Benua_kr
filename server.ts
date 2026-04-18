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

const upload = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

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
    points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'BEIGE',
    tier_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    google_id TEXT,
    naver_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS point_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount INTEGER,
    reason TEXT,
    type TEXT, -- EARNED, USED, MANUAL_EARN, MANUAL_DEDUCT
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT NOT NULL, -- FIXED, PERCENT, SHIPPING, WELCOME_GIFT
    value INTEGER DEFAULT 0,
    min_order_amount INTEGER DEFAULT 0,
    max_discount_amount INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    coupon_id INTEGER,
    is_used INTEGER DEFAULT 0,
    used_at DATETIME,
    notified INTEGER DEFAULT 0, -- 0: Not notified, 1: Notified
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(coupon_id) REFERENCES coupons(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    user_id INTEGER,
    order_id INTEGER,
    rating INTEGER,
    content TEXT,
    image_url TEXT,
    type TEXT, -- TEXT, PHOTO
    points_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(order_id) REFERENCES orders(id)
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
    discount_rate INTEGER DEFAULT 0,
    show_on_main INTEGER DEFAULT 0,
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
    used_points INTEGER DEFAULT 0,
    used_coupon_id INTEGER,
    earned_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, paid, shipping, delivered, completed, refund_requested, refunded
    payment_method TEXT,
    tracking_number TEXT,
    shipping_company TEXT,
    refund_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    name TEXT,
    price INTEGER,
    quantity INTEGER,
    image_url TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS admin_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT UNIQUE NOT NULL,
    totp_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reply_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    replied_at DATETIME
  );
`);

// Defensive ALTER TABLE statements with better error reporting
const migrate = (sql: string) => {
  try {
    db.exec(sql);
  } catch (e: any) {
    if (!e.message.includes("duplicate column name")) {
      console.log(`[DB MIGRATION INFO] ${e.message}`);
    }
  }
};

migrate(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0`);
migrate(`ALTER TABLE products ADD COLUMN material TEXT`);
migrate(`ALTER TABLE products ADD COLUMN dimensions TEXT`);
migrate(`ALTER TABLE products ADD COLUMN origin TEXT`);
migrate(`ALTER TABLE products ADD COLUMN description_image_url TEXT`);
migrate(`ALTER TABLE products ADD COLUMN category TEXT`);
migrate(`ALTER TABLE products ADD COLUMN discount_rate INTEGER DEFAULT 0`);
migrate(`ALTER TABLE products ADD COLUMN show_on_main INTEGER DEFAULT 0`);

migrate(`ALTER TABLE inquiries ADD COLUMN status TEXT DEFAULT 'pending'`);
migrate(`ALTER TABLE inquiries ADD COLUMN reply_message TEXT`);
migrate(`ALTER TABLE inquiries ADD COLUMN replied_at DATETIME`);

migrate(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`);
migrate(`ALTER TABLE users ADD COLUMN grade TEXT DEFAULT 'Sand'`);
migrate(`ALTER TABLE users ADD COLUMN total_spent_6m INTEGER DEFAULT 0`);

migrate(`ALTER TABLE orders ADD COLUMN used_points INTEGER DEFAULT 0`);
migrate(`ALTER TABLE orders ADD COLUMN used_coupon_id INTEGER`);
migrate(`ALTER TABLE orders ADD COLUMN earned_points INTEGER DEFAULT 0`);
migrate(`ALTER TABLE orders ADD COLUMN order_data_json TEXT`);
migrate(`ALTER TABLE orders ADD COLUMN tracking_number TEXT`);
migrate(`ALTER TABLE orders ADD COLUMN shipping_company TEXT`);

migrate(`ALTER TABLE user_coupons ADD COLUMN notified INTEGER DEFAULT 0`);
migrate(`ALTER TABLE users ADD COLUMN google_id TEXT`);
migrate(`ALTER TABLE users ADD COLUMN naver_id TEXT`);

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

  // Essential for proxies like Nginx/ALB on Lightsail to handle cookies correctly
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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

  const authenticateUser = (req: any, res: any, next: any) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  // --- Point & Tier Constants ---
  const TIER_CONFIG = {
    BEIGE: { name: "베이지", min_spend: 0, accrual_rate: 0.01 },
    GREEN: { name: "그린", min_spend: 100000, accrual_rate: 0.03 },
    BLACK: { name: "블랙", min_spend: 500000, accrual_rate: 0.05, free_shipping: true },
    THE_BLACK: { name: "더 블랙", min_spend: 1000000, accrual_rate: 0.07, free_shipping: true }
  };

  const calculateUserTier = (spending6Months: number) => {
    if (spending6Months >= TIER_CONFIG.THE_BLACK.min_spend) return 'THE_BLACK';
    if (spending6Months >= TIER_CONFIG.BLACK.min_spend) return 'BLACK';
    if (spending6Months >= TIER_CONFIG.GREEN.min_spend) return 'GREEN';
    return 'BEIGE';
  };

  const issueTierCoupons = (userId: number, fromTier: string, toTier: string) => {
    const tierOrder = ['BEIGE', 'GREEN', 'BLACK', 'THE_BLACK'];
    const fromIdx = tierOrder.indexOf(fromTier);
    const toIdx = tierOrder.indexOf(toTier);

    if (toIdx <= fromIdx) return;

    // Issue for each step up
    for (let i = fromIdx + 1; i <= toIdx; i++) {
        const tier = tierOrder[i];
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 30);
        const expires_str = expires_at.toISOString();

        if (tier === 'BEIGE') {
            const c = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("베이지 웰컴 배송권", `BEIGE-WELCOME-${Date.now()}`, "SHIPPING", 0, 0);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c.lastInsertRowid, expires_str);
        } else if (tier === 'GREEN') {
            const c1 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("그린 프리 배송권", `GREEN-FREE-${Date.now()}`, "SHIPPING", 0, 0);
            const c2 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("그린 감사 할인권", `GREEN-THANKS-${Date.now()}`, "FIXED", 3000, 30000);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c1.lastInsertRowid, expires_str);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c2.lastInsertRowid, expires_str);
        } else if (tier === 'BLACK') {
            const c1 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)").run("블랙 10% 감사권", `BLACK-10P-${Date.now()}`, "PERCENT", 10, 0, 10000);
            const c2 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("블랙 쇼핑 지원금", `BLACK-SUPPORT-${Date.now()}`, "FIXED", 5000, 40000);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c1.lastInsertRowid, expires_str);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c2.lastInsertRowid, expires_str);
        } else if (tier === 'THE_BLACK') {
            const c1 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)").run("더 블랙 VVIP 20%", `TBLACK-20P-${Date.now()}`, "PERCENT", 20, 0, 30000);
            const c2 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("더 블랙 스페셜 1만", `TBLACK-SPECIAL-${Date.now()}`, "FIXED", 10000, 50000);
            const c3 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("더 블랙 베이직 5천", `TBLACK-5K-1-${Date.now()}`, "FIXED", 5000, 30000);
            const c4 = db.prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, ?, ?, ?)").run("더 블랙 베이직 5천", `TBLACK-5K-2-${Date.now()}`, "FIXED", 5000, 30000);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c1.lastInsertRowid, expires_str);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c2.lastInsertRowid, expires_str);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c3.lastInsertRowid, expires_str);
            db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(userId, c4.lastInsertRowid, expires_str);
        }
    }
  };

  const updateUserTierStatus = (userId: number) => {
    // 6 months spending
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const spendingRow = db.prepare("SELECT SUM(total_amount - shipping_fee) as spent FROM orders WHERE user_id = ? AND created_at > ?").get(userId, sixMonthsAgo.toISOString()) as any;
    const spent = spendingRow.spent || 0;
    
    const user = db.prepare("SELECT tier FROM users WHERE id = ?").get(userId) as any;
    const oldTier = user.tier || 'BEIGE';
    const newTier = calculateUserTier(spent);

    if (newTier !== oldTier) {
        db.prepare("UPDATE users SET tier = ?, tier_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newTier, userId);
        issueTierCoupons(userId, oldTier, newTier);
    }
    return { spent, tier: newTier };
  };

  // --- User Auth APIs ---
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, phone, zipcode, address, detail_address, google_id, naver_id } = req.body;
    try {
      const hashedPassword = hashPassword(password);
      const info = db.prepare(
        "INSERT INTO users (email, password, name, phone, zipcode, address, detail_address, google_id, naver_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(email, hashedPassword, name, phone, zipcode, address, detail_address, google_id || null, naver_id || null);
      
      const token = jwt.sign({ id: info.lastInsertRowid, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });
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
    console.log(`[AUTH] Login attempt - Email: ${email}`);
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        console.log(`[AUTH] Login Failed: User not found for ${email}`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }

      const inputHash = hashPassword(password);
      if (user.password !== inputHash) {
        console.log(`[AUTH] Login Failed: Password mismatch for ${email}`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }
      
      console.log(`[AUTH] Login Success: User ID ${user.id} (${user.name})`);
      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });
      res.json({ success: true, user: { name: user.name, email: user.email, address: user.address } });
    } catch (err) {
      console.error("[AUTH] Login Exception:", err);
      res.status(500).json({ error: "로그인 실패" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    // Prevent caching of auth status
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    const token = req.cookies.user_token;
    if (!token) {
      console.log("[AUTH/ME] No token cookie found.");
      return res.json({ user: null });
    }
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      console.log(`[AUTH/ME] Verifying token for user ID: ${decoded.id}`);
      
      // Keep tier status fresh
      const status = updateUserTierStatus(decoded.id);
      
      const user = db.prepare("SELECT id, name, email, phone, zipcode, address, detail_address, google_id, naver_id, points, tier, tier_updated_at FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user) {
        console.log(`[AUTH/ME] User not found in DB for ID: ${decoded.id}`);
        return res.json({ user: null });
      }
      res.json({ user: { ...user, ...status, tier_config: TIER_CONFIG } });
    } catch (err) {
      console.error("[AUTH/ME] Token verification failed:", err);
      res.json({ user: null });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("user_token");
    res.json({ success: true });
  });

  app.put("/api/auth/me", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "로그인이 필요합니다." });
    
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { name, phone, zipcode, address, detail_address } = req.body;
      
      db.prepare(
        "UPDATE users SET name = ?, phone = ?, zipcode = ?, address = ?, detail_address = ? WHERE id = ?"
      ).run(name, phone, zipcode, address, detail_address, decoded.id);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "정보 수정 실패" });
    }
  });

  // --- OAuth APIs ---
  const getRedirectUri = (req: express.Request, provider: string) => {
    // User requested to force production URI for standalone server usage
    return `https://benua.shop/api/auth/${provider}/callback`;
  };

  // Bulk Product Processing
  app.post("/api/admin/products/bulk", authenticateAdmin, (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: "Invalid data format" });

    try {
      const insert = db.prepare(
        "INSERT INTO products (name, price, description, category, stock, material, dimensions, origin, discount_rate, show_on_main) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );

      const transaction = db.transaction((items) => {
        for (const item of items) {
          insert.run(
            item.name,
            item.price || 0,
            item.description || "",
            item.category || "기반",
            item.stock || 0,
            item.material || "",
            item.dimensions || "",
            item.origin || "",
            item.discount_rate || 0,
            item.show_on_main ? 1 : 0
          );
        }
      });

      transaction(products);
      res.json({ success: true, count: products.length });
    } catch (err: any) {
      res.status(500).json({ error: "Bulk insert failed: " + err.message });
    }
  });

  // Export Orders
  app.get("/api/admin/orders/export", authenticateAdmin, (req, res) => {
    try {
      const orders = db.prepare(`
        SELECT o.order_number, o.customer_name, o.customer_email, o.total_amount, o.status, o.created_at, o.tracking_number, o.shipping_company
        FROM orders o
        ORDER BY o.created_at DESC
      `).all();
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Tracking Number Update with Auto-Status Change
  app.post("/api/admin/orders/:id/tracking", authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const { tracking_number, shipping_company } = req.body;
    console.log(`[ADMIN] Updating tracking for order ${id}: ${shipping_company} ${tracking_number}`);
    try {
      const result = db.prepare(
        "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping' WHERE id = ?"
      ).run(tracking_number, shipping_company, id);
      
      if (result.changes === 0) {
        console.log(`[ADMIN] Tracking update failed: Order ${id} not found`);
        return res.status(404).json({ error: "Order not found" });
      }
      
      console.log(`[ADMIN] Tracking updated successfully for order ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[ADMIN] Tracking update EXCEPTION:", err);
      res.status(500).json({ error: "Tracking update failed: " + err.message });
    }
  });

  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google Client ID is not configured" });
    }
    const redirectUri = getRedirectUri(req, "google");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email profile",
      access_type: "offline",
      prompt: "consent"
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req, "google");
    const existingToken = req.cookies.user_token;
    
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Google Token Exchange Error:", errText);
        throw new Error("Failed to exchange Google token");
      }
      
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        throw new Error("No access token from Google");
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      
      if (!userRes.ok) {
        const errText = await userRes.text();
        console.error("Google User Info Error:", errText);
        throw new Error("Failed to get Google user info");
      }
      
      const userData = await userRes.json();
      
      // Handle linking if logged in
      if (existingToken) {
        try {
          const decoded: any = jwt.verify(existingToken, JWT_SECRET);
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id, decoded.id);
          res.send(`<html><body><script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_LINK_SUCCESS', provider: 'google' }, '*'); window.close(); }</script></body></html>`);
          return;
        } catch (e) {
          // Token invalid, proceed as login
        }
      }

      // Try login by google_id first, then email
      let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(userData.id) as any;
      if (!user) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(userData.email) as any;
        if (user) {
          // Auto-link if email matches
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id, user.id);
        }
      }
      
      if (!user) {
        res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${userData.email}', socialId: '${userData.id}', provider: 'google' }, '*');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${userData.email}&socialId=${userData.id}&provider=google';
            }
          </script></body></html>
        `);
        return;
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/profile';
          }
        </script></body></html>
      `);
    } catch (error) {
      console.error("Google Callback Error:", error);
      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'server_error' }, '*');
            window.close();
          } else {
            window.location.href = '/login?error=server_error';
          }
        </script></body></html>
      `);
    }
  });

  app.get("/api/auth/naver/url", (req, res) => {
    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Naver Client ID is not configured" });
    }
    const redirectUri = getRedirectUri(req, "naver");
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state
    });
    res.json({ url: `https://nid.naver.com/oauth2.0/authorize?${params}` });
  });

  app.get("/api/auth/naver/callback", async (req, res) => {
    const { code, state } = req.query;
    const redirectUri = getRedirectUri(req, "naver");
    const existingToken = req.cookies.user_token;
    
    try {
      const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code as string}&state=${state as string}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Naver Token Exchange Error:", errText);
        throw new Error("Failed to exchange Naver token");
      }
      
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        console.error("Naver Token Data Error:", tokenData);
        throw new Error("No access token from Naver");
      }

      const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      
      if (!userRes.ok) {
        const errText = await userRes.text();
        console.error("Naver User Info Error:", errText);
        throw new Error("Failed to get Naver user info");
      }
      
      const userData = await userRes.json();
      
      if (userData.resultcode !== "00") throw new Error("Failed to get user profile");

      const socialId = userData.response.id;
      const email = userData.response.email;

      // Handle linking if logged in
      if (existingToken) {
        try {
          const decoded: any = jwt.verify(existingToken, JWT_SECRET);
          db.prepare("UPDATE users SET naver_id = ? WHERE id = ?").run(socialId, decoded.id);
          res.send(`<html><body><script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_LINK_SUCCESS', provider: 'naver' }, '*'); window.close(); }</script></body></html>`);
          return;
        } catch (e) {
          // Token invalid, proceed as login
        }
      }

      // Try login by naver_id first, then email
      let user = db.prepare("SELECT * FROM users WHERE naver_id = ?").get(socialId) as any;
      if (!user) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
        if (user) {
          // Auto-link if email matches
          db.prepare("UPDATE users SET naver_id = ? WHERE id = ?").run(socialId, user.id);
        }
      }
      
      if (!user) {
        res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${email}', socialId: '${socialId}', provider: 'naver' }, '*');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${email}&socialId=${socialId}&provider=naver';
            }
          </script></body></html>
        `);
        return;
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("user_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/profile';
          }
        </script></body></html>
      `);
    } catch (error) {
      console.error("Naver Callback Error:", error);
      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'server_error' }, '*');
            window.close();
          } else {
            window.location.href = '/login?error=server_error';
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
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("admin_token", jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
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
    }
  });

  // --- Coupon Management (Admin) ---
  app.get("/api/admin/coupons", authenticateAdmin, (req, res) => {
    try {
      const coupons = db.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
      res.json(coupons);
    } catch (err) {
      res.status(500).json({ error: "쿠폰 조회 실패" });
    }
  });

  app.post("/api/admin/coupons", authenticateAdmin, (req, res) => {
    const { name, code, type, value, min_order_amount, max_discount_amount } = req.body;
    try {
      db.prepare(
        "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(name, code, type, value, min_order_amount, max_discount_amount);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "쿠폰 등록 실패: " + err.message });
    }
  });

  app.delete("/api/admin/coupons/:id", authenticateAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM coupons WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "쿠폰 삭제 실패" });
    }
  });

  // Give coupon to users
  app.post("/api/admin/coupons/:id/give", authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const { target } = req.body; // 'all' or specific user email
    
    try {
      const coupon = db.prepare("SELECT * FROM coupons WHERE id = ?").get(id);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });

      if (target === 'all') {
        const users = db.prepare("SELECT id FROM users").all() as any[];
        const insert = db.prepare("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)");
        const transaction = db.transaction((userList) => {
          for (const user of userList) {
            insert.run(user.id, id);
          }
        });
        transaction(users);
      } else {
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(target) as any;
        if (!user) return res.status(404).json({ error: "User not found" });
        db.prepare("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)").run(user.id, id);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "쿠폰 지급 실패: " + err.message });
    }
  });

  // --- Coupon (User) ---
  app.get("/api/coupons/me", authenticateUser, (req: any, res) => {
    try {
      const coupons = db.prepare(`
        SELECT uc.*, c.name, c.code, c.type, c.value, c.min_order_amount, c.max_discount_amount
        FROM user_coupons uc
        JOIN coupons c ON uc.coupon_id = c.id
        WHERE uc.user_id = ? AND uc.is_used = 0 AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)
        ORDER BY uc.created_at DESC
      `).all(req.user.id);
      res.json(coupons);
    } catch (err) {
      res.status(500).json({ error: "쿠폰 조회 실패" });
    }
  });

  app.get("/api/coupons/notifications", authenticateUser, (req: any, res) => {
    try {
      const newCoupons = db.prepare(`
        SELECT uc.id, c.name, c.type, c.value
        FROM user_coupons uc
        JOIN coupons c ON uc.coupon_id = c.id
        WHERE uc.user_id = ? AND uc.notified = 0 AND uc.is_used = 0
      `).all(req.user.id) as any[];

      res.json(newCoupons);
    } catch (err) {
      res.status(500).json({ error: "알림 조회 실패" });
    }
  });

  app.post("/api/coupons/notifications/ack", authenticateUser, (req: any, res) => {
    const { ids } = req.body;
    try {
      const update = db.prepare("UPDATE user_coupons SET notified = 1 WHERE id = ? AND user_id = ?");
      const transaction = db.transaction((couponIds) => {
        for (const id of couponIds) {
          update.run(id, req.user.id);
        }
      });
      transaction(ids);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "알림 확인 처리 실패" });
    }
  });

  app.post("/api/coupons/validate", authenticateUser, (req: any, res) => {
    const { code, order_amount } = req.body;
    try {
      const coupon = db.prepare(`
        SELECT uc.id as user_coupon_id, c.*
        FROM user_coupons uc
        JOIN coupons c ON uc.coupon_id = c.id
        WHERE uc.user_id = ? AND (c.code = ? OR c.name = ?) AND uc.is_used = 0 
        AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)
      `).get(req.user.id, code, code) as any;

      if (!coupon) {
        return res.status(400).json({ error: "유효하지 않거나 이미 사용된 쿠폰입니다." });
      }

      const minAmount = coupon.min_order_amount || 0;
      if (order_amount < minAmount) {
        return res.status(400).json({ error: `최소 주문 금액 ${formatPrice(minAmount)}원 이상 시 사용 가능합니다.` });
      }

      let discount = 0;
      if (coupon.type === 'FIXED') {
        discount = coupon.value;
      } else if (coupon.type === 'PERCENT') {
        discount = Math.floor(order_amount * (coupon.value / 100));
        if (coupon.max_discount_amount > 0 && discount > coupon.max_discount_amount) {
          discount = coupon.max_discount_amount;
        }
      } else if (coupon.type === 'SHIPPING') {
        // Shipping discount is handled in the frontend by knowing it's a shipping coupon
        // But for calculation here we'll assume it covers the shipping fee if we knew it
        // For now, validation just returns the coupon info.
      }

      res.json({ coupon, discount });
    } catch (err) {
      console.error("Coupon validation error:", err);
      res.status(500).json({ error: "쿠폰 확인 실패" });
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
    const { name, price, description, category, stock, material, dimensions, origin, discount_rate, show_on_main } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // Validate required fields
    if (!name || isNaN(parseInt(price))) {
      return res.status(400).json({ error: "상품명과 가격은 필수이며, 가격은 숫자여야 합니다." });
    }

    const image_url = files["image"] ? `/uploads/${files["image"][0].filename}` : null;
    const description_image_url = files["description_image"] ? `/uploads/${files["description_image"][0].filename}` : null;

    try {
      const parsedPrice = parseInt(price);
      const parsedStock = parseInt(stock) || 0;
      const parsedDiscount = parseInt(discount_rate) || 0;
      const parsedShowOnMain = show_on_main === "true" || show_on_main === "1" ? 1 : 0;

      const info = db.prepare(
        "INSERT INTO products (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin, discount_rate, show_on_main) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, parsedPrice, description, image_url, description_image_url, category, parsedStock, material, dimensions, origin, parsedDiscount, parsedShowOnMain);
      
      console.log("Product created successfully:", name, "ID:", info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error("Failed to create product:", err);
      res.status(500).json({ error: "상품 등록에 실패했습니다: " + err.message });
    }
  });

  app.put("/api/products/:id", authenticateAdmin, upload.fields([
    { name: "image", maxCount: 1 },
    { name: "description_image", maxCount: 1 }
  ]), (req: any, res) => {
    const { id } = req.params;
    const { name, price, description, category, stock, material, dimensions, origin, discount_rate, show_on_main } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
      if (!product) return res.status(404).json({ error: "Product not found" });

      const image_url = files["image"] ? `/uploads/${files["image"][0].filename}` : product.image_url;
      const description_image_url = files["description_image"] ? `/uploads/${files["description_image"][0].filename}` : product.description_image_url;
      
      const parsedPrice = parseInt(price);
      const parsedStock = parseInt(stock) || 0;
      const parsedDiscount = parseInt(discount_rate) || 0;
      const parsedShowOnMain = show_on_main === "true" || show_on_main === "1" ? 1 : 0;

      db.prepare(
        "UPDATE products SET name = ?, price = ?, description = ?, image_url = ?, description_image_url = ?, category = ?, stock = ?, material = ?, dimensions = ?, origin = ?, discount_rate = ?, show_on_main = ? WHERE id = ?"
      ).run(name, parsedPrice, description, image_url, description_image_url, category, parsedStock, material, dimensions, origin, parsedDiscount, parsedShowOnMain, id);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update product:", err);
      res.status(500).json({ error: "상품 수정 실패" });
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
    const { user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee, items, used_points, used_coupon_id, payment_method } = req.body;
    const order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const transaction = db.transaction(() => {
        // 1. Create Order
        const info = db.prepare(
          "INSERT INTO orders (order_number, user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee, used_points, used_coupon_id, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(order_number, user_id, customer_name, customer_email, shipping_address, total_amount, shipping_fee, used_points || 0, used_coupon_id || null, payment_method || 'card', 'paid');
        
        const orderId = info.lastInsertRowid;

        // 2. Add Order Items and Reduce Stock
        if (items && Array.isArray(items)) {
          for (const item of items) {
            db.prepare(
              "INSERT INTO order_items (order_id, product_id, name, price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(orderId, item.id, item.name, item.price, item.quantity, item.image);

            db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(item.quantity, item.id);
          }
        }

        // 3. Deduct Points
        if (user_id && used_points > 0) {
            const userRow = db.prepare("SELECT points FROM users WHERE id = ?").get(user_id) as any;
            if (userRow.points < 1000) throw new Error("포인트는 1,000P 이상 보유 시 사용 가능합니다.");
            if (used_points > userRow.points) throw new Error("보유 포인트보다 많은 포인트를 사용할 수 없습니다.");
            if (used_points < 1000) throw new Error("포인트는 최소 1,000P 이상 사용해야 합니다.");

            db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(used_points, user_id);
            db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, ?)").run(
                user_id, 
                -used_points, 
                `주문 ${order_number} 사용`, 
                'USED'
            );
        }

        // 4. Mark Coupon Used
        if (user_id && used_coupon_id) {
            db.prepare("UPDATE user_coupons SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(used_coupon_id, user_id);
        }

        return orderId;
      });

      transaction();
      res.json({ success: true, order_number });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "주문 생성 실패: " + err.message });
    }
  });

  app.get("/api/orders/me", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(decoded.id);
      for (const order of orders as any) {
          order.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      }
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: "주문 내역 조회 실패" });
    }
  });

  app.get("/api/admin/orders", authenticateAdmin, (req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
      for (const order of orders as any) {
        order.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      }
      res.json(orders);
    } catch (err: any) {
      console.error("Admin orders fetch error:", err);
      res.status(500).json({ error: "Failed to fetch orders: " + err.message });
    }
  });

  app.post("/api/admin/orders/:id/status", authenticateAdmin, (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "Order not found" });

      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);

      // Point rewarding on completion (Purchase Confirmation)
      if (status === 'completed' && order.user_id && order.status !== 'completed') {
          const user = db.prepare("SELECT * FROM users WHERE id = ?").get(order.user_id) as any;
          const config = (TIER_CONFIG as any)[user.tier || 'BEIGE'];
          const rate = config.accrual_rate;
          
          const earned = Math.floor((order.total_amount - order.shipping_fee) * rate);
          const expires_at = new Date();
          expires_at.setFullYear(expires_at.getFullYear() + 1);

          db.prepare("UPDATE orders SET earned_points = ? WHERE id = ?").run(earned, id);
          db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(earned, order.user_id);
          db.prepare("INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, ?, ?)").run(
            order.user_id,
            earned,
            `주문 ${order.order_number} 구매 적립`,
            'EARNED',
            expires_at.toISOString()
          );
          
          updateUserTierStatus(order.user_id);
      }
      
      if (status === 'refunded' && order.user_id && order.status !== 'refunded') {
          db.prepare("UPDATE users SET points = MAX(0, points - ?) WHERE id = ?").run(order.earned_points || 0, order.user_id);
          db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, ?)").run(
            order.user_id,
            -(order.earned_points || 0),
            `주문 ${order.order_number} 환불 차감`,
            'USED'
          );
          updateUserTierStatus(order.user_id);
          
          // Return stock
          const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as any[];
          for (const item of items) {
              db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id);
          }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "상태 변경 실패" });
    }
  });

  app.post("/api/admin/orders/:id/tracking", authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const { tracking_number, shipping_company } = req.body;
    try {
      db.prepare("UPDATE orders SET tracking_number = ?, shipping_company = ? WHERE id = ?").run(tracking_number, shipping_company, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update tracking" });
    }
  });

  // Coupons
  app.get("/api/admin/coupons", authenticateAdmin, (req, res) => {
    const coupons = db.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
    res.json(coupons);
  });

  app.post("/api/admin/coupons", authenticateAdmin, (req, res) => {
    const { name, code, type, value, min_order_amount, max_discount_amount } = req.body;
    try {
      db.prepare(
        "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(name, code, type, value, min_order_amount, max_discount_amount);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "쿠폰 생성 실패" });
    }
  });

  app.post("/api/orders/:id/confirm", authenticateUser, (req: any, res) => {
    const { id } = req.params;
    try {
        const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(id, req.user.id) as any;
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.status === 'completed') return res.status(400).json({ error: "Already confirmed" });

        db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(id);
        
        // Point rewarding logic (already integrated in status update handler, but I'll call it explicitly here or trigger it)
        // I'll reuse the logic from the admin status update
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(order.user_id) as any;
        const config = (TIER_CONFIG as any)[user.tier || 'BEIGE'];
        const rate = config.accrual_rate;
        const earned = Math.floor((order.total_amount - order.shipping_fee) * rate);
        const expires_at = new Date();
        expires_at.setFullYear(expires_at.getFullYear() + 1);

        db.prepare("UPDATE orders SET earned_points = ? WHERE id = ?").run(earned, id);
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(earned, order.user_id);
        db.prepare("INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, ?, ?)").run(
            order.user_id,
            earned,
            `주문 ${order.order_number} 구매 확정 적립`,
            'EARNED',
            expires_at.toISOString()
        );
        
        updateUserTierStatus(order.user_id);
        
        res.json({ success: true, earned });
    } catch (err) {
        res.status(500).json({ error: "Confirmation failed" });
    }
  });

  app.post("/api/orders/:id/refund-request", authenticateUser, (req: any, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(id, req.user.id) as any;
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        db.prepare("UPDATE orders SET status = 'refund_requested', refund_reason = ? WHERE id = ?").run(reason, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Refund request failed" });
    }
  });

  app.get("/api/orders/:id/detail", authenticateUser, (req: any, res) => {
    const { id } = req.params;
    try {
        const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(id, req.user.id) as any;
        if (!order) return res.status(404).json({ error: "Order not found" });
        const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id);
        res.json({ ...order, items });
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/reviews", authenticateUser, (req: any, res) => {
    const { product_id, order_id, rating, content, image_url } = req.body;
    try {
        const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(order_id, req.user.id) as any;
        if (!order || order.status !== 'completed') return res.status(400).json({ error: "Only confirmed orders can be reviewed" });
        
        // Check if already reviewed
        const existing = db.prepare("SELECT id FROM reviews WHERE order_id = ? AND product_id = ?").get(order_id, product_id);
        if (existing) return res.status(400).json({ error: "Already reviewed" });

        const user = db.prepare("SELECT id, tier FROM users WHERE id = ?").get(req.user.id) as any;
        const type = image_url ? 'PHOTO' : 'TEXT';
        
        // Points logic
        let points = 0;
        const isPremium = user.tier === 'BLACK' || user.tier === 'THE_BLACK';
        if (type === 'TEXT') {
            points = isPremium ? 500 : 100;
        } else {
            points = isPremium ? 2000 : 500;
        }

        db.transaction(() => {
            db.prepare(
                "INSERT INTO reviews (product_id, user_id, order_id, rating, content, image_url, type, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ).run(product_id, req.user.id, order_id, rating, content, image_url, type, points);

            db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, req.user.id);
            db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, ?)")
              .run(req.user.id, points, `상품 리뷰(${type}) 작성 적립`, 'EARNED');
        });

        res.json({ success: true, points_earned: points });
    } catch (err) {
        res.status(500).json({ error: "Review failed" });
    }
  });

  app.get("/api/products/:id/reviews", (req, res) => {
    const { id } = req.params;
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.name as user_name, u.tier as user_tier
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `).all(id);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
  });
  app.get("/api/user/coupons", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const coupons = db.prepare(`
            SELECT uc.id as user_coupon_id, c.*, uc.expires_at, uc.is_used 
            FROM user_coupons uc 
            JOIN coupons c ON uc.coupon_id = c.id 
            WHERE uc.user_id = ? AND uc.is_used = 0 AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)
        `).all(decoded.id);
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ error: "쿠폰 조회 실패" });
    }
  });

  app.post("/api/admin/users/points", authenticateAdmin, (req, res) => {
      const { email, amount } = req.body;
      try {
          const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
          if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

          const type = amount >= 0 ? 'MANUAL_EARN' : 'MANUAL_DEDUCT';
          const expires_at = new Date();
          expires_at.setFullYear(expires_at.getFullYear() + 1);

          db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(amount, user.id);
          db.prepare("INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, ?, ?)").run(
            user.id, 
            amount, 
            "관리자 수동 지급/차감", 
            type, 
            expires_at.toISOString()
          );

          res.json({ success: true });
      } catch (err) {
          res.status(500).json({ error: "포인트 지급 실패" });
      }
  });

  // Reviews
  app.post("/api/reviews", (req, res) => {
      const token = req.cookies.user_token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const { order_id, product_id, rating, content, image_url } = req.body;
      try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
          
          let points = 100;
          if (image_url) points = 500;
          if (user.grade === 'Black' || user.grade === 'The Black') {
              points = image_url ? 2000 : 500;
          }
          
          db.prepare(
              "INSERT INTO reviews (product_id, user_id, order_id, rating, content, image_url, type, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(product_id, user.id, order_id, rating, content, image_url, image_url ? 'PHOTO' : 'TEXT', points);
          
          db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, user.id);
          res.json({ success: true, points_earned: points });
      } catch (err) {
          res.status(500).json({ error: "리뷰 작성 실패" });
      }
  });

  app.get("/api/products/:id/reviews", (req, res) => {
      try {
          const reviews = db.prepare(`
              SELECT r.*, u.name as user_name 
              FROM reviews r 
              JOIN users u ON r.user_id = u.id 
              WHERE r.product_id = ? 
              ORDER BY r.created_at DESC
          `).all(req.params.id);
          res.json(reviews);
      } catch (err) {
          res.status(500).json({ error: "리뷰 조회 실패" });
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

  // Inquiries
  app.post("/api/inquiries", (req, res) => {
    const { name, email, subject, message } = req.body;
    try {
      db.prepare(
        "INSERT INTO inquiries (name, email, subject, message) VALUES (?, ?, ?, ?)"
      ).run(name, email, subject, message);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Inquiry submission failed" });
    }
  });

  app.get("/api/admin/inquiries", authenticateAdmin, (req, res) => {
    try {
      const inquiries = db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all();
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  app.post("/api/admin/inquiries/:id/reply", authenticateAdmin, (req, res) => {
    const { replyMessage } = req.body;
    const { id } = req.params;
    try {
      db.prepare(
        "UPDATE inquiries SET reply_message = ?, status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(replyMessage, id);
      
      // Simulate email sending
      console.log(`[SIMULATED EMAIL] To: (User's Email), Message: ${replyMessage}`);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to send reply" });
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
