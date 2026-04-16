import React, { useState } from "react";
import { motion } from "motion/react";
import { Search, Package, Truck, CheckCircle2, MapPin, Clock } from "lucide-react";

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleTrack = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Mock tracking data
    if (orderId) {
      setTrackingData({
        id: orderId,
        status: "shipped",
        steps: [
          { status: "주문 완료", date: "2024.04.12", completed: true },
          { status: "상품 준비중", date: "2024.04.13", completed: true },
          { status: "배송 시작", date: "2024.04.14", completed: true },
          { status: "배송 중", date: "대기중", completed: false },
          { status: "배송 완료", date: "대기중", completed: false },
        ],
        currentLocation: "서울 물류 센터",
        estimatedDelivery: "2024.04.16"
      });
    }
  };

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-6 uppercase tracking-tight">주문 배송 조회</h1>
          <p className="text-venuea-muted">주문 번호를 입력하여 실시간 배송 상태를 확인하세요.</p>
        </header>

        <form onSubmit={handleTrack} className="flex space-x-4 mb-16">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-venuea-dark/30" size={20} />
            <input 
              type="text" 
              placeholder="주문 번호 (예: BN-12345)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full bg-[#F9F9F9] border border-venuea-dark/10 pl-12 pr-4 py-4 focus:outline-none focus:border-venuea-gold transition-colors"
            />
          </div>
          <button className="bg-venuea-dark text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all">
            조회하기
          </button>
        </form>

        {trackingData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-venuea-dark/5 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.05)]"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-8 border-b border-venuea-dark/5 space-y-4 md:space-y-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-muted mb-1">주문 번호</p>
                <h3 className="text-xl font-bold text-venuea-dark">#{trackingData.id}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-muted mb-1">예상 도착일</p>
                <h3 className="text-xl font-bold text-venuea-gold">{trackingData.estimatedDelivery}</h3>
              </div>
            </div>

            <div className="relative space-y-12">
              {/* Vertical Line */}
              <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-venuea-dark/10 z-0" />

              {trackingData.steps.map((step: any, i: number) => (
                <div key={i} className="relative z-10 flex items-start space-x-8">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed ? "bg-venuea-gold text-white" : "bg-white border border-venuea-dark/10 text-venuea-dark/20"
                  }`}>
                    {step.completed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-grow">
                    <h4 className={`text-sm font-bold uppercase tracking-widest ${step.completed ? "text-venuea-dark" : "text-venuea-dark/30"}`}>
                      {step.status}
                    </h4>
                    <p className="text-xs text-venuea-muted mt-1">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-[#F9F9F9] flex items-center space-x-4">
              <div className="p-3 bg-white text-venuea-gold shadow-sm">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-muted">현재 위치</p>
                <p className="text-sm font-bold text-venuea-dark">{trackingData.currentLocation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
