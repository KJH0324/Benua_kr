import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Award, Ticket, Package, Star, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, authStorage } from "../lib/api";
import {
  formatPrice,
  formatOrderStatus,
  getOrderStatusBadgeClass,
  cn,
} from "../lib/utils";
import type { UserProfile, Order } from "../types";

const REFUND_REASONS = [
  "단순 변심",
  "옵션 오선택",
  "상품 파손 및 불량",
  "오배송 및 지연",
  "기타 사유",
];

const TIER_BANNERS: Record<
  string,
  {
    label: string;
    text: string;
    muted: string;
    rate: string;
    shipping: boolean;
    track: string;
    style: { background?: string; backgroundColor?: string; border?: string; boxShadow?: string };
    button: string;
  }
> = {
  BEIGE: {
    label: "베이지",
    text: "text-[#1A1A1B]",
    muted: "text-[#8a7b68]",
    rate: "1%",
    shipping: false,
    track: "bg-black/20",
    style: { backgroundColor: "#faf2e7" },
    button: "border-black/15 hover:bg-black/5",
  },
  GREEN: {
    label: "그린",
    text: "text-[#f7f3ea]",
    muted: "text-white/70",
    rate: "3%",
    shipping: false,
    track: "bg-white/20",
    style: { backgroundColor: "#385c37" },
    button: "border-white/25 hover:bg-white/10",
  },
  BLACK: {
    label: "블랙",
    text: "text-white",
    muted: "text-white/55",
    rate: "5%",
    shipping: true,
    track: "bg-white/15",
    style: {
      background: "linear-gradient(155deg, #2c2c2e 0%, #0c0c0d 48%, #1a1a1c 100%)",
    },
    button: "border-white/20 hover:bg-white/10",
  },
  THE_BLACK: {
    label: "더 블랙",
    text: "text-[#f6f1e6]",
    muted: "text-[#d9cbb4]/80",
    rate: "7%",
    shipping: true,
    track: "bg-white/15",
    style: {
      background:
        "linear-gradient(118deg, #141416 0%, #3a3228 16%, #090909 48%, #241f19 74%, #050505 100%)",
      border: "1px solid rgba(197, 160, 89, 0.55)",
      boxShadow: "inset 0 1px 0 rgba(232, 210, 160, 0.45)",
    },
    button: "border-[#C5A059]/40 hover:bg-white/10",
  },
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  // 리뷰 작성 모달 상태
  const [reviewModal, setReviewModal] = useState<{
    orderId: number;
    productId: number;
    productName: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "" });

  // 자체 인앱 환불 요청 모달 상태
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundReasonType, setRefundReasonType] = useState(REFUND_REASONS[0]);
  const [refundDetailText, setRefundDetailText] = useState("");
  const [refundError, setRefundError] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const loadProfileData = async () => {
    const meRes = await apiFetch("/api/auth/me");
    const meData = await meRes.json();
    if (!meData.user) {
      navigate("/login");
      return;
    }
    setUser(meData.user);

    const [ordRes, coupRes] = await Promise.all([
      apiFetch("/api/orders/me"),
      apiFetch("/api/coupons/me"),
    ]);
    if (ordRes.ok) setOrders(await ordRes.json());
    if (coupRes.ok) setCoupons(await coupRes.json());
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleConfirmOrder = async (orderId: number) => {
    const res = await apiFetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(`구매확정이 완료되어 ${data.earned}P가 적립되었습니다.`);
      loadProfileData();
    } else {
      toast.error(data.error || "구매확정 실패");
    }
  };

  const handleConfirmRefundSubmit = async () => {
    if (!refundModalOrder) return;
    if (refundReasonType === "기타 사유" && !refundDetailText.trim()) {
      setRefundError("환불 요청 사유를 입력해주세요.");
      return;
    }
    setRefundError("");
    const finalReason = refundDetailText.trim()
      ? `${refundReasonType} (${refundDetailText.trim()})`
      : refundReasonType;

    setIsSubmittingRefund(true);
    try {
      const res = await apiFetch(`/api/orders/${refundModalOrder.id}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.status === "refunded"
            ? "주문이 즉시 취소 및 환불되었습니다."
            : "환불 요청이 정상적으로 접수되었습니다."
        );
        setRefundModalOrder(null);
        setRefundDetailText("");
        loadProfileData();
      } else {
        toast.error(data.error || "환불 요청 실패");
      }
    } catch {
      toast.error("환불 요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    const res = await apiFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: reviewModal.orderId,
        product_id: reviewModal.productId,
        rating: reviewForm.rating,
        content: reviewForm.content,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`리뷰가 등록되어 ${data.points_earned}P가 적립되었습니다!`);
      setReviewModal(null);
      setReviewForm({ rating: 5, content: "" });
      loadProfileData();
    } else {
      toast.error(data.error || "리뷰 등록 실패");
    }
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    authStorage.clearUserToken();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말 회원 탈퇴하시겠습니까? 보유 포인트 및 쿠폰이 모두 소멸됩니다.")) return;
    const res = await apiFetch("/api/auth/me", { method: "DELETE" });
    if (res.ok) {
      authStorage.clearUserToken();
      toast.success("회원 탈퇴가 완료되었습니다.");
      navigate("/");
    }
  };

  if (!user) return null;

  const banner = TIER_BANNERS[(user.tier || "BEIGE").toUpperCase()] || TIER_BANNERS.BEIGE;
  const spent = Number(user.spent || 0);
  const nextStops = [
    { label: "그린", min: 100000 },
    { label: "블랙", min: 500000 },
    { label: "더 블랙", min: 1000000 },
  ];
  const nextTier = nextStops.find((stop) => spent < stop.min);
  const progressFloor = nextTier
    ? [...nextStops].reverse().find((stop) => stop.min < nextTier.min)?.min || 0
    : 1000000;
  const progress = nextTier
    ? Math.min(1, Math.max(0, (spent - progressFloor) / (nextTier.min - progressFloor)))
    : 1;
  const progressLabel = nextTier
    ? `${nextTier.label}까지 ${formatPrice(nextTier.min - spent)}`
    : "최고 등급";
  const benefitLabel = banner.shipping ? `적립 ${banner.rate} · 무료배송` : `적립 ${banner.rate}`;

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-6xl mx-auto space-y-12">
      {/* Tier & Points Banner */}
      <div
        style={banner.style}
        className={cn(
          "p-5 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5",
          banner.text
        )}
      >
        <div className="space-y-1 min-w-0 w-full md:w-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-venuea-gold text-[11px] md:text-xs font-bold uppercase tracking-[0.12em] md:tracking-widest whitespace-nowrap">
              <Award size={14} className="shrink-0" />
              <span>멤버십 {banner.label}</span>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "md:hidden shrink-0 px-3 py-1.5 border rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap",
                banner.button
              )}
            >
              <LogOut size={13} />
              <span>로그아웃</span>
            </button>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold leading-tight truncate">
            {user.name}님, 환영합니다
          </h1>
          <p className={cn("text-[11px] md:text-xs whitespace-nowrap", banner.muted)}>
            최근 6개월 구매실적 {formatPrice(spent)}
          </p>
          <div className="pt-2 space-y-1.5 w-full min-w-[180px]">
            <p className={cn("text-[11px] whitespace-nowrap", banner.muted)}>{progressLabel}</p>
            <div
              className={cn("mt-1 h-2 w-full rounded-full overflow-hidden", banner.track)}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="다음 등급까지 진행"
            >
              <div
                className="h-full rounded-full bg-venuea-gold"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-venuea-gold whitespace-nowrap">{benefitLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-8 shrink-0">
          <div className="whitespace-nowrap">
            <span className={cn("text-[11px] block", banner.muted)}>보유 포인트</span>
            <span className="text-lg md:text-xl font-bold text-venuea-gold">
              {Number(user.points || 0).toLocaleString()} P
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className={cn("text-[11px] block", banner.muted)}>사용 가능 쿠폰</span>
            <span className="text-lg md:text-xl font-bold">{coupons.length}장</span>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "hidden md:flex px-4 py-2 border rounded-xl text-xs font-bold items-center gap-1.5 whitespace-nowrap",
              banner.button
            )}
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Coupons */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Ticket size={18} className="text-venuea-gold" />
          <span>보유 쿠폰</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-xs font-bold text-venuea-gold">
                {c.type === "PERCENT"
                  ? `${c.value}% 할인`
                  : c.type === "FIXED"
                  ? `${formatPrice(c.value)} 할인`
                  : "무료배송"}
              </p>
              <p className="font-bold text-sm mt-1">{c.name}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                최소주문 {formatPrice(c.min_order_amount || 0)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Orders */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package size={18} className="text-venuea-gold" />
          <span>주문 내역</span>
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">주문 내역이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="p-6 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex flex-wrap justify-between items-center border-b pb-3 gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm">{order.order_number}</span>
                    <span className="text-xs text-gray-400 ml-3">
                      {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full border",
                        getOrderStatusBadgeClass(order.status)
                      )}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                    {["paid", "shipping", "delivered"].includes(order.status) && (
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        className="px-3 py-1 bg-venuea-dark text-white rounded-lg text-xs font-bold hover:bg-venuea-gold transition-colors"
                      >
                        구매확정
                      </button>
                    )}
                    {["pending", "paid", "shipping", "delivered"].includes(order.status) && (
                      <button
                        onClick={() => {
                          setRefundModalOrder(order);
                          setRefundReasonType(REFUND_REASONS[0]);
                          setRefundDetailText("");
                          setRefundError("");
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-venuea-dark transition-colors"
                      >
                        환불/취소
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                        {order.status === "completed" &&
                          (item.reviewed ? (
                            <span className="text-xs text-gray-400">작성 완료</span>
                          ) : (
                            <button
                              onClick={() =>
                                setReviewModal({
                                  orderId: order.id,
                                  productId: item.product_id,
                                  productName: item.name,
                                })
                              }
                              className="text-xs font-bold text-venuea-gold underline"
                            >
                              리뷰 작성
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="pt-8 border-t text-right">
        <button
          onClick={handleDeleteAccount}
          className="text-xs text-gray-400 hover:text-red-500 underline"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 자체 인앱 환불/취소 모달 (6번 항목 반영) */}
      {refundModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-venuea-gold/15 text-venuea-gold flex items-center justify-center">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-venuea-dark">
                    주문 취소 및 환불 요청
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    주문번호: {refundModalOrder.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalOrder(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                환불 사유 선택
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REFUND_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRefundReasonType(r);
                      setRefundError("");
                    }}
                    className={cn(
                      "text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition-all",
                      refundReasonType === r
                        ? "border-venuea-dark bg-venuea-dark text-white"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                상세 사유 입력 (선택)
              </label>
              <textarea
                rows={3}
                value={refundDetailText}
                onChange={(e) => setRefundDetailText(e.target.value)}
                placeholder="추가 전달 사항이 있으시면 적어주세요."
                className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-venuea-gold"
              />
            </div>

            {refundError && (
              <div className="rounded-xl border border-venuea-gold/40 bg-[#fbf7f1] px-4 py-3 text-xs text-venuea-dark">
                <p className="font-bold tracking-wide">안내</p>
                <p className="mt-1 leading-relaxed">{refundError}</p>
              </div>
            )}

            {!["pending", "paid"].includes(refundModalOrder.status) &&
              (refundReasonType === "단순 변심" || refundReasonType === "옵션 오선택") && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  * 발송 이후 단순 변심/옵션 오선택에 의한 반품 시 왕복 배송비(5,000원)가 차감된 후 환불됩니다.
                </p>
              )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={isSubmittingRefund}
                onClick={handleConfirmRefundSubmit}
                className="flex-1 py-3 bg-venuea-dark text-white rounded-xl text-xs font-bold hover:bg-venuea-gold transition-colors disabled:opacity-50"
              >
                {isSubmittingRefund ? "처리 중..." : "환불 요청하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg">{reviewModal.productName} 리뷰 작성</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                  className={n <= reviewForm.rating ? "text-venuea-gold" : "text-gray-300"}
                >
                  <Star size={22} fill="currentColor" />
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              value={reviewForm.content}
              onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
              placeholder="상품에 대한 감상을 남겨주세요."
              className="w-full border rounded-xl p-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 py-2.5 border rounded-xl text-xs font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 py-2.5 bg-venuea-dark text-white rounded-xl text-xs font-bold"
              >
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}