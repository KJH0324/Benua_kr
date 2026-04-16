import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("관리자 로그인 성공");
        navigate("/admin");
      } else {
        toast.error(data.error || "로그인 실패");
      }
    } catch (error) {
      toast.error("서버 연결 오류");
    } finally {
      setIsLoading(false);
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">관리자 비밀번호</label>
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
          <button 
            disabled={isLoading}
            className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
          >
            <span>{isLoading ? "인증 중..." : "시스템 접속"}</span>
            {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-venuea-dark/5 text-center">
          <p className="text-[10px] text-venuea-dark/20 uppercase tracking-[0.2em]">
            Benua 보안 프로토콜 v2.4
          </p>
        </div>
      </motion.div>
    </div>
  );
}
