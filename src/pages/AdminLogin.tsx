import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, KeyRound, Lock, ArrowRight, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, authStorage } from "../lib/api";
import { isAdminSubdomain } from "../lib/subdomain";

export default function AdminLogin() {
  const navigate = useNavigate();
  const isAdminSub = isAdminSubdomain();

  const [step, setStep] = useState<"KEY" | "TOTP">("KEY");
  const [adminKey, setAdminKey] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      toast.error("관리자 보안 키를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey: adminKey.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "유효하지 않은 보안 키입니다.");
        return;
      }

      setRequiresSetup(Boolean(data.requiresSetup));
      setTotpSecret(data.secret || "");
      setQrCodeUrl(data.qrCodeUrl || "");
      setStep("TOTP");
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      toast.error("6자리 OTP 인증번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          token: totpCode.trim(),
          secret: totpSecret || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "OTP 인증에 실패했습니다.");
        return;
      }

      if (data.token) {
        authStorage.setAdminToken(data.token);
      }

      toast.success("관리자 콘솔에 로그인되었습니다.");
      navigate(isAdminSub ? "/" : "/admin");
    } catch {
      toast.error("인증 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1B] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 bg-venuea-dark text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-venuea-gold/20 border border-venuea-gold/40 flex items-center justify-center mx-auto mb-4">
            <Shield className="text-venuea-gold" size={24} />
          </div>
          <h1 className="font-logo text-2xl tracking-[6px] uppercase">Benua</h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 mt-1">
            Admin Security Console
          </p>
        </div>

        <div className="p-8">
          {step === "KEY" ? (
            <form onSubmit={handleVerifyKey} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Step 1. 관리자 보안 키 (Admin Key)
                </label>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="보안 키를 입력하세요"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-venuea-gold focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-venuea-dark text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                <span>다음 단계 (2FA 인증)</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyTotp} className="space-y-6">
              {requiresSetup && qrCodeUrl && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-venuea-dark">
                    <QrCode size={16} className="text-venuea-gold" />
                    <span>최초 2FA OTP 등록이 필요합니다</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Google Authenticator 앱으로 아래 QR 코드를 스캔한 뒤 표시되는 6자리 번호를 입력해주세요.
                  </p>
                  <img
                    src={qrCodeUrl}
                    alt="TOTP QR Code"
                    className="w-40 h-40 mx-auto rounded-lg border border-gray-200 bg-white p-2"
                  />
                  <div className="text-[11px] font-mono bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-600 break-all">
                    수동 입력 키: {totpSecret}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Step 2. 6자리 OTP 인증번호
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center tracking-[0.5em] font-mono text-lg font-bold focus:outline-none focus:border-venuea-gold focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("KEY");
                    setTotpCode("");
                  }}
                  className="w-1/3 py-3.5 rounded-xl border border-gray-200 bg-white text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 bg-venuea-dark text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  <span>인증 및 접속</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
