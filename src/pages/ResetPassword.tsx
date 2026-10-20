import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(token ? "" : "재설정 링크가 올바르지 않습니다.");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError("재설정 링크가 올바르지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setFormError("비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "재설정에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setFormError("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[140px] pb-24 px-6 max-w-md mx-auto">
      <h1 className="text-3xl font-serif font-bold text-center text-venuea-dark mb-8">비밀번호 재설정</h1>
      {done ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-venuea-brown">비밀번호를 바꿨습니다. 새 비밀번호로 로그인해주세요.</p>
          <Link to="/login" className="inline-block bg-venuea-green text-white px-6 py-3 rounded-full text-sm font-bold">
            로그인
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{formError}</p>
          )}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            className="w-full px-4 py-3.5 bg-white border border-black/10 rounded-xl text-sm"
          />
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-venuea-green text-white py-3.5 rounded-xl text-sm font-bold disabled:opacity-40"
          >
            {loading ? "저장 중" : "비밀번호 저장"}
          </button>
        </form>
      )}
    </div>
  );
}
