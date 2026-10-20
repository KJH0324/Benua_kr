import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, authStorage } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const afterAuthPath =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/profile";

  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "FORGOT">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [formError, setFormError] = useState("");

  // 이메일 인증 상태
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // 소셜 연동 가입 파라미터
  const [socialProvider, setSocialProvider] = useState<string | null>(null);
  const [socialId, setSocialId] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const prefillEmail = searchParams.get("email");
    const sId = searchParams.get("socialId");
    const provider = searchParams.get("provider");

    if (err === "not_registered") {
      setMode("REGISTER");
      if (prefillEmail) setEmail(prefillEmail);
      if (sId) setSocialId(sId);
      if (provider) setSocialProvider(provider);
      toast.info("가입된 계정 정보가 없습니다. 간편 회원가입을 완료해주세요.");
    }
  }, [searchParams]);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setIsSendingCode(true);
    try {
      const res = await apiFetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCodeSent(true);
        setIsEmailVerified(false);
        toast.success("인증번호가 이메일로 발송되었습니다.");
      } else {
        toast.error(data.error || "인증번호 발송에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error("6자리 인증번호를 입력해주세요.");
      return;
    }
    setIsVerifyingCode(true);
    try {
      const res = await apiFetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEmailVerified(true);
        toast.success("이메일 인증이 완료되었습니다.");
      } else {
        toast.error(data.error || "인증번호가 일치하지 않습니다.");
      }
    } catch {
      toast.error("인증 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (mode !== "FORGOT" && !password)) {
      setFormError(mode === "FORGOT" ? "이메일을 입력해주세요." : "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (mode === "REGISTER" && !name.trim()) {
      setFormError("성함을 입력해주세요.");
      return;
    }
    setFormError("");
    if (mode === "LOGIN") {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) authStorage.setUserToken(data.token);
        toast.success("로그인되었습니다.");
        navigate(afterAuthPath);
      } else {
        toast.error(data.error || "로그인에 실패했습니다.");
      }
    } else if (mode === "REGISTER") {
      if (!socialProvider && !isEmailVerified) {
        setFormError("이메일 인증을 먼저 완료해주세요.");
        return;
      }

      const payload: Record<string, any> = {
        email,
        password,
        name,
        phone,
        verification_code: verificationCode,
        newsletter_subscribed: newsletter,
      };
      if (socialProvider === "google") payload.google_id = socialId;
      if (socialProvider === "naver") payload.naver_id = socialId;
      if (socialProvider === "kakao") payload.kakao_id = socialId;

      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) authStorage.setUserToken(data.token);
        toast.success("회원가입이 완료되었습니다! 웰컴 쿠폰이 발급되었습니다.");
        navigate(afterAuthPath);
      } else {
        toast.error(data.error || "회원가입에 실패했습니다.");
      }
    } else if (mode === "FORGOT") {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("비밀번호 재설정 링크가 이메일로 전송되었습니다.");
        setMode("LOGIN");
      }
    }
  };

  const handleOAuth = async (provider: "google" | "naver" | "kakao") => {
    const res = await apiFetch(`/api/auth/${provider}/url`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast.error(data.error || "소셜 로그인 설정이 필요합니다.");
  };

  return (
    <div className="pt-[120px] pb-24 px-6 max-w-md mx-auto">
      <h1 className="text-3xl font-serif font-bold text-center text-venuea-dark mb-8">
        {mode === "LOGIN" ? "로그인" : mode === "REGISTER" ? "회원가입" : "비밀번호 찾기"}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {formError}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              required
              readOnly={mode === "REGISTER" && isEmailVerified}
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsEmailVerified(false);
              }}
              className="flex-grow border border-gray-200 rounded-xl px-4 py-3 text-sm disabled:bg-gray-50"
            />
            {mode === "REGISTER" && !socialProvider && (
              <button
                type="button"
                disabled={isSendingCode || isEmailVerified}
                onClick={handleSendCode}
                className="px-4 py-3 bg-venuea-dark text-white rounded-xl text-xs font-bold whitespace-nowrap hover:bg-venuea-gold transition-colors disabled:opacity-50"
              >
                {isSendingCode ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : isEmailVerified ? (
                  "인증완료"
                ) : isCodeSent ? (
                  "재발송"
                ) : (
                  "인증번호 발송"
                )}
              </button>
            )}
          </div>

          {mode === "REGISTER" && !socialProvider && isCodeSent && !isEmailVerified && (
            <div className="flex gap-2 animate-in fade-in">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 인증번호 입력"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="flex-grow border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest"
              />
              <button
                type="button"
                disabled={isVerifyingCode}
                onClick={handleVerifyCode}
                className="px-4 py-2.5 bg-venuea-gold text-white rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1"
              >
                {isVerifyingCode ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MailCheck size={14} />
                )}
                <span>인증 확인</span>
              </button>
            </div>
          )}

          {mode === "REGISTER" && isEmailVerified && (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 pl-1">
              <CheckCircle2 size={14} />
              <span>이메일 인증이 완료되었습니다.</span>
            </p>
          )}
        </div>

        {mode !== "FORGOT" && (
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
        )}

        {mode === "REGISTER" && (
          <>
            <input
              required
              placeholder="성함"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            />
            <input
              placeholder="연락처 (010-0000-0000)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
              />
              <span>뉴스레터 및 프로모션 안내 수신 동의 (선택)</span>
            </label>
          </>
        )}

        <button
          type="submit"
          className="w-full bg-venuea-dark text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors"
        >
          {mode === "LOGIN" ? "로그인" : mode === "REGISTER" ? "가입하기" : "재설정 링크 받기"}
        </button>
      </form>

      {mode === "LOGIN" && (
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuth("kakao")}
            className="w-full py-3 bg-[#FEE500] text-[#191919] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            카카오 계정으로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("naver")}
            className="w-full py-3 bg-[#03C75A] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            네이버 계정으로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full py-3 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
          >
            Google 계정으로 계속하기
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
        {mode !== "LOGIN" && (
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setIsCodeSent(false);
              setIsEmailVerified(false);
            }}
            className="hover:text-venuea-dark"
          >
            로그인으로 돌아가기
          </button>
        )}
        {mode === "LOGIN" && (
          <>
            <button
              type="button"
              onClick={() => setMode("REGISTER")}
              className="hover:text-venuea-dark"
            >
              신규 회원가입
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => setMode("FORGOT")}
              className="hover:text-venuea-dark"
            >
              비밀번호 찾기
            </button>
          </>
        )}
      </div>
    </div>
  );
}