import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readRecent } from "../lib/cart";

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

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {open && (
        <div className="mb-2 w-56 rounded-2xl bg-[#faf2e7] border border-black/10 p-3 shadow-lg space-y-2">
          <p className="text-xs font-bold text-[#463221]">최근 본 상품</p>
          {items.map((item) => (
            <Link key={item.id} to={`/product/${item.id}`} onClick={() => setOpen(false)} className="flex gap-2 items-center">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-10 h-12 object-cover rounded-lg bg-white" />
              ) : (
                <span className="w-10 h-12 rounded-lg bg-white" />
              )}
              <span className="text-xs font-bold text-[#111111] line-clamp-2">{item.name}</span>
            </Link>
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
