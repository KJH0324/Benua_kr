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
const isProduction = process.env.NODE_ENV === "production";
if (
  isProduction &&
  (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD || !process.env.TOSS_SECRET_KEY)
) {
  console.error(
    "[BOOT] JWT_SECRET, ADMIN_PASSWORD, TOSS_SECRET_KEY 가 없으면 운영 서버를 시작하지 않습니다."
  );
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || "benua-secret-key-2024";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "benua-admin-123";
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R";

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
  fromType: MailFromType = "SYSTEM",
  allowReply = false,
  layout: "wrap" | "raw" = "wrap"
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
    replyTo: allowReply ? fromMap.SUPPORT : undefined,
    subject: `[Benua] ${subject}`,
    html:
      layout === "raw"
        ? html
        : `
      <div style="font-family: 'Inter', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 8px;">
        <div style="margin-bottom: 40px; text-align: center;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">Benua</h1>
        </div>
        ${html}
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #999; text-align: center;">
          <p>© ${new Date().getFullYear()} Benua. All rights reserved.</p>
          ${allowReply ? "" : "<p>본 메일은 발신 전용입니다.</p>"}
        </div>
      </div>
    `,
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[MAIL][MOCK] To: ${to} | Subject: ${subject}`);
      return true;
    }
    await transporter.sendMail(mailOptions);
    console.log(`[MAIL][SUCCESS] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[MAIL][ERROR] Failed to send to ${to}:`, err);
    return false;
  }
};

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");

const ORDER_STATUS_KO: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipping: "배송중",
  delivered: "배송완료",
  completed: "구매확정",
  refund_requested: "환불요청",
  refunded: "환불완료",
  cancelled: "주문취소",
};

const formatWon = (amount: number) =>
  `${Math.round(Number(amount) || 0).toLocaleString("ko-KR")}원`;

const absoluteAsset = (value: string) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://benua.shop${url.startsWith("/") ? "" : "/"}${url}`;
};

const preorderNoticeHtml = (product: any, note: string) => {
  const name = escapeHtml(product.name || "");
  const link = `https://benua.shop/product/${product.id}`;
  const image = absoluteAsset(product.image_url);
  const price = Math.round(Number(product.price) || 0);
  const rate = Math.min(100, Math.max(0, Number(product.discount_rate) || 0));
  const sale = rate > 0 ? Math.round(price * (1 - rate / 100)) : price;
  const priceHtml =
    price > 0
      ? `<p style="margin:18px 0 0;font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#463221;">${formatWon(sale)}</p>
         ${
           rate > 0
             ? `<p style="margin:6px 0 0;font-size:13px;color:#b3a394;text-decoration:line-through;">${formatWon(price)}</p>`
             : ""
         }`
      : "";
  const imageHtml = image
    ? `<tr><td style="padding:0 28px;">
         <img src="${escapeHtml(image)}" alt="${name}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border-radius:16px;border:0;" />
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#faf2e7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf2e7;padding:36px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf9;border-radius:24px;overflow:hidden;">
        <tr><td style="padding:36px 28px 22px;text-align:center;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.42em;color:#463221;">BENUA</p>
        </td></tr>
        ${imageHtml}
        <tr><td style="padding:28px 36px 0;text-align:center;font-family:'Noto Sans KR',Arial,sans-serif;">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;color:#385c37;">PREORDER</p>
          <h1 style="margin:14px 0 0;font-size:26px;line-height:1.35;font-weight:700;color:#463221;">${name}</h1>
          ${priceHtml}
          <p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#5c4636;white-space:pre-line;">${note}</p>
        </td></tr>
        <tr><td align="center" style="padding:28px 36px 40px;">
          <a href="${link}" style="display:inline-block;background:#385c37;color:#faf2e7;text-decoration:none;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;padding:14px 32px;border-radius:999px;">상품 보러가기</a>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#8d7766;">© ${new Date().getFullYear()} Benua. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;
};

const notifyAdminNewOrder = (orderId: number) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
  if (!order) return;
  const items = db
    .prepare("SELECT name, quantity, price FROM order_items WHERE order_id = ?")
    .all(orderId) as Array<{ name: string; quantity: number; price: number }>;
  const lines =
    items.length > 0
      ? items
          .map(
            (item) =>
              `<tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3ece4;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;color:#463221;">${escapeHtml(item.name)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #f3ece4;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;color:#463221;text-align:right;white-space:nowrap;">${Number(item.quantity) || 0}개 · ${formatWon((item.price || 0) * (item.quantity || 0))}</td>
              </tr>`
          )
          .join("")
      : "";
  const status = order.status === "paid" ? "결제완료" : "입금대기";
  const html = `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#faf2e7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf2e7;padding:36px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf9;border-radius:24px;">
        <tr><td style="padding:36px 32px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;">
          <p style="margin:0;font-size:22px;letter-spacing:0.42em;color:#463221;">BENUA</p>
        </td></tr>
        <tr><td style="padding:18px 32px 0;text-align:center;font-family:'Noto Sans KR',Arial,sans-serif;">
          <h1 style="margin:0;font-size:24px;line-height:1.4;color:#463221;">새 주문이 등록되었습니다</h1>
          <p style="margin:12px 0 0;font-size:14px;color:#5c4636;">${escapeHtml(order.order_number)} · ${status}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines}</table>
        </td></tr>
        <tr><td style="padding:18px 32px 0;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#463221;">
          <p style="margin:0;">${escapeHtml(order.customer_name || "")}</p>
          <p style="margin:0;color:#5c4636;">${escapeHtml(order.customer_phone || "")}</p>
          <p style="margin:0;color:#5c4636;">${escapeHtml(order.customer_email || "")}</p>
          <p style="margin:8px 0 0;color:#5c4636;">${escapeHtml(order.shipping_address || "")}</p>
          <p style="margin:16px 0 0;font-size:18px;font-weight:700;">${formatWon(order.total_amount)}</p>
        </td></tr>
        <tr><td align="center" style="padding:28px 32px 40px;">
          <a href="https://dash.benua.shop/orders" style="display:inline-block;background:#385c37;color:#faf2e7;text-decoration:none;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;font-weight:700;padding:14px 32px;border-radius:999px;">주문 확인하기</a>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#8d7766;">© ${new Date().getFullYear()} Benua. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;
  const recipients = [
    ...new Set(
      (
        db.prepare(
          "SELECT notify_email FROM admin_keys WHERE notify_email IS NOT NULL AND TRIM(notify_email) != ''"
        ).all() as Array<{ notify_email: string }>
      )
        .map((row) => String(row.notify_email || "").trim().toLowerCase())
        .filter((email) => email.includes("@"))
    ),
  ];
  for (const to of recipients) {
    sendMail(to, "새 주문이 등록되었습니다", html, "ADMIN", false, "raw");
  }
};

const buildOrderEmailHtml = (order: any, items: any[]) => {
  const itemRows =
    items.length > 0
      ? items
          .map(
            (item) => `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f3f3;">${escapeHtml(item.name)}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f3f3; text-align: right;">${Number(item.quantity) || 0}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f3f3; text-align: right;">${formatWon((item.price || 0) * (item.quantity || 0))}</td>
        </tr>`
          )
          .join("")
      : `<tr><td style="padding: 8px 0; color: #999;">주문 상품이 없습니다.</td></tr>`;
  const tracking = order.tracking_number
    ? `<p style="margin: 4px 0; font-size: 13px; color: #333;">송장: ${escapeHtml(order.shipping_company || "")} ${escapeHtml(order.tracking_number)}</p>`
    : "";
  return `
    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
      <p style="font-size: 12px; color: #999; margin: 0 0 8px;">주문 내용</p>
      <p style="margin: 4px 0; font-size: 13px; color: #333;">주문번호: ${escapeHtml(order.order_number)}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #333;">상태: ${escapeHtml(ORDER_STATUS_KO[order.status] || order.status || "")}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #333;">주문자: ${escapeHtml(order.customer_name || "")}${order.customer_phone ? ` / ${escapeHtml(order.customer_phone)}` : ""}</p>
      <p style="margin: 4px 0; font-size: 13px; color: #333;">배송지: ${escapeHtml(order.shipping_address || "-")}</p>
      ${tracking}
      <table style="width: 100%; margin-top: 12px; font-size: 13px; color: #333; border-collapse: collapse;">
        <tbody>${itemRows}</tbody>
      </table>
      <p style="margin: 12px 0 0; font-size: 13px; font-weight: bold; color: #1a1a1a;">결제금액 ${formatWon(order.total_amount)}</p>
    </div>
  `;
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

const removeUpload = (url?: string | null) => {
  const rel = String(url || "");
  if (!rel.startsWith("/uploads/")) return;
  const file = path.resolve(process.cwd(), rel.replace(/^\//, ""));
  if (!file.startsWith(uploadsDir)) return;
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".csv" || file.mimetype === "text/csv" || file.mimetype === "text/plain") {
      cb(null, true);
      return;
    }
    const mimeOk = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    if (!mimeOk || !IMAGE_EXT.has(ext)) {
      cb(new Error("이미지 파일만 올릴 수 있습니다."));
      return;
    }
    cb(null, true);
  },
});

const toWebp = async (file?: { path?: string; filename?: string; mimetype?: string } | null) => {
  if (!file?.path) return;
  await assertImageFile(file);
  if (!String(file.mimetype || "").startsWith("image/") || file.mimetype === "image/gif") return;
  const dest = file.path.replace(/\.[^.]+$/, "") + ".webp";
  const tmp = `${dest}.part`;
  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    await sharp(file.path)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(tmp);
    if (file.path !== dest && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    fs.renameSync(tmp, dest);
    file.filename = path.basename(dest);
    file.path = dest;
    file.mimetype = "image/webp";
  } catch (err) {
    console.error("[IMAGE]", err);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
};

const toWebpMany = async (files?: Array<{ path?: string; filename?: string; mimetype?: string }>) => {
  for (const file of files || []) await toWebp(file);
};

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
    sale_mode TEXT DEFAULT 'open',
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

  CREATE TABLE IF NOT EXISTS product_preorders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    notified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, email),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
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

  CREATE TABLE IF NOT EXISTS inbound_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resend_id TEXT UNIQUE,
    from_address TEXT,
    to_addresses TEXT,
    subject TEXT,
    text_body TEXT,
    html_body TEXT,
    attachments TEXT,
    received_at TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const ensureColumn = (table: string, column: string, definition: string) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const ensureWelcomeCoupon = () => {
  const existing = db.prepare("SELECT id FROM coupons WHERE code = ?").get("WELCOME") as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const info = db
    .prepare(
      "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount) VALUES (?, ?, 'SHIPPING', 0, 0, 0)"
    )
    .run("웰컴 무료배송 쿠폰", "WELCOME");
  return Number(info.lastInsertRowid);
};

const runMigrations = () => {
  ensureColumn("users", "points", "INTEGER DEFAULT 0");
  ensureColumn("users", "tier", "TEXT DEFAULT 'BEIGE'");
  ensureColumn("users", "tier_updated_at", "DATETIME DEFAULT '2024-01-01 00:00:00'");
  ensureColumn("users", "tier_manual", "INTEGER DEFAULT 0");
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
  ensureColumn("products", "sale_mode", "TEXT DEFAULT 'open'");

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
  ensureColumn("orders", "toss_secret", "TEXT");
  ensureColumn("orders", "tracking_checked_at", "TEXT");
  ensureColumn("orders", "tracking_cache", "TEXT");
  ensureColumn("orders", "resume_status", "TEXT");
  ensureColumn("order_items", "item_status", "TEXT DEFAULT 'normal'");
  ensureColumn("order_items", "refund_quantity", "INTEGER DEFAULT 0");
  ensureColumn("order_items", "option_id", "INTEGER");
  ensureColumn("orders", "approve_no", "TEXT");
  ensureColumn("orders", "refunded_total", "INTEGER DEFAULT 0");
  ensureColumn("orders", "points_clawed", "INTEGER DEFAULT 0");
  ensureColumn("orders", "receipt_url", "TEXT");
  ensureColumn("orders", "cash_receipt_url", "TEXT");
  ensureColumn("orders", "shipping_memo", "TEXT");
  ensureColumn("orders", "refund_bank", "TEXT");
  ensureColumn("orders", "refund_account", "TEXT");
  ensureColumn("orders", "refund_holder", "TEXT");
  ensureColumn("orders", "return_carrier", "TEXT");
  ensureColumn("orders", "return_tracking_number", "TEXT");
  ensureColumn("orders", "shipped_at", "DATETIME");
  ensureColumn("orders", "is_gift", "INTEGER DEFAULT 0");
  ensureColumn("orders", "gift_token", "TEXT");
  ensureColumn("orders", "gift_message", "TEXT");
  ensureColumn("orders", "review_reminded", "INTEGER DEFAULT 0");
  ensureColumn("products", "sort_order", "INTEGER DEFAULT 0");
  ensureColumn("products", "pinned", "INTEGER DEFAULT 0");
  ensureColumn("products", "tags", "TEXT");
  ensureColumn("products", "view_count", "INTEGER DEFAULT 0");
  ensureColumn("products", "cart_count", "INTEGER DEFAULT 0");
  ensureColumn("reviews", "admin_reply", "TEXT");
  ensureColumn("reviews", "admin_replied_at", "DATETIME");
  ensureColumn("coupons", "valid_days", "INTEGER");
  ensureColumn("inbound_emails", "replied_at", "TEXT");
  ensureColumn("inbound_emails", "reply_body", "TEXT");
  ensureColumn("point_history", "expired", "INTEGER DEFAULT 0");
  ensureColumn("point_history", "warn_sent", "INTEGER DEFAULT 0");
  ensureColumn("inquiries", "image_url", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS product_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      extra_price INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS product_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      author TEXT,
      question TEXT NOT NULL,
      answer TEXT,
      is_secret INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      label TEXT,
      name TEXT,
      phone TEXT,
      zipcode TEXT,
      address TEXT,
      detail_address TEXT,
      is_default INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS carts (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      option_id INTEGER,
      PRIMARY KEY (user_id, product_id, option_id)
    );
    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      option_id INTEGER,
      delta INTEGER,
      before_qty INTEGER,
      after_qty INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS newsletter_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      body TEXT,
      audience TEXT,
      sent_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reply_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const settingDefaults: Record<string, string> = {
    shipping_fee: "3000",
    free_min: "50000",
    return_fee: "5000",
    jeju_fee: "3000",
    island_fee: "5000",
  };
  const putSetting = db.prepare("INSERT OR IGNORE INTO shop_settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(settingDefaults)) putSetting.run(key, value);

  ensureColumn("reviews", "is_best", "INTEGER DEFAULT 0");
  ensureColumn("reviews", "is_hidden", "INTEGER DEFAULT 0");
  ensureColumn("inquiries", "category", "TEXT DEFAULT '상품 문의'");
  ensureColumn("inquiries", "status", "TEXT DEFAULT 'pending'");
  ensureColumn("inquiries", "reply_message", "TEXT");
  ensureColumn("inquiries", "replied_at", "DATETIME");
  ensureColumn("inquiries", "order_number", "TEXT");
  ensureColumn("inquiries", "user_id", "INTEGER");
  ensureColumn("user_coupons", "notified", "INTEGER DEFAULT 0");
  ensureColumn("admin_keys", "role", "TEXT DEFAULT 'MASTER'");
  ensureColumn("admin_keys", "notify_email", "TEXT");
  ensureColumn("admin_keys", "key_label", "TEXT");
  ensureColumn("admin_logs", "admin_identifier", "TEXT");
  ensureColumn("admin_logs", "ip_address", "TEXT");
  ensureColumn("admin_logs", "user_agent", "TEXT");
  ensureColumn("admin_logs", "changes", "TEXT");
  ensureColumn("admin_logs", "timestamp_ms", "INTEGER");

  db.prepare("UPDATE users SET tier = UPPER(IFNULL(tier, 'BEIGE'))").run();

  const welcomeId = ensureWelcomeCoupon();
  const oldWelcome = db
    .prepare(
      "SELECT id FROM coupons WHERE id != ? AND (code LIKE 'WELCOME-%' OR name = '웰컴 무료배송 쿠폰')"
    )
    .all(welcomeId) as Array<{ id: number }>;
  if (oldWelcome.length > 0) {
    const ids = oldWelcome.map((row) => row.id);
    const marks = ids.map(() => "?").join(",");
    db.prepare(`UPDATE user_coupons SET coupon_id = ? WHERE coupon_id IN (${marks})`).run(
      welcomeId,
      ...ids
    );
    db.prepare(`DELETE FROM coupons WHERE id IN (${marks})`).run(...ids);
  }
  db.prepare(
    `DELETE FROM user_coupons
     WHERE coupon_id = ?
       AND is_used = 0
       AND id NOT IN (SELECT used_coupon_id FROM orders WHERE used_coupon_id IS NOT NULL)
       AND id NOT IN (
         SELECT MAX(id) FROM user_coupons WHERE coupon_id = ? AND is_used = 0 GROUP BY user_id
       )`
  ).run(welcomeId, welcomeId);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, status_updated_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, is_hidden);
    CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id, is_used);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id);
    CREATE INDEX IF NOT EXISTS idx_products_sort ON products(pinned, sort_order);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id, id);
  `);

  db.prepare(
    `DELETE FROM inquiries
     WHERE (LOWER(email) LIKE '%@gmail.com' OR LOWER(email) LIKE '%@googlemail.com')
       AND (LENGTH(SUBSTR(email, 1, INSTR(email, '@') - 1)) - LENGTH(REPLACE(SUBSTR(email, 1, INSTR(email, '@') - 1), '.', ''))) >= 3`
  ).run();
  db.prepare(
    `DELETE FROM newsletter_subscribers
     WHERE (LOWER(email) LIKE '%@gmail.com' OR LOWER(email) LIKE '%@googlemail.com')
       AND (LENGTH(SUBSTR(email, 1, INSTR(email, '@') - 1)) - LENGTH(REPLACE(SUBSTR(email, 1, INSTR(email, '@') - 1), '.', ''))) >= 3`
  ).run();
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
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
  if (!stored || !password) return false;
  if (stored.startsWith("scrypt$")) {
    const [, salt, hash] = stored.split("$");
    if (!salt || !hash) return false;
    const next = crypto.scryptSync(password, salt, 64).toString("hex");
    if (next.length !== hash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(next), Buffer.from(hash));
  }
  const legacy = crypto.createHash("sha512").update(password).digest("hex");
  if (legacy.length !== stored.length) return false;
  return crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(stored));
};

const dataKey = () =>
  crypto.createHash("sha256").update(process.env.DATA_ENCRYPTION_KEY || JWT_SECRET).digest();

const hashToken = (token: string) =>
  `sha256$${crypto.createHash("sha256").update(String(token)).digest("hex")}`;

const tokenMatches = (stored: string, given: string) => {
  if (!stored || !given) return false;
  const next = hashToken(given);
  if (stored.startsWith("sha256$")) {
    if (stored.length !== next.length) return false;
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(next));
  }
  return false;
};

const encryptText = (plain: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc$${iv.toString("hex")}$${tag.toString("hex")}$${enc.toString("hex")}`;
};

