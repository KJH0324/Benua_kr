import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ArrowRight, KeyRound, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isAdminSubdomain } from "../lib/subdomain";

export default function AdminLogin() {
  const [step, setStep] = useState<'key' | 'totp'>('key');
  const [adminKey, setAdminKey] = useState("");
  const [token, setToken] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [tokenError, setTokenError] = useState("");
  const navigate = useNavigate();
  const isAdminSub = isAdminSubdomain();

  const handleKeySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminKey) {
      setKeyError("관리자 Key를 입력하세요");
      return;
    }
    setKeyError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresSetup) {
          setQrCodeUrl(data.qrCodeUrl);
          setSecret(data.secret);
        }
        setStep('totp');
      } else {
        toast.error(data.error || "유효하지 않은 Key입니다.");
      }
    } catch (error) {
      toast.error("서버 연결 오류");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (token.length !== 6) {
      setTokenError("6자리 코드를 입력하세요");
      return;
    }
    setTokenError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey, token, secret }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("관리자 로그인 성공");
        navigate(isAdminSub ? "/" : "/admin");
      } else {
        toast.error(data.error || "인증 실패");
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

        <AnimatePresence mode="wait">
          {step === 'key' ? (
            <motion.form 
              key="key-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleKeySubmit} 
              noValidate
              className="space-y-6"
            >
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">관리자 Key</label>
                {keyError && (
                  <span className="absolute top-0 right-0 text-[#FF4000] text-[10px] font-bold">{keyError}</span>
                )}
                <div className="relative">
                  <input 
                    type="password" 
                    value={adminKey}
                    onChange={(e) => {
                      setAdminKey(e.target.value);
                      if (e.target.value) setKeyError("");
                    }}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-venuea-dark focus:outline-none focus:border-venuea-gold transition-colors"
                    placeholder="관리자 Key를 입력하세요"
                  />
                  <KeyRound size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-venuea-dark/20" />
                </div>
              </div>
              <button 
                disabled={isLoading}
                className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
              >
                <span>{isLoading ? "확인 중..." : "다음 단계"}</span>
                {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="totp-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleTotpSubmit} 
              noValidate
              className="space-y-6"
            >
              {qrCodeUrl && (
                <div className="mb-6 text-center">
                  <p className="text-xs text-venuea-dark/60 mb-4">
                    새로운 기기입니다. Google Authenticator 등 OTP 앱으로 아래 QR 코드를 스캔하여 2FA를 등록해주세요.
                  </p>
                  <div className="inline-block p-2 bg-white border border-venuea-dark/10 rounded-lg">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                  </div>
                </div>
              )}

              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">2FA 인증 코드</label>
                {tokenError && (
                  <span className="absolute top-0 right-0 text-[#FF4000] text-[10px] font-bold">{tokenError}</span>
                )}
                <div className="relative">
                  <input 
                    type="text" 
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                      if (e.target.value) setTokenError("");
                    }}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-venuea-dark focus:outline-none focus:border-venuea-gold transition-colors text-center tracking-[0.5em] font-mono text-lg"
                    placeholder="000000"
                  />
                  <QrCode size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-venuea-dark/20" />
                </div>
              </div>
              <button 
                disabled={isLoading || token.length !== 6}
                className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
              >
                <span>{isLoading ? "인증 중..." : "시스템 접속"}</span>
                {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
              <button
                type="button"
                onClick={() => setStep('key')}
                className="w-full text-center text-xs text-venuea-dark/40 hover:text-venuea-dark transition-colors mt-4"
              >
                Key 다시 입력하기
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-8 border-t border-venuea-dark/5 text-center">
          <p className="text-[10px] text-venuea-dark/20 uppercase tracking-[0.2em]">
            Benua 보안 프로토콜 v3.0 (2FA)
          </p>
        </div>
      </motion.div>
    </div>
  );
}
