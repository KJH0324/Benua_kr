import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, Chrome, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    zipcode: "",
    address: "",
    detail_address: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(isLogin ? "로그인되었습니다." : "회원가입이 완료되었습니다.");
        navigate("/");
        // Reload to update auth state globally if needed
        window.location.reload();
      } else {
        toast.error(data.error || "오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("서버와 통신할 수 없습니다.");
    }
  };

  const handleOAuth = (provider: string) => {
    toast.info(`${provider} 로그인은 현재 준비 중입니다. OAuth 2.0 클라이언트 ID 및 시크릿 발급 후 연동될 예정입니다.`);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 md:px-[60px] flex items-center justify-center bg-[#F9F9F9]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-10 shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-venuea-dark/5"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-venuea-dark mb-2 tracking-tight uppercase">
            {isLogin ? "환영합니다" : "계정 생성"}
          </h1>
          <p className="text-sm text-venuea-muted">
            {isLogin ? "로그인하여 주문과 프로필을 관리하세요." : "베누아 멤버십에 가입하여 프리미엄 쇼핑을 경험하세요."}
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-8">
          <button onClick={() => handleOAuth('Google')} type="button" className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-[#4285F4] font-bold">
            G
          </button>
          <button onClick={() => handleOAuth('Naver')} type="button" className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-[#03C75A] font-bold">
            N
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-venuea-dark/10"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[2px]">
            <span className="bg-white px-4 text-venuea-dark/30">또는 이메일로 계속하기</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">성함</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">전화번호</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">우편번호</label>
                  <input 
                    type="text" 
                    required
                    value={formData.zipcode}
                    onChange={e => setFormData({...formData, zipcode: e.target.value})}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="12345"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">기본 주소</label>
                  <input 
                    type="text" 
                    required
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="서울특별시 강남구 테헤란로"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">상세 주소</label>
                <input 
                  type="text" 
                  required
                  value={formData.detail_address}
                  onChange={e => setFormData({...formData, detail_address: e.target.value})}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                  placeholder="101동 202호"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">이메일 주소</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">비밀번호</label>
              {isLogin && <button type="button" className="text-[10px] text-venuea-gold font-bold uppercase tracking-widest">비밀번호 찾기</button>}
            </div>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all group flex items-center justify-center space-x-3">
            <span>{isLogin ? "로그인" : "계정 생성"}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[11px] font-bold uppercase tracking-[1px] text-venuea-dark/40 hover:text-venuea-gold transition-colors"
          >
            {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
