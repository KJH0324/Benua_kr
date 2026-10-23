import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";
import { formatPrice, FREE_SHIPPING_MIN, SHIPPING_FEE } from "../lib/utils";
import ProductCard, { type CardProduct } from "../components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [others, setOthers] = useState<CardProduct[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isWished, setIsWished] = useState(false);
  const [cartGoods, setCartGoods] = useState(0);
  const addingRef = useRef(false);
  useEffect(() => {
    const readCart = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("benua_cart") || "[]");
        const sum = Array.isArray(saved)
          ? saved.reduce((total: number, item: any) => total + Number(item.price) * Number(item.quantity || 1), 0)
          : 0;
        setCartGoods(Number.isFinite(sum) ? sum : 0);
      } catch {
        setCartGoods(0);
      }
    };
    readCart();
    window.addEventListener("cart-updated", readCart);
    return () => window.removeEventListener("cart-updated", readCart);
  }, []);

  useEffect(() => {
    if (!id) return;
    setProduct(null);
    setMissing(false);
    apiFetch(`/api/products/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setMissing(true);
          return;
        }
        setProduct(await r.json());
      })
      .catch(() => setMissing(true));

    apiFetch(`/api/products/${id}/reviews`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (product?.name) document.title = `${product.name} | 베뉴아`;
  }, [product]);

  useEffect(() => {
    if (!missing) return;
    apiFetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOthers(Array.isArray(d) ? d.slice(0, 2) : []))
      .catch(() => {});
  }, [missing]);

  if (!product) {
    if (missing) {
      return (
        <div className="pt-32 pb-24 px-6 max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-2xl font-serif font-bold text-venuea-dark">
              판매가 종료되었거나 없는 상품입니다
            </h1>
            <p className="text-sm text-venuea-muted">주소가 바뀌었거나 상품이 내려갔을 수 있어요.</p>
            <Link
              to="/shop"
              className="inline-flex bg-venuea-green text-white px-6 py-3 rounded-full text-sm font-bold"
            >
              컬렉션 보기
            </Link>
          </div>
          {others.length > 0 && (
            <div className="text-left space-y-4">
              <p className="text-sm font-bold text-venuea-dark">다른 상품은 어때요</p>
              <div className="grid grid-cols-2 gap-4">
                {others.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square rounded-2xl bg-white animate-pulse" />
        <div className="space-y-4 pt-6">
          <div className="h-4 w-24 bg-white rounded animate-pulse" />
          <div className="h-8 w-2/3 bg-white rounded animate-pulse" />
          <div className="h-6 w-32 bg-white rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const stock = Math.max(0, Number(product.stock) || 0);
  const finalPrice =
    product.discount_rate && product.discount_rate > 0
      ? Math.round(product.price * (1 - product.discount_rate / 100))
      : product.price;

  const handleAddToCart = (buyNow = false) => {
    if (addingRef.current) return;
    if (stock < 1 || quantity > stock) {
      toast.error("재고가 부족합니다.");
      return;
    }
    addingRef.current = true;
    window.setTimeout(() => {
      addingRef.current = false;
    }, 500);

    const saved = JSON.parse(localStorage.getItem("benua_cart") || "[]");
    const list = Array.isArray(saved) ? saved : [];
    const existingIdx = list.findIndex((i: any) => String(i.id) === String(product.id));
    const nextQty =
      existingIdx >= 0 ? Math.min(stock, list[existingIdx].quantity + quantity) : quantity;

    if (existingIdx >= 0) {
      list[existingIdx].quantity = nextQty;
      list[existingIdx].stock = stock;
      list[existingIdx].price = finalPrice;
    } else {
      list.push({
        id: product.id,
        name: product.name,
        price: finalPrice,
        originalPrice: product.price,
        quantity: nextQty,
        stock,
        image: product.image_url,
        category: product.category,
      });
    }

    localStorage.setItem("benua_cart", JSON.stringify(list));
    window.dispatchEvent(new Event("cart-updated"));

    if (buyNow) {
      navigate("/checkout");
    } else {
      toast.success("쇼핑백에 담았습니다.");
    }
  };

  const handleToggleWishlist = async () => {
    const res = await apiFetch(`/api/wishlists/${product.id}/toggle`, { method: "POST" });
    if (res.status === 401) {
      toast.error("로그인이 필요한 기능입니다.");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setIsWished(data.isWished);
      toast.success(data.isWished ? "위시리스트에 추가되었습니다." : "위시리스트에서 제외되었습니다.");
    }
  };

  return (
    <div className="pt-[110px] pb-36 md:pb-24 px-6 md:px-[60px] max-w-6xl mx-auto space-y-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
          <img
            src={product.image_url || "https://picsum.photos/seed/objet/800/800"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-6 flex flex-col justify-center">
          <div>
            <span className="text-[13px] font-bold text-venuea-muted">{product.category}</span>
            <h1 className="text-3xl font-serif font-bold text-venuea-dark mt-1">
              {product.name}
            </h1>
            {product.manufacturer ? (
              <p className="mt-2 text-sm text-gray-500">
                제조사 <span className="font-medium text-venuea-dark">{product.manufacturer}</span>
              </p>
            ) : null}
          </div>

          <div className="flex items-baseline gap-3">
            {product.discount_rate > 0 && (
              <span className="text-lg font-bold text-[#C0392B]">{product.discount_rate}%</span>
            )}
            <span className="text-2xl font-bold text-venuea-dark">{formatPrice(finalPrice)}</span>
            {product.discount_rate > 0 && (
              <span className="text-sm text-venuea-muted line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <p className="text-sm text-venuea-brown">
            배송비 {formatPrice(SHIPPING_FEE)} · {formatPrice(FREE_SHIPPING_MIN)} 이상, 블랙·더 블랙 등급은 무료
          </p>
          {stock > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full bg-venuea-green"
                  style={{ width: `${Math.min(100, (cartGoods / FREE_SHIPPING_MIN) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-venuea-brown">
                {cartGoods >= FREE_SHIPPING_MIN
                  ? "무료배송이 적용됩니다."
                  : `${formatPrice(FREE_SHIPPING_MIN - cartGoods)} 더 담으면 무료배송이에요`}
              </p>
            </div>
          )}

          <p className="text-sm text-venuea-muted leading-relaxed whitespace-pre-line">
            {product.description}
          </p>

          <div className="border-t border-b border-black/10 py-4 space-y-2 text-sm text-venuea-muted">
            {product.material && (
              <div className="flex justify-between">
                <span>소재</span>
                <span className="font-medium text-gray-800">{product.material}</span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between">
                <span>규격</span>
                <span className="font-medium text-gray-800">{product.dimensions}</span>
              </div>
            )}
            {product.origin && (
              <div className="flex justify-between">
                <span>원산지</span>
                <span className="font-medium text-gray-800">{product.origin}</span>
              </div>
            )}
            {product.manufacturer && (
              <div className="flex justify-between">
                <span>제조사</span>
                <span className="font-medium text-gray-800">{product.manufacturer}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-venuea-muted">
            {stock > 0 ? `남은 재고 ${stock}개` : "품절"}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-black/10 rounded-xl bg-white">
              <button
                type="button"
                aria-label="수량 줄이기"
                disabled={quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 text-sm font-bold disabled:text-gray-300"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                aria-label="수량 늘리기"
                disabled={quantity >= stock}
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                className="w-11 h-11 text-sm font-bold disabled:text-gray-300"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAddToCart(false)}
              disabled={stock < 1}
              className="hidden md:flex flex-1 h-12 border border-venuea-green bg-white text-venuea-green rounded-xl text-sm font-bold items-center justify-center gap-2 disabled:opacity-40"
            >
              <ShoppingBag size={16} />
              <span>쇼핑백 담기</span>
            </button>

            <button
              type="button"
              aria-label={isWished ? "위시리스트에서 빼기" : "위시리스트에 담기"}
              onClick={handleToggleWishlist}
              className="hidden md:flex w-12 h-12 border border-black/10 rounded-xl bg-white items-center justify-center"
            >
              <Heart size={18} className={isWished ? "fill-red-500 text-red-500" : "text-venuea-dark"} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleAddToCart(true)}
            disabled={stock < 1}
            className="hidden md:block w-full py-4 bg-venuea-green text-white rounded-xl text-sm font-bold disabled:opacity-40"
          >
            바로 구매하기
          </button>

          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer text-sm font-bold text-venuea-dark">배송·교환·반품</summary>
            <div className="pt-3 text-sm text-venuea-muted leading-relaxed">
              <p>수령일로부터 7일 이내 교환·반품을 요청할 수 있습니다.</p>
            </div>
          </details>
        </div>
      </div>

      {product.description_image_url && (
        <div className="max-w-3xl mx-auto">
          <img
            src={product.description_image_url}
            alt="상세 이미지"
            className="w-full rounded-2xl"
          />
        </div>
      )}

      <section className="border-t border-black/10 pt-8">
        {reviews.length === 0 ? (
          <p className="text-sm text-venuea-muted">첫 리뷰를 남겨주세요.</p>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold">리뷰 {reviews.length}</h2>
            {reviews.map((rev) => (
              <div key={rev.id} className="p-5 rounded-xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rev.is_best === 1 && (
                      <span className="px-2 py-0.5 bg-venuea-gold text-white text-[10px] font-bold rounded">
                        BEST
                      </span>
                    )}
                    <span className="text-xs font-bold">{rev.user_name}</span>
                    <span className="text-[11px] text-gray-400">({rev.user_tier})</span>
                  </div>
                  <div className="flex text-venuea-gold">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{rev.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-venuea-beige border-t border-black/10 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-2">
        <button
          type="button"
          aria-label={isWished ? "위시리스트에서 빼기" : "위시리스트에 담기"}
          onClick={handleToggleWishlist}
          className="w-12 h-12 rounded-xl border border-black/10 bg-white flex items-center justify-center shrink-0"
        >
          <Heart size={18} className={isWished ? "fill-red-500 text-red-500" : "text-venuea-dark"} />
        </button>
        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          disabled={stock < 1}
          className="h-12 px-4 rounded-xl border border-venuea-green bg-white text-venuea-green text-sm font-bold disabled:opacity-40"
        >
          쇼핑백
        </button>
        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={stock < 1}
          className="flex-1 h-12 rounded-xl bg-venuea-green text-white text-sm font-bold disabled:opacity-40"
        >
          바로 구매 {formatPrice(finalPrice)}
        </button>
      </div>
    </div>
  );
}