import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Detail = {
  timeString?: string;
  where?: string;
  kind?: string;
  manName?: string;
  telno?: string;
  telno2?: string;
  level?: number;
};

export default function TrackingTimeline({ src }: { src: string }) {
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setInfo(null);
    setError("");
    apiFetch(src)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setError(data.error || "배송 정보를 불러오지 못했습니다.");
          return;
        }
        setInfo(data.info || null);
      })
      .catch(() => {
        if (alive) setError("배송 정보를 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [src]);

  const details: Detail[] = Array.isArray(info?.trackingDetails) ? [...info.trackingDetails].reverse() : [];

  if (error) return <p className="text-sm text-[#463221]">{error}</p>;
  if (!info) return <p className="text-sm text-[#463221]">배송 정보를 확인하고 있습니다.</p>;
  if (info.result === "N" || details.length === 0) {
    return <p className="text-sm text-[#463221]">{info.msg || "아직 배송 정보가 없습니다."}</p>;
  }

  const level = Number(info?.level) || 0;
  const steps = ["상품인수", "이동중", "배달지도착", "배달출발", "배달완료"];
  const active = level >= 6 ? 4 : level >= 5 ? 3 : level >= 4 ? 2 : level >= 3 ? 1 : 0;

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-5 gap-1">
        {steps.map((label, index) => (
          <li key={label} className="text-center">
            <span className={`mx-auto block w-3 h-3 rounded-full ${index <= active ? "bg-[#385c37]" : "bg-[#463221]/20"}`} />
            <span className={`mt-1 block text-[10px] leading-tight ${index <= active ? "text-[#385c37]" : "text-[#463221]/50"}`}>{label}</span>
          </li>
        ))}
      </ol>
      <ol className="space-y-0">
      {details.map((row, index) => (
        <li key={`${row.timeString}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-full ${index === 0 ? "bg-[#385c37]" : "bg-[#463221]/40"}`} />
            {index < details.length - 1 && <span className="w-px flex-1 bg-[#463221]/15" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-bold text-[#111111]">{row.kind || "배송"}</p>
            <p className="text-xs text-[#463221]">
              {row.timeString} {row.where ? `· ${row.where}` : ""}
            </p>
            {(row.manName || row.telno || row.telno2) && (
              <p className="text-xs text-[#463221]">
                {[row.manName, row.telno || row.telno2].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </li>
      ))}
      </ol>
    </div>
  );
}