const decryptText = (stored: string) => {
  if (!stored) return "";
  if (!stored.startsWith("enc$")) return stored;
  const [, ivHex, tagHex, dataHex] = stored.split("$");
  const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
};

const findAdminKey = (adminKey: string) => {
  const raw = String(adminKey || "");
  if (!raw) return null;
  const rows = db.prepare("SELECT * FROM admin_keys").all() as any[];
  return rows.find((row) => verifyPassword(raw, row.key_value)) || null;
};

const codeMatches = (email: string, code: string) => {
  const record = db
    .prepare(
      "SELECT * FROM email_verification_codes WHERE email = ? AND expires_at > CURRENT_TIMESTAMP"
    )
    .get(String(email || "").trim()) as any;
  if (!record) return false;
  return verifyPassword(String(code || "").trim(), record.code);
};

const clearVbankAccount = (orderId: number | string) => {
  db.prepare("UPDATE orders SET vbank_account = NULL WHERE id = ?").run(orderId);
};

const logStock = (productId: number | null, optionId: number | null, delta: number, reason: string) => {
  const before = productId
    ? Number((db.prepare("SELECT stock FROM products WHERE id = ?").get(productId) as any)?.stock) || 0
    : optionId
      ? Number((db.prepare("SELECT stock FROM product_options WHERE id = ?").get(optionId) as any)?.stock) || 0
      : 0;
  db.prepare(
    "INSERT INTO stock_logs (product_id, option_id, delta, before_qty, after_qty, reason) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(productId, optionId, delta, before, before + delta, reason);
};

const invoiceError = (company: string, invoice: string) => {
  const raw = String(invoice || "").trim();
  if (!raw) return "운송장 번호를 입력해주세요.";
  if (/e\+|E\+/.test(raw)) return "엑셀 숫자 형식입니다. 송장을 텍스트로 다시 입력해주세요.";
  const digits = raw.replace(/\D/g, "");
  const span: Record<string, [number, number]> = {
    CJ대한통운: [10, 12],
    우체국택배: [13, 13],
    한진택배: [10, 12],
    로젠택배: [10, 11],
    롯데택배: [10, 12],
  };
  const rule = span[company];
  if (rule && (digits.length < rule[0] || digits.length > rule[1])) {
    return `${company} 운송장 자릿수가 맞지 않습니다.`;
  }
  return "";
};

const assertImageFile = async (file?: { path?: string; mimetype?: string } | null) => {
  if (!file?.path) return;
  const buf = fs.readFileSync(file.path);
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const gif = buf.slice(0, 3).toString() === "GIF";
  const webp = buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !gif && !webp) {
    fs.unlinkSync(file.path);
    throw new Error("이미지 파일이 아닙니다.");
  }
  if (file.mimetype === "image/gif") return;
  const sharpMod = await import("sharp");
  const meta = await sharpMod.default(file.path).metadata();
  if (!meta.width || !meta.height) {
    fs.unlinkSync(file.path);
    throw new Error("이미지 파일이 아닙니다.");
  }
};

const presentOrder = (order: any) => {
  if (!order) return order;
  const copy = { ...order };
  delete copy.toss_secret;
  if (copy.status === "pending" && copy.vbank_account) {
    try {
      copy.vbank_account = decryptText(copy.vbank_account);
    } catch {
      copy.vbank_account = null;
    }
  } else {
    if (copy.vbank_account) clearVbankAccount(copy.id);
    copy.vbank_account = null;
  }
  return copy;
};

const sealStoredSecrets = () => {
  const keys = db.prepare("SELECT id, key_value, key_label, totp_secret FROM admin_keys").all() as any[];
  for (const key of keys) {
    if (key.key_value && !String(key.key_value).startsWith("scrypt$")) {
      if (!key.key_label) {
        db.prepare("UPDATE admin_keys SET key_label = ? WHERE id = ?").run(encryptText(String(key.key_value)), key.id);
      }
      db.prepare("UPDATE admin_keys SET key_value = ? WHERE id = ?").run(hashPassword(key.key_value), key.id);
    }
    if (key.totp_secret && !String(key.totp_secret).startsWith("enc$")) {
      db.prepare("UPDATE admin_keys SET totp_secret = ? WHERE id = ?").run(
        encryptText(key.totp_secret),
        key.id
      );
    }
  }

  if (ADMIN_PASSWORD) {
    const unlabeled = db
      .prepare("SELECT id, key_value FROM admin_keys WHERE key_label IS NULL OR TRIM(key_label) = ''")
      .all() as any[];
    for (const key of unlabeled) {
      if (verifyPassword(ADMIN_PASSWORD, key.key_value)) {
        db.prepare("UPDATE admin_keys SET key_label = ? WHERE id = ?").run(encryptText(ADMIN_PASSWORD), key.id);
      }
    }
  }

  const codes = db.prepare("SELECT email, code FROM email_verification_codes").all() as any[];
  for (const row of codes) {
    if (row.code && !String(row.code).startsWith("scrypt$")) {
      db.prepare("UPDATE email_verification_codes SET code = ? WHERE email = ?").run(
        hashPassword(String(row.code)),
        row.email
      );
    }
  }

  const users = db
    .prepare(
      "SELECT id, reset_token, verification_token FROM users WHERE reset_token IS NOT NULL OR verification_token IS NOT NULL"
    )
    .all() as any[];
  for (const user of users) {
    if (user.reset_token && !String(user.reset_token).startsWith("sha256$")) {
      db.prepare("UPDATE users SET reset_token = ? WHERE id = ?").run(hashToken(user.reset_token), user.id);
    }
    if (user.verification_token && !String(user.verification_token).startsWith("sha256$")) {
      db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(
        hashToken(user.verification_token),
        user.id
      );
    }
  }

  const orders = db
    .prepare(
      "SELECT id, status, toss_secret, vbank_account FROM orders WHERE toss_secret IS NOT NULL OR vbank_account IS NOT NULL"
    )
    .all() as any[];
  for (const order of orders) {
    if (order.toss_secret && !String(order.toss_secret).startsWith("sha256$")) {
      db.prepare("UPDATE orders SET toss_secret = ? WHERE id = ?").run(hashToken(order.toss_secret), order.id);
    }
    if (!order.vbank_account) continue;
    if (order.status !== "pending") {
      clearVbankAccount(order.id);
    } else if (!String(order.vbank_account).startsWith("enc$")) {
      db.prepare("UPDATE orders SET vbank_account = ? WHERE id = ?").run(
        encryptText(String(order.vbank_account)),
        order.id
      );
    }
  }
};

sealStoredSecrets();

const labelAdminLogKeys = () => {
  const keys = db.prepare("SELECT id, key_label FROM admin_keys WHERE key_label IS NOT NULL").all() as any[];
  for (const key of keys) {
    let label = "";
    try {
      label = decryptText(String(key.key_label || ""));
    } catch {
      label = "";
    }
    if (!label) continue;
    db.prepare("UPDATE admin_logs SET admin_identifier = ? WHERE admin_identifier = ?").run(label, `key#${key.id}`);
  }
};
labelAdminLogKeys();

const rateBuckets = new Map<string, number[]>();
const allowRate = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  return true;
};

const clientIp = (req: express.Request) =>
  String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();

const isSpamBotEmail = (rawEmail: unknown): boolean => {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || email.length > 160) return true;
  const parts = email.split("@");
  if (parts.length !== 2) return true;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return true;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const dotCount = (local.match(/\./g) || []).length;
    if (dotCount >= 3) return true;
  }
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return true;
  return false;
};

const normalizeEmailAddress = (rawEmail: unknown): string => {
  const email = String(rawEmail || "").trim().toLowerCase();
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const cleanLocal = local.replace(/\./g, "").split("+")[0];
    return `${cleanLocal}@gmail.com`;
  }
  return `${local}@${domain}`;
};

const isSpamInquiryContent = (subject: unknown, message: unknown): boolean => {
  const sub = String(subject || "").trim();
  const msg = String(message || "").trim();
  const combined = `${sub} ${msg}`;
  if (msg.length < 2) return true;
  if (/^[a-zA-Z0-9]{25,}$/.test(sub) || /^[a-zA-Z0-9]{40,}$/.test(msg)) return true;
  const hasKorean = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(combined);
  const hasUrl = /https?:\/\/|www\./i.test(combined);
  if (!hasKorean && hasUrl) return true;
  return false;
};

const gmailCanonicalTaken = (rawEmail: unknown): boolean => {
  const canonical = normalizeEmailAddress(rawEmail);
  if (!canonical.endsWith("@gmail.com")) return false;
  const rows = db
    .prepare(
      "SELECT email FROM users WHERE LOWER(email) LIKE '%@gmail.com' OR LOWER(email) LIKE '%@googlemail.com'"
    )
    .all() as Array<{ email: string }>;
  return rows.some((row) => normalizeEmailAddress(row.email) === canonical);
};

const honeypotFilled = (website: unknown) => String(website || "").trim() !== "";

const warnedAdminIps = new Set<string>();
const warnAdminLogin = (ip: string) => {
  if (warnedAdminIps.has(ip)) return;
  warnedAdminIps.add(ip);
  setTimeout(() => warnedAdminIps.delete(ip), 15 * 60 * 1000).unref?.();
  const emails = db
    .prepare("SELECT notify_email FROM admin_keys WHERE notify_email IS NOT NULL AND notify_email != ''")
    .all() as Array<{ notify_email: string }>;
  for (const row of emails) {
    sendMail(
      row.notify_email,
      "관리자 로그인 시도가 있었습니다",
      `<p>${escapeHtml(ip)} 에서 관리자 로그인이 반복해서 실패했습니다.</p><p>${new Date().toISOString()}</p>`,
      "SYSTEM"
    ).catch(() => {});
  }
};

const OAUTH_ORIGINS = [
  "https://benua.shop",
  "https://www.benua.shop",
  "https://dash.benua.shop",
  "http://localhost:3000",
  "http://localhost:5173",
];

const rememberOauthOrigin = (req: express.Request, res: express.Response) => {
  const origin = String(req.headers.origin || "");
  let next = isProduction ? "https://benua.shop" : "http://localhost:3000";
  if (OAUTH_ORIGINS.includes(origin)) next = origin;
  res.cookie("oauth_origin", next, { ...getCookieOptions(), maxAge: 10 * 60 * 1000, httpOnly: true });
};

const oauthMessageOrigin = (req: express.Request) => {
  const cookie = req.cookies?.oauth_origin;
  if (cookie && OAUTH_ORIGINS.includes(cookie)) return cookie;
  return isProduction ? "https://benua.shop" : "http://localhost:3000";
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
  domain: isProduction ? ".benua.shop" : undefined,
});

