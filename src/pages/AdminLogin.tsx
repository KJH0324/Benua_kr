import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Lock, Loader2 } from "lucide-react";
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
      toast.error("인증 앱의 6자리를 입력해주세요.");
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
        toast.error(data.error || "인증번호가 맞지 않습니다.");
        return;
      }

      if (data.token) {
        authStorage.setAdminToken(data.token);
      }

      toast.success("로그인했습니다.");
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
          <img src="/benua_primary_notag_beige.svg" alt="Benua" width="1677" height="682" className="h-14 w-auto mx-auto" />
          <p className="text-sm text-gray-300 mt-3">관리자</p>
        </div>

        <div className="p-8">
          {step === "KEY" ? (
            <form onSubmit={handleVerifyKey} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">관리자 키</label>
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
                    placeholder="키"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-venuea-gold focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-venuea-dark text-white py-3.5 rounded-xl text-sm font-bold hover:bg-venuea-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                <span>다음</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyTotp} className="space-y-6">
              {requiresSetup && qrCodeUrl && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-3">
                  <p className="text-sm font-bold text-venuea-dark">인증 앱에 이 QR을 등록하세요</p>
                  <p className="text-xs text-gray-500">인증 앱으로 찍고, 나오는 6자리를 입력하세요.</p>
                  <img
                    src={qrCodeUrl}
                    alt="인증 앱 QR"
                    className="w-40 h-40 mx-auto rounded-lg border border-gray-200 bg-white p-2"
                  />
                  <div className="text-[11px] font-mono bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-600 break-all">
                    앱에 직접 넣을 키: {totpSecret}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">인증 앱 6자리</label>
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
                  className="w-1/3 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 bg-venuea-dark text-white py-3.5 rounded-xl text-sm font-bold hover:bg-venuea-gold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  <span>로그인</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
