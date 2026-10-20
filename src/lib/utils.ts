import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(Math.round(price || 0));
}

export const FREE_SHIPPING_MIN = 50000;
export const SHIPPING_FEE = 3000;

export function shippingFee(goods: number, freeTier = false) {
  if (goods <= 0 || freeTier || goods >= FREE_SHIPPING_MIN) return 0;
  return SHIPPING_FEE;
}

export function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "결제대기",
    paid: "결제완료",
    shipping: "배송중",
    delivered: "배송완료",
    completed: "구매확정",
    refund_requested: "환불요청",
    refunded: "환불완료",
    cancelled: "주문취소",
  };
  return map[status] || status;
}

export function getOrderStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "shipping":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-venuea-dark text-white border-venuea-dark";
    case "refund_requested":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "refunded":
    case "cancelled":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}