import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, authStorage } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "FORGOT">("LOGIN");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [newsletter, setNewsletter] = useState(true);

  useEffect(() => {
    const err = searchParams.get("error");
    const prefillEmail = searchParams.get("email");
    if (err === "not_registered") {
      setMode("REGISTER");
      if (prefillEmail) setEmail(prefillEmail);
      toast.info("가입 정보가 없습니다. 회원가입을 완료해주세요.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        navigate("/profile");
      } else {
        toast.error(data.error || "로그인에 실패했습니다.");
      }
    } else if (mode === "REGISTER") {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          phone,
          address,
          newsletter_subscribed: newsletter,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) authStorage.setUserToken(data.token);
        toast.success("회원가입이 완료되었습니다! 웰컴 쿠폰이 발급되었습니다.");
        navigate("/profile");
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

  const handleOAuth = async (provider: "google" | "naver") => {
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />

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
              placeholder="연락처"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            />
            <input
              placeholder="기본 배송지 주소"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
              />
              <span>뉴스레터 및 프로모션 안내 수신 동의</span>
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
            onClick={() => handleOAuth("google")}
            className="w-full py-3 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50"
          >
            Google 계정으로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("naver")}
            className="w-full py-3 bg-[#03C75A] text-white rounded-xl text-xs font-bold"
          >
            네이버 계정으로 계속하기
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
        {mode !== "LOGIN" && (
          <button onClick={() => setMode("LOGIN")} className="hover:text-venuea-dark">
            로그인으로 돌아가기
          </button>
        )}
        {mode === "LOGIN" && (
          <>
            <button onClick={() => setMode("REGISTER")} className="hover:text-venuea-dark">
              신규 회원가입
            </button>
            <span>|</span>
            <button onClick={() => setMode("FORGOT")} className="hover:text-venuea-dark">
              비밀번호 찾기
            </button>
          </>
        )}
      </div>
    </div>
  );
}