import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package, Truck } from "lucide-react";
import { apiFetch } from "../lib/api";
import TrackingTimeline from "../components/TrackingTimeline";
import {
  formatPrice,
  formatOrderStatus,
  getOrderStatusBadgeClass,
  cn,
} from "../lib/utils";

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("orderNumber") || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [formError, setFormError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || phone.replace(/\D/g, "").length < 8) {
      setFormError("주문번호와 주문 시 연락처를 입력해주세요.");
      return;
    }
    setFormError("");
    const res = await apiFetch(
      `/api/orders/track/${encodeURIComponent(orderNumber.trim())}?phone=${encodeURIComponent(phone)}`
    );
    if (res.ok) {
      setOrder(await res.json());
    } else {
      setOrder(null);
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "일치하는 주문을 찾을 수 없습니다.");
    }
  };

  useEffect(() => {
    const preset = params.get("orderNumber");
    if (preset) setOrderNumber(preset);
  }, [params]);

  return (
    <div className="pt-[120px] pb-24 px-6 max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-venuea-dark">
          주문/배송 조회
        </h1>
      </div>

      <form onSubmit={handleTrack} noValidate className="space-y-2">
        {formError && <p className="text-xs text-red-600">{formError}</p>}
        <div className="flex gap-2">
        <input
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="주문번호 입력 (예: A1B2C3D4E5F6G7H)"
          className="flex-grow border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
        />
        <button
          type="submit"
          className="bg-venuea-dark text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-venuea-gold transition-colors"
        >
          <Search size={16} />
          <span>조회</span>
        </button>
        </div>
        <input
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="주문 연락처"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
      </form>

      {order && (
        <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-5 text-sm shadow-xs animate-in fade-in">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs text-gray-400 block">주문번호</span>
              <span className="font-mono font-bold text-base text-venuea-dark">
                {order.order_number}
              </span>
            </div>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold border",
                getOrderStatusBadgeClass(order.status)
              )}
            >
              {formatOrderStatus(order.status)}
            </span>
          </div>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">주문일시</span>
              <span>{new Date(order.created_at).toLocaleString("ko-KR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">수령인</span>
              <span>{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">배송지</span>
              <span className="text-right max-w-xs">{order.shipping_address}</span>
            </div>
            <div className="flex justify-between font-bold text-venuea-dark pt-1">
              <span>결제금액</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
            {(order.receipt_url || order.cash_receipt_url) && (
              <div className="flex gap-3 text-sm font-bold text-venuea-green">
                {order.receipt_url && <a href={order.receipt_url} target="_blank" rel="noreferrer">영수증</a>}
                {order.cash_receipt_url && <a href={order.cash_receipt_url} target="_blank" rel="noreferrer">현금영수증</a>}
              </div>
            )}
          </div>

          {order.tracking_number && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                <Truck size={18} className="text-venuea-gold shrink-0" />
                <div className="text-xs">
                  <span className="text-gray-400 block">운송장 정보</span>
                  <span className="font-bold text-venuea-dark">
                    {order.shipping_company || "CJ대한통운"} · {order.tracking_number}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#faf2e7] p-4">
                <TrackingTimeline
                  src={`/api/orders/track/${encodeURIComponent(order.order_number)}/tracking?phone=${encodeURIComponent(phone)}`}
                />
              </div>
            </div>
          )}

          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Package size={14} />
                <span>주문 상품</span>
              </div>
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs py-1">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-bold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}