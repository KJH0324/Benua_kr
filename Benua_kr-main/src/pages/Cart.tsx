import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ArrowRight } from "lucide-react";
import { formatPrice } from "../lib/utils";
import type { CartItem } from "../types";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("benua_cart") || "[]");
      setCart(Array.isArray(saved) ? saved : []);
    } catch {
      setCart([]);
    }
  }, []);

  const updateCart = (next: CartItem[]) => {
    setCart(next);
    localStorage.setItem("benua_cart", JSON.stringify(next));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-5xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark mb-10">쇼핑백</h1>

      {cart.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-sm text-gray-400">쇼핑백에 담긴 오브제가 없습니다.</p>
          <Link
            to="/shop"
            className="inline-block bg-venuea-dark text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest"
          >
            컬렉션 보러가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 divide-y border-t border-b">
            {cart.map((item) => (
              <div key={item.id} className="py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={item.image || "https://picsum.photos/seed/objet/120/120"}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover bg-gray-100"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-venuea-dark">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatPrice(item.price)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() =>
                        updateCart(
                          cart.map((c) =>
                            c.id === item.id ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c
                          )
                        )
                      }
                      className="px-2.5 py-1 text-xs font-bold"
                    >
                      -
                    </button>
                    <span className="px-2.5 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateCart(
                          cart.map((c) =>
                            c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                          )
                        )
                      }
                      className="px-2.5 py-1 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => updateCart(cart.filter((c) => c.id !== item.id))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl h-fit space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">상품 금액</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-3 border-t">
              <span>예상 결제금액</span>
              <span>{formatPrice(subtotal >= 50000 ? subtotal : subtotal + 3000)}</span>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-venuea-dark text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold flex items-center justify-center gap-2"
            >
              <span>주문하기</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}