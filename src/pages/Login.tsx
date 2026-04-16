import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Chrome, ArrowRight, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DaumPostcode from "react-daum-postcode";

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
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const handleComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setFormData({
      ...formData,
      zipcode: data.zonecode,
      address: fullAddress,
    });
    setIsAddressModalOpen(false);
  };

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
        navigate("/profile");
        // Reload to update auth state globally if needed
        window.location.reload();
      } else {
        toast.error(data.error || "오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("서버와 통신할 수 없습니다.");
    }
  };

  const handleOAuth = async (provider: string) => {
    try {
      const response = await fetch(`/api/auth/${provider.toLowerCase()}/url`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        toast.error('팝업 차단을 해제해주세요.');
      }
    } catch (error) {
      toast.error('로그인 URL을 가져오는데 실패했습니다.');
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_SUCCESS') {
        toast.success("로그인되었습니다.");
        navigate("/profile");
        window.location.reload();
      } else if (event.data?.type === 'OAUTH_ERROR') {
        if (event.data.error === 'not_registered') {
          toast.error("가입된 계정이 없습니다. 회원가입을 진행해주세요.");
          setIsLogin(false);
        } else {
          toast.error("소셜 로그인 중 오류가 발생했습니다.");
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

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
          <button onClick={() => handleOAuth('Google')} type="button" className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button onClick={() => handleOAuth('Naver')} type="button" className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" fill="#03C75A"/>
            </svg>
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
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">주소</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    readOnly
                    value={formData.zipcode}
                    className="w-1/3 bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none transition-colors text-venuea-dark/60 cursor-not-allowed"
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
                  required
                  readOnly
                  value={formData.address}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none transition-colors text-venuea-dark/60 cursor-not-allowed"
                  placeholder="기본 주소"
                />
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
                <DaumPostcode onComplete={handleComplete} style={{ height: '100%' }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
