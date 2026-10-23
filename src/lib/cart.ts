import { apiFetch } from "./api";

export type LocalCartItem = {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  image?: string;
  option_id?: number;
  option_name?: string;
  category?: string;
};

const KEY = "benua_cart";

export function cartKey(item: { id?: number | string; option_id?: number }) {
  return `${item.id}:${item.option_id || 0}`;
}

export function readLocalCart(): LocalCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export async function saveCart(items: LocalCartItem[], mode: "merge" | "replace" = "replace") {
  writeLocalCart(items);
  const me = await apiFetch("/api/auth/me");
  if (!me.ok) return;
  await apiFetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      replace: mode === "replace",
      items: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        option_id: item.option_id || 0,
      })),
    }),
  }).catch(() => {});
}

export function rememberProduct(product: { id: number | string; name: string; image_url?: string; price?: number }) {
  try {
    const prev = JSON.parse(localStorage.getItem("benua_recent") || "[]");
    const list = Array.isArray(prev) ? prev : [];
    const next = [
      { id: product.id, name: product.name, image_url: product.image_url || "", price: product.price || 0 },
      ...list.filter((item) => String(item.id) !== String(product.id)),
    ].slice(0, 10);
    localStorage.setItem("benua_recent", JSON.stringify(next));
    window.dispatchEvent(new Event("recent-updated"));
  } catch {
    /* ignore */
  }
}

export function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem("benua_recent") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function mergeServerCart() {
  const local = readLocalCart();
  const me = await apiFetch("/api/auth/me");
  if (!me.ok) return local;
  const put = await apiFetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: local.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        option_id: item.option_id || 0,
      })),
    }),
  });
  if (!put.ok) return local;
  const got = await apiFetch("/api/cart");
  if (!got.ok) return local;
  const rows = await got.json();
  if (!Array.isArray(rows)) return local;
  const next: LocalCartItem[] = rows
    .filter((row) => row.sale_mode !== "preorder" && Number(row.stock) > 0)
    .map((row) => {
      const rate = Number(row.discount_rate) || 0;
      const base = rate > 0 && rate < 100 ? Math.round(Number(row.price) * (1 - rate / 100)) : Number(row.price);
      const optionStock = row.option_stock == null ? Number(row.stock) : Number(row.option_stock);
      return {
        id: row.id,
        name: row.option_name ? `${row.name} (${row.option_name})` : row.name,
        price: base + (Number(row.extra_price) || 0),
        quantity: Math.min(Number(row.quantity) || 1, optionStock || Number(row.quantity) || 1),
        stock: optionStock || Number(row.stock) || 0,
        image: row.image_url,
        option_id: Number(row.option_id) || 0,
        option_name: row.option_name || "",
      };
    });
  writeLocalCart(next);
  return next;
}
