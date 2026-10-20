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

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "benua-secret-key-2024";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "benua-admin-123";
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R";
const isProduction = process.env.NODE_ENV === "production";

// ==========================================
// 1. Email Transporter & Helper
// ==========================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type MailFromType = "ADMIN" | "SUPPORT" | "NEWS" | "SYSTEM";

const sendMail = async (
  to: string,
  subject: string,
  html: string,
  fromType: MailFromType = "SYSTEM"
) => {
  const fromMap: Record<MailFromType, string> = {
    ADMIN: process.env.SMTP_FROM_ADMIN || "admin@benua.shop",
    SUPPORT: process.env.SMTP_FROM_SUPPORT || "support@benua.shop",
    NEWS: process.env.SMTP_FROM_NEWS || "news@benua.shop",
    SYSTEM: process.env.SMTP_FROM_SYSTEM || "Benua@benua.shop",
  };

  const mailOptions = {
    from: `"Benua" <${fromMap[fromType]}>`,
    to,
    subject: `[Benua] ${subject}`,
    html: `
      <div style="font-family: 'Inter', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 8px;">
        <div style="margin-bottom: 40px; text-align: center;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">Benua</h1>
        </div>
        ${html}
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #999; text-align: center;">
          <p>© ${new Date().getFullYear()} Benua. All rights reserved.</p>
          <p>본 메일은 발신 전용입니다.</p>
        </div>
      </div>
    `,
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[MAIL][MOCK] To: ${to} | Subject: ${subject}`);
      return;
    }
    await transporter.sendMail(mailOptions);
    console.log(`[MAIL][SUCCESS] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[MAIL][ERROR] Failed to send to ${to}:`, err);
  }
};

// ==========================================
// 2. Database Initialization & Migrations
// ==========================================
const db = new Database("benua.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

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
    total_spent_6m INTEGER DEFAULT 0,
    google_id TEXT,
    naver_id TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires DATETIME,
    newsletter_subscribed INTEGER DEFAULT 1,
    role TEXT DEFAULT 'USER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'MASTER',
    totp_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_identifier TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE SET NULL
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
    type TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT NOT NULL,
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
    notified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    description_image_url TEXT,
    category TEXT DEFAULT '오브제',
    stock INTEGER DEFAULT 0,
    material TEXT,
    dimensions TEXT,
    origin TEXT,
    manufacturer TEXT,
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
    total_amount INTEGER DEFAULT 0,
    shipping_fee INTEGER DEFAULT 0,
    used_points INTEGER DEFAULT 0,
    used_coupon_id INTEGER,
    earned_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'card',
    payment_key TEXT,
    vbank_bank TEXT,
    vbank_account TEXT,
    vbank_holder TEXT,
    vbank_due_date TEXT,
    tracking_number TEXT,
    shipping_company TEXT,
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,
    confirmed_at DATETIME,
    status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    name TEXT,
    price INTEGER,
    quantity INTEGER,
    image_url TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    user_id INTEGER,
    order_id INTEGER,
    rating INTEGER,
    content TEXT,
    image_url TEXT,
    type TEXT,
    is_best INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT DEFAULT '상품 문의',
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

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const ensureColumn = (table: string, column: string, definition: string) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const runMigrations = () => {
  ensureColumn("users", "points", "INTEGER DEFAULT 0");
  ensureColumn("users", "tier", "TEXT DEFAULT 'BEIGE'");
  ensureColumn("users", "tier_updated_at", "DATETIME DEFAULT '2024-01-01 00:00:00'");
  ensureColumn("users", "total_spent_6m", "INTEGER DEFAULT 0");
  ensureColumn("users", "google_id", "TEXT");
  ensureColumn("users", "naver_id", "TEXT");
  ensureColumn("users", "kakao_id", "TEXT");
  ensureColumn("users", "is_verified", "INTEGER DEFAULT 0");
  ensureColumn("users", "verification_token", "TEXT");
  ensureColumn("users", "reset_token", "TEXT");
  ensureColumn("users", "reset_expires", "DATETIME");
  ensureColumn("users", "newsletter_subscribed", "INTEGER DEFAULT 1");
  ensureColumn("users", "role", "TEXT DEFAULT 'USER'");

  ensureColumn("products", "manufacturer", "TEXT");
  ensureColumn("products", "discount_rate", "INTEGER DEFAULT 0");
  ensureColumn("products", "show_on_main", "INTEGER DEFAULT 0");

  ensureColumn("orders", "payment_method", "TEXT DEFAULT 'card'");
  ensureColumn("orders", "payment_key", "TEXT");
  ensureColumn("orders", "vbank_bank", "TEXT");
  ensureColumn("orders", "vbank_account", "TEXT");
  ensureColumn("orders", "vbank_holder", "TEXT");
  ensureColumn("orders", "vbank_due_date", "TEXT");
  ensureColumn("orders", "used_points", "INTEGER DEFAULT 0");
  ensureColumn("orders", "used_coupon_id", "INTEGER");
  ensureColumn("orders", "earned_points", "INTEGER DEFAULT 0");
  ensureColumn("orders", "tracking_number", "TEXT");
  ensureColumn("orders", "shipping_company", "TEXT");
  ensureColumn("orders", "customer_phone", "TEXT");
  ensureColumn("orders", "refund_amount", "INTEGER DEFAULT 0");
  ensureColumn("orders", "refund_reason", "TEXT");
  ensureColumn("orders", "status_updated_at", "DATETIME DEFAULT '2024-01-01 00:00:00'");
  ensureColumn("orders", "confirmed_at", "DATETIME");

  ensureColumn("reviews", "is_best", "INTEGER DEFAULT 0");
  ensureColumn("inquiries", "category", "TEXT DEFAULT '상품 문의'");
  ensureColumn("inquiries", "status", "TEXT DEFAULT 'pending'");
  ensureColumn("inquiries", "reply_message", "TEXT");
  ensureColumn("inquiries", "replied_at", "DATETIME");
  ensureColumn("user_coupons", "notified", "INTEGER DEFAULT 0");
  ensureColumn("admin_keys", "role", "TEXT DEFAULT 'MASTER'");
  ensureColumn("admin_logs", "admin_identifier", "TEXT");
  ensureColumn("admin_logs", "ip_address", "TEXT");
  ensureColumn("admin_logs", "user_agent", "TEXT");
  ensureColumn("admin_logs", "changes", "TEXT");
  ensureColumn("admin_logs", "timestamp_ms", "INTEGER");

  db.prepare("UPDATE users SET tier = UPPER(IFNULL(tier, 'BEIGE'))").run();
};

runMigrations();

const adminKeyCount = db.prepare("SELECT COUNT(*) as count FROM admin_keys").get() as { count: number };
if (adminKeyCount.count === 0) {
  db.prepare("INSERT INTO admin_keys (key_value, role) VALUES (?, 'MASTER')").run(ADMIN_PASSWORD);
}

// ==========================================
// 3. Security, Cookie, Token & Tier Helpers
// ==========================================
const hashPassword = (password: string): string => {
  return crypto.createHash("sha512").update(password).digest("hex");
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
  domain: isProduction ? ".benua.shop" : undefined,
});

const setAuthCookie = (res: express.Response, name: string, token: string) => {
  res.cookie(name, token, {
    ...getCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res: express.Response, name: string) => {
  res.clearCookie(name, getCookieOptions());
};

// Dual Token Reader (Bearer Header for Mobile App + Cookie for Web)
const extractToken = (req: express.Request, cookieName: "user_token" | "admin_token"): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken && bearerToken !== "null" && bearerToken !== "undefined") {
      return bearerToken;
    }
  }
  return req.cookies?.[cookieName] || null;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(price);

export const TIER_CONFIG: Record<
  string,
  { name: string; min_spend: number; accrual_rate: number; free_shipping?: boolean }
> = {
  BEIGE: { name: "베이지", min_spend: 0, accrual_rate: 0.01 },
  GREEN: { name: "그린", min_spend: 100000, accrual_rate: 0.03 },
  BLACK: { name: "블랙", min_spend: 500000, accrual_rate: 0.05, free_shipping: true },
  THE_BLACK: { name: "더 블랙", min_spend: 1000000, accrual_rate: 0.07, free_shipping: true },
};

const TIER_ORDER = ["BEIGE", "GREEN", "BLACK", "THE_BLACK"];

const calculateUserTier = (spending6Months: number): string => {
  if (spending6Months >= TIER_CONFIG.THE_BLACK.min_spend) return "THE_BLACK";
  if (spending6Months >= TIER_CONFIG.BLACK.min_spend) return "BLACK";
  if (spending6Months >= TIER_CONFIG.GREEN.min_spend) return "GREEN";
  return "BEIGE";
};

const issueTierCoupons = (userId: number, fromTier: string, toTier: string) => {
  const fromIdx = TIER_ORDER.indexOf(fromTier.toUpperCase());
  const toIdx = TIER_ORDER.indexOf(toTier.toUpperCase());
  if (toIdx <= fromIdx) return;

  const insertCoupon = db.prepare(
    "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const assignCoupon = db.prepare(
    "INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)"
  );

  for (let i = fromIdx + 1; i <= toIdx; i++) {
    const tier = TIER_ORDER[i];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresStr = expiresAt.toISOString();
    const suffix = `${userId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (tier === "GREEN") {
      const c1 = insertCoupon.run("그린 등급 무료배송 쿠폰", `GREEN-FREE-${suffix}`, "SHIPPING", 0, 0, 0);
      const c2 = insertCoupon.run("그린 등급 3,000원 감사 쿠폰", `GREEN-3K-${suffix}`, "FIXED", 3000, 30000, 0);
      assignCoupon.run(userId, c1.lastInsertRowid, expiresStr);
      assignCoupon.run(userId, c2.lastInsertRowid, expiresStr);
    } else if (tier === "BLACK") {
      const c1 = insertCoupon.run("블랙 등급 10% 할인 쿠폰", `BLACK-10P-${suffix}`, "PERCENT", 10, 0, 10000);
      const c2 = insertCoupon.run("블랙 등급 5,000원 기프트 쿠폰", `BLACK-5K-${suffix}`, "FIXED", 5000, 40000, 0);
      assignCoupon.run(userId, c1.lastInsertRowid, expiresStr);
      assignCoupon.run(userId, c2.lastInsertRowid, expiresStr);
    } else if (tier === "THE_BLACK") {
      const c1 = insertCoupon.run("더 블랙 VVIP 20% 할인 쿠폰", `TBLACK-20P-${suffix}`, "PERCENT", 20, 0, 30000);
      const c2 = insertCoupon.run("더 블랙 10,000원 스페셜 쿠폰", `TBLACK-10K-${suffix}`, "FIXED", 10000, 50000, 0);
      const c3 = insertCoupon.run("더 블랙 5,000원 정기 쿠폰 #1", `TBLACK-5K1-${suffix}`, "FIXED", 5000, 30000, 0);
      const c4 = insertCoupon.run("더 블랙 5,000원 정기 쿠폰 #2", `TBLACK-5K2-${suffix}`, "FIXED", 5000, 30000, 0);
      assignCoupon.run(userId, c1.lastInsertRowid, expiresStr);
      assignCoupon.run(userId, c2.lastInsertRowid, expiresStr);
      assignCoupon.run(userId, c3.lastInsertRowid, expiresStr);
      assignCoupon.run(userId, c4.lastInsertRowid, expiresStr);
    }
  }
};

const updateUserTierStatus = (userId: number) => {
  const user = db.prepare("SELECT id, tier FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { spent: 0, tier: "BEIGE" };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const spendingRow = db
    .prepare(
      `SELECT SUM(
        CASE
          WHEN status = 'completed'
          THEN MAX(0, (total_amount - shipping_fee) - IFNULL(refund_amount, 0))
          ELSE 0
        END
      ) as spent
      FROM orders
      WHERE user_id = ? AND created_at > ?`
    )
    .get(userId, sixMonthsAgo.toISOString()) as { spent: number | null };

  const spent = spendingRow?.spent || 0;
  db.prepare("UPDATE users SET total_spent_6m = ? WHERE id = ?").run(spent, userId);

  const oldTier = (user.tier || "BEIGE").toUpperCase();
  const newTier = calculateUserTier(spent);

  if (newTier !== oldTier) {
    db.prepare("UPDATE users SET tier = ?, tier_updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      newTier,
      userId
    );
    if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(oldTier)) {
      issueTierCoupons(userId, oldTier, newTier);
    }
  }

  return { spent, tier: newTier };
};

// ==========================================
// 4. Order Transactions & Toss Payments Helper
// ==========================================

// Finalize payment deductions (Stock, Points, Coupon) when transitioning from pending -> paid
const finalizeOrderPaymentTx = db.transaction(
  (
    orderId: number,
    paymentKey: string | null,
    paymentMethod: string,
    nextStatus: "paid" | "pending" = "paid",
    vbankInfo?: { bank?: string; account?: string; holder?: string; dueDate?: string }
  ) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) throw new Error("주문을 찾을 수 없습니다.");

    // Prevent double deduction if already paid
    if (order.status !== "pending") {
      return order;
    }

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as any[];
    const deductStock = db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?");
    for (const item of items) {
      if (item.product_id) {
        deductStock.run(item.quantity, item.product_id);
      }
    }

    if (order.user_id && order.used_points > 0) {
      const userRow = db.prepare("SELECT points FROM users WHERE id = ?").get(order.user_id) as any;
      if (!userRow || userRow.points < order.used_points) {
        throw new Error("보유 포인트가 부족합니다.");
      }
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(
        order.used_points,
        order.user_id
      );
      db.prepare(
        "INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'USED')"
      ).run(order.user_id, -order.used_points, `주문(${order.order_number}) 결제 사용`);
    }

    if (order.user_id && order.used_coupon_id) {
      db.prepare(
        "UPDATE user_coupons SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      ).run(order.used_coupon_id, order.user_id);
    }

    db.prepare(
      `UPDATE orders
       SET status = ?, payment_key = ?, payment_method = ?,
           vbank_bank = ?, vbank_account = ?, vbank_holder = ?, vbank_due_date = ?,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      nextStatus,
      paymentKey,
      paymentMethod,
      vbankInfo?.bank || null,
      vbankInfo?.account || null,
      vbankInfo?.holder || null,
      vbankInfo?.dueDate || null,
      orderId
    );

    return db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  }
);

const completeOrderTx = db.transaction((orderId: number | string) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
  if (!order) throw new Error("주문을 찾을 수 없습니다.");
  if (order.status === "completed") return { alreadyCompleted: true, earned: order.earned_points || 0 };

  db.prepare(
    "UPDATE orders SET status = 'completed', status_updated_at = CURRENT_TIMESTAMP, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(orderId);

  let earned = 0;
  if (order.user_id) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(order.user_id) as any;
    if (user) {
      const tierKey = (user.tier || "BEIGE").toUpperCase();
      const config = TIER_CONFIG[tierKey] || TIER_CONFIG.BEIGE;
      const netProductAmount = Math.max(0, (order.total_amount || 0) - (order.shipping_fee || 0));
      earned = Math.round(netProductAmount * config.accrual_rate);

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      db.prepare("UPDATE orders SET earned_points = ? WHERE id = ?").run(earned, orderId);
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(earned, order.user_id);
      db.prepare(
        "INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, 'EARNED', ?)"
      ).run(order.user_id, earned, `주문(${order.order_number}) 구매확정 적립`, expiresAt.toISOString());

      updateUserTierStatus(order.user_id);
    }
  }
  return { alreadyCompleted: false, earned };
});

const refundOrderTx = db.transaction(
  (orderId: number | string, refundAmount?: number, reason?: string) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status === "refunded") return order;

    const finalRefundAmount = refundAmount !== undefined ? refundAmount : order.total_amount;
    const finalReason = reason !== undefined ? reason : order.refund_reason;

    db.prepare(
      "UPDATE orders SET status = 'refunded', refund_amount = ?, refund_reason = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(finalRefundAmount, finalReason, orderId);

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as any[];
    for (const item of items) {
      if (item.product_id) {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(
          item.quantity,
          item.product_id
        );
      }
    }

    if (order.user_id) {
      if (order.used_points > 0) {
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(
          order.used_points,
          order.user_id
        );
        db.prepare(
          "INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'EARNED')"
        ).run(order.user_id, order.used_points, `주문(${order.order_number}) 환불 포인트 반환`);
      }

      if (order.earned_points > 0) {
        db.prepare("UPDATE users SET points = MAX(0, points - ?) WHERE id = ?").run(
          order.earned_points,
          order.user_id
        );
        db.prepare(
          "INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'USED')"
        ).run(order.user_id, -order.earned_points, `주문(${order.order_number}) 환불 적립금 회수`);
      }

      if (order.used_coupon_id) {
        db.prepare(
          "UPDATE user_coupons SET is_used = 0, used_at = NULL WHERE id = ? AND user_id = ?"
        ).run(order.used_coupon_id, order.user_id);
      }

      updateUserTierStatus(order.user_id);
    }

    return order;
  }
);

// Call Toss Payments Cancel API when refunding an order paid via Toss
const cancelTossPaymentIfNeeded = async (
  order: any,
  cancelReason: string = "고객/관리자 환불 처리",
  cancelAmount?: number
) => {
  if (!order?.payment_key || order.payment_key.startsWith("FREE_")) return;

  const basicAuth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  const bodyPayload: Record<string, any> = { cancelReason };
  if (cancelAmount !== undefined && cancelAmount < order.total_amount) {
    bodyPayload.cancelAmount = cancelAmount;
  }

  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error("[TOSS][CANCEL_ERROR]", errData);
    // Allow local DB refund to proceed if already canceled on Toss side
    if (errData.code !== "ALREADY_CANCELED_PAYMENT") {
      throw new Error(errData.message || "PG사 결제 취소에 실패했습니다.");
    }
  }
};

// Map Toss Payment response to settlement payment_method keys ('card' | 'kakao_pay' | 'naver_pay' | 'vbank')
const normalizeTossMethod = (tossData: any, fallback: string = "card"): string => {
  const provider = (tossData?.easyPay?.provider || "").toUpperCase();
  if (provider.includes("KAKAO")) return "kakao_pay";
  if (provider.includes("NAVER")) return "naver_pay";
  if (tossData?.method === "가상계좌" || tossData?.method === "VIRTUAL_ACCOUNT") return "vbank";
  if (tossData?.method === "간편결제") return fallback !== "card" ? fallback : "card";
  return "card";
};

const runAutoCompletion = () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deliveredOrders = db
      .prepare("SELECT id FROM orders WHERE status = 'delivered' AND status_updated_at < ?")
      .all(sevenDaysAgo.toISOString()) as Array<{ id: number }>;

    for (const order of deliveredOrders) {
      completeOrderTx(order.id);
    }
  } catch (err) {
    console.error("[AUTO] Error during auto-completion:", err);
  }
};

// ==========================================
// 5. Express Server Setup
// ==========================================
async function startServer() {
  const app = express();

  app.set("trust proxy", 1);

  // CORS middleware for Web Subdomains + Capacitor iOS/Android Apps
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://benua.shop",
      "https://www.benua.shop",
      "https://dash.benua.shop",
      "capacitor://localhost",
      "http://localhost",
      "https://localhost",
      "http://localhost:3000",
      "http://localhost:5173",
    ];

    if (origin && (allowedOrigins.includes(origin) || origin.endsWith(".benua.shop"))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use("/uploads", express.static(uploadsDir));

  runAutoCompletion();
  setInterval(runAutoCompletion, 60 * 60 * 1000);

  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (isProduction && host === "benua.shop" && req.path.startsWith("/admin")) {
      const targetPath = req.path.replace(/^\/admin/, "") || "/";
      const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
      return res.redirect(301, `https://dash.benua.shop${targetPath}${query}`);
    }
    next();
  });

  const logAdminAction = (
    req: any,
    action: string,
    targetType: string | null = null,
    targetId: string | number | null = null,
    details: string | null = null,
    changes: any = null
  ) => {
    try {
      const adminId = req.admin?.id || null;
      let adminIdentifier = req.admin?.identifier || "System";

      if (req.admin?.isKey && req.admin?.keyId) {
        const k = db.prepare("SELECT key_value FROM admin_keys WHERE id = ?").get(req.admin.keyId) as any;
        if (k) adminIdentifier = k.key_value;
      } else if (req.admin?.id && !req.admin?.isKey) {
        const u = db.prepare("SELECT email FROM users WHERE id = ?").get(req.admin.id) as any;
        if (u) adminIdentifier = u.email;
      } else if (req.body?.adminKey) {
        adminIdentifier = req.body.adminKey;
      }

      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
      const ua = req.headers["user-agent"] || "";

      db.prepare(
        `INSERT INTO admin_logs
        (admin_id, admin_identifier, action, target_type, target_id, details, changes, ip_address, user_agent, timestamp_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        adminId,
        adminIdentifier,
        action,
        targetType,
        targetId,
        details,
        changes ? JSON.stringify(changes) : null,
        ip,
        ua,
        Date.now()
      );
    } catch (err) {
      console.error("Failed to log admin action:", err);
    }
  };

  // --- Auth Middlewares (Supports Cookie + Bearer Token) ---
  const authorize = (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const token = extractToken(req, "admin_token");
    if (!token) return res.status(401).json({ error: "관리자 로그인이 필요합니다." });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.isKey || decoded.role === "admin") {
        const activeRole = decoded.isKey ? decoded.role : "MASTER";
        if (!allowedRoles.includes(activeRole)) {
          return res.status(403).json({ error: "권한이 부족합니다." });
        }
        req.admin = { id: null, role: activeRole, isKey: true, keyId: decoded.keyId };
        return next();
      }

      const user = db.prepare("SELECT id, role, email FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "권한이 부족합니다." });
      }

      req.admin = user;
      next();
    } catch {
      return res.status(401).json({ error: "유효하지 않은 관리자 세션입니다." });
    }
  };

  const authenticateAdmin = authorize(["MASTER", "ADMIN"]);
  const authenticateOperator = authorize(["MASTER", "ADMIN", "OPERATOR"]);
  const authenticateCS = authorize(["MASTER", "ADMIN", "OPERATOR", "CS"]);

  const authenticateUser = (req: any, res: any, next: any) => {
    const token = extractToken(req, "user_token");
    if (!token) return res.status(401).json({ error: "로그인이 필요합니다." });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." });
    }
  };

  // ==========================================
  // 6. User Auth & Profile APIs
  // ==========================================
// [신규] 회원가입용 6자리 이메일 인증번호 발송
  app.post("/api/auth/send-code", async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요." });
    }

    const cleanEmail = email.trim();
    try {
      const existingUser = db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: "이미 가입된 이메일입니다." });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분 유효

      db.prepare(
        `INSERT INTO email_verification_codes (email, code, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`
      ).run(cleanEmail, code, expiresAt);

      await sendMail(
        cleanEmail,
        "회원가입 이메일 인증번호 안내",
        `
        <h2 style="font-size: 18px; margin-bottom: 20px;">이메일 인증번호</h2>
        <p style="margin-bottom: 24px; color: #555; line-height: 1.6;">
          베뉴아 회원가입을 위한 6자리 인증번호입니다.<br/>
          아래 인증번호를 회원가입 화면에 입력해주세요. (유효시간 10분)
        </p>
        <div style="background-color: #f8f8f8; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1A1A1B;">
          ${code}
        </div>
        `,
        "SYSTEM"
      );

      res.json({ success: true, message: "인증번호가 이메일로 발송되었습니다." });
    } catch (err) {
      console.error("Send verification code error:", err);
      res.status(500).json({ error: "인증번호 발송 중 오류가 발생했습니다." });
    }
  });

  // [신규] 회원가입용 6자리 이메일 인증번호 확인
  app.post("/api/auth/verify-code", (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "이메일과 인증번호를 입력해주세요." });
    }

    try {
      const record = db
        .prepare(
          "SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP"
        )
        .get(email.trim(), String(code).trim()) as any;

      if (!record) {
        return res.status(400).json({ error: "인증번호가 일치하지 않거나 만료되었습니다." });
      }

      res.json({ success: true, message: "이메일 인증이 완료되었습니다." });
    } catch {
      res.status(500).json({ error: "인증 확인 중 오류가 발생했습니다." });
    }
  });

  // [수정] 회원가입 (주소 입력 제거 & 이메일 인증번호 검증 반영)
  app.post("/api/auth/register", async (req, res) => {
    const {
      email,
      password,
      name,
      phone,
      VerificationCode,
      verification_code,
      google_id,
      naver_id,
      kakao_id,
      newsletter_subscribed,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "필수 입력 항목을 모두 입력해주세요." });
    }

    const cleanEmail = email.trim();
    const inputCode = String(verification_code || VerificationCode || "").trim();

    try {
      // 소셜 연동 가입이 아닌 일반 가입 시 이메일 인증코드 확인
      if (!google_id && !naver_id && !kakao_id) {
        const verifiedRecord = db
          .prepare(
            "SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP"
          )
          .get(cleanEmail, inputCode);

        if (!verifiedRecord) {
          return res.status(400).json({ error: "이메일 인증을 먼저 완료해주세요." });
        }
      }

      const hashedPassword = hashPassword(password);
      const isSubscribed = newsletter_subscribed ? 1 : 0;

      const info = db
        .prepare(
          `INSERT INTO users
          (email, password, name, phone, zipcode, address, detail_address, google_id, naver_id, kakao_id, newsletter_subscribed, is_verified)
          VALUES (?, ?, ?, ?, '', '', '', ?, ?, ?, ?, 1)`
        )
        .run(
          cleanEmail,
          hashedPassword,
          name.trim(),
          phone || "",
          google_id || null,
          naver_id || null,
          kakao_id || null,
          isSubscribed
        );

      // 사용한 인증번호 삭제
      db.prepare("DELETE FROM email_verification_codes WHERE email = ?").run(cleanEmail);

      const userId = Number(info.lastInsertRowid);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const welcomeCoupon = db
        .prepare("INSERT INTO coupons (name, code, type, value, min_order_amount) VALUES (?, ?, 'SHIPPING', 0, 0)")
        .run("웰컴 무료배송 쿠폰", `WELCOME-${userId}-${Date.now()}`);
      db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(
        userId,
        welcomeCoupon.lastInsertRowid,
        expiresAt.toISOString()
      );

      const token = jwt.sign({ id: userId, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", token);

      res.json({ success: true, token, message: "회원가입이 완료되었습니다." });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({ error: "이미 가입된 이메일입니다." });
      }
      res.status(500).json({ error: "회원가입 처리 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email?.trim()) as any;
      if (!user || user.password !== hashPassword(password || "")) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", token);

      res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, address: user.address },
      });
    } catch {
      res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const token = extractToken(req, "user_token");
    if (!token) return res.json({ user: null });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const status = updateUserTierStatus(decoded.id);
      const user = db
        .prepare(
          `SELECT id, name, email, phone, zipcode, address, detail_address,
                  google_id, naver_id, kakao_id, points, tier, tier_updated_at,
                  newsletter_subscribed, is_verified, role
           FROM users WHERE id = ?`
        )
        .get(decoded.id) as any;

      if (!user) return res.json({ user: null });
      res.json({ user: { ...user, ...status, tier_config: TIER_CONFIG } });
    } catch {
      res.json({ user: null });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res, "user_token");
    res.json({ success: true });
  });

  app.put("/api/auth/me", authenticateUser, (req: any, res) => {
    try {
      const { name, phone, zipcode, address, detail_address, newsletter_subscribed } = req.body;
      db.prepare(
        `UPDATE users
         SET name = ?, phone = ?, zipcode = ?, address = ?, detail_address = ?, newsletter_subscribed = ?
         WHERE id = ?`
      ).run(
        name,
        phone,
        zipcode,
        address,
        detail_address,
        newsletter_subscribed ? 1 : 0,
        req.user.id
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "회원정보 수정에 실패했습니다." });
    }
  });

  app.delete("/api/auth/me", authenticateUser, (req: any, res) => {
    try {
      const userId = req.user.id;
      db.transaction(() => {
        db.prepare("UPDATE orders SET user_id = NULL WHERE user_id = ?").run(userId);
        db.prepare("UPDATE reviews SET user_id = NULL WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM user_coupons WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM point_history WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM wishlists WHERE user_id = ?").run(userId);
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      })();

      clearAuthCookie(res, "user_token");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "회원 탈퇴 처리 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.json({ success: true });

      const token = crypto.randomBytes(20).toString("hex");
      const expires = new Date(Date.now() + 3600000).toISOString();
      db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?").run(
        token,
        expires,
        email
      );

      const resetLink = `https://${req.get("host")}/reset-password?token=${token}`;
      await sendMail(
        email,
        "비밀번호 재설정 안내",
        `
        <h2 style="font-size: 18px; margin-bottom: 20px;">비밀번호 재설정</h2>
        <p style="margin-bottom: 30px;">아래 버튼을 클릭하여 비밀번호를 재설정해주세요. (유효시간 1시간)</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #1a1a1a; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px;">비밀번호 재설정하기</a>
        `,
        "SYSTEM"
      );

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "요청 처리에 실패했습니다." });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "토큰과 새 비밀번호를 입력해주세요." });
    }
    try {
      const user = db
        .prepare("SELECT * FROM users WHERE reset_token = ? AND reset_expires > CURRENT_TIMESTAMP")
        .get(token) as any;
      if (!user) return res.status(400).json({ error: "유효하지 않거나 만료된 링크입니다." });

      const hashedPassword = hashPassword(newPassword);
      db.prepare(
        "UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?"
      ).run(hashedPassword, user.id);

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "비밀번호 재설정에 실패했습니다." });
    }
  });

  app.post("/api/auth/send-verification", authenticateUser, async (req: any, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
      if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      if (user.is_verified) return res.status(400).json({ error: "이미 인증된 계정입니다." });

      const token = crypto.randomBytes(20).toString("hex");
      db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(token, user.id);

      const verifyLink = `https://${req.get("host")}/verify-email?token=${token}`;
      await sendMail(
        user.email,
        "이메일 인증을 완료해주세요",
        `
        <h2 style="font-size: 18px; margin-bottom: 20px;">이메일 인증</h2>
        <p style="margin-bottom: 30px;">아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
        <a href="${verifyLink}" style="display: inline-block; background-color: #C5A059; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px;">이메일 인증 완료</a>
        `,
        "SYSTEM"
      );

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "인증 메일 발송에 실패했습니다." });
    }
  });

  app.get("/api/auth/verify/:token", (req, res) => {
    try {
      const user = db
        .prepare("SELECT * FROM users WHERE verification_token = ?")
        .get(req.params.token) as any;
      if (!user) return res.status(400).json({ error: "유효하지 않은 인증 토큰입니다." });

      db.prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?").run(
        user.id
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "이메일 인증 처리에 실패했습니다." });
    }
  });

  // ==========================================
  // 7. OAuth (Google & Naver)
  // ==========================================
  const getRedirectUri = (_req: express.Request, provider: string) =>
    `https://benua.shop/api/auth/${provider}/callback`;

  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Google Client ID가 설정되지 않았습니다." });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(req, "google"),
      response_type: "code",
      scope: "email profile",
      access_type: "offline",
      prompt: "consent",
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req, "google");
    const existingToken = extractToken(req, "user_token");

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code || ""),
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error("Google token exchange failed");

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      if (!userRes.ok) throw new Error("Google user info failed");

      if (existingToken) {
        try {
          const decoded = jwt.verify(existingToken, JWT_SECRET) as any;
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id, decoded.id);
          return res.send(
            `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_LINK_SUCCESS',provider:'google'},'*');window.close();}</script></body></html>`
          );
        } catch {}
      }

      let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(userData.id) as any;
      if (!user && userData.email) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(userData.email) as any;
        if (user) {
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id, user.id);
        }
      }

      if (!user) {
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${userData.email}', socialId: '${userData.id}', provider: 'google' }, '*');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(userData.email)}&socialId=${encodeURIComponent(userData.id)}&provider=google';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '*');
            window.close();
          } else {
            localStorage.setItem('benua_user_token', '${jwtToken}');
            window.location.href = '/profile';
          }
        </script></body></html>
      `);
    } catch (error) {
      console.error("Google OAuth Error:", error);
      res.send(
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'},'*');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  app.get("/api/auth/naver/url", (req, res) => {
    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Naver Client ID가 설정되지 않았습니다." });

    const state = crypto.randomBytes(8).toString("hex");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(req, "naver"),
      response_type: "code",
      state,
    });
    res.json({ url: `https://nid.naver.com/oauth2.0/authorize?${params}` });
  });

  app.get("/api/auth/naver/callback", async (req, res) => {
    const { code, state } = req.query;
    const redirectUri = getRedirectUri(req, "naver");
    const existingToken = extractToken(req, "user_token");

    try {
      const tokenRes = await fetch(
        `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error("Naver token exchange failed");

      const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      if (!userRes.ok || userData.resultcode !== "00") throw new Error("Naver user info failed");

      const socialId = userData.response.id;
      const email = userData.response.email;

      if (existingToken) {
        try {
          const decoded = jwt.verify(existingToken, JWT_SECRET) as any;
          db.prepare("UPDATE users SET naver_id = ? WHERE id = ?").run(socialId, decoded.id);
          return res.send(
            `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_LINK_SUCCESS',provider:'naver'},'*');window.close();}</script></body></html>`
          );
        } catch {}
      }

      let user = db.prepare("SELECT * FROM users WHERE naver_id = ?").get(socialId) as any;
      if (!user && email) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
        if (user) {
          db.prepare("UPDATE users SET naver_id = ? WHERE id = ?").run(socialId, user.id);
        }
      }

      if (!user) {
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${email}', socialId: '${socialId}', provider: 'naver' }, '*');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(email)}&socialId=${encodeURIComponent(socialId)}&provider=naver';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '*');
            window.close();
          } else {
            localStorage.setItem('benua_user_token', '${jwtToken}');
            window.location.href = '/profile';
          }
        </script></body></html>
      `);
    } catch (error) {
      console.error("Naver OAuth Error:", error);
      res.send(
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'},'*');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  app.get("/api/auth/kakao/url", (req, res) => {
    const clientId = process.env.KAKAO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Kakao Client ID가 설정되지 않았습니다." });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(req, "kakao"),
      response_type: "code",
    });
    res.json({ url: `https://kauth.kakao.com/oauth/authorize?${params}` });
  });

  app.get("/api/auth/kakao/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req, "kakao");
    const existingToken = extractToken(req, "user_token");

    try {
      const bodyParams: Record<string, string> = {
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_CLIENT_ID || "",
        redirect_uri: redirectUri,
        code: String(code || ""),
      };
      if (process.env.KAKAO_CLIENT_SECRET) {
        bodyParams.client_secret = process.env.KAKAO_CLIENT_SECRET;
      }

      const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams(bodyParams),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error("Kakao token exchange failed");

      const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.id) throw new Error("Kakao user info failed");

      const socialId = String(userData.id);
      const email = userData.kakao_account?.email || "";

      if (existingToken) {
        try {
          const decoded = jwt.verify(existingToken, JWT_SECRET) as any;
          db.prepare("UPDATE users SET kakao_id = ? WHERE id = ?").run(socialId, decoded.id);
          return res.send(
            `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_LINK_SUCCESS',provider:'kakao'},'*');window.close();}</script></body></html>`
          );
        } catch {}
      }

      let user = db.prepare("SELECT * FROM users WHERE kakao_id = ?").get(socialId) as any;
      if (!user && email) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
        if (user) {
          db.prepare("UPDATE users SET kakao_id = ? WHERE id = ?").run(socialId, user.id);
        }
      }

      if (!user) {
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${email}', socialId: '${socialId}', provider: 'kakao' }, '*');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(email)}&socialId=${encodeURIComponent(socialId)}&provider=kakao';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '*');
            window.close();
          } else {
            localStorage.setItem('benua_user_token', '${jwtToken}');
            window.location.href = '/profile';
          }
        </script></body></html>
      `);
    } catch (error) {
      console.error("Kakao OAuth Error:", error);
      res.send(
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'},'*');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  // ==========================================
  // 8. Admin Auth (2FA TOTP) & Key Management
  // ==========================================
  app.post("/api/admin/verify-key", async (req, res) => {
    const { adminKey } = req.body;
    const keyRecord = db.prepare("SELECT * FROM admin_keys WHERE key_value = ?").get(adminKey) as any;

    if (!keyRecord) {
      return res.status(401).json({ error: "유효하지 않은 관리자 보안 키입니다." });
    }

    if (!keyRecord.totp_secret) {
      const secret = speakeasy.generateSecret({ name: "Benua Admin" });
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
      return res.json({ requiresSetup: true, secret: secret.base32, qrCodeUrl });
    }
    return res.json({ requiresSetup: false });
  });

  app.post("/api/admin/verify-totp", (req, res) => {
    const { adminKey, token, secret } = req.body;
    const keyRecord = db.prepare("SELECT * FROM admin_keys WHERE key_value = ?").get(adminKey) as any;

    if (!keyRecord) return res.status(401).json({ error: "유효하지 않은 보안 키입니다." });

    const totpSecret = keyRecord.totp_secret || secret;
    if (!totpSecret) return res.status(400).json({ error: "TOTP 시크릿이 없습니다." });

    const isValid = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: "base32",
      token: String(token || "").trim(),
      window: 1,
    });

    if (!isValid) return res.status(401).json({ error: "OTP 인증번호가 일치하지 않습니다." });

    if (!keyRecord.totp_secret) {
      db.prepare("UPDATE admin_keys SET totp_secret = ? WHERE id = ?").run(totpSecret, keyRecord.id);
    }

    const jwtToken = jwt.sign(
      { isKey: true, role: keyRecord.role || "MASTER", keyId: keyRecord.id },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    setAuthCookie(res, "admin_token", jwtToken);
    logAdminAction(req, "LOGIN", "system", null, "Admin logged in via 2FA", null);
    res.json({ success: true, token: jwtToken, role: keyRecord.role || "MASTER" });
  });

  app.post("/api/admin/logout", (_req, res) => {
    clearAuthCookie(res, "admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/check", authenticateCS, (req: any, res) => {
    res.json({ authenticated: true, role: req.admin.role });
  });

  app.get("/api/admin/logs", authenticateAdmin, (_req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 500").all();
      res.json(logs);
    } catch {
      res.status(500).json({ error: "로그를 불러오지 못했습니다." });
    }
  });

  app.get("/api/admin/keys", authenticateAdmin, (_req, res) => {
    const keys = db
      .prepare(
        "SELECT id, key_value, role, CASE WHEN totp_secret IS NULL THEN 0 ELSE 1 END as has_2fa, created_at FROM admin_keys ORDER BY created_at DESC"
      )
      .all() as any[];
    res.json(keys);
  });

  app.post("/api/admin/keys", authenticateAdmin, (req: any, res) => {
    const { keyValue, role } = req.body;
    if (!keyValue) return res.status(400).json({ error: "키 값을 입력해주세요." });
    if (req.admin.role !== "MASTER" && role === "MASTER") {
      return res.status(403).json({ error: "MASTER 권한 키는 MASTER만 생성할 수 있습니다." });
    }
    try {
      const info = db
        .prepare("INSERT INTO admin_keys (key_value, role) VALUES (?, ?)")
        .run(keyValue.trim(), role || "ADMIN");
      logAdminAction(req, "CREATE_ADMIN_KEY", "admin_keys", Number(info.lastInsertRowid), `Created key with role ${role || "ADMIN"}`);
      res.json({ success: true });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({ error: "이미 존재하는 보안 키입니다." });
      }
      res.status(500).json({ error: "보안 키 생성에 실패했습니다." });
    }
  });

  app.put("/api/admin/keys/:id/role", authenticateAdmin, (req: any, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!["MASTER", "ADMIN", "OPERATOR", "CS"].includes(role)) {
      return res.status(400).json({ error: "유효하지 않은 권한입니다." });
    }
    try {
      const existingKey = db.prepare("SELECT role FROM admin_keys WHERE id = ?").get(id) as any;
      if (!existingKey) return res.status(404).json({ error: "보안 키를 찾을 수 없습니다." });
      if (req.admin.role !== "MASTER" && (role === "MASTER" || existingKey.role === "MASTER")) {
        return res.status(403).json({ error: "MASTER 권한 변경은 MASTER만 가능합니다." });
      }
      db.prepare("UPDATE admin_keys SET role = ? WHERE id = ?").run(role, id);
      logAdminAction(req, "UPDATE_KEY_ROLE", "admin_keys", Number(id), `Updated role to ${role}`, {
        before: existingKey.role,
        after: role,
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "권한 변경에 실패했습니다." });
    }
  });

  app.delete("/api/admin/keys/:id", authenticateAdmin, (req: any, res) => {
    try {
      const existingKey = db.prepare("SELECT role FROM admin_keys WHERE id = ?").get(req.params.id) as any;
      if (!existingKey) return res.status(404).json({ error: "보안 키를 찾을 수 없습니다." });
      if (req.admin.role !== "MASTER" && existingKey.role === "MASTER") {
        return res.status(403).json({ error: "MASTER 보안 키는 삭제할 수 없습니다." });
      }
      const count = db.prepare("SELECT COUNT(*) as count FROM admin_keys").get() as { count: number };
      if (count.count <= 1) {
        return res.status(400).json({ error: "최소 1개의 관리자 키는 유지되어야 합니다." });
      }
      db.prepare("DELETE FROM admin_keys WHERE id = ?").run(req.params.id);
      logAdminAction(req, "DELETE_ADMIN_KEY", "admin_keys", Number(req.params.id), "Deleted admin key");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "보안 키 삭제에 실패했습니다." });
    }
  });

  // ==========================================
  // 9. Products APIs
  // ==========================================
  app.get("/api/products", (_req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
      res.json(products);
    } catch {
      res.status(500).json({ error: "상품 목록을 불러오지 못했습니다." });
    }
  });

  app.get("/api/products/:id", (req, res) => {
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
      if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
      res.json(product);
    } catch {
      res.status(500).json({ error: "상품 정보를 불러오지 못했습니다." });
    }
  });

  app.post(
    "/api/products",
    authenticateAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "description_image", maxCount: 1 },
    ]),
    (req: any, res) => {
      const {
        name,
        price,
        description,
        category,
        stock,
        material,
        dimensions,
        origin,
        manufacturer,
        discount_rate,
        show_on_main,
      } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!name || isNaN(parseInt(price, 10))) {
        return res.status(400).json({ error: "상품명과 가격을 올바르게 입력해주세요." });
      }

      const image_url = files?.["image"]?.[0] ? `/uploads/${files["image"][0].filename}` : null;
      const description_image_url = files?.["description_image"]?.[0]
        ? `/uploads/${files["description_image"][0].filename}`
        : null;

      try {
        const info = db
          .prepare(
            `INSERT INTO products
            (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            name.trim(),
            parseInt(price, 10) || 0,
            description || "",
            image_url,
            description_image_url,
            category || "오브제",
            parseInt(stock, 10) || 0,
            material || "",
            dimensions || "",
            origin || "",
            manufacturer || "",
            parseInt(discount_rate, 10) || 0,
            show_on_main === "true" || show_on_main === "1" || show_on_main === 1 ? 1 : 0
          );

        logAdminAction(req, "CREATE_PRODUCT", "products", Number(info.lastInsertRowid), `Created product: ${name}`);
        res.json({ id: info.lastInsertRowid, success: true });
      } catch (err: any) {
        res.status(500).json({ error: "상품 등록 실패: " + err.message });
      }
    }
  );

  app.put(
    "/api/products/:id",
    authenticateAdmin,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "description_image", maxCount: 1 },
    ]),
    (req: any, res) => {
      const { id } = req.params;
      const {
        name,
        price,
        description,
        category,
        stock,
        material,
        dimensions,
        origin,
        manufacturer,
        discount_rate,
        show_on_main,
      } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      try {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
        if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });

        const image_url = files?.["image"]?.[0]
          ? `/uploads/${files["image"][0].filename}`
          : product.image_url;
        const description_image_url = files?.["description_image"]?.[0]
          ? `/uploads/${files["description_image"][0].filename}`
          : product.description_image_url;

        db.prepare(
          `UPDATE products
           SET name = ?, price = ?, description = ?, image_url = ?, description_image_url = ?,
               category = ?, stock = ?, material = ?, dimensions = ?, origin = ?,
               manufacturer = ?, discount_rate = ?, show_on_main = ?
           WHERE id = ?`
        ).run(
          name.trim(),
          parseInt(price, 10) || 0,
          description || "",
          image_url,
          description_image_url,
          category || "오브제",
          parseInt(stock, 10) || 0,
          material || "",
          dimensions || "",
          origin || "",
          manufacturer || "",
          parseInt(discount_rate, 10) || 0,
          show_on_main === "true" || show_on_main === "1" || show_on_main === 1 ? 1 : 0,
          id
        );

        logAdminAction(req, "UPDATE_PRODUCT", "products", Number(id), `Updated product: ${name}`);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: "상품 수정 실패: " + err.message });
      }
    }
  );

  app.delete("/api/products/:id", authenticateAdmin, (req: any, res) => {
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      logAdminAction(req, "DELETE_PRODUCT", "products", Number(req.params.id), "Deleted product");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "상품 삭제에 실패했습니다." });
    }
  });

  app.post("/api/admin/products/bulk", authenticateAdmin, (req: any, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: "잘못된 데이터 형식입니다." });

    try {
      const insert = db.prepare(
        `INSERT INTO products
        (name, price, description, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      db.transaction((items: any[]) => {
        for (const item of items) {
          if (!item.name) continue;
          insert.run(
            item.name,
            Number(item.price) || 0,
            item.description || "",
            item.category || "오브제",
            Number(item.stock) || 0,
            item.material || "",
            item.dimensions || "",
            item.origin || "",
            item.manufacturer || "",
            Number(item.discount_rate) || 0,
            item.show_on_main ? 1 : 0
          );
        }
      })(products);

      logAdminAction(req, "BULK_CREATE_PRODUCTS", "products", null, `Uploaded ${products.length} products`);
      res.json({ success: true, count: products.length });
    } catch (err: any) {
      res.status(500).json({ error: "대량 등록 실패: " + err.message });
    }
  });

  // ==========================================
  // 10. Coupons & Wishlist APIs
  // ==========================================
  app.get("/api/admin/coupons", authenticateCS, (_req, res) => {
    try {
      const coupons = db.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
      res.json(coupons);
    } catch {
      res.status(500).json({ error: "쿠폰 목록을 불러오지 못했습니다." });
    }
  });

  app.post("/api/admin/coupons", authenticateAdmin, (req: any, res) => {
    const { name, code, type, value, min_order_amount, max_discount_amount } = req.body;
    try {
      const info = db
        .prepare(
          "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          name,
          code,
          type || "PERCENT",
          Number(value) || 0,
          Number(min_order_amount) || 0,
          Number(max_discount_amount) || 0
        );
      logAdminAction(req, "CREATE_COUPON", "coupons", Number(info.lastInsertRowid), `Created coupon ${code}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "쿠폰 생성 실패: " + err.message });
    }
  });

  app.delete("/api/admin/coupons/:id", authenticateAdmin, (req: any, res) => {
    try {
      db.prepare("DELETE FROM coupons WHERE id = ?").run(req.params.id);
      logAdminAction(req, "DELETE_COUPON", "coupons", Number(req.params.id), "Deleted coupon");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "쿠폰 삭제에 실패했습니다." });
    }
  });

  app.post("/api/admin/coupons/:id/give", authenticateOperator, (req: any, res) => {
    const { id } = req.params;
    const { target } = req.body;
    try {
      const coupon = db.prepare("SELECT * FROM coupons WHERE id = ?").get(id);
      if (!coupon) return res.status(404).json({ error: "쿠폰을 찾을 수 없습니다." });

      if (target === "all") {
        const users = db.prepare("SELECT id FROM users").all() as Array<{ id: number }>;
        const insert = db.prepare("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)");
        db.transaction((list: Array<{ id: number }>) => {
          for (const u of list) insert.run(u.id, id);
        })(users);
      } else {
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(target) as any;
        if (!user) return res.status(404).json({ error: "해당 이메일의 회원을 찾을 수 없습니다." });
        db.prepare("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)").run(user.id, id);
      }

      logAdminAction(req, "ISSUE_COUPON", "coupons", Number(id), `Issued coupon to ${target}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "쿠폰 지급 실패: " + err.message });
    }
  });

  const getUserCouponsHandler = (req: any, res: any) => {
    try {
      const coupons = db
        .prepare(
          `SELECT uc.*, uc.id as user_coupon_id, c.name, c.code, c.type, c.value, c.min_order_amount, c.max_discount_amount
           FROM user_coupons uc
           JOIN coupons c ON uc.coupon_id = c.id
           WHERE uc.user_id = ? AND uc.is_used = 0
             AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)
           ORDER BY uc.created_at DESC`
        )
        .all(req.user.id);
      res.json(coupons);
    } catch {
      res.status(500).json({ error: "쿠폰 목록을 불러오지 못했습니다." });
    }
  };

  app.get("/api/coupons/me", authenticateUser, getUserCouponsHandler);
  app.get("/api/user/coupons", authenticateUser, getUserCouponsHandler);

  app.get("/api/coupons/notifications", authenticateUser, (req: any, res) => {
    try {
      const newCoupons = db
        .prepare(
          `SELECT uc.id, c.name, c.type, c.value
           FROM user_coupons uc
           JOIN coupons c ON uc.coupon_id = c.id
           WHERE uc.user_id = ? AND uc.notified = 0 AND uc.is_used = 0`
        )
        .all(req.user.id);
      res.json(newCoupons);
    } catch {
      res.status(500).json({ error: "쿠폰 알림 조회 실패" });
    }
  });

  app.post("/api/coupons/notifications/ack", authenticateUser, (req: any, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });
    try {
      const update = db.prepare("UPDATE user_coupons SET notified = 1 WHERE id = ? AND user_id = ?");
      db.transaction((couponIds: number[]) => {
        for (const cid of couponIds) update.run(cid, req.user.id);
      })(ids);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "알림 확인 처리 실패" });
    }
  });

  app.post("/api/coupons/validate", authenticateUser, (req: any, res) => {
    const { code, order_amount } = req.body;
    try {
      const coupon = db
        .prepare(
          `SELECT uc.id as user_coupon_id, c.*
           FROM user_coupons uc
           JOIN coupons c ON uc.coupon_id = c.id
           WHERE uc.user_id = ? AND (c.code = ? OR c.name = ?) AND uc.is_used = 0
             AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)`
        )
        .get(req.user.id, code, code) as any;

      if (!coupon) return res.status(400).json({ error: "사용 가능한 쿠폰이 아닙니다." });

      const minAmount = coupon.min_order_amount || 0;
      if (order_amount < minAmount) {
        return res
          .status(400)
          .json({ error: `최소 주문금액 ${formatPrice(minAmount)} 이상부터 사용 가능합니다.` });
      }

      let discount = 0;
      if (coupon.type === "FIXED") {
        discount = coupon.value;
      } else if (coupon.type === "PERCENT") {
        discount = Math.floor(order_amount * (coupon.value / 100));
        if (coupon.max_discount_amount > 0 && discount > coupon.max_discount_amount) {
          discount = coupon.max_discount_amount;
        }
      }
      res.json({ coupon, discount });
    } catch {
      res.status(500).json({ error: "쿠폰 검증 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/wishlists", authenticateUser, (req: any, res) => {
    try {
      const items = db
        .prepare(
          `SELECT p.*, w.created_at as w_created_at
           FROM wishlists w
           JOIN products p ON w.product_id = p.id
           WHERE w.user_id = ?
           ORDER BY w.created_at DESC`
        )
        .all(req.user.id);
      res.json(items);
    } catch {
      res.status(500).json({ error: "위시리스트를 불러오지 못했습니다." });
    }
  });

  app.post("/api/wishlists/:productId/toggle", authenticateUser, (req: any, res) => {
    const { productId } = req.params;
    const userId = req.user.id;
    try {
      const existing = db
        .prepare("SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?")
        .get(userId, productId);
      if (existing) {
        db.prepare("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?").run(
          userId,
          productId
        );
        res.json({ success: true, isWished: false });
      } else {
        db.prepare("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)").run(
          userId,
          productId
        );
        res.json({ success: true, isWished: true });
      }
    } catch {
      res.status(500).json({ error: "위시리스트 처리에 실패했습니다." });
    }
  });

  // ==========================================
  // 11. Orders & Toss Payments APIs
  // ==========================================

  // Step 1: Prepare Order before launching Toss Payment Widget
  app.post("/api/orders/prepare", (req, res) => {
    const {
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      total_amount,
      shipping_fee,
      items,
      used_points,
      used_coupon_id,
      payment_method,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "주문할 상품이 없습니다." });
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let order_number = "";
    for (let i = 0; i < 15; i++) {
      order_number += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const p_used_points = Number(used_points) || 0;
    const p_used_coupon_id = used_coupon_id ? Number(used_coupon_id) : null;
    const p_shipping_fee = Number(shipping_fee) || 0;
    const p_total_amount = Math.max(0, Number(total_amount) || 0);

    try {
      const orderId = db.transaction(() => {
        // Verify stock before creating pending order
        for (const item of items) {
          const prodId = item.id || item.product_id;
          const prod = db.prepare("SELECT name, stock FROM products WHERE id = ?").get(prodId) as any;
          if (!prod) throw new Error(`존재하지 않는 상품입니다: ${item.name}`);
          if (prod.stock < item.quantity) {
            throw new Error(`'${prod.name}' 상품의 재고가 부족합니다. (남은 재고: ${prod.stock}개)`);
          }
        }

        // Verify points if used
        if (user_id && p_used_points > 0) {
          const userRow = db.prepare("SELECT points FROM users WHERE id = ?").get(user_id) as any;
          if (!userRow) throw new Error("회원 정보를 찾을 수 없습니다.");
          if (p_used_points < 1000) throw new Error("포인트는 최소 1,000P 이상부터 사용 가능합니다.");
          if (userRow.points < p_used_points) throw new Error("보유 포인트가 부족합니다.");
        }

        const info = db
          .prepare(
            `INSERT INTO orders
            (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address,
             total_amount, shipping_fee, used_points, used_coupon_id, payment_method, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
          )
          .run(
            order_number,
            user_id || null,
            customer_name,
            customer_email,
            customer_phone,
            shipping_address,
            p_total_amount,
            p_shipping_fee,
            p_used_points,
            p_used_coupon_id,
            payment_method || "card"
          );

        const newOrderId = Number(info.lastInsertRowid);
        const insertItem = db.prepare(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)"
        );

        for (const item of items) {
          insertItem.run(
            newOrderId,
            item.id || item.product_id,
            item.name,
            item.price,
            item.quantity,
            item.image || item.image_url
          );
        }

        return newOrderId;
      })();

      // If total_amount is 0 won (fully paid by points/coupons), complete immediately without PG
      if (p_total_amount === 0) {
        finalizeOrderPaymentTx(orderId, `FREE_${order_number}`, payment_method || "card", "paid");
        return res.json({
          success: true,
          zeroAmountPaid: true,
          order_number,
          amount: 0,
        });
      }

      res.json({
        success: true,
        zeroAmountPaid: false,
        order_id: orderId,
        order_number,
        amount: p_total_amount,
        order_name:
          items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "주문서 생성에 실패했습니다." });
    }
  });

  // Step 2: Confirm Toss Payment (Server-to-Server Verification)
  app.post("/api/payments/toss/confirm", async (req, res) => {
    const { paymentKey, orderId: order_number, amount } = req.body;

    if (!paymentKey || !order_number || amount === undefined) {
      return res.status(400).json({ error: "필수 결제 파라미터가 누락되었습니다." });
    }

    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE order_number = ?")
        .get(order_number) as any;

      if (!order) {
        return res.status(404).json({ error: "주문 정보를 찾을 수 없습니다." });
      }

      // Idempotency check
      if (order.status === "paid" || order.status === "shipping" || order.status === "completed") {
        return res.json({ success: true, order_number: order.order_number, status: order.status });
      }

      if (Number(order.total_amount) !== Number(amount)) {
        return res.status(400).json({ error: "결제 금액이 주문 금액과 일치하지 않습니다." });
      }

      const basicAuth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId: order_number,
          amount: Number(amount),
        }),
      });

      const tossData = await tossRes.json();
      if (!tossRes.ok) {
        console.error("[TOSS][CONFIRM_ERROR]", tossData);
        return res.status(400).json({
          error: tossData.message || "토스페이먼츠 결제 승인에 실패했습니다.",
          code: tossData.code,
        });
      }

      const normalizedMethod = normalizeTossMethod(tossData, order.payment_method);
      const isVirtualAccountWaiting =
        tossData.status === "WAITING_FOR_DEPOSIT" || normalizedMethod === "vbank";

      const vbankInfo = tossData.virtualAccount
        ? {
            bank: tossData.virtualAccount.bankCode,
            account: tossData.virtualAccount.accountNumber,
            holder: tossData.virtualAccount.customerName,
            dueDate: tossData.virtualAccount.dueDate,
          }
        : undefined;

      const updatedOrder = finalizeOrderPaymentTx(
        order.id,
        paymentKey,
        normalizedMethod,
        isVirtualAccountWaiting ? "pending" : "paid",
        vbankInfo
      );

      // Send Order Confirmation Email
      const orderItems = db
        .prepare("SELECT * FROM order_items WHERE order_id = ?")
        .all(order.id) as any[];

      if (order.customer_email) {
        const itemsListHtml = orderItems
          .map(
            (item: any) => `
          <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
            <p style="font-size: 14px; font-weight: bold; margin: 0;">${item.name}</p>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">${Number(item.price).toLocaleString()}원 × ${item.quantity}개</p>
          </div>`
          )
          .join("");

        const vbankNoticeHtml = isVirtualAccountWaiting && vbankInfo
          ? `<div style="background-color: #fff8eb; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
               <p style="font-size: 13px; font-weight: bold; margin: 0 0 6px 0;">가상계좌 입금 안내</p>
               <p style="font-size: 13px; margin: 0;">계좌번호: ${vbankInfo.bank} ${vbankInfo.account} (기한: ${new Date(vbankInfo.dueDate || "").toLocaleDateString("ko-KR")})</p>
             </div>`
          : "";

        sendMail(
          order.customer_email,
          `주문이 정상 접수되었습니다 (주문번호: ${order.order_number})`,
          `
          <h2 style="font-size: 18px; margin-bottom: 24px;">주문 확인 안내</h2>
          <p style="margin-bottom: 30px;">안녕하세요, ${order.customer_name}님. 베뉴아를 이용해주셔서 감사합니다.</p>
          ${vbankNoticeHtml}
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
            <p style="font-size: 14px; margin-bottom: 8px;">주문번호: <b>${order.order_number}</b></p>
            <p style="font-size: 14px; margin-bottom: 24px;">결제금액: <b>${Number(order.total_amount).toLocaleString()}원</b></p>
            ${itemsListHtml}
            <p style="font-size: 13px; color: #333; margin-top: 16px;">배송지: ${order.shipping_address}</p>
          </div>
          `,
          "SYSTEM"
        );
      }

      res.json({
        success: true,
        order_number: order.order_number,
        status: updatedOrder.status,
        vbank: vbankInfo || null,
      });
    } catch (err: any) {
      console.error("Toss confirm exception:", err);
      res.status(500).json({ error: err.message || "결제 승인 처리 중 오류가 발생했습니다." });
    }
  });

  // Toss Webhook for Virtual Account Deposit / Cancellation
  app.post("/api/payments/toss/webhook", (req, res) => {
    const { orderId, status } = req.body?.data || req.body || {};
    if (!orderId) return res.status(200).json({ ok: true });

    try {
      const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderId) as any;
      if (!order) return res.status(200).json({ ok: true });

      if (status === "DONE" && order.status === "pending") {
        db.prepare(
          "UPDATE orders SET status = 'paid', status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(order.id);
      } else if (status === "CANCELED" && order.status !== "refunded") {
        refundOrderTx(order.id, order.total_amount, "PG 웹훅 결제 취소");
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[TOSS][WEBHOOK_ERROR]", err);
      res.status(500).json({ error: "Webhook failed" });
    }
  });

  // Legacy Direct Order Fallback
  app.post("/api/orders", (req, res) => {
    const {
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      total_amount,
      shipping_fee,
      items,
      used_points,
      used_coupon_id,
      payment_method,
    } = req.body;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let order_number = "";
    for (let i = 0; i < 15; i++) {
      order_number += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const p_used_points = Number(used_points) || 0;
    const p_used_coupon_id = used_coupon_id ? Number(used_coupon_id) : null;
    const p_shipping_fee = Number(shipping_fee) || 0;
    const p_total_amount = Number(total_amount) || 0;

    try {
      const orderId = db.transaction(() => {
        const info = db
          .prepare(
            `INSERT INTO orders
            (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address,
             total_amount, shipping_fee, used_points, used_coupon_id, payment_method, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
          )
          .run(
            order_number,
            user_id || null,
            customer_name,
            customer_email,
            customer_phone,
            shipping_address,
            p_total_amount,
            p_shipping_fee,
            p_used_points,
            p_used_coupon_id,
            payment_method || "card"
          );

        const newId = Number(info.lastInsertRowid);
        if (Array.isArray(items)) {
          const insertItem = db.prepare(
            "INSERT INTO order_items (order_id, product_id, name, price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)"
          );
          for (const item of items) {
            insertItem.run(
              newId,
              item.id || item.product_id,
              item.name,
              item.price,
              item.quantity,
              item.image || item.image_url
            );
          }
        }
        return newId;
      })();

      finalizeOrderPaymentTx(orderId, null, payment_method || "card", "paid");
      res.json({ success: true, order_number });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "주문 처리 실패" });
    }
  });

  app.get("/api/orders/me", authenticateUser, (req: any, res) => {
    try {
      const orders = db
        .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
        .all(req.user.id) as any[];
      const getItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?");
      for (const order of orders) {
        order.items = getItems.all(order.id);
      }
      res.json(orders);
    } catch {
      res.status(500).json({ error: "주문 내역을 불러오지 못했습니다." });
    }
  });

  app.get("/api/orders/track/:orderNumber", (req, res) => {
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE order_number = ?")
        .get(req.params.orderNumber) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      order.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      res.json(order);
    } catch {
      res.status(500).json({ error: "주문 조회에 실패했습니다." });
    }
  });

  app.get("/api/orders/:id/detail", authenticateUser, (req: any, res) => {
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      res.json({ ...order, items });
    } catch {
      res.status(500).json({ error: "주문 상세 조회 실패" });
    }
  });

  app.post("/api/orders/:id/confirm", authenticateUser, (req: any, res) => {
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      if (order.status === "completed") {
        return res.status(400).json({ error: "이미 구매확정된 주문입니다." });
      }

      const result = completeOrderTx(order.id);
      res.json({ success: true, earned: result.earned });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "구매확정 처리에 실패했습니다." });
    }
  });

  app.post("/api/orders/:id/refund-request", authenticateUser, async (req: any, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      if (["refund_requested", "refunded"].includes(order.status)) {
        return res.status(400).json({ error: "이미 환불 요청 또는 처리된 주문입니다." });
      }

      const beforeShipping = ["pending", "paid"].includes(order.status);
      if (beforeShipping) {
        await cancelTossPaymentIfNeeded(order, reason || "발송 전 고객 주문 취소");
        refundOrderTx(order.id, order.total_amount, reason || "발송 전 주문 취소");
        return res.json({
          success: true,
          status: "refunded",
          refund_amount: order.total_amount,
        });
      }

      let refundAmount = order.total_amount;
      if (reason === "단순 변심" || reason === "옵션 오선택") {
        refundAmount = Math.max(0, order.total_amount - 5000);
      }

      db.prepare(
        "UPDATE orders SET status = 'refund_requested', refund_reason = ?, refund_amount = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(reason, refundAmount, id);

      res.json({ success: true, status: "refund_requested", refund_amount: refundAmount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "환불 요청 처리에 실패했습니다." });
    }
  });

  // --- Admin Order Management ---
  app.get("/api/admin/orders", authenticateOperator, (_req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as any[];
      const getItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?");
      for (const order of orders) {
        order.items = getItems.all(order.id);
      }
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: "주문 목록 조회 실패: " + err.message });
    }
  });

  app.get("/api/admin/orders/export", authenticateOperator, (_req, res) => {
    try {
      const orders = db
        .prepare(
          `SELECT order_number, customer_name, customer_email, total_amount, status, created_at, tracking_number, shipping_company
           FROM orders ORDER BY created_at DESC`
        )
        .all();
      res.json(orders);
    } catch {
      res.status(500).json({ error: "주문 내보내기에 실패했습니다." });
    }
  });

  app.post("/api/admin/orders/:id/tracking", authenticateOperator, async (req: any, res) => {
    const { id } = req.params;
    const { tracking_number, shipping_company } = req.body;
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });

      db.prepare(
        "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(tracking_number, shipping_company || "CJ대한통운", id);

      logAdminAction(req, "UPDATE_TRACKING", "orders", Number(id), `${shipping_company}: ${tracking_number}`);

      if (order.customer_email) {
        await sendMail(
          order.customer_email,
          `상품 발송이 시작되었습니다 (주문번호: ${order.order_number})`,
          `
          <h2 style="font-size: 18px; margin-bottom: 24px;">상품 출고 안내</h2>
          <p style="margin-bottom: 20px;">안녕하세요, ${order.customer_name}님. 주문하신 오브제가 발송되었습니다.</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
            <p style="margin: 0 0 8px 0;">택배사: <b>${shipping_company || "CJ대한통운"}</b></p>
            <p style="margin: 0;">운송장번호: <b>${tracking_number}</b></p>
          </div>
          `,
          "SYSTEM"
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "운송장 등록 실패: " + err.message });
    }
  });

  app.post("/api/admin/orders/:id/status", authenticateOperator, async (req: any, res) => {
    const { status } = req.body;
    const { id } = req.params;

    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });

      if (status === "completed") {
        completeOrderTx(id);
      } else if (status === "refunded") {
        await cancelTossPaymentIfNeeded(order, order.refund_reason || "관리자 환불 승인", order.refund_amount || undefined);
        refundOrderTx(id);
      } else {
        db.prepare(
          "UPDATE orders SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(status, id);
      }

      logAdminAction(req, "UPDATE_ORDER_STATUS", "orders", Number(id), `Status changed: ${order.status} -> ${status}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "주문 상태 변경 실패" });
    }
  });

  app.post("/api/admin/orders/:id/claim", authenticateOperator, async (req: any, res) => {
    const { action } = req.body;
    const { id } = req.params;
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });

      if (action === "approve") {
        await cancelTossPaymentIfNeeded(order, order.refund_reason || "클레임 환불 승인", order.refund_amount || undefined);
        refundOrderTx(id);
      } else {
        completeOrderTx(id);
      }
      logAdminAction(req, "PROCESS_CLAIM", "orders", Number(id), `Claim ${action}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "클레임 처리에 실패했습니다." });
    }
  });

  app.delete("/api/admin/orders/test", authenticateAdmin, (req: any, res) => {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM order_items").run();
        db.prepare("DELETE FROM reviews").run();
        db.prepare("DELETE FROM orders").run();
      })();
      logAdminAction(req, "RESET_TEST_ORDERS", "orders", null, "Cleared all orders");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "주문 초기화 실패" });
    }
  });

  // ==========================================
  // 12. Reviews APIs
  // ==========================================
  app.post("/api/reviews", authenticateUser, (req: any, res) => {
    const { product_id, order_id, rating, content, image_url } = req.body;
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(order_id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문 내역을 찾을 수 없습니다." });
      if (order.status !== "completed") {
        return res.status(400).json({ error: "구매확정된 주문만 리뷰를 작성할 수 있습니다." });
      }

      const baseDateStr = order.confirmed_at || order.status_updated_at;
      if (baseDateStr) {
        const confirmedAt = new Date(baseDateStr);
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - confirmedAt.getTime() > threeDaysInMs) {
          return res
            .status(400)
            .json({ error: "구매확정 후 3일이 경과하여 리뷰를 작성할 수 없습니다." });
        }
      }

      const existing = db
        .prepare("SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?")
        .get(order_id, product_id, req.user.id);
      if (existing) return res.status(400).json({ error: "이미 해당 상품의 리뷰를 작성하셨습니다." });

      const user = db.prepare("SELECT id, tier FROM users WHERE id = ?").get(req.user.id) as any;
      const type = image_url ? "PHOTO" : "TEXT";
      const tierUpper = (user?.tier || "BEIGE").toUpperCase();
      const isPremium = tierUpper === "BLACK" || tierUpper === "THE_BLACK";
      const points = type === "PHOTO" ? (isPremium ? 2000 : 500) : isPremium ? 500 : 100;

      db.transaction(() => {
        db.prepare(
          `INSERT INTO reviews
          (product_id, user_id, order_id, rating, content, image_url, type, points_earned)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(product_id, req.user.id, order_id, Number(rating) || 5, content, image_url || null, type, points);

        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(points, req.user.id);
        db.prepare(
          "INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'EARNED')"
        ).run(req.user.id, points, `리뷰 작성(${type}) 적립`);
      })();

      res.json({ success: true, points_earned: points });
    } catch {
      res.status(500).json({ error: "리뷰 등록에 실패했습니다." });
    }
  });

  app.get("/api/products/:id/reviews", (req, res) => {
    try {
      const reviews = db
        .prepare(
          `SELECT r.*, IFNULL(u.name, '익명 회원') as user_name, IFNULL(u.tier, 'BEIGE') as user_tier
           FROM reviews r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.product_id = ?
           ORDER BY r.is_best DESC, r.created_at DESC`
        )
        .all(req.params.id);
      res.json(reviews);
    } catch {
      res.status(500).json({ error: "리뷰 목록을 불러오지 못했습니다." });
    }
  });

  app.get("/api/admin/reviews", authenticateCS, (_req, res) => {
    try {
      const reviews = db
        .prepare(
          `SELECT r.*, p.name as product_name, IFNULL(u.name, '탈퇴회원') as user_name
           FROM reviews r
           LEFT JOIN products p ON r.product_id = p.id
           LEFT JOIN users u ON r.user_id = u.id
           ORDER BY r.created_at DESC`
        )
        .all();
      res.json(reviews);
    } catch {
      res.status(500).json({ error: "리뷰 조회에 실패했습니다." });
    }
  });

  app.post("/api/admin/reviews/:id/best", authenticateCS, (req: any, res) => {
    const { isBest } = req.body;
    try {
      db.prepare("UPDATE reviews SET is_best = ? WHERE id = ?").run(
        isBest ? 1 : 0,
        req.params.id
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "베스트 리뷰 설정에 실패했습니다." });
    }
  });

  // ==========================================
  // 13. Admin Users, Stats, Settlement, Display, Inquiries, Newsletter
  // ==========================================
  app.get("/api/admin/users", authenticateOperator, (_req, res) => {
    try {
      const users = db
        .prepare(
          "SELECT id, email, name, phone, points, tier, total_spent_6m, role, is_verified, created_at FROM users ORDER BY created_at DESC"
        )
        .all();
      res.json(users);
    } catch {
      res.status(500).json({ error: "회원 목록 조회 실패" });
    }
  });

  app.post("/api/admin/users/points", authenticateAdmin, (req: any, res) => {
    const { email, amount, reason } = req.body;
    const parsedAmount = Number(amount);
    if (!email || isNaN(parsedAmount) || parsedAmount === 0) {
      return res.status(400).json({ error: "이메일과 유효한 포인트 수치를 입력해주세요." });
    }
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim()) as any;
      if (!user) return res.status(404).json({ error: "해당 이메일의 회원을 찾을 수 없습니다." });

      const type = parsedAmount >= 0 ? "MANUAL_EARN" : "MANUAL_DEDUCT";
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      db.prepare("UPDATE users SET points = MAX(0, points + ?) WHERE id = ?").run(
        parsedAmount,
        user.id
      );
      db.prepare(
        "INSERT INTO point_history (user_id, amount, reason, type, expires_at) VALUES (?, ?, ?, ?, ?)"
      ).run(
        user.id,
        parsedAmount,
        reason || "관리자 수동 조정",
        type,
        expiresAt.toISOString()
      );

      logAdminAction(req, "ADJUST_USER_POINTS", "users", user.id, `${email}: ${parsedAmount}P`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "포인트 조정에 실패했습니다." });
    }
  });

  app.post("/api/admin/users/:emailOrId/role", authenticateAdmin, (req: any, res) => {
    const { role } = req.body;
    const targetKey = req.params.emailOrId;
    if (!["MASTER", "ADMIN", "OPERATOR", "CS", "USER"].includes(role)) {
      return res.status(400).json({ error: "유효하지 않은 권한입니다." });
    }
    if (req.admin.role !== "MASTER" && role === "MASTER") {
      return res.status(403).json({ error: "MASTER 권한 부여는 MASTER만 가능합니다." });
    }

    try {
      const targetUser = targetKey.includes("@")
        ? (db.prepare("SELECT id, role FROM users WHERE email = ?").get(targetKey) as any)
        : (db.prepare("SELECT id, role FROM users WHERE id = ?").get(targetKey) as any);

      if (!targetUser) return res.status(404).json({ error: "회원을 찾을 수 없습니다." });
      if (req.admin.role !== "MASTER" && targetUser.role === "MASTER") {
        return res.status(403).json({ error: "MASTER 회원의 권한은 수정할 수 없습니다." });
      }

      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, targetUser.id);
      logAdminAction(req, "UPDATE_USER_ROLE", "users", targetUser.id, `Role set to ${role}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "권한 변경에 실패했습니다." });
    }
  });

  app.get("/api/admin/dashboard/stats", authenticateCS, (_req, res) => {
    try {
      const dailySales = db
        .prepare(
          "SELECT SUM(total_amount) as amount FROM orders WHERE date(created_at) = date('now') AND status != 'refunded'"
        )
        .get() as any;
      const weeklySales = db
        .prepare(
          "SELECT SUM(total_amount) as amount FROM orders WHERE created_at > date('now', '-7 days') AND status != 'refunded'"
        )
        .get() as any;
      const pendingCount = db
        .prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'paid')")
        .get() as any;
      const lowStockProducts = db
        .prepare("SELECT COUNT(*) as count FROM products WHERE stock < 10")
        .get() as any;

      res.json({
        dailySales: dailySales?.amount || 0,
        weeklySales: weeklySales?.amount || 0,
        pendingOrders: pendingCount?.count || 0,
        lowStockProducts: lowStockProducts?.count || 0,
      });
    } catch {
      res.status(500).json({ error: "대시보드 통계 조회 실패" });
    }
  });

  app.get("/api/admin/dashboard/chart-data", authenticateCS, (_req, res) => {
    try {
      const salesData = db
        .prepare(
          `SELECT date(created_at) as date, SUM(total_amount) as amount
           FROM orders
           WHERE created_at > date('now', '-30 days') AND status != 'refunded'
           GROUP BY date
           ORDER BY date ASC`
        )
        .all();
      res.json(salesData);
    } catch {
      res.status(500).json({ error: "차트 데이터 조회 실패" });
    }
  });

  app.post(
    "/api/admin/fulfillment/tracking-bulk",
    authenticateOperator,
    upload.single("csv"),
    (req: any, res) => {
      if (!req.file) return res.status(400).json({ error: "CSV 파일을 업로드해주세요." });
      try {
        const content = fs.readFileSync(req.file.path, "utf-8");
        const lines = content
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        let updatedCount = 0;
        db.transaction((rows: string[]) => {
          for (const row of rows) {
            const [order_number, tracking_number, shipping_company] = row
              .split(",")
              .map((s) => s.trim());
            if (order_number && tracking_number) {
              const r = db
                .prepare(
                  "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', status_updated_at = CURRENT_TIMESTAMP WHERE order_number = ?"
                )
                .run(tracking_number, shipping_company || "CJ대한통운", order_number);
              updatedCount += r.changes;
            }
          }
        })(lines.slice(1));

        fs.unlinkSync(req.file.path);
        res.json({ success: true, updatedCount });
      } catch {
        res.status(500).json({ error: "운송장 일괄 등록에 실패했습니다." });
      }
    }
  );

  app.get("/api/admin/settlement", authenticateAdmin, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const settlements = db
        .prepare(
          `SELECT payment_method, SUM(total_amount) as total_amount, COUNT(*) as order_count
           FROM orders
           WHERE status = 'completed' AND date(created_at) >= date(?) AND date(created_at) <= date(?)
           GROUP BY payment_method`
        )
        .all(startDate, endDate) as any[];

      const commissionRates: Record<string, number> = {
        card: 0.02,
        naver_pay: 0.03,
        kakao_pay: 0.03,
        vbank: 0.01,
      };

      const report = settlements.map((s) => {
        const rate = commissionRates[s.payment_method] || 0.02;
        const commission = Math.floor(s.total_amount * rate);
        return {
          payment_method: s.payment_method,
          total_amount: s.total_amount,
          commission,
          net_amount: s.total_amount - commission,
          order_count: s.order_count,
        };
      });
      res.json(report);
    } catch {
      res.status(500).json({ error: "정산 내역 조회 실패" });
    }
  });

  app.get("/api/display", (_req, res) => {
    try {
      const items = db.prepare("SELECT * FROM display_settings WHERE is_active = 1").all();
      res.json(items);
    } catch {
      res.status(500).json({ error: "전시 설정 조회 실패" });
    }
  });

  app.get("/api/admin/display", authenticateAdmin, (_req, res) => {
    try {
      const items = db.prepare("SELECT * FROM display_settings").all();
      res.json(items);
    } catch {
      res.status(500).json({ error: "전시 설정 조회 실패" });
    }
  });

  app.post("/api/admin/display", authenticateAdmin, upload.single("image"), (req: any, res) => {
    const { id, type, link_url, is_active } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

    try {
      db.prepare(
        `INSERT INTO display_settings (id, type, image_url, link_url, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           type = excluded.type,
           image_url = excluded.image_url,
           link_url = excluded.link_url,
           is_active = excluded.is_active`
      ).run(
        id,
        type || id,
        image_url || "",
        link_url || "",
        is_active === undefined || is_active === true || is_active === "1" || is_active === 1 ? 1 : 0
      );

      logAdminAction(req, "UPDATE_DISPLAY", "display_settings", null, `Updated display slot: ${id}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "전시 설정 저장에 실패했습니다." });
    }
  });

  app.get("/api/admin/inquiries", authenticateCS, (_req, res) => {
    try {
      const inquiries = db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all();
      res.json(inquiries);
    } catch {
      res.status(500).json({ error: "문의 내역 조회 실패" });
    }
  });

  app.post("/api/inquiries", (req, res) => {
    const { name, email, category, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "모든 항목을 입력해주세요." });
    }
    try {
      db.prepare(
        "INSERT INTO inquiries (category, name, email, subject, message) VALUES (?, ?, ?, ?, ?)"
      ).run(category || "상품 문의", name, email, subject, message);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "문의 접수에 실패했습니다." });
    }
  });

  app.post("/api/admin/inquiries/:id/reply", authenticateCS, async (req: any, res) => {
    const { replyMessage } = req.body;
    const { id } = req.params;
    try {
      const inquiry = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as any;
      if (!inquiry) return res.status(404).json({ error: "문의를 찾을 수 없습니다." });

      db.prepare(
        "UPDATE inquiries SET reply_message = ?, status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(replyMessage, id);

      await sendMail(
        inquiry.email,
        `문의하신 내용에 대한 답변입니다: ${inquiry.subject}`,
        `
        <div style="padding: 24px; background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 12px;">
          <h2 style="font-size: 18px; margin-bottom: 24px;">안녕하세요, ${inquiry.name}님.</h2>
          <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
            <p style="font-size: 12px; color: #999;">문의 내용</p>
            <blockquote style="margin: 0; padding: 16px; background-color: #fff; border-left: 2px solid #e5e5e5; font-size: 14px; color: #666;">${inquiry.message}</blockquote>
          </div>
          <div>
            <p style="font-size: 12px; color: #999;">베뉴아 답변</p>
            <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; white-space: pre-wrap;">${replyMessage}</p>
          </div>
        </div>
        `,
        "SUPPORT"
      );

      logAdminAction(req, "REPLY_INQUIRY", "inquiries", Number(id), `Replied to ${inquiry.email}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "답변 발송에 실패했습니다." });
    }
  });

  app.post("/api/newsletter/subscribe", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "이메일을 입력해주세요." });
    try {
      db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)").run(
        email.trim()
      );
      res.json({ success: true, message: "뉴스레터 구독이 완료되었습니다." });
    } catch {
      res.status(500).json({ error: "구독 처리에 실패했습니다." });
    }
  });

  app.get("/api/admin/newsletter/subscribers", authenticateAdmin, (_req, res) => {
    try {
      const guestSubscribers = db
        .prepare("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC")
        .all();
      const userSubscribers = db
        .prepare("SELECT email, created_at FROM users WHERE newsletter_subscribed = 1")
        .all();
      res.json({ guestSubscribers, userSubscribers });
    } catch {
      res.status(500).json({ error: "구독자 목록 조회 실패" });
    }
  });

  app.delete("/api/admin/newsletter/subscribers/:email", authenticateAdmin, (req, res) => {
    const { email } = req.params;
    try {
      db.prepare("DELETE FROM newsletter_subscribers WHERE email = ?").run(email);
      db.prepare("UPDATE users SET newsletter_subscribed = 0 WHERE email = ?").run(email);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "구독 취소 처리에 실패했습니다." });
    }
  });

  app.post("/api/newsletter/unsubscribe", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "이메일 정보가 필요합니다." });
    try {
      db.prepare("DELETE FROM newsletter_subscribers WHERE email = ?").run(email);
      db.prepare("UPDATE users SET newsletter_subscribed = 0 WHERE email = ?").run(email);
      res.json({ success: true, message: "수신 거부가 처리되었습니다." });
    } catch {
      res.status(500).json({ error: "수신 거부 처리에 실패했습니다." });
    }
  });

  app.post("/api/admin/newsletter/send", authenticateAdmin, async (req, res) => {
    const { subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ error: "제목과 본문을 모두 입력해주세요." });
    }
    try {
      const guestEmails = (
        db.prepare("SELECT email FROM newsletter_subscribers").all() as Array<{ email: string }>
      ).map((s) => s.email);
      const userEmails = (
        db
          .prepare("SELECT email FROM users WHERE newsletter_subscribed = 1")
          .all() as Array<{ email: string }>
      ).map((u) => u.email);
      const allEmails = [...new Set([...guestEmails, ...userEmails])].filter(Boolean);

      const host = req.get("host") || "benua.shop";
      const mainDomainHost = host.startsWith("dash.") ? host.replace("dash.", "") : host;

      for (const email of allEmails) {
        const encodedEmail = Buffer.from(email).toString("base64");
        const unsubLink = `https://${mainDomainHost}/unsubscribe?token=${encodedEmail}`;
        await sendMail(
          email,
          subject,
          `
          <div>
            <div style="margin-bottom: 30px;">${content}</div>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #eee; font-size: 11px; color: #999;">
              <p>뉴스레터 수신을 원치 않으시면 <a href="${unsubLink}" style="color: #666; text-decoration: underline;">수신거부</a>를 클릭해주세요.</p>
            </div>
          </div>
          `,
          "NEWS"
        );
      }

      res.json({ success: true, count: allEmails.length });
    } catch {
      res.status(500).json({ error: "뉴스레터 발송 실패" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();