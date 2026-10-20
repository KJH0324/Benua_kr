import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Award, Ticket, Package, Star } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, authStorage } from "../lib/api";
import { formatPrice } from "../lib/utils";
import type { UserProfile, Order } from "../types";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviewModal, setReviewModal] = useState<{
    orderId: number;
    productId: number;
    productName: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "" });

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

  const handleRefundRequest = async (orderId: number) => {
    const reason = prompt("환불 요청 사유를 입력해주세요 (예: 단순 변심, 파손 등):", "단순 변심");
    if (!reason) return;
    const res = await apiFetch(`/api/orders/${orderId}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(
        data.status === "refunded"
          ? "주문이 즉시 취소 및 환불되었습니다."
          : "환불 요청이 접수되었습니다."
      );
      loadProfileData();
    } else {
      toast.error(data.error || "환불 요청 실패");
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

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-6xl mx-auto space-y-12">
      {/* Tier & Points Banner */}
      <div className="bg-[#1A1A1B] text-white p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-venuea-gold text-xs font-bold uppercase tracking-widest">
            <Award size={16} />
            <span>Membership Tier: {user.tier}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold">{user.name}님, 환영합니다</h1>
          <p className="text-xs text-gray-400">
            최근 6개월 구매실적: {formatPrice(user.spent || 0)}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div>
            <span className="text-[11px] text-gray-400 block">보유 포인트</span>
            <span className="text-xl font-bold text-venuea-gold">
              {Number(user.points || 0).toLocaleString()} P
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">사용 가능 쿠폰</span>
            <span className="text-xl font-bold">{coupons.length}장</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-white/10"
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
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100">
                      {order.status}
                    </span>
                    {["paid", "shipping", "delivered"].includes(order.status) && (
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        className="px-3 py-1 bg-venuea-dark text-white rounded-lg text-xs font-bold hover:bg-venuea-gold"
                      >
                        구매확정
                      </button>
                    )}
                    {["pending", "paid", "shipping", "delivered"].includes(order.status) && (
                      <button
                        onClick={() => handleRefundRequest(order.id)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-600"
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
                        {order.status === "completed" && (
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
                        )}
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
              placeholder="오브제에 대한 감상을 남겨주세요."
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