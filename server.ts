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
`);

// Add columns to existing products table if they don't exist (SQLite ALTER TABLE limitation workaround)
try { db.exec(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN material TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN dimensions TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE products ADD COLUMN origin TEXT`); } catch(e) {}

const JWT_SECRET = process.env.JWT_SECRET || "benua-secret-key-2024";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // Plain text password from .env

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

  // --- API Routes ---

  // Auth
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    
    if (!ADMIN_PASSWORD) {
      return res.status(500).json({ error: "Admin password not configured in .env" });
    }

    // Compare input hash with stored plain password's hash
    const inputHash = hashPassword(password);
    const targetHash = hashPassword(ADMIN_PASSWORD);
    
    if (inputHash === targetHash) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      return res.json({ success: true });
    } else {
      return res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  app.get("/api/admin/check", authenticateAdmin, (req, res) => {
    res.json({ authenticated: true });
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
