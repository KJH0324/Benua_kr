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
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email Helper Functions
const sendMail = async (to: string, subject: string, html: string, fromType: 'ADMIN' | 'SUPPORT' | 'NEWS' | 'SYSTEM' = 'SYSTEM') => {
  const fromMap = {
    ADMIN: process.env.SMTP_FROM_ADMIN || 'admin@benua.shop',
    SUPPORT: process.env.SMTP_FROM_SUPPORT || 'support@benua.shop',
    NEWS: process.env.SMTP_FROM_NEWS || 'news@benua.shop',
    SYSTEM: process.env.SMTP_FROM_SYSTEM || 'Benua@benua.shop'
  };

  const mailOptions = {
    from: `"Benua" <${fromMap[fromType]}>`,
    to,
    subject: `[Benua] ${subject}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 8px;">
        <div style="margin-bottom: 40px; text-align: center;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">Benua</h1>
        </div>
        ${html}
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #999; text-align: center;">
          <p>© ${new Date().getFullYear()} Benua. All rights reserved.</p>
          <p>이 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
        </div>
      </div>
    `
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[MAIL][MOCK] Sending to ${to}: ${subject}`);
      return;
    }
    await transporter.sendMail(mailOptions);
    console.log(`[MAIL][SUCCESS] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[MAIL][ERROR] Failed to send to ${to}:`, err);
  }
};

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

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS email_verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
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
    is_best INTEGER DEFAULT 0,
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
    customer_phone TEXT,
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

  CREATE TABLE IF NOT EXISTS display_settings (
    id TEXT PRIMARY KEY,
    type TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active INTEGER DEFAULT 1
  );
`);

// Explicit schema check and migration for users table
const checkAndMigrateUsers = () => {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const columns = tableInfo.map(c => c.name);
    console.log(`[DEBUG][DB] Users table columns check: ${columns.join(", ")}`);

    if (!columns.includes('points')) {
      db.exec(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added points column");
    }
    if (!columns.includes('tier')) {
      db.exec(`ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'Beige'`);
      console.log("[DEBUG][DB] Added tier column");
    }
    if (!columns.includes('tier_updated_at')) {
      // SQLite limitation: Cannot add column with non-constant default (CURRENT_TIMESTAMP)
      // We use a constant string first, then update it.
      db.exec(`ALTER TABLE users ADD COLUMN tier_updated_at DATETIME DEFAULT '2024-01-01 00:00:00'`);
      db.prepare("UPDATE users SET tier_updated_at = CURRENT_TIMESTAMP WHERE tier_updated_at = '2024-01-01 00:00:00'").run();
      console.log("[DEBUG][DB] Added tier_updated_at column with workaround");
    }
    if (!columns.includes('total_spent_6m')) {
      db.exec(`ALTER TABLE users ADD COLUMN total_spent_6m INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added total_spent_6m column");
    }
    if (!columns.includes('google_id')) {
      db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`);
      console.log("[DEBUG][DB] Added google_id column");
    }
    if (!columns.includes('naver_id')) {
      db.exec(`ALTER TABLE users ADD COLUMN naver_id TEXT`);
      console.log("[DEBUG][DB] Added naver_id column");
    }
    if (!columns.includes('is_verified')) {
      db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added is_verified column");
    }
    if (!columns.includes('verification_token')) {
      db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT`);
      console.log("[DEBUG][DB] Added verification_token column");
    }
    if (!columns.includes('reset_token')) {
      db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
      console.log("[DEBUG][DB] Added reset_token column");
    }
    if (!columns.includes('reset_expires')) {
      db.exec(`ALTER TABLE users ADD COLUMN reset_expires DATETIME`);
      console.log("[DEBUG][DB] Added reset_expires column");
    }
    if (!columns.includes('newsletter_subscribed')) {
      db.exec(`ALTER TABLE users ADD COLUMN newsletter_subscribed INTEGER DEFAULT 1`);
      console.log("[DEBUG][DB] Added newsletter_subscribed column");
    }
    if (!columns.includes('role')) {
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER'`);
      console.log("[DEBUG][DB] Added role column");
    }

    // Ensure no NULL values for new mandatory fields
    db.prepare("UPDATE users SET tier = 'Beige' WHERE tier IS NULL").run();
    db.prepare("UPDATE users SET tier_updated_at = CURRENT_TIMESTAMP WHERE tier_updated_at IS NULL").run();
    console.log("[DEBUG][DB] Users migration check complete");
  } catch (err: any) {
    console.error("[DEBUG][DB] Users migration CRITICAL ERROR:", err.message);
  }
};

checkAndMigrateUsers();

