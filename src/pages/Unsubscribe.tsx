// === src/pages/Unsubscribe.tsx ===
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    try {
      const email = atob(token);
      apiFetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(() => setDone(true));
    } catch {}
  }, [searchParams]);

  return (
    <div className="pt-36 pb-24 px-6 text-center">
      <h1 className="text-2xl font-serif font-bold">
        {done ? "뉴스레터 수신 거부가 처리되었습니다." : "요청을 처리하고 있습니다..."}
      </h1>
    </div>
  );
}