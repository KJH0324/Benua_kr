import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";
import { formatPrice, FREE_SHIPPING_MIN, SHIPPING_FEE } from "../lib/utils";
import ProductCard, { type CardProduct } from "../components/ProductCard";
import { cartKey, readLocalCart, rememberProduct, saveCart } from "../lib/cart";

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
  const [reserveDone, setReserveDone] = useState(false);
  const [reservedBuyer, setReservedBuyer] = useState(false);
  const [optionId, setOptionId] = useState(0);
  const [guestEmail, setGuestEmail] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [secretQuestion, setSecretQuestion] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [photo, setPhoto] = useState("");
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
    setReserveDone(false);
    setReservedBuyer(false);
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
    apiFetch(`/api/products/${id}/questions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || product?.sale_mode !== "preorder") return;
    apiFetch(`/api/products/${id}/preorder/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.reserved) setReserveDone(true);
      })
      .catch(() => {});
  }, [id, product?.sale_mode]);

  useEffect(() => {
    if (!id || product?.sale_mode !== "reserved") return;
    apiFetch(`/api/products/${id}/preorder/me`)
      .then((r) => (r.ok ? r.json() : { reserved: false }))
      .then((data) => setReservedBuyer(Boolean(data?.reserved)))
      .catch(() => setReservedBuyer(false));
  }, [id, product?.sale_mode]);

  useEffect(() => {
    if (!product?.name) return;
    document.title = `${product.name} | 베뉴아`;
    rememberProduct(product);
    setActiveImage(product.image_url || "");
    setOptionId(0);
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

  const options = Array.isArray(product.options) ? product.options : [];
  const selectedOption = options.find((row: any) => Number(row.id) === Number(optionId));
  const stock = selectedOption
    ? Math.max(0, Number(selectedOption.stock) || 0)
    : Math.max(0, Number(product.stock) || 0);
  const isPreorder = product.sale_mode === "preorder";
  const isReservedSale = product.sale_mode === "reserved";
  const finalPrice =
    (product.discount_rate && product.discount_rate > 0
      ? Math.round(product.price * (1 - product.discount_rate / 100))
      : product.price) + (Number(selectedOption?.extra_price) || 0);
  const gallery = [
    product.image_url,
    ...(Array.isArray(product.images) ? product.images.map((row: any) => row.image_url || row) : []),
  ].filter(Boolean);

  const handleAddToCart = (buyNow = false) => {
    if (addingRef.current) return;
    const list = readLocalCart();
    const existingIdx = list.findIndex((i) => cartKey(i) === cartKey({ id: product.id, option_id: optionId }));
    const already = existingIdx >= 0 ? Number(list[existingIdx].quantity) || 0 : 0;
    if (options.length > 0 && !selectedOption) {
      toast.error("옵션을 선택해주세요.");
      return;
    }
    if (isReservedSale && !reservedBuyer) {
      toast.error("사전 예약자만 구매할 수 있는 상품입니다");
      return;
    }
    if (stock < 1 || already + quantity > stock) {
      toast.error("재고가 부족합니다.");
      return;
    }
    addingRef.current = true;
    window.setTimeout(() => {
      addingRef.current = false;
    }, 500);

    const nextQty = already + quantity;
    const name = selectedOption ? `${product.name} (${selectedOption.name})` : product.name;
    if (existingIdx >= 0) {
      list[existingIdx].quantity = nextQty;
      list[existingIdx].stock = stock;
      list[existingIdx].price = finalPrice;
    } else {
      list.push({
        id: product.id,
        name,
        price: finalPrice,
        quantity: nextQty,
        stock,
        image: product.image_url,
        option_id: optionId || 0,
        option_name: selectedOption?.name || "",
        category: product.category,
      });
    }
    saveCart(list);
    if (buyNow) navigate("/checkout");
    else toast.success("쇼핑백에 담았습니다.");
  };

  const handlePreorder = async () => {
    const res = await apiFetch(`/api/products/${product.id}/preorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: guestEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "알림 신청에 실패했습니다.");
      return;
    }
    setReserveDone(true);
    toast.success("입고되면 메일로 알려드릴게요.");
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
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={activeImage || product.image_url || "https://picsum.photos/seed/objet/800/800"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((src: string) => (
                <button key={src} type="button" onClick={() => setActiveImage(src)} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-black/10">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
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
            배송비 {formatPrice(SHIPPING_FEE)} · {formatPrice(FREE_SHIPPING_MIN)} 이상 무료
          </p>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {options.map((row: any) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setOptionId(row.id)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border ${
                    optionId === row.id ? "bg-[#385c37] text-white border-[#385c37]" : "bg-white text-[#463221]"
                  }`}
                >
                  {row.name}
                  {Number(row.extra_price) > 0 ? ` +${formatPrice(row.extra_price)}` : ""}
                  {Number(row.stock) < 1 ? " 품절" : ""}
                </button>
              ))}
            </div>
          )}
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

          {isPreorder ? (
            reserveDone ? (
              <p className="text-sm text-venuea-brown">알림 신청이 완료되었습니다.</p>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="알림 받을 이메일"
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handlePreorder}
                  className="w-full py-4 bg-venuea-green text-white rounded-xl text-sm font-bold"
                >
                  사전예약
                </button>
              </div>
            )
          ) : (
            <>
          {!isReservedSale && stock < 1 && (
            <div className="space-y-2">
              <p className="text-sm text-venuea-brown">지금은 품절이에요. 입고되면 알려드릴게요.</p>
              {reserveDone ? (
                <p className="text-sm text-venuea-muted">알림 신청이 완료되었습니다.</p>
              ) : (
                <>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="알림 받을 이메일"
                    className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm"
                  />
                  <button type="button" onClick={handlePreorder} className="w-full py-4 bg-venuea-green text-white rounded-xl text-sm font-bold">
                    재입고 알림 신청
                  </button>
                </>
              )}
            </div>
          )}
          {isReservedSale && !reservedBuyer && (
            <p className="text-sm text-venuea-brown">사전 예약자만 구매할 수 있는 상품입니다</p>
          )}
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
              disabled={( !isReservedSale || reservedBuyer) && stock < 1}
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
            disabled={(!isReservedSale || reservedBuyer) && stock < 1}
            className="hidden md:block w-full py-4 bg-venuea-green text-white rounded-xl text-sm font-bold disabled:opacity-40"
          >
            바로 구매하기
          </button>
            </>
          )}

          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer text-sm font-bold text-venuea-dark">배송·교환·반품</summary>
            <div className="pt-4 space-y-5 text-sm text-venuea-dark leading-relaxed">
              <div>
                <p className="font-bold">배송 안내</p>
                <ul className="mt-2 space-y-1 text-venuea-muted">
                  <li>택배사: CJ대한통운</li>
                  <li>배송비: 기본 3,000원 (실결제 금액 50,000원 이상 무료배송 / BLACK·THE BLACK 등급 상시 무료배송)</li>
                  <li>출고 기간: 결제 완료 후 영업일 기준 1~3일 이내 출고되며, 택배사 사정에 따라 수령까지 2~5일 정도 소요됩니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">교환·반품 신청 기간 및 방법</p>
                <ul className="mt-2 space-y-1 text-venuea-muted">
                  <li>단순 변심 및 옵션 오선택: 상품 수령일로부터 7일 이내에 신청할 수 있습니다.</li>
                  <li>상품 불량 및 오배송: 수령일로부터 3개월 이내, 또는 그 사실을 안 날로부터 30일 이내에 신청할 수 있습니다.</li>
                  <li>신청 방법: 마이페이지 주문 내역에서 환불/취소를 요청하시거나, 문의하기에서 주문번호를 선택해 접수해 주세요. 사전 접수 없이 임의로 발송하신 경우 처리가 지연될 수 있습니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">교환·반품 배송비 안내</p>
                <ul className="mt-2 space-y-1 text-venuea-muted">
                  <li>출고 전 취소: 결제대기·결제완료 단계에서 취소 시 전액 환불됩니다.</li>
                  <li>단순 변심 및 옵션 오선택: 상품 출고 이후 반품 시 왕복 배송비 5,000원이 환불 금액에서 차감됩니다.</li>
                  <li>상품 파손·불량 및 오배송: 배송비 전액을 베뉴아가 부담합니다. 수령 후 파손이나 불량을 발견하신 경우 사진을 함께 남겨주시면 더 빠르게 확인해 드립니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">교환·반품이 어려운 경우</p>
                <ul className="mt-2 space-y-1 text-venuea-muted">
                  <li>상품 수령일로부터 7일이 지난 경우</li>
                  <li>고객님의 사용, 세탁 또는 부주의로 인해 상품이 훼손되거나 가치가 감소한 경우 (패브릭 및 소품류는 사용 흔적이 있을 경우 반품이 어렵습니다.)</li>
                  <li>상품의 고유 패키지나 택(Tag)이 훼손·분실된 경우 (단, 상품 확인을 위한 단순 택배 박스 개봉은 제외됩니다.)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">반품 보내실 곳</p>
                <ul className="mt-2 space-y-1 text-venuea-muted">
                  <li>주소: 인천광역시 연수구 새말로 154, 307동 602호 (베뉴아)</li>
                  <li>
                    고객센터:{" "}
                    <a href="mailto:support@benua.shop" className="underline">
                      support@benua.shop
                    </a>
                  </li>
                </ul>
              </div>
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
                {rev.image_url && (
                  <button type="button" onClick={() => setPhoto(rev.image_url)}>
                    <img src={rev.image_url} alt="" className="w-24 h-24 object-cover rounded-xl" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {Array.isArray(product.related) && product.related.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-serif font-bold">함께 두면 좋은 소품</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {product.related.map((item: CardProduct) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-black/10 pt-8 space-y-4">
        <h2 className="text-xl font-serif font-bold">상품 Q&A</h2>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await apiFetch(`/api/products/${product.id}/questions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: questionText, secret: secretQuestion }),
            });
            if (res.status === 401) {
              navigate(`/login?redirect=/product/${product.id}`);
              return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return toast.error(data.error || "질문을 남기지 못했습니다.");
            setQuestionText("");
            const next = await apiFetch(`/api/products/${product.id}/questions`);
            setQuestions(next.ok ? await next.json() : []);
          }}
        >
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="상품에 대해 궁금한 점을 남겨주세요."
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm"
            rows={3}
          />
          <label className="flex items-center gap-2 text-xs text-venuea-brown">
            <input type="checkbox" checked={secretQuestion} onChange={(e) => setSecretQuestion(e.target.checked)} />
            비밀글
          </label>
          <button type="submit" className="px-4 py-2 rounded-full bg-venuea-green text-white text-sm font-bold">
            질문 남기기
          </button>
        </form>
        {questions.length === 0 ? (
          <p className="text-sm text-venuea-muted">아직 질문이 없습니다.</p>
        ) : (
          questions.map((row) => (
            <div key={row.id} className="rounded-xl border border-black/10 p-4 text-sm space-y-1">
              <p className="font-bold">{row.author}</p>
              <p>{row.question}</p>
              {row.answer && <p className="text-venuea-brown">답변 {row.answer}</p>}
            </div>
          ))
        )}
      </section>

      {photo && (
        <button type="button" className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setPhoto("")}>
          <img src={photo} alt="" className="max-h-[80vh] max-w-full rounded-2xl" />
        </button>
      )}

      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-venuea-beige border-t border-black/10 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-2">
        {isPreorder || (!isReservedSale && stock < 1) ? (
          reserveDone ? (
            <p className="flex-1 text-sm text-venuea-brown">알림 신청이 완료되었습니다.</p>
          ) : (
            <button
              type="button"
              onClick={handlePreorder}
              className="flex-1 h-12 rounded-xl bg-venuea-green text-white text-sm font-bold"
            >
              {isPreorder ? "사전예약" : "재입고 알림"}
            </button>
          )
        ) : (
          <>
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
          disabled={(!isReservedSale || reservedBuyer) && stock < 1}
          className="h-12 px-4 rounded-xl border border-venuea-green bg-white text-venuea-green text-sm font-bold disabled:opacity-40"
        >
          쇼핑백
        </button>
        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={(!isReservedSale || reservedBuyer) && stock < 1}
          className="flex-1 h-12 rounded-xl bg-venuea-green text-white text-sm font-bold disabled:opacity-40"
        >
          바로 구매 {formatPrice(finalPrice)}
        </button>
          </>
        )}
      </div>
    </div>
  );
}