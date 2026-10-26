import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import DaumPostcodeEmbed from "react-daum-postcode";
import { ShieldCheck, CreditCard, Loader2, CheckCircle2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";
import { formatPrice, cn } from "../lib/utils";
import { readDirectCheckout, clearDirectCheckout, readLocalCart, readSelectedCheckout, clearSelectedCheckout, saveCart } from "../lib/cart";
import type { CartItem, UserProfile } from "../types";

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || "";

function readCheckoutDraft(): Record<string, string> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem("benua_checkout_draft") || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function phoneOk(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
  return /^01[016789]\d{7,8}$/.test(digits);
}

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const draft = readCheckoutDraft();

  const [customerName, setCustomerName] = useState(draft.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(draft.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone || "");
  const [zipcode, setZipcode] = useState(draft.zipcode || "");
  const [address, setAddress] = useState(draft.address || "");
  const [detailAddress, setDetailAddress] = useState(draft.detailAddress || "");
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "vbank" | "transfer">("card");
  const [shippingMemo, setShippingMemo] = useState("문 앞에 놓아주세요");
  const [memoCustom, setMemoCustom] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftLink, setGiftLink] = useState("");
  const couponTouched = useRef(false);
  const [formError, setFormError] = useState("");
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [vbankResult, setVbankResult] = useState<any>(null);
  const [stockReady, setStockReady] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [shipRule, setShipRule] = useState({ extra: 0, shipping_fee: 3000, free_min: 50000 });

  // 1. Handle Toss Redirect Callback (?paymentKey=...&orderId=...&amount=...)
  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const failMessage = searchParams.get("message");

    if (failMessage) {
      const failedOrderId = searchParams.get("orderId");
      if (failedOrderId) {
        apiFetch("/api/orders/abandon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_number: failedOrderId }),
        }).catch(() => {});
      }
      toast.error(`결제가 취소되었거나 실패했습니다: ${failMessage}`);
      return;
    }

    if (paymentKey && orderId && amount) {
      const confirmPayment = async () => {
        setIsProcessing(true);
        try {
          const res = await apiFetch("/api/payments/toss/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentKey,
              orderId,
              amount: Number(amount),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "결제 승인 검증에 실패했습니다.");
            return;
          }

          if (readDirectCheckout()) clearDirectCheckout();
          else {
            const selected = readSelectedCheckout();
            if (selected) {
              const drop = new Set(selected.map((item) => `${item.id}:${item.option_id || 0}`));
              saveCart(readLocalCart().filter((item) => !drop.has(`${item.id}:${item.option_id || 0}`)), "replace");
              clearSelectedCheckout();
            } else saveCart([], "replace");
          }
          const token = sessionStorage.getItem("benua_gift_token");
          if (token) setGiftLink(`${window.location.origin}/gift/${token}`);
          setCompletedOrderNumber(data.order_number);
          if (data.vbank) setVbankResult(data.vbank);
          toast.success("주문이 성공적으로 완료되었습니다.");
        } catch {
          toast.error("결제 승인 처리 중 오류가 발생했습니다.");
        } finally {
          setIsProcessing(false);
        }
      };
      confirmPayment();
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("paymentKey") || searchParams.get("message")) {
      setStockReady(true);
      return;
    }
    let cancelled = false;
    const checkStock = async () => {
      let saved: any[] = readDirectCheckout() || readSelectedCheckout() || readLocalCart();
      for (const item of saved) {
        const res = await apiFetch(`/api/products/${item.id}`);
        const product = res.ok ? await res.json().catch(() => null) : null;
        const optionId = Number(item.option_id) || 0;
        const option = optionId
          ? (product?.options || []).find((row: any) => Number(row.id) === optionId)
          : null;
        const stock = Math.max(0, Number(option ? option.stock : product?.stock) || 0);
        const qty = Math.max(1, Number(item.quantity) || 1);
        if (!product || product.sale_mode === "preorder" || stock < qty) {
          if (!cancelled) {
            toast.error("재고가 부족합니다.");
            navigate("/cart", { replace: true });
          }
          return;
        }
        if (product.sale_mode === "reserved") {
          const me = await apiFetch(`/api/products/${product.id}/preorder/me`);
          const data = me.ok ? await me.json().catch(() => null) : null;
          if (!data?.reserved) {
            if (!cancelled) {
              toast.error("사전 예약자만 구매할 수 있는 상품입니다");
              navigate("/cart", { replace: true });
            }
            return;
          }
        }
      }
      if (!cancelled) setStockReady(true);
    };
    checkStock();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  // 2. Load Cart, User Profile, and Coupons
  useEffect(() => {
    try {
      const savedCart = readDirectCheckout() || readSelectedCheckout() || readLocalCart();
      setCart(savedCart);
    } catch {
      setCart([]);
    }

    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        let draft: any = null;
        try {
          draft = JSON.parse(sessionStorage.getItem("benua_checkout_draft") || "null");
        } catch {
          draft = null;
        }
        if (d.user) {
          setUser(d.user);
          setCustomerName(draft?.customerName || d.user.name || "");
          setCustomerEmail(draft?.customerEmail || d.user.email || "");
          setCustomerPhone(draft?.customerPhone || d.user.phone || "");
          setZipcode(draft?.zipcode || d.user.zipcode || "");
          setAddress(draft?.address || d.user.address || "");
          setDetailAddress(draft?.detailAddress || d.user.detail_address || "");
        } else if (draft) {
          setCustomerName(draft.customerName || "");
          setCustomerEmail(draft.customerEmail || "");
          setCustomerPhone(draft.customerPhone || "");
          setZipcode(draft.zipcode || "");
          setAddress(draft.address || "");
          setDetailAddress(draft.detailAddress || "");
        }
      })
      .catch(() => {});

    apiFetch("/api/coupons/me")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setCoupons(Array.isArray(list) ? list : []))
      .catch(() => {});
    apiFetch("/api/addresses")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setAddresses(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      "benua_checkout_draft",
      JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        zipcode,
        address,
        detailAddress,
      })
    );
  }, [customerName, customerEmail, customerPhone, zipcode, address, detailAddress]);

  useEffect(() => {
    const zip = zipcode.replace(/\D/g, "");
    if (zip.length < 5) {
      setShipRule((prev) => ({ ...prev, extra: 0 }));
      return;
    }
    apiFetch(`/api/shipping/extra?zip=${zip}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setShipRule({
          extra: Number(data.extra) || 0,
          shipping_fee: Number(data.shipping_fee) || 3000,
          free_min: Number(data.free_min) || 50000,
        });
      })
      .catch(() => {});
  }, [zipcode]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId);

  let couponDiscount = 0;
  let isShippingCoupon = false;
  if (selectedCoupon && subtotal >= (selectedCoupon.min_order_amount || 0)) {
    if (selectedCoupon.type === "FIXED") {
      couponDiscount = selectedCoupon.value;
    } else if (selectedCoupon.type === "PERCENT") {
      couponDiscount = Math.floor(subtotal * (selectedCoupon.value / 100));
      if (
        selectedCoupon.max_discount_amount > 0 &&
        couponDiscount > selectedCoupon.max_discount_amount
      ) {
        couponDiscount = selectedCoupon.max_discount_amount;
      }
    } else if (selectedCoupon.type === "SHIPPING") {
      isShippingCoupon = true;
    }
  }

  const isFreeShippingTier =
    user?.tier === "BLACK" || user?.tier === "THE_BLACK";
  const baseShippingFee = subtotal >= shipRule.free_min || subtotal === 0 ? 0 : shipRule.shipping_fee;
  const shippingFee = (isFreeShippingTier || isShippingCoupon ? 0 : baseShippingFee) + (subtotal === 0 ? 0 : shipRule.extra);
  const payableBeforePoints = Math.max(0, subtotal + shippingFee - couponDiscount);
  const pointBalance = Number(user?.points || 0);
  const maxUsablePoints = Math.min(pointBalance, payableBeforePoints);
  const pointsNeedMinimum = payableBeforePoints >= 1000 && pointBalance < 1000;
  const totalAmount = Math.max(0, payableBeforePoints - usePoints);

  useEffect(() => {
    if (pointsNeedMinimum) {
      setUsePoints(0);
      return;
    }
    setUsePoints((value) => Math.min(value, maxUsablePoints));
  }, [maxUsablePoints, pointsNeedMinimum]);

  useEffect(() => {
    if (couponTouched.current || coupons.length === 0) return;
    let bestId: number | null = null;
    let best = 0;
    for (const coupon of coupons) {
      if (subtotal < (Number(coupon.min_order_amount) || 0)) continue;
      let amount = 0;
      if (coupon.type === "FIXED") amount = Number(coupon.value) || 0;
      else if (coupon.type === "PERCENT") {
        amount = Math.floor(subtotal * ((Number(coupon.value) || 0) / 100));
        const cap = Number(coupon.max_discount_amount) || 0;
        if (cap > 0) amount = Math.min(amount, cap);
      } else if (coupon.type === "SHIPPING") amount = shippingFee;
      if (amount > best) {
        best = amount;
        bestId = coupon.id;
      }
    }
    if (bestId) setSelectedCouponId(bestId);
  }, [coupons, subtotal, shippingFee]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("쇼핑백이 비어 있습니다.");
      return;
    }
    const focusId = (id: string) => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };
    if (!customerName.trim()) {
      setFormError("수령인 이름을 입력해주세요.");
      focusId("customer-name");
      return;
    }
    if (!phoneOk(customerPhone)) {
      setFormError("연락처는 010으로 시작하는 번호로 입력해주세요.");
      focusId("customer-phone");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setFormError("주문 안내를 받을 이메일을 입력해주세요.");
      focusId("customer-email");
      return;
    }
    if (!isGift && !zipcode.trim()) {
      setFormError("우편번호를 입력해주세요.");
      focusId("customer-zip");
      return;
    }
    if (!isGift && !address.trim()) {
      setFormError("주소를 입력해주세요.");
      focusId("customer-address");
      return;
    }
    if (totalAmount > 0 && !TOSS_CLIENT_KEY) {
      setFormError("결제 설정 오류입니다. 잠시 후 다시 시도해주세요.");
      toast.error("결제 설정 오류");
      return;
    }
    setFormError("");
    if (usePoints > maxUsablePoints) {
      toast.error("보유 포인트와 결제 금액 안에서만 사용할 수 있습니다.");
      return;
    }
    if (usePoints > 0 && usePoints < 1000 && payableBeforePoints >= 1000) {
      toast.error("포인트는 1,000P부터 사용할 수 있습니다.");
      return;
    }

    setIsProcessing(true);
    let prepOrderNumber = "";
    try {
      const fullAddress = `[${zipcode}] ${address} ${detailAddress}`.trim();
      const prepRes = await apiFetch("/api/orders/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: fullAddress,
          zipcode,
          total_amount: totalAmount,
          shipping_fee: shippingFee,
          items: cart,
          used_points: usePoints,
          used_coupon_id: selectedCouponId,
          payment_method: paymentMethod,
          shipping_memo: [shippingMemo === "직접 입력" ? memoCustom : shippingMemo, gateCode ? `공동현관 ${gateCode}` : ""]
            .filter(Boolean)
            .join(" / "),
          is_gift: isGift,
          gift_message: giftMessage,
        }),
      });

      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        setFormError(prepData.error || "주문 준비에 실패했습니다.");
        setIsProcessing(false);
        return;
      }

      // If 0 KRW order (paid fully by points/coupon)
      if (prepData.order_number) prepOrderNumber = prepData.order_number;
      if (prepData.gift_token) sessionStorage.setItem("benua_gift_token", prepData.gift_token);

      if (prepData.zeroAmountPaid) {
        if (readDirectCheckout()) clearDirectCheckout();
        else saveCart([], "replace");
        setCompletedOrderNumber(prepData.order_number);
        setIsProcessing(false);
        return;
      }

      // Launch Toss Payments Standard SDK Window
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const customerKey = user?.id ? `USER_${user.id}` : `GUEST_${Date.now()}`;
      const payment = tossPayments.payment({ customerKey });

      const originUrl = window.location.origin;
      const successUrl = `${originUrl}/checkout`;
      const failUrl = `${originUrl}/checkout`;

      if (paymentMethod === "vbank") {
        await payment.requestPayment({
          method: "VIRTUAL_ACCOUNT",
          amount: { currency: "KRW", value: prepData.amount },
          orderId: prepData.order_number,
          orderName: prepData.order_name,
          customerName,
          customerEmail,
          successUrl,
          failUrl,
          virtualAccount: {
            cashReceipt: { type: "미발행" },
            useEscrow: false,
            validHours: 24,
          },
        });
      } else if (paymentMethod === "transfer") {
        await payment.requestPayment({
          method: "TRANSFER",
          amount: { currency: "KRW", value: prepData.amount },
          orderId: prepData.order_number,
          orderName: prepData.order_name,
          customerName,
          customerEmail,
          successUrl,
          failUrl,
        });
      } else {
        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: prepData.amount },
          orderId: prepData.order_number,
          orderName: prepData.order_name,
          customerName,
          customerEmail,
          successUrl,
          failUrl,
          card: {
            useEscrow: false,
            flowMode: "DEFAULT",
            useCardPoint: false,
            useAppCardOnly: false,
          },
        });
      }
    } catch (err: any) {
      if (prepOrderNumber) {
        apiFetch("/api/orders/abandon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_number: prepOrderNumber }),
        }).catch(() => {});
      }
      if (err?.code !== "USER_CANCEL") {
        setFormError(err?.message || "결제창을 열지 못했습니다. 주소와 우편번호를 확인한 뒤 다시 시도해주세요.");
      }
      setIsProcessing(false);
    }
  };

  if (completedOrderNumber) {
    return (
      <div className="pt-32 pb-24 px-6 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-venuea-gold/15 text-venuea-gold flex items-center justify-center mx-auto">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="text-3xl font-serif font-bold text-venuea-dark">
          주문이 정상 접수되었습니다
        </h1>
        <p className="text-sm text-venuea-muted">
          주문번호: <b className="text-venuea-dark font-mono">{completedOrderNumber}</b>
        </p>
        {giftLink && (
          <p className="text-sm text-venuea-brown break-all">
            선물 수령 링크
            <br />
            {giftLink}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(completedOrderNumber).then(
              () => toast.success("주문번호를 복사했습니다."),
              () => toast.error("복사하지 못했습니다. 번호를 직접 적어주세요.")
            );
          }}
          className="px-5 py-3 rounded-full border border-venuea-green bg-white text-venuea-green text-sm font-bold"
        >
          주문번호 복사
        </button>

        {vbankResult && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs space-y-1.5">
            <p className="font-bold text-amber-900">가상계좌 입금 안내</p>
            <p>은행코드: {vbankResult.bank}</p>
            <p>계좌번호: {vbankResult.account}</p>
            <p>입금기한: {new Date(vbankResult.dueDate).toLocaleString("ko-KR")}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => navigate("/track")}
            className="flex-1 py-3.5 border border-gray-200 bg-white rounded-xl text-xs font-bold uppercase tracking-widest"
          >
            주문 조회
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="flex-1 py-3.5 bg-venuea-dark text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold"
          >
            계속 쇼핑하기
          </button>
        </div>
      </div>
    );
  }

  if (!stockReady && !completedOrderNumber) {
    return (
      <div className="pt-40 flex justify-center">
        <Loader2 className="animate-spin text-venuea-green" />
      </div>
    );
  }

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-6xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark mb-10">주문 및 결제</h1>

      <form onSubmit={handlePaymentSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Shipping & Discounts */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <h2 className="text-base font-bold text-venuea-dark">주문자 및 배송지 정보</h2>
            {formError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {formError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-name" className="block text-sm font-bold text-venuea-dark mb-1.5">
                  수령인
                </label>
                <input
                  id="customer-name"
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="이름"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="customer-phone" className="block text-sm font-bold text-venuea-dark mb-1.5">
                  연락처
                </label>
                <input
                  id="customer-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="010-0000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="customer-email" className="block text-sm font-bold text-venuea-dark mb-1.5">
                이메일
              </label>
              <input
                id="customer-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="주문 안내를 받을 주소"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div className="flex gap-2 items-end">
              <div>
                <label htmlFor="customer-zip" className="block text-sm font-bold text-venuea-dark mb-1.5">
                  우편번호
                </label>
                <input
                  id="customer-zip"
                  name="postal-code"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="우편번호"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value.replace(/[^\d-]/g, "").slice(0, 7))}
                  className="w-36 border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsPostcodeOpen(true)}
                className="px-4 py-3 bg-venuea-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <MapPin size={15} />
                <span>주소 검색</span>
              </button>
            </div>
            <div>
              <label htmlFor="customer-address" className="block text-sm font-bold text-venuea-dark mb-1.5">
                주소
              </label>
              <input
                id="customer-address"
                name="address-line1"
                autoComplete="address-line1"
                required
                placeholder="기본 주소"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="customer-address-detail" className="block text-sm font-bold text-venuea-dark mb-1.5">
                상세 주소
              </label>
              <input
                id="customer-address-detail"
                name="address-line2"
                autoComplete="address-line2"
                placeholder="동, 호수"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
              />
            </div>
            {user && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await apiFetch("/api/addresses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        label: "배송지",
                        name: customerName,
                        phone: customerPhone,
                        zipcode,
                        address,
                        detail_address: detailAddress,
                        is_default: addresses.length === 0,
                      }),
                    });
                    if (!res.ok) return toast.error("주소를 저장하지 못했습니다.");
                    const list = await apiFetch("/api/addresses");
                    setAddresses(list.ok ? await list.json() : []);
                    toast.success("주소록에 저장했습니다.");
                  }}
                  className="text-xs font-bold text-venuea-green"
                >
                  이 주소 저장
                </button>
                {addresses.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setCustomerName(row.name || customerName);
                      setCustomerPhone(row.phone || customerPhone);
                      setZipcode(row.zipcode || "");
                      setAddress(row.address || "");
                      setDetailAddress(row.detail_address || "");
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#faf2e7] text-xs font-bold text-venuea-dark"
                  >
                    {row.label || row.address}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-2xl border border-gray-200 space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
              선물하기
            </label>
            {isGift && (
              <input
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="선물 메시지"
                className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
              />
            )}
            <label className="block text-sm font-bold text-venuea-dark">배송 요청</label>
            <select
              value={shippingMemo}
              onChange={(e) => setShippingMemo(e.target.value)}
              className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
            >
              <option>문 앞에 놓아주세요</option>
              <option>경비실에 맡겨주세요</option>
              <option>택배함에 넣어주세요</option>
              <option>직접 입력</option>
            </select>
            {shippingMemo === "직접 입력" && (
              <input
                value={memoCustom}
                onChange={(e) => setMemoCustom(e.target.value)}
                className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
              />
            )}
            <input
              value={gateCode}
              onChange={(e) => setGateCode(e.target.value)}
              placeholder="공동현관 비밀번호"
              className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
            />
          </section>

          {user && (
            <section className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
              <h2 className="text-base font-bold text-venuea-dark">쿠폰 및 포인트 적용</h2>
              <div>
                <label className="block text-sm font-bold text-venuea-dark mb-1.5">보유 쿠폰 선택</label>
                <select
                  value={selectedCouponId || ""}
                  onChange={(e) => {
                    couponTouched.current = true;
                    setSelectedCouponId(e.target.value ? Number(e.target.value) : null);
                  }}
                  className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm"
                >
                  <option value="">선택 안 함</option>
                  {coupons.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={subtotal < (c.min_order_amount || 0)}
                    >
                      {c.name} (최소주문 {formatPrice(c.min_order_amount || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="text-sm font-bold text-venuea-dark whitespace-nowrap">
                    포인트 사용 · 보유 {pointBalance.toLocaleString()}P
                  </label>
                  <button
                    type="button"
                    disabled={pointsNeedMinimum || maxUsablePoints < 1000}
                    onClick={() => setUsePoints(maxUsablePoints)}
                    className="text-[11px] font-bold text-venuea-gold whitespace-nowrap disabled:text-gray-300"
                  >
                    전액 사용
                  </button>
                </div>
                <input
                  inputMode="numeric"
                  disabled={pointsNeedMinimum}
                  value={pointsNeedMinimum ? "" : usePoints ? String(usePoints) : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    const next = digits ? Number(digits) : 0;
                    setUsePoints(Math.min(maxUsablePoints, next));
                  }}
                  placeholder="0"
                  className="w-full border border-gray-300 bg-white text-venuea-dark placeholder:text-[#4a4036] rounded-xl px-4 py-3 text-sm disabled:bg-gray-50"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {payableBeforePoints >= 1000
                    ? "1,000P부터 사용할 수 있습니다."
                    : `최대 ${maxUsablePoints.toLocaleString()}P`}
                </p>
              </div>
            </section>
          )}

          <section className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <h2 className="text-base font-bold text-venuea-dark">결제 수단</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "card", label: "신용/체크카드" },
                { id: "vbank", label: "가상계좌" },
                { id: "transfer", label: "실시간 계좌이체" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={cn(
                    "py-3.5 px-3 rounded-xl border text-xs font-bold transition-all",
                    paymentMethod === m.id
                      ? "border-venuea-dark bg-venuea-dark text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">카드 결제는 토스페이먼츠 결제창에서 진행됩니다.</p>
          </section>
        </div>

        {/* Right: Summary */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 h-fit space-y-5">
          <h2 className="text-base font-bold text-venuea-dark">결제 요약</h2>
          <div className="divide-y divide-gray-200/60 text-sm space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex justify-between">
                <span className="text-gray-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>상품 합계</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>배송비</span>
              <span>{shippingFee === 0 ? "무료" : formatPrice(shippingFee)}</span>
            </div>
            {shipRule.extra > 0 && (
              <p className="text-[11px] text-venuea-brown">제주·도서산간 추가배송비 {formatPrice(shipRule.extra)} 포함</p>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-venuea-gold font-bold">
                <span>쿠폰 할인</span>
                <span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            {usePoints > 0 && (
              <div className="flex justify-between text-venuea-gold font-bold">
                <span>포인트 사용</span>
                <span>-{formatPrice(usePoints)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-venuea-dark pt-3 border-t">
              <span>최종 결제금액</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || cart.length === 0 || (totalAmount > 0 && !TOSS_CLIENT_KEY)}
            className="w-full bg-venuea-dark text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            <span>{formatPrice(totalAmount)} 결제하기</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck size={14} />
            <span>토스페이먼츠 안전결제(에스크로)가 적용됩니다</span>
          </div>
        </div>
      </form>

      {isPostcodeOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-bold text-sm">우편번호 검색</span>
              <button type="button" aria-label="주소 검색 닫기" onClick={() => setIsPostcodeOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <DaumPostcodeEmbed
              onComplete={(data) => {
                setZipcode(data.zonecode);
                setAddress(data.address);
                setIsPostcodeOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}