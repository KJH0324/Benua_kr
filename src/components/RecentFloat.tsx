import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearRecent, forgetRecent, readLocalCart, readRecent, saveCart } from "../lib/cart";
import { apiFetch } from "../lib/api";

export default function RecentFloat() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = () => setItems(readRecent());
    load();
    window.addEventListener("recent-updated", load);
    return () => window.removeEventListener("recent-updated", load);
  }, []);

  if (items.length === 0) return null;

  const addOne = async (item: any) => {
    const res = await apiFetch(`/api/products/${item.id}`);
    const product = res.ok ? await res.json().catch(() => null) : null;
    if (!product || (product.options || []).length > 0) {
      window.location.href = `/product/${item.id}`;
      return;
    }
    const cart = readLocalCart();
    const found = cart.find((row) => String(row.id) === String(item.id) && !row.option_id);
    const next = found
      ? cart.map((row) => (row === found ? { ...row, quantity: row.quantity + 1 } : row))
      : [...cart, { id: item.id, name: item.name, price: item.price || product.price, quantity: 1, image: item.image_url }];
    await saveCart(next, "replace");
    apiFetch(`/api/products/${item.id}/cart-hit`, { method: "POST" }).catch(() => {});
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {open && (
        <div className="mb-2 w-64 rounded-2xl bg-[#faf2e7] border border-black/10 p-3 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#463221]">최근 본 상품</p>
            <button type="button" onClick={clearRecent} className="text-[11px] text-[#463221]">
              전체 비우기
            </button>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center">
              <Link to={`/product/${item.id}`} onClick={() => setOpen(false)} className="flex gap-2 items-center min-w-0 flex-1">
                {item.image_url ? (
                  <img src={item.image_url} alt="" loading="lazy" decoding="async" className="w-10 h-12 object-cover rounded-lg bg-white" />
                ) : (
                  <span className="w-10 h-12 rounded-lg bg-white" />
                )}
                <span className="text-xs font-bold text-[#111111] line-clamp-2">{item.name}</span>
              </Link>
              <button type="button" onClick={() => addOne(item)} className="text-[11px] font-bold text-[#385c37]">
                담기
              </button>
              <button type="button" aria-label="삭제" onClick={() => forgetRecent(item.id)} className="text-xs text-[#463221]">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="px-4 py-2 rounded-full bg-[#385c37] text-white text-xs font-bold"
      >
        최근 본 상품
      </button>
    </div>
  );
}