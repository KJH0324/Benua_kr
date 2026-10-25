// === src/pages/Unsubscribe.tsx ===
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setFailed(true);
      return;
    }
    apiFetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((res) => {
      if (res.ok) setDone(true);
      else setFailed(true);
    });
  }, [searchParams]);

  return (
    <div className="pt-36 pb-24 px-6 text-center">
      <h1 className="text-2xl font-serif font-bold">
        {done
          ? "뉴스레터 수신 거부가 처리되었습니다."
          : failed
            ? "수신거부 링크가 올바르지 않습니다."
            : "요청을 처리하고 있습니다..."}
      </h1>
    </div>
  );
}