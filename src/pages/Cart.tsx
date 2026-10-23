import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { formatPrice, shippingFee, FREE_SHIPPING_MIN } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { cartKey, mergeServerCart, saveCart } from "../lib/cart";
import { salePrice, type CardProduct } from "../components/ProductCard";
import type { CartItem } from "../types";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [freeShippingTier, setFreeShippingTier] = useState(false);
  const [picks, setPicks] = useState<CardProduct[]>([]);

  useEffect(() => {
    const sync = async () => {
      const saved = await mergeServerCart().catch(() => []);
      const next = [];
      for (const item of saved) {
        const res = await apiFetch(`/api/products/${item.id}`);
        if (res.status === 404) continue;
        if (!res.ok) {
          next.push(item);
          continue;
        }
        const product = await res.json();
        if (product.sale_mode === "preorder") continue;
        const option = (product.options || []).find((row: any) => Number(row.id) === Number(item.option_id));
        const stock = option ? Math.max(0, Number(option.stock) || 0) : Math.max(0, Number(product.stock) || 0);
        if (stock < 1) continue;
        const rate = Math.min(100, Math.max(0, Number(product.discount_rate) || 0));
        const price =
          (rate > 0 ? Math.round(product.price * (1 - rate / 100)) : product.price) +
          (Number(option?.extra_price) || 0);
        next.push({
          ...item,
          name: option ? `${product.name} (${option.name})` : product.name,
          price,
          stock,
          quantity: Math.min(Math.max(1, Number(item.quantity) || 1), stock),
          image: product.image_url || item.image,
          option_id: Number(item.option_id) || 0,
        });
      }
      setCart(next);
      await saveCart(next as any, "replace");
    };
    sync();

    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const tier = String(d.user?.tier || "").toUpperCase();
        setFreeShippingTier(tier === "BLACK" || tier === "THE_BLACK");
      })
      .catch(() => {});
  }, []);

  const updateCart = (next: CartItem[]) => {
    setCart(next);
    saveCart(next as any, "replace");
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = shippingFee(subtotal, freeShippingTier);
  const remain = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const progress = freeShippingTier || subtotal >= FREE_SHIPPING_MIN ? 100 : Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100);

  useEffect(() => {
    if (remain <= 0 || freeShippingTier) {
      setPicks([]);
      return;
    }
    apiFetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const ids = new Set(cart.map((item) => String(item.id)));
        const list = (Array.isArray(rows) ? rows : [])
          .filter((item) => !ids.has(String(item.id)) && Number(item.stock) > 0 && item.sale_mode !== "preorder")
          .filter((item) => salePrice(item) > 0 && salePrice(item) <= remain)
          .slice(0, 3);
        setPicks(list);
      })
      .catch(() => {});
  }, [remain, freeShippingTier, cart]);

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-5xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark mb-10">쇼핑백</h1>

      {cart.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-sm text-gray-400">쇼핑백에 담긴 오브제가 없습니다.</p>
          <Link
            to="/shop"
            className="inline-block bg-venuea-green text-white px-6 py-3 rounded-full text-sm font-bold"
          >
            컬렉션 보러가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 divide-y border-t border-b">
            {cart.map((item) => (
              <div key={cartKey(item as any)} className="py-5 flex items-center justify-between gap-4">
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
                  <div className="flex items-center border border-black/10 rounded-xl bg-white">
                    <button
                      type="button"
                      aria-label="수량 줄이기"
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        updateCart(
                          cart.map((c) =>
                            cartKey(c as any) === cartKey(item as any) ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c
                          )
                        )
                      }
                      className="w-11 h-11 text-sm font-bold disabled:text-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="수량 늘리기"
                      disabled={item.quantity >= Number((item as any).stock || item.quantity)}
                      onClick={() =>
                        updateCart(
                          cart.map((c) =>
                            cartKey(c as any) === cartKey(item as any)
                              ? {
                                  ...c,
                                  quantity: Math.min(
                                    Number((c as any).stock || c.quantity + 1),
                                    c.quantity + 1
                                  ),
                                }
                              : c
                          )
                        )
                      }
                      className="w-11 h-11 text-sm font-bold disabled:text-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="쇼핑백에서 삭제"
                    onClick={() => updateCart(cart.filter((c) => cartKey(c as any) !== cartKey(item as any)))}
                    className="h-11 px-2 text-sm text-venuea-muted hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-2xl h-fit space-y-4">
            <div className="space-y-2">
              <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full bg-venuea-green" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-venuea-brown">
                {freeShippingTier || shipping === 0
                  ? "무료배송이 적용됩니다."
                  : `${formatPrice(remain)} 더 담으면 무료배송이에요`}
              </p>
            </div>
            {picks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-venuea-dark">이 금액이면 무료배송이에요</p>
                {picks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      updateCart([
                        ...cart,
                        {
                          id: String(item.id),
                          name: item.name,
                          price: salePrice(item),
                          quantity: 1,
                          image: item.image_url || "",
                          stock: item.stock,
                        } as CartItem,
                      ])
                    }
                    className="w-full text-left text-xs flex justify-between gap-2"
                  >
                    <span className="font-bold text-venuea-dark">{item.name}</span>
                    <span className="text-venuea-green shrink-0">담기 {formatPrice(salePrice(item))}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-venuea-muted">상품 금액</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-venuea-muted">배송비</span>
              <span className="font-bold">{shipping === 0 ? "무료" : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-3 border-t border-black/10">
              <span>예상 결제금액</span>
              <span>{formatPrice(subtotal + shipping)}</span>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-venuea-green text-white py-4 rounded-xl text-sm font-bold hover:bg-[#2d4a2c] flex items-center justify-center gap-2"
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