// Newsletter subscribers table for non-registered users
db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Also check orders table for tracking columns
const checkAndMigrateOrders = () => {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all() as any[];
    const columns = tableInfo.map(c => c.name);
    
    if (!columns.includes('payment_method')) {
      db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT`);
      console.log("[DEBUG][DB] Added payment_method to orders");
    }
    if (!columns.includes('used_points')) {
      db.exec(`ALTER TABLE orders ADD COLUMN used_points INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added used_points to orders");
    }
    if (!columns.includes('used_coupon_id')) {
      db.exec(`ALTER TABLE orders ADD COLUMN used_coupon_id INTEGER`);
      console.log("[DEBUG][DB] Added used_coupon_id to orders");
    }
    if (!columns.includes('earned_points')) {
      db.exec(`ALTER TABLE orders ADD COLUMN earned_points INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added earned_points to orders");
    }
    if (!columns.includes('tracking_number')) {
      db.exec(`ALTER TABLE orders ADD COLUMN tracking_number TEXT`);
      console.log("[DEBUG][DB] Added tracking_number to orders");
    }
    if (!columns.includes('shipping_company')) {
      db.exec(`ALTER TABLE orders ADD COLUMN shipping_company TEXT`);
      console.log("[DEBUG][DB] Added shipping_company to orders");
    }
    if (!columns.includes('customer_phone')) {
      db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`);
      console.log("[DEBUG][DB] Added customer_phone to orders");
    }
    if (!columns.includes('refund_amount')) {
      db.exec(`ALTER TABLE orders ADD COLUMN refund_amount INTEGER DEFAULT 0`);
      console.log("[DEBUG][DB] Added refund_amount to orders");
    }
    if (!columns.includes('refund_reason')) {
      db.exec(`ALTER TABLE orders ADD COLUMN refund_reason TEXT`);
      console.log("[DEBUG][DB] Added refund_reason to orders");
    }
    if (!columns.includes('status_updated_at')) {
      db.exec(`ALTER TABLE orders ADD COLUMN status_updated_at DATETIME DEFAULT '2024-01-01 00:00:00'`);
      db.prepare("UPDATE orders SET status_updated_at = created_at WHERE status_updated_at = '2024-01-01 00:00:00'").run();
      console.log("[DEBUG][DB] Added status_updated_at to orders");
    }
    console.log("[DEBUG][DB] Orders migration check complete");
  } catch (err: any) {
    console.error("[DEBUG][DB] Orders migration ERROR:", err.message);
  }
};

checkAndMigrateOrders();

// Keep other migrations simpler
const migrate = (sql: string) => {
  try {
    db.exec(sql);
  } catch (e: any) {
    // Ignore duplicate column errors
  }
};

migrate(`ALTER TABLE reviews ADD COLUMN is_best INTEGER DEFAULT 0`);
migrate(`ALTER TABLE inquiries ADD COLUMN status TEXT DEFAULT 'pending'`);

