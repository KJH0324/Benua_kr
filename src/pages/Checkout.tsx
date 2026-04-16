import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatPrice } from "../lib/utils";
import DaumPostcode from "react-daum-postcode";
import { X, CreditCard, Wallet, Building } from "lucide-react";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  
  const { items, subtotal, shipping, total } = location.state || { items: [], subtotal: 0, shipping: 0, total: 0 };

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    zipcode: "",
    address: "",
    detail_address: ""
  });

  const [isOrderComplete, setIsOrderComplete] = useState(false);

  useEffect(() => {
    if (!location.state) {
      navigate("/cart");
      return;
    }

    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setFormData({
            name: data.user.name,
            phone: data.user.phone,
            zipcode: data.user.zipcode,
            address: data.user.address,
            detail_address: data.user.detail_address
          });
        } else {
          navigate("/login");
        }
      });
  }, [navigate, location.state]);

  const handleCompleteAddress = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setFormData({
      ...formData,
      zipcode: data.zonecode,
      address: fullAddress,
    });
    setIsAddressModalOpen(false);
  };

  const handlePayment = async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          customer_name: formData.name,
          customer_email: user.email,
          shipping_address: `[${formData.zipcode}] ${formData.address} ${formData.detail_address}`,
          total_amount: total,
          shipping_fee: shipping
        })
      });

      if (response.ok) {
        localStorage.removeItem("venuea-cart");
        setIsOrderComplete(true);
      } else {
        toast.error("주문 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("서버와 통신할 수 없습니다.");
    }
  };

  if (!user) return <div className="pt-32 min-h-screen flex justify-center">로딩 중...</div>;

  if (isOrderComplete) {
    return (
      <div className="pt-32 pb-20 px-6 min-h-screen flex items-center justify-center bg-[#F9F9F9]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 text-center max-w-md w-full shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-venuea-dark/5"
        >
          <div className="w-16 h-16 bg-venuea-gold/10 text-venuea-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-venuea-dark mb-4 uppercase tracking-widest">주문 완료</h2>
          <p className="text-venuea-muted mb-8 text-sm">
            고객님의 주문이 성공적으로 완료되었습니다.<br/>
            주문 내역은 마이페이지에서 확인하실 수 있습니다.
          </p>
          <button 
            onClick={() => navigate("/profile")}
            className="w-full bg-venuea-dark text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-venuea-gold transition-colors"
          >
            마이페이지로 이동
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-venuea-dark uppercase tracking-tight mb-12">결제하기</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            
            {/* Shipping Info */}
            <section>
              <h2 className="text-lg font-bold text-venuea-dark mb-6 border-b border-venuea-dark/10 pb-2">배송지 정보</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">받는 사람</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">연락처</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">주소</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={formData.zipcode}
                      className="w-1/3 bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none text-venuea-dark/60 cursor-not-allowed"
                      placeholder="우편번호"
                    />
                    <button 
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="w-2/3 bg-venuea-dark text-white font-bold text-xs uppercase tracking-widest hover:bg-venuea-gold transition-colors"
                    >
                      우편번호 찾기
                    </button>
                  </div>
                  <input 
                    type="text" 
                    readOnly
                    value={formData.address}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none text-venuea-dark/60 cursor-not-allowed"
                    placeholder="기본 주소"
                  />
                  <input 
                    type="text" 
                    value={formData.detail_address}
                    onChange={e => setFormData({...formData, detail_address: e.target.value})}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="상세 주소"
                  />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section>
              <h2 className="text-lg font-bold text-venuea-dark mb-6 border-b border-venuea-dark/10 pb-2">결제 수단</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                <button 
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 border flex flex-col items-center justify-center space-y-2 transition-colors ${paymentMethod === "card" ? "border-venuea-gold bg-venuea-gold/5 text-venuea-gold" : "border-venuea-dark/10 text-venuea-dark/60 hover:border-venuea-dark/30"}`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold">신용카드</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod("transfer")}
                  className={`p-4 border flex flex-col items-center justify-center space-y-2 transition-colors ${paymentMethod === "transfer" ? "border-venuea-gold bg-venuea-gold/5 text-venuea-gold" : "border-venuea-dark/10 text-venuea-dark/60 hover:border-venuea-dark/30"}`}
                >
                  <Building size={24} />
                  <span className="text-xs font-bold">계좌이체</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod("virtual")}
                  className={`p-4 border flex flex-col items-center justify-center space-y-2 transition-colors ${paymentMethod === "virtual" ? "border-venuea-gold bg-venuea-gold/5 text-venuea-gold" : "border-venuea-dark/10 text-venuea-dark/60 hover:border-venuea-dark/30"}`}
                >
                  <Wallet size={24} />
                  <span className="text-xs font-bold">가상계좌</span>
                </button>
              </div>
            </section>

          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#F9F9F9] p-8 border border-venuea-dark/5 sticky top-32">
              <h2 className="text-lg font-bold text-venuea-dark mb-6 uppercase tracking-widest">주문 요약</h2>
              
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-venuea-dark/80 line-clamp-1 flex-1 pr-4">{item.name} x {item.quantity}</span>
                    <span className="font-mono">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t border-venuea-dark/10 pt-6 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-venuea-dark/60">합계</span>
                  <span className="font-mono">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-venuea-dark/60">배송비</span>
                  <span className="font-mono">{shipping === 0 ? "무료" : formatPrice(shipping)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-t border-venuea-dark/10 pt-6 mb-8">
                <span className="text-sm font-bold text-venuea-dark">총 결제 금액</span>
                <span className="text-2xl font-bold font-mono text-venuea-gold">{formatPrice(total)}</span>
              </div>

              <button 
                onClick={handlePayment}
                className="w-full bg-venuea-dark text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-venuea-gold transition-colors"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddressModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setIsAddressModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-venuea-dark">주소 검색</h3>
                <button onClick={() => setIsAddressModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="h-[400px]">
                <DaumPostcode onComplete={handleCompleteAddress} style={{ height: '100%' }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
