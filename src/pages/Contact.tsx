import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";
import { formatOrderStatus, formatPrice } from "../lib/utils";

const ORDER_CATEGORIES = ["배송 문의", "교환/환불 문의"];

type OrderOption = {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export default function Contact() {
  const [form, setForm] = useState({
    category: "오브제 문의",
    name: "",
    email: "",
    subject: "",
    message: "",
    order_number: "",
    website: "",
  });
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const needsOrder = ORDER_CATEGORIES.includes(form.category);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        const me = data?.user || null;
        setUser(me);
        if (me) {
          setForm((prev) => ({
            ...prev,
            name: prev.name || me.name || "",
            email: prev.email || me.email || "",
          }));
          const ordRes = await apiFetch("/api/orders/me");
          if (ordRes.ok) {
            const list = await ordRes.json();
            setOrders(Array.isArray(list) ? list : []);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (needsOrder && !user) {
      toast.error("배송·교환/환불 문의는 로그인 후 주문번호를 선택해야 합니다.");
      return;
    }
    if (needsOrder && !form.order_number) {
      toast.error("문의할 주문번호를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url: imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("문의가 접수되었습니다.");
        setForm({
          category: "오브제 문의",
          name: user?.name || "",
          email: user?.email || "",
          subject: "",
          message: "",
          order_number: "",
          website: "",
        });
        setImageUrl("");
      } else {
        toast.error(data.error || "문의 접수에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-[120px] pb-24 px-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark mb-8">1:1 고객 문의</h1>
      <div className="mb-8 space-y-2">
        {[
          ["배송은 얼마나 걸리나요", "결제 후 영업일 기준 1~3일 안에 출고합니다. 사전예약 상품은 상품 페이지의 출고 일정을 따릅니다."],
          ["무료배송 기준이 어떻게 되나요", "5만 원 이상, 블랙·더 블랙 등급은 무료배송입니다."],
          ["단순 변심 반품비는 얼마인가요", "반품비는 운영 설정의 반품비를 따릅니다. 블랙·더 블랙은 반품비가 없습니다."],
          ["발송 전에 주소를 바꿀 수 있나요", "배송 시작 전에는 마이페이지 주문 상세에서 바꿀 수 있습니다."],
          ["환불은 언제 들어오나요", "결제 당일 전체 취소는 바로 반영됩니다. 부분 취소나 결제일 이후 취소는 영업일 기준 3~4일 걸립니다."],
          ["사전예약 상품은 언제 오나요", "판매가 시작되면 예약하신 메일로 안내합니다."],
        ].map(([q, a]) => (
          <details key={q} className="bg-white rounded-xl px-4 py-3">
            <summary className="text-sm font-bold cursor-pointer">{q}</summary>
            <p className="pt-2 text-sm text-venuea-brown">{a}</p>
          </details>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value, order_number: "" })
          }
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        >
          <option value="오브제 문의">오브제 문의</option>
          <option value="배송 문의">배송 문의</option>
          <option value="교환/환불 문의">교환/환불 문의</option>
          <option value="기타 문의">기타 문의</option>
        </select>

        {needsOrder && authChecked && !user && (
          <div className="rounded-xl border border-venuea-gold/40 bg-[#fbf7f1] px-4 py-4 text-sm text-venuea-dark space-y-2">
            <p className="font-bold">로그인이 필요합니다</p>
            <Link
              to="/login?redirect=/contact"
              className="inline-block text-xs font-bold uppercase tracking-widest text-venuea-gold"
            >
              로그인하기
            </Link>
          </div>
        )}

        {needsOrder && user && (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
              주문번호
            </label>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-500 rounded-xl border border-gray-200 px-4 py-3">
                주문 내역이 없습니다.
              </p>
            ) : (
              <select
                required
                value={form.order_number}
                onChange={(e) => setForm({ ...form, order_number: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              >
                <option value="">주문번호를 선택해주세요</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.order_number}>
                    {order.order_number} · {formatOrderStatus(order.status)} ·{" "}
                    {formatPrice(order.total_amount)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <input
          required
          placeholder="성함"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <input
          type="email"
          required
          placeholder="답변 받을 이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <input
          required
          placeholder="제목"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <textarea
          rows={5}
          required
          placeholder="문의 내용을 입력해주세요."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        {user && (
          <>
        <input
          id="contact-photo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append("image", file);
            const res = await apiFetch("/api/uploads/image", { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              toast.error(data.error || "사진을 올리지 못했습니다.");
              return;
            }
            setImageUrl(data.image_url || "");
          }}
        />
        <button
          type="button"
          onClick={() => document.getElementById("contact-photo")?.click()}
          className="px-4 py-3 rounded-xl border border-venuea-green bg-white text-venuea-green text-sm font-bold"
        >
          {imageUrl ? "사진 변경" : "사진 첨부"}
        </button>
        {imageUrl && <img src={imageUrl} alt="" className="w-24 h-24 object-cover rounded-xl" />}
          </>
        )}
        <button
          type="submit"
          disabled={submitting || (needsOrder && (!user || orders.length === 0))}
          className="w-full bg-venuea-dark text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold disabled:opacity-40"
        >
          {submitting ? "접수 중..." : "문의 접수하기"}
        </button>
      </form>
    </div>
  );
}