migrate(`ALTER TABLE inquiries ADD COLUMN status TEXT DEFAULT 'pending'`);
migrate(`ALTER TABLE inquiries ADD COLUMN reply_message TEXT`);
migrate(`ALTER TABLE inquiries ADD COLUMN replied_at DATETIME`);
migrate(`ALTER TABLE user_coupons ADD COLUMN notified INTEGER DEFAULT 0`);

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

  // Admin subdomain redirect middleware
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction && host === "benua.shop" && req.path.startsWith("/admin")) {
      const targetPath = req.path.replace("/admin", "") || "/";
      return res.redirect(301, `https://dash.benua.shop${targetPath}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`);
    }
    next();
  });

  // --- Logging ---
  function logAdminAction(adminId: number | null, action: string, targetType: string | null = null, targetId: number | null = null, details: string | null = null) {
    try {
      db.prepare("INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)").run(adminId, action, targetType, targetId, details);
    } catch (err) {
      console.error("Failed to log admin action:", err);
    }
  }

  app.get("/api/admin/logs", authenticateAdmin, (req: any, res) => {
    try {
      const logs = db.prepare("SELECT * FROM admin_logs ORDER BY created_at DESC").all();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "로그 조회 실패" });
    }
  });

  // --- Auth Middleware ---
  const authorize = (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Admin token bypass
      if (decoded.role === "admin") {
        req.admin = { id: 0, role: "MASTER" }; // Use 0 for logged in via Admin Key
        return next();
      }

      const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(decoded.id) as any;
      
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }
      
      req.admin = user;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authenticateAdmin = authorize(["MASTER", "ADMIN"]);
  const authenticateOperator = authorize(["MASTER", "ADMIN", "OPERATOR"]);
  const authenticateCS = authorize(["MASTER", "ADMIN", "OPERATOR", "CS"]);

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
    
    // Calculate spent amount: (total_amount - shipping_fee) is the product amount.
    // We then subtract any refund_amount. 
    // ONLY count orders that are 'completed' (구매확정)
    const spendingRow = db.prepare(`
      SELECT SUM(
        CASE 
          WHEN status = 'completed'
          THEN MAX(0, (total_amount - shipping_fee) - IFNULL(refund_amount, 0))
          ELSE 0
        END
      ) as spent 
      FROM orders 
      WHERE user_id = ? AND created_at > ?
    `).get(userId, sixMonthsAgo.toISOString()) as any;
    
    const spent = spendingRow.spent || 0;
    
    // Update total_spent_6m column if it exists (for caching/display)
    try {
      db.prepare("UPDATE users SET total_spent_6m = ? WHERE id = ?").run(spent, userId);
    } catch(e) {}

    const user = db.prepare("SELECT tier FROM users WHERE id = ?").get(userId) as any;
    const oldTier = user.tier || 'BEIGE';
    const newTier = calculateUserTier(spent);

    if (newTier !== oldTier) {
        db.prepare("UPDATE users SET tier = ?, tier_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newTier, userId);
        // Only issue coupons when upgrading
        const tierOrder = ['BEIGE', 'GREEN', 'BLACK', 'THE_BLACK'];
        if (tierOrder.indexOf(newTier) > tierOrder.indexOf(oldTier)) {
            issueTierCoupons(userId, oldTier, newTier);
        }
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
        path: "/",
        domain: isProduction ? ".benua.shop" : undefined
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
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[DEBUG][AUTH/LOGIN] Start - IP: ${ip}, Email: ${email}`);
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        console.log(`[DEBUG][AUTH/LOGIN] Fail - User not found: ${email}`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }

      const inputHash = hashPassword(password);
      if (user.password !== inputHash) {
        console.log(`[DEBUG][AUTH/LOGIN] Fail - Password mismatch for: ${email}`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }
      
      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      const isProduction = process.env.NODE_ENV === "production";
      
      console.log(`[DEBUG][AUTH/LOGIN] Success - User: ${user.name} (${user.id}), Env: ${process.env.NODE_ENV}`);
      console.log(`[DEBUG][AUTH/LOGIN] Cookie Config - Secure: ${isProduction}, SameSite: ${isProduction ? "none" : "lax"}`);

      res.cookie("user_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
        domain: isProduction ? ".benua.shop" : undefined
      });
      res.json({ success: true, user: { name: user.name, email: user.email, address: user.address } });
    } catch (err) {
      console.error("[DEBUG][AUTH/LOGIN] Exception:", err);
      res.status(500).json({ error: "로그인 실패" });
    }
  });

  const runAutoCompletion = () => {
    try {
        // Find orders that have been 'delivered' for more than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const deliveredOrders = db.prepare(`
            SELECT id, user_id, order_number, total_amount, shipping_fee
            FROM orders 
            WHERE status = 'delivered' AND status_updated_at < ?
        `).all(sevenDaysAgo.toISOString()) as any[];

        if (deliveredOrders.length > 0) {
            const updateStatus = db.prepare("UPDATE orders SET status = 'completed', status_updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            
            for (const order of deliveredOrders) {
                db.transaction(() => {
                    updateStatus.run(order.id);
                    
                    // Award points logic (same as manual confirmation)
                    if (order.user_id) {
                        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(order.user_id) as any;
                        const config = (TIER_CONFIG as any)[user.tier || 'BEIGE'];
                        const rate = config.accrual_rate;
                        
                        const earned = Math.floor((order.total_amount - order.shipping_fee) * rate);
                        const expires_at = new Date();
                        expires_at.setFullYear(expires_at.getFullYear() + 1);

                        db.prepare("UPDATE orders SET earned_points = ? WHERE id = ?").run(earned, order.id);
                        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(earned, order.user_id);
                        db.prepare("INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, ?, ?)").run(
                            order.user_id,
                            earned,
                            `주문 ${order.order_number} 자동 구매 확정 적립`,
                            'EARNED',
                            expires_at.toISOString()
                        );
                        updateUserTierStatus(order.user_id);
                    }
                })();
            }
            console.log(`[AUTO] Completed ${deliveredOrders.length} orders automatically.`);
        }
    } catch (err) {
        console.error("[AUTO] Error during auto-completion:", err);
    }
  };

  app.get("/api/auth/me", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const token = req.cookies.user_token;
    
    // Periodically run auto-completion logic (e.g., when anyone hits the 'me' endpoint)
    runAutoCompletion();
    console.log(`[DEBUG][AUTH/ME] Cookie present: ${!!token}`);
    if (token) {
      console.log(`[DEBUG][AUTH/ME] Token preview: ${token.substring(0, 15)}...`);
    } else {
      console.log(`[DEBUG][AUTH/ME] ALL COOKIES:`, req.cookies);
    }

    // Prevent caching of auth status
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    if (!token) {
      return res.json({ user: null });
    }
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      console.log(`[DEBUG][AUTH/ME] JWT Validated - User ID: ${decoded.id}`);
      
      // Keep tier status fresh
      const status = updateUserTierStatus(decoded.id);
      
      const user = db.prepare("SELECT id, name, email, phone, zipcode, address, detail_address, google_id, naver_id, points, tier, tier_updated_at FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user) {
        console.log(`[DEBUG][AUTH/ME] Fail - User not found in DB for ID: ${decoded.id}`);
        return res.json({ user: null });
      }
      console.log(`[DEBUG][AUTH/ME] Success - Returning profile for ${user.name}`);
      res.json({ user: { ...user, ...status, tier_config: TIER_CONFIG } });
    } catch (err: any) {
      console.error("[DEBUG][AUTH/ME] Token verification failed:", err.message);
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
  app.get("/api/admin/orders/export", authenticateOperator, (req, res) => {
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

  // Admin: Tracking Number Update with Auto-Status Change
  app.post("/api/admin/orders/:id/tracking", authenticateOperator, (req, res) => {
    const { id } = req.params;
    const { tracking_number, shipping_company } = req.body;
    console.log(`[ADMIN] Updating tracking for order ${id}: ${shipping_company} ${tracking_number}`);
    try {
      const result = db.prepare(
        "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
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
        path: "/",
        domain: isProduction ? ".benua.shop" : undefined
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
        path: "/",
        domain: isProduction ? ".benua.shop" : undefined
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
      path: "/",
      domain: isProduction ? ".benua.shop" : undefined
    });
    res.json({ success: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/check", authenticateCS, (req, res) => {
    res.json({ authenticated: true });
  });

  // Admin Keys Management
  app.get("/api/admin/keys", authenticateAdmin, (req, res) => {
    const keys = db.prepare("SELECT id, key_value, CASE WHEN totp_secret IS NULL THEN 0 ELSE 1 END as has_2fa, created_at FROM admin_keys ORDER BY created_at DESC").all() as any[];
    const defaultAdminKey = process.env.ADMIN_PASSWORD || 'benua-admin-123';
    const filteredKeys = keys.filter(k => k.key_value !== defaultAdminKey);
    res.json(filteredKeys);
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
  app.get("/api/admin/coupons", authenticateCS, (req, res) => {
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
  app.post("/api/admin/coupons/:id/give", authenticateOperator, (req, res) => {
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
        "INSERT INTO products (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, parsedPrice, description, image_url, description_image_url, category, parsedStock, material, dimensions, origin, manufacturer, parsedDiscount, parsedShowOnMain);
      
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
    const { name, price, description, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main } = req.body;
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
        "UPDATE products SET name = ?, price = ?, description = ?, image_url = ?, description_image_url = ?, category = ?, stock = ?, material = ?, dimensions = ?, origin = ?, manufacturer = ?, discount_rate = ?, show_on_main = ? WHERE id = ?"
      ).run(name, parsedPrice, description, image_url, description_image_url, category, parsedStock, material, dimensions, origin, manufacturer, parsedDiscount, parsedShowOnMain, id);
      
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
    const { 
      user_id, customer_name, customer_email, customer_phone, shipping_address, 
      total_amount, shipping_fee, items, 
      used_points, used_coupon_id, payment_method 
    } = req.body;
    
    // Generate 15 character alphanumeric order number (Uppercase letters + digits)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let order_number = '';
    for (let i = 0; i < 15; i++) {
        order_number += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Normalize optional fields
    const p_used_points = used_points ? parseInt(String(used_points)) || 0 : 0;
    const p_used_coupon_id = used_coupon_id ? parseInt(String(used_coupon_id)) || null : null;
    const p_shipping_fee = shipping_fee ? parseInt(String(shipping_fee)) || 0 : 0;
    const p_total_amount = total_amount ? parseInt(String(total_amount)) || 0 : 0;

    try {
      const transaction = db.transaction(() => {
        // 1. Create Order
        const info = db.prepare(
          "INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, shipping_fee, used_points, used_coupon_id, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, 
          p_total_amount, p_shipping_fee, p_used_points, p_used_coupon_id, 
          payment_method || 'card', 'paid'
        );
        
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
        if (user_id && p_used_points > 0) {
            const userRow = db.prepare("SELECT points FROM users WHERE id = ?").get(user_id) as any;
            if (!userRow) throw new Error("사용자를 찾을 수 없습니다.");
            
            if (userRow.points < 1000) throw new Error("포인트는 1,000P 이상 보유 시 사용 가능합니다.");
            if (p_used_points > userRow.points) throw new Error("보유 포인트보다 많은 포인트를 사용할 수 없습니다.");
            if (p_used_points < 1000) throw new Error("포인트는 최소 1,000P 이상 사용해야 합니다.");

            db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(p_used_points, user_id);
            db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, ?)").run(
                user_id, 
                -p_used_points, 
                `주문 ${order_number} 사용`, 
                'USED'
            );
        }

        // 4. Mark Coupon Used
        if (user_id && p_used_coupon_id) {
            db.prepare("UPDATE user_coupons SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(p_used_coupon_id, user_id);
        }

        return orderId;
      });

      const orderId = transaction();
      
      // Async: Send Confirmation Email
      (async () => {
        try {
          const itemsListHtml = items.map((item: any) => `
            <div style="display: flex; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
              <div style="flex: 1;">
                <p style="font-size: 14px; font-weight: bold; margin: 0;">${item.name}</p>
                <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${item.price.toLocaleString()}원 x ${item.quantity}개</p>
              </div>
            </div>
          `).join('');

          await sendMail(
            customer_email,
            `베뉴아 주문이 접수되었습니다. (주문번호: ${order_number})`,
            `
            <h2 style="font-size: 18px; margin-bottom: 24px;">주문 접수 및 결제 완료</h2>
            <p style="margin-bottom: 30px;">안녕하세요, ${customer_name}님. 베뉴아입니다.<br>고객님의 주문이 성공적으로 접수되었습니다.</p>
            
            <div style="background-color: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #B29141;">주문 정보</p>
              <p style="font-size: 14px; margin-bottom: 8px;">주문번호: <b>${order_number}</b></p>
              <p style="font-size: 14px; margin-bottom: 24px;">결제금액: <b>${p_total_amount.toLocaleString()}원</b></p>
              
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #B29141;">주문 상품</p>
              ${itemsListHtml}
              
              <p style="font-size: 13px; font-weight: bold; margin: 24px 0 16px 0; color: #B29141;">배송지 정보</p>
              <p style="font-size: 14px; color: #333; line-height: 1.6;">${shipping_address}</p>
            </div>

            <div style="padding: 24px; border: 1px solid #eee; border-radius: 8px;">
               <p style="font-size: 12px; color: #888; margin: 0;">* 배송 현황은 베뉴아 웹사이트 > 마이페이지에서 확인하실 수 있습니다.</p>
            </div>
            `,
            'SYSTEM'
          );
        } catch (e) {
          console.error("Confirmation email error:", e);
        }
      })();

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

  app.get("/api/admin/orders", authenticateOperator, (req, res) => {
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

  app.post("/api/admin/orders/:id/status", authenticateOperator, async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "Order not found" });

      const prevStatus = order.status;
      db.prepare("UPDATE orders SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);

      // Email notifications based on status change
      if (status !== prevStatus) {
        const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all() as any[];
        const itemsListHtml = orderItems.map(item => `
          <div style="display: flex; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
            <div style="flex: 1;">
              <p style="font-size: 14px; font-weight: bold; margin: 0;">${item.name}</p>
              <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${item.price.toLocaleString()}원 x ${item.quantity}개</p>
            </div>
          </div>
        `).join('');

        if (status === 'paid') {
          await sendMail(
            order.customer_email,
            `주문이 성공적으로 결제되었습니다. (주문번호: ${order.order_number})`,
            `
            <h2 style="font-size: 18px; margin-bottom: 24px;">주문 결제 완료 안내</h2>
            <p style="margin-bottom: 30px;">안녕하세요, ${order.customer_name}님. 베뉴아입니다.<br>고객님의 소중한 주문이 정상적으로 결제되었습니다.</p>
            
            <div style="background-color: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #B29141;">주문 정보</p>
              <p style="font-size: 14px; margin-bottom: 8px;">주문번호: <b>${order.order_number}</b></p>
              <p style="font-size: 14px; margin-bottom: 24px;">결제금액: <b>${order.total_amount.toLocaleString()}원</b></p>
              
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #B29141;">주문 상품</p>
              ${itemsListHtml}
            </div>

            <p style="font-size: 13px; color: #666; line-height: 1.6;">상품 준비가 시작되면 다시 한번 안내해 드리겠습니다.<br>감사합니다.</p>
            `,
            'SYSTEM'
          );
        } else if (status === 'shipping') {
          await sendMail(
            order.customer_email,
            `주문하신 상품의 배송이 시작되었습니다.`,
            `
            <h2 style="font-size: 18px; margin-bottom: 24px;">배송 시작 안내</h2>
            <p style="margin-bottom: 30px;">안녕하세요, ${order.customer_name}님. 기다리시던 상품이 발송되었습니다.</p>
            
            <div style="background-color: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #B29141;">배송 정보</p>
              <p style="font-size: 14px; margin-bottom: 8px;">택배사: <b>${order.shipping_company || 'CJS'}</b></p>
              <p style="font-size: 14px; margin-bottom: 8px;">운송장번호: <b>${order.tracking_number || '-'}</b></p>
            </div>

            <p style="font-size: 13px; color: #666;">배송 추적은 택배사 홈페이지나 베뉴아 마이페이지에서 확인하실 수 있습니다.</p>
            `,
            'SYSTEM'
          );
        }
      }

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

  // Coupons
  app.get("/api/admin/coupons", authenticateCS, (req, res) => {
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

        db.prepare("UPDATE orders SET status = 'completed', status_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        
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
        
        if (['refund_requested', 'refunded'].includes(order.status)) {
            return res.status(400).json({ error: "이미 환불 처리되었거나 요청 중인 주문입니다." });
        }

        let newStatus = 'refund_requested';
        let refundAmount = order.total_amount;
        const beforeShipping = ['pending', 'paid'].includes(order.status);

        if (beforeShipping) {
            // Shipping 전: 자동 전액 환불
            newStatus = 'refunded';
            refundAmount = order.total_amount;
            
            // Return used points
            if (order.used_points > 0) {
                db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(order.used_points, order.user_id);
                db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, ?)").run(
                    order.user_id,
                    order.used_points,
                    `주문 ${order.order_number} 취소 자동 환불 (포인트 복구)`,
                    'EARNED'
                );
            }

            // Return stock
            const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as any[];
            for (const item of items) {
                db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id);
            }
        } else {
            // Shipping 후: 반품비 5000원 제외하고 환불 (refund_requested 상태로 관리자 검토 대기)
            newStatus = 'refund_requested';
            refundAmount = Math.max(0, order.total_amount - 5000);
        }

        db.prepare("UPDATE orders SET status = ?, refund_reason = ?, refund_amount = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, reason, refundAmount, id);
        
        // Update tier status immediately after refund changes spending
        updateUserTierStatus(order.user_id);
        
        res.json({ success: true, status: newStatus, refund_amount: refundAmount });
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

  // --- Admin Role Assignment API ---
  app.post("/api/admin/users/:id/role", authenticateAdmin, (req: any, res) => {
    const { role } = req.body;
    const targetUserId = req.params.id;
    const adminId = req.admin.id;

    if (!["ADMIN", "OPERATOR", "CS", "USER"].includes(role)) {
      return res.status(400).json({ error: "유효하지 않은 역할입니다." });
    }

    // Role hierarchy enforcement
    if (req.admin.role !== "MASTER" && role === "MASTER") {
      return res.status(403).json({ error: "MASTER 역할을 부여할 수 없습니다." });
    }

    try {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, targetUserId);
      logAdminAction(adminId, "UPDATE_ROLE", "users", targetUserId, `Role set to ${role}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "역할 변경 실패" });
    }
  });

  // --- Admin Dashboard API ---
  app.get("/api/admin/dashboard/stats", authenticateOperator, (req, res) => {
    try {
      // 1. Daily Sales
      const dailySales = db.prepare("SELECT SUM(total_amount) as amount FROM orders WHERE date(created_at) = date('now') AND status != 'refunded'").get() as any;
      
      // 2. Weekly Sales
      const weeklySales = db.prepare("SELECT SUM(total_amount) as amount FROM orders WHERE created_at > date('now', '-7 days') AND status != 'refunded'").get() as any;
      
      // 3. Pending Orders Count
      const pendingCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as any;
      
      // 4. Products Low Stock
      const lowStockProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock < 10").get() as any;

      res.json({
        dailySales: dailySales.amount || 0,
        weeklySales: weeklySales.amount || 0,
        pendingOrders: pendingCount.count || 0,
        lowStockProducts: lowStockProducts.count || 0
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/dashboard/chart-data", authenticateOperator, (req, res) => {
    try {
      const salesData = db.prepare(`
        SELECT date(created_at) as date, SUM(total_amount) as amount 
        FROM orders 
        WHERE created_at > date('now', '-30 days') AND status != 'refunded'
        GROUP BY date
        ORDER BY date ASC
      `).all();

      res.json(salesData);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // --- Fulfillment Management API ---
  app.post("/api/admin/fulfillment/tracking-bulk", authenticateOperator, upload.single("csv"), (req: any, res) => {
    // 단순 파싱 예시 (실제 구현 시 papaparse 필요)
    if (!req.file) return res.status(400).json({ error: "CSV 파일이 필요합니다." });
    
    try {
      const content = fs.readFileSync(req.file.path, "utf-8");
      const lines = content.split("\n");
      
      const transaction = db.transaction((rows) => {
        for (const row of rows) {
          const [order_number, tracking_number, shipping_company] = row.split(",");
          if (order_number && tracking_number) {
            db.prepare("UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping' WHERE order_number = ?").run(
                tracking_number, shipping_company || 'CJS', order_number
            );
          }
        }
      });
      transaction(lines.slice(1)); // 헤더 제외
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "송장 일괄 등록 실패" });
    }
  });

  // --- Review Management API ---
  app.get("/api/admin/reviews", authenticateCS, (req, res) => {
    try {
      const reviews = db.prepare(`SELECT r.*, p.name as product_name FROM reviews r JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC`).all();
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ error: "리뷰 목록 조회 실패" });
    }
  });

  app.get("/api/admin/settlement", authenticateAdmin, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const query = `
        SELECT payment_method, SUM(total_amount) as total_amount, COUNT(*) as order_count
        FROM orders 
        WHERE status = 'completed' AND date(created_at) >= date(?) AND date(created_at) <= date(?)
        GROUP BY payment_method
      `;
      const settlements = db.prepare(query).all(startDate, endDate) as any[];
      
      const commissionRates: { [key: string]: number } = {
        card: 0.02,
        naver_pay: 0.03,
        kakao_pay: 0.03,
        vbank: 0.01 
      };

      const report = settlements.map(s => {
        const rate = commissionRates[s.payment_method as string] || 0.02;
        const commission = Math.floor(s.total_amount * rate);
        return {
            payment_method: s.payment_method,
            total_amount: s.total_amount,
            commission: commission,
            net_amount: s.total_amount - commission,
            order_count: s.order_count
        };
      });

      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "정산 리포트 생성 실패" });
    }
  });

  // --- Display Management API ---
  app.get("/api/admin/display", authenticateAdmin, (req, res) => {
    try {
      const items = db.prepare("SELECT * FROM display_settings").all();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "전시 설정 조회 실패" });
    }
  });

  app.post("/api/admin/display", authenticateAdmin, upload.single("image"), (req: any, res) => {
    const { id, type, link_url, is_active } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    try {
      db.prepare(`
        INSERT INTO display_settings (id, type, image_url, link_url, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          image_url = excluded.image_url,
          link_url = excluded.link_url,
          is_active = excluded.is_active
      `).run(id, type, image_url, link_url, is_active ? 1 : 0);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "전시 설정 저장 실패" });
    }
  });

  app.get("/api/admin/inquiries", authenticateCS, (req, res) => {
    try {
      const inquiries = db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all();
      res.json(inquiries);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  app.post("/api/admin/inquiries/:id/reply", authenticateCS, async (req, res) => {
    const { replyMessage } = req.body;
    const { id } = req.params;
    try {
      const inquiry = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as any;
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });

      db.prepare(
        "UPDATE inquiries SET reply_message = ?, status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(replyMessage, id);
      
      // Send real email
      await sendMail(
        inquiry.email,
        `문의하신 내용에 대해 답변 드립니다.`,
        `
        <div style="padding: 24px; background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 12px;">
          <h2 style="font-size: 18px; font-family: 'Times New Roman', serif; font-style: italic; color: #1a1a1a; margin-bottom: 24px;">안녕하세요, ${inquiry.name}님.</h2>
          
          <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #f0f0f0;">
            <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">문의하신 내용</p>
            <blockquote style="margin: 0; padding: 16px; background-color: #fff; border-left: 2px solid #e5e5e5; font-size: 14px; color: #666;">
              ${inquiry.message}
            </blockquote>
          </div>

          <div>
            <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">베뉴아의 답변</p>
            <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; white-space: pre-wrap; font-weight: 500;">
              ${replyMessage}
            </p>
          </div>

          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f0f0f0;">
            <p style="font-size: 13px; color: #666;">항상 베뉴아와 한땀 한땀 함께해주셔서 감사합니다.</p>
          </div>
        </div>
        `,
        'SUPPORT'
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to send reply:", err);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  // Newsletter
  app.post("/api/newsletter/subscribe", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    try {
      const existing = db.prepare("SELECT * FROM newsletter_subscribers WHERE email = ?").get(email);
      if (!existing) {
        db.prepare("INSERT INTO newsletter_subscribers (email) VALUES (?)").run(email);
      }
      res.json({ success: true, message: "구독해주셔서 감사합니다!" });
    } catch (err) {
      res.status(500).json({ error: "구독 처리 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/admin/newsletter/subscribers", authenticateAdmin, (req, res) => {
    try {
      const subscribers = db.prepare("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC").all();
      const registeredSubscribers = db.prepare("SELECT email FROM users WHERE newsletter_subscribed = 1").all();
      res.json({ 
        guestSubscribers: subscribers, 
        userSubscribers: registeredSubscribers 
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  app.post("/api/admin/newsletter/send", authenticateAdmin, async (req, res) => {
    const { subject, content } = req.body;
    if (!subject || !content) return res.status(400).json({ error: "Subject and content are required" });

    try {
      const guestEmails = (db.prepare("SELECT email FROM newsletter_subscribers").all() as any[]).map(s => s.email);
      const userEmails = (db.prepare("SELECT email FROM users WHERE newsletter_subscribed = 1").all() as any[]).map(u => u.email);
      const allEmails = [...new Set([...guestEmails, ...userEmails])];

      console.log(`[NEWSLETTER] Sending mass mail to ${allEmails.length} subscribers`);
      
      for (const email of allEmails) {
        await sendMail(
          email,
          subject,
          `
          <div style="font-family: 'Inter', sans-serif;">
            <div style="margin-bottom: 30px;">
              ${content}
            </div>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #eee; font-size: 11px; color: #999;">
              <p>더 이상 소식을 원하지 않으시면 <a href="#" style="color: #666; text-decoration: underline;">수신 거부</a>를 클릭해 주세요.</p>
            </div>
          </div>
          `,
          'NEWS'
        );
      }

      res.json({ success: true, count: allEmails.length });
    } catch (err) {
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  // Password Reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.json({ success: true, message: "If an account exists, a reset link has been sent." });

      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?").run(token, expires, email);

      const resetLink = `https://${req.get('host')}/reset-password?token=${token}`;

      await sendMail(
        email,
        "비밀번호 재설정 안내",
        `
        <h2 style="font-size: 18px; margin-bottom: 20px;">비밀번호 재설정 요청</h2>
        <p style="margin-bottom: 30px;">본 메일은 비밀번호 재설정을 위해 발송되었습니다.<br>아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요.</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #1a1a1a; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">비밀번호 재설정하기</a>
        <p style="margin-top: 30px; font-size: 12px; color: #999;">만약 본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.<br>링크는 1시간 동안 유효합니다.</p>
        `,
        'SYSTEM'
      );

      res.json({ success: true, message: "Reset link sent" });
    } catch (err) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_expires > CURRENT_TIMESTAMP").get(token) as any;
      if (!user) return res.status(400).json({ error: "유효하지 않거나 만료된 토큰입니다." });

      const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
      db.prepare("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?").run(hashedPassword, user.id);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Verification Email
  app.post("/api/auth/send-verification", authenticateUser, async (req, res) => {
    const user_id = (req as any).user.id;
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id) as any;
      if (user.is_verified) return res.status(400).json({ error: "Already verified" });

      const token = crypto.randomBytes(20).toString('hex');
      db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(token, user_id);

      const verifyLink = `https://${req.get('host')}/verify-email?token=${token}`;

      await sendMail(
        user.email,
        "이메일 인증을 완료해주세요",
        `
        <h2 style="font-size: 18px; margin-bottom: 20px;">이메일 인증 안내</h2>
        <p style="margin-bottom: 30px;">베뉴아 회원이 되신 것을 환영합니다!<br>아래 버튼을 클릭하여 이메일 인증을 완료하고 모든 서비스를 이용해 보세요.</p>
        <a href="${verifyLink}" style="display: inline-block; background-color: #B29141; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">이메일 인증하기</a>
        <p style="margin-top: 30px; font-size: 12px; color: #999;">감사합니다.</p>
        `,
        'SYSTEM'
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  app.get("/api/auth/verify/:token", async (req, res) => {
    const { token } = req.params;
    try {
      const user = db.prepare("SELECT * FROM users WHERE verification_token = ?").get(token) as any;
      if (!user) return res.status(400).json({ error: "Invalid token" });

      db.prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?").run(user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // --- Best Review API ---
  app.post("/api/admin/reviews/:id/best", authenticateCS, (req, res) => {
    const { isBest } = req.body;
    try {
      db.prepare("UPDATE reviews SET is_best = ? WHERE id = ?").run(isBest ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "베스트 리뷰 설정 실패" });
    }
  });

  // --- Order Claim (Return/Exchange) API ---
  app.post("/api/admin/orders/:id/claim", authenticateOperator, (req, res) => {
    const { action } = req.body; // 'approve' | 'reject'
    try {
      const status = action === 'approve' ? 'refunded' : 'completed';
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "클레임 처리 실패" });
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
