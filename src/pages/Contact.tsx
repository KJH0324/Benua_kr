import React, { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";

export default function Contact() {
  const [form, setForm] = useState({
    category: "오브제 문의",
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("문의가 접수되었습니다. 입력하신 이메일로 답변을 보내드립니다.");
      setForm({ category: "오브제 문의", name: "", email: "", subject: "", message: "" });
    } else {
      toast.error("문의 접수에 실패했습니다.");
    }
  };

  return (
    <div className="pt-[120px] pb-24 px-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark mb-8">1:1 고객 문의</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        >
          <option value="오브제 문의">오브제 문의</option>
          <option value="배송 문의">배송 문의</option>
          <option value="교환/환불 문의">교환/환불 문의</option>
          <option value="기타 문의">기타 문의</option>
        </select>
        <input
          required
          placeholder="성함"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <input
          type="email"
          required
          placeholder="답변 받을 이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <input
          required
          placeholder="제목"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <textarea
          rows={5}
          required
          placeholder="문의 내용을 입력해주세요."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-venuea-dark text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold"
        >
          문의 접수하기
        </button>
      </form>
    </div>
  );
}