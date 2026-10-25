import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Gift() {
  const { token } = useParams();
  const [gift, setGift] = useState<any>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", zipcode: "", address: "", detail_address: "", shipping_memo: "문 앞에 놓아주세요" });

  useEffect(() => {
    apiFetch(`/api/gift/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error || "선물 링크가 없습니다.");
        else setGift(data);
      })
      .catch(() => setError("선물 정보를 불러오지 못했습니다."));
  }, [token]);

  if (error) return <div className="pt-32 px-6 text-center text-sm">{error}</div>;
  if (!gift) return <div className="pt-32 px-6 text-center text-sm">확인하고 있습니다.</div>;

  return (
    <div className="pt-28 pb-16 px-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-3xl font-serif font-bold">선물이 도착했습니다</h1>
      {gift.gift_message && <p className="text-sm text-venuea-brown">{gift.gift_message}</p>}
      <ul className="text-sm space-y-1">
        {(gift.items || []).map((item: any) => (
          <li key={item.name}>{item.name} × {item.quantity}</li>
        ))}
      </ul>
      {gift.filled || done ? (
        <p className="text-sm">주소를 받았습니다.</p>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await apiFetch(`/api/gift/${token}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) setError(data.error || "주소를 저장하지 못했습니다.");
            else setDone(true);
          }}
        >
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름" className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="연락처" className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input value={form.zipcode} onChange={(e) => setForm({ ...form, zipcode: e.target.value })} placeholder="우편번호" className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="주소" className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input value={form.detail_address} onChange={(e) => setForm({ ...form, detail_address: e.target.value })} placeholder="상세주소" className="w-full border rounded-xl px-3 py-2 text-sm" />
          <button className="w-full bg-venuea-green text-white rounded-xl py-3 text-sm font-bold">주소 보내기</button>
        </form>
      )}
    </div>
  );
}
