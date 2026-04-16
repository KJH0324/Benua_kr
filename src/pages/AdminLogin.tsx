import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminLogin() {
  const [step, setStep] = useState(1); // 1: Credentials, 2: 2FA
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const navigate = useNavigate();

  const handleCredentialsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real app, this would verify with the backend
    if (adminId === "admin" && password === "admin123") {
      setStep(2);
      toast.success("Credentials verified. Please enter 2FA code.");
    } else {
      toast.error("Invalid administrator credentials.");
    }
  };

  const handle2FASubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Simulated 2FA verification
    if (twoFactorCode === "123456") {
      toast.success("Administrator login successful.");
      navigate("/admin");
    } else {
      toast.error("Invalid 2FA code.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] px-8 md:px-[60px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md p-10 shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-venuea-dark/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-venuea-dark text-venuea-gold mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-venuea-dark uppercase tracking-[4px]">Benua Admin</h1>
          <p className="text-sm text-venuea-muted mt-2">관리자 전용 보안 로그인 시스템</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">관리자 ID</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-venuea-dark focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="ID 입력"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">비밀번호</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-venuea-dark focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group">
                <span>신원 확인</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handle2FASubmit}
              className="space-y-6"
            >
              <div className="bg-venuea-gold/10 border border-venuea-gold/20 p-4 rounded-xl flex items-start space-x-3 mb-6">
                <AlertCircle className="text-venuea-gold flex-shrink-0" size={18} />
                <p className="text-xs text-venuea-gold leading-relaxed">
                  <strong>2단계 인증 필요:</strong> 등록된 기기의 인증 앱에서 생성된 6자리 코드를 입력해주세요.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">2FA 코드</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-venuea-dark text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-venuea-gold transition-colors"
                  placeholder="000000"
                  required
                />
              </div>
              <button className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all">
                인증 및 로그인
              </button>
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-xs text-venuea-dark/30 hover:text-venuea-dark transition-colors"
              >
                이전 단계로 돌아가기
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-8 border-t border-venuea-dark/5 text-center">
          <p className="text-[10px] text-venuea-dark/20 uppercase tracking-[0.2em]">
            Benua 보안 프로토콜 v2.4
          </p>
        </div>
      </motion.div>
    </div>
  );
}
