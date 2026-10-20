import React, { useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/utils";
import { toast } from "sonner";

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    const res = await apiFetch(`/api/orders/track/${encodeURIComponent(orderNumber.trim())}`);
    if (res.ok) {
      setOrder(await res.json());
    } else {
      setOrder(null);
      toast.error("일치하는 주문번호를 찾을 수 없습니다.");
    }
  };

  return (
    <div className="pt-[120px] pb-24 px-6 max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-venuea-dark">주문/배송 조회</h1>
        <p className="text-xs text-venuea-muted">15자리 주문번호를 입력하여 배송 상태를 확인하세요.</p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="주문번호 입력"
          className="flex-grow border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
        />
        <button
          type="submit"
          className="bg-venuea-dark text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          <Search size={16} />
          <span>조회</span>
        </button>
      </form>

      {order && (
        <div className="p-6 rounded-2xl border border-gray-200 space-y-3 text-sm">
          <div className="flex justify-between font-bold">
            <span>주문번호: {order.order_number}</span>
            <span className="text-venuea-gold uppercase">{order.status}</span>
          </div>
          <p className="text-gray-600">결제금액: {formatPrice(order.total_amount)}</p>
          {order.tracking_number && (
            <p className="text-gray-800 font-medium">
              운송장 정보: {order.shipping_company} {order.tracking_number}
            </p>
          )}
        </div>
      )}
    </div>
  );
}