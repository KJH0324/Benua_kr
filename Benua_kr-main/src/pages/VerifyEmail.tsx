// === src/pages/VerifyEmail.tsx ===
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"LOADING" | "SUCCESS" | "ERROR">("LOADING");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("ERROR");
      return;
    }
    apiFetch(`/api/auth/verify/${token}`)
      .then((r) => setStatus(r.ok ? "SUCCESS" : "ERROR"))
      .catch(() => setStatus("ERROR"));
  }, [searchParams]);

  return (
    <div className="pt-36 pb-24 px-6 text-center space-y-4">
      <h1 className="text-2xl font-serif font-bold">
        {status === "LOADING"
          ? "이메일 인증 확인 중..."
          : status === "SUCCESS"
          ? "이메일 인증이 완료되었습니다"
          : "유효하지 않은 인증 링크입니다"}
      </h1>
      <Link to="/profile" className="inline-block bg-venuea-dark text-white px-6 py-3 rounded-xl text-xs font-bold">
        마이페이지로 이동
      </Link>
    </div>
  );
}