const setAuthCookie = (res: express.Response, name: string, token: string, days = 1) => {
  res.cookie(name, token, {
    ...getCookieOptions(),
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res: express.Response, name: string) => {
  res.clearCookie(name, getCookieOptions());
};

const rememberOauthPending = (
  res: express.Response,
  provider: string,
  socialId: string,
  email: string
) => {
  if (!socialId || !email) return;
  const token = jwt.sign({ provider, socialId, email }, JWT_SECRET, { expiresIn: "30m" });
  res.cookie("oauth_pending", token, { ...getCookieOptions(), maxAge: 30 * 60 * 1000 });
};

const readOauthPending = (req: express.Request) => {
  try {
    return jwt.verify(String(req.cookies?.oauth_pending || ""), JWT_SECRET) as {
      provider?: string;
      socialId?: string;
      email?: string;
    };
  } catch {
    return null;
  }
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

const readOptionalUser = (req: express.Request): { id?: number } | null => {
  const token = extractToken(req, "user_token");
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { id?: number };
  } catch {
    return null;
  }
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
  const user = db.prepare("SELECT id, tier, tier_manual FROM users WHERE id = ?").get(userId) as any;
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
  if (Number(user.tier_manual) === 1) {
    return { spent, tier: oldTier };
  }
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
    const deductOption = db.prepare("UPDATE product_options SET stock = MAX(0, stock - ?) WHERE id = ?");
    for (const item of items) {
      if (item.product_id) {
        logStock(item.product_id, null, -Number(item.quantity), `주문(${order.order_number}) 결제`);
        deductStock.run(item.quantity, item.product_id);
      }
      if (item.option_id) {
        logStock(null, item.option_id, -Number(item.quantity), `주문(${order.order_number}) 옵션`);
        deductOption.run(item.quantity, item.option_id);
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
      nextStatus === "pending" && vbankInfo?.account ? encryptText(vbankInfo.account) : null,
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
    "UPDATE orders SET status = 'completed', vbank_account = NULL, status_updated_at = CURRENT_TIMESTAMP, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?"
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

const orderPhase = (order: any) => {
  const status =
    order.status === "refund_requested" && order.resume_status ? order.resume_status : order.status;
  return ["pending", "paid", "preparing"].includes(status) ? "before" : "after";
};

const buyerTier = (order: any) => {
  if (!order?.user_id) return "";
  const user = db.prepare("SELECT tier FROM users WHERE id = ?").get(order.user_id) as any;
  return String(user?.tier || "").toUpperCase();
};

const quoteCustomerRefund = (order: any, items: any[], selected: any[], waive = false) => {
  const goods = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const refundGoods = selected.reduce((sum, item) => {
    const qty = Math.min(
      Number(item.quantity) || 0,
      Number(item.refund_quantity) > 0 ? Number(item.refund_quantity) : Number(item.quantity) || 0
    );
    return sum + Number(item.price) * qty;
  }, 0);
  const couponDiscount = Math.max(
    0,
    goods + Number(order.shipping_fee || 0) - Number(order.used_points || 0) - Number(order.total_amount || 0)
  );
  const ratio = goods > 0 ? refundGoods / goods : 0;
  const net = Math.max(0, Math.round(refundGoods - couponDiscount * ratio - Number(order.used_points || 0) * ratio));
  const openItems = items.filter((item) => item.item_status !== "refunded");
  const allRemaining =
    openItems.length > 0 &&
    openItems.every((item) =>
      selected.some(
        (pick) =>
          Number(pick.id) === Number(item.id) &&
          (Number(pick.refund_quantity) > 0 ? Number(pick.refund_quantity) : Number(pick.quantity)) >=
            Number(item.quantity)
      )
    );
  const already = Number(order.refunded_total) || 0;
  const cap = Math.max(0, Number(order.total_amount) - already);
  const tier = buyerTier(order);
  const returnFee = tier === "BLACK" || tier === "THE_BLACK" ? 0 : shopSetting("return_fee", 5000);
  const phase = orderPhase(order);
  let amount = net;
  if (waive) {
    amount = allRemaining ? cap : Math.min(cap, net + Number(order.shipping_fee || 0));
  } else if (phase === "before") {
    amount = allRemaining ? cap : net;
  } else if (allRemaining) {
    amount = Math.max(0, Number(order.total_amount) - Number(order.shipping_fee || 0) - returnFee - already);
  } else {
    amount = Math.max(0, net - returnFee);
  }
  return {
    amount: Math.min(cap, Math.max(0, Math.round(amount))),
    allRemaining,
    phase,
    refundGoods,
    goods,
  };
};

const refundApprovedHtml = (order: any, names: string[], pickup: boolean) => {
  const list = names.map((name) => `<li style="margin:0 0 6px;">${escapeHtml(name)}</li>`).join("");
  const heading = pickup ? "반품 요청이 승인되었습니다" : "환불이 승인되었습니다";
  const refundNote =
    order.payment_method === "vbank"
      ? `<p style="margin:0;">가상계좌 환불은 영업일 기준 2일 뒤 토스페이먼츠 이름으로 입금됩니다.</p>`
      : `<p style="margin:0;">결제 당일 전체 취소는 바로 반영됩니다.</p><p style="margin:8px 0 0;">부분 취소, 결제일 이후 취소는 영업일 기준 3~4일 걸립니다.</p>`;
  return `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;padding:0;background:#faf2e7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf2e7;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf9;border-radius:24px;">
<tr><td style="padding:36px 28px 8px;text-align:center;font-family:Georgia,serif;font-size:22px;letter-spacing:0.42em;color:#463221;">BENUA</td></tr>
<tr><td style="padding:12px 36px 0;text-align:center;font-family:'Noto Sans KR',Arial,sans-serif;">
<p style="margin:0;font-size:12px;letter-spacing:0.18em;color:#385c37;">REFUND</p>
<h1 style="margin:14px 0 0;font-size:24px;line-height:1.4;color:#463221;">${heading}</h1>
<p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#5c4636;">${escapeHtml(order.customer_name || "")}님, 주문 ${escapeHtml(order.order_number)}의 환불을 승인했습니다.</p>
</td></tr>
${list ? `<tr><td style="padding:22px 36px 0;font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;color:#463221;"><ul style="margin:0;padding-left:18px;">${list}</ul></td></tr>` : ""}
<tr><td style="padding:22px 36px 36px;font-family:'Noto Sans KR',Arial,sans-serif;">
<div style="background:#faf2e7;border-radius:16px;padding:18px 20px;color:#463221;font-size:14px;line-height:1.7;">
${pickup ? `<p style="margin:0 0 12px;">계약된 택배사에서 회수합니다.</p>` : ""}
${refundNote}
<p style="margin:12px 0 0;">문의: support@benua.shop</p>
</div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
};

const sendRefundApproved = (order: any, names: string[], pickup = false) => {
  if (!order?.customer_email) return;
  sendMail(
    order.customer_email,
    pickup ? "반품 요청이 승인되었습니다" : "환불이 승인되었습니다",
    refundApprovedHtml(order, names, pickup),
    "SUPPORT",
    true,
    "raw"
  ).catch(() => {});
};

const refundOrderTx = db.transaction(
  (orderId: number | string, refundAmount?: number, reason?: string, onlyIds?: number[]) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status === "refunded") return order;

    let finalRefundAmount = refundAmount !== undefined ? refundAmount : order.total_amount;
    const finalReason = reason !== undefined ? reason : order.refund_reason;
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as any[];
    const requested = items.filter((item) => item.item_status === "refund_requested");
    const only = Array.isArray(onlyIds) ? onlyIds.map((id) => Number(id)) : [];
    const scope = only.length
      ? items.filter((item) => only.includes(Number(item.id)) && item.item_status !== "refunded")
      : requested.length
        ? requested
        : items.filter((item) => item.item_status !== "refunded");
    const restoreItem = (item: any, qty: number) => {
      if (!qty || item.item_status === "refunded") return;
      if (item.product_id) {
        logStock(item.product_id, null, qty, `주문(${order.order_number}) 환불 복원`);
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(qty, item.product_id);
      }
      if (item.option_id) {
        logStock(null, item.option_id, qty, `주문(${order.order_number}) 옵션 복원`);
        db.prepare("UPDATE product_options SET stock = stock + ? WHERE id = ?").run(qty, item.option_id);
      }
    };

    let goods = 0;
    let refundGoods = 0;
    for (const item of items) goods += Number(item.price) * Number(item.quantity);
    for (const item of scope) {
      const qty = Math.min(
        Number(item.quantity) || 0,
        Number(item.refund_quantity) > 0 ? Number(item.refund_quantity) : Number(item.quantity) || 0
      );
      refundGoods += Number(item.price) * qty;
      restoreItem(item, qty);
      db.prepare("UPDATE order_items SET item_status = 'refunded', refund_quantity = ? WHERE id = ?").run(qty, item.id);
      item.item_status = "refunded";
    }
    const allRefunded = items.length > 0 && items.every((item) => item.item_status === "refunded");
    const stillRequested = items.some((item) => item.item_status === "refund_requested");

    if (order.user_id && Number(order.earned_points) > 0 && goods > 0 && refundGoods > 0) {
      const alreadyClawed = Number(order.points_clawed) || 0;
      const slice = Math.round(Number(order.earned_points) * (refundGoods / goods));
      const clawTarget = Math.max(0, Math.min(Number(order.earned_points) - alreadyClawed, slice));
      const holder = db.prepare("SELECT points FROM users WHERE id = ?").get(order.user_id) as any;
      const have = Number(holder?.points) || 0;
      const claw = Math.min(have, clawTarget);
      const shortfall = clawTarget - claw;
      if (claw > 0) {
        db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(claw, order.user_id);
        db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'USED')").run(
          order.user_id,
          -claw,
          `주문(${order.order_number}) 환불 적립금 회수`
        );
        db.prepare("UPDATE orders SET points_clawed = COALESCE(points_clawed, 0) + ? WHERE id = ?").run(claw, orderId);
      }
      if (shortfall > 0) finalRefundAmount = Math.max(0, Number(finalRefundAmount) - shortfall);
    }

    if (allRefunded && order.user_id) {
      if (order.used_points > 0) {
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(order.used_points, order.user_id);
        db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'EARNED')").run(
          order.user_id,
          order.used_points,
          `주문(${order.order_number}) 환불 포인트 반환`
        );
      }
      if (order.used_coupon_id) {
        db.prepare("UPDATE user_coupons SET is_used = 0, used_at = NULL WHERE id = ? AND user_id = ?").run(
          order.used_coupon_id,
          order.user_id
        );
      }
    }

    const nextStatus = allRefunded
      ? "refunded"
      : stillRequested
        ? "refund_requested"
        : order.resume_status && !["refund_requested", "refunded"].includes(order.resume_status)
          ? order.resume_status
          : order.status === "refund_requested"
            ? "paid"
            : order.status;
    db.prepare(
      `UPDATE orders
       SET status = ?, refund_amount = ?, refund_reason = ?,
           refunded_total = COALESCE(refunded_total, 0) + ?,
           vbank_account = CASE WHEN ? = 'refunded' THEN NULL ELSE vbank_account END,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(nextStatus, finalRefundAmount, finalReason, Math.max(0, Number(finalRefundAmount) || 0), nextStatus, orderId);
    if (order.user_id) updateUserTierStatus(order.user_id);
    return { ...order, status: nextStatus, refund_amount: finalRefundAmount };
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
  const depositedVbank = order.payment_method === "vbank" && order.status !== "pending";
  if (depositedVbank) {
    const accountNumber = decryptText(String(order.refund_account || ""));
    if (!order.refund_bank || !accountNumber || !order.refund_holder) {
      throw new Error("가상계좌 환불 계좌가 필요합니다.");
    }
    bodyPayload.refundReceiveAccount = {
      bank: String(order.refund_bank),
      accountNumber,
      holderName: String(order.refund_holder),
    };
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
  if (tossData?.method === "계좌이체" || tossData?.method === "TRANSFER") return "transfer";
  if (tossData?.method === "간편결제") return fallback !== "card" ? fallback : "card";
  return fallback === "transfer" ? "transfer" : "card";
};

const runAutoCompletion = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deliveredOrders = db
      .prepare("SELECT id FROM orders WHERE status = 'delivered' AND status_updated_at < ?")
      .all(sevenDaysAgo.toISOString()) as Array<{ id: number }>;

    for (const order of deliveredOrders) {
      completeOrderTx(order.id);
    }

    const stalePending = db
      .prepare(
        `SELECT * FROM orders
         WHERE status = 'pending' AND (payment_key IS NULL OR payment_key = '')
           AND created_at < datetime('now', '-2 hours')`
      )
      .all() as any[];
    for (const order of stalePending) {
      let recovered = false;
      try {
        const basicAuth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
        const look = await fetch(
          `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(order.order_number)}`,
          { headers: { Authorization: `Basic ${basicAuth}` } }
        );
        if (look.ok) {
          const tossData = await look.json();
          if (tossData.status === "DONE" || tossData.status === "WAITING_FOR_DEPOSIT") {
            const method = normalizeTossMethod(tossData, order.payment_method);
            const waiting = tossData.status === "WAITING_FOR_DEPOSIT" || method === "vbank";
            const receipt = tossData.receipt?.url || tossData.cashReceipt?.receiptUrl || null;
            if (receipt) db.prepare("UPDATE orders SET receipt_url = ? WHERE id = ?").run(receipt, order.id);
            if (tossData.cashReceipt?.receiptUrl) {
              db.prepare("UPDATE orders SET cash_receipt_url = ? WHERE id = ?").run(tossData.cashReceipt.receiptUrl, order.id);
            }
            finalizeOrderPaymentTx.immediate(
              order.id,
              tossData.paymentKey || null,
              method,
              waiting ? "pending" : "paid",
              tossData.virtualAccount
                ? {
                    bank: tossData.virtualAccount.bankCode,
                    account: tossData.virtualAccount.accountNumber,
                    holder: tossData.virtualAccount.customerName,
                    dueDate: tossData.virtualAccount.dueDate,
                  }
                : undefined
            );
            recovered = true;
          }
        }
      } catch (err) {
        console.error("[AUTO] pending recover failed", order.id, err);
      }
      if (!recovered) {
        db.prepare("DELETE FROM order_items WHERE order_id = ?").run(order.id);
        db.prepare("DELETE FROM orders WHERE id = ? AND status = 'pending'").run(order.id);
      }
    }

    const expiredVbank = db
      .prepare(
        `SELECT id FROM orders
         WHERE status = 'pending' AND payment_method = 'vbank'
           AND vbank_due_date IS NOT NULL AND vbank_due_date != ''
           AND datetime(vbank_due_date) < datetime('now')`
      )
      .all() as Array<{ id: number }>;
    for (const order of expiredVbank) {
      try {
        refundOrderTx(order.id, undefined, "입금 기한 만료");
        db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'refunded'").run(order.id);
      } catch (err) {
        console.error("[AUTO] vbank expire failed", order.id, err);
      }
    }
    void expirePoints();
    void backupDatabase();
    void syncShippingDeliveries();
    const remind = db
      .prepare(
        `SELECT o.* FROM orders o
         WHERE o.status = 'completed' AND IFNULL(o.review_reminded, 0) = 0
           AND o.confirmed_at IS NOT NULL AND o.confirmed_at < datetime('now', '-7 days')
           AND o.customer_email IS NOT NULL AND o.customer_email != ''`
      )
      .all() as any[];
    for (const order of remind) {
      const wrote = db
        .prepare(
          `SELECT COUNT(*) as count FROM reviews r
           JOIN order_items oi ON oi.product_id = r.product_id AND oi.order_id = ?
           WHERE r.user_id = ?`
        )
        .get(order.id, order.user_id) as any;
      db.prepare("UPDATE orders SET review_reminded = 1 WHERE id = ?").run(order.id);
      if (Number(wrote?.count) > 0 || !order.user_id) continue;
      sendMail(
        order.customer_email,
        "리뷰를 남기면 포인트가 적립됩니다",
        `<p>${escapeHtml(order.customer_name || "")}님, 받아보신 오브제는 마음에 드셨나요.</p>
         <p>리뷰를 남기면 최대 2,000P가 적립됩니다.</p>
         <p><a href="https://benua.shop/profile">마이페이지에서 작성하기</a></p>`,
        "NEWS"
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[AUTO] Error during auto-completion:", err);
  }
};

const sweetTrackerCarrierCode = (company: string) => {
  const codes: Record<string, string> = {
    우체국택배: "01",
    CJ대한통운: "04",
    한진택배: "05",
    로젠택배: "06",
    롯데택배: "08",
  };
  return codes[company] || "04";
};

const trackingIsDelivered = (info: any) =>
  Boolean(info) &&
  info.result !== "N" &&
  (info.complete === true || info.completeYN === "Y" || Number(info.level) === 6);

const fetchTrackingInfo = async (company: string, invoice: string) => {
  const key = String(process.env.SWEETTRACKER_API_KEY || "").trim();
  const number = String(invoice || "").replace(/[^\d]/g, "");
  if (!key || !number) return null;
  const response = await fetch("https://info.sweettracker.co.kr/api/v1/trackingInfo", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      t_key: key,
      t_code: sweetTrackerCarrierCode(company || "CJ대한통운"),
      t_invoice: number,
    }),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
};

const loadTracking = async (order: any) => {
  const checked = order.tracking_checked_at ? new Date(order.tracking_checked_at).getTime() : 0;
  if (order.tracking_cache && Date.now() - checked < 20 * 60 * 1000) {
    try {
      return JSON.parse(order.tracking_cache);
    } catch {
      /* refresh */
    }
  }
  const info = await fetchTrackingInfo(order.shipping_company, order.tracking_number);
  if (info) {
    db.prepare("UPDATE orders SET tracking_cache = ?, tracking_checked_at = ? WHERE id = ?").run(
      JSON.stringify(info),
      new Date().toISOString(),
      order.id
    );
  }
  return info;
};

const sweetTrackerDelivered = async (company: string, invoice: string) =>
  trackingIsDelivered(await fetchTrackingInfo(company, invoice));

const markOrderDelivered = (orderId: number) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'shipping'").get(orderId) as any;
  if (!order) return false;
  const updated = db
    .prepare(
      "UPDATE orders SET status = 'delivered', status_updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'shipping'"
    )
    .run(orderId);
  if (updated.changes > 0 && order.customer_email) {
    const link = `https://benua.shop/track?orderNumber=${encodeURIComponent(order.order_number)}`;
    sendMail(
      order.customer_email,
      `${order.order_number} 배송이 완료되었습니다`,
      `<p>${escapeHtml(order.customer_name || "")}님, 주문하신 상품이 도착했습니다.</p>
       <p>마이페이지에서 구매확정과 리뷰를 남기면 포인트가 적립됩니다.</p>
       <p><a href="${link}">주문 조회</a></p>`,
      "SYSTEM"
    ).catch(() => {});
  }
  return updated.changes > 0;
};

const syncShippingDeliveries = async (orderId?: number) => {
  const orders = (
    orderId
      ? db
          .prepare(
            "SELECT * FROM orders WHERE id = ? AND status = 'shipping' AND tracking_number IS NOT NULL"
          )
          .all(orderId)
      : db
          .prepare(
            "SELECT * FROM orders WHERE status = 'shipping' AND tracking_number IS NOT NULL AND TRIM(tracking_number) != ''"
          )
          .all()
  ) as any[];
  for (const order of orders) {
    try {
      const checked = order.tracking_checked_at ? new Date(order.tracking_checked_at).getTime() : 0;
      if (!orderId && checked && Date.now() - checked < 20 * 60 * 1000) continue;
      const info = await loadTracking(order);
      if (trackingIsDelivered(info)) markOrderDelivered(order.id);
    } catch (err) {
      console.error("[TRACK] delivery check failed", order.id, err);
    }
  }
};

const shopSetting = (key: string, fallback: number) => {
  const row = db.prepare("SELECT value FROM shop_settings WHERE key = ?").get(key) as { value?: string } | undefined;
  const value = Number(row?.value);
  return Number.isFinite(value) ? value : fallback;
};

const extraShippingFee = (zipcode: string) => {
  const zip = Number(String(zipcode || "").replace(/\D/g, ""));
  if (!zip) return 0;
  if (zip >= 63000 && zip <= 63644) return shopSetting("jeju_fee", 3000);
  const islands: Array<[number, number]> = [
    [22386, 22388],
    [23004, 23012],
    [23100, 23136],
    [40200, 40240],
    [52570, 52571],
    [53031, 53033],
    [54000, 54000],
    [56347, 56349],
    [57068, 57069],
    [58760, 58762],
    [58800, 58866],
    [58953, 58958],
    [59102, 59166],
    [59781, 59790],
  ];
  if (islands.some(([start, end]) => zip >= start && zip <= end)) return shopSetting("island_fee", 5000);
  return 0;
};

const expirePoints = () => {
  const soon = db
    .prepare(
      `SELECT ph.id, ph.amount, ph.expires_at, u.email, u.name
       FROM point_history ph JOIN users u ON u.id = ph.user_id
       WHERE ph.type = 'EARNED' AND IFNULL(ph.expired, 0) = 0 AND IFNULL(ph.warn_sent, 0) = 0
         AND ph.expires_at IS NOT NULL
         AND datetime(ph.expires_at) > datetime('now')
         AND datetime(ph.expires_at) <= datetime('now', '+7 days')`
    )
    .all() as any[];
  for (const row of soon) {
    if (row.email) {
      const when = String(row.expires_at).slice(0, 10);
      sendMail(
        row.email,
        "포인트가 곧 소멸됩니다",
        `<p>${escapeHtml(row.name || "")}님, ${Number(row.amount || 0).toLocaleString()}P가 ${escapeHtml(when)}에 소멸됩니다.</p>`,
        "SYSTEM"
      ).catch(() => {});
    }
    db.prepare("UPDATE point_history SET warn_sent = 1 WHERE id = ?").run(row.id);
  }
  const rows = db
    .prepare(
      `SELECT * FROM point_history
       WHERE type = 'EARNED' AND IFNULL(expired, 0) = 0 AND expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')`
    )
    .all() as any[];
  for (const row of rows) {
    const user = db.prepare("SELECT points FROM users WHERE id = ?").get(row.user_id) as any;
    const amount = Math.max(0, Number(row.amount) || 0);
    const take = Math.min(Number(user?.points) || 0, amount);
    if (take > 0) {
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(take, row.user_id);
      db.prepare("INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'EXPIRED')").run(
        row.user_id,
        -take,
        "포인트 유효기간 만료"
      );
    }
    db.prepare("UPDATE point_history SET expired = 1 WHERE id = ?").run(row.id);
  }
};

const backupDatabase = () => {
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(dir, `benua-${stamp}.db`);
  if (fs.existsSync(target)) return;
  db.backup(target)
    .then(() => {
      const files = fs
        .readdirSync(dir)
        .filter((name) => name.startsWith("benua-") && name.endsWith(".db"))
        .sort();
      for (const name of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(dir, name));
    })
    .catch((err) => console.error("[BACKUP]", err));
};

const sendInBatches = async (jobs: Array<() => Promise<unknown>>) => {
  for (let i = 0; i < jobs.length; i += 10) {
    await Promise.all(jobs.slice(i, i + 10).map((job) => job().catch(() => {})));
  }
};

// ==========================================
// 5. Express Server Setup
// ==========================================
const SUPPORT_INBOX = (process.env.INBOUND_ADDRESS || "support@benua.shop").toLowerCase();

const resendApiKey = () => process.env.RESEND_API_KEY || process.env.SMTP_PASS || "";

const asAddressList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

const isSupportInboxMail = (email: any) => {
  const blob = [
    ...asAddressList(email?.to),
    ...asAddressList(email?.cc),
    ...asAddressList(email?.bcc),
    ...asAddressList(email?.received_for),
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(SUPPORT_INBOX);
};

const verifyResendWebhook = (rawBody: string, headers: Record<string, unknown>) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = String(headers["svix-id"] || "");
  const timestamp = String(headers["svix-timestamp"] || "");
  const signature = String(headers["svix-signature"] || "");
  const ts = Number(timestamp);
  if (!id || !timestamp || !signature || !Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return signature.split(" ").some((part) => {
    const sig = part.startsWith("v1,") ? part.slice(3) : "";
    if (!sig || sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
};

const fetchReceivedEmail = async (emailId: string) => {
  const key = resendApiKey();
  if (!key) throw new Error("Resend API 키가 없습니다.");
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`받은 메일 조회 실패 (${response.status})`);
  }
  return response.json();
};

const saveInboundEmail = (email: any) => {
  if (!email?.id || !isSupportInboxMail(email)) return false;
  db.prepare(
    `INSERT INTO inbound_emails
      (resend_id, from_address, to_addresses, subject, text_body, html_body, attachments, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(resend_id) DO UPDATE SET
       from_address = excluded.from_address,
       to_addresses = excluded.to_addresses,
       subject = excluded.subject,
       text_body = excluded.text_body,
       html_body = excluded.html_body,
       attachments = excluded.attachments,
       received_at = excluded.received_at`
  ).run(
    email.id,
    email.from || "",
    JSON.stringify([
      ...asAddressList(email.to),
      ...asAddressList(email.received_for).map((item) => `via:${item}`),
    ]),
    email.subject || "(제목 없음)",
    email.text || "",
    email.html || "",
    JSON.stringify(email.attachments || []),
    email.created_at || new Date().toISOString()
  );
  return true;
};

const listReceivedEmails = async () => {
  const key = resendApiKey();
  if (!key) throw new Error("Resend API 키가 없습니다.");
  const headers = { Authorization: `Bearer ${key}` };
  const all: any[] = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.resend.com/emails/receiving");
    if (page > 0) {
      url.searchParams.set("limit", "100");
      if (after) url.searchParams.set("after", after);
    }
    let response = await fetch(page === 0 ? "https://api.resend.com/emails/receiving" : url, { headers });
    if (!response.ok && page === 0) {
      url.searchParams.set("limit", "100");
      response = await fetch(url, { headers });
    }
    if (!response.ok) throw new Error(`받은 메일 목록 조회 실패 (${response.status})`);
    const data = await response.json();
    const items = Array.isArray(data) ? data : data.data || [];
    all.push(...items);
    if (!data.has_more || items.length === 0) break;
    after = items[items.length - 1]?.id || "";
    if (!after) break;
  }
  return all;
};

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

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        if (req.url?.startsWith("/api/webhooks/resend")) {
          (req as any).rawBody = buf.toString("utf8");
        }
      },
    })
  );
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
        const key = db.prepare("SELECT key_label FROM admin_keys WHERE id = ?").get(req.admin.keyId) as any;
        try {
          adminIdentifier = key?.key_label ? decryptText(String(key.key_label)) : `key#${req.admin.keyId}`;
        } catch {
          adminIdentifier = `key#${req.admin.keyId}`;
        }
      } else if (req.admin?.id && !req.admin?.isKey) {
        const u = db.prepare("SELECT email FROM users WHERE id = ?").get(req.admin.id) as any;
        if (u) adminIdentifier = u.email;
      } else if (req.body?.adminKey) {
        adminIdentifier = "admin-key";
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
  const authenticateMaster = authorize(["MASTER"]);

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
    const { email, website } = req.body;
    if (!email || !String(email).includes("@")) {
      return res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요." });
    }
    if (honeypotFilled(website) || isSpamBotEmail(email)) {
      console.warn(`[SPAM][CODE_BLOCKED] IP: ${clientIp(req)}`);
      return res.json({ success: true, message: "인증 메일을 보낼 수 있으면 발송했습니다." });
    }

    const cleanEmail = String(email || "").trim();
    const ip = clientIp(req);
    if (!allowRate(`code-ip:${ip}`, 8, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    if (!allowRate(`code:${ip}:${cleanEmail.toLowerCase()}`, 3, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    try {
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
      if (existingUser || gmailCanonicalTaken(cleanEmail)) {
        return res.json({ success: true, message: "인증 메일을 보낼 수 있으면 발송했습니다." });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분 유효

      db.prepare(
        `INSERT INTO email_verification_codes (email, code, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`
      ).run(cleanEmail, hashPassword(code), expiresAt);

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

      res.json({ success: true, message: "인증 메일을 보낼 수 있으면 발송했습니다." });
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
      if (!codeMatches(email.trim(), String(code))) {
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
    if (honeypotFilled(req.body?.website) || isSpamBotEmail(email)) {
      console.warn(`[SPAM][REGISTER_BLOCKED] IP: ${clientIp(req)}`);
      return res.json({ success: true, message: "회원가입이 완료되었습니다." });
    }

    const cleanEmail = String(email || "").trim();
    const inputCode = String(verification_code || VerificationCode || "").trim();
    const pending = readOauthPending(req);
    const pendingMatches =
      pending?.email && pending.email.toLowerCase() === cleanEmail.toLowerCase() ? pending : null;
    const linkedGoogle = google_id || (pendingMatches?.provider === "google" ? pendingMatches.socialId : null);
    const linkedNaver = naver_id || (pendingMatches?.provider === "naver" ? pendingMatches.socialId : null);
    const linkedKakao = kakao_id || (pendingMatches?.provider === "kakao" ? pendingMatches.socialId : null);

    try {
      // 소셜 연동 가입이 아닌 일반 가입 시 이메일 인증코드 확인
      if (!linkedGoogle && !linkedNaver && !linkedKakao) {
        if (!codeMatches(cleanEmail, inputCode)) {
          return res.status(400).json({ error: "이메일 인증을 먼저 완료해주세요." });
        }
      }
      if (gmailCanonicalTaken(cleanEmail)) {
        return res.status(400).json({ error: "가입을 완료할 수 없습니다. 입력 정보를 확인해주세요." });
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
          linkedGoogle || null,
          linkedNaver || null,
          linkedKakao || null,
          isSubscribed
        );

      // 사용한 인증번호 삭제
      db.prepare("DELETE FROM email_verification_codes WHERE email = ?").run(cleanEmail);

      const userId = Number(info.lastInsertRowid);
      clearAuthCookie(res, "oauth_pending");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(
        userId,
        ensureWelcomeCoupon(),
        expiresAt.toISOString()
      );

      const token = jwt.sign({ id: userId, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", token);

      res.json({ success: true, token, message: "회원가입이 완료되었습니다." });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({ error: "가입을 완료할 수 없습니다. 입력 정보를 확인해주세요." });
      }
      res.status(500).json({ error: "회원가입 처리 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = String(email || "").trim();
    if (!allowRate(`login:${clientIp(req)}:${cleanEmail.toLowerCase()}`, 8, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as any;
      if (!user || !verifyPassword(password || "", user.password)) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }
      if (!String(user.password).startsWith("scrypt$")) {
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(password), user.id);
      }

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, {
        expiresIn: req.body?.remember ? "14d" : "24h",
      });
      setAuthCookie(res, "user_token", token, req.body?.remember ? 14 : 1);

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

  app.get("/api/points/history", authenticateUser, (req: any, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT id, amount, reason, type, created_at
           FROM point_history
           WHERE user_id = ?
           ORDER BY id DESC`
        )
        .all(req.user.id);
      res.json(rows);
    } catch {
      res.status(500).json({ error: "포인트 내역을 불러오지 못했습니다." });
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
    const { email, website } = req.body;
    const cleanEmail = String(email || "").trim();
    if (honeypotFilled(website) || isSpamBotEmail(cleanEmail)) {
      console.warn(`[SPAM][RESET_BLOCKED] IP: ${clientIp(req)}`);
      return res.json({ success: true });
    }
    const ip = clientIp(req);
    if (!allowRate(`reset-ip:${ip}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "재설정 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    if (!allowRate(`reset:${ip}:${cleanEmail.toLowerCase()}`, 3, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "재설정 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as any;
      if (!user) return res.json({ success: true });

      const token = crypto.randomBytes(20).toString("hex");
      const expires = new Date(Date.now() + 3600000).toISOString();
      db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?").run(
        hashToken(token),
        expires,
        cleanEmail
      );

      const resetLink = `https://${req.get("host")}/reset-password?token=${token}`;
      await sendMail(
        cleanEmail,
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
        .get(hashToken(token)) as any;
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
      db.prepare("UPDATE users SET verification_token = ? WHERE id = ?").run(hashToken(token), user.id);

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
        .get(hashToken(req.params.token)) as any;
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
    rememberOauthOrigin(req, res);
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
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id || userData.sub, decoded.id);
          return res.redirect("/profile");
        } catch {}
      }

      let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(userData.id || userData.sub) as any;
      if (!user && userData.email) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(userData.email) as any;
        if (user) {
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(userData.id || userData.sub, user.id);
        }
      }

      if (!user) {
        const googleId = String(userData.id || userData.sub || "");
        rememberOauthPending(res, "google", googleId, String(userData.email || ""));
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${String(userData.email || "").replace(/'/g, "")}', socialId: '${googleId.replace(/'/g, "")}', provider: 'google' }, '${oauthMessageOrigin(req)}');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(String(userData.email || ""))}&socialId=${encodeURIComponent(googleId)}&provider=google';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '${oauthMessageOrigin(req)}');
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
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'}, '${oauthMessageOrigin(req)}');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  app.get("/api/auth/naver/url", (req, res) => {
    rememberOauthOrigin(req, res);
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
            `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_LINK_SUCCESS',provider:'naver'}, '${oauthMessageOrigin(req)}');window.close();}else{window.location.href='/profile';}</script></body></html>`
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
        rememberOauthPending(res, "naver", String(socialId || ""), String(email || ""));
        const safeId = String(socialId || "").replace(/'/g, "");
        const safeEmail = String(email || "").replace(/'/g, "");
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${safeEmail}', socialId: '${safeId}', provider: 'naver' }, '${oauthMessageOrigin(req)}');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(String(email || ""))}&socialId=${encodeURIComponent(String(socialId || ""))}&provider=naver';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '${oauthMessageOrigin(req)}');
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
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'}, '${oauthMessageOrigin(req)}');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  app.get("/api/auth/kakao/url", (req, res) => {
    rememberOauthOrigin(req, res);
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
            `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_LINK_SUCCESS',provider:'kakao'}, '${oauthMessageOrigin(req)}');window.close();}else{window.location.href='/profile';}</script></body></html>`
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
        rememberOauthPending(res, "kakao", String(socialId || ""), String(email || ""));
        const safeId = String(socialId || "").replace(/'/g, "");
        const safeEmail = String(email || "").replace(/'/g, "");
        return res.send(`
          <html><body><script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'not_registered', email: '${safeEmail}', socialId: '${safeId}', provider: 'kakao' }, '${oauthMessageOrigin(req)}');
              window.close();
            } else {
              window.location.href = '/login?error=not_registered&email=${encodeURIComponent(String(email || ""))}&socialId=${encodeURIComponent(String(socialId || ""))}&provider=kakao';
            }
          </script></body></html>
        `);
      }

      const jwtToken = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
      setAuthCookie(res, "user_token", jwtToken);

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwtToken}' }, '${oauthMessageOrigin(req)}');
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
        `<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_ERROR',error:'server_error'}, '${oauthMessageOrigin(req)}');window.close();}else{window.location.href='/login?error=server_error';}</script></body></html>`
      );
    }
  });

  // ==========================================
  // 8. Admin Auth (2FA TOTP) & Key Management
  // ==========================================
  app.post("/api/admin/verify-key", async (req, res) => {
    const ip = clientIp(req);
    if (!allowRate(`adminkey:${ip}`, 5, 15 * 60 * 1000)) {
      warnAdminLogin(ip);
      return res.status(429).json({ error: "로그인 시도가 많아 잠시 막혀 있습니다." });
    }
    const { adminKey } = req.body;
    const keyRecord = findAdminKey(adminKey);

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
    const ip = clientIp(req);
    if (!allowRate(`admintotp:${ip}`, 5, 15 * 60 * 1000)) {
      warnAdminLogin(ip);
      return res.status(429).json({ error: "로그인 시도가 많아 잠시 막혀 있습니다." });
    }
    const { adminKey, token, secret } = req.body;
    const keyRecord = findAdminKey(adminKey);

    if (!keyRecord) return res.status(401).json({ error: "유효하지 않은 보안 키입니다." });

    const totpSecret = (keyRecord.totp_secret ? decryptText(keyRecord.totp_secret) : "") || secret;
    if (!totpSecret) return res.status(400).json({ error: "TOTP 시크릿이 없습니다." });

    const isValid = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: "base32",
      token: String(token || "").trim(),
      window: 1,
    });

    if (!isValid) {
      warnAdminLogin(ip);
      return res.status(401).json({ error: "OTP 인증번호가 일치하지 않습니다." });
    }

    if (!keyRecord.totp_secret) {
      db.prepare("UPDATE admin_keys SET totp_secret = ? WHERE id = ?").run(encryptText(totpSecret), keyRecord.id);
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

  app.get("/api/admin/logs", authenticateAdmin, (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        const logs = db.prepare("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 500").all();
        return res.json({ logs, capped: false });
      }
      const like = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      const rows = db
        .prepare(
          `SELECT * FROM admin_logs
           WHERE action LIKE ? ESCAPE '\\'
              OR IFNULL(admin_identifier, '') LIKE ? ESCAPE '\\'
              OR IFNULL(details, '') LIKE ? ESCAPE '\\'
              OR IFNULL(target_type, '') LIKE ? ESCAPE '\\'
              OR IFNULL(changes, '') LIKE ? ESCAPE '\\'
              OR IFNULL(ip_address, '') LIKE ? ESCAPE '\\'
              OR CAST(IFNULL(target_id, '') AS TEXT) LIKE ? ESCAPE '\\'
           ORDER BY created_at DESC
           LIMIT 501`
        )
        .all(like, like, like, like, like, like, like) as any[];
      res.json({ logs: rows.slice(0, 500), capped: rows.length > 500 });
    } catch {
      res.status(500).json({ error: "로그를 불러오지 못했습니다." });
    }
  });

  app.get("/api/admin/keys", authenticateAdmin, (_req, res) => {
    const keys = db
      .prepare(
        "SELECT id, role, notify_email, key_label, CASE WHEN totp_secret IS NULL THEN 0 ELSE 1 END as has_2fa, created_at FROM admin_keys ORDER BY created_at DESC"
      )
      .all() as any[];
    res.json(
      keys.map((key) => ({
        ...key,
        key_label: (() => {
          try {
            return key.key_label ? decryptText(key.key_label) : "";
          } catch {
            return "";
          }
        })(),
      }))
    );
  });

  app.post("/api/admin/keys", authenticateAdmin, (req: any, res) => {
    const { keyValue, role } = req.body;
    if (!keyValue) return res.status(400).json({ error: "키 값을 입력해주세요." });
    if (req.admin.role !== "MASTER" && role === "MASTER") {
      return res.status(403).json({ error: "MASTER 권한 키는 MASTER만 생성할 수 있습니다." });
    }
    if (findAdminKey(keyValue.trim())) {
      return res.status(400).json({ error: "이미 존재하는 보안 키입니다." });
    }
    try {
      const info = db
        .prepare("INSERT INTO admin_keys (key_value, role, key_label) VALUES (?, ?, ?)")
        .run(hashPassword(keyValue.trim()), role || "ADMIN", encryptText(keyValue.trim()));
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

  app.put("/api/admin/keys/:id/email", authenticateAdmin, (req: any, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (email && (!email.includes("@") || email.length > 200)) {
      return res.status(400).json({ error: "이메일을 확인해주세요." });
    }
    const existing = db.prepare("SELECT id FROM admin_keys WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "보안 키를 찾을 수 없습니다." });
    db.prepare("UPDATE admin_keys SET notify_email = ? WHERE id = ?").run(email || null, req.params.id);
    logAdminAction(
      req,
      "UPDATE_KEY_EMAIL",
      "admin_keys",
      Number(req.params.id),
      email ? "Set notify email" : "Cleared notify email"
    );
    res.json({ success: true });
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
      const products = db
        .prepare(
          `SELECT p.*,
                  ROUND(AVG(CASE WHEN IFNULL(r.is_hidden, 0) = 0 THEN r.rating END), 1) as rating_avg,
                  SUM(CASE WHEN IFNULL(r.is_hidden, 0) = 0 THEN 1 ELSE 0 END) as review_count,
                  (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id
                      AND o.status IN ('paid', 'preparing', 'shipping', 'delivered', 'completed')) as sold_count,
                  (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1 OFFSET 1) as hover_image
           FROM products p
           LEFT JOIN reviews r ON r.product_id = p.id
           GROUP BY p.id
           ORDER BY p.pinned DESC, p.sort_order ASC, p.created_at DESC`
        )
        .all();
      res.json(products);
    } catch {
      res.status(500).json({ error: "상품 목록을 불러오지 못했습니다." });
    }
  });

  app.get("/api/products/:id", (req, res) => {
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as any;
      if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
      db.prepare("UPDATE products SET view_count = IFNULL(view_count, 0) + 1 WHERE id = ?").run(product.id);
      product.images = db
        .prepare("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id")
        .all(product.id);
      product.options = db
        .prepare("SELECT * FROM product_options WHERE product_id = ? ORDER BY id")
        .all(product.id);
      product.related = db
        .prepare(
          "SELECT id, name, price, image_url, discount_rate, category, stock, sale_mode FROM products WHERE category = ? AND id != ? LIMIT 4"
        )
        .all(product.category, product.id);
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
    async (req: any, res) => {
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
        sale_mode,
      } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      await toWebpMany([...(files?.["image"] || []), ...(files?.["description_image"] || [])]);

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
            (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main, sale_mode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            Math.min(100, Math.max(0, parseInt(discount_rate, 10) || 0)),
            show_on_main === "true" || show_on_main === "1" || show_on_main === 1 ? 1 : 0,
            normalizeSaleMode(sale_mode)
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
    async (req: any, res) => {
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
        sale_mode,
      } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      await toWebpMany([...(files?.["image"] || []), ...(files?.["description_image"] || [])]);

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
               manufacturer = ?, discount_rate = ?, show_on_main = ?, sale_mode = ?
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
          Math.min(100, Math.max(0, parseInt(discount_rate, 10) || 0)),
          show_on_main === "true" || show_on_main === "1" || show_on_main === 1 ? 1 : 0,
          normalizeSaleMode(sale_mode),
          id
        );

        logAdminAction(req, "UPDATE_PRODUCT", "products", Number(id), `Updated product: ${name}`);
        const previousMode = normalizeSaleMode(product.sale_mode);
        const nextMode = normalizeSaleMode(sale_mode);
        if (previousMode === "preorder" && nextMode !== "preorder") {
          notifyPreorderOpened(req, { id: product.id, name: name.trim(), sale_mode: nextMode }).catch((err) =>
            console.error("[PREORDER] notify failed:", err)
          );
        }
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: "상품 수정 실패: " + err.message });
      }
    }
  );

  app.patch("/api/products/:id/quick", authenticateAdmin, (req: any, res) => {
    const price = Math.max(0, Math.floor(Number(req.body?.price) || 0));
    const discountRate = Math.min(100, Math.max(0, Math.floor(Number(req.body?.discount_rate) || 0)));
    const stock = Math.max(0, Math.floor(Number(req.body?.stock) || 0));
    const product = db.prepare("SELECT id, name, stock, sale_mode, image_url, price, discount_rate FROM products WHERE id = ?").get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    db.prepare("UPDATE products SET price = ?, discount_rate = ?, stock = ? WHERE id = ?").run(
      price,
      discountRate,
      stock,
      product.id
    );
    if (stock !== Number(product.stock)) {
      logStock(product.id, null, stock - Number(product.stock), "관리자 재고 수정");
    }
    if (Number(product.stock) < 1 && stock > 0 && normalizeSaleMode(product.sale_mode) === "open") {
      notifyRestock({ ...product, stock }).catch(() => {});
    }
    logAdminAction(req, "UPDATE_PRODUCT", "products", product.id, `Quick update ${product.name}`);
    res.json({ success: true, price, discount_rate: discountRate, stock });
  });

  app.post("/api/products/:id/preorder", (req: any, res) => {
    const viewer = readOptionalUser(req);
    const email = String(
      viewer?.id
        ? (db.prepare("SELECT email FROM users WHERE id = ?").get(viewer.id) as any)?.email
        : req.body?.email || ""
    )
      .trim()
      .toLowerCase();
    if (!allowRate(`preorder:${email}:${req.params.id}`, 8, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    try {
      if (!email.includes("@")) return res.status(400).json({ error: "이메일을 입력해주세요." });
      const product = db.prepare("SELECT id, name, stock, sale_mode FROM products WHERE id = ?").get(req.params.id) as any;
      if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
      const mode = normalizeSaleMode(product.sale_mode);
      if (mode !== "preorder" && !(mode === "open" && Number(product.stock) < 1)) {
        return res.status(400).json({ error: "지금은 알림을 받지 않습니다." });
      }
      db.prepare("INSERT OR IGNORE INTO product_preorders (product_id, email) VALUES (?, ?)").run(product.id, email);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "사전예약에 실패했습니다." });
    }
  });

  app.get("/api/products/:id/preorder/me", authenticateUser, (req: any, res) => {
    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id) as any;
    const email = String(user?.email || "").trim().toLowerCase();
    const row = email
      ? db.prepare("SELECT id FROM product_preorders WHERE product_id = ? AND email = ?").get(req.params.id, email)
      : null;
    res.json({ reserved: Boolean(row) });
  });

  const notifyPreorderOpened = async (
    req: any,
    product: { id: number; name: string; sale_mode: string }
  ) => {
    const rows = db
      .prepare("SELECT email FROM product_preorders WHERE product_id = ?")
      .all(product.id) as Array<{ email: string }>;
    if (rows.length === 0) return;
    const full = db
      .prepare("SELECT id, name, image_url, price, discount_rate FROM products WHERE id = ?")
      .get(product.id) as any;
    const reserved = product.sale_mode === "reserved";
    const note = reserved
      ? "사전예약하신 계정으로 구매할 수 있습니다."
      : "판매가 시작되었습니다.";
    const html = preorderNoticeHtml(full || product, note);
    await sendInBatches(
      rows.map(
        (row) => () =>
          sendMail(row.email, `${product.name}의 판매가 시작되었습니다`, html, "NEWS", false, "raw")
      )
    );
    db.prepare("UPDATE product_preorders SET notified_at = CURRENT_TIMESTAMP WHERE product_id = ?").run(product.id);
    logAdminAction(req, "NOTIFY_PREORDER", "products", product.id, `Auto notified ${rows.length}`);
  };

  const notifyRestock = async (product: any) => {
    const rows = db
      .prepare("SELECT email FROM product_preorders WHERE product_id = ?")
      .all(product.id) as Array<{ email: string }>;
    const html = preorderNoticeHtml(product, "다시 구매할 수 있습니다.");
    await sendInBatches(
      rows.map((row) => () => sendMail(row.email, `${product.name}이 입고되었습니다`, html, "NEWS", false, "raw"))
    );
  };

  app.get("/api/admin/products/:id/preorders", authenticateAdmin, (req, res) => {
    const rows = db
      .prepare(
        "SELECT id, email, notified_at, created_at FROM product_preorders WHERE product_id = ? ORDER BY created_at DESC"
      )
      .all(req.params.id);
    res.json(rows);
  });

  app.post("/api/admin/products/:id/preorders/notify", authenticateAdmin, async (req: any, res) => {
    const subject = String(req.body?.subject || "").trim();
    const content = String(req.body?.content || "").trim();
    const testEmail = String(req.body?.test_email || "").trim().toLowerCase();
    if (!subject) return res.status(400).json({ error: "제목을 입력해주세요." });
    try {
      const product = db
        .prepare("SELECT id, name, image_url, price, discount_rate FROM products WHERE id = ?")
        .get(req.params.id) as any;
      if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
      const rows = (
        testEmail
          ? [{ email: testEmail }]
          : (db
              .prepare("SELECT email FROM product_preorders WHERE product_id = ?")
              .all(product.id) as Array<{ email: string }>)
      );
      const extra = content
        ? escapeHtml(content)
        : "사전예약하신 상품 안내입니다.";
      const html = preorderNoticeHtml(product, extra);
      for (const row of rows) {
        await sendMail(
          row.email,
          subject,
          html,
          "NEWS",
          false,
          "raw"
        );
      }
      if (rows.length > 0) {
        db.prepare(
          "UPDATE product_preorders SET notified_at = CURRENT_TIMESTAMP WHERE product_id = ?"
        ).run(product.id);
      }
      logAdminAction(req, "NOTIFY_PREORDER", "products", product.id, `Notified ${rows.length}`);
      res.json({ success: true, count: rows.length });
    } catch {
      res.status(500).json({ error: "메일을 보내지 못했습니다." });
    }
  });

  app.delete("/api/products/:id", authenticateAdmin, (req: any, res) => {
    try {
      const product = db.prepare("SELECT image_url, description_image_url FROM products WHERE id = ?").get(req.params.id) as any;
      const extras = db.prepare("SELECT image_url FROM product_images WHERE product_id = ?").all(req.params.id) as any[];
      for (const row of [product, ...extras]) {
        const url = row?.image_url || row?.description_image_url;
        if (row?.image_url) removeUpload(row.image_url);
        if (row?.description_image_url) removeUpload(row.description_image_url);
      }
      db.prepare("DELETE FROM product_images WHERE product_id = ?").run(req.params.id);
      db.prepare("DELETE FROM product_options WHERE product_id = ?").run(req.params.id);
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
            Math.min(100, Math.max(0, Number(item.discount_rate) || 0)),
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
    const { name, code, type, value, min_order_amount, max_discount_amount, valid_days } = req.body;
    try {
      const couponType = type || "PERCENT";
      let nextValue = Number(value) || 0;
      if (couponType === "PERCENT") nextValue = Math.min(100, Math.max(0, nextValue));
      const info = db
        .prepare(
          "INSERT INTO coupons (name, code, type, value, min_order_amount, max_discount_amount, valid_days) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          name,
          code,
          couponType,
          nextValue,
          Number(min_order_amount) || 0,
          Number(max_discount_amount) || 0,
          Number(valid_days) || 0
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
    const { target, valid_days, skip_duplicate } = req.body;
    try {
      const coupon = db.prepare("SELECT * FROM coupons WHERE id = ?").get(id) as any;
      if (!coupon) return res.status(404).json({ error: "쿠폰을 찾을 수 없습니다." });
      const days = Math.max(0, Number(valid_days) || Number(coupon.valid_days) || 0);
      const expires = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
      const already = db.prepare(
        "SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND is_used = 0"
      );
      const give = (userId: number) => {
        if (skip_duplicate !== false && already.get(userId, id)) return;
        db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(
          userId,
          id,
          expires
        );
      };
      if (target === "all") {
        const users = db.prepare("SELECT id FROM users").all() as Array<{ id: number }>;
        db.transaction((list: Array<{ id: number }>) => {
          for (const u of list) give(u.id);
        })(users);
      } else {
        const user = db.prepare("SELECT id FROM users WHERE email = ?").get(target) as any;
        if (!user) return res.status(404).json({ error: "해당 이메일의 회원을 찾을 수 없습니다." });
        give(user.id);
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

  app.get("/api/coupons/notifications", (req, res) => {
    const viewer = readOptionalUser(req);
    if (!viewer?.id) return res.json([]);
    try {
      const newCoupons = db
        .prepare(
          `SELECT uc.id, c.name, c.type, c.value
           FROM user_coupons uc
           JOIN coupons c ON uc.coupon_id = c.id
           WHERE uc.user_id = ? AND uc.notified = 0 AND uc.is_used = 0`
        )
        .all(viewer.id);
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

  const normalizeSaleMode = (value: unknown) => {
    const mode = String(value || "open");
    return mode === "preorder" || mode === "reserved" ? mode : "open";
  };

  const canBuyReserved = (productId: number, emails: string[]) => {
    const unique = [
      ...new Set(emails.map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@"))),
    ];
    if (unique.length === 0) return false;
    const found = db.prepare("SELECT id FROM product_preorders WHERE product_id = ? AND email = ?");
    return unique.some((email) => found.get(productId, email));
  };

  const unitPrice = (product: any) => {
    const rate = Math.min(100, Math.max(0, Number(product.discount_rate) || 0));
    const base = Number(product.price) || 0;
    return rate > 0 ? Math.round(base * (1 - rate / 100)) : base;
  };

  const quoteOrder = (
    user: any | null,
    rawItems: any[],
    requestedPoints: number,
    couponId: number | null,
    buyerEmail = "",
    zipcode = ""
  ) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error("주문할 상품이 없습니다.");
    }
    const priced: any[] = [];
    let goods = 0;
    for (const raw of rawItems) {
      const productId = Number(raw.id || raw.product_id);
      const qty = Math.floor(Number(raw.quantity));
      if (!productId || qty < 1) throw new Error("주문 상품 정보가 올바르지 않습니다.");
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
      if (!product) throw new Error("존재하지 않는 상품입니다.");
      const saleMode = normalizeSaleMode(product.sale_mode);
      if (saleMode === "preorder") {
        throw new Error(`'${product.name}'은 사전예약 중입니다.`);
      }
      if (saleMode === "reserved" && !canBuyReserved(product.id, [buyerEmail, user?.email || ""])) {
        throw new Error("사전 예약자만 구매할 수 있는 상품입니다");
      }
      if (Number(product.stock) < qty) {
        throw new Error(`'${product.name}' 재고가 부족합니다.`);
      }
      const optionId = Number(raw.option_id) || 0;
      const option = optionId
        ? (db.prepare("SELECT * FROM product_options WHERE id = ? AND product_id = ?").get(optionId, product.id) as any)
        : null;
      if (optionId && !option) throw new Error("옵션을 확인해주세요.");
      if (option && Number(option.stock) < qty) {
        throw new Error(`'${product.name} ${option.name}' 재고가 부족합니다.`);
      }
      const price = unitPrice(product) + (option ? Number(option.extra_price) || 0 : 0);
      goods += price * qty;
      priced.push({
        product_id: product.id,
        name: option ? `${product.name} (${option.name})` : product.name,
        price,
        quantity: qty,
        image_url: product.image_url,
        option_id: option ? option.id : null,
      });
    }

    let couponDiscount = 0;
    let shippingCoupon = false;
    let appliedCouponId: number | null = null;
    if (couponId) {
      if (!user) throw new Error("쿠폰은 로그인 후 사용할 수 있습니다.");
      const coupon = db
        .prepare(
          `SELECT uc.id as user_coupon_id, c.type, c.value, c.min_order_amount, c.max_discount_amount, uc.expires_at
           FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
           WHERE uc.id = ? AND uc.user_id = ? AND uc.is_used = 0`
        )
        .get(couponId, user.id) as any;
      if (!coupon) throw new Error("사용할 수 없는 쿠폰입니다.");
      if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
        throw new Error("만료된 쿠폰입니다.");
      }
      if (goods < (Number(coupon.min_order_amount) || 0)) {
        throw new Error("쿠폰 최소 주문 금액을 충족하지 않습니다.");
      }
      if (coupon.type === "FIXED") couponDiscount = Number(coupon.value) || 0;
      else if (coupon.type === "PERCENT") {
        couponDiscount = Math.floor(goods * ((Number(coupon.value) || 0) / 100));
        const cap = Number(coupon.max_discount_amount) || 0;
        if (cap > 0 && couponDiscount > cap) couponDiscount = cap;
      } else if (coupon.type === "SHIPPING") shippingCoupon = true;
      couponDiscount = Math.min(goods, Math.max(0, couponDiscount));
      appliedCouponId = coupon.user_coupon_id;
    }

    const tier = String(user?.tier || "").toUpperCase();
    const freeTier = tier === "BLACK" || tier === "THE_BLACK";
    const freeMin = shopSetting("free_min", 50000);
    const baseFee = shopSetting("shipping_fee", 3000);
    const shippingFee =
      (freeTier || shippingCoupon || goods >= freeMin || goods === 0 ? 0 : baseFee) + extraShippingFee(zipcode);
    const payable = Math.max(0, goods - couponDiscount + shippingFee);
    let points = Math.floor(Number(requestedPoints) || 0);
    if (points < 0) points = 0;
    if (points > 0) {
      if (!user) throw new Error("포인트는 로그인 후 사용할 수 있습니다.");
      points = Math.min(points, Number(user.points) || 0, payable);
      if (points > 0 && points < 1000 && payable >= 1000) {
        throw new Error("포인트는 최소 1,000P 이상부터 사용 가능합니다.");
      }
    }
    return {
      items: priced,
      shippingFee,
      points,
      total: Math.max(0, payable - points),
      couponId: appliedCouponId,
    };
  };

  // Step 1: Prepare Order before launching Toss Payment Widget
  app.post("/api/orders/prepare", (req, res) => {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      zipcode,
      items,
      used_points,
      used_coupon_id,
      payment_method,
      shipping_memo,
      is_gift,
      gift_message,
    } = req.body;

    if (!allowRate(`prepare:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "주문 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "주문할 상품이 없습니다." });
    }
    const gift = Boolean(is_gift);
    if (!String(customer_name || "").trim() || !String(customer_phone || "").trim() || (!gift && !String(shipping_address || "").trim())) {
      return res.status(400).json({ error: gift ? "받는 사람 이름과 연락처를 입력해주세요." : "수령인, 연락처, 주소를 입력해주세요." });
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let order_number = "";
    for (let i = 0; i < 15; i++) {
      order_number += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const viewer = readOptionalUser(req);
    const account = viewer?.id
      ? (db.prepare("SELECT * FROM users WHERE id = ?").get(viewer.id) as any)
      : null;
    try {
      const quote = quoteOrder(
        account,
        items,
        Number(used_points) || 0,
        used_coupon_id ? Number(used_coupon_id) : null,
        String(customer_email || ""),
        String(zipcode || "")
      );
      const giftToken = gift ? crypto.randomBytes(18).toString("hex") : null;
      const orderId = db.transaction(() => {
        const info = db
          .prepare(
            `INSERT INTO orders
            (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address,
             total_amount, shipping_fee, used_points, used_coupon_id, payment_method, status,
             shipping_memo, is_gift, gift_token, gift_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
          )
          .run(
            order_number,
            account?.id || null,
            customer_name,
            customer_email,
            customer_phone,
            gift ? String(shipping_address || "선물 수령 대기") : shipping_address,
            quote.total,
            quote.shippingFee,
            quote.points,
            quote.couponId,
            payment_method || "card",
            String(shipping_memo || "").slice(0, 200),
            gift ? 1 : 0,
            giftToken,
            String(gift_message || "").slice(0, 200)
          );

        const newOrderId = Number(info.lastInsertRowid);
        const insertItem = db.prepare(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity, image_url, option_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        for (const item of quote.items) {
          insertItem.run(
            newOrderId,
            item.product_id,
            item.name,
            item.price,
            item.quantity,
            item.image_url,
            item.option_id || null
          );
        }
        return newOrderId;
      }).immediate();

      if (quote.total === 0) {
        try {
          finalizeOrderPaymentTx.immediate(orderId, `FREE_${order_number}`, payment_method || "card", "paid");
          notifyAdminNewOrder(orderId);
        } catch (payErr) {
          db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
          db.prepare("DELETE FROM orders WHERE id = ? AND status = 'pending'").run(orderId);
          throw payErr;
        }
        return res.json({
          success: true,
          zeroAmountPaid: true,
          order_number,
          amount: 0,
          gift_token: giftToken,
        });
      }

      res.json({
        success: true,
        zeroAmountPaid: false,
        order_id: orderId,
        order_number,
        amount: quote.total,
        gift_token: giftToken,
        order_name:
          quote.items.length > 1
            ? `${quote.items[0].name} 외 ${quote.items.length - 1}건`
            : quote.items[0].name,
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

      if (tossData.secret) {
        db.prepare("UPDATE orders SET toss_secret = ? WHERE id = ?").run(hashToken(String(tossData.secret)), order.id);
      }
      const approveNo = String(tossData.card?.approveNo || tossData.easyPay?.approveNo || "");
      if (approveNo) {
        db.prepare("UPDATE orders SET approve_no = ? WHERE id = ?").run(approveNo, order.id);
      }
      const receiptUrl = tossData.receipt?.url || null;
      const cashReceiptUrl = tossData.cashReceipt?.receiptUrl || null;
      if (receiptUrl || cashReceiptUrl) {
        db.prepare("UPDATE orders SET receipt_url = COALESCE(?, receipt_url), cash_receipt_url = COALESCE(?, cash_receipt_url) WHERE id = ?").run(
          receiptUrl,
          cashReceiptUrl,
          order.id
        );
      }

      const updatedOrder = finalizeOrderPaymentTx.immediate(
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

      notifyAdminNewOrder(order.id);

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
  app.post("/api/payments/toss/webhook", async (req, res) => {
    const data = req.body?.data || {};
    const orderId = data.orderId;
    const secret = data.secret;
    if (!orderId) return res.status(400).json({ error: "orderId가 없습니다." });

    try {
      const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderId) as any;
      if (!order) return res.status(200).json({ ok: true });
      if (!order.payment_key) {
        return res.status(401).json({ error: "웹훅을 확인할 수 없습니다." });
      }
      if (order.toss_secret && !tokenMatches(order.toss_secret, String(secret || ""))) {
        return res.status(401).json({ error: "웹훅을 확인할 수 없습니다." });
      }

      const basicAuth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
      const inquiry = await fetch(
        `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(order.order_number)}`,
        { headers: { Authorization: `Basic ${basicAuth}` } }
      );
      const payment = await inquiry.json();
      if (!inquiry.ok) return res.status(400).json({ error: "결제 조회에 실패했습니다." });
      if (payment.paymentKey && payment.paymentKey !== order.payment_key) {
        return res.status(400).json({ error: "결제 키가 일치하지 않습니다." });
      }
      if (Number(payment.totalAmount) !== Number(order.total_amount)) {
        return res.status(400).json({ error: "결제 금액이 일치하지 않습니다." });
      }

      if (payment.status === "DONE" && order.status === "pending") {
        db.prepare(
          "UPDATE orders SET status = 'paid', vbank_account = NULL, status_updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'"
        ).run(order.id);
      } else if (
        (payment.status === "CANCELED" || payment.status === "ABORTED" || payment.status === "EXPIRED") &&
        order.status !== "refunded"
      ) {
        refundOrderTx(order.id, order.total_amount, "PG 웹훅 결제 취소");
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[TOSS][WEBHOOK_ERROR]", err);
      res.status(500).json({ error: "Webhook failed" });
    }
  });

  app.post("/api/orders", (_req, res) => {
    res.status(410).json({ error: "이 주문 경로는 닫혔습니다. 결제 화면에서 주문해주세요." });
  });

  app.post("/api/orders/abandon", (req, res) => {
    const { order_number } = req.body || {};
    if (!order_number) return res.status(400).json({ error: "주문번호가 필요합니다." });
    try {
      const viewer = readOptionalUser(req);
      const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(order_number) as any;
      if (!order || order.status !== "pending" || order.payment_key) return res.json({ success: true });
      if (order.user_id && viewer?.id !== order.user_id) {
        return res.status(403).json({ error: "주문을 취소할 수 없습니다." });
      }
      db.prepare("DELETE FROM order_items WHERE order_id = ?").run(order.id);
      db.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "주문 정리에 실패했습니다." });
    }
  });

  app.get("/api/orders/me", authenticateUser, (req: any, res) => {
    try {
      const orders = db
        .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
        .all(req.user.id) as any[];
      const getItems = db.prepare(
        `SELECT oi.*, CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS reviewed
         FROM order_items oi
         LEFT JOIN reviews r
           ON r.order_id = oi.order_id
          AND r.product_id = oi.product_id
          AND r.user_id = ?
         WHERE oi.order_id = ?`
      );
      for (const order of orders) {
        order.items = getItems.all(req.user.id, order.id);
        const coupon = order.used_coupon_id
          ? (db
              .prepare(
                `SELECT c.name, c.type, c.value, c.max_discount_amount
                 FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id WHERE uc.id = ?`
              )
              .get(order.used_coupon_id) as any)
          : null;
        order.coupon_name = coupon?.name || "";
        order.coupon_type = coupon?.type || "";
        order.coupon_value = coupon?.value || 0;
        order.coupon_max_discount = coupon?.max_discount_amount || 0;
        Object.assign(order, presentOrder(order));
        delete order.toss_secret;
      }
      res.json(orders);
    } catch {
      res.status(500).json({ error: "주문 내역을 불러오지 못했습니다." });
    }
  });

  const carrierCode = (company: string) => sweetTrackerCarrierCode(company);

  const trackingMessage = (message: string) =>
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#faf2e7;color:#463221;font-family:sans-serif"><p style="padding:24px">${escapeHtml(message)}</p></body>`;

  const trackingSkyHtml = async (company: string, invoice: string) => {
    const key = String(process.env.SWEETTRACKER_API_KEY || "").trim();
    if (!key) return { status: 503, html: trackingMessage("배송조회 키가 설정되지 않았습니다.") };
    const number = String(invoice || "").replace(/[^\d]/g, "");
    if (!number) return { status: 400, html: trackingMessage("운송장 번호가 없습니다.") };
    const response = await fetch("https://info.sweettracker.co.kr/tracking/5", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        t_key: key,
        t_code: carrierCode(company || "CJ대한통운"),
        t_invoice: number,
      }),
    });
    let html = await response.text();
    if (key) html = html.split(key).join("");
    if (!/<base\s/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, '<head$1><base href="https://info.sweettracker.co.kr/">');
    }
    return { status: response.ok ? 200 : response.status, html };
  };

  const sendTrackingSky = async (res: any, order: any) => {
    if (!order?.tracking_number) {
      res.status(404).type("html").send(trackingMessage("운송장이 없습니다."));
      return;
    }
    try {
      const page = await trackingSkyHtml(order.shipping_company || "CJ대한통운", order.tracking_number);
      if (order.status === "shipping") await syncShippingDeliveries(order.id);
      res.status(page.status).type("html").send(page.html);
    } catch {
      res.status(502).type("html").send(trackingMessage("배송조회를 열지 못했습니다."));
    }
  };

  app.get("/api/orders/track/:orderNumber", (req, res) => {
    if (!allowRate(`track:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "조회 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    const normalizePhone = (value: unknown) => {
      let digits = String(value || "").replace(/\D/g, "");
      if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
      return digits;
    };
    const phone = normalizePhone(req.query.phone);
    if (phone.length < 8) {
      return res.status(400).json({ error: "주문 시 입력한 연락처를 함께 입력해주세요." });
    }
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE order_number = ?")
        .get(req.params.orderNumber) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      const stored = normalizePhone(order.customer_phone);
      if (!stored || stored !== phone) {
        return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      }
      const items = db
        .prepare("SELECT name, quantity, price FROM order_items WHERE order_id = ?")
        .all(order.id);
      res.json({
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        customer_name: order.customer_name,
        shipping_address: order.shipping_address,
        total_amount: order.total_amount,
        tracking_number: order.tracking_number,
        shipping_company: order.shipping_company,
        items,
      });
    } catch {
      res.status(500).json({ error: "주문 조회에 실패했습니다." });
    }
  });

  app.get("/api/orders/track/:orderNumber/tracking-sky", async (req, res) => {
    if (!allowRate(`track-sky:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
      return res.status(429).type("html").send(trackingMessage("조회 요청이 너무 많습니다."));
    }
    const normalizePhone = (value: unknown) => {
      let digits = String(value || "").replace(/\D/g, "");
      if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
      return digits;
    };
    const phone = normalizePhone(req.query.phone);
    if (phone.length < 8) return res.status(400).type("html").send(trackingMessage("연락처를 확인해주세요."));
    const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(req.params.orderNumber) as any;
    if (!order || normalizePhone(order.customer_phone) !== phone) {
      return res.status(404).type("html").send(trackingMessage("주문을 찾을 수 없습니다."));
    }
    await sendTrackingSky(res, order);
  });

  app.get("/api/orders/:id/tracking-sky", authenticateUser, async (req: any, res) => {
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id) as any;
    if (!order) return res.status(404).type("html").send(trackingMessage("주문을 찾을 수 없습니다."));
    await sendTrackingSky(res, order);
  });

  app.get("/api/orders/:id/detail", authenticateUser, (req: any, res) => {
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      res.json({ ...presentOrder(order), items });
    } catch {
      res.status(500).json({ error: "주문 상세 조회 실패" });
    }
  });

  app.put("/api/orders/:id/address", authenticateUser, (req: any, res) => {
    const name = String(req.body?.customer_name || "").trim();
    const phone = String(req.body?.customer_phone || "").trim();
    const zipcode = String(req.body?.zipcode || "").replace(/\D/g, "");
    const address = String(req.body?.address || "").trim();
    const detail = String(req.body?.detail_address || "").trim();
    if (!name || !phone || zipcode.length < 5 || !address) {
      return res.status(400).json({ error: "수령인, 연락처, 주소를 입력해주세요." });
    }
    try {
      const order = db
        .prepare("SELECT id, status, order_number FROM orders WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      if (!["pending", "paid"].includes(order.status)) {
        return res.status(400).json({ error: "발송된 주문은 배송지를 바꿀 수 없습니다." });
      }
      const shippingAddress = `[${zipcode}] ${address}${detail ? ` ${detail}` : ""}`;
      db.prepare(
        "UPDATE orders SET customer_name = ?, customer_phone = ?, shipping_address = ? WHERE id = ?"
      ).run(name, phone, shippingAddress, order.id);
      if (order.status === "paid") {
        const recipients = db
          .prepare("SELECT notify_email FROM admin_keys WHERE notify_email IS NOT NULL AND TRIM(notify_email) != ''")
          .all() as Array<{ notify_email: string }>;
        for (const row of recipients) {
          sendMail(
            row.notify_email,
            "배송지가 변경되었습니다",
            `<p>${escapeHtml(order.order_number)} 배송지가 바뀌었습니다.</p><p>${escapeHtml(shippingAddress)}</p>`,
            "ADMIN"
          ).catch(() => {});
        }
      }
      res.json({
        success: true,
        customer_name: name,
        customer_phone: phone,
        shipping_address: shippingAddress,
      });
    } catch {
      res.status(500).json({ error: "배송지를 바꾸지 못했습니다." });
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
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ error: "환불 사유를 입력해주세요." });
    try {
      const order = db
        .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
        .get(id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      if (["refunded", "cancelled"].includes(order.status)) {
        return res.status(400).json({ error: "이미 환불된 주문입니다." });
      }
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as any[];
      const openItems = items.filter((item) => !["refunded", "refund_requested"].includes(item.item_status || "normal"));
      const picks = Array.isArray(req.body?.items) ? req.body.items : [];
      const selected = (picks.length ? openItems.filter((item) => picks.some((pick: any) => Number(pick.id) === Number(item.id))) : openItems).map(
        (item) => {
          const pick = picks.find((row: any) => Number(row.id) === Number(item.id));
          return {
            ...item,
            refund_quantity: Math.min(Number(item.quantity) || 0, Number(pick?.quantity) || Number(item.quantity) || 0),
          };
        }
      );
      if (selected.length === 0) return res.status(400).json({ error: "환불할 상품을 선택해주세요." });
      const quote = quoteCustomerRefund(order, items, selected, false);
      if (quote.amount <= 0 && Number(order.total_amount) > 0) {
        return res.status(400).json({ error: "환불할 금액이 없습니다." });
      }
      if (order.payment_method === "vbank" && order.status !== "pending") {
        const bank = String(req.body?.refund_bank || "").trim();
        const account = String(req.body?.refund_account || "").replace(/\s/g, "");
        const holder = String(req.body?.refund_holder || "").trim();
        if (!bank || !account || !holder) return res.status(400).json({ error: "환불 계좌를 입력해주세요." });
        db.prepare("UPDATE orders SET refund_bank = ?, refund_account = ?, refund_holder = ? WHERE id = ?").run(
          bank,
          encryptText(account),
          holder,
          order.id
        );
      }
      const mark = db.prepare(
        "UPDATE order_items SET item_status = 'refund_requested', refund_quantity = ? WHERE id = ?"
      );
      for (const item of selected) mark.run(item.refund_quantity || item.quantity, item.id);
      if (order.status !== "refund_requested") {
        db.prepare("UPDATE orders SET resume_status = ? WHERE id = ?").run(order.status, order.id);
      }
      const fresh = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as any;
      if (quote.phase === "before") {
        await cancelTossPaymentIfNeeded(fresh, reason, quote.amount);
        const done = refundOrderTx(order.id, quote.amount, reason);
        sendRefundApproved(
          fresh,
          selected.map((item) => `${item.name} × ${item.refund_quantity || item.quantity}`),
          false
        );
        return res.json({ success: true, status: done.status, refund_amount: quote.amount });
      }
      db.prepare(
        "UPDATE orders SET status = 'refund_requested', refund_reason = ?, refund_amount = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(reason, quote.amount, order.id);
      res.json({ success: true, status: "refund_requested", refund_amount: quote.amount });
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
        const coupon = order.used_coupon_id
          ? (db
              .prepare(
                `SELECT c.name, c.type, c.value
                 FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id WHERE uc.id = ?`
              )
              .get(order.used_coupon_id) as any)
          : null;
        order.coupon_name = coupon?.name || "";
        order.coupon_type = coupon?.type || "";
        order.coupon_value = coupon?.value || 0;
        Object.assign(order, presentOrder(order));
        delete order.toss_secret;
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
      const company = shipping_company || "CJ대한통운";
      const bad = invoiceError(company, tracking_number);
      if (bad) return res.status(400).json({ error: bad });

      db.prepare(
        "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', vbank_account = NULL, shipped_at = COALESCE(shipped_at, CURRENT_TIMESTAMP), status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(String(tracking_number).trim(), company, id);
      await syncShippingDeliveries(Number(id));
      const updated = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status?: string } | undefined;

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

      res.json({ success: true, status: updated?.status || "shipping" });
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
        const left = db
          .prepare("SELECT name, quantity FROM order_items WHERE order_id = ? AND item_status = 'refunded'")
          .all(id) as any[];
        sendRefundApproved(
          order,
          left.map((item) => `${item.name} × ${item.quantity}`),
          false
        );
      } else {
        db.prepare(
          "UPDATE orders SET status = ?, vbank_account = CASE WHEN ? = 'pending' THEN vbank_account ELSE NULL END, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(status, status, id);
      }

      logAdminAction(req, "UPDATE_ORDER_STATUS", "orders", Number(id), `Status changed: ${order.status} -> ${status}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "주문 상태 변경 실패" });
    }
  });

  app.post("/api/admin/orders/:id/claim", authenticateOperator, async (req: any, res) => {
    const { action, waive_fees, pickup } = req.body || {};
    const { id } = req.params;
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as any[];
      const requested = items.filter((item) => item.item_status === "refund_requested");

      if (action === "approve") {
        if (requested.length === 0) {
          return res.status(400).json({ error: "환불 요청된 상품이 없습니다." });
        }
        const selected = requested.map((item) => ({
          ...item,
          refund_quantity: Number(item.refund_quantity) || Number(item.quantity),
        }));
        const quote = quoteCustomerRefund(order, items, selected, Boolean(waive_fees));
        const amount = selected.length ? quote.amount : Number(order.refund_amount) || Number(order.total_amount);
        await cancelTossPaymentIfNeeded(order, order.refund_reason || "클레임 환불 승인", amount);
        refundOrderTx(id, amount, order.refund_reason || "클레임 환불 승인");
        sendRefundApproved(
          order,
          selected.map((item) => `${item.name} × ${item.refund_quantity || item.quantity}`),
          Boolean(pickup) && orderPhase(order) === "after"
        );
      } else {
        db.prepare(
          "UPDATE order_items SET item_status = 'normal', refund_quantity = 0 WHERE order_id = ? AND item_status = 'refund_requested'"
        ).run(id);
        const resume =
          order.resume_status && !["refund_requested", "refunded"].includes(order.resume_status)
            ? order.resume_status
            : "paid";
        db.prepare(
          "UPDATE orders SET status = ?, refund_amount = 0, refund_reason = NULL, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(resume, id);
      }
      logAdminAction(req, "PROCESS_CLAIM", "orders", Number(id), `Claim ${action}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "클레임 처리에 실패했습니다." });
    }
  });

  app.post("/api/admin/orders/:id/partial-refund", authenticateOperator, async (req: any, res) => {
    const picks = Array.isArray(req.body?.items) ? req.body.items : [];
    const reason = String(req.body?.reason || "관리자 부분 취소").trim();
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      if (["refunded", "cancelled", "pending"].includes(order.status)) {
        return res.status(400).json({ error: "이 주문은 부분 취소할 수 없습니다." });
      }
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as any[];
      const selected = items
        .filter((item) => item.item_status !== "refunded" && picks.some((pick: any) => Number(pick.id) === Number(item.id)))
        .map((item) => {
          const pick = picks.find((row: any) => Number(row.id) === Number(item.id));
          return {
            ...item,
            refund_quantity: Math.min(Number(item.quantity) || 0, Number(pick?.quantity) || Number(item.quantity) || 0),
          };
        });
      if (selected.length === 0) return res.status(400).json({ error: "취소할 상품을 선택해주세요." });
      const quote = quoteCustomerRefund(order, items, selected, Boolean(req.body?.waive_fees));
      const mark = db.prepare(
        "UPDATE order_items SET item_status = 'refund_requested', refund_quantity = ? WHERE id = ?"
      );
      for (const item of selected) mark.run(item.refund_quantity || item.quantity, item.id);
      if (order.status !== "refund_requested") {
        db.prepare("UPDATE orders SET resume_status = ? WHERE id = ?").run(order.status, order.id);
      }
      await cancelTossPaymentIfNeeded(order, reason, quote.amount);
      refundOrderTx(
        order.id,
        quote.amount,
        reason,
        selected.map((item) => Number(item.id))
      );
      sendRefundApproved(
        order,
        selected.map((item) => `${item.name} × ${item.refund_quantity || item.quantity}`),
        Boolean(req.body?.pickup) && orderPhase(order) === "after"
      );
      logAdminAction(req, "ADMIN_PARTIAL_REFUND", "orders", Number(order.id), reason);
      res.json({ success: true, refund_amount: quote.amount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "부분 취소에 실패했습니다." });
    }
  });

  app.post("/api/admin/orders/:id/delete", authenticateOperator, async (req: any, res) => {
    if (String(req.body?.confirm || "") !== "삭제") {
      return res.status(400).json({ error: "삭제하려면 삭제 라고 입력해주세요." });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "주문을 찾을 수 없습니다." });
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
      if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });

      if (order.status !== "pending" && order.status !== "refunded") {
        await cancelTossPaymentIfNeeded(order, "관리자 주문 삭제");
        refundOrderTx(id, order.total_amount, "관리자 주문 삭제");
      }

      db.transaction(() => {
        const reviews = db
          .prepare("SELECT user_id, points_earned FROM reviews WHERE order_id = ?")
          .all(id) as any[];
        for (const review of reviews) {
          const points = Number(review.points_earned) || 0;
          if (review.user_id && points > 0) {
            db.prepare("UPDATE users SET points = MAX(0, points - ?) WHERE id = ?").run(
              points,
              review.user_id
            );
            db.prepare(
              "INSERT INTO point_history (user_id, amount, reason, type) VALUES (?, ?, ?, 'USED')"
            ).run(review.user_id, -points, `주문(${order.order_number}) 삭제로 리뷰 포인트 회수`);
          }
        }
        db.prepare("DELETE FROM reviews WHERE order_id = ?").run(id);
        db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
        db.prepare("DELETE FROM orders WHERE id = ?").run(id);
      })();

      logAdminAction(req, "DELETE_ORDER", "orders", id, `Deleted ${order.order_number}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "주문 삭제에 실패했습니다." });
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
  app.post("/api/reviews/image", authenticateUser, (req: any, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: "이미지를 올리지 못했습니다." });
      const file = req.file;
      if (!file) return res.status(400).json({ error: "이미지 파일을 선택해주세요." });
      if (!String(file.mimetype || "").startsWith("image/")) {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ error: "이미지 파일만 올릴 수 있습니다." });
      }
      await toWebp(file);
      res.json({ image_url: `/uploads/${file.filename}` });
    });
  });

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
      const refundedItem = db
        .prepare(
          "SELECT id, item_status FROM order_items WHERE order_id = ? AND product_id = ? ORDER BY CASE item_status WHEN 'refunded' THEN 1 ELSE 0 END"
        )
        .get(order_id, product_id) as any;
      if (!refundedItem || refundedItem.item_status === "refunded" || refundedItem.item_status === "refund_requested") {
        return res.status(400).json({ error: "환불된 상품은 리뷰를 작성할 수 없습니다." });
      }

      const baseDateStr = order.confirmed_at || order.status_updated_at;
      if (baseDateStr) {
        const confirmedAt = new Date(baseDateStr);
        const threeDaysInMs = 14 * 24 * 60 * 60 * 1000;
        if (Date.now() - confirmedAt.getTime() > threeDaysInMs) {
          return res
            .status(400)
            .json({ error: "구매확정 후 14일이 지나 리뷰를 작성할 수 없습니다." });
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
      const viewer = readOptionalUser(req);
      const reviews = db
        .prepare(
          `SELECT r.*, IFNULL(u.name, '익명 회원') as user_name, IFNULL(u.tier, 'BEIGE') as user_tier
           FROM reviews r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.product_id = ?
             AND (IFNULL(r.is_hidden, 0) = 0 OR r.user_id = ?)
           ORDER BY r.is_best DESC, r.created_at DESC`
        )
        .all(req.params.id, viewer?.id ?? -1);
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

  app.post("/api/admin/reviews/:id/visibility", authenticateCS, (req: any, res) => {
    const hidden = req.body.hidden ? 1 : 0;
    try {
      const result = db
        .prepare("UPDATE reviews SET is_hidden = ? WHERE id = ?")
        .run(hidden, req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "리뷰를 찾을 수 없습니다." });
      }
      logAdminAction(
        req,
        hidden ? "HIDE_REVIEW" : "SHOW_REVIEW",
        "reviews",
        Number(req.params.id),
        hidden ? "Hidden from public, visible to author" : "Shown publicly"
      );
      res.json({ success: true, is_hidden: hidden });
    } catch {
      res.status(500).json({ error: "리뷰 공개 설정에 실패했습니다." });
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

  app.post("/api/admin/users/:id/tier", authenticateAdmin, (req: any, res) => {
    const tier = String(req.body?.tier || "").toUpperCase();
    if (!TIER_ORDER.includes(tier)) {
      return res.status(400).json({ error: "유효하지 않은 회원 등급입니다." });
    }
    try {
      const targetUser = db
        .prepare("SELECT id, tier FROM users WHERE id = ?")
        .get(req.params.id) as { id: number; tier: string } | undefined;
      if (!targetUser) return res.status(404).json({ error: "회원을 찾을 수 없습니다." });

      db.prepare(
        "UPDATE users SET tier = ?, tier_manual = 1, tier_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(tier, targetUser.id);
      logAdminAction(
        req,
        "UPDATE_USER_TIER",
        "users",
        targetUser.id,
        `Tier set to ${tier}`,
        { before: targetUser.tier, after: tier }
      );
      res.json({ success: true, tier });
    } catch {
      res.status(500).json({ error: "회원 등급 변경에 실패했습니다." });
    }
  });

  app.get("/api/admin/dashboard/stats", authenticateCS, (_req, res) => {
    try {
      const dailySales = db
        .prepare(
          "SELECT SUM(total_amount) as amount FROM orders WHERE date(created_at, '+9 hours') = date('now', '+9 hours') AND status IN ('paid', 'shipping', 'delivered', 'completed', 'preparing')"
        )
        .get() as any;
      const weeklySales = db
        .prepare(
          "SELECT SUM(total_amount) as amount FROM orders WHERE datetime(created_at) > datetime('now', '-7 days') AND status IN ('paid', 'shipping', 'delivered', 'completed', 'preparing')"
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
        delayedShipping:
          (
            db
              .prepare(
                `SELECT COUNT(*) as count FROM orders
                 WHERE status = 'shipping'
                   AND datetime(COALESCE(shipped_at, status_updated_at)) < datetime('now', '-5 days')`
              )
              .get() as any
          )?.count || 0,
      });
    } catch {
      res.status(500).json({ error: "대시보드 통계 조회 실패" });
    }
  });

  app.get("/api/admin/dashboard/chart-data", authenticateCS, (_req, res) => {
    try {
      const salesData = db
        .prepare(
          `SELECT date(created_at, '+9 hours') as date, SUM(total_amount) as amount
           FROM orders
           WHERE datetime(created_at) > datetime('now', '-30 days')
             AND status IN ('paid', 'shipping', 'delivered', 'completed', 'preparing')
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
    async (req: any, res) => {
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
              .map((s) => s.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, ""));
            if (
              !order_number ||
              order_number === "주문번호" ||
              !tracking_number ||
              tracking_number === "운송장번호" ||
              (order_number === "예시주문번호" &&
                tracking_number === "123456789012" &&
                (shipping_company || "CJ대한통운") === "CJ대한통운")
            ) {
              continue;
            }
            const company = shipping_company || "CJ대한통운";
            const bad = invoiceError(company, tracking_number);
            if (bad) continue;
            const r = db
              .prepare(
                "UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', vbank_account = NULL, shipped_at = COALESCE(shipped_at, CURRENT_TIMESTAMP), status_updated_at = CURRENT_TIMESTAMP WHERE order_number = ?"
              )
              .run(tracking_number, company, order_number);
            updatedCount += r.changes;
          }
        })(lines.slice(1));

        fs.unlinkSync(req.file.path);
        await syncShippingDeliveries();
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
        transfer: 0.01,
      };
      const refunds = db
        .prepare(
          `SELECT payment_method, SUM(COALESCE(refunded_total, 0)) as refunded
           FROM orders
           WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
           GROUP BY payment_method`
        )
        .all(startDate, endDate) as any[];
      const refundMap = new Map(refunds.map((row) => [row.payment_method, Number(row.refunded) || 0]));

      const report = settlements.map((s) => {
        const rate = commissionRates[s.payment_method] || 0.02;
        const gross = Number(s.total_amount) || 0;
        const refunded = refundMap.get(s.payment_method) || 0;
        const supply = Math.round(gross / 1.1);
        const vat = gross - supply;
        const commission = Math.floor(gross * rate);
        return {
          payment_method: s.payment_method,
          total_amount: gross,
          supply_amount: supply,
          vat,
          refunded,
          commission,
          net_amount: gross - commission - refunded,
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

  app.post("/api/admin/display", authenticateAdmin, upload.single("image"), async (req: any, res) => {
    await toWebp(req.file);
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
      const inquiries = db
        .prepare(
          `SELECT i.*,
                  o.id as linked_order_id,
                  o.status as order_status,
                  o.total_amount as order_total,
                  o.customer_name as order_customer_name,
                  o.customer_phone as order_customer_phone,
                  o.tracking_number,
                  o.shipping_company,
                  o.shipping_address,
                  o.refund_reason,
                  o.refund_amount,
                  o.created_at as order_created_at
           FROM inquiries i
           LEFT JOIN orders o ON o.order_number = i.order_number
           ORDER BY i.created_at DESC`
        )
        .all() as any[];
      const getItems = db.prepare(
        "SELECT name, quantity, price FROM order_items WHERE order_id = ?"
      );
      for (const inquiry of inquiries) {
        inquiry.order_items = inquiry.linked_order_id
          ? getItems.all(inquiry.linked_order_id)
          : [];
      }
      res.json(inquiries);
    } catch {
      res.status(500).json({ error: "문의 내역 조회 실패" });
    }
  });

  app.post("/api/uploads/image", (req, res) => {
    if (!allowRate(`upload:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    upload.single("image")(req, res, async (err: any) => {
      if (err || !req.file) return res.status(400).json({ error: "이미지를 올리지 못했습니다." });
      if (!String(req.file.mimetype || "").startsWith("image/")) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "이미지 파일만 올릴 수 있습니다." });
      }
      await toWebp(req.file);
      res.json({ image_url: `/uploads/${req.file.filename}` });
    });
  });

  app.post("/api/inquiries", (req, res) => {
    const { name, email, category, subject, message, order_number, image_url, website } = req.body;
    if (
      honeypotFilled(website) ||
      isSpamBotEmail(email) ||
      isSpamInquiryContent(subject, message)
    ) {
      console.warn(`[SPAM][INQUIRY_BLOCKED] IP: ${clientIp(req)}`);
      return res.json({ success: true });
    }
    if (!allowRate(`inquiry:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "문의 등록 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "모든 항목을 입력해주세요." });
    }

    const needsOrder = category === "배송 문의" || category === "교환/환불 문의";
    let userId: number | null = readOptionalUser(req)?.id || null;
    let linkedOrderNumber: string | null = null;

    if (needsOrder) {
      const viewer = readOptionalUser(req);
      if (!viewer?.id) {
        return res.status(401).json({ error: "배송·교환/환불 문의는 로그인 후 이용할 수 있습니다." });
      }
      if (!order_number) {
        return res.status(400).json({ error: "주문번호를 선택해주세요." });
      }
      const order = db
        .prepare("SELECT id, order_number FROM orders WHERE order_number = ? AND user_id = ?")
        .get(String(order_number), viewer.id) as { id: number; order_number: string } | undefined;
      if (!order) {
        return res.status(400).json({ error: "본인 주문만 문의에 연결할 수 있습니다." });
      }
      userId = viewer.id;
      linkedOrderNumber = order.order_number;
    }

    try {
      db.prepare(
        `INSERT INTO inquiries (category, name, email, subject, message, order_number, user_id, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        category || "상품 문의",
        String(name).trim().slice(0, 80),
        normalizeEmailAddress(email),
        String(subject).trim().slice(0, 200),
        String(message).trim().slice(0, 5000),
        linkedOrderNumber,
        userId,
        String(image_url || "").startsWith("/uploads/") ? String(image_url) : null
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "문의 접수에 실패했습니다." });
    }
  });

  app.post("/api/admin/inquiries/:id/reply", authenticateCS, async (req: any, res) => {
    const { replyMessage } = req.body;
    const { id } = req.params;
    if (!String(replyMessage || "").trim()) {
      return res.status(400).json({ error: "답변 내용을 입력해주세요." });
    }
    const target = db.prepare("SELECT email FROM inquiries WHERE id = ?").get(id) as
      | { email: string }
      | undefined;
    if (target && isSpamBotEmail(target.email)) {
      return res.status(400).json({ error: "이 주소로는 답장을 보내지 않습니다." });
    }

    try {
      const claim = db
        .prepare(
          `UPDATE inquiries
           SET status = 'sending', reply_message = ?
           WHERE id = ? AND IFNULL(status, 'pending') NOT IN ('replied', 'sending')`
        )
        .run(replyMessage, id);

      if (claim.changes !== 1) {
        return res.status(429).json({
          error: "이미 답변 메일이 발송되었거나 발송 중입니다. 같은 문의에는 한 번만 전송됩니다.",
        });
      }

      const inquiry = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as any;
      let orderHtml = "";
      if (inquiry.order_number) {
        const order = db
          .prepare("SELECT * FROM orders WHERE order_number = ?")
          .get(inquiry.order_number) as any;
        if (order) {
          const items = db
            .prepare("SELECT name, quantity, price FROM order_items WHERE order_id = ?")
            .all(order.id) as any[];
          orderHtml = buildOrderEmailHtml(order, items);
        }
      }
      const sent = await sendMail(
        inquiry.email,
        `문의하신 내용에 대한 답변입니다: ${inquiry.subject}`,
        `
        <div style="padding: 24px; background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 12px;">
          <h2 style="font-size: 18px; margin-bottom: 24px;">안녕하세요, ${escapeHtml(inquiry.name)}님.</h2>
          <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
            <p style="font-size: 12px; color: #999;">문의 내용</p>
            <blockquote style="margin: 0; padding: 16px; background-color: #fff; border-left: 2px solid #e5e5e5; font-size: 14px; color: #666;">${escapeHtml(inquiry.message)}</blockquote>
          </div>
          ${orderHtml}
          <div>
            <p style="font-size: 12px; color: #999;">베뉴아 답변</p>
            <p style="font-size: 15px; line-height: 1.8; color: #1a1a1a; white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
          </div>
        </div>
        `,
        "SUPPORT"
      );

      if (!sent) {
        db.prepare(
          "UPDATE inquiries SET status = 'pending' WHERE id = ? AND status = 'sending'"
        ).run(id);
        return res.status(500).json({ error: "답변 발송에 실패했습니다. 다시 한 번만 시도해주세요." });
      }

      db.prepare(
        "UPDATE inquiries SET status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(id);

      logAdminAction(req, "REPLY_INQUIRY", "inquiries", Number(id), `Replied to ${inquiry.email}`);
      res.json({ success: true });
    } catch {
      db.prepare(
        "UPDATE inquiries SET status = 'pending' WHERE id = ? AND status = 'sending'"
      ).run(id);
      res.status(500).json({ error: "답변 발송에 실패했습니다." });
    }
  });

  app.delete("/api/admin/inquiries/:id", authenticateMaster, (req: any, res) => {
    try {
      const result = db.prepare("DELETE FROM inquiries WHERE id = ?").run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "문의를 찾을 수 없습니다." });
      }
      logAdminAction(req, "DELETE_INQUIRY", "inquiries", Number(req.params.id), "Master deleted inquiry");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "문의 삭제에 실패했습니다." });
    }
  });

  app.post("/api/newsletter/subscribe", (req, res) => {
    const { email, website } = req.body;
    if (!email || !String(email).includes("@")) {
      return res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요." });
    }
    if (honeypotFilled(website) || isSpamBotEmail(email)) {
      console.warn(`[SPAM][NEWSLETTER_BLOCKED] IP: ${clientIp(req)}`);
      return res.json({ success: true, message: "뉴스레터 구독이 완료되었습니다." });
    }
    if (!allowRate(`newsletter:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
    }
    try {
      db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)").run(
        normalizeEmailAddress(email)
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
      const rawEmail = String(email || "").trim();
      const normalized = normalizeEmailAddress(rawEmail);
      db.prepare("DELETE FROM newsletter_subscribers WHERE email = ? OR email = ?").run(
        rawEmail,
        normalized
      );
      db.prepare("UPDATE users SET newsletter_subscribed = 0 WHERE email = ? OR email = ?").run(
        rawEmail,
        normalized
      );
      res.json({ success: true, message: "수신 거부가 처리되었습니다." });
    } catch {
      res.status(500).json({ error: "수신 거부 처리에 실패했습니다." });
    }
  });

  app.post("/api/admin/newsletter/send", authenticateAdmin, async (req, res) => {
    const { subject, content, test_email, audience } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ error: "제목과 본문을 모두 입력해주세요." });
    }
    try {
      const testEmail = String(test_email || "").trim().toLowerCase();
      const group = String(audience || "all");
      const guestEmails = (
        db.prepare("SELECT email FROM newsletter_subscribers").all() as Array<{ email: string }>
      ).map((s) => s.email);
      const userSql =
        group === "vip"
          ? "SELECT email FROM users WHERE newsletter_subscribed = 1 AND UPPER(tier) IN ('BLACK', 'THE_BLACK')"
          : group === "dormant"
            ? `SELECT email FROM users WHERE newsletter_subscribed = 1 AND id NOT IN (
                 SELECT user_id FROM orders WHERE user_id IS NOT NULL AND created_at > datetime('now', '-90 days')
               )`
            : "SELECT email FROM users WHERE newsletter_subscribed = 1";
      const userEmails = (db.prepare(userSql).all() as Array<{ email: string }>).map((u) => u.email);
      const allEmails = testEmail
        ? [testEmail]
        : [...new Set([...(group === "all" ? guestEmails : []), ...userEmails])]
            .filter((email) => email && !isSpamBotEmail(email));

      const host = req.get("host") || "benua.shop";
      const mainDomainHost = host.startsWith("dash.") ? host.replace("dash.", "") : host;

      await sendInBatches(
        allEmails.map((email) => () => {
          const encodedEmail = Buffer.from(email).toString("base64");
          const unsubLink = `https://${mainDomainHost}/unsubscribe?token=${encodedEmail}`;
          return sendMail(
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
        })
      );

      if (!testEmail) {
        db.prepare("INSERT INTO newsletter_logs (subject, body, audience, sent_count) VALUES (?, ?, ?, ?)").run(
          subject,
          content,
          group,
          allEmails.length
        );
      }
      res.json({ success: true, count: allEmails.length });
    } catch {
      res.status(500).json({ error: "뉴스레터 발송 실패" });
    }
  });

  app.post("/api/webhooks/resend", async (req: any, res) => {
    try {
      const raw = req.rawBody || JSON.stringify(req.body || {});
      if (!verifyResendWebhook(raw, req.headers)) {
        return res.status(401).json({ error: "서명 확인에 실패했습니다." });
      }
      if (req.body?.type !== "email.received") return res.json({ ok: true, ignored: true });
      const emailId = req.body?.data?.email_id;
      if (!emailId) return res.status(400).json({ error: "email_id가 없습니다." });
      const email = await fetchReceivedEmail(emailId);
      if (!email.received_for && req.body.data.received_for) email.received_for = req.body.data.received_for;
      if ((!email.to || email.to.length === 0) && req.body.data.to) email.to = req.body.data.to;
      const saved = saveInboundEmail(email);
      res.json({ ok: true, saved });
    } catch (err) {
      console.error("[INBOUND]", err instanceof Error ? err.message : err);
      res.status(500).json({ error: "받은 메일 저장에 실패했습니다." });
    }
  });

  app.get("/api/admin/inbox", authenticateCS, (_req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT id, resend_id, from_address, to_addresses, subject, attachments, received_at, is_read, created_at
           FROM inbound_emails
           ORDER BY COALESCE(received_at, created_at) DESC`
        )
        .all();
      res.json(rows);
    } catch {
      res.status(500).json({ error: "받은 메일 조회에 실패했습니다." });
    }
  });

  app.get("/api/admin/inbox/:id", authenticateCS, (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM inbound_emails WHERE id = ?").get(req.params.id) as any;
      if (!row) return res.status(404).json({ error: "메일을 찾을 수 없습니다." });
      db.prepare("UPDATE inbound_emails SET is_read = 1 WHERE id = ?").run(req.params.id);
      res.json({ ...row, is_read: 1 });
    } catch {
      res.status(500).json({ error: "메일 조회에 실패했습니다." });
    }
  });

  app.post("/api/admin/inbox/:id/reply", authenticateCS, async (req: any, res) => {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "답장 내용을 입력해주세요." });
    try {
      const row = db.prepare("SELECT * FROM inbound_emails WHERE id = ?").get(req.params.id) as any;
      if (!row) return res.status(404).json({ error: "메일을 찾을 수 없습니다." });
      const match = String(row.from_address || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const to = match?.[0] || "";
      if (!to) return res.status(400).json({ error: "답장할 이메일 주소가 없습니다." });
      const originalSubject = String(row.subject || "문의").trim();
      const subject = /^re:/i.test(originalSubject) ? originalSubject : `Re: ${originalSubject}`;
      const sent = await sendMail(
        to,
        subject,
        `<p style="white-space: pre-line; line-height: 1.7;">${escapeHtml(message)}</p>`,
        "SUPPORT",
        true
      );
      if (!sent) return res.status(500).json({ error: "답장을 보내지 못했습니다." });
      db.prepare("UPDATE inbound_emails SET replied_at = ?, reply_body = ? WHERE id = ?").run(
        new Date().toISOString(),
        message,
        row.id
      );
      logAdminAction(req, "REPLY_INBOX", "inbound_emails", Number(row.id), `Replied to ${to}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "답장을 보내지 못했습니다." });
    }
  });

  app.post("/api/admin/inbox/sync", authenticateCS, async (_req, res) => {
    try {
      const items = await listReceivedEmails();
      let saved = 0;
      for (const item of items) {
        if (!isSupportInboxMail(item)) continue;
        const full = await fetchReceivedEmail(item.id);
        if (!full.received_for && item.received_for) full.received_for = item.received_for;
        if (saveInboundEmail(full)) saved += 1;
      }
      res.json({ success: true, saved, scanned: items.length });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "받은 메일을 가져오지 못했습니다.",
      });
    }
  });

  setInterval(() => {
    const now = Date.now();
    for (const [key, times] of rateBuckets) {
      const recent = times.filter((at) => now - at < 60 * 60 * 1000);
      if (recent.length === 0) rateBuckets.delete(key);
      else rateBuckets.set(key, recent);
    }
  }, 10 * 60 * 1000);

  app.get("/api/orders/:id/tracking", authenticateUser, async (req: any, res, next) => {
    if (!/^\d+$/.test(String(req.params.id))) return next();
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id) as any;
    if (!order?.tracking_number) return res.status(404).json({ error: "운송장이 없습니다." });
    const info = await loadTracking(order);
    if (trackingIsDelivered(info) && order.status === "shipping") markOrderDelivered(order.id);
    res.json({ company: order.shipping_company, invoice: order.tracking_number, info });
  });

  app.get("/api/orders/track/:orderNumber/tracking", async (req, res) => {
    const normalizePhone = (value: unknown) => {
      let digits = String(value || "").replace(/\D/g, "");
      if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
      return digits;
    };
    const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(req.params.orderNumber) as any;
    if (!order || normalizePhone(order.customer_phone) !== normalizePhone(req.query.phone)) {
      return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
    }
    if (!order.tracking_number) return res.status(404).json({ error: "운송장이 없습니다." });
    const info = await loadTracking(order);
    if (trackingIsDelivered(info) && order.status === "shipping") markOrderDelivered(order.id);
    res.json({ company: order.shipping_company, invoice: order.tracking_number, info });
  });

  app.post("/api/orders/:id/partial-refund", authenticateUser, async (req: any, res) => {
    const picks = Array.isArray(req.body?.items) ? req.body.items : [];
    const reason = String(req.body?.reason || "부분 반품");
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id) as any;
    if (!order) return res.status(404).json({ error: "주문을 찾을 수 없습니다." });
    let amount = 0;
    for (const pick of picks) {
      const item = db
        .prepare("SELECT * FROM order_items WHERE id = ? AND order_id = ?")
        .get(pick.id, order.id) as any;
      if (!item) continue;
      const qty = Math.min(Number(item.quantity) || 0, Math.max(1, Number(pick.quantity) || 1));
      amount += Number(item.price) * qty;
      db.prepare(
        "UPDATE order_items SET item_status = 'refund_requested', refund_quantity = ? WHERE id = ?"
      ).run(qty, item.id);
    }
    if (amount <= 0) return res.status(400).json({ error: "반품할 상품을 선택해주세요." });
    if (order.status !== "refund_requested") {
      db.prepare("UPDATE orders SET resume_status = ? WHERE id = ?").run(order.status, order.id);
    }
    db.prepare(
      "UPDATE orders SET status = 'refund_requested', refund_reason = ?, refund_amount = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(reason, amount, order.id);
    res.json({ success: true, refund_amount: amount });
  });

  app.put("/api/auth/password", authenticateUser, (req: any, res) => {
    const current = String(req.body?.current || "");
    const next = String(req.body?.next || "");
    if (next.length < 8) return res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user || !verifyPassword(current, user.password)) {
      return res.status(400).json({ error: "현재 비밀번호가 맞지 않습니다." });
    }
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(next), user.id);
    res.json({ success: true });
  });

  app.post("/api/auth/unlink", authenticateUser, (req: any, res) => {
    const provider = String(req.body?.provider || "");
    const column = provider === "google" ? "google_id" : provider === "naver" ? "naver_id" : provider === "kakao" ? "kakao_id" : "";
    if (!column) return res.status(400).json({ error: "연결을 해제할 계정을 확인해주세요." });
    db.prepare(`UPDATE users SET ${column} = NULL WHERE id = ?`).run(req.user.id);
    res.json({ success: true });
  });

  app.post("/api/coupons/claim", authenticateUser, (req: any, res) => {
    const code = String(req.body?.code || "").trim();
    const coupon = db.prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1").get(code) as any;
    if (!coupon) return res.status(404).json({ error: "쿠폰 코드를 확인해주세요." });
    const exists = db
      .prepare("SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND is_used = 0")
      .get(req.user.id, coupon.id);
    if (exists) return res.status(400).json({ error: "이미 가진 쿠폰입니다." });
    const days = Number(coupon.valid_days) || 0;
    const expires = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    db.prepare("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)").run(
      req.user.id,
      coupon.id,
      expires
    );
    res.json({ success: true });
  });

  app.get("/api/cart", authenticateUser, (req: any, res) => {
    const items = db
      .prepare(
        `SELECT c.product_id as id, c.quantity, IFNULL(c.option_id, 0) as option_id,
                p.name, p.price, p.image_url, p.discount_rate, p.stock, p.sale_mode,
                o.name as option_name, IFNULL(o.extra_price, 0) as extra_price, o.stock as option_stock
         FROM carts c JOIN products p ON p.id = c.product_id
         LEFT JOIN product_options o ON o.id = c.option_id
         WHERE c.user_id = ?`
      )
      .all(req.user.id);
    res.json(items);
  });

  app.put("/api/cart", authenticateUser, (req: any, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const current = req.body?.replace
      ? []
      : (db.prepare("SELECT product_id, quantity, option_id FROM carts WHERE user_id = ?").all(req.user.id) as any[]);
    const merged = new Map<string, any>();
    for (const item of [...current, ...items]) {
      const key = `${item.id || item.product_id}:${item.option_id || 0}`;
      const prev = merged.get(key);
      merged.set(key, {
        id: Number(item.id || item.product_id),
        option_id: Number(item.option_id) || 0,
        quantity: Math.max(prev?.quantity || 0, Number(item.quantity) || 1),
      });
    }
    db.prepare("DELETE FROM carts WHERE user_id = ?").run(req.user.id);
    const insert = db.prepare(
      "INSERT INTO carts (user_id, product_id, quantity, option_id) VALUES (?, ?, ?, ?)"
    );
    for (const item of merged.values()) {
      if (item.id) insert.run(req.user.id, item.id, item.quantity, item.option_id);
    }
    res.json({ success: true });
  });

  app.get("/api/addresses", authenticateUser, (req: any, res) => {
    res.json(db.prepare("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC").all(req.user.id));
  });

  app.post("/api/addresses", authenticateUser, (req: any, res) => {
    const body = req.body || {};
    if (body.is_default) db.prepare("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?").run(req.user.id);
    const info = db
      .prepare(
        "INSERT INTO user_addresses (user_id, label, name, phone, zipcode, address, detail_address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        req.user.id,
        body.label || "",
        body.name || "",
        body.phone || "",
        body.zipcode || "",
        body.address || "",
        body.detail_address || "",
        body.is_default ? 1 : 0
      );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/addresses/:id", authenticateUser, (req: any, res) => {
    db.prepare("DELETE FROM user_addresses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.get("/api/products/:id/questions", (req, res) => {
    const viewer = readOptionalUser(req);
    const rows = db
      .prepare("SELECT * FROM product_questions WHERE product_id = ? ORDER BY id DESC")
      .all(req.params.id) as any[];
    res.json(
      rows.map((row) => ({
        ...row,
        question: row.is_secret && row.user_id !== viewer?.id ? "비밀글입니다." : row.question,
      }))
    );
  });

  app.post("/api/products/:id/questions", authenticateUser, (req: any, res) => {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "질문을 입력해주세요." });
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id) as any;
    db.prepare(
      "INSERT INTO product_questions (product_id, user_id, author, question, is_secret) VALUES (?, ?, ?, ?, ?)"
    ).run(req.params.id, req.user.id, user?.name || "회원", question, req.body?.secret ? 1 : 0);
    res.json({ success: true });
  });

  app.post("/api/admin/questions/:id/answer", authenticateCS, (req: any, res) => {
    const answer = String(req.body?.answer || "");
    const row = db
      .prepare(
        `SELECT q.*, u.email, p.name as product_name FROM product_questions q
         LEFT JOIN users u ON u.id = q.user_id
         LEFT JOIN products p ON p.id = q.product_id
         WHERE q.id = ?`
      )
      .get(req.params.id) as any;
    db.prepare("UPDATE product_questions SET answer = ? WHERE id = ?").run(answer, req.params.id);
    if (row?.email && answer.trim()) {
      sendMail(
        row.email,
        "상품 문의에 답변이 등록되었습니다",
        `<p>질문: ${escapeHtml(row.question || "")}</p><p>답변: ${escapeHtml(answer)}</p><p><a href="https://benua.shop/product/${row.product_id}">${escapeHtml(row.product_name || "상품 보기")}</a></p>`,
        "SUPPORT",
        true
      ).catch(() => {});
    }
    res.json({ success: true });
  });

  app.get("/api/inquiries/me", authenticateUser, (req: any, res) => {
    res.json(db.prepare("SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id));
  });

  app.get("/api/admin/badges", authenticateCS, (_req, res) => {
    const orders = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('paid', 'preparing', 'refund_requested')")
      .get() as any;
    const inquiries = db
      .prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'pending' OR reply_message IS NULL OR reply_message = ''")
      .get() as any;
    const mail = db.prepare("SELECT COUNT(*) as count FROM inbound_emails WHERE is_read = 0").get() as any;
    res.json({ orders: orders.count || 0, inquiries: inquiries.count || 0, mail: mail.count || 0 });
  });

  app.get("/api/admin/settings", authenticateAdmin, (_req, res) => {
    res.json(db.prepare("SELECT * FROM shop_settings").all());
  });

  app.put("/api/admin/settings", authenticateAdmin, (req: any, res) => {
    const put = db.prepare("INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    for (const [key, value] of Object.entries(req.body || {})) put.run(key, String(value));
    res.json({ success: true });
  });

  app.delete("/api/admin/inbox/:id", authenticateCS, (req: any, res) => {
    db.prepare("DELETE FROM inbound_emails WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/products/:id/images", authenticateAdmin, upload.array("images", 8), async (req: any, res) => {
    const files = (req.files || []) as Express.Multer.File[];
    await toWebpMany(files);
    const insert = db.prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)");
    files.forEach((file, index) => insert.run(req.params.id, `/uploads/${file.filename}`, index));
    res.json({ success: true });
  });

  app.post("/api/admin/products/:id/options", authenticateAdmin, (req: any, res) => {
    const info = db
      .prepare("INSERT INTO product_options (product_id, name, extra_price, stock) VALUES (?, ?, ?, ?)")
      .run(req.params.id, req.body?.name || "", Number(req.body?.extra_price) || 0, Number(req.body?.stock) || 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/admin/options/:id", authenticateAdmin, (req: any, res) => {
    db.prepare("DELETE FROM product_options WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/questions", authenticateCS, (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT q.*, p.name as product_name FROM product_questions q
           LEFT JOIN products p ON p.id = q.product_id
           ORDER BY q.id DESC LIMIT 100`
        )
        .all()
    );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const products = db.prepare("SELECT id FROM products").all() as Array<{ id: number }>;
    const urls = ["/", "/shop", "/about", "/contact", ...products.map((p) => `/product/${p.id}`)]
      .map((url) => `<url><loc>https://benua.shop${url}</loc></url>`)
      .join("");
    res.type("xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text").send("User-agent: *\nAllow: /\nSitemap: https://benua.shop/sitemap.xml\n");
  });

  app.get("/api/shipping/extra", (req, res) => {
    res.json({
      extra: extraShippingFee(String(req.query.zip || "")),
      shipping_fee: shopSetting("shipping_fee", 3000),
      free_min: shopSetting("free_min", 50000),
    });
  });

  app.get("/api/health", (_req, res) => {
    try {
      db.prepare("SELECT 1").get();
      res.json({ status: "ok", db: "ok", time: new Date().toISOString() });
    } catch {
      res.status(500).json({ status: "error", db: "down", time: new Date().toISOString() });
    }
  });

  app.post("/api/products/:id/cart-hit", (req, res) => {
    db.prepare("UPDATE products SET cart_count = IFNULL(cart_count, 0) + 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/admin/products/:id/display", authenticateAdmin, (req: any, res) => {
    const sort = Math.floor(Number(req.body?.sort_order) || 0);
    const pinned = req.body?.pinned ? 1 : 0;
    const tags = String(req.body?.tags || "");
    db.prepare("UPDATE products SET sort_order = ?, pinned = ?, tags = ? WHERE id = ?").run(sort, pinned, tags, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/products/:id/duplicate", authenticateAdmin, (req: any, res) => {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    const info = db
      .prepare(
        `INSERT INTO products (name, price, description, image_url, description_image_url, category, stock, material, dimensions, origin, manufacturer, discount_rate, show_on_main, sale_mode, tags, sort_order, pinned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0)`
      )
      .run(
        `${product.name} 복사`,
        product.price,
        product.description,
        product.image_url,
        product.description_image_url,
        product.category,
        product.stock,
        product.material,
        product.dimensions,
        product.origin,
        product.manufacturer,
        product.discount_rate,
        product.sale_mode || "open",
        product.tags || "",
        product.sort_order || 0
      );
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/admin/funnel", authenticateAdmin, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT p.id, p.name, IFNULL(p.view_count, 0) as views, IFNULL(p.cart_count, 0) as carts,
                (SELECT COUNT(*) FROM wishlists w WHERE w.product_id = p.id) as wishes,
                (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                  WHERE oi.product_id = p.id AND o.status IN ('paid','preparing','shipping','delivered','completed')) as sold
         FROM products p ORDER BY views DESC`
      )
      .all();
    res.json(rows);
  });

  app.get("/api/admin/stock-logs", authenticateAdmin, (req, res) => {
    const rows = db
      .prepare(
        `SELECT l.*, p.name as product_name FROM stock_logs l
         LEFT JOIN products p ON p.id = l.product_id
         ORDER BY l.id DESC LIMIT 200`
      )
      .all();
    res.json(rows);
  });

  app.get("/api/admin/newsletter/logs", authenticateAdmin, (_req, res) => {
    res.json(db.prepare("SELECT id, subject, audience, sent_count, created_at FROM newsletter_logs ORDER BY id DESC LIMIT 50").all());
  });

  app.get("/api/admin/reply-templates", authenticateCS, (_req, res) => {
    res.json(db.prepare("SELECT * FROM reply_templates ORDER BY id DESC").all());
  });

  app.post("/api/admin/reply-templates", authenticateCS, (req: any, res) => {
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!title || !body) return res.status(400).json({ error: "제목과 문구를 입력해주세요." });
    const info = db.prepare("INSERT INTO reply_templates (title, body) VALUES (?, ?)").run(title, body);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/admin/reply-templates/:id", authenticateCS, (req: any, res) => {
    db.prepare("DELETE FROM reply_templates WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/reviews/:id/reply", authenticateCS, (req: any, res) => {
    db.prepare("UPDATE reviews SET admin_reply = ?, admin_replied_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      String(req.body?.admin_reply || ""),
      req.params.id
    );
    res.json({ success: true });
  });

  app.post("/api/admin/orders/combine-tracking", authenticateOperator, (req: any, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: any) => Number(id)).filter(Boolean) : [];
    const company = String(req.body?.shipping_company || "CJ대한통운");
    const number = String(req.body?.tracking_number || "").trim();
    const bad = invoiceError(company, number);
    if (!ids.length) return res.status(400).json({ error: "묶을 주문을 선택해주세요." });
    if (bad) return res.status(400).json({ error: bad });
    const marks = ids.map(() => "?").join(",");
    db.prepare(
      `UPDATE orders SET tracking_number = ?, shipping_company = ?, status = 'shipping', shipped_at = COALESCE(shipped_at, CURRENT_TIMESTAMP), status_updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${marks}) AND status = 'paid'`
    ).run(number, company, ...ids);
    res.json({ success: true });
  });

  app.post("/api/admin/orders/:id/return-tracking", authenticateOperator, (req: any, res) => {
    const company = String(req.body?.return_carrier || "CJ대한통운");
    const number = String(req.body?.return_tracking_number || "").trim();
    const bad = invoiceError(company, number);
    if (bad) return res.status(400).json({ error: bad });
    db.prepare("UPDATE orders SET return_carrier = ?, return_tracking_number = ? WHERE id = ?").run(company, number, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/orders/:id/return-tracking", authenticateUser, (req: any, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id) as any;
    if (!order?.return_tracking_number) return res.status(404).json({ error: "회수 운송장이 없습니다." });
    res.json({ company: order.return_carrier, invoice: order.return_tracking_number });
  });

  app.get("/api/gift/:token", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE gift_token = ? AND is_gift = 1").get(req.params.token) as any;
    if (!order) return res.status(404).json({ error: "선물 링크가 없습니다." });
    const items = db.prepare("SELECT name, quantity, image_url FROM order_items WHERE order_id = ?").all(order.id);
    res.json({
      order_number: order.order_number,
      gift_message: order.gift_message,
      filled: order.shipping_address && order.shipping_address !== "선물 수령 대기",
      items,
    });
  });

  app.post("/api/gift/:token", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE gift_token = ? AND is_gift = 1").get(req.params.token) as any;
    if (!order) return res.status(404).json({ error: "선물 링크가 없습니다." });
    if (!["pending", "paid", "preparing"].includes(order.status)) {
      return res.status(400).json({ error: "주소를 바꿀 수 있는 상태가 아닙니다." });
    }
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const address = String(req.body?.address || "").trim();
    if (!name || !phone || !address) return res.status(400).json({ error: "이름, 연락처, 주소를 입력해주세요." });
    const full = `[${String(req.body?.zipcode || "").trim()}] ${address} ${String(req.body?.detail_address || "").trim()}`.trim();
    db.prepare(
      "UPDATE orders SET customer_name = ?, customer_phone = ?, shipping_address = ?, shipping_memo = ? WHERE id = ?"
    ).run(name, phone, full, String(req.body?.shipping_memo || order.shipping_memo || "").slice(0, 200), order.id);
    res.json({ success: true });
  });

  app.get("/api/admin/system", authenticateAdmin, (_req, res) => {
    const dbPath = path.join(process.cwd(), "benua.db");
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    let uploadBytes = 0;
    if (fs.existsSync(uploadsDir)) {
      for (const name of fs.readdirSync(uploadsDir)) {
        try {
          uploadBytes += fs.statSync(path.join(uploadsDir, name)).size;
        } catch {
          /* skip */
        }
      }
    }
    const backupDir = path.join(process.cwd(), "backups");
    let lastBackup: string | null = null;
    if (fs.existsSync(backupDir)) {
      const files = fs
        .readdirSync(backupDir)
        .map((name) => ({ name, time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
      if (files[0]) lastBackup = new Date(files[0].time).toISOString();
    }
    res.json({
      db_bytes: dbSize,
      upload_bytes: uploadBytes,
      last_backup: lastBackup,
      toss: Boolean(process.env.TOSS_SECRET_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      sweettracker: Boolean(process.env.SWEETTRACKER_API_KEY || process.env.SWEET_TRACKER_KEY),
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
      naver: Boolean(process.env.NAVER_CLIENT_ID),
      kakao: Boolean(process.env.KAKAO_CLIENT_ID),
    });
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
    const spaExact = new Set([
      "/",
      "/shop",
      "/about",
      "/contact",
      "/terms",
      "/privacy",
      "/cart",
      "/checkout",
      "/track",
      "/profile",
      "/login",
      "/verify-email",
      "/unsubscribe",
      "/reset-password",
      "/gift",
    ]);
    app.get("*", (req, res) => {
      const host = String(req.hostname || "");
      const onAdminHost = host.startsWith("dash.") || host.startsWith("admin.");
      const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(req.path);
      const known =
        spaExact.has(req.path) ||
        req.path.startsWith("/product/") ||
        req.path.startsWith("/gift/") ||
        req.path.startsWith("/admin") ||
        (onAdminHost && !looksLikeFile);
      const file = path.join(distPath, "index.html");
      const productMatch = req.path.match(/^\/product\/(\d+)/);
      if (productMatch) {
        const product = db.prepare("SELECT name, description, image_url FROM products WHERE id = ?").get(productMatch[1]) as any;
        if (product) {
          let html = fs.readFileSync(file, "utf8");
          const image = String(product.image_url || "").startsWith("http")
            ? product.image_url
            : `https://benua.shop${product.image_url || ""}`;
          html = html
            .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(product.name)} | Benua</title>`)
            .replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${escapeHtml(product.name)}"`)
            .replace(/property="og:description" content="[^"]*"/, `property="og:description" content="${escapeHtml(String(product.description || "").slice(0, 120))}"`)
            .replace(/property="og:image" content="[^"]*"/, `property="og:image" content="${escapeHtml(image)}"`);
          res.status(200).type("html").send(html);
          return;
        }
      }
      res.status(known ? 200 : 404).sendFile(file);
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[SHUTDOWN] ${signal}`);
    server.close(() => {
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
        db.close();
      } catch (err) {
        console.error("[SHUTDOWN]", err);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer();