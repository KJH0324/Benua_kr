import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/utils";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isWished, setIsWished] = useState(false);
  const addingRef = useRef(false);

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

  if (!product) {
    return (
      <div className="pt-32 text-center text-sm text-gray-400">
        {missing ? "상품을 찾을 수 없습니다." : "오브제 정보를 불러오는 중..."}
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
      toast.success("쇼핑백에 오브제가 담겼습니다.");
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
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-6xl mx-auto space-y-20">
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
            <span className="text-xs font-bold uppercase tracking-widest text-venuea-gold">
              {product.category}
            </span>
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
            <span className="text-2xl font-bold text-venuea-dark">{formatPrice(finalPrice)}</span>
            {product.discount_rate && product.discount_rate > 0 ? (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            ) : null}
          </div>

          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>

          <div className="border-t border-b border-gray-100 py-4 space-y-2 text-xs text-gray-500">
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

          <p className="text-xs text-gray-500">
            {stock > 0 ? `남은 재고 ${stock}개` : "품절"}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-xl">
              <button
                type="button"
                aria-label="수량 줄이기"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-3 text-sm font-bold"
              >
                -
              </button>
              <span className="px-4 text-sm font-bold">{quantity}</span>
              <button
                type="button"
                aria-label="수량 늘리기"
                disabled={quantity >= stock}
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                className="px-4 py-3 text-sm font-bold disabled:text-gray-300"
              >
                +
              </button>
            </div>

            <button
              onClick={() => handleAddToCart(false)}
              className="flex-1 py-3.5 border border-venuea-dark rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <ShoppingBag size={16} />
              <span>쇼핑백 담기</span>
            </button>

            <button
              type="button"
              aria-label={isWished ? "위시리스트에서 빼기" : "위시리스트에 담기"}
              onClick={handleToggleWishlist}
              className="p-3.5 border border-gray-200 rounded-xl hover:border-venuea-gold"
            >
              <Heart size={18} className={isWished ? "fill-red-500 text-red-500" : "text-gray-600"} />
            </button>
          </div>

          <button
            onClick={() => handleAddToCart(true)}
            className="w-full py-4 bg-venuea-dark text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors"
          >
            바로 구매하기
          </button>
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

      {/* Reviews Section */}
      <section className="border-t pt-12 space-y-6">
        <h2 className="text-xl font-serif font-bold">리뷰 ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">아직 등록된 리뷰가 없습니다.</p>
        ) : (
          <div className="space-y-4">
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
    </div>
  );
}