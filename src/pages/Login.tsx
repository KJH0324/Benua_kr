import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, Chrome, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

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
          <button className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-[#4285F4] font-bold">
            G
          </button>
          <button className="w-10 h-10 rounded-full border border-venuea-dark/10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-[#03C75A] font-bold">
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

        <form className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">성함</label>
              <input 
                type="text" 
                className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
                placeholder="홍길동"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-dark/60">이메일 주소</label>
            <input 
              type="email" 
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
              className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 focus:outline-none focus:border-venuea-gold transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all group flex items-center justify-center space-x-3">
            <span>{isLogin ? "로그인" : "계정 생성"}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
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
